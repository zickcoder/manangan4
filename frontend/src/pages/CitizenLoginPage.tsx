import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { 
  Lock, 
  Mail, 
  Eye, 
  EyeOff, 
  ArrowLeft,
  KeyRound,
  CheckCircle2,
  Loader2,
  ShieldCheck,
  Sparkles,
  RefreshCw,
  AlertTriangle,
  Clock
} from 'lucide-react';
import emailjs from '@emailjs/browser';
import { 
  loginCitizen, 
  getLockoutTimeRemaining, 
  recordFailedAttempt, 
  recordSuccessfulLogin, 
  checkEmailExists, 
  updateUserPassword,
  isSameSessionSameDay,
  markOtpVerified,
  updateUserPin,
  verifyUserPin
} from '../lib/api';
import { getStoredNotifications, saveStoredNotifications } from '../lib/notifications';
import { PinInput } from '../components/auth/PinInput';

const EMAILJS_SERVICE_ID = 'service_6vsq3nj';
const EMAILJS_TEMPLATE_ID = 'template_dchi14k';
const EMAILJS_PUBLIC_KEY = '-3noUYuzaJc6YK0ej';

type AuthStep = 'credentials' | 'otp' | 'verify_pin' | 'create_pin';

export function CitizenLoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const signupSuccess = searchParams.get('signup') === 'success';
  const isTimeout = searchParams.get('timeout') === '1';
  const prefillEmail = searchParams.get('email') || '';

  // Credentials State
  const [email, setEmail] = useState(prefillEmail);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [infoMsg, setInfoMsg] = useState(
    signupSuccess 
      ? '🎉 Registration complete! Please enter your password to sign in and enter your 6-digit PIN.'
      : isTimeout
      ? '🔒 Session timed out after 30 minutes of inactivity. Please sign in again.'
      : ''
  );
  const [lockoutSeconds, setLockoutSeconds] = useState<number>(0);

  // Authentication Flow State Machine
  const [authStep, setAuthStep] = useState<AuthStep>('credentials');
  const [pendingUser, setPendingUser] = useState<any>(null);

  // OTP Verification State
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [userOtpInput, setUserOtpInput] = useState('');
  const [otpAttempts, setOtpAttempts] = useState(0);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [sendingOtp, setSendingOtp] = useState(false);

  // PIN Verification & Creation State
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [enteredVerifyPin, setEnteredVerifyPin] = useState('');
  const [pinAttempts, setPinAttempts] = useState(0);
  const [pinTimeLeft, setPinTimeLeft] = useState(60); // 1 minute countdown

  // Inline Forgot Password State
  const [isForgotMode, setIsForgotMode] = useState(false);
  const [forgotStep, setForgotStep] = useState<1 | 2 | 3>(1);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotOtp, setForgotOtp] = useState('');
  const [forgotOtpInput, setForgotOtpInput] = useState('');
  const [forgotOtpAttempts, setForgotOtpAttempts] = useState(0);
  const [forgotNewPass, setForgotNewPass] = useState('');
  const [forgotConfirmPass, setForgotConfirmPass] = useState('');
  const [forgotShowPass, setForgotShowPass] = useState(false);
  const [forgotSending, setForgotSending] = useState(false);
  const [forgotMsg, setForgotMsg] = useState('');
  const [forgotError, setForgotError] = useState('');

  // If already logged in as Citizen and verified, redirect to citizen dashboard
  useEffect(() => {
    try {
      const savedStr = sessionStorage.getItem('govserve_citizen_user') || localStorage.getItem('govserve_citizen_user');
      if (savedStr) {
        const u = JSON.parse(savedStr);
        if (u && u.email && u.role === 'Citizen') {
          sessionStorage.setItem('govserve_portal', 'citizen');
          sessionStorage.setItem('govserve_user', JSON.stringify(u));
          navigate('/dashboard', { replace: true });
        }
      }
    } catch {}

    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'govserve_citizen_user' && e.newValue) {
        try {
          const u = JSON.parse(e.newValue);
          if (u && u.email && u.role === 'Citizen') {
            sessionStorage.setItem('govserve_portal', 'citizen');
            sessionStorage.setItem('govserve_user', JSON.stringify(u));
            navigate('/dashboard', { replace: true });
          }
        } catch {}
      }
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [navigate]);

  // Live lockout countdown listener (updates every second based on real wall-clock time)
  useEffect(() => {
    const updateLockout = () => {
      const rem = getLockoutTimeRemaining('citizen');
      setLockoutSeconds(rem);
      if (rem === 0) {
        setError((prev) => prev.includes('Security Lockout') ? '' : prev);
      }
    };
    updateLockout();
    const timer = setInterval(updateLockout, 1000);
    return () => clearInterval(timer);
  }, []);

  // Resend OTP Cooldown Timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // 1-minute (60s) PIN verification countdown timer
  useEffect(() => {
    if (authStep !== 'verify_pin' || pinTimeLeft <= 0) return;
    const timer = setInterval(() => {
      setPinTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setAuthStep('credentials');
          setPendingUser(null);
          setEnteredVerifyPin('');
          setPassword('');
          setError('🔒 PIN entry time limit expired (1 minute). Please log in again.');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [authStep, pinTimeLeft]);

  /** Helper to send real OTP email via EmailJS with REST API fallback */
  const sendEmailOtp = async (targetEmail: string, targetName: string, code: string) => {
    const templateParams = {
      to_email: targetEmail,
      to_name: targetName || 'Resident',
      email: targetEmail,
      name: targetName || 'Resident',
      user_email: targetEmail,
      user_name: targetName || 'Resident',
      otp_code: code,
      otp: code,
      code: code,
      passcode: code,
      verification_code: code,
      number: code,
      message: `Your GovServe login verification OTP code is ${code}.`,
      body: `Your GovServe login verification OTP code is ${code}.`,
    };

    try {
      await emailjs.send(
        EMAILJS_SERVICE_ID,
        EMAILJS_TEMPLATE_ID,
        templateParams,
        EMAILJS_PUBLIC_KEY
      );
    } catch (sdkErr) {
      console.warn('EmailJS SDK fallback, trying HTTP POST...', sdkErr);
      try {
        await fetch('https://api.emailjs.com/api/v1.0/email/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            service_id: EMAILJS_SERVICE_ID,
            template_id: EMAILJS_TEMPLATE_ID,
            user_id: EMAILJS_PUBLIC_KEY,
            template_params: templateParams
          })
        });
      } catch (fallbackErr) {
        console.error('EmailJS direct POST error:', fallbackErr);
      }
    }
  };

  /** STEP 1: Process Credentials (Login) */
  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInfoMsg('');

    const remLock = getLockoutTimeRemaining('citizen');
    if (remLock > 0) {
      setLockoutSeconds(remLock);
      setError(`🔒 Account locked. Try again in ${remLock} seconds.`);
      return;
    }

    setLoading(true);

    try {
      const res = await loginCitizen(email, password);
      if (res.success && res.user) {
        recordSuccessfulLogin('citizen');
        const user = res.user;
        setPendingUser(user);
        const cleanEmail = (user.email || email).toLowerCase().trim();

        const isNewSignUp = localStorage.getItem(`govserve_new_signup_${cleanEmail}`) === 'true';
        const isSameDay = isSameSessionSameDay(cleanEmail, 'citizen', user);

        if (isNewSignUp) {
          // Flow 1: Sign-up -> Login -> OTP -> Create PIN
          await triggerOtpStep(user, '📩 Sign-up verification code sent! Check your inbox.');
        } else if (isSameDay) {
          // Flow 2: Same calendar day -> Login -> PIN
          setPinAttempts(0);
          setPinTimeLeft(60);
          setEnteredVerifyPin('');
          setAuthStep('verify_pin');
          setInfoMsg('');
        } else {
          // Flow 3: New day / next session -> Login -> OTP -> PIN
          await triggerOtpStep(user, '📩 New session detected. A 6-digit OTP code has been sent to your email.');
        }
      } else {
        const status = recordFailedAttempt('citizen');
        if (status.locked) {
          setLockoutSeconds(status.remSeconds);
          setError(`🔒 Security Lockout: 3 invalid attempts reached. Account temporarily locked.`);
        } else {
          setError(res.message || `Invalid email or password. Attempt ${status.fails} of 3 before 3-minute lockout.`);
        }
      }
    } catch (err) {
      setError('Login error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  /** Triggers sending OTP and advances state machine to 'otp' */
  const triggerOtpStep = async (user: any, notice: string) => {
    setSendingOtp(true);
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedOtp(code);
    setOtpAttempts(0);
    setUserOtpInput('');
    setResendCooldown(30);

    const cleanEmail = (user.email || email).toLowerCase().trim();
    await sendEmailOtp(cleanEmail, user.name || 'Resident', code);
    setSendingOtp(false);
    setAuthStep('otp');
    setInfoMsg(notice);
  };

  /** Resend OTP in Step 2 */
  const handleResendOtp = async () => {
    if (resendCooldown > 0 || !pendingUser) return;
    setError('');
    await triggerOtpStep(pendingUser, '📩 A fresh 6-digit OTP code has been sent to your email.');
  };

  /** STEP 2: Verify OTP Code */
  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (userOtpInput.trim() !== generatedOtp) {
      const newAttempts = otpAttempts + 1;
      setOtpAttempts(newAttempts);

      if (newAttempts >= 3) {
        setError('🔒 Maximum 3 OTP verification attempts reached. Returning to login...');
        setTimeout(() => {
          setAuthStep('credentials');
          setError('');
          setPassword('');
        }, 1500);
        return;
      }

      setError(`🔒 Invalid OTP code. Attempt ${newAttempts} of 3.`);
      return;
    }

    // OTP Successfully Verified!
    const cleanEmail = (pendingUser.email || email).toLowerCase().trim();
    markOtpVerified(cleanEmail, 'citizen');

    const isNewSignUp = localStorage.getItem(`govserve_new_signup_${cleanEmail}`) === 'true';
    if (isNewSignUp || !pendingUser.pin) {
      // Flow 1: Advance to Create PIN
      setAuthStep('create_pin');
      setInfoMsg('✅ Email verified! Please create your 6-digit Security PIN.');
    } else {
      // Flow 3: Advance to Enter PIN
      setPinAttempts(0);
      setPinTimeLeft(60);
      setEnteredVerifyPin('');
      setAuthStep('verify_pin');
      setInfoMsg('');
    }
  };

  /** STEP 3 (Option A): Create 6-Digit PIN (First-time sign-up) */
  const handleCreatePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPin.length !== 6 || !/^\d{6}$/.test(newPin)) {
      setError('Please enter a valid 6-digit PIN (numbers only).');
      return;
    }
    if (newPin !== confirmPin) {
      setError('PINs do not match. Please verify and re-enter.');
      return;
    }

    setLoading(true);
    const cleanEmail = (pendingUser.email || email).toLowerCase().trim();

    try {
      await updateUserPin(cleanEmail, newPin);
      localStorage.removeItem(`govserve_new_signup_${cleanEmail}`);
      finalizeLogin(pendingUser, newPin);
    } catch (err) {
      setError('Failed to save PIN. Please try again.');
      setLoading(false);
    }
  };

  /** STEP 3 (Option B): Verify 6-Digit PIN (Existing / Recurring logins - max 5 attempts) */
  const handleVerifyPinSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError('');

    if (enteredVerifyPin.length !== 6) {
      setError('Please enter your complete 6-digit PIN.');
      return;
    }

    const expectedPin = pendingUser?.pin || '123456';
    const matches = verifyUserPin(expectedPin, enteredVerifyPin);

    if (matches) {
      finalizeLogin(pendingUser, expectedPin);
    } else {
      const nextAttempts = pinAttempts + 1;
      setPinAttempts(nextAttempts);
      setEnteredVerifyPin('');

      if (nextAttempts >= 5) {
        setAuthStep('credentials');
        setPendingUser(null);
        setPassword('');
        setError('🔒 Maximum 5 PIN attempts reached. Please sign in again.');
      } else {
        setError(`🔒 Incorrect Security PIN. Attempt ${nextAttempts} of 5.`);
      }
    }
  };

  /** Complete Authentication & Open Dashboard */
  const finalizeLogin = (userToLogin: any, activePin?: string) => {
    recordSuccessfulLogin('citizen');
    const userWithPin = { ...userToLogin, pin: activePin || userToLogin.pin || '123456' };
    const cleanEmail = (userWithPin.email || email).toLowerCase().trim();

    // Mark verified for today so subsequent logins today only require PIN
    markOtpVerified(cleanEmail, 'citizen');

    sessionStorage.setItem('govserve_portal', 'citizen');
    sessionStorage.setItem('govserve_citizen_user', JSON.stringify(userWithPin));
    sessionStorage.setItem('govserve_user', JSON.stringify(userWithPin));
    localStorage.setItem('govserve_citizen_user', JSON.stringify(userWithPin));
    
    // Set last active timestamp for 30-min timeout
    localStorage.setItem('govserve_last_active_citizen', String(Date.now()));

    // Clean ghost notifications
    try {
      const stored = getStoredNotifications();
      const cleaned = stored.filter((n: any) =>
        n.targetRole !== 'Citizen' || (n.targetEmail && n.targetEmail.includes('@'))
      );
      if (cleaned.length !== stored.length) saveStoredNotifications(cleaned);
    } catch {}

    navigate('/dashboard', { replace: true });
  };

  // ── Forgot Password Handlers ──
  const handleSendForgotOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError('');
    setForgotMsg('');

    const cleanEmail = forgotEmail.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setForgotError('Please enter a valid email address.');
      return;
    }

    setForgotSending(true);

    try {
      const exists = await checkEmailExists(cleanEmail);
      if (!exists) {
        setForgotError('⚠️ This email address is not registered in our system.');
        setForgotSending(false);
        return;
      }

      const code = Math.floor(100000 + Math.random() * 900000).toString();
      await sendEmailOtp(cleanEmail, 'Resident', code);

      setForgotOtp(code);
      setForgotOtpAttempts(0);
      setForgotOtpInput('');
      setForgotStep(2);
      setForgotMsg(`📩 6-digit OTP code sent to ${cleanEmail}! Please check your email inbox.`);
    } catch (err) {
      setForgotError('Failed to send OTP. Please try again.');
    } finally {
      setForgotSending(false);
    }
  };

  const handleVerifyForgotOtp = (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError('');

    if (forgotOtpInput.trim() !== forgotOtp) {
      const newAttempts = forgotOtpAttempts + 1;
      setForgotOtpAttempts(newAttempts);
      if (newAttempts >= 3) {
        setForgotError('🔒 Maximum 3 attempts reached. Please request a new OTP.');
        setTimeout(() => {
          setForgotStep(1);
          setForgotError('');
        }, 1500);
        return;
      }
      setForgotError(`🔒 Invalid OTP code. Attempt ${newAttempts} of 3.`);
      return;
    }

    setForgotStep(3);
    setForgotMsg('✅ OTP verified! You can now set your new password.');
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError('');

    if (forgotNewPass.length < 8) {
      setForgotError('New password must be at least 8 characters.');
      return;
    }
    if (forgotNewPass !== forgotConfirmPass) {
      setForgotError('Passwords do not match.');
      return;
    }

    setForgotSending(true);
    const cleanEmail = forgotEmail.trim().toLowerCase();

    try {
      const res = await updateUserPassword(cleanEmail, forgotNewPass);
      if (res.success) {
        setForgotMsg('🎉 Password successfully updated! Redirecting to login...');
        setTimeout(() => {
          setIsForgotMode(false);
          setForgotStep(1);
          setEmail(cleanEmail);
          setPassword('');
          setForgotMsg('');
        }, 1500);
      } else {
        setForgotError(res.message || 'Failed to update password.');
      }
    } catch (err) {
      setForgotError('Error updating password.');
    } finally {
      setForgotSending(false);
    }
  };

  const pinMinutes = Math.floor(pinTimeLeft / 60);
  const pinSeconds = pinTimeLeft % 60;
  const pinFormatted = `${String(pinMinutes).padStart(2, '0')}:${String(pinSeconds).padStart(2, '0')}`;

  return (
    <div className="min-h-screen w-screen flex flex-col lg:flex-row bg-[#F4F6F9] overflow-hidden selection:bg-blue-600 selection:text-white">
      
      {/* ── LEFT PANEL: DARK NAVY WITH SEAL BACKGROUND IMAGE ── */}
      <div className="lg:w-1/2 bg-[#0B1E3D] text-white p-8 sm:p-12 lg:p-16 flex flex-col justify-between relative overflow-hidden min-h-[340px] lg:min-h-screen">
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden">
          <img
            src="/logoforloggingpages.jpeg"
            alt="Government Seal"
            className="w-[500px] h-[500px] lg:w-[680px] lg:h-[680px] object-contain opacity-25 rounded-full filter contrast-125"
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0B1E3D] via-transparent to-[#0B1E3D]/80" />
        </div>

        <div className="relative z-10">
          <Link 
            to="/" 
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold text-white bg-white/10 hover:bg-white/20 border border-white/20 transition-all shadow-xs backdrop-blur-sm"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to homepage</span>
          </Link>
        </div>

        <div className="relative z-10 my-auto py-8 lg:py-12 space-y-4 max-w-xl text-center mx-auto">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold font-display tracking-tight text-white leading-tight">
            Citizen Online Portal
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-normal max-w-lg mx-auto">
            Access barangay and city facility reservations, drainage maintenance requests, and columbarium niche applications in one secure system.
          </p>
        </div>

        <div className="relative z-10 pt-4 border-t border-white/10 text-center text-xs text-slate-400 font-bold tracking-[0.25em] uppercase">
          SERVICE • INTEGRITY • PROGRESS
        </div>
      </div>

      {/* ── RIGHT PANEL: FORM CARD ── */}
      <div className="lg:w-1/2 p-6 sm:p-12 lg:p-16 flex items-center justify-center relative overflow-y-auto">
        <div className="w-full max-w-md space-y-6">

          {/* Form Card */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-200/80 space-y-5">
            
            {/* Alerts */}
            {infoMsg && (
              <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-800 font-semibold flex items-center gap-2 animate-fade-in">
                <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                <span>{infoMsg}</span>
              </div>
            )}

            {/* Live Security Lockout Alert */}
            {lockoutSeconds > 0 && (
              <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-300 text-amber-950 text-xs font-semibold flex items-center justify-between shadow-xs animate-fade-in">
                <div className="flex items-center gap-2.5">
                  <Clock className="w-5 h-5 text-amber-600 shrink-0 animate-spin" style={{ animationDuration: '4s' }} />
                  <div>
                    <p className="font-extrabold text-amber-950 text-xs">Security Lockout Active</p>
                    <p className="text-[11px] text-amber-700 font-normal">3 failed attempts reached. Retry unlocks in:</p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="font-mono font-black text-sm text-amber-950 bg-amber-200/80 border border-amber-300 px-2.5 py-1 rounded-lg tracking-wider inline-block">
                    {Math.floor(lockoutSeconds / 60)}:{String(lockoutSeconds % 60).padStart(2, '0')}
                  </span>
                </div>
              </div>
            )}

            {error && !lockoutSeconds && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 font-semibold flex items-center gap-2 animate-fade-in">
                <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {!isForgotMode ? (
              <>
                {/* ── STEP 1: CREDENTIALS (EMAIL + PASSWORD) ── */}
                {authStep === 'credentials' && (
                  <>
                    <div>
                      <h2 className="text-2xl sm:text-3xl font-extrabold font-display text-slate-900 tracking-tight">
                        Citizen Sign in
                      </h2>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                        Sign in to your registered resident account to continue.
                      </p>
                    </div>

                    <form onSubmit={handleCredentialsSubmit} className="space-y-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
                        <div className="relative">
                          <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                          <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="juan.delacruz@citizen.gov.ph"
                            className="w-full pl-10 pr-3 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 focus:bg-white text-slate-900 font-medium"
                          />
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-xs font-semibold text-slate-700">Password</label>
                          <button 
                            type="button" 
                            onClick={() => {
                              setIsForgotMode(true);
                              setForgotEmail(email);
                              setForgotStep(1);
                              setForgotError('');
                              setForgotMsg('');
                            }}
                            className="text-[11px] font-semibold text-blue-600 hover:underline cursor-pointer"
                          >
                            Forgot password?
                          </button>
                        </div>
                        <div className="relative">
                          <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                          <input
                            type={showPassword ? 'text' : 'password'}
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••••••"
                            className="w-full pl-10 pr-10 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 focus:bg-white text-slate-900 font-medium"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                          >
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={loading || lockoutSeconds > 0}
                        className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2"
                      >
                        {lockoutSeconds > 0 ? (
                          <span className="flex items-center gap-1.5 text-amber-200">
                            <Clock className="w-4 h-4" />
                            <span>Locked ({Math.floor(lockoutSeconds / 60)}:{String(lockoutSeconds % 60).padStart(2, '0')})</span>
                          </span>
                        ) : loading ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Verifying Credentials...</span>
                          </>
                        ) : (
                          <span>Continue →</span>
                        )}
                      </button>
                    </form>

                    <div className="pt-2 text-center text-xs text-slate-600 border-t border-slate-100">
                      <p>
                        No account yet?{' '}
                        <Link to="/register" className="font-bold text-blue-600 hover:underline">
                          Register as Citizen
                        </Link>
                      </p>
                    </div>
                  </>
                )}

                {/* ── STEP 2: OTP VERIFICATION (NEW DAY / NEXT SESSION / NEW SIGN-UP) ── */}
                {authStep === 'otp' && (
                  <form onSubmit={handleVerifyOtp} className="space-y-4">
                    <div>
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-[11px] font-bold mb-2">
                        <KeyRound className="w-3.5 h-3.5" />
                        <span>Two-Factor Authentication</span>
                      </div>
                      <h2 className="text-2xl font-extrabold font-display text-slate-900 tracking-tight">
                        Email OTP Verification
                      </h2>
                      <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                        We sent a 6-digit security code to <strong className="text-blue-700 font-bold">{email}</strong>.
                      </p>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5 text-center">
                        Enter 6-Digit Email Code
                      </label>
                      <input
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        required
                        autoFocus
                        value={userOtpInput}
                        onChange={(e) => setUserOtpInput(e.target.value.replace(/\D/g, ''))}
                        placeholder="••••••"
                        className="w-full py-3 px-4 text-center font-mono font-extrabold text-2xl tracking-[0.5em] bg-slate-50 border-2 border-blue-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-slate-900"
                      />
                    </div>

                    <div className="flex items-center justify-between text-xs px-1">
                      <span className="text-slate-500">Attempt {otpAttempts} of 3</span>
                      <button
                        type="button"
                        onClick={handleResendOtp}
                        disabled={resendCooldown > 0 || sendingOtp}
                        className="text-blue-600 hover:underline font-semibold cursor-pointer disabled:opacity-50 flex items-center gap-1"
                      >
                        <RefreshCw className={`w-3 h-3 ${sendingOtp ? 'animate-spin' : ''}`} />
                        <span>{resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend Code'}</span>
                      </button>
                    </div>

                    <div className="flex gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          setAuthStep('credentials');
                          setError('');
                        }}
                        className="w-1/3 py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-all cursor-pointer"
                      >
                        ← Back
                      </button>
                      <button
                        type="submit"
                        disabled={userOtpInput.length !== 6}
                        className="w-2/3 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition-all cursor-pointer disabled:opacity-50"
                      >
                        Verify Code →
                      </button>
                    </div>
                  </form>
                )}

                {/* ── STEP 3: CREATE PIN (FOR NEW SIGN-UPS) ── */}
                {authStep === 'create_pin' && (
                  <form onSubmit={handleCreatePinSubmit} className="space-y-4">
                    <div>
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-bold mb-2">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Final Step: Security Setup</span>
                      </div>
                      <h2 className="text-2xl font-extrabold font-display text-slate-900 tracking-tight">
                        Create Your 6-Digit PIN
                      </h2>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                        This 6-digit PIN will be used to quickly unlock and authenticate your session each time you log in.
                      </p>
                    </div>

                    <div className="space-y-4 pt-1">
                      <PinInput
                        label="Set 6-Digit Security PIN"
                        value={newPin}
                        onChange={setNewPin}
                        autoFocus={true}
                      />

                      <PinInput
                        label="Confirm 6-Digit Security PIN"
                        value={confirmPin}
                        onChange={setConfirmPin}
                        autoFocus={false}
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={loading || newPin.length !== 6 || confirmPin.length !== 6}
                      className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Activating PIN & Entering Dashboard...</span>
                        </>
                      ) : (
                        <span>Complete Registration & Open Dashboard →</span>
                      )}
                    </button>
                  </form>
                )}

                {/* ── STEP 4: VERIFY 6-DIGIT PIN (SAME SESSION OR AFTER OTP) ── */}
                {authStep === 'verify_pin' && (
                  <form onSubmit={handleVerifyPinSubmit} className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-[11px] font-bold">
                          <Lock className="w-3.5 h-3.5" />
                          <span>Security Check</span>
                        </div>

                        {/* 2-Minute Countdown Badge */}
                        <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-300 text-amber-800 text-[11px] font-mono font-extrabold">
                          <Clock className="w-3 h-3 text-amber-600 animate-pulse" />
                          <span>{pinFormatted}</span>
                        </div>
                      </div>

                      <h2 className="text-2xl font-extrabold font-display text-slate-900 tracking-tight">
                        Enter Security PIN
                      </h2>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                        Enter your 6-digit PIN to authenticate your citizen account.
                      </p>
                    </div>

                    {/* Account Notice */}
                    <div className="p-3 bg-amber-50/90 border border-amber-200/90 rounded-2xl text-[11px] text-amber-800 space-y-1">
                      <div className="flex items-center gap-1.5 font-bold text-amber-900">
                        <ShieldCheck className="w-4 h-4 text-amber-700" />
                        <span>Account Notice</span>
                      </div>
                      <p className="text-slate-700">
                        if you didnt enter your pin or accidentally refreshed the site your default pin is <strong className="font-mono font-bold text-amber-900">"123456"</strong>
                      </p>
                    </div>

                    <PinInput
                      value={enteredVerifyPin}
                      onChange={setEnteredVerifyPin}
                      onComplete={() => {}}
                      autoFocus={true}
                    />

                    <div className="flex items-center justify-between text-xs px-1">
                      <span className="text-slate-500 font-medium">Attempt {pinAttempts} of 5</span>
                      <span className="text-amber-700 font-mono font-semibold">{pinFormatted} left</span>
                    </div>

                    <div className="flex gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          setAuthStep('credentials');
                          setEnteredVerifyPin('');
                          setError('');
                        }}
                        className="w-1/3 py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-all cursor-pointer"
                      >
                        ← Back
                      </button>
                      <button
                        type="submit"
                        disabled={enteredVerifyPin.length !== 6}
                        className="w-2/3 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition-all cursor-pointer disabled:opacity-50"
                      >
                        Unlock & Enter Dashboard →
                      </button>
                    </div>
                  </form>
                )}
              </>
            ) : (
              /* ── INLINE FORGOT PASSWORD FORM ── */
              <div className="space-y-4">
                <div>
                  <button 
                    type="button" 
                    onClick={() => {
                      setIsForgotMode(false);
                      setForgotError('');
                      setForgotMsg('');
                    }}
                    className="text-xs font-bold text-blue-600 hover:underline inline-flex items-center gap-1 mb-2 cursor-pointer"
                  >
                    ← Back to Sign in
                  </button>
                  <h2 className="text-2xl font-extrabold font-display text-slate-900 tracking-tight">
                    {forgotStep === 1 ? 'Reset Password' : forgotStep === 2 ? 'Enter 6-Digit OTP' : 'Set New Password'}
                  </h2>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    {forgotStep === 1 
                      ? 'Enter your registered email address to receive a password reset verification code.'
                      : forgotStep === 2
                      ? `We have dispatched a 6-digit code to ${forgotEmail}.`
                      : 'Choose a strong new password for your account.'}
                  </p>
                </div>

                {forgotMsg && (
                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-semibold flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{forgotMsg}</span>
                  </div>
                )}

                {forgotError && (
                  <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 font-semibold flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-red-500 shrink-0"></span>
                    <span>{forgotError}</span>
                  </div>
                )}

                {forgotStep === 1 && (
                  <form onSubmit={handleSendForgotOtp} className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Registered Email Address</label>
                      <div className="relative">
                        <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="email"
                          required
                          value={forgotEmail}
                          onChange={(e) => setForgotEmail(e.target.value)}
                          placeholder="name@example.com"
                          className="w-full pl-10 pr-3 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-slate-900"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={forgotSending}
                      className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {forgotSending ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Sending Reset Code...</span>
                        </>
                      ) : (
                        <span>Send 6-Digit OTP Code →</span>
                      )}
                    </button>
                  </form>
                )}

                {forgotStep === 2 && (
                  <form onSubmit={handleVerifyForgotOtp} className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Enter 6-Digit Email OTP</label>
                      <div className="relative">
                        <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          required
                          maxLength={6}
                          value={forgotOtpInput}
                          onChange={(e) => setForgotOtpInput(e.target.value.replace(/[^0-9]/g, ''))}
                          placeholder="••••••"
                          className="w-full pl-10 pr-3 py-2.5 text-base font-mono font-bold tracking-widest bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-slate-900"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition-all cursor-pointer"
                    >
                      Verify OTP Code →
                    </button>
                  </form>
                )}

                {forgotStep === 3 && (
                  <form onSubmit={handleResetPassword} className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">New Password (Min 8 chars)</label>
                      <div className="relative">
                        <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type={forgotShowPass ? 'text' : 'password'}
                          required
                          value={forgotNewPass}
                          onChange={(e) => setForgotNewPass(e.target.value)}
                          placeholder="••••••••••••"
                          className="w-full pl-10 pr-10 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-slate-900"
                        />
                        <button
                          type="button"
                          onClick={() => setForgotShowPass(!forgotShowPass)}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                          {forgotShowPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Confirm New Password</label>
                      <div className="relative">
                        <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type={forgotShowPass ? 'text' : 'password'}
                          required
                          value={forgotConfirmPass}
                          onChange={(e) => setForgotConfirmPass(e.target.value)}
                          placeholder="••••••••••••"
                          className="w-full pl-10 pr-3 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-slate-900"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={forgotSending}
                      className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {forgotSending ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Updating Password...</span>
                        </>
                      ) : (
                        <span>Save New Password & Log in →</span>
                      )}
                    </button>
                  </form>
                )}
              </div>
            )}

          </div>
        </div>
      </div>

    </div>
  );
}
