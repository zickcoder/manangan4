import React, { useState, useEffect } from 'react';
import { 
  Building, 
  Search, 
  Plus, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Sparkles, 
  Calendar, 
  User, 
  Eye,
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

export function FacilitiesModule() {
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [reservations, setReservations] = useState<FacilityReservation[]>([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRes, setSelectedRes] = useState<FacilityReservation | null>(null);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [reviewRemarks, setReviewRemarks] = useState('');
  const [lightboxProof, setLightboxProof] = useState<{ url: string; title: string; applicant: string; ref: string } | null>(null);

  // Facility CRUD
  const [isFacilityFormOpen, setIsFacilityFormOpen] = useState(false);
  const [editingFacility, setEditingFacility] = useState<Facility | null>(null);
  const [facilityForm, setFacilityForm] = useState({
    name: '', category: 'Government Facility', capacity: '100', hourly_rate: '500',
    morning_rate: '500', afternoon_rate: '500',
    status: 'Available', amenities: '',
    location: 'Civic Complex, Mindanao Ave.',
    image_url: '',
    image_url_2: ''
  });

  const openAddFacility = () => {
    setEditingFacility(null);
    setFacilityForm({ name: '', category: 'Government Facility', capacity: '100', hourly_rate: '500', morning_rate: '500', afternoon_rate: '500', status: 'Available', amenities: '', location: 'Civic Complex, Mindanao Ave.', image_url: '', image_url_2: '' });
    setIsFacilityFormOpen(true);
  };

  const openEditFacility = (fac: Facility) => {
    setEditingFacility(fac);
    setFacilityForm({
      name: fac.name,
      category: fac.category,
      capacity: String(fac.capacity),
      hourly_rate: String(fac.hourly_rate),
      morning_rate: String((fac as any).morning_rate ?? fac.hourly_rate ?? 500),
      afternoon_rate: String((fac as any).afternoon_rate ?? fac.hourly_rate ?? 500),
      status: (fac as any).status === 'Not Available' ? 'Not Available' : 'Available',
      amenities: fac.amenities || '',
      location: fac.location || 'Civic Complex, Mindanao Ave.',
      image_url: fac.image_url || '',
      image_url_2: fac.image_url_2 || ''
    });
    setIsFacilityFormOpen(true);
  };

  const handleFacilityImageUpload = async (file: File, imageKey: 'image_url' | 'image_url_2') => {
    try {
      const compressed = await compressImage(file);
      setFacilityForm(prev => ({ ...prev, [imageKey]: compressed }));
    } catch {
      alert('Failed to process image file. Please try another image.');
    }
  };

  const [isSavingFacility, setIsSavingFacility] = useState(false);

  const handleSaveFacility = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingFacility(true);
    try {
      const morningRate = parseFloat(facilityForm.morning_rate) || 0;
      const afternoonRate = parseFloat(facilityForm.afternoon_rate) || 0;
      const payload = {
        ...facilityForm,
        location: facilityForm.location.trim() || 'Civic Complex, Mindanao Ave.',
        amenities: facilityForm.amenities.trim() || 'Standard Facility Amenities',
        image_url: facilityForm.image_url || null,
        image_url_2: facilityForm.image_url_2 || null,
        capacity: parseInt(facilityForm.capacity) || 50,
        hourly_rate: morningRate,
        morning_rate: morningRate,
        afternoon_rate: afternoonRate
      };
      if (editingFacility) {
        await updateFacility(editingFacility.id, payload);
      } else {
        await createFacility(payload);
      }
      setIsFacilityFormOpen(false);
      // govserve_data_updated event will trigger loadData automatically — no need to call it here
      setAnimModal({
        isOpen: true,
        type: 'success',
        title: editingFacility ? '✓ Changes Saved' : '✓ Facility Added',
        message: `${facilityForm.name} has been successfully ${ editingFacility ? 'updated' : 'added'}.`
      });
    } catch (err) {
      console.error('Error saving facility:', err);
      setIsFacilityFormOpen(false);
      loadData();
    } finally {
      setIsSavingFacility(false);
    }
  };

  const handleDeleteFacility = async (fac: Facility) => {
    if (!window.confirm(`Delete "${fac.name}"? This cannot be undone.`)) return;
    await deleteFacility(fac.id);
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



  const DEFAULT_FACILITY_EQUIPMENT = [
    'Sound System & 2 Wireless Microphones',
    'Monoblock Chairs (100 - 300 units)',
    'Foldable Tables & Canopies',
    'Stage Lighting & Spotlights',
    'Basketball Electronic Scoreboard',
    'Standby Diesel Generator (15kVA)',
    'High-Definition Projector & Screen',
    'Video Streaming Setup',
  ];

  const loadEquipment = () => {
    try {
      const stored = localStorage.getItem('govserve_equipment_facility');
      if (stored) { const p = JSON.parse(stored); if (Array.isArray(p) && p.length > 0) return p; }
    } catch {}
    return DEFAULT_FACILITY_EQUIPMENT;
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
    localStorage.setItem('govserve_equipment_facility', JSON.stringify(list));
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
      const [facs, resList] = await Promise.all([
        fetchFacilities('Government Facility'),
        fetchReservations('all', 'Government Facility', false),
      ]);
      setFacilities(facs);
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
      // Show loading animation modal
      setAnimModal({
        isOpen: true,
        type: 'loading',
        title: 'Processing Request...',
        message: 'Updating facility reservation status.'
      });

      const isLGU = 
        (selectedRes as any).activity_type === 'LGU Activity' || 
        (selectedRes as any).purpose?.includes('LGU Activity') ||
        (selectedRes as any).fee_amount === 0 ||
        Boolean((selectedRes as any).sponsorship_photo_url || (selectedRes as any).proof_url);
      const computedFee = calculateFacilityFee(selectedRes.start_time, selectedRes.end_time, selectedRes.hourly_rate || 0);
      const fee = isLGU ? 0 : ((selectedRes as any).fee_amount ?? computedFee ?? (selectedRes.hourly_rate ? selectedRes.hourly_rate * 4 : 2000));
      const dueDate = new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0];

      await updateReservationStatus(
        selectedRes.id,
        status,
        reviewRemarks || `Reservation set to ${status} by Facilities Bureau`,
        'Engr. Marcus Cruz',
        { fee_amount: fee, payment_due_date: dueDate }
      );

      setIsReviewModalOpen(false);
      // govserve_data_updated event from updateReservationStatus triggers debounced loadData automatically

      // Show animated checkmark or x-mark
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
            message: `Reservation #${selectedRes.reference_no} is now fully PAID.`
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
            title: '✕ Reservation Rejected',
            message: `Reservation #${selectedRes.reference_no} has been marked as Rejected.`
          });
        } else {
          setAnimModal({
            isOpen: true,
            type: 'success',
            title: `✓ Reservation Updated to ${status}`,
            message: `Status set successfully.`
          });
        }
      }, 200);
    } catch (e) {
      setAnimModal({
        isOpen: true,
        type: 'rejected',
        title: 'Error Occurred',
        message: 'Failed to update reservation status.'
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
            <div className="p-2 rounded-xl bg-blue-600 text-white shadow-sm">
              <Building className="w-5 h-5" />
            </div>
            <span>Government Facility Reservation & Scheduling</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Manage Civic Centers, Multipurpose Gymnasiums, Conference Halls, and evaluate bookings.
          </p>
        </div>
        <button
          onClick={openAddFacility}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-sm transition-colors shrink-0"
        >
          <Plus className="w-4 h-4" /> Add New Facility
        </button>
      </div>

      {/* Facilities Cards Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {facilities.map((fac) => {
          const mRate = Number((fac as any).morning_rate ?? fac.hourly_rate ?? 0);
          const aRate = Number((fac as any).afternoon_rate ?? fac.hourly_rate ?? 0);
          const isAvail = ((fac as any).status || 'Available') === 'Available';
          return (
            <Card key={fac.id} hoverEffect className="border-slate-200/90 p-0 overflow-hidden bg-white shadow-soft rounded-2xl flex flex-col justify-between transition-all">
              <div>
                {fac.image_url ? (
                  <div className="relative h-32 w-full overflow-hidden bg-slate-900 group">
                    <img
                      src={fac.image_url}
                      alt={fac.name}
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
                        {fac.capacity} Pax
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="relative h-32 w-full bg-slate-100/90 border-b border-slate-200/80 flex flex-col items-center justify-center p-3 text-center">
                    <div className="flex flex-col items-center gap-1 text-slate-400">
                      <ImageIcon className="w-6 h-6 opacity-50 text-slate-400" />
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
                        {fac.capacity} Pax
                      </span>
                    </div>
                  </div>
                )}

                <div className="p-4 space-y-2">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 leading-snug line-clamp-1">{fac.name}</h3>
                    <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                      <MapPin className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                      <span className="truncate">{fac.location}</span>
                    </p>
                  </div>

                  {fac.amenities && (
                    <p className="text-[11px] text-slate-500 line-clamp-1 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-100">
                      {fac.amenities}
                    </p>
                  )}
                </div>
              </div>

              <div className="p-4 pt-0 space-y-3">
                <div className="pt-2.5 border-t border-slate-100 grid grid-cols-2 gap-2">
                  <div className="p-2 rounded-xl bg-blue-50/70 border border-blue-100/90 flex flex-col">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Morning Rate</span>
                    <span className="text-xs font-black text-blue-900 mt-0.5">
                      {mRate > 0 ? `₱${mRate.toLocaleString()}` : 'Free'}
                    </span>
                  </div>
                  <div className="p-2 rounded-xl bg-blue-50/70 border border-blue-100/90 flex flex-col">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Afternoon Rate</span>
                    <span className="text-xs font-black text-blue-900 mt-0.5">
                      {aRate > 0 ? `₱${aRate.toLocaleString()}` : 'Free'}
                    </span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => openEditFacility(fac)}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl transition-colors"
                  >
                    <Pencil className="w-3.5 h-3.5" /> Edit
                  </button>
                  <button
                    onClick={() => handleDeleteFacility(fac)}
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

      {/* Equipment Manager Section */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-soft overflow-hidden">
        <div
          className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50 transition-colors"
          onClick={() => setIsEquipManagerOpen(v => !v)}
        >
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-purple-100 text-purple-700 rounded-lg">
              <Package className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Special Equipment List Manager</h3>
              <p className="text-[10px] text-slate-500">{equipmentList.length} items • Citizens see these options when booking</p>
            </div>
          </div>
          <span className="text-xs font-semibold text-purple-700 bg-purple-50 px-3 py-1 rounded-full border border-purple-200">
            {isEquipManagerOpen ? '▲ Collapse' : '▼ Manage Equipment'}
          </span>
        </div>

        {isEquipManagerOpen && (
          <div className="border-t border-slate-200 p-4 space-y-3">
            {/* Add new item */}
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Add new equipment item..."
                value={newEquipItem}
                onChange={e => setNewEquipItem(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addEquipItem()}
                className="flex-1 px-3 py-1.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:border-purple-500 bg-slate-50"
              />
              <button
                onClick={addEquipItem}
                className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Add
              </button>
            </div>

            {/* Existing items */}
            <div className="space-y-1.5 max-h-64 overflow-y-auto">
              {equipmentList.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2 p-2 bg-slate-50 rounded-xl border border-slate-200">
                  {editingEquipIdx === idx ? (
                    <>
                      <input
                        autoFocus
                        className="flex-1 px-2 py-1 text-xs rounded-lg border border-purple-400 focus:outline-none"
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
            placeholder="Search reservations by ref, applicant..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-600 focus:bg-white text-slate-800"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
          {[
            { id: 'all', label: 'All Bookings' },
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
                  ? sf.id === 'LGU Endorsed' ? 'bg-purple-700 text-white shadow-sm' : 'bg-blue-600 text-white shadow-sm'
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
                  <th className="py-3 px-4">Facility Name</th>
                  <th className="py-3 px-4">Applicant & Purpose</th>
                  <th className="py-3 px-4">Event Schedule</th>
                  <th className="py-3 px-4">Attendees</th>
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
                    <td className="py-3.5 px-4 font-mono font-bold text-blue-600">
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
                      {r.event_date ? new Date(r.event_date).toLocaleDateString() : '—'}
                      <span className="block text-[10px] text-slate-400 font-mono">{r.start_time} - {r.end_time}</span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-700">{r.attendees} Pax</td>
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
        title={`Review Reservation — ${selectedRes?.reference_no}`}
        description="Full citizen-submitted booking details. Inspect LGU sponsorship proof and process approval."
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
          const activityType = (selectedRes as any).activity_type || (isLGU ? 'LGU Activity' : 'Standard Activity');

          return (
          <div className="space-y-4 text-xs">
            {/* Status Banner */}
            <div className="flex items-center justify-between">
              <Badge variant={selectedRes.status === 'Approved' || selectedRes.status === 'Paid' ? 'success' : selectedRes.status === 'Pending Payment' ? 'info' : selectedRes.status === 'Rejected' ? 'destructive' : 'warning'} size="md">
                {selectedRes.status === 'Pending Payment' ? 'Waiting for Payment' : selectedRes.status}
              </Badge>
              <span className="text-[10px] font-mono text-slate-400">{selectedRes.reference_no}</span>
            </div>

            {/* Facility & Schedule */}
            <div className={`p-3.5 rounded-xl border space-y-1.5 ${isLGU ? 'bg-purple-50 border-purple-200' : 'bg-blue-50 border-blue-200'}`}>
              <div className="flex items-center justify-between mb-1">
                <p className="font-bold text-slate-700 text-[11px] uppercase tracking-wider">📍 Venue & Schedule</p>
                {activityType && (
                  <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                    isLGU
                      ? 'bg-purple-100 text-purple-800 border-purple-300'
                      : 'bg-blue-100 text-blue-800 border-blue-300'
                  }`}>
                    {isLGU ? '🏛️ LGU Activity (Sponsored Free)' : '🏢 Government Facility Booking'}
                  </span>
                )}
              </div>
              <p><span className="font-bold text-slate-700">Facility:</span> {selectedRes.facility_name}</p>
              {eventName && <p><span className="font-bold text-slate-700">Event Name:</span> <span className="font-semibold text-slate-900">{eventName}</span></p>}
              <p><span className="font-bold text-slate-700">Date:</span> {new Date(selectedRes.event_date).toLocaleDateString('en-PH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
              <p><span className="font-bold text-slate-700">Time:</span> {selectedRes.start_time} – {selectedRes.end_time}</p>
              <p><span className="font-bold text-slate-700">Expected Attendees:</span> <strong className="text-blue-800">{selectedRes.attendees} Pax</strong></p>
            </div>

            {/* Applicant Info */}
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
              <p className="font-bold text-slate-900 text-xs uppercase tracking-wider">👤 Citizen / Applicant Information</p>
              <p><span className="font-bold text-slate-700">Name:</span> {selectedRes.applicant_name}</p>
              <p><span className="font-bold text-slate-700">Email:</span> {selectedRes.applicant_email || '—'}</p>
              <p><span className="font-bold text-slate-700">Contact:</span> {selectedRes.applicant_phone || '—'}</p>
              <p><span className="font-bold text-slate-700">Purpose:</span> {selectedRes.purpose}</p>
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
              <div className="p-3.5 bg-purple-50 rounded-xl border border-purple-200 space-y-1.5">
                <p className="font-bold text-purple-900 text-xs uppercase tracking-wider">🔧 Special Equipment Requirements</p>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {(Array.isArray(selectedRes.special_equipment)
                    ? selectedRes.special_equipment
                    : String(selectedRes.special_equipment).split(',').map((s: string) => s.trim())
                  ).filter(Boolean).map((eq: string, i: number) => (
                    <span key={i} className="px-2 py-0.5 bg-purple-100 text-purple-800 text-[10px] font-semibold rounded-full border border-purple-200">{eq}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Computed Fee Breakdown — always visible for facility tickets */}
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
                  <div className="bg-blue-50 border border-blue-300 rounded-lg p-2">
                    <span className="text-[10px] text-blue-600 block font-semibold">Total Fee</span>
                    <span className="font-extrabold text-blue-900 font-mono">
                      ₱{((selectedRes as any).fee_amount || calculateFacilityFee(selectedRes.start_time, selectedRes.end_time, selectedRes.hourly_rate || 0)).toLocaleString()}.00
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* SET PAYMENT DUE DATE & FEE - shown when Approved, before issuing payment notice */}
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

            {/* Admin Review Remarks */}
            <div>
              <label className="block text-xs font-bold text-[#334155] mb-1.5">Admin Approval / Rejection Remarks:</label>
              <textarea
                rows={2}
                value={reviewRemarks}
                onChange={(e) => setReviewRemarks(e.target.value)}
                placeholder="Add official remarks, conditions, or reason for rejection..."
                className="w-full rounded-xl border border-slate-300 p-2.5 text-xs focus:outline-none focus:border-blue-600"
              />
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <div className="flex gap-2">
                {/* Pending Review: only Reject + Approve */}
                {(selectedRes.status === 'Pending' || selectedRes.status === 'Pending Review') && (
                  <>
                    <Button size="sm" variant="danger" className="font-bold text-xs" onClick={() => handleUpdateStatus('Rejected')}>
                      ✕ Reject Booking
                    </Button>
                    <Button size="sm" variant="success" className="bg-emerald-600 hover:bg-emerald-700 font-bold text-white text-xs" onClick={() => handleUpdateStatus('Approved')}>
                      {isLGU ? '🏛️ Verify & Approve (LGU Free)' : '✓ Approve Booking'}
                    </Button>
                  </>
                )}
                {/* Approved: Return to Pending Review */}
                {selectedRes.status === 'Approved' && (
                  <Button size="sm" variant="outline" className="font-bold text-xs text-amber-700 border-amber-300 hover:bg-amber-50" onClick={() => handleUpdateStatus('Pending Review')}>
                    ↩ Return to Pending Review
                  </Button>
                )}
                {/* Waiting for Payment: Return to Pending Review */}
                {selectedRes.status === 'Pending Payment' && (
                  <Button size="sm" variant="outline" className="font-bold text-xs text-amber-700 border-amber-300 hover:bg-amber-50" onClick={() => handleUpdateStatus('Pending Review')}>
                    ↩ Return to Pending Review
                  </Button>
                )}
                {/* Rejected: Return to Pending Review */}
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
                {/* Approved: Issue Payment Notice */}
                {selectedRes.status === 'Approved' && (
                  isLGU ? (
                    <Button size="sm" variant="success" className="bg-purple-600 hover:bg-purple-700 font-bold text-white text-xs" onClick={() => handleUpdateStatus('LGU Endorsed')}>
                      🏛️ Grant LGU Official Endorsement (Free)
                    </Button>
                  ) : (
                    <Button size="sm" variant="success" className="bg-blue-600 hover:bg-blue-700 font-bold text-white text-xs" onClick={() => handleUpdateStatus('Pending Payment')}>
                      Grant Reservation & Issue Payment Notice
                    </Button>
                  )
                )}
                {/* Waiting for Payment: Confirm Cash Received */}
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



      {/* Status Animation Toast / Modal */}
      <StatusAnimationModal
        isOpen={animModal.isOpen}
        type={animModal.type}
        title={animModal.title}
        message={animModal.message}
        onClose={() => setAnimModal(prev => ({ ...prev, isOpen: false }))}
      />

      {/* Modal: Add / Edit Government Facility */}
      <Modal
        isOpen={isFacilityFormOpen}
        onClose={() => setIsFacilityFormOpen(false)}
        title={editingFacility ? `Edit Facility: ${editingFacility.name}` : 'Add New Government Facility'}
        description="Fill in the details for the Government Facility venue."
        maxWidth="lg"
      >
        <form onSubmit={handleSaveFacility} className="space-y-3 text-xs">
          <Input
            label="Facility Name *"
            required
            value={facilityForm.name}
            onChange={e => setFacilityForm({ ...facilityForm, name: e.target.value })}
            placeholder="e.g. Barangay 178 Multi-Purpose Civic Center"
          />
          <Input
            label="Location / Address Tag *"
            required
            value={facilityForm.location}
            onChange={e => setFacilityForm({ ...facilityForm, location: e.target.value })}
            placeholder="e.g. Civic Complex, Mindanao Ave."
          />
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#334155] mb-1">Maximum Capacity (Pax) *</label>
              <input type="number" required min="1" value={facilityForm.capacity}
                onChange={e => setFacilityForm({ ...facilityForm, capacity: e.target.value })}
                className="w-full rounded-xl border border-slate-300 p-2 text-xs focus:outline-none focus:border-blue-600"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#334155] mb-1">Morning Slot Rate (₱) *</label>
              <input type="number" required min="0" step="1" value={facilityForm.morning_rate}
                onChange={e => setFacilityForm({ ...facilityForm, morning_rate: e.target.value, hourly_rate: e.target.value })}
                className="w-full rounded-xl border border-slate-300 p-2 text-xs focus:outline-none focus:border-blue-600"
              />
              <p className="text-[10px] text-slate-400 mt-0.5">08:00 AM – 12:00 PM</p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#334155] mb-1">Afternoon Slot Rate (₱) *</label>
              <input type="number" required min="0" step="1" value={facilityForm.afternoon_rate}
                onChange={e => setFacilityForm({ ...facilityForm, afternoon_rate: e.target.value })}
                className="w-full rounded-xl border border-slate-300 p-2 text-xs focus:outline-none focus:border-blue-600"
              />
              <p className="text-[10px] text-slate-400 mt-0.5">01:00 PM – 05:00 PM</p>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#334155] mb-1">
              Venue Specifications & Features (Specs) *
            </label>
            <textarea
              rows={2}
              required
              value={facilityForm.amenities}
              onChange={e => setFacilityForm({ ...facilityForm, amenities: e.target.value })}
              placeholder="e.g. Fully air-conditioned, elevated stage, 300 cushioned monoblock chairs, high-lumen LED projector"
              className="w-full rounded-xl border border-slate-300 p-2 text-xs focus:outline-none focus:border-blue-600"
            />
            <p className="text-[10px] text-slate-400 mt-0.5">Citizens will see these exact specifications under "Selected Venue Specs" when reserving.</p>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#334155] mb-1">Status</label>
            <select value={facilityForm.status}
              onChange={e => setFacilityForm({ ...facilityForm, status: e.target.value })}
              className="w-full rounded-xl border border-slate-300 p-2 text-xs focus:outline-none focus:border-blue-600 font-medium"
            >
              <option value="Available">Available (Visible & Bookable by Citizens)</option>
              <option value="Not Available">Not Available (Hidden from Citizens)</option>
            </select>
          </div>

          {/* 2 Image Uploads for Citizen Viewing */}
          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
              <span className="font-bold text-slate-800 text-[11px] flex items-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5 text-blue-600" />
                Venue Images for Citizen Viewing (2 Images)
              </span>
              <span className="text-[10px] text-slate-500">Citizens see these during ticket booking</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Photo 1: Main View / Exterior */}
              <div className="space-y-1.5 bg-white p-2.5 rounded-xl border border-slate-200">
                <span className="text-[11px] font-bold text-slate-700 block">Photo 1: Exterior / Main View</span>
                {facilityForm.image_url ? (
                  <div className="relative rounded-lg overflow-hidden border border-slate-200 h-24 bg-slate-100 group">
                    <img src={facilityForm.image_url} alt="Photo 1" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setFacilityForm(prev => ({ ...prev, image_url: '' }))}
                      className="absolute top-1 right-1 p-1 bg-red-600 text-white rounded-md text-[10px] hover:bg-red-700 shadow"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-300 hover:border-blue-400 rounded-lg p-3 text-center cursor-pointer bg-slate-50 transition-colors">
                    <Upload className="w-5 h-5 text-slate-400 mb-1" />
                    <span className="text-[10px] font-bold text-blue-600">Upload Photo 1</span>
                    <span className="text-[9px] text-slate-400">JPG, PNG (Auto-compressed)</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFacilityImageUpload(file, 'image_url');
                      }}
                    />
                  </label>
                )}
                <input
                  type="text"
                  placeholder="Or paste Image 1 URL..."
                  value={facilityForm.image_url}
                  onChange={e => setFacilityForm({ ...facilityForm, image_url: e.target.value })}
                  className="w-full p-1.5 text-[10px] border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Photo 2: Interior / Stage / Facilities */}
              <div className="space-y-1.5 bg-white p-2.5 rounded-xl border border-slate-200">
                <span className="text-[11px] font-bold text-slate-700 block">Photo 2: Interior / Hall / Facilities</span>
                {facilityForm.image_url_2 ? (
                  <div className="relative rounded-lg overflow-hidden border border-slate-200 h-24 bg-slate-100 group">
                    <img src={facilityForm.image_url_2} alt="Photo 2" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setFacilityForm(prev => ({ ...prev, image_url_2: '' }))}
                      className="absolute top-1 right-1 p-1 bg-red-600 text-white rounded-md text-[10px] hover:bg-red-700 shadow"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-300 hover:border-blue-400 rounded-lg p-3 text-center cursor-pointer bg-slate-50 transition-colors">
                    <Upload className="w-5 h-5 text-slate-400 mb-1" />
                    <span className="text-[10px] font-bold text-blue-600">Upload Photo 2</span>
                    <span className="text-[9px] text-slate-400">JPG, PNG (Auto-compressed)</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFacilityImageUpload(file, 'image_url_2');
                      }}
                    />
                  </label>
                )}
                <input
                  type="text"
                  placeholder="Or paste Image 2 URL..."
                  value={facilityForm.image_url_2}
                  onChange={e => setFacilityForm({ ...facilityForm, image_url_2: e.target.value })}
                  className="w-full p-1.5 text-[10px] border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button type="button" onClick={() => setIsFacilityFormOpen(false)}
              className="px-4 py-1.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >Cancel</button>
            <button type="submit" disabled={isSavingFacility}
              className="px-5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold shadow-sm transition-colors flex items-center gap-1.5"
            >
              {isSavingFacility ? 'Saving...' : editingFacility ? 'Save Changes' : 'Add Facility'}
            </button>
          </div>
        </form>
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
                  <ExternalLink className="w-3.5 h-3.5" />
                  Open in New Tab
                </a>
                <button
                  type="button"
                  onClick={() => setLightboxProof(null)}
                  className="px-4 py-1.5 bg-purple-700 hover:bg-purple-800 text-white font-bold rounded-xl transition-colors shadow-xs"
                >
                  Close Viewer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
