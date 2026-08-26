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
  Search
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

  const userStr = localStorage.getItem('govserve_user');
  let user: any = { name: 'Atty. Elena Ramos', role: 'Super Admin', email: 'admin@govserve.gov.ph' };
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

  // Active filter for Citizen Submissions Table
  const [citizenFilter, setCitizenFilter] = useState<'all' | 'facility' | 'utility' | 'cemetery'>('all');
  const [ticketSearchQuery, setTicketSearchQuery] = useState('');

  // Selected Citizen Submission Detail Modal
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

  const handleApproveReservation = async (id: number) => {
    try { 
      await updateReservationStatus(id, "Approved", "Approved via Operations Dashboard", user.name || "Atty. Elena Ramos"); 
      loadData(); 
    } catch { 
      alert("Failed to approve reservation"); 
    }
  };

  const handleDispatchCrew = async (id: number) => {
    try { 
      await updateUtilityStatus(id, "Dispatched", "Quick Response Crew Alpha", "Dispatched from Central Operations"); 
      loadData(); 
    } catch { 
      alert("Failed to dispatch crew"); 
    }
  };

  // =========================================================================
  // CITIZEN-SPECIFIC FILTERED SUBMISSIONS
  // =========================================================================
  const userEmail = (user?.email || '').toLowerCase().trim();
  const userName = (user?.name || '').toLowerCase().trim();
  const userId = user?.id;

  // Match submissions to this citizen
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

  // Combined list of Citizen requests
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
      attendees: `${r.attendees || 0} Pax`,
      status: r.status || 'Pending',
      remarks: r.remarks || 'Under verification by LGU Facilities Bureau',
      badgeVariant: r.status === 'Approved' ? 'success' : r.status === 'Rejected' ? 'destructive' : 'warning'
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
      affected_households: u.affected_households || '',
      photo_url: u.photo_url || '',
      status: u.status || 'Pending',
      assigned_team: u.assigned_team || '',
      remarks: u.resolution_notes || (u.assigned_team ? `Assigned to ${u.assigned_team}` : 'Ticket queued for priority dispatch'),
      badgeVariant: u.status === 'Resolved' ? 'success' : u.status === 'Dispatched' ? 'info' : 'warning'
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
      cause_of_death: b.cause_of_death || '',
      status: b.status || 'Pending',
      remarks: `Burial plot registered at ${b.plot_code || 'Columbarium Alpha'}`,
      badgeVariant: b.status === 'Approved' || b.status === 'Completed' ? 'purple' : 'warning'
    }))
  ];

  const filteredSubmissions = mySubmissions.filter(item => {
    // Category filter
    if (citizenFilter !== 'all' && item.category !== citizenFilter) return false;
    // Search query filter
    if (!ticketSearchQuery.trim()) return true;
    const q = ticketSearchQuery.toLowerCase().trim();
    return (
      (item.ref_no || '').toLowerCase().includes(q) ||
      (item.title || '').toLowerCase().includes(q) ||
      (item.details || '').toLowerCase().includes(q) ||
      (item.status || '').toLowerCase().includes(q) ||
      (item.type || '').toLowerCase().includes(q)
    );
  });

  // =========================================================================
  // RENDER CITIZEN DASHBOARD
  // =========================================================================
  if (isCitizen) {
    return (
      <div className="space-y-6 animate-fade-in">
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
              Welcome back, <strong className="text-slate-900">{user?.name || 'Citizen'}</strong>! Click any card below to view your submitted tickets for that service.
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

        {/* 4 Interactive Filter Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Facility Bookings */}
          <div 
            onClick={() => setCitizenFilter(citizenFilter === 'facility' ? 'all' : 'facility')} 
            className="cursor-pointer group"
          >
            <Card className={`border-l-4 border-l-blue-600 p-5 shadow-soft transition-all ${
              citizenFilter === 'facility' ? 'ring-2 ring-blue-500 bg-blue-50/50 border-blue-500' : 'hover:shadow-md hover:border-blue-300'
            }`}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">My Facility Bookings</span>
                <div className={`p-2 rounded-xl transition-all ${
                  citizenFilter === 'facility' ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white'
                }`}>
                  <Building className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3">
                <span className="text-3xl font-extrabold text-[#0f172a] font-display">{myReservations.length}</span>
                <span className="text-[11px] text-emerald-600 font-semibold ml-2">
                  ({myReservations.filter(r => r.status === 'Approved').length} Approved)
                </span>
              </div>
              <p className="text-[11px] text-blue-700 font-bold mt-1.5 flex items-center gap-1">
                {citizenFilter === 'facility' ? '✓ Filtered: Showing Facility Tickets' : 'Click to filter my facility requests →'}
              </p>
            </Card>
          </div>

          {/* Card 2: Drainage Tickets */}
          <div 
            onClick={() => setCitizenFilter(citizenFilter === 'utility' ? 'all' : 'utility')} 
            className="cursor-pointer group"
          >
            <Card className={`border-l-4 border-l-cyan-600 p-5 shadow-soft transition-all ${
              citizenFilter === 'utility' ? 'ring-2 ring-cyan-500 bg-cyan-50/50 border-cyan-500' : 'hover:shadow-md hover:border-cyan-300'
            }`}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">My Drainage Tickets</span>
                <div className={`p-2 rounded-xl transition-all ${
                  citizenFilter === 'utility' ? 'bg-cyan-600 text-white' : 'bg-cyan-50 text-cyan-600 group-hover:bg-cyan-600 group-hover:text-white'
                }`}>
                  <Droplet className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3">
                <span className="text-3xl font-extrabold text-[#0f172a] font-display">{myUtilities.length}</span>
                <Badge variant="warning" className="ml-2">Active Response</Badge>
              </div>
              <p className="text-[11px] text-cyan-700 font-bold mt-1.5 flex items-center gap-1">
                {citizenFilter === 'utility' ? '✓ Filtered: Showing Drainage Tickets' : 'Click to filter my drainage tickets →'}
              </p>
            </Card>
          </div>

          {/* Card 3: Burial Permits */}
          <div 
            onClick={() => setCitizenFilter(citizenFilter === 'cemetery' ? 'all' : 'cemetery')} 
            className="cursor-pointer group"
          >
            <Card className={`border-l-4 border-l-purple-600 p-5 shadow-soft transition-all ${
              citizenFilter === 'cemetery' ? 'ring-2 ring-purple-500 bg-purple-50/50 border-purple-500' : 'hover:shadow-md hover:border-purple-300'
            }`}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">My Burial Permits</span>
                <div className={`p-2 rounded-xl transition-all ${
                  citizenFilter === 'cemetery' ? 'bg-purple-600 text-white' : 'bg-purple-50 text-purple-600 group-hover:bg-purple-600 group-hover:text-white'
                }`}>
                  <Cross className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3">
                <span className="text-3xl font-extrabold text-[#0f172a] font-display">{myBurials.length}</span>
                <Badge variant="purple" className="ml-2">Allocated</Badge>
              </div>
              <p className="text-[11px] text-purple-700 font-bold mt-1.5 flex items-center gap-1">
                {citizenFilter === 'cemetery' ? '✓ Filtered: Showing Burial Permits' : 'Click to filter my burial permits →'}
              </p>
            </Card>
          </div>

          {/* Card 4: All Submissions Filter Reset */}
          <div onClick={() => setCitizenFilter('all')} className="cursor-pointer group">
            <Card className={`border-l-4 border-l-emerald-600 p-5 shadow-soft transition-all ${
              citizenFilter === 'all' ? 'bg-emerald-50/40 border-emerald-500' : 'hover:shadow-md'
            }`}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Resident Verification</span>
                <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600"><ShieldCheck className="w-5 h-5" /></div>
              </div>
              <div className="mt-3">
                <span className="text-xl font-extrabold text-emerald-700 font-display">Active Resident</span>
              </div>
              <p className="text-[11px] text-emerald-700 font-bold mt-1.5">
                {citizenFilter === 'all' ? '✓ Showing All Submissions' : 'Click to show all submissions →'}
              </p>
            </Card>
          </div>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left 2 Columns: Search a Ticket Bar & Real-time Lookup */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="border-[#cbd5e1] overflow-hidden shadow-sm bg-white">
              <div className="p-6 bg-white text-slate-900 border-b border-slate-100">
                <div className="space-y-2">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-xs font-bold">
                    <Search className="w-3.5 h-3.5 text-blue-600" />
                    <span>Real-Time Ticket Tracker</span>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-extrabold font-display tracking-tight text-slate-900">
                    Search a Ticket & Application Status
                  </h3>
                  <p className="text-xs text-slate-600 max-w-xl leading-relaxed">
                    Enter your reference tracking code (e.g. <span className="font-mono font-bold text-blue-600">RES-2026-001</span>, <span className="font-mono font-bold text-cyan-600">REQ-2026-001</span>, <span className="font-mono font-bold text-purple-600">BUR-2026-001</span>) or keyword to view official LGU verification details.
                  </p>
                </div>
              </div>

              <CardContent className="p-6 space-y-5 bg-white">
                {/* Search Input Bar */}
                <div className="relative">
                  <Search className="w-5 h-5 text-blue-600 absolute left-4 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={ticketSearchQuery}
                    onChange={(e) => setTicketSearchQuery(e.target.value)}
                    placeholder="Enter Reference Tracking Code or Service Title..."
                    className="w-full pl-12 pr-28 py-3 text-sm bg-slate-50 border-2 border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-600 focus:bg-white text-slate-900 transition-all font-medium"
                  />
                  {ticketSearchQuery && (
                    <button
                      onClick={() => setTicketSearchQuery('')}
                      className="absolute right-24 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-slate-600 px-2 py-1"
                    >
                      Clear
                    </button>
                  )}
                  <Link to="/my-tickets" className="absolute right-2 top-1/2 -translate-y-1/2">
                    <Button size="sm" variant="primary" className="rounded-xl text-xs font-bold">
                      All Tickets →
                    </Button>
                  </Link>
                </div>

                {/* Quick Sample Search Tags */}
                <div className="flex items-center gap-2 flex-wrap text-xs">
                  <span className="text-slate-500 font-semibold">Quick Search Examples:</span>
                  {mySubmissions.slice(0, 3).map((item) => (
                    <button
                      key={item.id}
                      onClick={() => setTicketSearchQuery(item.ref_no)}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-blue-50 hover:text-blue-700 font-mono text-[11px] font-bold text-slate-700 border border-slate-200 transition-all cursor-pointer"
                    >
                      {item.ref_no}
                    </button>
                  ))}
                </div>

                {/* Search Results Display */}
                {ticketSearchQuery.trim() !== '' && (
                  <div className="mt-4 pt-4 border-t border-slate-100 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                        Search Results for "{ticketSearchQuery}"
                      </p>
                      <Badge variant="info" size="sm">{filteredSubmissions.length} Match(es)</Badge>
                    </div>

                    {filteredSubmissions.length === 0 ? (
                      <div className="p-6 text-center bg-slate-50 rounded-2xl border border-slate-200 text-slate-500 text-xs">
                        🚫 No active tickets found matching <strong className="font-mono text-slate-800">{ticketSearchQuery}</strong>. Please verify your tracking reference code or check <Link to="/my-tickets" className="text-blue-600 underline font-bold">My Tickets & Applications</Link>.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {filteredSubmissions.map((item) => (
                          <div key={item.id} className="p-4 bg-slate-50 hover:bg-blue-50/40 rounded-2xl border border-slate-200 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-extrabold text-blue-600 text-sm">{item.ref_no}</span>
                                <Badge variant={item.badgeVariant as any}>{item.status}</Badge>
                              </div>
                              <h4 className="font-bold text-slate-900 text-sm">{item.title}</h4>
                              <p className="text-xs text-slate-600 max-w-md">{item.details}</p>
                              <p className="text-[11px] text-slate-400">Scheduled: {item.date} ({item.time})</p>
                            </div>
                            <Button
                              size="sm"
                              variant="secondary"
                              leftIcon={<Eye className="w-3.5 h-3.5 text-blue-600" />}
                              onClick={() => setSelectedSubmission(item)}
                              className="shrink-0"
                            >
                              View Official Voucher
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Banner Link to Sidebar Tickets */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-blue-100 text-blue-700"><FileText className="w-5 h-5" /></div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">Looking for all your filed tickets?</h4>
                      <p className="text-[11px] text-slate-500">Access your complete application history anytime from the sidebar navigation.</p>
                    </div>
                  </div>
                  <Link to="/my-tickets">
                    <Button size="sm" variant="outline" className="text-xs font-bold w-full sm:w-auto">
                      View My Tickets Ledger →
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Public Advisories (Emergency Hotline Deleted) */}
          <div className="space-y-6">
            <Card className="border-[#cbd5e1]">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <BellRing className="w-4 h-4 text-blue-600" />
                  <div>
                    <CardTitle className="text-sm">Public Advisories</CardTitle>
                    <CardDescription>Community schedule & notifications</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 text-xs">
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200">
                  <div className="flex justify-between items-center text-amber-900 font-bold text-[11px]">
                    <span>Canal Wall Declogging</span>
                    <span className="text-[10px] text-amber-700">Tomorrow</span>
                  </div>
                  <p className="text-amber-800 mt-1 text-[11px] leading-relaxed">
                    Heavy backhoe dredging along Sector 4. Please report any severe drain blockages through the E-Services desk.
                  </p>
                </div>

                <div className="p-3 bg-blue-50 rounded-xl border border-blue-200">
                  <div className="flex justify-between items-center text-blue-900 font-bold text-[11px]">
                    <span>Facility Reservation Window</span>
                    <span className="text-[10px] text-blue-700">Daily 8AM-5PM</span>
                  </div>
                  <p className="text-blue-800 mt-1 text-[11px] leading-relaxed">
                    Online booking for civic centers and sports arenas must be filed at least 48 hours before the event date.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Modal: Citizen Request Details & Confirmation Voucher */}
        <Modal
          isOpen={selectedSubmission !== null}
          onClose={() => setSelectedSubmission(null)}
          title={`Official Voucher — ${selectedSubmission?.ref_no}`}
          description="Detailed copy of your submitted application and real-time municipal confirmation status."
          maxWidth="lg"
        >
          {selectedSubmission && (
            <div className="space-y-4 text-xs">
              {/* Voucher Header with Barcode Simulation */}
              <div className="p-4 bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 border border-slate-700">
                <div>
                  <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest block">REPUBLIC OF THE PHILIPPINES • BARANGAY 178</span>
                  <h4 className="text-base font-extrabold font-display">{selectedSubmission.type}</h4>
                  <p className="text-xs font-mono text-slate-300 mt-0.5">Tracking No: <strong>{selectedSubmission.ref_no}</strong></p>
                </div>
                <div className="flex items-center gap-2 bg-white/10 px-3 py-2 rounded-xl backdrop-blur-sm border border-white/10">
                  <QrCode className="w-8 h-8 text-white shrink-0" />
                  <div className="text-[9px] font-mono leading-tight">
                    <p className="font-bold text-emerald-400">VERIFIED LGU LOG</p>
                    <p className="text-slate-300">{selectedSubmission.date}</p>
                  </div>
                </div>
              </div>

              {/* Status Banner */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                <span className="font-bold text-slate-700">Current Municipal Status:</span>
                <Badge variant={selectedSubmission.badgeVariant as any} size="md">
                  {selectedSubmission.status}
                </Badge>
              </div>

              {/* Submitted Details */}
              <div className="p-3.5 bg-blue-50/60 rounded-xl border border-blue-200 space-y-1.5">
                <p className="font-bold text-blue-950 text-xs uppercase tracking-wider">📋 Submitted Details</p>
                <p><span className="font-bold text-slate-700">Service / Title:</span> {selectedSubmission.title}</p>
                <p><span className="font-bold text-slate-700">Schedule / Location:</span> {selectedSubmission.date} ({selectedSubmission.time})</p>
                <p><span className="font-bold text-slate-700">Specific Details / Purpose:</span> {selectedSubmission.details}</p>
                {selectedSubmission.attendees && (
                  <p><span className="font-bold text-slate-700">Attendees:</span> {selectedSubmission.attendees}</p>
                )}
                {selectedSubmission.affected_households && (
                  <p><span className="font-bold text-slate-700">Affected Scope:</span> {selectedSubmission.affected_households}</p>
                )}
                {selectedSubmission.cause_of_death && (
                  <p><span className="font-bold text-slate-700">Cause of Death:</span> {selectedSubmission.cause_of_death}</p>
                )}
              </div>

              {/* Photo Preview or No Photo Proof Notice */}
              {selectedSubmission.type.includes('Water') || selectedSubmission.type.includes('Drainage') ? (
                selectedSubmission.photo_url ? (
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                    <p className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                      <ImageIcon className="w-3.5 h-3.5 text-blue-600" />
                      <span>Attached Hazard Photo Evidence</span>
                    </p>
                    <div className="rounded-xl overflow-hidden max-h-48 border border-slate-300 bg-slate-900 flex justify-center">
                      <img src={selectedSubmission.photo_url} alt="Attached" className="max-h-48 object-contain" />
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-500 font-semibold text-[11px] flex items-center gap-2">
                    <ImageIcon className="w-4 h-4 text-slate-400 shrink-0" />
                    <span>📷 No photo proof attached (Text description only)</span>
                  </div>
                )
              ) : null}

              {/* Official LGU Response Remarks */}
              <div className="p-3.5 bg-emerald-50/60 rounded-xl border border-emerald-200 space-y-1">
                <p className="font-bold text-emerald-950 text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Official Municipal Confirmation Notes</span>
                </p>
                <p className="text-slate-800 font-medium leading-relaxed">{selectedSubmission.remarks}</p>
                {selectedSubmission.assigned_team && (
                  <p className="text-blue-900 font-bold text-[11px] mt-1">Assigned Field Crew: {selectedSubmission.assigned_team}</p>
                )}
              </div>

              {/* Actions Footer (Cancel & Close) */}
              <div className="pt-2 flex items-center justify-between border-t border-slate-100">
                {selectedSubmission.status !== 'Cancelled' ? (
                  <Button 
                    size="sm" 
                    variant="danger"
                    onClick={async () => {
                      if (!window.confirm(`Are you sure you want to cancel request #${selectedSubmission.ref_no}?`)) return;
                      if (selectedSubmission.category === 'facility') {
                        await cancelReservation(selectedSubmission.raw.id);
                      } else if (selectedSubmission.category === 'utility') {
                        await cancelUtilityRequest(selectedSubmission.raw.id);
                      } else if (selectedSubmission.category === 'cemetery') {
                        await cancelBurial(selectedSubmission.raw.id);
                      }
                      setSelectedSubmission(null);
                      loadData();
                    }}
                  >
                    Cancel This Request
                  </Button>
                ) : (
                  <span className="text-[11px] text-red-600 font-bold">Ticket Cancelled</span>
                )}

                <Button size="sm" variant="primary" onClick={() => setSelectedSubmission(null)}>
                  Close Ticket Voucher
                </Button>
              </div>
            </div>
          )}
        </Modal>
      </div>
    );
  }

  // =========================================================================
  // RENDER ADMIN / STAFF OPERATIONS TELEMETRY DASHBOARD
  // =========================================================================
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-extrabold text-[#0f172a] font-display">
              Municipal Operations Command Telemetry
            </h2>
            <Badge variant="purple" size="sm">Super Admin Console</Badge>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            City-wide monitoring of facilities, parks, cemetery plots, water/drainage requests, and asset maintenance.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={loadData} leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />}>
            Refresh
          </Button>
          <Link to="/">
            <Button size="sm" variant="ghost" className="text-xs font-bold text-slate-600">
              View Public Home →
            </Button>
          </Link>
        </div>
      </div>

      {/* 4 Admin Telemetry Cards */}
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
          {/* Facility Reservations Table */}
          <Card className="border-[#cbd5e1]">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle>Government Facility Reservation & Scheduling</CardTitle>
                <CardDescription>Upcoming citizen & community event bookings</CardDescription>
              </div>
              <Link to="/facilities" className="text-xs font-bold text-blue-600 hover:text-blue-700 whitespace-nowrap">View All →</Link>
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
                      <th className="py-2.5 px-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {allReservations.slice(0, 5).map((r) => (
                      <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
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
                        <td className="py-3 px-3"><Badge variant={r.status === "Approved" ? "success" : "warning"}>{r.status}</Badge></td>
                        <td className="py-3 px-3 text-right">
                          {r.status === "Pending" && (
                            <button
                              onClick={() => handleApproveReservation(r.id)}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-semibold cursor-pointer"
                            >
                              Approve
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Water & Drainage Tickets Table */}
          <Card className="border-[#cbd5e1]">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle>Water & Drainage Incident Triage</CardTitle>
                <CardDescription>Active water & drainage tickets with AI triage</CardDescription>
              </div>
              <Link to="/utilities" className="text-xs font-bold text-cyan-600 hover:text-cyan-700 whitespace-nowrap">Manage Tickets →</Link>
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
                      <th className="py-2.5 px-3 text-right">Dispatch</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {allUtilities.slice(0, 5).map((u) => (
                      <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-3 font-mono font-bold text-cyan-700">{u.ticket_no}</td>
                        <td className="py-3 px-3 font-bold text-slate-800">{u.service_type}</td>
                        <td className="py-3 px-3 text-slate-600 max-w-[180px] truncate">{u.location}</td>
                        <td className="py-3 px-3"><span className="font-bold text-cyan-700 bg-cyan-50 px-2 py-0.5 rounded border border-cyan-200">{u.ai_priority_score} pts</span></td>
                        <td className="py-3 px-3"><Badge variant={u.status === "Resolved" ? "success" : u.status === "Dispatched" ? "info" : "warning"}>{u.status}</Badge></td>
                        <td className="py-3 px-3 text-right">
                          {u.status === "Pending" && (
                            <button
                              onClick={() => handleDispatchCrew(u.id)}
                              className="px-2.5 py-1 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg text-[11px] font-semibold cursor-pointer"
                            >
                              Dispatch Crew
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Operations Audit Trail */}
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
