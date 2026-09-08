import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Menu, 
  Bell, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle,
  ExternalLink,
  CheckCheck,
  User
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
  onOpenProfile?: () => void;
  title?: string;
  subtitle?: string;
}

function getInitials(name?: string) {
  if (!name) return 'U';
  const parts = name.split(' ');
  return parts.length >= 2 ? `${parts[0][0]}${parts[1][0]}` : parts[0].slice(0, 2).toUpperCase();
}

/** Always returns the freshest user based on active portal session */
function getCurrentUser() {
  try {
    const portal = sessionStorage.getItem('govserve_portal');
    if (portal === 'staff') {
      const s = sessionStorage.getItem('govserve_staff_user') || localStorage.getItem('govserve_staff_user');
      if (s) return JSON.parse(s);
    } else if (portal === 'citizen') {
      const s = sessionStorage.getItem('govserve_citizen_user') || localStorage.getItem('govserve_citizen_user');
      if (s) return JSON.parse(s);
    }

    const sess = sessionStorage.getItem('govserve_user');
    if (sess) {
      const parsed = JSON.parse(sess);
      if (parsed && parsed.email) return parsed;
    }

    const path = window.location.pathname;
    const isStaffPath = path.startsWith('/admin') || path.startsWith('/staff') || path.startsWith('/reports');
    const staffStr = localStorage.getItem('govserve_staff_user');
    const citStr = localStorage.getItem('govserve_citizen_user');

    if (isStaffPath && staffStr) return JSON.parse(staffStr);
    if (citStr) return JSON.parse(citStr);
    if (staffStr) return JSON.parse(staffStr);

    const s = localStorage.getItem('govserve_user');
    return s ? JSON.parse(s) : null;
  } catch {
    return null;
  }
}

export function AppHeader({ onToggleSidebar, onOpenProfile, title, subtitle }: HeaderProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [currentUser, setCurrentUser] = useState(getCurrentUser);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);

  const isCitizen = currentUser?.role === 'Citizen';

  // Close notifications popover when clicking anywhere outside or pressing Escape
  useEffect(() => {
    if (!notificationsOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setNotificationsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setNotificationsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [notificationsOpen]);

  const syncNotifications = () => {
    // Re-read user on every sync — prevents stale role/email cross-contamination
    const freshUser = getCurrentUser();
    setCurrentUser(freshUser);
    const list = getNotificationsForUser(
      freshUser?.role || 'Super Admin',
      freshUser?.email
    );
    setNotifications(list);
  };

  useEffect(() => {
    syncNotifications();

    // Refresh on notification changes
    window.addEventListener('govserve_notifications_updated', syncNotifications);
    // Refresh when localStorage changes (cross-tab login/logout)
    window.addEventListener('storage', syncNotifications);

    // Refresh relative timestamps every 30 seconds
    intervalRef.current = setInterval(syncNotifications, 30000);

    return () => {
      window.removeEventListener('govserve_notifications_updated', syncNotifications);
      window.removeEventListener('storage', syncNotifications);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  // Re-sync whenever route changes (e.g. citizen → admin navigation)
  useEffect(() => {
    syncNotifications();
  }, [location.pathname]);

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
    markAllNotificationsAsRead(
      currentUser?.role || 'Super Admin',
      currentUser?.email
    );
    syncNotifications();
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

      {/* Right: Notifications & Profile */}
      <div className="flex items-center gap-2 md:gap-3">
        {/* Live Notifications Popover */}
        <div className="relative" ref={popoverRef}>
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

        {/* Profile Button / Trigger */}
        {onOpenProfile && (
          <button
            onClick={onOpenProfile}
            className="flex items-center gap-2 p-1 sm:pl-2 sm:pr-3 py-1 rounded-xl border border-slate-200 hover:border-blue-400 bg-white hover:bg-slate-50 transition-all cursor-pointer shadow-xs group"
            title="My Profile & Security"
          >
            <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-xs ring-1 ring-blue-500/20">
              {isCitizen ? getInitials(currentUser?.name) : <User className="w-4 h-4" />}
            </div>
            <div className="hidden sm:flex flex-col text-left">
              <span className="text-xs font-bold text-slate-800 group-hover:text-blue-600 transition-colors leading-tight truncate max-w-[110px]">
                {currentUser?.name || (isCitizen ? 'Citizen' : 'Admin')}
              </span>
              <span className="text-[9px] text-slate-400 font-semibold uppercase tracking-wider leading-none">
                {isCitizen ? 'My Profile' : 'Admin'}
              </span>
            </div>
          </button>
        )}
      </div>
    </header>
  );
}
