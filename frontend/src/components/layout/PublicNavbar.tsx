import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X, LogIn, UserPlus, ShieldCheck, Home } from 'lucide-react';
import { Button } from '../ui/Button';

export function PublicNavbar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 w-full glass-header border-b border-[#e2e8f0]/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <Link to="/" className="flex items-center gap-3 group">
          <div className="h-10 w-10 flex items-center justify-center shrink-0 relative">
            <img
              src="/logoforinsidebothdashboardofcetizenandadminside.png"
              alt="Logo"
              className="w-full h-full object-contain drop-shadow-sm"
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-black text-lg tracking-widest font-display text-[#0f172a] uppercase">GOVSERVE</span>
              <span className="text-[9px] px-1.5 py-0.5 bg-blue-100 text-blue-700 font-bold rounded-md uppercase tracking-wide">LGU</span>
            </div>
            <p className="text-[10px] text-[#64748b] hidden sm:block">Public Assets & Facilities Management System</p>
          </div>
        </Link>

        {/* Center Nav Links (Desktop) */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-semibold text-[#475569]">
          <Link to="/" className="text-blue-600 hover:text-blue-700 transition-colors">Home</Link>
          <Link to="/login" className="text-slate-600 hover:text-blue-600 transition-colors">Citizen Portal</Link>
        </nav>

        {/* Actions (Login - Desktop) */}
        <div className="hidden md:flex items-center gap-2.5">
          <Link to="/login">
            <Button size="sm" variant="outline" className="text-xs font-bold" leftIcon={<LogIn className="w-3.5 h-3.5" />}>
              Citizen Sign In
            </Button>
          </Link>
          <Link to="/admin/login">
            <Button size="sm" variant="ghost" className="text-slate-600 text-xs font-bold hover:text-slate-900">
              Staff Portal →
            </Button>
          </Link>
        </div>

        {/* Mobile Hamburger Button */}
        <div className="flex md:hidden items-center gap-2">
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 rounded-xl text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="Toggle Navigation Menu"
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Dropdown Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white/95 backdrop-blur-md px-4 pt-3 pb-5 space-y-3 shadow-xl animate-fade-in">
          <div className="space-y-1">
            <Link
              to="/"
              onClick={() => setIsMobileMenuOpen(false)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-slate-800 hover:bg-blue-50 hover:text-blue-600 transition-colors"
            >
              <Home className="w-4 h-4 text-blue-600" />
              <span>Home</span>
            </Link>
            <Link
              to="/login"
              onClick={() => setIsMobileMenuOpen(false)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-slate-800 hover:bg-blue-50 hover:text-blue-600 transition-colors"
            >
              <LogIn className="w-4 h-4 text-blue-600" />
              <span>Citizen Sign In</span>
            </Link>
            <Link
              to="/register"
              onClick={() => setIsMobileMenuOpen(false)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-slate-800 hover:bg-blue-50 hover:text-blue-600 transition-colors"
            >
              <UserPlus className="w-4 h-4 text-emerald-600" />
              <span>Register Citizen Account</span>
            </Link>
          </div>
          <div className="pt-2 border-t border-slate-100">
            <Link
              to="/admin/login"
              onClick={() => setIsMobileMenuOpen(false)}
              className="flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
            >
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-purple-600" />
                <span>Staff & Admin Portal</span>
              </div>
              <span className="text-slate-400">→</span>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
