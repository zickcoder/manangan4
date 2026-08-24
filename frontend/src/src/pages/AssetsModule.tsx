import React, { useState, useEffect } from 'react';
import { 
  Wrench, 
  Search, 
  Plus, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Sparkles, 
  Truck, 
  ShieldCheck, 
  Eye 
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { fetchAssets, updateAssetCondition, createAsset } from '../lib/api';
import { Asset } from '../types';

export function AssetsModule() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);

  const [newCondition, setNewCondition] = useState('Operational');
  const [nextDue, setNextDue] = useState(new Date(Date.now() + 90 * 86400000).toISOString().split('T')[0]);
  const [maintenanceAlert, setMaintenanceAlert] = useState('');

  const [newForm, setNewForm] = useState({
    name: '',
    category: 'Service Vehicle',
    serial_no: '',
    purchase_date: new Date().toISOString().split('T')[0],
    purchase_cost: '1500000',
    current_condition: 'Operational',
    assigned_department: 'Disaster & Utility Response',
    next_maintenance_due: new Date(Date.now() + 90 * 86400000).toISOString().split('T')[0],
  });

  const loadData = async () => {
    try {
      const data = await fetchAssets(categoryFilter, 'all');
      setAssets(data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadData();
  }, [categoryFilter]);

  const handleUpdate = async () => {
    if (!selectedAsset) return;
    try {
      await updateAssetCondition(selectedAsset.id, newCondition, nextDue, maintenanceAlert);
      setIsUpdateModalOpen(false);
      loadData();
    } catch (e) {
      alert('Failed to update asset');
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createAsset(newForm);
      setIsNewModalOpen(false);
      loadData();
    } catch (e) {
      alert('Failed to register asset');
    }
  };

  const filtered = assets.filter(a =>
    a.asset_tag.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.assigned_department.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-[#0f172a] font-display flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500 text-white shadow-sm">
              <Wrench className="w-5 h-5" />
            </div>
            <span>Asset Inventory Management & Maintenance Lifecycle</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Government vehicle fleet, heavy backhoes, emergency water pumps, generators, and predictive health alerts.
          </p>
        </div>

        <Button
          size="sm"
          variant="primary"
          className="bg-amber-500 hover:bg-amber-600 font-bold text-white"
          leftIcon={<Plus className="w-4 h-4" />}
          onClick={() => setIsNewModalOpen(true)}
        >
          Register Asset Unit
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white p-3.5 rounded-2xl border border-slate-200 shadow-soft">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search asset tag, model, serial..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-amber-500 focus:bg-white text-slate-800"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
          {['all', 'Heavy Equipment', 'Service Vehicle', 'Water Pump & Generator', 'Facility Equipment'].map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                categoryFilter === cat
                  ? 'bg-amber-500 text-white shadow-sm'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
              }`}
            >
              {cat === 'all' ? 'All Categories' : cat}
            </button>
          ))}
        </div>
      </div>

      {/* Assets Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map((asset) => (
          <Card key={asset.id} hoverEffect className="border-[#cbd5e1] p-5 space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <span className="font-mono text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                  {asset.asset_tag}
                </span>
                <h3 className="text-base font-bold text-slate-900 mt-1">{asset.name}</h3>
                <p className="text-[11px] text-slate-500">{asset.category} • {asset.assigned_department}</p>
              </div>
              <Badge variant={asset.current_condition === 'Operational' ? 'success' : 'warning'}>
                {asset.current_condition}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-200">
              <div>
                <span className="text-[10px] text-slate-400 block">Acquisition Valuation:</span>
                <span className="font-bold text-slate-800">₱{parseFloat(asset.purchase_cost.toString()).toLocaleString()}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">Next Service Due:</span>
                <span className="font-bold text-slate-800">{new Date(asset.next_maintenance_due || '').toLocaleDateString()}</span>
              </div>
            </div>

            {/* AI Maintenance Alert */}
            {asset.ai_maintenance_alert && (
              <div className="p-3 bg-amber-50/70 rounded-xl border border-amber-200 text-xs space-y-1">
                <div className="flex items-center gap-1.5 text-amber-800 font-bold">
                  <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                  <span>AI Predictive Health Diagnostic:</span>
                </div>
                <p className="text-[11px] text-slate-700">{asset.ai_maintenance_alert}</p>
              </div>
            )}

            <div className="pt-2 flex justify-end">
              <Button
                size="sm"
                variant="secondary"
                leftIcon={<Wrench className="w-3.5 h-3.5" />}
                onClick={() => {
                  setSelectedAsset(asset);
                  setNewCondition(asset.current_condition);
                  setNextDue(asset.next_maintenance_due || '');
                  setMaintenanceAlert(asset.ai_maintenance_alert || '');
                  setIsUpdateModalOpen(true);
                }}
              >
                Log Maintenance
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {/* Modal: Update Condition */}
      <Modal
        isOpen={isUpdateModalOpen}
        onClose={() => setIsUpdateModalOpen(false)}
        title={`Maintenance Log: ${selectedAsset?.asset_tag}`}
        description="Update operational state and schedule next overhaul."
      >
        {selectedAsset && (
          <div className="space-y-4 text-xs">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <h4 className="font-bold text-slate-800">{selectedAsset.name}</h4>
              <p className="text-slate-500">{selectedAsset.assigned_department}</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#334155] mb-1">Operational Condition</label>
              <select
                value={newCondition}
                onChange={(e) => setNewCondition(e.target.value as any)}
                className="w-full rounded-xl border border-slate-300 p-2 text-xs"
              >
                <option value="Operational">Operational (Ready for Duty)</option>
                <option value="Needs Maintenance">Needs Maintenance (Scheduled)</option>
                <option value="Under Repair">Under Repair (In Workshop)</option>
                <option value="Decommissioned">Decommissioned</option>
              </select>
            </div>

            <Input
              label="Next Routine Maintenance Due Date"
              type="date"
              value={nextDue}
              onChange={(e) => setNextDue(e.target.value)}
            />

            <div>
              <label className="block text-xs font-semibold text-[#334155] mb-1">Maintenance Diagnostic Log / AI Notes:</label>
              <textarea
                rows={3}
                value={maintenanceAlert}
                onChange={(e) => setMaintenanceAlert(e.target.value)}
                className="w-full rounded-xl border border-slate-300 p-2 text-xs"
              />
            </div>

            <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
              <Button size="sm" variant="outline" onClick={() => setIsUpdateModalOpen(false)}>
                Cancel
              </Button>
              <Button size="sm" variant="primary" onClick={handleUpdate}>
                Save Maintenance Record
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal: New Asset */}
      <Modal
        isOpen={isNewModalOpen}
        onClose={() => setIsNewModalOpen(false)}
        title="Register Government Asset Unit"
        description="Add municipal vehicle, backhoe, pump, or generator to registry."
      >
        <form onSubmit={handleCreate} className="space-y-3 text-xs">
          <Input
            label="Asset / Equipment Name *"
            required
            placeholder="e.g. Isuzu 5000L Water Response Tanker"
            value={newForm.name}
            onChange={(e) => setNewForm({ ...newForm, name: e.target.value })}
          />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#334155] mb-1">Category *</label>
              <select
                value={newForm.category}
                onChange={(e) => setNewForm({ ...newForm, category: e.target.value as any })}
                className="w-full rounded-xl border border-slate-300 p-2 text-xs"
              >
                <option value="Heavy Equipment">Heavy Equipment (Backhoes, Loaders)</option>
                <option value="Service Vehicle">Service Vehicle (Tankers, Rescues)</option>
                <option value="Water Pump & Generator">Water Pump & Generator</option>
                <option value="Facility Equipment">Facility Equipment (Aircon, Sound)</option>
              </select>
            </div>
            <Input
              label="Serial / Chassis Number"
              placeholder="CAT-420F-9912"
              value={newForm.serial_no}
              onChange={(e) => setNewForm({ ...newForm, serial_no: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Acquisition Cost (₱) *"
              type="number"
              required
              value={newForm.purchase_cost}
              onChange={(e) => setNewForm({ ...newForm, purchase_cost: e.target.value })}
            />
            <Input
              label="Assigned Department *"
              required
              placeholder="Disaster & Utility Response"
              value={newForm.assigned_department}
              onChange={(e) => setNewForm({ ...newForm, assigned_department: e.target.value })}
            />
          </div>

          <div className="pt-3 flex justify-end gap-2">
            <Button size="sm" variant="outline" type="button" onClick={() => setIsNewModalOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" variant="primary" type="submit">
              Register Asset
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
