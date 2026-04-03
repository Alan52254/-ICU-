import React from 'react';
import { SOFA_ORGAN_MAP } from '../lib/fieldMapping';
// 如果你有用到 clinicalRules，記得保留引入；沒有的話可以註解掉
// import { determineTrend } from '../lib/clinicalRules'; 
import { TrendingUp, TrendingDown, Minus, ShieldAlert } from './Icons';

export default function OrganBreakdown({ insights, gap }) {
  if (!insights || insights.status === 'no_data') {
    return (
      <div className="medical-card p-5">
        <h3 className="text-sm font-bold text-slate-700 mb-3">SOFA 分項詳細資訊</h3>
        <p className="text-slate-400 text-xs">尚無資料</p>
      </div>
    );
  }

  // 這裡把 trueSofa 也解構出來
  const { actualSofa, predictedSofa, trueSofa, trend, organPredictions } = insights;
  const TrendIcon = trend?.code === 1 ? TrendingUp : trend?.code === -1 ? TrendingDown : Minus;

  const organsEntries = Object.entries(SOFA_ORGAN_MAP);

  return (
    <div className="medical-card p-5">
      {/* 頂部標題與趨勢標籤 */}
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

      {/* 總 SOFA 三欄位顯示 (當下 / 預測 / 真值) */}
      <div className="grid grid-cols-3 gap-2 mb-6">
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-center">
          <p className="text-[10px] text-blue-500 uppercase font-bold tracking-wider mb-1">當下 (CURR)</p>
          <p className="text-3xl font-bold font-mono text-blue-700 tabular-nums">{actualSofa ?? '—'}</p>
        </div>
        <div className="bg-orange-50 border border-orange-100 rounded-xl p-3 text-center">
          <p className="text-[10px] text-orange-500 uppercase font-bold tracking-wider mb-1">預測 (PRED)</p>
          <p className="text-3xl font-bold font-mono text-orange-600 tabular-nums">{predictedSofa ?? '—'}</p>
        </div>
        <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 text-center">
          <p className="text-[10px] text-emerald-500 uppercase font-bold tracking-wider mb-1">真值 (TRUE)</p>
          <p className="text-3xl font-bold font-mono text-emerald-600 tabular-nums">{trueSofa ?? '—'}</p>
        </div>
      </div>

      {/* 各器官詳細評估 */}
      <h4 className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-3">
        六器官 SOFA 詳細評估
      </h4>
      <div className="space-y-3">
        {organsEntries.map(([key, cfg]) => {
          const pred = organPredictions?.[key];

          // 讀取三個不同的數值
          const currVal = pred?.current_sofa ?? '—';
          const predVal = pred?.future_max_pred ?? '—';
          const trueVal = pred?.future_max_true ?? '—';

          const maxScore = 4;
          const currPct = typeof currVal === 'number' ? (currVal / maxScore) * 100 : 0;
          const predPct = typeof predVal === 'number' ? (predVal / maxScore) * 100 : 0;
          const truePct = typeof trueVal === 'number' ? (trueVal / maxScore) * 100 : 0;

          return (
            <div key={key} className="group">
              {/* 數值文字區 */}
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-slate-700 font-bold">{cfg.labelZh}</span>
                <div className="flex items-center gap-2 text-xs font-mono bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
                  <span className="text-blue-600 font-bold w-3 text-center">{currVal}</span>
                  <span className="text-slate-300 text-[10px]">vs</span>
                  <span className="text-orange-500 font-bold w-3 text-center">{predVal}</span>
                  <span className="text-slate-300 text-[10px]">vs</span>
                  <span className="text-emerald-500 font-bold w-3 text-center">{trueVal}</span>
                </div>
              </div>

              {/* 三條進度條並列對比 */}
              <div className="flex gap-1 h-2.5">
                {/* 當下 (藍色) */}
                <div className="flex-1 bg-blue-100 rounded-full overflow-hidden" title="當下分數">
                  <div
                    className="h-full bg-blue-500 rounded-full transition-all duration-500"
                    style={{ width: `${currPct}%` }}
                  />
                </div>
                {/* 預測 (橘色) */}
                <div className="flex-1 bg-orange-100 rounded-full overflow-hidden" title="預測分數">
                  <div
                    className="h-full bg-orange-400 rounded-full transition-all duration-500"
                    style={{ width: `${predPct}%` }}
                  />
                </div>
                {/* 真值 (綠色) */}
                <div className="flex-1 bg-emerald-100 rounded-full overflow-hidden" title="真值分數">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                    style={{ width: `${truePct}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 圖例 (Legend) */}
      <div className="flex items-center justify-center gap-4 mt-5 pt-3 border-t border-slate-100 text-[10px] text-slate-500 font-medium">
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-500" /> 當下值</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-orange-400" /> 預測值</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500" /> 真實值</span>
      </div>
    </div>
  );
}