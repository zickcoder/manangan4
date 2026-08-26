import React, { useState, useEffect } from "react";
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
  CheckCircle2
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Modal } from "../components/ui/Modal";
import { fetchReservations, fetchUtilities, fetchBurials } from "../lib/api";
import { FacilityReservation, UtilityRequest, BurialRecord } from "../types";

export function MyTicketsPage() {
  const userStr = sessionStorage.getItem('govserve_user') || localStorage.getItem('govserve_user');
  let user: any = { name: 'Juan M. Dela Cruz', role: 'Citizen', email: 'juan.delacruz@citizen.gov.ph' };
  try {
    if (userStr) user = JSON.parse(userStr);
  } catch {}

  const [allReservations, setAllReservations] = useState<FacilityReservation[]>([]);
  const [allUtilities, setAllUtilities] = useState<UtilityRequest[]>([]);
  const [allBurials, setAllBurials] = useState<BurialRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<'all' | 'facility' | 'utility' | 'cemetery'>('all');
  const [selectedSubmission, setSelectedSubmission] = useState<any | null>(null);

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
  }, []);

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

  const allSubmissions = [
    ...myReservations.map((r) => ({
      id: `res-${r.id}`,
      originalId: r.id,
      ref_no: r.reference_no,
      category: 'facility',
      type: 'Facility Reservation',
      title: r.facility_name,
      date: r.event_date,
      time: `${r.start_time} - ${r.end_time}`,
      status: r.status,
      badgeVariant: r.status === 'Approved' ? 'success' : r.status === 'Rejected' ? 'danger' : 'warning',
      details: r.purpose_event_name || 'Event Booking',
      applicant: r.applicant_name,
      contact: r.contact_number,
      created_at: r.created_at || 'Recently'
    })),
    ...myUtilities.map((u) => ({
      id: `util-${u.id}`,
      originalId: u.id,
      ref_no: u.ticket_no || u.ticket_no || '',
      category: 'utility',
      type: 'Water & Drainage Request',
      title: `${u.service_type || 'Utility'} (${(u as any).urgency_level || u.urgency || 'Urgent'})`,
      date: new Date(u.created_at || Date.now()).toLocaleDateString(),
      time: new Date(u.created_at || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: u.status || 'Pending',
      badgeVariant: u.status === 'Resolved' ? 'success' : u.status === 'Dispatched' ? 'info' : 'warning',
      details: (u as any).incident_description || u.description || u.location || 'See details',
      applicant: u.citizen_name || '',
      contact: (u as any).contact_number || u.citizen_phone || '',
      location: (u as any).specific_location || u.location || '',
      created_at: u.created_at || 'Recently'
    })),
    ...myBurials.map((b) => ({
      id: `bur-${b.id}`,
      originalId: b.id,
      ref_no: b.reference_no || b.permit_no || '',
      category: 'cemetery',
      type: 'Burial Permit & Niche',
      title: `Deceased: ${(b as any).deceased_full_name || b.deceased_name || 'Individual'}`,
      date: b.burial_date || '',
      time: b.burial_time || '',
      status: b.status || 'Pending',
      badgeVariant: b.status === 'Approved' ? 'success' : 'purple',
      details: `Plot Code: ${b.plot_code || 'Assigned Niche'}`,
      applicant: b.contact_person || '',
      contact: (b as any).contact_number || b.contact_phone || '',
      created_at: b.created_at || 'Recently'
    }))
  ];

  const filteredSubmissions = allSubmissions.filter((item) => {
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
  });

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
            Comprehensive list of all your filed facility bookings, water/drainage incident tickets, and cemetery burial permits.
          </p>
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
                onChange={(e) => setSearchQuery(e.target.value)}
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
                  onClick={() => setFilterCategory(f.id as any)}
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
                {filteredSubmissions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400 text-xs">
                      No applications or tickets found matching your query.
                    </td>
                  </tr>
                ) : (
                  filteredSubmissions.map((item) => (
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
                      <td className="py-3.5 px-4 text-right">
                        <Button
                          size="sm"
                          variant="secondary"
                          leftIcon={<Eye className="w-3.5 h-3.5 text-blue-600" />}
                          onClick={() => setSelectedSubmission(item)}
                        >
                          View Voucher
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Modal: Official Voucher */}
      <Modal
        isOpen={selectedSubmission !== null}
        onClose={() => setSelectedSubmission(null)}
        title={`Official Voucher — ${selectedSubmission?.ref_no}`}
        description="Detailed copy of your submitted application and real-time municipal status."
        maxWidth="lg"
      >
        {selectedSubmission && (
          <div className="space-y-4 text-xs">
            <div className="p-4 bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 border border-slate-700">
              <div>
                <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest block">REPUBLIC OF THE PHILIPPINES</span>
                <h4 className="text-base font-extrabold font-display">{selectedSubmission.type}</h4>
                <p className="text-xs font-mono text-slate-300 mt-0.5">Tracking No: <strong>{selectedSubmission.ref_no}</strong></p>
              </div>
              <div className="flex items-center gap-2 bg-white/10 px-3 py-2 rounded-xl backdrop-blur-sm border border-white/10">
                <QrCode className="w-8 h-8 text-white shrink-0" />
                <div className="text-[9px] font-mono leading-tight">
                  <p className="font-bold text-emerald-400">VERIFIED LOG</p>
                  <p className="text-slate-300">{selectedSubmission.date}</p>
                </div>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
              <span className="font-bold text-slate-700">Current LGU Status:</span>
              <Badge variant={selectedSubmission.badgeVariant as any} size="md">
                {selectedSubmission.status}
              </Badge>
            </div>

            <div className="p-3.5 bg-blue-50/60 rounded-xl border border-blue-200 space-y-1.5">
              <p className="font-bold text-blue-950 text-xs uppercase tracking-wider">📋 Submitted Details</p>
              <p className="text-slate-800"><strong>Title / Service:</strong> {selectedSubmission.title}</p>
              <p className="text-slate-800"><strong>Details:</strong> {selectedSubmission.details}</p>
              <p className="text-slate-800"><strong>Schedule / Date:</strong> {selectedSubmission.date} ({selectedSubmission.time})</p>
              <p className="text-slate-800"><strong>Applicant:</strong> {selectedSubmission.applicant} ({selectedSubmission.contact || 'N/A'})</p>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
