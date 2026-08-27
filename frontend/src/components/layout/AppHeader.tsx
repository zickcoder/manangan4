import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Menu, 
  Search, 
  Bell, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle,
  ExternalLink,
  CheckCheck
} from 'lucide-react';
import { Badge } from '../ui/Badge';
import { 
  getNotificationsForUser, 
  markNotificationAsRead, 
  markAllNotificationsAsRead, 
  NotificationItem 
} from '../../lib/notifications';

interface HeaderProps {
  onToggleSidebar: () => void;
  title?: string;
  subtitle?: string;
}

export function AppHeader({ onToggleSidebar, title, subtitle }: HeaderProps) {
  const navigate = useNavigate();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  const userStr = sessionStorage.getItem('govserve_user') || localStorage.getItem('govserve_user');
  let user: any = { name: 'Atty. Elena Ramos', role: 'Super Admin', email: 'admin@govserve.gov.ph' };
  try {
    if (userStr) user = JSON.parse(userStr);
  } catch {}

  const isCitizen = user?.role === 'Citizen';

  const syncNotifications = () => {
    const list = getNotificationsForUser(user?.role || (isCitizen ? 'Citizen' : 'Super Admin'));
    setNotifications(list);
  };

  useEffect(() => {
    syncNotifications();
    window.addEventListener('govserve_notifications_updated', syncNotifications);
    return () => {
      window.removeEventListener('govserve_notifications_updated', syncNotifications);
    };
  }, []);

  const unreadCount = notifications.filter((n) => n.unread).length;

  const handleMarkRead = (id: string | number) => {
    markNotificationAsRead(id);
    syncNotifications();
  };

  const handleNotifClick = (n: NotificationItem) => {
    markNotificationAsRead(n.id);
    syncNotifications();
    setNotificationsOpen(false);

    if (isCitizen) {
      navigate('/my-tickets');
    } else {
      if (n.category === 'facility' || n.category === 'reservation') {
        navigate('/facilities');
      } else if (n.category === 'utility') {
        navigate('/utilities');
      } else if (n.category === 'cemetery') {
        navigate('/cemetery');
      } else {
        navigate('/dashboard');
      }
    }
  };

  const handleMarkAllRead = () => {
    markAllNotificationsAsRead(user?.role || (isCitizen ? 'Citizen' : 'Super Admin'));
    syncNotifications();
  };

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

      {/* Right: Notifications & Profile (Role switcher removed as requested) */}
      <div className="flex items-center gap-2 md:gap-3">
        {/* Live Notifications Popover */}
        <div className="relative">
          <button
            onClick={() => setNotificationsOpen(!notificationsOpen)}
            className="relative p-2 rounded-xl text-[#64748b] hover:text-[#0f172a] hover:bg-[#f1f5f9] transition-colors cursor-pointer"
            title="Notifications"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 min-w-[16px] h-4 px-1 rounded-full bg-blue-600 text-white text-[9px] font-bold flex items-center justify-center ring-2 ring-white animate-pulse">
                {unreadCount}
              </span>
            )}
          </button>

          {notificationsOpen && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-large border border-[#e2e8f0] p-4 z-50 animate-fade-in-up">
              <div className="flex items-center justify-between pb-3 border-b border-[#f1f5f9]">
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-bold text-[#0f172a] uppercase tracking-wider">
                    {isCitizen ? 'Citizen Notifications' : 'System Alerts'}
                  </h4>
                  {unreadCount > 0 && (
                    <span className="text-[10px] bg-blue-100 text-blue-700 font-bold px-2 py-0.5 rounded-full">
                      {unreadCount} New
                    </span>
                  )}
                </div>

                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="text-[11px] text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    <span>Mark all read</span>
                  </button>
                )}
              </div>

              <div className="divide-y divide-[#f8fafc] max-h-72 overflow-y-auto mt-1">
                {notifications.length === 0 ? (
                  <div className="py-8 text-center text-slate-400 text-xs">
                    No new notifications
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => handleNotifClick(n)}
                      className={`py-3 px-2 rounded-xl transition-colors cursor-pointer relative ${
                        n.unread ? 'bg-blue-50/50 hover:bg-blue-50' : 'hover:bg-[#f8fafc]'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          {n.unread && <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0"></span>}
                          <p className={`text-xs font-semibold ${n.unread ? 'text-blue-950 font-bold' : 'text-[#0f172a]'}`}>
                            {n.title}
                          </p>
                        </div>
                        <span className="text-[10px] text-[#94a3b8] shrink-0">{n.time}</span>
                      </div>
                      <p className="text-[11px] text-[#64748b] mt-1 leading-relaxed pl-3.5">{n.text}</p>
                    </div>
                  ))
                )}
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
