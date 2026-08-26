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

// Reads role from sessionStorage (tab-isolated) first, falling back to localStorage
function getUser() {
  try {
    const s = sessionStorage.getItem('govserve_user') || localStorage.getItem('govserve_user');
    return s ? JSON.parse(s) : null;
  } catch {
    return null;
  }
}

// Smart wrapper: Citizens see Citizen E-Services with key for fresh tab mounting; Staff/Admins see Staff Modules
function SmartRoute({ staffElement, citizenTab }: {
  staffElement: React.ReactElement;
  citizenTab: 'reserve' | 'utility' | 'cemetery' | 'assets';
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
          <Route path="/citizen/services" element={<CitizenServicesPage />} />

          <Route path="/facilities" element={<SmartRoute staffElement={<FacilitiesModule />} citizenTab="reserve" />} />
          <Route path="/parks"      element={<SmartRoute staffElement={<ParksModule />}      citizenTab="reserve" />} />
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
