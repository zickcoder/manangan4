import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LandingPage } from './pages/LandingPage';
import { CitizenLoginPage } from './pages/CitizenLoginPage';
import { CitizenRegisterPage } from './pages/CitizenRegisterPage';
import { StaffLoginPage } from './pages/StaffLoginPage';
import { AppLayout } from './components/layout/AppLayout';
import { DashboardPage } from './pages/DashboardPage';
import { CitizenServicesPage } from './pages/CitizenServicesPage';
import { FacilitiesModule } from './pages/FacilitiesModule';
import { ParksModule } from './pages/ParksModule';
import { CemeteryModule } from './pages/CemeteryModule';
import { UtilitiesModule } from './pages/UtilitiesModule';
import { AssetsModule } from './pages/AssetsModule';
import { ReportsModule } from './pages/ReportsModule';
import { MyTicketsPage } from './pages/MyTicketsPage';

// Reads user based on active tab portal context (isolates Citizen from Staff sessions)
export function getUser() {
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

// Smart wrapper: Citizens see Citizen E-Services with key for fresh tab mounting; Staff/Admins see Staff Modules
function SmartRoute({ staffElement, citizenTab }: {
  staffElement: React.ReactElement;
  citizenTab: 'facility' | 'parks' | 'reserve' | 'utility' | 'cemetery' | 'assets';
}) {
  const user = getUser();
  if (user?.role === 'Citizen') {
    return <CitizenServicesPage key={citizenTab} defaultTab={citizenTab} />;
  }
  return staffElement;
}

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Landing Page — no login required */}
        <Route path="/" element={<LandingPage />} />

        {/* Auth pages — full-screen split view */}
        <Route path="/login" element={<CitizenLoginPage />} />
        <Route path="/register" element={<CitizenRegisterPage />} />
        <Route path="/admin/login" element={<StaffLoginPage />} />
        <Route path="/staff/login" element={<StaffLoginPage />} />

        {/* Authenticated shell — AppLayout guards login */}
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/my-tickets" element={<MyTicketsPage />} />
          <Route path="/citizen/services" element={<Navigate to="/facilities" replace />} />

          <Route path="/facilities" element={<SmartRoute staffElement={<FacilitiesModule />} citizenTab="facility" />} />
          <Route path="/parks"      element={<SmartRoute staffElement={<ParksModule />}      citizenTab="parks" />} />
          <Route path="/cemetery"   element={<SmartRoute staffElement={<CemeteryModule />}   citizenTab="cemetery" />} />
          <Route path="/utilities"  element={<SmartRoute staffElement={<UtilitiesModule />}  citizenTab="utility" />} />
          <Route path="/assets"     element={<SmartRoute staffElement={<AssetsModule />}     citizenTab="assets" />} />
          <Route path="/reports"    element={<ReportsModule />} />
        </Route>

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
