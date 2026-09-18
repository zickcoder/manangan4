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
  MapPin
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
  createReservation,
  checkDoubleBooking,
  createFacility,
  updateFacility,
  deleteFacility,
  calculateBookingHours,
  calculateFacilityFee,
  calculateSlotFee
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
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [reviewRemarks, setReviewRemarks] = useState('');

  // Park CRUD
  const [isParkFormOpen, setIsParkFormOpen] = useState(false);
  const [editingPark, setEditingPark] = useState<Facility | null>(null);
  const [parkForm, setParkForm] = useState({
    name: '', category: 'Park & Recreation', capacity: '300', hourly_rate: '0',
    morning_rate: '0', afternoon_rate: '0',
    status: 'Available', amenities: '',
    image_url: '',
    image_url_2: ''
  });

  const openAddPark = () => {
    setEditingPark(null);
    setParkForm({ name: '', category: 'Park & Recreation', capacity: '300', hourly_rate: '0', morning_rate: '0', afternoon_rate: '0', status: 'Available', amenities: '', image_url: '', image_url_2: '' });
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
        location: editingPark?.location || 'Public Recreation Ground Sector',
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

  // AI Conflict check state for parks
  const [aiChecking, setAiChecking] = useState(false);
  const [aiResult, setAiResult] = useState<any>(null);

  const handleCheckAIPark = async () => {
    setAiChecking(true);
    setAiResult(null);
    const parkObj = parks.find(p => p.id === Number(newForm.facility_id)) || parks[0];
    if (!parkObj) { setAiChecking(false); return; }
    try {
      const conflict = await checkDoubleBooking(
        parkObj.id,
        parkObj.name,
        newForm.event_date,
        newForm.start_time,
        newForm.end_time,
        undefined,
        undefined,
        undefined,
        'Park & Recreation'
      );
      setAiResult(conflict);
    } catch (e) {
      console.error(e);
    } finally {
      setAiChecking(false);
    }
  };

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

  const [newForm, setNewForm] = useState({
    facility_id: 4,
    applicant_name: '',
    applicant_email: '',
    applicant_phone: '',
    purpose: '',
    event_date: new Date().toISOString().split('T')[0],
    start_time: '08:00 AM',
    end_time: '12:00 PM',
    attendees: '80',
    remarks: '',
  });

  const loadData = async () => {
    try {
      const [parkList, resList] = await Promise.all([
        fetchFacilities('Park & Recreation'),
        fetchReservations(statusFilter, 'Park & Recreation', true),
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

      const computedFee = calculateFacilityFee(selectedRes.start_time, selectedRes.end_time, selectedRes.hourly_rate || 0);
      const fee = (selectedRes as any).fee_amount || computedFee || (selectedRes.hourly_rate ? selectedRes.hourly_rate * 4 : 1500);
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
        if (status === 'Paid') {
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

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setAnimModal({
        isOpen: true,
        type: 'loading',
        title: 'Checking Availability...',
        message: 'Verifying park schedule for conflicts.'
      });

      const durationHours = calculateBookingHours(newForm.start_time, newForm.end_time);
      if (durationHours < 1 || newForm.start_time.trim().toLowerCase() === newForm.end_time.trim().toLowerCase()) {
        setAnimModal({
          isOpen: true,
          type: 'rejected',
          title: 'Invalid Booking Duration',
          message: 'Start Time and End Time cannot be the same. The reservation duration must be at least 1 hour (e.g. 08:00 AM to 09:00 AM).'
        });
        return;
      }

      const parkObj = parks.find(p => p.id === Number(newForm.facility_id));

      // Double booking check
      if (parkObj && newForm.event_date && newForm.start_time && newForm.end_time) {
        const conflict = await checkDoubleBooking(
          parkObj.id,
          parkObj.name,
          newForm.event_date,
          newForm.start_time,
          newForm.end_time,
          undefined,
          undefined,
          undefined,
          'Park & Recreation'
        );
        if (conflict.hasConflict) {
          setAnimModal({
            isOpen: true,
            type: 'rejected',
            title: '⚠️ Schedule Conflict Detected',
            message: conflict.message
          });
          return;
        }
      }

      setAnimModal({
        isOpen: true,
        type: 'loading',
        title: 'Scheduling Park Event...',
        message: 'Reserving park ground and generating ticket.'
      });

      await createReservation({
        ...newForm,
        facility_category: 'Park & Recreation',
        facility_name: parkObj?.name,
        facility_location: parkObj?.location,
        hourly_rate: parkObj?.hourly_rate
      });
      setIsNewModalOpen(false);
      // govserve_data_updated event from createReservation will trigger debounced loadData automatically

      setTimeout(() => {
        setAnimModal({
          isOpen: true,
          type: 'success',
          title: '✓ Park Schedule Submitted!',
          message: 'Booking submitted to Pending Review queue.'
        });
      }, 200);
    } catch (e) {
      setAnimModal({
        isOpen: true,
        type: 'rejected',
        title: 'Booking Failed',
        message: 'Failed to schedule park event.'
      });
    }
  };

  const filtered = reservations.filter(r => {
    const matchesQuery = r.reference_no.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.applicant_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.purpose.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (statusFilter === 'all') return matchesQuery;
    if (statusFilter === 'Pending Review') {
      return matchesQuery && (r.status === 'Pending' || r.status === 'Pending Review');
    }
    return matchesQuery && r.status === statusFilter;
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
          {['all', 'Pending Review', 'Approved', 'Pending Payment', 'Paid', 'Rejected'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                statusFilter === status
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
              }`}
            >
              {status === 'all' ? 'All Park Bookings' : status === 'Pending Payment' ? 'Waiting for Payment' : status}
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
                {filtered.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-emerald-700">{r.reference_no}</td>
                    <td className="py-3.5 px-4 font-bold text-slate-800">{r.facility_name}</td>
                    <td className="py-3.5 px-4 max-w-[200px]">
                      <p className="font-bold text-slate-900 truncate">{r.applicant_name}</p>
                      <p className="text-[10px] text-slate-500 truncate">{r.purpose}</p>
                    </td>
                    <td className="py-3.5 px-4 text-slate-700">{new Date(r.event_date).toLocaleDateString()}</td>
                    <td className="py-3.5 px-4 text-slate-700">{r.start_time} - {r.end_time}</td>
                    <td className="py-3.5 px-4">
                      <Badge variant={r.status === 'Approved' || r.status === 'Paid' ? 'success' : r.status === 'Pending Payment' ? 'info' : r.status === 'Rejected' ? 'destructive' : 'warning'}>
                        {r.status === 'Pending Payment' ? 'Waiting for Payment' : r.status}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
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
                ))}
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
        description="Verify park availability, set payment due date, and process approval."
        maxWidth="lg"
      >
        {selectedRes && (
          <div className="space-y-4 text-xs">
            <div className="p-3.5 bg-emerald-50 rounded-xl border border-emerald-200 space-y-1">
              <p><span className="font-bold text-slate-700">Park Ground:</span> {selectedRes.facility_name}</p>
              <p><span className="font-bold text-slate-700">Organizer:</span> {selectedRes.applicant_name} ({selectedRes.applicant_phone})</p>
              <p><span className="font-bold text-slate-700">Event:</span> {selectedRes.purpose}</p>
              <p><span className="font-bold text-slate-700">Schedule:</span> {new Date(selectedRes.event_date).toLocaleDateString()} ({selectedRes.start_time} - {selectedRes.end_time})</p>
            </div>

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

            {/* Computed Fee Breakdown — always visible for park tickets */}
            {(selectedRes.hourly_rate > 0 || (selectedRes as any).fee_amount > 0) && (
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
                <p className="font-bold text-amber-900 text-[11px]">🗓️ Grant Payment Notice — Computed fee will be charged to citizen. Payment due in 3 days.</p>
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
                      ✓ Approve Booking
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
                  <Button size="sm" variant="success" className="bg-emerald-600 hover:bg-emerald-700 font-bold text-white text-xs" onClick={() => handleUpdateStatus('Pending Payment')}>
                    Grant Reservation & Issue Payment Notice
                  </Button>
                )}
                {selectedRes.status === 'Pending Payment' && (
                  <Button size="sm" variant="success" className="bg-emerald-600 hover:bg-emerald-700 font-bold text-white text-xs" onClick={() => handleUpdateStatus('Paid')}>
                    ✓ Approve Payment (Cash Received)
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal: New Booking */}
      <Modal
        isOpen={isNewModalOpen}
        onClose={() => setIsNewModalOpen(false)}
        title="Schedule Park or Recreation Ground"
        description="Reserve public plaza or sports grounds."
      >
        <form onSubmit={handleCreate} className="space-y-3 text-xs">
          <div>
            <label className="block text-xs font-semibold text-[#334155] mb-1">Select Park Ground *</label>
            <select
              value={newForm.facility_id}
              onChange={(e) => setNewForm({ ...newForm, facility_id: parseInt(e.target.value) })}
              className="w-full rounded-xl border border-slate-300 p-2 text-xs"
            >
              {parks.map(p => (
                <option key={p.id} value={p.id}>{p.name} ({p.location})</option>
              ))}
            </select>
          </div>

          <Input
            label="Applicant / Organization *"
            required
            value={newForm.applicant_name}
            onChange={(e) => setNewForm({ ...newForm, applicant_name: e.target.value })}
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Email Address *"
              type="email"
              required
              value={newForm.applicant_email}
              onChange={(e) => setNewForm({ ...newForm, applicant_email: e.target.value })}
            />
            <Input
              label="Phone Number *"
              required
              value={newForm.applicant_phone}
              onChange={(e) => setNewForm({ ...newForm, applicant_phone: e.target.value })}
            />
          </div>

          <Input
            label="Event Purpose *"
            required
            placeholder="e.g. Youth Soccer Clinic / Senior Morning Calisthenics"
            value={newForm.purpose}
            onChange={(e) => setNewForm({ ...newForm, purpose: e.target.value })}
          />

          <div className="space-y-3">
            <Input
              label="Date *"
              type="date"
              required
              value={newForm.event_date}
              onChange={(e) => { setNewForm({ ...newForm, event_date: e.target.value }); setAiResult(null); }}
            />
            {/* 2-Slot Checklist */}
            {(() => {
              const isMorning = newForm.start_time === '08:00 AM' && (newForm.end_time === '12:00 PM' || newForm.end_time === '05:00 PM');
              const isAfternoon = (newForm.start_time === '01:00 PM' && newForm.end_time === '05:00 PM') || (newForm.start_time === '08:00 AM' && newForm.end_time === '05:00 PM');
              const isBoth = isMorning && isAfternoon;
              const selPark = parks.find(p => p.id === Number(newForm.facility_id));
              const mPrice = Number((selPark as any)?.morning_rate ?? selPark?.hourly_rate ?? 0);
              const aPrice = Number((selPark as any)?.afternoon_rate ?? selPark?.hourly_rate ?? 0);
              const slotInfo = selPark ? calculateSlotFee(newForm.start_time, newForm.end_time, selPark) : { hours: 4, fee: 0 };

              const toggle = (slot: 'morning' | 'afternoon') => {
                if (slot === 'morning') {
                  if (isMorning) {
                    setNewForm(prev => ({ ...prev, start_time: '01:00 PM', end_time: '05:00 PM' }));
                  } else if (isAfternoon) {
                    setNewForm(prev => ({ ...prev, start_time: '08:00 AM', end_time: '05:00 PM' }));
                  } else {
                    setNewForm(prev => ({ ...prev, start_time: '08:00 AM', end_time: '12:00 PM' }));
                  }
                } else {
                  if (isAfternoon) {
                    setNewForm(prev => ({ ...prev, start_time: '08:00 AM', end_time: '12:00 PM' }));
                  } else if (isMorning) {
                    setNewForm(prev => ({ ...prev, start_time: '08:00 AM', end_time: '05:00 PM' }));
                  } else {
                    setNewForm(prev => ({ ...prev, start_time: '01:00 PM', end_time: '05:00 PM' }));
                  }
                }
                setAiResult(null);
              };

              return (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-[#334155] uppercase tracking-wider">Select Time Slot *</label>
                    <button type="button"
                      onClick={() => {
                        isBoth
                          ? setNewForm(prev => ({ ...prev, start_time: '08:00 AM', end_time: '12:00 PM' }))
                          : setNewForm(prev => ({ ...prev, start_time: '08:00 AM', end_time: '05:00 PM' }));
                        setAiResult(null);
                      }}
                      className={`text-[11px] font-bold px-3 py-1 rounded-lg transition-all cursor-pointer ${
                        isBoth ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {isBoth ? '✓ Both (Full Day)' : '+ Book Both Slots (Full Day)'}
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div onClick={() => toggle('morning')}
                      className={`p-3 rounded-xl border cursor-pointer select-none transition-all ${
                        isMorning ? 'bg-emerald-50 border-emerald-500 ring-1 ring-emerald-400/30' : 'bg-white border-slate-200 hover:bg-slate-50'
                      }`}>
                      <p className="font-bold text-xs">{isMorning ? '✓ ' : ''}Morning</p>
                      <p className="text-[11px] text-slate-500">08:00 AM – 12:00 PM</p>
                      <p className="text-[11px] font-bold text-emerald-600">₱{mPrice.toLocaleString()}</p>
                    </div>
                    <div onClick={() => toggle('afternoon')}
                      className={`p-3 rounded-xl border cursor-pointer select-none transition-all ${
                        isAfternoon ? 'bg-emerald-50 border-emerald-500 ring-1 ring-emerald-400/30' : 'bg-white border-slate-200 hover:bg-slate-50'
                      }`}>
                      <p className="font-bold text-xs">{isAfternoon ? '✓ ' : ''}Afternoon</p>
                      <p className="text-[11px] text-slate-500">01:00 PM – 05:00 PM</p>
                      <p className="text-[11px] font-bold text-emerald-600">₱{aPrice.toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="p-2.5 bg-emerald-50 rounded-xl border border-emerald-200 text-xs flex items-center justify-between">
                    <span className="text-emerald-700 font-semibold">{slotInfo.hours} hrs: {newForm.start_time} – {newForm.end_time}</span>
                    <span className="font-extrabold text-emerald-900 font-mono">₱{slotInfo.fee.toLocaleString()}.00</span>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* AI Double-Booking Checker */}
          <div className="border border-emerald-200 rounded-xl p-3 bg-emerald-50/60 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-xs font-bold text-emerald-900">AI Availability Checker</span>
                <span className="text-[10px] text-emerald-600 bg-emerald-100 px-1.5 py-0.5 rounded-full font-semibold border border-emerald-200">Smart Conflict Detection</span>
              </div>
              <button
                type="button"
                onClick={handleCheckAIPark}
                disabled={aiChecking || !newForm.event_date || !newForm.start_time || !newForm.end_time}
                className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white transition-colors"
              >
                {aiChecking ? (
                  <><span className="inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> Checking...</>
                ) : (
                  <><Sparkles className="w-3 h-3" /> Check Availability</>
                )}
              </button>
            </div>

            {aiResult && (
              <div className={`rounded-lg p-2.5 text-xs font-medium border ${
                aiResult.hasConflict
                  ? 'bg-red-50 border-red-200 text-red-800'
                  : 'bg-emerald-50 border-emerald-300 text-emerald-800'
              }`}>
                {aiResult.hasConflict ? (
                  <>
                    <p className="font-bold text-red-900 mb-1">⚠️ Schedule Conflict Detected</p>
                    <p className="text-[11px] leading-relaxed">{aiResult.message}</p>
                    {aiResult.suggestedSlots?.length > 0 && (
                      <p className="text-[10px] text-red-600 mt-1 font-semibold">
                        Suggested alternative: {aiResult.suggestedSlots[0]}
                      </p>
                    )}
                  </>
                ) : (
                  <p className="font-bold text-emerald-900">✓ Slot is Available — No conflicts detected for this park on the selected schedule.</p>
                )}
              </div>
            )}

            {!aiResult && !aiChecking && (
              <p className="text-[10px] text-emerald-700">
                Fill in date and time, then click <strong>Check Availability</strong> to verify no double-booking before confirming.
              </p>
            )}
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <Button size="sm" variant="outline" type="button" onClick={() => { setIsNewModalOpen(false); setAiResult(null); }}>
              Cancel
            </Button>
            <Button
              size="sm"
              variant="success"
              type="submit"
              className={aiResult?.hasConflict ? 'opacity-50 cursor-not-allowed' : ''}
            >
              Confirm Park Schedule
            </Button>
          </div>
        </form>
      </Modal>

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
