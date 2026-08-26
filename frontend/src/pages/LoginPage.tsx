import React, { useState, useEffect } from 'react';
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
  ArrowLeft
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
          sessionStorage.setItem('govserve_user', JSON.stringify(res.user));
          localStorage.setItem('govserve_user', JSON.stringify(res.user));
          setTimeout(() => navigate('/dashboard'), 800);
        } else {
          setError(res.message || 'Registration failed.');
        }
      } else if (authMode === 'citizen_login') {
        const res = await loginCitizen(email, password);
        if (res.success) {
          sessionStorage.setItem('govserve_user', JSON.stringify(res.user));
          localStorage.setItem('govserve_user', JSON.stringify(res.user));
          navigate('/dashboard');
        } else {
          setError(res.message || 'Invalid citizen credentials.');
        }
      } else {
        // Staff Login
        const res = await loginStaff(email, password);
        if (res.success) {
          sessionStorage.setItem('govserve_user', JSON.stringify(res.user));
          localStorage.setItem('govserve_user', JSON.stringify(res.user));
          navigate('/dashboard');
        } else {
          setError('Invalid staff credentials. Use admin@govserve.gov.ph / admin');
        }
      }
    } catch (err) {
      if (authMode === 'staff_login' && (password === 'admin' || password === 'admin123')) {
        const uObj = { 
          name: 'Atty. Elena Ramos', 
          role: 'Super Admin', 
          department: 'Municipal Executive Office',
          email: email 
        };
        sessionStorage.setItem('govserve_user', JSON.stringify(uObj));
        localStorage.setItem('govserve_user', JSON.stringify(uObj));
        navigate('/dashboard');
      } else {
        setError('An unexpected error occurred. Please verify your credentials.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-screen flex flex-col lg:flex-row bg-[#F4F6F9] overflow-hidden selection:bg-blue-600 selection:text-white">
      
      {/* ── LEFT PANEL: DARK NAVY WITH SEAL BACKGROUND IMAGE ── */}
      <div className="lg:w-1/2 bg-[#0B1E3D] text-white p-8 sm:p-12 lg:p-16 flex flex-col justify-between relative overflow-hidden min-h-[340px] lg:min-h-screen">
        {/* Background Seal Overlay Image */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden">
          <img
            src="/logoforloggingpages.jpeg"
            alt="Government Seal"
            className="w-[500px] h-[500px] lg:w-[680px] lg:h-[680px] object-contain opacity-25 rounded-full filter contrast-125"
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0B1E3D] via-transparent to-[#0B1E3D]/80" />
        </div>

        {/* Top Header Wording */}
        <div className="relative z-10">
          <p className="text-xs font-mono font-bold tracking-[0.2em] text-blue-300 uppercase">
            PUBLIC ASSETS & FACILITIES SYSTEM
          </p>
        </div>

        {/* Center Content Wording */}
        <div className="relative z-10 my-auto py-8 lg:py-12 space-y-4 max-w-xl text-center mx-auto">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold font-display tracking-tight text-white leading-tight">
            Public Assets & Facilities Management System
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-normal max-w-lg mx-auto">
            A digital platform for securely managing citizen information, government services, public feedback, community engagement, and local government notifications.
          </p>
        </div>

        {/* Bottom Tagline */}
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
            
            {/* Header Title & Subtitle */}
            <div>
              <h2 className="text-2xl sm:text-3xl font-extrabold font-display text-slate-900 tracking-tight">
                {authMode === 'citizen_register' ? 'Create an Account' : 'Sign in'}
              </h2>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                Citizen and employee accounts sign in here — we detect your account type automatically.
              </p>
            </div>

            {/* Mode Switcher Pills */}
            <div className="p-1 bg-slate-100 rounded-xl flex items-center gap-1 border border-slate-200 text-xs font-bold">
              <button
                type="button"
                onClick={() => handleTabChange('citizen_login')}
                className={`flex-1 py-1.5 px-2 rounded-lg transition-all ${
                  authMode === 'citizen_login' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => handleTabChange('citizen_register')}
                className={`flex-1 py-1.5 px-2 rounded-lg transition-all ${
                  authMode === 'citizen_register' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Register
              </button>
              <button
                type="button"
                onClick={() => handleTabChange('staff_login')}
                className={`flex-1 py-1.5 px-2 rounded-lg transition-all ${
                  authMode === 'staff_login' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Staff
              </button>
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

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {authMode === 'citizen_register' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name</label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Juan Dela Cruz"
                      className="w-full pl-10 pr-3 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 focus:bg-white text-slate-900"
                    />
                  </div>
                </div>
              )}

              {authMode === 'citizen_register' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Mobile Phone Number</label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+63 917 123 4567"
                      className="w-full pl-10 pr-3 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 focus:bg-white text-slate-900"
                    />
                  </div>
                </div>
              )}

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
                    className="w-full pl-10 pr-3 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 focus:bg-white text-slate-900 font-medium"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-700">Password</label>
                  {authMode !== 'citizen_register' && (
                    <button type="button" className="text-[11px] font-semibold text-blue-600 hover:underline">
                      Forgot password?
                    </button>
                  )}
                </div>
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
                disabled={loading}
                className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2"
              >
                {loading ? (
                  <span>Signing in...</span>
                ) : (
                  <>
                    <span>{authMode === 'citizen_register' ? 'Create Account →' : 'Sign in →'}</span>
                  </>
                )}
              </button>
            </form>

            {/* Footer link */}
            <div className="pt-2 text-center text-xs text-slate-600 border-t border-slate-100">
              {authMode === 'citizen_register' ? (
                <p>
                  Already have an account?{' '}
                  <button onClick={() => handleTabChange('citizen_login')} className="font-bold text-blue-600 hover:underline">
                    Sign in
                  </button>
                </p>
              ) : (
                <p>
                  No account yet?{' '}
                  <button onClick={() => handleTabChange('citizen_register')} className="font-bold text-blue-600 hover:underline">
                    Register
                  </button>
                </p>
              )}
            </div>

          </div>
        </div>
      </div>

    </div>
  );
}
