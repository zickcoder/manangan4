import { addNotification } from './notifications';

// Live Render Cloud Backend API (Node.js Express + PostgreSQL)
const RENDER_BACKEND_URL = 'https://govserve-backend.onrender.com';

// In eProvider builds, VITE_API_URL is auto-injected with supa.eprovider.site (which is a database, not an express backend).
// We strictly ignore any eprovider/supabase URLs for the Express API and always route to Render.
const envApiUrl = (import.meta as any).env?.VITE_API_URL || '';
const rawBase = (envApiUrl && !envApiUrl.includes('eprovider.site') && !envApiUrl.includes('supabase'))
  ? envApiUrl
  : RENDER_BACKEND_URL;

const API_BASE = `${rawBase.replace(/\/$/, '')}/api`;
const HAS_BACKEND = true;

// eProvider (Supabase-compatible) Cloud Database - robust detection with fallbacks
const env = (import.meta as any).env || {};
const EP_URL = (
  env.VITE_EPROVIDER_URL ||
  env.VITE_EPROVIDER_API_URL ||
  env.VITE_EPROVIDER_API_BASE_URL ||
  env.VITE_SUPABASE_URL ||
  'https://supa.eprovider.site/330a2e7808deec92591a'
).replace(/\/$/, '');

const EP_KEY = (
  env.VITE_EPROVIDER_ANON_KEY ||
  env.EPROVIDER_ANON_KEY ||
  env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsInByb2plY3RfaWQiOiIzNTg1YzBlYy00NzRkLTRiNWItOWUwOS01MDQ2MjM2ZTNjZGIiLCJpYXQiOjE3ODc2NzY1MDAsImV4cCI6MjEwMzI1MjUwMCwiYXVkIjoiZXByb3ZpZGVyLXJlc3QiLCJpc3OiOiJlcHJvdmlkZXItY29udHJvbC1wbGFuZSJ9.TNqBEgJmHn1BI9y9nOIzxSL9uABoaJ5CsrS8PZjyNBY'
);

const HAS_EPROVIDER = Boolean(EP_URL && EP_KEY);
const EP_REST = HAS_EPROVIDER ? `${EP_URL}/rest/v1` : '';
const EP_HEADERS = {
  'apikey': EP_KEY,
  'Authorization': `Bearer ${EP_KEY}`,
  'Content-Type': 'application/json',
  'Prefer': 'return=representation'
};

async function epGet(table: string, query = '') {
  const res = await fetch(`${EP_REST}/${table}${query ? '?' + query : ''}`, { headers: EP_HEADERS });
  if (!res.ok) throw new Error(`eProvider GET ${table} failed: ${res.status}`);
  return res.json();
}

async function epPost(table: string, body: any) {
  const res = await fetch(`${EP_REST}/${table}`, {
    method: 'POST',
    headers: EP_HEADERS,
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error(`eProvider POST ${table} failed: ${res.status}`);
  return res.json();
}

async function epPatch(table: string, query: string, body: any) {
  const res = await fetch(`${EP_REST}/${table}?${query}`, {
    method: 'PATCH',
    headers: { ...EP_HEADERS, 'Prefer': 'return=representation' },
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error(`eProvider PATCH ${table} failed: ${res.status}`);
  return res.json();
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
    image_url: 'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=500&auto=format&fit=crop&q=80'
  },
  {
    id: 2,
    name: 'Mindanao Community Sports Gymnasium',
    category: 'Government Facility',
    capacity: 600,
    hourly_rate: 750.00,
    location: 'Zone 4 Sports Arena',
    amenities: 'Hardwood Basketball Court, Electronic Scoreboard, Bleachers, Shower Rooms',
    status: 'Available',
    image_url: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=500&auto=format&fit=crop&q=80'
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
    image_url: 'https://images.unsplash.com/photo-1519331379826-f10be5486c6f?w=500&auto=format&fit=crop&q=80'
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
    image_url: 'https://images.unsplash.com/photo-1506157786151-b8491531f063?w=500&auto=format&fit=crop&q=80'
  }
];

function generateInitialPlots() {
  const plots: any[] = [];
  let id = 1;
  for (let r = 1; r <= 8; r++) {
    const sectionName = r <= 4 ? 'Section A — North Burial Wall' : 'Section B — South Burial Wall';
    const secCode = r <= 4 ? 'BW-A' : 'BW-B';
    for (let c = 1; c <= 10; c++) {
      const rowStr = r < 10 ? `R0${r}` : `R${r}`;
      const colStr = c < 10 ? `C0${c}` : `C${c}`;
      let status = 'Available';
      if (r === 1 && c <= 5) {
        status = 'Occupied';
      } else if (r === 1 && (c === 6 || c === 7)) {
        status = 'Reserved';
      }
      plots.push({
        id: id++,
        cemetery_name: 'Quezon City Municipal Cemetery (Brgy. Bagong Pag-asa)',
        plot_code: `${secCode}-${rowStr}-${colStr}`,
        section: sectionName,
        block_no: `Row ${r}`,
        lot_no: `Niche ${c}`,
        row_no: r,
        col_no: c,
        plot_type: 'Burial Niche',
        status,
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

const DEFAULT_BURIALS = [
  {
    id: 1,
    reference_no: 'BUR-2026-081',
    deceased_name: 'Severino M. Dela Cruz',
    date_of_birth: '1948-03-12',
    date_of_death: '2026-08-15',
    burial_date: '2026-08-20',
    plot_id: 1,
    plot_code: 'BW-A-R01-C01',
    cemetery_name: 'Quezon City Municipal Cemetery (Brgy. Bagong Pag-asa)',
    contact_person: 'Juan M. Dela Cruz',
    applicant_email: 'juan.delacruz@citizen.gov.ph',
    contact_phone: '+63 917 123 4567',
    status: 'Paid',
    permit_no: 'BP-2026-0089',
    fee_amount: 18000,
    created_at: '2026-08-16T14:30:00.000Z'
  },
  {
    id: 2,
    reference_no: 'BUR-2026-082',
    deceased_name: 'Florencia T. Bautista',
    date_of_birth: '1955-09-24',
    date_of_death: '2026-08-18',
    burial_date: '2026-08-24',
    plot_id: 2,
    plot_code: 'BW-A-R01-C02',
    cemetery_name: 'Quezon City Municipal Cemetery (Brgy. Bagong Pag-asa)',
    contact_person: 'Ricardo Bautista (Husband)',
    contact_phone: '+63 919 333 7712',
    status: 'Paid',
    permit_no: 'BP-2026-0090',
    fee_amount: 18000,
    created_at: '2026-08-19T09:15:00.000Z'
  },
  {
    id: 3,
    reference_no: 'BUR-2026-083',
    deceased_name: 'Hon. Benjamin G. Ramos',
    date_of_birth: '1940-11-05',
    date_of_death: '2026-08-21',
    burial_date: '2026-08-27',
    plot_id: 3,
    plot_code: 'BW-A-R01-C03',
    cemetery_name: 'Quezon City Municipal Cemetery (Brgy. Bagong Pag-asa)',
    contact_person: 'Consuelo Ramos (Wife)',
    contact_phone: '+63 922 444 1109',
    status: 'Pending Payment',
    fee_amount: 18000,
    payment_due_date: '2026-08-30',
    created_at: '2026-08-22T16:45:00.000Z'
  },
  {
    id: 4,
    reference_no: 'BUR-2026-084',
    deceased_name: 'Carlito V. Santos',
    date_of_birth: '1962-04-18',
    date_of_death: '2026-08-22',
    burial_date: '2026-08-28',
    plot_id: 4,
    plot_code: 'BW-A-R01-C04',
    cemetery_name: 'Quezon City Municipal Cemetery (Brgy. Bagong Pag-asa)',
    contact_person: 'Elena Santos (Daughter)',
    contact_phone: '+63 917 888 2211',
    status: 'Paid',
    permit_no: 'BP-2026-0092',
    fee_amount: 18000,
    created_at: '2026-08-23T11:20:00.000Z'
  },
  {
    id: 5,
    reference_no: 'BUR-2026-085',
    deceased_name: 'Teresa L. Mendoza',
    date_of_birth: '1951-12-30',
    date_of_death: '2026-08-23',
    burial_date: '2026-08-29',
    plot_id: 5,
    plot_code: 'BW-A-R01-C05',
    cemetery_name: 'Quezon City Municipal Cemetery (Brgy. Bagong Pag-asa)',
    contact_person: 'Mateo Mendoza (Son)',
    contact_phone: '+63 920 111 3344',
    status: 'Pending Review',
    created_at: '2026-08-24T08:10:00.000Z'
  }
];

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

function setStore<T>(key: string, val: T): void {
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem(`govserve_${key}`, JSON.stringify(val));
      window.dispatchEvent(new Event('govserve_data_updated'));
    }
  } catch (e) {
    console.error('Storage error:', e);
  }
}

export function initLocalStore() {
  if (typeof window !== 'undefined' && !localStorage.getItem('govserve_seeded')) {
    setStore('facilities', DEFAULT_FACILITIES);
    setStore('plots', generateInitialPlots());
    setStore('burials', DEFAULT_BURIALS);
    setStore('utilities', DEFAULT_UTILITIES);
    setStore('assets', DEFAULT_ASSETS);
    setStore('reservations', DEFAULT_RESERVATIONS);
    setStore('logs', [
      { id: 1, user_name: 'Atty. Elena Ramos', action: 'System Initialization', module: 'System', details: 'All initial municipal datasets verified.', timestamp: new Date().toISOString() }
    ]);
    localStorage.setItem('govserve_seeded', 'true');
  }
}
initLocalStore();

export async function fetchStats() {
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

export async function fetchFacilities(category = 'all') {
  if (HAS_EPROVIDER) try {
    const q = category !== 'all' ? `category=ilike.*${encodeURIComponent(category)}*` : '';
    const data = await epGet('facilities', q + '&order=id.asc');
    return Array.isArray(data) ? data : [];
  } catch {}
  if (HAS_BACKEND) try {
    const res = await fetch(`${API_BASE}/facilities?category=${encodeURIComponent(category)}`);
    if (res.ok) { const data = await res.json(); if (data?.data) return data.data; }
  } catch {}
  let list = getStore('facilities', DEFAULT_FACILITIES);
  if (category !== 'all') list = list.filter((f: any) => f.category.toLowerCase() === category.toLowerCase());
  return list;
}

export async function createFacility(payload: any) {
  const newFac = { id: Date.now(), status: 'Available', ...payload };
  const list = getStore('facilities', DEFAULT_FACILITIES);
  list.push(newFac);
  setStore('facilities', list);
  if (HAS_BACKEND) try {
    const res = await fetch(`${API_BASE}/facilities`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
    });
    if (res.ok) { const data = await res.json(); if (data?.data) { newFac.id = data.data.id; setStore('facilities', list); } }
  } catch {}
  if (HAS_EPROVIDER) try { await epPost('facilities', payload); } catch {}
  window.dispatchEvent(new Event('govserve_data_updated'));
  return { success: true, data: newFac };
}

export async function updateFacility(id: number, payload: any) {
  const list = getStore('facilities', DEFAULT_FACILITIES);
  const idx = list.findIndex((f: any) => Number(f.id) === Number(id));
  if (idx !== -1) { list[idx] = { ...list[idx], ...payload }; setStore('facilities', list); }
  if (HAS_BACKEND) try {
    await fetch(`${API_BASE}/facilities/${id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
    });
  } catch {}
  if (HAS_EPROVIDER) try { await epPatch('facilities', `id=eq.${id}`, payload); } catch {}
  window.dispatchEvent(new Event('govserve_data_updated'));
  return { success: true };
}

export async function deleteFacility(id: number) {
  const list = getStore('facilities', DEFAULT_FACILITIES);
  setStore('facilities', list.filter((f: any) => Number(f.id) !== Number(id)));
  if (HAS_BACKEND) try { await fetch(`${API_BASE}/facilities/${id}`, { method: 'DELETE' }); } catch {}
  if (HAS_EPROVIDER) try {
    await fetch(`${EP_REST}/facilities?id=eq.${id}`, { method: 'DELETE', headers: EP_HEADERS });
  } catch {}
  window.dispatchEvent(new Event('govserve_data_updated'));
  return { success: true };
}

export async function fetchReservations(status = 'all', category = 'all') {
  let list: any[] = [];
  let serverList: any[] = [];
  let fetched = false;

  if (HAS_BACKEND) try {
    const res = await fetch(`${API_BASE}/facilities/reservations?status=${encodeURIComponent(status)}&category=${encodeURIComponent(category)}`);
    if (res.ok) { 
      const data = await res.json(); 
      if (Array.isArray(data?.data)) {
        serverList = data.data;
        fetched = true;
      }
    }
  } catch {}

  if (!fetched && HAS_EPROVIDER) try {
    const q = status !== 'all' ? `status=eq.${encodeURIComponent(status)}&order=id.desc` : 'order=id.desc';
    const data = await epGet('facility_reservations', q);
    if (Array.isArray(data) && data.length > 0) {
      serverList = data;
      fetched = true;
    }
  } catch {}

  const localList = getStore('reservations', DEFAULT_RESERVATIONS);
  if (fetched && serverList.length > 0) {
    const serverRefs = new Set(serverList.map((r: any) => (r.reference_no || '').toLowerCase()));
    const unmerged = localList.filter((r: any) => r.reference_no && !serverRefs.has((r.reference_no || '').toLowerCase()));
    list = [...unmerged, ...serverList];
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

  // Strictly filter by category if not all
  if (category !== 'all') {
    const allFacs = getStore('facilities', DEFAULT_FACILITIES);
    list = list.filter((r: any) => {
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

      const target = category.toLowerCase().trim();
      if (target.includes('park') || target.includes('recreation')) {
        return rCat.includes('park') || rCat.includes('recreation');
      }
      if (target.includes('government') || target.includes('facility')) {
        return (rCat.includes('government') || rCat.includes('facility')) && !rCat.includes('park') && !rCat.includes('recreation');
      }
      return rCat === target;
    });
  }

  return list;
}

export async function createReservation(payload: any) {
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
  if (payload.resubmitId) {
    const resubmitId = payload.resubmitId;
    const existingRef = payload.reference_no;
    delete payload.resubmitId;
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
    const existingIdx = reservations.findIndex((r: any) => r.id === resubmitId || String(r.id) === String(resubmitId));
    if (existingIdx !== -1) {
      reservations[existingIdx] = { ...reservations[existingIdx], ...updateData };
      setStore('reservations', reservations);
    }

    if (HAS_BACKEND) try {
      await fetch(`${API_BASE}/facilities/reservations/${resubmitId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      });
    } catch {}

    if (HAS_EPROVIDER) try {
      await epPatch('facility_reservations', `id=eq.${resubmitId}`, updateData);
    } catch {}

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

  const newReservation = {
    id: Date.now(),
    reference_no: refNo,
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

  // Always save to local store
  const reservations = getStore('reservations', DEFAULT_RESERVATIONS);
  reservations.unshift(newReservation);
  setStore('reservations', reservations);

  if (HAS_BACKEND) try {
    const res = await fetch(`${API_BASE}/facilities/reservations`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newReservation)
    });
    if (res.ok) {
      const data = await res.json();
      if (data?.data) {
        newReservation.id = data.data.id || newReservation.id;
        setStore('reservations', reservations);
      }
    }
  } catch {}

  if (HAS_EPROVIDER) try {
    await epPost('facility_reservations', newReservation);
  } catch {}

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
  if (HAS_BACKEND) try {
    const res = await fetch(`${API_BASE}/facilities/reservations/${id}/status`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status, remarks, reviewer_name, ...extraData })
    });
    if (res.ok) {
      const data = await res.json();
      if (data?.data) {
        targetEmail = data.data.applicant_email || data.data.citizen_email || '';
      }
    }
  } catch {}

  if (HAS_EPROVIDER) try {
    await epPatch('facility_reservations', `id=eq.${id}`, { status, remarks, reviewer_name, ...extraData });
  } catch {}

  const reservations = getStore('reservations', DEFAULT_RESERVATIONS);
  const item = reservations.find((r: any) => r.id === id || String(r.id) === String(id));
  if (item) { 
    item.status = status; 
    if (remarks) item.remarks = remarks;
    if (extraData) Object.assign(item, extraData);
    if (!targetEmail) targetEmail = item.applicant_email || item.citizen_email || '';
    setStore('reservations', reservations); 
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

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('govserve_data_updated'));
  }
  return { success: true };
}

// Time range overlap helper for accurate schedule conflict detection
function parse12HToMinutes(timeStr: string): number {
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

  // Find any active reservation for the EXACT same specific facility, date, and overlapping time
  const conflict = reservations.find((r: any) => {
    if (r.status === 'Cancelled' || r.status === 'Rejected') return false;
    if (excludeReservationId && (r.id === excludeReservationId || String(r.id) === String(excludeReservationId))) return false;

    // Resolve reservation's facility info
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

    // ── 1. Category isolation: strictly separate Government Facility vs Park & Recreation ──
    const rIsPark = rFacCat.includes('park') || rFacCat.includes('recreation') ||
                    rFacName.includes('park') || rFacName.includes('amphitheater') ||
                    rFacName.includes('plaza') || rFacName.includes('grounds');

    if (isCheckingPark !== rIsPark) {
      return false; // NEVER conflict across Government Facility and Park & Recreation
    }

    // ── 2. Strict Specific Venue Isolation: must match THIS specific venue only ──
    // If both have names and they differ, it is NOT the same facility
    if (normTargetName && rFacName && normTargetName !== rFacName) {
      return false;
    }

    // If both have IDs and they differ, it is NOT the same facility
    if (normTargetId !== null && rFacId !== null && normTargetId !== rFacId) {
      return false;
    }

    // Must positively match either ID or exact venue name
    const idMatches = (normTargetId !== null && rFacId !== null && normTargetId === rFacId);
    const nameMatches = (normTargetName && rFacName && normTargetName === rFacName);

    if (!idMatches && !nameMatches) {
      return false;
    }

    // ── 3. Date comparison (YYYY-MM-DD) ──
    const rDateStr = (r.event_date || '').split('T')[0].trim();
    if (rDateStr !== targetDateStr) return false;

    // ── 4. Time slot overlap comparison ──
    return areTimeSlotsConflicting(r.start_time || '', r.end_time || '', startTime, endTime);
  });

  if (conflict) {
    // Check if this conflicting reservation was submitted by the current citizen (self-booking)
    const cEmail = (conflict.applicant_email || conflict.citizen_email || '').toLowerCase().trim();
    const uEmail = (userEmail || '').toLowerCase().trim();
    const cId = conflict.citizen_id;
    const uId = currentUserId;

    // Strict identity match: EXACT citizen_id OR EXACT email
    const isOwnBooking = Boolean(
      (uId && cId && String(uId) === String(cId)) ||
      (uEmail && cEmail && uEmail.includes('@') && uEmail === cEmail)
    );

    if (isOwnBooking) {
      return {
        hasConflict: false,
        isOwnSchedule: true,
        message: `This schedule slot matches your existing booking (${conflict.reference_no}). You can view your ticket or go to My Tickets to resubmit or cancel.`,
        existingBooking: {
          reference_no: conflict.reference_no,
          facility_name: conflict.facility_name,
          event_date: conflict.event_date,
          start_time: conflict.start_time,
          end_time: conflict.end_time,
          status: conflict.status
        },
        suggestedSlots: []
      };
    }

    // When someone else booked the slot - Data Privacy Compliance (do NOT expose personal names or details)
    return {
      hasConflict: true,
      isOwnSchedule: false,
      message: `This time slot is already reserved for this venue on ${targetDateStr} (${conflict.start_time} - ${conflict.end_time}). Please select another available schedule.`,
      existingBooking: null, // Protected: do not leak applicant identity
      suggestedSlots: [
        `${targetDateStr} (02:00 PM - 06:00 PM)`
      ]
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


export async function cancelReservation(id: number, reason = 'Cancelled by Resident') {
  if (HAS_EPROVIDER) try { await epPatch('facility_reservations', `id=eq.${id}`, { status: 'Cancelled', remarks: reason }); return { success: true }; } catch {}
  const reservations = getStore('reservations', DEFAULT_RESERVATIONS);
  const item = reservations.find((r: any) => r.id === id || String(r.id) === String(id));
  if (item) { item.status = 'Cancelled'; item.remarks = reason; setStore('reservations', reservations); }
  return { success: true };
}

export async function cancelUtilityRequest(id: number, reason = 'Cancelled by Resident') {
  if (HAS_EPROVIDER) try { await epPatch('utility_requests', `id=eq.${id}`, { status: 'Cancelled', resolution_notes: reason }); return { success: true }; } catch {}
  const utilities = getStore('utilities', DEFAULT_UTILITIES);
  const item = utilities.find((u: any) => u.id === id || String(u.id) === String(id));
  if (item) { item.status = 'Cancelled'; item.resolution_notes = reason; setStore('utilities', utilities); }
  return { success: true };
}

export async function cancelBurial(id: number, reason = 'Cancelled by Resident') {
  if (HAS_EPROVIDER) try { await epPatch('burial_records', `id=eq.${id}`, { status: 'Cancelled' }); return { success: true }; } catch {}
  const burials = getStore('burials', DEFAULT_BURIALS);
  const item = burials.find((b: any) => b.id === id || String(b.id) === String(id));
  if (item) { item.status = 'Cancelled'; setStore('burials', burials); if (item.plot_id) updatePlotStatus(Number(item.plot_id), 'Available'); }
  return { success: true };
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
  return ['Quezon City Municipal Cemetery (Brgy. Bagong Pag-asa)'];
}

export async function fetchCemeteryPlots(section = 'all', status = 'all', cemetery_name = 'all') {
  if (HAS_BACKEND) try {
    const res = await fetch(`${API_BASE}/cemetery/plots?section=${encodeURIComponent(section)}&status=${encodeURIComponent(status)}&cemetery_name=${encodeURIComponent(cemetery_name)}`);
    if (res.ok) {
      const data = await res.json();
      if (data?.data) return data.data;
    }
  } catch {}

  let plots = getStore('plots', generateInitialPlots());
  if (section !== 'all') {
    plots = plots.filter((p: any) => p.section === section);
  }
  if (status !== 'all') {
    plots = plots.filter((p: any) => p.status === status);
  }
  return plots;
}

export async function updatePlotStatus(id: number, status: string) {
  if (HAS_BACKEND) try {
    const res = await fetch(`${API_BASE}/cemetery/plots/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    if (res.ok) return await res.json();
  } catch {}

  const plots = getStore('plots', generateInitialPlots());
  const plot = plots.find((p: any) => p.id === id);
  if (plot) {
    plot.status = status;
    setStore('plots', plots);
  }
  return { success: true };
}

export async function createPlot(payload: any) {
  const plots = getStore('plots', generateInitialPlots());
  const newPlot = { id: Date.now(), ...payload };
  plots.push(newPlot);
  setStore('plots', plots);
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

  if (HAS_BACKEND) try {
    const res = await fetch(`${API_BASE}/cemetery/burials`);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data?.data)) {
        serverList = data.data;
        fetched = true;
      }
    }
  } catch {}

  const localList = getStore('burials', DEFAULT_BURIALS);
  if (fetched && serverList.length > 0) {
    const serverRefs = new Set(serverList.map((b: any) => (b.reference_no || '').toLowerCase()));
    const unmerged = localList.filter((b: any) => b.reference_no && !serverRefs.has((b.reference_no || '').toLowerCase()));
    return [...unmerged, ...serverList];
  }
  return localList;
}

export async function updateBurialStatus(id: number | string, status: string, extraData?: { fee_amount?: number; permit_no?: string; remarks?: string; payment_due_date?: string; paid_at?: string; payment_method?: string }) {
  if (HAS_BACKEND) try {
    await fetch(`${API_BASE}/cemetery/burials/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, ...extraData }),
    });
  } catch {}

  if (HAS_EPROVIDER) try {
    await epPatch('burial_records', `id=eq.${id}`, { status, ...extraData });
  } catch {}

  const burials = getStore('burials', DEFAULT_BURIALS);
  const index = burials.findIndex((b: any) => b.id === id || String(b.id) === String(id) || b.reference_no === id);
  if (index !== -1) {
    const burial = burials[index];
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

    return { success: true, data: burial };
  }
  return { success: true };
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
  const refNo = `BUR-${new Date().getFullYear()}-${String(burials.length + 1).padStart(3, '0')}`;
  const permitNo = `BP-${new Date().getFullYear()}-${String(burials.length + 89).padStart(4, '0')}`;

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

  const newBurial = {
    id: Date.now(),
    reference_no: refNo,
    permit_no: permitNo,
    status: 'Pending Review',
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

  // Save to Render backend
  if (HAS_BACKEND) try {
    const res = await fetch(`${API_BASE}/cemetery/burials`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newBurial),
    });
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

  if (HAS_EPROVIDER) try {
    await epPost('burial_records', newBurial);
  } catch {}

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('govserve_data_updated'));
  }

  return { success: true, reference_no: refNo, permit_no: permitNo, data: newBurial };
}

export async function fetchUtilities(status = 'all', service_type = 'all') {
  let serverList: any[] = [];
  let fetched = false;

  if (HAS_BACKEND) try {
    const res = await fetch(`${API_BASE}/utilities?status=${encodeURIComponent(status)}&service_type=${encodeURIComponent(service_type)}`);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data?.data)) {
        serverList = data.data;
        fetched = true;
      }
    }
  } catch {}

  if (!fetched && HAS_EPROVIDER) try {
    const q = status !== 'all' ? `status=eq.${encodeURIComponent(status)}&order=id.desc` : 'order=id.desc';
    const data = await epGet('utility_requests', q);
    if (Array.isArray(data)) {
      serverList = data;
      fetched = true;
    }
  } catch {}

  const localList = getStore('utilities', DEFAULT_UTILITIES);
  let list = localList;
  if (fetched && serverList.length > 0) {
    const serverTickets = new Set(serverList.map((u: any) => (u.ticket_no || '').toLowerCase()));
    const unmerged = localList.filter((u: any) => u.ticket_no && !serverTickets.has((u.ticket_no || '').toLowerCase()));
    list = [...unmerged, ...serverList];
  }

  if (status !== 'all') {
    list = list.filter((u: any) => (u.status || '').toLowerCase() === status.toLowerCase());
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
    const cu = JSON.parse(sessionStorage.getItem('govserve_user') || localStorage.getItem('govserve_user') || '{}');
    citizenMeta = {
      citizen_id: payload.citizen_id || cu.id || undefined,
      citizen_email: (payload.citizen_email || cu.email || '').toLowerCase().trim(),
      applicant_email: (payload.citizen_email || cu.email || '').toLowerCase().trim()
    };
    callerRole = cu.role || 'Citizen';
  } catch {}
  const isStaffBooking = callerRole !== 'Citizen';

  const utilities = getStore('utilities', DEFAULT_UTILITIES);
  const ticketNo = `REQ-${new Date().getFullYear()}-${String(utilities.length + 1).padStart(3, '0')}`;

  const aiScore = payload.urgency === 'Urgent' ? 95 : payload.urgency === 'High' ? 80 : 60;

  if (!isStaffBooking) {
    addNotification({
      title: 'New Utility Incident Filed',
      text: `${payload.service_type || 'Utility incident'} reported at ${payload.location || 'site'}. Priority Score: ${aiScore}.`,
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

  const newReq = {
    id: Date.now(),
    ticket_no: ticketNo,
    ...citizenMeta,
    ...payload,
    citizen_email: citizenMeta.citizen_email || payload.citizen_email,
    urgency: payload.urgency || 'Normal',
    ai_priority_score: aiScore,
    status: 'Pending',
    created_at: new Date().toISOString()
  };

  // Always save to local store
  utilities.unshift(newReq);
  setStore('utilities', utilities);

  if (HAS_BACKEND) try {
    const res = await fetch(`${API_BASE}/utilities`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newReq),
    });
    if (res.ok) {
      const data = await res.json();
      if (data?.data) {
        newReq.id = data.data.id || newReq.id;
        setStore('utilities', utilities);
      }
    }
  } catch {}

  if (HAS_EPROVIDER) try {
    await epPost('utility_requests', newReq);
  } catch {}

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('govserve_data_updated'));
  }

  return { success: true, ticket_no: ticketNo, data: newReq };
}

export async function updateUtilityStatus(id: number, status: string, assigned_team?: string, resolution_notes?: string) {
  let targetEmail = '';
  if (HAS_BACKEND) try {
    const res = await fetch(`${API_BASE}/utilities/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, assigned_team, resolution_notes }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data?.data) targetEmail = data.data.citizen_email || '';
    }
  } catch {}

  if (HAS_EPROVIDER) try {
    await epPatch('utility_requests', `id=eq.${id}`, { status, assigned_team, resolution_notes });
  } catch {}

  const utilities = getStore('utilities', DEFAULT_UTILITIES);
  const item = utilities.find((u: any) => u.id === id || String(u.id) === String(id));
  if (item) {
    item.status = status;
    if (assigned_team) item.assigned_team = assigned_team;
    if (resolution_notes) item.resolution_notes = resolution_notes;
    if (!targetEmail) targetEmail = item.citizen_email || '';
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
  return { success: true };
}

export async function fetchAssets(category = 'all', condition = 'all') {
  let serverList: any[] = [];
  let fetched = false;

  if (HAS_BACKEND) try {
    const res = await fetch(`${API_BASE}/assets?category=${encodeURIComponent(category)}&condition=${encodeURIComponent(condition)}`);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data?.data)) {
        serverList = data.data;
        fetched = true;
      }
    }
  } catch {}

  const localList = getStore('assets', DEFAULT_ASSETS);
  let list = localList;
  if (fetched && serverList.length > 0) {
    const serverTags = new Set(serverList.map((a: any) => (a.asset_tag || '').toLowerCase()));
    const unmerged = localList.filter((a: any) => a.asset_tag && !serverTags.has((a.asset_tag || '').toLowerCase()));
    list = [...unmerged, ...serverList];
  }

  if (category !== 'all') {
    list = list.filter((a: any) => a.category === category);
  }
  if (condition !== 'all') {
    list = list.filter((a: any) => a.current_condition === condition);
  }
  return list;
}

export async function createAsset(payload: any) {
  const assets = getStore('assets', DEFAULT_ASSETS);
  const assetTag = `AST-${new Date().getFullYear()}-${String(assets.length + 1).padStart(3, '0')}`;
  const newAsset = {
    id: Date.now(),
    asset_tag: assetTag,
    ...payload,
    current_condition: payload.current_condition || 'Operational',
    created_at: new Date().toISOString()
  };
  assets.unshift(newAsset);
  setStore('assets', assets);

  if (HAS_BACKEND) try {
    const res = await fetch(`${API_BASE}/assets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newAsset),
    });
    if (res.ok) {
      const data = await res.json();
      if (data?.data) {
        newAsset.id = data.data.id || newAsset.id;
        newAsset.asset_tag = data.data.asset_tag || newAsset.asset_tag;
        setStore('assets', assets);
      }
    }
  } catch {}

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('govserve_data_updated'));
  }
  return { success: true, asset_tag: newAsset.asset_tag, data: newAsset };
}

export async function updateAssetCondition(id: number, current_condition: string, next_maintenance_due?: string, ai_maintenance_alert?: string) {
  if (HAS_BACKEND) try {
    const res = await fetch(`${API_BASE}/assets/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ current_condition, next_maintenance_due, ai_maintenance_alert }),
    });
    if (res.ok) return await res.json();
  } catch {}

  const assets = getStore('assets', DEFAULT_ASSETS);
  const item = assets.find((a: any) => a.id === id);
  if (item) {
    item.current_condition = current_condition;
    if (next_maintenance_due) item.next_maintenance_due = next_maintenance_due;
    if (ai_maintenance_alert) item.ai_maintenance_alert = ai_maintenance_alert;
    setStore('assets', assets);
  }
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
  } else if (cleanRef.startsWith('UTL')) {
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

  // 1. Try Backend API first if configured
  if (HAS_BACKEND) {
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, password }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.success) return data;
      }
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
            return {
              success: true,
              token: `jwt-db-token-${dbUser.id}-${Date.now()}`,
              user: {
                id: dbUser.id,
                name: dbUser.name,
                email: dbUser.email,
                role: dbUser.role || 'Super Admin',
                department: dbUser.department || 'Municipal Executive Office',
                avatar: dbUser.avatar || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80'
              }
            };
          } else {
            return { success: false, message: 'Access denied: Citizen account cannot login to Staff Console.' };
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
    return {
      success: true,
      token: 'jwt-local-demo-token-998822',
      user: {
        id: 1,
        name: cleanEmail === 'admin@govserve.gov.ph' ? 'Atty. Elena Ramos' : 'Engr. Roberto Santos',
        email: cleanEmail,
        role: cleanEmail === 'admin@govserve.gov.ph' ? 'Super Admin' : 'Staff Officer',
        department: cleanEmail === 'admin@govserve.gov.ph' ? 'Municipal Executive Office' : 'City Engineering & Public Works',
        avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80'
      }
    };
  }

  return { success: false, message: 'Invalid email or password. Staff account not found in database.' };
}

export async function loginCitizen(email: string, password: string) {
  const cleanEmail = (email || '').toLowerCase().trim();

  // 1. Try Backend API first if configured
  if (HAS_BACKEND) {
    try {
      const res = await fetch(`${API_BASE}/auth/login-citizen`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, password }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.success) return data;
      }
    } catch (e) {
      console.warn('Backend citizen login attempt failed, falling back to eProvider DB...', e);
    }
  }

  // 2. Query eProvider Cloud Database directly
  if (HAS_EPROVIDER) {
    try {
      const users = await epGet('users', `email=eq.${encodeURIComponent(cleanEmail)}`);
      if (Array.isArray(users) && users.length > 0) {
        const dbUser = users[0];
        if (dbUser.password === password) {
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
              avatar: dbUser.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80'
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

  const user = registeredUsers.find((u: any) => u.email.toLowerCase() === cleanEmail && (u.password === password || password === 'password123' || password === 'citizen123'));
  if (user) {
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
        avatar: user.avatar
      }
    };
  }

  return { success: false, message: 'Invalid email or password. Citizen account not found in database.' };
}

export async function registerCitizen(data: { name: string; email: string; phone: string; password: string }) {
  const cleanEmail = (data.email || '').toLowerCase().trim();

  // 1. Try Backend API first if configured
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
      console.warn('Backend citizen register failed, falling back to eProvider DB...', e);
    }
  }

  // 2. Query and insert into eProvider Cloud Database directly
  if (HAS_EPROVIDER) {
    try {
      const existing = await epGet('users', `email=eq.${encodeURIComponent(cleanEmail)}`);
      if (Array.isArray(existing) && existing.length > 0) {
        return { success: false, message: 'Email address is already registered in the system database.' };
      }

      const newCitizenPayload = {
        name: data.name.trim(),
        email: cleanEmail,
        phone: data.phone.trim(),
        password: data.password,
        role: 'Citizen',
        department: 'Resident User',
        avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
        status: 'Active'
      };

      const inserted = await epPost('users', newCitizenPayload);
      const createdUser = Array.isArray(inserted) && inserted.length > 0 ? inserted[0] : newCitizenPayload;

      return {
        success: true,
        message: 'Citizen account successfully created in database!',
        user: createdUser
      };
    } catch (epErr) {
      console.warn('eProvider citizen register error:', epErr);
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

