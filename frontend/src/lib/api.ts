const API_BASE = '/api';

export async function fetchStats() {
  const res = await fetch(`${API_BASE}/stats`);
  const data = await res.json();
  return data.data;
}

// 1. Facilities & Parks
export async function fetchFacilities(category = 'all') {
  const res = await fetch(`${API_BASE}/facilities?category=${encodeURIComponent(category)}`);
  const data = await res.json();
  return data.data;
}

export async function fetchReservations(status = 'all', category = 'all') {
  const res = await fetch(`${API_BASE}/facilities/reservations?status=${encodeURIComponent(status)}&category=${encodeURIComponent(category)}`);
  const data = await res.json();
  return data.data;
}

export async function createReservation(payload: any) {
  const res = await fetch(`${API_BASE}/facilities/reservations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return res.json();
}

export async function updateReservationStatus(id: number, status: string, remarks?: string, reviewer_name?: string) {
  const res = await fetch(`${API_BASE}/facilities/reservations/${id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status, remarks, reviewer_name }),
  });
  return res.json();
}

export async function checkFacilityAI(facilityName: string, eventDate: string, startTime: string, endTime: string, facilityId?: number) {
  const res = await fetch(`${API_BASE}/ai/facility-check`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ facilityName, eventDate, startTime, endTime, facilityId }),
  });
  const data = await res.json();
  return data.data;
}

// 2. Cemetery & Burial Management
export async function fetchCemeteries() {
  const res = await fetch(`${API_BASE}/cemetery/cemeteries`);
  const data = await res.json();
  return data.data || [];
}

export async function fetchCemeteryPlots(section = 'all', status = 'all', cemetery_name = 'all') {
  const res = await fetch(`${API_BASE}/cemetery/plots?section=${encodeURIComponent(section)}&status=${encodeURIComponent(status)}&cemetery_name=${encodeURIComponent(cemetery_name)}`);
  const data = await res.json();
  return data.data || [];
}

export async function updatePlotStatus(id: number, status: string) {
  const res = await fetch(`${API_BASE}/cemetery/plots/${id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
  return res.json();
}

export async function createPlot(payload: any) {
  const res = await fetch(`${API_BASE}/cemetery/plots`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return res.json();
}

export async function createBatchPlots(payload: any) {
  const res = await fetch(`${API_BASE}/cemetery/plots/batch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return res.json();
}

export async function fetchBurials() {
  const res = await fetch(`${API_BASE}/cemetery/burials`);
  const data = await res.json();
  return data.data || [];
}

export async function createBurial(payload: any) {
  const res = await fetch(`${API_BASE}/cemetery/burials`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return res.json();
}

// 3. Water Supply & Drainage Requests
export async function fetchUtilities(status = 'all', service_type = 'all') {
  const res = await fetch(`${API_BASE}/utilities?status=${encodeURIComponent(status)}&service_type=${encodeURIComponent(service_type)}`);
  const data = await res.json();
  return data.data || [];
}

export async function createUtilityRequest(payload: any) {
  const res = await fetch(`${API_BASE}/utilities`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return res.json();
}

export async function updateUtilityStatus(id: number, status: string, assigned_team?: string, resolution_notes?: string) {
  const res = await fetch(`${API_BASE}/utilities/${id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status, assigned_team, resolution_notes }),
  });
  return res.json();
}

// 4. Asset Inventory Management
export async function fetchAssets(category = 'all', condition = 'all') {
  const res = await fetch(`${API_BASE}/assets?category=${encodeURIComponent(category)}&condition=${encodeURIComponent(condition)}`);
  const data = await res.json();
  return data.data || [];
}

export async function createAsset(payload: any) {
  const res = await fetch(`${API_BASE}/assets`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return res.json();
}

export async function updateAssetCondition(id: number, current_condition: string, next_maintenance_due?: string, ai_maintenance_alert?: string) {
  const res = await fetch(`${API_BASE}/assets/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ current_condition, next_maintenance_due, ai_maintenance_alert }),
  });
  return res.json();
}

// Universal Reference Tracker
export async function trackUniversalReference(refNo: string) {
  const res = await fetch(`${API_BASE}/track/${encodeURIComponent(refNo)}`);
  return res.json();
}

// Activity & Auth
export async function fetchActivityLogs() {
  const res = await fetch(`${API_BASE}/activity`);
  const data = await res.json();
  return data.data || [];
}

export async function loginStaff(email: string, password: string) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  return res.json();
}
