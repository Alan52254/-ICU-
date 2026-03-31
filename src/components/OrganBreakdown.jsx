import React from 'react';
import { SOFA_ORGAN_MAP } from '../lib/fieldMapping';
import { determineTrend } from '../lib/clinicalRules';
import { TrendingUp, TrendingDown, Minus, ShieldAlert } from './Icons';

export default function OrganBreakdown({ insights, gap }) {
  if (!insights || insights.status === 'no_data') {
    return (
      <div className="medical-card p-5">
        <h3 className="text-sm font-bold text-slate-700 mb-3">SOFA 分項 (預測 vs 實際)</h3>
        <p className="text-slate-400 text-xs">尚無資料</p>
      </div>
    );
  }

  const { actualSofa, predictedSofa, trend, organPredictions } = insights;
  const TrendIcon = trend?.code === 1 ? TrendingUp : trend?.code === -1 ? TrendingDown : Minus;

  const organsEntries = Object.entries(SOFA_ORGAN_MAP);

  return (
    <div className="medical-card p-5">
      {/* Header with trend badge */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-blue-600" />
          <h3 className="text-sm font-bold text-slate-800">該時間點詳細資訊卡</h3>
        </div>
        {trend && (
          <div className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold" style={{ backgroundColor: `${trend.color}15`, color: trend.color, border: `1px solid ${trend.color}30` }}>
            <TrendIcon className="w-3 h-3" />
            {trend.label}
          </div>
        )}
      </div>

      {/* Total SOFA comparison */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-center">
          <p className="text-[10px] text-blue-400 uppercase font-bold tracking-wider mb-1">實值 (ACTUAL)</p>
          <p className="text-3xl font-bold font-mono text-blue-700 tabular-nums">{actualSofa ?? 'N/A'}</p>
        </div>
        <div className="bg-orange-50 border border-orange-100 rounded-xl p-3 text-center">
          <p className="text-[10px] text-orange-400 uppercase font-bold tracking-wider mb-1">預測 (PREDICTED)</p>
          <p className="text-3xl font-bold font-mono text-orange-600 tabular-nums">{predictedSofa ?? 'N/A'}</p>
        </div>
      </div>

      {/* Organ breakdown */}
      <h4 className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-3">
        六器官 SOFA 詳細評估
      </h4>
      <div className="space-y-2.5">
        {organsEntries.map(([key, cfg]) => {
          const pred = organPredictions?.[key];
          const actualVal = pred?.current_sofa ?? 'N/A';
          const predictedVal = pred?.future_max ?? 'N/A';
          const maxScore = 4;
          const actualPct = typeof actualVal === 'number' ? (actualVal / maxScore) * 100 : 0;
          const predictedPct = typeof predictedVal === 'number' ? (predictedVal / maxScore) * 100 : 0;

          return (
            <div key={key} className="group">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-slate-600 font-medium">{cfg.labelZh}</span>
                <div className="flex items-center gap-3 text-xs font-mono">
                  <span className="text-blue-600 font-bold tabular-nums">{actualVal}</span>
                  <span className="text-orange-500 font-bold tabular-nums">{predictedVal}</span>
                </div>
              </div>
              <div className="flex gap-1 h-2.5">
                <div className="flex-1 bg-blue-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${actualPct}%`, backgroundColor: cfg.color }}
                  />
                </div>
                <div className="flex-1 bg-orange-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-orange-400 rounded-full transition-all duration-500"
                    style={{ width: `${predictedPct}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 mt-4 text-[10px] text-slate-400">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500" /> 實際值</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-400" /> 預測值</span>
      </div>
    </div>
  );
}
