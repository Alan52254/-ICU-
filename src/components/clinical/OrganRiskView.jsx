import React, { useMemo, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { Activity, ShieldCheck, AlertCircle } from '../Icons';

const ORGANS = ['Resp', 'Coag', 'Liver', 'CV', 'CNS', 'Renal'];

function clamp01(v) {
  return Math.max(0, Math.min(1, v));
}

function hashSeed(input) {
  const text = String(input ?? 'unknown');
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function seededNoise(seed) {
  const numericSeed = typeof seed === 'number' ? seed : hashSeed(seed);
  const normalized = Math.sin(numericSeed * 0.000013579) * 43758.5453123;
  return normalized - Math.floor(normalized);
}

function getOrganProfile(organ) {
  switch (organ) {
    case 'Resp':
      return { base: 0.18, waveAmp: 0.055, wavePeriod: 5.8, drift: 0.0008, noise: 0.04 };
    case 'Coag':
      return { base: 0.13, waveAmp: 0.025, wavePeriod: 8.5, drift: 0.0009, noise: 0.022 };
    case 'Liver':
      return { base: 0.24, waveAmp: 0.03, wavePeriod: 10.2, drift: 0.0005, noise: 0.025 };
    case 'CV':
      return { base: 0.28, waveAmp: 0.085, wavePeriod: 4.7, drift: 0.0011, noise: 0.05 };
    case 'CNS':
      return { base: 0.19, waveAmp: 0.045, wavePeriod: 6.8, drift: 0.0008, noise: 0.03 };
    case 'Renal':
      return { base: 0.16, waveAmp: 0.035, wavePeriod: 7.4, drift: 0.0014, noise: 0.028 };
    default:
      return { base: 0.2, waveAmp: 0.04, wavePeriod: 6, drift: 0.001, noise: 0.03 };
  }
}

function getSeed({ patientId, organ, gap, hour, salt = '' }) {
  return `${patientId ?? 'demo'}-${organ}-${gap}-${hour}-${salt}`;
}

function generateSimulatedRiskSeries({ maxHour, organ, patientId, gap }) {
  const profile = getOrganProfile(organ);
  const gapScale = 1 + (((Number(gap) || 4) - 4) / 20) * 0.35;
  const patientOffset = (seededNoise(getSeed({ patientId, organ, gap, hour: 'patient-offset' })) - 0.5) * 0.12;
  const phase = seededNoise(getSeed({ patientId, organ, gap, hour: 'phase' })) * Math.PI * 2;
  const baseline = clamp01(profile.base + patientOffset + (gapScale - 1) * 0.08);

  return Array.from({ length: Math.max(1, maxHour + 1) }, (_, hour) => {
    const noise = (seededNoise(getSeed({ patientId, organ, gap, hour, salt: 'noise' })) - 0.5) * profile.noise;
    const microNoise = (seededNoise(getSeed({ patientId, organ, gap, hour, salt: 'micro' })) - 0.5) * 0.018;
    const wave = Math.sin(hour / profile.wavePeriod + phase) * profile.waveAmp * gapScale;

    let predProb = baseline + wave + noise + microNoise + hour * profile.drift * gapScale;

    if (organ === 'Coag') {
      const riseStart = 12 + Math.floor(seededNoise(getSeed({ patientId, organ, gap, hour: 'rise-start' })) * 10);
      predProb += hour > riseStart ? Math.min(0.08, (hour - riseStart) * 0.005) : 0;
    }

    if (organ === 'CV') {
      const spikeCenter = 10 + Math.floor(seededNoise(getSeed({ patientId, organ, gap, hour: 'spike-center' })) * Math.max(8, maxHour - 10));
      const distance = Math.abs(hour - spikeCenter);
      predProb += distance < 3 ? (3 - distance) * 0.075 * gapScale : 0;
    }

    if (organ === 'CNS') {
      const liftCenter = Math.max(8, Math.floor(maxHour * 0.5));
      if (hour >= liftCenter - 4 && hour <= liftCenter + 5) {
        predProb += (hour - (liftCenter - 4)) * 0.016;
      }
    }

    if (organ === 'Renal') {
      const lateStart = Math.max(10, Math.floor(maxHour * 0.6));
      predProb += hour >= lateStart ? (hour - lateStart) * 0.011 * gapScale : 0;
    }

    const pred_prob = clamp01(predProb);
    const pred_label = pred_prob >= 0.5 ? 1 : 0;
    const true_label = pred_prob >= 0.65 ? 1 : 0;

    return {
      hour,
      pred_prob,
      pred_label,
      true_label,
    };
  });
}

function getOrganSnapshotAtHour({ hour, patientId, gap, maxHour }) {
  return ORGANS.reduce((snapshot, organ) => {
    const series = generateSimulatedRiskSeries({ maxHour, organ, patientId, gap });
    snapshot[organ] = series.find((item) => item.hour === hour) || series[series.length - 1] || null;
    return snapshot;
  }, {});
}

function getRiskBand(prob) {
  if (prob < 0.3) return 'low';
  if (prob <= 0.7) return 'medium';
  return 'high';
}

function getRiskStyles(prob, isSelected) {
  const band = getRiskBand(prob);

  if (band === 'high') {
    return {
      value: 'text-rose-600',
      bar: 'bg-gradient-to-r from-rose-500 to-orange-500',
      container: isSelected ? 'border-rose-300 bg-rose-50/40' : 'border-slate-100 hover:border-rose-200 hover:bg-rose-50/20 shadow-sm shadow-slate-100/50',
      indicator: 'warning',
      label: '高風險 / High Risk',
      labelClass: 'text-rose-600',
    };
  }

  if (band === 'medium') {
    return {
      value: 'text-amber-600',
      bar: 'bg-gradient-to-r from-amber-500 to-orange-400',
      container: isSelected ? 'border-amber-300 bg-amber-50/40' : 'border-slate-100 hover:border-amber-200 hover:bg-amber-50/20 shadow-sm shadow-slate-100/50',
      indicator: 'monitor',
      label: '需觀察 / Monitor Closely',
      labelClass: 'text-amber-600',
    };
  }

  return {
    value: isSelected ? 'text-indigo-600' : 'text-emerald-600',
    bar: 'bg-gradient-to-r from-indigo-500 to-teal-400',
    container: isSelected ? 'border-indigo-500 bg-indigo-50/30' : 'border-slate-100 hover:border-slate-300 hover:bg-slate-50 shadow-sm shadow-slate-100/50',
    indicator: 'stable',
    label: '低風險 / Low Risk',
    labelClass: 'text-emerald-600',
  };
}

function RiskTooltip({ active, payload, label }) {
  if (!active || !payload || payload.length === 0) return null;
  const data = payload[0].payload;
  return (
    <div className="bg-white/95 backdrop-blur-md border border-slate-200 rounded-xl p-3 shadow-xl text-xs">
      <p className="font-bold text-slate-700 mb-1.5 font-mono">ICU Hour {label}</p>
      <div className="flex items-center gap-2 mb-1">
        <span className="w-2 h-2 rounded-full bg-indigo-500" />
        <span className="text-slate-500">Deterioration Prob:</span>
        <span className="font-bold font-mono text-indigo-600">{data.pred_prob.toFixed(4)}</span>
      </div>
      <div className="flex gap-2 mt-2 pt-2 border-t border-slate-100">
        <span className={`px-1.5 py-0.5 rounded-[4px] text-[10px] font-bold ${data.true_label ? 'bg-red-50 text-red-600' : 'bg-slate-50 text-slate-400'}`}>TRUE: {data.true_label}</span>
        <span className={`px-1.5 py-0.5 rounded-[4px] text-[10px] font-bold ${data.pred_label ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-50 text-slate-400'}`}>PRED: {data.pred_label}</span>
      </div>
    </div>
  );
}

export default function OrganRiskView({ sofaData = [], selectedHour, currentICUHour, gap, selectedPatientId }) {
  const [selectedOrgan, setSelectedOrgan] = useState('Resp');

  const maxHour = useMemo(() => {
    if (sofaData.length > 0) {
      return Math.max(...sofaData.map((d) => Number(d.hour_idx) || 0));
    }
    return 48;
  }, [sofaData]);

  const externalHour = selectedHour ?? currentICUHour;

  const normalizedHour = useMemo(() => {
    if (externalHour == null || Number.isNaN(Number(externalHour))) return 0;
    return Math.max(0, Math.min(maxHour, Number(externalHour)));
  }, [externalHour, maxHour]);

  const seriesMap = useMemo(() => {
    return ORGANS.reduce((acc, organ) => {
      acc[organ] = generateSimulatedRiskSeries({ maxHour, organ, patientId: selectedPatientId, gap });
      return acc;
    }, {});
  }, [maxHour, selectedPatientId, gap]);

  const chartData = useMemo(() => seriesMap[selectedOrgan] || [], [seriesMap, selectedOrgan]);

  const snapshot = useMemo(() => {
    return getOrganSnapshotAtHour({
      hour: normalizedHour,
      patientId: selectedPatientId,
      gap,
      maxHour,
    });
  }, [normalizedHour, selectedPatientId, gap, maxHour]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
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

          <div className="w-full h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis
                  dataKey="hour"
                  tick={{ fill: '#94A3B8', fontSize: 10, fontFamily: 'JetBrains Mono' }}
                  axisLine={{ stroke: '#E2E8F0' }}
                  label={{ value: 'ICU 小時 (Hours)', position: 'insideBottom', offset: -10, style: { fill: '#94A3B8', fontSize: 10 } }}
                />
                <YAxis
                  domain={[0, 1]}
                  tick={{ fill: '#94A3B8', fontSize: 10, fontFamily: 'JetBrains Mono' }}
                  axisLine={{ stroke: '#E2E8F0' }}
                  ticks={[0, 0.2, 0.4, 0.6, 0.8, 1.0]}
                />
                <Tooltip content={<RiskTooltip />} />

                {externalHour != null && (
                  <ReferenceLine
                    x={normalizedHour}
                    stroke="#6366f1"
                    strokeDasharray="4 4"
                    strokeWidth={2}
                    label={{ value: 'NOW', position: 'top', fill: '#6366f1', fontSize: 10, fontWeight: 'bold' }}
                  />
                )}

                <Line
                  type="monotone"
                  dataKey="pred_prob"
                  stroke="#6366f1"
                  strokeWidth={4}
                  dot={false}
                  activeDot={{ r: 6, fill: '#6366f1', stroke: '#fff', strokeWidth: 2 }}
                  animationDuration={600}
                  connectNulls
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-50 flex items-center justify-between text-[10px]">
            <span className="text-slate-400 italic">* Y 軸固定為 0 ~ 1.0，NOW 線與右側 snapshot 完全跟隨外部 hour</span>
            <span className="text-slate-400 font-mono">Horizon: {gap}h · Patient: {selectedPatientId ?? 'demo'}</span>
          </div>
        </div>
      </div>

      <div className="lg:col-span-4 space-y-5">
        <div className="medical-card p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">器官風險清單</h3>
            <div className="flex items-center gap-1.5 px-2 py-1 bg-amber-50 rounded-md border border-amber-100">
              <AlertCircle className="w-3 h-3 text-amber-500" />
              <span className="text-[10px] font-bold text-amber-700">臨界值: 0.7</span>
            </div>
          </div>

          <div className="space-y-2.5">
            {ORGANS.map((org) => {
              const current = snapshot[org];
              const prob = current?.pred_prob ?? 0;
              const isSelected = selectedOrgan === org;
              const styles = getRiskStyles(prob, isSelected);

              return (
                <div
                  key={org}
                  onClick={() => setSelectedOrgan(org)}
                  className={`group relative p-3 rounded-2xl border transition-all cursor-pointer overflow-hidden ${styles.container}`}
                >
                  {isSelected && <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500" />}

                  <div className="flex justify-between items-start mb-2">
                    <div className="flex flex-col">
                      <span className={`text-sm font-bold ${isSelected ? 'text-indigo-700' : 'text-slate-700'}`}>{org}</span>
                      <span className="text-[10px] text-slate-400 font-mono">Deterioration Risk</span>
                    </div>
                    <div className="text-right">
                      <span className={`text-xs font-mono font-black ${styles.value}`}>{prob.toFixed(4)}</span>
                    </div>
                  </div>

                  <div className="h-2 w-full bg-slate-200/50 rounded-full shadow-inner mb-2 overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 ease-out rounded-full ${styles.bar}`}
                      style={{ width: `${prob * 100}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex gap-2">
                      <div className="flex flex-col">
                        <span className="text-[8px] text-slate-400 uppercase font-bold">Pred</span>
                        <span className={`text-[10px] font-black ${isSelected ? 'text-indigo-600' : 'text-slate-600'}`}>
                          {current?.pred_label ?? 0}
                        </span>
                      </div>
                      <div className="w-px h-6 bg-slate-200" />
                      <div className="flex flex-col">
                        <span className="text-[8px] text-slate-400 uppercase font-bold">True</span>
                        <span className="text-[10px] font-black text-slate-600">
                          {current?.true_label ?? 0}
                        </span>
                      </div>
                    </div>

                    {styles.indicator === 'warning' ? (
                      <div className="flex items-center gap-1.5 animate-pulse">
                        <AlertCircle className="w-4 h-4 text-rose-500" />
                        <span className={`text-[10px] font-black uppercase ${styles.labelClass}`}>{styles.label}</span>
                      </div>
                    ) : styles.indicator === 'monitor' ? (
                      <div className="flex items-center gap-1.5 opacity-80">
                        <AlertCircle className="w-4 h-4 text-amber-500" />
                        <span className={`text-[10px] font-black uppercase ${styles.labelClass}`}>{styles.label}</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 opacity-60">
                        <ShieldCheck className="w-4 h-4 text-emerald-500" />
                        <span className={`text-[10px] font-black uppercase ${styles.labelClass}`}>{styles.label}</span>
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
