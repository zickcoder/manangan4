import React, { useState, useEffect, useMemo } from 'react';
import { 
  Calendar, 
  Clock, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  Upload, 
  Trees, 
  Building, 
  Filter, 
  ChevronLeft, 
  ChevronRight, 
  Info, 
  FileText, 
  ShieldCheck, 
  Check, 
  X,
  Users,
  Search,
  ArrowRight,
  DollarSign
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { 
  fetchFacilities, 
  fetchReservations, 
  createReservation, 
  checkDoubleBooking,
  calculateSlotFee,
  calculateBookingHours
} from '../../lib/api';
import { compressImage } from '../../lib/imageCompressor';
import { Facility, FacilityReservation } from '../../types';

interface BookingAssistantProps {
  mode?: 'parks' | 'facility' | 'both';
  userRole?: 'citizen' | 'staff' | 'admin';
  onBookingComplete?: (newReservation: any) => void;
  initialFacilityId?: number;
}

export type ActivityType = 'LGU Activity' | 'Sports Activity' | 'Other / Private Event';
export type SlotType = 'Morning Slot' | 'Afternoon Slot' | 'Whole Day Slot';
export type DayFilterType = 'all' | 'weekday' | 'weekend' | 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const OPERATING_DAYS = [
  { key: 'all', label: 'All Operating Days (Mon–Sat)' },
  { key: 'weekday', label: 'Weekdays Only (Mon–Fri)' },
  { key: 'weekend', label: 'Weekend Only (Saturday)' },
  { key: 'mon', label: 'Mon' },
  { key: 'tue', label: 'Tue' },
  { key: 'wed', label: 'Wed' },
  { key: 'thu', label: 'Thu' },
  { key: 'fri', label: 'Fri' },
  { key: 'sat', label: 'Sat' },
];

export function ParksFacilitiesBookingAssistant({
  mode = 'parks',
  userRole = 'citizen',
  onBookingComplete,
  initialFacilityId
}: BookingAssistantProps) {
  // ─── Current User ───
  const userStr = sessionStorage.getItem('govserve_citizen_user') || 
                  sessionStorage.getItem('govserve_staff_user') || 
                  sessionStorage.getItem('govserve_user') || 
                  localStorage.getItem('govserve_citizen_user') || 
                  localStorage.getItem('govserve_user');
  let currentUser: any = null;
  try {
    if (userStr) currentUser = JSON.parse(userStr);
  } catch {}

  // ─── Venues & Reservations State ───
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [reservations, setReservations] = useState<FacilityReservation[]>([]);
  const [selectedFacilityId, setSelectedFacilityId] = useState<number>(initialFacilityId || 0);
  const [loading, setLoading] = useState(true);

  // ─── Step 1: Viewing Filters ───
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth()); // 0-11
  const [dayFilter, setDayFilter] = useState<DayFilterType>('all');

  // ─── Step 2: Event Requirements Intake Form ───
  const [eventName, setEventName] = useState('');
  const [activityType, setActivityType] = useState<ActivityType>('Sports Activity');
  const [attendees, setAttendees] = useState('80');
  const [selectedDate, setSelectedDate] = useState<string>(''); // YYYY-MM-DD
  const [selectedSlot, setSelectedSlot] = useState<SlotType>('Morning Slot');
  const [applicantName, setApplicantName] = useState(currentUser?.name || 'Juan Dela Cruz');
  const [applicantEmail, setApplicantEmail] = useState(currentUser?.email || 'juan.delacruz@citizen.gov.ph');
  const [applicantPhone, setApplicantPhone] = useState(currentUser?.phone || '09171234567');
  const [specialEquipment, setSpecialEquipment] = useState<string[]>([]);

  // ─── Equipment List (admin-managed via localStorage) ───
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
  const getEquipList = (key: string, fallback: string[]) => {
    try {
      const stored = localStorage.getItem(`govserve_equipment_${key}`);
      if (stored) { const p = JSON.parse(stored); if (Array.isArray(p) && p.length > 0) return p; }
    } catch {}
    return fallback;
  };
  const equipmentOptions = mode === 'parks'
    ? getEquipList('parks', DEFAULT_PARKS_EQUIPMENT)
    : getEquipList('facility', DEFAULT_FACILITY_EQUIPMENT);

  const toggleEquipment = (item: string) => {
    setSpecialEquipment(prev =>
      prev.includes(item) ? prev.filter(e => e !== item) : [...prev, item]
    );
  };

  // ─── Step 4: LGU Proof Document Upload ───
  const [proofFile, setProofFile] = useState<{ url: string; name: string } | null>(null);
  const [uploadingProof, setUploadingProof] = useState(false);

  // ─── Step 5: AI Smart Suggestions State ───
  const [aiSuggestion, setAiSuggestion] = useState<{
    text: string;
    suggestedDate?: string;
    suggestedSlot?: SlotType;
  } | null>(null);

  // Submission State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState<any>(null);
  const [submitError, setSubmitError] = useState('');

  // ─── Lightbox State ───
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  // ─── Load Data ───
  const loadData = async () => {
    try {
      setLoading(true);
      const [facList, resList] = await Promise.all([
        fetchFacilities(),
        fetchReservations()
      ]);
      
      const filteredFac = facList.filter((f: any) => {
        if (mode === 'parks') {
          return (f.category || '').toLowerCase().includes('park');
        }
        if (mode === 'facility') {
          return !(f.category || '').toLowerCase().includes('park');
        }
        return true;
      });

      setFacilities(filteredFac);
      setReservations(resList);

      if (filteredFac.length > 0 && !selectedFacilityId) {
        setSelectedFacilityId(filteredFac[0].id);
      }
    } catch (e) {
      console.error('Error loading assistant data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const handleUpdate = () => loadData();
    window.addEventListener('govserve_data_updated', handleUpdate);
    return () => window.removeEventListener('govserve_data_updated', handleUpdate);
  }, [mode]);

  const selectedFacility = useMemo(() => {
    return facilities.find(f => f.id === selectedFacilityId) || facilities[0] || null;
  }, [facilities, selectedFacilityId]);

  // ─── Time Slot Definitions (Strict Step 3 Blocks) ───
  const SLOT_CONFIG: Record<SlotType, { start: string; end: string; hours: number; label: string }> = {
    'Morning Slot': { start: '08:00 AM', end: '12:00 PM', hours: 4, label: '08:00 AM – 12:00 PM (4 Hours)' },
    'Afternoon Slot': { start: '01:00 PM', end: '05:00 PM', hours: 4, label: '01:00 PM – 05:00 PM (4 Hours)' },
    'Whole Day Slot': { start: '08:00 AM', end: '05:00 PM', hours: 8, label: '08:00 AM – 05:00 PM (8 Hours, 1h break)' }
  };

  // ─── Computed Daily Availability for Selected Month ───
  const calendarDays = useMemo(() => {
    const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const facilityRes = reservations.filter(r => 
      !['Rejected', 'Cancelled'].includes(r.status) &&
      (r.facility_id === selectedFacilityId || (selectedFacility && r.facility_name === selectedFacility.name))
    );

    const list = [];
    for (let day = 1; day <= daysInMonth; day++) {
      const dateObj = new Date(selectedYear, selectedMonth, day);
      const dow = dateObj.getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
      const isSunday = dow === 0;
      const isWeekend = dow === 6; // Operating days are Mon-Sat; Saturday is the Weekend slot
      const isWeekday = dow >= 1 && dow <= 5;
      
      const dateStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const isPast = dateObj < today;

      // Filter based on day filter
      let matchesFilter = true;
      if (dayFilter === 'weekday') matchesFilter = isWeekday;
      else if (dayFilter === 'weekend') matchesFilter = isWeekend;
      else if (dayFilter === 'mon') matchesFilter = dow === 1;
      else if (dayFilter === 'tue') matchesFilter = dow === 2;
      else if (dayFilter === 'wed') matchesFilter = dow === 3;
      else if (dayFilter === 'thu') matchesFilter = dow === 4;
      else if (dayFilter === 'fri') matchesFilter = dow === 5;
      else if (dayFilter === 'sat') matchesFilter = dow === 6;

      // Check slot bookings on this date
      const dayBookings = facilityRes.filter(r => {
        if (!r.event_date) return false;
        return r.event_date.split('T')[0] === dateStr;
      });

      let morningBooked = false;
      let afternoonBooked = false;

      dayBookings.forEach(r => {
        const s = (r.start_time || '').toLowerCase();
        const e = (r.end_time || '').toLowerCase();
        if (s.includes('08') || s.includes('8:')) {
          if (e.includes('05') || e.includes('5:')) {
            morningBooked = true;
            afternoonBooked = true;
          } else {
            morningBooked = true;
          }
        }
        if (s.includes('01') || s.includes('1:') || s.includes('13:')) {
          afternoonBooked = true;
        }
      });

      const wholeDayBooked = morningBooked || afternoonBooked;
      const fullyBooked = morningBooked && afternoonBooked;

      list.push({
        day,
        dateStr,
        dateObj,
        dow,
        isSunday,
        isWeekend,
        isWeekday,
        isPast,
        matchesFilter,
        morningBooked,
        afternoonBooked,
        wholeDayBooked,
        fullyBooked,
        bookingCount: dayBookings.length
      });
    }

    return list;
  }, [selectedYear, selectedMonth, dayFilter, reservations, selectedFacilityId, selectedFacility]);

  // ─── Slot Availability for Currently Selected Date ───
  const selectedDayInfo = useMemo(() => {
    if (!selectedDate) return null;
    return calendarDays.find(d => d.dateStr === selectedDate) || null;
  }, [selectedDate, calendarDays]);

  const isCurrentSlotAvailable = useMemo(() => {
    if (!selectedDayInfo) return true;
    if (selectedDayInfo.isSunday) return false; // Sunday non-operating
    if (selectedSlot === 'Morning Slot') return !selectedDayInfo.morningBooked;
    if (selectedSlot === 'Afternoon Slot') return !selectedDayInfo.afternoonBooked;
    if (selectedSlot === 'Whole Day Slot') return !selectedDayInfo.wholeDayBooked;
    return true;
  }, [selectedDayInfo, selectedSlot]);

  // ─── Step 5: AI Smart Slot Suggestions Trigger ───
  useEffect(() => {
    if (!selectedDate || !selectedDayInfo) {
      setAiSuggestion(null);
      return;
    }

    if (selectedDayInfo.isSunday) {
      setAiSuggestion({
        text: '⚠️ Operating days are Monday through Saturday. Sunday is closed for municipal maintenance. We suggest booking Saturday or Monday instead.',
      });
      return;
    }

    if (!isCurrentSlotAvailable) {
      // Suggest alternate slots on the same day if possible
      if (selectedSlot === 'Morning Slot' && !selectedDayInfo.afternoonBooked) {
        setAiSuggestion({
          text: `💡 The Morning Slot is already taken on ${new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}, but the Afternoon Slot (01:00 PM – 05:00 PM) is 100% available!`,
          suggestedSlot: 'Afternoon Slot'
        });
        return;
      }
      if (selectedSlot === 'Afternoon Slot' && !selectedDayInfo.morningBooked) {
        setAiSuggestion({
          text: `💡 The Afternoon Slot is booked, but the Morning Slot (08:00 AM – 12:00 PM) is completely available!`,
          suggestedSlot: 'Morning Slot'
        });
        return;
      }
      
      // Look for the next closest available operating day with this slot open
      const nextOpenDay = calendarDays.find(d => 
        !d.isPast && 
        !d.isSunday && 
        d.dateStr > selectedDate && 
        (selectedSlot === 'Morning Slot' ? !d.morningBooked :
         selectedSlot === 'Afternoon Slot' ? !d.afternoonBooked : !d.wholeDayBooked)
      );

      if (nextOpenDay) {
        const nextDateFormatted = nextOpenDay.dateObj.toLocaleDateString('en-PH', { weekday: 'short', month: 'short', day: 'numeric' });
        setAiSuggestion({
          text: `🤖 Smart Suggestion: ${selectedSlot} is fully occupied on this date. The nearest available opening is ${nextDateFormatted}.`,
          suggestedDate: nextOpenDay.dateStr,
          suggestedSlot: selectedSlot
        });
      } else {
        setAiSuggestion({
          text: `⚠️ No immediate open slots found for ${selectedSlot} in this month. Try switching to the next month or choosing another time slot.`,
        });
      }
    } else {
      setAiSuggestion(null);
    }
  }, [selectedDate, selectedSlot, isCurrentSlotAvailable, selectedDayInfo, calendarDays]);

  // ─── Fee Calculation ───
  const computedFee = useMemo(() => {
    if (activityType === 'LGU Activity') {
      return 0; // Free for LGU
    }
    if (!selectedFacility) return 0;
    const slotInfo = SLOT_CONFIG[selectedSlot];
    const mRate = Number((selectedFacility as any).morning_rate ?? selectedFacility.hourly_rate ?? 500);
    const aRate = Number((selectedFacility as any).afternoon_rate ?? selectedFacility.hourly_rate ?? 500);
    const feeData = calculateSlotFee(slotInfo.start, slotInfo.end, mRate, aRate);
    return feeData.fee;
  }, [activityType, selectedFacility, selectedSlot]);

  // ─── Proof File Handler ───
  const handleProofUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingProof(true);
    try {
      const compressed = await compressImage(file);
      setProofFile({ url: compressed, name: file.name });
    } catch {
      alert('Failed to process proof document. Please try another image file.');
    } finally {
      setUploadingProof(false);
    }
  };

  // ─── Form Submission ───
  const handleSubmitBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');

    if (!selectedFacility) {
      setSubmitError('Please select a park or facility first.');
      return;
    }
    if (!eventName.trim()) {
      setSubmitError('Event Name is mandatory. (e.g., Community Basketball Tournament)');
      return;
    }
    if (!selectedDate) {
      setSubmitError('Please select an event date from the Schedule Availability Matrix.');
      return;
    }
    if (!isCurrentSlotAvailable) {
      setSubmitError('The selected slot is already booked. Please choose an available slot or accept the AI suggestion.');
      return;
    }
    if (activityType === 'LGU Activity' && !proofFile) {
      setSubmitError('LGU Sponsorship bookings REQUIRE a valid sponsorship letter or memo photo proof.');
      return;
    }

    const slotInfo = SLOT_CONFIG[selectedSlot];

    try {
      setIsSubmitting(true);

      const payload = {
        facility_id: selectedFacility.id,
        facility_name: selectedFacility.name,
        facility_location: selectedFacility.location,
        facility_category: mode === 'parks' ? 'Park & Recreation' : (selectedFacility.category || 'Government Facility'),
        applicant_name: applicantName.trim() || currentUser?.name || 'Citizen Applicant',
        applicant_email: applicantEmail.trim() || currentUser?.email || 'citizen@gov.ph',
        applicant_phone: applicantPhone.trim() || currentUser?.phone || '09171234567',
        event_name: eventName.trim(),
        activity_type: activityType,
        purpose: `${eventName.trim()} (${activityType})`,
        event_date: selectedDate,
        start_time: slotInfo.start,
        end_time: slotInfo.end,
        hours: slotInfo.hours,
        attendees: parseInt(attendees, 10) || 50,
        fee_amount: activityType === 'LGU Activity' ? 0 : computedFee,
        hourly_rate: selectedFacility.hourly_rate,
        sponsorship_photo_url: proofFile?.url || null,
        special_equipment: specialEquipment,
        status: activityType === 'LGU Activity' ? 'Pending Review' : 'Pending'
      };

      const res = await createReservation(payload);
      setSubmitSuccess(res || { reference_no: `RES-${Date.now().toString().slice(-6)}` });
      
      if (onBookingComplete) {
        onBookingComplete(res);
      }
    } catch (err: any) {
      setSubmitError(err?.message || 'Failed to submit reservation. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const DOW_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="space-y-6 animate-fade-in font-sans">
      
      {/* ─── SUCCESS MODAL / BANNER ─── */}
      {submitSuccess && (
        <Card className="text-center p-8 border-emerald-200 bg-emerald-50/50 shadow-md">
          <div className="w-14 h-14 bg-emerald-600 text-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-600/30">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h3 className="text-2xl font-black text-slate-900 font-display">
            {activityType === 'LGU Activity' ? '🏛️ LGU Sponsorship Ticket Submitted!' : '🎉 Reservation Successfully Booked!'}
          </h3>
          <p className="text-xs sm:text-sm text-slate-600 mt-2 max-w-md mx-auto">
            Reference Code: <span className="font-mono font-bold text-emerald-700 bg-white px-2 py-0.5 rounded border border-emerald-200">{submitSuccess.reference_no}</span>
          </p>
          <p className="text-xs text-slate-500 mt-1">
            {activityType === 'LGU Activity' 
              ? 'Your ticket is routed to the Admin Desk for proof verification. Status is Pending Admin Approval.'
              : 'Your booking has been registered. You may proceed to payment or view ticket status in your dashboard.'}
          </p>
          {activityType === 'LGU Activity' && (
            <div className="inline-flex items-center gap-1.5 mt-2.5 px-3.5 py-1 rounded-full bg-purple-100 text-purple-900 border border-purple-300 text-xs font-bold">
              <span>🏛️ Assessed Fee: FREE (₱0.00) — LGU Sponsored (No Treasury Payment Required)</span>
            </div>
          )}
          <div className="pt-5 flex justify-center gap-3">
            <Button size="md" onClick={() => {
              setSubmitSuccess(null);
              setEventName('');
              setProofFile(null);
            }}>
              Book Another Event
            </Button>
          </div>
        </Card>
      )}

      {!submitSuccess && (
        <div className="space-y-6">

          {/* ══════════════════════════════════════════════════════════════════════════
              ASSISTANT BANNER & FACILITY SELECTOR
              ══════════════════════════════════════════════════════════════════════════ */}
          <div className={`p-4 sm:p-5 rounded-3xl text-white shadow-lg space-y-4 ${
            mode === 'facility'
              ? 'bg-gradient-to-r from-indigo-700 via-blue-700 to-slate-900'
              : 'bg-gradient-to-r from-emerald-700 via-teal-700 to-slate-900'
          }`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20">
                  <Sparkles className="w-6 h-6 text-amber-300 animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg sm:text-xl font-black font-display tracking-tight">
                      {mode === 'facility' ? 'Government Facility Reservation Assistant' : 'Parks & Recreation Booking Assistant'}
                    </h3>
                    <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${
                      mode === 'facility'
                        ? 'bg-indigo-500/30 border-indigo-400/40 text-indigo-200'
                        : 'bg-emerald-500/30 border-emerald-400/40 text-emerald-200'
                    }`}>
                      AI Assisted
                    </span>
                  </div>
                  <p className="text-xs text-white/80 mt-0.5">
                    {mode === 'facility'
                      ? 'Reserve government facilities, check slot availability, and submit LGU-sponsored or private bookings.'
                      : 'Search schedule availability, check weekday vs weekend slots, and submit LGU-sponsored or private bookings.'}
                  </p>
                </div>
              </div>

              {/* Target Facility Selector */}
              <div className="w-full sm:w-72 bg-white/10 backdrop-blur-md p-2 rounded-2xl border border-white/20">
                <label className={`block text-[10px] font-bold uppercase tracking-wider mb-1 ${
                  mode === 'facility' ? 'text-indigo-200' : 'text-emerald-200'
                }`}>
                  Selected {mode === 'facility' ? 'Facility' : 'Ground'} / Venue
                </label>
                <select
                  value={selectedFacilityId}
                  onChange={(e) => setSelectedFacilityId(parseInt(e.target.value, 10))}
                  className={`w-full bg-slate-900/90 text-white font-bold text-xs rounded-xl px-3 py-2 border border-white/20 focus:outline-none ${
                    mode === 'facility' ? 'focus:border-blue-300' : 'focus:border-amber-300'
                  }`}
                >
                  {facilities.map((fac) => (
                    <option key={fac.id} value={fac.id} className="bg-slate-900 text-white">
                      {fac.name} — Cap: {fac.capacity} Pax
                    </option>
                  ))}
                </select>
                {selectedFacility?.location && (
                  <p className="text-[11px] text-white/90 mt-1.5 flex items-center gap-1">
                    <span>📍</span>
                    <span className="truncate">
                      <span className="font-bold text-white">Location:</span> {selectedFacility.location}
                    </span>
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* ══════════════════════════════════════════════════════════════════════════
              VENUE PHOTO GALLERY (below banner)
              ══════════════════════════════════════════════════════════════════════════ */}
          {selectedFacility && ((selectedFacility as any).image_url || (selectedFacility as any).image_url_2) && (
            <div className={`rounded-3xl border overflow-hidden shadow-sm ${
              mode === 'facility' ? 'border-indigo-100 bg-indigo-50/40' : 'border-emerald-100 bg-emerald-50/40'
            }`}>
              {/* Header strip */}
              <div className={`px-4 py-2.5 flex items-center justify-between border-b ${
                mode === 'facility' ? 'border-indigo-100 bg-indigo-50' : 'border-emerald-100 bg-emerald-50'
              }`}>
                <div className="flex items-center gap-2">
                  <span className="text-sm">🖼️</span>
                  <span className={`text-base font-black ${
                    mode === 'facility' ? 'text-indigo-700' : 'text-emerald-700'
                  }`}>
                    {selectedFacility.location
                      ? <>Location: {selectedFacility.location} <span className="font-normal text-slate-400 text-xs mx-1">—</span> Venue Photos</>
                      : <>Venue Photos</>}
                  </span>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  mode === 'facility' ? 'bg-indigo-100 text-indigo-700' : 'bg-emerald-100 text-emerald-700'
                }`}>
                  Cap: {selectedFacility.capacity} Pax · Click to Enlarge
                </span>
              </div>

              {/* Photo grid */}
              <div className={`grid gap-2 p-3 ${
                (selectedFacility as any).image_url && (selectedFacility as any).image_url_2
                  ? 'grid-cols-2'
                  : 'grid-cols-1'
              }`}>
                {[(selectedFacility as any).image_url, (selectedFacility as any).image_url_2]
                  .filter(Boolean)
                  .map((url: string, idx: number) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setLightboxUrl(url)}
                      className="group relative rounded-2xl overflow-hidden border border-white/60 shadow-sm hover:shadow-md transition-all focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-indigo-400"
                      title={`Photo ${idx + 1} — click to enlarge`}
                    >
                      <img
                        src={url}
                        alt={`${selectedFacility.name} photo ${idx + 1}`}
                        className="w-full h-44 object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                      {/* hover overlay */}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all duration-200 flex items-center justify-center">
                        <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-white/90 text-slate-900 text-[10px] font-black px-3 py-1.5 rounded-full shadow-lg">
                          🔍 View Full Photo
                        </span>
                      </div>
                      {/* photo number badge */}
                      <span className={`absolute top-2 left-2 text-[9px] font-black px-2 py-0.5 rounded-full text-white shadow ${
                        mode === 'facility' ? 'bg-indigo-600/80' : 'bg-emerald-600/80'
                      }`}>
                        Photo {idx + 1}
                      </span>
                    </button>
                  ))
                }
              </div>
            </div>
          )}

          {/* ──────────────────── LIGHTBOX MODAL ──────────────────── */}
          {lightboxUrl && (
            <div
              className="fixed inset-0 z-[9999] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
              onClick={() => setLightboxUrl(null)}
            >
              <div
                className="relative max-w-4xl w-full rounded-3xl overflow-hidden shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <img
                  src={lightboxUrl}
                  alt="Venue full view"
                  className="w-full max-h-[80vh] object-contain bg-black"
                />
                {/* Caption bar */}
                <div className={`px-5 py-3 flex items-center justify-between ${
                  mode === 'facility' ? 'bg-indigo-900' : 'bg-emerald-900'
                }`}>
                  <div>
                    <p className="text-white font-black text-sm">{selectedFacility?.name}</p>
                    <p className="text-white/60 text-[10px]">Capacity: {selectedFacility?.capacity} Pax · Click outside to close</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setLightboxUrl(null)}
                    className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════════════
              STEP 1: SCHEDULE SEARCH & VIEWING FILTERS
              ══════════════════════════════════════════════════════════════════════════ */}
          <div className="p-4 sm:p-5 bg-white rounded-3xl border border-slate-200 shadow-sm space-y-4">
            
            {/* Step 1 Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className={`w-7 h-7 rounded-xl text-white flex items-center justify-center font-black text-xs ${
                  mode === 'facility' ? 'bg-indigo-600' : 'bg-emerald-600'
                }`}>
                  1
                </div>
                <div>
                  <h4 className="text-sm font-extrabold text-slate-900 uppercase tracking-wide">
                    Step 1: Schedule Search & Viewing Filters
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Annual Year Schedule Grid & availability matrix distinguishing Weekday and Weekend slots
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 text-[10px] font-bold">
                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" /> Open Slot
                </span>
                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-700 border border-amber-200">
                  <span className="w-2 h-2 rounded-full bg-amber-500" /> Partial (1 Slot Left)
                </span>
                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 border border-rose-200">
                  <span className="w-2 h-2 rounded-full bg-rose-500" /> Booked
                </span>
              </div>
            </div>

            {/* Filter Controls Bar: 1. Year, 2. Month, 3. Operating Days */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80">
              
              {/* 1. Year Selection */}
              <div className="md:col-span-3 space-y-1">
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider">
                  📅 1. Year Selection
                </label>
                <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200">
                  {[currentYear, currentYear + 1, currentYear + 2].map((yr) => (
                    <button
                      key={yr}
                      type="button"
                      onClick={() => setSelectedYear(yr)}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        selectedYear === yr
                          ? mode === 'facility' ? 'bg-indigo-600 text-white shadow-xs' : 'bg-emerald-600 text-white shadow-xs'
                          : 'text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {yr}
                    </button>
                  ))}
                </div>
              </div>

              {/* 2. Month Selection */}
              <div className="md:col-span-4 space-y-1">
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider">
                  📆 2. Month Selection
                </label>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(parseInt(e.target.value, 10))}
                  className="w-full bg-white text-slate-800 font-bold text-xs rounded-xl px-3 py-2.5 border border-slate-200 focus:outline-none focus:border-emerald-600"
                >
                  {MONTH_NAMES.map((m, idx) => (
                    <option key={idx} value={idx}>
                      {m} {selectedYear}
                    </option>
                  ))}
                </select>
              </div>

              {/* 3. Day Filter (Operating Days Monday through Saturday) */}
              <div className="md:col-span-5 space-y-1">
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider">
                  🗂️ 3. Operating Days Filter (Mon – Sat)
                </label>
                <div className="grid grid-cols-3 gap-1">
                  {[
                    { key: 'all', label: 'All Days (Mon–Sat)' },
                    { key: 'weekday', label: 'Weekdays' },
                    { key: 'weekend', label: 'Weekend (Sat)' }
                  ].map((df) => (
                    <button
                      key={df.key}
                      type="button"
                      onClick={() => setDayFilter(df.key as DayFilterType)}
                      className={`py-2 px-1 text-center rounded-xl text-[10px] font-bold border transition-all ${
                        dayFilter === df.key
                          ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                          : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      {df.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Quick Month Navigator Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {MONTH_NAMES.map((m, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setSelectedMonth(idx)}
                  className={`px-3 py-1 rounded-full text-[10px] font-bold whitespace-nowrap transition-all ${
                    selectedMonth === idx
                      ? mode === 'facility' ? 'bg-indigo-600 text-white shadow-xs' : 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {m.slice(0, 3)}
                </button>
              ))}
            </div>

            {/* Schedule Display: Render Availability Matrix distinguishing Weekday vs Weekend */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <p className="font-extrabold text-slate-800">
                  {MONTH_NAMES[selectedMonth]} {selectedYear} Availability Matrix
                  {selectedFacility && <span className="text-emerald-700 font-semibold ml-1.5">— {selectedFacility.name}</span>}
                </p>
                <span className="text-[11px] text-slate-500">
                  Click any operating day below to pick date and slots
                </span>
              </div>

              {/* Grid of days */}
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
                {calendarDays.filter(d => d.matchesFilter).map((dayInfo) => {
                  const isSelected = selectedDate === dayInfo.dateStr;
                  const isSunday = dayInfo.isSunday;

                  let cardStyle = 'bg-white border-slate-200 text-slate-800 hover:border-emerald-400';
                  if (dayInfo.isPast) {
                    cardStyle = 'bg-slate-50 border-slate-200 text-slate-400 opacity-60 cursor-not-allowed';
                  } else if (isSunday) {
                    cardStyle = 'bg-slate-100/70 border-slate-200 text-slate-400 opacity-50 cursor-not-allowed';
                  } else if (dayInfo.fullyBooked) {
                    cardStyle = 'bg-rose-50 border-rose-200 text-rose-900';
                  } else if (dayInfo.morningBooked || dayInfo.afternoonBooked) {
                    cardStyle = 'bg-amber-50/70 border-amber-300 text-amber-950';
                  } else {
                    cardStyle = 'bg-emerald-50/50 border-emerald-200 text-emerald-950 hover:bg-emerald-50';
                  }

                  if (isSelected) {
                    cardStyle = mode === 'facility'
                      ? 'bg-indigo-600 border-indigo-700 text-white ring-2 ring-indigo-400 shadow-md scale-[1.02]'
                      : 'bg-emerald-600 border-emerald-700 text-white ring-2 ring-emerald-400 shadow-md scale-[1.02]';
                  }

                  return (
                    <button
                      key={dayInfo.dateStr}
                      type="button"
                      disabled={dayInfo.isPast || isSunday}
                      onClick={() => {
                        setSelectedDate(dayInfo.dateStr);
                        // Default to available slot
                        if (dayInfo.morningBooked && !dayInfo.afternoonBooked) {
                          setSelectedSlot('Afternoon Slot');
                        } else if (!dayInfo.morningBooked) {
                          setSelectedSlot('Morning Slot');
                        }
                      }}
                      className={`p-2.5 rounded-2xl border text-left flex flex-col justify-between min-h-[105px] transition-all relative group cursor-pointer ${cardStyle}`}
                    >
                      {/* Top Row: DOW + Weekday/Weekend Tag */}
                      <div className="flex items-center justify-between w-full">
                        <span className={`text-[10px] font-black uppercase tracking-wider ${isSelected ? (mode === 'facility' ? 'text-indigo-100' : 'text-emerald-100') : 'text-slate-500'}`}>
                          {DOW_LABELS[dayInfo.dow]}
                        </span>
                        
                        {/* Distinct Weekday vs Weekend Tag */}
                        {dayInfo.isWeekend ? (
                          <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-md ${
                            isSelected ? 'bg-purple-900 text-purple-200' : 'bg-purple-100 text-purple-800 border border-purple-200'
                          }`}>
                            Weekend
                          </span>
                        ) : !isSunday && (
                          <span className={`text-[8px] font-semibold px-1 py-0.2 rounded ${
                            isSelected ? 'text-emerald-200' : 'text-slate-400'
                          }`}>
                            Weekday
                          </span>
                        )}
                        {isSunday && (
                          <span className="text-[8px] font-bold text-slate-400">Closed</span>
                        )}
                      </div>

                      {/* Day Number */}
                      <div className="my-1">
                        <span className={`text-xl font-black font-display leading-none ${isSelected ? 'text-white' : 'text-slate-900'}`}>
                          {dayInfo.day}
                        </span>
                      </div>

                      {/* Slot Micro Badges (Morning & Afternoon) */}
                      {!dayInfo.isPast && !isSunday ? (
                        <div className="space-y-1 w-full text-[8px] font-bold">
                          <div className={`flex items-center justify-between px-1.5 py-0.5 rounded ${
                            isSelected 
                              ? 'bg-emerald-700/80 text-white' 
                              : dayInfo.morningBooked 
                              ? 'bg-rose-100 text-rose-700' 
                              : 'bg-emerald-100 text-emerald-800'
                          }`}>
                            <span>AM (8-12)</span>
                            <span>{dayInfo.morningBooked ? '✕' : '✓'}</span>
                          </div>
                          <div className={`flex items-center justify-between px-1.5 py-0.5 rounded ${
                            isSelected 
                              ? 'bg-emerald-700/80 text-white' 
                              : dayInfo.afternoonBooked 
                              ? 'bg-rose-100 text-rose-700' 
                              : 'bg-emerald-100 text-emerald-800'
                          }`}>
                            <span>PM (1-5)</span>
                            <span>{dayInfo.afternoonBooked ? '✕' : '✓'}</span>
                          </div>
                        </div>
                      ) : (
                        <p className={`text-[9px] font-medium italic ${isSelected ? 'text-emerald-100' : 'text-slate-400'}`}>
                          {isSunday ? 'Maintenance' : 'Past date'}
                        </p>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Selected Date Indicator Banner */}
              {selectedDate && (
                <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-2xl flex items-center justify-between animate-fade-in text-xs">
                  <div className="flex items-center gap-2 text-emerald-900">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>
                      Selected Schedule: <strong>{new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-PH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</strong>
                      {selectedDayInfo?.isWeekend && <span className="ml-2 font-bold px-2 py-0.5 bg-purple-100 text-purple-800 rounded-full text-[10px]">Weekend Schedule</span>}
                    </span>
                  </div>
                  <span className="text-[11px] font-bold text-emerald-700">✓ Step 1 Complete</span>
                </div>
              )}
            </div>
          </div>

          {/* ══════════════════════════════════════════════════════════════════════════
              STEP 2 & STEP 3 & STEP 4: EVENT INTAKE & PRICING VERIFICATION FORM
              ══════════════════════════════════════════════════════════════════════════ */}
          <form onSubmit={handleSubmitBooking} className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

              {/* Left Column (8 cols): Step 2 Intake Form & Step 3 Time Blocks */}
              <div className="lg:col-span-7 space-y-5">
                <Card className="border-slate-200 shadow-sm p-4 sm:p-5 space-y-4">
                  
                  {/* Step 2 Header */}
                  <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
                    <div className={`w-7 h-7 rounded-xl text-white flex items-center justify-center font-black text-xs ${
                      mode === 'facility' ? 'bg-indigo-600' : 'bg-blue-600'
                    }`}>
                      2
                    </div>
                    <div>
                      <h4 className="text-sm font-extrabold text-slate-900 uppercase tracking-wide">
                        Step 2: Event Requirements Intake Form
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        Mandatory event specifications prior to finalizing time slots
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {/* 1. Event Name */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        1. Event Name * <span className="text-slate-400 font-normal">(e.g., "Community Basketball Tournament")</span>
                      </label>
                      <Input
                        required
                        placeholder="Enter the official name of the event or activity"
                        value={eventName}
                        onChange={(e) => setEventName(e.target.value)}
                        className="font-medium"
                      />
                    </div>

                    {/* 2. Activity Type */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        2. Activity Type * <span className="text-slate-400 font-normal">(Determines sponsorship workflow)</span>
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        {(['LGU Activity', 'Sports Activity', 'Other / Private Event'] as ActivityType[]).map((type) => {
                          const isSelected = activityType === type;
                          return (
                            <button
                              key={type}
                              type="button"
                              onClick={() => setActivityType(type)}
                              className={`p-3 rounded-2xl border text-left transition-all ${
                                isSelected
                                  ? type === 'LGU Activity'
                                    ? 'bg-purple-50 border-purple-500 ring-2 ring-purple-400 text-purple-900 font-bold'
                                    : 'bg-blue-50 border-blue-500 ring-2 ring-blue-400 text-blue-900 font-bold'
                                  : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                              }`}
                            >
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-xs font-extrabold">
                                  {type === 'LGU Activity' ? '🏛️ LGU Activity' : type === 'Sports Activity' ? '🏀 Sports Activity' : '👥 Private Event'}
                                </span>
                                {isSelected && <Check className="w-3.5 h-3.5 text-current" />}
                              </div>
                              <p className="text-[10px] text-slate-500 font-normal">
                                {type === 'LGU Activity' 
                                  ? 'Free with official proof' 
                                  : 'Standard municipal rate'}
                              </p>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* 3. Expected Attendees & Contact Info */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          3. Expected Attendees * <span className="text-slate-400 font-normal">(Pax)</span>
                        </label>
                        <Input
                          type="number"
                          required
                          min="1"
                          max={selectedFacility?.capacity || 1000}
                          value={attendees}
                          onChange={(e) => setAttendees(e.target.value)}
                        />
                        {selectedFacility && (
                          <span className={`text-[10px] mt-0.5 block font-semibold ${
                            mode === 'facility' ? 'text-indigo-600' : 'text-emerald-600'
                          }`}>
                            🏟️ Venue Capacity: {selectedFacility.capacity} Pax (max)
                          </span>
                        )}
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Applicant Name *
                        </label>
                        <Input
                          required
                          value={applicantName}
                          onChange={(e) => setApplicantName(e.target.value)}
                        />
                      </div>
                    </div>

                    {/* Contact Phone & Email */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Contact Phone Number *
                        </label>
                        <Input
                          required
                          value={applicantPhone}
                          onChange={(e) => setApplicantPhone(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Email Address *
                        </label>
                        <Input
                          type="email"
                          required
                          value={applicantEmail}
                          onChange={(e) => setApplicantEmail(e.target.value)}
                        />
                      </div>
                    </div>

                    {/* 4 & 5. Step 3: Strictly Defined Time Slot Blocks */}
                    <div className="pt-2 border-t border-slate-100 space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="block text-xs font-bold text-slate-900 uppercase tracking-wide">
                          Step 3: Available Time Slot Selection
                        </label>
                        <span className="text-[10px] text-slate-500">
                          Strict 4h & 8h booking blocks
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        {(['Morning Slot', 'Afternoon Slot', 'Whole Day Slot'] as SlotType[]).map((slotKey) => {
                          const isSelected = selectedSlot === slotKey;
                          const slotDef = SLOT_CONFIG[slotKey];
                          
                          // Check if blocked on selected day
                          let isBlocked = false;
                          if (selectedDayInfo) {
                            if (slotKey === 'Morning Slot' && selectedDayInfo.morningBooked) isBlocked = true;
                            if (slotKey === 'Afternoon Slot' && selectedDayInfo.afternoonBooked) isBlocked = true;
                            if (slotKey === 'Whole Day Slot' && selectedDayInfo.wholeDayBooked) isBlocked = true;
                          }

                          return (
                            <button
                              key={slotKey}
                              type="button"
                              disabled={isBlocked}
                              onClick={() => setSelectedSlot(slotKey)}
                              className={`p-3 rounded-2xl border text-left transition-all ${
                                isBlocked
                                  ? 'bg-slate-50 border-slate-200 text-slate-400 opacity-60 cursor-not-allowed'
                                  : isSelected
                                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-md ring-2 ring-emerald-400'
                                  : 'bg-white border-slate-200 text-slate-800 hover:border-emerald-300'
                              }`}
                            >
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-xs font-black">
                                  {slotKey === 'Morning Slot' ? '🌅 Morning' : slotKey === 'Afternoon Slot' ? '☀️ Afternoon' : '🏛️ Whole Day'}
                                </span>
                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                                  isSelected ? 'bg-white/20 text-white' : isBlocked ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-800'
                                }`}>
                                  {isBlocked ? 'Booked' : `${slotDef.hours}h`}
                                </span>
                              </div>
                              <p className={`text-[10px] font-mono ${isSelected ? 'text-emerald-100' : 'text-slate-500'}`}>
                                {slotDef.start} – {slotDef.end}
                              </p>
                              {slotKey === 'Whole Day Slot' && (
                                <p className={`text-[8px] mt-0.5 ${isSelected ? 'text-white/80' : 'text-slate-400'}`}>
                                  (12:00 – 01:00 PM Break)
                                </p>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Special Equipment Selection */}
                    <div className="pt-2 border-t border-slate-100 space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="block text-xs font-bold text-slate-900 uppercase tracking-wide">
                          Special Equipment Requirements
                        </label>
                        <span className="text-[10px] text-slate-400">
                          {specialEquipment.length} selected
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500">
                        Select any additional equipment you require for the event (optional).
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                        {equipmentOptions.map((item) => {
                          const isChosen = specialEquipment.includes(item);
                          return (
                            <button
                              key={item}
                              type="button"
                              onClick={() => toggleEquipment(item)}
                              className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-left text-xs transition-all ${
                                isChosen
                                  ? mode === 'facility'
                                    ? 'bg-indigo-50 border-indigo-400 text-indigo-900 font-bold ring-1 ring-indigo-300'
                                    : 'bg-emerald-50 border-emerald-400 text-emerald-900 font-bold ring-1 ring-emerald-300'
                                  : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                              }`}
                            >
                              <span className={`w-4 h-4 rounded flex items-center justify-center shrink-0 border ${
                                isChosen
                                  ? mode === 'facility' ? 'bg-indigo-600 border-indigo-600' : 'bg-emerald-600 border-emerald-600'
                                  : 'border-slate-300 bg-white'
                              }`}>
                                {isChosen && <Check className="w-3 h-3 text-white" />}
                              </span>
                              <span className="leading-tight">{item}</span>
                            </button>
                          );
                        })}
                      </div>
                      {specialEquipment.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {specialEquipment.map((eq) => (
                            <span key={eq} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                              mode === 'facility' ? 'bg-indigo-100 text-indigo-800 border-indigo-200' : 'bg-emerald-100 text-emerald-800 border-emerald-200'
                            }`}>
                              {eq}
                              <button type="button" onClick={() => toggleEquipment(eq)} className="hover:text-red-600 ml-0.5"><X className="w-3 h-3" /></button>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Step 5 AI Smart Slot Suggestions Card */}
                    {aiSuggestion && (
                      <div className="p-3.5 bg-amber-50/90 border border-amber-300 rounded-2xl space-y-2 animate-fade-in">
                        <div className="flex items-start gap-2 text-amber-900 text-xs">
                          <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                          <div className="flex-1">
                            <p className="font-extrabold text-amber-950">AI Slot Assistant Suggestion</p>
                            <p className="text-[11px] text-amber-900 mt-0.5 leading-relaxed">
                              {aiSuggestion.text}
                            </p>
                          </div>
                        </div>

                        {(aiSuggestion.suggestedDate || aiSuggestion.suggestedSlot) && (
                          <div className="flex justify-end pt-1">
                            <Button
                              size="sm"
                              type="button"
                              onClick={() => {
                                if (aiSuggestion.suggestedDate) setSelectedDate(aiSuggestion.suggestedDate);
                                if (aiSuggestion.suggestedSlot) setSelectedSlot(aiSuggestion.suggestedSlot);
                              }}
                              className="text-[10px] font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-xs"
                            >
                              ⚡ Apply AI Suggestion
                            </Button>
                          </div>
                        )}
                      </div>
                    )}

                  </div>
                </Card>
              </div>

              {/* Right Column (5 cols): Step 4 Verification Path & Summary */}
              <div className="lg:col-span-5 space-y-5">
                <Card className="border-slate-200 shadow-sm p-4 sm:p-5 space-y-4 bg-slate-50/60">
                  
                  {/* Step 4 Header */}
                  <div className="flex items-center gap-2.5 border-b border-slate-200 pb-3">
                    <div className="w-7 h-7 rounded-xl bg-purple-600 text-white flex items-center justify-center font-black text-xs">
                      4
                    </div>
                    <div>
                      <h4 className="text-sm font-extrabold text-slate-900 uppercase tracking-wide">
                        Step 4: Booking Path & Pricing Verification
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        {activityType === 'LGU Activity' ? 'Path A: LGU Sponsorship (Free with proof)' : 'Path B: Private / Non-LGU Booking'}
                      </p>
                    </div>
                  </div>

                  {/* Path A: LGU Activity Banner & Photo Upload */}
                  {activityType === 'LGU Activity' ? (
                    <div className="space-y-4">
                      {/* Price Display */}
                      <div className="p-4 bg-purple-100/70 border border-purple-300 rounded-2xl space-y-1">
                        <span className="text-[10px] font-black uppercase text-purple-700 tracking-wider block">
                          🏛️ LGU Sponsorship Fee
                        </span>
                        <div className="flex items-baseline gap-2">
                          <span className="text-3xl font-black text-purple-900 font-mono">₱0.00</span>
                          <span className="text-xs font-bold text-purple-700">Free · Pending Verification</span>
                        </div>
                        <p className="text-[10px] text-purple-800">
                          Approved municipal & civic events are sponsored 100% by the Local Government Unit.
                        </p>
                      </div>

                      {/* Mandatory Document Upload */}
                      <div className="space-y-1.5">
                        <label className="block text-xs font-black text-slate-700">
                          Mandatory Proof Document / Letter * <span className="text-rose-500">(Required)</span>
                        </label>
                        <p className="text-[10px] text-slate-500">
                          Upload official sponsorship letter, barangay endorsement, or LGU request memo.
                        </p>

                        {proofFile ? (
                          <div className="p-3 bg-white border border-emerald-300 rounded-2xl flex items-center justify-between">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                              <div className="truncate">
                                <p className="text-xs font-bold text-slate-800 truncate">{proofFile.name}</p>
                                <span className="text-[9px] text-emerald-600 font-bold">✓ Ready for Admin Review</span>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => setProofFile(null)}
                              className="p-1 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <label className={`flex flex-col items-center justify-center p-5 border-2 border-dashed rounded-2xl text-center cursor-pointer transition-colors bg-white ${
                            uploadingProof ? 'border-purple-400 bg-purple-50/50 cursor-wait' : 'border-slate-300 hover:border-purple-500 hover:bg-purple-50/30'
                          }`}>
                            {uploadingProof ? (
                              <span className="text-xs font-bold text-purple-700">Processing document...</span>
                            ) : (
                              <>
                                <Upload className="w-6 h-6 text-purple-600 mb-1" />
                                <span className="text-xs font-bold text-slate-800">Upload Sponsorship Proof</span>
                                <span className="text-[10px] text-slate-400 mt-0.5">JPG, PNG (Official Letter / Memo)</span>
                              </>
                            )}
                            <input
                              type="file"
                              accept="image/*"
                              disabled={uploadingProof}
                              onChange={handleProofUpload}
                              className="hidden"
                            />
                          </label>
                        )}
                      </div>

                      <div className="p-3 bg-slate-100 rounded-xl text-[10px] text-slate-600 space-y-1">
                        <p className="font-bold text-slate-800">📋 Admin Routing Notice:</p>
                        <p>Uploaded proof and ticket details are routed directly to the Admin Desk. Confirmation is marked <strong>Pending Admin Approval</strong>.</p>
                      </div>
                    </div>
                  ) : (
                    /* Path B: Private / Non-LGU Booking */
                    <div className="space-y-4">
                      {/* Price Display */}
                      <div className="p-4 bg-emerald-100/70 border border-emerald-300 rounded-2xl space-y-1">
                        <span className="text-[10px] font-black uppercase text-emerald-700 tracking-wider block">
                          Municipal Pre-Configured Rate
                        </span>
                        <div className="flex items-baseline gap-2">
                          <span className="text-3xl font-black text-emerald-900 font-mono">
                            ₱{computedFee.toLocaleString()}.00
                          </span>
                          <span className="text-xs font-bold text-emerald-700">
                            ({SLOT_CONFIG[selectedSlot].hours} Hours · {selectedSlot})
                          </span>
                        </div>
                        <p className="text-[10px] text-emerald-800">
                          Automatically computed based on slot duration. No document upload required.
                        </p>
                      </div>

                      <div className="p-3 bg-white border border-slate-200 rounded-2xl text-[10px] text-slate-600 space-y-1.5">
                        <div className="flex justify-between font-bold text-slate-700">
                          <span>Venue Hourly Base:</span>
                          <span>₱{selectedFacility?.hourly_rate || 500}/hr</span>
                        </div>
                        <div className="flex justify-between font-bold text-slate-700">
                          <span>Slot Duration:</span>
                          <span>{SLOT_CONFIG[selectedSlot].hours} Hours</span>
                        </div>
                        <div className="flex justify-between font-extrabold text-emerald-800 pt-1 border-t border-slate-100 text-xs">
                          <span>Total Payable:</span>
                          <span>₱{computedFee.toLocaleString()}.00</span>
                        </div>
                      </div>

                      <p className="text-[10px] text-slate-500">
                        ⚡ Proceeds directly to confirmation and ticket issuance. Document upload step skipped.
                      </p>
                    </div>
                  )}

                  {/* Submission Error Banner */}
                  {submitError && (
                    <div className="p-3 bg-rose-50 border border-rose-300 rounded-xl text-xs font-bold text-rose-800 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>{submitError}</span>
                    </div>
                  )}

                  {/* Submit Button */}
                  <Button
                    type="submit"
                    size="lg"
                    disabled={isSubmitting || !selectedDate || !isCurrentSlotAvailable}
                    className={`w-full font-black text-sm shadow-md transition-all ${
                      activityType === 'LGU Activity'
                        ? 'bg-purple-600 hover:bg-purple-700 text-white'
                        : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    }`}
                  >
                    {isSubmitting
                      ? 'Submitting Booking Request...'
                      : activityType === 'LGU Activity'
                      ? '🏛️ Submit LGU Ticket for Admin Approval'
                      : '✓ Confirm & Finalize Booking'}
                  </Button>
                </Card>
              </div>

            </div>
          </form>

        </div>
      )}

    </div>
  );
}
