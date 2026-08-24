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

export function ParksModule() {
  const [parks, setParks] = useState<Facility[]>([]);
  const [reservations, setReservations] = useState<FacilityReservation[]>([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRes, setSelectedRes] = useState<FacilityReservation | null>(null);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [reviewRemarks, setReviewRemarks] = useState('');

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
  }, [statusFilter]);

  const handleUpdateStatus = async (status: string) => {
    if (!selectedRes) return;
    try {
      await updateReservationStatus(
        selectedRes.id,
        status,
        reviewRemarks || `Park schedule ${status}`,
        'Engr. Marcus Cruz'
      );
      setIsReviewModalOpen(false);
      loadData();
    } catch (e) {
      alert('Failed to update status');
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createReservation(newForm);
      setIsNewModalOpen(false);
      loadData();
    } catch (e) {
      alert('Failed to book park');
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
            <div className="p-2 rounded-xl bg-emerald-600 text-white shadow-sm">
              <Trees className="w-5 h-5" />
            </div>
            <span>Parks & Recreation Grounds Scheduling</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Community plazas, outdoor amphitheaters, children playgrounds, and open green recreation areas.
          </p>
        </div>

        <Button
          size="sm"
          variant="success"
          leftIcon={<Plus className="w-4 h-4" />}
          onClick={() => setIsNewModalOpen(true)}
        >
          Schedule Park Event
        </Button>
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

      {/* Reservations Table */}
      <Card className="border-[#cbd5e1]">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle>Park Schedules & Event Permits</CardTitle>
            <CardDescription>Scheduled community activities on municipal recreation grounds</CardDescription>
          </div>
        </CardHeader>
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
                      <Badge variant={r.status === 'Approved' ? 'success' : 'warning'}>{r.status}</Badge>
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
        description="Verify park availability and issue approval."
      >
        {selectedRes && (
          <div className="space-y-4 text-xs">
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
              <p><span className="font-bold text-slate-700">Park Ground:</span> {selectedRes.facility_name}</p>
              <p><span className="font-bold text-slate-700">Organizer:</span> {selectedRes.applicant_name} ({selectedRes.applicant_phone})</p>
              <p><span className="font-bold text-slate-700">Event:</span> {selectedRes.purpose}</p>
              <p><span className="font-bold text-slate-700">Schedule:</span> {new Date(selectedRes.event_date).toLocaleDateString()} ({selectedRes.start_time} - {selectedRes.end_time})</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#334155] mb-1">Park Administrator Remarks:</label>
              <textarea
                rows={3}
                value={reviewRemarks}
                onChange={(e) => setReviewRemarks(e.target.value)}
                className="w-full rounded-xl border border-slate-300 p-2 text-xs"
              />
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <Button size="sm" variant="danger" onClick={() => handleUpdateStatus('Rejected')}>
                Reject Schedule
              </Button>
              <div className="flex gap-2">
                <Button size="sm" variant="success" onClick={() => handleUpdateStatus('Approved')}>
                  Approve Park Event
                </Button>
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
    </div>
  );
}
