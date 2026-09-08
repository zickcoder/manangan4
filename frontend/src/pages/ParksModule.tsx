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
  X
} from 'lucide-react';
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
  createFacility,
  updateFacility,
  deleteFacility,
  calculateBookingHours,
  calculateFacilityFee
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
    name: '', category: 'Park & Recreation', capacity: '300', hourly_rate: '0', status: 'Available', amenities: ''
  });

  const openAddPark = () => {
    setEditingPark(null);
    setParkForm({ name: '', category: 'Park & Recreation', capacity: '300', hourly_rate: '0', status: 'Available', amenities: '' });
    setIsParkFormOpen(true);
  };

  const openEditPark = (p: Facility) => {
    setEditingPark(p);
    setParkForm({
      name: p.name,
      category: p.category,
      capacity: String(p.capacity),
      hourly_rate: String(p.hourly_rate),
      status: (p as any).status === 'Not Available' ? 'Not Available' : 'Available',
      amenities: p.amenities || ''
    });
    setIsParkFormOpen(true);
  };

  const handleSavePark = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      ...parkForm,
      location: editingPark?.location || 'Public Recreation Ground Sector',
      amenities: parkForm.amenities.trim() || 'Standard Park & Recreation Amenities',
      image_url: editingPark?.image_url || null,
      capacity: parseInt(parkForm.capacity) || 100,
      hourly_rate: parseFloat(parkForm.hourly_rate) || 0
    };
    if (editingPark) {
      await updateFacility(editingPark.id, payload);
    } else {
      await createFacility(payload);
    }
    setIsParkFormOpen(false);
    loadData();
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
    localStorage.setItem('govserve_equipment_parks', JSON.stringify(list));
    window.dispatchEvent(new Event('govserve_data_updated'));
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
      loadData();

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
      }, 500);
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
        title: 'Scheduling Park Event...',
        message: 'Reserving park ground and generating ticket.'
      });

      const parkObj = parks.find(p => p.id === Number(newForm.facility_id)) || parks[0];
      await createReservation({
        ...newForm,
        facility_category: 'Park & Recreation',
        facility_name: parkObj?.name,
        facility_location: parkObj?.location,
        hourly_rate: parkObj?.hourly_rate
      });
      setIsNewModalOpen(false);
      loadData();

      setTimeout(() => {
        setAnimModal({
          isOpen: true,
          type: 'success',
          title: '✓ Park Schedule Submitted!',
          message: 'Booking submitted to Pending Review queue.'
        });
      }, 500);
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
        {parks.map((p) => (
          <Card key={p.id} hoverEffect className="border-[#cbd5e1] p-5 space-y-2 bg-gradient-to-br from-emerald-50/40 to-white">
            <div className="flex justify-between items-start">
              <span className="text-[10px] font-bold text-emerald-700 uppercase bg-emerald-100 px-2 py-0.5 rounded border border-emerald-200">
                Capacity: {p.capacity} Pax
              </span>
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                  ((p as any).status || 'Available') === 'Available'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-rose-50 text-rose-700 border-rose-200'
                }`}>
                  {((p as any).status || 'Available') === 'Available' ? '● Available' : '○ Not Available'}
                </span>
                <span className="text-xs font-bold text-slate-900">₱{p.hourly_rate} / hr</span>
              </div>
            </div>
            <h3 className="text-base font-bold text-slate-900 leading-tight">{p.name}</h3>
            <p className="text-xs text-slate-600">{p.location}</p>
            <p className="text-[11px] text-slate-500 border-t border-slate-100 pt-2">{p.amenities}</p>
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => openEditPark(p)}
                className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-[10px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors"
              >
                <Pencil className="w-3 h-3" /> Edit
              </button>
              <button
                onClick={() => handleDeletePark(p)}
                className="flex items-center justify-center gap-1 px-2 py-1.5 text-[10px] font-bold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-colors"
              >
                <Trash2 className="w-3 h-3" /> Delete
              </button>
            </div>
          </Card>
        ))}
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

          <div className="grid grid-cols-3 gap-3">
            <Input
              label="Date *"
              type="date"
              required
              value={newForm.event_date}
              onChange={(e) => setNewForm({ ...newForm, event_date: e.target.value })}
            />
            <Input
              label="Start Time *"
              required
              value={newForm.start_time}
              onChange={(e) => setNewForm({ ...newForm, start_time: e.target.value })}
            />
            <Input
              label="End Time *"
              required
              value={newForm.end_time}
              onChange={(e) => setNewForm({ ...newForm, end_time: e.target.value })}
            />
          </div>

          <div className="pt-3 flex justify-end gap-2">
            <Button size="sm" variant="outline" type="button" onClick={() => setIsNewModalOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" variant="success" type="submit">
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
        onClose={() => setAnimModal({ ...animModal, isOpen: false })}
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
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#334155] mb-1">Maximum Capacity (Pax) *</label>
              <input type="number" required min="1" value={parkForm.capacity}
                onChange={e => setParkForm({ ...parkForm, capacity: e.target.value })}
                className="w-full rounded-xl border border-slate-300 p-2 text-xs focus:outline-none focus:border-emerald-600"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#334155] mb-1">Price Per Hour (₱/hr) *</label>
              <input type="number" required min="0" step="0.01" value={parkForm.hourly_rate}
                onChange={e => setParkForm({ ...parkForm, hourly_rate: e.target.value })}
                className="w-full rounded-xl border border-slate-300 p-2 text-xs focus:outline-none focus:border-emerald-600"
              />
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
          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button type="button" onClick={() => setIsParkFormOpen(false)}
              className="px-4 py-1.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >Cancel</button>
            <button type="submit"
              className="px-5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition-colors"
            >{editingPark ? 'Save Changes' : 'Add Park / Ground'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
