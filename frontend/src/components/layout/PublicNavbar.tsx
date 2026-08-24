import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Building2, ArrowRight, ShieldCheck, UserCheck, LayoutDashboard } from 'lucide-react';
import { Button } from '../ui/Button';

export function PublicNavbar() {
  const location = useLocation();
  const isPortal = location.pathname === '/portal';

  return (
    <header className="sticky top-0 z-40 w-full glass-header border-b border-[#e2e8f0]/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <Link to="/" className="flex items-center gap-3 group">
          <div className="h-10 w-10 flex items-center justify-center shrink-0 relative">
            <img
              src="/logo.png"
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

        {/* Center Nav Links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-[#475569]">
          <Link to="/" className="hover:text-blue-600 transition-colors">Home</Link>
          <Link to="/portal" className="hover:text-blue-600 transition-colors">Public Services</Link>
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-3">
          {!isPortal && (
            <Link to="/portal">
              <Button size="sm" variant="primary" rightIcon={<ArrowRight className="w-4 h-4" />}>
                Public Portal
              </Button>
            </Link>
          )}

          <Link to="/dashboard">
            <Button size="sm" variant="outline" leftIcon={<UserCheck className="w-4 h-4 text-blue-600" />}>
              Staff Portal
            </Button>
          </Link>
        </div>
      </div>
    </header>
  );
}
