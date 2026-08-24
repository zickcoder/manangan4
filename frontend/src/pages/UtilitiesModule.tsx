import React, { useState, useEffect } from 'react';
import { 
  Droplet, 
  Search, 
  Plus, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Sparkles, 
  Truck, 
  Send, 
  Eye 
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { fetchUtilities, updateUtilityStatus, createUtilityRequest } from '../lib/api';
import { UtilityRequest } from '../types';

export function UtilitiesModule() {
  const [requests, setRequests] = useState<UtilityRequest[]>([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedReq, setSelectedReq] = useState<UtilityRequest | null>(null);
  const [isDispatchModalOpen, setIsDispatchModalOpen] = useState(false);
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);

  const [dispatchTeam, setDispatchTeam] = useState('Quick Response Water Crew Alpha');
  const [resolutionNotes, setResolutionNotes] = useState('');

  const [newForm, setNewForm] = useState({
    citizen_name: '',
    citizen_phone: '',
    service_type: 'Water Main Leak',
    location: '',
    description: '',
    urgency: 'Urgent',
  });

  const loadData = async () => {
    try {
      const data = await fetchUtilities(statusFilter, 'all');
      setRequests(data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadData();
  }, [statusFilter]);

  const handleUpdateStatus = async (status: string) => {
    if (!selectedReq) return;
    try {
      await updateUtilityStatus(
        selectedReq.id,
        status,
        dispatchTeam,
        resolutionNotes || `Status updated to ${status}`
      );
      setIsDispatchModalOpen(false);
      loadData();
    } catch (e) {
      alert('Failed to update ticket');
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createUtilityRequest(newForm);
      setIsNewModalOpen(false);
      loadData();
    } catch (e) {
      alert('Failed to log request');
    }
  };

  const filtered = requests.filter(r =>
    r.ticket_no.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.citizen_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.service_type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-[#0f172a] font-display flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-600 text-white shadow-sm">
              <Droplet className="w-5 h-5" />
            </div>
            <span>Water Supply & Drainage Incident Dispatch</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Emergency pipe bursts, pressure complaints, storm drainage declogging, and field crew deployment.
          </p>
        </div>

        <Button
          size="sm"
          variant="primary"
          className="bg-cyan-600 hover:bg-cyan-700 font-bold"
          leftIcon={<Plus className="w-4 h-4" />}
          onClick={() => setIsNewModalOpen(true)}
        >
          Log Utility Ticket
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white p-3.5 rounded-2xl border border-slate-200 shadow-soft">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search tickets by ID, street, citizen..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-cyan-600 focus:bg-white text-slate-800"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
          {['all', 'Pending', 'Dispatched', 'In Progress', 'Resolved'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                statusFilter === st
                  ? 'bg-cyan-600 text-white shadow-sm'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
              }`}
            >
              {st === 'all' ? 'All Incidents' : st}
            </button>
          ))}
        </div>
      </div>

      {/* Incidents Table */}
      <Card className="border-[#cbd5e1]">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Ticket ID</th>
                  <th className="py-3 px-4">Service Issue</th>
                  <th className="py-3 px-4">Location</th>
                  <th className="py-3 px-4">Citizen Contact</th>
                  <th className="py-3 px-4">AI Priority</th>
                  <th className="py-3 px-4">Assigned Team</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Dispatch</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filtered.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-cyan-700">{u.ticket_no}</td>
                    <td className="py-3.5 px-4 font-bold text-slate-900">{u.service_type}</td>
                    <td className="py-3.5 px-4 text-slate-600 max-w-[200px] truncate">{u.location}</td>
                    <td className="py-3.5 px-4 text-slate-700">
                      <p className="font-semibold">{u.citizen_name}</p>
                      <p className="text-[10px] text-slate-400">{u.citizen_phone}</p>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`inline-flex items-center gap-1 font-bold px-2 py-0.5 rounded text-[10px] border ${
                        u.ai_priority_score >= 85
                          ? 'bg-red-50 text-red-700 border-red-200'
                          : u.ai_priority_score >= 70
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : 'bg-blue-50 text-blue-700 border-blue-200'
                      }`}>
                        <Sparkles className="w-3 h-3" />
                        {u.ai_priority_score} / 100
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-800 font-semibold">{u.assigned_team || 'Unassigned'}</td>
                    <td className="py-3.5 px-4">
                      <Badge variant={u.status === 'Resolved' ? 'success' : u.status === 'Dispatched' ? 'info' : 'warning'}>
                        {u.status}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <Button
                        size="sm"
                        variant="secondary"
                        leftIcon={<Eye className="w-3.5 h-3.5" />}
                        onClick={() => {
                          setSelectedReq(u);
                          setDispatchTeam(u.assigned_team || 'Quick Response Water Crew Alpha');
                          setResolutionNotes(u.resolution_notes || '');
                          setIsDispatchModalOpen(true);
                        }}
                      >
                        Manage
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Modal: Dispatch & Resolution */}
      <Modal
        isOpen={isDispatchModalOpen}
        onClose={() => setIsDispatchModalOpen(false)}
        title={`Manage Incident: ${selectedReq?.ticket_no}`}
        description="Dispatch maintenance crew and log field resolution."
      >
        {selectedReq && (
          <div className="space-y-4 text-xs">
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
              <p><span className="font-bold text-slate-700">Issue:</span> {selectedReq.service_type}</p>
              <p><span className="font-bold text-slate-700">Location:</span> {selectedReq.location}</p>
              <p><span className="font-bold text-slate-700">Description:</span> "{selectedReq.description}"</p>
              <p><span className="font-bold text-slate-700">AI Triage:</span> Urgency: <strong className="text-red-600">{selectedReq.urgency}</strong> (Score: {selectedReq.ai_priority_score} pts)</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#334155] mb-1">Assign Response Crew:</label>
              <select
                value={dispatchTeam}
                onChange={(e) => setDispatchTeam(e.target.value)}
                className="w-full rounded-xl border border-slate-300 p-2 text-xs"
              >
                <option value="Quick Response Water Crew Alpha">Quick Response Water Crew Alpha (Mainlines)</option>
                <option value="Drainage Cleanout Team 2">Drainage Cleanout Team 2 (Heavy Jetting)</option>
                <option value="Engineering Masonry Team">Engineering Masonry Team (Canal Walls)</option>
                <option value="Emergency Flood Pumping Taskforce">Emergency Flood Pumping Taskforce</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#334155] mb-1">Field Resolution Notes:</label>
              <textarea
                rows={3}
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                placeholder="Log repair completion details, replaced valves, or declogged meters..."
                className="w-full rounded-xl border border-slate-300 p-2 text-xs"
              />
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <Button size="sm" variant="outline" onClick={() => handleUpdateStatus('Dispatched')}>
                Mark Dispatched
              </Button>
              <div className="flex gap-2">
                <Button size="sm" variant="success" onClick={() => handleUpdateStatus('Resolved')}>
                  Mark Resolved & Repaired
                </Button>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal: Add New Ticket */}
      <Modal
        isOpen={isNewModalOpen}
        onClose={() => setIsNewModalOpen(false)}
        title="Log Water / Drainage Incident"
        description="Direct staff intake for utility complaints."
      >
        <form onSubmit={handleCreate} className="space-y-3 text-xs">
          <Input
            label="Reporting Citizen Name *"
            required
            value={newForm.citizen_name}
            onChange={(e) => setNewForm({ ...newForm, citizen_name: e.target.value })}
          />
          <Input
            label="Citizen Phone Number *"
            required
            value={newForm.citizen_phone}
            onChange={(e) => setNewForm({ ...newForm, citizen_phone: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#334155] mb-1">Incident Type</label>
              <select
                value={newForm.service_type}
                onChange={(e) => setNewForm({ ...newForm, service_type: e.target.value })}
                className="w-full rounded-xl border border-slate-300 p-2 text-xs"
              >
                <option value="Water Main Leak">Water Main Leak</option>
                <option value="Low Water Pressure">Low Water Pressure</option>
                <option value="Drainage Declogging">Drainage Declogging</option>
                <option value="Canal Wall Repair">Canal Wall Repair</option>
              </select>
            </div>
            <Input
              label="Street / Landmark Location *"
              required
              value={newForm.location}
              onChange={(e) => setNewForm({ ...newForm, location: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#334155] mb-1">Hazard Description *</label>
            <textarea
              rows={3}
              required
              value={newForm.description}
              onChange={(e) => setNewForm({ ...newForm, description: e.target.value })}
              className="w-full rounded-xl border border-slate-300 p-2 text-xs"
            />
          </div>
          <div className="pt-3 flex justify-end gap-2">
            <Button size="sm" variant="outline" type="button" onClick={() => setIsNewModalOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" variant="primary" className="bg-cyan-600 hover:bg-cyan-700" type="submit">
              Log & AI Triage
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
