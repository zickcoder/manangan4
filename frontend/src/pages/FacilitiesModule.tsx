import React, { useState, useEffect } from 'react';
import { 
  Building, 
  Search, 
  Plus, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Sparkles, 
  Calendar, 
  User, 
  Eye 
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { 
  fetchFacilities, 
  fetchReservations, 
  updateReservationStatus, 
  createReservation, 
  checkFacilityAI 
} from '../lib/api';
import { Facility, FacilityReservation } from '../types';

import { StatusAnimationModal } from '../components/ui/StatusAnimationModal';

export function FacilitiesModule() {
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [reservations, setReservations] = useState<FacilityReservation[]>([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRes, setSelectedRes] = useState<FacilityReservation | null>(null);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [reviewRemarks, setReviewRemarks] = useState('');

  // Status Animation Modal
  const [animModal, setAnimModal] = useState<{
    isOpen: boolean;
    type: 'loading' | 'success' | 'paid' | 'rejected';
    title: string;
    message: string;
  }>({
    isOpen: false,
    type: 'success',
    title: '',
    message: ''
  });

  // AI Conflict check state
  const [aiChecking, setAiChecking] = useState(false);
  const [aiResult, setAiResult] = useState<any>(null);

  const [newForm, setNewForm] = useState({
    facility_id: 1,
    applicant_name: '',
    applicant_email: '',
    applicant_phone: '',
    purpose: '',
    event_date: new Date().toISOString().split('T')[0],
    start_time: '08:00 AM',
    end_time: '12:00 PM',
    attendees: '100',
    remarks: '',
  });

  const loadData = async () => {
    try {
      const [facs, resList] = await Promise.all([
        fetchFacilities('Government Facility'),
        fetchReservations(statusFilter, 'Government Facility'),
      ]);
      setFacilities(facs);
      setReservations(resList);
    } catch (e) {
      console.error(e);
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
  }, [statusFilter]);

  const handleUpdateStatus = async (status: string) => {
    if (!selectedRes) return;
    try {
      // Show loading animation modal
      setAnimModal({
        isOpen: true,
        type: 'loading',
        title: 'Processing Request...',
        message: 'Updating facility reservation status.'
      });

      const fee = (selectedRes as any).fee_amount || (selectedRes.hourly_rate ? selectedRes.hourly_rate * 4 : 2000);
      const dueDate = new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0];

      await updateReservationStatus(
        selectedRes.id,
        status,
        reviewRemarks || `Reservation set to ${status} by Facilities Bureau`,
        'Engr. Marcus Cruz',
        { fee_amount: fee, payment_due_date: dueDate }
      );

      setIsReviewModalOpen(false);
      loadData();

      // Show animated checkmark or x-mark
      setTimeout(() => {
        if (status === 'Paid') {
          setAnimModal({
            isOpen: true,
            type: 'paid',
            title: '✓ Payment Approved & Official Receipt Issued!',
            message: `Reservation #${selectedRes.reference_no} is now fully PAID.`
          });
        } else if (status === 'Pending Payment') {
          setAnimModal({
            isOpen: true,
            type: 'success',
            title: '✓ Granted — Waiting for Payment',
            message: `Billing notice issued for #${selectedRes.reference_no}.`
          });
        } else if (status === 'Rejected') {
          setAnimModal({
            isOpen: true,
            type: 'rejected',
            title: '✕ Reservation Rejected',
            message: `Reservation #${selectedRes.reference_no} has been marked as Rejected.`
          });
        } else {
          setAnimModal({
            isOpen: true,
            type: 'success',
            title: `✓ Reservation Updated to ${status}`,
            message: `Status set successfully.`
          });
        }
      }, 500);
    } catch (e) {
      setAnimModal({
        isOpen: true,
        type: 'rejected',
        title: 'Error Occurred',
        message: 'Failed to update reservation status.'
      });
    }
  };

  const handleCheckAI = async () => {
    setAiChecking(true);
    const fac = facilities.find(f => f.id === newForm.facility_id);
    try {
      const res = await checkFacilityAI(
        fac?.name || 'Civic Center',
        newForm.event_date,
        newForm.start_time,
        newForm.end_time,
        newForm.facility_id
      );
      setAiResult(res);
    } catch (e) {
      console.error(e);
    } finally {
      setAiChecking(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setAnimModal({
        isOpen: true,
        type: 'loading',
        title: 'Booking Facility...',
        message: 'Checking schedule availability and creating booking ticket.'
      });

      await createReservation(newForm);
      setIsNewModalOpen(false);
      loadData();

      setTimeout(() => {
        setAnimModal({
          isOpen: true,
          type: 'success',
          title: '✓ Facility Reserved Successfully!',
          message: 'Booking submitted to Pending Review queue.'
        });
      }, 500);
    } catch (e) {
      setAnimModal({
        isOpen: true,
        type: 'rejected',
        title: 'Booking Failed',
        message: 'Could not create reservation. Please try again.'
      });
    }
  };

  const filtered = (reservations || []).filter(r => {
    const matchesQuery = (r.reference_no || '').toLowerCase().includes((searchQuery || '').toLowerCase()) ||
      (r.applicant_name || '').toLowerCase().includes((searchQuery || '').toLowerCase()) ||
      (r.purpose || '').toLowerCase().includes((searchQuery || '').toLowerCase());
    
    if (statusFilter === 'all') return matchesQuery;
    if (statusFilter === 'Pending Review') {
      return matchesQuery && (r.status === 'Pending' || r.status === 'Pending Review');
    }
    return matchesQuery && r.status === statusFilter;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-[#0f172a] font-display flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-600 text-white shadow-sm">
              <Building className="w-5 h-5" />
            </div>
            <span>Government Facility Reservation & Scheduling</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Manage Civic Centers, Multipurpose Gymnasiums, Conference Halls, and evaluate bookings.
          </p>
        </div>
      </div>

      {/* Facilities Cards Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {facilities.map((fac) => (
          <Card key={fac.id} hoverEffect className="border-[#cbd5e1] p-5 space-y-2">
            <div className="flex justify-between items-start">
              <span className="text-[10px] font-bold text-blue-700 uppercase bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                Cap: {fac.capacity}
              </span>
              <span className="text-xs font-bold text-slate-900">₱{fac.hourly_rate} / hr</span>
            </div>
            <h3 className="text-sm font-bold text-slate-900 leading-tight">{fac.name}</h3>
            <p className="text-[11px] text-slate-500">{fac.location}</p>
            <p className="text-[10px] text-slate-400 border-t border-slate-100 pt-2 truncate">{fac.amenities}</p>
          </Card>
        ))}
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white p-3.5 rounded-2xl border border-slate-200 shadow-soft">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search reservations by ref, applicant..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-600 focus:bg-white text-slate-800"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
          {['all', 'Pending Review', 'Approved', 'Pending Payment', 'Paid', 'Rejected'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                statusFilter === status
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
              }`}
            >
              {status === 'all' ? 'All Bookings' : status === 'Pending Payment' ? 'Waiting for Payment' : status}
            </button>
          ))}
        </div>
      </div>

      {/* Reservations Table */}
      <Card className="border-[#cbd5e1]">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Ref Code</th>
                  <th className="py-3 px-4">Facility Name</th>
                  <th className="py-3 px-4">Applicant & Purpose</th>
                  <th className="py-3 px-4">Event Schedule</th>
                  <th className="py-3 px-4">Attendees</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filtered.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-blue-600">{r.reference_no}</td>
                    <td className="py-3.5 px-4 font-bold text-slate-800">{r.facility_name}</td>
                    <td className="py-3.5 px-4 max-w-[200px]">
                      <p className="font-bold text-slate-900 truncate">{r.applicant_name}</p>
                      <p className="text-[10px] text-slate-500 truncate">{r.purpose}</p>
                    </td>
                    <td className="py-3.5 px-4 text-slate-700 whitespace-nowrap">
                      {r.event_date ? new Date(r.event_date).toLocaleDateString() : '—'}
                      <span className="block text-[10px] text-slate-400">{r.start_time} - {r.end_time}</span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-700">{r.attendees} Pax</td>
                    <td className="py-3.5 px-4">
                      <Badge variant={r.status === 'Approved' || r.status === 'Paid' ? 'success' : r.status === 'Pending Payment' ? 'info' : r.status === 'Rejected' ? 'destructive' : 'warning'}>
                        {r.status === 'Pending Payment' ? 'Waiting for Payment' : r.status}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <Button
                        size="sm"
                        variant="secondary"
                        leftIcon={<Eye className="w-3.5 h-3.5" />}
                        onClick={() => {
                          setSelectedRes(r);
                          setReviewRemarks(r.remarks || '');
                          setIsReviewModalOpen(true);
                        }}
                      >
                        Review
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Modal: Review Booking */}
      <Modal
        isOpen={isReviewModalOpen}
        onClose={() => setIsReviewModalOpen(false)}
        title={`Review Reservation — ${selectedRes?.reference_no}`}
        description="Full citizen-submitted booking details. Set due date and process payment status."
        maxWidth="lg"
      >
        {selectedRes && (
          <div className="space-y-4 text-xs">
            {/* Status Banner */}
            <div className="flex items-center justify-between">
              <Badge variant={selectedRes.status === 'Approved' || selectedRes.status === 'Paid' ? 'success' : selectedRes.status === 'Pending Payment' ? 'info' : selectedRes.status === 'Rejected' ? 'destructive' : 'warning'} size="md">
                {selectedRes.status === 'Pending Payment' ? 'Waiting for Payment' : selectedRes.status}
              </Badge>
              <span className="text-[10px] font-mono text-slate-400">{selectedRes.reference_no}</span>
            </div>

            {/* Facility & Schedule */}
            <div className="p-3.5 bg-blue-50 rounded-xl border border-blue-200 space-y-1.5">
              <p className="font-bold text-blue-900 text-xs uppercase tracking-wider">📍 Venue & Schedule</p>
              <p><span className="font-bold text-slate-700">Facility:</span> {selectedRes.facility_name}</p>
              <p><span className="font-bold text-slate-700">Date:</span> {new Date(selectedRes.event_date).toLocaleDateString('en-PH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
              <p><span className="font-bold text-slate-700">Time:</span> {selectedRes.start_time} – {selectedRes.end_time}</p>
              <p><span className="font-bold text-slate-700">Expected Attendees:</span> <strong className="text-blue-800">{selectedRes.attendees} Pax</strong></p>
            </div>

            {/* Applicant Info */}
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
              <p className="font-bold text-slate-900 text-xs uppercase tracking-wider">👤 Citizen / Applicant Information</p>
              <p><span className="font-bold text-slate-700">Name:</span> {selectedRes.applicant_name}</p>
              <p><span className="font-bold text-slate-700">Email:</span> {selectedRes.applicant_email || '—'}</p>
              <p><span className="font-bold text-slate-700">Contact:</span> {selectedRes.applicant_phone || '—'}</p>
            </div>

            {/* Special Equipment Requirements */}
            {selectedRes.special_equipment && (Array.isArray(selectedRes.special_equipment) ? selectedRes.special_equipment.length > 0 : true) && (
              <div className="p-3.5 bg-purple-50 rounded-xl border border-purple-200 space-y-1.5">
                <p className="font-bold text-purple-900 text-xs uppercase tracking-wider">🔧 Special Equipment Requirements</p>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {(Array.isArray(selectedRes.special_equipment)
                    ? selectedRes.special_equipment
                    : String(selectedRes.special_equipment).split(',').map((s: string) => s.trim())
                  ).filter(Boolean).map((eq: string, i: number) => (
                    <span key={i} className="px-2 py-0.5 bg-purple-100 text-purple-800 text-[10px] font-semibold rounded-full border border-purple-200">{eq}</span>
                  ))}
                </div>
              </div>
            )}

            {/* SET PAYMENT DUE DATE & FEE - shown when Approved, before issuing payment notice */}
            {selectedRes.status === 'Approved' && (
              <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-200 space-y-2">
                <p className="font-bold text-amber-900 text-[11px]">🗓️ Set Payment Due Date & Fee:</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input
                    label="Payment Due Date *"
                    type="date"
                    required
                    min={new Date().toISOString().split('T')[0]}
                    defaultValue={new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0]}
                  />
                  <div>
                    <label className="block text-xs font-semibold text-[#334155] mb-1">Facility Standard Hourly / Rental Fee</label>
                    <input
                      type="text"
                      disabled
                      readOnly
                      value={`₱${((selectedRes as any).fee_amount || 2000).toLocaleString()}.00`}
                      className="w-full rounded-xl border border-slate-200 bg-slate-100 p-2 text-xs font-mono font-bold text-slate-700 cursor-not-allowed"
                    />
                  </div>
                </div>
              </div>
            )}

            {selectedRes.status === 'Pending Payment' && (
              <div className="p-3.5 bg-blue-50 rounded-xl border border-blue-200 text-blue-900 space-y-1">
                <p className="font-bold text-xs">⏳ Awaiting Treasury Cash Settlement:</p>
                <p className="text-[11px]">Notice issued to citizen. Assessed Fee: <strong>₱{((selectedRes as any).fee_amount || 2000).toLocaleString()}.00</strong>. When resident settles at LGU Treasury Desk, click "Approve Payment (Cash Received)" below.</p>
              </div>
            )}

            {/* Admin Review Remarks */}
            <div>
              <label className="block text-xs font-bold text-[#334155] mb-1.5">Admin Approval / Rejection Remarks:</label>
              <textarea
                rows={2}
                value={reviewRemarks}
                onChange={(e) => setReviewRemarks(e.target.value)}
                placeholder="Add official remarks, conditions, or reason for rejection..."
                className="w-full rounded-xl border border-slate-300 p-2.5 text-xs focus:outline-none focus:border-blue-600"
              />
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <div className="flex gap-2">
                {/* Pending Review: only Reject + Approve */}
                {(selectedRes.status === 'Pending' || selectedRes.status === 'Pending Review') && (
                  <>
                    <Button size="sm" variant="danger" className="font-bold text-xs" onClick={() => handleUpdateStatus('Rejected')}>
                      ✕ Reject Booking
                    </Button>
                    <Button size="sm" variant="success" className="bg-emerald-600 hover:bg-emerald-700 font-bold text-white text-xs" onClick={() => handleUpdateStatus('Approved')}>
                      ✓ Approve Booking
                    </Button>
                  </>
                )}
                {/* Approved: Return to Pending Review */}
                {selectedRes.status === 'Approved' && (
                  <Button size="sm" variant="outline" className="font-bold text-xs text-amber-700 border-amber-300 hover:bg-amber-50" onClick={() => handleUpdateStatus('Pending Review')}>
                    ↩ Return to Pending Review
                  </Button>
                )}
                {/* Waiting for Payment: Return to Pending Review */}
                {selectedRes.status === 'Pending Payment' && (
                  <Button size="sm" variant="outline" className="font-bold text-xs text-amber-700 border-amber-300 hover:bg-amber-50" onClick={() => handleUpdateStatus('Pending Review')}>
                    ↩ Return to Pending Review
                  </Button>
                )}
                {/* Rejected: Return to Pending Review */}
                {selectedRes.status === 'Rejected' && (
                  <Button size="sm" variant="outline" className="font-bold text-xs text-amber-700 border-amber-300 hover:bg-amber-50" onClick={() => handleUpdateStatus('Pending Review')}>
                    ↩ Return to Pending Review
                  </Button>
                )}
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="font-bold text-xs" onClick={() => setIsReviewModalOpen(false)}>
                  Close
                </Button>
                {/* Approved: Issue Payment Notice */}
                {selectedRes.status === 'Approved' && (
                  <Button size="sm" variant="success" className="bg-blue-600 hover:bg-blue-700 font-bold text-white text-xs" onClick={() => handleUpdateStatus('Pending Payment')}>
                    Grant Reservation & Issue Payment Notice
                  </Button>
                )}
                {/* Waiting for Payment: Confirm Cash Received */}
                {selectedRes.status === 'Pending Payment' && (
                  <Button size="sm" variant="success" className="bg-emerald-600 hover:bg-emerald-700 font-bold text-white text-xs" onClick={() => handleUpdateStatus('Paid')}>
                    ✓ Approve Payment (Cash Received)
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal: Add New Reservation with AI Conflict Check */}
      <Modal
        isOpen={isNewModalOpen}
        onClose={() => setIsNewModalOpen(false)}
        title="Direct Booking: Government Facility"
        description="Schedule civic center or gym booking with AI conflict detection."
      >
        <form onSubmit={handleCreate} className="space-y-3 text-xs">
          <div>
            <label className="block text-xs font-semibold text-[#334155] mb-1">Target Facility *</label>
            <select
              value={newForm.facility_id}
              onChange={(e) => setNewForm({ ...newForm, facility_id: parseInt(e.target.value) })}
              className="w-full rounded-xl border border-slate-300 p-2 text-xs"
            >
              {facilities.map(f => (
                <option key={f.id} value={f.id}>{f.name} (Cap: {f.capacity})</option>
              ))}
            </select>
          </div>

          <Input
            label="Applicant / Organization Name *"
            required
            value={newForm.applicant_name}
            onChange={(e) => setNewForm({ ...newForm, applicant_name: e.target.value })}
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Email Address *"
              type="email"
              required
              value={newForm.applicant_email}
              onChange={(e) => setNewForm({ ...newForm, applicant_email: e.target.value })}
            />
            <Input
              label="Phone Number *"
              required
              value={newForm.applicant_phone}
              onChange={(e) => setNewForm({ ...newForm, applicant_phone: e.target.value })}
            />
          </div>

          <Input
            label="Event Purpose *"
            required
            value={newForm.purpose}
            onChange={(e) => setNewForm({ ...newForm, purpose: e.target.value })}
          />

          <div className="grid grid-cols-3 gap-3">
            <Input
              label="Date *"
              type="date"
              required
              value={newForm.event_date}
              onChange={(e) => setNewForm({ ...newForm, event_date: e.target.value })}
            />
            <Input
              label="Start Time *"
              required
              value={newForm.start_time}
              onChange={(e) => setNewForm({ ...newForm, start_time: e.target.value })}
            />
            <Input
              label="End Time *"
              required
              value={newForm.end_time}
              onChange={(e) => setNewForm({ ...newForm, end_time: e.target.value })}
            />
          </div>

          {/* AI Conflict Detection Widget */}
          <div className="p-3 bg-blue-50 rounded-xl border border-blue-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-blue-800 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                <span>AI Schedule Conflict Checker</span>
              </span>
              <Button type="button" size="sm" variant="outline" isLoading={aiChecking} onClick={handleCheckAI}>
                Check Conflicts
              </Button>
            </div>
            {aiResult && (
              <p className="text-[11px] text-blue-900 bg-white p-2 rounded border border-blue-100">
                {aiResult.aiAnalysis}
              </p>
            )}
          </div>

          <div className="pt-3 flex justify-end gap-2">
            <Button size="sm" variant="outline" type="button" onClick={() => setIsNewModalOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" variant="primary" type="submit">
              Confirm Reservation
            </Button>
          </div>
        </form>
      </Modal>

      {/* Status Animation Toast / Modal */}
      <StatusAnimationModal
        isOpen={animModal.isOpen}
        type={animModal.type}
        title={animModal.title}
        message={animModal.message}
        onClose={() => setAnimModal({ ...animModal, isOpen: false })}
      />
    </div>
  );
}
