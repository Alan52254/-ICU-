import React, { useState } from 'react';
import { GAP_WINDOWS, formatGender, formatAge } from '../lib/fieldMapping';
import { Activity, ChevronDown, Clock } from './Icons';

export default function Header({ patients, selectedStayId, onSelectPatient, gap, onGapChange, activeView, onViewChange, riskLevel, selectedHour, overview }) {
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const currentPatient = patients.find(p => p.stay_id === selectedStayId);

  return (
    <header className="frosted-header sticky top-0 z-50">
      <div className="max-w-[1600px] mx-auto px-4 md:px-6 py-3">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          {/* Logo + Title */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-teal-500 rounded-xl flex items-center justify-center shadow-md shadow-blue-200">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-base md:text-lg font-extrabold tracking-tight text-slate-800">
                ICU SOFA 監測系統
              </h1>
              <p className="text-[10px] md:text-xs text-slate-400 font-semibold tracking-widest uppercase">Clinical Prediction Dashboard</p>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-3 md:gap-5 flex-wrap">
            {/* View Switcher Navigation */}
            <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200 shadow-inner">
              <button
                onClick={() => onViewChange('SOFA')}
                className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${activeView === 'SOFA' ? 'bg-white text-blue-600 shadow-sm border border-slate-100' : 'text-slate-500 hover:text-slate-700'}`}
              >
                FutureMaxSofa
              </button>
              <button
                onClick={() => onViewChange('RISK')}
                className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${activeView === 'RISK' ? 'bg-white text-blue-600 shadow-sm border border-slate-100' : 'text-slate-500 hover:text-slate-700'}`}
              >
                OrganDeteriorationRisk
              </button>
            </div>

            {/* Gap Window (Forecast Horizon) */}
            <div className="flex items-center gap-1 text-xs font-medium text-slate-500">
              <span className="hidden sm:inline uppercase tracking-wider text-[10px]">Forecast Horizon</span>
              <div className="flex bg-white rounded-lg border border-slate-200 overflow-hidden">
                {GAP_WINDOWS.map(g => (
                  <button
                    key={g}
                    onClick={() => onGapChange(g)}
                    className={`px-2.5 py-1.5 text-xs font-bold transition-all ${gap === g ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-blue-600'}`}
                  >
                    {g}h
                  </button>
                ))}
              </div>
            </div>

            {/* Patient Selector */}
            <div className="relative">
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm hover:border-blue-300 transition-all shadow-sm"
              >
                <span className="font-mono font-bold text-slate-700 text-xs">{selectedStayId || '—'}</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>
              {dropdownOpen && (
                <div className="absolute right-0 top-full mt-1 w-64 bg-white border border-slate-200 rounded-xl shadow-xl z-[100] max-h-80 overflow-y-auto">
                  <div className="p-2 border-b border-slate-100">
                    <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">選擇病人 ({patients.length})</span>
                  </div>
                  {patients.slice(0, 50).map(p => (
                    <button
                      key={p.stay_id}
                      onClick={() => { onSelectPatient(p.stay_id); setDropdownOpen(false); }}
                      className={`w-full text-left px-3 py-2 text-xs hover:bg-blue-50 transition-colors flex justify-between items-center ${p.stay_id === selectedStayId ? 'bg-blue-50 text-blue-700' : 'text-slate-600'}`}
                    >
                      <span className="font-mono font-semibold">{p.stay_id}</span>
                      <span className="text-slate-400">{formatGender(p.gender)} • {formatAge(p.age)}y</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Current Hour + ICU Time */}
            <div className="hidden md:flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-500">
              <Clock className="w-3.5 h-3.5" />
              <span>目前在 ICU 第 <strong className="text-slate-700 font-mono">{selectedHour ?? '—'}</strong> 小時</span>
            </div>

            {/* Risk badge */}
            {riskLevel && (
              <div className={`px-3 py-1.5 rounded-lg border text-xs font-bold ${riskLevel.bg}`} style={{ color: riskLevel.color }}>
                {riskLevel.label}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
