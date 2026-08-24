import React, { useState, useEffect } from 'react';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  User, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  Building2,
  CalendarDays,
  Plus
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { fetchAppointments, getAIScheduleSuggestion, bookAppointment } from '../lib/api';
import { Appointment } from '../types';

export function CalendarModule() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [aiSuggestions, setAiSuggestions] = useState<any>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);

  const [newForm, setNewForm] = useState({
    citizen_name: '',
    citizen_email: '',
    citizen_phone: '',
    department: 'Urban Planning & Zoning',
    service_type: 'Zoning Clearance Consultation',
    appointment_date: new Date().toISOString().split('T')[0],
    time_slot: '09:30 AM - 10:30 AM',
    notes: '',
  });

  const loadData = async () => {
    try {
      const data = await fetchAppointments();
      setAppointments(data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRunAIScheduler = async () => {
    setAiLoading(true);
    try {
      const suggestion = await getAIScheduleSuggestion(
        newForm.department,
        newForm.appointment_date,
        newForm.service_type,
        'Staff department load-balancing review'
      );
      setAiSuggestions(suggestion);
    } catch (e) {
      console.error(e);
    } finally {
      setAiLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await bookAppointment(newForm);
      setIsNewModalOpen(false);
      loadData();
    } catch (e) {
      alert('Failed to book appointment');
    }
  };

  const filtered = appointments.filter(a =>
    departmentFilter === 'all' || a.department === departmentFilter
  );

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-[#0f172a] font-display flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-600 text-white shadow-sm">
              <CalendarIcon className="w-5 h-5" />
            </div>
            <span>Department Appointment Scheduler & AI Dispatcher</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Desk consultation allocations, citizen booking records, and AI workload balancing.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            leftIcon={<Sparkles className="w-4 h-4 text-indigo-600" />}
            isLoading={aiLoading}
            onClick={handleRunAIScheduler}
          >
            AI Load Analysis
          </Button>
          <Button
            size="sm"
            variant="primary"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={() => setIsNewModalOpen(true)}
          >
            Add Appointment Slot
          </Button>
        </div>
      </div>

      {/* AI Suggestion Alert Banner */}
      {aiSuggestions && (
        <div className="p-5 rounded-2xl bg-gradient-to-r from-indigo-900 to-slate-900 text-white shadow-large space-y-3 animate-fade-in-up">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-400 animate-pulse" />
              <h4 className="text-sm font-bold font-display">OpenRouter AI Schedule Telemetry</h4>
            </div>
            <Badge variant="purple">Optimal Capacity</Badge>
          </div>
          <p className="text-xs text-slate-200 leading-relaxed">
            "{aiSuggestions.aiRationale}"
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            <div className="p-3 bg-white/10 rounded-xl border border-white/10 text-xs">
              <span className="text-indigo-300 font-bold block">Recommended Slots:</span>
              <span className="text-white mt-1 block">{aiSuggestions.recommendedSlots?.join(' • ')}</span>
            </div>
            <div className="p-3 bg-white/10 rounded-xl border border-white/10 text-xs">
              <span className="text-indigo-300 font-bold block">Queue Peak Warning:</span>
              <span className="text-white mt-1 block">{aiSuggestions.peakHourWarning || 'Standard'}</span>
            </div>
            <div className="p-3 bg-white/10 rounded-xl border border-white/10 text-xs">
              <span className="text-indigo-300 font-bold block">Est. Duration:</span>
              <span className="text-white mt-1 block">{aiSuggestions.estimatedDurationMinutes} Minutes per Session</span>
            </div>
          </div>
        </div>
      )}

      {/* Appointments List */}
      <Card className="border-[#cbd5e1]">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle>Upcoming Citizen Consultations</CardTitle>
            <CardDescription>Scheduled desk appointments across all municipal offices.</CardDescription>
          </div>
          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className="text-xs p-2 rounded-xl border border-slate-300 bg-slate-50 font-semibold text-slate-700"
          >
            <option value="all">All Departments</option>
            <option value="Urban Planning & Zoning">Urban Planning & Zoning</option>
            <option value="Building & Safety Dept">Building Official</option>
            <option value="Social Housing & Settlements">Social Housing</option>
          </select>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Booking Ref</th>
                  <th className="py-3 px-4">Citizen Name</th>
                  <th className="py-3 px-4">Department & Service</th>
                  <th className="py-3 px-4">Date & Time Slot</th>
                  <th className="py-3 px-4">Notes / Remarks</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filtered.map((apt) => (
                  <tr key={apt.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-indigo-600">
                      {apt.reference_no}
                    </td>
                    <td className="py-3.5 px-4">
                      <p className="font-bold text-slate-800">{apt.citizen_name}</p>
                      <p className="text-[10px] text-slate-500">{apt.citizen_phone}</p>
                    </td>
                    <td className="py-3.5 px-4">
                      <p className="font-bold text-slate-700">{apt.department}</p>
                      <p className="text-[10px] text-slate-500">{apt.service_type}</p>
                    </td>
                    <td className="py-3.5 px-4">
                      <p className="font-bold text-slate-800">{new Date(apt.appointment_date).toLocaleDateString()}</p>
                      <p className="text-[10px] text-indigo-600 font-semibold flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>{apt.time_slot}</span>
                      </p>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 max-w-[200px] truncate">
                      {apt.notes || 'General Consultation'}
                    </td>
                    <td className="py-3.5 px-4">
                      <Badge variant="success">
                        {apt.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Modal: New Booking */}
      <Modal
        isOpen={isNewModalOpen}
        onClose={() => setIsNewModalOpen(false)}
        title="Schedule Citizen Appointment"
        description="Book a dedicated municipal consultation slot."
      >
        <form onSubmit={handleCreate} className="space-y-3 text-xs">
          <Input
            label="Citizen Full Name *"
            required
            placeholder="Gabriel Tan"
            value={newForm.citizen_name}
            onChange={(e) => setNewForm({ ...newForm, citizen_name: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Email Address *"
              type="email"
              required
              value={newForm.citizen_email}
              onChange={(e) => setNewForm({ ...newForm, citizen_email: e.target.value })}
            />
            <Input
              label="Contact Phone Number *"
              required
              value={newForm.citizen_phone}
              onChange={(e) => setNewForm({ ...newForm, citizen_phone: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#334155] mb-1">Department</label>
              <select
                value={newForm.department}
                onChange={(e) => setNewForm({ ...newForm, department: e.target.value })}
                className="w-full rounded-xl border border-slate-300 p-2 text-xs"
              >
                <option value="Urban Planning & Zoning">Urban Planning & Zoning</option>
                <option value="Building & Safety Dept">Building Official</option>
                <option value="Social Housing & Settlements">Social Housing</option>
              </select>
            </div>
            <Input
              label="Service Type *"
              required
              value={newForm.service_type}
              onChange={(e) => setNewForm({ ...newForm, service_type: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Date *"
              type="date"
              required
              value={newForm.appointment_date}
              onChange={(e) => setNewForm({ ...newForm, appointment_date: e.target.value })}
            />
            <Input
              label="Time Slot *"
              required
              value={newForm.time_slot}
              onChange={(e) => setNewForm({ ...newForm, time_slot: e.target.value })}
            />
          </div>
          <div className="pt-3 flex justify-end gap-2">
            <Button size="sm" variant="outline" type="button" onClick={() => setIsNewModalOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" variant="primary" type="submit">
              Confirm Booking
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
