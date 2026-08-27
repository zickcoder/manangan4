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
  Eye,
  Image as ImageIcon,
  User,
  MapPin,
  Home,
  Check,
  X
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
    affected_households: '2 - 5 Households (Compound / Immediate Neighbors)',
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
    if (!selectedReq) return;
    try {
      await updateUtilityStatus(
        selectedReq.id,
        status,
        dispatchTeam,
        resolutionNotes || `Status updated to ${status} by Municipal Dispatch`
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
            <span>Water Supply & Drainage Incident Dispatch Desk</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Review citizen-submitted hazard reports, verify photo evidence, and dispatch emergency response crews.
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white p-3.5 rounded-2xl border border-slate-200 shadow-soft">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search tickets by ID, street, reporter..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-cyan-600 focus:bg-white text-slate-800"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
          {['all', 'Pending', 'Dispatched', 'Resolved', 'Rejected'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                statusFilter === st
                  ? 'bg-cyan-600 text-white shadow-sm'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
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
                  <th className="py-3 px-4">Service Hazard</th>
                  <th className="py-3 px-4">Location & Households</th>
                  <th className="py-3 px-4">Citizen Reporter</th>
                  <th className="py-3 px-4">AI Score</th>
                  <th className="py-3 px-4">Assigned Crew</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filtered.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-cyan-700">{u.ticket_no}</td>
                    <td className="py-3.5 px-4">
                      <p className="font-bold text-slate-900">{u.service_type}</p>
                      {u.photo_url && (
                        <span className="inline-flex items-center gap-1 text-[10px] text-cyan-700 font-semibold bg-cyan-50 px-1.5 py-0.5 rounded border border-cyan-200 mt-0.5">
                          <ImageIcon className="w-3 h-3" /> Photo Attached
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 max-w-[220px]">
                      <p className="text-slate-800 font-semibold truncate">{u.location}</p>
                      <p className="text-[10px] text-slate-400 truncate">{u.affected_households || '1 Household'}</p>
                    </td>
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
                      <Badge variant={u.status === 'Resolved' ? 'success' : u.status === 'In Progress' || u.status === 'Dispatched' ? 'info' : 'warning'}>
                        {u.status === 'In Progress' ? 'Dispatched' : u.status}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      {u.status === 'Resolved' || u.status === 'Rejected' || u.status === 'Cancelled' ? (
                        <span className="text-[11px] font-bold text-slate-400 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                          {u.status === 'Resolved' ? '✓ Resolved (Locked)' : 'Ticket Locked'}
                        </span>
                      ) : (
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
                          Manage Ticket
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Modal: Full Citizen Ticket Details & Dispatch Controls */}
      <Modal
        isOpen={isDispatchModalOpen}
        onClose={() => setIsDispatchModalOpen(false)}
        title={`Manage Incident Ticket — ${selectedReq?.ticket_no}`}
        description="Verify citizen-submitted incident report, photo evidence, and manage crew dispatch."
        maxWidth="lg"
      >
        {selectedReq && (
          <div className="space-y-4 text-xs">
            {/* Status & Priority Header */}
            <div className="flex items-center justify-between p-3 bg-slate-900 text-white rounded-xl">
              <div className="flex items-center gap-2">
                <Badge variant={selectedReq.status === 'Resolved' ? 'success' : selectedReq.status === 'In Progress' || selectedReq.status === 'Dispatched' ? 'info' : 'warning'}>
                  {selectedReq.status === 'In Progress' ? 'Dispatched' : selectedReq.status}
                </Badge>
                <span className="font-mono font-bold text-cyan-400">{selectedReq.ticket_no}</span>
              </div>
              <span className="text-[11px] font-bold text-amber-400 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" />
                AI Triage: {selectedReq.ai_priority_score} pts ({selectedReq.urgency})
              </span>
            </div>

            {/* Reporter Details */}
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
              <p className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-cyan-600" />
                <span>Citizen Reporter Information</span>
              </p>
              <p><span className="font-bold text-slate-700">Full Name:</span> {selectedReq.citizen_name}</p>
              <p><span className="font-bold text-slate-700">Contact Number:</span> {selectedReq.citizen_phone}</p>
              <p><span className="font-bold text-slate-700">Registered Email:</span> {selectedReq.citizen_email || 'juan.delacruz@citizen.gov.ph'}</p>
            </div>

            {/* Location & Impact */}
            <div className="p-3.5 bg-cyan-50/60 rounded-xl border border-cyan-200 space-y-1.5">
              <p className="font-bold text-cyan-950 text-xs uppercase tracking-wider flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-cyan-700" />
                <span>Incident Location & Affected Scope</span>
              </p>
              <p><span className="font-bold text-slate-700">Hazard Type:</span> <strong className="text-cyan-900">{selectedReq.service_type}</strong></p>
              <p><span className="font-bold text-slate-700">Location Landmark:</span> {selectedReq.location}</p>
              <p><span className="font-bold text-slate-700">Affected Households Range:</span> <span className="font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded border border-red-200">{selectedReq.affected_households || '1 Household'}</span></p>
              <p><span className="font-bold text-slate-700">Detailed Description:</span> "{selectedReq.description}"</p>
            </div>

            {/* Attached Photo Preview or No Photo Proof Badge */}
            {selectedReq.photo_url ? (
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <p className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-cyan-600" />
                  <span>Citizen Uploaded Hazard Photo Evidence</span>
                </p>
                <div className="rounded-xl overflow-hidden border border-slate-300 max-h-56 bg-slate-900 flex items-center justify-center">
                  <img src={selectedReq.photo_url} alt="Hazard Photo" className="max-h-56 w-auto object-contain" />
                </div>
              </div>
            ) : (
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-slate-500 font-semibold text-xs flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-slate-400 shrink-0" />
                <span>📷 No photo proof provided (Text description only)</span>
              </div>
            )}

            {/* Response Crew Selection */}
            <div>
              <label className="block text-xs font-bold text-[#334155] mb-1.5">Assign Municipal Field Response Crew:</label>
              <select
                value={dispatchTeam}
                onChange={(e) => setDispatchTeam(e.target.value)}
                className="w-full rounded-xl border border-slate-300 p-2.5 text-xs font-medium focus:border-cyan-600 focus:outline-none"
              >
                <option value="Quick Response Water Crew Alpha">Quick Response Water Crew Alpha (Mainlines & Pipe Bursts)</option>
                <option value="Drainage Cleanout Team 2">Drainage Cleanout Team 2 (Heavy Jetting & Culverts)</option>
                <option value="Engineering Masonry Team">Engineering Masonry Team (Canal Walls & Revetments)</option>
                <option value="Emergency Flood Pumping Taskforce">Emergency Flood Pumping Taskforce (Dewatering Pumps)</option>
              </select>
            </div>

            {/* Resolution Notes */}
            <div>
              <label className="block text-xs font-bold text-[#334155] mb-1.5">Field Dispatch / Resolution Log Notes:</label>
              <textarea
                rows={3}
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                placeholder="Log dispatch orders, repair completion details, replaced valves, or declogged meters..."
                className="w-full rounded-xl border border-slate-300 p-2.5 text-xs focus:border-cyan-600 focus:outline-none"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <div>
                {(selectedReq.status === 'Pending' || selectedReq.status === 'Pending Review') && (
                  <Button size="sm" variant="destructive" className="font-bold text-xs" onClick={() => handleUpdateStatus('Rejected')}>
                    ✕ Reject Ticket
                  </Button>
                )}
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="font-bold text-xs" onClick={() => setIsDispatchModalOpen(false)}>
                  Close
                </Button>
                {(selectedReq.status === 'Pending' || selectedReq.status === 'Pending Review') && (
                  <Button size="sm" variant="primary" className="bg-cyan-600 hover:bg-cyan-700 font-bold text-white text-xs" onClick={() => handleUpdateStatus('Dispatched')}>
                    <Truck className="w-3.5 h-3.5 mr-1" />
                    Dispatch Crew
                  </Button>
                )}
                {(selectedReq.status === 'Dispatched' || selectedReq.status === 'In Progress') && (
                  <Button size="sm" variant="success" className="bg-emerald-600 hover:bg-emerald-700 font-bold text-white text-xs" onClick={() => handleUpdateStatus('Resolved')}>
                    <Check className="w-3.5 h-3.5 mr-1" />
                    Mark Resolved & Repaired
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal: Log New Incident */}
      <Modal
        isOpen={isNewModalOpen}
        onClose={() => setIsNewModalOpen(false)}
        title="Direct Intake: Log Water / Drainage Incident"
        description="Internal intake for walk-in or hotline utility complaints."
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
                <option value="Flash Flooding">Flash Flooding</option>
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
            <Button size="sm" variant="primary" className="bg-cyan-600 hover:bg-cyan-700 font-bold" type="submit">
              Log & AI Triage
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
