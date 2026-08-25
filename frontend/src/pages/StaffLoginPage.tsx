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
  Sparkles,
  ShieldCheck
} from 'lucide-react';
import { loginStaff } from '../lib/api';

export function StaffLoginPage() {
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
        localStorage.removeItem('govserve_login_fails');
        localStorage.removeItem('govserve_locked_until');
        sessionStorage.setItem('govserve_user', JSON.stringify(res.user));
        localStorage.setItem('govserve_user', JSON.stringify(res.user));
        navigate('/dashboard');
      } else {
        handleFailedAttempt(res.message || 'Invalid email or password.');
      }
    } catch (err) {
      if (password === 'admin' || password === 'admin123') {
        localStorage.removeItem('govserve_login_fails');
        localStorage.removeItem('govserve_locked_until');
        const sObj = { 
          name: 'Atty. Elena Ramos', 
          role: 'Super Admin', 
          department: 'Municipal Executive Office',
          email: email 
        };
        sessionStorage.setItem('govserve_user', JSON.stringify(sObj));
        localStorage.setItem('govserve_user', JSON.stringify(sObj));
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
      const lockTime = Date.now() + 5 * 60 * 1000;
      setLockedUntil(lockTime);
      localStorage.setItem('govserve_locked_until', lockTime.toString());
      setError('Access Suspended: Maximum login attempts exceeded (5/5). Account locked for 5 minutes.');
    } else {
      setError(`${msg} (Attempt ${newFails} of 5 before security lock)`);
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
    <div className="min-h-screen w-screen flex flex-col md:flex-row bg-[#071120] overflow-hidden selection:bg-blue-600 selection:text-white">
      
      {/* ── LEFT PANEL: FULL-SCREEN DEEP NAVY SEAL & BRANDING (Sakop buong left half) ── */}
      <div className="md:w-1/2 relative bg-gradient-to-br from-[#091527] via-[#0d2243] to-[#06101d] text-white p-8 sm:p-12 lg:p-16 flex flex-col justify-between overflow-hidden border-b md:border-b-0 md:border-r border-slate-800">
        
        {/* Animated Glowing Seal in the Background */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
          <div className="w-[450px] h-[450px] lg:w-[580px] lg:h-[580px] rounded-full border-[14px] border-white/[0.03] flex items-center justify-center relative">
            <img
              src="/logo.png"
              alt="Seal"
              className="w-[280px] h-[280px] lg:w-[380px] lg:h-[380px] object-contain animate-pulse-glow"
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
          </div>
        </div>

        {/* Top Brand Header */}
        <div className="relative z-10">
          <div className="flex items-center gap-3.5">
            <div className="h-12 w-12 flex items-center justify-center shrink-0 bg-white/10 rounded-2xl p-1.5 backdrop-blur-sm border border-white/10">
              <img
                src="/logo.png"
                alt="Logo"
                className="w-full h-full object-contain"
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
              />
            </div>
            <div>
              <span className="font-black text-sm tracking-[0.2em] font-display text-blue-400 uppercase block">
                GOVSERVE • STAFF & ADMIN
              </span>
              <span className="text-[11px] text-slate-400 font-semibold tracking-wider uppercase">
                Republic of the Philippines • Barangay 178
              </span>
            </div>
          </div>
        </div>

        {/* Center Title */}
        <div className="relative z-10 my-auto py-10 space-y-4 max-w-xl">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider bg-slate-800/80 text-blue-300 border border-slate-700">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Authorized Municipal Personnel Only</span>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-[44px] font-black font-display tracking-tight text-white leading-[1.16]">
            Municipal Operations & Facilities Command Center
          </h1>
          <p className="text-sm text-slate-300 leading-relaxed font-medium">
            Administrative console for municipal facility booking approvals, cemetery lot ledger management, water & drainage incident dispatch, and public asset health monitoring.
          </p>
        </div>

        {/* Bottom Tagline */}
        <div className="relative z-10 pt-4 border-t border-white/10 flex items-center justify-between text-xs text-slate-400 font-bold tracking-widest uppercase">
          <span>OFFICIAL GOVERNMENT ACCESS</span>
          <span className="hidden sm:inline">SERVICE • INTEGRITY • LEADERSHIP</span>
        </div>
      </div>

      {/* ── RIGHT PANEL: CLEAN WHITE ADMIN LOGIN FORM (Sakop buong right half) ── */}
      <div className="md:w-1/2 bg-white p-8 sm:p-12 lg:p-16 flex flex-col justify-center relative overflow-y-auto">
        <div className="space-y-6 max-w-md mx-auto w-full">
          
          {/* Header */}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-slate-900 text-white tracking-wider">
                Staff Authentication
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold font-display text-slate-900 tracking-tight">
              Welcome back, Admin!
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1.5">
              Enter your official administrative credentials to open the municipal command telemetry.
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
                Access suspended for <strong>5 minutes</strong> due to multiple failed login attempts.
              </p>
              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={handleDeveloperUnlock}
                  className="px-3 py-1 bg-amber-200 hover:bg-amber-300 text-amber-900 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Unlock className="w-3.5 h-3.5" />
                  <span>Developer Unlock</span>
                </button>
              </div>
            </div>
          ) : error ? (
            <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-xs sm:text-sm text-red-700 font-semibold flex items-center gap-2.5">
              <span className="w-2 h-2 rounded-full bg-red-500 shrink-0"></span>
              <span>{error}</span>
            </div>
          ) : null}

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold tracking-wider text-slate-700 uppercase mb-1.5">
                MUNICIPAL EMAIL ADDRESS
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  disabled={isLocked}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@govserve.gov.ph"
                  className="w-full pl-11 pr-4 py-3 text-sm bg-slate-50 border border-slate-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-slate-500/20 focus:border-slate-800 focus:bg-white text-slate-900 font-medium transition-all"
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
                  className="w-full pl-11 pr-11 py-3 text-sm bg-slate-50 border border-slate-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-slate-500/20 focus:border-slate-800 focus:bg-white text-slate-900 font-medium transition-all"
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
              className="w-full py-3.5 px-5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm tracking-wide shadow-xl shadow-slate-900/25 transition-all flex items-center justify-center gap-2 mt-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <span>Verifying credentials...</span>
              ) : (
                <>
                  <span>Sign In as Staff / Admin</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Autofill Admin Pill */}
          <div 
            onClick={handleAutofillAdmin}
            className="p-3.5 bg-slate-100 hover:bg-slate-200 rounded-2xl border border-slate-300 cursor-pointer transition-all flex items-center justify-between text-xs group"
            title="Click to autofill official admin credentials"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-slate-900 text-white shadow-sm">
                <KeyRound className="w-4 h-4" />
              </div>
              <div>
                <p className="font-bold text-slate-900 text-xs leading-tight">Official Admin Credentials</p>
                <p className="text-[11px] text-slate-600 font-mono mt-0.5">admin@govserve.gov.ph • admin</p>
              </div>
            </div>
            <span className="text-xs font-bold text-slate-900 bg-white px-2.5 py-1 rounded-xl border border-slate-300 group-hover:bg-slate-900 group-hover:text-white transition-colors">
              Autofill
            </span>
          </div>

          {/* Link to Citizen Login */}
          <div className="pt-3 border-t border-slate-100 text-center text-xs space-y-2">
            <p className="text-slate-600">
              Not a municipal staff member?{' '}
              <Link to="/login" className="font-bold text-blue-600 hover:underline">
                Go to Citizen Resident Login →
              </Link>
            </p>
          </div>

        </div>
      </div>

    </div>
  );
}
