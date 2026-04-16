import React, { useMemo } from 'react';
import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceArea,
  Label,
} from 'recharts';

const ORGAN_META = {
  Resp: { label: '呼吸' },
  Coag: { label: '凝血' },
  Liver: { label: '肝臟' },
  CV: { label: '心血管' },
  CNS: { label: '中樞神經' },
  Renal: { label: '腎臟' },
};

function toNumber(value, fallback = null) {
  if (value === undefined || value === null || value === '') return fallback;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function getOrganLabel(organKey) {
  return ORGAN_META[organKey]?.label || organKey;
}

/**
 * 核心邏輯修正：嚴格依賴資料存在性來決定預測窗
 */
function buildSnapshotSeries(rows, selectedOrgan, selectedHour, gap) {
  const safeHour = toNumber(selectedHour, 0);
  const safeGap = toNumber(gap, 4);

  // 1. 基本過濾與型別轉換
  const filtered = rows
    .filter((row) => row.organ === selectedOrgan && toNumber(row.horizon) === safeGap)
    .map((row) => ({
      ...row,
      hour_t: toNumber(row.hour_t, 0),
      window_start_hour: toNumber(row.window_start_hour, null),
      window_end_hour: toNumber(row.window_end_hour, null),
      pred_prob: toNumber(row.pred_prob, null),
      true_label: toNumber(row.true_label, null),
    }))
    .sort((a, b) => a.hour_t - b.hour_t);

  if (filtered.length === 0) {
    return { chartData: [], windowStart: null, windowEnd: null, maxHour: 0 };
  }

  // 2. 領域邏輯檢查：找出該器官資料的絕對終點
  // 只有當 NOW (safeHour) <= 最後一筆資料的時間點時，才允許產生快照。
  const absoluteMaxHour = Math.max(...filtered.map((row) => row.hour_t));

  let windowStart = null;
  let windowEnd = null;
  let snapshotRow = null;

  if (safeHour <= absoluteMaxHour) {
    // 尋找當前或最近的歷史快照
    snapshotRow =
      filtered.find((row) => row.hour_t === safeHour) ||
      [...filtered].reverse().find((row) => row.hour_t <= safeHour);

    // 嚴格依賴資料欄位，廢除基於 selectedHour + gap 的數學外推 fallback
    windowStart = snapshotRow?.window_start_hour ?? null;
    windowEnd = snapshotRow?.window_end_hour ?? null;
  }

  // 3. 決定圖表渲染範圍 (包含歷史、預測窗與選取點)
  const hourList = filtered.map((row) => row.hour_t);
  const maxHour = Math.max(...hourList, windowEnd ?? 0, safeHour);

  // 4. 構建時序陣列
  const chartData = [];
  for (let hour = 0; hour <= maxHour; hour += 1) {
    const isPast = hour <= safeHour;
    const inWindow = windowStart !== null && windowEnd !== null && hour >= windowStart && hour <= windowEnd;
    const historyRow = isPast ? filtered.find((row) => row.hour_t === hour) : null;

    chartData.push({
      hour_t: hour,
      history_pred: isPast ? historyRow?.pred_prob ?? null : null,
      future_pred: inWindow ? snapshotRow?.pred_prob ?? null : null,
      future_true: inWindow ? snapshotRow?.true_label ?? null : null,
    });
  }

  return { chartData, windowStart, windowEnd, maxHour };
}

function CustomTooltip({ active, payload, label, selectedHour }) {
  if (!active || !payload || payload.length === 0) return null;

  const row = payload[0].payload;
  const isFuture = Number(label) >= Number(selectedHour);

  return (
    <div className="min-w-[180px] rounded-xl border border-slate-200 bg-white/95 p-3 text-xs shadow-xl backdrop-blur-md">
      <p className="mb-2 border-b border-slate-100 pb-1 font-mono font-bold text-slate-800">
        ICU Hour {label}
      </p>
      {isFuture ? (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-4">
            <span className="text-slate-500">惡化機率</span>
            <span className="font-mono font-bold text-orange-600">
              {row.future_pred != null ? row.future_pred.toFixed(4) : '-'}
            </span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-slate-500">真實標籤</span>
            <span className={`font-mono font-bold ${row.future_true === 1 ? 'text-emerald-600' : 'text-slate-500'}`}>
              {row.future_true != null ? row.future_true : '-'}
            </span>
          </div>
        </div>
      ) : (
        <p className="italic text-slate-400">NOW 左側資料已遮罩，保持 X 軸完整。</p>
      )}
    </div>
  );
}

export default function RiskDeteriorationChart({ rows = [], selectedHour, selectedOrgan, gap }) {
  const safeHour = toNumber(selectedHour, 0);
  const safeGap = toNumber(gap, 4);
  const organLabel = getOrganLabel(selectedOrgan);

  const { chartData, windowStart, windowEnd, maxHour } = useMemo(
    () => buildSnapshotSeries(rows, selectedOrgan, safeHour, safeGap),
    [rows, selectedOrgan, safeHour, safeGap],
  );

  const xTicks = useMemo(() => {
    if (!chartData.length) return [];
    const tickStep = maxHour >= 96 ? 12 : maxHour >= 48 ? 8 : 4;
    const ticks = [];
    for (let hour = 0; hour <= maxHour; hour += tickStep) {
      ticks.push(hour);
    }
    return ticks;
  }, [chartData.length, maxHour]);

  if (chartData.length === 0) {
    return (
      <div className="flex h-[450px] w-full items-center justify-center text-sm text-slate-400">
        No prediction data available
      </div>
    );
  }

  return (
    <div className="flex flex-col mt-2 h-[450px] w-full">
      {/* 頂部標籤區 */}
      <div className="flex items-center justify-between px-1 mb-3">
        <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-[10px] font-bold shadow-sm">
          <span className="text-slate-500">{organLabel}器官惡化趨勢圖</span>
        </div>
        <div className="flex items-center gap-3 rounded-full border border-slate-200 bg-white px-3 py-1 text-[10px] font-bold shadow-sm">
          <span className="flex items-center gap-1 text-orange-600">
            <span className="h-0 w-4 border-t-2 border-dashed border-orange-500" />
            惡化機率
          </span>
          <span className="flex items-center gap-1 text-emerald-600">
            <span className="h-0 w-4 border-t-2 border-dashed border-emerald-500" />
            真實標籤
          </span>
        </div>
      </div>

      <div className="flex-grow">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 25, right: 85, left: 0, bottom: 35 }}>
            <CartesianGrid stroke="#f1f5f9" strokeDasharray="3 3" vertical={false} />

            <XAxis
              dataKey="hour_t"
              type="number"
              domain={[0, maxHour]}
              ticks={xTicks}
              interval={0}
              minTickGap={15}
              tick={{ fill: '#94A3B8', fontSize: 10, fontFamily: 'JetBrains Mono' }}
              tickMargin={10}
              axisLine={{ stroke: '#E2E8F0' }}
              label={{
                value: 'ICU Hour',
                offset: 0,
                position: 'bottom',
                style: { fill: '#94A3B8', fontSize: 11, fontWeight: 'bold' },
              }}
            />

            <YAxis
              domain={[-0.1, 1.1]}
              tick={{ fill: '#94A3B8', fontSize: 11, fontFamily: 'JetBrains Mono' }}
              axisLine={{ stroke: '#E2E8F0' }}
              ticks={[0, 0.2, 0.4, 0.6, 0.8, 1]}
            />

            <Tooltip content={<CustomTooltip selectedHour={safeHour} />} />

            {windowStart != null && windowEnd != null && (
              <ReferenceArea
                x1={windowStart}
                x2={windowEnd}
                fill="#EEF2FF"
                fillOpacity={0.4}
                stroke="#6366F1"
                strokeWidth={1}
                strokeDasharray="3 3"
                strokeOpacity={0.8}
                label={{
                  value: `預測區間: ${windowStart}h - ${windowEnd}h`,
                  position: 'insideTop',
                  fill: '#6366F1',
                  fontSize: 10,
                  fontWeight: 700,
                  offset: 5,
                }}
              />
            )}

            <ReferenceLine x={safeHour} stroke="#3B82F6" strokeDasharray="4 4" strokeWidth={2} isFront>
              <Label value="NOW" position="top" fill="#3B82F6" fontSize={11} fontWeight="bold" />
            </ReferenceLine>

            <Line
              type="linear"
              dataKey="future_pred"
              stroke="#F97316"
              strokeWidth={3}
              strokeDasharray="8 6"
              dot={false}
              isAnimationActive={false}
              connectNulls={false}
            />

            <Line
              type="linear"
              dataKey="future_true"
              stroke="#10B981"
              strokeWidth={2.5}
              strokeDasharray="6 6"
              dot={{ r: 4, fill: '#10B981', stroke: '#ffffff', strokeWidth: 1 }}
              activeDot={{ r: 5, fill: '#10B981', stroke: '#ffffff', strokeWidth: 1 }}
              isAnimationActive={false}
              connectNulls={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
