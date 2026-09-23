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
  Plus,
  ArrowRight,
  ExternalLink,
  FileText,
  Calendar,
  Edit
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
  fetchAssets,
  calculateBookingHours,
  calculateFacilityFee,
  calculateSlotFee,
  parse12HToMinutes
} from '../lib/api';
import { Facility, CemeteryPlot, Asset } from '../types';
import { compressImage } from '../lib/imageCompressor';
import { ParksFacilitiesBookingAssistant } from '../components/booking/ParksFacilitiesBookingAssistant';

interface CitizenServicesProps {
  defaultTab?: 'facility' | 'parks' | 'reserve' | 'utility' | 'cemetery' | 'assets';
}

export function CitizenServicesPage({ defaultTab = 'facility' }: CitizenServicesProps) {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [viewingRecognizedTicket, setViewingRecognizedTicket] = useState<any | null>(null);
  const [appliedAlternativeSlot, setAppliedAlternativeSlot] = useState<string | null>(null);

  // Read defaultTab every render so it stays in sync with sidebar clicks
  const tabParam = searchParams.get('tab') as any;
  const initialTab = tabParam || defaultTab;
  const [activeTab, setActiveTab] = useState<'facility' | 'parks' | 'reserve' | 'utility' | 'cemetery' | 'assets'>(
    initialTab === 'reserve' ? 'facility' : initialTab
  );

  // Resubmit ticket - initialized only from explicit navigation state (resets on refresh or tab switch)
  const [resubmittingTicket, setResubmittingTicket] = useState<any>(() => {
    return (location.state as any)?.resubmitItem || null;
  });

  // Sync when defaultTab prop changes (sidebar link clicked)
  useEffect(() => {
    const incoming = tabParam || defaultTab;
    if (incoming) setActiveTab(incoming === 'reserve' ? 'facility' : incoming);
  }, [defaultTab, tabParam]);

  // When switching tabs or services, clear resubmitting mode so it returns to normal submission
  useEffect(() => {
    setResubmittingTicket(null);
    setAiConflict(null);
    sessionStorage.removeItem('govserve_resubmit_ticket');
  }, [activeTab]);

  // Current Logged In Citizen
  const userStr = sessionStorage.getItem('govserve_citizen_user') || sessionStorage.getItem('govserve_user') || localStorage.getItem('govserve_citizen_user') || localStorage.getItem('govserve_user');
  let currentUser: any = null;
  try {
    if (userStr) currentUser = JSON.parse(userStr);
  } catch {}

  // 1. Facility & Park Reservation
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [selectedFacilityId, setSelectedFacilityId] = useState<number>(1);
  const [isSeeMoreFacilitiesOpen, setIsSeeMoreFacilitiesOpen] = useState(false);
  const [facilitySearchQuery, setFacilitySearchQuery] = useState('');
  // Lightbox for zoomable venue images
  const [zoomImage, setZoomImage] = useState<{ src: string; label: string } | null>(null);
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

  // Load equipment lists from localStorage (admin can manage these)
  const getEquipmentList = (key: string, fallback: string[]) => {
    try {
      const stored = localStorage.getItem(`govserve_equipment_${key}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return fallback;
  };

  const FACILITY_EQUIPMENT_OPTIONS = getEquipmentList('facility', DEFAULT_FACILITY_EQUIPMENT);
  const PARKS_EQUIPMENT_OPTIONS = getEquipmentList('parks', DEFAULT_PARKS_EQUIPMENT);

  // Separate selected equipment per tab
  const [facilityEquipment, setFacilityEquipment] = useState<string[]>([]);
  const [parksEquipment, setParksEquipment] = useState<string[]>([]);

  // Parks-specific Step 2 fields (Activity Type, Event Name, LGU proof)
  const [parksActivityType, setParksActivityType] = useState<'LGU Activity' | 'Sports Activity' | 'Other / Private Event'>('Sports Activity');
  const [parksEventName, setParksEventName] = useState('');
  const [parksProofPhoto, setParksProofPhoto] = useState<{ url: string; name: string } | null>(null);
  const [parksProofUploading, setParksProofUploading] = useState(false);

  // Parks Step 1 — Schedule Search & Viewing Filters
  const [scheduleYear, setScheduleYear] = useState(new Date().getFullYear());
  const [scheduleMonth, setScheduleMonth] = useState(new Date().getMonth()); // 0-indexed
  const [scheduleDayFilter, setScheduleDayFilter] = useState<'all' | 'weekday' | 'weekend'>('all');

  const handleParksProofUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setParksProofUploading(true);
    try {
      const compressed = await compressImage(file);
      setParksProofPhoto({ url: compressed, name: file.name });
    } catch {
      alert('Failed to process file. Please try a different image.');
    } finally {
      setParksProofUploading(false);
    }
  };

  const [reserveForm, setReserveForm] = useState({
    applicant_name: currentUser?.name || '',
    applicant_email: currentUser?.email || '',
    applicant_phone: currentUser?.phone || '',
    purpose: PURPOSE_OPTIONS[0],
    custom_purpose: '',
    event_date: new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0],
    start_time: '08:00 AM',
    end_time: '12:00 PM',
    attendees: '50',
    remarks: '',
  });

  // Keep form fields synced if user switches account or state loads
  useEffect(() => {
    if (currentUser?.email) {
      const cleanPhone = (currentUser.phone || '').replace(/\D/g, '').slice(0, 11);
      setReserveForm(prev => ({
        ...prev,
        applicant_name: prev.applicant_name || currentUser.name || '',
        applicant_email: prev.applicant_email || currentUser.email || '',
        applicant_phone: prev.applicant_phone || cleanPhone || '09171234567'
      }));
      setUtilityForm(prev => ({
        ...prev,
        citizen_name: prev.citizen_name || currentUser.name || '',
        citizen_phone: prev.citizen_phone || cleanPhone || '09171234567'
      }));
      setBurialForm(prev => ({
        ...prev,
        contact_person: prev.contact_person || currentUser.name || '',
        applicant_email: prev.applicant_email || currentUser.email || '',
        contact_phone: prev.contact_phone || cleanPhone || '09171234567'
      }));
    }
  }, [currentUser?.email]);
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
    citizen_phone: currentUser?.phone ? currentUser.phone.replace(/\D/g, '').slice(0, 11) : '09171234567',
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

  const handleUtilityPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUtilityError('');
    try {
      const compressed = await compressImage(file);
      setUtilityForm(prev => ({
        ...prev,
        photo_url: compressed,
        photo_name: file.name
      }));
    } catch {
      setUtilityError('Failed to process image file. Please try another image.');
    }
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
    contact_phone: currentUser?.phone ? currentUser.phone.replace(/\D/g, '').slice(0, 11) : '09171234567',
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
      if (stateItem) {
        setResubmittingTicket(stateItem);
        // Clear history state so that page refresh or browser reload returns to normal submission
        window.history.replaceState({}, document.title);
        sessionStorage.removeItem('govserve_resubmit_ticket');

        if (stateItem.category === 'facility') {
          let sTime = '08:00 AM';
          let eTime = '12:00 PM';
          if (stateItem.time && stateItem.time.includes('-')) {
            const parts = stateItem.time.split('-').map((s: string) => s.trim());
            if (parts[0]) sTime = parts[0];
            if (parts[1]) eTime = parts[1];
          }
          const resubmitEquip = Array.isArray(stateItem.special_equipment)
            ? stateItem.special_equipment
            : (stateItem.special_equipment ? String(stateItem.special_equipment).split(',').map((s: string) => s.trim()) : []);
          const resubmitIsPark = (stateItem.facility_category || '').toLowerCase().includes('park') ||
            (stateItem.title || '').toLowerCase().includes('park') ||
            (stateItem.title || '').toLowerCase().includes('amphitheater');
          if (resubmitIsPark) {
            setParksEquipment(resubmitEquip);
          } else {
            setFacilityEquipment(resubmitEquip);
          }
          setReserveForm(prev => ({
            ...prev,
            applicant_name: stateItem.applicant || prev.applicant_name,
            applicant_phone: stateItem.contact || prev.applicant_phone,
            purpose: stateItem.details || prev.purpose,
            // Use the raw ISO date (YYYY-MM-DD) for the date input, fall back to previous value
            event_date: stateItem.event_date_iso || (stateItem.date && !stateItem.date.includes('N/A') ? stateItem.date : prev.event_date),
            start_time: sTime,
            end_time: eTime,
          }));
        } else if (stateItem.category === 'utility') {
          setUtilityForm(prev => ({
            ...prev,
            citizen_name: stateItem.applicant || prev.citizen_name,
            citizen_phone: stateItem.contact || prev.citizen_phone,
            description: stateItem.details || prev.description,
            location: stateItem.location || prev.location
          }));
        } else if (stateItem.category === 'cemetery') {
          setBurialForm(prev => ({
            ...prev,
            contact_person: stateItem.applicant || prev.contact_person,
            contact_phone: stateItem.contact || prev.contact_phone
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
    fetchFacilities().then(list => setFacilities(list.filter((f: any) => (f.status || 'Available').toLowerCase() === 'available'))).catch(console.error);
    fetchAssets().then(setPublicAssets).catch(console.error);
    fetchCemeteries().then((list) => {
      if (list.length > 0) setCemeteries(Array.from(new Set(['Barangay 178 Municipal Cemetery', ...list])));
    }).catch(console.error);

    const handleDataUpdate = () => {
      fetchFacilities().then(list => setFacilities(list.filter((f: any) => (f.status || 'Available').toLowerCase() === 'available'))).catch(console.error);
    };
    window.addEventListener('govserve_data_updated', handleDataUpdate);
    return () => window.removeEventListener('govserve_data_updated', handleDataUpdate);
  }, []);

  const refreshPlots = () => {
    fetchCemeteryPlots('all', 'all', 'all').then((plotList) => {
      setPlots(plotList);
    }).catch(console.error);
  };

  useEffect(() => {
    refreshPlots();
    // Refresh every 10s while on cemetery tab so newly-submitted burials appear
    const plotInterval = setInterval(() => {
      if (activeTab === 'cemetery') refreshPlots();
    }, 10000);
    return () => clearInterval(plotInterval);
  }, [selectedCemetery, activeTab]);

  // Auto-select first available plot whenever plots array changes (handles slow eProvider response)
  useEffect(() => {
    if (plots.length > 0 && !selectedPlot) {
      const firstAvail = plots.find((p: CemeteryPlot) => p.status === 'Available') || null;
      if (firstAvail) {
        setSelectedPlot(firstAvail);
        setBurialForm(prev => ({ ...prev, plot_id: firstAvail.id }));
      }
    }
  }, [plots]);

  const isParksMode = activeTab === 'parks';

  const resubmitTicketIsPark = resubmittingTicket
    ? (resubmittingTicket.facility_category || '').toLowerCase().includes('park') ||
      (resubmittingTicket.title || '').toLowerCase().includes('park') ||
      (resubmittingTicket.title || '').toLowerCase().includes('amphitheater') ||
      (resubmittingTicket.title || '').toLowerCase().includes('plaza')
    : false;
  // Active resubmit only when on the matching tab
  const activeResubmit = resubmittingTicket && resubmittingTicket.category === 'facility'
    ? (isParksMode ? resubmitTicketIsPark : !resubmitTicketIsPark)
    : resubmittingTicket; // non-facility resubmits are always active

  const availableVenues = facilities.filter(f => {
    const cat = (f.category || '').toLowerCase();
    const isCatMatch = isParksMode ? (cat.includes('park') || cat.includes('recreation')) : (!cat.includes('park') && !cat.includes('recreation'));
    const isAvailable = (f.status || 'Available').toLowerCase() === 'available';
    return isCatMatch && isAvailable;
  });

  useEffect(() => {
    if (availableVenues.length > 0) {
      const exists = availableVenues.some(f => f.id === selectedFacilityId);
      if (!exists) {
        setSelectedFacilityId(availableVenues[0].id);
      }
    }
  }, [activeTab, facilities]);

  const selectedFacilityObj = availableVenues.find(f => f.id === selectedFacilityId) || availableVenues[0] || (isParksMode ? {
    id: 3,
    name: 'Camarin Green Urban Recreation Park',
    category: 'Park & Recreation',
    capacity: 500,
    hourly_rate: 0,
    location: 'Camarin Road Sector 3',
    amenities: 'Jogging Trail, Children Playground, Gazebo, Covered Picnic Sheds'
  } : {
    id: 1,
    name: 'Barangay 178 Multi-Purpose Civic Center',
    category: 'Government Facility',
    capacity: 350,
    hourly_rate: 500,
    location: 'Civic Complex, Mindanao Ave.',
    amenities: 'Central Aircon, Full PA Sound System, Stage, Chairs'
  });
  const slotCalculation = calculateSlotFee(reserveForm.start_time, reserveForm.end_time, selectedFacilityObj);
  const bookingHours = slotCalculation.hours;
  const bookingTotalFee = slotCalculation.fee;
  const currentAttendees = parseInt(reserveForm.attendees, 10) || 0;
  const isPaxExceeded = selectedFacilityObj ? currentAttendees > selectedFacilityObj.capacity : false;

  const activeSelectedEquipment = isParksMode ? parksEquipment : facilityEquipment;
  const setActiveSelectedEquipment = isParksMode ? setParksEquipment : setFacilityEquipment;
  const activeEquipmentList = isParksMode ? PARKS_EQUIPMENT_OPTIONS : FACILITY_EQUIPMENT_OPTIONS;

  const toggleEquipment = (item: string) => {
    setActiveSelectedEquipment(prev => {
      const exists = prev.includes(item);
      return exists ? prev.filter(e => e !== item) : [...prev, item];
    });
  };

  const handleStartResubmitFromBooking = (booking: any) => {
    if (!booking) return;
    const refNo = booking.reference_no || booking.ref_no;
    const originalId = booking.id || booking.originalId;

    let sTime = booking.start_time || '08:00 AM';
    let eTime = booking.end_time || '12:00 PM';
    if (!booking.start_time && booking.time && booking.time.includes('-')) {
      const parts = booking.time.split('-').map((s: string) => s.trim());
      if (parts[0]) sTime = parts[0];
      if (parts[1]) eTime = parts[1];
    }

    let equipList: string[] = [];
    if (Array.isArray(booking.special_equipment)) {
      equipList = booking.special_equipment;
    } else if (typeof booking.special_equipment === 'string') {
      equipList = booking.special_equipment.split(',').map((s: string) => s.trim()).filter(Boolean);
    }

    if (isParksMode) {
      setParksEquipment(equipList);
    } else {
      setFacilityEquipment(equipList);
    }

    const isoDate = (booking.event_date || booking.date || '').split('T')[0];

    setReserveForm(prev => ({
      ...prev,
      applicant_name: booking.applicant_name || booking.applicant || prev.applicant_name,
      applicant_phone: booking.applicant_phone || booking.contact || prev.applicant_phone,
      purpose: booking.purpose || booking.details || prev.purpose,
      attendees: booking.attendees ? String(booking.attendees) : prev.attendees,
      event_date: isoDate && !isoDate.includes('N/A') ? isoDate : prev.event_date,
      start_time: sTime,
      end_time: eTime,
    }));

    setResubmittingTicket({
      originalId,
      ref_no: refNo,
      reference_no: refNo,
      category: 'facility',
      facility_category: isParksMode ? 'Park & Recreation' : 'Government Facility',
      ...booking
    });

    setAiConflict(null);
    setViewingRecognizedTicket(null);
  };

  // Immediately clear conflict state when switching venues or tabs
  useEffect(() => {
    setAiConflict(null);
  }, [selectedFacilityId, activeTab]);

  // Real-time automatic double booking check (only runs when NOT resubmitting)
  useEffect(() => {
    if (!selectedFacilityObj || !reserveForm.event_date) return;

    // When user is resubmitting on the MATCHING tab, they already own the slot — skip conflict check
    if (activeResubmit) {
      setAiConflict(null);
      return;
    }

    const category = isParksMode ? 'Park & Recreation' : 'Government Facility';

    checkDoubleBooking(
      selectedFacilityObj.id,
      selectedFacilityObj.name,
      reserveForm.event_date,
      reserveForm.start_time,
      reserveForm.end_time,
      reserveForm.applicant_email || currentUser?.email,
      reserveForm.applicant_name || currentUser?.name,
      undefined,
      category
    ).then((res) => {
      if ((res as any).isOwnSchedule) {
        // Own booking detected — show amber warning, do NOT block with red conflict
        setAiConflict({
          hasConflict: false,
          isOwnSchedule: true,
          aiAnalysis: res.message,
          existingBooking: (res as any).existingBooking,
          alternativeSlots: []
        });
      } else if (res.hasConflict) {
        // Foreign conflict — block submission
        setAiConflict({
          hasConflict: true,
          isOwnSchedule: false,
          aiAnalysis: res.message,
          existingBooking: null,
          alternativeSlots: res.suggestedSlots
        });
      } else {
        setAiConflict(null);
      }
    }).catch(console.error);
  }, [selectedFacilityObj?.id, selectedFacilityObj?.name, isParksMode, reserveForm.event_date, reserveForm.start_time, reserveForm.end_time, reserveForm.applicant_email, reserveForm.applicant_name, activeResubmit]);

  const handleApplyAlternativeSlot = (slot: string) => {
    let newStart = '02:00 PM';
    let newEnd = '06:00 PM';
    const timeMatch = slot.match(/(\d{1,2}:\d{2}\s*(?:AM|PM))\s*-\s*(\d{1,2}:\d{2}\s*(?:AM|PM))/i);
    if (timeMatch) {
      newStart = timeMatch[1];
      newEnd = timeMatch[2];
    }
    const dateMatch = slot.match(/\b\d{4}-\d{2}-\d{2}\b/);
    const newDate = dateMatch ? dateMatch[0] : reserveForm.event_date;

    setReserveForm(prev => ({
      ...prev,
      event_date: newDate,
      start_time: newStart,
      end_time: newEnd,
    }));

    // Clear conflict state immediately so submit button and form are completely unblocked
    setAiConflict(null);
    setAppliedAlternativeSlot(slot);
  };

  const handleFacilityReserve = async (e?: React.FormEvent, overrideSchedule?: { event_date?: string; start_time?: string; end_time?: string }) => {
    if (e) e.preventDefault();
    if (reserveSubmitting) return;
    setReserveError('');

    const activeDate = overrideSchedule?.event_date || reserveForm.event_date;
    const activeStart = overrideSchedule?.start_time || reserveForm.start_time;
    const activeEnd = overrideSchedule?.end_time || reserveForm.end_time;

    if (
      !reserveForm.applicant_name?.trim() ||
      !reserveForm.applicant_email?.trim() ||
      !reserveForm.applicant_phone?.trim() ||
      !reserveForm.purpose?.trim() ||
      !activeDate?.trim() ||
      !activeStart?.trim() ||
      !activeEnd?.trim()
    ) {
      setReserveError('Please fill out all required fields: Applicant Name, Email, Contact Number, Event Purpose, Date, and Time Slots.');
      return;
    }

    if (!currentAttendees || currentAttendees <= 0) {
      setReserveError('Please specify a valid number of expected attendees.');
      return;
    }

    const rawPhone = reserveForm.applicant_phone?.trim() || '';
    const cleanDigits = rawPhone.replace(/\D/g, '');
    const normalizedPhone = cleanDigits.startsWith('639') ? '0' + cleanDigits.slice(2) : cleanDigits;

    if (!/^09\d{9}$/.test(normalizedPhone)) {
      setReserveError('Contact number must be exactly 11 digits and start with 09 (e.g. 09171234567).');
      return;
    }

    if (!overrideSchedule && aiConflict?.hasConflict && !activeResubmit) {
      setReserveError('Cannot submit reservation: ' + (aiConflict.aiAnalysis || 'Schedule slot conflict detected. Please select an alternative slot.'));
      return;
    }

    if (!overrideSchedule && aiConflict?.isOwnSchedule && !activeResubmit) {
      setReserveError('You already booked this date and time. Please click "Book Another Date" to select a different schedule.');
      return;
    }

    if (isPaxExceeded) {
      setReserveError(`Number of attendees (${currentAttendees}) exceeds maximum venue capacity (${selectedFacilityObj?.capacity}).`);
      return;
    }

    // Enforce 3-day-ahead booking constraint (not for resubmissions which already own the slot)
    if (!activeResubmit) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const minDate = new Date(today);
      minDate.setDate(minDate.getDate() + 3);

      const [y, m, d] = activeDate.split('-').map(Number);
      const chosenDate = new Date(y, m - 1, d, 0, 0, 0, 0);
      if (chosenDate < minDate) {
        const minDateStr = minDate.toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' });
        setReserveError(`Bookings must be made at least 3 days in advance. Earliest bookable date is ${minDateStr}.`);
        return;
      }
    }

    // Parks: LGU Activity requires sponsorship proof document
    if (isParksMode && parksActivityType === 'LGU Activity' && !parksProofPhoto) {
      setReserveError('LGU Activity bookings require a sponsorship proof document. Please upload your official LGU letter, request memo, or authorization document.');
      return;
    }

    // Parks: Event Name is required
    if (isParksMode && !parksEventName.trim()) {
      setReserveError('Please provide an Event Name for the park booking.');
      return;
    }

    const slotFeeInfo = calculateSlotFee(activeStart, activeEnd, selectedFacilityObj);
    const durationHours = slotFeeInfo.hours;
    // LGU Activity is always free regardless of configured rates
    const activeFee = (isParksMode && parksActivityType === 'LGU Activity') ? 0 : slotFeeInfo.fee;

    setReserveSubmitting(true);
    try {
      const payload = {
        ...reserveForm,
        event_date: activeDate.trim(),
        start_time: activeStart.trim(),
        end_time: activeEnd.trim(),
        citizen_id: currentUser?.id || undefined,
        citizen_email: currentUser?.email || reserveForm.applicant_email.trim(),
        applicant_name: reserveForm.applicant_name.trim(),
        applicant_email: reserveForm.applicant_email.trim(),
        applicant_phone: normalizedPhone,
        purpose: reserveForm.purpose.trim(),
        facility_id: selectedFacilityObj.id,
        facility_name: selectedFacilityObj.name,
        facility_category: isParksMode ? 'Park & Recreation' : 'Government Facility',
        facility_location: selectedFacilityObj.location,
        hourly_rate: selectedFacilityObj.hourly_rate,
        hours: durationHours,
        fee_amount: activeFee,
        attendees: currentAttendees,
        // Parks-specific Step 2 fields
        ...(isParksMode ? {
          event_name: parksEventName.trim(),
          activity_type: parksActivityType,
          sponsorship_photo_url: parksProofPhoto?.url || null,
        } : {}),
        special_equipment: activeSelectedEquipment,
        ...(activeResubmit ? { resubmitId: resubmittingTicket.originalId, reference_no: resubmittingTicket.ref_no } : {})
      };
      const res = await createReservation(payload);
      if (res.success) {
        setReservationSuccess(res.data || res);
        setResubmittingTicket(null);
        sessionStorage.removeItem('govserve_resubmit_ticket');
        setAiConflict(null);
      } else {
        setReserveError((res as any).message || 'Failed to submit reservation.');
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
      !utilityForm.service_type?.trim()
    ) {
      setUtilityError('Please fill out all required incident fields: Citizen Name, Phone, Location, Incident Type, and Detailed Description.');
      return;
    }

    if (!/^09\d{9}$/.test(utilityForm.citizen_phone.trim())) {
      setUtilityError('Contact number must be exactly 11 digits and start with 09 (e.g. 09171234567).');
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
        citizen_id: currentUser?.id || undefined,
        citizen_email: currentUser?.email || undefined,
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

    if (!/^09\d{9}$/.test(burialForm.contact_phone.trim())) {
      setBurialError('SECTION C: Contact number must be exactly 11 digits and start with 09 (e.g. 09171234567).');
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
        citizen_id: currentUser?.id || undefined,
        citizen_email: currentUser?.email || burialForm.applicant_email.trim(),
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
        // Pass uploaded document URLs for admin viewing
        death_certificate_url: burialForm.death_cert_url || '',
        death_cert_url: burialForm.death_cert_url || '',
        death_cert_name: burialForm.death_cert_name || '',
        valid_id_url: burialForm.valid_id_url || '',
        valid_id_name: burialForm.valid_id_name || '',
      };
      const res = await createBurial(payload);
      if (res.success) {
        setBurialSuccess(res.data || res);
      } else {
        setBurialError((res as any).message || 'Failed to submit application.');
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
              {isParksMode
                ? 'Parks & Recreation Grounds Scheduling'
                : activeTab === 'facility' || activeTab === 'reserve'
                ? 'Government Facility Reservation & Scheduling'
                : activeTab === 'utility'
                ? 'Water & Drainage Incident Desk'
                : activeTab === 'cemetery'
                ? 'Burial & Cemetery Permit Application'
                : 'Public Asset & Equipment Catalog'}
            </h2>
            <Badge variant={isParksMode ? 'success' : activeTab === 'facility' || activeTab === 'reserve' ? 'info' : activeTab === 'utility' ? 'warning' : activeTab === 'cemetery' ? 'purple' : 'info'} size="sm">
              {isParksMode
                ? 'Parks & Recreation'
                : activeTab === 'facility' || activeTab === 'reserve'
                ? 'Government Facilities'
                : activeTab === 'utility'
                ? 'Public Works Desk'
                : activeTab === 'cemetery'
                ? 'Civil Registry & Memorial'
                : 'Asset Inventory'}
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            {isParksMode
              ? 'Schedule community gatherings, outdoor wellness activities, and sports leagues at municipal parks and public plazas.'
              : activeTab === 'facility' || activeTab === 'reserve'
              ? 'Reserve municipal multi-purpose civic centers, sports gymnasiums, and public event halls for official and civic functions.'
              : activeTab === 'utility'
              ? 'Submit hazard reports, pipe leakage alerts, and drainage maintenance requests for rapid municipal crew dispatch.'
              : activeTab === 'cemetery'
              ? 'Apply for public cemetery interment, view available columbarium niches, and submit requirements online.'
              : 'Browse municipal heavy equipment, disaster response vehicles, mobile water pumps, and emergency generators.'}
          </p>
        </div>

        <Button size="sm" variant="outline" onClick={() => navigate('/dashboard')}>
          ← Back to Citizen Dashboard
        </Button>
      </div>

      {/* Reservation View (Government Facility or Parks & Recreation) */}
      {(activeTab === 'facility' || activeTab === 'reserve' || activeTab === 'parks') && (
        <div className="space-y-6 animate-fade-in">
          {reservationSuccess ? (
            <Card className="text-center p-8 border-emerald-200 bg-emerald-50/40">
              <div className="w-14 h-14 bg-emerald-600 text-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-600/30">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-extrabold text-[#0f172a] font-display">
                {isParksMode ? 'Park Schedule Submitted!' : 'Reservation Request Logged!'}
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 mt-2 max-w-md mx-auto">
                Reference Number: <span className="font-bold font-mono text-blue-600">{reservationSuccess.reference_no}</span>. This request is now visible in your tickets ledger and the admin desk.
              </p>
              {(reservationSuccess.activity_type === 'LGU Activity' || reservationSuccess.fee_amount === 0) && (
                <div className="inline-flex items-center gap-1.5 mt-2.5 px-3.5 py-1 rounded-full bg-purple-100 text-purple-900 border border-purple-300 text-xs font-bold">
                  <span>🏛️ Assessed Fee: FREE (₱0.00) — LGU Sponsored (No Treasury Payment Required)</span>
                </div>
              )}
              <div className="pt-4 flex justify-center gap-3">
                <Button size="md" onClick={() => setReservationSuccess(null)}>
                  {isParksMode ? 'Book Another Park Ground' : 'Book Another Facility'}
                </Button>
                <Button size="md" variant="outline" onClick={() => navigate('/my-tickets')}>
                  View in My Tickets
                </Button>
              </div>
            </Card>
          ) : (
            <ParksFacilitiesBookingAssistant
              key={isParksMode ? 'parks-assistant' : 'facility-assistant'}
              mode={isParksMode ? 'parks' : 'facility'}
              userRole="citizen"
              onBookingComplete={(res) => setReservationSuccess(res)}
            />
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
                <Button size="md" variant="outline" onClick={() => navigate('/my-tickets')}>
                  View My Tickets
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
                      placeholder="09171234567"
                      maxLength={11}
                      value={utilityForm.citizen_phone}
                      onChange={(e) => setUtilityForm({ ...utilityForm, citizen_phone: e.target.value.replace(/\D/g, '').slice(0, 11) })}
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
                <Button size="md" variant="outline" onClick={() => navigate('/my-tickets')}>
                  View My Tickets
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
                        placeholder="09171234567"
                        maxLength={11}
                        value={burialForm.contact_phone}
                        onChange={(e) => setBurialForm({ ...burialForm, contact_phone: e.target.value.replace(/\D/g, '').slice(0, 11) })}
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
                      <Badge variant={asset.current_condition === 'Operational' ? 'success' : 'warning'}>
                        {asset.current_condition === 'Operational' ? 'Operational' : 'Not Available'}
                      </Badge>
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
                  {selectedAssetDetail.current_condition === 'Operational' ? 'Operational' : 'Not Available'}
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

      {/* Quick View Modal for Recognized Ticket */}
      <Modal
        isOpen={Boolean(viewingRecognizedTicket)}
        onClose={() => setViewingRecognizedTicket(null)}
        title={`Your Recognized Ticket — ${viewingRecognizedTicket?.reference_no || viewingRecognizedTicket?.ref_no || ''}`}
        description="Official Citizen Ticket Voucher Information."
        maxWidth="md"
      >
        {viewingRecognizedTicket && (
          <div className="space-y-4 text-xs">
            {/* Header Voucher Box */}
            <div className="p-4 bg-gradient-to-r from-emerald-950 via-slate-900 to-slate-900 text-white rounded-xl border border-emerald-500/30 space-y-1">
              <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest block">MUNICIPAL SERVICES — VERIFIED BOOKING</span>
              <h4 className="text-base font-extrabold text-white">{viewingRecognizedTicket.facility_name || viewingRecognizedTicket.title || 'Government Facility'}</h4>
              <p className="text-xs font-mono text-emerald-300">Ticket Tracking No: <strong>{viewingRecognizedTicket.reference_no || viewingRecognizedTicket.ref_no}</strong></p>
              <div className="pt-2 flex items-center gap-2">
                <Badge variant="success">{viewingRecognizedTicket.status || 'Active'}</Badge>
                <span className="text-slate-300 text-[11px]">Existing slot registered under your citizen profile</span>
              </div>
            </div>

            {/* Ticket Info Card */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-slate-800">
              <p className="font-bold text-xs uppercase text-slate-500 tracking-wider">Booking Particulars</p>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div>
                  <span className="text-slate-400 block text-[10px]">Scheduled Date:</span>
                  <span className="font-semibold">{viewingRecognizedTicket.event_date || viewingRecognizedTicket.date || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Time Slot:</span>
                  <span className="font-semibold">{viewingRecognizedTicket.start_time && viewingRecognizedTicket.end_time ? `${viewingRecognizedTicket.start_time} - ${viewingRecognizedTicket.end_time}` : (viewingRecognizedTicket.time || 'N/A')}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Applicant:</span>
                  <span className="font-semibold">{viewingRecognizedTicket.applicant_name || viewingRecognizedTicket.applicant || currentUser?.name}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Purpose:</span>
                  <span className="font-semibold">{viewingRecognizedTicket.purpose || viewingRecognizedTicket.details || 'N/A'}</span>
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="pt-3 flex items-center justify-between border-t border-slate-100 flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => setViewingRecognizedTicket(null)}>
                Close
              </Button>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs"
                  leftIcon={<Edit className="w-3.5 h-3.5" />}
                  onClick={() => {
                    handleStartResubmitFromBooking(viewingRecognizedTicket);
                  }}
                >
                  Re-edit / Resubmit Ticket
                </Button>
                <Button
                  size="sm"
                  variant="primary"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs"
                  leftIcon={<ExternalLink className="w-3.5 h-3.5" />}
                  onClick={() => {
                    const targetRef = viewingRecognizedTicket.reference_no || viewingRecognizedTicket.ref_no;
                    setViewingRecognizedTicket(null);
                    navigate(`/my-tickets?ticket=${encodeURIComponent(targetRef)}`, { state: { openTicketRef: targetRef } });
                  }}
                >
                  Go to My Tickets
                </Button>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Popout Modal for Applied Alternative Slot */}
      <Modal
        isOpen={Boolean(appliedAlternativeSlot)}
        onClose={() => {
          setAppliedAlternativeSlot(null);
          setAiConflict(null);
        }}
        title="Alternative Slot Applied"
        description="Schedule conflict resolved — recommended available window has been selected."
        maxWidth="md"
      >
        {appliedAlternativeSlot && (
          <div className="space-y-4 text-xs">
            <div className="p-4 bg-gradient-to-r from-indigo-950 via-slate-900 to-emerald-950 text-white rounded-xl border border-emerald-500/30 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                  AI Slot Intelligence
                </span>
                <Badge variant="success" className="bg-emerald-500/20 text-emerald-300 border-emerald-400/40 text-[10px] py-0.5 font-bold">
                  ✓ Slot Updated
                </Badge>
              </div>
              <h4 className="text-base font-extrabold text-white">
                {selectedFacilityObj?.name || 'Municipal Facility'}
              </h4>
              <p className="text-xs text-indigo-200">
                Your reservation schedule has been successfully adjusted to the optimal available time window.
              </p>
            </div>

            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5 text-slate-800">
              <p className="font-bold text-xs uppercase text-slate-500 tracking-wider">Applied Reservation Schedule</p>
              <div className="grid grid-cols-2 gap-3 text-[11px]">
                <div className="p-2.5 bg-white rounded-lg border border-slate-200/80">
                  <span className="text-slate-400 block text-[10px] font-medium">Event Date</span>
                  <span className="font-bold text-slate-800">{reserveForm.event_date}</span>
                </div>
                <div className="p-2.5 bg-white rounded-lg border border-emerald-300 bg-emerald-50/40">
                  <span className="text-emerald-700 block text-[10px] font-medium">New Time Window</span>
                  <span className="font-bold text-emerald-800">{reserveForm.start_time} - {reserveForm.end_time}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-emerald-700 pt-1 font-medium">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>The schedule conflict is resolved. Click below to continue and complete your reservation.</span>
              </div>
            </div>

            <div className="pt-3 flex flex-col sm:flex-row items-center justify-between gap-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setAppliedAlternativeSlot(null);
                  setAiConflict(null);
                }}
                className="text-slate-500 hover:text-slate-700 text-xs font-semibold py-1.5 px-3 transition-colors"
              >
                Review Form Details
              </button>
              <Button
                size="sm"
                variant="primary"
                disabled={reserveSubmitting}
                className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 shadow-sm flex items-center justify-center gap-1.5"
                onClick={async (e) => {
                  e.preventDefault();
                  const targetDate = reserveForm.event_date;
                  const targetStart = reserveForm.start_time;
                  const targetEnd = reserveForm.end_time;
                  setAppliedAlternativeSlot(null);
                  setAiConflict(null);
                  await handleFacilityReserve(undefined, {
                    event_date: targetDate,
                    start_time: targetStart,
                    end_time: targetEnd
                  });
                }}
              >
                {reserveSubmitting ? (
                  <>
                    <span className="inline-block w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Continue & Submit Reservation'
                )}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Image Zoom Lightbox */}
      {zoomImage && (
        <div
          className="fixed inset-0 z-[9999] bg-black/90 flex flex-col items-center justify-center p-4 animate-fade-in"
          onClick={() => setZoomImage(null)}
        >
          <div className="relative max-w-5xl w-full max-h-[90vh] flex flex-col items-center" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => setZoomImage(null)}
              className="absolute -top-10 right-0 text-white/70 hover:text-white text-sm font-bold flex items-center gap-1.5 bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-xl transition-colors z-10"
            >
              <X className="w-4 h-4" /> Close
            </button>
            <img
              src={zoomImage.src}
              alt={zoomImage.label}
              className="max-h-[80vh] max-w-full w-auto object-contain rounded-2xl shadow-2xl border border-white/10"
            />
            <p className="text-white/80 text-xs font-bold mt-3 text-center bg-black/40 px-4 py-1.5 rounded-full">
              {zoomImage.label}
            </p>
          </div>
          <p className="text-white/40 text-[11px] mt-4">Click anywhere outside to close</p>
        </div>
      )}
    </div>
  );
}
