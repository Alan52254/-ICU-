/**
 * dataHelper.js
 * 
 * Centralized logic for dashboard data validation and filtering.
 */

/**
 * Validates current UI state against the insights data source.
 * Log results to console.table/group for clinical audit.
 */
export function debugStateValidator(patientId, hour, gap, insights) {
  if (!patientId || !insights) return;
  
  const hId = Number(insights.hour);
  const selectedH = Number(hour);
  const horizon = Number(gap);
  
  const isAligned = hId === selectedH;

  console.group(`🔍 ICU Clinical Dev Validator [PID: ${patientId}]`);
  console.table({
    "UI State: Hour (t)": selectedH,
    "UI State: Horizon (h)": `${horizon}h`,
    "Data Source: Hour (t)": hId,
    "Status": isAligned ? "✅ ALIGNED" : "⚠ MISALIGNED (Syncing...)",
    "Target Window Start": insights.target_start_hour,
    "Target Window End": insights.target_end_hour,
    "Actual SOFA (Current)": insights.actualSofa,
    "Predicted SOFA (Future Max)": insights.predictedSofa
  });
  
  if (insights.organPredictions) {
    console.log("Organ Data Audit:", insights.organPredictions);
  }
  console.groupEnd();
}

/**
 * Unified row filter to prevent duplicate search logic in components.
 */
export function findSofaRowByHour(sofaData, targetHour) {
  if (!sofaData) return null;
  const h = Number(targetHour);
  return sofaData.find(row => Number(row.hour_idx) === h) || null;
}
