import React, { useMemo, useState } from 'react';
import { Activity, AlertCircle } from '../Icons';
import RiskDeteriorationChart from './RiskDeteriorationChart';
import OrganRiskRegistry from './OrganRiskRegistry';

const ORGAN_META = [
  { key: 'Resp', label: '呼吸' },
  { key: 'Coag', label: '凝血' },
  { key: 'Liver', label: '肝臟' },
  { key: 'CV', label: '心血管' },
  { key: 'CNS', label: '中樞神經' },
  { key: 'Renal', label: '腎臟' },
];

function getOrganLabel(key) {
  return ORGAN_META.find((item) => item.key === key)?.label || key;
}

export default function OrganRiskView({ selectedHour, gap, selectedPatientId, rows = [] }) {
  const [selectedOrgan, setSelectedOrgan] = useState('Resp');

  const currentGapRows = useMemo(() => {
    return rows.filter((row) => Number(row.horizon) === Number(gap));
  }, [rows, gap]);

  const organData = useMemo(() => {
    const dataMap = {};
    const safeHour = Number(selectedHour);

    ORGAN_META.forEach((item) => {
      const orgRows = currentGapRows.filter(
        (row) => row.organ === item.key || String(row.organ).toLowerCase() === item.key.toLowerCase(),
      );

      let snapshot = null;
      if (orgRows.length > 0) {
        snapshot =
          orgRows.find((row) => Number(row.hour_t) === safeHour) ||
          [...orgRows].reverse().find((row) => Number(row.hour_t) <= safeHour) ||
          orgRows[0] ||
          null;
      }

      dataMap[item.key] = snapshot;
    });

    return dataMap;
  }, [currentGapRows, selectedHour]);

  if (!selectedPatientId || rows.length === 0) {
    return (
      <div className="flex h-[600px] flex-col items-center justify-center rounded-[2.5rem] border-2 border-dashed border-slate-200 bg-slate-50/50">
        <div className="mb-4 rounded-2xl bg-white p-4 shadow-sm">
          <AlertCircle className="h-10 w-10 text-slate-300" />
        </div>
        <h4 className="font-bold text-slate-800">No prediction data available</h4>
      </div>
    );
  }

  const currentSnapshot = organData?.[selectedOrgan] ?? null;

  return (
    <div className="grid grid-cols-1 gap-8 animate-in fade-in slide-in-from-bottom-8 duration-700 lg:grid-cols-12">
      <div className="flex flex-col gap-6 lg:col-span-8">
        <div className="medical-card relative flex min-h-[550px] flex-col overflow-hidden p-8">
          <div className="absolute right-0 top-0 p-8 opacity-5">
            <Activity className="h-32 w-32 text-indigo-500" />
          </div>

          <div className="z-10 mb-2 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-3 shadow-sm">
                <Activity className="h-6 w-6 text-indigo-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold tracking-tight text-slate-800">
                  {getOrganLabel(selectedOrgan)}器官惡化趨勢圖
                </h2>
                <div className="mt-1 mb-4 flex items-center gap-2">
                  <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    Patient: {selectedPatientId}
                  </span>
                  <div className="h-1 w-1 rounded-full bg-slate-200" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-500">
                    Horizon: {gap}h
                  </span>
                </div>

                <div className="mb-2 flex flex-wrap gap-2">
                  {ORGAN_META.map((item) => {
                    const isTabActive = selectedOrgan === item.key;
                    return (
                      <button
                        key={`tab-${item.key}`}
                        onClick={() => setSelectedOrgan(item.key)}
                        className={`rounded-full px-4 py-1.5 text-xs font-bold transition-all duration-300 ${
                          isTabActive
                            ? 'scale-105 bg-indigo-600 text-white shadow-md'
                            : 'bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700'
                        }`}
                      >
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          <div className="z-10 flex-grow -ml-4">
            <RiskDeteriorationChart
              rows={rows}
              selectedHour={selectedHour}
              selectedOrgan={selectedOrgan}
              gap={gap}
            />
          </div>

          <div className="mt-4 flex items-center justify-between border-t border-slate-50 pt-4 text-[10px] italic text-slate-400">
            <span>* NOW 左側的資料已遮罩，X 軸保持完整。</span>
            <span className="rounded bg-slate-50 px-2 py-1 font-mono uppercase text-slate-500">
              預測窗: {currentSnapshot?.window_start_hour ?? '--'}h - {currentSnapshot?.window_end_hour ?? '--'}h
            </span>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4 lg:col-span-4">
        <div className="medical-card flex min-h-[550px] flex-col p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-[17px] font-bold tracking-tight text-slate-800">SADG-MT器官惡化發生機率預測</h3>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                Risk Prediction Registry
              </p>
            </div>
            <div className="rounded-xl bg-indigo-50 p-2 text-indigo-500">
              <Activity className="h-4 w-4 text-indigo-500" />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto pr-1">
            <OrganRiskRegistry
              organData={organData}
              selectedOrgan={selectedOrgan}
              onSelectOrgan={setSelectedOrgan}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
