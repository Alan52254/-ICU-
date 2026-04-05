import React from 'react';
import { SOFA_ORGAN_MAP } from '../lib/fieldMapping';
import { TrendingUp, TrendingDown, Minus, ShieldAlert } from './Icons';

export default function OrganBreakdown({ insights, gap, selectedTarget }) {
  if (!insights || insights.status === 'no_data') {
    return (
      <div className="medical-card p-5">
        <h3 className="text-sm font-bold text-slate-700 mb-3">SOFA 分項詳細資訊</h3>
        <p className="text-slate-400 text-xs">尚無資料</p>
      </div>
    );
  }

  const { actualSofa, predictedSofa, trueSofa, trend, organPredictions } = insights;
  const isTotal = !selectedTarget || selectedTarget === 'TOTAL';

  // 安全取值
  const targetData = !isTotal ? organPredictions?.[selectedTarget] : null;
  const topCurrVal = isTotal ? actualSofa : targetData?.current_sofa;
  const topPredVal = isTotal ? predictedSofa : targetData?.future_max_pred;
  const topTrueVal = isTotal ? trueSofa : targetData?.future_max_true;

  // 右上角 Badge 永遠顯示總分趨勢
  const displayTrend = trend;
  const TrendIcon = displayTrend?.code === 1 ? TrendingUp : displayTrend?.code === -1 ? TrendingDown : Minus;

  const organsEntries = Object.entries(SOFA_ORGAN_MAP);

  // 標題防呆
  const topLabel = isTotal ? 'TOTAL' : SOFA_ORGAN_MAP[selectedTarget]?.labelZh || selectedTarget;

  return (
    <div className="medical-card p-5">
      {/* 頂部標題與動態趨勢標籤 */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-blue-600" />
          <h3 className="text-sm font-bold text-slate-800 tracking-wide">該時間點詳細資訊卡</h3>
        </div>
        {displayTrend && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold tracking-wide transition-all border" style={{ backgroundColor: `${displayTrend.color}10`, color: displayTrend.color, borderColor: `${displayTrend.color}30` }}>
            <TrendIcon className="w-3 h-3" />
            {displayTrend.label}
          </div>
        )}
      </div>

      {/* 總 SOFA 三欄位顯示 - 加入微漸層質感 */}
      <div className="grid grid-cols-3 gap-2.5 mb-5">
        <div className="relative bg-blue-50/60 border border-blue-100 rounded-xl p-3 flex flex-col items-center justify-center shadow-sm overflow-hidden hover:bg-blue-50 transition-colors">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-400 to-blue-600 opacity-80"></div>
          <p className="text-[10px] text-blue-600 font-bold tracking-wider mb-1">當下 ({topLabel})</p>
          <p className="text-3xl font-bold font-mono text-blue-700 tabular-nums">{topCurrVal ?? '—'}</p>
        </div>
        <div className="relative bg-orange-50/60 border border-orange-100 rounded-xl p-3 flex flex-col items-center justify-center shadow-sm overflow-hidden hover:bg-orange-50 transition-colors">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-400 to-orange-500 opacity-80"></div>
          <p className="text-[10px] text-orange-600 font-bold tracking-wider mb-1">預測 ({topLabel})</p>
          <p className="text-3xl font-bold font-mono text-orange-600 tabular-nums">{topPredVal ?? '—'}</p>
        </div>
        <div className="relative bg-emerald-50/60 border border-emerald-100 rounded-xl p-3 flex flex-col items-center justify-center shadow-sm overflow-hidden hover:bg-emerald-50 transition-colors">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-400 to-emerald-500 opacity-80"></div>
          <p className="text-[10px] text-emerald-600 font-bold tracking-wider mb-1">真值 ({topLabel})</p>
          <p className="text-3xl font-bold font-mono text-emerald-600 tabular-nums">{topTrueVal ?? '—'}</p>
        </div>
      </div>

      {/* 各器官詳細評估 */}
      <h4 className="text-[11px] text-slate-500 font-bold tracking-widest mb-3 uppercase border-b border-slate-100 pb-1.5">
        六器官 SOFA 詳細評估
      </h4>
      {/* 縮緊間距 space-y-2.5 */}
      <div className="space-y-2.5">
        {organsEntries.map(([key, cfg]) => {
          const pred = organPredictions?.[key];
          const isSelected = selectedTarget === key;

          const orgCurrVal = pred?.current_sofa;
          const orgPredVal = pred?.future_max_pred;
          const orgTrueVal = pred?.future_max_true;

          const hasCurr = typeof orgCurrVal === 'number';
          const hasPred = typeof orgPredVal === 'number';
          const hasTrue = typeof orgTrueVal === 'number';

          const maxScore = 4;
          const currPct = hasCurr ? (orgCurrVal / maxScore) * 100 : 0;
          const predPct = hasPred ? (orgPredVal / maxScore) * 100 : 0;
          const truePct = hasTrue ? (orgTrueVal / maxScore) * 100 : 0;

          return (
            // 加入 hover 效果與 Active Indicator (左側藍條)
            <div
              key={key}
              className={`relative group px-2 py-1.5 -mx-2 rounded-lg transition-all border ${isSelected
                ? 'bg-blue-50/40 border-blue-100 shadow-sm'
                : 'border-transparent hover:bg-slate-50 hover:border-slate-100'
                }`}
            >
              {/* 選中時的左側高亮飾條 */}
              {isSelected && <div className="absolute left-0 top-2 bottom-2 w-1 bg-blue-500 rounded-r-md"></div>}

              {/* 數值文字區 */}
              <div className="flex items-center justify-between mb-1">
                <span className={`text-[13px] font-bold ${isSelected ? 'text-blue-700 pl-1' : 'text-slate-700'} transition-all`}>
                  {cfg.labelZh}
                </span>
                {/* 輕量化的膠囊數值顯示 */}
                <div className="flex items-center gap-1.5 font-mono bg-white/80 px-2 py-0.5 rounded-md border border-slate-100">
                  <span className="text-blue-600 font-bold text-sm w-3 text-center">{hasCurr ? orgCurrVal : '—'}</span>
                  <span className="text-slate-300 text-[9px] italic">vs</span>
                  <span className="text-orange-500 font-bold text-sm w-3 text-center">{hasPred ? orgPredVal : '—'}</span>
                  <span className="text-slate-300 text-[9px] italic">vs</span>
                  <span className="text-emerald-500 font-bold text-sm w-3 text-center">{hasTrue ? orgTrueVal : '—'}</span>
                </div>
              </div>

              {/* 三條進度條並列對比 */}
              <div className={`flex gap-1 h-1.5 ${isSelected ? 'pl-1' : ''} transition-all`}>
                <div className={`flex-1 rounded-full overflow-hidden ${hasCurr ? 'bg-blue-100' : 'bg-slate-50 border border-slate-200 border-dashed'}`}>
                  {hasCurr && <div className="h-full bg-blue-500 rounded-full transition-all duration-700" style={{ width: `${currPct}%` }} />}
                </div>
                <div className={`flex-1 rounded-full overflow-hidden ${hasPred ? 'bg-orange-100' : 'bg-slate-50 border border-slate-200 border-dashed'}`}>
                  {hasPred && <div className="h-full bg-orange-400 rounded-full transition-all duration-700" style={{ width: `${predPct}%` }} />}
                </div>
                <div className={`flex-1 rounded-full overflow-hidden ${hasTrue ? 'bg-emerald-100' : 'bg-slate-50 border border-slate-200 border-dashed'}`}>
                  {hasTrue && <div className="h-full bg-emerald-500 rounded-full transition-all duration-700" style={{ width: `${truePct}%` }} />}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 圖例 (Legend) */}
      <div className="flex items-center justify-center gap-5 mt-5 pt-3 border-t border-slate-100 text-[10px] text-slate-500 font-bold tracking-wide">
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-500" /> 當下值</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-orange-400" /> 預測值</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500" /> 真實值</span>
      </div>
    </div>
  );
}