import React, { useState, useEffect } from 'react';
import { 
  Trees, 
  Search, 
  Plus, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Sparkles, 
  Calendar, 
  User, 
  Eye,
  Sun
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
  createReservation 
} from '../lib/api';
import { Facility, FacilityReservation } from '../types';

import { StatusAnimationModal } from '../components/ui/StatusAnimationModal';

export function ParksModule() {
  const [parks, setParks] = useState<Facility[]>([]);
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

  const [newForm, setNewForm] = useState({
    facility_id: 4,
    applicant_name: '',
    applicant_email: '',
    applicant_phone: '',
    purpose: '',
    event_date: new Date().toISOString().split('T')[0],
    start_time: '08:00 AM',
    end_time: '12:00 PM',
    attendees: '80',
    remarks: '',
  });

  const loadData = async () => {
    try {
      const [parkList, resList] = await Promise.all([
        fetchFacilities('Park & Recreation'),
        fetchReservations(statusFilter, 'Park & Recreation'),
      ]);
      setParks(parkList);
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
      setAnimModal({
        isOpen: true,
        type: 'loading',
        title: 'Processing Request...',
        message: 'Updating park scheduling status.'
      });

      const fee = (selectedRes as any).fee_amount || (selectedRes.hourly_rate ? selectedRes.hourly_rate * 4 : 1500);
      const dueDate = new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0];

      await updateReservationStatus(
        selectedRes.id,
        status,
        reviewRemarks || `Park schedule ${status}`,
        'Engr. Marcus Cruz',
        { fee_amount: fee, payment_due_date: dueDate }
      );

      setIsReviewModalOpen(false);
      loadData();

      setTimeout(() => {
        if (status === 'Paid') {
          setAnimModal({
            isOpen: true,
            type: 'paid',
            title: '✓ Payment Approved & Official Receipt Issued!',
            message: `Park schedule #${selectedRes.reference_no} is now fully PAID.`
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
            title: '✕ Schedule Rejected',
            message: `Park booking #${selectedRes.reference_no} has been marked as Rejected.`
          });
        } else {
          setAnimModal({
            isOpen: true,
            type: 'success',
            title: `✓ Status Updated to ${status}`,
            message: `Park booking updated successfully.`
          });
        }
      }, 500);
    } catch (e) {
      setAnimModal({
        isOpen: true,
        type: 'rejected',
        title: 'Error Occurred',
        message: 'Failed to update park schedule status.'
      });
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setAnimModal({
        isOpen: true,
        type: 'loading',
        title: 'Scheduling Park Event...',
        message: 'Reserving park ground and generating ticket.'
      });

      await createReservation(newForm);
      setIsNewModalOpen(false);
      loadData();

      setTimeout(() => {
        setAnimModal({
          isOpen: true,
          type: 'success',
          title: '✓ Park Schedule Submitted!',
          message: 'Booking submitted to Pending Review queue.'
        });
      }, 500);
    } catch (e) {
      setAnimModal({
        isOpen: true,
        type: 'rejected',
        title: 'Booking Failed',
        message: 'Failed to schedule park event.'
      });
    }
  };

  const filtered = reservations.filter(r => {
    const matchesQuery = r.reference_no.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.applicant_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.purpose.toLowerCase().includes(searchQuery.toLowerCase());
    
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
            <div className="p-2 rounded-xl bg-emerald-600 text-white shadow-sm">
              <Trees className="w-5 h-5" />
            </div>
            <span>Parks & Recreation Grounds Scheduling</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Community plazas, outdoor amphitheaters, children playgrounds, and open green recreation areas.
          </p>
        </div>
      </div>

      {/* Parks Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {parks.map((p) => (
          <Card key={p.id} hoverEffect className="border-[#cbd5e1] p-5 space-y-2 bg-gradient-to-br from-emerald-50/40 to-white">
            <div className="flex justify-between items-start">
              <span className="text-[10px] font-bold text-emerald-700 uppercase bg-emerald-100 px-2 py-0.5 rounded border border-emerald-200">
                Capacity: {p.capacity} Pax
              </span>
              <Badge variant="success">Open Public Ground</Badge>
            </div>
            <h3 className="text-base font-bold text-slate-900 leading-tight">{p.name}</h3>
            <p className="text-xs text-slate-600">{p.location}</p>
            <p className="text-[11px] text-slate-500 border-t border-slate-100 pt-2">{p.amenities}</p>
          </Card>
        ))}
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white p-3.5 rounded-2xl border border-slate-200 shadow-soft">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search park bookings by ref, applicant..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-600 focus:bg-white text-slate-800"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
          {['all', 'Pending Review', 'Pending Payment', 'Paid', 'Rejected'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                statusFilter === status
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
              }`}
            >
              {status === 'all' ? 'All Park Bookings' : status === 'Pending Payment' ? 'Waiting for Payment' : status}
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
                  <th className="py-3 px-4">Park Ground</th>
                  <th className="py-3 px-4">Organizer & Purpose</th>
                  <th className="py-3 px-4">Event Date</th>
                  <th className="py-3 px-4">Time Slot</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filtered.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-emerald-700">{r.reference_no}</td>
                    <td className="py-3.5 px-4 font-bold text-slate-800">{r.facility_name}</td>
                    <td className="py-3.5 px-4 max-w-[200px]">
                      <p className="font-bold text-slate-900 truncate">{r.applicant_name}</p>
                      <p className="text-[10px] text-slate-500 truncate">{r.purpose}</p>
                    </td>
                    <td className="py-3.5 px-4 text-slate-700">{new Date(r.event_date).toLocaleDateString()}</td>
                    <td className="py-3.5 px-4 text-slate-700">{r.start_time} - {r.end_time}</td>
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
        title={`Review Park Schedule: ${selectedRes?.reference_no}`}
        description="Verify park availability, set payment due date, and process approval."
        maxWidth="lg"
      >
        {selectedRes && (
          <div className="space-y-4 text-xs">
            <div className="p-3.5 bg-emerald-50 rounded-xl border border-emerald-200 space-y-1">
              <p><span className="font-bold text-slate-700">Park Ground:</span> {selectedRes.facility_name}</p>
              <p><span className="font-bold text-slate-700">Organizer:</span> {selectedRes.applicant_name} ({selectedRes.applicant_phone})</p>
              <p><span className="font-bold text-slate-700">Event:</span> {selectedRes.purpose}</p>
              <p><span className="font-bold text-slate-700">Schedule:</span> {new Date(selectedRes.event_date).toLocaleDateString()} ({selectedRes.start_time} - {selectedRes.end_time})</p>
            </div>

            {/* SET PAYMENT DUE DATE & FEE */}
            {(selectedRes.status === 'Pending' || selectedRes.status === 'Pending Review') && (
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
                    <label className="block text-xs font-semibold text-[#334155] mb-1">Park Standard Permit & Maintenance Fee</label>
                    <input
                      type="text"
                      disabled
                      readOnly
                      value={`₱${((selectedRes as any).fee_amount || 1500).toLocaleString()}.00`}
                      className="w-full rounded-xl border border-slate-200 bg-slate-100 p-2 text-xs font-mono font-bold text-slate-700 cursor-not-allowed"
                    />
                  </div>
                </div>
              </div>
            )}

            {selectedRes.status === 'Pending Payment' && (
              <div className="p-3.5 bg-blue-50 rounded-xl border border-blue-200 text-blue-900 space-y-1">
                <p className="font-bold text-xs">⏳ Awaiting Treasury Cash Settlement:</p>
                <p className="text-[11px]">Notice issued to citizen. Assessed Fee: <strong>₱{((selectedRes as any).fee_amount || 1500).toLocaleString()}.00</strong>. When resident settles at LGU Treasury Desk, click "Approve Payment (Cash Received)" below.</p>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-[#334155] mb-1">Park Administrator Remarks:</label>
              <textarea
                rows={2}
                value={reviewRemarks}
                onChange={(e) => setReviewRemarks(e.target.value)}
                className="w-full rounded-xl border border-slate-300 p-2 text-xs"
              />
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <div className="flex gap-2">
                {(selectedRes.status === 'Pending' || selectedRes.status === 'Pending Review') && (
                  <Button size="sm" variant="danger" className="font-bold text-xs" onClick={() => handleUpdateStatus('Rejected')}>
                    ✕ Reject Schedule
                  </Button>
                )}
                {(selectedRes.status === 'Pending' || selectedRes.status === 'Pending Review' || selectedRes.status === 'Pending Payment') && (
                  <Button size="sm" variant="outline" className="font-bold text-xs text-slate-600" onClick={() => handleUpdateStatus('Cancelled')}>
                    Cancel Booking
                  </Button>
                )}
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="font-bold text-xs" onClick={() => setIsReviewModalOpen(false)}>
                  Close
                </Button>
                {(selectedRes.status === 'Pending' || selectedRes.status === 'Pending Review') && (
                  <Button size="sm" variant="success" className="bg-emerald-600 hover:bg-emerald-700 font-bold text-white text-xs" onClick={() => handleUpdateStatus('Pending Payment')}>
                    Grant Reservation & Issue Payment Notice
                  </Button>
                )}
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

      {/* Modal: New Booking */}
      <Modal
        isOpen={isNewModalOpen}
        onClose={() => setIsNewModalOpen(false)}
        title="Schedule Park or Recreation Ground"
        description="Reserve public plaza or sports grounds."
      >
        <form onSubmit={handleCreate} className="space-y-3 text-xs">
          <div>
            <label className="block text-xs font-semibold text-[#334155] mb-1">Select Park Ground *</label>
            <select
              value={newForm.facility_id}
              onChange={(e) => setNewForm({ ...newForm, facility_id: parseInt(e.target.value) })}
              className="w-full rounded-xl border border-slate-300 p-2 text-xs"
            >
              {parks.map(p => (
                <option key={p.id} value={p.id}>{p.name} ({p.location})</option>
              ))}
            </select>
          </div>

          <Input
            label="Applicant / Organization *"
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
            placeholder="e.g. Youth Soccer Clinic / Senior Morning Calisthenics"
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

          <div className="pt-3 flex justify-end gap-2">
            <Button size="sm" variant="outline" type="button" onClick={() => setIsNewModalOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" variant="success" type="submit">
              Confirm Park Schedule
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
