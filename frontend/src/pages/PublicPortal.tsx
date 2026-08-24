import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  Search, 
  Building, 
  Trees, 
  Cross, 
  Droplet, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
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
  X
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
  trackUniversalReference 
} from '../lib/api';
import { Facility, CemeteryPlot } from '../types';

export function PublicPortal() {
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<'status' | 'reserve' | 'utility' | 'cemetery'>('status');

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

  const [reserveForm, setReserveForm] = useState({
    applicant_name: '',
    applicant_email: '',
    applicant_phone: '',
    purpose: '',
    event_date: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
    start_time: '08:00 AM',
    end_time: '12:00 PM',
    attendees: '50',
    remarks: '',
  });
  const [aiConflict, setAiConflict] = useState<any>(null);
  const [aiChecking, setAiChecking] = useState(false);
  const [reservationSuccess, setReservationSuccess] = useState<any>(null);

  // 3. Water & Drainage Request State
  const [utilityForm, setUtilityForm] = useState({
    citizen_name: '',
    citizen_phone: '',
    service_type: 'Water Main Leak',
    location: '',
    description: '',
    urgency: 'Urgent',
  });
  const [utilitySuccess, setUtilitySuccess] = useState<any>(null);
  const [utilitySubmitting, setUtilitySubmitting] = useState(false);

  // 4. Cemetery Plot Search & Burial State
  const [cemeteries, setCemeteries] = useState<string[]>([]);
  const [selectedCemetery, setSelectedCemetery] = useState<string>('Barangay 178 Municipal Cemetery');
  const [plots, setPlots] = useState<CemeteryPlot[]>([]);
  const [isVisualPlotModalOpen, setIsVisualPlotModalOpen] = useState(false);
  const [selectedPlot, setSelectedPlot] = useState<CemeteryPlot | null>(null);

  const [burialForm, setBurialForm] = useState({
    deceased_name: '',
    date_of_birth: '1950-01-01',
    date_of_death: new Date().toISOString().split('T')[0],
    burial_date: new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0],
    plot_id: 1,
    contact_person: '',
    contact_phone: '',
  });
  const [burialSuccess, setBurialSuccess] = useState<any>(null);
  const [burialSubmitting, setBurialSubmitting] = useState(false);

  useEffect(() => {
    fetchFacilities().then(setFacilities).catch(console.error);
    fetchCemeteries().then((list) => {
      setCemeteries(list);
      if (list.length > 0) setSelectedCemetery(list[0]);
    }).catch(console.error);

    const initialRef = searchParams.get('ref');
    if (initialRef) {
      setTrackRef(initialRef);
      handleTrack(initialRef);
    }
  }, [searchParams]);

  useEffect(() => {
    fetchCemeteryPlots('all', 'all', selectedCemetery).then((plotList) => {
      setPlots(plotList);
      if (plotList.length > 0 && !selectedPlot) {
        const firstAvail = plotList.find(p => p.status === 'Available') || plotList[0];
        setSelectedPlot(firstAvail);
        setBurialForm(prev => ({ ...prev, plot_id: firstAvail.id }));
      }
    }).catch(console.error);
  }, [selectedCemetery]);

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

  const handleCheckAIConflict = async () => {
    setAiChecking(true);
    const facilityObj = facilities.find(f => f.id === selectedFacilityId);
    try {
      const res = await checkFacilityAI(
        facilityObj?.name || 'Civic Center',
        reserveForm.event_date,
        reserveForm.start_time,
        reserveForm.end_time,
        selectedFacilityId
      );
      setAiConflict(res);
    } catch (e) {
      console.error(e);
    } finally {
      setAiChecking(false);
    }
  };

  const handleReserveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await createReservation({
        ...reserveForm,
        facility_id: selectedFacilityId,
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
    setBurialSubmitting(true);
    try {
      const res = await createBurial(burialForm);
      if (res.success) {
        setBurialSuccess(res.data);
      }
    } catch (e) {
      alert('Failed to file burial application');
    } finally {
      setBurialSubmitting(false);
    }
  };

  const selectedFacilityObj = facilities.find(f => f.id === selectedFacilityId) || facilities[0];

  const filteredFacilitiesInModal = facilities.filter(f => {
    const matchesCategory = facilityCategoryFilter === 'all' || f.category === facilityCategoryFilter;
    const matchesSearch = f.name.toLowerCase().includes(facilitySearchQuery.toLowerCase()) || f.location.toLowerCase().includes(facilitySearchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-canvas flex flex-col selection:bg-blue-600 selection:text-white">
      <PublicNavbar />

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-slate-900 to-indigo-950 text-white py-10 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <Badge variant="info" className="mb-2 bg-blue-500/20 text-blue-300 border-blue-400/30">
            Public Services Portal • No Login Required
          </Badge>
          <h1 className="text-2xl sm:text-4xl font-extrabold font-display">
            Municipal Citizen Services Hub
          </h1>
          <p className="mt-2 text-xs sm:text-sm text-slate-300 max-w-xl mx-auto">
            Online booking for government facilities & parks, emergency water & drainage incident filing, and cemetery burial permits.
          </p>
        </div>
      </div>

      {/* 4-Tab Task Launcher Navigation */}
      <div className="max-w-6xl mx-auto px-4 -mt-6 w-full">
        <div className="bg-white rounded-2xl shadow-medium border border-[#cbd5e1] p-1.5 flex flex-wrap sm:flex-nowrap gap-1">
          {[
            { id: 'status', label: 'Check Status', icon: Search },
            { id: 'reserve', label: 'Reserve Facility / Park', icon: Building },
            { id: 'utility', label: 'Water & Drainage Request', icon: Droplet },
            { id: 'cemetery', label: 'Cemetery & Burial Permit', icon: Cross },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex-1 py-3 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-blue shadow-md'
                    : 'text-[#475569] hover:bg-slate-100 hover:text-[#0f172a]'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div className="max-w-6xl mx-auto px-4 py-8 flex-1 w-full">
        {/* =========================================================================
            TAB 1: CHECK STATUS
           ========================================================================= */}
        {activeTab === 'status' && (
          <div className="space-y-6 animate-fade-in">
            <Card className="border-[#cbd5e1]">
              <CardHeader>
                <CardTitle>Universal Reference Code Tracker</CardTitle>
                <CardDescription>
                  Enter any reservation code (<span className="font-mono text-blue-600 font-bold">RES-2026-...</span>), utility ticket (<span className="font-mono text-cyan-600 font-bold">REQ-2026-...</span>), or burial permit (<span className="font-mono text-purple-600 font-bold">BUR-2026-...</span>).
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
                      placeholder="e.g. RES-2026-101 or REQ-2026-501"
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
                          <Badge variant="purple">{trackedRecord.module}</Badge>
                          <span className="text-sm font-extrabold font-mono text-blue-600">
                            {trackedRecord.data.reference_no || trackedRecord.data.ticket_no || trackedRecord.data.permit_no}
                          </span>
                        </div>
                        <h3 className="text-base font-bold text-slate-900 mt-1">
                          {trackedRecord.data.facility_name || trackedRecord.data.service_type || trackedRecord.data.deceased_name}
                        </h3>
                      </div>
                      <Badge variant={trackedRecord.data.status === 'Approved' || trackedRecord.data.status === 'Resolved' || trackedRecord.data.status === 'Completed' ? 'success' : 'warning'} size="md">
                        {trackedRecord.data.status}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                      <div className="p-3 bg-white rounded-xl border border-slate-200">
                        <span className="text-slate-400 block">Applicant / Citizen:</span>
                        <span className="font-bold text-slate-800">{trackedRecord.data.applicant_name || trackedRecord.data.citizen_name || trackedRecord.data.contact_person}</span>
                      </div>
                      <div className="p-3 bg-white rounded-xl border border-slate-200">
                        <span className="text-slate-400 block">Date / Location:</span>
                        <span className="font-bold text-slate-800">{trackedRecord.data.event_date || trackedRecord.data.burial_date || trackedRecord.data.location}</span>
                      </div>
                      <div className="p-3 bg-white rounded-xl border border-slate-200">
                        <span className="text-slate-400 block">Status Remarks:</span>
                        <span className="font-bold text-blue-700">{trackedRecord.data.remarks || trackedRecord.data.assigned_team || 'Processing normally'}</span>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* =========================================================================
            TAB 2: RESERVE FACILITY OR PARK (With Clean 4-Card Selector + Modal Popup!)
           ========================================================================= */}
        {activeTab === 'reserve' && (
          <div className="space-y-6 animate-fade-in">
            {reservationSuccess ? (
              <Card className="text-center p-8 border-emerald-200 bg-emerald-50/40">
                <div className="w-14 h-14 bg-emerald-600 text-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-600/30">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="text-2xl font-extrabold text-[#0f172a] font-display">Reservation Logged Successfully!</h3>
                <p className="text-xs sm:text-sm text-slate-600 mt-2 max-w-md mx-auto">
                  Save your booking reference number. Our facility administrator is reviewing slot availability.
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
                {/* Left: Clean 4 Featured Facility Cards + See More Modal Popup */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-slate-600 uppercase tracking-wider">Select Facility or Park</p>
                    <span className="text-[11px] text-blue-600 font-semibold">{facilities.length} Venues</span>
                  </div>

                  {/* Exactly 4 Clean Display Cards */}
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
                              <p className="text-[10px] text-slate-500 mt-0.5">Cap: {fac.capacity} • {fac.location}</p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* "See More Facilities & Parks" Modal Button */}
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="w-full text-xs font-bold text-blue-700 border-blue-200 hover:bg-blue-50 py-2.5 rounded-xl shadow-soft flex items-center justify-center gap-1.5"
                    leftIcon={<Grid className="w-4 h-4 text-blue-600" />}
                    onClick={() => setIsSeeMoreFacilitiesOpen(true)}
                  >
                    See More Facilities & Parks ({facilities.length})
                  </Button>

                  {/* Currently Selected Venue Mini Card */}
                  {selectedFacilityObj && (
                    <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-xs">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Currently Selected Venue:</span>
                      <p className="font-bold text-slate-800 mt-0.5">{selectedFacilityObj.name}</p>
                      <p className="text-[10px] text-slate-500">{selectedFacilityObj.location}</p>
                    </div>
                  )}
                </div>

                {/* Right: Reservation Form */}
                <div className="lg:col-span-2">
                  <Card className="border-[#cbd5e1]">
                    <CardHeader>
                      <CardTitle>Reserve Selected Facility</CardTitle>
                      <CardDescription>Enter event organizer details and preferred schedule.</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <form onSubmit={handleReserveSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <Input
                            label="Applicant / Organization Name *"
                            required
                            placeholder="Juan Dela Cruz / Youth Association"
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
                          <Input
                            label="Expected Attendees Count *"
                            type="number"
                            required
                            value={reserveForm.attendees}
                            onChange={(e) => setReserveForm({ ...reserveForm, attendees: e.target.value })}
                          />
                        </div>

                        <Input
                          label="Purpose of Event / Activity *"
                          required
                          placeholder="e.g. Community Health Summit / Sports League Opening"
                          value={reserveForm.purpose}
                          onChange={(e) => setReserveForm({ ...reserveForm, purpose: e.target.value })}
                        />

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
                              className="w-full rounded-xl border border-slate-300 bg-white p-2.5 text-sm"
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
                              className="w-full rounded-xl border border-slate-300 bg-white p-2.5 text-sm"
                            >
                              <option value="12:00 PM">12:00 PM</option>
                              <option value="01:00 PM">01:00 PM</option>
                              <option value="05:00 PM">05:00 PM</option>
                              <option value="06:00 PM">06:00 PM</option>
                              <option value="09:00 PM">09:00 PM</option>
                            </select>
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-[#334155] mb-1.5">Special Equipment / Setup Requests</label>
                          <textarea
                            rows={2}
                            placeholder="Need sound system, 200 monoblock chairs, stage backdrop..."
                            value={reserveForm.remarks}
                            onChange={(e) => setReserveForm({ ...reserveForm, remarks: e.target.value })}
                            className="w-full rounded-xl border border-slate-300 p-2.5 text-sm"
                          />
                        </div>

                        {/* AI Popout Recommendation Card when analyzed */}
                        {aiConflict && (
                          <div className="p-4 bg-gradient-to-br from-indigo-950 to-slate-900 rounded-2xl text-white border border-indigo-500/30 space-y-2 animate-fade-in shadow-medium">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-indigo-300 flex items-center gap-1.5">
                                <Sparkles className="w-4 h-4 text-indigo-400 animate-pulse" />
                                <span>AI Slot Recommendation & Decision Support</span>
                              </span>
                              <Badge variant={aiConflict.hasConflict ? 'destructive' : 'success'}>
                                {aiConflict.hasConflict ? '⚠️ Schedule Conflict Detected' : '✅ Optimal Slot Window'}
                              </Badge>
                            </div>
                            <p className="text-xs text-slate-200 leading-relaxed">{aiConflict.aiAnalysis}</p>
                            {aiConflict.alternativeSlots && (
                              <div className="pt-2 flex flex-wrap gap-2 text-[11px]">
                                <span className="text-slate-400">Recommended Alternative Windows:</span>
                                {aiConflict.alternativeSlots.map((slot: string, idx: number) => (
                                  <span key={idx} className="bg-white/10 text-indigo-200 px-2 py-0.5 rounded border border-white/10 font-mono">
                                    {slot}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Action Buttons: AI Slot Analyzer on LEFT SIDE of Submit Button */}
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
                            AI Slot Analyzer & Conflict Check
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
            TAB 3: WATER & DRAINAGE REQUESTS
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
                    <span className="text-slate-400">AI Priority Score:</span>
                    <span className="font-bold text-slate-800">{utilitySuccess.ai_priority_score} / 100</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Assigned Response Team:</span>
                    <span className="font-bold text-cyan-800">{utilitySuccess.assigned_team}</span>
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
                      <span>Water & Drainage Emergency Response</span>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Reports filed through this portal are analyzed by our <strong>AI Priority Triage</strong> engine to dispatch heavy drainage declogging teams and water line repair crews immediately.
                    </p>
                    <div className="pt-2 border-t border-slate-100 space-y-1.5 text-xs text-slate-500">
                      <p>🚨 <strong>Water Pipe Burst:</strong> Response in &lt; 2 hrs</p>
                      <p>🌧️ <strong>Storm Drainage Clog:</strong> Same-day cleanout</p>
                    </div>
                  </Card>
                </div>

                <div className="lg:col-span-2">
                  <Card className="border-[#cbd5e1]">
                    <CardHeader>
                      <CardTitle>File Water Supply or Drainage Issue</CardTitle>
                      <CardDescription>Provide exact street location and describe the hazard.</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <form onSubmit={handleUtilitySubmit} className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <Input
                            label="Your Name *"
                            required
                            placeholder="Ronaldo Gutierrez"
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
                              className="w-full rounded-xl border border-slate-300 bg-white p-2.5 text-sm"
                            >
                              <option value="Water Main Leak">Water Main Leak / Pipe Burst</option>
                              <option value="Low Water Pressure">Low Water Pressure Issue</option>
                              <option value="Drainage Declogging">Drainage Declogging / Clogged Culvert</option>
                              <option value="Canal Wall Repair">Canal Wall / Revetment Damage</option>
                              <option value="Sewer Overflow">Sewer Overflow & Odor</option>
                            </select>
                          </div>
                          <Input
                            label="Specific Street / Landmark Address *"
                            required
                            placeholder="Mindanao Ave. Corner Camarin St."
                            value={utilityForm.location}
                            onChange={(e) => setUtilityForm({ ...utilityForm, location: e.target.value })}
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-[#334155] mb-1.5">Description of Incident / Hazard *</label>
                          <textarea
                            rows={3}
                            required
                            placeholder="Describe severity, whether road is flooded, or how many households are affected..."
                            value={utilityForm.description}
                            onChange={(e) => setUtilityForm({ ...utilityForm, description: e.target.value })}
                            className="w-full rounded-xl border border-slate-300 p-2.5 text-sm"
                          />
                        </div>

                        <div className="pt-2 flex justify-end">
                          <Button type="submit" size="lg" isLoading={utilitySubmitting} className="px-8 font-bold">
                            Submit Emergency Request
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
            TAB 4: CEMETERY & BURIAL PERMIT (With Transparent Marble Wall Map!)
           ========================================================================= */}
        {activeTab === 'cemetery' && (
          <div className="space-y-6 animate-fade-in">
            {burialSuccess ? (
              <Card className="text-center p-8 border-purple-200 bg-purple-50/40">
                <div className="w-14 h-14 bg-purple-600 text-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-purple-600/30">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="text-2xl font-extrabold text-[#0f172a] font-display">Burial Permit Registered!</h3>
                <p className="text-xs sm:text-sm text-slate-600 mt-2 max-w-md mx-auto">
                  Burial Permit Reference: <span className="font-bold font-mono text-purple-700">{burialSuccess.permit_no}</span>
                </p>
                <div className="my-6 p-4 bg-white rounded-2xl border border-purple-200 max-w-sm mx-auto shadow-soft text-left space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Deceased:</span>
                    <span className="font-bold text-slate-800">{burialSuccess.deceased_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Scheduled Burial Date:</span>
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
                    setBurialForm({
                      deceased_name: '',
                      date_of_birth: '1950-01-01',
                      date_of_death: new Date().toISOString().split('T')[0],
                      burial_date: new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0],
                      plot_id: plots[0]?.id || 1,
                      contact_person: '',
                      contact_phone: '',
                    });
                  }}
                >
                  File Another Burial Record
                </Button>
              </Card>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left: Cemetery & Plot Selector with "Open Visual Map" Button */}
                <div className="space-y-4">
                  {/* Select Municipal Cemetery */}
                  <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-soft space-y-2">
                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">
                      Choose Municipal Cemetery:
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

                  {/* Visual Map Launcher Card */}
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

                  {/* Selected Plot Badge */}
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
                      <p className="text-xs text-slate-400 italic">No plot selected yet.</p>
                    )}
                  </div>
                </div>

                {/* Right: Burial Application Form */}
                <div className="lg:col-span-2">
                  <Card className="border-[#cbd5e1]">
                    <CardHeader className="flex flex-row items-center justify-between">
                      <div>
                        <CardTitle>Burial Permit & Interment Application</CardTitle>
                        <CardDescription>Official municipal cemetery plot allocation and permit request.</CardDescription>
                      </div>
                      <Button
                        size="sm"
                        variant="secondary"
                        leftIcon={<Map className="w-3.5 h-3.5 text-purple-600" />}
                        onClick={() => setIsVisualPlotModalOpen(true)}
                      >
                        Choose on Visual Map
                      </Button>
                    </CardHeader>
                    <CardContent>
                      <form onSubmit={handleBurialSubmit} className="space-y-4">
                        <Input
                          label="Full Name of Deceased *"
                          required
                          placeholder="Severino M. Dela Cruz"
                          value={burialForm.deceased_name}
                          onChange={(e) => setBurialForm({ ...burialForm, deceased_name: e.target.value })}
                        />

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <Input
                            label="Date of Death *"
                            type="date"
                            required
                            value={burialForm.date_of_death}
                            onChange={(e) => setBurialForm({ ...burialForm, date_of_death: e.target.value })}
                          />
                          <Input
                            label="Scheduled Interment / Burial Date *"
                            type="date"
                            required
                            value={burialForm.burial_date}
                            onChange={(e) => setBurialForm({ ...burialForm, burial_date: e.target.value })}
                          />
                        </div>

                        {/* Selected Plot Input */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-semibold text-[#334155] mb-1.5">
                              Allocated Plot Code *
                            </label>
                            <div className="flex gap-2">
                              <input
                                type="text"
                                readOnly
                                value={selectedPlot ? `${selectedPlot.plot_code} (${selectedPlot.section})` : 'Click Choose on Map'}
                                className="w-full rounded-xl border border-slate-300 bg-slate-50 p-2.5 text-xs font-mono font-bold text-purple-900"
                              />
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => setIsVisualPlotModalOpen(true)}
                              >
                                Change
                              </Button>
                            </div>
                          </div>

                          <Input
                            label="Next of Kin / Contact Person *"
                            required
                            placeholder="Maria Dela Cruz (Daughter)"
                            value={burialForm.contact_person}
                            onChange={(e) => setBurialForm({ ...burialForm, contact_person: e.target.value })}
                          />
                        </div>

                        <Input
                          label="Contact Phone Number *"
                          required
                          placeholder="+63 917 222 8891"
                          value={burialForm.contact_phone}
                          onChange={(e) => setBurialForm({ ...burialForm, contact_phone: e.target.value })}
                        />

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
      </div>

      {/* Interactive Visual Plot Map Modal (Transparent Marble Box Overlay) */}
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

      {/* "See More Facilities & Parks" Modal Popup */}
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

          {/* Grid of all facilities */}
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
    </div>
  );
}
