// ─── CSV → System field mapping constants ───
// All CSV column name references are centralized here.

export const PATIENT_FIELD_MAP = {
  primaryKey: 'stay_id',
  timeKey: 'hour_idx',
  gender: 'gender',           // 0=Female, 1=Male
  age: 'age',
  admissionType: 'admissiontype',
  icuDays: 'icu_days',
  weight: 'weight',
  hospMort: 'hospmort',
};

export const VITALS_FIELD_MAP = {
  hr: { csvKey: 'hr', label: 'Heart Rate', unit: 'bpm', icon: 'Heart' },
  map: { csvKey: 'map', label: 'Mean Arterial Pressure', unit: 'mmHg', icon: 'Activity' },
  rr: { csvKey: 'rr', label: 'Respiratory Rate', unit: 'rpm', icon: 'Wind' },
  temp: { csvKey: 'temp', label: 'Temperature', unit: '°C', icon: 'Thermometer' },
  spo2: { csvKey: 'spo2', label: 'SpO₂', unit: '%', icon: 'Droplets' },
  gcs: { csvKey: 'gcs', label: 'GCS', unit: '', icon: 'Brain' },
};

export const SOFA_ORGAN_MAP = {
  Resp: { csvActual: 'sofa_resp', label: 'Respiratory', labelZh: '呼吸', chartLabel: '呼吸趨勢圖', color: '#3B82F6' },
  Coag: { csvActual: 'sofa_coag', label: 'Coagulation', labelZh: '凝血', chartLabel: '凝血趨勢圖', color: '#F59E0B' },
  Liver: { csvActual: 'sofa_liver', label: 'Liver', labelZh: '肝臟', chartLabel: '肝臟趨勢圖', color: '#10B981' },
  CV: { csvActual: 'sofa_cv', label: 'Cardiovascular', labelZh: '心血管', chartLabel: '心血管趨勢圖', color: '#EF4444' },
  CNS: { csvActual: 'sofa_cns', label: 'CNS', labelZh: '中樞神經', chartLabel: '中樞神經趨勢圖', color: '#8B5CF6' },
  Renal: { csvActual: 'sofa_renal', label: 'Renal', labelZh: '腎臟', chartLabel: '腎臟趨勢圖', color: '#EC4899' },
};

export const GAP_WINDOWS = [4, 8, 16, 24];

export const GENDER_MAP = { 0: '女', 1: '男' };

export function formatGender(val) {
  return GENDER_MAP[val] ?? 'N/A';
}

export function formatAge(val) {
  return val != null ? Math.floor(val) : 'N/A';
}
