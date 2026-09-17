import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Lock, 
  Mail, 
  Phone, 
  ArrowLeft, 
  CheckCircle2, 
  KeyRound, 
  Eye, 
  EyeOff, 
  Loader2, 
  Check, 
  ShieldCheck, 
  AlertTriangle,
  RefreshCw,
  Sparkles,
  Clock
} from 'lucide-react';
import emailjs from '@emailjs/browser';
import { registerCitizen, checkEmailExists, markOtpVerified, updateUserPin } from '../lib/api';
import { clearUserNotifications } from '../lib/notifications';
import { PinInput } from '../components/auth/PinInput';

// Real EmailJS credentials
const EMAILJS_SERVICE_ID = 'service_6vsq3nj';
const EMAILJS_TEMPLATE_ID = 'template_dchi14k';
const EMAILJS_PUBLIC_KEY = '-3noUYuzaJc6YK0ej';

type RegisterStep = 'form' | 'otp' | 'pin';

export function CitizenRegisterPage() {
  const navigate = useNavigate();

  // If already logged in as Citizen, redirect to citizen dashboard
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

  // Step state
  const [step, setStep] = useState<RegisterStep>('form');

  // Registration Form Fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [middleInitial, setMiddleInitial] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // OTP State & 1:30 (90 seconds) Timer
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [userOtpInput, setUserOtpInput] = useState('');
  const [otpAttempts, setOtpAttempts] = useState(0);
  const [otpTimeLeft, setOtpTimeLeft] = useState(90); // 1:30 countdown
  const [resendCooldown, setResendCooldown] = useState(0);

  // PIN Creation State
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [registeredUser, setRegisteredUser] = useState<any>(null);

  // Status & Feedback
  const [loading, setLoading] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Password Security Checks
  const hasMinLength = password.length >= 12;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSymbol = /[^A-Za-z0-9]/.test(password);

  const criteriaList = [
    { label: 'At least 12 to 16 characters', valid: hasMinLength },
    { label: 'At least one uppercase letter (A-Z)', valid: hasUpper },
    { label: 'At least one lowercase letter (a-z)', valid: hasLower },
    { label: 'At least one number (0-9)', valid: hasNumber },
    { label: 'At least one special symbol (!, @, #, etc.)', valid: hasSymbol },
  ];

  const passedCount = criteriaList.filter(c => c.valid).length;

  const getStrengthInfo = () => {
    if (!password) return { label: '', percent: 0, color: 'bg-slate-200', textColor: 'text-slate-400' };
    if (passedCount <= 1) return { label: 'Very Weak', percent: 20, color: 'bg-red-500', textColor: 'text-red-600' };
    if (passedCount === 2) return { label: 'Weak', percent: 40, color: 'bg-orange-500', textColor: 'text-orange-600' };
    if (passedCount === 3) return { label: 'Moderate', percent: 60, color: 'bg-amber-500', textColor: 'text-amber-600' };
    if (passedCount === 4) return { label: 'Strong', percent: 80, color: 'bg-blue-500', textColor: 'text-blue-600' };
    return { label: 'Very Strong & Secure 🛡️', percent: 100, color: 'bg-emerald-500', textColor: 'text-emerald-600' };
  };

  const strength = getStrengthInfo();

  // 1:30 (90 seconds) OTP Countdown Timer
  useEffect(() => {
    if (step !== 'otp' || otpTimeLeft <= 0) return;
    const timer = setInterval(() => {
      setOtpTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setError('🔒 Verification code expired (1:30 limit reached). Please click Resend Code.');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [step, otpTimeLeft]);

  // Resend OTP Cooldown Timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // Input Sanitizers
  const handleFirstNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/[^a-zA-Z\s]/g, '');
    setFirstName(val);
  };

  const handleLastNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/[^a-zA-Z\s]/g, '');
    setLastName(val);
  };

  const handleMiddleInitialChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/[^a-zA-Z]/g, '').toUpperCase().slice(0, 2);
    setMiddleInitial(val);
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/[^0-9]/g, '').slice(0, 11);
    setPhone(val);
  };

  /** Helper to send real OTP email via EmailJS */
  const sendEmailOtp = async (targetEmail: string, targetName: string, code: string) => {
    const templateParams = {
      to_email: targetEmail,
      to_name: targetName,
      email: targetEmail,
      name: targetName,
      user_email: targetEmail,
      user_name: targetName,
      otp_code: code,
      otp: code,
      code: code,
      passcode: code,
      verification_code: code,
      number: code,
      message: `Your GovServe registration OTP verification code is ${code}.`,
      body: `Your GovServe registration OTP verification code is ${code}.`,
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

  /** STEP 1: Validate Registration Form & Dispatch OTP Email (Account NOT yet created) */
  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!firstName.trim()) {
      setError('Please enter your First Name.');
      return;
    }
    if (!lastName.trim()) {
      setError('Please enter your Last Name.');
      return;
    }
    if (!phone.trim()) {
      setError('Please enter your Mobile Phone Number.');
      return;
    }
    if (!phone.startsWith('09')) {
      setError('Mobile Phone Number must start with "09" (e.g. 09171234567).');
      return;
    }
    if (phone.length !== 11) {
      setError(`Mobile Phone Number must be exactly 11 digits (current: ${phone.length} digits).`);
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }
    if (!hasMinLength || !hasUpper || !hasLower || !hasNumber || !hasSymbol) {
      setError('Please meet all password security requirements.');
      return;
    }

    setSendingOtp(true);

    try {
      const alreadyExists = await checkEmailExists(email.trim());
      if (alreadyExists) {
        setError('⚠️ This email address is already registered. Please sign in instead.');
        setSendingOtp(false);
        return;
      }

      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const fullName = `${firstName.trim()} ${lastName.trim()}`;
      const cleanEmail = email.trim().toLowerCase();

      await sendEmailOtp(cleanEmail, fullName, code);

      setGeneratedOtp(code);
      setOtpAttempts(0);
      setUserOtpInput('');
      setOtpTimeLeft(90); // 1:30 timer
      setResendCooldown(30);
      setStep('otp');
      setSuccessMsg(`📩 6-digit verification code sent to ${cleanEmail}! Please enter it within 1:30.`);
    } catch (err) {
      setError('Failed to send OTP. Please check your network connection.');
    } finally {
      setSendingOtp(false);
    }
  };

  /** Resend OTP in Step 2 */
  const handleResendOtp = async () => {
    if (resendCooldown > 0 || sendingOtp) return;
    setError('');
    setSendingOtp(true);
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const fullName = `${firstName.trim()} ${lastName.trim()}`;
    const cleanEmail = email.trim().toLowerCase();

    await sendEmailOtp(cleanEmail, fullName, code);
    setGeneratedOtp(code);
    setOtpTimeLeft(90); // Reset 1:30 timer
    setResendCooldown(30);
    setSendingOtp(false);
    setSuccessMsg(`📩 A fresh OTP code has been sent to ${cleanEmail}. (Valid for 1:30)`);
  };

  /** STEP 2: Verify OTP Code 
   * Account is created upon successful OTP verification with default PIN 123456.
   * If user doesn't enter a PIN later or refreshes, their PIN is safely 123456.
   */
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (otpTimeLeft <= 0) {
      setError('🔒 OTP code expired. Please click Resend Code to request a fresh code.');
      return;
    }

    if (userOtpInput.trim() !== generatedOtp) {
      const newAttempts = otpAttempts + 1;
      setOtpAttempts(newAttempts);

      if (newAttempts >= 3) {
        setError('🔒 Maximum 3 OTP verification attempts reached. Returning to form...');
        setTimeout(() => {
          setStep('form');
          setError('');
          setUserOtpInput('');
        }, 1500);
        return;
      }

      setError(`🔒 Invalid OTP code. Attempt ${newAttempts} of 3.`);
      return;
    }

    setLoading(true);

    const fullName = `${firstName.trim()} ${middleInitial.trim() ? middleInitial.trim() + '.' : ''} ${lastName.trim()}`.replace(/\s+/g, ' ');
    const cleanEmail = email.trim().toLowerCase();

    try {
      // Register account in DB with default PIN '123456'
      const res = await registerCitizen({
        name: fullName,
        email: cleanEmail,
        phone: phone.trim(),
        password,
        pin: '123456'
      });

      if (res.success && res.user) {
        const userWithPin = { ...res.user, pin: '123456' };
        setRegisteredUser(userWithPin);

        markOtpVerified(cleanEmail, 'citizen');
        clearUserNotifications('Citizen', cleanEmail);

        // Advance to Step 3 (Create PIN)
        setStep('pin');
        setSuccessMsg('✅ Email verified and account registered! Set your custom PIN below or proceed with default "123456":');
      } else {
        setError(res.message || 'Registration failed. Please try again.');
      }
    } catch {
      setError('Error creating account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  /** STEP 3: Create Custom PIN or Finish with Default 123456 -> Redirect to Login */
  const handleSaveCustomPin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPin.length !== 6 || !/^\d{6}$/.test(newPin)) {
      setError('PIN must be exactly 6 numeric digits.');
      return;
    }
    if (newPin !== confirmPin) {
      setError('PINs do not match. Please re-enter and confirm.');
      return;
    }

    setLoading(true);
    const cleanEmail = email.trim().toLowerCase();

    try {
      await updateUserPin(cleanEmail, newPin);
      navigate(`/login?email=${encodeURIComponent(cleanEmail)}&signup=success`, { replace: true });
    } catch {
      setError('Failed to update PIN. Please try again.');
      setLoading(false);
    }
  };

  /** Finish with Default PIN 123456 -> Redirect to Login */
  const handleFinishWithDefaultPin = () => {
    const cleanEmail = email.trim().toLowerCase();
    navigate(`/login?email=${encodeURIComponent(cleanEmail)}&signup=success`, { replace: true });
  };

  const minutesOtp = Math.floor(otpTimeLeft / 60);
  const secondsOtp = otpTimeLeft % 60;
  const otpFormatted = `${String(minutesOtp).padStart(2, '0')}:${String(secondsOtp).padStart(2, '0')}`;

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
            Citizen Registration Portal
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-normal max-w-lg mx-auto">
            Create an official resident account to access municipal facility bookings, drainage assistance, and columbarium services.
          </p>
        </div>

        <div className="relative z-10 pt-4 border-t border-white/10 text-center text-xs text-slate-400 font-bold tracking-[0.25em] uppercase">
          SERVICE • INTEGRITY • PROGRESS
        </div>
      </div>

      {/* ── RIGHT PANEL: FORM CARD ── */}
      <div className="lg:w-1/2 p-6 sm:p-12 lg:p-16 flex items-center justify-center relative overflow-y-auto">
        <div className="w-full max-w-md space-y-6">
          
          <div>
            <Link 
              to="/login" 
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 transition-all shadow-xs"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Login</span>
            </Link>
          </div>

          <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-200/80 space-y-5">
            
            {/* Feedback Alerts */}
            {successMsg && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-semibold flex items-center gap-2 animate-fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            {error && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 font-semibold flex items-center gap-2 animate-fade-in">
                <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* ── STEP 1: REGISTER DETAILS FORM ── */}
            {step === 'form' && (
              <>
                <div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-[11px] font-bold mb-2">
                    <span>Step 1 of 3: Account Information</span>
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-extrabold font-display text-slate-900 tracking-tight">
                    Create Resident Account
                  </h2>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Fill out your official details below to begin registration.
                  </p>
                </div>

                <form onSubmit={handleRequestOtp} className="space-y-3.5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">First Name *</label>
                      <input
                        type="text"
                        required
                        value={firstName}
                        onChange={handleFirstNameChange}
                        placeholder="Juan"
                        className="w-full px-3 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 focus:bg-white text-slate-900 font-medium"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Last Name *</label>
                      <input
                        type="text"
                        required
                        value={lastName}
                        onChange={handleLastNameChange}
                        placeholder="Dela Cruz"
                        className="w-full px-3 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 focus:bg-white text-slate-900 font-medium"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Middle Initial <span className="text-slate-400 font-normal">(Optional)</span></label>
                    <input
                      type="text"
                      value={middleInitial}
                      onChange={handleMiddleInitialChange}
                      placeholder="M"
                      maxLength={2}
                      className="w-full px-3 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 focus:bg-white text-slate-900 font-medium font-mono"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-semibold text-slate-700">Mobile Phone Number *</label>
                      <span className={`text-[10px] font-mono font-bold ${
                        phone.length === 11 && phone.startsWith('09') 
                          ? 'text-emerald-600' 
                          : (phone.length >= 2 && !phone.startsWith('09'))
                          ? 'text-red-500'
                          : 'text-slate-400'
                      }`}>
                        {phone.length}/11 digits
                      </span>
                    </div>
                    <div className="relative">
                      <Phone className={`w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 ${
                        (phone.length >= 2 && !phone.startsWith('09')) ? 'text-red-400' : 'text-slate-400'
                      }`} />
                      <input
                        type="tel"
                        required
                        maxLength={11}
                        value={phone}
                        onChange={handlePhoneChange}
                        placeholder="09171234567"
                        className={`w-full pl-10 pr-3 py-2.5 text-xs rounded-xl focus:outline-none focus:ring-2 font-mono font-medium transition-all ${
                          (phone.length >= 2 && !phone.startsWith('09'))
                            ? 'bg-red-50/50 border border-red-300 focus:ring-red-500/20 focus:border-red-500 text-red-900'
                            : (phone.length === 11 && phone.startsWith('09'))
                            ? 'bg-emerald-50/40 border border-emerald-300 focus:ring-emerald-500/20 focus:border-emerald-600 text-slate-900'
                            : 'bg-slate-50 border border-slate-200 focus:ring-blue-500/20 focus:border-blue-600 focus:bg-white text-slate-900'
                        }`}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address *</label>
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
                      <label className="block text-xs font-semibold text-slate-700">Password *</label>
                      {password && (
                        <span className={`text-[11px] font-bold transition-all duration-300 ${strength.textColor}`}>
                          {strength.label}
                        </span>
                      )}
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

                    {/* Animated Strength Progress Bar */}
                    {password && (
                      <div className="mt-2 space-y-1.5 animate-fade-in">
                        <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all duration-500 ease-out ${strength.color}`}
                            style={{ width: `${strength.percent}%` }}
                          />
                        </div>

                        {/* Password Security Rules Checklist */}
                        <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/80 text-[11px] space-y-1">
                          <p className="font-bold text-slate-600 text-[10px] uppercase tracking-wider mb-1">
                            Security Requirements:
                          </p>
                          <div className="grid grid-cols-1 gap-1">
                            {criteriaList.map((crit, idx) => (
                              <div
                                key={idx}
                                className={`flex items-center gap-1.5 transition-colors duration-200 ${
                                  crit.valid
                                    ? 'text-emerald-600 font-semibold'
                                    : 'text-slate-400'
                                }`}
                              >
                                <div
                                  className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] transition-all duration-300 ${
                                    crit.valid
                                      ? 'bg-emerald-500 text-white scale-110'
                                      : 'bg-slate-200 text-slate-400'
                                  }`}
                                >
                                  {crit.valid ? <Check className="w-2.5 h-2.5 stroke-[3]" /> : '•'}
                                </div>
                                <span>{crit.label}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={sendingOtp}
                    className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-4"
                  >
                    {sendingOtp ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Sending OTP to Email...</span>
                      </>
                    ) : (
                      <span>Proceed to OTP Verification →</span>
                    )}
                  </button>
                </form>

                <div className="pt-2 text-center text-xs text-slate-600 border-t border-slate-100">
                  <p>
                    Already have an account?{' '}
                    <Link to="/login" className="font-bold text-blue-600 hover:underline">
                      Sign in
                    </Link>
                  </p>
                </div>
              </>
            )}

            {/* ── STEP 2: OTP VERIFICATION FORM (NO EDIT INFO BUTTON, 1:30 TIMER) ── */}
            {step === 'otp' && (
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-[11px] font-bold">
                      <span>Step 2 of 3: Verification</span>
                    </div>

                    {/* 1:30 Countdown Badge */}
                    <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-300 text-amber-800 text-[11px] font-mono font-extrabold">
                      <Clock className="w-3 h-3 text-amber-600 animate-pulse" />
                      <span>{otpFormatted}</span>
                    </div>
                  </div>

                  <h2 className="text-2xl font-extrabold font-display text-slate-900 tracking-tight">
                    Verify Your Email
                  </h2>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    A 6-digit security code was sent to <strong className="text-blue-700 font-bold">{email}</strong>. (Expires in {otpFormatted}).
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5 text-center">
                    Enter 6-Digit Verification Code
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

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={userOtpInput.length !== 6 || otpTimeLeft <= 0 || loading}
                    className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Verifying Code & Registering Account...</span>
                      </>
                    ) : (
                      <span>Verify Code & Continue →</span>
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* ── STEP 3: CREATE 6-DIGIT PIN ── */}
            {step === 'pin' && (
              <div className="space-y-4">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-bold mb-2">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Step 3 of 3: Security PIN</span>
                  </div>
                  <h2 className="text-2xl font-extrabold font-display text-slate-900 tracking-tight">
                    Create Your 6-Digit PIN
                  </h2>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    Set your personalized 6-digit PIN below, or continue with the default PIN <strong className="font-mono font-bold text-slate-900">123456</strong>.
                  </p>
                </div>

                {/* Account PIN Notice */}
                <div className="p-3 bg-amber-50/90 border border-amber-200/90 rounded-2xl text-[11px] text-amber-800 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-amber-900">
                    <ShieldCheck className="w-4 h-4 text-amber-700" />
                    <span>Account Notice</span>
                  </div>
                  <p className="text-slate-700">
                    if you didnt enter your pin or accidentally refreshed the site your default pin is <strong className="font-mono font-bold text-amber-900">"123456"</strong>
                  </p>
                </div>

                <form onSubmit={handleSaveCustomPin} className="space-y-4 pt-1">
                  <div className="space-y-4">
                    <PinInput
                      label="Create Custom 6-Digit PIN"
                      value={newPin}
                      onChange={setNewPin}
                      autoFocus={true}
                    />

                    <PinInput
                      label="Confirm 6-Digit PIN"
                      value={confirmPin}
                      onChange={setConfirmPin}
                      autoFocus={false}
                    />
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2 pt-2">
                    <button
                      type="submit"
                      disabled={loading || newPin.length !== 6 || confirmPin.length !== 6}
                      className="flex-1 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Saving Custom PIN...</span>
                        </>
                      ) : (
                        <span>Save PIN & Proceed to Login →</span>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={handleFinishWithDefaultPin}
                      className="py-3 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
                    >
                      Keep Default (123456) & Login
                    </button>
                  </div>
                </form>
              </div>
            )}

          </div>
        </div>
      </div>

    </div>
  );
}
