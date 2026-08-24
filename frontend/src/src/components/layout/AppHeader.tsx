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

  const notifications = [
    { id: 1, title: 'New Zoning Application', time: '10m ago', text: 'Metro Horizon submitted commercial plaza blueprint', unread: true },
    { id: 2, title: 'Appointment Booked', time: '25m ago', text: 'Maria Clara Bautista booked for tomorrow 9:00 AM', unread: true },
    { id: 3, title: 'Building Inspection Passed', time: '1h ago', text: 'Permit APP-2026-0812 endorsed by City Engineer', unread: false },
  ];

  return (
    <header className="sticky top-0 z-20 h-16 w-full glass-header border-b border-[#e2e8f0] px-4 md:px-6 flex items-center justify-between">
      {/* Left: Hamburger & Breadcrumb */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="p-2 rounded-xl text-[#64748b] hover:text-[#0f172a] hover:bg-[#f1f5f9] transition-colors"
          title="Toggle Navigation"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div>
          <h1 className="text-base md:text-lg font-bold text-[#0f172a] font-display flex items-center gap-2">
            {title || 'Dashboard Overview'}
            <Badge variant="info" size="sm" className="hidden sm:inline-flex">Live System</Badge>
          </h1>
          {subtitle && <p className="text-[11px] text-[#64748b] hidden md:block">{subtitle}</p>}
        </div>
      </div>

      {/* Right: Notifications & Profile */}
      <div className="flex items-center gap-2 md:gap-3">
        {/* Notifications Popover */}
        <div className="relative">
          <button
            onClick={() => setNotificationsOpen(!notificationsOpen)}
            className="relative p-2 rounded-xl text-[#64748b] hover:text-[#0f172a] hover:bg-[#f1f5f9] transition-colors"
            title="Notifications"
          >
            <Bell className="w-5 h-5" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-blue-600 ring-2 ring-white"></span>
          </button>

          {notificationsOpen && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-large border border-[#e2e8f0] p-4 z-50 animate-fade-in-up">
              <div className="flex items-center justify-between pb-3 border-b border-[#f1f5f9]">
                <h4 className="text-xs font-bold text-[#0f172a] uppercase tracking-wider">System Alerts</h4>
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
            ER
          </div>
          <div className="hidden sm:block text-left">
            <p className="text-xs font-bold text-[#0f172a] leading-tight">Atty. Ramos</p>
            <p className="text-[10px] text-[#64748b]">Administrator</p>
          </div>
        </div>
      </div>
    </header>
  );
}
