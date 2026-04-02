/**
 * sofaDatasetAdapter.js
 * 
 * This adapter ensures the frontend uses a consistent, normalized data structure
 * derived from the backend API responses. It enforces the "Single Truth" principle.
 */

export const ORGANS = ['Resp', 'Coag', 'Liver', 'CV', 'CNS', 'Renal'];

export function normalizeInsights(insights) {
  if (!insights || insights.status === 'no_data') {
    return {
      hour: 0,
      actualSofa: 0,
      predictedSofa: 0,
      trueSofa: 0,
      organPredictions: {},
      trend: { code: 0, label: '穩定', color: '#64748B' },
      summary: '無資料'
    };
  }

  // Ensure all values are numbers or null
  return {
    ...insights,
    actualSofa: Number(insights.actualSofa) || 0,
    predictedSofa: Number(insights.predictedSofa) || 0,
    trueSofa: Number(insights.trueSofa) || 0,
    target_start_hour: insights.target_start_hour != null ? Number(insights.target_start_hour) : null,
    target_end_hour: insights.target_end_hour != null ? Number(insights.target_end_hour) : null,
  };
}

export function getChartSeries(sofaData, insights, selectedHour) {
  if (!sofaData || sofaData.length === 0) return [];

  const maxHourInSofa = Math.max(...sofaData.map(r => r.hour_idx));
  const targetStart = insights?.target_start_hour;
  const targetEnd = insights?.target_end_hour;
  const maxHour = Math.max(maxHourInSofa, targetEnd || 0);

  const series = [];
  for (let h = 0; h <= maxHour; h++) {
    const row = sofaData.find(d => Number(d.hour_idx) === h);
    
    // Actual: Only show up to the selected hour
    const actual = (h <= selectedHour && row) ? Number(row.sofa) : null;

    // Predictions: Horizontal lines within the target window
    let predicted = null;
    let trueVal = null;
    if (targetStart != null && targetEnd != null && h >= targetStart && h <= targetEnd) {
      predicted = insights.predictedSofa;
      trueVal = insights.trueSofa;
    }

    series.push({
      hour: h,
      actual,
      predicted,
      true_val: trueVal
    });
  }
  return series;
}
