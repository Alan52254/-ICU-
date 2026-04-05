import React, { useMemo } from 'react';
import { formatGender, formatAge } from '../lib/fieldMapping';
import { User, Clock, ShieldAlert } from './Icons';
import { getRiskLevel } from '../lib/clinicalRules';

export default function PatientOverview({ overview, vitals, selectedHour }) {
  if (!overview) {
    return <div className="medical-card p-5"><p className="text-slate-400 text-sm">無病人資料</p></div>;
  }

  // Show current selected hour instead of total vitals length
  const icuHours = selectedHour ?? (vitals?.length || 0);
  const lastVital = vitals?.find(v => Number(v.hour_idx) === selectedHour) || vitals?.[vitals.length - 1];

  // Quick clinical summary
  const summaryItems = useMemo(() => {
    const items = [];
    if (overview.admissiontype) items.push({ label: '入院方式', value: overview.admissiontype });
    if (overview.weight) items.push({ label: '體重', value: `${Number(overview.weight).toFixed(1)} kg` });
    if (overview.icu_days) items.push({ label: 'ICU 天數', value: `${Number(overview.icu_days).toFixed(1)} 天` });
    if (overview.hospmort != null) items.push({ label: '院內死亡', value: overview.hospmort === 1 ? '是' : '否' });
    if (lastVital?.vent != null) items.push({ label: '呼吸器', value: lastVital.vent === 1 ? '使用中' : '未使用' });
    return items;
  }, [overview, lastVital]);

  return (
    <div className="space-y-4">
      {/* Patient ID card */}
      <div className="medical-card p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center border border-blue-100">
            <User className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800">病人基本資訊</h3>
            <p className="text-[10px] text-slate-400 font-mono uppercase tracking-wider">Patient Overview</p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex justify-between items-center py-2 border-b border-slate-100">
            <span className="text-xs text-slate-500">Patient ID</span>
            <span className="text-sm font-mono font-bold text-slate-800">{overview.stay_id}</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-slate-100">
            <span className="text-xs text-slate-500">性別</span>
            <span className="text-sm font-semibold text-slate-700">{formatGender(overview.gender)}</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-slate-100">
            <span className="text-xs text-slate-500">年齡</span>
            <span className="text-sm font-semibold text-slate-700">{formatAge(overview.age)} 歲</span>
          </div>
          <div className="flex justify-between items-center py-2">
            <span className="text-xs text-slate-500 flex items-center gap-1"><Clock className="w-3 h-3" />進入 ICU 時數</span>
            <span className="text-sm font-mono font-bold text-blue-600">{icuHours} 小時</span>
          </div>
        </div>
      </div>

      {/* Clinical summary */}
      <div className="medical-card p-5">
        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
          <ShieldAlert className="w-3.5 h-3.5 text-teal-600" />
          臨床狀態摘要
        </h4>
        <div className="space-y-2.5">
          {summaryItems.map((item, i) => (
            <div key={i} className="flex justify-between items-center text-xs">
              <span className="text-slate-500">{item.label}</span>
              <span className="font-medium text-slate-700 font-mono">{item.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
