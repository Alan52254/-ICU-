function toNullableNumber(value) {
  if (value == null || value === '') return null;
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : null;
}

export function normalizeOrganRiskRow(row) {
  if (!row || typeof row !== 'object') return null;

  return {
    ...row,
    patient_id: toNullableNumber(row.patient_id),
    horizon: toNullableNumber(row.horizon),
    hour_t: toNullableNumber(row.hour_t),
    window_start_hour: toNullableNumber(row.window_start_hour),
    window_end_hour: toNullableNumber(row.window_end_hour),
    organ: row.organ != null ? String(row.organ) : '',
    pred_prob: toNullableNumber(row.pred_prob),
    pred_label: toNullableNumber(row.pred_label),
    true_label: toNullableNumber(row.true_label),
  };
}

export function normalizeOrganRiskRows(rows) {
  if (!Array.isArray(rows)) return [];

  return rows
    .map(normalizeOrganRiskRow)
    .filter((row) => row && row.patient_id != null && row.horizon != null && row.hour_t != null && row.organ);
}
