import React, { useMemo, useState, useEffect, useRef } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { Activity, Play, Pause, SkipBack, Rewind, FastForward, SkipForward } from './Icons';

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload || payload.length === 0) return null;

  // Extract custom payload data
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

export default function SofaChart({ sofaData, insights, gap, selectedHour, onHourChange }) {
  // ─── Playback & Data State ───
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1); // 1x, 2x, 4x

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

      // Actual: Blue line up to selectedHour
      const actual = (h <= selectedHour && row) ? Number(row.sofa) : null;

      // Predictions: Horizontal lines in the forecast window
      let predicted = null;
      let targetTrue = null;
      if (targetStart != null && targetEnd != null && h >= targetStart && h <= targetEnd) {
        predicted = predTotal;
        targetTrue = trueTotal;
      }

      series.push({ hour: h, actual, predicted, true_val: targetTrue });
    }
    return series;
  }, [sofaData, selectedHour, insights]);

  // Determine current index based on selectedHour
  const currentIndex = useMemo(() => {
    if (!allData.length || selectedHour == null) return 0;
    const idx = allData.findIndex(d => d.hour === selectedHour);
    return idx >= 0 ? idx : 0;
  }, [allData, selectedHour]);

  const maxIndex = allData.length - 1;

  // Track playback state in a ref to avoid resetting the interval on every tick
  const playbackRef = useRef({ currentIndex, maxIndex, allData, onHourChange });
  useEffect(() => {
    playbackRef.current = { currentIndex, maxIndex, allData, onHourChange };
  }, [currentIndex, maxIndex, allData, onHourChange]);

  // Stop playing if we reach the end
  useEffect(() => {
    if (currentIndex >= maxIndex && isPlaying) setIsPlaying(false);
  }, [currentIndex, maxIndex, isPlaying]);

  // Playback Effect
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

  // Stop playback when the component unmounts or data changes drastically
  useEffect(() => { setIsPlaying(false); }, [sofaData]);

  // Interaction handlers
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

  // To keep the chart sliding automatically based on selectedHour:
  // We'll show a moving window of 36 hours centered around the selected hour
  const WINDOW_SIZE = 36;
  const windowStartIdx = Math.max(0, Math.min(maxIndex - WINDOW_SIZE, Math.floor(Math.max(0, currentIndex - WINDOW_SIZE / 2))));

  const chartData = allData.length <= WINDOW_SIZE
    ? allData
    : allData.slice(windowStartIdx, windowStartIdx + WINDOW_SIZE);

  return (
    <div className="medical-card p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-blue-600" />
          <h3 className="text-sm md:text-base font-bold text-slate-800">總 SOFA 主圖</h3>
          <span className="text-[10px] text-slate-400 font-mono uppercase ml-1">
            Actual vs Predicted
          </span>
        </div>
        <div className="flex items-center gap-4 text-[10px]">
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
      </div>

      {/* Chart */}
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
            domain={[0, 'auto']}
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

      {/* ─── Timeline Player (Interactive UI) ─── */}
      <div className="mt-2 bg-slate-50 border border-slate-100 rounded-xl p-3 flex flex-col gap-3">
        {/* Playback Controls & Info */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg p-1 shadow-sm">
            <button onClick={jumpStart} className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-md transition-colors" title="回到起點">
              <SkipBack className="w-4 h-4" />
            </button>
            <button onClick={stepPrev} className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-md transition-colors" title="上一步">
              <Rewind className="w-4 h-4" />
            </button>
            <button
              onClick={handlePlayPause}
              className={`p-1.5 rounded-md transition-colors ${isPlaying ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
              title={isPlaying ? '暫停' : '自動播放'}
            >
              {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
            </button>
            <button onClick={stepNext} className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-md transition-colors" title="下一步">
              <FastForward className="w-4 h-4" />
            </button>
            <button onClick={jumpEnd} className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-md transition-colors" title="跳至終點">
              <SkipForward className="w-4 h-4" />
            </button>
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

        {/* Timeline Slider Indicator */}
        <div className="px-1 flex items-center gap-3">
          <span className="text-[10px] text-slate-400 font-mono">H.{allData[0]?.hour}</span>
          <input
            type="range"
            min={0}
            max={maxIndex}
            value={currentIndex}
            onChange={(e) => {
              setIsPlaying(false);
              const idx = Number(e.target.value);
              onHourChange(allData[idx]?.hour);
            }}
            className="flex-1 h-1.5 rounded-full appearance-none cursor-pointer bg-slate-200"
            style={{ accentColor: '#2563EB' }}
          />
          <span className="text-[10px] text-slate-400 font-mono">H.{allData[maxIndex]?.hour}</span>
        </div>
      </div>

      <p className="text-[10px] text-center text-slate-400/60 italic mt-3">
        * 預測線於資料尾端停止，因未來視窗 [{gap}h horizon] 不完整時不產生預測值
      </p>
    </div>
  );
}
