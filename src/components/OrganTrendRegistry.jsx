import React, { useMemo } from 'react';
import { SOFA_ORGAN_MAP } from '../lib/fieldMapping';

// Maps numeric trend value → badge
function StatusBadge({ value, type = 'pred' }) {
  if (value == null || (typeof value === 'number' && isNaN(value))) {
    return (
      <span className="inline-flex items-center px-3 py-1.5 rounded-md text-[10px] font-bold tabular-nums bg-slate-100 text-slate-300 border border-slate-200/50">
        — N/A
      </span>
    );
  }

  const v = Number(value);
  const isPred = type === 'pred';
  const accentColor = isPred ? '#F97316' : '#10B981';

  if (v < 0) {
    return (
      <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-[10px] font-bold tabular-nums bg-emerald-50 text-emerald-600 border border-emerald-100">
        ↓ (-1) 改善
      </span>
    );
  }
  if (v > 0) {
    return (
      <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-[10px] font-bold tabular-nums bg-rose-50 text-rose-600 border border-rose-100">
        ↑ (+1) 惡化
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-[10px] font-bold tabular-nums bg-slate-50 text-slate-500 border border-slate-200">
      → (0) 穩定
    </span>
  );
}

/**
 * OrganTrendRegistry
 * Reads y_pred / y_true directly from insights.organPredictions (server-side).
 * Values are already computed as Math.sign(future_max - current).
 */
export default function OrganTrendRegistry({ insights, gap, selectedHour }) {
  const organEntries = useMemo(() => Object.entries(SOFA_ORGAN_MAP), []);
  const hasData = insights && insights.organPredictions && insights.status !== 'no_data';

  return (
    <div className="medical-card p-5">
      {/* Header */}
      <div className="mb-4 flex items-start justify-between border-b border-slate-50 pb-3">
        <div>
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            器官趨勢預警系統
            <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 text-[9px] font-mono border border-blue-100 uppercase tracking-tighter">AI Analysis</span>
          </h3>
          <p className="text-[10px] text-slate-400 font-mono mt-0.5">
            Snapshot: Hour {selectedHour ?? '—'} · Forecast Window: {gap}h
          </p>
        </div>
      </div>

      <table className="w-full border-separate" style={{ borderSpacing: '0 8px' }}>
        <thead>
          <tr>
            <th className="text-left text-[10px] text-slate-400 font-bold uppercase tracking-widest pb-1 w-24">器官項目</th>
            <th className="text-center text-[10px] font-bold uppercase tracking-widest pb-1 w-1/3" style={{ color: '#F97316' }}>預測趨向 (PRED)</th>
            <th className="text-center text-[10px] font-bold uppercase tracking-widest pb-1 w-1/3" style={{ color: '#10B981' }}>實際狀況 (TRUE)</th>
          </tr>
        </thead>
        <tbody>
          {organEntries.map(([key, cfg]) => {
            const organData = hasData ? insights.organPredictions[key] : null;
            const predTrend = organData?.y_pred ?? null;
            const trueTrend = organData?.y_true ?? null;

            return (
              <tr key={key} className="hover:bg-slate-50 transition-colors rounded-md">
                <td className="py-1">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: cfg.color }} />
                    <span className="font-bold text-slate-700 text-sm">{cfg.labelZh}</span>
                  </div>
                </td>
                <td className="py-1 text-center">
                  <StatusBadge value={predTrend} />
                </td>
                <td className="py-1 text-center">
                  <StatusBadge value={trueTrend} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {!hasData && (
        <p className="text-center text-slate-400 text-sm py-4">
          選取時間點以顯示趨勢預警
        </p>
      )}
    </div>
  );
}
