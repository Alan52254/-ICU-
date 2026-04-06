// ─── API client ───
const BASE = '/api';

async function fetchJSON(url, options = {}) {
  const res = await fetch(url, options);
  if (!res.ok) {
    if (res.status === 503) throw new Error('DATA_LOADING');
    throw new Error(`API error: ${res.status}`);
  }
  return res.json();
}

export async function fetchPatients() {
  return fetchJSON(`${BASE}/patients`);
}

export async function fetchPatientOverview(stayId) {
  return fetchJSON(`${BASE}/patients/${stayId}/overview`);
}

export async function fetchPatientVitals(stayId, hours) {
  const q = hours ? `?hours=${hours}` : '';
  return fetchJSON(`${BASE}/patients/${stayId}/vitals${q}`);
}

export async function fetchPatientSofa(stayId, gap = 4) {
  return fetchJSON(`${BASE}/patients/${stayId}/sofa?gap=${gap}`);
}

export async function fetchPatientInsights(stayId, gap = 4, hour) {
  let q = `?gap=${gap}`;
  if (hour !== undefined) q += `&hour=${hour}`;
  return fetchJSON(`${BASE}/patients/${stayId}/insights${q}`);
}

export async function fetchPatientDeterioration(stayId, gap, hour, options = {}) {
  let q = '';
  if (gap !== undefined && gap !== null) q += `?gap=${gap}`;
  if (hour !== undefined && hour !== null) {
    q += q ? `&hour=${hour}` : `?hour=${hour}`;
  }
  return fetchJSON(`${BASE}/patients/${stayId}/deterioration${q}`, options);
}

export async function fetchDeteriorationManifest(options = {}) {
  return fetchJSON(`${BASE}/deterioration/manifest`, options);
}

export async function fetchHealth() {
  return fetchJSON(`${BASE}/health`);
}
