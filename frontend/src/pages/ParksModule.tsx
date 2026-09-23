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
  Sun,
  Pencil,
  Trash2,
  Package,
  Save,
  X,
  Upload,
  Image as ImageIcon,
  MapPin,
  ShieldCheck,
  ZoomIn,
  ExternalLink
} from 'lucide-react';
import { compressImage } from '../lib/imageCompressor';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { 
  fetchFacilities, 
  fetchReservations, 
  updateReservationStatus, 
  createFacility,
  updateFacility,
  deleteFacility,
  calculateFacilityFee,
  calculateBookingHours
} from '../lib/api';
import { Facility, FacilityReservation } from '../types';

import { StatusAnimationModal } from '../components/ui/StatusAnimationModal';

export function ParksModule() {
  const [parks, setParks] = useState<Facility[]>([]);
  const [reservations, setReservations] = useState<FacilityReservation[]>([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRes, setSelectedRes] = useState<FacilityReservation | null>(null);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [reviewRemarks, setReviewRemarks] = useState('');
  const [lightboxProof, setLightboxProof] = useState<{ url: string; title: string; applicant: string; ref: string } | null>(null);

  // Park CRUD
  const [isParkFormOpen, setIsParkFormOpen] = useState(false);
  const [editingPark, setEditingPark] = useState<Facility | null>(null);
  const [parkForm, setParkForm] = useState({
    name: '', category: 'Park & Recreation', capacity: '300', hourly_rate: '0',
    morning_rate: '0', afternoon_rate: '0',
    status: 'Available', amenities: '',
    location: 'Public Recreation Ground Sector',
    image_url: '',
    image_url_2: ''
  });

  const openAddPark = () => {
    setEditingPark(null);
    setParkForm({ name: '', category: 'Park & Recreation', capacity: '300', hourly_rate: '0', morning_rate: '0', afternoon_rate: '0', status: 'Available', amenities: '', location: 'Public Recreation Ground Sector', image_url: '', image_url_2: '' });
    setIsParkFormOpen(true);
  };

  const openEditPark = (p: Facility) => {
    setEditingPark(p);
    setParkForm({
      name: p.name,
      category: p.category,
      capacity: String(p.capacity),
      hourly_rate: String(p.hourly_rate),
      morning_rate: String((p as any).morning_rate ?? p.hourly_rate ?? 0),
      afternoon_rate: String((p as any).afternoon_rate ?? p.hourly_rate ?? 0),
      status: (p as any).status === 'Not Available' ? 'Not Available' : 'Available',
      amenities: p.amenities || '',
      location: p.location || 'Public Recreation Ground Sector',
      image_url: p.image_url || '',
      image_url_2: p.image_url_2 || ''
    });
    setIsParkFormOpen(true);
  };

  const handleParkImageUpload = async (file: File, imageKey: 'image_url' | 'image_url_2') => {
    try {
      const compressed = await compressImage(file);
      setParkForm(prev => ({ ...prev, [imageKey]: compressed }));
    } catch {
      alert('Failed to process image file. Please try another image.');
    }
  };

  const [isSavingPark, setIsSavingPark] = useState(false);

  const handleSavePark = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingPark(true);
    try {
      const morningRate = parseFloat(parkForm.morning_rate) || 0;
      const afternoonRate = parseFloat(parkForm.afternoon_rate) || 0;
      const payload = {
        ...parkForm,
        location: parkForm.location.trim() || 'Public Recreation Ground Sector',
        amenities: parkForm.amenities.trim() || 'Standard Park & Recreation Amenities',
        image_url: parkForm.image_url || null,
        image_url_2: parkForm.image_url_2 || null,
        capacity: parseInt(parkForm.capacity) || 100,
        hourly_rate: morningRate,
        morning_rate: morningRate,
        afternoon_rate: afternoonRate
      };
      if (editingPark) {
        await updateFacility(editingPark.id, payload);
      } else {
        await createFacility(payload);
      }
      setIsParkFormOpen(false);
      // govserve_data_updated event will trigger loadData automatically — no need to call it here
      setAnimModal({
        isOpen: true,
        type: 'success',
        title: editingPark ? '✓ Changes Saved' : '✓ Park Added',
        message: `${parkForm.name} has been successfully ${ editingPark ? 'updated' : 'added'}.`
      });
    } catch (err) {
      console.error('Error saving park:', err);
      setIsParkFormOpen(false);
      loadData();
    } finally {
      setIsSavingPark(false);
    }
  };

  const handleDeletePark = async (p: Facility) => {
    if (!window.confirm(`Delete "${p.name}"? This cannot be undone.`)) return;
    await deleteFacility(p.id);
    loadData();
  };

  // Status Animation Modal
  const [animModal, setAnimModal] = useState<{
    isOpen: boolean;
    type: 'loading' | 'success' | 'paid' | 'rejected';
    title: string;
    message: string;
  }>({
    isOpen: false,
    type: 'success',
    title: '',
    message: ''
  });


  const DEFAULT_PARKS_EQUIPMENT = [
    'Heavy-Duty Outdoor Tents (3x3m)',
    'Portable Sound System',
    'Foldable Tables & Canopies',
    'Portable Stage Platform',
    'Mobile Generator (5kVA)',
    'Safety Barricades & Crowd Control',
    'Trash Bins & Sanitation Supplies',
    'Sports Equipment Set (Basketball / Volleyball)',
  ];

  const loadEquipment = () => {
    try {
      const stored = localStorage.getItem('govserve_equipment_parks');
      if (stored) { const p = JSON.parse(stored); if (Array.isArray(p) && p.length > 0) return p; }
    } catch {}
    return DEFAULT_PARKS_EQUIPMENT;
  };

  const [equipmentList, setEquipmentList] = useState<string[]>(loadEquipment);
  const [newEquipItem, setNewEquipItem] = useState('');
  const [editingEquipIdx, setEditingEquipIdx] = useState<number | null>(null);
  const [editingEquipVal, setEditingEquipVal] = useState('');
  const [isEquipManagerOpen, setIsEquipManagerOpen] = useState(false);

  const saveEquipment = (list: string[]) => {
    setEquipmentList(list);
    // Store equipment locally only — do NOT dispatch govserve_data_updated
    // to avoid triggering unnecessary loadData network calls
    localStorage.setItem('govserve_equipment_parks', JSON.stringify(list));
  };

  const addEquipItem = () => {
    const val = newEquipItem.trim();
    if (!val || equipmentList.includes(val)) return;
    saveEquipment([...equipmentList, val]);
    setNewEquipItem('');
  };

  const deleteEquipItem = (idx: number) => {
    saveEquipment(equipmentList.filter((_, i) => i !== idx));
  };

  const saveEditEquipItem = (idx: number) => {
    const val = editingEquipVal.trim();
    if (!val) return;
    const updated = [...equipmentList];
    updated[idx] = val;
    saveEquipment(updated);
    setEditingEquipIdx(null);
  };

  const loadData = async () => {
    try {
      const [parkList, resList] = await Promise.all([
        fetchFacilities('Park & Recreation'),
        fetchReservations('all', 'Park & Recreation', false),
      ]);
      setParks(parkList);
      setReservations(resList);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadData();
    // Debounced event-driven refresh — prevents multiple rapid loadData calls
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    const handleUpdate = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => loadData(), 300);
    };
    window.addEventListener('govserve_data_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener('govserve_data_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
      if (debounceTimer) clearTimeout(debounceTimer);
    };
  }, [statusFilter]);

  const handleUpdateStatus = async (status: string) => {
    if (!selectedRes) return;
    try {
      setAnimModal({
        isOpen: true,
        type: 'loading',
        title: 'Processing Request...',
        message: 'Updating park scheduling status.'
      });

      const isLGU = 
        (selectedRes as any).activity_type === 'LGU Activity' || 
        (selectedRes as any).purpose?.includes('LGU Activity') ||
        (selectedRes as any).fee_amount === 0 ||
        Boolean((selectedRes as any).sponsorship_photo_url || (selectedRes as any).proof_url);
      const computedFee = calculateFacilityFee(selectedRes.start_time, selectedRes.end_time, selectedRes.hourly_rate || 0);
      const fee = isLGU ? 0 : ((selectedRes as any).fee_amount ?? computedFee ?? (selectedRes.hourly_rate ? selectedRes.hourly_rate * 4 : 1500));
      const dueDate = new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0];

      await updateReservationStatus(
        selectedRes.id,
        status,
        reviewRemarks || `Park schedule ${status}`,
        'Engr. Marcus Cruz',
        { fee_amount: fee, payment_due_date: dueDate }
      );

      setIsReviewModalOpen(false);
      // govserve_data_updated event from updateReservationStatus triggers debounced loadData automatically

      setTimeout(() => {
        if (status === 'LGU Endorsed') {
          setAnimModal({
            isOpen: true,
            type: 'paid',
            title: '🏛️ LGU Officially Endorsed!',
            message: `Reservation #${selectedRes.reference_no} is officially endorsed. LGU-sponsored — no payment required.`
          });
        } else if (status === 'Paid') {
          setAnimModal({
            isOpen: true,
            type: 'paid',
            title: '✓ Payment Approved & Official Receipt Issued!',
            message: `Park schedule #${selectedRes.reference_no} is now fully PAID.`
          });
        } else if (status === 'Pending Payment') {
          setAnimModal({
            isOpen: true,
            type: 'success',
            title: '✓ Granted — Waiting for Payment',
            message: `Billing notice issued for #${selectedRes.reference_no}.`
          });
        } else if (status === 'Rejected') {
          setAnimModal({
            isOpen: true,
            type: 'rejected',
            title: '✕ Schedule Rejected',
            message: `Park booking #${selectedRes.reference_no} has been marked as Rejected.`
          });
        } else {
          setAnimModal({
            isOpen: true,
            type: 'success',
            title: `✓ Status Updated to ${status}`,
            message: `Park booking updated successfully.`
          });
        }
      }, 200);
    } catch (e) {
      setAnimModal({
        isOpen: true,
        type: 'rejected',
        title: 'Error Occurred',
        message: 'Failed to update park schedule status.'
      });
    }
  };

  const filtered = (reservations || []).filter(r => {
    const q = (searchQuery || '').toLowerCase();
    const matchesQuery = 
      (r.reference_no || '').toLowerCase().includes(q) ||
      (r.applicant_name || '').toLowerCase().includes(q) ||
      (r.purpose || '').toLowerCase().includes(q) ||
      ((r as any).event_name || '').toLowerCase().includes(q) ||
      (r.facility_name || '').toLowerCase().includes(q);
    
    if (!matchesQuery) return false;

    const rProof = (r as any).sponsorship_photo_url || (r as any).proof_url || (r as any).photo_url;
    const isLGU = 
      r.status === 'LGU Endorsed' ||
      (r as any).activity_type === 'LGU Activity' ||
      ((r as any).purpose || '').toLowerCase().includes('lgu activity') ||
      ((r as any).event_name || '').toLowerCase().includes('lgu') ||
      (r as any).fee_amount === 0 ||
      (r as any).fee_amount === '0.00' ||
      (r as any).fee_amount === '0' ||
      Boolean(rProof);

    if (statusFilter === 'all') return true;
    if (statusFilter === 'Pending Review') {
      return r.status === 'Pending' || r.status === 'Pending Review';
    }
    // Only in 🏛️ LGU Officially Endorsed filter: show ALL LGU grant free payment / LGU sponsored tickets
    if (statusFilter === 'LGU Endorsed') {
      return r.status === 'LGU Endorsed' || (isLGU && (r.status === 'Approved' || r.status === 'Paid'));
    }
    // NOT in Paid filter: LGU tickets must NEVER appear in the Paid filter
    if (statusFilter === 'Paid') {
      return r.status === 'Paid' && !isLGU && r.status !== 'LGU Endorsed';
    }
    // In Approved filter: only regular non-LGU approved bookings
    if (statusFilter === 'Approved') {
      return r.status === 'Approved' && !isLGU && r.status !== 'LGU Endorsed';
    }
    return r.status === statusFilter;
  });

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
        <button
          onClick={openAddPark}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm transition-colors shrink-0"
        >
          <Plus className="w-4 h-4" /> Add New Park / Ground
        </button>
      </div>

      {/* Parks Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {parks.map((p) => {
              const mRate = Number((p as any).morning_rate ?? p.hourly_rate ?? 0);
              const aRate = Number((p as any).afternoon_rate ?? p.hourly_rate ?? 0);
              const isAvail = ((p as any).status || 'Available') === 'Available';
              return (
                <Card key={p.id} hoverEffect className="border-slate-200/90 p-0 overflow-hidden bg-white shadow-soft rounded-2xl flex flex-col justify-between transition-all">
                  <div>
                    {p.image_url ? (
                      <div className="relative h-36 w-full overflow-hidden bg-slate-900 group">
                        <img
                          src={p.image_url}
                          alt={p.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/75 via-transparent to-black/20" />
                        <div className="absolute top-2.5 left-2.5">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shadow-xs ${
                            isAvail ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'
                          }`}>
                            {isAvail ? '● Available' : '○ Unavailable'}
                          </span>
                        </div>
                        <div className="absolute top-2.5 right-2.5">
                          <span className="text-[10px] font-bold text-white bg-black/60 backdrop-blur-xs px-2 py-0.5 rounded-lg border border-white/20">
                            {p.capacity} Pax
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="relative h-32 w-full bg-slate-100/90 border-b border-slate-200/80 flex flex-col items-center justify-center p-3 text-center">
                        <div className="flex flex-col items-center gap-1 text-slate-400">
                          <ImageIcon className="w-6 h-6 opacity-50 text-emerald-600" />
                          <span className="text-[11px] font-medium text-slate-500">No photo display yet</span>
                        </div>
                        <div className="absolute top-2.5 left-2.5">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shadow-xs ${
                            isAvail ? 'bg-emerald-600 text-white' : 'bg-rose-500 text-white'
                          }`}>
                            {isAvail ? '● Available' : '○ Unavailable'}
                          </span>
                        </div>
                        <div className="absolute top-2.5 right-2.5">
                          <span className="text-[10px] font-bold text-slate-700 bg-white/95 px-2 py-0.5 rounded-lg border border-slate-200 shadow-xs">
                            {p.capacity} Pax
                          </span>
                        </div>
                      </div>
                    )}

                    <div className="p-4 space-y-2">
                      <div>
                        <h3 className="text-base font-bold text-slate-900 leading-snug line-clamp-1">{p.name}</h3>
                        <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                          <MapPin className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                          <span className="truncate">{p.location}</span>
                        </p>
                      </div>

                      {p.amenities && (
                        <p className="text-[11px] text-slate-500 line-clamp-1 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-100">
                          {p.amenities}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="p-4 pt-0 space-y-3">
                    <div className="pt-2.5 border-t border-slate-100 grid grid-cols-2 gap-2">
                      <div className="p-2 rounded-xl bg-emerald-50/70 border border-emerald-100/90 flex flex-col">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Morning Rate</span>
                        <span className="text-xs font-black text-emerald-900 mt-0.5">
                          {mRate > 0 ? `₱${mRate.toLocaleString()}` : 'Free'}
                        </span>
                      </div>
                      <div className="p-2 rounded-xl bg-emerald-50/70 border border-emerald-100/90 flex flex-col">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Afternoon Rate</span>
                        <span className="text-xs font-black text-emerald-900 mt-0.5">
                          {aRate > 0 ? `₱${aRate.toLocaleString()}` : 'Free'}
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => openEditPark(p)}
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition-colors"
                      >
                        <Pencil className="w-3.5 h-3.5" /> Edit
                      </button>
                      <button
                        onClick={() => handleDeletePark(p)}
                        className="flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-xl transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Delete
                      </button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Parks Equipment Manager Section */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-soft overflow-hidden">
            <div
              className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50 transition-colors"
              onClick={() => setIsEquipManagerOpen(v => !v)}
            >
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 bg-emerald-100 text-emerald-700 rounded-lg">
                  <Package className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Parks Equipment List Manager</h3>
                  <p className="text-[10px] text-slate-500">{equipmentList.length} items • Citizens see these when scheduling parks</p>
                </div>
              </div>
              <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                {isEquipManagerOpen ? '▲ Collapse' : '▼ Manage Equipment'}
              </span>
            </div>

            {isEquipManagerOpen && (
              <div className="border-t border-slate-200 p-4 space-y-3">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Add new park equipment item..."
                    value={newEquipItem}
                    onChange={e => setNewEquipItem(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addEquipItem()}
                    className="flex-1 px-3 py-1.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:border-emerald-500 bg-slate-50"
                  />
                  <button
                    onClick={addEquipItem}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add
                  </button>
                </div>

                <div className="space-y-1.5 max-h-64 overflow-y-auto">
                  {equipmentList.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2 p-2 bg-slate-50 rounded-xl border border-slate-200">
                      {editingEquipIdx === idx ? (
                        <>
                          <input
                            autoFocus
                            className="flex-1 px-2 py-1 text-xs rounded-lg border border-emerald-400 focus:outline-none"
                            value={editingEquipVal}
                            onChange={e => setEditingEquipVal(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && saveEditEquipItem(idx)}
                          />
                          <button onClick={() => saveEditEquipItem(idx)} className="p-1 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors">
                            <Save className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => setEditingEquipIdx(null)} className="p-1 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </>
                      ) : (
                        <>
                          <span className="flex-1 text-xs font-medium text-slate-700">{item}</span>
                          <button
                            onClick={() => { setEditingEquipIdx(idx); setEditingEquipVal(item); }}
                            className="p-1 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => deleteEquipItem(idx)}
                            className="p-1 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  ))}
                  {equipmentList.length === 0 && (
                    <p className="text-[11px] text-slate-400 italic text-center py-4">No equipment items. Add one above.</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Filter and Search Bar */}
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white p-3.5 rounded-2xl border border-slate-200 shadow-soft">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search park bookings by ref, applicant..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-600 focus:bg-white text-slate-800"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
              {[
                { id: 'all', label: 'All Park Bookings' },
                { id: 'Pending Review', label: 'Pending Review' },
                { id: 'Approved', label: 'Approved' },
                { id: 'LGU Endorsed', label: '🏛️ LGU Officially Endorsed' },
                { id: 'Pending Payment', label: 'Waiting for Payment' },
                { id: 'Paid', label: 'Paid' },
                { id: 'Rejected', label: 'Rejected' },
              ].map((sf) => (
                <button
                  key={sf.id}
                  onClick={() => setStatusFilter(sf.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                    statusFilter === sf.id
                      ? sf.id === 'LGU Endorsed' ? 'bg-purple-700 text-white shadow-sm' : 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {sf.label}
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
                      <th className="py-3 px-4">Park Ground</th>
                      <th className="py-3 px-4">Organizer & Purpose</th>
                      <th className="py-3 px-4">Event Date</th>
                      <th className="py-3 px-4">Time Slot</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {filtered.map((r) => {
                      const rProof = (r as any).sponsorship_photo_url || (r as any).proof_url || (r as any).photo_url;
                      const isLGU = 
                        r.status === 'LGU Endorsed' ||
                        (r as any).activity_type === 'LGU Activity' || 
                        ((r as any).purpose || '').toLowerCase().includes('lgu activity') ||
                        ((r as any).event_name || '').toLowerCase().includes('lgu') ||
                        (r as any).fee_amount === 0 || 
                        (r as any).fee_amount === '0.00' ||
                        (r as any).fee_amount === '0' ||
                        Boolean(rProof);
                      const eventName = (r as any).event_name;
                      
                      return (
                      <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold text-emerald-700">
                          <div>{r.reference_no}</div>
                          {isLGU && (
                            <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-[9px] font-black bg-purple-100 text-purple-800 border border-purple-200">
                              🏛️ LGU FREE
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-slate-800">{r.facility_name}</td>
                        <td className="py-3.5 px-4 max-w-[220px]">
                          {eventName && (
                            <p className="font-extrabold text-slate-900 truncate">
                              {eventName}
                            </p>
                          )}
                          <p className="text-xs text-slate-700 font-semibold truncate">{r.applicant_name}</p>
                          <p className="text-[10px] text-slate-500 truncate">{r.purpose}</p>
                          {rProof && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setLightboxProof({
                                  url: rProof,
                                  title: eventName || r.purpose || 'LGU Sponsorship Proof',
                                  applicant: r.applicant_name,
                                  ref: r.reference_no
                                });
                              }}
                              className="inline-flex items-center gap-1 mt-1 text-[10px] font-bold text-purple-700 hover:text-purple-900 bg-purple-50 hover:bg-purple-100 px-2 py-0.5 rounded-md border border-purple-200 transition-colors cursor-pointer"
                            >
                              <Eye className="w-3 h-3" /> View LGU Proof
                            </button>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-slate-700 whitespace-nowrap">
                          {r.event_date ? new Date(r.event_date).toLocaleDateString() : 'N/A'}
                        </td>
                        <td className="py-3.5 px-4 text-slate-700 whitespace-nowrap font-mono text-[11px]">
                          {r.start_time} - {r.end_time}
                        </td>
                        <td className="py-3.5 px-4">
                          {r.status === 'LGU Endorsed' || (isLGU && r.status === 'Paid') ? (
                            <div className="space-y-1">
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black bg-purple-600 text-white border border-purple-700 shadow-sm">
                                ✅ LGU Officially Approved
                              </span>
                              <div className="text-[9px] font-bold text-purple-700">
                                LGU SPONSORED · Verified & Free — ₱0.00
                              </div>
                            </div>
                          ) : isLGU && r.status === 'Approved' ? (
                            <div className="space-y-1">
                              <Badge variant="purple">🏛️ Officially Endorsed</Badge>
                              <div className="text-[9px] font-black text-purple-700 uppercase tracking-wide">
                                Admin Verified · LGU Sponsored
                              </div>
                            </div>
                          ) : (
                            <Badge variant={r.status === 'Approved' || r.status === 'Paid' ? 'success' : r.status === 'Pending Payment' ? 'info' : r.status === 'Rejected' ? 'destructive' : 'warning'}>
                              {r.status === 'Pending Payment' ? 'Waiting for Payment' : r.status}
                            </Badge>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right whitespace-nowrap space-x-1.5">
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
                      );
                    })}
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
        description="Verify park availability, inspect LGU sponsorship proof, set payment due date, and process approval."
        maxWidth="lg"
      >
        {selectedRes && (() => {
          const proofUrl = 
            (selectedRes as any).sponsorship_photo_url || 
            (selectedRes as any).proof_url || 
            (selectedRes as any).photo_url ||
            (selectedRes as any).attachment_url;
          const isLGU = 
            (selectedRes as any).activity_type === 'LGU Activity' || 
            (selectedRes as any).purpose?.includes('LGU Activity') ||
            (selectedRes as any).fee_amount === 0 ||
            Boolean(proofUrl);
          const eventName = (selectedRes as any).event_name;
          const activityType = (selectedRes as any).activity_type || (isLGU ? 'LGU Activity' : 'Sports Activity');

          return (
          <div className="space-y-4 text-xs">
            {/* Summary Info Card */}
            <div className={`p-3.5 rounded-xl border space-y-1.5 ${isLGU ? 'bg-purple-50 border-purple-200' : 'bg-emerald-50 border-emerald-200'}`}>
              <div className="flex items-center justify-between mb-1">
                <p className="font-bold text-slate-700 text-[11px] uppercase tracking-wider">Booking Details</p>
                {activityType && (
                  <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                    isLGU
                      ? 'bg-purple-100 text-purple-800 border-purple-300'
                      : activityType === 'Sports Activity'
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                      : 'bg-blue-100 text-blue-800 border-blue-300'
                  }`}>
                    {isLGU ? '🏛️ LGU Activity (Sponsored Free)' : activityType === 'Sports Activity' ? '⚽ Sports Activity' : '🎉 Other / Private Event'}
                  </span>
                )}
              </div>
              <p><span className="font-bold text-slate-700">Park Ground:</span> {selectedRes.facility_name}</p>
              {eventName && <p><span className="font-bold text-slate-700">Event Name:</span> <span className="font-semibold text-slate-900">{eventName}</span></p>}
              <p><span className="font-bold text-slate-700">Organizer:</span> {selectedRes.applicant_name} ({selectedRes.applicant_phone})</p>
              <p><span className="font-bold text-slate-700">Purpose:</span> {selectedRes.purpose}</p>
              <p><span className="font-bold text-slate-700">Schedule:</span> {selectedRes.event_date ? new Date(selectedRes.event_date).toLocaleDateString() : 'N/A'} ({selectedRes.start_time} - {selectedRes.end_time})</p>
            </div>

            {/* LGU Proof Document — ADMIN MUST VERIFY */}
            {isLGU && (
              <div className="p-4 bg-purple-50/80 rounded-2xl border-2 border-purple-300 space-y-3 shadow-xs">
                <div className="flex items-center justify-between border-b border-purple-200 pb-2">
                  <p className="font-extrabold text-purple-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-purple-600" />
                    <span>LGU Sponsorship Proof Document — Official Verification</span>
                  </p>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-200 text-purple-900">
                    Mandatory Review
                  </span>
                </div>
                
                <p className="text-[11px] text-purple-800 leading-relaxed">
                  This booking is tagged as <strong>LGU Sponsored (Free ₱0.00)</strong>. As administrator, you must inspect the official request letter, barangay endorsement, or authorization memo below before granting approval.
                </p>

                {proofUrl ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[11px] font-bold text-purple-900">
                      <span>Submitted Proof File:</span>
                      <button
                        type="button"
                        onClick={() => setLightboxProof({
                          url: proofUrl,
                          title: eventName || selectedRes.purpose || 'LGU Sponsorship Proof',
                          applicant: selectedRes.applicant_name,
                          ref: selectedRes.reference_no
                        })}
                        className="flex items-center gap-1 text-purple-700 hover:text-purple-900 underline text-[11px] cursor-pointer"
                      >
                        <ZoomIn className="w-3.5 h-3.5" /> Full-Screen Zoom
                      </button>
                    </div>

                    <div 
                      onClick={() => setLightboxProof({
                        url: proofUrl,
                        title: eventName || selectedRes.purpose || 'LGU Sponsorship Proof',
                        applicant: selectedRes.applicant_name,
                        ref: selectedRes.reference_no
                      })}
                      className="relative group rounded-xl overflow-hidden border-2 border-purple-300 bg-white cursor-pointer hover:border-purple-500 transition-all shadow-sm max-h-64 flex items-center justify-center p-2"
                    >
                      <img
                        src={proofUrl}
                        alt="LGU Sponsorship Official Proof"
                        className="max-h-60 max-w-full object-contain rounded-lg group-hover:scale-102 transition-transform duration-200"
                      />
                      <div className="absolute inset-0 bg-purple-950/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <span className="px-3 py-1.5 rounded-xl bg-purple-900/90 text-white font-bold text-xs shadow-md flex items-center gap-1.5 backdrop-blur-xs">
                          <ZoomIn className="w-4 h-4" /> Click to Inspect Full Document
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[10px] text-slate-500 italic">
                        Document verified and recorded under #{selectedRes.reference_no}
                      </span>
                      <a
                        href={proofUrl}
                        download={`LGU-Proof-${selectedRes.reference_no}.jpg`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1 px-3 py-1 bg-purple-700 hover:bg-purple-800 text-white text-[11px] font-bold rounded-lg shadow-xs transition-colors"
                      >
                        <ExternalLink className="w-3 h-3" /> Open in New Tab
                      </a>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl space-y-1">
                    <p className="text-xs font-bold text-red-800 flex items-center gap-1.5">
                      <AlertCircle className="w-4 h-4 text-red-600" />
                      <span>Missing Proof Document</span>
                    </p>
                    <p className="text-[11px] text-red-700">
                      No sponsorship document or memo was found in this submission. Do NOT approve as Free until the citizen provides an official endorsement letter.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Special Equipment Requirements */}
            {selectedRes.special_equipment && (Array.isArray(selectedRes.special_equipment) ? selectedRes.special_equipment.length > 0 : true) && (
              <div className="p-3.5 bg-indigo-50 rounded-xl border border-indigo-200 space-y-1.5">
                <p className="font-bold text-indigo-900 text-xs uppercase tracking-wider">🔧 Special Equipment Requirements</p>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {(Array.isArray(selectedRes.special_equipment)
                    ? selectedRes.special_equipment
                    : String(selectedRes.special_equipment).split(',').map((s: string) => s.trim())
                  ).filter(Boolean).map((eq: string, i: number) => (
                    <span key={i} className="px-2 py-0.5 bg-indigo-100 text-indigo-800 text-[10px] font-semibold rounded-full border border-indigo-200">{eq}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Fee Breakdown — show ₱0 for LGU, computed for others */}
            {isLGU ? (
              <div className="p-3.5 bg-purple-50 rounded-xl border border-purple-200 text-xs">
                <p className="font-bold text-purple-700 text-[11px] uppercase tracking-wider mb-1.5">💰 Booking Fee:</p>
                <div className="flex items-center gap-3">
                  <span className="text-2xl font-extrabold text-purple-900 font-mono">₱0.00</span>
                  <span className="text-[11px] font-bold px-2.5 py-1 bg-purple-200 text-purple-800 rounded-full">LGU Sponsored — Free (Pending Verification)</span>
                </div>
              </div>
            ) : (selectedRes.hourly_rate > 0 || (selectedRes as any).fee_amount > 0) && (
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1.5">
                <p className="font-bold text-slate-700 text-[11px] uppercase tracking-wider">💰 Booking Fee Computation:</p>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-white border border-slate-200 rounded-lg p-2">
                    <span className="text-[10px] text-slate-500 block">Duration</span>
                    <span className="font-bold text-slate-900">{calculateBookingHours(selectedRes.start_time, selectedRes.end_time)} hrs</span>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-lg p-2">
                    <span className="text-[10px] text-slate-500 block">Rate / hr</span>
                    <span className="font-bold text-slate-900">₱{Number(selectedRes.hourly_rate || 0).toLocaleString()}</span>
                  </div>
                  <div className="bg-emerald-50 border border-emerald-300 rounded-lg p-2">
                    <span className="text-[10px] text-emerald-600 block font-semibold">Total Fee</span>
                    <span className="font-extrabold text-emerald-900 font-mono">
                      ₱{((selectedRes as any).fee_amount || calculateFacilityFee(selectedRes.start_time, selectedRes.end_time, selectedRes.hourly_rate || 0)).toLocaleString()}.00
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Approved — grant notice */}
            {selectedRes.status === 'Approved' && (
              <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-200 space-y-1">
                <p className="font-bold text-amber-900 text-[11px]">
                  {isLGU
                    ? '✅ LGU Activity — This is a FREE booking (₱0.00). Grant reservation directly with no payment required.'
                    : '🗓️ Grant Payment Notice — Computed fee will be charged to citizen. Payment due in 3 days.'}
                </p>
              </div>

            )}

            {selectedRes.status === 'Pending Payment' && (
              <div className="p-3.5 bg-blue-50 rounded-xl border border-blue-200 text-blue-900 space-y-1">
                <p className="font-bold text-xs">⏳ Awaiting Treasury Cash Settlement:</p>
                <p className="text-[11px]">Notice issued to citizen. Assessed Fee: <strong>₱{((selectedRes as any).fee_amount || calculateFacilityFee(selectedRes.start_time, selectedRes.end_time, selectedRes.hourly_rate || 0)).toLocaleString()}.00</strong>. When resident settles at LGU Treasury Desk, click "Approve Payment (Cash Received)" below.</p>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-[#334155] mb-1">Park Administrator Remarks:</label>
              <textarea
                rows={2}
                value={reviewRemarks}
                onChange={(e) => setReviewRemarks(e.target.value)}
                className="w-full rounded-xl border border-slate-300 p-2 text-xs"
              />
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <div className="flex gap-2">
                {/* Pending Review: only Reject + Approve */}
                {(selectedRes.status === 'Pending' || selectedRes.status === 'Pending Review') && (
                  <>
                    <Button size="sm" variant="danger" className="font-bold text-xs" onClick={() => handleUpdateStatus('Rejected')}>
                      ✕ Reject Schedule
                    </Button>
                    <Button size="sm" variant="success" className="bg-emerald-600 hover:bg-emerald-700 font-bold text-white text-xs" onClick={() => handleUpdateStatus('Approved')}>
                      {isLGU ? '🏛️ Verify & Approve (LGU Free)' : '✓ Approve Booking'}
                    </Button>
                  </>
                )}
                {selectedRes.status === 'Approved' && (
                  <Button size="sm" variant="outline" className="font-bold text-xs text-amber-700 border-amber-300 hover:bg-amber-50" onClick={() => handleUpdateStatus('Pending Review')}>
                    ↩ Return to Pending Review
                  </Button>
                )}
                {selectedRes.status === 'Pending Payment' && (
                  <Button size="sm" variant="outline" className="font-bold text-xs text-amber-700 border-amber-300 hover:bg-amber-50" onClick={() => handleUpdateStatus('Pending Review')}>
                    ↩ Return to Pending Review
                  </Button>
                )}
                {selectedRes.status === 'Rejected' && (
                  <Button size="sm" variant="outline" className="font-bold text-xs text-amber-700 border-amber-300 hover:bg-amber-50" onClick={() => handleUpdateStatus('Pending Review')}>
                    ↩ Return to Pending Review
                  </Button>
                )}
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="font-bold text-xs" onClick={() => setIsReviewModalOpen(false)}>
                  Close
                </Button>
                {selectedRes.status === 'Approved' && (
                  isLGU ? (
                    <Button size="sm" variant="success" className="bg-purple-600 hover:bg-purple-700 font-bold text-white text-xs" onClick={() => handleUpdateStatus('LGU Endorsed')}>
                      🏛️ Grant LGU Official Endorsement (Free)
                    </Button>
                  ) : (
                    <Button size="sm" variant="success" className="bg-emerald-600 hover:bg-emerald-700 font-bold text-white text-xs" onClick={() => handleUpdateStatus('Pending Payment')}>
                      Grant Reservation & Issue Payment Notice
                    </Button>
                  )
                )}
                {selectedRes.status === 'Pending Payment' && (
                  <Button size="sm" variant="success" className="bg-emerald-600 hover:bg-emerald-700 font-bold text-white text-xs" onClick={() => handleUpdateStatus('Paid')}>
                    ✓ Approve Payment (Cash Received)
                  </Button>
                )}
              </div>
            </div>
          </div>
          );
        })()}
      </Modal>

      {/* Lightbox / Full-Screen Proof Viewer */}
      {lightboxProof && (
        <div 
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex flex-col items-center justify-center p-4 animate-fade-in"
          onClick={() => setLightboxProof(null)}
        >
          <div 
            className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl border border-slate-700"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 bg-purple-900 text-white flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-amber-300" />
                  <h3 className="font-extrabold text-sm sm:text-base">LGU Sponsorship Proof Document</h3>
                  <span className="font-mono text-xs bg-purple-800 px-2 py-0.5 rounded text-purple-200">
                    #{lightboxProof.ref}
                  </span>
                </div>
                <p className="text-xs text-purple-200 mt-0.5">
                  Organizer: <strong>{lightboxProof.applicant}</strong> • Event: {lightboxProof.title}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setLightboxProof(null)}
                className="p-1.5 rounded-full hover:bg-white/20 text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 bg-slate-900 flex-1 overflow-auto flex items-center justify-center min-h-[320px]">
              <img
                src={lightboxProof.url}
                alt="Full size LGU sponsorship proof"
                className="max-h-[70vh] max-w-full object-contain rounded-lg shadow-lg border border-slate-700"
              />
            </div>

            <div className="p-3.5 bg-slate-100 border-t border-slate-200 flex items-center justify-between text-xs">
              <span className="text-slate-500 font-medium">Official sponsorship documentation uploaded by applicant</span>
              <div className="flex gap-2">
                <a
                  href={lightboxProof.url}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3.5 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 font-bold rounded-xl transition-colors flex items-center gap-1.5"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> Open in New Tab
                </a>
                <Button size="sm" variant="primary" onClick={() => setLightboxProof(null)}>
                  Close Viewer
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}


      {/* Status Animation Toast / Modal */}
      <StatusAnimationModal
        isOpen={animModal.isOpen}
        type={animModal.type}
        title={animModal.title}
        message={animModal.message}
        onClose={() => setAnimModal(prev => ({ ...prev, isOpen: false }))}
      />

      {/* Modal: Add / Edit Park / Ground */}
      <Modal
        isOpen={isParkFormOpen}
        onClose={() => setIsParkFormOpen(false)}
        title={editingPark ? `Edit Park: ${editingPark.name}` : 'Add New Park / Recreation Ground'}
        description="Fill in the details for the public park or recreation area."
        maxWidth="lg"
      >
        <form onSubmit={handleSavePark} className="space-y-3 text-xs">
          <Input
            label="Park / Ground Name *"
            required
            value={parkForm.name}
            onChange={e => setParkForm({ ...parkForm, name: e.target.value })}
            placeholder="e.g. Camarin Green Urban Recreation Park"
          />
          <Input
            label="Location / Address Tag *"
            required
            value={parkForm.location}
            onChange={e => setParkForm({ ...parkForm, location: e.target.value })}
            placeholder="e.g. Public Recreation Ground Sector, Camarin Road"
          />
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#334155] mb-1">Maximum Capacity (Pax) *</label>
              <input type="number" required min="1" value={parkForm.capacity}
                onChange={e => setParkForm({ ...parkForm, capacity: e.target.value })}
                className="w-full rounded-xl border border-slate-300 p-2 text-xs focus:outline-none focus:border-emerald-600"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#334155] mb-1">Morning Slot Rate (₱) *</label>
              <input type="number" required min="0" step="1" value={parkForm.morning_rate}
                onChange={e => setParkForm({ ...parkForm, morning_rate: e.target.value, hourly_rate: e.target.value })}
                className="w-full rounded-xl border border-slate-300 p-2 text-xs focus:outline-none focus:border-emerald-600"
              />
              <p className="text-[10px] text-slate-400 mt-0.5">08:00 AM – 12:00 PM</p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#334155] mb-1">Afternoon Slot Rate (₱) *</label>
              <input type="number" required min="0" step="1" value={parkForm.afternoon_rate}
                onChange={e => setParkForm({ ...parkForm, afternoon_rate: e.target.value })}
                className="w-full rounded-xl border border-slate-300 p-2 text-xs focus:outline-none focus:border-emerald-600"
              />
              <p className="text-[10px] text-slate-400 mt-0.5">01:00 PM – 05:00 PM</p>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#334155] mb-1">
              Park Specifications & Features (Specs) *
            </label>
            <textarea
              rows={2}
              required
              value={parkForm.amenities}
              onChange={e => setParkForm({ ...parkForm, amenities: e.target.value })}
              placeholder="e.g. Covered basketball court, jogging perimeter path, open picnic lawn, gazebo, public restrooms"
              className="w-full rounded-xl border border-slate-300 p-2 text-xs focus:outline-none focus:border-emerald-600"
            />
            <p className="text-[10px] text-slate-400 mt-0.5">Citizens will see these exact specifications under "Selected Venue Specs" when reserving.</p>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#334155] mb-1">Status</label>
            <select value={parkForm.status}
              onChange={e => setParkForm({ ...parkForm, status: e.target.value })}
              className="w-full rounded-xl border border-slate-300 p-2 text-xs focus:outline-none focus:border-emerald-600 font-medium"
            >
              <option value="Available">Available (Visible & Bookable by Citizens)</option>
              <option value="Not Available">Not Available (Hidden from Citizens)</option>
            </select>
          </div>

          {/* 2 Image Uploads for Citizen Viewing */}
          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
              <span className="font-bold text-slate-800 text-[11px] flex items-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5 text-emerald-600" />
                Park Grounds Images for Citizen Viewing (2 Images)
              </span>
              <span className="text-[10px] text-slate-500">Citizens see these during ticket booking</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Photo 1: Main Grounds / Entrance */}
              <div className="space-y-1.5 bg-white p-2.5 rounded-xl border border-slate-200">
                <span className="text-[11px] font-bold text-slate-700 block">Photo 1: Main Grounds / Panorama</span>
                {parkForm.image_url ? (
                  <div className="relative rounded-lg overflow-hidden border border-slate-200 h-24 bg-slate-100 group">
                    <img src={parkForm.image_url} alt="Photo 1" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setParkForm(prev => ({ ...prev, image_url: '' }))}
                      className="absolute top-1 right-1 p-1 bg-red-600 text-white rounded-md text-[10px] hover:bg-red-700 shadow"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-300 hover:border-emerald-400 rounded-lg p-3 text-center cursor-pointer bg-slate-50 transition-colors">
                    <Upload className="w-5 h-5 text-slate-400 mb-1" />
                    <span className="text-[10px] font-bold text-emerald-600">Upload Photo 1</span>
                    <span className="text-[9px] text-slate-400">JPG, PNG (Auto-compressed)</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleParkImageUpload(file, 'image_url');
                      }}
                    />
                  </label>
                )}
                <input
                  type="text"
                  placeholder="Or paste Image 1 URL..."
                  value={parkForm.image_url}
                  onChange={e => setParkForm({ ...parkForm, image_url: e.target.value })}
                  className="w-full p-1.5 text-[10px] border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Photo 2: Amenities / Pavilion / Playground */}
              <div className="space-y-1.5 bg-white p-2.5 rounded-xl border border-slate-200">
                <span className="text-[11px] font-bold text-slate-700 block">Photo 2: Amenities / Pavilion / Stage</span>
                {parkForm.image_url_2 ? (
                  <div className="relative rounded-lg overflow-hidden border border-slate-200 h-24 bg-slate-100 group">
                    <img src={parkForm.image_url_2} alt="Photo 2" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setParkForm(prev => ({ ...prev, image_url_2: '' }))}
                      className="absolute top-1 right-1 p-1 bg-red-600 text-white rounded-md text-[10px] hover:bg-red-700 shadow"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-300 hover:border-emerald-400 rounded-lg p-3 text-center cursor-pointer bg-slate-50 transition-colors">
                    <Upload className="w-5 h-5 text-slate-400 mb-1" />
                    <span className="text-[10px] font-bold text-emerald-600">Upload Photo 2</span>
                    <span className="text-[9px] text-slate-400">JPG, PNG (Auto-compressed)</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleParkImageUpload(file, 'image_url_2');
                      }}
                    />
                  </label>
                )}
                <input
                  type="text"
                  placeholder="Or paste Image 2 URL..."
                  value={parkForm.image_url_2}
                  onChange={e => setParkForm({ ...parkForm, image_url_2: e.target.value })}
                  className="w-full p-1.5 text-[10px] border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button type="button" onClick={() => setIsParkFormOpen(false)}
              className="px-4 py-1.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >Cancel</button>
            <button type="submit" disabled={isSavingPark}
              className="px-5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold shadow-sm transition-colors flex items-center gap-1.5"
            >
              {isSavingPark ? 'Saving...' : editingPark ? 'Save Changes' : 'Add Park / Ground'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
