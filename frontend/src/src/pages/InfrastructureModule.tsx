import React, { useState, useEffect } from 'react';
import { 
  Construction, 
  Search, 
  Plus, 
  TrendingUp, 
  MapPin, 
  DollarSign, 
  CheckCircle2,
  Clock,
  Building
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { fetchInfrastructure, addInfrastructureProject } from '../lib/api';
import { InfrastructureProject } from '../types';

export function InfrastructureModule() {
  const [projects, setProjects] = useState<InfrastructureProject[]>([]);
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [newForm, setNewForm] = useState({
    title: '',
    category: 'Roads & Bridges',
    location: '',
    budget: '25000000',
    contractor: 'MegaCore Builders & Infra Corp.',
    start_date: new Date().toISOString().split('T')[0],
    target_end_date: new Date(Date.now() + 180 * 86400000).toISOString().split('T')[0],
  });

  const loadData = async () => {
    try {
      const data = await fetchInfrastructure();
      setProjects(data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addInfrastructureProject(newForm);
      setIsNewModalOpen(false);
      loadData();
    } catch (e) {
      alert('Failed to register infrastructure project');
    }
  };

  const filtered = projects.filter(p =>
    p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.project_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.location.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalBudget = projects.reduce((sum, p) => sum + parseFloat(p.budget?.toString() || '0'), 0);
  const totalSpent = projects.reduce((sum, p) => sum + parseFloat(p.spent?.toString() || '0'), 0);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-[#0f172a] font-display flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-600 text-white shadow-sm">
              <Construction className="w-5 h-5" />
            </div>
            <span>Infrastructure & Public Works Projects</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Real-time monitoring of municipal civil works, contractor milestones, and budget disbursement.
          </p>
        </div>

        <Button
          size="sm"
          variant="primary"
          leftIcon={<Plus className="w-4 h-4" />}
          onClick={() => setIsNewModalOpen(true)}
        >
          Track New Public Project
        </Button>
      </div>

      {/* Budget Summary Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-5 border-[#cbd5e1]">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Allocated Budget</span>
          <p className="text-2xl font-extrabold text-slate-900 font-display mt-2">
            ₱{(totalBudget / 1000000).toFixed(2)} Million
          </p>
          <span className="text-[11px] text-slate-400">Across all civic capital outlays</span>
        </Card>

        <Card className="p-5 border-[#cbd5e1]">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Disbursed Expenditure</span>
          <p className="text-2xl font-extrabold text-blue-600 font-display mt-2">
            ₱{(totalSpent / 1000000).toFixed(2)} Million
          </p>
          <span className="text-[11px] text-emerald-600 font-semibold">
            {totalBudget > 0 ? ((totalSpent / totalBudget) * 100).toFixed(1) : 0}% Utilized
          </span>
        </Card>

        <Card className="p-5 border-[#cbd5e1]">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Monitored Projects</span>
          <p className="text-2xl font-extrabold text-indigo-600 font-display mt-2">
            {projects.length} Projects
          </p>
          <span className="text-[11px] text-slate-400">Roads, Drainage & Health Centers</span>
        </Card>
      </div>

      {/* Projects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filtered.map((proj) => (
          <Card key={proj.id} hoverEffect className="border-[#cbd5e1] p-6 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs font-mono font-bold text-cyan-700 bg-cyan-50 px-2 py-0.5 rounded border border-cyan-200">
                  {proj.project_code}
                </span>
                <h3 className="text-base font-bold text-slate-900 mt-2">{proj.title}</h3>
                <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  <span>{proj.location}</span>
                </p>
              </div>
              <Badge variant={proj.status === 'Completed' ? 'success' : 'info'}>
                {proj.status}
              </Badge>
            </div>

            {/* Progress Bar */}
            <div className="space-y-1.5 pt-2">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-slate-600">Physical Accomplishment</span>
                <span className="text-blue-600">{proj.progress}%</span>
              </div>
              <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    proj.progress === 100 ? 'bg-emerald-500' : 'bg-blue-600'
                  }`}
                  style={{ width: `${proj.progress}%` }}
                />
              </div>
            </div>

            {/* Financial Details */}
            <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-100 text-xs">
              <div>
                <span className="text-slate-400 block">Total Budget:</span>
                <span className="font-bold text-slate-800">₱{parseFloat(proj.budget.toString()).toLocaleString()}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Contractor:</span>
                <span className="font-semibold text-slate-700 truncate block">{proj.contractor || 'LGU Direct Labor'}</span>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Modal: New Project */}
      <Modal
        isOpen={isNewModalOpen}
        onClose={() => setIsNewModalOpen(false)}
        title="Register Infrastructure Project"
        description="Public capital improvement project registration."
      >
        <form onSubmit={handleCreate} className="space-y-3 text-xs">
          <Input
            label="Project Title *"
            required
            placeholder="e.g. Tullahan River Embankment & Flood Wall"
            value={newForm.title}
            onChange={(e) => setNewForm({ ...newForm, title: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#334155] mb-1">Category</label>
              <select
                value={newForm.category}
                onChange={(e) => setNewForm({ ...newForm, category: e.target.value })}
                className="w-full rounded-xl border border-slate-300 p-2 text-xs"
              >
                <option value="Roads & Bridges">Roads & Bridges</option>
                <option value="Drainage">Drainage & Flood Control</option>
                <option value="Public Buildings">Public Buildings & Health Centers</option>
                <option value="Parks & Greenery">Parks & Green Infrastructure</option>
              </select>
            </div>
            <Input
              label="Approved Budget (₱) *"
              type="number"
              required
              value={newForm.budget}
              onChange={(e) => setNewForm({ ...newForm, budget: e.target.value })}
            />
          </div>
          <Input
            label="Project Location *"
            required
            placeholder="Sitio Riverside, Zone 4"
            value={newForm.location}
            onChange={(e) => setNewForm({ ...newForm, location: e.target.value })}
          />
          <Input
            label="Awarded Contractor / Builder"
            placeholder="SolidRock Construction Inc."
            value={newForm.contractor}
            onChange={(e) => setNewForm({ ...newForm, contractor: e.target.value })}
          />
          <div className="pt-3 flex justify-end gap-2">
            <Button size="sm" variant="outline" type="button" onClick={() => setIsNewModalOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" variant="primary" type="submit">
              Register Project
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
