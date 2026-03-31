import React from 'react';
import { Sparkles, AlertTriangle, Activity } from './Icons';

export default function ClinicalInsights({ insights, gap }) {
  if (!insights || insights.status === 'no_data') {
    return (
      <div className="medical-card p-5">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4 text-teal-600" />
          <h3 className="text-sm font-bold text-slate-800">AI 臨床洞察</h3>
        </div>
        <p className="text-slate-400 text-xs">選取時間點後產生分析報告</p>
      </div>
    );
  }

  const { summary, trend, actualSofa, predictedSofa, diff, hour } = insights;
  const isCritical = trend?.code === 1 && actualSofa >= 8;

  return (
    <div className={`medical-card p-5 ${isCritical ? 'border-red-200 bg-red-50/30' : ''}`}>
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-4 h-4 text-teal-600" />
        <h3 className="text-sm font-bold text-slate-800">AI 臨床洞察</h3>
        <span className="text-[10px] text-slate-400 font-mono ml-auto">Hour {hour} • {gap}h forecast</span>
      </div>

      {/* Trend badge */}
      {trend && (
        <div
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold mb-3"
          style={{
            backgroundColor: `${trend.color}10`,
            color: trend.color,
            border: `1px solid ${trend.color}25`,
          }}
        >
          <span className="text-base">{trend.icon}</span>
          趨勢判定: {trend.label}
          {diff != null && <span className="font-mono ml-1">(Δ{diff > 0 ? '+' : ''}{diff})</span>}
        </div>
      )}

      {/* Clinical summary */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mt-2">
        <p className="text-xs md:text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">
          {summary}
        </p>
      </div>

      {/* Critical warning */}
      {isCritical && (
        <div className="mt-4 bg-red-50 border border-red-200 rounded-xl p-3 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-bold text-red-700 mb-1">需要即時臨床關注</p>
            <p className="text-[11px] text-red-600">
              預測未來 {gap} 小時 SOFA 總分達 {predictedSofa}，
              目前分數 {actualSofa}，建議立即評估介入措施。
            </p>
          </div>
        </div>
      )}

      {/* System info */}
      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-1.5 text-[10px] text-slate-400">
        <Activity className="w-3 h-3" />
        <span>基於 MIMIC-IV SOFA 趨勢分析 • 僅供參考</span>
      </div>
    </div>
  );
}
