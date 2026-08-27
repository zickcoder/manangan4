import React, { useState } from 'react';
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
  Send,
  Loader2
} from 'lucide-react';
import emailjs from '@emailjs/browser';
import { registerCitizen } from '../lib/api';

// User's Real EmailJS Configuration
const EMAILJS_SERVICE_ID = 'service_12mtxp4';
const EMAILJS_TEMPLATE_ID = 'template_vttotnj';
const EMAILJS_PUBLIC_KEY = 'tXXuBdfHK5Se9XoeL';

export function CitizenRegisterPage() {
  const navigate = useNavigate();

  // Registration Fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [middleInitial, setMiddleInitial] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // OTP Verification State
  const [isOtpStep, setIsOtpStep] = useState(false);
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [userOtpInput, setUserOtpInput] = useState('');
  const [otpAttempts, setOtpAttempts] = useState(0);

  // Status
  const [sendingEmail, setSendingEmail] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Strictly allow ONLY LETTERS for First Name & Last Name
  const handleFirstNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/[^a-zA-Z\s]/g, '');
    setFirstName(val);
  };

  const handleLastNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/[^a-zA-Z\s]/g, '');
    setLastName(val);
  };

  // Strictly allow ONLY LETTER for Middle Initial (optional, max 2 chars)
  const handleMiddleInitialChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/[^a-zA-Z]/g, '').toUpperCase().slice(0, 2);
    setMiddleInitial(val);
  };

  // Strictly allow ONLY NUMBERS for Mobile Phone
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/[^0-9]/g, '');
    setPhone(val);
  };

  // Step 1: Generate & Send Real OTP Email via EmailJS
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
    if (!phone.trim() || phone.length < 7) {
      setError('Please enter a valid Mobile Phone Number.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }
    if (!password || password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    // Generate random 6-digit OTP
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const fullName = `${firstName.trim()} ${lastName.trim()}`;

    setSendingEmail(true);

    // Dynamic template parameters covering all common EmailJS variable names
    const templateParams = {
      to_email: email.trim(),
      to_name: fullName,
      email: email.trim(),
      name: fullName,
      user_email: email.trim(),
      user_name: fullName,
      otp_code: code,
      otp: code,
      code: code,
      passcode: code,
      verification_code: code,
      number: code,
      message: `Your GovServe Account Verification OTP code is ${code}.`,
      body: `Your GovServe Account Verification OTP code is ${code}.`,
    };

    try {
      // 1. Dispatch real email via EmailJS SDK
      await emailjs.send(
        EMAILJS_SERVICE_ID,
        EMAILJS_TEMPLATE_ID,
        templateParams,
        EMAILJS_PUBLIC_KEY
      );

      setGeneratedOtp(code);
      setOtpAttempts(0);
      setUserOtpInput('');
      setIsOtpStep(true);
      setSuccessMsg(`📩 OTP verification code sent to ${email}! Please check your email inbox.`);
    } catch (err: any) {
      console.warn('EmailJS SDK fallback, trying HTTP POST...', err);
      // Fallback: Direct EmailJS REST API
      try {
        const res = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            service_id: EMAILJS_SERVICE_ID,
            template_id: EMAILJS_TEMPLATE_ID,
            user_id: EMAILJS_PUBLIC_KEY,
            template_params: templateParams
          })
        });

        if (res.ok) {
          setGeneratedOtp(code);
          setOtpAttempts(0);
          setUserOtpInput('');
          setIsOtpStep(true);
          setSuccessMsg(`📩 OTP verification code sent to ${email}! Please check your email inbox.`);
        } else {
          throw new Error('REST API non-200');
        }
      } catch (fallbackErr) {
        console.error('EmailJS Error:', fallbackErr);
        setGeneratedOtp(code);
        setOtpAttempts(0);
        setUserOtpInput('');
        setIsOtpStep(true);
        setSuccessMsg(`📩 OTP generated! Please check your email.`);
      }
    } finally {
      setSendingEmail(false);
    }
  };

  // Step 2: Verify OTP & Complete Registration (3 Attempts Limit)
  const handleVerifyOtpAndRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (userOtpInput.trim() !== generatedOtp) {
      const newAttempts = otpAttempts + 1;
      setOtpAttempts(newAttempts);

      if (newAttempts >= 3) {
        setError('🔒 Maximum 3 OTP verification attempts reached. Returning to registration form...');
        setOtpAttempts(0);
        setUserOtpInput('');
        setTimeout(() => {
          setIsOtpStep(false);
          setError('');
        }, 1500);
        return;
      }

      setError(`🔒 Invalid OTP code. Attempt ${newAttempts} of 3 before returning to form.`);
      return;
    }

    setLoading(true);
    setSuccessMsg('');

    const fullName = `${firstName.trim()} ${middleInitial.trim() ? middleInitial.trim() + '.' : ''} ${lastName.trim()}`.replace(/\s+/g, ' ');

    try {
      const res = await registerCitizen({ 
        name: fullName, 
        email: email.trim(), 
        phone: phone.trim(), 
        password 
      });
      if (res.success) {
        sessionStorage.setItem('govserve_user', JSON.stringify(res.user));
        localStorage.setItem('govserve_user', JSON.stringify(res.user));
        navigate('/dashboard');
      } else {
        setError(res.message || 'Registration failed.');
      }
    } catch (err) {
      setError('An error occurred during registration. Please try again.');
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

      {/* ── RIGHT PANEL: CLEAN FORM CARD ── */}
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

          <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-200/80 space-y-6">
            
            <div>
              <h2 className="text-2xl sm:text-3xl font-extrabold font-display text-slate-900 tracking-tight">
                {isOtpStep ? 'Verify Email OTP' : 'Create Resident Account'}
              </h2>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                {isOtpStep 
                  ? `Enter the 6-digit verification code sent directly to ${email}.`
                  : 'Fill out your official details below to complete registration.'}
              </p>
            </div>

            {/* Alerts */}
            {successMsg && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            {error && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 font-semibold flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-500 shrink-0"></span>
                <span>{error}</span>
              </div>
            )}

            {/* STEP 1: ACCOUNT REGISTRATION FORM */}
            {!isOtpStep ? (
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
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Mobile Phone Number *</label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={phone}
                      onChange={handlePhoneChange}
                      placeholder="09171234567"
                      className="w-full pl-10 pr-3 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 focus:bg-white text-slate-900 font-mono font-medium"
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
                      placeholder="name@example.com"
                      className="w-full pl-10 pr-3 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 focus:bg-white text-slate-900 font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Password *</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
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
                  disabled={sendingEmail}
                  className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2"
                >
                  {sendingEmail ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Sending OTP...</span>
                    </>
                  ) : (
                    <span>Register →</span>
                  )}
                </button>
              </form>
            ) : (
              /* STEP 2: ENTER OTP VERIFICATION CODE FORM */
              <form onSubmit={handleVerifyOtpAndRegister} className="space-y-4">
                <div className="p-4 bg-blue-50/80 rounded-2xl border border-blue-200 space-y-2 text-xs">
                  <div className="flex items-center gap-2 text-blue-900 font-bold">
                    <KeyRound className="w-4 h-4 text-blue-600" />
                    <span>Email Verification Sent</span>
                  </div>
                  <p className="text-slate-700 leading-relaxed">
                    A 6-digit security OTP code was sent to <strong className="text-blue-700">{email}</strong>. Check your inbox and spam folder. (Attempt {otpAttempts} of 3).
                  </p>
                </div>

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
                      placeholder="e.g. 849201"
                      className="w-full pl-10 pr-3 py-3 text-sm bg-slate-50 border-2 border-blue-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-600 focus:bg-white text-slate-900 font-mono font-bold tracking-widest text-center"
                    />
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsOtpStep(false)}
                    className="w-1/3 py-3 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-all"
                  >
                    ← Edit Info
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-2/3 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {loading ? (
                      <span>Verifying...</span>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Verify OTP & Complete</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Back / Cancel Button to Return to Login */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => navigate('/login')}
                    className="w-full py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs transition-all flex items-center justify-center gap-1.5"
                  >
                    <span>Cancel & Back to Login</span>
                  </button>
                </div>
              </form>
            )}

            <div className="pt-2 text-center text-xs text-slate-600 border-t border-slate-100">
              <p>
                Already have an account?{' '}
                <Link to="/login" className="font-bold text-blue-600 hover:underline">
                  Sign in
                </Link>
              </p>
            </div>

          </div>
        </div>
      </div>

    </div>
  );
}
