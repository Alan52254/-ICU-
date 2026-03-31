import React, { useMemo } from 'react';
import { VITALS_FIELD_MAP } from '../lib/fieldMapping';
import { getStatus, STATUS_COLORS, THRESHOLDS } from '../lib/clinicalRules';
import { getIcon } from './Icons';

function MiniSparkline({ data, metricKey, color }) {
  if (!data || data.length < 2) return null;
  const vals = data.map(d => d[metricKey]).filter(v => v != null && !isNaN(v));
  if (vals.length < 2) return null;

  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const range = max - min || 1;
  const w = 80, h = 24;
  const step = w / (vals.length - 1);

  const points = vals.map((v, i) => `${i * step},${h - ((v - min) / range) * h}`).join(' ');

  return (
    <svg width={w} height={h} className="opacity-70">
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function VitalsHero({ vitals, selectedHour }) {
  const currentVitals = useMemo(() => {
    if (!vitals || vitals.length === 0) return null;
    return vitals.find(v => v.hour_idx === selectedHour) || vitals[vitals.length - 1];
  }, [vitals, selectedHour]);

  // Get last 12 hours for sparkline
  const recentVitals = useMemo(() => {
    if (!vitals || vitals.length === 0) return [];
    const hourIdx = selectedHour ?? vitals[vitals.length - 1].hour_idx;
    return vitals.filter(v => v.hour_idx >= hourIdx - 12 && v.hour_idx <= hourIdx);
  }, [vitals, selectedHour]);

  const metrics = Object.entries(VITALS_FIELD_MAP);

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
      {metrics.map(([key, cfg]) => {
        const value = currentVitals?.[cfg.csvKey];
        const displayVal = value != null && !isNaN(value) ? value : null;
        const status = displayVal != null ? getStatus(key, displayVal) : 'unknown';
        const colors = STATUS_COLORS[status];
        const Icon = getIcon(cfg.icon);
        const thresh = THRESHOLDS[key];

        // Sparkline color
        const sparkColor = status === 'critical' ? '#EF4444' : status === 'warning' ? '#F59E0B' : '#2563EB';

        return (
          <div key={key} className={`medical-card p-3.5 border ${colors.bg} relative overflow-hidden transition-all duration-300`}>
            {status === 'critical' && (
              <div className="absolute -top-8 -right-8 w-20 h-20 bg-red-200/40 blur-2xl rounded-full animate-pulse" />
            )}

            {/* Header */}
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5">
                <Icon className={`w-3.5 h-3.5 ${colors.text}`} />
                <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">{cfg.label}</span>
              </div>
              <span className={`w-1.5 h-1.5 rounded-full ${colors.dot} ${status === 'critical' ? 'animate-ping' : 'animate-pulse'}`} />
            </div>

            {/* Value */}
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className={`text-2xl md:text-3xl font-bold tabular-nums ${colors.text} font-mono`}>
                {displayVal != null ? (key === 'temp' ? displayVal.toFixed(1) : Math.round(displayVal)) : 'N/A'}
              </span>
              <span className="text-slate-400 text-[10px] font-semibold">{cfg.unit}</span>
            </div>

            {/* Sparkline + Range */}
            <div className="mt-2 flex items-center justify-between">
              <MiniSparkline data={recentVitals} metricKey={cfg.csvKey} color={sparkColor} />
              {thresh && (
                <span className="text-[9px] text-slate-400 font-mono">
                  {thresh.min}–{thresh.max}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
