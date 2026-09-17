import React, { useState, useEffect, useCallback } from 'react';
import { Outlet, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { AppSidebar } from './AppSidebar';
import { AppHeader } from './AppHeader';
import { UserProfileModal } from '../profile/UserProfileModal';

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

  // Stable callback refs — prevent handler recreation on data-event re-renders
  const handleToggleSidebar = useCallback(() => setIsSidebarOpen(prev => !prev), []);
  const handleCloseSidebar = useCallback(() => setIsSidebarOpen(false), []);
  const handleOpenProfile = useCallback(() => setIsProfileOpen(true), []);
  const handleCloseProfile = useCallback(() => setIsProfileOpen(false), []);

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
          <div className="p-3 sm:p-5 md:p-6 lg:p-8 max-w-7xl mx-auto w-full">
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
    </div>
  );
}
