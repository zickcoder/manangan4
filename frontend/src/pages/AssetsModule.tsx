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
  Eye,
  Trash2,
  Upload,
  FileText,
  Image as ImageIcon,
  X
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { fetchAssets, updateAssetCondition, createAsset, deleteAsset } from '../lib/api';
import { compressImage } from '../lib/imageCompressor';
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
  const [maintenanceImage, setMaintenanceImage] = useState('');

  const [newForm, setNewForm] = useState({
    name: '',
    category: 'Service Vehicle',
    serial_no: '',
    purchase_date: new Date().toISOString().split('T')[0],
    purchase_cost: '1500000',
    current_condition: 'Operational',
    assigned_department: 'Disaster & Utility Response',
    next_maintenance_due: new Date(Date.now() + 90 * 86400000).toISOString().split('T')[0],
    image_url: '',
    specs: '',
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
    // Listen for data updates (e.g. from other modules or sync events)
    const handleExternalUpdate = () => loadData();
    window.addEventListener('govserve_data_updated', handleExternalUpdate);
    return () => {
      window.removeEventListener('govserve_data_updated', handleExternalUpdate);
    };
  }, [categoryFilter]);

  const handleDeleteAsset = async (id: number) => {
    if (confirm('Are you sure you want to delete this asset from the inventory?')) {
      try {
        await deleteAsset(id);
        setAssets(prev => prev.filter(a => a.id !== id));
      } catch (e) {
        alert('Failed to delete asset. Please try again.');
      }
    }
  };

  const handleUpdate = async () => {
    if (!selectedAsset) return;
    try {
      const resolvedImage = maintenanceImage === '__clear__' ? '' : (maintenanceImage || selectedAsset.image_url);
      // Optimistic update: update local state immediately
      setAssets(prev => prev.map(a =>
        (a.id === selectedAsset.id || String(a.id) === String(selectedAsset.id))
          ? { ...a, current_condition: newCondition, next_maintenance_due: nextDue, ai_maintenance_alert: maintenanceAlert, image_url: resolvedImage }
          : a
      ));
      setIsUpdateModalOpen(false);
      // Background sync (non-blocking)
      updateAssetCondition(selectedAsset.id, newCondition, nextDue, maintenanceAlert, resolvedImage);
    } catch (e) {
      alert('Failed to update asset');
    }
  };

  const handleMaintenanceImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImage(file);
      setMaintenanceImage(compressed);
    } catch {
      alert('Could not process image file.');
    } finally {
      e.target.value = '';
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const result = await createAsset(newForm);
      // Optimistic: add to state immediately so it appears even before server sync
      if (result?.data) {
        setAssets(prev => [result.data, ...prev]);
      }
      setIsNewModalOpen(false);
      // Reset form
      setNewForm({
        name: '',
        category: 'Service Vehicle',
        serial_no: '',
        purchase_date: new Date().toISOString().split('T')[0],
        purchase_cost: '1500000',
        current_condition: 'Operational',
        assigned_department: 'Disaster & Utility Response',
        next_maintenance_due: new Date(Date.now() + 90 * 86400000).toISOString().split('T')[0],
        image_url: '',
        specs: '',
      });
      // Refresh from store after a short delay to pick up any server-synced ID
      setTimeout(() => loadData(), 1500);
    } catch (e) {
      alert('Failed to register asset. Please check your connection and try again.');
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
            Government vehicle fleet, heavy backhoes, emergency water pumps, generators, and routine maintenance logs.
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
          <Card key={asset.id} hoverEffect className="border-[#cbd5e1] overflow-hidden p-0 space-y-0">
            {asset.image_url ? (
              <div className="w-full h-40 bg-slate-100 relative overflow-hidden border-b border-slate-200">
                <img src={asset.image_url} alt={asset.name} className="w-full h-full object-cover" />
                <div className="absolute top-2.5 left-2.5">
                  <span className="font-mono text-[11px] font-bold text-amber-900 bg-white/95 px-2 py-0.5 rounded shadow-sm border border-amber-200">
                    {asset.asset_tag}
                  </span>
                </div>
                <div className="absolute top-2.5 right-2.5">
                  <Badge variant={asset.current_condition === 'Operational' ? 'success' : 'warning'}>
                    {asset.current_condition}
                  </Badge>
                </div>
              </div>
            ) : null}

            <div className="p-5 space-y-3">
              {!asset.image_url && (
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
              )}

              {asset.image_url && (
                <div>
                  <h3 className="text-base font-bold text-slate-900">{asset.name}</h3>
                  <p className="text-[11px] text-slate-500">{asset.category} • {asset.assigned_department}</p>
                </div>
              )}

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

            {/* Specs Information */}
            {asset.specs && (
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
                <div className="flex items-center gap-1.5 text-slate-700 font-bold">
                  <FileText className="w-3.5 h-3.5 text-amber-600" />
                  <span>Technical Specifications:</span>
                </div>
                <p className="text-[11px] text-slate-600 whitespace-pre-line leading-relaxed">{asset.specs}</p>
              </div>
            )}

            {/* Maintenance Diagnostic Note */}
            {asset.ai_maintenance_alert && (
              <div className="p-3 bg-amber-50/70 rounded-xl border border-amber-200 text-xs space-y-1">
                <div className="flex items-center gap-1.5 text-amber-800 font-bold">
                  <Wrench className="w-3.5 h-3.5 text-amber-600" />
                  <span>Maintenance Diagnostic Log:</span>
                </div>
                <p className="text-[11px] text-slate-700">{asset.ai_maintenance_alert}</p>
              </div>
            )}

              <div className="pt-2 flex items-center justify-end gap-2">
                <Button
                  size="sm"
                  variant="destructive"
                  leftIcon={<Trash2 className="w-3.5 h-3.5" />}
                  onClick={() => handleDeleteAsset(asset.id)}
                >
                  Delete Unit
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  leftIcon={<Wrench className="w-3.5 h-3.5" />}
                  onClick={() => {
                    setSelectedAsset(asset);
                    setNewCondition(asset.current_condition);
                    setNextDue(asset.next_maintenance_due || '');
                    setMaintenanceAlert(asset.ai_maintenance_alert || '');
                    setMaintenanceImage('');
                    setIsUpdateModalOpen(true);
                  }}
                >
                  Log Maintenance
                </Button>
              </div>
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

            {/* Asset Image Edit */}
            {(() => {
              const effectiveImage = maintenanceImage === '__clear__' ? '' : (maintenanceImage || selectedAsset.image_url || '');
              return (
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-[#334155]">Asset Image (Preview & Replace)</label>
                  {effectiveImage ? (
                    <div className="space-y-2">
                      <div className="relative w-full h-36 rounded-xl overflow-hidden border border-slate-200 bg-slate-900/5 shadow-xs">
                        <img
                          src={effectiveImage}
                          alt="Asset preview"
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => setMaintenanceImage('__clear__')}
                          className="absolute top-2 right-2 p-1.5 flex items-center justify-center bg-black/70 hover:bg-black text-white rounded-lg text-xs shadow-md transition-all cursor-pointer"
                          title="Remove Image"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 rounded-xl text-xs font-bold cursor-pointer transition-colors shadow-xs">
                          <Upload className="w-3.5 h-3.5 text-amber-600" />
                          <span>Replace Image...</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleMaintenanceImageUpload}
                            className="hidden"
                          />
                        </label>
                        <button
                          type="button"
                          onClick={() => setMaintenanceImage('__clear__')}
                          className="px-2.5 py-1.5 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 rounded-xl transition-colors font-medium cursor-pointer"
                        >
                          Remove Photo
                        </button>
                      </div>
                    </div>
                  ) : (
                    <label className="flex items-center gap-2.5 p-3 border-2 border-dashed border-amber-300 rounded-xl bg-amber-50/40 hover:bg-amber-50 cursor-pointer text-slate-700 transition-all">
                      <div className="p-1.5 rounded-lg bg-amber-100 text-amber-700">
                        <Upload className="w-4 h-4" />
                      </div>
                      <div className="text-left">
                        <p className="text-xs font-bold text-slate-800">Upload new asset image...</p>
                        <p className="text-[10px] text-slate-500">JPG, PNG or WEBP (auto-compressed)</p>
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleMaintenanceImageUpload}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              );
            })()}

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
              <label className="block text-xs font-semibold text-[#334155] mb-1">Maintenance Diagnostic & Inspection Notes:</label>
              <textarea
                rows={3}
                value={maintenanceAlert}
                onChange={(e) => setMaintenanceAlert(e.target.value)}
                placeholder="Log diagnostic findings, replaced components, routine oil/filter change, or mechanical inspection remarks..."
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

          <div>
            <label className="block text-xs font-semibold text-[#334155] mb-1">Technical Specifications & Details</label>
            <textarea
              rows={2}
              placeholder="e.g. 5,000L Stainless Water Tank, 4x4 Diesel Turbo Engine, High-Pressure Fire/Water Pump 150 PSI"
              value={newForm.specs}
              onChange={(e) => setNewForm({ ...newForm, specs: e.target.value })}
              className="w-full rounded-xl border border-slate-300 p-2.5 text-xs focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-[#334155]">Asset Unit Image</label>
            {newForm.image_url ? (
              <div className="relative w-full h-28 rounded-xl overflow-hidden border border-slate-200 bg-slate-50 shadow-xs">
                <img src={newForm.image_url} alt="Asset preview" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => setNewForm(prev => ({ ...prev, image_url: '' }))}
                  className="absolute top-1.5 right-1.5 w-6 h-6 flex items-center justify-center bg-black/70 hover:bg-black text-white rounded-full text-xs font-bold shadow-sm cursor-pointer"
                  title="Remove Image"
                >
                  ✕
                </button>
              </div>
            ) : (
              <label className="flex items-center gap-2.5 p-3 border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 hover:bg-slate-100 cursor-pointer text-slate-600 transition-all">
                <Upload className="w-4 h-4 text-amber-500 shrink-0" />
                <div>
                  <span className="text-xs font-semibold text-slate-800 block">Upload asset image...</span>
                  <span className="text-[10px] text-slate-400">JPG, PNG, WEBP (auto-compressed)</span>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      try {
                        const compressed = await compressImage(file);
                        setNewForm(prev => ({ ...prev, image_url: compressed }));
                      } catch {
                        alert('Could not process image file.');
                      } finally {
                        e.target.value = '';
                      }
                    }
                  }}
                />
              </label>
            )}
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
