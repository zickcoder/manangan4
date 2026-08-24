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

export function FacilitiesModule() {
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [reservations, setReservations] = useState<FacilityReservation[]>([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRes, setSelectedRes] = useState<FacilityReservation | null>(null);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [reviewRemarks, setReviewRemarks] = useState('');

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
  }, [statusFilter]);

  const handleUpdateStatus = async (status: string) => {
    if (!selectedRes) return;
    try {
      await updateReservationStatus(
        selectedRes.id,
        status,
        reviewRemarks || `Reservation ${status} by Facilities Bureau`,
        'Engr. Marcus Cruz'
      );
      setIsReviewModalOpen(false);
      loadData();
    } catch (e) {
      alert('Failed to update reservation');
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
      await createReservation(newForm);
      setIsNewModalOpen(false);
      loadData();
    } catch (e) {
      alert('Failed to create reservation');
    }
  };

  const filtered = reservations.filter(r =>
    r.reference_no.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.applicant_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.purpose.toLowerCase().includes(searchQuery.toLowerCase())
  );

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

        <Button
          size="sm"
          variant="primary"
          leftIcon={<Plus className="w-4 h-4" />}
          onClick={() => setIsNewModalOpen(true)}
        >
          Book Facility
        </Button>
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
          {['all', 'Pending', 'Approved', 'Rejected'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                statusFilter === status
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
              }`}
            >
              {status === 'all' ? 'All Bookings' : status}
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
                      {new Date(r.event_date).toLocaleDateString()}
                      <span className="block text-[10px] text-slate-400">{r.start_time} - {r.end_time}</span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-700">{r.attendees} Pax</td>
                    <td className="py-3.5 px-4">
                      <Badge variant={r.status === 'Approved' ? 'success' : r.status === 'Rejected' ? 'destructive' : 'warning'}>
                        {r.status}
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
        title={`Review Reservation ${selectedRes?.reference_no}`}
        description="Verify facility availability and set approval status."
      >
        {selectedRes && (
          <div className="space-y-4 text-xs">
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
              <p><span className="font-bold text-slate-700">Facility:</span> {selectedRes.facility_name}</p>
              <p><span className="font-bold text-slate-700">Applicant:</span> {selectedRes.applicant_name} ({selectedRes.applicant_phone})</p>
              <p><span className="font-bold text-slate-700">Purpose:</span> {selectedRes.purpose}</p>
              <p><span className="font-bold text-slate-700">Schedule:</span> {new Date(selectedRes.event_date).toLocaleDateString()} ({selectedRes.start_time} - {selectedRes.end_time})</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#334155] mb-1">Approval / Review Remarks:</label>
              <textarea
                rows={3}
                value={reviewRemarks}
                onChange={(e) => setReviewRemarks(e.target.value)}
                className="w-full rounded-xl border border-slate-300 p-2 text-xs"
              />
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <Button size="sm" variant="danger" onClick={() => handleUpdateStatus('Rejected')}>
                Reject
              </Button>
              <div className="flex gap-2">
                <Button size="sm" variant="success" onClick={() => handleUpdateStatus('Approved')}>
                  Approve Reservation
                </Button>
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
    </div>
  );
}
