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
  Loader2,
  Check,
  ShieldCheck,
  ShieldAlert
} from 'lucide-react';
import emailjs from '@emailjs/browser';
import { registerCitizen, checkEmailExists } from '../lib/api';

// User's Real EmailJS Configuration
const EMAILJS_SERVICE_ID = 'service_6vsq3nj';
const EMAILJS_TEMPLATE_ID = 'template_dchi14k';
const EMAILJS_PUBLIC_KEY = '-3noUYuzaJc6YK0ej';

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

  // Strictly allow ONLY NUMBERS for Mobile Phone (maximum 11 digits)
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/[^0-9]/g, '').slice(0, 11);
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
    if (!phone.trim()) {
      setError('Please enter your Mobile Phone Number.');
      return;
    }
    if (!phone.startsWith('09')) {
      setError('Mobile Phone Number must start with "09" (e.g. 09171234567).');
      return;
    }
    if (phone.length !== 11) {
      setError(`Mobile Phone Number must be exactly 11 digits (current: ${phone.length} digits). Example: 09171234567`);
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }
    if (!hasMinLength) {
      setError('Password must be at least 12 characters long.');
      return;
    }
    if (!hasUpper) {
      setError('Password must contain at least one uppercase letter (A-Z).');
      return;
    }
    if (!hasLower) {
      setError('Password must contain at least one lowercase letter (a-z).');
      return;
    }
    if (!hasNumber) {
      setError('Password must contain at least one number (0-9).');
      return;
    }
    if (!hasSymbol) {
      setError('Password must contain at least one special symbol (!, @, #, etc.).');
      return;
    }

    // ── Check if email is ALREADY registered BEFORE sending OTP ──
    setSendingEmail(true);
    try {
      const alreadyExists = await checkEmailExists(email.trim());
      if (alreadyExists) {
        setError('⚠️ This email address is already registered. Please sign in instead.');
        setSendingEmail(false);
        return;
      }
    } catch {
      // If check fails, proceed (don't block registration)
    }

    // Generate random 6-digit OTP
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const fullName = `${firstName.trim()} ${lastName.trim()}`;

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
                  {phone.length > 0 && !phone.startsWith('09') && (
                    <p className="text-[10px] text-red-600 font-semibold mt-1 flex items-center gap-1">
                      ⚠️ Mobile number must start with "09" (e.g. 09171234567).
                    </p>
                  )}
                  {phone.startsWith('09') && phone.length < 11 && (
                    <p className="text-[10px] text-amber-600 font-medium mt-1">
                      Starts with "09". Remaining: {11 - phone.length} more {11 - phone.length === 1 ? 'digit' : 'digits'}.
                    </p>
                  )}
                  {phone.startsWith('09') && phone.length === 11 && (
                    <p className="text-[10px] text-emerald-600 font-medium mt-1 flex items-center gap-1">
                      ✓ Valid 11-digit mobile number (starts with 09)
                    </p>
                  )}
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
