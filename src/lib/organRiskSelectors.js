function normalizeLookupNumber(value) {
  if (value == null || value === '') return null;
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : null;
}

export function getOrganRiskSeries(rows, patientId, horizon, organ) {
  const normalizedPatientId = normalizeLookupNumber(patientId);
  const normalizedHorizon = normalizeLookupNumber(horizon);
  const normalizedOrgan = organ != null ? String(organ) : '';

  if (!Array.isArray(rows) || normalizedPatientId == null || normalizedHorizon == null || !normalizedOrgan) {
    return [];
  }

  return rows
    .filter(
      (row) =>
        row.patient_id === normalizedPatientId &&
        row.horizon === normalizedHorizon &&
        row.organ === normalizedOrgan,
    )
    .sort((a, b) => a.hour_t - b.hour_t);
}

export function getOrganRiskSnapshot(rows, patientId, horizon, hour) {
  const normalizedPatientId = normalizeLookupNumber(patientId);
  const normalizedHorizon = normalizeLookupNumber(horizon);
  const normalizedHour = normalizeLookupNumber(hour);

  if (!Array.isArray(rows) || normalizedPatientId == null || normalizedHorizon == null || normalizedHour == null) {
    return {};
  }

  return rows.reduce((snapshot, row) => {
    if (
      row.patient_id === normalizedPatientId &&
      row.horizon === normalizedHorizon &&
      row.hour_t === normalizedHour
    ) {
      snapshot[row.organ] = row;
    }
    return snapshot;
  }, {});
}

export function getOrganRiskRow(rows, patientId, horizon, hour, organ) {
  const normalizedPatientId = normalizeLookupNumber(patientId);
  const normalizedHorizon = normalizeLookupNumber(horizon);
  const normalizedHour = normalizeLookupNumber(hour);
  const normalizedOrgan = organ != null ? String(organ) : '';

  if (
    !Array.isArray(rows) ||
    normalizedPatientId == null ||
    normalizedHorizon == null ||
    normalizedHour == null ||
    !normalizedOrgan
  ) {
    return null;
  }

  return (
    rows.find(
      (row) =>
        row.patient_id === normalizedPatientId &&
        row.horizon === normalizedHorizon &&
        row.hour_t === normalizedHour &&
        row.organ === normalizedOrgan,
    ) || null
  );
}
