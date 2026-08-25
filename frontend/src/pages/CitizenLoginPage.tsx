import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Lock, 
  Mail, 
  ArrowRight, 
  Eye, 
  EyeOff, 
  UserCheck, 
  ShieldAlert, 
  Unlock, 
  Sparkles,
  Shield,
  KeyRound
} from 'lucide-react';
import { loginCitizen } from '../lib/api';

export function CitizenLoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('juan.delacruz@citizen.gov.ph');
  const [password, setPassword] = useState('password123');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Auto redirect if already logged in as citizen
  useEffect(() => {
    const userStr = localStorage.getItem('govserve_user');
    if (userStr) {
      try {
        const u = JSON.parse(userStr);
        if (u && u.role === 'Citizen') {
          navigate('/dashboard');
        }
      } catch {}
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await loginCitizen(email, password);
      if (res.success) {
        sessionStorage.setItem('govserve_user', JSON.stringify(res.user));
        localStorage.setItem('govserve_user', JSON.stringify(res.user));
        navigate('/dashboard');
      } else {
        setError(res.message || 'Invalid email or password.');
      }
    } catch (err) {
      // Demo fallback
      if (password.length >= 4) {
        const uObj = {
          id: Date.now(),
          name: email.includes('juan') ? 'Juan M. Dela Cruz' : email.split('@')[0].toUpperCase(),
          email: email,
          phone: '+63 917 123 4567',
          role: 'Citizen',
          department: 'Barangay 178 Resident'
        };
        sessionStorage.setItem('govserve_user', JSON.stringify(uObj));
        localStorage.setItem('govserve_user', JSON.stringify(uObj));
        navigate('/dashboard');
      } else {
        setError('Login failed. Please verify your credentials.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAutofillCitizen = () => {
    setEmail('juan.delacruz@citizen.gov.ph');
    setPassword('password123');
    setError('');
  };

  return (
    <div className="min-h-screen w-screen flex flex-col md:flex-row bg-[#071120] overflow-hidden selection:bg-blue-600 selection:text-white">
      
      {/* ── LEFT PANEL: FULL-SCREEN DEEP NAVY SEAL & BRANDING (Sakop buong left half) ── */}
      <div className="md:w-1/2 relative bg-gradient-to-br from-[#091527] via-[#0d2243] to-[#06101d] text-white p-8 sm:p-12 lg:p-16 flex flex-col justify-between overflow-hidden border-b md:border-b-0 md:border-r border-slate-800">
        
        {/* Animated Glowing Seal in the Background (3s pulse animation) */}
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
                GOVSERVE • CITIZEN PORTAL
              </span>
              <span className="text-[11px] text-slate-400 font-semibold tracking-wider uppercase">
                Republic of the Philippines • Barangay 178
              </span>
            </div>
          </div>
        </div>

        {/* Center Title */}
        <div className="relative z-10 my-auto py-10 space-y-4 max-w-xl">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider bg-blue-500/20 text-blue-300 border border-blue-400/30">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Online E-Services & Incident Response</span>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-[44px] font-black font-display tracking-tight text-white leading-[1.16]">
            Public Assets & Facilities Management System
          </h1>
          <p className="text-sm text-slate-300 leading-relaxed font-medium">
            Sign in to submit water & drainage hazard reports, reserve public facilities & parks, apply for municipal burial permits, and browse the public asset transparency catalog.
          </p>
        </div>

        {/* Bottom Tagline */}
        <div className="relative z-10 pt-4 border-t border-white/10 flex items-center justify-between text-xs text-slate-400 font-bold tracking-widest uppercase">
          <span>OFFICIAL CITIZEN PORTAL</span>
          <span className="hidden sm:inline">SERVICE • INTEGRITY • TRANSPARENCY</span>
        </div>
      </div>

      {/* ── RIGHT PANEL: CLEAN WHITE LOGIN FORM (Sakop buong right half) ── */}
      <div className="md:w-1/2 bg-white p-8 sm:p-12 lg:p-16 flex flex-col justify-center relative overflow-y-auto">
        <div className="space-y-6 max-w-md mx-auto w-full">
          
          {/* Header */}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-blue-100 text-blue-800 tracking-wider">
                Resident Sign In
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold font-display text-slate-900 tracking-tight">
              Welcome back, Citizen!
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1.5">
              Enter your registered citizen credentials to access E-Services and track your submitted requests.
            </p>
          </div>

          {/* Alert Message */}
          {error && (
            <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-xs sm:text-sm text-red-700 font-semibold flex items-center gap-2.5 animate-fade-in">
              <span className="w-2 h-2 rounded-full bg-red-500 shrink-0"></span>
              <span>{error}</span>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold tracking-wider text-slate-700 uppercase mb-1.5">
                EMAIL ADDRESS
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="juan.delacruz@citizen.gov.ph"
                  className="w-full pl-11 pr-4 py-3 text-sm bg-slate-50 border border-slate-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 focus:bg-white text-slate-900 font-medium transition-all"
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
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-11 pr-11 py-3 text-sm bg-slate-50 border border-slate-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 focus:bg-white text-slate-900 font-medium transition-all"
                />
                <button
                  type="button"
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
              disabled={loading}
              className="w-full py-3.5 px-5 rounded-2xl bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-bold text-sm tracking-wide shadow-xl shadow-blue-500/25 transition-all flex items-center justify-center gap-2 mt-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <span>Signing in...</span>
              ) : (
                <>
                  <span>Sign In to Citizen Account</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Autofill Demo Box */}
          <div 
            onClick={handleAutofillCitizen}
            className="p-3.5 bg-blue-50/70 hover:bg-blue-50 rounded-2xl border border-blue-200 cursor-pointer transition-all flex items-center justify-between text-xs group"
            title="Click to autofill sample resident account"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-blue-600 text-white shadow-sm">
                <KeyRound className="w-4 h-4" />
              </div>
              <div>
                <p className="font-bold text-slate-900 text-xs leading-tight">Demo Citizen Account</p>
                <p className="text-[11px] text-slate-600 font-mono mt-0.5">juan.delacruz@citizen.gov.ph • password123</p>
              </div>
            </div>
            <span className="text-xs font-bold text-blue-600 bg-white px-2.5 py-1 rounded-xl border border-blue-200 group-hover:bg-blue-600 group-hover:text-white transition-colors">
              Autofill
            </span>
          </div>

          {/* Links to Register & Staff Login */}
          <div className="space-y-3 pt-3 border-t border-slate-100 text-center text-xs">
            <p className="text-slate-600">
              Don't have an account yet?{' '}
              <Link to="/register" className="font-bold text-blue-600 hover:underline">
                Create an Account / Register here
              </Link>
            </p>
            
            <p className="text-slate-500 text-[11px]">
              Are you an LGU Staff or Administrator?{' '}
              <Link to="/admin/login" className="font-bold text-slate-800 hover:text-blue-600 underline">
                Go to Staff / Admin Login →
              </Link>
            </p>
          </div>

        </div>
      </div>

    </div>
  );
}
