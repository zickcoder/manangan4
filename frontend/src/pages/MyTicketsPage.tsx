import { useState, useEffect } from "react";
import { useSearchParams, useNavigate, useLocation } from "react-router-dom";
import { 
  Building, 
  Droplet, 
  Cross, 
  Search, 
  Eye, 
  Filter, 
  FileText, 
  QrCode,
  Calendar,
  Clock,
  ShieldCheck,
  CheckCircle2,
  CreditCard,
  Ban,
  Printer,
  RotateCcw,
  AlertTriangle
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Modal } from "../components/ui/Modal";
import { 
  fetchReservations, 
  fetchUtilities, 
  fetchBurials, 
  updateBurialStatus,
  updateReservationStatus,
  cancelUtilityRequest,
  format12HourDateTime
} from "../lib/api";
import { FacilityReservation, UtilityRequest, BurialRecord } from "../types";

export function MyTicketsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const catParam = searchParams.get('category') as any;
  const ticketRefParam = searchParams.get('ticket') || searchParams.get('ref') || (location.state as any)?.openTicketRef;

  const userStr = sessionStorage.getItem('govserve_citizen_user') || sessionStorage.getItem('govserve_user') || localStorage.getItem('govserve_citizen_user') || localStorage.getItem('govserve_user');
  let user: any = null;
  try {
    if (userStr) user = JSON.parse(userStr);
  } catch {}

  const [allReservations, setAllReservations] = useState<FacilityReservation[]>([]);
  const [allUtilities, setAllUtilities] = useState<UtilityRequest[]>([]);
  const [allBurials, setAllBurials] = useState<BurialRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<'all' | 'facility' | 'utility' | 'cemetery'>(
    catParam === 'facility' || catParam === 'utility' || catParam === 'cemetery' ? catParam : 'all'
  );
  const [selectedSubmission, setSelectedSubmission] = useState<any | null>(null);

  useEffect(() => {
    if (catParam) {
      setFilterCategory(catParam === 'facility' || catParam === 'utility' || catParam === 'cemetery' ? catParam : 'all');
    }
  }, [catParam]);

  // Payment Modal State
  const [selectedPayItem, setSelectedPayItem] = useState<any | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'gcash' | 'maya' | 'card'>('gcash');
  const [paying, setPaying] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [resData, utilData, burData] = await Promise.all([
        fetchReservations("all", "all"),
        fetchUtilities("all", "all"),
        fetchBurials()
      ]);
      setAllReservations(resData);
      setAllUtilities(utilData);
      setAllBurials(burData);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 2500);
    const handleUpdate = () => loadData();
    window.addEventListener('govserve_data_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      clearInterval(interval);
      window.removeEventListener('govserve_data_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  // Cancel & Resubmit Modal State
  const [ticketToCancel, setTicketToCancel] = useState<any | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);

  const handleCancelTicket = (item: any) => {
    setTicketToCancel(item);
  };

  const handleConfirmCancel = async () => {
    if (!ticketToCancel) return;
    setIsCancelling(true);
    try {
      if (ticketToCancel.category === 'cemetery') {
        await updateBurialStatus(ticketToCancel.originalId, 'Cancelled');
      } else if (ticketToCancel.category === 'facility') {
        await updateReservationStatus(ticketToCancel.originalId, 'Cancelled', 'Cancelled by citizen');
      } else if (ticketToCancel.category === 'utility') {
        await cancelUtilityRequest(ticketToCancel.originalId);
      }
      if (selectedSubmission?.id === ticketToCancel.id) {
        setSelectedSubmission(null);
      }
      setTicketToCancel(null);
      await loadData();
      window.dispatchEvent(new Event('govserve_data_updated'));
    } catch (e) {
      alert('Failed to cancel application');
    } finally {
      setIsCancelling(false);
    }
  };

  const handleResubmit = (item: any) => {
    sessionStorage.removeItem('govserve_resubmit_ticket');
    if (item.category === 'facility') {
      const isPark = (item.facility_category || '').toLowerCase().includes('park') || 
                     (item.title || '').toLowerCase().includes('park') ||
                     (item.title || '').toLowerCase().includes('amphitheater') ||
                     (item.title || '').toLowerCase().includes('plaza');
      navigate(isPark ? '/parks' : '/facilities', { state: { resubmitItem: item } });
    } else if (item.category === 'utility') {
      navigate('/utilities', { state: { resubmitItem: item } });
    } else if (item.category === 'cemetery') {
      navigate('/cemetery', { state: { resubmitItem: item } });
    } else {
      navigate('/facilities', { state: { resubmitItem: item } });
    }
  };

  const handleProcessPayment = async () => {
    if (!selectedPayItem) return;
    setPaying(true);
    try {
      if (selectedPayItem.category === 'cemetery') {
        await updateBurialStatus(selectedPayItem.originalId, 'Paid', {
          paid_at: new Date().toISOString(),
          payment_method: paymentMethod
        });
      } else if (selectedPayItem.category === 'facility') {
        await updateReservationStatus(
          selectedPayItem.originalId,
          'Paid',
          `Payment confirmed via ${paymentMethod.toUpperCase()}`,
          'System Billing',
          { paid_at: new Date().toISOString(), payment_method: paymentMethod }
        );
      }
      setSelectedPayItem(null);
      loadData();
      alert(`Payment successful! Receipt & official confirmation generated for ${selectedPayItem.ref_no}.`);
    } catch (e) {
      alert('Payment failed');
    } finally {
      setPaying(false);
    }
  };

  const handlePrintReceipt = (item: any) => {
    const fmtDate = (str?: string) => {
      if (!str) return 'N/A';
      try {
        const d = new Date(str);
        if (isNaN(d.getTime())) return str;
        return d.toLocaleString('en-PH', {
          month: 'long', day: 'numeric', year: 'numeric',
          hour: 'numeric', minute: '2-digit', hour12: true
        });
      } catch { return str; }
    };
    const feeSection = item.fee_amount > 0 ? `
      <div style="border:1px solid #cbd5e1;border-radius:8px;padding:12px;margin-bottom:12px">
        <div style="display:flex;justify-content:space-between;border-bottom:1px solid #e2e8f0;padding-bottom:8px;margin-bottom:8px">
          <span style="font-weight:700;font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:#475569">Assessed Fee Amount</span>
          <span style="font-family:monospace;font-weight:900;font-size:18px;color:#0f172a">&#8369;${(item.fee_amount || 0).toLocaleString()}.00</span>
        </div>
        ${item.status === 'Paid' ? `<p style="color:#166534;font-size:12px">&#10003; <b>Payment Complete:</b> Treasury Cash Payment confirmed on ${fmtDate(item.paid_at || item.date)}.</p>` : ''}
        ${item.status === 'Pending Payment' ? `<p style="color:#92400e;font-size:12px">&#128205; <b>Action Required:</b> Present tracking no. <b>${item.ref_no}</b> at the LGU Treasury Desk for cash settlement.</p>` : ''}
      </div>` : '';
    const win = window.open('', '_blank', 'width=700,height=900,scrollbars=yes');
    if (!win) { alert('Please allow pop-ups to print the receipt.'); return; }
    win.document.write(`<!DOCTYPE html><html><head><title>Official Receipt — ${item.ref_no}</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 24px; font-size: 13px; color: #1e293b; background: #fff; }
        h1 { font-size: 20px; font-weight: 900; margin: 0 0 2px; }
        .label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .06em; color: #94a3b8; }
        .section { border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; margin-bottom: 12px; }
        .row { display: flex; justify-content: space-between; gap: 8px; margin-bottom: 4px; }
        .mono { font-family: monospace; }
        .badge-paid { background:#dcfce7;color:#166534;border-radius:4px;padding:2px 8px;font-size:11px;font-weight:700; }
        .badge-pending { background:#fef3c7;color:#92400e;border-radius:4px;padding:2px 8px;font-size:11px;font-weight:700; }
        .badge-other { background:#f1f5f9;color:#475569;border-radius:4px;padding:2px 8px;font-size:11px;font-weight:700; }
        .header-bar { background: linear-gradient(135deg,#0f172a 0%,#1e3a5f 100%); color: #fff; border-radius: 10px; padding: 16px; margin-bottom: 16px; }
        .watermark { text-align:center;font-size:10px;color:#94a3b8;margin-top:20px;border-top:1px solid #e2e8f0;padding-top:12px; }
        @media print { body { padding: 0; } }
      </style></head><body>
      <div class="header-bar">
        <div class="label" style="color:#93c5fd">REPUBLIC OF THE PHILIPPINES — MUNICIPAL TREASURY &amp; E-SERVICES</div>
        <h1>${item.type}</h1>
        <div class="mono" style="font-size:13px;color:#cbd5e1;margin-top:4px">Tracking No: <b style="color:#fff">${item.ref_no}</b></div>
        <span class="${item.status === 'Paid' || item.status === 'Approved' ? 'badge-paid' : item.status === 'Pending Payment' ? 'badge-pending' : 'badge-other'}" style="display:inline-block;margin-top:8px">${item.status}</span>
      </div>
      ${feeSection}
      <div class="section">
        <div class="label" style="margin-bottom:8px">&#128203; Application Details</div>
        <div class="row"><span><b>Service / Title:</b></span><span>${item.title}</span></div>
        <div class="row"><span><b>Date Filed:</b></span><span>${fmtDate(item.created_at)}</span></div>
        <div class="row"><span><b>Schedule / Date:</b></span><span>${item.date} ${item.time ? '· ' + item.time : ''}</span></div>
        <div class="row"><span><b>Details:</b></span><span>${item.details}</span></div>
        ${item.special_equipment ? `<div class="row"><span><b>Special Equipment:</b></span><span>${Array.isArray(item.special_equipment) ? item.special_equipment.join(', ') : item.special_equipment}</span></div>` : ''}
        <div class="row"><span><b>Applicant:</b></span><span>${item.applicant}</span></div>
        ${item.contact ? `<div class="row"><span><b>Contact:</b></span><span>${item.contact}</span></div>` : ''}
      </div>
      <div class="watermark">This is an official digital receipt issued by the Municipal Government E-Services Portal.<br>Printed on: ${fmtDate(new Date().toISOString())}</div>
    </body></html>`);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); }, 500);
  };

  const userEmail = (user?.email || '').toLowerCase().trim();
  const userId = user?.id;

  const matchesCitizen = (email: string, name: string, cId?: number | string) => {
    // If citizen is not logged in, do not expose any user tickets
    if (!userEmail && !userId) return false;
    // 1. Strict match by User ID if present
    if (userId && cId && String(cId) === String(userId)) return true;
    // 2. Strict match by exact Email (case-insensitive)
    const itemEmail = (email || '').toLowerCase().trim();
    if (userEmail && itemEmail && userEmail.includes('@') && itemEmail === userEmail) return true;
    return false;
  };

  const myReservations = allReservations.filter((r) =>
    matchesCitizen(r.applicant_email || '', r.applicant_name || '', (r as any).citizen_id)
  );

  const myUtilities = allUtilities.filter((u) =>
    matchesCitizen((u as any).citizen_email || '', u.citizen_name || '', (u as any).citizen_id)
  );

  const myBurials = allBurials.filter((b) =>
    matchesCitizen((b as any).applicant_email || (b as any).citizen_email || '', b.contact_person || '', (b as any).citizen_id)
  );

  const formatDateSafely = (dateStr: any) => {
    if (!dateStr) return 'N/A';
    try {
      const d = new Date(dateStr);
      return isNaN(d.getTime()) ? String(dateStr) : d.toLocaleDateString();
    } catch {
      return String(dateStr);
    }
  };

  const allSubmissions = [
    ...myReservations.map((r) => {
      const isPark = (r.facility_category || '').toLowerCase().includes('park') || 
                     (r.facility_name || '').toLowerCase().includes('park') ||
                     (r.facility_name || '').toLowerCase().includes('amphitheater') ||
                     (r.facility_name || '').toLowerCase().includes('plaza');
      return {
        id: `res-${r.id}`,
        originalId: r.id,
        ref_no: r.reference_no || `RES-${r.id}`,
        category: 'facility',
        facility_category: isPark ? 'Park & Recreation' : 'Government Facility',
        type: isPark ? 'Park & Recreation Grounds Scheduling' : 'Government Facility Reservation',
        title: r.facility_name || (isPark ? 'Municipal Park / Ground' : 'Government Facility'),
        date: formatDateSafely(r.event_date),
        time: `${r.start_time || ''} - ${r.end_time || ''}`,
        status: r.status || 'Pending',
        fee_amount: (r as any).fee_amount || (r.hourly_rate ? r.hourly_rate * 4 : 2000),
        payment_method: (r as any).payment_method,
        paid_at: (r as any).paid_at,
        payment_due_date: (r as any).payment_due_date,
        badgeVariant: r.status === 'Approved' || r.status === 'Paid' ? 'success' : r.status === 'Pending Payment' ? 'info' : r.status === 'Rejected' ? 'destructive' : r.status === 'Cancelled' ? 'default' : 'warning',
        details: r.purpose || 'Event Booking',
        special_equipment: (r as any).special_equipment,
        applicant: r.applicant_name || '',
        contact: r.applicant_phone || '',
        created_at: format12HourDateTime(r.created_at || new Date().toISOString())
      };
    }),
    ...myUtilities.map((u) => ({
      id: `util-${u.id}`,
      originalId: u.id,
      ref_no: u.ticket_no || `UTL-${u.id}`,
      category: 'utility',
      type: 'Water & Drainage Request',
      title: `${u.service_type || 'Utility Report'} (${u.urgency || 'Urgent'})`,
      date: formatDateSafely(u.created_at),
      time: u.created_at ? new Date(u.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Daytime',
      status: u.status || 'Pending',
      badgeVariant: u.status === 'Resolved' ? 'success' : u.status === 'In Progress' ? 'info' : u.status === 'Cancelled' ? 'default' : 'warning',
      details: u.description || u.location || 'See details',
      applicant: u.citizen_name || '',
      contact: u.citizen_phone || '',
      location: u.location || '',
      created_at: format12HourDateTime(u.created_at || new Date().toISOString())
    })),
    ...myBurials.map((b) => ({
      id: `bur-${b.id}`,
      originalId: b.id,
      ref_no: b.reference_no || b.permit_no || `BUR-${b.id}`,
      category: 'cemetery',
      type: 'Burial Permit & Niche',
      title: `Deceased: ${b.deceased_name || 'Individual'}`,
      date: formatDateSafely(b.burial_date),
      time: b.burial_time || '10:00 AM',
      status: b.status === 'Pending Payment' ? 'Waiting for Payment' : b.status || 'Pending Review',
      rawStatus: b.status,
      fee_amount: b.fee_amount || (b.status === 'Pending Payment' || b.status === 'Paid' ? 18000 : 0),
      payment_method: (b as any).payment_method,
      paid_at: (b as any).paid_at,
      payment_due_date: (b as any).payment_due_date,
      badgeVariant: b.status === 'Paid' ? 'success' : b.status === 'Pending Payment' ? 'info' : b.status === 'Rejected' ? 'destructive' : b.status === 'Cancelled' ? 'default' : 'warning',
      details: `Plot Code: ${b.plot_code || 'Assigned Niche'}`,
      applicant: b.contact_person || '',
      contact: b.contact_phone || '',
      created_at: format12HourDateTime(b.created_at || new Date().toISOString())
    }))
  ];

  // Auto-open ticket modal if redirected from "Your Booking Recognized" or url parameter
  useEffect(() => {
    if (ticketRefParam && allSubmissions.length > 0 && !selectedSubmission) {
      const match = allSubmissions.find(s => s.ref_no?.toLowerCase() === ticketRefParam.toLowerCase());
      if (match) {
        setSelectedSubmission(match);
        setSearchQuery(match.ref_no);
      }
    }
  }, [ticketRefParam, allSubmissions.length]);

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(7);

  const getStatusRank = (status: string) => {
    const s = (status || '').toLowerCase();
    if (s.includes('pending review') || s === 'pending') return 1;
    if (s.includes('pending payment') || s.includes('waiting for payment')) return 2;
    if (s.includes('paid') || s.includes('approved') || s.includes('dispatched') || s.includes('resolved') || s.includes('completed')) return 3;
    if (s.includes('reject') || s.includes('cancel')) return 4;
    return 5;
  };

  const filteredSubmissions = allSubmissions
    .filter((item) => {
      if (filterCategory !== 'all' && item.category !== filterCategory) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      return (
        (item.ref_no || '').toLowerCase().includes(q) ||
        (item.title || '').toLowerCase().includes(q) ||
        (item.details || '').toLowerCase().includes(q) ||
        (item.status || '').toLowerCase().includes(q) ||
        (item.type || '').toLowerCase().includes(q) ||
        (item.applicant || '').toLowerCase().includes(q)
      );
    })
    .sort((a, b) => getStatusRank(a.status) - getStatusRank(b.status));

  const totalPages = Math.ceil(filteredSubmissions.length / (pageSize === 9999 ? filteredSubmissions.length || 1 : pageSize)) || 1;
  const paginatedSubmissions = pageSize === 9999 
    ? filteredSubmissions 
    : filteredSubmissions.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Top Banner Header */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white text-slate-900 border border-slate-200 shadow-sm relative overflow-hidden">
        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-xs font-bold">
            <FileText className="w-3.5 h-3.5 text-blue-600" />
            <span>Citizen Application Ledger</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold font-display tracking-tight text-slate-900">
            My Submitted Applications & Tickets
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 max-w-2xl leading-relaxed">
            Comprehensive list of all your filed facility bookings, water/drainage incident tickets, and cemetery burial permits. Click any card below to filter your requests.
          </p>
        </div>
      </div>

      {/* 3 Interactive Stat Cards (Moved from Citizen Dashboard) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div 
          onClick={() => {
            setFilterCategory(prev => prev === 'facility' ? 'all' : 'facility');
            setCurrentPage(1);
          }} 
          className="cursor-pointer group"
        >
          <Card className={`border-l-4 border-l-blue-600 p-5 shadow-soft transition-all hover:shadow-md hover:border-blue-300 ${
            filterCategory === 'facility' ? 'ring-2 ring-blue-500 bg-blue-50/20 shadow-md' : ''
          }`}>
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
              {filterCategory === 'facility' ? '✓ Showing facility bookings (click to reset)' : 'Click to filter my facility requests →'}
            </p>
          </Card>
        </div>

        <div 
          onClick={() => {
            setFilterCategory(prev => prev === 'utility' ? 'all' : 'utility');
            setCurrentPage(1);
          }} 
          className="cursor-pointer group"
        >
          <Card className={`border-l-4 border-l-cyan-600 p-5 shadow-soft transition-all hover:shadow-md hover:border-cyan-300 ${
            filterCategory === 'utility' ? 'ring-2 ring-cyan-500 bg-cyan-50/20 shadow-md' : ''
          }`}>
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
              {filterCategory === 'utility' ? '✓ Showing drainage tickets (click to reset)' : 'Click to filter my drainage tickets →'}
            </p>
          </Card>
        </div>

        <div 
          onClick={() => {
            setFilterCategory(prev => prev === 'cemetery' ? 'all' : 'cemetery');
            setCurrentPage(1);
          }} 
          className="cursor-pointer group"
        >
          <Card className={`border-l-4 border-l-purple-600 p-5 shadow-soft transition-all hover:shadow-md hover:border-purple-300 ${
            filterCategory === 'cemetery' ? 'ring-2 ring-purple-500 bg-purple-50/20 shadow-md' : ''
          }`}>
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
              {filterCategory === 'cemetery' ? '✓ Showing burial permits (click to reset)' : 'Click to filter my burial permits →'}
            </p>
          </Card>
        </div>
      </div>

      {/* Main Card with Filter Pills & Search Input */}
      <Card className="border-[#cbd5e1]">
        <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div>
            <CardTitle className="text-lg">Application History ({filteredSubmissions.length})</CardTitle>
            <CardDescription>Click any row to open the official verified LGU confirmation voucher</CardDescription>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3">
            {/* Search Input */}
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search ticket code or title..."
                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 focus:bg-white text-slate-900"
              />
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 w-full sm:w-auto">
              {[
                { id: 'all', label: 'All' },
                { id: 'facility', label: 'Facility' },
                { id: 'utility', label: 'Drainage' },
                { id: 'cemetery', label: 'Burial' },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => {
                    setFilterCategory(f.id as any);
                    setCurrentPage(1);
                  }}
                  className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    filterCategory === f.id
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Tracking Code</th>
                  <th className="py-3 px-4">Service Type</th>
                  <th className="py-3 px-4">Title / Purpose</th>
                  <th className="py-3 px-4">Schedule / Location</th>
                  <th className="py-3 px-4">LGU Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {paginatedSubmissions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400 text-xs">
                      No applications or tickets found matching your query.
                    </td>
                  </tr>
                ) : (
                  paginatedSubmissions.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4">
                        <span className="font-mono font-bold text-blue-600 block">{item.ref_no}</span>
                        <span className="text-[10px] text-slate-400">{item.created_at}</span>
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-700">
                        {item.type}
                      </td>
                      <td className="py-3.5 px-4">
                        <p className="font-bold text-slate-900">{item.title}</p>
                        <p className="text-[10px] text-slate-500 truncate max-w-[200px]">{item.details}</p>
                      </td>
                      <td className="py-3.5 px-4 text-slate-700 whitespace-nowrap">
                        {item.date}
                        <span className="block text-[10px] text-slate-400">{item.time}</span>
                      </td>
                      <td className="py-3.5 px-4">
                        <Badge variant={item.badgeVariant as any}>{item.status}</Badge>
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {(item.status as string) === 'Cancelled' || (item.status as string) === 'Canceled' ? (
                            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-600 italic px-3 py-1.5 bg-rose-50 rounded-xl border border-rose-200">
                              <Ban className="w-3.5 h-3.5 text-rose-500" />
                              Application Cancelled
                            </span>
                          ) : (
                            <>
                              <Button
                                size="sm"
                                variant="secondary"
                                className="text-xs font-bold bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200"
                                leftIcon={<Eye className="w-3.5 h-3.5 text-blue-600" />}
                                onClick={() => setSelectedSubmission(item)}
                              >
                                View Ticket
                              </Button>
                              {(item.status === 'Pending Review' || item.status === 'Pending Payment' || item.status === 'Pending' || item.status === 'Waiting for Payment') && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-xs text-rose-600 hover:bg-rose-50 border-rose-200 font-medium"
                                  onClick={() => handleCancelTicket(item)}
                                >
                                  Cancel
                                </Button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination & Dropdown Menu Footer */}
          <div className="p-4 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-slate-500 font-medium">Rows per page:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="bg-white border border-slate-300 text-slate-700 text-xs font-bold rounded-lg px-2.5 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 cursor-pointer"
              >
                <option value={7}>7 rows</option>
                <option value={15}>15 rows</option>
                <option value={30}>30 rows</option>
                <option value={9999}>View All</option>
              </select>
            </div>

            {pageSize !== 9999 && totalPages > 1 && (
              <div className="flex items-center gap-2">
                <span className="text-slate-500 font-medium">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="text-xs font-bold"
                >
                  ← Prev
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="text-xs font-bold"
                >
                  Next →
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Modal: View Full Application / Printable Receipt */}
      <Modal
        isOpen={Boolean(selectedSubmission)}
        onClose={() => setSelectedSubmission(null)}
        title={`Official Order of Payment & Ticket Voucher — ${selectedSubmission?.ref_no}`}
        description="Official Municipal Ticket Copy. Present this at the LGU Treasury Desk for Face-to-Face Payment."
        maxWidth="lg"
        hideHeaderOnPrint={true}
      >
        {selectedSubmission && (
          <div className="space-y-4 text-xs print:p-4 print:border-2 print:border-slate-800 print:rounded-xl">
            {/* Header Voucher Banner */}
            <div className="p-4 bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 border border-slate-700">
              <div>
                <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest block">REPUBLIC OF THE PHILIPPINES — MUNICIPAL TREASURY & E-SERVICES</span>
                <h4 className="text-base font-extrabold font-display">{selectedSubmission.type}</h4>
                <p className="text-xs font-mono text-slate-300 mt-0.5">Tracking No: <strong>{selectedSubmission.ref_no}</strong></p>
              </div>
              <div className="flex items-center gap-2 bg-white/10 px-3.5 py-2.5 rounded-xl backdrop-blur-sm border border-white/10 shrink-0">
                <p className="font-bold text-emerald-400 text-[10px] font-mono tracking-wider">VERIFIED LGU TICKET</p>
              </div>
            </div>

            {/* Real-time Status Notice */}
            <div className={`p-3.5 rounded-xl border flex items-center justify-between ${
              selectedSubmission.status === 'Paid' || selectedSubmission.status === 'Approved' || selectedSubmission.status === 'Completed'
                ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                : selectedSubmission.status === 'Pending Payment'
                ? 'bg-amber-50 border-amber-300 text-amber-950'
                : (selectedSubmission.status as string) === 'Cancelled' || (selectedSubmission.status as string) === 'Canceled' || selectedSubmission.status === 'Rejected'
                ? 'bg-rose-50 border-rose-300 text-rose-950'
                : 'bg-blue-50 border-blue-300 text-blue-950'
            }`}>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider block">LGU Ticket & Fee Status</span>
                <h4 className="font-bold text-sm">
                  {selectedSubmission.status === 'Pending Payment'
                    ? 'Approved — Waiting for Face-to-Face LGU Treasury Payment'
                    : selectedSubmission.status === 'Paid'
                    ? 'PAID & APPROVED — Official Receipt Issued'
                    : (selectedSubmission.status as string) === 'Cancelled' || (selectedSubmission.status as string) === 'Canceled'
                    ? 'CANCELLED — Slot released. Click Resubmit below to reactivate or modify.'
                    : selectedSubmission.status}
                </h4>
              </div>
              <Badge variant={selectedSubmission.badgeVariant as any} size="md">
                {selectedSubmission.status}
              </Badge>
            </div>

            {/* Face to Face Treasury Instruction for Unpaid Tickets */}
            {(selectedSubmission.status === 'Pending Payment' || selectedSubmission.status === 'Approved' || selectedSubmission.fee_amount > 0) && (
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <span className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">Assessed Fee Amount</span>
                  <span className="font-mono font-extrabold text-base text-slate-900">₱{(selectedSubmission.fee_amount || 0).toLocaleString()}.00</span>
                </div>
                {selectedSubmission.status === 'Pending Payment' && (
                  <p className="text-amber-800 font-medium text-[11px] pt-1">
                    📍 <strong>Face-to-Face Payment Instruction:</strong> Please present this printable ticket or tracking number <strong>({selectedSubmission.ref_no})</strong> at the LGU Treasury Desk for cash settlement before payment due date {selectedSubmission.payment_due_date ? `(${selectedSubmission.payment_due_date})` : ''}.
                  </p>
                )}
                {selectedSubmission.status === 'Paid' && (
                  <p className="text-emerald-800 font-medium text-[11px] pt-1">
                    ✓ <strong>Payment Complete:</strong> Treasury Cash Payment confirmed on {format12HourDateTime(selectedSubmission.paid_at) || selectedSubmission.date}.
                  </p>
                )}
              </div>
            )}

            {/* Submitted Application Data */}
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
              <p className="font-bold text-slate-950 text-xs uppercase tracking-wider">📋 Application Details</p>
              <p className="text-slate-800"><strong>Title / Service:</strong> {selectedSubmission.title}</p>
              <p className="text-slate-800"><strong>Date & Time Logged:</strong> <span className="font-mono font-bold text-blue-700">{selectedSubmission.created_at}</span></p>
              <p className="text-slate-800"><strong>Details:</strong> {selectedSubmission.details}</p>
              <p className="text-slate-800"><strong>Schedule / Date:</strong> {selectedSubmission.date} ({selectedSubmission.time})</p>
              {selectedSubmission.special_equipment && (
                <div className="pt-1 pb-1">
                  <strong className="text-slate-800 block mb-1">Special Equipment Requirements:</strong>
                  <div className="flex flex-wrap gap-1">
                    {(Array.isArray(selectedSubmission.special_equipment)
                      ? selectedSubmission.special_equipment
                      : String(selectedSubmission.special_equipment).split(',').map((s: string) => s.trim())
                    ).map((eq: string, idx: number) => (
                      <span key={idx} className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                        ✓ {eq}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              <p className="text-slate-800"><strong>Applicant:</strong> {selectedSubmission.applicant} ({selectedSubmission.contact || 'N/A'})</p>
            </div>

            {/* Modal Bottom Actions (Printable Receipt Button - Hidden on Print) */}
            <div className="pt-3 flex flex-col sm:flex-row items-center justify-between gap-2 border-t border-slate-100 print:hidden">
              <Button size="sm" variant="outline" className="w-full sm:w-auto font-bold print:hidden" onClick={() => setSelectedSubmission(null)}>
                Close
              </Button>
              <div className="flex flex-wrap sm:flex-nowrap gap-2 w-full sm:w-auto justify-end print:hidden">
                <Button
                  size="sm"
                  variant="primary"
                  className="bg-blue-600 hover:bg-blue-700 font-bold text-xs print:hidden"
                  leftIcon={<Printer className="w-3.5 h-3.5" />}
                  onClick={() => handlePrintReceipt(selectedSubmission)}
                >
                  Print Order of Payment / Receipt
                </Button>
                {/* No Resubmit button for cancelled tickets in detail modal */}
                {(selectedSubmission.status === 'Pending Review' || selectedSubmission.status === 'Pending Payment' || selectedSubmission.status === 'Pending' || selectedSubmission.status === 'Waiting for Payment') && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-rose-600 border-rose-200 hover:bg-rose-50 font-bold text-xs print:hidden"
                    leftIcon={<Ban className="w-3.5 h-3.5" />}
                    onClick={() => {
                      const item = selectedSubmission;
                      setSelectedSubmission(null);
                      handleCancelTicket(item);
                    }}
                  >
                    Cancel Application
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Popup Modal: Cancel Confirm Or Resubmit Ticket? */}
      <Modal
        isOpen={Boolean(ticketToCancel)}
        onClose={() => !isCancelling && setTicketToCancel(null)}
        title="Cancel Confirm Or Resubmit Ticket?"
        description={`Application #${ticketToCancel?.ref_no || ''} — Choose an action below`}
        maxWidth="md"
      >
        {ticketToCancel && (
          <div className="space-y-4 text-xs">
            {/* Attention Notice */}
            <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3">
              <div className="p-2 bg-amber-100 rounded-xl text-amber-700 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-amber-950 text-sm">
                  Cancel or Resubmit with Corrections?
                </h4>
                <p className="text-amber-800 text-xs leading-relaxed">
                  You requested to cancel application <strong className="font-mono text-amber-950">{ticketToCancel.ref_no}</strong>. If you only need to adjust your schedule date, time, attendees, or details, you can choose to <strong>Resubmit Ticket</strong> instead of cancelling.
                </p>
              </div>
            </div>

            {/* Ticket Summary Card */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Application Summary</span>
                <Badge variant={ticketToCancel.badgeVariant as any}>{ticketToCancel.status}</Badge>
              </div>
              <div>
                <h5 className="font-bold text-slate-900 text-sm">{ticketToCancel.title}</h5>
                <p className="text-slate-500 text-[11px] font-mono">Reference No: {ticketToCancel.ref_no}</p>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-2 text-[11px] text-slate-700 border-t border-slate-200/70">
                <div>
                  <span className="text-slate-400 block text-[10px]">Schedule / Date:</span>
                  <span className="font-semibold">{ticketToCancel.date || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Time / Details:</span>
                  <span className="font-semibold">{ticketToCancel.time || ticketToCancel.details || 'N/A'}</span>
                </div>
              </div>
            </div>

            {/* Action Cards */}
            <div className="space-y-2.5 pt-1">
              {/* Option 1: Resubmit Ticket */}
              <div 
                onClick={() => {
                  const item = ticketToCancel;
                  setTicketToCancel(null);
                  handleResubmit(item);
                }}
                className="p-3.5 bg-purple-50/80 hover:bg-purple-100/80 border border-purple-200 rounded-2xl cursor-pointer transition-all flex items-center justify-between group shadow-sm hover:shadow"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                    <RotateCcw className="w-5 h-5" />
                  </div>
                  <div>
                    <h5 className="font-bold text-purple-950 text-sm">Resubmit Ticket (Modify Details)</h5>
                    <p className="text-purple-700 text-[11px]">Edit date, time, equipment, or details with existing info retained</p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="primary"
                  className="shrink-0 bg-purple-600 hover:bg-purple-700 text-white font-bold pointer-events-none"
                >
                  Resubmit
                </Button>
              </div>

              {/* Option 2: Confirm Cancellation */}
              <div 
                onClick={handleConfirmCancel}
                className="p-3.5 bg-rose-50/80 hover:bg-rose-100/80 border border-rose-200 rounded-2xl cursor-pointer transition-all flex items-center justify-between group shadow-sm hover:shadow"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                    <Ban className="w-5 h-5" />
                  </div>
                  <div>
                    <h5 className="font-bold text-rose-950 text-sm">Confirm Cancellation</h5>
                    <p className="text-rose-700 text-[11px]">Officially cancel application and release reserved schedule slot</p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="shrink-0 bg-white text-rose-600 border-rose-300 hover:bg-rose-50 font-bold pointer-events-none"
                  disabled={isCancelling}
                >
                  {isCancelling ? 'Cancelling...' : 'Confirm Cancel'}
                </Button>
              </div>
            </div>

            {/* Dismiss Footer */}
            <div className="pt-3 flex items-center justify-between border-t border-slate-100">
              <span className="text-[11px] text-slate-400 italic">No changes will be made if dismissed.</span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setTicketToCancel(null)}
                disabled={isCancelling}
                className="font-bold text-slate-700"
              >
                Keep Application (Dismiss)
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
