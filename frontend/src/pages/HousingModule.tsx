import React, { useState, useEffect } from 'react';
import { 
  Home, 
  Search, 
  Plus, 
  Users, 
  Building, 
  CheckCircle2, 
  Clock, 
  TrendingUp,
  Award
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { fetchHousing, addHousingBeneficiary } from '../lib/api';
import { HousingBeneficiary } from '../types';

export function HousingModule() {
  const [beneficiaries, setBeneficiaries] = useState<HousingBeneficiary[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const [newForm, setNewForm] = useState({
    full_name: '',
    contact_no: '',
    address: '',
    family_members: '4',
    monthly_income: '15000',
    priority_score: '85',
    status: 'Qualified',
    allocated_project: 'Villa Esperanza Resettlement Village',
    unit_no: '',
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await fetchHousing();
      setBeneficiaries(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addHousingBeneficiary(newForm);
      setIsNewModalOpen(false);
      loadData();
    } catch (e) {
      alert('Failed to register beneficiary');
    }
  };

  const filtered = beneficiaries.filter(b => {
    const matchesSearch = b.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          b.case_no.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          b.address.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || b.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-[#0f172a] font-display flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-600 text-white shadow-sm">
              <Home className="w-5 h-5" />
            </div>
            <span>Social Housing & Resettlement Registry</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Prioritization scoring, vulnerable family assessment, and socialized housing unit allocation.
          </p>
        </div>

        <Button
          size="sm"
          variant="success"
          leftIcon={<Plus className="w-4 h-4" />}
          onClick={() => setIsNewModalOpen(true)}
        >
          Enroll Beneficiary
        </Button>
      </div>

      {/* Resettlement Housing Villages Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-[#cbd5e1] p-5 bg-gradient-to-br from-emerald-50/60 to-white">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[10px] uppercase font-bold text-emerald-700 tracking-wider">Social Housing Phase 1</span>
              <h3 className="text-base font-bold text-slate-900 mt-0.5">Villa Esperanza Resettlement Village</h3>
              <p className="text-xs text-slate-500">Purok 4 Civic Sector • 120 Total Units</p>
            </div>
            <Badge variant="success">88% Occupied</Badge>
          </div>
          <div className="mt-4 space-y-1.5">
            <div className="flex justify-between text-xs font-semibold">
              <span className="text-slate-600">Allocated Units:</span>
              <span className="text-emerald-700">106 / 120 Units</span>
            </div>
            <div className="w-full h-2 bg-emerald-100 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-600 rounded-full" style={{ width: '88%' }}></div>
            </div>
          </div>
        </Card>

        <Card className="border-[#cbd5e1] p-5 bg-gradient-to-br from-blue-50/60 to-white">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[10px] uppercase font-bold text-blue-700 tracking-wider">Social Housing Phase 2</span>
              <h3 className="text-base font-bold text-slate-900 mt-0.5">Bagong Pag-asa Resettlement Complex</h3>
              <p className="text-xs text-slate-500">Mindanao Sector • 200 Total Units (Under Construction)</p>
            </div>
            <Badge variant="info">Waitlist Active</Badge>
          </div>
          <div className="mt-4 space-y-1.5">
            <div className="flex justify-between text-xs font-semibold">
              <span className="text-slate-600">Pre-Qualified Beneficiaries:</span>
              <span className="text-blue-700">142 Waitlisted</span>
            </div>
            <div className="w-full h-2 bg-blue-100 rounded-full overflow-hidden">
              <div className="h-full bg-blue-600 rounded-full" style={{ width: '71%' }}></div>
            </div>
          </div>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white p-3.5 rounded-2xl border border-slate-200 shadow-soft">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search beneficiary name, case no..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-600 focus:bg-white text-slate-800"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
          {['all', 'Allocated', 'Qualified', 'Waitlisted'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                statusFilter === st
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
              }`}
            >
              {st === 'all' ? 'All Records' : st}
            </button>
          ))}
        </div>
      </div>

      {/* Beneficiaries Table */}
      <Card className="border-[#cbd5e1]">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Case No</th>
                  <th className="py-3 px-4">Beneficiary Name</th>
                  <th className="py-3 px-4">Origin Address</th>
                  <th className="py-3 px-4">Family / Income</th>
                  <th className="py-3 px-4">Priority Score</th>
                  <th className="py-3 px-4">Allocated Unit</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filtered.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-emerald-700">
                      {b.case_no}
                    </td>
                    <td className="py-3.5 px-4">
                      <p className="font-bold text-slate-800">{b.full_name}</p>
                      <p className="text-[10px] text-slate-500">{b.contact_no}</p>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 max-w-[180px] truncate">
                      {b.address}
                    </td>
                    <td className="py-3.5 px-4 text-slate-700">
                      <p>{b.family_members} Members</p>
                      <p className="text-[10px] text-slate-400">₱{parseFloat(b.monthly_income?.toString() || '0').toLocaleString()} / mo</p>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1 font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                        <Award className="w-3 h-3 text-emerald-600" />
                        {b.priority_score} pts
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-800">
                      {b.unit_no ? (
                        <div>
                          <p className="font-bold text-slate-900">{b.unit_no}</p>
                          <p className="text-[10px] text-slate-500 truncate max-w-[140px]">{b.allocated_project}</p>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">Unassigned</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <Badge
                        variant={
                          b.status === 'Allocated' ? 'success' :
                          b.status === 'Qualified' ? 'info' : 'warning'
                        }
                      >
                        {b.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Modal: Enroll Beneficiary */}
      <Modal
        isOpen={isNewModalOpen}
        onClose={() => setIsNewModalOpen(false)}
        title="Enroll Social Housing Beneficiary"
        description="Register family for urban poor housing and resettlement prioritization."
      >
        <form onSubmit={handleCreate} className="space-y-3 text-xs">
          <Input
            label="Head of Family Full Name *"
            required
            placeholder="Juanita Mendoza"
            value={newForm.full_name}
            onChange={(e) => setNewForm({ ...newForm, full_name: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Contact Phone Number *"
              required
              placeholder="+63 917 000 0000"
              value={newForm.contact_no}
              onChange={(e) => setNewForm({ ...newForm, contact_no: e.target.value })}
            />
            <Input
              label="Monthly Household Income (₱) *"
              type="number"
              required
              value={newForm.monthly_income}
              onChange={(e) => setNewForm({ ...newForm, monthly_income: e.target.value })}
            />
          </div>
          <Input
            label="Current Vulnerable / Origin Address *"
            required
            placeholder="Sitio Creek, Barangay 178"
            value={newForm.address}
            onChange={(e) => setNewForm({ ...newForm, address: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Family Dependents Count"
              type="number"
              value={newForm.family_members}
              onChange={(e) => setNewForm({ ...newForm, family_members: e.target.value })}
            />
            <Input
              label="Priority Vulnerability Score (1-100)"
              type="number"
              value={newForm.priority_score}
              onChange={(e) => setNewForm({ ...newForm, priority_score: e.target.value })}
            />
          </div>
          <div className="pt-3 flex justify-end gap-2">
            <Button size="sm" variant="outline" type="button" onClick={() => setIsNewModalOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" variant="success" type="submit">
              Complete Enrollment
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
