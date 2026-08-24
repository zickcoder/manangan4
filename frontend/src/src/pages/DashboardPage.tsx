import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Building, Trees, Cross, Droplet, Wrench, BarChart3, CheckCircle2, Clock, AlertCircle, RefreshCw, ArrowUpRight, Plus, ArrowRight, Activity } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { fetchStats, fetchReservations, fetchUtilities, updateReservationStatus, updateUtilityStatus, fetchActivityLogs } from "../lib/api";
import { DashboardStats, FacilityReservation, UtilityRequest, ActivityLog } from "../types";

export function DashboardPage() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [reservations, setReservations] = useState([]);
  const [utilities, setUtilities] = useState([]);
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const [statsData, resData, utilData, actData] = await Promise.all([
        fetchStats(), fetchReservations("all","all"), fetchUtilities("all","all"), fetchActivityLogs(),
      ]);
      setStats(statsData); setReservations(resData.slice(0,5)); setUtilities(utilData.slice(0,5)); setActivity(actData.slice(0,8));
    } catch(e){ console.error(e); } finally { setLoading(false); }
  };
  useEffect(() => { loadData(); }, []);

  const handleApproveReservation = async (id) => {
    try { await updateReservationStatus(id, "Approved", "Approved via Dashboard", "Atty. Elena Ramos"); loadData(); } catch { alert("Failed"); }
  };
  const handleDispatchCrew = async (id) => {
    try { await updateUtilityStatus(id, "Dispatched", "Quick Response Crew Alpha", "Dispatched from Central Operations"); loadData(); } catch { alert("Failed"); }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-[#0f172a] font-display">Municipal Operations Telemetry</h2>
          <p className="text-xs text-slate-500 mt-0.5">Real-time monitoring of facilities, parks, cemetery plots, water/drainage requests, and asset maintenance.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={loadData} leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />}>Refresh</Button>
          <Link to="/portal"><Button size="sm" variant="primary" rightIcon={<ArrowUpRight className="w-3.5 h-3.5" />}>Open Citizen Portal</Button></Link>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <button onClick={() => navigate("/facilities")} className="text-left group">
          <Card className="border-l-4 border-l-blue-600 p-5 group-hover:shadow-md transition-all cursor-pointer h-full">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Facility & Park Bookings</span>
              <div className="p-2 rounded-xl bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all"><Building className="w-5 h-5" /></div>
            </div>
            <div className="mt-3">
              <span className="text-3xl font-extrabold text-[#0f172a] font-display">{stats?.approvedReservations ?? "—"}</span>
              <span className="text-[11px] text-amber-600 font-semibold ml-2">({stats?.pendingReservations ?? 0} Pending)</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">{stats?.totalFacilities || 4} Total Managed Spaces</p>
            <p className="text-[10px] text-blue-600 font-bold mt-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">View Facilities <ArrowRight className="w-3 h-3" /></p>
          </Card>
        </button>

        <button onClick={() => navigate("/cemetery")} className="text-left group">
          <Card className="border-l-4 border-l-purple-600 p-5 group-hover:shadow-md transition-all cursor-pointer h-full">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Cemetery Plot Occupancy</span>
              <div className="p-2 rounded-xl bg-purple-50 text-purple-600 group-hover:bg-purple-600 group-hover:text-white transition-all"><Cross className="w-5 h-5" /></div>
            </div>
            <div className="mt-3">
              <span className="text-3xl font-extrabold text-[#0f172a] font-display">{stats?.occupiedPlots ?? 0} / {stats?.totalCemeteryPlots ?? 0}</span>
              <Badge variant="purple" className="ml-2">{stats?.availablePlots ?? 0} Available</Badge>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">{stats?.totalBurials || 0} Registered Burials</p>
            <p className="text-[10px] text-purple-600 font-bold mt-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">Manage Cemetery <ArrowRight className="w-3 h-3" /></p>
          </Card>
        </button>

        <button onClick={() => navigate("/utilities")} className="text-left group">
          <Card className="border-l-4 border-l-cyan-600 p-5 group-hover:shadow-md transition-all cursor-pointer h-full">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Water & Drainage Tickets</span>
              <div className="p-2 rounded-xl bg-cyan-50 text-cyan-600 group-hover:bg-cyan-600 group-hover:text-white transition-all"><Droplet className="w-5 h-5" /></div>
            </div>
            <div className="mt-3">
              <span className="text-3xl font-extrabold text-[#0f172a] font-display">{stats?.openUtilityRequests ?? "—"}</span>
              <Badge variant="warning" className="ml-2">Active Response</Badge>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">AI prioritized emergency triage</p>
            <p className="text-[10px] text-cyan-600 font-bold mt-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">View Tickets <ArrowRight className="w-3 h-3" /></p>
          </Card>
        </button>

        <button onClick={() => navigate("/assets")} className="text-left group">
          <Card className="border-l-4 border-l-amber-500 p-5 group-hover:shadow-md transition-all cursor-pointer h-full">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Asset Fleet Status</span>
              <div className="p-2 rounded-xl bg-amber-50 text-amber-600 group-hover:bg-amber-500 group-hover:text-white transition-all"><Wrench className="w-5 h-5" /></div>
            </div>
            <div className="mt-3">
              <span className="text-3xl font-extrabold text-[#0f172a] font-display">{stats?.totalAssets ?? 4} Units</span>
              <span className="text-[11px] text-amber-600 font-semibold ml-2">{stats?.assetsNeedingMaintenance ?? 1} Need Service</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Backhoes, tankers, flood pumps</p>
            <p className="text-[10px] text-amber-600 font-bold mt-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">Inspect Assets <ArrowRight className="w-3 h-3" /></p>
          </Card>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-[#cbd5e1]">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle>Government Facility Reservation & Scheduling</CardTitle>
                <CardDescription>Upcoming citizen & community event bookings</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Link to="/facilities"><Button size="sm" variant="outline" leftIcon={<Plus className="w-3.5 h-3.5" />}>Add New Facility</Button></Link>
                <Link to="/facilities" className="text-xs font-bold text-blue-600 hover:text-blue-700 whitespace-nowrap">View All →</Link>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Ref</th><th className="py-2.5 px-3">Facility</th><th className="py-2.5 px-3">Applicant & Purpose</th><th className="py-2.5 px-3">Schedule</th><th className="py-2.5 px-3">Status</th><th className="py-2.5 px-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {reservations.map((r) => (
                      <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-3 font-mono font-bold text-blue-600">{r.reference_no}</td>
                        <td className="py-3 px-3 text-slate-800 max-w-[140px] truncate">{r.facility_name}</td>
                        <td className="py-3 px-3 max-w-[180px]"><p className="font-bold text-slate-900 truncate">{r.applicant_name}</p><p className="text-[10px] text-slate-500 truncate">{r.purpose}</p></td>
                        <td className="py-3 px-3 text-slate-700 whitespace-nowrap">{new Date(r.event_date).toLocaleDateString()}<span className="block text-[10px] text-slate-400">{r.start_time} - {r.end_time}</span></td>
                        <td className="py-3 px-3"><Badge variant={r.status === "Approved" ? "success" : "warning"}>{r.status}</Badge></td>
                        <td className="py-3 px-3 text-right">{r.status === "Pending" && (<button onClick={() => handleApproveReservation(r.id)} className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-semibold">Approve</button>)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <Card className="border-[#cbd5e1]">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle>Parks & Recreation Grounds</CardTitle>
                <CardDescription>Active water & drainage tickets with AI triage</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Link to="/facilities"><Button size="sm" variant="outline" leftIcon={<Plus className="w-3.5 h-3.5" />}>Add New Park</Button></Link>
                <Link to="/utilities" className="text-xs font-bold text-cyan-600 hover:text-cyan-700 whitespace-nowrap">Manage Tickets →</Link>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider border-b border-slate-200">
                    <tr><th className="py-2.5 px-3">Ticket</th><th className="py-2.5 px-3">Service Type</th><th className="py-2.5 px-3">Location</th><th className="py-2.5 px-3">AI Score</th><th className="py-2.5 px-3">Status</th><th className="py-2.5 px-3 text-right">Dispatch</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {utilities.map((u) => (
                      <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-3 font-mono font-bold text-cyan-700">{u.ticket_no}</td>
                        <td className="py-3 px-3 font-bold text-slate-800">{u.service_type}</td>
                        <td className="py-3 px-3 text-slate-600 max-w-[180px] truncate">{u.location}</td>
                        <td className="py-3 px-3"><span className="font-bold text-cyan-700 bg-cyan-50 px-2 py-0.5 rounded border border-cyan-200">{u.ai_priority_score} pts</span></td>
                        <td className="py-3 px-3"><Badge variant={u.status === "Resolved" ? "success" : u.status === "Dispatched" ? "info" : "warning"}>{u.status}</Badge></td>
                        <td className="py-3 px-3 text-right">{u.status === "Pending" && (<button onClick={() => handleDispatchCrew(u.id)} className="px-2.5 py-1 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg text-[11px] font-semibold">Dispatch Crew</button>)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

        <div>
          <Link to="/reports" className="block group">
            <Card className="border-[#cbd5e1] group-hover:shadow-md transition-all cursor-pointer">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-sm flex items-center gap-2"><Activity className="w-4 h-4 text-blue-600" />Operations Audit Trail</CardTitle>
                    <CardDescription>Live log of approvals & dispatches</CardDescription>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-blue-600 transition-colors" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
                  {activity.length === 0 ? (
                    <p className="text-xs text-slate-400 text-center py-6">No activity yet</p>
                  ) : activity.map((log) => (
                    <div key={log.id} className="text-xs border-l-2 border-blue-500 pl-3 py-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800">{log.user_name}</span>
                        <span className="text-[10px] text-slate-400">{new Date(log.timestamp).toLocaleTimeString()}</span>
                      </div>
                      <p className="text-slate-600 mt-0.5 text-[11px]">{log.action}: {log.details}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>
    </div>
  );
}
