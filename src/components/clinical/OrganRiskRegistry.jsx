import React from 'react';
import { AlertCircle, ShieldCheck } from '../Icons';

const ORGAN_META = [
  { key: 'Resp', label: '呼吸' },
  { key: 'Coag', label: '凝血' },
  { key: 'Liver', label: '肝臟' },
  { key: 'CV', label: '心血管' },
  { key: 'CNS', label: '中樞神經' },
  { key: 'Renal', label: '腎臟' },
];

const ORANGE = '#F97316';

function toNumber(value, fallback = null) {
  if (value === undefined || value === null || value === '') return fallback;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function getChineseStatus(value) {
  return value === 1 ? '惡化' : '未惡化';
}

function formatProbability(value) {
  return toNumber(value, 0).toFixed(4);
}

function OrganCard({ organLabel, data, isSelected, onClick }) {
  if (!data) {
    return (
      <div className="relative rounded-2xl border border-dashed border-slate-200 bg-white/60 p-3">
        <div className="mb-2 flex items-center justify-between">
          <div>
            <div className="text-[13px] font-bold text-slate-500">{organLabel}</div>
            <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400">器官風險快照</div>
          </div>
        </div>
        <div className="text-xs text-slate-400">No prediction data available</div>
      </div>
    );
  }

  const predProb = Math.max(0, Math.min(1, toNumber(data.pred_prob, 0)));
  const predLabel = toNumber(data.pred_label, 0);
  const trueLabel = toNumber(data.true_label, 0);
  const isCritical = predLabel === 1;
  const predText = getChineseStatus(predLabel);
  const trueText = getChineseStatus(trueLabel);

  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'w-full overflow-hidden rounded-2xl border p-3 text-left',
        isSelected ? 'border-indigo-200 bg-white ring-1 ring-indigo-50 -translate-x-1' : 'border-slate-100 bg-white/80',
        isCritical ? 'border-rose-300' : '',
      ].join(' ')}
    >
      <div className="mb-2 flex items-start justify-between">
        <div className="flex flex-col">
          <span className={`text-[13px] font-bold ${isSelected ? 'text-indigo-700' : 'text-slate-700'}`}>{organLabel}</span>
          <span className="text-[10px] font-mono uppercase tracking-tight text-slate-400">惡化發生機率</span>
        </div>
        <div className={`text-right text-[17px] font-mono font-black ${isCritical ? 'text-rose-600' : 'text-orange-500'}`}>
          {formatProbability(predProb)}
        </div>
      </div>

      <div className="mb-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100 outline outline-1 outline-slate-100">
        <div
          className="h-full rounded-full"
          style={{ width: `${predProb * 100}%`, backgroundColor: ORANGE }}
        />
      </div>

      <div className="mt-1 flex items-center justify-between border-t border-slate-50 pt-2">
        <div className="flex flex-wrap gap-2">
          <span className="inline-flex items-center rounded-lg bg-orange-100 px-2 py-0.5 text-[10px] font-black text-orange-700">
            {`Pred ${predLabel}（${predText}）`}
          </span>
          <span className="inline-flex items-center rounded-lg bg-emerald-100 px-2 py-0.5 text-[10px] font-black text-emerald-700">
            {`True ${trueLabel}（${trueText}）`}
          </span>
        </div>

        <div className="flex items-center gap-1">
          {isCritical ? (
            <AlertCircle className="h-5 w-5 text-rose-600" />
          ) : (
            <ShieldCheck className="h-5 w-5 text-emerald-600" />
          )}
        </div>
      </div>
    </button>
  );
}

export default function OrganRiskRegistry({ organData = {}, selectedOrgan, onSelectOrgan }) {
  return (
    <div className="space-y-2">
      {ORGAN_META.map((item) => (
        <OrganCard
          key={item.key}
          organLabel={item.label}
          data={organData?.[item.key] ?? null}
          isSelected={selectedOrgan === item.key}
          onClick={() => onSelectOrgan(item.key)}
        />
      ))}
    </div>
  );
}
