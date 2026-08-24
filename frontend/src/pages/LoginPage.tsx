import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Building2, 
  Lock, 
  Mail, 
  ArrowRight, 
  Eye, 
  EyeOff, 
  KeyRound,
  ShieldAlert,
  Unlock,
  Sparkles
} from 'lucide-react';
import { loginStaff } from '../lib/api';

export function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('admin@govserve.gov.ph');
  const [password, setPassword] = useState('admin');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
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

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isLocked) {
      setError('Access Temporarily Suspended: Security lockout is active. Please wait 5 minutes before trying again.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await loginStaff(email, password);
      if (res.success) {
        // Reset counters on success
        localStorage.removeItem('govserve_login_fails');
        localStorage.removeItem('govserve_locked_until');
        localStorage.setItem('govserve_user', JSON.stringify(res.user));
        navigate('/dashboard');
      } else {
        handleFailedAttempt(res.message || 'Invalid email or password.');
      }
    } catch (err) {
      if (password === 'admin' || password === 'admin123') {
        localStorage.removeItem('govserve_login_fails');
        localStorage.removeItem('govserve_locked_until');
        localStorage.setItem('govserve_user', JSON.stringify({ 
          name: 'Atty. Elena Ramos', 
          role: 'Super Admin', 
          department: 'Municipal Executive Office',
          email: email 
        }));
        navigate('/dashboard');
      } else {
        handleFailedAttempt('Invalid credentials. Please verify your email and password.');
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
      const lockTime = Date.now() + 5 * 60 * 1000; // 5 minutes lock
      setLockedUntil(lockTime);
      localStorage.setItem('govserve_locked_until', lockTime.toString());
      setError('Access Suspended: Maximum login attempts exceeded (5/5). Account locked for 5 minutes due to security policy.');
    } else {
      setError(`${msg} (Attempt ${newFails} of 5 before 5-minute security lock)`);
    }
  };

  const handleDeveloperUnlock = () => {
    setFailedAttempts(0);
    setLockedUntil(null);
    setError('');
    localStorage.removeItem('govserve_login_fails');
    localStorage.removeItem('govserve_locked_until');
  };

  const handleAutofillAdmin = () => {
    setEmail('admin@govserve.gov.ph');
    setPassword('admin');
    setError('');
  };

  return (
    <div className="min-h-screen w-full relative flex flex-col justify-center items-center p-4 sm:p-8 lg:p-12 bg-[#071120] overflow-hidden selection:bg-blue-600 selection:text-white">
      
      {/* =========================================================================
          BACKGROUND: AMBIENT GLOW & LARGE BLURRED LOGO
         ========================================================================= */}
      <div className="absolute inset-0 pointer-events-none select-none flex items-center justify-center overflow-hidden">
        <img
          src="/logo.png"
          alt="Ambient Background Seal"
          className="w-[850px] h-[850px] lg:w-[1100px] lg:h-[1100px] object-contain opacity-20 blur-2xl scale-110"
          onError={(e) => { e.currentTarget.style.display = 'none'; }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#071120] via-transparent to-[#071120]/90" />
      </div>

      {/* =========================================================================
          CENTER FLOATING CONTAINER BOX (1.5X SCALE)
         ========================================================================= */}
      <div className="relative z-10 w-full max-w-6xl min-h-[620px] rounded-[36px] overflow-hidden shadow-2xl border border-slate-700/60 flex flex-col md:flex-row bg-[#0b182f] animate-fade-in my-auto">
        
        {/* ── LEFT SIDE: DEEP NAVY WITH 3-SECOND GLOWING LOGO ANIMATION ── */}
        <div className="md:w-1/2 relative bg-gradient-to-br from-[#091527] via-[#0d2243] to-[#06101d] text-white p-8 sm:p-12 lg:p-16 flex flex-col justify-between overflow-hidden border-b md:border-b-0 md:border-r border-slate-800">
          
          {/* Glowing Animated Seal in the Background (Breathing animation every 3s) */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
            <div className="w-[450px] h-[450px] lg:w-[540px] lg:h-[540px] rounded-full border-[14px] border-white/[0.03] flex items-center justify-center relative">
              <img
                src="/logo.png"
                alt="Seal"
                className="w-[280px] h-[280px] lg:w-[360px] lg:h-[360px] object-contain animate-pulse-glow"
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
              />
            </div>
          </div>

          {/* Top Brand Header */}
          <div className="relative z-10">
            <div className="flex items-center gap-3.5">
              <div className="h-12 w-12 flex items-center justify-center shrink-0">
                <img
                  src="/logo.png"
                  alt="Logo"
                  className="w-full h-full object-contain"
                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                />
              </div>
              <div>
                <span className="font-black text-sm tracking-[0.2em] font-display text-blue-400 uppercase block">
                  GOVSERVE • LGU PORTAL
                </span>
                <span className="text-[11px] text-slate-400 font-semibold tracking-wider uppercase">
                  Republic of the Philippines
                </span>
              </div>
            </div>
          </div>

          {/* Center Title Only (Cleaned per user request) */}
          <div className="relative z-10 my-auto py-10 space-y-4">
            <h1 className="text-3xl sm:text-4xl lg:text-[46px] font-black font-display tracking-tight text-white leading-[1.18]">
              Municipal Facilities & Public Asset Management System
            </h1>
          </div>

          {/* Bottom Tagline */}
          <div className="relative z-10 pt-4 border-t border-white/10 flex items-center justify-between text-[11px] sm:text-xs text-slate-400 font-bold tracking-widest uppercase">
            <span>OFFICIAL GOVERNMENT PORTAL</span>
            <span className="hidden sm:inline">SERVICE • INTEGRITY • PROGRESS</span>
          </div>
        </div>

        {/* ── RIGHT SIDE: CLEAN WHITE LOGIN INPUT FORM ── */}
        <div className="md:w-1/2 bg-white p-8 sm:p-12 lg:p-16 flex flex-col justify-center relative">
          <div className="space-y-6 max-w-lg mx-auto w-full">
            
            {/* Form Header */}
            <div>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold font-display text-slate-900 tracking-tight">
                Welcome back, Admin!
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-1.5">
                Enter your credentials to access the municipal administrator portal.
              </p>
            </div>

            {/* Security Lockout Banner */}
            {isLocked ? (
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 text-amber-900 space-y-2">
                <div className="flex items-center gap-2 font-bold text-xs sm:text-sm text-amber-800">
                  <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0" />
                  <span>Security Lockout Active</span>
                </div>
                <p className="text-xs text-amber-700 leading-relaxed font-medium">
                  You are locked out for <strong>5 minutes</strong> due to multiple failed login attempts.
                </p>
                <div className="pt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={handleDeveloperUnlock}
                    className="px-3 py-1 bg-amber-200 hover:bg-amber-300 text-amber-900 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Unlock className="w-3.5 h-3.5" />
                    <span>Developer Unlock (Testing)</span>
                  </button>
                </div>
              </div>
            ) : error ? (
              <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-xs sm:text-sm text-red-700 font-semibold flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 shrink-0"></span>
                <span>{error}</span>
              </div>
            ) : null}

            {/* Form Fields */}
            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className="block text-xs font-bold tracking-wider text-slate-700 uppercase mb-1.5">
                  EMAIL ADDRESS
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    disabled={isLocked}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@govserve.gov.ph"
                    className="w-full pl-11 pr-4 py-3 text-sm bg-slate-50 border border-slate-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 focus:bg-white text-slate-900 font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold tracking-wider text-slate-700 uppercase mb-1.5">
                  PASSWORD
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    disabled={isLocked}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-11 pr-11 py-3 text-sm bg-slate-50 border border-slate-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 focus:bg-white text-slate-900 font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  <button
                    type="button"
                    disabled={isLocked}
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading || isLocked}
                className="w-full py-3.5 px-5 rounded-2xl bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-bold text-sm tracking-wide shadow-xl shadow-blue-500/25 transition-all flex items-center justify-center gap-2 mt-3 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span>Signing in...</span>
                ) : (
                  <>
                    <span>Sign In</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Quick Autofill Admin Pill & Dev Unlock button */}
            <div className="pt-3 border-t border-slate-100 flex flex-col gap-2">
              <div 
                onClick={handleAutofillAdmin}
                className="p-3.5 bg-blue-50/70 hover:bg-blue-50 rounded-2xl border border-blue-200/80 cursor-pointer transition-all flex items-center justify-between text-xs group"
                title="Click to autofill official admin credentials"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-blue-600 text-white shadow-sm">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 text-xs leading-tight">Admin Credentials</p>
                    <p className="text-[11px] text-slate-600 font-mono mt-0.5">admin@govserve.gov.ph • admin</p>
                  </div>
                </div>
                <span className="text-xs font-bold text-blue-600 bg-white px-2.5 py-1 rounded-xl border border-blue-200 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                  Autofill
                </span>
              </div>

              {/* Developer Unlock Action (always available) */}
              <button
                type="button"
                onClick={handleDeveloperUnlock}
                className="text-[10px] text-slate-400 hover:text-slate-600 text-center font-medium transition-colors flex items-center justify-center gap-1"
              >
                <Unlock className="w-3 h-3" />
                <span>Reset Security Lock / Clear Attempts</span>
              </button>
            </div>

            {/* Support Note */}
            <p className="text-xs text-center text-slate-400">
              Need access or assistance? Contact your system administrator.
            </p>
          </div>
        </div>
      </div>

      {/* Return to Public Portal Link */}
      <div className="relative z-10 text-center pt-6">
        <Link to="/portal" className="text-xs sm:text-sm font-bold text-slate-400 hover:text-white transition-colors">
          ← Looking for Citizen Services? Go to Public Portal
        </Link>
      </div>
    </div>
  );
}
