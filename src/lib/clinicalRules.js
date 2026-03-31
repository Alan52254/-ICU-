// ─── Vitals Thresholds (preserved from original index.html) ───
export const THRESHOLDS = {
  hr:   { min: 60,   max: 100,  critMin: 50,   critMax: 120 },
  spo2: { min: 94,   max: 100,  critMin: 90,   critMax: 100 },
  map:  { min: 65,   max: 110,  critMin: 55,   critMax: 120 },
  rr:   { min: 12,   max: 20,   critMin: 8,    critMax: 30 },
  temp: { min: 36.5, max: 37.5, critMin: 35.0, critMax: 39.0 },
  gcs:  { min: 13,   max: 15,   critMin: 8,    critMax: 15 },
};

// ─── Status determination ───
export function getStatus(metricId, value) {
  if (value == null || isNaN(value)) return 'unknown';
  const t = THRESHOLDS[metricId];
  if (!t) return 'normal';
  if (value <= t.critMin || value >= t.critMax) return 'critical';
  if (value < t.min || value > t.max) return 'warning';
  return 'normal';
}

// ─── SOFA trend determination (user-specified rules — DO NOT CHANGE) ───
export function determineTrend(actualSofa, predictedSofa) {
  if (actualSofa == null || predictedSofa == null) {
    return { code: null, label: 'N/A', color: '#94A3B8', icon: '—' };
  }
  const diff = predictedSofa - actualSofa;
  if (diff > 1)  return { code: 1,  label: '惡化', color: '#EF4444', icon: '↑' };
  if (diff < -1) return { code: -1, label: '改善', color: '#10B981', icon: '↓' };
  return { code: 0, label: '穩定', color: '#F59E0B', icon: '→' };
}

// ─── Risk level classification ───
export function getRiskLevel(totalSofa) {
  if (totalSofa == null) return { level: 'unknown', label: '無資料', color: '#94A3B8', bg: 'bg-slate-100' };
  if (totalSofa >= 12) return { level: 'critical', label: '危急', color: '#EF4444', bg: 'bg-red-50 border-red-200' };
  if (totalSofa >= 8)  return { level: 'high',     label: '高風險', color: '#F97316', bg: 'bg-orange-50 border-orange-200' };
  if (totalSofa >= 4)  return { level: 'moderate',  label: '中風險', color: '#F59E0B', bg: 'bg-amber-50 border-amber-200' };
  return { level: 'low', label: '低風險', color: '#10B981', bg: 'bg-emerald-50 border-emerald-200' };
}

// ─── Status color maps (light theme) ───
export const STATUS_COLORS = {
  normal:  { text: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200', dot: 'bg-emerald-500' },
  warning: { text: 'text-amber-600',   bg: 'bg-amber-50 border-amber-200',     dot: 'bg-amber-500' },
  critical:{ text: 'text-red-600',     bg: 'bg-red-50 border-red-200',         dot: 'bg-red-500' },
  unknown: { text: 'text-slate-400',   bg: 'bg-slate-50 border-slate-200',     dot: 'bg-slate-400' },
};

// ─── SOFA organ colors ───
export const ORGAN_COLORS = {
  Resp:  '#3B82F6',
  Coag:  '#F59E0B',
  Liver: '#10B981',
  CV:    '#EF4444',
  CNS:   '#8B5CF6',
  Renal: '#EC4899',
};
