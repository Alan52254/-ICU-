import React, { useMemo, useState, useEffect, useRef } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { Activity, Play, Pause, SkipBack, Rewind, FastForward, SkipForward } from './Icons';
import { SOFA_ORGAN_MAP } from '../lib/fieldMapping';

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload || payload.length === 0) return null;
  const data = payload[0].payload;
  return (
    <div className="bg-white/95 backdrop-blur-sm border border-slate-200 rounded-xl p-3 shadow-lg text-xs">
      <p className="font-bold text-slate-700 mb-1.5 font-mono">Hour {label}</p>
      {data.actual != null && (
        <div className="flex items-center gap-2 mb-0.5">
          <span className="w-2 h-2 rounded-full bg-blue-600" />
          <span className="text-slate-500">實值 (Actual):</span>
          <span className="font-bold font-mono text-blue-600">{data.actual}</span>
        </div>
      )}
      {data.predicted != null && (
        <>
          <div className="flex items-center gap-2 mb-0.5">
            <span className="w-2 h-2 rounded-full bg-orange-500" />
            <span className="text-slate-500">預測 (Pred):</span>
            <span className="font-bold font-mono text-orange-500">{data.predicted}</span>
          </div>
          {data.true_val != null && (
            <div className="flex items-center gap-2 mb-0.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-slate-500">未來真值 (True):</span>
              <span className="font-bold font-mono text-emerald-500">{data.true_val}</span>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function SofaChart({ sofaData, insights, gap, selectedHour, onHourChange, selectedTarget, onTargetChange }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const isTotal = !selectedTarget || selectedTarget === 'TOTAL';

  const allData = useMemo(() => {
    if (!sofaData || sofaData.length === 0) return [];

    const targetStart = insights?.target_start_hour;
    const targetEnd = insights?.target_end_hour;
    const predTotal = insights?.predictedSofa;
    const trueTotal = insights?.trueSofa;

    const maxHourInSofa = sofaData.length > 0 ? Math.max(...sofaData.map(r => Number(r.hour_idx))) : 0;
    const maxHour = Math.max(maxHourInSofa, targetEnd || 0);

    const series = [];
    for (let h = 0; h <= maxHour; h++) {
      const row = sofaData.find(d => Number(d.hour_idx) === h);

      // 【優化 1：嚴謹的 NaN 防禦處理】
      let actual = null;
      if (h <= selectedHour && row) {
        if (isTotal) {
          const totalVal = Number(row.sofa);
          actual = Number.isFinite(totalVal) ? totalVal : null;
        } else {
          const csvField = SOFA_ORGAN_MAP[selectedTarget]?.csvActual;
          const rawVal = csvField ? row[csvField] : null;
          const organVal = rawVal != null ? Number(rawVal) : null;
          actual = Number.isFinite(organVal) ? organVal : null;
        }
      }

      let predicted = null;
      let targetTrue = null;

      if (targetStart != null && targetEnd != null && h >= targetStart && h <= targetEnd) {
        predicted = isTotal
          ? predTotal
          : insights?.organPredictions?.[selectedTarget]?.future_max_pred;

        targetTrue = isTotal
          ? trueTotal
          : insights?.organPredictions?.[selectedTarget]?.future_max_true;
      }

      series.push({ hour: h, actual, predicted, true_val: targetTrue });
    }
    return series;
  }, [sofaData, selectedHour, insights, isTotal, selectedTarget]);

  const currentIndex = useMemo(() => {
    if (!allData.length || selectedHour == null) return 0;
    const idx = allData.findIndex(d => d.hour === selectedHour);
    return idx >= 0 ? idx : 0;
  }, [allData, selectedHour]);

  const maxIndex = allData.length - 1;
  const playbackRef = useRef({ currentIndex, maxIndex, allData, onHourChange });

  useEffect(() => {
    playbackRef.current = { currentIndex, maxIndex, allData, onHourChange };
  }, [currentIndex, maxIndex, allData, onHourChange]);

  useEffect(() => {
    if (currentIndex >= maxIndex && isPlaying) setIsPlaying(false);
  }, [currentIndex, maxIndex, isPlaying]);

  useEffect(() => {
    if (!isPlaying) return;
    const tickMs = 1000 / speed;
    const timer = setInterval(() => {
      const { currentIndex: cur, maxIndex: m, allData: data, onHourChange: change } = playbackRef.current;
      const nextIdx = cur + 1;
      if (nextIdx <= m) {
        change(data[nextIdx].hour);
      } else {
        setIsPlaying(false);
      }
    }, tickMs);
    return () => clearInterval(timer);
  }, [isPlaying, speed]);

  useEffect(() => { setIsPlaying(false); }, [sofaData, selectedTarget]);

  const handlePlayPause = () => setIsPlaying(p => !p);
  const jumpStart = () => { setIsPlaying(false); if (allData[0]) onHourChange(allData[0].hour); };
  const jumpEnd = () => { setIsPlaying(false); if (allData[maxIndex]) onHourChange(allData[maxIndex].hour); };
  const stepPrev = () => { setIsPlaying(false); if (currentIndex > 0) onHourChange(allData[currentIndex - 1].hour); };
  const stepNext = () => { setIsPlaying(false); if (currentIndex < maxIndex) onHourChange(allData[currentIndex + 1].hour); };
  const cycleSpeed = () => setSpeed(s => (s === 1 ? 2 : s === 2 ? 4 : 1));

  if (allData.length === 0) {
    return (
      <div className="medical-card p-6 flex items-center justify-center h-64 text-slate-400 text-sm">
        無 SOFA 資料可顯示
      </div>
    );
  }

  const WINDOW_SIZE = 36;
  const windowStartIdx = Math.max(0, Math.min(maxIndex - WINDOW_SIZE, Math.floor(Math.max(0, currentIndex - WINDOW_SIZE / 2))));
  const chartData = allData.length <= WINDOW_SIZE
    ? allData
    : allData.slice(windowStartIdx, windowStartIdx + WINDOW_SIZE);

  const yAxisDomain = isTotal ? [0, 24] : [0, 4];
  const chartTitle = isTotal
    ? '總 SOFA 主圖'
    : SOFA_ORGAN_MAP[selectedTarget]?.chartLabel || '器官趨勢圖';

  return (
    <div className="medical-card p-5 bg-white shadow-sm border border-slate-100 rounded-2xl">
      <div className="flex flex-wrap items-center justify-between mb-4 gap-3">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-blue-600" />
          <h3 className="text-sm md:text-base font-bold text-slate-800">{chartTitle}</h3>
        </div>

        <div className="flex bg-slate-50 p-1 rounded-lg border border-slate-100 shadow-inner">
          {/* 【優化 2：Optional Chaining 防呆】 */}
          <button
            onClick={() => onTargetChange?.('TOTAL')}
            className={`px-3 py-1.5 text-[10px] font-bold rounded-md transition-all ${isTotal ? 'bg-white text-blue-600 shadow-sm border border-slate-200/50' : 'text-slate-400 hover:text-slate-600'}`}
          >
            總覽
          </button>
          {Object.entries(SOFA_ORGAN_MAP).map(([key, cfg]) => (
            <button
              key={key}
              onClick={() => onTargetChange?.(key)}
              className={`px-3 py-1.5 text-[10px] font-bold rounded-md transition-all ${selectedTarget === key ? 'bg-white text-blue-600 shadow-sm border border-slate-200/50' : 'text-slate-400 hover:text-slate-600'}`}
            >
              {cfg.labelZh}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-end gap-4 text-[10px] mb-2 mr-2">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-0.5 bg-blue-600 rounded" /> 實值
        </span>
        <span className="flex items-center gap-1.5">
          <span style={{ display: 'inline-block', width: 12, height: 0, borderTop: '2px dashed #F97316' }} />
          <span className="ml-1">預測值</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span style={{ display: 'inline-block', width: 12, height: 0, borderTop: '2px dashed #10B981' }} />
          <span className="ml-1">未來真值</span>
        </span>
      </div>

      <ResponsiveContainer width="100%" height={260}>
        <LineChart
          data={chartData}
          margin={{ top: 4, right: 8, bottom: 20, left: 0 }}
          onClick={(e) => {
            if (e?.activeLabel != null) {
              setIsPlaying(false);
              onHourChange(e.activeLabel);
            }
          }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
          <XAxis
            dataKey="hour"
            tick={{ fill: '#94A3B8', fontSize: 10, fontFamily: 'JetBrains Mono' }}
            axisLine={{ stroke: '#CBD5E1' }}
            label={{ value: 'ICU 小時 (Hours)', position: 'insideBottom', offset: -12, style: { fill: '#94A3B8', fontSize: 11 } }}
          />
          <YAxis
            tick={{ fill: '#94A3B8', fontSize: 10, fontFamily: 'JetBrains Mono' }}
            axisLine={{ stroke: '#CBD5E1' }}
            domain={yAxisDomain}
          />
          <Tooltip content={<CustomTooltip />} />

          {selectedHour != null && (
            <ReferenceLine x={selectedHour} stroke="#2563EB" strokeDasharray="4 4" strokeWidth={2} />
          )}

          <Line type="monotone" dataKey="actual" stroke="#2563EB" strokeWidth={2.5}
            dot={false} activeDot={{ r: 5, fill: '#2563EB', stroke: '#fff', strokeWidth: 2 }}
            name="實值" />
          <Line type="monotone" dataKey="predicted" stroke="#F97316" strokeWidth={2}
            strokeDasharray="6 3" dot={false}
            activeDot={{ r: 4, fill: '#F97316', stroke: '#fff', strokeWidth: 2 }}
            name="預測值" connectNulls={false} />
          <Line type="monotone" dataKey="true_val" stroke="#10B981" strokeWidth={2}
            strokeDasharray="6 3" dot={false}
            activeDot={{ r: 4, fill: '#10B981', stroke: '#fff', strokeWidth: 2 }}
            name="未來真值" connectNulls={false} />
        </LineChart>
      </ResponsiveContainer>

      <div className="mt-2 bg-slate-50 border border-slate-100 rounded-xl p-3 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg p-1 shadow-sm">
            <button onClick={jumpStart} className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-md transition-colors"><SkipBack className="w-4 h-4" /></button>
            <button onClick={stepPrev} className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-md transition-colors"><Rewind className="w-4 h-4" /></button>
            <button onClick={handlePlayPause} className={`p-1.5 rounded-md transition-colors ${isPlaying ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' : 'bg-blue-600 text-white hover:bg-blue-700'}`}>
              {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
            </button>
            <button onClick={stepNext} className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-md transition-colors"><FastForward className="w-4 h-4" /></button>
            <button onClick={jumpEnd} className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-md transition-colors"><SkipForward className="w-4 h-4" /></button>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-center">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold block mb-0.5">時間點</span>
              <span className="text-sm font-bold font-mono text-blue-600">Hour {selectedHour ?? '—'}</span>
            </div>
            <div className="h-6 w-px bg-slate-200 mx-1 border-r border-white" />
            <button onClick={cycleSpeed} className="flex flex-col items-center justify-center px-3 py-1 rounded bg-white border border-slate-200 hover:bg-slate-50 transition-colors shadow-sm">
              <span className="text-[9px] text-slate-400 uppercase tracking-widest font-bold block">Speed</span>
              <span className="text-xs font-bold text-slate-700 font-mono">{speed}x</span>
            </button>
          </div>
        </div>
        <div className="px-1 flex items-center gap-3">
          <span className="text-[10px] text-slate-400 font-mono">H.{allData[0]?.hour}</span>
          <input type="range" min={0} max={maxIndex} value={currentIndex} onChange={(e) => { setIsPlaying(false); onHourChange(allData[Number(e.target.value)]?.hour); }} className="flex-1 h-1.5 rounded-full appearance-none cursor-pointer bg-slate-200" style={{ accentColor: '#2563EB' }} />
          <span className="text-[10px] text-slate-400 font-mono">H.{allData[maxIndex]?.hour}</span>
        </div>
      </div>
    </div>
  );
}