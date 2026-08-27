import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Lock, 
  Mail, 
  ArrowRight, 
  Eye, 
  EyeOff, 
  ArrowLeft
} from 'lucide-react';
import { loginCitizen, getLockoutTimeRemaining, recordFailedAttempt, recordSuccessfulLogin } from '../lib/api';

export function CitizenLoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('juan.delacruz@citizen.gov.ph');
  const [password, setPassword] = useState('password123');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [lockoutSeconds, setLockoutSeconds] = useState<number>(0);

  useEffect(() => {
    const rem = getLockoutTimeRemaining('citizen');
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

    const remLock = getLockoutTimeRemaining('citizen');
    if (remLock > 0) {
      setLockoutSeconds(remLock);
      setError(`🔒 Account locked. Try again in ${remLock} seconds.`);
      return;
    }

    setLoading(true);

    try {
      const res = await loginCitizen(email, password);
      if (res.success) {
        recordSuccessfulLogin('citizen');
        sessionStorage.setItem('govserve_user', JSON.stringify(res.user));
        localStorage.setItem('govserve_user', JSON.stringify(res.user));
        navigate('/dashboard');
      } else {
        const status = recordFailedAttempt('citizen');
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
                Sign in
              </h2>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                Citizen and employee accounts sign in here — we detect your account type automatically.
              </p>
            </div>

            {/* Error Alert */}
            {error && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 font-semibold flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-500 shrink-0"></span>
                <span>{error}</span>
              </div>
            )}

            {/* Form */}
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
                    className="w-full pl-10 pr-3 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 focus:bg-white text-slate-900 font-medium"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-700">Password</label>
                  <button type="button" className="text-[11px] font-semibold text-blue-600 hover:underline">
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
                    <span>Sign in →</span>
                  </>
                )}
              </button>
            </form>

            {/* Footer link */}
            <div className="pt-2 text-center text-xs text-slate-600 border-t border-slate-100">
              <p>
                No account yet?{' '}
                <Link to="/register" className="font-bold text-blue-600 hover:underline">
                  Register
                </Link>
              </p>
            </div>

          </div>
        </div>
      </div>

    </div>
  );
}
