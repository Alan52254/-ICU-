import React, { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Brush } from 'recharts';
import { Activity } from './Icons';

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload) return null;
  return (
    <div className="bg-white/95 backdrop-blur-sm border border-slate-200 rounded-xl p-3 shadow-lg text-xs">
      <p className="font-bold text-slate-700 mb-1.5 font-mono">Hour {label}</p>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2 mb-0.5">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
          <span className="text-slate-500">{p.name}:</span>
          <span className="font-bold font-mono" style={{ color: p.color }}>{p.value != null ? p.value : 'N/A'}</span>
        </div>
      ))}
    </div>
  );
}

export default function SofaChart({ sofaData, gap, selectedHour, onHourChange }) {
  const chartData = useMemo(() => {
    if (!sofaData || sofaData.length === 0) return [];
    return sofaData.map(row => {
      // Calculate predicted total from organ predictions
      let predictedTotal = null;
      if (row.predictions) {
        predictedTotal = ['Resp', 'Coag', 'Liver', 'CV', 'CNS', 'Renal']
          .reduce((sum, org) => sum + (row.predictions[org]?.future_max ?? 0), 0);
      }
      return {
        hour: row.hour_idx,
        actual: row.sofa,
        predicted: predictedTotal,
      };
    });
  }, [sofaData]);

  if (chartData.length === 0) {
    return (
      <div className="medical-card p-6 flex items-center justify-center h-64 text-slate-400 text-sm">
        無 SOFA 資料可顯示
      </div>
    );
  }

  return (
    <div className="medical-card p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-blue-600" />
          <h3 className="text-sm md:text-base font-bold text-slate-800">總 SOFA 主圖</h3>
          <span className="text-[10px] text-slate-400 font-mono uppercase ml-1">Actual vs Predicted ({gap}h horizon)</span>
        </div>
        <div className="flex items-center gap-4 text-[10px]">
          <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-blue-600 rounded" /> 實值 (ACTUAL)</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-orange-500 rounded border-dashed" style={{ borderTop: '2px dashed #F97316', height: 0, width: 12 }} /> 預測值 (PREDICTED)</span>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={chartData} onClick={(e) => { if (e?.activeLabel != null) onHourChange(e.activeLabel); }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
          <XAxis
            dataKey="hour"
            tick={{ fill: '#94A3B8', fontSize: 10, fontFamily: 'JetBrains Mono' }}
            axisLine={{ stroke: '#CBD5E1' }}
            label={{ value: 'ICU 小時 (Hours)', position: 'bottom', offset: -5, style: { fill: '#94A3B8', fontSize: 11 } }}
          />
          <YAxis
            tick={{ fill: '#94A3B8', fontSize: 10, fontFamily: 'JetBrains Mono' }}
            axisLine={{ stroke: '#CBD5E1' }}
            domain={[0, 'auto']}
          />
          <Tooltip content={<CustomTooltip />} />

          {/* Selected hour reference line */}
          {selectedHour != null && (
            <ReferenceLine x={selectedHour} stroke="#2563EB" strokeDasharray="4 4" strokeWidth={2}>
            </ReferenceLine>
          )}

          <Line
            type="monotone"
            dataKey="actual"
            stroke="#2563EB"
            strokeWidth={2.5}
            dot={false}
            activeDot={{ r: 5, fill: '#2563EB', stroke: '#fff', strokeWidth: 2 }}
            name="實值 (Actual)"
          />
          <Line
            type="monotone"
            dataKey="predicted"
            stroke="#F97316"
            strokeWidth={2}
            strokeDasharray="6 3"
            dot={false}
            activeDot={{ r: 4, fill: '#F97316', stroke: '#fff', strokeWidth: 2 }}
            name="預測值 (Predicted)"
            connectNulls={false}
          />

          <Brush dataKey="hour" height={20} stroke="#CBD5E1" fill="#F8FAFC" travellerWidth={8} />
        </LineChart>
      </ResponsiveContainer>

      <p className="text-[10px] text-slate-400 mt-2 text-center">
        點擊圖表上任意位置可切換觀察時間點 • 目前選取: <strong className="text-blue-600 font-mono">Hour {selectedHour ?? '—'}</strong>
      </p>
    </div>
  );
}
