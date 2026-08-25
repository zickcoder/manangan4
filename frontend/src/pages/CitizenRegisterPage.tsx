import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Lock, 
  Mail, 
  ArrowRight, 
  Eye, 
  EyeOff, 
  User, 
  Phone, 
  CheckCircle2, 
  Sparkles,
  ShieldCheck
} from 'lucide-react';
import { registerCitizen } from '../lib/api';

export function CitizenRegisterPage() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !phone || !password) {
      setError('Please fill in all required registration fields.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccessMsg('');

    try {
      const res = await registerCitizen({ name, email, phone, password });
      if (res.success) {
        setSuccessMsg('Account registered successfully! Redirecting to your citizen dashboard...');
        localStorage.setItem('govserve_user', JSON.stringify(res.user));
        setTimeout(() => navigate('/dashboard'), 900);
      } else {
        setError(res.message || 'Registration failed.');
      }
    } catch (err) {
      setError('An unexpected error occurred during registration.');
    } finally {
      setLoading(false);
    }
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
                GOVSERVE • CITIZEN REGISTRY
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
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Fast & Official Citizen Account Creation</span>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-[44px] font-black font-display tracking-tight text-white leading-[1.16]">
            Create Your Resident E-Services Account
          </h1>
          <p className="text-sm text-slate-300 leading-relaxed font-medium">
            Register an official citizen account to seamlessly book facilities, report water & drainage incidents with live photos, request cemetery burial plots, and track approvals in real-time.
          </p>
        </div>

        {/* Bottom Tagline */}
        <div className="relative z-10 pt-4 border-t border-white/10 flex items-center justify-between text-xs text-slate-400 font-bold tracking-widest uppercase">
          <span>OFFICIAL REGISTRATION DESK</span>
          <span className="hidden sm:inline">DATA PRIVACY SECURED</span>
        </div>
      </div>

      {/* ── RIGHT PANEL: CLEAN WHITE REGISTRATION FORM (Sakop buong right half) ── */}
      <div className="md:w-1/2 bg-white p-8 sm:p-12 lg:p-16 flex flex-col justify-center relative overflow-y-auto">
        <div className="space-y-6 max-w-md mx-auto w-full">
          
          {/* Header */}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-blue-100 text-blue-800 tracking-wider">
                New Resident
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold font-display text-slate-900 tracking-tight">
              Create an Account
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1.5">
              Register to submit and track LGU requests
            </p>
          </div>

          {/* Alerts */}
          {successMsg && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs sm:text-sm text-emerald-800 font-semibold flex items-center gap-2.5 animate-fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {error && (
            <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-xs sm:text-sm text-red-700 font-semibold flex items-center gap-2.5 animate-fade-in">
              <span className="w-2 h-2 rounded-full bg-red-500 shrink-0"></span>
              <span>{error}</span>
            </div>
          )}

          {/* Registration Form */}
          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="block text-xs font-bold tracking-wider text-slate-700 uppercase mb-1">
                FULL NAME
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Juan M. Dela Cruz"
                  className="w-full pl-11 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 focus:bg-white text-slate-900 font-medium transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold tracking-wider text-slate-700 uppercase mb-1">
                EMAIL ADDRESS
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="juan.delacruz@gmail.com"
                  className="w-full pl-11 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 focus:bg-white text-slate-900 font-medium transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold tracking-wider text-slate-700 uppercase mb-1">
                CONTACT NUMBER
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+63 917 123 4567"
                  className="w-full pl-11 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 focus:bg-white text-slate-900 font-medium transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold tracking-wider text-slate-700 uppercase mb-1">
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
                  className="w-full pl-11 pr-11 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 focus:bg-white text-slate-900 font-medium transition-all"
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
                <span>Creating your account...</span>
              ) : (
                <>
                  <span>Register Account</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Links to Sign In */}
          <div className="space-y-3 pt-3 border-t border-slate-100 text-center text-xs">
            <p className="text-slate-600">
              Already have an account?{' '}
              <Link to="/login" className="font-bold text-blue-600 hover:underline">
                [Sign in here]
              </Link>
            </p>

            <p className="text-slate-500 text-[11px]">
              Municipal Staff?{' '}
              <Link to="/admin/login" className="font-bold text-slate-800 hover:text-blue-600 underline">
                Staff / Admin Portal →
              </Link>
            </p>
          </div>

        </div>
      </div>

    </div>
  );
}
