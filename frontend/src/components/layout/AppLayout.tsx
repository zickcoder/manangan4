import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Outlet, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { AppSidebar } from './AppSidebar';
import { AppHeader } from './AppHeader';
import { UserProfileModal } from '../profile/UserProfileModal';
import { SessionTimeoutModal } from '../auth/SessionTimeoutModal';
import { clearSessionOtp } from '../../lib/api';

function getUser() {
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

    if (isStaffPath && staffStr) {
      sessionStorage.setItem('govserve_portal', 'staff');
      sessionStorage.setItem('govserve_user', staffStr);
      return JSON.parse(staffStr);
    }

    if (citStr) {
      sessionStorage.setItem('govserve_portal', 'citizen');
      sessionStorage.setItem('govserve_user', citStr);
      return JSON.parse(citStr);
    }

    if (staffStr) {
      sessionStorage.setItem('govserve_portal', 'staff');
      sessionStorage.setItem('govserve_user', staffStr);
      return JSON.parse(staffStr);
    }

    const legacy = localStorage.getItem('govserve_user');
    if (legacy) return JSON.parse(legacy);

    return null;
  } catch {
    return null;
  }
}

// 30 Minutes Inactivity Timeout Constants
const TIMEOUT_DURATION_MS = 30 * 60 * 1000; // 30 mins
const WARNING_WINDOW_MS = 2 * 60 * 1000; // Warning shown at 28 mins (2 mins remaining)

export function AppLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 768;
    }
    return true;
  });
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  // Re-read user from localStorage or sessionStorage on every render
  const user = getUser();
  const isStaff = user ? user.role !== 'Citizen' : (location.pathname.startsWith('/admin') || location.pathname.startsWith('/staff') || location.pathname.startsWith('/reports') || sessionStorage.getItem('govserve_portal') === 'staff');
  const portalKey = user?.role === 'Citizen' ? 'citizen' : 'staff';

  // 30-Minute Inactivity Session Timeout State
  const [showTimeoutWarning, setShowTimeoutWarning] = useState(false);
  const [timeoutSecondsLeft, setTimeoutSecondsLeft] = useState(120);
  const lastActivityRef = useRef<number>(Date.now());

  // Stable callback refs
  const handleToggleSidebar = useCallback(() => setIsSidebarOpen(prev => !prev), []);
  const handleCloseSidebar = useCallback(() => setIsSidebarOpen(false), []);
  const handleOpenProfile = useCallback(() => setIsProfileOpen(true), []);
  const handleCloseProfile = useCallback(() => setIsProfileOpen(false), []);

  /** Perform safe timeout logout */
  const handleTimeoutLogout = useCallback(() => {
    setShowTimeoutWarning(false);
    const p = user?.role === 'Citizen' ? 'citizen' : 'staff';
    if (user?.email) {
      clearSessionOtp(user.email, p);
    }

    if (p === 'citizen') {
      sessionStorage.removeItem('govserve_citizen_user');
      localStorage.removeItem('govserve_citizen_user');
      sessionStorage.removeItem('govserve_user');
      sessionStorage.removeItem('govserve_portal');
      sessionStorage.removeItem('govserve_resubmit_ticket');
      window.dispatchEvent(new Event('govserve_data_updated'));
      navigate('/login?timeout=1', { replace: true });
    } else {
      sessionStorage.removeItem('govserve_staff_user');
      localStorage.removeItem('govserve_staff_user');
      sessionStorage.removeItem('govserve_user');
      sessionStorage.removeItem('govserve_portal');
      window.dispatchEvent(new Event('govserve_data_updated'));
      navigate('/admin/login?timeout=1', { replace: true });
    }
  }, [navigate, user]);

  /** Extend / Keep active session */
  const handleStayLoggedIn = useCallback(() => {
    const now = Date.now();
    lastActivityRef.current = now;
    localStorage.setItem(`govserve_last_active_${portalKey}`, String(now));
    setShowTimeoutWarning(false);
    setTimeoutSecondsLeft(120);
  }, [portalKey]);

  // Synchronize authentication status across tabs — isolated per portal
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      const portal = sessionStorage.getItem('govserve_portal') || (user?.role === 'Citizen' ? 'citizen' : 'staff');

      if (portal === 'citizen' && e.key === 'govserve_citizen_user') {
        if (!e.newValue) {
          navigate('/login', { replace: true });
        } else {
          window.location.reload();
        }
      } else if (portal === 'staff' && e.key === 'govserve_staff_user') {
        if (!e.newValue) {
          navigate('/admin/login', { replace: true });
        } else {
          window.location.reload();
        }
      }
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [navigate, user?.role]);

  // 30-Minute Inactivity Monitoring Engine
  useEffect(() => {
    if (!user) return;

    // Initialize last active timestamp
    const initialTime = Date.now();
    lastActivityRef.current = initialTime;
    localStorage.setItem(`govserve_last_active_${portalKey}`, String(initialTime));

    let lastRecorded = initialTime;
    const recordActivity = () => {
      const now = Date.now();
      // Throttle localStorage updates to at most once every 5 seconds
      if (now - lastRecorded > 5000) {
        lastRecorded = now;
        lastActivityRef.current = now;
        localStorage.setItem(`govserve_last_active_${portalKey}`, String(now));
      }
    };

    const activityEvents = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'];
    activityEvents.forEach((evt) => window.addEventListener(evt, recordActivity, { passive: true }));

    // Interval checker running every second
    const interval = setInterval(() => {
      const storedTimeStr = localStorage.getItem(`govserve_last_active_${portalKey}`);
      const lastActive = storedTimeStr ? parseInt(storedTimeStr, 10) : lastActivityRef.current;
      const elapsed = Date.now() - lastActive;
      const remainingMs = TIMEOUT_DURATION_MS - elapsed;

      if (remainingMs <= 0) {
        // Session fully expired after 30 minutes
        clearInterval(interval);
        handleTimeoutLogout();
      } else if (remainingMs <= WARNING_WINDOW_MS) {
        // Under 2 minutes remaining -> show countdown warning modal
        setShowTimeoutWarning(true);
        setTimeoutSecondsLeft(Math.ceil(remainingMs / 1000));
      } else {
        // More than 2 minutes remaining
        setShowTimeoutWarning((prev) => (prev ? false : prev));
      }
    }, 1000);

    return () => {
      clearInterval(interval);
      activityEvents.forEach((evt) => window.removeEventListener(evt, recordActivity));
    };
  }, [user, portalKey, handleTimeoutLogout]);

  // Not logged in → redirect to matching portal login
  if (!user) {
    return <Navigate to={isStaff ? '/admin/login' : '/login'} replace />;
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-canvas">
      {/* Mobile backdrop overlay (clean dim, no blur) */}
      {isSidebarOpen && (
        <div
          onClick={handleCloseSidebar}
          className="fixed inset-0 bg-slate-950/40 z-30 md:hidden"
        />
      )}

      {/* Dark navy sidebar */}
      <AppSidebar
        isOpen={isSidebarOpen}
        onClose={handleCloseSidebar}
        onToggle={handleToggleSidebar}
        onOpenProfile={handleOpenProfile}
      />

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <AppHeader 
          onToggleSidebar={handleToggleSidebar} 
          onOpenProfile={handleOpenProfile}
        />

        <main className="flex-1 overflow-y-auto">
          <div className="p-3 sm:p-5 md:p-6 lg:p-8 w-full">
            <Outlet />
          </div>
        </main>
      </div>

      {/* User Profile Modal */}
      <UserProfileModal
        isOpen={isProfileOpen}
        onClose={handleCloseProfile}
        user={user}
      />

      {/* 30-Minute Inactivity Session Timeout Modal */}
      <SessionTimeoutModal
        isOpen={showTimeoutWarning}
        secondsRemaining={timeoutSecondsLeft}
        onStayLoggedIn={handleStayLoggedIn}
        onLogout={handleTimeoutLogout}
      />
    </div>
  );
}
