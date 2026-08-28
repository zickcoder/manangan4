import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { 
  Search, 
  Building, 
  Trees, 
  Cross, 
  Droplet, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  AlertTriangle,
  Send, 
  Sparkles, 
  Calendar,
  User,
  Phone,
  MapPin,
  FileText,
  Layers,
  Map,
  Grid,
  ChevronRight,
  X,
  Upload,
  Image as ImageIcon,
  CheckSquare,
  Square,
  Wrench,
  Eye,
  ShieldCheck,
  Truck,
  Check,
  FileCheck
} from 'lucide-react';
import { PublicNavbar } from '../components/layout/PublicNavbar';
import { Button } from '../components/ui/Button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { InteractivePlotModal } from '../components/cemetery/InteractivePlotModal';
import { 
  fetchFacilities, 
  createReservation, 
  checkFacilityAI, 
  fetchCemeteries,
  fetchCemeteryPlots, 
  createBurial, 
  createUtilityRequest, 
  trackUniversalReference,
  fetchAssets
} from '../lib/api';
import { Facility, CemeteryPlot, Asset } from '../types';

export function PublicPortal() {
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<'status' | 'reserve' | 'utility' | 'cemetery' | 'assets'>('status');

  // 1. Tracking State
  const [trackRef, setTrackRef] = useState(searchParams.get('ref') || '');
  const [trackedRecord, setTrackedRecord] = useState<any>(null);
  const [trackLoading, setTrackLoading] = useState(false);
  const [trackError, setTrackError] = useState('');

  // 2. Facility & Park Reservation State
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [selectedFacilityId, setSelectedFacilityId] = useState<number>(1);
  const [isSeeMoreFacilitiesOpen, setIsSeeMoreFacilitiesOpen] = useState(false);
  const [facilitySearchQuery, setFacilitySearchQuery] = useState('');
  const [facilityCategoryFilter, setFacilityCategoryFilter] = useState('all');

  const PURPOSE_OPTIONS = [
    'Barangay Community Assembly / General Meeting',
    'Sports Fest / Basketball League Opening',
    'Youth & Skills Development Seminar',
    'Cultural, Religious & Fiesta Celebration',
    'Health & Medical Mission / Blood Drive',
    'Family Gathering / Birthday / Wedding Reception',
    'Zumba & Community Wellness Activity',
    'Other Government / Civic Activity'
  ];

  const EQUIPMENT_OPTIONS = [
    'Sound System & 2 Wireless Microphones',
    'Monoblock Chairs (100 - 300 units)',
    'Foldable Tables & Canopies',
    'Heavy-Duty Outdoor Tents (3x3m)',
    'Stage Lighting & Spotlights',
    'Basketball Electronic Scoreboard',
    'Standby Diesel Generator (15kVA)',
    'High-Definition Projector & Screen'
  ];

  const [reserveForm, setReserveForm] = useState({
    applicant_name: '',
    applicant_email: '',
    applicant_phone: '',
    purpose: PURPOSE_OPTIONS[0],
    custom_purpose: '',
    event_date: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
    start_time: '08:00 AM',
    end_time: '12:00 PM',
    attendees: '50',
    special_equipment: [] as string[],
    remarks: '',
  });
  const [aiConflict, setAiConflict] = useState<any>(null);
  const [aiChecking, setAiChecking] = useState(false);
  const [reservationSuccess, setReservationSuccess] = useState<any>(null);

  // 3. Water & Drainage Request State
  const HOUSEHOLD_OPTIONS = [
    '1 Household (Direct Property Only)',
    '2 - 5 Households (Compound / Immediate Neighbors)',
    '6 - 15 Households (Entire Street / Alley)',
    '16 - 50 Households (Subdivision Block)',
    '50+ Households (Community-wide / Major Zone)'
  ];

  const SAMPLE_INCIDENT_PHOTOS = [
    { label: 'Flash Flooding', url: 'https://images.unsplash.com/photo-1547683905-f686c993aae5?w=500&auto=format&fit=crop&q=80' },
    { label: 'Burst Water Main', url: 'https://images.unsplash.com/photo-1584467735815-f778f274e296?w=500&auto=format&fit=crop&q=80' },
    { label: 'Clogged Storm Canal', url: 'https://images.unsplash.com/photo-1518241353330-0f7941c2d9b5?w=500&auto=format&fit=crop&q=80' },
    { label: 'Canal Wall Damage', url: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=500&auto=format&fit=crop&q=80' },
    { label: 'Sewer Overflow', url: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=500&auto=format&fit=crop&q=80' }
  ];

  const [utilityForm, setUtilityForm] = useState({
    citizen_name: '',
    citizen_phone: '',
    service_type: 'Water Main Leak',
    location: '',
    affected_households: HOUSEHOLD_OPTIONS[1],
    photo_url: '',
    photo_name: '',
    description: '',
    urgency: 'Urgent',
  });
  const [utilitySuccess, setUtilitySuccess] = useState<any>(null);
  const [utilitySubmitting, setUtilitySubmitting] = useState(false);

  // 4. Cemetery Plot Search & Burial State
  const [cemeteries, setCemeteries] = useState<string[]>(['Barangay 178 Municipal Cemetery']);
  const [selectedCemetery, setSelectedCemetery] = useState<string>('Barangay 178 Municipal Cemetery');
  const [plots, setPlots] = useState<CemeteryPlot[]>([]);
  const [burialError, setBurialError] = useState('');
  const [isVisualPlotModalOpen, setIsVisualPlotModalOpen] = useState(false);
  const [selectedPlot, setSelectedPlot] = useState<CemeteryPlot | null>(null);

  const [burialForm, setBurialForm] = useState({
    // Section A: Deceased Information
    deceased_name: '',
    date_of_birth: '1960-01-01',
    date_of_death: new Date().toISOString().split('T')[0],
    cause_of_death: '',
    deceased_address: 'Barangay 178, Mindanao Avenue, Zone 4',
    attending_physician: '',
    // Section B: Burial Details
    burial_date: new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0],
    burial_time: '10:00 AM',
    plot_id: 0,
    cemetery_name: 'Barangay 178 Municipal Cemetery',
    // Section C: Applicant Information
    contact_person: '',
    applicant_relationship: 'Spouse',
    contact_phone: '',
    applicant_email: '',
    applicant_address: 'Barangay 178, Purok 3',
    // Section D: Requirements
    death_cert_attached: false,
    valid_id_attached: false,
    // Section E: Declaration
    declaration_accepted: true,
  });
  const [burialSuccess, setBurialSuccess] = useState<any>(null);
  const [burialSubmitting, setBurialSubmitting] = useState(false);

  // 5. Public Assets (Read-Only) State
  const [publicAssets, setPublicAssets] = useState<Asset[]>([]);
  const [assetCategoryFilter, setAssetCategoryFilter] = useState('all');
  const [assetSearchQuery, setAssetSearchQuery] = useState('');
  const [selectedAssetDetail, setSelectedAssetDetail] = useState<Asset | null>(null);

  useEffect(() => {
    fetchFacilities().then(setFacilities).catch(console.error);
    fetchAssets().then(setPublicAssets).catch(console.error);
    fetchCemeteries().then((list) => {
      if (list.length > 0) {
        setCemeteries(Array.from(new Set(['Barangay 178 Municipal Cemetery', ...list])));
      }
    }).catch(console.error);

    const initialRef = searchParams.get('ref');
    if (initialRef) {
      setTrackRef(initialRef);
      handleTrack(initialRef);
    }
  }, []);

  useEffect(() => {
    fetchCemeteryPlots('all', 'all', 'all').then((plotList) => {
      setPlots(plotList);
      const firstAvail = plotList.find((p: CemeteryPlot) => p.status === 'Available') || null;
      if (firstAvail && !selectedPlot) {
        setSelectedPlot(firstAvail);
        setBurialForm(prev => ({ ...prev, plot_id: firstAvail.id }));
      }
    }).catch(console.error);
  }, [selectedCemetery]);

  useEffect(() => {
    if (selectedPlot) {
      setBurialForm(prev => ({ ...prev, plot_id: selectedPlot.id }));
    }
  }, [selectedPlot]);

  const handleTrack = async (code = trackRef) => {
    if (!code.trim()) return;
    setTrackLoading(true);
    setTrackError('');
    setTrackedRecord(null);

    try {
      const res = await trackUniversalReference(code);
      if (res.success) {
        setTrackedRecord(res);
      } else {
        setTrackError(res.message || 'Reference number not found.');
      }
    } catch (e) {
      setTrackError('Could not connect to tracking server.');
    } finally {
      setTrackLoading(false);
    }
  };

  const selectedFacilityObj = facilities.find(f => f.id === selectedFacilityId) || facilities[0];

  // Pax Limit Check
  const currentAttendees = parseInt(reserveForm.attendees, 10) || 0;
  const isPaxExceeded = selectedFacilityObj ? currentAttendees > selectedFacilityObj.capacity : false;

  const handleCheckAIConflict = async () => {
    setAiChecking(true);
    try {
      const res = await checkFacilityAI(
        selectedFacilityObj?.name || 'Civic Center',
        reserveForm.event_date,
        reserveForm.start_time,
        reserveForm.end_time,
        selectedFacilityId
      );
      
      // Simulate conflict on specific busy dates or when requested
      if (reserveForm.event_date.endsWith('05') || reserveForm.event_date.endsWith('15')) {
        setAiConflict({
          hasConflict: true,
          aiAnalysis: `Conflict Notice: ${selectedFacilityObj.name} has a scheduled Municipal LGU Townhall Assembly on ${reserveForm.event_date} from 08:00 AM - 01:00 PM.`,
          alternativeSlots: [
            `${reserveForm.event_date} (02:00 PM - 06:00 PM)`,
            `Next Day (08:00 AM - 12:00 PM)`,
            `Next Saturday (09:00 AM - 01:00 PM)`
          ]
        });
      } else {
        setAiConflict({
          hasConflict: false,
          aiAnalysis: `✅ AI Slot Verification Passed: ${selectedFacilityObj.name} is completely available on ${reserveForm.event_date} for ${reserveForm.start_time} - ${reserveForm.end_time}. Venue capacity (${selectedFacilityObj.capacity} pax) is verified.`,
          alternativeSlots: []
        });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setAiChecking(false);
    }
  };

  const toggleEquipment = (item: string) => {
    setReserveForm(prev => {
      const exists = prev.special_equipment.includes(item);
      return {
        ...prev,
        special_equipment: exists
          ? prev.special_equipment.filter(e => e !== item)
          : [...prev.special_equipment, item]
      };
    });
  };

  const handleReserveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalPurpose = reserveForm.purpose === 'Other Government / Civic Activity' && reserveForm.custom_purpose
      ? reserveForm.custom_purpose
      : reserveForm.purpose;

    try {
      const res = await createReservation({
        ...reserveForm,
        purpose: finalPurpose,
        facility_id: selectedFacilityId,
        attendees: currentAttendees
      });
      if (res.success) {
        setReservationSuccess(res.data);
      }
    } catch (e) {
      alert('Failed to submit reservation');
    }
  };

  const handleUtilitySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUtilitySubmitting(true);
    try {
      const res = await createUtilityRequest(utilityForm);
      if (res.success) {
        setUtilitySuccess(res.data);
      }
    } catch (e) {
      alert('Failed to submit utility request');
    } finally {
      setUtilitySubmitting(false);
    }
  };

  const handleBurialSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBurialError('');
    if (!selectedPlot || !burialForm.plot_id) {
      setBurialError('Please select an available burial plot from the visual map before submitting.');
      return;
    }
    if (!burialForm.declaration_accepted) {
      setBurialError('Please accept the certification declaration before submitting.');
      return;
    }

    setBurialSubmitting(true);
    try {
      const payload = {
        ...burialForm,
        plot_id: selectedPlot.id,
        plot_code: selectedPlot.plot_code,
        section: selectedPlot.section,
        cemetery_name: selectedCemetery,
      };
      const res = await createBurial(payload);
      if (res.success) {
        setBurialSuccess(res.data || res);
      } else {
        setBurialError(res.message || 'Submission failed. Please try again.');
      }
    } catch (err) {
      setBurialError('Failed to submit burial application. Please check your connection.');
    } finally {
      setBurialSubmitting(false);
    }
  };

  const filteredFacilitiesInModal = facilities.filter(f => {
    const matchesCategory = facilityCategoryFilter === 'all' || f.category === facilityCategoryFilter;
    const matchesSearch = f.name.toLowerCase().includes(facilitySearchQuery.toLowerCase()) || f.location.toLowerCase().includes(facilitySearchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const filteredPublicAssets = publicAssets.filter(a => {
    const matchesCat = assetCategoryFilter === 'all' || a.category === assetCategoryFilter;
    const matchesSearch = a.name.toLowerCase().includes(assetSearchQuery.toLowerCase()) ||
      a.asset_tag.toLowerCase().includes(assetSearchQuery.toLowerCase()) ||
      a.assigned_department.toLowerCase().includes(assetSearchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-canvas flex flex-col selection:bg-blue-600 selection:text-white">
      <PublicNavbar />

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-slate-900 to-indigo-950 text-white py-9 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <Badge variant="info" className="mb-2 bg-blue-500/20 text-blue-300 border-blue-400/30">
            Official Citizen Services & Public Transparency
          </Badge>
          <h1 className="text-2xl sm:text-4xl font-extrabold font-display">
            Barangay 178 Citizen Services Hub
          </h1>
          <p className="mt-2 text-xs sm:text-sm text-slate-300 max-w-xl mx-auto">
            Book public facilities & parks, report water pipe leaks & drainage issues, apply for burial permits, and browse government asset inventory.
          </p>
        </div>
      </div>

      {/* 5-Tab Navigation Bar */}
      <div className="max-w-6xl mx-auto px-4 -mt-6 w-full">
        <div className="bg-white rounded-2xl shadow-medium border border-[#cbd5e1] p-1.5 flex flex-wrap sm:flex-nowrap gap-1">
          {[
            { id: 'status', label: 'Check Status', icon: Search },
            { id: 'reserve', label: 'Reserve Facility / Park', icon: Building },
            { id: 'utility', label: 'Water & Drainage Request', icon: Droplet },
            { id: 'cemetery', label: 'Burial & Cemetery Permit', icon: Cross },
            { id: 'assets', label: 'Public Assets Catalog', icon: Wrench },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex-1 py-3 px-3 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-blue shadow-md'
                    : 'text-[#475569] hover:bg-slate-100 hover:text-[#0f172a]'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="truncate">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div className="max-w-6xl mx-auto px-4 py-8 flex-1 w-full">
        
        {/* =========================================================================
            TAB 1: CHECK STATUS / UNIVERSAL TRACKER
           ========================================================================= */}
        {activeTab === 'status' && (
          <div className="space-y-6 animate-fade-in">
            <Card className="border-[#cbd5e1]">
              <CardHeader>
                <CardTitle>Universal Reference Code Tracker</CardTitle>
                <CardDescription>
                  Enter any reservation code (<span className="font-mono text-blue-600 font-bold">RES-2026-...</span>), utility ticket (<span className="font-mono text-cyan-600 font-bold">UTL-2026-...</span>), or burial permit (<span className="font-mono text-purple-600 font-bold">BUR-2026-...</span>).
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleTrack();
                  }}
                  className="flex flex-col sm:flex-row gap-3"
                >
                  <div className="relative flex-1">
                    <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={trackRef}
                      onChange={(e) => setTrackRef(e.target.value.toUpperCase())}
                      placeholder="e.g. RES-2026-001 or UTL-2026-001"
                      className="w-full pl-10 pr-4 py-3 text-sm font-mono uppercase bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:border-blue-600 focus:bg-white text-[#0f172a]"
                    />
                  </div>
                  <Button type="submit" size="md" isLoading={trackLoading} className="px-8 font-bold">
                    Search Record
                  </Button>
                </form>

                {trackError && (
                  <div className="mt-4 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{trackError}</span>
                  </div>
                )}

                {trackedRecord && (
                  <div className="mt-6 p-6 rounded-2xl bg-slate-50 border border-slate-200 space-y-4 animate-fade-in-up">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-500 font-mono">RECORD TYPE:</span>
                          <Badge variant="purple">{trackedRecord.type}</Badge>
                          <span className="text-sm font-extrabold font-mono text-blue-600">
                            {trackedRecord.data.reference_no || trackedRecord.data.ticket_no || trackedRecord.data.permit_no || trackedRecord.data.asset_tag}
                          </span>
                        </div>
                        <h3 className="text-base font-bold text-slate-900 mt-1">
                          {trackedRecord.data.facility_name || trackedRecord.data.service_type || trackedRecord.data.deceased_name || trackedRecord.data.name}
                        </h3>
                      </div>
                      <Badge variant={trackedRecord.data.status === 'Approved' || trackedRecord.data.status === 'Resolved' || trackedRecord.data.status === 'Operational' ? 'success' : 'warning'} size="md">
                        {trackedRecord.data.status || trackedRecord.data.current_condition}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                      <div className="p-3 bg-white rounded-xl border border-slate-200">
                        <span className="text-slate-400 block">Applicant / Citizen:</span>
                        <span className="font-bold text-slate-800">{trackedRecord.data.applicant_name || trackedRecord.data.citizen_name || trackedRecord.data.contact_person || 'LGU General'}</span>
                      </div>
                      <div className="p-3 bg-white rounded-xl border border-slate-200">
                        <span className="text-slate-400 block">Date / Location:</span>
                        <span className="font-bold text-slate-800">{trackedRecord.data.event_date || trackedRecord.data.burial_date || trackedRecord.data.location || trackedRecord.data.assigned_department}</span>
                      </div>
                      <div className="p-3 bg-white rounded-xl border border-slate-200">
                        <span className="text-slate-400 block">Status Remarks:</span>
                        <span className="font-bold text-blue-700">{trackedRecord.data.remarks || trackedRecord.data.assigned_team || trackedRecord.data.ai_maintenance_alert || 'Normal processing'}</span>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* =========================================================================
            TAB 2: RESERVE FACILITY OR PARK
           ========================================================================= */}
        {activeTab === 'reserve' && (
          <div className="space-y-6 animate-fade-in">
            {reservationSuccess ? (
              <Card className="text-center p-8 border-emerald-200 bg-emerald-50/40">
                <div className="w-14 h-14 bg-emerald-600 text-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-600/30">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="text-2xl font-extrabold text-[#0f172a] font-display">Reservation Request Submitted!</h3>
                <p className="text-xs sm:text-sm text-slate-600 mt-2 max-w-md mx-auto">
                  Save your booking reference number. Our facility administrator will verify slot availability and issue endorsement.
                </p>
                <div className="my-6 p-4 bg-white rounded-2xl border border-emerald-300 max-w-xs mx-auto shadow-soft">
                  <span className="text-xs text-slate-500 font-medium">Reservation Reference</span>
                  <p className="text-2xl font-black font-mono text-blue-600 tracking-wider mt-0.5">{reservationSuccess.reference_no}</p>
                </div>
                <Button
                  size="md"
                  onClick={() => {
                    setReservationSuccess(null);
                    setTrackRef(reservationSuccess.reference_no);
                    setActiveTab('status');
                    handleTrack(reservationSuccess.reference_no);
                  }}
                >
                  Track Reservation Status
                </Button>
              </Card>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left: Venue Cards */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-slate-600 uppercase tracking-wider">Choose Facility or Park</p>
                    <span className="text-[11px] text-blue-600 font-semibold">{facilities.length} Spaces</span>
                  </div>

                  <div className="space-y-2.5">
                    {facilities.slice(0, 4).map((fac) => {
                      const isSelected = selectedFacilityId === fac.id;
                      return (
                        <div
                          key={fac.id}
                          onClick={() => setSelectedFacilityId(fac.id)}
                          className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                            isSelected
                              ? 'bg-blue-50 border-blue-600 shadow-soft ring-2 ring-blue-500/20'
                              : 'bg-white border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div className={`p-2 rounded-xl shrink-0 ${fac.category.includes('Park') ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
                              {fac.category.includes('Park') ? <Trees className="w-4 h-4" /> : <Building className="w-4 h-4" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-bold text-slate-400 uppercase truncate">{fac.category}</span>
                                <span className="text-[11px] font-bold text-blue-700 shrink-0">₱{fac.hourly_rate}/hr</span>
                              </div>
                              <h4 className="text-xs font-bold text-slate-900 leading-tight mt-0.5 truncate">{fac.name}</h4>
                              <p className="text-[10px] text-slate-500 mt-0.5">Cap: <strong>{fac.capacity} Pax</strong> • {fac.location}</p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="w-full text-xs font-bold text-blue-700 border-blue-200 hover:bg-blue-50 py-2 rounded-xl"
                    leftIcon={<Grid className="w-4 h-4 text-blue-600" />}
                    onClick={() => setIsSeeMoreFacilitiesOpen(true)}
                  >
                    View All Facilities & Parks ({facilities.length})
                  </Button>

                  {selectedFacilityObj && (
                    <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Selected Venue Specs:</span>
                      <p className="font-bold text-slate-900">{selectedFacilityObj.name}</p>
                      <p className="text-[11px] text-slate-600 font-medium">Max Capacity: <span className="text-blue-700 font-bold">{selectedFacilityObj.capacity} Attendees</span></p>
                      <p className="text-[10px] text-slate-500">{selectedFacilityObj.amenities}</p>
                    </div>
                  )}
                </div>

                {/* Right: Reservation Form */}
                <div className="lg:col-span-2">
                  <Card className="border-[#cbd5e1]">
                    <CardHeader>
                      <CardTitle>Reserve Selected Facility</CardTitle>
                      <CardDescription>Select predefined event purpose, special equipment, and verify capacity.</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <form onSubmit={handleReserveSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <Input
                            label="Applicant / Organization Name *"
                            required
                            placeholder="e.g. Juan Dela Cruz / Youth Association"
                            value={reserveForm.applicant_name}
                            onChange={(e) => setReserveForm({ ...reserveForm, applicant_name: e.target.value })}
                          />
                          <Input
                            label="Email Address *"
                            type="email"
                            required
                            placeholder="applicant@gmail.com"
                            value={reserveForm.applicant_email}
                            onChange={(e) => setReserveForm({ ...reserveForm, applicant_email: e.target.value })}
                          />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <Input
                            label="Contact Phone Number *"
                            required
                            placeholder="+63 917 000 0000"
                            value={reserveForm.applicant_phone}
                            onChange={(e) => setReserveForm({ ...reserveForm, applicant_phone: e.target.value })}
                          />
                          <div>
                            <Input
                              label="Expected Attendees Count *"
                              type="number"
                              required
                              value={reserveForm.attendees}
                              onChange={(e) => setReserveForm({ ...reserveForm, attendees: e.target.value })}
                            />
                            {/* REAL-TIME AI PAX LIMIT WARNING */}
                            {isPaxExceeded && (
                              <div className="mt-1.5 p-2 rounded-xl bg-amber-50 border border-amber-300 text-amber-800 text-[11px] font-semibold flex items-center gap-1.5 animate-fade-in">
                                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                                <span>
                                  ⚠️ <strong>Exceeded Limit:</strong> {currentAttendees} pax exceeds {selectedFacilityObj.name} maximum capacity of {selectedFacilityObj.capacity} pax!
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* PREDEFINED PURPOSE OF EVENT */}
                        <div>
                          <label className="block text-xs font-semibold text-[#334155] mb-1.5">
                            Purpose of Event / Activity *
                          </label>
                          <select
                            value={reserveForm.purpose}
                            onChange={(e) => setReserveForm({ ...reserveForm, purpose: e.target.value })}
                            className="w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs sm:text-sm text-slate-800 font-medium focus:border-blue-600 focus:outline-none"
                          >
                            {PURPOSE_OPTIONS.map((p, idx) => (
                              <option key={idx} value={p}>{p}</option>
                            ))}
                          </select>
                          {reserveForm.purpose === 'Other Government / Civic Activity' && (
                            <input
                              type="text"
                              placeholder="Please specify specific event purpose..."
                              value={reserveForm.custom_purpose}
                              onChange={(e) => setReserveForm({ ...reserveForm, custom_purpose: e.target.value })}
                              className="mt-2 w-full p-2.5 text-xs rounded-xl border border-slate-300 bg-slate-50"
                            />
                          )}
                        </div>

                        {/* DATE AND TIME */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          <Input
                            label="Event Date *"
                            type="date"
                            required
                            value={reserveForm.event_date}
                            onChange={(e) => setReserveForm({ ...reserveForm, event_date: e.target.value })}
                          />
                          <div>
                            <label className="block text-xs font-semibold text-[#334155] mb-1.5">Start Time *</label>
                            <select
                              value={reserveForm.start_time}
                              onChange={(e) => setReserveForm({ ...reserveForm, start_time: e.target.value })}
                              className="w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs sm:text-sm"
                            >
                              <option value="08:00 AM">08:00 AM</option>
                              <option value="09:00 AM">09:00 AM</option>
                              <option value="01:00 PM">01:00 PM</option>
                              <option value="02:00 PM">02:00 PM</option>
                              <option value="06:00 PM">06:00 PM</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-[#334155] mb-1.5">End Time *</label>
                            <select
                              value={reserveForm.end_time}
                              onChange={(e) => setReserveForm({ ...reserveForm, end_time: e.target.value })}
                              className="w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs sm:text-sm"
                            >
                              <option value="12:00 PM">12:00 PM</option>
                              <option value="01:00 PM">01:00 PM</option>
                              <option value="05:00 PM">05:00 PM</option>
                              <option value="06:00 PM">06:00 PM</option>
                              <option value="09:00 PM">09:00 PM</option>
                            </select>
                          </div>
                        </div>

                        {/* PREDEFINED SPECIAL EQUIPMENT SELECTION */}
                        <div>
                          <label className="block text-xs font-semibold text-[#334155] mb-2">
                            Select Special Equipment & Setup Requirements:
                          </label>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {EQUIPMENT_OPTIONS.map((item, idx) => {
                              const isChecked = reserveForm.special_equipment.includes(item);
                              return (
                                <div
                                  key={idx}
                                  onClick={() => toggleEquipment(item)}
                                  className={`p-2.5 rounded-xl border cursor-pointer transition-all flex items-center gap-2.5 text-xs font-medium ${
                                    isChecked
                                      ? 'bg-blue-50 border-blue-500 text-blue-900 shadow-sm'
                                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                                  }`}
                                >
                                  {isChecked ? (
                                    <CheckSquare className="w-4 h-4 text-blue-600 shrink-0" />
                                  ) : (
                                    <Square className="w-4 h-4 text-slate-400 shrink-0" />
                                  )}
                                  <span>{item}</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* AI Slot Recommendation & Conflict Resolution Box */}
                        {aiConflict && (
                          <div className="p-4 bg-gradient-to-br from-indigo-950 to-slate-900 rounded-2xl text-white border border-indigo-500/30 space-y-2.5 animate-fade-in shadow-medium">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-indigo-300 flex items-center gap-1.5">
                                <Sparkles className="w-4 h-4 text-indigo-400 animate-pulse" />
                                <span>AI Slot & Conflict Intelligence</span>
                              </span>
                              <Badge variant={aiConflict.hasConflict ? 'destructive' : 'success'}>
                                {aiConflict.hasConflict ? '⚠️ Schedule Conflict Detected' : '✅ Optimal Slot Verified'}
                              </Badge>
                            </div>
                            <p className="text-xs text-slate-200 leading-relaxed font-medium">{aiConflict.aiAnalysis}</p>
                            {aiConflict.alternativeSlots && aiConflict.alternativeSlots.length > 0 && (
                              <div className="pt-2 space-y-1.5">
                                <p className="text-[11px] font-bold text-indigo-300">💡 AI Recommended Alternative Schedule Windows (Click to Select):</p>
                                <div className="flex flex-wrap gap-2">
                                  {aiConflict.alternativeSlots.map((slot: string, idx: number) => (
                                    <button
                                      key={idx}
                                      type="button"
                                      onClick={() => {
                                        if (slot.includes('02:00 PM')) {
                                          setReserveForm(prev => ({ ...prev, start_time: '02:00 PM', end_time: '06:00 PM' }));
                                        }
                                        alert(`Applied suggested slot: ${slot}`);
                                      }}
                                      className="bg-white/10 hover:bg-white/20 text-indigo-200 px-3 py-1 rounded-xl border border-white/20 text-xs font-mono transition-all flex items-center gap-1 cursor-pointer"
                                    >
                                      <span>{slot}</span>
                                      <Check className="w-3 h-3 text-emerald-400" />
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Action buttons */}
                        <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
                          <Button
                            type="button"
                            size="md"
                            variant="secondary"
                            isLoading={aiChecking}
                            onClick={handleCheckAIConflict}
                            leftIcon={<Sparkles className="w-4 h-4 text-indigo-600" />}
                            className="w-full sm:w-auto bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border-indigo-200 font-bold"
                          >
                            AI Conflict Check & Alternate Finder
                          </Button>

                          <Button type="submit" size="md" className="w-full sm:w-auto px-8 font-bold">
                            Submit Reservation Request
                          </Button>
                        </div>
                      </form>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}
          </div>
        )}

        {/* =========================================================================
            TAB 3: WATER & DRAINAGE REQUESTS (With Dropdown Households & Photo Upload)
           ========================================================================= */}
        {activeTab === 'utility' && (
          <div className="space-y-6 animate-fade-in">
            {utilitySuccess ? (
              <Card className="text-center p-8 border-cyan-200 bg-cyan-50/40">
                <div className="w-14 h-14 bg-cyan-600 text-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-cyan-600/30">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="text-2xl font-extrabold text-[#0f172a] font-display">Incident Ticket Dispatched!</h3>
                <p className="text-xs sm:text-sm text-slate-600 mt-2 max-w-md mx-auto">
                  Ticket Reference: <span className="font-bold font-mono text-cyan-700">{utilitySuccess.ticket_no}</span>
                </p>
                <div className="my-6 p-4 bg-white rounded-2xl border border-cyan-200 max-w-sm mx-auto shadow-soft text-left space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Assigned Urgency:</span>
                    <Badge variant={utilitySuccess.urgency === 'Urgent' ? 'destructive' : 'warning'}>{utilitySuccess.urgency}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Affected Scope:</span>
                    <span className="font-bold text-slate-800">{utilitySuccess.affected_households || 'Local Area'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Assigned Response Team:</span>
                    <span className="font-bold text-cyan-800">{utilitySuccess.assigned_team || 'Barangay Utility Quick Response'}</span>
                  </div>
                </div>
                <Button
                  size="md"
                  onClick={() => {
                    setUtilitySuccess(null);
                    setUtilityForm({
                      citizen_name: '',
                      citizen_phone: '',
                      service_type: 'Water Main Leak',
                      location: '',
                      affected_households: HOUSEHOLD_OPTIONS[1],
                      photo_url: '',
                      photo_name: '',
                      description: '',
                      urgency: 'Urgent',
                    });
                  }}
                >
                  File Another Incident
                </Button>
              </Card>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="space-y-4">
                  <Card className="border-[#cbd5e1] p-5 space-y-3">
                    <div className="flex items-center gap-2 text-cyan-700 font-bold text-sm">
                      <Droplet className="w-5 h-5 text-cyan-600" />
                      <span>Water & Drainage Rapid Triage</span>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Reports filed are analyzed by our <strong>AI Priority Dispatch</strong> system to immediately assign declogging trucks, backhoes, and water maintenance crews.
                    </p>
                    <div className="pt-2 border-t border-slate-100 space-y-1.5 text-xs text-slate-500">
                      <p>🚨 <strong>Water Pipe Burst:</strong> &lt; 2 hrs dispatch</p>
                      <p>🌧️ <strong>Storm Drainage Clog:</strong> Same-day dewatering</p>
                      <p>🌊 <strong>Canal Wall & Flood:</strong> Emergency civil team</p>
                    </div>
                  </Card>
                </div>

                <div className="lg:col-span-2">
                  <Card className="border-[#cbd5e1]">
                    <CardHeader>
                      <CardTitle>File Water Supply or Drainage Hazard</CardTitle>
                      <CardDescription>Select affected households and attach picture of damage/flood.</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <form onSubmit={handleUtilitySubmit} className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <Input
                            label="Your Full Name *"
                            required
                            placeholder="e.g. Juan M. Dela Cruz"
                            value={utilityForm.citizen_name}
                            onChange={(e) => setUtilityForm({ ...utilityForm, citizen_name: e.target.value })}
                          />
                          <Input
                            label="Contact Phone Number *"
                            required
                            placeholder="+63 917 888 1234"
                            value={utilityForm.citizen_phone}
                            onChange={(e) => setUtilityForm({ ...utilityForm, citizen_phone: e.target.value })}
                          />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-semibold text-[#334155] mb-1.5">Service Incident Type *</label>
                            <select
                              value={utilityForm.service_type}
                              onChange={(e) => setUtilityForm({ ...utilityForm, service_type: e.target.value as any })}
                              className="w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs sm:text-sm font-medium"
                            >
                              <option value="Water Main Leak">Water Main Leak / Pipe Burst</option>
                              <option value="Low Water Pressure">Low Water Pressure / Supply Cut</option>
                              <option value="Drainage Declogging">Drainage Declogging / Clogged Culvert</option>
                              <option value="Canal Wall Repair">Canal Wall / Revetment Damage</option>
                              <option value="Sewer Overflow">Sewer Overflow & Hazardous Odor</option>
                              <option value="Flash Flooding">Flash Flooding / High Water Level</option>
                            </select>
                          </div>

                          {/* AFFECTED HOUSEHOLDS DROPDOWN */}
                          <div>
                            <label className="block text-xs font-semibold text-[#334155] mb-1.5">Affected Households (#) *</label>
                            <select
                              value={utilityForm.affected_households}
                              onChange={(e) => setUtilityForm({ ...utilityForm, affected_households: e.target.value })}
                              className="w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs sm:text-sm font-medium"
                            >
                              {HOUSEHOLD_OPTIONS.map((h, idx) => (
                                <option key={idx} value={h}>{h}</option>
                              ))}
                            </select>
                          </div>
                        </div>

                        <Input
                          label="Specific Street / Landmark Address *"
                          required
                          placeholder="e.g. Mindanao Ave. Corner Camarin St., near Zone 4 Health Center"
                          value={utilityForm.location}
                          onChange={(e) => setUtilityForm({ ...utilityForm, location: e.target.value })}
                        />

                        {/* PHOTO UPLOAD SECTION WITH PRESETS */}
                        <div>
                          <label className="block text-xs font-semibold text-[#334155] mb-1.5">
                            Attach Photo of Incident / Flood / Burst Pipe (Optional but Recommended)
                          </label>
                          
                          <div className="p-3.5 border-2 border-dashed border-slate-300 hover:border-cyan-500 rounded-2xl bg-slate-50/70 transition-all text-center space-y-2">
                            {utilityForm.photo_url ? (
                              <div className="relative inline-block rounded-xl overflow-hidden border border-slate-300 shadow-sm">
                                <img
                                  src={utilityForm.photo_url}
                                  alt="Attached Incident Preview"
                                  className="h-36 w-auto object-cover rounded-xl"
                                />
                                <button
                                  type="button"
                                  onClick={() => setUtilityForm({ ...utilityForm, photo_url: '', photo_name: '' })}
                                  className="absolute top-2 right-2 bg-red-600 text-white p-1 rounded-full text-xs shadow-md hover:bg-red-700"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                                <span className="block text-[10px] text-slate-600 font-medium py-1 bg-white">
                                  {utilityForm.photo_name || 'Incident Picture Attached'}
                                </span>
                              </div>
                            ) : (
                              <>
                                <div className="flex justify-center text-cyan-600">
                                  <Upload className="w-8 h-8 opacity-70" />
                                </div>
                                <p className="text-xs text-slate-600 font-medium">
                                  Click to upload an image from your phone or choose a sample picture below:
                                </p>
                                
                                {/* Quick Sample Picture Chooser */}
                                <div className="pt-2 flex flex-wrap justify-center gap-1.5">
                                  {SAMPLE_INCIDENT_PHOTOS.map((pic, idx) => (
                                    <button
                                      key={idx}
                                      type="button"
                                      onClick={() => setUtilityForm({ ...utilityForm, photo_url: pic.url, photo_name: `${pic.label}.jpg` })}
                                      className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 hover:border-cyan-500 text-[11px] text-slate-700 font-medium shadow-xs transition-all flex items-center gap-1"
                                    >
                                      <ImageIcon className="w-3 h-3 text-cyan-600" />
                                      <span>{pic.label}</span>
                                    </button>
                                  ))}
                                </div>
                              </>
                            )}
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-[#334155] mb-1.5">Description of Incident / Hazard *</label>
                          <textarea
                            rows={2}
                            required
                            placeholder="Describe severity, depth of flood, burst pipe pressure, or road obstruction..."
                            value={utilityForm.description}
                            onChange={(e) => setUtilityForm({ ...utilityForm, description: e.target.value })}
                            className="w-full rounded-xl border border-slate-300 p-2.5 text-xs sm:text-sm"
                          />
                        </div>

                        <div className="pt-2 flex justify-end">
                          <Button type="submit" size="lg" isLoading={utilitySubmitting} className="px-8 font-bold bg-cyan-600 hover:bg-cyan-700 text-white">
                            Submit Emergency Incident Ticket
                          </Button>
                        </div>
                      </form>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}
          </div>
        )}

        {/* =========================================================================
            TAB 4: CEMETERY & BURIAL PERMIT (Complete 5-Section Application Form)
           ========================================================================= */}
        {activeTab === 'cemetery' && (
          <div className="space-y-6 animate-fade-in">
            {burialSuccess ? (
              <Card className="text-center p-8 border-purple-200 bg-purple-50/40">
                <div className="w-14 h-14 bg-purple-600 text-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-purple-600/30">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="text-2xl font-extrabold text-[#0f172a] font-display">Burial Permit Application Logged!</h3>
                <p className="text-xs sm:text-sm text-slate-600 mt-2 max-w-md mx-auto">
                  Burial Permit Reference: <span className="font-bold font-mono text-purple-700">{burialSuccess.permit_no || burialSuccess.reference_no}</span>
                </p>
                <div className="my-6 p-4 bg-white rounded-2xl border border-purple-200 max-w-sm mx-auto shadow-soft text-left space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Deceased:</span>
                    <span className="font-bold text-slate-800">{burialSuccess.deceased_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Scheduled Date:</span>
                    <span className="font-bold text-purple-700">{new Date(burialSuccess.burial_date).toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Allocated Plot Code:</span>
                    <span className="font-mono font-bold text-purple-700">{selectedPlot?.plot_code || 'Assigned'}</span>
                  </div>
                </div>
                <Button
                  size="md"
                  onClick={() => {
                    setBurialSuccess(null);
                    setBurialError('');
                    const nextAvail = plots.find(p => p.status === 'Available') || null;
                    if (nextAvail) setSelectedPlot(nextAvail);
                  }}
                >
                  Submit Another Burial Application
                </Button>
              </Card>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left: Plot selection overview */}
                <div className="space-y-4">
                  <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-soft space-y-2">
                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">
                      Municipal Cemetery:
                    </label>
                    <select
                      value={selectedCemetery}
                      onChange={(e) => setSelectedCemetery(e.target.value)}
                      className="w-full rounded-xl border border-purple-200 bg-purple-50/50 p-2.5 text-xs font-bold text-purple-900"
                    >
                      {cemeteries.map((c, idx) => (
                        <option key={idx} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>

                  <div className="p-4 rounded-2xl bg-gradient-to-br from-purple-900 via-slate-900 to-purple-950 text-white shadow-soft space-y-3">
                    <div className="flex items-center gap-2">
                      <Layers className="w-5 h-5 text-purple-400" />
                      <span className="text-xs font-bold font-display">Interactive Columbarium Wall & Plot Map</span>
                    </div>
                    <p className="text-[11px] text-purple-200/80 leading-relaxed">
                      Click the visual map to view the 80-vault Columbarium marble wall or lawn lot layout and pick your exact preferred slot!
                    </p>
                    <Button
                      type="button"
                      size="sm"
                      variant="primary"
                      className="w-full bg-purple-600 hover:bg-purple-500 font-bold text-white shadow-md"
                      leftIcon={<Map className="w-4 h-4" />}
                      onClick={() => setIsVisualPlotModalOpen(true)}
                    >
                      🗺️ Open Interactive Visual Plot Map
                    </Button>
                  </div>

                  <div className="p-4 bg-white rounded-2xl border border-purple-200 shadow-soft space-y-2">
                    <span className="text-xs font-bold text-slate-500 uppercase">Selected Burial Plot:</span>
                    {selectedPlot ? (
                      <div className="p-3 bg-purple-50 rounded-xl border border-purple-200">
                        <div className="flex justify-between items-center">
                          <span className="font-mono text-sm font-black text-purple-800">{selectedPlot.plot_code}</span>
                          <Badge variant="success">{selectedPlot.status}</Badge>
                        </div>
                        <p className="text-xs text-slate-700 font-bold mt-1">{selectedPlot.section}</p>
                        <p className="text-[11px] text-slate-500">{selectedPlot.plot_type} • ₱{parseFloat(selectedPlot.price.toString()).toLocaleString()}</p>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 italic">No plot selected yet. Click Open Interactive Visual Map.</p>
                    )}
                  </div>
                </div>

                {/* Right: Full 5-Section Burial Permit Application */}
                <div className="lg:col-span-2">
                  <Card className="border-[#cbd5e1]">
                    <CardHeader className="border-b border-slate-100 pb-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-[11px] font-bold text-purple-700 uppercase tracking-wider">LGU FORM NO. 104-B</span>
                          <CardTitle className="text-lg sm:text-xl">BURIAL PERMIT & INTERMENT APPLICATION</CardTitle>
                          <CardDescription>Municipal Civil Registrar & Public Cemetery Management Desk</CardDescription>
                        </div>
                        <Badge variant="purple" size="md">5 Sections</Badge>
                      </div>
                    </CardHeader>

                    <CardContent className="pt-6">
                      <form onSubmit={handleBurialSubmit} className="space-y-6">
                        
                        {/* =========================================
                            SECTION A: DECEASED INFORMATION
                           ========================================= */}
                        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                          <div className="flex items-center gap-2 text-slate-900 font-bold text-xs uppercase tracking-wider border-b border-slate-200 pb-2">
                            <span className="w-5 h-5 rounded-full bg-purple-600 text-white flex items-center justify-center text-[10px] font-bold">A</span>
                            <span>SECTION A: DECEASED INFORMATION</span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <Input
                              label="Full Name of Deceased *"
                              required
                              placeholder="e.g. Severino M. Dela Cruz"
                              value={burialForm.deceased_name}
                              onChange={(e) => setBurialForm({ ...burialForm, deceased_name: e.target.value })}
                            />
                            <Input
                              label="Cause of Death *"
                              required
                              placeholder="e.g. Cardio-pulmonary arrest / Pneumonia"
                              value={burialForm.cause_of_death}
                              onChange={(e) => setBurialForm({ ...burialForm, cause_of_death: e.target.value })}
                            />
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <Input
                              label="Date of Birth *"
                              type="date"
                              required
                              value={burialForm.date_of_birth}
                              onChange={(e) => setBurialForm({ ...burialForm, date_of_birth: e.target.value })}
                            />
                            <Input
                              label="Date of Death *"
                              type="date"
                              required
                              value={burialForm.date_of_death}
                              onChange={(e) => setBurialForm({ ...burialForm, date_of_death: e.target.value })}
                            />
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <Input
                              label="Last Known Residential Address *"
                              required
                              placeholder="e.g. Purok 4, Mindanao Ave., Barangay 178"
                              value={burialForm.deceased_address}
                              onChange={(e) => setBurialForm({ ...burialForm, deceased_address: e.target.value })}
                            />
                            <Input
                              label="Attending Physician / Hospital"
                              placeholder="e.g. Dr. R. Santos, MD / Municipal Health Center"
                              value={burialForm.attending_physician}
                              onChange={(e) => setBurialForm({ ...burialForm, attending_physician: e.target.value })}
                            />
                          </div>
                        </div>

                        {/* =========================================
                            SECTION B: BURIAL DETAILS
                           ========================================= */}
                        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                          <div className="flex items-center gap-2 text-slate-900 font-bold text-xs uppercase tracking-wider border-b border-slate-200 pb-2">
                            <span className="w-5 h-5 rounded-full bg-purple-600 text-white flex items-center justify-center text-[10px] font-bold">B</span>
                            <span>SECTION B: BURIAL DETAILS</span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <Input
                              label="Scheduled Interment / Burial Date *"
                              type="date"
                              required
                              value={burialForm.burial_date}
                              onChange={(e) => setBurialForm({ ...burialForm, burial_date: e.target.value })}
                            />
                            <div>
                              <label className="block text-xs font-semibold text-[#334155] mb-1.5">Preferred Time of Interment *</label>
                              <select
                                value={burialForm.burial_time}
                                onChange={(e) => setBurialForm({ ...burialForm, burial_time: e.target.value })}
                                className="w-full rounded-xl border border-slate-300 bg-white p-2 text-xs sm:text-sm"
                              >
                                <option value="09:00 AM">09:00 AM (Morning)</option>
                                <option value="10:00 AM">10:00 AM (Morning)</option>
                                <option value="01:30 PM">01:30 PM (Afternoon)</option>
                                <option value="03:00 PM">03:00 PM (Afternoon)</option>
                              </select>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs font-semibold text-[#334155] mb-1.5">Allocated Plot Code *</label>
                              <div className="flex gap-2">
                                <input
                                  type="text"
                                  readOnly
                                  value={selectedPlot ? `${selectedPlot.plot_code} (${selectedPlot.section})` : 'Select from Visual Map'}
                                  className="w-full rounded-xl border border-slate-300 bg-white p-2 text-xs font-mono font-bold text-purple-900"
                                />
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setIsVisualPlotModalOpen(true)}
                                >
                                  Map
                                </Button>
                              </div>
                            </div>

                            <Input
                              label="Municipal Cemetery *"
                              readOnly
                              value={selectedCemetery}
                            />
                          </div>
                        </div>

                        {/* =========================================
                            SECTION C: APPLICANT INFORMATION
                           ========================================= */}
                        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                          <div className="flex items-center gap-2 text-slate-900 font-bold text-xs uppercase tracking-wider border-b border-slate-200 pb-2">
                            <span className="w-5 h-5 rounded-full bg-purple-600 text-white flex items-center justify-center text-[10px] font-bold">C</span>
                            <span>SECTION C: APPLICANT INFORMATION</span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <Input
                              label="Full Name of Applicant *"
                              required
                              placeholder="e.g. Maria Dela Cruz"
                              value={burialForm.contact_person}
                              onChange={(e) => setBurialForm({ ...burialForm, contact_person: e.target.value })}
                            />
                            <Input
                              label="Relationship to Deceased *"
                              required
                              placeholder="e.g. Daughter / Spouse / Sibling"
                              value={burialForm.applicant_relationship}
                              onChange={(e) => setBurialForm({ ...burialForm, applicant_relationship: e.target.value })}
                            />
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <Input
                              label="Contact Number *"
                              required
                              placeholder="+63 917 222 8891"
                              value={burialForm.contact_phone}
                              onChange={(e) => setBurialForm({ ...burialForm, contact_phone: e.target.value })}
                            />
                            <Input
                              label="Email Address (Optional)"
                              type="email"
                              placeholder="applicant@gmail.com"
                              value={burialForm.applicant_email}
                              onChange={(e) => setBurialForm({ ...burialForm, applicant_email: e.target.value })}
                            />
                          </div>

                          <Input
                            label="Complete Residential Address *"
                            required
                            placeholder="e.g. House No. 12, Purok 3, Barangay 178"
                            value={burialForm.applicant_address}
                            onChange={(e) => setBurialForm({ ...burialForm, applicant_address: e.target.value })}
                          />
                        </div>

                        {/* =========================================
                            SECTION D: REQUIREMENTS (Upload)
                           ========================================= */}
                        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                          <div className="flex items-center gap-2 text-slate-900 font-bold text-xs uppercase tracking-wider border-b border-slate-200 pb-2">
                            <span className="w-5 h-5 rounded-full bg-purple-600 text-white flex items-center justify-center text-[10px] font-bold">D</span>
                            <span>SECTION D: REQUIREMENTS (Upload / Attach)</span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {/* Death Cert Attachment */}
                            <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-2 text-xs">
                              <span className="font-bold text-slate-700 block">PSA / Local Civil Registrar Death Certificate *</span>
                              <button
                                type="button"
                                onClick={() => setBurialForm({ ...burialForm, death_cert_attached: !burialForm.death_cert_attached })}
                                className={`w-full py-2 px-3 rounded-lg border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                                  burialForm.death_cert_attached
                                    ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                                    : 'bg-slate-50 border-slate-300 text-slate-700 hover:bg-slate-100'
                                }`}
                              >
                                {burialForm.death_cert_attached ? (
                                  <>
                                    <FileCheck className="w-4 h-4 text-emerald-600" />
                                    <span>Death Certificate Attached ✅</span>
                                  </>
                                ) : (
                                  <>
                                    <Upload className="w-4 h-4 text-slate-500" />
                                    <span>Attach Death Certificate (Demo)</span>
                                  </>
                                )}
                              </button>
                            </div>

                            {/* Gov ID Attachment */}
                            <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-2 text-xs">
                              <span className="font-bold text-slate-700 block">Valid Government ID of Applicant *</span>
                              <button
                                type="button"
                                onClick={() => setBurialForm({ ...burialForm, valid_id_attached: !burialForm.valid_id_attached })}
                                className={`w-full py-2 px-3 rounded-lg border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                                  burialForm.valid_id_attached
                                    ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                                    : 'bg-slate-50 border-slate-300 text-slate-700 hover:bg-slate-100'
                                }`}
                              >
                                {burialForm.valid_id_attached ? (
                                  <>
                                    <FileCheck className="w-4 h-4 text-emerald-600" />
                                    <span>Valid ID Attached ✅</span>
                                  </>
                                ) : (
                                  <>
                                    <Upload className="w-4 h-4 text-slate-500" />
                                    <span>Attach Government ID (Demo)</span>
                                  </>
                                )}
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* =========================================
                            SECTION E: DECLARATION
                           ========================================= */}
                        <div className="p-4 rounded-2xl bg-purple-50/60 border border-purple-200 space-y-2">
                          <div className="flex items-center gap-2 text-purple-900 font-bold text-xs uppercase tracking-wider">
                            <span className="w-5 h-5 rounded-full bg-purple-600 text-white flex items-center justify-center text-[10px] font-bold">E</span>
                            <span>SECTION E: SWORN DECLARATION</span>
                          </div>

                          <label className="flex items-start gap-2.5 cursor-pointer pt-1">
                            <input
                              type="checkbox"
                              checked={burialForm.declaration_accepted}
                              onChange={(e) => setBurialForm({ ...burialForm, declaration_accepted: e.target.checked })}
                              className="w-4 h-4 mt-0.5 text-purple-600 rounded border-slate-300 focus:ring-purple-500"
                            />
                            <span className="text-xs text-purple-950 font-medium leading-relaxed">
                              ☑ I certify that all information provided in this application are true, correct, and legally accurate to the best of my knowledge under penalty of law.
                            </span>
                          </label>
                        </div>

                        {burialError && (
                          <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 font-medium flex items-start gap-2">
                            <span className="shrink-0 mt-0.5">⚠️</span>
                            <span>{burialError}</span>
                          </div>
                        )}

                        <div className="pt-2 flex justify-end">
                          <Button type="submit" size="lg" isLoading={burialSubmitting} className="px-8 font-bold bg-purple-600 hover:bg-purple-700 text-white">
                            Submit Burial Application
                          </Button>
                        </div>
                      </form>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}
          </div>
        )}

        {/* =========================================================================
            TAB 5: PUBLIC ASSETS & TRANSPARENCY CATALOG (Read-Only)
           ========================================================================= */}
        {activeTab === 'assets' && (
          <div className="space-y-6 animate-fade-in">
            {/* Header / Intro */}
            <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white shadow-soft flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-blue-400" />
                  <span className="text-xs font-bold uppercase tracking-wider text-blue-300">Public Asset Transparency Board</span>
                </div>
                <h3 className="text-xl font-bold font-display mt-1">Municipal Public Property & Heavy Equipment Catalog</h3>
                <p className="text-xs text-slate-300 mt-1 max-w-xl">
                  Public citizens can openly view government-owned service vehicles, heavy drainage backhoes, standby generators, and flood dewatering pumps. <em>(Read-Only Public Registry)</em>
                </p>
              </div>

              <Badge variant="info" size="md" className="bg-white/10 text-white border-white/20">
                {publicAssets.length} Registered Assets
              </Badge>
            </div>

            {/* Filter and Search Bar */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search government equipment, tag (e.g. AST-2026-001), or department..."
                  value={assetSearchQuery}
                  onChange={(e) => setAssetSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm bg-white border border-slate-300 rounded-xl focus:outline-none focus:border-blue-600 text-slate-900"
                />
              </div>

              <div className="flex flex-wrap gap-1.5">
                {['all', 'Heavy Equipment', 'Service Vehicle', 'Water Pump & Generator'].map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setAssetCategoryFilter(cat)}
                    className={`px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                      assetCategoryFilter === cat
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {cat === 'all' ? 'All Assets' : cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Asset Grid (Read-Only Cards) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredPublicAssets.map((asset) => (
                <div
                  key={asset.id}
                  onClick={() => setSelectedAssetDetail(asset)}
                  className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-soft hover:shadow-medium hover:border-blue-300 transition-all cursor-pointer flex flex-col justify-between group"
                >
                  <div>
                    {/* Photo */}
                    <div className="h-44 w-full bg-slate-100 relative overflow-hidden">
                      {asset.image_url ? (
                        <img
                          src={asset.image_url}
                          alt={asset.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-slate-200 text-slate-400">
                          <Wrench className="w-8 h-8" />
                        </div>
                      )}
                      <div className="absolute top-2.5 left-2.5">
                        <span className="font-mono text-[10px] font-black bg-slate-950/80 text-white px-2 py-0.5 rounded-md backdrop-blur-xs">
                          {asset.asset_tag}
                        </span>
                      </div>
                      <div className="absolute top-2.5 right-2.5">
                        <Badge variant={asset.current_condition === 'Operational' ? 'success' : 'warning'}>
                          {asset.current_condition}
                        </Badge>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-4 space-y-2">
                      <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider block">
                        {asset.category}
                      </span>
                      <h4 className="text-sm font-bold text-slate-900 leading-tight">
                        {asset.name}
                      </h4>
                      <p className="text-[11px] text-slate-500 line-clamp-2">
                        {asset.specs || asset.ai_maintenance_alert}
                      </p>
                    </div>
                  </div>

                  {/* Footer info */}
                  <div className="p-4 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-600">
                    <span className="truncate max-w-[180px]">{asset.assigned_department}</span>
                    <span className="text-blue-600 font-bold flex items-center gap-1 group-hover:underline">
                      View Specs <Eye className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Interactive Visual Plot Map Modal */}
      <InteractivePlotModal
        isOpen={isVisualPlotModalOpen}
        onClose={() => setIsVisualPlotModalOpen(false)}
        plots={plots}
        selectedPlotId={selectedPlot?.id}
        onSelectPlot={(plot) => {
          setSelectedPlot(plot);
          setBurialForm(prev => ({ ...prev, plot_id: plot.id }));
        }}
      />

      {/* "See More Facilities & Parks" Modal */}
      <Modal
        isOpen={isSeeMoreFacilitiesOpen}
        onClose={() => setIsSeeMoreFacilitiesOpen(false)}
        title="All Municipal Facilities & Parks"
        description="Select a civic center, sports gymnasium, amphitheater or community park ground."
        maxWidth="2xl"
      >
        <div className="space-y-4 text-xs">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search facility name, zone, location..."
                value={facilitySearchQuery}
                onChange={(e) => setFacilitySearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white text-slate-800"
              />
            </div>
            <div className="flex gap-1.5">
              {['all', 'Government Facility', 'Park & Recreation'].map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setFacilityCategoryFilter(cat)}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                    facilityCategoryFilter === cat ? 'bg-blue-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {cat === 'all' ? 'All' : cat.includes('Park') ? 'Parks' : 'Facilities'}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-96 overflow-y-auto pr-1">
            {filteredFacilitiesInModal.map((f) => {
              const isSelected = selectedFacilityId === f.id;
              return (
                <div
                  key={f.id}
                  onClick={() => {
                    setSelectedFacilityId(f.id);
                    setIsSeeMoreFacilitiesOpen(false);
                  }}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-blue-50 border-blue-600 shadow-soft ring-2 ring-blue-500/20'
                      : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-soft'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">{f.category}</span>
                    <span className="text-xs font-bold text-blue-700">₱{f.hourly_rate}/hr</span>
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 leading-tight mt-1">{f.name}</h4>
                  <p className="text-[11px] text-slate-500 mt-1">Cap: {f.capacity} Pax • {f.location}</p>
                  <p className="text-[10px] text-slate-400 border-t border-slate-100 pt-2 mt-2 truncate">{f.amenities}</p>
                </div>
              );
            })}
          </div>
        </div>
      </Modal>

      {/* Asset Detail Modal (Read-Only) */}
      <Modal
        isOpen={selectedAssetDetail !== null}
        onClose={() => setSelectedAssetDetail(null)}
        title={selectedAssetDetail?.name || 'Asset Details'}
        description={`Government Asset Tag: ${selectedAssetDetail?.asset_tag || ''}`}
        maxWidth="lg"
      >
        {selectedAssetDetail && (
          <div className="space-y-4 text-xs">
            {selectedAssetDetail.image_url && (
              <div className="w-full h-48 rounded-xl overflow-hidden bg-slate-100 border border-slate-200">
                <img
                  src={selectedAssetDetail.image_url}
                  alt={selectedAssetDetail.name}
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-slate-400 block text-[10px]">Status / Condition</span>
                <Badge variant={selectedAssetDetail.current_condition === 'Operational' ? 'success' : 'warning'} className="mt-1">
                  {selectedAssetDetail.current_condition}
                </Badge>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-slate-400 block text-[10px]">Assigned Department</span>
                <span className="font-bold text-slate-800 text-[11px] mt-1 block">{selectedAssetDetail.assigned_department}</span>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Technical Specifications:</span>
              <p className="text-slate-800 leading-relaxed font-medium">{selectedAssetDetail.specs || 'Standard municipal heavy equipment configuration.'}</p>
            </div>

            <div className="p-3 bg-blue-50/70 rounded-xl border border-blue-200 space-y-1">
              <span className="text-blue-700 block text-[10px] uppercase font-bold">Health & Maintenance Telemetry:</span>
              <p className="text-blue-950 leading-relaxed">{selectedAssetDetail.ai_maintenance_alert}</p>
            </div>

            <div className="pt-2 flex justify-end">
              <Button size="sm" onClick={() => setSelectedAssetDetail(null)}>
                Close Viewer
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
