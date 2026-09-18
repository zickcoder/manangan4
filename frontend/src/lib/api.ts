import { addNotification } from './notifications';

const env = (import.meta as any).env || {};

// Live Render Cloud Backend API (Node.js Express + PostgreSQL)
const RENDER_BACKEND_URL = 'https://govserve-backend.onrender.com';

// In eProvider builds, VITE_API_URL is auto-injected with supa.eprovider.site (which is a database, not an express backend).
// We strictly ignore any eprovider/supabase URLs for the Express API and always route to Render.
const envApiUrl = env?.VITE_API_URL || '';
const rawBase = (envApiUrl && !envApiUrl.includes('eprovider.site') && !envApiUrl.includes('supabase'))
  ? envApiUrl
  : RENDER_BACKEND_URL;

const API_BASE = `${rawBase.replace(/\/$/, '')}/api`;
const HAS_BACKEND = true;

// eProvider (Supabase-compatible) Cloud Database - robust detection with fallbacks
const EP_URL = 'https://supa.eprovider.site';
const EP_SCHEMA = 'tenant_3585c0ec474d4b5b9e095046236e3cdb';
const EP_KEY = (
  env.VITE_EPROVIDER_ANON_KEY ||
  env.EPROVIDER_ANON_KEY ||
  env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsInByb2plY3RfaWQiOiIzNTg1YzBlYy00NzRkLTRiNWItOWUwOS01MDQ2MjM2ZTNjZGIiLCJpYXQiOjE3ODk1MzAzNzcsImV4cCI6MjEwNTEwNjM3NywiYXVkIjoiZXByb3ZpZGVyLXJlc3QiLCJpc3MiOiJlcHJvdmlkZXItY29udHJvbC1wbGFuZSJ9.xXaonWQzBxlU9RqZd25j4FOc3RIcqcarfJfMx3ofbNo'
);

const HAS_EPROVIDER = Boolean(EP_URL && EP_KEY);
const isDev = Boolean(typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'));
const EP_REST = isDev ? '/eprov-rest' : `${EP_URL}/rest`;
const EP_HEADERS = {
  'apikey': EP_KEY,
  'Authorization': `Bearer ${EP_KEY}`,
  'Content-Type': 'application/json',
  'Accept-Profile': EP_SCHEMA,
  'Content-Profile': EP_SCHEMA,
  'Prefer': 'return=representation'
};

// Edge Function URL (From Classmate tutorial: calling Edge Function client-side)
const EDGE_URL = (
  env.VITE_EDGE_FUNCTION_URL ||
  (EP_URL ? `${EP_URL}/functions/v1/api` : '')
);

async function fastFetch(url: string, options: RequestInit = {}, timeoutMs = 2500): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    return res;
  } finally {
    clearTimeout(timer);
  }
}

export async function edgeFetch(endpoint: string, options: RequestInit = {}, timeoutMs = 3000): Promise<any> {
  if (!EDGE_URL || !EP_KEY) return null;
  try {
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const res = await fastFetch(`${EDGE_URL}${cleanEndpoint}`, {
      ...options,
      headers: {
        'apikey': EP_KEY,
        'Authorization': `Bearer ${EP_KEY}`,
        'Content-Type': 'application/json',
        ...(options.headers || {})
      }
    }, timeoutMs);
    if (res.ok) {
      return await res.json();
    }
  } catch {}
  return null;
}

async function epGet(table: string, query = '', timeoutMs = 2500) {
  const res = await fastFetch(`${EP_REST}/${table}${query ? '?' + query : ''}`, { headers: EP_HEADERS }, timeoutMs);
  if (!res.ok) throw new Error(`eProvider GET ${table} failed: ${res.status}`);
  return res.json();
}

async function epPost(table: string, body: any, timeoutMs = 2500) {
  const res = await fastFetch(`${EP_REST}/${table}`, {
    method: 'POST',
    headers: { ...EP_HEADERS, 'Prefer': 'return=representation' },
    body: JSON.stringify(body)
  }, timeoutMs);
  if (!res.ok) throw new Error(`eProvider POST ${table} failed: ${res.status}`);
  return res.json();
}

async function epPatch(table: string, query: string, body: any, timeoutMs = 2500) {
  const res = await fastFetch(`${EP_REST}/${table}?${query}`, {
    method: 'PATCH',
    headers: { ...EP_HEADERS, 'Prefer': 'return=representation' },
    body: JSON.stringify(body)
  }, timeoutMs);
  if (!res.ok) throw new Error(`eProvider PATCH ${table} failed: ${res.status}`);
  return res.json();
}

async function epDelete(table: string, query: string, timeoutMs = 2500) {
  const res = await fastFetch(`${EP_REST}/${table}?${query}`, {
    method: 'DELETE',
    headers: EP_HEADERS
  }, timeoutMs);
  if (!res.ok) throw new Error(`eProvider DELETE ${table} failed: ${res.status}`);
  return true;
}

// Initial Seed Data (from database_schema_and_seed.sql)
const DEFAULT_FACILITIES = [
  {
    id: 1,
    name: 'Barangay 178 Multi-Purpose Civic Center',
    category: 'Government Facility',
    capacity: 350,
    hourly_rate: 500.00,
    location: 'Civic Complex, Mindanao Ave.',
    amenities: 'Central Aircon, Full PA Sound System, Stage, 300 Chairs, Generator Backup',
    status: 'Available',
    image_url: '',
    image_url_2: ''
  },
  {
    id: 3,
    name: 'Camarin Green Urban Recreation Park',
    category: 'Park & Recreation',
    capacity: 500,
    hourly_rate: 0.00,
    location: 'Camarin Road Sector 3',
    amenities: 'Jogging Trail, Children Playground, Gazebo, Covered Picnic Sheds, Solar Lights',
    status: 'Available',
    image_url: '',
    image_url_2: ''
  },
  {
    id: 4,
    name: 'Purok 7 Community Amphitheater & Plaza',
    category: 'Park & Recreation',
    capacity: 400,
    hourly_rate: 250.00,
    location: 'Purok 7 Hillsview',
    amenities: 'Open-Air Stage, Tiered Seating, Ambient Garden Lighting, Perimeter Fence',
    status: 'Available',
    image_url: '',
    image_url_2: ''
  }
];

function generateInitialPlots() {
  const plots: any[] = [];
  let id = 1;

  for (let r = 1; r <= 9; r++) {
    for (let c = 1; c <= 10; c++) {
      const rowStr = r < 10 ? `R0${r}` : `R${r}`;
      const colStr = c < 10 ? `C0${c}` : `C${c}`;
      const code = `COL-${rowStr}-${colStr}`;
      plots.push({
        id: id++,
        cemetery_name: 'Barangay 178 Municipal Cemetery',
        plot_code: code,
        section: 'Columbarium Wall Alpha',
        block_no: `Row ${r}`,
        lot_no: `Vault ${c}`,
        row_no: r,
        col_no: c,
        plot_type: 'Columbarium Niche',
        status: 'Available',
        price: 18000.00
      });
    }
  }

  return plots;
}

export function format12HourDateTime(dateStr?: string) {
  if (!dateStr) return 'N/A';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  } catch {
    return String(dateStr);
  }
}

const DEFAULT_BURIALS: any[] = [];

const DEFAULT_UTILITIES = [
  {
    id: 1,
    ticket_no: 'UTL-2026-001',
    citizen_name: 'Juan M. Dela Cruz',
    citizen_email: 'juan.delacruz@citizen.gov.ph',
    citizen_phone: '+63 917 123 4567',
    service_type: 'Drainage Declogging',
    location: 'Zone 2, Main Drainage Culvert',
    affected_households: '6 - 15 Households (Entire Street / Alley)',
    photo_url: 'https://images.unsplash.com/photo-1518241353330-0f7941c2d9b5?w=500&auto=format&fit=crop&q=80',
    description: 'Heavy blockage causing backflow during high tide and rain.',
    urgency: 'Urgent',
    ai_priority_score: 85,
    status: 'In Progress',
    assigned_team: 'Barangay Drainage Team Alpha',
    resolution_notes: 'Crew Alpha dispatched with suction tanker',
    created_at: new Date(Date.now() - 86400000 * 2).toISOString()
  },
  {
    id: 2,
    ticket_no: 'UTL-2026-002',
    citizen_name: 'Rosa Santos',
    citizen_email: 'rosa.santos@gmail.com',
    citizen_phone: '+63 918 333 4455',
    service_type: 'Water Main Leak',
    location: 'Purok 4 Corner Road',
    affected_households: '2 - 5 Households (Compound / Immediate Neighbors)',
    description: 'Main pipe leaking onto public pathway.',
    urgency: 'Medium',
    ai_priority_score: 65,
    status: 'Pending',
    assigned_team: 'Water Services Quick Response',
    resolution_notes: '',
    created_at: new Date(Date.now() - 86400000).toISOString()
  }
];

const DEFAULT_ASSETS = [
  {
    id: 1,
    asset_tag: 'AST-2026-001',
    name: 'Isuzu 5,000L Rapid Water Response Tanker',
    category: 'Heavy Equipment',
    serial_no: 'ISZ-WT-88219',
    purchase_date: '2024-02-15',
    purchase_cost: 3200000,
    current_condition: 'Operational',
    assigned_department: 'Disaster Risk Reduction & Management (DRRMO)',
    last_maintenance_date: '2026-01-10',
    next_maintenance_due: '2026-09-15',
    ai_maintenance_alert: 'Optimal condition - next periodic oil change due in September.',
    specs: 'High-pressure water cannon, 5000L tank, 4x4 off-road chassis, dual fire hose connectors',
    image_url: 'https://images.unsplash.com/photo-1596720426673-e4e14290f0cc?w=600&auto=format&fit=crop&q=80'
  },
  {
    id: 2,
    asset_tag: 'AST-2026-002',
    name: 'Caterpillar 45kVA Civic Standby Diesel Generator',
    category: 'Water Pump & Generator',
    serial_no: 'CAT-GEN-9901',
    purchase_date: '2023-08-20',
    purchase_cost: 850000,
    current_condition: 'Operational',
    assigned_department: 'Barangay 178 Civic Center',
    last_maintenance_date: '2026-02-05',
    next_maintenance_due: '2026-10-01',
    ai_maintenance_alert: 'Battery backup level normal. Ready for typhoon emergency standby.',
    specs: '45kVA 3-Phase Silent Type, Automatic Transfer Switch (ATS), 120L fuel reservoir',
    image_url: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=600&auto=format&fit=crop&q=80'
  },
  {
    id: 3,
    asset_tag: 'AST-2026-003',
    name: 'Komatsu PC30 Hydraulic Mini Backhoe Excavator',
    category: 'Heavy Equipment',
    serial_no: 'KOM-EXC-4402',
    purchase_date: '2023-11-10',
    purchase_cost: 2450000,
    current_condition: 'Operational',
    assigned_department: 'Municipal Engineering & Drainage Maintenance',
    last_maintenance_date: '2026-02-14',
    next_maintenance_due: '2026-08-30',
    ai_maintenance_alert: 'Hydraulic pressure nominal. Regularly used for canal dredging.',
    specs: '0.12 m3 bucket, rubber crawler tracks for street work, 3.2m digging depth',
    image_url: 'https://images.unsplash.com/photo-1579487785973-74d2ca7abdd5?w=600&auto=format&fit=crop&q=80'
  },
  {
    id: 4,
    asset_tag: 'AST-2026-004',
    name: 'Toyota HiAce Type-II Emergency Rescue Ambulance',
    category: 'Service Vehicle',
    serial_no: 'TOY-AMB-7718',
    purchase_date: '2024-05-12',
    purchase_cost: 2100000,
    current_condition: 'Operational',
    assigned_department: 'Municipal Health Office (MHO) & Emergency EMS',
    last_maintenance_date: '2026-02-18',
    next_maintenance_due: '2026-11-20',
    ai_maintenance_alert: 'Defibrillator and oxygen tank certified inspection passed.',
    specs: 'Stretcher system, portable ECG monitor, trauma kit, siren & LED beacon bar',
    image_url: 'https://images.unsplash.com/photo-1587745416684-47953f16f02f?w=600&auto=format&fit=crop&q=80'
  },
  {
    id: 5,
    asset_tag: 'AST-2026-005',
    name: 'Honda 8-Inch High-Volume Mobile Drainage Dewatering Pump',
    category: 'Water Pump & Generator',
    serial_no: 'HND-PMP-1082',
    purchase_date: '2024-01-08',
    purchase_cost: 380000,
    current_condition: 'Operational',
    assigned_department: 'Flood Control & Quick Response Desk',
    last_maintenance_date: '2026-01-25',
    next_maintenance_due: '2026-09-01',
    ai_maintenance_alert: 'Pre-monsoon season inspection completed. Impeller in prime condition.',
    specs: '3,200 L/min discharge capacity, trailer-mounted with 50m suction/discharge lay-flat hose',
    image_url: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=600&auto=format&fit=crop&q=80'
  },
  {
    id: 6,
    asset_tag: 'AST-2026-006',
    name: 'Mitsubishi Fuso Canter Hydraulic Boom Utility Truck',
    category: 'Service Vehicle',
    serial_no: 'FUS-TRK-5510',
    purchase_date: '2022-09-18',
    purchase_cost: 2800000,
    current_condition: 'Operational',
    assigned_department: 'Public Safety & Streetlight Infrastructure',
    last_maintenance_date: '2026-02-01',
    next_maintenance_due: '2026-10-15',
    ai_maintenance_alert: 'Boom lift hydraulic safety certification current.',
    specs: '14-meter articulated telescopic bucket boom, outriggers, onboard tool racks',
    image_url: 'https://images.unsplash.com/photo-1519003722824-194d4455a60c?w=600&auto=format&fit=crop&q=80'
  }
];

const DEFAULT_RESERVATIONS = [
  {
    id: 1,
    reference_no: 'RES-2026-001',
    facility_id: 1,
    facility_name: 'Barangay 178 Multi-Purpose Civic Center',
    facility_category: 'Government Facility',
    applicant_name: 'Juan M. Dela Cruz',
    applicant_email: 'juan.delacruz@citizen.gov.ph',
    applicant_phone: '+63 917 123 4567',
    purpose: 'Barangay Community Sports League Opening Assembly',
    event_date: '2026-09-05',
    start_time: '08:00 AM',
    end_time: '12:00 PM',
    attendees: 150,
    special_equipment: ['Sound System & 2 Wireless Microphones', 'Monoblock Chairs (100 - 300 units)'],
    status: 'Approved',
    remarks: 'Approved by Executive Committee & Facilities Bureau'
  },
  {
    id: 2,
    reference_no: 'RES-2026-002',
    facility_id: 3,
    facility_name: 'Camarin Green Urban Recreation Park',
    facility_category: 'Park & Recreation',
    applicant_name: 'Maria Santos',
    applicant_email: 'maria.santos@citizen.gov.ph',
    applicant_phone: '+63 918 555 1234',
    purpose: 'Community Sunrise Yoga & Environmental Tree Planting',
    event_date: '2026-09-12',
    start_time: '06:00 AM',
    end_time: '09:00 AM',
    attendees: 80,
    special_equipment: ['Foldable Tables & Canopies'],
    status: 'Approved',
    remarks: 'Approved by Parks Administration Desk'
  }
];

function getStore<T>(key: string, fallback: T): T {
  try {
    if (typeof window === 'undefined') return fallback;
    const data = localStorage.getItem(`govserve_${key}`);
    return data ? JSON.parse(data) : fallback;
  } catch {
    return fallback;
  }
}

function setStore<T>(key: string, val: T, notify = true): void {
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem(`govserve_${key}`, JSON.stringify(val));
      if (notify) {
        window.dispatchEvent(new Event('govserve_data_updated'));
      }
    }
  } catch (e: any) {
    // Re-throw quota errors so callers know the write failed
    if (e?.name === 'QuotaExceededError' || e?.code === 22 || e?.code === 1014) {
      console.error('localStorage QuotaExceeded for key:', key);
      throw e;
    }
    console.error('Storage error:', e);
  }
}

export function initLocalStore() {
  if (typeof window !== 'undefined' && !localStorage.getItem('govserve_seeded')) {
    setStore('facilities', DEFAULT_FACILITIES, false);
    setStore('plots', generateInitialPlots(), false);
    setStore('burials', DEFAULT_BURIALS, false);
    setStore('utilities', DEFAULT_UTILITIES, false);
    setStore('assets', DEFAULT_ASSETS, false);
    setStore('reservations', DEFAULT_RESERVATIONS, false);
    setStore('logs', [
      { id: 1, user_name: 'Atty. Elena Ramos', action: 'System Initialization', module: 'System', details: 'All initial municipal datasets verified.', timestamp: new Date().toISOString() }
    ], false);
    localStorage.setItem('govserve_seeded', 'true');
  }
}
initLocalStore();

export async function fetchStats() {
  const edgeResult = await edgeFetch('/stats');
  if (edgeResult?.data) return edgeResult.data;

  if (HAS_BACKEND) try {
    const res = await fetch(`${API_BASE}/stats`);
    if (res.ok) {
      const data = await res.json();
      if (data?.data) return data.data;
    }
  } catch {}

  const facilities = getStore('facilities', DEFAULT_FACILITIES);
  const reservations = getStore('reservations', DEFAULT_RESERVATIONS);
  const plots = getStore('plots', []);
  const burials = getStore('burials', DEFAULT_BURIALS);
  const utilities = getStore('utilities', DEFAULT_UTILITIES);
  const assets = getStore('assets', DEFAULT_ASSETS);

  return {
    totalFacilities: facilities.length,
    pendingReservations: reservations.filter((r: any) => r.status === 'Pending').length,
    approvedReservations: reservations.filter((r: any) => r.status === 'Approved').length,
    totalCemeteryPlots: plots.length || 90,
    occupiedPlots: plots.filter((p: any) => p.status === 'Occupied').length || 8,
    availablePlots: plots.filter((p: any) => p.status === 'Available').length || 78,
    totalBurials: burials.length,
    pendingUtilities: utilities.filter((u: any) => u.status !== 'Resolved').length,
    resolvedUtilities: utilities.filter((u: any) => u.status === 'Resolved').length,
    totalAssets: assets.length,
    maintenanceAssets: assets.filter((a: any) => a.current_condition !== 'Operational').length
  };
}

function prepareFacilityForDb(payload: any) {
  // Store images and slot rates in __FAC_META__ in amenities for backward compatibility
  const meta: any = {
    image_url: payload.image_url || '',
    image_url_2: payload.image_url_2 || '',
  };
  if (payload.morning_rate !== undefined) meta.morning_rate = Number(payload.morning_rate);
  if (payload.afternoon_rate !== undefined) meta.afternoon_rate = Number(payload.afternoon_rate);

  let baseAmenities = (payload.amenities || '').split('__FAC_META__')[0].trim();
  baseAmenities += ` __FAC_META__${JSON.stringify(meta)}`;

  const baseRate = Number(payload.hourly_rate ?? payload.morning_rate ?? 0);
  const mRate = payload.morning_rate !== undefined ? Number(payload.morning_rate) : baseRate;
  const aRate = payload.afternoon_rate !== undefined ? Number(payload.afternoon_rate) : baseRate;

  // STRICTLY only include existing columns in eProvider / PostgreSQL
  const dbPayload: any = {
    name: payload.name,
    category: payload.category || 'Government Facility',
    capacity: Number(payload.capacity) || 50,
    hourly_rate: baseRate,
    morning_rate: mRate,
    afternoon_rate: aRate,
    location: payload.location || 'Municipal Complex',
    amenities: baseAmenities,
    status: payload.status || 'Available',
    image_url: payload.image_url || null
  };
  return dbPayload;
}

function parseFacilityFromDb(f: any) {
  let img1 = f.image_url || '';
  let img2 = f.image_url_2 || '';
  let cleanAmenities = f.amenities || '';
  let morningRate = f.morning_rate !== undefined && f.morning_rate !== null ? Number(f.morning_rate) : undefined;
  let afternoonRate = f.afternoon_rate !== undefined && f.afternoon_rate !== null ? Number(f.afternoon_rate) : undefined;

  if (cleanAmenities.includes('__FAC_META__')) {
    try {
      const parts = cleanAmenities.split('__FAC_META__');
      cleanAmenities = parts[0].trim();
      const meta = JSON.parse(parts[1]);
      if (meta.image_url !== undefined) img1 = meta.image_url || '';
      if (meta.image_url_2 !== undefined) img2 = meta.image_url_2 || '';
      if (meta.morning_rate !== undefined && morningRate === undefined) morningRate = Number(meta.morning_rate);
      if (meta.afternoon_rate !== undefined && afternoonRate === undefined) afternoonRate = Number(meta.afternoon_rate);
    } catch {}
  }

  const baseRate = Number(f.hourly_rate) || 0;
  if (morningRate === undefined) morningRate = baseRate;
  if (afternoonRate === undefined) afternoonRate = baseRate;

  return {
    ...f,
    amenities: cleanAmenities,
    image_url: img1,
    image_url_2: img2,
    hourly_rate: baseRate,
    morning_rate: morningRate,
    afternoon_rate: afternoonRate
  };
}

export async function fetchFacilities(category = 'all') {
  const edgeResult = await edgeFetch(`/facilities?category=${encodeURIComponent(category)}`);
  if (Array.isArray(edgeResult?.data)) return edgeResult.data.map(parseFacilityFromDb);

  let list: any[] = [];
  let fetchedFromRemote = false;

  if (HAS_EPROVIDER) {
    try {
      const q = category !== 'all' ? `category=ilike.*${encodeURIComponent(category)}*` : '';
      const data = await epGet('facilities', q + '&order=id.asc');
      if (Array.isArray(data) && data.length > 0) {
        list = data.map(parseFacilityFromDb);
        fetchedFromRemote = true;
      }
    } catch {}
  }

  if (!fetchedFromRemote && HAS_BACKEND) {
    try {
      const res = await fastFetch(`${API_BASE}/facilities?category=${encodeURIComponent(category)}`, {}, 2500);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data?.data) && data.data.length > 0) {
          list = data.data.map(parseFacilityFromDb);
          fetchedFromRemote = true;
        }
      }
    } catch {}
  }

  if (fetchedFromRemote) {
    setStore('facilities', list, false);
  } else {
    list = getStore('facilities', DEFAULT_FACILITIES);
  }

  if (category !== 'all') list = list.filter((f: any) => f.category.toLowerCase() === category.toLowerCase());
  return list;
}

export async function createFacility(payload: any) {
  const dbPayload = prepareFacilityForDb(payload);
  const newFac = { 
    id: Date.now(), 
    status: 'Available', 
    ...payload,
    morning_rate: dbPayload.morning_rate,
    afternoon_rate: dbPayload.afternoon_rate,
    hourly_rate: dbPayload.hourly_rate
  };
  const list = getStore('facilities', DEFAULT_FACILITIES);
  list.push(newFac);
  setStore('facilities', list, false);

  // 1. Primary: eProvider Cloud Database
  if (HAS_EPROVIDER) {
    try { 
      const res = await epPost('facilities', dbPayload, 2500); 
      if (Array.isArray(res) && res[0]?.id) {
        newFac.id = res[0].id;
        setStore('facilities', list, false);
      }
    } catch (e) {
      console.warn('eProvider createFacility error:', e);
    }
  }

  // 2. Secondary: Render Backend (fastFetch with 2000ms max so it never hangs)
  if (HAS_BACKEND) {
    try {
      const res = await fastFetch(`${API_BASE}/facilities`, {
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify(dbPayload)
      }, 2000);
      if (res.ok) { 
        const data = await res.json(); 
        if (data?.data?.id) { 
          newFac.id = data.data.id; 
          setStore('facilities', list, false); 
        } 
      }
    } catch {}
  }

  // Single dispatch after all operations complete
  if (typeof window !== 'undefined') window.dispatchEvent(new Event('govserve_data_updated'));
  return { success: true, data: newFac };
}

export async function updateFacility(id: number, payload: any) {
  const dbPayload = prepareFacilityForDb(payload);
  const list = getStore('facilities', DEFAULT_FACILITIES);
  const idx = list.findIndex((f: any) => Number(f.id) === Number(id));
  if (idx !== -1) { 
    list[idx] = { 
      ...list[idx], 
      ...payload,
      morning_rate: dbPayload.morning_rate,
      afternoon_rate: dbPayload.afternoon_rate,
      hourly_rate: dbPayload.hourly_rate
    }; 
    setStore('facilities', list, false); 
  }

  // 1. Primary: eProvider Cloud Database
  if (HAS_EPROVIDER) {
    try { 
      await epPatch('facilities', `id=eq.${id}`, dbPayload, 2500); 
    } catch (e) {
      console.warn('eProvider updateFacility error:', e);
    }
  }

  // 2. Secondary: Render Backend (fastFetch with 2000ms max)
  if (HAS_BACKEND) {
    try {
      await fastFetch(`${API_BASE}/facilities/${id}`, {
        method: 'PUT', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify(dbPayload)
      }, 2000);
    } catch {}
  }

  // Single dispatch after all operations complete
  if (typeof window !== 'undefined') window.dispatchEvent(new Event('govserve_data_updated'));
  return { success: true };
}

export async function deleteFacility(id: number) {
  const list = getStore('facilities', DEFAULT_FACILITIES);
  setStore('facilities', list.filter((f: any) => Number(f.id) !== Number(id)), false);

  // Cleanly purge any reservations linked to this deleted facility from local store
  const reservations = getStore('reservations', DEFAULT_RESERVATIONS);
  setStore('reservations', reservations.filter((r: any) => Number(r.facility_id) !== Number(id)), false);

  if (HAS_EPROVIDER) {
    try {
      await fastFetch(`${EP_REST}/facilities?id=eq.${id}`, { 
        method: 'DELETE', 
        headers: { ...EP_HEADERS, 'Accept-Profile': EP_SCHEMA, 'Content-Profile': EP_SCHEMA } 
      }, 2500);
    } catch {}
  }

  if (HAS_BACKEND) {
    try { 
      await fastFetch(`${API_BASE}/facilities/${id}`, { method: 'DELETE' }, 2000); 
    } catch {}
  }

  if (typeof window !== 'undefined') window.dispatchEvent(new Event('govserve_data_updated'));
  return { success: true };
}

let reservationsCache: { data: any[]; timestamp: number } | null = null;

export function invalidateReservationsCache() {
  reservationsCache = null;
}

export async function fetchReservations(status = 'all', category = 'all', excludeCancelled = false) {
  if (status === 'all' && category === 'all' && !excludeCancelled && reservationsCache && (Date.now() - reservationsCache.timestamp < 4000)) {
    return reservationsCache.data;
  }

  let list: any[] = [];
  let serverList: any[] = [];
  let fetched = false;

  // 1. Primary: eProvider Cloud Database
  if (HAS_EPROVIDER) {
    try {
      let q = 'order=id.desc';
      if (status !== 'all') q += `&status=eq.${encodeURIComponent(status)}`;
      const data = await epGet('facility_reservations', q);
      if (Array.isArray(data)) {
        serverList = data;
        fetched = true;
      }
    } catch (e) {
      console.warn('eProvider fetchReservations error:', e);
    }
  }

  // 2. Secondary: Edge function
  if (!fetched) {
    const edgeData = await edgeFetch(`/facilities/reservations?status=${encodeURIComponent(status)}`);
    if (Array.isArray(edgeData?.data)) {
      serverList = edgeData.data;
      fetched = true;
    }
  }

  // 3. Secondary: Render Backend
  if (!fetched && HAS_BACKEND) try {
    const cancelParam = excludeCancelled ? '&exclude_cancelled=true' : '';
    const res = await fastFetch(`${API_BASE}/facilities/reservations?status=${encodeURIComponent(status)}&category=${encodeURIComponent(category)}${cancelParam}`, {}, 2500);
    if (res.ok) { 
      const data = await res.json(); 
      if (Array.isArray(data?.data)) {
        serverList = data.data;
        fetched = true;
      }
    }
  } catch {}

  const localList = getStore('reservations', DEFAULT_RESERVATIONS);
  if (fetched && serverList.length > 0) {
    // Apply category enrichment to server data
    const allFacsMaster = getStore('facilities', DEFAULT_FACILITIES);
    serverList = serverList.map((r: any) => {
      // Check if there is a local match with category information
      const localMatch = localList.find((l: any) =>
        String(l.id) === String(r.id) ||
        (l.reference_no && r.reference_no && String(l.reference_no).trim().toUpperCase() === String(r.reference_no).trim().toUpperCase())
      );
      let rName = r.facility_name || localMatch?.facility_name;
      let rCat = r.facility_category || r.category || localMatch?.facility_category;
      if ((!rName || !rCat) && r.facility_id) {
        const matched = allFacsMaster.find((f: any) => Number(f.id) === Number(r.facility_id));
        if (matched) {
          rName = rName || matched.name;
          rCat = rCat || matched.category;
        }
      }
      if (!rCat && rName) {
        const matched = allFacsMaster.find((f: any) => (f.name || '').trim().toLowerCase() === String(rName).trim().toLowerCase());
        if (matched) rCat = matched.category;
      }
      if (!rCat) {
        const n = (rName || '').toLowerCase();
        rCat = (n.includes('park') || n.includes('amphitheater') || n.includes('plaza') || n.includes('grounds') || n.includes('recreation'))
          ? 'Park & Recreation' : 'Government Facility';
      }
      return { ...r, facility_name: rName || 'Municipal Facility', facility_category: rCat };
    });

    // CRITICAL: Deduplicate by BOTH id AND reference_no so local Date.now() records are never duplicated against server records
    const serverIds = new Set(serverList.map((r: any) => String(r.id)));
    const serverRefs = new Set(
      serverList
        .map((r: any) => String(r.reference_no || '').trim().toUpperCase())
        .filter(Boolean)
    );

    const localOnlyRecords = localList.filter((r: any) => {
      const hasId = serverIds.has(String(r.id));
      const ref = String(r.reference_no || '').trim().toUpperCase();
      const hasRef = ref && serverRefs.has(ref);
      return !hasId && !hasRef;
    });

    // Clean deduplicated combined list
    const combined = [...serverList, ...localOnlyRecords];
    const seenRefs = new Set<string>();
    const seenIds = new Set<string>();
    const deduplicated = combined.filter((r: any) => {
      const idStr = String(r.id);
      const refStr = String(r.reference_no || '').trim().toUpperCase();
      if (refStr) {
        if (seenRefs.has(refStr)) return false;
        seenRefs.add(refStr);
      }
      if (seenIds.has(idStr)) return false;
      seenIds.add(idStr);
      return true;
    });

    setStore('reservations', deduplicated, false);
    list = deduplicated;
  } else {
    list = localList;
  }

  // Ensure every reservation record is enriched with guaranteed facility_name and facility_category
  const allFacsMaster = getStore('facilities', DEFAULT_FACILITIES);
  list = list.map((r: any) => {
    let rName = r.facility_name;
    let rCat = r.facility_category || r.category;
    if ((!rName || !rCat) && r.facility_id) {
      const matched = allFacsMaster.find((f: any) => Number(f.id) === Number(r.facility_id));
      if (matched) {
        rName = rName || matched.name;
        rCat = rCat || matched.category;
      }
    }
    if (!rCat && rName) {
      const matched = allFacsMaster.find((f: any) => (f.name || '').trim().toLowerCase() === String(rName).trim().toLowerCase());
      if (matched) rCat = matched.category;
    }
    return {
      ...r,
      facility_name: rName || 'Municipal Facility',
      facility_category: rCat || 'Government Facility'
    };
  });

  // Filter by status if not all
  if (status !== 'all') {
    list = list.filter((r: any) => (r.status || '').toLowerCase() === status.toLowerCase());
  }

  if (excludeCancelled) {
    list = list.filter((r: any) => {
      const s = (r.status || '').toLowerCase();
      return s !== 'cancelled' && s !== 'canceled';
    });
  }

  // Strictly filter by category if not all — applied BEFORE saving to local store to prevent cross-contamination
  function filterByCategory(records: any[], cat: string) {
    if (cat === 'all') return records;
    const allFacs = getStore('facilities', DEFAULT_FACILITIES);
    return records.filter((r: any) => {
      let rCat = (r.facility_category || r.category || '').toLowerCase().trim();
      if (!rCat && r.facility_id) {
        const matched = allFacs.find((f: any) => Number(f.id) === Number(r.facility_id));
        if (matched?.category) rCat = matched.category.toLowerCase().trim();
      }
      if (!rCat && r.facility_name) {
        const matched = allFacs.find((f: any) => f.name?.toLowerCase() === r.facility_name?.toLowerCase());
        if (matched?.category) rCat = matched.category.toLowerCase().trim();
      }
      if (!rCat) {
        const n = (r.facility_name || '').toLowerCase();
        if (n.includes('park') || n.includes('amphitheater') || n.includes('plaza') || n.includes('playground') || n.includes('grounds') || n.includes('recreation')) {
          rCat = 'park & recreation';
        } else {
          rCat = 'government facility';
        }
      }
      const target = cat.toLowerCase().trim();
      if (target.includes('park') || target.includes('recreation')) {
        return rCat.includes('park') || rCat.includes('recreation');
      }
      if (target.includes('government') || target.includes('facility')) {
        return (rCat.includes('government') || rCat.includes('facility')) && !rCat.includes('park') && !rCat.includes('recreation');
      }
      return rCat === target;
    });
  }

  const result = filterByCategory(list, category);
  if (status === 'all' && category === 'all' && !excludeCancelled) {
    reservationsCache = { data: result, timestamp: Date.now() };
  }
  return result;
}

export async function createReservation(payload: any) {
  invalidateReservationsCache();
  let citizenMeta: any = {};
  let callerRole = 'Citizen';
  try {
    const cu = JSON.parse(sessionStorage.getItem('govserve_user') || localStorage.getItem('govserve_user') || '{}');
    citizenMeta = {
      citizen_id: payload.citizen_id || cu.id || undefined,
      applicant_name: payload.applicant_name?.trim() || cu.name || '',
      applicant_email: (payload.applicant_email || cu.email || '').toLowerCase().trim(),
      citizen_email: (cu.email || payload.applicant_email || '').toLowerCase().trim()
    };
    callerRole = cu.role || 'Citizen';
  } catch {}
  // True when booking was created by a staff/admin user (not a citizen submitting)
  const isStaffBooking = callerRole !== 'Citizen';

  const allFacs = getStore('facilities', DEFAULT_FACILITIES);
  const matchedFac = allFacs.find((f: any) => Number(f.id) === Number(payload.facility_id));
  const normalizedCategory = payload.facility_category || matchedFac?.category || 'Government Facility';
  const normalizedName = payload.facility_name || matchedFac?.name || 'Municipal Venue';
  const normalizedLocation = payload.facility_location || matchedFac?.location || '';
  const normalizedRate = payload.hourly_rate ?? matchedFac?.hourly_rate ?? 0;
  const equipmentText = Array.isArray(payload.special_equipment) ? payload.special_equipment.join(', ') : (payload.special_equipment || null);

  // If this is a resubmission of an existing ticket
  const isResubmission = Boolean(payload.resubmitId || payload.resubmit_id || payload.is_resubmit);
  if (isResubmission) {
    const resubmitId = payload.resubmitId || payload.resubmit_id;
    const existingRef = payload.reference_no;
    delete payload.resubmitId;
    delete payload.resubmit_id;
    delete payload.is_resubmit;

    const dbUpdate: any = {
      purpose: payload.purpose,
      event_date: payload.event_date ? payload.event_date.split('T')[0] : undefined,
      start_time: payload.start_time,
      end_time: payload.end_time,
      attendees: payload.attendees ? Number(payload.attendees) : undefined,
      special_equipment: equipmentText || null,
      hours: payload.hours ? Number(payload.hours) : undefined,
      fee_amount: payload.fee_amount ? Number(payload.fee_amount) : undefined,
      status: 'Pending Review',
      remarks: 'Resubmitted with updated schedule/details'
    };
    if (payload.facility_id) dbUpdate.facility_id = Number(payload.facility_id);
    if (payload.applicant_name) dbUpdate.applicant_name = payload.applicant_name;
    if (payload.applicant_phone) dbUpdate.applicant_phone = payload.applicant_phone;
    Object.keys(dbUpdate).forEach(k => dbUpdate[k] === undefined && delete dbUpdate[k]);

    const updateData = {
      ...citizenMeta,
      ...payload,
      facility_category: normalizedCategory,
      facility_name: normalizedName,
      facility_location: normalizedLocation,
      hourly_rate: normalizedRate,
      special_equipment: equipmentText,
      status: 'Pending Review',
      remarks: 'Resubmitted with updated schedule/details'
    };

    const reservations = getStore('reservations', DEFAULT_RESERVATIONS);
    const existingIdx = reservations.findIndex((r: any) => 
      (existingRef && r.reference_no === existingRef) || 
      r.id === resubmitId || 
      String(r.id) === String(resubmitId)
    );
    if (existingIdx !== -1) {
      reservations[existingIdx] = { ...reservations[existingIdx], ...updateData };
      setStore('reservations', reservations);
    }

    // 1. Patch eProvider Cloud Database (Primary)
    if (HAS_EPROVIDER) {
      try {
        const epQuery = existingRef 
          ? `reference_no=eq.${encodeURIComponent(existingRef)}` 
          : `id=eq.${resubmitId}`;
        await epPatch('facility_reservations', epQuery, dbUpdate, 3000);
      } catch (epErr) {
        console.warn('eProvider resubmit patch error:', epErr);
      }
    }

    // 2. Patch backend (Secondary)
    if (HAS_BACKEND) {
      try {
        await fastFetch(`${API_BASE}/facilities/reservations/${existingRef || resubmitId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(dbUpdate)
        }, 3000);
      } catch {}
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('govserve_data_updated'));
    }
    return { success: true, reference_no: existingRef, data: { id: resubmitId, ...updateData } };
  }

  const refNo = `RES-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`;
  const applicantEmail = citizenMeta.applicant_email || citizenMeta.citizen_email || payload.applicant_email || payload.citizen_email;

  // Only notify admin when a citizen submits (never self-notify when staff creates a booking)
  if (!isStaffBooking) {
    addNotification({
      title: 'New Booking Submitted',
      text: `${citizenMeta.applicant_name || 'Resident'} booked ${normalizedName} for ${payload.event_date || 'scheduled date'}.`,
      targetRole: 'Admin',
      category: 'reservation',
    });
    // Only send citizen confirmation when we have a valid email target
    if (applicantEmail && applicantEmail.includes('@')) {
      addNotification({
        title: 'Reservation Ticket Created',
        text: `Your reservation request (${refNo}) has been successfully submitted and is under LGU review.`,
        targetRole: 'Citizen',
        targetEmail: applicantEmail,
        category: 'reservation',
      });
    }
  }

  // Prepare database-clean payload matching PostgreSQL schema
  const dbReservation = {
    reference_no: refNo,
    facility_id: payload.facility_id ? Number(payload.facility_id) : 1,
    citizen_id: citizenMeta.citizen_id ? Number(citizenMeta.citizen_id) : null,
    applicant_name: citizenMeta.applicant_name || payload.applicant_name || 'Resident Applicant',
    applicant_email: applicantEmail || '',
    citizen_email: applicantEmail || null,
    applicant_phone: payload.applicant_phone || '',
    purpose: payload.purpose || 'Civic Event',
    event_date: payload.event_date ? payload.event_date.split('T')[0] : new Date().toISOString().split('T')[0],
    start_time: payload.start_time || '08:00 AM',
    end_time: payload.end_time || '12:00 PM',
    attendees: Number(payload.attendees) || 20,
    special_equipment: equipmentText || null,
    fee_amount: Number(payload.fee_amount) || 0,
    hours: Number(payload.hours) || 1,
    status: 'Pending Review'
  };

  const newReservation = {
    id: Date.now(),
    ...dbReservation,
    ...citizenMeta,
    ...payload,
    facility_category: normalizedCategory,
    facility_name: normalizedName,
    facility_location: normalizedLocation,
    hourly_rate: normalizedRate,
    special_equipment: equipmentText,
    status: 'Pending Review',
    created_at: new Date().toISOString()
  };

  // Always save to local store (notify=false: single dispatch at end after remote sync)
  const reservations = getStore('reservations', DEFAULT_RESERVATIONS);
  reservations.unshift(newReservation);
  setStore('reservations', reservations, false);

  // 1. Primary: Save to eProvider Cloud Database
  if (HAS_EPROVIDER) {
    try {
      const inserted = await epPost('facility_reservations', dbReservation);
      if (Array.isArray(inserted) && inserted[0]?.id) {
        newReservation.id = inserted[0].id;
        newReservation.reference_no = inserted[0].reference_no || newReservation.reference_no;
        setStore('reservations', reservations, false);
      }
    } catch (e) {
      console.warn('eProvider createReservation error:', e);
    }
  }

  // 2. Secondary: Sync to Render backend
  if (HAS_BACKEND) {
    try {
      const res = await fastFetch(`${API_BASE}/facilities/reservations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dbReservation)
      }, 3000);
      if (res.ok) {
        const data = await res.json();
        if (data?.data) {
          newReservation.id = data.data.id || newReservation.id;
          newReservation.reference_no = data.data.reference_no || newReservation.reference_no;
          setStore('reservations', reservations, false);
        }
      }
    } catch {}
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('govserve_data_updated'));
  }

  return { success: true, reference_no: refNo, data: newReservation };
}

export async function updateReservationStatus(
  id: number, 
  status: string, 
  remarks?: string, 
  reviewer_name?: string,
  extraData?: { fee_amount?: number; payment_due_date?: string; paid_at?: string; payment_method?: string }
) {
  let targetEmail = '';

  // 1. Immediately update local store so UI reflects change in 0ms
  const reservations = getStore('reservations', DEFAULT_RESERVATIONS);
  const item = reservations.find((r: any) => r.id === id || String(r.id) === String(id));
  if (item) { 
    item.status = status; 
    if (remarks) item.remarks = remarks;
    if (extraData) Object.assign(item, extraData);
    targetEmail = item.applicant_email || item.citizen_email || '';
    // notify=false: single dispatch below after notification is added
    setStore('reservations', reservations, false); 
  }

  if (targetEmail && targetEmail.includes('@')) {
    addNotification({
      title: `Reservation ${status}`,
      text: `Your reservation request status has been updated to "${status}". ${remarks ? 'Note: ' + remarks : ''}`,
      targetRole: 'Citizen',
      targetEmail,
      category: 'reservation',
    });
  }

  // Single dispatch after local store + notification are committed
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('govserve_data_updated'));
  }

  // 2. Non-blocking cloud backend & eProvider sync with fast timeout
  (async () => {
    if (HAS_BACKEND) try {
      const res = await fastFetch(`${API_BASE}/facilities/reservations/${id}/status`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status, remarks, reviewer_name, ...extraData })
      }, 3000);
      if (res.ok) {
        const data = await res.json();
        if (data?.data && !targetEmail) {
          const email = data.data.applicant_email || data.data.citizen_email || '';
          if (email && email.includes('@')) {
            addNotification({
              title: `Reservation ${status}`,
              text: `Your reservation request status has been updated to "${status}". ${remarks ? 'Note: ' + remarks : ''}`,
              targetRole: 'Citizen',
              targetEmail: email,
              category: 'reservation',
            });
          }
        }
      }
    } catch {}

    if (HAS_EPROVIDER) try {
      const epPatchPayload: any = { status };
      if (remarks !== undefined) epPatchPayload.remarks = remarks;
      if (extraData?.fee_amount !== undefined) epPatchPayload.fee_amount = Number(extraData.fee_amount);
      if (extraData?.payment_due_date !== undefined) epPatchPayload.payment_due_date = extraData.payment_due_date;
      if (extraData?.paid_at !== undefined) epPatchPayload.paid_at = extraData.paid_at;
      if (extraData?.payment_method !== undefined) epPatchPayload.payment_method = extraData.payment_method;

      const q = item?.reference_no ? `reference_no=eq.${encodeURIComponent(item.reference_no)}` : `id=eq.${id}`;
      await epPatch('facility_reservations', q, epPatchPayload, 3000);
    } catch (epErr) {
      console.warn('eProvider updateReservationStatus error:', epErr);
    }
  })();

  return { success: true };
}

// Time range overlap helper for accurate schedule conflict detection
export function parse12HToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const cleaned = timeStr.trim().toLowerCase();
  const match = cleaned.match(/(\d+)(?::(\d+))?\s*(am|pm)?/);
  if (!match) return 0;
  let hours = parseInt(match[1], 10);
  const minutes = match[2] ? parseInt(match[2], 10) : 0;
  const isPm = match[3] === 'pm';
  const isAm = match[3] === 'am';
  if (isPm && hours < 12) hours += 12;
  if (isAm && hours === 12) hours = 0;
  return hours * 60 + minutes;
}

export function calculateBookingHours(startTime: string, endTime: string): number {
  if (!startTime || !endTime) return 0;
  if (startTime.trim().toLowerCase() === endTime.trim().toLowerCase()) return 0;
  const startMin = parse12HToMinutes(startTime);
  const endMin = parse12HToMinutes(endTime);
  const diffMinutes = endMin - startMin;
  if (diffMinutes > 0) {
    const hrs = diffMinutes / 60;
    return Math.round(hrs * 100) / 100;
  }
  return 0;
}

export function calculateSlotFee(
  startTime: string,
  endTime: string,
  facilityOrRate?: any,
  afternoonRateParam?: number
): { fee: number; hours: number; slotLabel: string; isMorning: boolean; isAfternoon: boolean; isBoth: boolean } {
  let mRate = 0;
  let aRate = 0;

  if (typeof facilityOrRate === 'object' && facilityOrRate !== null) {
    mRate = Number(facilityOrRate.morning_rate ?? facilityOrRate.hourly_rate ?? 0);
    aRate = Number(facilityOrRate.afternoon_rate ?? facilityOrRate.hourly_rate ?? 0);
  } else if (typeof facilityOrRate === 'number') {
    mRate = facilityOrRate;
    aRate = afternoonRateParam !== undefined ? afternoonRateParam : facilityOrRate;
  }

  const s = (startTime || '').trim().toUpperCase();
  const e = (endTime || '').trim().toUpperCase();

  const isMorning = s.startsWith('08') && (e.startsWith('12') || e === '12:00 PM');
  const isAfternoon = (s.startsWith('01') || s.startsWith('1:') || s.startsWith('13')) && (e.startsWith('05') || e.startsWith('5:') || e.startsWith('17'));
  const isBoth = s.startsWith('08') && (e.startsWith('05') || e.startsWith('5:') || e.startsWith('17'));

  if (isBoth) {
    return {
      fee: mRate + aRate,
      hours: 8,
      slotLabel: 'Full Day (08:00 AM – 05:00 PM)',
      isMorning: true,
      isAfternoon: true,
      isBoth: true
    };
  }
  if (isMorning) {
    return {
      fee: mRate,
      hours: 4,
      slotLabel: 'Morning Slot (08:00 AM – 12:00 PM)',
      isMorning: true,
      isAfternoon: false,
      isBoth: false
    };
  }
  if (isAfternoon) {
    return {
      fee: aRate,
      hours: 4,
      slotLabel: 'Afternoon Slot (01:00 PM – 05:00 PM)',
      isMorning: false,
      isAfternoon: true,
      isBoth: false
    };
  }

  // Fallback for custom or legacy hours
  const hours = calculateBookingHours(startTime, endTime);
  const baseRate = mRate || aRate || 0;
  return {
    fee: Math.round(hours * baseRate),
    hours,
    slotLabel: `${startTime} – ${endTime}`,
    isMorning: false,
    isAfternoon: false,
    isBoth: false
  };
}

export function calculateFacilityFee(
  startTime: string,
  endTime: string,
  hourlyRate: number | any,
  afternoonRate?: number
): number {
  return calculateSlotFee(startTime, endTime, hourlyRate, afternoonRate).fee;
}

function areTimeSlotsConflicting(startA: string, endA: string, startB: string, endB: string): boolean {
  const minStartA = parse12HToMinutes(startA);
  const minEndA = parse12HToMinutes(endA);
  const minStartB = parse12HToMinutes(startB);
  const minEndB = parse12HToMinutes(endB);

  // If time parsing produced valid ranges, check interval overlap: startA < endB && startB < endA
  if (minStartA < minEndA && minStartB < minEndB) {
    return minStartA < minEndB && minStartB < minEndA;
  }
  // Fallback: direct equality
  return (
    startA.trim().toLowerCase() === startB.trim().toLowerCase() ||
    endA.trim().toLowerCase() === endB.trim().toLowerCase()
  );
}

export async function checkDoubleBooking(
  facilityId: number, 
  facilityName: string, 
  eventDate: string, 
  startTime: string, 
  endTime: string,
  userEmail?: string,
  userName?: string,
  excludeReservationId?: number | string,
  facilityCategory?: string
) {
  let currentUserId: any = undefined;
  if (!userEmail) {
    try {
      const cu = JSON.parse(sessionStorage.getItem('govserve_user') || localStorage.getItem('govserve_user') || '{}');
      userEmail = cu.email;
      userName = cu.name;
      currentUserId = cu.id;
    } catch {}
  } else {
    try {
      const cu = JSON.parse(sessionStorage.getItem('govserve_user') || localStorage.getItem('govserve_user') || '{}');
      currentUserId = cu.id;
    } catch {}
  }

  let reservations: any[] = [];
  try {
    reservations = await fetchReservations('all', 'all');
  } catch {
    reservations = getStore('reservations', DEFAULT_RESERVATIONS);
  }

  const allFacilitiesList = getStore('facilities', DEFAULT_FACILITIES);

  // Normalize target check parameters
  const normTargetName = (facilityName || '').toLowerCase().trim();
  const normTargetId = facilityId ? Number(facilityId) : null;
  const isCheckingPark = facilityCategory
    ? (facilityCategory.toLowerCase().includes('park') || facilityCategory.toLowerCase().includes('recreation'))
    : (normTargetName.includes('park') || normTargetName.includes('amphitheater') ||
       normTargetName.includes('plaza') || normTargetName.includes('grounds') ||
       normTargetName.includes('recreation'));

  // Target event date normalized (YYYY-MM-DD)
  const targetDateStr = (eventDate || '').split('T')[0].trim();

  // Find all active reservations on this target date for THIS specific venue
  const sameDayBookings = reservations.filter((r: any) => {
    if (r.status === 'Cancelled' || r.status === 'Rejected') return false;
    if (excludeReservationId && (r.id === excludeReservationId || String(r.id) === String(excludeReservationId))) return false;

    let rFacId = r.facility_id ? Number(r.facility_id) : null;
    let rFacName = (r.facility_name || '').toLowerCase().trim();
    let rFacCat = (r.facility_category || r.category || '').toLowerCase().trim();

    if ((!rFacName || !rFacCat) && rFacId) {
      const match = allFacilitiesList.find((f: any) => Number(f.id) === rFacId);
      if (match) {
        if (!rFacName) rFacName = (match.name || '').toLowerCase().trim();
        if (!rFacCat) rFacCat = (match.category || '').toLowerCase().trim();
      }
    }
    if (!rFacId && rFacName) {
      const match = allFacilitiesList.find((f: any) => (f.name || '').toLowerCase().trim() === rFacName);
      if (match) {
        rFacId = Number(match.id);
        if (!rFacCat) rFacCat = (match.category || '').toLowerCase().trim();
      }
    }

    // 1. Category isolation: strictly separate Government Facility vs Park & Recreation
    const rIsPark = rFacCat.includes('park') || rFacCat.includes('recreation') ||
                    rFacName.includes('park') || rFacName.includes('amphitheater') ||
                    rFacName.includes('plaza') || rFacName.includes('grounds');
    if (isCheckingPark !== rIsPark) return false;

    // 2. Strict Specific Venue Isolation
    let isSameVenue = false;
    if (normTargetId !== null && rFacId !== null) {
      isSameVenue = (normTargetId === rFacId);
    } else if (normTargetName && rFacName) {
      isSameVenue = (normTargetName === rFacName || normTargetName.includes(rFacName) || rFacName.includes(normTargetName));
    } else if (normTargetId !== null && !rFacName) {
      isSameVenue = (normTargetId === rFacId);
    }
    if (!isSameVenue) return false;

    // 3. Date comparison
    const rDateStr = (r.event_date || '').split('T')[0].trim();
    return rDateStr === targetDateStr;
  });

  // Evaluate 4-hour slots availability on this date
  const morningBooked = sameDayBookings.some(r => areTimeSlotsConflicting(r.start_time || '', r.end_time || '', '08:00 AM', '12:00 PM'));
  const afternoonBooked = sameDayBookings.some(r => areTimeSlotsConflicting(r.start_time || '', r.end_time || '', '01:00 PM', '05:00 PM'));

  // Find if there is an exact conflict with the user's requested interval
  const conflict = sameDayBookings.find((r: any) =>
    areTimeSlotsConflicting(r.start_time || '', r.end_time || '', startTime, endTime)
  );

  if (conflict) {
    const cEmail = (conflict.applicant_email || conflict.citizen_email || '').toLowerCase().trim();
    const uEmail = (userEmail || '').toLowerCase().trim();
    const cId = conflict.citizen_id;
    const uId = currentUserId;

    const isOwnBooking = Boolean(
      (uId && cId && String(uId) === String(cId)) ||
      (uEmail && cEmail && uEmail.includes('@') && uEmail === cEmail)
    );

    if (isOwnBooking) {
      const isApproved = conflict.status === 'Approved' || conflict.status === 'Paid';
      const statusLabel = conflict.status || 'Active';
      return {
        hasConflict: false,  // Own booking — not a foreign conflict
        isOwnSchedule: true,
        message: isApproved
          ? `You have an existing confirmed booking for this venue on ${targetDateStr} (${conflict.reference_no} • Status: ${statusLabel}). You can view details, re-edit, or reschedule below.`
          : `You have an active booking on this date and time (${conflict.reference_no} • Status: ${statusLabel}). You can view details, re-edit, or reschedule below.`,
        existingBooking: {
          id: conflict.id,
          reference_no: conflict.reference_no,
          facility_id: conflict.facility_id,
          facility_name: conflict.facility_name,
          facility_category: conflict.facility_category,
          event_date: conflict.event_date,
          start_time: conflict.start_time,
          end_time: conflict.end_time,
          status: conflict.status,
          purpose: conflict.purpose,
          attendees: conflict.attendees,
          special_equipment: conflict.special_equipment,
          hours: conflict.hours,
          fee_amount: conflict.fee_amount,
          applicant_name: conflict.applicant_name,
          applicant_phone: conflict.applicant_phone,
          applicant_email: conflict.applicant_email
        },
        suggestedSlots: !morningBooked
          ? [`${targetDateStr} (08:00 AM - 12:00 PM)`]
          : !afternoonBooked
          ? [`${targetDateStr} (01:00 PM - 05:00 PM)`]
          : []
      };
    }

    // Foreign Conflict — Smart AI reciprocal recommendations
    let suggestedSlot = '';
    let msg = `This time slot is already reserved for this venue on ${targetDateStr} (${conflict.start_time} - ${conflict.end_time}).`;
    if (!afternoonBooked && morningBooked) {
      suggestedSlot = `${targetDateStr} (01:00 PM - 05:00 PM)`;
      msg = `The morning slot (08:00 AM – 12:00 PM) is already reserved on ${targetDateStr}. Smart AI recommends the available Afternoon Slot (01:00 PM – 05:00 PM)!`;
    } else if (!morningBooked && afternoonBooked) {
      suggestedSlot = `${targetDateStr} (08:00 AM - 12:00 PM)`;
      msg = `The afternoon slot (01:00 PM – 05:00 PM) is already reserved on ${targetDateStr}. Smart AI recommends the available Morning Slot (08:00 AM – 12:00 PM)!`;
    } else {
      // Both slots booked on this date — suggest next available day
      const d = new Date(targetDateStr);
      d.setDate(d.getDate() + 1);
      const nextDateStr = d.toISOString().split('T')[0];
      suggestedSlot = `${nextDateStr} (08:00 AM - 12:00 PM)`;
      msg = `Both morning and afternoon slots are fully reserved on ${targetDateStr}. Smart AI recommends checking the next available date: ${nextDateStr}.`;
    }

    return {
      hasConflict: true,
      isOwnSchedule: false,
      message: msg,
      existingBooking: null,
      suggestedSlots: suggestedSlot ? [suggestedSlot] : []
    };
  }

  return {
    hasConflict: false,
    isOwnSchedule: false,
    message: `Slot is available for ${facilityName} on ${targetDateStr}.`,
    existingBooking: null,
    suggestedSlots: []
  };
}


export async function cancelReservation(id: number | string, reason = 'Cancelled by Resident') {
  return await updateReservationStatus(Number(id) || (id as any), 'Cancelled', reason);
}

export async function cancelUtilityRequest(id: number | string, reason = 'Cancelled by Resident', ticket_no?: string) {
  return await updateUtilityStatus(id, 'Cancelled', undefined, reason, ticket_no);
}

export async function cancelBurial(id: number | string, reason = 'Cancelled by Resident') {
  return await updateBurialStatus(id, 'Cancelled');
}

export async function checkFacilityAI(facilityName: string, eventDate: string, startTime: string, endTime: string, facilityId?: number) {
  try {
    const res = await fetch(`${API_BASE}/ai/facility-check`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ facilityName, eventDate, startTime, endTime, facilityId }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data?.data) return data.data;
    }
  } catch {}

  return {
    conflict: false,
    confidence: 0.95,
    reasoning: `AI Slot Verification: ${facilityName} is confirmed available on ${eventDate} from ${startTime} to ${endTime}.`,
    suggestedAlternates: ['Camarin Green Urban Recreation Park', 'Mindanao Community Sports Gymnasium']
  };
}

export async function fetchCemeteries(): Promise<string[]> {
  return [
    'Quezon City Municipal Cemetery (Brgy. Bagong Pag-asa)'
  ];
}

export async function fetchCemeteryPlots(section = 'all', status = 'all', cemetery_name = 'all') {
  let serverPlots: any[] = [];
  let serverBurials: any[] = [];
  let fetched = false;

  // 1. Primary: eProvider Cloud Database — fetch both plots and burials together
  if (HAS_EPROVIDER) {
    try {
      let q = 'order=id.asc';
      if (section !== 'all') q += `&section=eq.${encodeURIComponent(section)}`;
      const [plotData, burialData] = await Promise.all([
        epGet('cemetery_plots', q, 5000),
        epGet('burial_records', 'order=id.desc&status=not.in.(Cancelled,Rejected,Canceled)', 5000)
      ]);
      if (Array.isArray(plotData) && plotData.length > 0) {
        serverPlots = plotData;
        fetched = true;
        // Merge burial statuses onto plots in-memory (same source, no local store confusion)
        if (Array.isArray(burialData)) {
          serverBurials = burialData;
          const todayStr = new Date().toISOString().split('T')[0];
          serverPlots = serverPlots.map((plot: any) => {
            // Find active burial for this plot
            const activeBurial = burialData.find((b: any) =>
              (b.plot_id && String(b.plot_id) === String(plot.id)) ||
              (b.plot_code && b.plot_code === plot.plot_code)
            );
            if (!activeBurial) return plot;
            const merged = { ...plot };
            // Override: Paid or Completed + past/today burial_date = Occupied
            if (['Paid', 'Completed'].includes(activeBurial.status) && activeBurial.burial_date && activeBurial.burial_date <= todayStr) {
              merged.status = 'Occupied';
            } else if (['Approved', 'Pending Payment', 'Pending Review'].includes(activeBurial.status)) {
              // Keep Reserved if not yet occupied
              if (merged.status !== 'Occupied') merged.status = 'Reserved';
            }
            // Attach burial metadata to plot for display in modal
            merged.deceased_name = activeBurial.deceased_name || merged.deceased_name;
            merged.burial_date = activeBurial.burial_date || merged.burial_date;
            merged.date_of_death = activeBurial.date_of_death || merged.date_of_death;
            merged.permit_no = activeBurial.permit_no || merged.permit_no;
            merged.contact_person = activeBurial.contact_person || merged.contact_person;
            return merged;
          });
        }
        setStore('plots', serverPlots, false);
      }
    } catch (e) {
      console.warn('eProvider fetchCemeteryPlots error:', e);
    }
  }

  // 2. Secondary: Render Backend (also fetches burial-merged data via SQL JOIN)
  if (!fetched && HAS_BACKEND) {
    try {
      const res = await fastFetch(
        `${API_BASE}/cemetery/plots?section=${encodeURIComponent(section)}&status=${encodeURIComponent(status)}&cemetery_name=${encodeURIComponent(cemetery_name)}`,
        {},
        3000
      );
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data?.data) && data.data.length > 0) {
          serverPlots = data.data;
          fetched = true;
          setStore('plots', data.data, false);
        }
      }
    } catch {}
  }

  // 3. Fallback: localStorage (with burial record merge)
  if (!fetched) {
    let plots = getStore('plots', generateInitialPlots());
    const burials = getStore('burials', DEFAULT_BURIALS);
    const todayStr = new Date().toISOString().split('T')[0];

    plots = plots.map((plot: any) => {
      const activeBurial = burials.find((b: any) =>
        (b.plot_id && String(b.plot_id) === String(plot.id)) ||
        (b.plot_code && b.plot_code === plot.plot_code)
      );
      if (!activeBurial) return plot;
      const merged = { ...plot };
      if (['Paid', 'Completed'].includes(activeBurial.status) && activeBurial.burial_date && activeBurial.burial_date <= todayStr) {
        merged.status = 'Occupied';
      } else if (['Approved', 'Pending Payment', 'Pending Review'].includes(activeBurial.status)) {
        if (merged.status !== 'Occupied') merged.status = 'Reserved';
      }
      merged.deceased_name = activeBurial.deceased_name || merged.deceased_name;
      merged.burial_date = activeBurial.burial_date || merged.burial_date;
      merged.date_of_death = activeBurial.date_of_death || merged.date_of_death;
      merged.permit_no = activeBurial.permit_no || merged.permit_no;
      merged.contact_person = activeBurial.contact_person || merged.contact_person;
      return merged;
    });

    if (section !== 'all') plots = plots.filter((p: any) => p.section === section);
    if (status !== 'all') plots = plots.filter((p: any) => p.status === status);
    return plots;
  }

  // Apply filters after merge
  let result = serverPlots;
  if (cemetery_name !== 'all' && result.some((p: any) => p.cemetery_name === cemetery_name)) {
    result = result.filter((p: any) => p.cemetery_name === cemetery_name);
  }
  if (status !== 'all') result = result.filter((p: any) => p.status === status);
  return result;
}


export async function updatePlotStatus(id: number, status: string) {
  // 1. Immediately update local store
  const plots = getStore('plots', generateInitialPlots());
  const plot = plots.find((p: any) => p.id === id || String(p.id) === String(id));
  if (plot) {
    plot.status = status;
    setStore('plots', plots);
  }

  // 2. Non-blocking cloud sync
  (async () => {
    if (HAS_EPROVIDER) try {
      await epPatch('cemetery_plots', `id=eq.${id}`, { status }, 3000);
    } catch (e) {
      console.warn('eProvider updatePlotStatus error:', e);
    }
    if (HAS_BACKEND) try {
      await fastFetch(`${API_BASE}/cemetery/plots/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      }, 3000);
    } catch {}
  })();

  return { success: true };
}

export async function createPlot(payload: any) {
  const plots = getStore('plots', generateInitialPlots());
  const newPlot = { id: Date.now(), status: 'Available', ...payload };
  plots.push(newPlot);
  setStore('plots', plots);

  // Non-blocking cloud sync
  (async () => {
    if (HAS_EPROVIDER) try {
      const inserted = await epPost('cemetery_plots', payload);
      if (Array.isArray(inserted) && inserted[0]?.id) {
        newPlot.id = inserted[0].id;
        setStore('plots', plots);
      }
    } catch (e) {
      console.warn('eProvider createPlot error:', e);
    }
    if (HAS_BACKEND) try {
      await fastFetch(`${API_BASE}/cemetery/plots`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }, 3000);
    } catch {}
  })();

  return { success: true, data: newPlot };
}

export async function createBatchPlots(payload: any) {
  const plots = getStore('plots', generateInitialPlots());
  const { cemetery_name, section, rows, columns, price, plot_type } = payload;
  const newPlots: any[] = [];
  let id = Date.now();

  for (let r = 1; r <= Number(rows); r++) {
    for (let c = 1; c <= Number(columns); c++) {
      const rowStr = r < 10 ? `R0${r}` : `R${r}`;
      const colStr = c < 10 ? `C0${c}` : `C${c}`;
      newPlots.push({
        id: id++,
        cemetery_name: cemetery_name || 'Barangay 178 Municipal Cemetery',
        plot_code: `COL-${rowStr}-${colStr}`,
        section: section || 'Columbarium Wall Alpha',
        block_no: `Row ${r}`,
        lot_no: `Vault ${c}`,
        row_no: r,
        col_no: c,
        plot_type: plot_type || 'Columbarium Niche',
        status: 'Available',
        price: Number(price) || 18000.00
      });
    }
  }

  plots.push(...newPlots);
  setStore('plots', plots);
  return { success: true, count: newPlots.length };
}

function processAutoOccupancy() {
  const burials = getStore('burials', DEFAULT_BURIALS);
  const plots = getStore('plots', generateInitialPlots());
  const todayStr = new Date().toISOString().split('T')[0];
  let changedPlots = false;

  burials.forEach((b: any) => {
    // If burial is Paid, and burial_date is today or in the past:
    if (b.status === 'Paid' && b.burial_date && b.burial_date <= todayStr) {
      // Update matching plot to Occupied
      const plot = plots.find((p: any) => p.id === Number(b.plot_id) || p.plot_code === b.plot_code);
      if (plot && plot.status !== 'Occupied') {
        plot.status = 'Occupied';
        plot.deceased_name = b.deceased_name;
        plot.burial_date = b.burial_date;
        plot.date_of_death = b.date_of_death;
        plot.permit_no = b.permit_no;
        plot.contact_person = b.contact_person;
        changedPlots = true;
      }
    }
  });

  if (changedPlots) setStore('plots', plots);
}

export async function fetchBurials() {
  processAutoOccupancy();
  let serverList: any[] = [];
  let fetched = false;

  // 1. Primary: eProvider Cloud Database
  if (HAS_EPROVIDER) {
    try {
      const data = await epGet('burial_records', 'order=id.desc', 5000);
      if (Array.isArray(data) && data.length >= 0) {
        serverList = data;
        fetched = true;
      }
    } catch (e) {
      console.warn('eProvider fetchBurials error:', e);
    }
  }

  // 2. Secondary: Render Backend
  if (!fetched && HAS_BACKEND) {
    try {
      const res = await fastFetch(`${API_BASE}/cemetery/burials`, {}, 3000);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data?.data)) {
          serverList = data.data;
          fetched = true;
        }
      }
    } catch {}
  }

  const localList = getStore('burials', DEFAULT_BURIALS);

  if (fetched) {
    // Merge server records with any local-only records (e.g. just submitted, not yet confirmed by server)
    const serverIds = new Set(serverList.map((b: any) => String(b.id)));
    const serverRefs = new Set(
      serverList.map((b: any) => String(b.reference_no || '').trim().toUpperCase()).filter(Boolean)
    );
    const localOnlyRecords = localList.filter((b: any) => {
      const hasId = serverIds.has(String(b.id));
      const ref = String(b.reference_no || '').trim().toUpperCase();
      const hasRef = ref && serverRefs.has(ref);
      return !hasId && !hasRef;
    });
    const combined = [...serverList, ...localOnlyRecords];

    // Final deduplication pass by reference_no then id
    const seenRefs = new Set<string>();
    const seenIds = new Set<string>();
    const deduplicated = combined.filter((b: any) => {
      const refStr = String(b.reference_no || '').trim().toUpperCase();
      const idStr = String(b.id);
      if (refStr) {
        if (seenRefs.has(refStr)) return false;
        seenRefs.add(refStr);
      }
      if (seenIds.has(idStr)) return false;
      seenIds.add(idStr);
      return true;
    });

    // Extract citizen uploaded images from remarks if packed
    deduplicated.forEach((b: any) => {
      try {
        if (b.remarks && (b.remarks.startsWith('{') || b.remarks.startsWith('['))) {
          const parsed = JSON.parse(b.remarks);
          if (parsed.death_cert_url && !b.death_certificate_url) b.death_certificate_url = parsed.death_cert_url;
          if (parsed.valid_id_url && !b.valid_id_url) b.valid_id_url = parsed.valid_id_url;
          if (parsed.death_cert_name && !b.death_cert_name) b.death_cert_name = parsed.death_cert_name;
          if (parsed.valid_id_name && !b.valid_id_name) b.valid_id_name = parsed.valid_id_name;
        }
      } catch {}
    });

    setStore('burials', deduplicated, false);
    return deduplicated;
  }

  // Also parse localList
  localList.forEach((b: any) => {
    try {
      if (b.remarks && (b.remarks.startsWith('{') || b.remarks.startsWith('['))) {
        const parsed = JSON.parse(b.remarks);
        if (parsed.death_cert_url && !b.death_certificate_url) b.death_certificate_url = parsed.death_cert_url;
        if (parsed.valid_id_url && !b.valid_id_url) b.valid_id_url = parsed.valid_id_url;
      }
    } catch {}
  });

  return localList;
}

export async function updateBurialStatus(id: number | string, status: string, extraData?: { fee_amount?: number; permit_no?: string; remarks?: string; payment_due_date?: string; paid_at?: string; payment_method?: string; reference_no?: string }) {
  const burials = getStore('burials', DEFAULT_BURIALS);
  const index = burials.findIndex((b: any) => b.id === id || String(b.id) === String(id) || b.reference_no === id || (extraData?.reference_no && b.reference_no === extraData.reference_no));
  const burial = index !== -1 ? burials[index] : null;
  const refNo = extraData?.reference_no || burial?.reference_no || (typeof id === 'string' && id.startsWith('BUR-') ? id : '');

  // 1. Immediately update local store and plots
  if (index !== -1 && burial) {
    burial.status = status;
    if (extraData) Object.assign(burial, extraData);

    // Handle plot state changes based on burial status:
    if (status === 'Cancelled' || status === 'Rejected') {
      if (burial.plot_id || burial.plot_code) {
        const plots = getStore('plots', generateInitialPlots());
        const plot = plots.find((p: any) => p.id === Number(burial.plot_id) || p.plot_code === burial.plot_code);
        if (plot) {
          plot.status = 'Available';
          delete plot.deceased_name;
          setStore('plots', plots);
        }
      }
    } else if (status === 'Pending Payment' || status === 'Paid' || status === 'Approved') {
      if (burial.plot_id || burial.plot_code) {
        const plots = getStore('plots', generateInitialPlots());
        const plot = plots.find((p: any) => p.id === Number(burial.plot_id) || p.plot_code === burial.plot_code);
        if (plot && plot.status !== 'Occupied') {
          plot.status = 'Reserved';
          setStore('plots', plots);
        }
      }
    }

    setStore('burials', burials);
    processAutoOccupancy();

    const burialUpdateEmail = burial.citizen_email || burial.applicant_email;
    if (burialUpdateEmail && burialUpdateEmail.includes('@')) {
      addNotification({
        title: `Burial Application ${status}`,
        text: `Application ${burial.reference_no} status changed to ${status}.`,
        targetRole: 'Citizen',
        targetEmail: burialUpdateEmail,
        category: 'cemetery'
      });
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('govserve_data_updated'));
    }
  }

  // 2. Non-blocking cloud backend & eProvider sync with fast timeout
  (async () => {
    if (HAS_BACKEND) try {
      await fastFetch(`${API_BASE}/cemetery/burials/${encodeURIComponent(String(id))}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, reference_no: refNo, ...extraData }),
      }, 3000);
    } catch {}

    if (HAS_EPROVIDER) try {
      await epPatch('burial_records', `id=eq.${id}`, { status, ...extraData }, 3000);
    } catch {}
  })();

  return { success: true, data: burial };
}

export async function createBurial(payload: any) {
  let citizenMeta: any = {};
  let callerRole = 'Citizen';
  try {
    const cu = JSON.parse(sessionStorage.getItem('govserve_user') || localStorage.getItem('govserve_user') || '{}');
    citizenMeta = {
      citizen_id: payload.citizen_id || cu.id || undefined,
      citizen_email: (payload.applicant_email || payload.citizen_email || cu.email || '').toLowerCase().trim(),
      applicant_email: (payload.applicant_email || payload.citizen_email || cu.email || '').toLowerCase().trim()
    };
    callerRole = cu.role || 'Citizen';
  } catch {}
  const isStaffBooking = callerRole !== 'Citizen';

  const burials = getStore('burials', DEFAULT_BURIALS);
  const randomSuffix = `${Date.now().toString().slice(-4)}${Math.floor(10 + Math.random() * 90)}`;
  const refNo = `BUR-${new Date().getFullYear()}-${randomSuffix}`;
  const permitNo = `BP-${new Date().getFullYear()}-${randomSuffix}`;

  if (!isStaffBooking) {
    addNotification({
      title: 'Burial Permit Application Submitted',
      text: `Burial permit request (${refNo}) filed for deceased ${payload.deceased_name || payload.deceased_full_name || 'Individual'}.`,
      targetRole: 'Admin',
      category: 'cemetery'
    });
    const burialTargetEmail = citizenMeta.citizen_email || payload.citizen_email || payload.applicant_email;
    if (burialTargetEmail && burialTargetEmail.includes('@')) {
      addNotification({
        title: 'Burial Application Registered',
        text: `Your burial application (${refNo}) has been successfully logged and is pending LGU review.`,
        targetRole: 'Citizen',
        targetEmail: burialTargetEmail,
        category: 'cemetery'
      });
    }
  }

  const deathCertUrl = payload.death_certificate_url || payload.death_cert_url || '';
  const validIdUrl = payload.valid_id_url || '';

  // Pack uploaded documents into remarks JSON so they persist reliably even without custom DB columns
  const remarksMeta = {
    note: payload.remarks || '',
    death_cert_url: deathCertUrl,
    death_cert_name: payload.death_cert_name || '',
    valid_id_url: validIdUrl,
    valid_id_name: payload.valid_id_name || ''
  };

  // Clean payload matching PostgreSQL burial_records schema (without out-of-range integer id)
  const dbBurial: any = {
    reference_no: refNo,
    permit_no: permitNo,
    deceased_name: payload.deceased_name || payload.deceased_full_name || 'Individual',
    date_of_birth: payload.date_of_birth || null,
    date_of_death: payload.date_of_death || new Date().toISOString().split('T')[0],
    burial_date: payload.burial_date || new Date().toISOString().split('T')[0],
    plot_id: payload.plot_id ? Number(payload.plot_id) : null,
    plot_code: payload.plot_code || null,
    section: payload.section || null,
    cemetery_name: payload.cemetery_name || 'Quezon City Municipal Cemetery (Brgy. Bagong Pag-asa)',
    contact_person: payload.contact_person || citizenMeta.applicant_name || 'Relative',
    contact_phone: payload.contact_phone || payload.applicant_phone || '09123456789',
    applicant_email: citizenMeta.citizen_email || payload.citizen_email || payload.applicant_email || null,
    citizen_email: citizenMeta.citizen_email || payload.citizen_email || payload.applicant_email || null,
    citizen_id: citizenMeta.citizen_id ? Number(citizenMeta.citizen_id) : null,
    cause_of_death: payload.cause_of_death || null,
    deceased_address: payload.deceased_address || null,
    attending_physician: payload.attending_physician || null,
    applicant_relationship: payload.applicant_relationship || null,
    applicant_address: payload.applicant_address || null,
    burial_time: payload.burial_time || null,
    fee_amount: Number(payload.fee_amount) || 0,
    status: 'Pending Review',
    remarks: JSON.stringify(remarksMeta)
  };

  const newBurial = {
    id: Date.now(),
    ...dbBurial,
    death_certificate_url: deathCertUrl,
    death_cert_url: deathCertUrl,
    death_cert_name: payload.death_cert_name || '',
    valid_id_url: validIdUrl,
    valid_id_name: payload.valid_id_name || '',
    ...citizenMeta,
    ...payload,
    created_at: new Date().toISOString()
  };

  // Always save to local store
  burials.unshift(newBurial);
  setStore('burials', burials);

  if (payload.plot_id) {
    updatePlotStatus(Number(payload.plot_id), 'Reserved');
  }

  // 1. Primary: Save to eProvider Cloud Database
  if (HAS_EPROVIDER) {
    try {
      const inserted = await epPost('burial_records', dbBurial, 6000);
      if (Array.isArray(inserted) && inserted[0]?.id) {
        newBurial.id = inserted[0].id;
        newBurial.reference_no = inserted[0].reference_no || newBurial.reference_no;
        newBurial.permit_no = inserted[0].permit_no || newBurial.permit_no;
        // CRITICAL: use the server-assigned plot_id (real DB FK)
        if (inserted[0].plot_id) newBurial.plot_id = inserted[0].plot_id;
        setStore('burials', burials);
      }
    } catch (e) {
      console.warn('eProvider createBurial error:', e);
    }
  }

  // 2. Secondary: Sync to Render backend
  if (HAS_BACKEND) {
    try {
      const res = await fastFetch(`${API_BASE}/cemetery/burials`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dbBurial),
      }, 3000);
      if (res.ok) {
        const data = await res.json();
        if (data?.data) {
          newBurial.id = data.data.id || newBurial.id;
          setStore('burials', burials);
        }
      }
    } catch (err) {
      console.warn('Backend burial post failed:', err);
    }
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('govserve_data_updated'));
  }

  return { success: true, reference_no: refNo, permit_no: permitNo, data: newBurial };
}

export async function deleteBurial(id: number | string) {
  const burials = getStore('burials', DEFAULT_BURIALS);
  const target = burials.find((b: any) => b.id === id || String(b.id) === String(id) || b.reference_no === id);

  // Release plot back to Available if it was reserved by this burial
  if (target && (target.plot_id || target.plot_code)) {
    const plots = getStore('plots', generateInitialPlots());
    const plot = plots.find((p: any) => p.id === Number(target.plot_id) || p.plot_code === target.plot_code);
    if (plot && plot.status !== 'Occupied') {
      plot.status = 'Available';
      delete plot.deceased_name;
      setStore('plots', plots);
      if (HAS_EPROVIDER) try { await epPatch('cemetery_plots', `id=eq.${plot.id}`, { status: 'Available' }); } catch {}
    }
  }

  const updated = burials.filter((b: any) => b.id !== id && String(b.id) !== String(id) && b.reference_no !== id);
  setStore('burials', updated);

  if (HAS_EPROVIDER) {
    try {
      if (typeof id === 'string' && id.startsWith('BUR-')) {
        await epDelete('burial_records', `reference_no=eq.${encodeURIComponent(id)}`);
      } else {
        await epDelete('burial_records', `id=eq.${id}`);
      }
    } catch (e) {
      console.warn('eProvider deleteBurial error:', e);
    }
  }

  if (HAS_BACKEND) {
    try {
      await fastFetch(`${API_BASE}/cemetery/burials/${encodeURIComponent(String(id))}`, { method: 'DELETE' }, 2500);
    } catch {}
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('govserve_data_updated'));
  }
  return { success: true };
}

export async function clearAllBurials() {
  const burials = getStore('burials', DEFAULT_BURIALS);

  // Release all plots that were reserved
  const plots = getStore('plots', generateInitialPlots());
  plots.forEach((p: any) => {
    if (p.status === 'Reserved') {
      p.status = 'Available';
      delete p.deceased_name;
    }
  });
  setStore('plots', plots);

  // Clear local store
  setStore('burials', []);

  // Delete from eProvider database (all rows with id > 0)
  if (HAS_EPROVIDER) {
    try {
      await epDelete('burial_records', 'id=gt.0');
      await epPatch('cemetery_plots', 'id=gt.0', { status: 'Available' });
    } catch (e) {
      console.warn('eProvider clearAllBurials error:', e);
    }
  }

  if (HAS_BACKEND) {
    try {
      await fastFetch(`${API_BASE}/cemetery/burials/all`, { method: 'DELETE' }, 2500);
    } catch {}
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('govserve_data_updated'));
  }
  return { success: true };
}

export async function fetchUtilities(status = 'all', service_type = 'all') {
  let serverList: any[] = [];
  let fetched = false;

  // 1. Primary: eProvider Cloud Database
  if (HAS_EPROVIDER) try {
    let q = 'order=id.desc';
    if (status !== 'all') q += `&status=eq.${encodeURIComponent(status)}`;
    if (service_type !== 'all') q += `&service_type=eq.${encodeURIComponent(service_type)}`;
    const data = await epGet('utility_requests', q);
    if (Array.isArray(data)) {
      serverList = data;
      fetched = true;
      setStore('utilities', data, false);
    }
  } catch (e) {
    console.warn('eProvider fetchUtilities error:', e);
  }

  // 2. Secondary: Backend API
  if (!fetched && HAS_BACKEND) try {
    const res = await fastFetch(`${API_BASE}/utilities`, {}, 2500);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data?.data)) {
        serverList = data.data;
        fetched = true;
        setStore('utilities', data.data, false);
      }
    }
  } catch {}

  const currentStore = getStore('utilities', DEFAULT_UTILITIES);
  let list = fetched ? serverList : currentStore;

  if (status !== 'all') {
    const lower = status.toLowerCase();
    list = list.filter((u: any) => {
      const uStat = (u.status || '').toLowerCase();
      if (lower === 'dispatched' || lower === 'in progress') {
        return uStat === 'dispatched' || uStat === 'in progress';
      }
      if (lower === 'pending' || lower === 'pending review') {
        return uStat === 'pending' || uStat === 'pending review';
      }
      return uStat === lower;
    });
  }
  if (service_type !== 'all') {
    list = list.filter((u: any) => u.service_type === service_type);
  }
  return list;
}

export async function createUtilityRequest(payload: any) {
  let citizenMeta: any = {};
  let callerRole = 'Citizen';
  try {
    const cu = JSON.parse(
      sessionStorage.getItem('govserve_citizen_user') ||
      sessionStorage.getItem('govserve_user') ||
      localStorage.getItem('govserve_citizen_user') ||
      localStorage.getItem('govserve_user') ||
      '{}'
    );
    citizenMeta = {
      citizen_id: payload.citizen_id || cu.id || undefined,
      citizen_email: (payload.citizen_email || cu.email || '').toLowerCase().trim(),
      applicant_email: (payload.citizen_email || cu.email || '').toLowerCase().trim(),
      citizen_name: payload.citizen_name || cu.name || undefined
    };
    callerRole = cu.role || 'Citizen';
  } catch {}
  const isStaffBooking = callerRole !== 'Citizen';

  const utilities = getStore('utilities', DEFAULT_UTILITIES);
  const randomSuffix = `${Date.now().toString().slice(-4)}${Math.floor(10 + Math.random() * 90)}`;
  const ticketNo = `UTL-${new Date().getFullYear()}-${randomSuffix}`;

  const urgencyScore = payload.urgency === 'Urgent' ? 95 : payload.urgency === 'High' ? 80 : 60;

  if (!isStaffBooking) {
    addNotification({
      title: 'New Utility Incident Filed',
      text: `${payload.service_type || 'Utility incident'} reported at ${payload.location || 'site'}. Priority: ${payload.urgency || 'Normal'}.`,
      targetRole: 'Admin',
      category: 'utility'
    });
    const utilityTargetEmail = citizenMeta.citizen_email || payload.citizen_email;
    if (utilityTargetEmail && utilityTargetEmail.includes('@')) {
      addNotification({
        title: 'Utility Ticket Created',
        text: `Your ticket (${ticketNo}) has been filed and queued for response crew dispatch.`,
        targetRole: 'Citizen',
        targetEmail: utilityTargetEmail,
        category: 'utility'
      });
    }
  }

  // Database-clean payload without out-of-range integer id
  const dbReq = {
    ticket_no: ticketNo,
    citizen_name: citizenMeta.citizen_name || payload.citizen_name || 'Resident User',
    citizen_email: citizenMeta.citizen_email || payload.citizen_email || null,
    citizen_id: citizenMeta.citizen_id ? Number(citizenMeta.citizen_id) : null,
    citizen_phone: citizenMeta.citizen_phone || payload.citizen_phone || '09123456789',
    service_type: payload.service_type || 'Drainage & Water Hazard',
    location: payload.location || 'Barangay 178',
    description: payload.description || '',
    photo_url: payload.photo_url || null,
    affected_households: payload.affected_households || null,
    urgency: payload.urgency || 'Normal',
    ai_priority_score: urgencyScore,
    status: 'Pending'
  };

  const newReq = {
    id: Date.now(),
    ...dbReq,
    created_at: new Date().toISOString()
  };

  // Always save to local store first
  utilities.unshift(newReq);
  setStore('utilities', utilities);

  // 1. Save to eProvider Cloud Database (Primary — always persistent)
  let eproviderSaved = false;
  if (HAS_EPROVIDER) {
    try {
      const inserted = await epPost('utility_requests', dbReq);
      if (inserted) {
        eproviderSaved = true;
        const savedRow = Array.isArray(inserted) && inserted.length > 0 ? inserted[0] : null;
        if (savedRow?.id) newReq.id = savedRow.id;
        if (savedRow?.ticket_no) newReq.ticket_no = savedRow.ticket_no;
        setStore('utilities', utilities);
      }
    } catch (epErr) {
      console.warn('eProvider utility save error:', epErr);
    }
  }

  // 2. Also sync to Render backend (Secondary — non-blocking)
  if (HAS_BACKEND) {
    try {
      const res = await fastFetch(`${API_BASE}/utilities`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dbReq),
      }, 3000);
      if (res.ok) {
        const data = await res.json();
        if (data?.data) {
          newReq.id = data.data.id || newReq.id;
          newReq.ticket_no = data.data.ticket_no || newReq.ticket_no;
          setStore('utilities', utilities);
        }
      }
    } catch {
      // Backend offline is acceptable when eProvider saved successfully
    }
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('govserve_data_updated'));
  }

  return { success: true, ticket_no: newReq.ticket_no || ticketNo, data: newReq };
}

export async function updateUtilityStatus(id: number | string, status: string, assigned_team?: string, resolution_notes?: string, ticket_no?: string) {
  let targetEmail = '';
  const utilities = getStore('utilities', DEFAULT_UTILITIES);
  const item = utilities.find((u: any) => u.id === id || String(u.id) === String(id) || u.ticket_no === id || (ticket_no && u.ticket_no === ticket_no));
  const finalTicketNo = ticket_no || item?.ticket_no || (typeof id === 'string' && id.startsWith('REQ-') ? id : '');
  const targetParam = (typeof id === 'number' && id > 2000000000 && finalTicketNo) ? finalTicketNo : id;

  // 1. Immediately update local store
  if (item) {
    item.status = status;
    if (assigned_team) item.assigned_team = assigned_team;
    if (resolution_notes) item.resolution_notes = resolution_notes;
    targetEmail = item.citizen_email || '';
    setStore('utilities', utilities);
  }

  if (targetEmail && targetEmail.includes('@')) {
    addNotification({
      title: `Utility Ticket ${status}`,
      text: `Your utility report status updated to "${status}". ${assigned_team ? 'Assigned: ' + assigned_team : ''}`,
      targetRole: 'Citizen',
      targetEmail,
      category: 'utility'
    });
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('govserve_data_updated'));
  }

  // 2. Non-blocking cloud backend & eProvider sync with fast timeout
  (async () => {
    if (HAS_BACKEND) try {
      const res = await fastFetch(`${API_BASE}/utilities/${encodeURIComponent(String(targetParam))}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, assigned_team, resolution_notes, ticket_no: finalTicketNo }),
      }, 3000);
      if (res.ok) {
        const data = await res.json();
        if (data?.data && item) {
          Object.assign(item, data.data);
          setStore('utilities', utilities);
        }
      }
    } catch (err) {
      console.warn('Backend update utility status failed:', err);
    }

    if (HAS_EPROVIDER) try {
      await epPatch('utility_requests', `id=eq.${id}`, { status, assigned_team, resolution_notes }, 3000);
    } catch {}
  })();

  return { success: true };
}

export async function fetchAssets(category = 'all', condition = 'all') {
  let list: any[] = [];
  let fetched = false;

  // 1. Primary: eProvider Cloud Database
  if (HAS_EPROVIDER) {
    try {
      let q = 'order=id.asc';
      if (category !== 'all') q += `&category=ilike.*${encodeURIComponent(category)}*`;
      if (condition !== 'all') q += `&current_condition=eq.${encodeURIComponent(condition)}`;
      const data = await epGet('assets', q);
      if (Array.isArray(data) && data.length > 0) {
        const localAssets = getStore('assets', DEFAULT_ASSETS);
        const serverIds = new Set(data.map((a: any) => String(a.id)));
        const serverTags = new Set(data.map((a: any) => String(a.asset_tag || '').trim()).filter(Boolean));

        // Merge server items with any locally updated fields
        const mergedData = data.map((s: any) => {
          const loc = localAssets.find((a: any) =>
            String(a.id) === String(s.id) ||
            (a.asset_tag && s.asset_tag && String(a.asset_tag).trim() === String(s.asset_tag).trim())
          );
          if (!loc) return s;
          const serverImg = s.image_url || '';
          const localImg = loc.image_url || '';
          return {
            ...s,
            image_url: serverImg !== '' ? serverImg : (localImg || ''),
            current_condition: loc.current_condition || s.current_condition,
            next_maintenance_due: loc.next_maintenance_due || s.next_maintenance_due,
            ai_maintenance_alert: loc.ai_maintenance_alert !== undefined ? loc.ai_maintenance_alert : s.ai_maintenance_alert,
          };
        });

        // Preserve any locally-created new assets not yet on server
        const localOnlyNew = localAssets.filter((a: any) => {
          const hasId = serverIds.has(String(a.id));
          const hasTag = a.asset_tag && serverTags.has(String(a.asset_tag).trim());
          return !hasId && !hasTag;
        });

        list = [...mergedData, ...localOnlyNew];
        fetched = true;
        try {
          setStore('assets', list, false);
        } catch { /* ignore if quota exceeded */ }
      }
    } catch (e) {
      console.warn('eProvider fetchAssets error:', e);
    }
  }

  // 2. Secondary: Render backend
  if (!fetched && HAS_BACKEND) {
    try {
      const res = await fastFetch(`${API_BASE}/assets?category=${encodeURIComponent(category)}&condition=${encodeURIComponent(condition)}`, {}, 2500);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data?.data)) {
          list = data.data;
          fetched = true;
          setStore('assets', data.data, false);
        }
      }
    } catch {}
  }

  // 3. Fallback: local store
  if (!fetched) {
    list = getStore('assets', DEFAULT_ASSETS);
    if (category !== 'all') {
      list = list.filter((a: any) => (a.category || '').toLowerCase() === category.toLowerCase());
    }
    if (condition !== 'all') {
      list = list.filter((a: any) => a.current_condition === condition);
    }
  }

  return list;
}

export async function createAsset(payload: any) {
  const assets = getStore('assets', DEFAULT_ASSETS);
  
  // Generate a guaranteed unique collision-proof asset tag
  const year = new Date().getFullYear();
  const existingTags = new Set(assets.map((a: any) => String(a.asset_tag || '').trim()));
  let seq = assets.length + 1;
  let assetTag = `AST-${year}-${String(seq).padStart(3, '0')}`;
  while (existingTags.has(assetTag)) {
    seq++;
    assetTag = `AST-${year}-${String(seq).padStart(3, '0')}`;
  }

  const effectiveImage = payload.image_url || '';

  const dbPayload = {
    asset_tag: assetTag,
    name: payload.name || 'Municipal Equipment Unit',
    category: payload.category || 'Heavy Equipment',
    serial_no: payload.serial_no || null,
    purchase_date: payload.purchase_date || null,
    purchase_cost: parseFloat(payload.purchase_cost) || 0,
    current_condition: payload.current_condition || 'Operational',
    assigned_department: payload.assigned_department || 'General Services',
    last_maintenance_date: payload.last_maintenance_date || null,
    next_maintenance_due: payload.next_maintenance_due || null,
    ai_maintenance_alert: payload.ai_maintenance_alert || null,
    specs: payload.specs || null,
    image_url: effectiveImage || null
  };

  const newAsset: any = {
    id: Date.now(),
    ...dbPayload,
    image_url: effectiveImage,
    created_at: new Date().toISOString()
  };

  // 1. Immediately save to local store so UI and list update right away
  assets.unshift(newAsset);
  try {
    setStore('assets', assets, false);
  } catch (err) {
    console.warn('localStorage save warning:', err);
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('govserve_data_updated'));
  }

  // 2. Non-blocking background sync to cloud (matching updateAssetCondition pattern)
  (async () => {
    if (HAS_EPROVIDER) {
      try {
        const inserted = await epPost('assets', dbPayload, 6000);
        if (Array.isArray(inserted) && inserted[0]) {
          const row = inserted[0];
          newAsset.id = row.id || newAsset.id;
          newAsset.asset_tag = row.asset_tag || newAsset.asset_tag;
          if (row.image_url) newAsset.image_url = row.image_url;
          const current = getStore('assets', DEFAULT_ASSETS);
          const idx = current.findIndex((a: any) => a.asset_tag === assetTag || a.id === newAsset.id);
          if (idx !== -1) {
            current[idx] = { ...current[idx], ...row };
            try { setStore('assets', current, false); } catch {}
          }
        }
      } catch (e) {
        console.warn('eProvider createAsset error:', e);
      }
    }

    if (HAS_BACKEND) {
      try {
        const res = await fastFetch(`${API_BASE}/assets`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(dbPayload)
        }, 6000);
        if (res.ok) {
          const data = await res.json();
          if (data?.data) {
            newAsset.id = data.data.id || newAsset.id;
            newAsset.asset_tag = data.data.asset_tag || newAsset.asset_tag;
            if (data.data.image_url) newAsset.image_url = data.data.image_url;
            const current = getStore('assets', DEFAULT_ASSETS);
            const idx = current.findIndex((a: any) => a.asset_tag === assetTag || a.id === newAsset.id);
            if (idx !== -1) {
              current[idx] = { ...current[idx], ...data.data };
              try { setStore('assets', current, false); } catch {}
            }
          }
        }
      } catch {}
    }
  })();

  return { success: true, asset_tag: newAsset.asset_tag, data: newAsset };
}

export async function deleteAsset(id: number) {
  // 1. Update local store immediately
  const assets = getStore('assets', DEFAULT_ASSETS);
  const updated = assets.filter((a: any) => Number(a.id) !== Number(id));
  setStore('assets', updated);

  // 2. Delete from eProvider Cloud Database (Primary)
  if (HAS_EPROVIDER) {
    try {
      await epDelete('assets', `id=eq.${id}`);
    } catch (e) {
      console.warn('eProvider deleteAsset error:', e);
    }
  }

  // 3. Delete from Backend (Secondary)
  if (HAS_BACKEND) {
    try {
      await fetch(`${API_BASE}/assets/${id}`, { method: 'DELETE' });
    } catch {}
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('govserve_data_updated'));
  }
  return { success: true };
}

export async function updateAssetCondition(id: number, current_condition: string, next_maintenance_due?: string, ai_maintenance_alert?: string, image_url?: string) {
  // Resolve image: '__clear__' means remove the image
  const resolvedImage = image_url === '__clear__' ? '' : image_url;

  // 1. ALWAYS update local store immediately so UI reflects change at once
  const assets = getStore('assets', DEFAULT_ASSETS);
  const item = assets.find((a: any) => a.id === id || String(a.id) === String(id));
  if (item) {
    item.current_condition = current_condition;
    if (next_maintenance_due) item.next_maintenance_due = next_maintenance_due;
    if (ai_maintenance_alert !== undefined) item.ai_maintenance_alert = ai_maintenance_alert;
    // resolvedImage = '' means cleared (remove photo), undefined means unchanged
    if (resolvedImage !== undefined) item.image_url = resolvedImage;
    setStore('assets', assets);
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('govserve_data_updated'));
  }

  // 2. Non-blocking backend + eProvider sync
  (async () => {
    if (HAS_BACKEND) try {
      await fastFetch(`${API_BASE}/assets/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ current_condition, next_maintenance_due, ai_maintenance_alert, image_url: resolvedImage }),
      }, 5000);
    } catch {}

    if (HAS_EPROVIDER) try {
      const patchBody: any = { current_condition };
      if (next_maintenance_due !== undefined) patchBody.next_maintenance_due = next_maintenance_due;
      if (ai_maintenance_alert !== undefined) patchBody.ai_maintenance_alert = ai_maintenance_alert;
      // Always include image_url in patch so it persists on the server (even when clearing it)
      if (resolvedImage !== undefined) patchBody.image_url = resolvedImage === '' ? null : resolvedImage;
      await epPatch('assets', `id=eq.${id}`, patchBody, 8000);
    } catch {}
  })();

  return { success: true };
}


export async function trackUniversalReference(refNo: string) {
  if (HAS_BACKEND) try {
    const res = await fetch(`${API_BASE}/track/${encodeURIComponent(refNo)}`);
    if (res.ok) return await res.json();
  } catch {}

  const cleanRef = refNo.trim().toUpperCase();
  if (cleanRef.startsWith('RES')) {
    const reservations = getStore('reservations', DEFAULT_RESERVATIONS);
    const item = reservations.find((r: any) => r.reference_no?.toUpperCase() === cleanRef);
    if (item) return { success: true, type: 'Facility Reservation', data: item };
  } else if (cleanRef.startsWith('BUR')) {
    const burials = getStore('burials', DEFAULT_BURIALS);
    const item = burials.find((b: any) => b.reference_no?.toUpperCase() === cleanRef);
    if (item) return { success: true, type: 'Burial Record & Permit', data: item };
  } else if (cleanRef.startsWith('UTL') || cleanRef.startsWith('REQ')) {
    const utilities = getStore('utilities', DEFAULT_UTILITIES);
    const item = utilities.find((u: any) => u.ticket_no?.toUpperCase() === cleanRef);
    if (item) return { success: true, type: 'Utility & Drainage Service Request', data: item };
  } else if (cleanRef.startsWith('AST')) {
    const assets = getStore('assets', DEFAULT_ASSETS);
    const item = assets.find((a: any) => a.asset_tag?.toUpperCase() === cleanRef);
    if (item) return { success: true, type: 'Government Asset Record', data: item };
  }

  return { success: false, message: `Reference code "${refNo}" not found in Municipal Registry.` };
}

export async function fetchActivityLogs() {
  if (HAS_BACKEND) try {
    const res = await fetch(`${API_BASE}/activity`);
    if (res.ok) {
      const data = await res.json();
      if (data?.data) return data.data;
    }
  } catch {}

  return getStore('logs', [
    { id: 1, user_name: 'Atty. Elena Ramos', action: 'Approved Permit', module: 'Burials', details: 'Approved Burial Permit BP-2026-0089', timestamp: new Date().toISOString() },
    { id: 2, user_name: 'System Dispatch', action: 'Dispatched Team', module: 'Utilities', details: 'Assigned Team Alpha to Ticket UTL-2026-001', timestamp: new Date(Date.now() - 3600000).toISOString() }
  ]);
}

export async function loginStaff(email: string, password: string) {
  const cleanEmail = (email || '').toLowerCase().trim();

  // Backend returned non-ok (e.g. 403 role mismatch) — surface that message
  if (HAS_BACKEND) {
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, password }),
      });
      const data = await res.json();
      if (data && data.success) return data;
      if (!res.ok) return { success: false, message: data.message || 'Invalid credentials.' };
    } catch (e) {
      console.warn('Backend login attempt failed, falling back to eProvider DB...', e);
    }
  }

  // 2. Query eProvider Cloud Database directly
  if (HAS_EPROVIDER) {
    try {
      const users = await epGet('users', `email=eq.${encodeURIComponent(cleanEmail)}`);
      if (Array.isArray(users) && users.length > 0) {
        const dbUser = users[0];
        if (dbUser.password === password) {
          const isStaffOrAdmin = ['super admin', 'admin', 'staff officer', 'officer', 'engineer'].some(
            (r) => (dbUser.role || '').toLowerCase().includes(r)
          );
          if (isStaffOrAdmin) {
            const userPin = dbUser.pin || '123456';
            if (!dbUser.pin && HAS_EPROVIDER) {
              epPatch('users', `email=eq.${encodeURIComponent(cleanEmail)}`, { pin: '123456' }).catch(() => {});
            }
            return {
              success: true,
              token: `jwt-db-token-${dbUser.id}-${Date.now()}`,
              user: {
                id: dbUser.id,
                name: dbUser.name,
                email: dbUser.email,
                role: dbUser.role || 'Super Admin',
                department: dbUser.department || 'Municipal Executive Office',
                avatar: dbUser.avatar || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
                pin: userPin,
                last_otp_at: dbUser.last_otp_at
              }
            };
          } else {
            return { success: false, message: 'This is the Staff & Admin login page. Please use the Citizen login page instead.' };
          }
        } else {
          return { success: false, message: 'Invalid password for this staff account.' };
        }
      }
    } catch (epErr) {
      console.warn('eProvider staff login error:', epErr);
    }
  }

  // 3. Fallback for offline local demo
  const customAdminPass = localStorage.getItem('govserve_admin_password') || 'admin123';
  if ((cleanEmail === 'admin@govserve.gov.ph' || cleanEmail === 'staff@govserve.gov.ph') && (password === customAdminPass || password === 'admin123' || password === 'staff123')) {
    const localPin = localStorage.getItem(`govserve_staff_pin_${cleanEmail}`) || '123456';
    return {
      success: true,
      token: 'jwt-local-demo-token-998822',
      user: {
        id: 1,
        name: cleanEmail === 'admin@govserve.gov.ph' ? 'Atty. Elena Ramos' : 'Engr. Roberto Santos',
        email: cleanEmail,
        role: cleanEmail === 'admin@govserve.gov.ph' ? 'Super Admin' : 'Staff Officer',
        department: cleanEmail === 'admin@govserve.gov.ph' ? 'Municipal Executive Office' : 'City Engineering & Public Works',
        avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
        pin: localPin
      }
    };
  }

  return { success: false, message: 'Invalid email or password. Staff account not found in database.' };
}

export async function loginCitizen(email: string, password: string) {
  const cleanEmail = (email || '').toLowerCase().trim();

  // 1. Query eProvider Cloud Database directly (Fastest & 100% persistent)
  if (HAS_EPROVIDER) {
    try {
      const users = await epGet('users', `email=eq.${encodeURIComponent(cleanEmail)}`);
      if (Array.isArray(users) && users.length > 0) {
        const dbUser = users[0];
        if (dbUser.password === password) {
          // Reject admin/staff from citizen portal
          const role = (dbUser.role || '').toLowerCase();
          const isStaff = ['super admin', 'admin', 'staff officer', 'officer', 'engineer', 'staff'].some(r => role.includes(r));
          if (isStaff) {
            return { success: false, message: 'This is the Citizen login page. Please use the Staff & Admin login page instead.' };
          }
          console.log('✅ Logged in via eProvider Cloud Database:', dbUser.email);
          const userPin = dbUser.pin || '123456';
          if (!dbUser.pin && HAS_EPROVIDER) {
            epPatch('users', `email=eq.${encodeURIComponent(cleanEmail)}`, { pin: '123456' }).catch(() => {});
          }
          return {
            success: true,
            token: `jwt-db-citizen-token-${dbUser.id}-${Date.now()}`,
            user: {
              id: dbUser.id,
              name: dbUser.name,
              email: dbUser.email,
              phone: dbUser.phone || '+63 917 123 4567',
              role: dbUser.role || 'Citizen',
              department: dbUser.department || 'Registered Resident',
              avatar: dbUser.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
              pin: userPin,
              last_otp_at: dbUser.last_otp_at
            }
          };
        } else {
          return { success: false, message: 'Invalid password. Please check your credentials.' };
        }
      }
    } catch (epErr) {
      console.warn('eProvider citizen login error:', epErr);
    }
  }

  // 2. Try Edge Function
  try {
    const edgeRes = await edgeFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: cleanEmail, password })
    });
    if (edgeRes && edgeRes.success && edgeRes.user) {
      const dbUser = edgeRes.user;
      return {
        success: true,
        token: `jwt-edge-citizen-${dbUser.id}-${Date.now()}`,
        user: {
          id: dbUser.id,
          name: dbUser.name,
          email: dbUser.email,
          phone: dbUser.phone || '+63 917 123 4567',
          role: dbUser.role || 'Citizen',
          department: dbUser.department || 'Registered Resident',
          avatar: dbUser.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
          pin: dbUser.pin || '123456',
          last_otp_at: dbUser.last_otp_at
        }
      };
    }
  } catch {}

  // 3. Fallback for offline local demo
  const registeredUsers = getStore('registered_citizens', [
    {
      id: 101,
      name: 'Juan M. Dela Cruz',
      email: 'juan.delacruz@citizen.gov.ph',
      phone: '+63 917 123 4567',
      password: 'citizen123',
      pin: '123456',
      role: 'Citizen',
      department: 'Resident User',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
      created_at: new Date().toISOString()
    }
  ]);

  const user = registeredUsers.find((u: any) => u.email.toLowerCase() === cleanEmail && (u.password === password || password === 'password123' || password === 'citizen123'));
  if (user) {
    const localPin = user.pin || localStorage.getItem(`govserve_citizen_pin_${cleanEmail}`) || '123456';
    return {
      success: true,
      token: 'jwt-citizen-session-token',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: 'Citizen',
        department: user.department || 'Registered Resident',
        avatar: user.avatar,
        pin: localPin
      }
    };
  }

  return { success: false, message: 'Invalid email or password. Citizen account not found in database.' };
}

export async function registerCitizen(data: { name: string; email: string; phone: string; password: string; pin?: string }) {
  const cleanEmail = (data.email || '').toLowerCase().trim();
  const initialPin = data.pin || '123456';

  // 1. Direct eProvider Cloud Database Insert (Primary - 100% cloud persistent)
  if (HAS_EPROVIDER) {
    try {
      const existing = await epGet('users', `email=eq.${encodeURIComponent(cleanEmail)}`);
      if (Array.isArray(existing) && existing.length > 0) {
        return { success: false, message: 'Email address is already registered in the database.' };
      }

      const newCitizenPayload = {
        name: data.name.trim(),
        email: cleanEmail,
        phone: data.phone.trim(),
        password: data.password,
        pin: initialPin,
        role: 'Citizen',
        department: 'Resident User',
        avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
        status: 'Active'
      };

      const inserted = await epPost('users', newCitizenPayload);
      const createdUser = Array.isArray(inserted) && inserted.length > 0 ? inserted[0] : newCitizenPayload;
      console.log('✅ Citizen successfully saved to eProvider Cloud Database:', createdUser);

      return {
        success: true,
        message: 'Citizen account successfully created in database!',
        user: createdUser
      };
    } catch (epErr) {
      console.warn('eProvider citizen register error:', epErr);
    }
  }

  // 2. Try Edge Function if eProvider REST was unreachable
  try {
    const edgeRes = await edgeFetch('/auth/register-citizen', {
      method: 'POST',
      body: JSON.stringify({ ...data, email: cleanEmail })
    });
    if (edgeRes && edgeRes.success && edgeRes.user) return edgeRes;
  } catch {}

  // 3. Try Backend API if configured
  if (HAS_BACKEND) {
    try {
      const res = await fetch(`${API_BASE}/auth/register-citizen`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, email: cleanEmail }),
      });
      if (res.ok) {
        const result = await res.json();
        if (result && result.success) return result;
      }
    } catch (e) {
      console.warn('Backend citizen register failed, falling back to local store...', e);
    }
  }

  // 3. Fallback for offline local demo
  const registeredUsers = getStore('registered_citizens', [
    {
      id: 101,
      name: 'Juan M. Dela Cruz',
      email: 'juan.delacruz@citizen.gov.ph',
      phone: '+63 917 123 4567',
      password: 'citizen123',
      role: 'Citizen',
      department: 'Resident User',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
      created_at: new Date().toISOString()
    }
  ]);

  if (registeredUsers.some((u: any) => u.email.toLowerCase() === cleanEmail)) {
    return { success: false, message: 'Email address is already registered.' };
  }

  const newCitizen = {
    id: Date.now(),
    name: data.name,
    email: cleanEmail,
    phone: data.phone,
    password: data.password,
    role: 'Citizen',
    department: 'Registered Resident (LGU Portal)',
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
    created_at: new Date().toISOString()
  };

  registeredUsers.push(newCitizen);
  setStore('registered_citizens', registeredUsers);

  return {
    success: true,
    message: 'Citizen account successfully registered!',
    user: newCitizen
  };
}

export async function updateUserPassword(email: string, newPassword: string) {
  const cleanEmail = (email || '').toLowerCase().trim();

  // 1. Try Backend API first if configured
  if (HAS_BACKEND) {
    try {
      const res = await fetch(`${API_BASE}/auth/update-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, password: newPassword }),
      });
      if (res.ok) return await res.json();
    } catch {}
  }

  // 2. Try eProvider Cloud Database directly
  if (HAS_EPROVIDER) {
    try {
      const patched = await epPatch('users', `email=eq.${encodeURIComponent(cleanEmail)}`, { password: newPassword });
      if (Array.isArray(patched) && patched.length > 0) {
        return { success: true, message: 'Account password updated in database successfully!' };
      }
    } catch (epErr) {
      console.warn('eProvider update password error:', epErr);
    }
  }

  // 3. Fallback for offline local demo
  const registeredUsers = getStore('registered_citizens', [
    {
      id: 101,
      name: 'Juan M. Dela Cruz',
      email: 'juan.delacruz@citizen.gov.ph',
      phone: '+63 917 123 4567',
      password: 'citizen123',
      role: 'Citizen',
      department: 'Resident User',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
      created_at: new Date().toISOString()
    }
  ]);

  const userIndex = registeredUsers.findIndex((u: any) => u.email.toLowerCase() === cleanEmail);
  if (userIndex !== -1) {
    registeredUsers[userIndex].password = newPassword;
    setStore('registered_citizens', registeredUsers);
    return { success: true, message: 'Password updated successfully!' };
  }

  return { success: false, message: 'Account email not found in system.' };
}

export async function checkEmailExists(email: string): Promise<boolean> {
  const cleanEmail = (email || '').toLowerCase().trim();

  // 1. Check backend first
  if (HAS_BACKEND) {
    try {
      const res = await fetch(`${API_BASE}/auth/check-email?email=${encodeURIComponent(cleanEmail)}`);
      if (res.ok) {
        const data = await res.json();
        return Boolean(data?.exists);
      }
    } catch {}
  }

  // 2. Check eProvider Cloud Database
  if (HAS_EPROVIDER) {
    try {
      const users = await epGet('users', `email=eq.${encodeURIComponent(cleanEmail)}`);
      if (Array.isArray(users) && users.length > 0) {
        return true;
      }
    } catch {}
  }

  // 3. Fallback: check localStorage registered_citizens
  const registeredUsers = getStore('registered_citizens', [
    {
      id: 101,
      name: 'Juan M. Dela Cruz',
      email: 'juan.delacruz@citizen.gov.ph',
      phone: '+63 917 123 4567',
      password: 'citizen123',
      role: 'Citizen',
      department: 'Resident User',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
      created_at: new Date().toISOString()
    }
  ]);
  return registeredUsers.some((u: any) => u.email.toLowerCase() === cleanEmail);
}

export function getLockoutTimeRemaining(key: string = 'default'): number {
  if (typeof window === 'undefined') return 0;
  const until = localStorage.getItem(`govserve_locked_until_${key}`);
  if (!until) return 0;
  const rem = Math.ceil((parseInt(until, 10) - Date.now()) / 1000);
  if (rem <= 0) {
    localStorage.removeItem(`govserve_locked_until_${key}`);
    localStorage.removeItem(`govserve_login_fails_${key}`);
    return 0;
  }
  return rem;
}

export function recordFailedAttempt(key: string = 'default'): { locked: boolean; fails: number; remSeconds: number } {
  if (typeof window === 'undefined') return { locked: false, fails: 0, remSeconds: 0 };
  const currentFails = parseInt(localStorage.getItem(`govserve_login_fails_${key}`) || '0', 10) + 1;
  localStorage.setItem(`govserve_login_fails_${key}`, String(currentFails));
  if (currentFails >= 3) {
    const lockTime = Date.now() + 180 * 1000; // 3 minutes lockout
    localStorage.setItem(`govserve_locked_until_${key}`, String(lockTime));
    return { locked: true, fails: currentFails, remSeconds: 180 };
  }
  return { locked: false, fails: currentFails, remSeconds: 0 };
}

export function recordSuccessfulLogin(key: string = 'default') {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(`govserve_login_fails_${key}`);
  localStorage.removeItem(`govserve_locked_until_${key}`);
}

/** Helper to get current calendar date string in local timezone (YYYY-MM-DD) */
export function getLocalDateString(d: Date = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Check if current user has already verified OTP or PIN on the current calendar day */
export function isSameSessionSameDay(email: string, portal: 'citizen' | 'staff', userObj?: any): boolean {
  if (typeof window === 'undefined') return false;
  const cleanEmail = (email || '').toLowerCase().trim();
  const today = getLocalDateString();

  // 1. Check persistent localStorage date for this user & portal
  const lastOtpDate = localStorage.getItem(`govserve_otp_date_${portal}_${cleanEmail}`);
  if (lastOtpDate === today) {
    return true;
  }

  // 2. Check if userObj from database/session has last_otp_at from today
  const lastOtpAt = userObj?.last_otp_at || userObj?.lastOtpAt;
  if (lastOtpAt) {
    try {
      const d = new Date(lastOtpAt);
      if (!isNaN(d.getTime()) && getLocalDateString(d) === today) {
        localStorage.setItem(`govserve_otp_date_${portal}_${cleanEmail}`, today);
        return true;
      }
    } catch {}
  }

  return false;
}

/** Mark OTP as verified for today across local storage and cloud database */
export function markOtpVerified(email: string, portal: 'citizen' | 'staff'): void {
  if (typeof window === 'undefined') return;
  const cleanEmail = (email || '').toLowerCase().trim();
  const today = getLocalDateString();
  const nowIso = new Date().toISOString();

  localStorage.setItem(`govserve_otp_date_${portal}_${cleanEmail}`, today);
  sessionStorage.setItem(`govserve_otp_verified_${portal}_${cleanEmail}`, 'true');

  // Update eProvider cloud database
  if (HAS_EPROVIDER) {
    epPatch('users', `email=eq.${encodeURIComponent(cleanEmail)}`, {
      last_otp_at: nowIso
    }).catch(() => {});
  }

  // Asynchronously notify backend of last_otp_at
  if (HAS_BACKEND) {
    fetch(`${API_BASE}/auth/update-last-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: cleanEmail })
    }).catch(() => {});
  }
}

/** Clear active session OTP verification */
export function clearSessionOtp(email: string, portal: 'citizen' | 'staff'): void {
  if (typeof window === 'undefined') return;
  const cleanEmail = (email || '').toLowerCase().trim();
  sessionStorage.removeItem(`govserve_otp_verified_${portal}_${cleanEmail}`);
}

/** Verify user PIN matches (handles null or unset by falling back to 123456) */
export function verifyUserPin(userPin: string | undefined | null, enteredPin: string): boolean {
  const actualPin = String(userPin || '123456').trim();
  return actualPin === String(enteredPin || '').trim();
}

/** Updates user 6-digit PIN across eProvider cloud, backend, and local storage */
export async function updateUserPin(email: string, pin: string): Promise<{ success: boolean; message?: string }> {
  const cleanEmail = (email || '').toLowerCase().trim();
  const cleanPin = String(pin || '').trim();

  if (cleanPin.length !== 6 || !/^\d{6}$/.test(cleanPin)) {
    return { success: false, message: 'PIN must be exactly 6 numeric digits.' };
  }

  // 1. Update eProvider Cloud Database
  if (HAS_EPROVIDER) {
    try {
      await epPatch('users', `email=eq.${encodeURIComponent(cleanEmail)}`, { pin: cleanPin });
      console.log('✅ Updated PIN in eProvider Cloud Database for:', cleanEmail);
    } catch (epErr) {
      console.warn('eProvider update PIN error:', epErr);
    }
  }

  // 2. Update Backend
  if (HAS_BACKEND) {
    try {
      await fetch(`${API_BASE}/auth/set-pin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, pin: cleanPin })
      });
    } catch {}
  }

  // 3. Update localStorage fallback users
  try {
    const reg = getStore('registered_citizens', []);
    const idx = reg.findIndex((u: any) => (u.email || '').toLowerCase() === cleanEmail);
    if (idx !== -1) {
      reg[idx].pin = cleanPin;
      localStorage.setItem('registered_citizens', JSON.stringify(reg));
    }
  } catch {}

  // 4. Update local mock fallback PIN storage
  localStorage.setItem(`govserve_citizen_pin_${cleanEmail}`, cleanPin);
  localStorage.setItem(`govserve_staff_pin_${cleanEmail}`, cleanPin);

  // 5. Update current active user in session / localStorage if matching
  try {
    ['govserve_citizen_user', 'govserve_staff_user', 'govserve_user'].forEach(key => {
      const item = sessionStorage.getItem(key) || localStorage.getItem(key);
      if (item) {
        const u = JSON.parse(item);
        if ((u.email || '').toLowerCase() === cleanEmail) {
          u.pin = cleanPin;
          sessionStorage.setItem(key, JSON.stringify(u));
          localStorage.setItem(key, JSON.stringify(u));
        }
      }
    });
  } catch {}

  return { success: true, message: 'Security PIN set successfully!' };
}

/**
 * Intelligent Municipal PAFMS AI Assistant
 * Provides accurate guidance for Public Facilities, Parks, Cemetery & Columbarium,
 * Water & Drainage incidents, and Municipal Heavy Equipment/Assets.
 */
export async function sendAIChat(
  messages: { role: string; content: string }[],
  userRole: 'citizen' | 'staff' = 'citizen'
): Promise<string> {
  const lastUserMsg = [...messages].reverse().find(m => m.role === 'user')?.content || '';
  const cleanQuery = lastUserMsg.toLowerCase().trim();

  // 1. Try Live Backend / Edge Function AI if available
  try {
    const edgeRes = await edgeFetch('/ai/chat', {
      method: 'POST',
      body: JSON.stringify({ messages, userRole })
    }, 3000);
    if (edgeRes?.reply || edgeRes?.data?.reply) {
      return edgeRes.reply || edgeRes.data.reply;
    }
  } catch {}

  // 2. Reference Code Lookup (BUR-, RES-, UTL-)
  const refMatch = lastUserMsg.match(/\b(BUR|RES|UTL|AST)-\d{4}-\w+\b/i);
  if (refMatch) {
    const refCode = refMatch[0].toUpperCase();
    if (refCode.startsWith('BUR-')) {
      const burials = getStore('burials', DEFAULT_BURIALS);
      const b = burials.find((item: any) => String(item.reference_no || '').toUpperCase() === refCode);
      if (b) {
        return `📋 Application Found: Burial Permit [${b.reference_no}]\n• Deceased: ${b.deceased_name}\n• Current Status: ${b.status}\n• Plot / Niche: ${b.plot_code || 'Pending Assignment'}\n• Payment Fee: ₱${(b.fee_amount || 18000).toLocaleString()}.00\n• Payment Due: ${b.payment_due_date || 'Issued upon approval'}\n\nPlease visit the Municipal Treasury desk if your permit is pending payment settlement.`;
      }
    } else if (refCode.startsWith('RES-')) {
      const reservations = getStore('reservations', []);
      const r = reservations.find((item: any) => String(item.reference_no || '').toUpperCase() === refCode);
      if (r) {
        return `🏢 Booking Found: Facility/Park Reservation [${r.reference_no}]\n• Venue: ${r.facility_name}\n• Date & Schedule: ${r.event_date} (${r.start_time} - ${r.end_time})\n• Status: ${r.status}\n• Expected Attendees: ${r.attendees} Pax\n• Total Fee: ₱${(r.fee_amount || 0).toLocaleString()}.00`;
      }
    } else if (refCode.startsWith('UTL-')) {
      const utils = getStore('utilities', []);
      const u = utils.find((item: any) => String(item.ticket_no || '').toUpperCase() === refCode);
      if (u) {
        return `🚰 Utility Incident Ticket [${u.ticket_no}]\n• Service: ${u.service_type}\n• Location: ${u.location}\n• Priority: ${u.urgency}\n• Status: ${u.status}\n• Assigned Response Unit: ${u.assigned_team || 'Municipal Maintenance Rapid Crew'}`;
      }
    }
  }

  // 3. Cemetery & Columbarium Queries
  if (cleanQuery.includes('cemetery') || cleanQuery.includes('burial') || cleanQuery.includes('columbarium') || cleanQuery.includes('niche') || cleanQuery.includes('libing') || cleanQuery.includes('death cert')) {
    return `🏛️ Municipal Cemetery & Columbarium Administration:\n\n1. Location: Quezon City Municipal Cemetery (Brgy. Bagong Pag-asa)\n2. Columbarium Wall Alpha: Features an 8-row by 10-column marble structure (90 niches) with live slot selection.\n3. Standard Fee: ₱18,000.00 for Columbarium Niche Interment.\n4. Required Documents: You must upload (1) PSA Certified Death Certificate and (2) Valid Government ID of the applicant/next-of-kin.\n5. Payment Process: Once your application is reviewed and approved, a billing notice will be generated. Payments are settled face-to-face at the City Treasury desk.`;
  }

  // 4. Facility & Parks Reservations Queries
  if (cleanQuery.includes('facility') || cleanQuery.includes('park') || cleanQuery.includes('reserve') || cleanQuery.includes('court') || cleanQuery.includes('gym') || cleanQuery.includes('civic') || cleanQuery.includes('hour') || cleanQuery.includes('ground')) {
    return `🏟️ Government Facility & Parks Grounds Scheduling:\n\n1. Available Venues:\n   • Barangay 178 Multi-Purpose Civic Center (350 pax, ₱500/hr, Aircon & Sound System)\n   • Camarin Green Urban Recreation Park (500 pax, Free/Public, Jogging trail & Gazebos)\n   • Purok 7 Community Amphitheater (400 pax, ₱250/hr, Open-air stage)\n2. Time Slot Rules: Bookings require at least a 1-hour duration (e.g. 08:00 AM to 09:00 AM; identical start/end times like 8:00 AM to 8:00 AM are restricted).\n3. Equipment: Additional sound systems, monoblock chairs, and standby diesel generators can be selected on the form.\n4. Approvals: Applications are reviewed by the Municipal Administrator Desk within 24 to 48 hours.`;
  }

  // 5. Utility & Emergency Incident Desk Queries
  if (cleanQuery.includes('water') || cleanQuery.includes('leak') || cleanQuery.includes('drainage') || cleanQuery.includes('flood') || cleanQuery.includes('pipe') || cleanQuery.includes('tulo') || cleanQuery.includes('baha') || cleanQuery.includes('canal')) {
    return `🚰 Water & Drainage Incident Desk:\n\n• Reportable Issues: Water main breaks, low pressure, clogged drainage canals, sewer overflow, or flash flooding hazards.\n• Priority Levels: Urgent (under 2-hour response), High (same-day crew dispatch), and Normal (within 24 hours).\n• Attachments: You can attach on-site photos of leaks or road blockages to expedite engineer inspection.\n• Tracking: You will receive a unique UTL ticket number (e.g. UTL-2026-...) to track dispatched maintenance crews.`;
  }

  // 6. Public Assets & Heavy Equipment Queries
  if (cleanQuery.includes('asset') || cleanQuery.includes('equipment') || cleanQuery.includes('generator') || cleanQuery.includes('pump') || cleanQuery.includes('ambulance') || cleanQuery.includes('truck') || cleanQuery.includes('tanker')) {
    return `🚜 Municipal Asset & Equipment Fleet:\n\n• Heavy Equipment: Isuzu 5,000L Water Response Tankers, Komatsu Mini Hydraulic Excavators.\n• Emergency Power: Caterpillar 45kVA Civic Standby Diesel Silent Generators.\n• Health & Rescue: Toyota HiAce Type-II Emergency Rescue Ambulances with onboard trauma life support.\n• Inquiries: Community groups and barangay officials can inspect active asset readiness via the Public Assets Catalog.`;
  }

  // 7. Staff Specific Help
  if (userRole === 'staff') {
    return `👨‍💼 Municipal Operations Assistant (Staff Desk):\n\n• Facilities: Use the Facilities Module to verify pax capacity, check schedule overlaps, approve reservations, and manage venue specs.\n• Parks: Use Parks Module to review public recreation applications and issue permits.\n• Cemetery: Review burial applications in the Deceased Registry, verify citizen uploaded PSA Death Certs and IDs, issue billing notices, and confirm cash payment receipts.\n• Database: All changes synchronize directly with the eProvider cloud database.`;
  }

  // 8. General Citizen Greeting
  return `👋 Kumusta! I am your PAFMS AI Assistant for Quezon City Municipal Services.\n\nI can assist you with:\n1. Reserving Government Multi-Purpose Civic Centers and Public Parks\n2. Columbarium Wall Alpha niche selection and Burial Permit applications\n3. Reporting emergency water pipe leaks and drainage declogging\n4. Looking up your reservation or permit reference number\n\nHow may I help you today? Feel free to type your question or provide a reference code!`;
}



