import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LandingPage } from './pages/LandingPage';
import { PublicPortal } from './pages/PublicPortal';
import { LoginPage } from './pages/LoginPage';
import { AppLayout } from './components/layout/AppLayout';
import { DashboardPage } from './pages/DashboardPage';
import { FacilitiesModule } from './pages/FacilitiesModule';
import { ParksModule } from './pages/ParksModule';
import { CemeteryModule } from './pages/CemeteryModule';
import { UtilitiesModule } from './pages/UtilitiesModule';
import { AssetsModule } from './pages/AssetsModule';
import { ReportsModule } from './pages/ReportsModule';

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Surfaces */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/portal" element={<PublicPortal />} />
        <Route path="/login" element={<LoginPage />} />

        {/* Authenticated Staff Shell for the 7 Modules */}
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/facilities" element={<FacilitiesModule />} />
          <Route path="/parks" element={<ParksModule />} />
          <Route path="/cemetery" element={<CemeteryModule />} />
          <Route path="/utilities" element={<UtilitiesModule />} />
          <Route path="/assets" element={<AssetsModule />} />
          <Route path="/reports" element={<ReportsModule />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
