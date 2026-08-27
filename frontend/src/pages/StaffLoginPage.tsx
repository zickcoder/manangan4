import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Lock, 
  Mail, 
  Eye, 
  EyeOff, 
  ArrowLeft,
  ShieldCheck,
  KeyRound,
  CheckCircle2,
  Loader2
} from 'lucide-react';
import emailjs from '@emailjs/browser';
import { loginStaff, getLockoutTimeRemaining, recordFailedAttempt, recordSuccessfulLogin, checkEmailExists, updateUserPassword } from '../lib/api';

const EMAILJS_SERVICE_ID = 'service_12mtxp4';
const EMAILJS_TEMPLATE_ID = 'template_vttotnj';
const EMAILJS_PUBLIC_KEY = 'tXXuBdfHK5Se9XoeL';

export function StaffLoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [lockoutSeconds, setLockoutSeconds] = useState<number>(0);

  // Inline Forgot Password State
  const [isForgotMode, setIsForgotMode] = useState(false);
  const [forgotStep, setForgotStep] = useState<1 | 2 | 3>(1);
  const [forgotEmail, setForgotEmail] = useState('');
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [userOtpInput, setUserOtpInput] = useState('');
  const [otpAttempts, setOtpAttempts] = useState(0);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [forgotSending, setForgotSending] = useState(false);
  const [forgotMsg, setForgotMsg] = useState('');
  const [forgotError, setForgotError] = useState('');

  useEffect(() => {
    const rem = getLockoutTimeRemaining('staff');
    if (rem > 0) setLockoutSeconds(rem);
  }, []);

  useEffect(() => {
    if (lockoutSeconds <= 0) return;
    const timer = setInterval(() => {
      setLockoutSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setError('');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [lockoutSeconds]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const remLock = getLockoutTimeRemaining('staff');
    if (remLock > 0) {
      setLockoutSeconds(remLock);
      setError(`🔒 Account locked. Try again in ${remLock} seconds.`);
      return;
    }

    setLoading(true);

    try {
      const res = await loginStaff(email, password);
      if (res.success) {
        recordSuccessfulLogin('staff');
        sessionStorage.setItem('govserve_user', JSON.stringify(res.user));
        localStorage.setItem('govserve_user', JSON.stringify(res.user));
        navigate('/dashboard');
      } else {
        const status = recordFailedAttempt('staff');
        if (status.locked) {
          setLockoutSeconds(status.remSeconds);
          setError(`🔒 Security Lockout: 3 invalid attempts reached. Account locked for 3 minutes (180s).`);
        } else {
          setError(`Invalid email or password. Attempt ${status.fails} of 3 before 3-minute lockout.`);
        }
      }
    } catch (err) {
      setError('Login error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Inline Forgot Password Step 1
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
      const isAdmin = cleanEmail === 'ronmanangan10@gmail.com' || cleanEmail === 'admin@govserve.gov.ph';
      const exists = isAdmin || (await checkEmailExists(cleanEmail));
      if (!exists) {
        setForgotError('⚠️ This email address is not registered in our system.');
        setForgotSending(false);
        return;
      }

      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const templateParams = {
        to_email: cleanEmail,
        to_name: 'Staff Officer',
        email: cleanEmail,
        name: 'Staff Officer',
        otp_code: code,
        otp: code,
        code: code,
        passcode: code,
        verification_code: code,
        number: code,
        message: `Your GovServe Password Reset OTP code is ${code}.`,
        body: `Your GovServe Password Reset OTP code is ${code}.`,
      };

      try {
        await emailjs.send(
          EMAILJS_SERVICE_ID,
          EMAILJS_TEMPLATE_ID,
          templateParams,
          EMAILJS_PUBLIC_KEY
        );
      } catch (e) {
        console.warn('EmailJS SDK fallback:', e);
      }

      setGeneratedOtp(code);
      setOtpAttempts(0);
      setUserOtpInput('');
      setForgotStep(2);
      setForgotMsg(`📩 OTP verification code sent to ${cleanEmail}! Please check your email.`);
    } catch (err) {
      setForgotError('Failed to send OTP. Please try again.');
    } finally {
      setForgotSending(false);
    }
  };

  // Inline Forgot Password Step 2
  const handleVerifyForgotOtp = (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError('');

    if (userOtpInput.trim() !== generatedOtp) {
      const newAttempts = otpAttempts + 1;
      setOtpAttempts(newAttempts);

      if (newAttempts >= 3) {
        setForgotError('🔒 Maximum 3 OTP attempts reached. Returning to email step...');
        setOtpAttempts(0);
        setUserOtpInput('');
        setTimeout(() => {
          setForgotStep(1);
          setForgotError('');
        }, 1500);
        return;
      }

      setForgotError(`🔒 Invalid OTP code. Attempt ${newAttempts} of 3.`);
      return;
    }

    setForgotMsg('✅ OTP verified! Set your new password below.');
    setForgotStep(3);
  };

  // Inline Forgot Password Step 3
  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError('');

    if (!newPassword || newPassword.length < 6) {
      setForgotError('New password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setForgotError('Passwords do not match. Please ensure both fields are identical.');
      return;
    }

    setLoading(true);

    try {
      const res = await updateUserPassword(forgotEmail.trim(), newPassword);
      if (res.success) {
        setForgotMsg('✅ Password reset successfully! You can now sign in.');
        setTimeout(() => {
          setIsForgotMode(false);
          setEmail(forgotEmail);
          setForgotStep(1);
          setForgotMsg('');
        }, 1500);
      } else {
        setForgotError(res.message || 'Failed to update password.');
      }
    } catch (err) {
      setForgotError('Error resetting password.');
    } finally {
      setLoading(false);
    }
  };

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
          <p className="text-xs font-mono font-bold tracking-[0.2em] text-blue-300 uppercase">
            PUBLIC ASSETS & FACILITIES SYSTEM
          </p>
        </div>

        <div className="relative z-10 my-auto py-8 lg:py-12 space-y-4 max-w-xl text-center mx-auto">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold font-display tracking-tight text-white leading-tight">
            Public Assets & Facilities Management System
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-normal max-w-lg mx-auto">
            A digital platform for securely managing citizen information, government services, public feedback, community engagement, and local government notifications.
          </p>
        </div>

        <div className="relative z-10 pt-4 border-t border-white/10 text-center text-xs text-slate-400 font-bold tracking-[0.25em] uppercase">
          SERVICE • INTEGRITY • PROGRESS
        </div>
      </div>

      {/* ── RIGHT PANEL: CLEAN FORM CARD ── */}
      <div className="lg:w-1/2 p-6 sm:p-12 lg:p-16 flex items-center justify-center relative overflow-y-auto">
        <div className="w-full max-w-md space-y-6">
          
          {/* Back to Homepage Button */}
          <div>
            <Link 
              to="/" 
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 transition-all shadow-xs"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to homepage</span>
            </Link>
          </div>

          {/* Form Card */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-200/80 space-y-6">
            
            {!isForgotMode ? (
              /* ── NORMAL STAFF LOGIN FORM ── */
              <>
                <div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-purple-100 text-purple-700 text-[10px] font-bold uppercase mb-2">
                    <ShieldCheck className="w-3 h-3" />
                    <span>Municipal Staff Console</span>
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-extrabold font-display text-slate-900 tracking-tight">
                    Staff Sign in
                  </h2>
                  <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                    Authorized municipal staff and executive administrators sign in here.
                  </p>
                </div>

                {error && (
                  <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 font-semibold flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-red-500 shrink-0"></span>
                    <span>{error}</span>
                  </div>
                )}

                <form onSubmit={handleLogin} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Email</label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="name@example.com"
                        className="w-full pl-10 pr-3 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 focus:bg-white text-slate-900 font-medium"
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
                        className="text-[11px] font-semibold text-purple-600 hover:underline cursor-pointer"
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
                        placeholder="••••••••"
                        className="w-full pl-10 pr-10 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 focus:bg-white text-slate-900 font-medium"
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
                    disabled={loading}
                    className="w-full py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2"
                  >
                    {loading ? (
                      <span>Signing in...</span>
                    ) : (
                      <span>Sign in →</span>
                    )}
                  </button>
                </form>
              </>
            ) : (
              /* ── INLINE FORGOT PASSWORD FORM ── */
              <div className="space-y-4">
                <div>
                  <button 
                    type="button"
                    onClick={() => setIsForgotMode(false)}
                    className="text-xs font-bold text-purple-600 hover:underline inline-flex items-center gap-1 mb-2"
                  >
                    ← Back to Sign in
                  </button>
                  <h2 className="text-2xl font-extrabold font-display text-slate-900 tracking-tight">
                    {forgotStep === 1 ? 'Reset Staff Password' : forgotStep === 2 ? 'Enter 6-Digit OTP' : 'Set New Password'}
                  </h2>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    {forgotStep === 1 
                      ? 'Enter your staff account email address to receive an OTP.' 
                      : forgotStep === 2 
                      ? `Enter the 6-digit code sent to ${forgotEmail}.` 
                      : 'Choose a secure new password.'}
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
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Staff Account Email *</label>
                      <div className="relative">
                        <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="email"
                          required
                          value={forgotEmail}
                          onChange={(e) => setForgotEmail(e.target.value)}
                          placeholder="name@example.com"
                          className="w-full pl-10 pr-3 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 focus:bg-white text-slate-900 font-medium"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={forgotSending}
                      className="w-full py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {forgotSending ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Sending OTP...</span>
                        </>
                      ) : (
                        <span>Send Reset OTP →</span>
                      )}
                    </button>
                  </form>
                )}

                {forgotStep === 2 && (
                  <form onSubmit={handleVerifyForgotOtp} className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Enter 6-Digit Email OTP *</label>
                      <div className="relative">
                        <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          required
                          maxLength={6}
                          value={userOtpInput}
                          onChange={(e) => setUserOtpInput(e.target.value.replace(/[^0-9]/g, ''))}
                          placeholder="e.g. 948210"
                          className="w-full pl-10 pr-3 py-3 text-sm bg-slate-50 border-2 border-purple-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/30 text-slate-900 font-mono font-bold tracking-widest text-center"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      Verify OTP →
                    </button>
                  </form>
                )}

                {forgotStep === 3 && (
                  <form onSubmit={handleResetPasswordSubmit} className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">New Password *</label>
                      <div className="relative">
                        <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type={showPass ? 'text' : 'password'}
                          required
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="At least 6 characters"
                          className="w-full pl-10 pr-10 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 text-slate-900 font-medium"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPass(!showPass)}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                          {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Confirm New Password *</label>
                      <div className="relative">
                        <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type={showPass ? 'text' : 'password'}
                          required
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Re-enter new password"
                          className="w-full pl-10 pr-3 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 text-slate-900 font-medium"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {loading ? <span>Saving Password...</span> : <span>Save New Password</span>}
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
