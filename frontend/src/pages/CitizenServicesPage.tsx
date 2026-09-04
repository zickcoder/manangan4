import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { 
  Building, 
  Trees, 
  Cross, 
  Droplet, 
  Wrench, 
  CheckCircle2, 
  AlertTriangle, 
  AlertCircle, 
  Sparkles, 
  Layers, 
  Map, 
  Grid, 
  Upload, 
  Image as ImageIcon, 
  CheckSquare, 
  Square, 
  Check, 
  FileCheck, 
  Eye, 
  ShieldCheck, 
  Search,
  X,
  Plus
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { InteractivePlotModal } from '../components/cemetery/InteractivePlotModal';
import { 
  fetchFacilities, 
  createReservation, 
  checkFacilityAI, 
  checkDoubleBooking,
  fetchCemeteries, 
  fetchCemeteryPlots, 
  createBurial, 
  createUtilityRequest, 
  fetchAssets 
} from '../lib/api';
import { Facility, CemeteryPlot, Asset } from '../types';

interface CitizenServicesProps {
  defaultTab?: 'reserve' | 'utility' | 'cemetery' | 'assets';
}

export function CitizenServicesPage({ defaultTab = 'reserve' }: CitizenServicesProps) {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [resubmittingTicket, setResubmittingTicket] = useState<any>(null);

  // Read defaultTab every render so it stays in sync with sidebar clicks
  const tabParam = searchParams.get('tab') as any;
  const [activeTab, setActiveTab] = useState<'reserve' | 'utility' | 'cemetery' | 'assets'>(
    tabParam || defaultTab
  );

  // Sync when defaultTab prop changes (sidebar link clicked)
  useEffect(() => {
    const incoming = tabParam || defaultTab;
    if (incoming) setActiveTab(incoming);
  }, [defaultTab, tabParam]);

  // Current Logged In Citizen
  const userStr = localStorage.getItem('govserve_user');
  let currentUser: any = { name: 'Juan M. Dela Cruz', email: 'juan.delacruz@citizen.gov.ph', phone: '+63 917 123 4567', id: 0 };
  try {
    if (userStr) currentUser = JSON.parse(userStr);
  } catch {}

  // 1. Facility & Park Reservation
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
    applicant_name: currentUser?.name || 'Juan M. Dela Cruz',
    applicant_email: currentUser?.email || 'juan.delacruz@citizen.gov.ph',
    applicant_phone: currentUser?.phone || '+63 917 123 4567',
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
  const [reserveError, setReserveError] = useState('');
  const [reserveSubmitting, setReserveSubmitting] = useState(false);

  // 2. Water & Drainage Incident Desk
  const HOUSEHOLD_OPTIONS = [
    '1 Household (Direct Property Only)',
    '2 - 5 Households (Compound / Immediate Neighbors)',
    '6 - 15 Households (Entire Street / Alley)',
    '16 - 50 Households (Subdivision Block)',
    '50+ Households (Community-wide / Major Zone)'
  ];

  const [utilityForm, setUtilityForm] = useState({
    citizen_name: currentUser?.name || 'Juan M. Dela Cruz',
    citizen_phone: currentUser?.phone || '+63 917 123 4567',
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
  const [utilityError, setUtilityError] = useState('');

  const handleUtilityPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUtilityError('');
    const reader = new FileReader();
    reader.onload = () => {
      setUtilityForm(prev => ({
        ...prev,
        photo_url: reader.result as string,
        photo_name: file.name
      }));
    };
    reader.readAsDataURL(file);
  };

  // 3. Cemetery Plot Search & Burial
  const [cemeteries, setCemeteries] = useState<string[]>(['Barangay 178 Municipal Cemetery']);
  const [selectedCemetery, setSelectedCemetery] = useState<string>('Barangay 178 Municipal Cemetery');
  const [plots, setPlots] = useState<CemeteryPlot[]>([]);
  const [burialError, setBurialError] = useState('');
  const [isVisualPlotModalOpen, setIsVisualPlotModalOpen] = useState(false);
  const [selectedPlot, setSelectedPlot] = useState<CemeteryPlot | null>(null);

  const [burialForm, setBurialForm] = useState({
    // Section A
    deceased_name: '',
    date_of_birth: '1960-01-01',
    date_of_death: new Date().toISOString().split('T')[0],
    cause_of_death: '',
    deceased_address: 'Barangay 178, Mindanao Avenue, Zone 4',
    attending_physician: '',
    // Section B
    burial_date: new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0],
    burial_time: '10:00 AM',
    plot_id: 0,
    cemetery_name: 'Barangay 178 Municipal Cemetery',
    // Section C
    contact_person: currentUser?.name || 'Juan M. Dela Cruz',
    applicant_relationship: 'Spouse',
    contact_phone: currentUser?.phone || '+63 917 123 4567',
    applicant_email: currentUser?.email || 'juan.delacruz@citizen.gov.ph',
    applicant_address: 'Barangay 178, Purok 3',
    // Section D (Real Upload)
    death_cert_attached: false,
    death_cert_name: '',
    death_cert_url: '',
    valid_id_attached: false,
    valid_id_name: '',
    valid_id_url: '',
    // Section E
    declaration_accepted: false,
  });
  const [burialSuccess, setBurialSuccess] = useState<any>(null);
  const [burialSubmitting, setBurialSubmitting] = useState(false);

  // Restore ticket details when citizen clicks "Resubmit" from MyTicketsPage
  useEffect(() => {
    try {
      const stateItem = (location.state as any)?.resubmitItem;
      const storedItemStr = sessionStorage.getItem('govserve_resubmit_ticket');
      const item = stateItem || (storedItemStr ? JSON.parse(storedItemStr) : null);
      if (item) {
        setResubmittingTicket(item);
        if (item.category === 'facility') {
          let sTime = '08:00 AM';
          let eTime = '12:00 PM';
          if (item.time && item.time.includes('-')) {
            const parts = item.time.split('-').map((s: string) => s.trim());
            if (parts[0]) sTime = parts[0];
            if (parts[1]) eTime = parts[1];
          }
          setReserveForm(prev => ({
            ...prev,
            applicant_name: item.applicant || prev.applicant_name,
            applicant_phone: item.contact || prev.applicant_phone,
            purpose: item.details || prev.purpose,
            event_date: item.date && !item.date.includes('N/A') ? item.date : prev.event_date,
            start_time: sTime,
            end_time: eTime,
            special_equipment: Array.isArray(item.special_equipment)
              ? item.special_equipment
              : (item.special_equipment ? String(item.special_equipment).split(',').map((s: string) => s.trim()) : prev.special_equipment)
          }));
        } else if (item.category === 'utility') {
          setUtilityForm(prev => ({
            ...prev,
            citizen_name: item.applicant || prev.citizen_name,
            citizen_phone: item.contact || prev.citizen_phone,
            description: item.details || prev.description,
            location: item.location || prev.location
          }));
        } else if (item.category === 'cemetery') {
          setBurialForm(prev => ({
            ...prev,
            contact_person: item.applicant || prev.contact_person,
            contact_phone: item.contact || prev.contact_phone
          }));
        }
      }
    } catch {}
  }, [location.state]);

  const handleDeathCertUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBurialError('');
    const reader = new FileReader();
    reader.onload = () => {
      setBurialForm(prev => ({
        ...prev,
        death_cert_attached: true,
        death_cert_name: file.name,
        death_cert_url: reader.result as string
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleValidIdUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBurialError('');
    const reader = new FileReader();
    reader.onload = () => {
      setBurialForm(prev => ({
        ...prev,
        valid_id_attached: true,
        valid_id_name: file.name,
        valid_id_url: reader.result as string
      }));
    };
    reader.readAsDataURL(file);
  };

  // 4. Public Assets (Read-Only)
  const [publicAssets, setPublicAssets] = useState<Asset[]>([]);
  const [assetCategoryFilter, setAssetCategoryFilter] = useState('all');
  const [assetSearchQuery, setAssetSearchQuery] = useState('');
  const [selectedAssetDetail, setSelectedAssetDetail] = useState<Asset | null>(null);

  useEffect(() => {
    fetchFacilities().then(setFacilities).catch(console.error);
    fetchAssets().then(setPublicAssets).catch(console.error);
    fetchCemeteries().then((list) => {
      if (list.length > 0) setCemeteries(Array.from(new Set(['Barangay 178 Municipal Cemetery', ...list])));
    }).catch(console.error);
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

  const selectedFacilityObj = facilities.find(f => f.id === selectedFacilityId) || facilities[0] || {
    id: 1,
    name: 'Barangay 178 Multi-Purpose Civic Center',
    category: 'Government Facility',
    capacity: 350,
    hourly_rate: 500,
    location: 'Civic Complex, Mindanao Ave.',
    amenities: 'Central Aircon, Full PA Sound System, Stage, Chairs'
  };
  const currentAttendees = parseInt(reserveForm.attendees, 10) || 0;
  const isPaxExceeded = selectedFacilityObj ? currentAttendees > selectedFacilityObj.capacity : false;

  // Toggle Special Equipment Requirement Checklist
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

  // Real-time automatic double booking check (detects if conflicting slot is the citizen's own schedule)
  useEffect(() => {
    if (!selectedFacilityObj || !reserveForm.event_date) return;

    checkDoubleBooking(
      selectedFacilityId,
      selectedFacilityObj.name,
      reserveForm.event_date,
      reserveForm.start_time,
      reserveForm.end_time,
      reserveForm.applicant_email || currentUser?.email,
      reserveForm.applicant_name || currentUser?.name,
      resubmittingTicket?.originalId
    ).then((res) => {
      if (res.hasConflict) {
        setAiConflict({
          hasConflict: true,
          isOwnSchedule: false,
          aiAnalysis: res.message,
          alternativeSlots: res.suggestedSlots
        });
      } else if ((res as any).isOwnSchedule) {
        setAiConflict({
          hasConflict: false,
          isOwnSchedule: true,
          aiAnalysis: res.message,
          alternativeSlots: []
        });
      } else {
        setAiConflict(null);
      }
    }).catch(console.error);
  }, [selectedFacilityId, reserveForm.event_date, reserveForm.start_time, reserveForm.end_time, reserveForm.applicant_email, reserveForm.applicant_name, resubmittingTicket]);

  const handleFacilityReserve = async (e: React.FormEvent) => {
    e.preventDefault();
    setReserveError('');

    if (
      !reserveForm.applicant_name?.trim() ||
      !reserveForm.applicant_email?.trim() ||
      !reserveForm.applicant_phone?.trim() ||
      !reserveForm.purpose?.trim() ||
      !reserveForm.event_date?.trim() ||
      !reserveForm.start_time?.trim() ||
      !reserveForm.end_time?.trim()
    ) {
      setReserveError('Please fill out all required fields: Applicant Name, Email, Contact Number, Event Purpose, Date, and Time Slots.');
      return;
    }

    if (!currentAttendees || currentAttendees <= 0) {
      setReserveError('Please specify a valid number of expected attendees.');
      return;
    }

    if (isPaxExceeded) {
      setReserveError(`Number of attendees (${currentAttendees}) exceeds maximum venue capacity (${selectedFacilityObj?.capacity}).`);
      return;
    }

    setReserveSubmitting(true);
    try {
      const payload = {
        ...reserveForm,
        applicant_name: reserveForm.applicant_name.trim(),
        applicant_email: reserveForm.applicant_email.trim(),
        applicant_phone: reserveForm.applicant_phone.trim(),
        purpose: reserveForm.purpose.trim(),
        facility_id: selectedFacilityId,
        facility_name: selectedFacilityObj.name,
        facility_category: selectedFacilityObj.category,
        facility_location: selectedFacilityObj.location,
        hourly_rate: selectedFacilityObj.hourly_rate,
        attendees: currentAttendees,
        ...(resubmittingTicket ? { resubmitId: resubmittingTicket.originalId, reference_no: resubmittingTicket.ref_no } : {})
      };
      const res = await createReservation(payload);
      if (res.success) {
        setReservationSuccess(res.data || res);
        setResubmittingTicket(null);
        sessionStorage.removeItem('govserve_resubmit_ticket');
      } else {
        setReserveError(res.message || 'Failed to submit reservation.');
      }
    } catch (e) {
      setReserveError('Error submitting reservation request.');
    } finally {
      setReserveSubmitting(false);
    }
  };

  const handleUtilitySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUtilityError('');

    if (
      !utilityForm.citizen_name?.trim() ||
      !utilityForm.citizen_phone?.trim() ||
      !utilityForm.location?.trim() ||
      !utilityForm.description?.trim() ||
      !utilityForm.incident_type?.trim()
    ) {
      setUtilityError('Please fill out all required incident fields: Citizen Name, Phone, Location, Incident Type, and Detailed Description.');
      return;
    }

    // Require image before submitting
    if (!utilityForm.photo_url) {
      setUtilityError('⚠️ Photo attachment is required. Please upload an image of the hazard before submitting.');
      return;
    }

    setUtilitySubmitting(true);
    try {
      const res = await createUtilityRequest({
        ...utilityForm,
        citizen_name: utilityForm.citizen_name.trim(),
        citizen_phone: utilityForm.citizen_phone.trim(),
        location: utilityForm.location.trim(),
        description: utilityForm.description.trim()
      });
      if (res.success) {
        setUtilitySuccess(res.data);
      }
    } catch (e) {
      setUtilityError('Failed to submit utility request. Please try again.');
    } finally {
      setUtilitySubmitting(false);
    }
  };

  const handleBurialSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBurialError('');

    // Section A validation
    if (
      !burialForm.deceased_name?.trim() ||
      !burialForm.cause_of_death?.trim() ||
      !burialForm.deceased_address?.trim() ||
      !burialForm.attending_physician?.trim() ||
      !burialForm.date_of_birth ||
      !burialForm.date_of_death
    ) {
      setBurialError('SECTION A: Please complete all deceased details (Full Name, Cause of Death, Last Address, Attending Physician, Dates).');
      return;
    }

    // Section B validation
    if (!selectedPlot || !burialForm.plot_id || !burialForm.burial_date || !burialForm.burial_time) {
      setBurialError('SECTION B: Please select an available burial plot / columbarium niche, burial date, and time.');
      return;
    }

    // Section C validation
    if (
      !burialForm.contact_person?.trim() ||
      !burialForm.contact_phone?.trim() ||
      !burialForm.applicant_email?.trim() ||
      !burialForm.applicant_address?.trim()
    ) {
      setBurialError('SECTION C: Please fill out all applicant / next of kin contact information.');
      return;
    }

    // Section D validation
    if (!burialForm.death_cert_attached || !burialForm.valid_id_attached) {
      setBurialError('SECTION D: REQUIREMENTS — Please upload both the PSA Death Certificate and Valid Government ID.');
      return;
    }

    // Section E validation
    if (!burialForm.declaration_accepted) {
      setBurialError('SECTION E: Please certify the sworn legal declaration to proceed.');
      return;
    }

    setBurialSubmitting(true);
    try {
      const payload = {
        ...burialForm,
        deceased_name: burialForm.deceased_name.trim(),
        cause_of_death: burialForm.cause_of_death.trim(),
        deceased_address: burialForm.deceased_address.trim(),
        attending_physician: burialForm.attending_physician.trim(),
        contact_person: burialForm.contact_person.trim(),
        contact_phone: burialForm.contact_phone.trim(),
        applicant_email: burialForm.applicant_email.trim(),
        applicant_address: burialForm.applicant_address.trim(),
        plot_id: selectedPlot.id,
        plot_code: selectedPlot.plot_code,
        section: selectedPlot.section,
        cemetery_name: selectedCemetery,
      };
      const res = await createBurial(payload);
      if (res.success) {
        setBurialSuccess(res.data || res);
      } else {
        setBurialError(res.message || 'Failed to submit application.');
      }
    } catch (err) {
      setBurialError('Submission error occurred.');
    } finally {
      setBurialSubmitting(false);
    }
  };

  const filteredPublicAssets = publicAssets.filter(a => {
    const matchesCat = assetCategoryFilter === 'all' || a.category === assetCategoryFilter;
    const matchesSearch = a.name.toLowerCase().includes(assetSearchQuery.toLowerCase()) ||
      a.asset_tag.toLowerCase().includes(assetSearchQuery.toLowerCase()) ||
      a.assigned_department.toLowerCase().includes(assetSearchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-extrabold text-[#0f172a] font-display">
              Municipal E-Services Desk
            </h2>
            <Badge variant="info" size="sm">Online Processing</Badge>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Submit service applications, incident hazard reports, and browse government asset inventory directly from your citizen account.
          </p>
        </div>

        <Button size="sm" variant="outline" onClick={() => navigate('/dashboard')}>
          ← Back to Citizen Dashboard
        </Button>
      </div>

      {/* 4-Tab Navigation Selector */}
      <div className="bg-white rounded-2xl shadow-soft border border-[#cbd5e1] p-1.5 flex flex-wrap sm:flex-nowrap gap-1">
        {[
          { id: 'reserve', label: 'Facility & Park Reservation', icon: Building, path: '/facilities' },
          { id: 'utility', label: 'Water & Drainage Desk', icon: Droplet, path: '/utilities' },
          { id: 'cemetery', label: 'Burial & Cemetery Permit', icon: Cross, path: '/cemetery' },
          { id: 'assets', label: 'Public Asset Catalog', icon: Wrench, path: '/assets' },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as any);
                navigate(tab.path);
              }}
              className={`flex-1 py-3 px-3 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                isActive
                  ? 'bg-blue-600 text-white shadow-blue shadow-md'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="truncate">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab 1: Facility Reservation */}
      {activeTab === 'reserve' && (
        <div className="space-y-6 animate-fade-in">
          {reservationSuccess ? (
            <Card className="text-center p-8 border-emerald-200 bg-emerald-50/40">
              <div className="w-14 h-14 bg-emerald-600 text-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-600/30">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-extrabold text-[#0f172a] font-display">Reservation Request Logged!</h3>
              <p className="text-xs sm:text-sm text-slate-600 mt-2 max-w-md mx-auto">
                Reference Number: <span className="font-bold font-mono text-blue-600">{reservationSuccess.reference_no}</span>. This request is now visible in your dashboard and the admin desk.
              </p>
              <div className="pt-4 flex justify-center gap-3">
                <Button size="md" onClick={() => setReservationSuccess(null)}>
                  Book Another Facility
                </Button>
                <Button size="md" variant="outline" onClick={() => navigate('/dashboard')}>
                  View in Dashboard
                </Button>
              </div>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left venue cards */}
              <div className="space-y-3">
                <p className="text-xs font-bold text-slate-600 uppercase tracking-wider">Select Space</p>
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
                          <div className={`p-2 rounded-xl shrink-0 ${(fac?.category || '').toLowerCase().includes('park') ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
                            {(fac?.category || '').toLowerCase().includes('park') ? <Trees className="w-4 h-4" /> : <Building className="w-4 h-4" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-bold text-slate-400 uppercase truncate">{fac.category}</span>
                              <span className="text-[11px] font-bold text-blue-700">₱{fac.hourly_rate}/hr</span>
                            </div>
                            <h4 className="text-xs font-bold text-slate-900 leading-tight mt-0.5 truncate">{fac.name}</h4>
                            <p className="text-[10px] text-slate-500 mt-0.5">Cap: <strong>{fac.capacity} Pax</strong> • {fac.location}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {selectedFacilityObj && (
                  <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Selected Venue Specs:</span>
                    <p className="font-bold text-slate-900">{selectedFacilityObj.name}</p>
                    <p className="text-[11px] text-slate-600 font-medium">Max Capacity: <span className="text-blue-700 font-bold">{selectedFacilityObj.capacity} Pax</span></p>
                    <p className="text-[10px] text-slate-500">{selectedFacilityObj.amenities}</p>
                  </div>
                )}
              </div>

              {/* Form */}
              <div className="lg:col-span-2">
                <Card className="border-[#cbd5e1]">
                  <CardHeader>
                    <CardTitle>Facility & Park Reservation Form</CardTitle>
                    <CardDescription>Select event purpose, special equipment, and verify schedule</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {resubmittingTicket && (
                      <div className="mb-4 p-3 bg-blue-50 border border-blue-300 rounded-2xl flex items-center justify-between text-blue-950 text-xs animate-fade-in">
                        <div className="flex items-center gap-2.5">
                          <span className="p-1.5 bg-blue-200 text-blue-900 rounded-xl font-bold">🔄</span>
                          <div>
                            <p className="font-bold">Resubmitting Application: <span className="font-mono text-blue-800">{resubmittingTicket.ref_no}</span></p>
                            <p className="text-[11px] text-blue-700">You are updating your schedule. Your previous pending booking is recognized as your own and will not conflict.</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setResubmittingTicket(null);
                            sessionStorage.removeItem('govserve_resubmit_ticket');
                          }}
                          className="text-blue-700 hover:text-blue-900 text-xs font-bold underline cursor-pointer shrink-0"
                        >
                          Cancel Resubmit
                        </button>
                      </div>
                    )}
                    <form onSubmit={handleFacilityReserve} className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Input
                          label="Applicant Name *"
                          required
                          value={reserveForm.applicant_name}
                          onChange={(e) => setReserveForm({ ...reserveForm, applicant_name: e.target.value })}
                        />
                        <Input
                          label="Email Address *"
                          type="email"
                          required
                          value={reserveForm.applicant_email}
                          onChange={(e) => setReserveForm({ ...reserveForm, applicant_email: e.target.value })}
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Input
                          label="Contact Number *"
                          required
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
                          {isPaxExceeded && (
                            <div className="mt-1.5 p-2 rounded-xl bg-amber-50 border border-amber-300 text-amber-800 text-[11px] font-semibold flex items-center gap-1.5">
                              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                              <span>⚠️ <strong>Exceeded Limit:</strong> {currentAttendees} pax exceeds maximum venue capacity ({selectedFacilityObj.capacity} pax)!</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* PREDEFINED PURPOSE */}
                      <div>
                        <label className="block text-xs font-semibold text-[#334155] mb-1.5">Purpose of Event / Activity *</label>
                        <select
                          value={reserveForm.purpose}
                          onChange={(e) => setReserveForm({ ...reserveForm, purpose: e.target.value })}
                          className="w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs sm:text-sm font-medium focus:border-blue-600 focus:outline-none"
                        >
                          {PURPOSE_OPTIONS.map((p, idx) => (
                            <option key={idx} value={p}>{p}</option>
                          ))}
                        </select>
                        {reserveForm.purpose === 'Other Government / Civic Activity' && (
                          <input
                            type="text"
                            placeholder="Please specify specific activity..."
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

                      {/* PREDEFINED SPECIAL EQUIPMENT */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="block text-xs font-semibold text-[#334155]">
                            Special Equipment Requirements:
                          </label>
                          {reserveForm.special_equipment.length > 0 && (
                            <span className="text-[11px] font-bold text-blue-600">
                              {reserveForm.special_equipment.length} selected
                            </span>
                          )}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {EQUIPMENT_OPTIONS.map((item, idx) => {
                            const isChecked = reserveForm.special_equipment.includes(item);
                            return (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => toggleEquipment(item)}
                                className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all flex items-center gap-2.5 text-xs font-medium ${
                                  isChecked
                                    ? 'bg-blue-50 border-blue-500 text-blue-900 shadow-sm ring-1 ring-blue-500/30'
                                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                                }`}
                              >
                                {isChecked ? (
                                  <CheckSquare className="w-4 h-4 text-blue-600 shrink-0" />
                                ) : (
                                  <Square className="w-4 h-4 text-slate-400 shrink-0" />
                                )}
                                <span className="flex-1 select-none">{item}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* AI Slot Check Box */}
                      {aiConflict && (
                        <div className={`p-4 rounded-2xl text-white space-y-2.5 animate-fade-in shadow-medium border ${
                          aiConflict.isOwnSchedule
                            ? 'bg-gradient-to-br from-emerald-950 to-slate-900 border-emerald-500/40'
                            : 'bg-gradient-to-br from-indigo-950 to-slate-900 border-indigo-500/30'
                        }`}>
                          <div className="flex items-center justify-between">
                            <span className={`text-xs font-bold flex items-center gap-1.5 ${aiConflict.isOwnSchedule ? 'text-emerald-300' : 'text-indigo-300'}`}>
                              <Sparkles className={`w-4 h-4 animate-pulse ${aiConflict.isOwnSchedule ? 'text-emerald-400' : 'text-indigo-400'}`} />
                              <span>{aiConflict.isOwnSchedule ? 'Your Booking Recognized' : 'AI Slot Intelligence'}</span>
                            </span>
                            <Badge variant={aiConflict.hasConflict ? 'destructive' : 'success'}>
                              {aiConflict.hasConflict ? '⚠️ Schedule Conflict Detected' : aiConflict.isOwnSchedule ? '✓ Your Existing Schedule (Resubmit Ready)' : '✅ Optimal Slot Verified'}
                            </Badge>
                          </div>
                          <p className="text-xs text-slate-200 leading-relaxed">{aiConflict.aiAnalysis}</p>
                          {aiConflict.alternativeSlots && aiConflict.alternativeSlots.length > 0 && (
                            <div className="pt-2 space-y-1.5">
                              <p className="text-[11px] font-bold text-indigo-300">💡 Suggested Alternative Slots (Click to Apply):</p>
                              <div className="flex flex-wrap gap-2">
                                {aiConflict.alternativeSlots.map((slot: string, idx: number) => (
                                  <button
                                    key={idx}
                                    type="button"
                                    onClick={() => {
                                      if (slot.includes('02:00 PM')) {
                                        setReserveForm(prev => ({ ...prev, start_time: '02:00 PM', end_time: '06:00 PM' }));
                                      }
                                      alert(`Applied alternative window: ${slot}`);
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

                      {/* Single Action Button */}
                      <div className="pt-3 border-t border-slate-100 flex justify-end">
                        <Button 
                          type="submit" 
                          size="md" 
                          disabled={Boolean(aiConflict?.hasConflict) || isPaxExceeded}
                          leftIcon={<Sparkles className="w-4 h-4 text-blue-100" />}
                          className={`w-full sm:w-auto px-8 font-bold ${
                            isPaxExceeded || aiConflict?.hasConflict 
                              ? 'bg-red-200 text-red-700 cursor-not-allowed border border-red-300' 
                              : 'bg-blue-600 hover:bg-blue-700 text-white shadow-md'
                          }`}
                        >
                          {isPaxExceeded 
                            ? `🚫 Cannot Submit (Exceeded Max Capacity of ${selectedFacilityObj.capacity} Pax)` 
                            : aiConflict?.hasConflict 
                            ? '🚫 Cannot Submit (Slot Already Booked)' 
                            : resubmittingTicket
                            ? 'Confirm & Resubmit Reservation (AI Verified)'
                            : 'Submit Reservation (AI Assisted)'}
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

      {/* Tab 2: Water & Drainage Request */}
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
              <div className="pt-4 flex justify-center gap-3">
                <Button size="md" onClick={() => setUtilitySuccess(null)}>
                  Report Another Incident
                </Button>
                <Button size="md" variant="outline" onClick={() => navigate('/dashboard')}>
                  View in Dashboard
                </Button>
              </div>
            </Card>
          ) : (
            <Card className="border-[#cbd5e1] max-w-3xl mx-auto">
              <CardHeader>
                <CardTitle>File Water Supply or Drainage Incident</CardTitle>
                <CardDescription>Select affected households range and attach live photos for rapid dispatch</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleUtilitySubmit} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                      label="Reporter Full Name *"
                      required
                      value={utilityForm.citizen_name}
                      onChange={(e) => setUtilityForm({ ...utilityForm, citizen_name: e.target.value })}
                    />
                    <Input
                      label="Contact Number *"
                      required
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
                    label="Specific Location / Landmark Address *"
                    required
                    placeholder="e.g. Mindanao Ave. Corner Camarin St., near Zone 4 Health Center"
                    value={utilityForm.location}
                    onChange={(e) => setUtilityForm({ ...utilityForm, location: e.target.value })}
                  />

                  {/* Photo attachment — Real Upload Only & Mandatory */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-semibold text-[#334155]">
                        Upload Picture of Hazard * <span className="text-red-500 font-bold">(Mandatory)</span>
                      </label>
                      {utilityForm.photo_name && (
                        <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Attached
                        </span>
                      )}
                    </div>
                    
                    <div className={`p-4 border-2 border-dashed rounded-2xl transition-all text-center space-y-2.5 ${
                      utilityForm.photo_url
                        ? 'border-emerald-400 bg-emerald-50/40'
                        : utilityError
                        ? 'border-red-400 bg-red-50/40'
                        : 'border-slate-300 hover:border-cyan-500 bg-slate-50/70'
                    }`}>
                      {utilityForm.photo_url ? (
                        <div className="space-y-2">
                          <div className="relative inline-block rounded-xl overflow-hidden border border-slate-300 shadow-md">
                            <img
                              src={utilityForm.photo_url}
                              alt="Attached Hazard Preview"
                              className="max-h-48 w-auto object-cover rounded-xl mx-auto"
                            />
                            <button
                              type="button"
                              onClick={() => setUtilityForm({ ...utilityForm, photo_url: '', photo_name: '' })}
                              className="absolute top-2 right-2 bg-red-600 text-white p-1.5 rounded-full text-xs hover:bg-red-700 shadow-lg cursor-pointer transition-transform hover:scale-110"
                              title="Remove Photo"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                          <p className="text-xs font-semibold text-slate-700 flex items-center justify-center gap-1.5">
                            <ImageIcon className="w-4 h-4 text-cyan-600" />
                            <span className="truncate max-w-xs">{utilityForm.photo_name}</span>
                          </p>
                        </div>
                      ) : (
                        <label className="cursor-pointer block py-4 px-2">
                          <input
                            type="file"
                            accept="image/*, .jpg, .jpeg, .png, .webp, .gif, .bmp, .svg, .heic, .heif"
                            onChange={handleUtilityPhotoUpload}
                            className="hidden"
                          />
                          <div className="flex flex-col items-center justify-center gap-2">
                            <div className="w-12 h-12 rounded-2xl bg-cyan-100 text-cyan-600 flex items-center justify-center shadow-xs">
                              <Upload className="w-6 h-6" />
                            </div>
                            <div>
                              <p className="text-xs font-bold text-slate-800">
                                Click to Upload Picture
                              </p>
                              <p className="text-[11px] text-slate-500 mt-0.5">
                                Supports JPG, PNG, WEBP, GIF, HEIC, and other image formats (Max 15MB)
                              </p>
                            </div>
                            <span className="mt-1 px-3 py-1 bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all">
                              Select Image File
                            </span>
                          </div>
                        </label>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#334155] mb-1.5">
                      Description of Incident / Hazard *
                    </label>
                    <textarea
                      rows={2}
                      required
                      placeholder="Describe severity, flood height, burst pipe pressure, or traffic obstruction..."
                      value={utilityForm.description}
                      onChange={(e) => setUtilityForm({ ...utilityForm, description: e.target.value })}
                      className="w-full rounded-xl border border-slate-300 p-2.5 text-xs sm:text-sm"
                    />
                  </div>

                  {utilityError && (
                    <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 font-semibold flex items-center gap-2 animate-fade-in">
                      <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                      <span>{utilityError}</span>
                    </div>
                  )}

                  <div className="pt-2 flex justify-end">
                    <Button type="submit" size="lg" isLoading={utilitySubmitting} className="px-8 font-bold bg-cyan-600 hover:bg-cyan-700 text-white">
                      Submit Emergency Incident Ticket
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Tab 3: Burial & Cemetery Permit (Complete 5 Sections) */}
      {activeTab === 'cemetery' && (
        <div className="space-y-6 animate-fade-in">
          {burialSuccess ? (
            <Card className="text-center p-8 border-purple-200 bg-purple-50/40">
              <div className="w-14 h-14 bg-purple-600 text-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-purple-600/30">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-extrabold text-[#0f172a] font-display">Burial Application Logged!</h3>
              <p className="text-xs sm:text-sm text-slate-600 mt-2 max-w-md mx-auto">
                Permit Number: <span className="font-bold font-mono text-purple-700">{burialSuccess.permit_no || burialSuccess.reference_no}</span>
              </p>
              <div className="pt-4 flex justify-center gap-3">
                <Button size="md" onClick={() => setBurialSuccess(null)}>
                  File Another Application
                </Button>
                <Button size="md" variant="outline" onClick={() => navigate('/dashboard')}>
                  View in Dashboard
                </Button>
              </div>
            </Card>
          ) : (
            <Card className="border-[#cbd5e1] max-w-3xl mx-auto">
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
                  
                  {/* SECTION A: DECEASED INFORMATION */}
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                    <div className="flex items-center gap-2 text-slate-900 font-bold text-xs uppercase tracking-wider border-b border-slate-200 pb-2">
                      <span className="w-5 h-5 rounded-full bg-purple-600 text-white flex items-center justify-center text-[10px] font-bold">A</span>
                      <span>SECTION A: DECEASED INFORMATION</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <Input
                        label="Full Name of Deceased *"
                        required
                        placeholder="Severino M. Dela Cruz"
                        value={burialForm.deceased_name}
                        onChange={(e) => setBurialForm({ ...burialForm, deceased_name: e.target.value })}
                      />
                      <Input
                        label="Cause of Death *"
                        required
                        placeholder="e.g. Cardiopulmonary Arrest"
                        value={burialForm.cause_of_death}
                        onChange={(e) => setBurialForm({ ...burialForm, cause_of_death: e.target.value })}
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <Input
                        label="Date of Birth *"
                        type="date"
                        required
                        max={new Date().toISOString().split('T')[0]}
                        value={burialForm.date_of_birth}
                        onChange={(e) => setBurialForm({ ...burialForm, date_of_birth: e.target.value })}
                      />
                      <Input
                        label="Date of Death *"
                        type="date"
                        required
                        max={new Date().toISOString().split('T')[0]}
                        value={burialForm.date_of_death}
                        onChange={(e) => setBurialForm({ ...burialForm, date_of_death: e.target.value })}
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <Input
                        label="Last Known Residential Address *"
                        required
                        value={burialForm.deceased_address}
                        onChange={(e) => setBurialForm({ ...burialForm, deceased_address: e.target.value })}
                      />
                      <Input
                        label="Attending Physician / Hospital"
                        placeholder="e.g. Dr. Juan Santos / Caloocan City Medical Center"
                        value={burialForm.attending_physician}
                        onChange={(e) => setBurialForm({ ...burialForm, attending_physician: e.target.value })}
                      />
                    </div>
                  </div>

                  {/* SECTION B: BURIAL DETAILS */}
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
                        min={new Date(Date.now() + 86400000).toISOString().split('T')[0]}
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
                            value={selectedPlot ? `${selectedPlot.plot_code} (${selectedPlot.section})` : 'Select from Map'}
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

                  {/* SECTION C: APPLICANT INFORMATION */}
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                    <div className="flex items-center gap-2 text-slate-900 font-bold text-xs uppercase tracking-wider border-b border-slate-200 pb-2">
                      <span className="w-5 h-5 rounded-full bg-purple-600 text-white flex items-center justify-center text-[10px] font-bold">C</span>
                      <span>SECTION C: APPLICANT INFORMATION</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <Input
                        label="Full Name of Applicant *"
                        required
                        value={burialForm.contact_person}
                        onChange={(e) => setBurialForm({ ...burialForm, contact_person: e.target.value })}
                      />
                      <Input
                        label="Relationship to Deceased *"
                        required
                        value={burialForm.applicant_relationship}
                        onChange={(e) => setBurialForm({ ...burialForm, applicant_relationship: e.target.value })}
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <Input
                        label="Contact Number *"
                        required
                        value={burialForm.contact_phone}
                        onChange={(e) => setBurialForm({ ...burialForm, contact_phone: e.target.value })}
                      />
                      <Input
                        label="Email Address (Optional)"
                        type="email"
                        value={burialForm.applicant_email}
                        onChange={(e) => setBurialForm({ ...burialForm, applicant_email: e.target.value })}
                      />
                    </div>

                    <Input
                      label="Complete Residential Address *"
                      required
                      value={burialForm.applicant_address}
                      onChange={(e) => setBurialForm({ ...burialForm, applicant_address: e.target.value })}
                    />
                  </div>

                  {/* SECTION D: REQUIREMENTS (Real File Uploads) */}
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                      <div className="flex items-center gap-2 text-slate-900 font-bold text-xs uppercase tracking-wider">
                        <span className="w-5 h-5 rounded-full bg-purple-600 text-white flex items-center justify-center text-[10px] font-bold">D</span>
                        <span>SECTION D: REQUIREMENTS (Document Upload)</span>
                      </div>
                      <span className="text-[10px] text-red-500 font-bold">* Both Required</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* PSA Death Certificate */}
                      <div className={`p-3.5 rounded-2xl border transition-all ${
                        burialForm.death_cert_attached
                          ? 'bg-emerald-50/70 border-emerald-400'
                          : 'bg-white border-slate-200 hover:border-purple-400'
                      }`}>
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                            <FileCheck className="w-4 h-4 text-purple-600" />
                            <span>PSA Death Certificate *</span>
                          </label>
                          {burialForm.death_cert_attached && (
                            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-100 px-1.5 py-0.5 rounded-md">
                              Attached ✅
                            </span>
                          )}
                        </div>

                        {burialForm.death_cert_attached ? (
                          <div className="flex items-center justify-between gap-2 p-2 bg-white rounded-xl border border-emerald-300">
                            {burialForm.death_cert_url.startsWith('data:image') ? (
                              <img
                                src={burialForm.death_cert_url}
                                alt="Death Cert Preview"
                                className="w-10 h-10 object-cover rounded-lg shrink-0 border"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-xs shrink-0">
                                PDF
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-slate-900 truncate">
                                {burialForm.death_cert_name || 'PSA_Death_Certificate.jpg'}
                              </p>
                              <span className="text-[10px] text-slate-500">Ready for verification</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => setBurialForm(prev => ({ ...prev, death_cert_attached: false, death_cert_name: '', death_cert_url: '' }))}
                              className="p-1 rounded-lg text-red-600 hover:bg-red-50 cursor-pointer"
                              title="Remove File"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <label className="flex flex-col items-center justify-center p-3 border-2 border-dashed border-slate-300 hover:border-purple-500 rounded-xl cursor-pointer bg-slate-50 transition-colors">
                            <input
                              type="file"
                              accept="image/*, .pdf, .jpg, .jpeg, .png, .webp"
                              onChange={handleDeathCertUpload}
                              className="hidden"
                            />
                            <Upload className="w-5 h-5 text-purple-600 mb-1" />
                            <span className="text-xs font-bold text-purple-700">Attach PSA Death Cert</span>
                            <span className="text-[10px] text-slate-400 mt-0.5">JPG, PNG, WEBP or PDF</span>
                          </label>
                        )}
                      </div>

                      {/* Valid Government ID */}
                      <div className={`p-3.5 rounded-2xl border transition-all ${
                        burialForm.valid_id_attached
                          ? 'bg-emerald-50/70 border-emerald-400'
                          : 'bg-white border-slate-200 hover:border-purple-400'
                      }`}>
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                            <ShieldCheck className="w-4 h-4 text-purple-600" />
                            <span>Valid Gov ID of Applicant *</span>
                          </label>
                          {burialForm.valid_id_attached && (
                            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-100 px-1.5 py-0.5 rounded-md">
                              Attached ✅
                            </span>
                          )}
                        </div>

                        {burialForm.valid_id_attached ? (
                          <div className="flex items-center justify-between gap-2 p-2 bg-white rounded-xl border border-emerald-300">
                            {burialForm.valid_id_url.startsWith('data:image') ? (
                              <img
                                src={burialForm.valid_id_url}
                                alt="Gov ID Preview"
                                className="w-10 h-10 object-cover rounded-lg shrink-0 border"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-xs shrink-0">
                                PDF
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-slate-900 truncate">
                                {burialForm.valid_id_name || 'Valid_Gov_ID.jpg'}
                              </p>
                              <span className="text-[10px] text-slate-500">Ready for verification</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => setBurialForm(prev => ({ ...prev, valid_id_attached: false, valid_id_name: '', valid_id_url: '' }))}
                              className="p-1 rounded-lg text-red-600 hover:bg-red-50 cursor-pointer"
                              title="Remove File"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <label className="flex flex-col items-center justify-center p-3 border-2 border-dashed border-slate-300 hover:border-purple-500 rounded-xl cursor-pointer bg-slate-50 transition-colors">
                            <input
                              type="file"
                              accept="image/*, .pdf, .jpg, .jpeg, .png, .webp"
                              onChange={handleValidIdUpload}
                              className="hidden"
                            />
                            <Upload className="w-5 h-5 text-purple-600 mb-1" />
                            <span className="text-xs font-bold text-purple-700">Attach Valid Gov ID</span>
                            <span className="text-[10px] text-slate-400 mt-0.5">UMID, Driver's License, Passport</span>
                          </label>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* SECTION E: DECLARATION */}
                  <div className="p-4 rounded-2xl bg-purple-50/60 border border-purple-200">
                    <label className="flex items-start gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={burialForm.declaration_accepted}
                        onChange={(e) => setBurialForm({ ...burialForm, declaration_accepted: e.target.checked })}
                        className="w-4 h-4 mt-0.5 text-purple-600 rounded border-slate-300"
                      />
                      <span className="text-xs text-purple-950 font-medium leading-relaxed">
                        ☑ I certify that all information provided in this application are true, correct, and legally accurate to the best of my knowledge under penalty of law.
                      </span>
                    </label>
                  </div>

                  {burialError && (
                    <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 font-medium">
                      ⚠️ {burialError}
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
          )}
        </div>
      )}

      {/* Tab 4: Public Assets Catalog (Read-Only) */}
      {activeTab === 'assets' && (
        <div className="space-y-6 animate-fade-in">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search government equipment, vehicles, pumps..."
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
                    assetCategoryFilter === cat ? 'bg-blue-600 text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {cat === 'all' ? 'All Assets' : cat}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredPublicAssets.map((asset) => (
              <div
                key={asset.id}
                onClick={() => setSelectedAssetDetail(asset)}
                className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-soft hover:shadow-medium hover:border-blue-300 transition-all cursor-pointer flex flex-col justify-between group"
              >
                <div>
                  <div className="h-44 w-full bg-slate-100 relative overflow-hidden">
                    {asset.image_url ? (
                      <img src={asset.image_url} alt={asset.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-slate-200 text-slate-400"><Wrench className="w-8 h-8" /></div>
                    )}
                    <div className="absolute top-2.5 left-2.5">
                      <span className="font-mono text-[10px] font-black bg-slate-950/80 text-white px-2 py-0.5 rounded-md">{asset.asset_tag}</span>
                    </div>
                    <div className="absolute top-2.5 right-2.5">
                      <Badge variant={asset.current_condition === 'Operational' ? 'success' : 'warning'}>{asset.current_condition}</Badge>
                    </div>
                  </div>
                  <div className="p-4 space-y-1.5">
                    <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider block">{asset.category}</span>
                    <h4 className="text-sm font-bold text-slate-900 leading-tight">{asset.name}</h4>
                    <p className="text-[11px] text-slate-500 line-clamp-2">{asset.specs || asset.ai_maintenance_alert}</p>
                  </div>
                </div>
                <div className="p-4 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-600">
                  <span className="truncate max-w-[180px]">{asset.assigned_department}</span>
                  <span className="text-blue-600 font-bold flex items-center gap-1 group-hover:underline">View Specs <Eye className="w-3.5 h-3.5" /></span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Interactive Visual Map Modal */}
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

      {/* Asset Detail Modal */}
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
                <img src={selectedAssetDetail.image_url} alt={selectedAssetDetail.name} className="w-full h-full object-cover" />
              </div>
            )}
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-slate-400 block text-[10px]">Condition</span>
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
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Specs:</span>
              <p className="text-slate-800 leading-relaxed font-medium">{selectedAssetDetail.specs}</p>
            </div>
            <div className="pt-2 flex justify-end">
              <Button size="sm" onClick={() => setSelectedAssetDetail(null)}>Close</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
