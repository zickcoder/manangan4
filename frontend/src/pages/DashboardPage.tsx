import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { 
  Building, 
  Trees, 
  Cross, 
  Droplet, 
  Wrench, 
  BarChart3, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  RefreshCw, 
  ArrowUpRight, 
  Plus, 
  ArrowRight, 
  Activity,
  Send,
  ShieldCheck,
  Calendar,
  PhoneCall,
  BellRing,
  ExternalLink,
  User,
  FileText,
  MapPin,
  Eye,
  Check,
  QrCode,
  Image as ImageIcon,
  Filter,
  Search,
  Printer
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Modal } from "../components/ui/Modal";
import { 
  fetchStats, 
  fetchReservations, 
  fetchUtilities, 
  fetchBurials, 
  fetchAssets, 
  updateReservationStatus, 
  updateUtilityStatus, 
  fetchActivityLogs,
  cancelReservation,
  cancelUtilityRequest,
  cancelBurial
} from "../lib/api";
import { DashboardStats, FacilityReservation, UtilityRequest, BurialRecord, Asset, ActivityLog } from "../types";

export function DashboardPage() {
  const navigate = useNavigate();

  const userStr = sessionStorage.getItem('govserve_user') || localStorage.getItem('govserve_user');
  let user: any = { name: 'Admin', role: 'Admin', email: 'ronmanangan10@gmail.com' };
  try {
    if (userStr) user = JSON.parse(userStr);
  } catch {}

  const isCitizen = user?.role === 'Citizen';

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [allReservations, setAllReservations] = useState<FacilityReservation[]>([]);
  const [allUtilities, setAllUtilities] = useState<UtilityRequest[]>([]);
  const [allBurials, setAllBurials] = useState<BurialRecord[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [activity, setActivity] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  // Search query for citizen ticket tracker
  const [ticketSearchQuery, setTicketSearchQuery] = useState('');
  const [selectedSubmission, setSelectedSubmission] = useState<any | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [statsData, resData, utilData, burData, astData, actData] = await Promise.all([
        fetchStats(), 
        fetchReservations("all","all"), 
        fetchUtilities("all","all"), 
        fetchBurials(),
        fetchAssets(),
        fetchActivityLogs(),
      ]);
      setStats(statsData); 
      setAllReservations(resData); 
      setAllUtilities(utilData); 
      setAllBurials(burData);
      setAssets(astData);
      setActivity(actData.slice(0,8));
    } catch(e){ 
      console.error(e); 
    } finally { 
      setLoading(false); 
    }
  };

  useEffect(() => { 
    loadData(); 
  }, []);

  // Filter submissions belonging to this citizen
  const userEmail = (user?.email || '').toLowerCase().trim();
  const userName = (user?.name || '').toLowerCase().trim();
  const userId = user?.id;

  const matchesCitizen = (email: string, name: string, cId?: number | string) => {
    if (userId && cId && String(cId) === String(userId)) return true;
    if (userEmail && email && email.toLowerCase().trim() === userEmail) return true;
    const lName = (name || '').toLowerCase().trim();
    if (lName && userName && (lName.includes(userName) || userName.includes(lName))) return true;
    return false;
  };

  const myReservations = allReservations.filter((r) =>
    matchesCitizen(r.applicant_email || '', r.applicant_name || '', (r as any).citizen_id)
  );

  const myUtilities = allUtilities.filter((u) =>
    matchesCitizen((u as any).citizen_email || '', u.citizen_name || '', (u as any).citizen_id)
  );

  const myBurials = allBurials.filter((b) =>
    matchesCitizen((b as any).applicant_email || '', b.contact_person || '', (b as any).citizen_id)
  );

  const mySubmissions = [
    ...myReservations.map(r => ({
      id: `res-${r.id}`,
      raw: r,
      category: 'facility',
      type: 'Facility Booking',
      title: r.facility_name || 'Multi-Purpose Civic Center',
      ref_no: r.reference_no || '',
      date: r.event_date || '',
      time: `${r.start_time || ''} - ${r.end_time || ''}`,
      details: r.purpose || r.purpose_event_name || 'Event Booking',
      status: r.status || 'Pending',
      remarks: r.remarks || 'Under verification by LGU Facilities Bureau',
      badgeVariant: r.status === 'Approved' || r.status === 'Paid' ? 'success' : r.status === 'Pending Payment' ? 'info' : r.status === 'Rejected' ? 'destructive' : 'warning'
    })),
    ...myUtilities.map(u => ({
      id: `util-${u.id}`,
      raw: u,
      category: 'utility',
      type: 'Water & Drainage Ticket',
      title: u.service_type || 'Utility Report',
      ref_no: u.ticket_no || '',
      date: u.created_at ? new Date(u.created_at).toISOString().split('T')[0] : '2026-08-25',
      time: u.urgency || (u as any).urgency_level || 'Urgent',
      details: u.location || (u as any).specific_location || (u as any).incident_description || 'See ticket',
      status: u.status || 'Pending',
      remarks: u.resolution_notes || 'Ticket queued for priority dispatch',
      badgeVariant: u.status === 'Resolved' ? 'success' : u.status === 'In Progress' ? 'info' : 'warning'
    })),
    ...myBurials.map(b => ({
      id: `bur-${b.id}`,
      raw: b,
      category: 'cemetery',
      type: 'Burial Permit Application',
      title: `Deceased: ${(b as any).deceased_full_name || b.deceased_name || 'Individual'}`,
      ref_no: b.permit_no || b.reference_no || '',
      date: b.burial_date || '',
      time: 'Interment Date',
      details: b.plot_code || 'Columbarium Wall Alpha',
      status: b.status || 'Pending',
      remarks: `Burial plot registered at ${b.plot_code || 'Columbarium Alpha'}`,
      badgeVariant: b.status === 'Approved' || b.status === 'Completed' ? 'purple' : b.status === 'Pending Payment' ? 'info' : 'warning'
    }))
  ];

  const filteredSubmissions = mySubmissions.filter(item => {
    if (!ticketSearchQuery.trim()) return true;
    const q = ticketSearchQuery.toLowerCase().trim();
    return (
      (item.ref_no || '').toLowerCase().includes(q) ||
      (item.title || '').toLowerCase().includes(q) ||
      (item.details || '').toLowerCase().includes(q) ||
      (item.status || '').toLowerCase().includes(q)
    );
  });

  // =========================================================================
  // RENDER CITIZEN DASHBOARD
  // =========================================================================
  if (isCitizen) {
    return (
      <div className="space-y-6 animate-fade-in pb-12">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-extrabold text-[#0f172a] font-display">
                My Citizen Dashboard
              </h2>
              <Badge variant="info" size="sm">Resident Account</Badge>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Welcome back, <strong className="text-slate-900">{user?.name || 'Citizen'}</strong>! Click any card below to filter your requests.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={loadData} leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />}>
              Refresh Data
            </Button>
            <Link to="/facilities">
              <Button size="sm" variant="primary" leftIcon={<Plus className="w-3.5 h-3.5" />}>
                Submit New Request
              </Button>
            </Link>
          </div>
        </div>

        {/* 3 Interactive Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div 
            onClick={() => navigate('/my-tickets?category=facility')} 
            className="cursor-pointer group"
          >
            <Card className="border-l-4 border-l-blue-600 p-5 shadow-soft transition-all hover:shadow-md hover:border-blue-300">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">My Facility Bookings</span>
                <div className="p-2 rounded-xl bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all">
                  <Building className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3">
                <span className="text-3xl font-extrabold text-[#0f172a] font-display">{myReservations.length}</span>
                <span className="text-[11px] text-emerald-600 font-semibold ml-2">
                  ({myReservations.filter(r => r.status === 'Approved' || r.status === 'Paid').length} Approved)
                </span>
              </div>
              <p className="text-[11px] text-blue-700 font-bold mt-1.5 flex items-center gap-1">
                Click to filter my facility requests →
              </p>
            </Card>
          </div>

          <div 
            onClick={() => navigate('/my-tickets?category=utility')} 
            className="cursor-pointer group"
          >
            <Card className="border-l-4 border-l-cyan-600 p-5 shadow-soft transition-all hover:shadow-md hover:border-cyan-300">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">My Drainage Tickets</span>
                <div className="p-2 rounded-xl bg-cyan-50 text-cyan-600 group-hover:bg-cyan-600 group-hover:text-white transition-all">
                  <Droplet className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3">
                <span className="text-3xl font-extrabold text-[#0f172a] font-display">{myUtilities.length}</span>
                <Badge variant="warning" className="ml-2">Active Response</Badge>
              </div>
              <p className="text-[11px] text-cyan-700 font-bold mt-1.5 flex items-center gap-1">
                Click to filter my drainage tickets →
              </p>
            </Card>
          </div>

          <div 
            onClick={() => navigate('/my-tickets?category=cemetery')} 
            className="cursor-pointer group"
          >
            <Card className="border-l-4 border-l-purple-600 p-5 shadow-soft transition-all hover:shadow-md hover:border-purple-300">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">My Burial Permits</span>
                <div className="p-2 rounded-xl bg-purple-50 text-purple-600 group-hover:bg-purple-600 group-hover:text-white transition-all">
                  <Cross className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3">
                <span className="text-3xl font-extrabold text-[#0f172a] font-display">{myBurials.length}</span>
                <Badge variant="purple" className="ml-2">Allocated</Badge>
              </div>
              <p className="text-[11px] text-purple-700 font-bold mt-1.5 flex items-center gap-1">
                Click to filter my burial permits →
              </p>
            </Card>
          </div>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card className="border-[#cbd5e1] overflow-hidden shadow-sm bg-white">
              <div className="p-6 bg-white text-slate-900 border-b border-slate-100">
                <div className="space-y-2">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-xs font-bold">
                    <Search className="w-3.5 h-3.5 text-blue-600" />
                    <span>Real-Time Ticket Lookup</span>
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 font-display">
                    Track Submitted Ticket Progress
                  </h3>
                  <p className="text-xs text-slate-500">
                    Type your tracking code below to inspect real-time municipal status.
                  </p>
                </div>

                <div className="relative mt-4">
                  <input
                    type="text"
                    value={ticketSearchQuery}
                    onChange={(e) => setTicketSearchQuery(e.target.value)}
                    placeholder="Enter Tracking No. (e.g. RES-2026-001, UTL-2026-001)..."
                    className="w-full pl-4 pr-32 py-3 text-xs bg-slate-50 border border-slate-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 focus:bg-white text-slate-900 font-medium"
                  />
                  <Link to="/my-tickets" className="absolute right-2 top-1/2 -translate-y-1/2">
                    <Button size="sm" variant="primary" className="rounded-xl text-xs font-bold">
                      All Tickets →
                    </Button>
                  </Link>
                </div>

                {ticketSearchQuery.trim() !== '' && (
                  <div className="mt-4 pt-4 border-t border-slate-100 space-y-3">
                    <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Search Results for "{ticketSearchQuery}"
                    </p>
                    {filteredSubmissions.length === 0 ? (
                      <div className="p-4 text-center bg-slate-50 rounded-xl text-slate-500 text-xs">
                        No tickets matching "{ticketSearchQuery}".
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {filteredSubmissions.map((item) => (
                          <div key={item.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                            <div>
                              <span className="font-mono font-bold text-blue-600 text-xs mr-2">{item.ref_no}</span>
                              <span className="font-bold text-slate-900 text-xs">{item.title}</span>
                              <p className="text-[11px] text-slate-500">{item.details}</p>
                            </div>
                            <Badge variant={item.badgeVariant as any}>{item.status}</Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="border-[#cbd5e1]">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <BellRing className="w-4 h-4 text-blue-600" />
                  <div>
                    <CardTitle className="text-base">Barangay Bulletins</CardTitle>
                    <CardDescription>Official announcements</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200">
                  <span className="font-bold text-amber-900 text-xs">Scheduled Drainage Dredging</span>
                  <p className="text-amber-800 text-[11px] mt-1">Maintenance crews dredging main canal line Sector 4 tomorrow 8 AM.</p>
                </div>
                <div className="p-3 bg-blue-50 rounded-xl border border-blue-200">
                  <span className="font-bold text-blue-900 text-xs">Facility Booking Window</span>
                  <p className="text-blue-800 text-[11px] mt-1">File civic hall reservations 48 hours before event date.</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // RENDER SUPER ADMIN EXECUTIVE REPORTING & SYSTEM ANALYTICS DASHBOARD
  // =========================================================================
  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-blue-600 text-white shadow-sm">
              <BarChart3 className="w-5 h-5" />
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-[#0f172a] font-display">
              Executive Reporting & System Analytics
            </h2>
            <Badge variant="purple" size="sm">Admin Console</Badge>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Comprehensive operational telemetry across facilities, cemetery plots, water/drainage, and asset fleet.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={loadData}
            leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />}
          >
            Refresh Data
          </Button>
          <Button
            size="sm"
            variant="primary"
            className="bg-blue-600 hover:bg-blue-700 font-bold text-xs"
            leftIcon={<Printer className="w-4 h-4" />}
            onClick={() => window.print()}
          >
            Print Executive Summary
          </Button>
        </div>
      </div>

      {/* Top Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <button onClick={() => navigate("/facilities")} className="text-left group">
          <Card className="border-l-4 border-l-blue-600 p-5 group-hover:shadow-md transition-all cursor-pointer h-full">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Facility & Park Bookings</span>
              <div className="p-2 rounded-xl bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all"><Building className="w-5 h-5" /></div>
            </div>
            <div className="mt-3">
              <span className="text-3xl font-extrabold text-[#0f172a] font-display">{allReservations.length}</span>
              <span className="text-[11px] text-amber-600 font-semibold ml-2">
                ({allReservations.filter(r => r.status === 'Pending').length} Pending)
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">{stats?.totalFacilities || 4} Total Managed Spaces</p>
            <p className="text-[10px] text-blue-600 font-bold mt-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">Manage Facilities <ArrowRight className="w-3 h-3" /></p>
          </Card>
        </button>

        <button onClick={() => navigate("/cemetery")} className="text-left group">
          <Card className="border-l-4 border-l-purple-600 p-5 group-hover:shadow-md transition-all cursor-pointer h-full">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Cemetery Plot Occupancy</span>
              <div className="p-2 rounded-xl bg-purple-50 text-purple-600 group-hover:bg-purple-600 group-hover:text-white transition-all"><Cross className="w-5 h-5" /></div>
            </div>
            <div className="mt-3">
              <span className="text-3xl font-extrabold text-[#0f172a] font-display">{stats?.occupiedPlots ?? 8} / {stats?.totalCemeteryPlots ?? 90}</span>
              <Badge variant="purple" className="ml-2">{stats?.availablePlots ?? 82} Available</Badge>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">{allBurials.length} Registered Burials</p>
            <p className="text-[10px] text-purple-600 font-bold mt-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">Manage Cemetery <ArrowRight className="w-3 h-3" /></p>
          </Card>
        </button>

        <button onClick={() => navigate("/utilities")} className="text-left group">
          <Card className="border-l-4 border-l-cyan-600 p-5 group-hover:shadow-md transition-all cursor-pointer h-full">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Water & Drainage Desk</span>
              <div className="p-2 rounded-xl bg-cyan-50 text-cyan-600 group-hover:bg-cyan-600 group-hover:text-white transition-all"><Droplet className="w-5 h-5" /></div>
            </div>
            <div className="mt-3">
              <span className="text-3xl font-extrabold text-[#0f172a] font-display">{allUtilities.length}</span>
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
              <span className="text-3xl font-extrabold text-[#0f172a] font-display">{assets.length} Units</span>
              <Badge variant="success" className="ml-2">Operational</Badge>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Backhoes, tankers, flood pumps</p>
            <p className="text-[10px] text-amber-600 font-bold mt-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">Inspect Assets <ArrowRight className="w-3 h-3" /></p>
          </Card>
        </button>
      </div>

      {/* Main Admin Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Facility Reservations Box - Fully Clickable */}
          <div onClick={() => navigate('/facilities')} className="cursor-pointer group">
            <Card className="border-[#cbd5e1] hover:border-blue-400 hover:shadow-md transition-all">
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <div>
                  <CardTitle className="group-hover:text-blue-600 transition-colors">
                    Government Facility Reservation & Scheduling
                  </CardTitle>
                  <CardDescription>Click to access Facility & Park Bookings Desk</CardDescription>
                </div>
                <span className="text-xs font-bold text-blue-600 group-hover:translate-x-1 transition-transform flex items-center gap-1">
                  Go to Module <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3">Ref</th>
                        <th className="py-2.5 px-3">Facility</th>
                        <th className="py-2.5 px-3">Applicant & Purpose</th>
                        <th className="py-2.5 px-3">Schedule</th>
                        <th className="py-2.5 px-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {allReservations.slice(0, 5).map((r) => (
                        <tr key={r.id} className="hover:bg-blue-50/50 transition-colors">
                          <td className="py-3 px-3 font-mono font-bold text-blue-600">{r.reference_no}</td>
                          <td className="py-3 px-3 text-slate-800 max-w-[140px] truncate">{r.facility_name}</td>
                          <td className="py-3 px-3 max-w-[180px]">
                            <p className="font-bold text-slate-900 truncate">{r.applicant_name}</p>
                            <p className="text-[10px] text-slate-500 truncate">{r.purpose}</p>
                          </td>
                          <td className="py-3 px-3 text-slate-700 whitespace-nowrap">
                            {new Date(r.event_date).toLocaleDateString()}
                            <span className="block text-[10px] text-slate-400">{r.start_time} - {r.end_time}</span>
                          </td>
                          <td className="py-3 px-3"><Badge variant={r.status === "Approved" || r.status === "Paid" ? "success" : "warning"}>{r.status}</Badge></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Water & Drainage Tickets Box - Fully Clickable */}
          <div onClick={() => navigate('/utilities')} className="cursor-pointer group">
            <Card className="border-[#cbd5e1] hover:border-cyan-400 hover:shadow-md transition-all">
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <div>
                  <CardTitle className="group-hover:text-cyan-600 transition-colors">
                    Water Supply & Drainage Incident Dispatch Desk
                  </CardTitle>
                  <CardDescription>Click to access Water & Drainage Incident Dispatch Desk</CardDescription>
                </div>
                <span className="text-xs font-bold text-cyan-600 group-hover:translate-x-1 transition-transform flex items-center gap-1">
                  Go to Module <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3">Ticket</th>
                        <th className="py-2.5 px-3">Service Type</th>
                        <th className="py-2.5 px-3">Location</th>
                        <th className="py-2.5 px-3">AI Score</th>
                        <th className="py-2.5 px-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {allUtilities.slice(0, 5).map((u) => (
                        <tr key={u.id} className="hover:bg-cyan-50/50 transition-colors">
                          <td className="py-3 px-3 font-mono font-bold text-cyan-700">{u.ticket_no}</td>
                          <td className="py-3 px-3 font-bold text-slate-800">{u.service_type}</td>
                          <td className="py-3 px-3 text-slate-600 max-w-[180px] truncate">{u.location}</td>
                          <td className="py-3 px-3"><span className="font-bold text-cyan-700 bg-cyan-50 px-2 py-0.5 rounded border border-cyan-200">{u.ai_priority_score} pts</span></td>
                          <td className="py-3 px-3"><Badge variant={u.status === "Resolved" ? "success" : u.status === "In Progress" ? "info" : "warning"}>{u.status}</Badge></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Right Column: Operations Audit Trail */}
        <div>
          <div className="block group">
            <Card className="border-[#cbd5e1] shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-sm flex items-center gap-2"><Activity className="w-4 h-4 text-blue-600" />Operations Audit Trail</CardTitle>
                    <CardDescription>Live log of approvals & dispatches</CardDescription>
                  </div>
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
          </div>
        </div>
      </div>
    </div>
  );
}
