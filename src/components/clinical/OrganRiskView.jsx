import React, { useState, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { Activity, ShieldCheck, AlertCircle } from '../Icons';

const ORGANS = ['Resp', 'Coag', 'Liver', 'CV', 'CNS', 'Renal'];

function RiskTooltip({ active, payload, label }) {
  if (!active || !payload || payload.length === 0) return null;
  const data = payload[0].payload;
  return (
    <div className="bg-white/95 backdrop-blur-md border border-slate-200 rounded-xl p-3 shadow-xl text-xs">
      <p className="font-bold text-slate-700 mb-1.5 font-mono">ICU Hour {label}</p>
      <div className="flex items-center gap-2 mb-1">
        <span className="w-2 h-2 rounded-full bg-indigo-500" />
        <span className="text-slate-500">Deterioration Prob:</span>
        <span className="font-bold font-mono text-indigo-600">{(data.prob).toFixed(4)}</span>
      </div>
      <div className="flex gap-2 mt-2 pt-2 border-t border-slate-100">
        <span className={`px-1.5 py-0.5 rounded-[4px] text-[10px] font-bold ${data.true_label ? 'bg-red-50 text-red-600' : 'bg-slate-50 text-slate-400'}`}>TRUE: {data.true_label}</span>
        <span className={`px-1.5 py-0.5 rounded-[4px] text-[10px] font-bold ${data.pred_label ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-50 text-slate-400'}`}>PRED: {data.pred_label}</span>
      </div>
    </div>
  );
}

export default function OrganRiskView({ sofaData, selectedHour, gap }) {
  const [selectedOrgan, setSelectedOrgan] = useState('Resp');

  // Mock data generation for probabilities (0 ~ 1)
  const chartData = useMemo(() => {
    const data = [];
    const maxH = sofaData.length > 0 ? Math.max(...sofaData.map(d => Number(d.hour_idx))) : 48;
    
    // Seeded random based on organ name for somewhat consistent mock data
    const seed = selectedOrgan.length;
    
    for (let h = 0; h <= maxH; h++) {
      const base = 0.1 + (Math.sin(h / 5 + seed) * 0.1);
      const spike = (h > 20 && h < 30 && seed > 4) ? 0.5 : 0;
      data.push({
        hour: h,
        prob: Math.min(1, Math.max(0, base + spike + Math.random() * 0.05)),
        true_label: (h > 25 && seed > 4) ? 1 : 0,
        pred_label: (h > 22 && seed > 4) ? 1 : 0
      });
    }
    return data;
  }, [sofaData, selectedOrgan]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* 3.1 左側主圖 (Main Chart) */}
      <div className="lg:col-span-8 space-y-5">
        <div className="medical-card p-6 min-h-[500px] flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-50 rounded-lg">
                <Activity className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-800">{selectedOrgan} 惡化機率趨勢圖</h3>
                <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Organ Deterioration Probability (0 - 1)</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
               <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
                  <span className="w-3 h-3 bg-indigo-500 rounded-full shadow-sm shadow-indigo-200" />
                  <span className="text-[11px] font-bold text-slate-600">Pred Prob</span>
               </div>
            </div>
          </div>

          <div className="flex-1 w-full min-h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis 
                  dataKey="hour" 
                  tick={{ fill: '#94A3B8', fontSize: 10, fontFamily: 'JetBrains Mono' }}
                  axisLine={{ stroke: '#E2E8F0' }}
                />
                <YAxis 
                  domain={[0, 1]} 
                  tick={{ fill: '#94A3B8', fontSize: 10, fontFamily: 'JetBrains Mono' }}
                  axisLine={{ stroke: '#E2E8F0' }}
                  ticks={[0, 0.2, 0.4, 0.6, 0.8, 1.0]}
                />
                <Tooltip content={<RiskTooltip />} />
                
                {selectedHour != null && (
                  <ReferenceLine x={selectedHour} stroke="#6366f1" strokeDasharray="4 4" strokeWidth={2} label={{ value: 'NOW', position: 'top', fill: '#6366f1', fontSize: 10, fontWeight: 'bold' }} />
                )}

                <Line 
                  type="monotone" 
                  dataKey="prob" 
                  stroke="#6366f1" 
                  strokeWidth={3} 
                  dot={false}
                  activeDot={{ r: 6, fill: '#6366f1', stroke: '#fff', strokeWidth: 2 }}
                  animationDuration={1500}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          
          <div className="mt-4 pt-4 border-t border-slate-50 flex items-center justify-between text-[10px]">
             <span className="text-slate-400 italic">* Y 軸嚴格固定為 0 ~ 1.0 代表惡化機率</span>
             <span className="text-slate-400 font-mono">Horizon: {gap}h</span>
          </div>
        </div>
      </div>

      {/* 3.2 右側資訊卡 (Right Info Card) */}
      <div className="lg:col-span-4 space-y-5">
        <div className="medical-card p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">器官風險清單</h3>
            <div className="flex items-center gap-1.5 px-2 py-1 bg-amber-50 rounded-md border border-amber-100">
               <AlertCircle className="w-3 h-3 text-amber-500" />
               <span className="text-[10px] font-bold text-amber-700">臨界值: 0.7</span>
            </div>
          </div>

          <div className="space-y-3">
            {ORGANS.map(org => {
              // Get last known prob for this hour
              const prob = chartData.find(d => d.hour === selectedHour)?.prob || 0.15;
              const isSelected = selectedOrgan === org;
              const isHighRisk = prob > 0.7;

              return (
                <div 
                  key={org}
                  onClick={() => setSelectedOrgan(org)}
                  className={`group relative p-4 rounded-2xl border transition-all cursor-pointer overflow-hidden ${isSelected ? 'border-indigo-500 bg-indigo-50/30' : 'border-slate-100 hover:border-slate-300 hover:bg-slate-50 shadow-sm shadow-slate-100/50'}`}
                >
                  {isSelected && <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500" />}
                  
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex flex-col">
                      <span className={`text-sm font-bold ${isSelected ? 'text-indigo-700' : 'text-slate-700'}`}>{org}</span>
                      <span className="text-[10px] text-slate-400 font-mono">Deterioration Risk</span>
                    </div>
                    <div className="text-right">
                       <span className={`text-xs font-mono font-black ${isHighRisk ? 'text-rose-600' : isSelected ? 'text-indigo-600' : 'text-slate-500'}`}>
                         {(prob * 100).toFixed(1)}%
                       </span>
                    </div>
                  </div>

                  {/* 3.3 進度條 (Progress Bar) */}
                  <div className="h-2 w-full bg-slate-200/50 rounded-full shadow-inner mb-3 overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-1000 ease-out rounded-full ${isHighRisk ? 'bg-gradient-to-r from-rose-500 to-orange-500' : 'bg-gradient-to-r from-indigo-500 to-teal-400'}`}
                      style={{ width: `${prob * 100}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                     <div className="flex gap-2">
                        <div className="flex flex-col">
                           <span className="text-[8px] text-slate-400 uppercase font-bold">Pred</span>
                           <span className={`text-[10px] font-black ${isSelected ? 'text-indigo-600' : 'text-slate-600'}`}>
                             {prob > 0.6 ? 1 : 0}
                           </span>
                        </div>
                        <div className="w-px h-6 bg-slate-200" />
                        <div className="flex flex-col">
                           <span className="text-[8px] text-slate-400 uppercase font-bold">True</span>
                           <span className="text-[10px] font-black text-slate-600">
                             {prob > 0.8 ? 1 : 0}
                           </span>
                        </div>
                     </div>
                     
                     {isHighRisk ? (
                        <div className="flex items-center gap-1.5 animate-pulse">
                           <AlertCircle className="w-4 h-4 text-rose-500" />
                           <span className="text-[10px] font-black text-rose-600 uppercase">Warning</span>
                        </div>
                     ) : (
                        <div className="flex items-center gap-1.5 opacity-60">
                           <ShieldCheck className="w-4 h-4 text-emerald-500" />
                           <span className="text-[10px] font-black text-emerald-600 uppercase">Stable</span>
                        </div>
                     )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
