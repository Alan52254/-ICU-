import React from 'react';
import { SOFA_ORGAN_MAP } from '../lib/fieldMapping';
import { TrendingUp, TrendingDown, Minus, ShieldAlert } from './Icons';

function TrendChip({ value, colorClass, label }) {
  if (value == null) return <span className="text-slate-300 text-sm font-mono">N/A</span>;
  const v = Number(value);
  if (v > 0)  return <span className={`text-sm font-bold font-mono ${colorClass || 'text-rose-500'}`}>↑ +1</span>;
  if (v < 0)  return <span className={`text-sm font-bold font-mono ${colorClass || 'text-emerald-500'}`}>↓ -1</span>;
  return <span className={`text-sm font-bold font-mono ${colorClass || 'text-slate-400'}`}>→ 0</span>;
}

export default function OrganBreakdown({ insights, gap }) {
  if (!insights || insights.status === 'no_data') {
    return (
      <div className="medical-card p-5">
        <h3 className="text-sm font-bold text-slate-700 mb-3">SOFA 分項 (預測 vs 實際)</h3>
        <p className="text-slate-400 text-xs">尚無資料</p>
      </div>
    );
  }

  const { trend, organPredictions } = insights;
  const TrendIcon = trend?.code === 1 ? TrendingUp : trend?.code === -1 ? TrendingDown : Minus;
  const organsEntries = Object.entries(SOFA_ORGAN_MAP);

  return (
    <div className="medical-card p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-blue-600" />
          <h3 className="text-sm font-bold text-slate-800">該時間點詳細資訊卡</h3>
        </div>
        {trend && (
          <div
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold"
            style={{ backgroundColor: `${trend.color}15`, color: trend.color, border: `1px solid ${trend.color}30` }}
          >
            <TrendIcon className="w-3 h-3" />
            {trend.label}
          </div>
        )}
      </div>

      {/* Total SOFA comparison — 3 Column Layout */}
      <div className="grid grid-cols-3 gap-2 mb-5">
        <div className="bg-slate-50 border border-slate-100 rounded-xl p-2 text-center">
          <p className="text-[9px] text-slate-500 uppercase font-bold tracking-wider mb-1">當下 (CURR)</p>
          <p className="text-xl font-bold font-mono text-blue-600 tabular-nums">
            {insights.actualSofa != null ? insights.actualSofa : '—'}
          </p>
        </div>
        <div className="bg-orange-50 border border-orange-100 rounded-xl p-2 text-center">
          <p className="text-[9px] text-orange-500 uppercase font-bold tracking-wider mb-1">預測 (PRED)</p>
          <p className="text-xl font-bold font-mono text-orange-600 tabular-nums">
            {insights.predictedSofa != null ? insights.predictedSofa : '—'}
          </p>
        </div>
        <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-2 text-center">
          <p className="text-[9px] text-emerald-500 uppercase font-bold tracking-wider mb-1">真值 (TRUE)</p>
          <p className="text-xl font-bold font-mono text-emerald-600 tabular-nums">
            {insights.trueSofa != null ? insights.trueSofa : '—'}
          </p>
        </div>
      </div>

      {/* Organ breakdown — shows pred trend vs true trend */}
      <h4 className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-3">
        六器官趨勢精準對齊 (預測 vs 真值)
      </h4>
      <div className="space-y-4">
        {organsEntries.map(([key, cfg]) => {
          const pred = organPredictions?.[key];
          const yPred = pred?.y_pred ?? null;
          const yTrue = pred?.y_true ?? null;
          const currSofa = pred?.current_sofa ?? null;
          const predSofa = pred?.future_max_pred ?? null;
          const trueSofa = pred?.future_max_true ?? null;
          
          const maxScore = 4;
          const currPct = typeof currSofa === 'number' ? (currSofa / maxScore) * 100 : 0;
          const predPct = typeof predSofa === 'number' ? (predSofa / maxScore) * 100 : 0;
          const truePct = typeof trueSofa === 'number' ? (trueSofa / maxScore) * 100 : 0;

          return (
            <div key={key} className="group">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-slate-700">{cfg.labelZh}</span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    [{currSofa ?? '?'}]
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm font-mono">
                  <TrendChip value={yPred} colorClass="text-orange-500" />
                  <span className="text-slate-300 text-[10px]">/</span>
                  <TrendChip value={yTrue} colorClass="text-emerald-500" />
                </div>
              </div>

              {/* Stacked indicators for visual comparison */}
              <div className="space-y-1">
                {/* Prediction Bar */}
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden flex" title="預測變化">
                  <div className="h-full bg-slate-300" style={{ width: `${currPct}%` }} />
                  <div 
                    className="h-full bg-orange-400/50" 
                    style={{ width: `${Math.max(0, predPct - currPct)}%` }} 
                  />
                  {predPct < currPct && (
                     <div 
                      className="h-full bg-emerald-400/30" 
                      style={{ width: `${currPct - predPct}%`, marginLeft: `-${currPct - predPct}%` }} 
                    />
                  )}
                </div>
                {/* True Value Indicator (Small dots or thin bar) */}
                <div className="relative h-1 bg-slate-50 rounded-full overflow-hidden">
                   <div 
                    className="absolute h-full bg-emerald-500 transition-all" 
                    style={{ width: '3px', left: `${truePct}%`, transform: 'translateX(-50%)' }} 
                    title="真值點"
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 mt-6 pt-4 border-t border-slate-100 text-[10px] text-slate-400">
        <span className="flex items-center gap-1">
          <span className="w-2 h-0.5 bg-orange-500 rounded" /> 預測 (PRED)
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-0.5 bg-emerald-500 rounded" /> 真值 (TRUE)
        </span>
      </div>
    </div>
  );
}
