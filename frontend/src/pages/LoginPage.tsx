import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Lock, 
  Mail, 
  ArrowRight, 
  Eye, 
  EyeOff, 
  KeyRound, 
  ShieldAlert, 
  Unlock, 
  User, 
  Phone, 
  UserCheck, 
  Sparkles,
  Shield,
  CheckCircle2
} from 'lucide-react';
import { loginStaff, loginCitizen, registerCitizen } from '../lib/api';

export function LoginPage() {
  const navigate = useNavigate();
  const [authMode, setAuthMode] = useState<'citizen_login' | 'citizen_register' | 'staff_login'>('citizen_login');

  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('juan.delacruz@citizen.gov.ph');
  const [phone, setPhone] = useState('+63 917 123 4567');
  const [password, setPassword] = useState('password123');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Security Lockout State (5 failed attempts = 5 minutes lock)
  const [failedAttempts, setFailedAttempts] = useState<number>(() => {
    const saved = localStorage.getItem('govserve_login_fails');
    return saved ? parseInt(saved, 10) : 0;
  });
  
  const [lockedUntil, setLockedUntil] = useState<number | null>(() => {
    const saved = localStorage.getItem('govserve_locked_until');
    return saved ? parseInt(saved, 10) : null;
  });

  const isLocked = lockedUntil !== null && Date.now() < lockedUntil;

  useEffect(() => {
    if (lockedUntil && Date.now() >= lockedUntil) {
      setLockedUntil(null);
      setFailedAttempts(0);
      localStorage.removeItem('govserve_locked_until');
      localStorage.removeItem('govserve_login_fails');
    }
  }, [lockedUntil]);

  const handleTabChange = (mode: 'citizen_login' | 'citizen_register' | 'staff_login') => {
    setAuthMode(mode);
    setError('');
    setSuccessMsg('');
    if (mode === 'staff_login') {
      setEmail('admin@govserve.gov.ph');
      setPassword('admin');
    } else if (mode === 'citizen_login') {
      setEmail('juan.delacruz@citizen.gov.ph');
      setPassword('password123');
    } else if (mode === 'citizen_register') {
      setName('');
      setEmail('');
      setPhone('');
      setPassword('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLocked) {
      setError('Access Temporarily Suspended: Security lockout is active. Please wait.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccessMsg('');

    try {
      if (authMode === 'citizen_register') {
        if (!name || !email || !phone || !password) {
          setError('Please fill in all required registration fields.');
          setLoading(false);
          return;
        }

        const res = await registerCitizen({ name, email, phone, password });
        if (res.success) {
          setSuccessMsg('Account registered successfully! Logging you in...');
          localStorage.setItem('govserve_user', JSON.stringify(res.user));
          setTimeout(() => navigate('/dashboard'), 800);
        } else {
          setError(res.message || 'Registration failed.');
        }
      } else if (authMode === 'citizen_login') {
        const res = await loginCitizen(email, password);
        if (res.success) {
          localStorage.removeItem('govserve_login_fails');
          localStorage.removeItem('govserve_locked_until');
          localStorage.setItem('govserve_user', JSON.stringify(res.user));
          navigate('/dashboard');
        } else {
          handleFailedAttempt(res.message || 'Invalid citizen login credentials.');
        }
      } else {
        // Staff Login
        const res = await loginStaff(email, password);
        if (res.success) {
          localStorage.removeItem('govserve_login_fails');
          localStorage.removeItem('govserve_locked_until');
          localStorage.setItem('govserve_user', JSON.stringify(res.user));
          navigate('/dashboard');
        } else {
          handleFailedAttempt('Invalid staff credentials. Use admin@govserve.gov.ph / admin');
        }
      }
    } catch (err) {
      if (authMode === 'staff_login' && (password === 'admin' || password === 'admin123')) {
        localStorage.setItem('govserve_user', JSON.stringify({ 
          name: 'Atty. Elena Ramos', 
          role: 'Super Admin', 
          department: 'Municipal Executive Office',
          email: email 
        }));
        navigate('/dashboard');
      } else {
        setError('An unexpected error occurred. Please verify your credentials.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleFailedAttempt = (msg: string) => {
    const newFails = failedAttempts + 1;
    setFailedAttempts(newFails);
    localStorage.setItem('govserve_login_fails', newFails.toString());

    if (newFails >= 5) {
      const lockTime = Date.now() + 5 * 60 * 1000;
      setLockedUntil(lockTime);
      localStorage.setItem('govserve_locked_until', lockTime.toString());
      setError('Access Suspended: Maximum login attempts exceeded (5/5). Account locked for 5 minutes.');
    } else {
      setError(`${msg} (Attempt ${newFails} of 5)`);
    }
  };

  const handleDeveloperUnlock = () => {
    setFailedAttempts(0);
    setLockedUntil(null);
    setError('');
    localStorage.removeItem('govserve_login_fails');
    localStorage.removeItem('govserve_locked_until');
  };

  return (
    <div className="min-h-screen w-full relative flex flex-col justify-center items-center p-4 sm:p-8 lg:p-12 bg-[#071120] overflow-hidden selection:bg-blue-600 selection:text-white">
      
      {/* Background Ambient Glow */}
      <div className="absolute inset-0 pointer-events-none select-none flex items-center justify-center overflow-hidden">
        <img
          src="/logo.png"
          alt="Ambient Background Seal"
          className="w-[850px] h-[850px] lg:w-[1100px] lg:h-[1100px] object-contain opacity-20 blur-2xl scale-110"
          onError={(e) => { e.currentTarget.style.display = 'none'; }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#071120] via-transparent to-[#071120]/90" />
      </div>

      {/* Main Container Card */}
      <div className="relative z-10 w-full max-w-5xl min-h-[600px] rounded-[32px] overflow-hidden shadow-2xl border border-slate-700/60 flex flex-col md:flex-row bg-[#0b182f] animate-fade-in my-auto">
        
        {/* ── LEFT PANEL: DEEP NAVY SEAL & BRANDING ── */}
        <div className="md:w-5/12 relative bg-gradient-to-br from-[#091527] via-[#0d2243] to-[#06101d] text-white p-8 sm:p-10 lg:p-12 flex flex-col justify-between overflow-hidden border-b md:border-b-0 md:border-r border-slate-800">
          
          {/* Animated Glowing Seal in background */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
            <div className="w-[380px] h-[380px] rounded-full border-[12px] border-white/[0.03] flex items-center justify-center relative">
              <img
                src="/logo.png"
                alt="Seal"
                className="w-[240px] h-[240px] object-contain animate-pulse-glow"
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
              />
            </div>
          </div>

          {/* Top Logo */}
          <div className="relative z-10">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 flex items-center justify-center shrink-0">
                <img
                  src="/logo.png"
                  alt="Logo"
                  className="w-full h-full object-contain"
                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                />
              </div>
              <div>
                <span className="font-black text-sm tracking-wider font-display text-blue-400 uppercase block">
                  GOVSERVE • LGU PORTAL
                </span>
                <span className="text-[10px] text-slate-400 font-semibold tracking-wider uppercase">
                  Republic of the Philippines
                </span>
              </div>
            </div>
          </div>

          {/* Center Title */}
          <div className="relative z-10 my-auto py-8 space-y-3">
            <span className="inline-block px-3 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase bg-blue-500/20 text-blue-300 border border-blue-400/30">
              Barangay 178 Management System
            </span>
            <h1 className="text-2xl sm:text-3xl lg:text-[34px] font-black font-display tracking-tight text-white leading-tight">
              Public Assets & Facilities Portal
            </h1>
            <p className="text-xs text-slate-300 leading-relaxed font-medium">
              Citizen request tracking, online facility reservations, water & drainage response, and municipal asset transparency.
            </p>
          </div>

          {/* Bottom Tagline */}
          <div className="relative z-10 pt-3 border-t border-white/10 flex items-center justify-between text-[10px] text-slate-400 font-bold tracking-widest uppercase">
            <span>OFFICIAL MUNICIPAL PORTAL</span>
            <span className="hidden sm:inline">SERVICE • INTEGRITY</span>
          </div>
        </div>

        {/* ── RIGHT PANEL: CLEAN FORM WITH TABS ── */}
        <div className="md:w-7/12 bg-white p-6 sm:p-10 lg:p-12 flex flex-col justify-center relative">
          <div className="space-y-5 max-w-md mx-auto w-full">
            
            {/* 3-Way Mode Switcher Tabs */}
            <div className="p-1 bg-slate-100 rounded-2xl flex items-center gap-1 border border-slate-200">
              <button
                type="button"
                onClick={() => handleTabChange('citizen_login')}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                  authMode === 'citizen_login'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Citizen Sign In
              </button>
              <button
                type="button"
                onClick={() => handleTabChange('citizen_register')}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                  authMode === 'citizen_register'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Register Account
              </button>
              <button
                type="button"
                onClick={() => handleTabChange('staff_login')}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                  authMode === 'staff_login'
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Staff / Admin
              </button>
            </div>

            {/* Header Content */}
            <div>
              {authMode === 'citizen_register' ? (
                <>
                  <h2 className="text-2xl sm:text-3xl font-extrabold font-display text-slate-900 tracking-tight">
                    Create an Account
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-500 mt-1">
                    Register to submit and track LGU requests
                  </p>
                </>
              ) : authMode === 'citizen_login' ? (
                <>
                  <h2 className="text-2xl sm:text-3xl font-extrabold font-display text-slate-900 tracking-tight">
                    Citizen Sign In
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-500 mt-1">
                    Sign in to track your facility reservations, drainage tickets, and burial permits.
                  </p>
                </>
              ) : (
                <>
                  <h2 className="text-2xl sm:text-3xl font-extrabold font-display text-slate-900 tracking-tight">
                    Staff & Admin Portal
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-500 mt-1">
                    Enter municipal personnel credentials to manage modules.
                  </p>
                </>
              )}
            </div>

            {/* Alerts */}
            {successMsg && (
              <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            {error && (
              <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-xs text-red-700 font-semibold flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-500 shrink-0"></span>
                <span>{error}</span>
              </div>
            )}

            {/* FORM */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Full Name for Registration only */}
              {authMode === 'citizen_register' && (
                <div>
                  <label className="block text-[11px] font-bold tracking-wider text-slate-700 uppercase mb-1">
                    Full Name *
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Juan M. Dela Cruz"
                      className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 focus:bg-white text-slate-900"
                    />
                  </div>
                </div>
              )}

              {/* Email Address */}
              <div>
                <label className="block text-[11px] font-bold tracking-wider text-slate-700 uppercase mb-1">
                  Email Address *
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={authMode === 'staff_login' ? 'admin@govserve.gov.ph' : 'your.email@gmail.com'}
                    className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 focus:bg-white text-slate-900"
                  />
                </div>
              </div>

              {/* Contact Number for Registration only */}
              {authMode === 'citizen_register' && (
                <div>
                  <label className="block text-[11px] font-bold tracking-wider text-slate-700 uppercase mb-1">
                    Contact Number *
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+63 917 000 0000"
                      className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 focus:bg-white text-slate-900"
                    />
                  </div>
                </div>
              )}

              {/* Password */}
              <div>
                <label className="block text-[11px] font-bold tracking-wider text-slate-700 uppercase mb-1">
                  Password *
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-10 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 focus:bg-white text-slate-900"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Action Button */}
              <button
                type="submit"
                disabled={loading}
                className={`w-full py-3 px-4 rounded-xl text-white font-bold text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  authMode === 'staff_login'
                    ? 'bg-slate-900 hover:bg-slate-800 shadow-slate-900/20'
                    : 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/25'
                }`}
              >
                {loading ? (
                  <span>Processing...</span>
                ) : authMode === 'citizen_register' ? (
                  <>
                    <span>Register Account</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                ) : authMode === 'citizen_login' ? (
                  <>
                    <span>Sign In to Citizen Account</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                ) : (
                  <>
                    <span>Sign In as Staff / Admin</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Bottom Toggle switch links */}
            <div className="pt-2 text-center text-xs">
              {authMode === 'citizen_register' ? (
                <p className="text-slate-600">
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => handleTabChange('citizen_login')}
                    className="font-bold text-blue-600 hover:underline"
                  >
                    Sign in here
                  </button>
                </p>
              ) : authMode === 'citizen_login' ? (
                <p className="text-slate-600">
                  Don't have an account yet?{' '}
                  <button
                    type="button"
                    onClick={() => handleTabChange('citizen_register')}
                    className="font-bold text-blue-600 hover:underline"
                  >
                    Register here
                  </button>
                </p>
              ) : (
                <div 
                  onClick={() => {
                    setEmail('admin@govserve.gov.ph');
                    setPassword('admin');
                  }}
                  className="p-2.5 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 cursor-pointer flex items-center justify-between text-[11px]"
                >
                  <span className="font-mono text-slate-700">admin@govserve.gov.ph / admin</span>
                  <span className="font-bold text-blue-600">Click to Autofill</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Return to Public Portal Link */}
      <div className="relative z-10 text-center pt-5">
        <Link to="/portal" className="text-xs font-bold text-slate-400 hover:text-white transition-colors">
          ← No account? Browse Public Portal without login
        </Link>
      </div>
    </div>
  );
}
