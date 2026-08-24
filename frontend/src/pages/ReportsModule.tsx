import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  BarChart3, 
  Printer, 
  Building, 
  Cross, 
  Droplet, 
  Wrench, 
  ArrowRight
} from 'lucide-react';
import { Card, CardTitle, CardDescription } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { fetchStats } from '../lib/api';
import { DashboardStats } from '../types';

export function ReportsModule() {
  const [stats, setStats] = useState<DashboardStats | null>(null);

  useEffect(() => {
    fetchStats().then(setStats).catch(console.error);
  }, []);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-[#0f172a] font-display flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-600 text-white shadow-sm">
              <BarChart3 className="w-5 h-5" />
            </div>
            <span>Executive Reporting & System Analytics</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Comprehensive operational telemetry across facilities, cemetery plots, water/drainage, and asset fleet.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            leftIcon={<Printer className="w-4 h-4" />}
            onClick={() => window.print()}
          >
            Print Executive Summary
          </Button>
        </div>
      </div>

      {/* Analytics Breakdown (Clickable Cards) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Facilities & Parks Throughput */}
        <Link to="/facilities" className="block group">
          <Card className="border-[#cbd5e1] p-6 space-y-4 group-hover:border-blue-500 group-hover:shadow-md transition-all cursor-pointer h-full">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2 text-slate-900 group-hover:text-blue-600 transition-colors">
                <Building className="w-4 h-4 text-blue-600" />
                <span>Facility & Park Utilization Metrics</span>
              </CardTitle>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition-colors" />
            </div>
            <CardDescription>Event reservations, approval velocity and revenue</CardDescription>
            
            <div className="space-y-3 pt-2 text-xs">
              <div className="flex justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-slate-600">Total Managed Facilities & Parks:</span>
                <span className="font-bold text-slate-900">{stats?.totalFacilities || 4} Venues</span>
              </div>
              <div className="flex justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-slate-600">Approved Community Events:</span>
                <span className="font-bold text-emerald-600">{stats?.approvedReservations || 2} Events</span>
              </div>
              <div className="flex justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-slate-600">Pending Review:</span>
                <span className="font-bold text-amber-600">{stats?.pendingReservations || 1} Events</span>
              </div>
            </div>
          </Card>
        </Link>

        {/* Cemetery Plot Allocation */}
        <Link to="/cemetery" className="block group">
          <Card className="border-[#cbd5e1] p-6 space-y-4 group-hover:border-purple-500 group-hover:shadow-md transition-all cursor-pointer h-full">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2 text-slate-900 group-hover:text-purple-600 transition-colors">
                <Cross className="w-4 h-4 text-purple-600" />
                <span>Cemetery Capacity & Burial Permits</span>
              </CardTitle>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-purple-600 transition-colors" />
            </div>
            <CardDescription>Lawn lots, mausoleums and columbarium capacity</CardDescription>

            <div className="space-y-3 pt-2 text-xs">
              <div>
                <div className="flex justify-between font-semibold mb-1">
                  <span>Plot Occupancy Rate</span>
                  <span className="text-purple-700 font-bold">
                    {stats && stats.totalCemeteryPlots > 0 ? ((stats.occupiedPlots / stats.totalCemeteryPlots) * 100).toFixed(1) : '10.0'}%
                  </span>
                </div>
                <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-purple-600 rounded-full"
                    style={{ width: `${stats && stats.totalCemeteryPlots > 0 ? (stats.occupiedPlots / stats.totalCemeteryPlots) * 100 : 10}%` }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2">
                <div className="p-3 bg-purple-50 rounded-xl border border-purple-200 text-center">
                  <span className="text-[10px] text-purple-700 font-bold uppercase block">Available Lots</span>
                  <span className="text-lg font-black text-purple-900">{stats?.availablePlots || 95}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
                  <span className="text-[10px] text-slate-500 font-bold uppercase block">Burial Permits</span>
                  <span className="text-lg font-black text-slate-900">{stats?.totalBurials || 6}</span>
                </div>
              </div>
            </div>
          </Card>
        </Link>

        {/* Water & Drainage Tickets */}
        <Link to="/utilities" className="block group">
          <Card className="border-[#cbd5e1] p-6 space-y-4 group-hover:border-cyan-500 group-hover:shadow-md transition-all cursor-pointer h-full">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2 text-slate-900 group-hover:text-cyan-600 transition-colors">
                <Droplet className="w-4 h-4 text-cyan-600" />
                <span>Water & Drainage Service Resolution</span>
              </CardTitle>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-cyan-600 transition-colors" />
            </div>
            <CardDescription>AI triage dispatch speed and repair closeout</CardDescription>

            <div className="space-y-3 pt-2 text-xs">
              <div className="flex justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-slate-600">Active Incident Tickets:</span>
                <span className="font-bold text-cyan-700">{stats?.openUtilityRequests || 4} Open</span>
              </div>
              <div className="flex justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-slate-600">Average Triage Score:</span>
                <span className="font-bold text-red-600">80 / 100 (High Urgency)</span>
              </div>
              <div className="flex justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-slate-600">Average Crew Dispatch Time:</span>
                <span className="font-bold text-emerald-600">&lt; 45 Minutes</span>
              </div>
            </div>
          </Card>
        </Link>

        {/* Asset Fleet Health */}
        <Link to="/assets" className="block group">
          <Card className="border-[#cbd5e1] p-6 space-y-4 group-hover:border-amber-500 group-hover:shadow-md transition-all cursor-pointer h-full">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2 text-slate-900 group-hover:text-amber-600 transition-colors">
                <Wrench className="w-4 h-4 text-amber-600" />
                <span>Asset Fleet & Heavy Equipment Health</span>
              </CardTitle>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-amber-600 transition-colors" />
            </div>
            <CardDescription>Operational readiness and predictive maintenance</CardDescription>

            <div className="space-y-3 pt-2 text-xs">
              <div className="flex justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-slate-600">Total Registered Fleet:</span>
                <span className="font-bold text-slate-900">{stats?.totalAssets || 4} Units</span>
              </div>
              <div className="flex justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-slate-600">Operational Readiness:</span>
                <span className="font-bold text-emerald-600">75% Serviceable</span>
              </div>
              <div className="flex justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-slate-600">Pending Overhaul / Service:</span>
                <span className="font-bold text-amber-600">{stats?.assetsNeedingMaintenance || 1} Unit</span>
              </div>
            </div>
          </Card>
        </Link>
      </div>
    </div>
  );
}

