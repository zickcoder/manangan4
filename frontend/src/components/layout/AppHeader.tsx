import React, { useState } from 'react';
import { 
  Menu, 
  Search, 
  Bell, 
  Sparkles, 
  HelpCircle, 
  CheckCircle2, 
  AlertCircle,
  ExternalLink
} from 'lucide-react';
import { Badge } from '../ui/Badge';

interface HeaderProps {
  onToggleSidebar: () => void;
  title?: string;
  subtitle?: string;
}

export function AppHeader({ onToggleSidebar, title, subtitle }: HeaderProps) {
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const userStr = sessionStorage.getItem('govserve_user') || localStorage.getItem('govserve_user');
  let user: any = { name: 'Atty. Elena Ramos', role: 'Super Admin', email: 'admin@govserve.gov.ph' };
  try {
    if (userStr) user = JSON.parse(userStr);
  } catch {}

  const isCitizen = user?.role === 'Citizen';

  const notifications = isCitizen
    ? [
        { id: 1, title: 'Reservation Slot Confirmed', time: '15m ago', text: 'Your booking for Barangay 178 Civic Center is being endorsed.', unread: true },
        { id: 2, title: 'Utility Ticket Dispatched', time: '1h ago', text: 'Barangay Drainage Team Alpha assigned to your report.', unread: true },
        { id: 3, title: 'Notice: Clean-up Drive', time: '3h ago', text: 'Municipal waterway dredging along Sector 4 tomorrow.', unread: false },
      ]
    : [
        { id: 1, title: 'New Facility Booking', time: '10m ago', text: 'Juan Dela Cruz submitted booking for Civic Center', unread: true },
        { id: 2, title: 'Water Leak Incident', time: '25m ago', text: 'High-urgency drainage ticket filed in Zone 4', unread: true },
        { id: 3, title: 'Burial Permit Endorsed', time: '1h ago', text: 'Permit BP-2026-0091 registered in Columbarium Wall Alpha', unread: false },
      ];

  const getInitials = (name: string) => {
    if (!name) return 'U';
    const parts = name.split(' ');
    return parts.length >= 2 ? `${parts[0][0]}${parts[1][0]}` : parts[0].slice(0, 2).toUpperCase();
  };

  return (
    <header className="sticky top-0 z-20 h-16 w-full glass-header border-b border-[#e2e8f0] px-4 md:px-6 flex items-center justify-between">
      {/* Left: Hamburger & Breadcrumb */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="p-2 rounded-xl text-[#64748b] hover:text-[#0f172a] hover:bg-[#f1f5f9] transition-colors cursor-pointer"
          title="Toggle Navigation"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div>
          <h1 className="text-base md:text-lg font-bold text-[#0f172a] font-display flex items-center gap-2">
            {title || (isCitizen ? 'Citizen Services Hub' : 'Municipal Telemetry')}
            <Badge variant={isCitizen ? 'info' : 'purple'} size="sm" className="hidden sm:inline-flex">
              {isCitizen ? 'Citizen Account' : 'Live Staff'}
            </Badge>
          </h1>
          {subtitle && <p className="text-[11px] text-[#64748b] hidden md:block">{subtitle}</p>}
        </div>
      </div>

      {/* Right: Role Switcher, Notifications & Profile */}
      <div className="flex items-center gap-2 md:gap-3">
        {/* Instant Role Switcher */}
        <button
          onClick={() => {
            const nextUser = isCitizen ? {
              id: 1,
              name: 'Atty. Elena Ramos',
              email: 'admin@govserve.gov.ph',
              role: 'Super Admin',
              department: 'Municipal Executive Office'
            } : {
              id: 101,
              name: 'Juan M. Dela Cruz',
              email: 'juan.delacruz@citizen.gov.ph',
              role: 'Citizen',
              department: 'Barangay 178 Resident'
            };

            sessionStorage.setItem('govserve_user', JSON.stringify(nextUser));
            localStorage.setItem('govserve_user', JSON.stringify(nextUser));
            window.location.href = '/dashboard';
          }}
          className="px-2.5 py-1 rounded-xl text-[11px] sm:text-xs font-bold bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white border border-blue-200 transition-all flex items-center gap-1 cursor-pointer"
          title="Click to instantly switch between Admin and Citizen account"
        >
          <span>🔄 {isCitizen ? 'Switch to Admin' : 'Switch to Citizen'}</span>
        </button>
        {/* Notifications Popover */}
        <div className="relative">
          <button
            onClick={() => setNotificationsOpen(!notificationsOpen)}
            className="relative p-2 rounded-xl text-[#64748b] hover:text-[#0f172a] hover:bg-[#f1f5f9] transition-colors cursor-pointer"
            title="Notifications"
          >
            <Bell className="w-5 h-5" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-blue-600 ring-2 ring-white"></span>
          </button>

          {notificationsOpen && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-large border border-[#e2e8f0] p-4 z-50 animate-fade-in-up">
              <div className="flex items-center justify-between pb-3 border-b border-[#f1f5f9]">
                <h4 className="text-xs font-bold text-[#0f172a] uppercase tracking-wider">
                  {isCitizen ? 'Citizen Notifications' : 'System Telemetry Alerts'}
                </h4>
                <span className="text-[10px] bg-blue-100 text-blue-700 font-semibold px-2 py-0.5 rounded-full">2 New</span>
              </div>
              <div className="divide-y divide-[#f8fafc] max-h-64 overflow-y-auto">
                {notifications.map((n) => (
                  <div key={n.id} className="py-2.5 hover:bg-[#f8fafc] rounded-lg px-1.5 transition-colors">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-[#0f172a]">{n.title}</p>
                      <span className="text-[10px] text-[#94a3b8]">{n.time}</span>
                    </div>
                    <p className="text-[11px] text-[#64748b] mt-0.5 line-clamp-2">{n.text}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* User Mini Avatar */}
        <div className="flex items-center gap-2 pl-2 border-l border-[#e2e8f0]">
          <div className="w-8 h-8 rounded-xl bg-[#2563eb] text-white flex items-center justify-center font-bold text-xs shadow-sm">
            {getInitials(user?.name)}
          </div>
          <div className="hidden sm:block text-left">
            <p className="text-xs font-bold text-[#0f172a] leading-tight">{user?.name || 'User'}</p>
            <p className="text-[10px] text-[#64748b]">{isCitizen ? 'Registered Citizen' : user?.role || 'Staff'}</p>
          </div>
        </div>
      </div>
    </header>
  );
}
