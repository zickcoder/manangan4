import React, { useState, useEffect } from 'react';
import { 
  Wrench, 
  Search, 
  Plus, 
  CheckCircle2, 
  AlertTriangle, 
  Upload,
  FileText,
  X,
  Trash2,
  Info
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { fetchAssets, updateAssetCondition, createAsset, deleteAsset } from '../lib/api';
import { compressImage } from '../lib/imageCompressor';
import { Asset } from '../types';

// ─── Toast component ──────────────────────────────────────────────────────────
function Toast({ message, type, onDismiss }: { message: string; type: 'success' | 'error'; onDismiss: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 4000);
    return () => clearTimeout(t);
  }, [onDismiss]);
  return (
    <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-2xl shadow-large text-sm font-semibold animate-fade-in-up border ${
      type === 'success'
        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
        : 'bg-red-50 text-red-800 border-red-200'
    }`}>
      {type === 'success'
        ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
        : <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
      }
      <span>{message}</span>
      <button onClick={onDismiss} className="ml-2 text-slate-400 hover:text-slate-600 cursor-pointer">
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

// ─── Default blank form ───────────────────────────────────────────────────────
const BLANK_FORM = () => ({
  name: '',
  category: 'Service Vehicle' as string,
  serial_no: '',
  purchase_date: new Date().toISOString().split('T')[0],
  purchase_cost: '',
  current_condition: 'Operational',
  assigned_department: '',
  next_maintenance_due: new Date(Date.now() + 90 * 86400000).toISOString().split('T')[0],
  image_url: '',
  specs: '',
});

export function AssetsModule() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);

  // Maintenance modal state
  const [newCondition, setNewCondition] = useState('Operational');
  const [nextDue, setNextDue] = useState(new Date(Date.now() + 90 * 86400000).toISOString().split('T')[0]);
  const [maintenanceAlert, setMaintenanceAlert] = useState('');
  const [maintenanceImage, setMaintenanceImage] = useState('');
  const [savingMaintenance, setSavingMaintenance] = useState(false);

  // New asset form state
  const [newForm, setNewForm] = useState(BLANK_FORM);
  const [newFormError, setNewFormError] = useState('');
  const [creatingAsset, setCreatingAsset] = useState(false);

  // Toast
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const showToast = (message: string, type: 'success' | 'error' = 'success') => setToast({ message, type });

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
    const handleExternalUpdate = () => loadData();
    window.addEventListener('govserve_data_updated', handleExternalUpdate);
    return () => {
      window.removeEventListener('govserve_data_updated', handleExternalUpdate);
    };
  }, [categoryFilter]);

  // ─── Validate & create new asset ────────────────────────────────────────────
  const handleCreate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setNewFormError('');

    // Required field validation
    const name = newForm.name.trim();
    const dept = newForm.assigned_department.trim();
    const cost = parseFloat(String(newForm.purchase_cost));

    if (!name) {
      setNewFormError('Asset / Equipment Name is required.');
      return;
    }
    if (!dept) {
      setNewFormError('Assigned Department is required.');
      return;
    }
    if (!newForm.purchase_cost || isNaN(cost) || cost <= 0) {
      setNewFormError('Please enter a valid Acquisition Cost (must be greater than 0).');
      return;
    }
    if (!newForm.purchase_date) {
      setNewFormError('Purchase / Acquisition Date is required.');
      return;
    }
    if (!newForm.next_maintenance_due) {
      setNewFormError('Next Maintenance Due Date is required.');
      return;
    }

    setCreatingAsset(true);
    try {
      const result = await createAsset({ ...newForm, name, assigned_department: dept, purchase_cost: cost });
      const assetName = name;
      setIsNewModalOpen(false);
      setNewForm(BLANK_FORM());
      setNewFormError('');
      // Add to UI immediately
      if (result?.data) {
        setAssets(prev => {
          const exists = prev.some(a => String(a.id) === String(result.data.id) || a.asset_tag === result.data.asset_tag);
          return exists ? prev : [result.data, ...prev];
        });
      }
      showToast(`✅ Asset "${assetName}" registered successfully!`);
    } catch (e) {
      console.error('createAsset error:', e);
      showToast('Failed to register asset. Please try again.', 'error');
    } finally {
      setCreatingAsset(false);
    }
  };

  // ─── Save maintenance log ────────────────────────────────────────────────────
  const handleUpdate = async () => {
    if (!selectedAsset) return;
    setSavingMaintenance(true);
    try {
      const resolvedImage = maintenanceImage === '__clear__' ? '' : (maintenanceImage || selectedAsset.image_url);
      // Optimistic update local state immediately
      setAssets(prev => prev.map(a =>
        (a.id === selectedAsset.id || String(a.id) === String(selectedAsset.id))
          ? { ...a, current_condition: newCondition, next_maintenance_due: nextDue, ai_maintenance_alert: maintenanceAlert, image_url: resolvedImage }
          : a
      ));
      setIsUpdateModalOpen(false);
      // Background sync
      await updateAssetCondition(selectedAsset.id, newCondition, nextDue, maintenanceAlert, resolvedImage);
      showToast('✅ Maintenance record saved successfully!');
    } catch (e) {
      showToast('Failed to save maintenance record.', 'error');
    } finally {
      setSavingMaintenance(false);
    }
  };

  // ─── Delete asset ─────────────────────────────────────────────────────────
  const handleDeleteAsset = async (id: number) => {
    if (!confirm('Are you sure you want to delete this asset from the inventory?')) return;
    try {
      setAssets(prev => prev.filter(a => a.id !== id));
      await deleteAsset(id);
      showToast('Asset removed from inventory.');
    } catch (e) {
      showToast('Failed to delete asset. Please try again.', 'error');
    }
  };

  // ─── Image upload handler (maintenance modal) ─────────────────────────────
  const handleMaintenanceImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImage(file);
      setMaintenanceImage(compressed);
    } catch {
      showToast('Could not process image file.', 'error');
    } finally {
      e.target.value = '';
    }
  };

  // ─── Image upload handler (new asset form) ────────────────────────────────
  const handleNewAssetImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImage(file);
      setNewForm(prev => ({ ...prev, image_url: compressed }));
    } catch {
      showToast('Could not process image file.', 'error');
    } finally {
      e.target.value = '';
    }
  };

  const filtered = assets.filter(a =>
    a.asset_tag.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.assigned_department.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Toast */}
      {toast && (
        <Toast message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-[#0f172a] font-display flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500 text-white shadow-sm">
              <Wrench className="w-5 h-5" />
            </div>
            <span>Asset Inventory Management &amp; Maintenance Lifecycle</span>
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
          onClick={() => { setNewForm(BLANK_FORM()); setNewFormError(''); setIsNewModalOpen(true); }}
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
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-slate-400">
          <Wrench className="w-10 h-10 mb-3 opacity-30" />
          <p className="text-sm font-semibold">No assets found</p>
          <p className="text-xs mt-1">Try a different search or category filter, or register a new asset.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((asset) => (
            <Card key={asset.id} hoverEffect className="border-[#cbd5e1] overflow-hidden p-0 space-y-0">
              {/* Asset image */}
              {asset.image_url && (asset.image_url.startsWith('data:') || asset.image_url.startsWith('http')) ? (
                <div className="w-full h-40 bg-slate-100 relative overflow-hidden border-b border-slate-200">
                  <img
                    src={asset.image_url}
                    alt={asset.name}
                    className="w-full h-full object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
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
                {/* Header row when no image */}
                {(!asset.image_url || (!asset.image_url.startsWith('data:') && !asset.image_url.startsWith('http'))) && (
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

                {/* Name/dept when image IS shown */}
                {asset.image_url && (asset.image_url.startsWith('data:') || asset.image_url.startsWith('http')) && (
                  <div>
                    <h3 className="text-base font-bold text-slate-900">{asset.name}</h3>
                    <p className="text-[11px] text-slate-500">{asset.category} • {asset.assigned_department}</p>
                  </div>
                )}

                {/* Info grid */}
                <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Acquisition Valuation:</span>
                    <span className="font-bold text-slate-800">₱{parseFloat(asset.purchase_cost?.toString() || '0').toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Next Service Due:</span>
                    <span className="font-bold text-slate-800">
                      {asset.next_maintenance_due ? new Date(asset.next_maintenance_due).toLocaleDateString() : '—'}
                    </span>
                  </div>
                </div>

                {/* Specs */}
                {asset.specs && (
                  <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
                    <div className="flex items-center gap-1.5 text-slate-700 font-bold">
                      <FileText className="w-3.5 h-3.5 text-amber-600" />
                      <span>Technical Specifications:</span>
                    </div>
                    <p className="text-[11px] text-slate-600 whitespace-pre-line leading-relaxed">{asset.specs}</p>
                  </div>
                )}

                {/* Maintenance Notes */}
                {asset.ai_maintenance_alert && (
                  <div className="p-3 bg-amber-50/70 rounded-xl border border-amber-200 text-xs space-y-1">
                    <div className="flex items-center gap-1.5 text-amber-800 font-bold">
                      <Wrench className="w-3.5 h-3.5 text-amber-600" />
                      <span>Maintenance Diagnostic Log:</span>
                    </div>
                    <p className="text-[11px] text-slate-700">{asset.ai_maintenance_alert}</p>
                  </div>
                )}

                {/* Actions */}
                <div className="pt-2 flex items-center justify-end gap-2">
                  <Button
                    size="sm"
                    variant="danger"
                    leftIcon={<Trash2 className="w-3.5 h-3.5" />}
                    onClick={() => handleDeleteAsset(asset.id)}
                  >
                    Delete
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    leftIcon={<Wrench className="w-3.5 h-3.5" />}
                    onClick={() => {
                      setSelectedAsset(asset);
                      setNewCondition(asset.current_condition);
                      setNextDue(asset.next_maintenance_due || new Date(Date.now() + 90 * 86400000).toISOString().split('T')[0]);
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
      )}

      {/* ── Modal: Maintenance Log ─────────────────────────────────────────── */}
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
              const effectiveImage = maintenanceImage === '__clear__'
                ? ''
                : (maintenanceImage || selectedAsset.image_url || '');
              const isValidImage = effectiveImage.startsWith('data:') || effectiveImage.startsWith('http');
              return (
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-[#334155]">Asset Image (Preview &amp; Replace)</label>
                  {effectiveImage && isValidImage ? (
                    <div className="space-y-2">
                      <div className="relative w-full h-36 rounded-xl overflow-hidden border border-slate-200 bg-slate-900/5 shadow-xs">
                        <img
                          src={effectiveImage}
                          alt="Asset preview"
                          className="w-full h-full object-cover"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
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
                          <input type="file" accept="image/*" onChange={handleMaintenanceImageUpload} className="hidden" />
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
                        <p className="text-xs font-bold text-slate-800">Upload asset image...</p>
                        <p className="text-[10px] text-slate-500">JPG, PNG or WEBP (auto-compressed)</p>
                      </div>
                      <input type="file" accept="image/*" onChange={handleMaintenanceImageUpload} className="hidden" />
                    </label>
                  )}
                </div>
              );
            })()}

            <div>
              <label className="block text-xs font-semibold text-[#334155] mb-1">Operational Condition</label>
              <select
                value={newCondition}
                onChange={(e) => setNewCondition(e.target.value)}
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
              <label className="block text-xs font-semibold text-[#334155] mb-1">Maintenance Diagnostic &amp; Inspection Notes:</label>
              <textarea
                rows={3}
                value={maintenanceAlert}
                onChange={(e) => setMaintenanceAlert(e.target.value)}
                placeholder="Log diagnostic findings, replaced components, oil/filter change, or mechanical inspection remarks..."
                className="w-full rounded-xl border border-slate-300 p-2 text-xs"
              />
            </div>

            <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
              <Button size="sm" variant="outline" onClick={() => setIsUpdateModalOpen(false)} disabled={savingMaintenance}>
                Cancel
              </Button>
              <Button size="sm" variant="primary" onClick={handleUpdate} isLoading={savingMaintenance}>
                Save Maintenance Record
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Modal: Register New Asset ──────────────────────────────────────── */}
      <Modal
        isOpen={isNewModalOpen}
        onClose={() => { if (!creatingAsset) setIsNewModalOpen(false); }}
        title="Register Government Asset Unit"
        description="Complete all required fields (*) to add a municipal asset to the inventory."
      >
        <form onSubmit={handleCreate} noValidate className="space-y-3 text-xs">
          {/* Error banner */}
          {newFormError && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-semibold">
              <AlertTriangle className="w-4 h-4 shrink-0 text-red-500" />
              <span>{newFormError}</span>
            </div>
          )}

          {/* Required notice */}
          <div className="flex items-center gap-1.5 p-2.5 bg-blue-50 border border-blue-200 rounded-xl text-blue-700 text-[10px]">
            <Info className="w-3.5 h-3.5 shrink-0" />
            <span>All fields marked <strong>*</strong> are required before registering an asset.</span>
          </div>

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
                onChange={(e) => setNewForm({ ...newForm, category: e.target.value })}
                className="w-full rounded-xl border border-slate-300 p-2 text-xs"
              >
                <option value="Heavy Equipment">Heavy Equipment (Backhoes, Loaders)</option>
                <option value="Service Vehicle">Service Vehicle (Tankers, Rescues)</option>
                <option value="Water Pump & Generator">Water Pump &amp; Generator</option>
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
              min="1"
              placeholder="e.g. 1500000"
              value={newForm.purchase_cost}
              onChange={(e) => setNewForm({ ...newForm, purchase_cost: e.target.value })}
            />
            <Input
              label="Assigned Department *"
              required
              placeholder="e.g. Disaster & Utility Response"
              value={newForm.assigned_department}
              onChange={(e) => setNewForm({ ...newForm, assigned_department: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Purchase / Acquisition Date *"
              type="date"
              required
              value={newForm.purchase_date}
              onChange={(e) => setNewForm({ ...newForm, purchase_date: e.target.value })}
            />
            <Input
              label="Next Maintenance Due *"
              type="date"
              required
              value={newForm.next_maintenance_due}
              onChange={(e) => setNewForm({ ...newForm, next_maintenance_due: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#334155] mb-1">Initial Condition</label>
            <select
              value={newForm.current_condition}
              onChange={(e) => setNewForm({ ...newForm, current_condition: e.target.value })}
              className="w-full rounded-xl border border-slate-300 p-2 text-xs"
            >
              <option value="Operational">Operational (Ready for Duty)</option>
              <option value="Needs Maintenance">Needs Maintenance (Scheduled)</option>
              <option value="Under Repair">Under Repair (In Workshop)</option>
              <option value="Decommissioned">Decommissioned</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#334155] mb-1">Technical Specifications &amp; Details</label>
            <textarea
              rows={2}
              placeholder="e.g. 5,000L Stainless Water Tank, 4x4 Diesel Turbo Engine, High-Pressure Fire/Water Pump 150 PSI"
              value={newForm.specs}
              onChange={(e) => setNewForm({ ...newForm, specs: e.target.value })}
              className="w-full rounded-xl border border-slate-300 p-2.5 text-xs focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
            />
          </div>

          {/* Image upload */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-[#334155]">Asset Unit Image</label>
            {newForm.image_url && (newForm.image_url.startsWith('data:') || newForm.image_url.startsWith('http')) ? (
              <div className="relative w-full h-28 rounded-xl overflow-hidden border border-slate-200 bg-slate-50 shadow-xs">
                <img
                  src={newForm.image_url}
                  alt="Asset preview"
                  className="w-full h-full object-cover"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
                <button
                  type="button"
                  onClick={() => setNewForm(prev => ({ ...prev, image_url: '' }))}
                  className="absolute top-1.5 right-1.5 w-6 h-6 flex items-center justify-center bg-black/70 hover:bg-black text-white rounded-full text-xs font-bold shadow-sm cursor-pointer"
                  title="Remove Image"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <label className="flex items-center gap-2.5 p-3 border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 hover:bg-slate-100 cursor-pointer text-slate-600 transition-all">
                <Upload className="w-4 h-4 text-amber-500 shrink-0" />
                <div>
                  <span className="text-xs font-semibold text-slate-800 block">Upload asset image...</span>
                  <span className="text-[10px] text-slate-400">JPG, PNG, WEBP (auto-compressed to &lt;150KB)</span>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleNewAssetImageUpload}
                />
              </label>
            )}
          </div>

          <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
            <Button size="sm" variant="outline" type="button" onClick={() => setIsNewModalOpen(false)} disabled={creatingAsset}>
              Cancel
            </Button>
            <Button size="sm" variant="primary" type="submit" isLoading={creatingAsset}>
              Register Asset
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
