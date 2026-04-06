import React, { useState, useEffect, useCallback } from 'react';
import { fetchPatients, fetchPatientOverview, fetchPatientVitals, fetchPatientSofa, fetchPatientInsights, fetchPatientDeterioration, fetchHealth } from './lib/api';
import { getRiskLevel } from './lib/clinicalRules';
import Header from './components/Header';
import PatientOverview from './components/PatientOverview';
import VitalsHero from './components/VitalsHero';
import SofaChart from './components/SofaChart';
import OrganBreakdown from './components/OrganBreakdown';
import OrganTrendRegistry from './components/OrganTrendRegistry';
import ClinicalInsights from './components/ClinicalInsights';
import { Loader } from './components/Icons';
import { normalizeInsights } from './lib/sofaDatasetAdapter';
import { debugStateValidator } from './lib/dataHelper';
import OrganRiskView from './components/clinical/OrganRiskView';

export default function App() {
  // ─── Global state ───
  const [patients, setPatients] = useState([]);
  const [selectedStayId, setSelectedStayId] = useState(null);
  const [gap, setGap] = useState(4);
  const [selectedHour, setSelectedHour] = useState(null);
  const [timeWindow, setTimeWindow] = useState(48);

  // ─── Data state ───
  const [overview, setOverview] = useState(null);
  const [vitals, setVitals] = useState([]);
  const [sofaData, setSofaData] = useState([]);
  const [insights, setInsights] = useState(null);
  const [deteriorationData, setDeteriorationData] = useState([]);

  // ─── UI state ───
  const [loading, setLoading] = useState(true);
  const [serverReady, setServerReady] = useState(false);
  const [error, setError] = useState(null);
  
  // ─── Routing State ───
  const [activeView, setActiveView] = useState('SOFA'); // SOFA | RISK

  // 🎯 這是控制 Drill-down 切換的核心狀態
  const [selectedTarget, setSelectedTarget] = useState('TOTAL');

  // Check server health
  useEffect(() => {
    const check = async () => {
      try {
        const h = await fetchHealth();
        if (h.status === 'ready') {
          setServerReady(true);
          return;
        }
      } catch { }
      setTimeout(check, 2000);
    };
    check();
  }, []);

  // Load patient list once server is ready
  useEffect(() => {
    if (!serverReady) return;
    fetchPatients()
      .then(list => {
        setPatients(list);
        if (list.length > 0) setSelectedStayId(list[list.length - 1].stay_id);
      })
      .catch(e => setError(e.message));
  }, [serverReady]);

  // ─── Playback State (Shared) ───
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);

  // Unified data loader
  // [抗閃爍優化]：Deterioration 資料現在改由 App 一次性全量抓取 (不分 Gap)
  const loadPatientData = useCallback(async (stayId, currentGap, tw) => {
    if (!stayId) return;
    setLoading(true);
    setError(null);
    try {
      const [ov, vit, sofa, det] = await Promise.all([
        fetchPatientOverview(stayId),
        fetchPatientVitals(stayId, tw),
        fetchPatientSofa(stayId, currentGap),
        fetchPatientDeterioration(stayId, currentGap), // follow the active forecast horizon
      ]);
      setOverview(ov);
      setVitals(vit);
      setSofaData(sofa);
      setDeteriorationData(det);

      const initialHour = 0;
      setSelectedHour(initialHour);

      const insRaw = await fetchPatientInsights(stayId, currentGap, initialHour);
      setInsights(normalizeInsights(insRaw));
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  }, []);

  // [抗閃爍重要變更]：資料抓取僅在「切換病人」或「切換 Gap (影響 SOFA/Insights)」時觸發。
  // 但由於 Deterioration 已經一次性全量抓取，切換 Gap 時雖然會 re-fetch SOFA，
  // 但後續 OrganRiskView 內部將使用過濾後的 deterorationData，實現無縫切換。
  useEffect(() => {
    loadPatientData(selectedStayId, gap, timeWindow);
  }, [selectedStayId, gap, timeWindow, loadPatientData]);

  const handleHourChange = useCallback(async (hour) => {
    setSelectedHour(Number(hour));
    if (!selectedStayId) return;
    try {
      const insRaw = await fetchPatientInsights(selectedStayId, gap, hour);
      setInsights(normalizeInsights(insRaw));
    } catch (err) {
      console.error('Failed to update insights on hour change:', err);
    }
  }, [selectedStayId, gap]);

  // 全域播放控制器
  useEffect(() => {
    if (!isPlaying || !sofaData.length) return;

    const tickMs = 1000 / playbackSpeed;
    const timer = setInterval(() => {
      const maxIndex = sofaData.length - 1;
      const currentIndex = sofaData.findIndex(d => Number(d.hour_idx) === selectedHour);
      
      const nextIdx = currentIndex + 1;
      if (nextIdx <= maxIndex) {
        handleHourChange(sofaData[nextIdx].hour_idx);
      }
    }, tickMs);

    return () => clearInterval(timer);
  }, [isPlaying, playbackSpeed, selectedHour, sofaData, handleHourChange]);

  // 停止播放的情境：切換病患
  useEffect(() => { setIsPlaying(false); }, [selectedStayId]);

  // 播放控制 Actions
  const playbackActions = {
    play: () => setIsPlaying(true),
    pause: () => setIsPlaying(false),
    toggle: () => setIsPlaying(p => !p),
    setSpeed: (s) => setPlaybackSpeed(s),
    cycleSpeed: () => setPlaybackSpeed(s => (s === 1 ? 2 : s === 2 ? 4 : 1)),
    jumpStart: () => { setIsPlaying(false); if (sofaData[0]) handleHourChange(sofaData[0].hour_idx); },
    jumpEnd: () => { setIsPlaying(false); if (sofaData.length) handleHourChange(sofaData[sofaData.length - 1].hour_idx); },
    stepNext: () => { 
      setIsPlaying(false); 
      const idx = sofaData.findIndex(d => Number(d.hour_idx) === selectedHour);
      if (idx < sofaData.length - 1) handleHourChange(sofaData[idx + 1].hour_idx); 
    },
    stepPrev: () => { 
      setIsPlaying(false); 
      const idx = sofaData.findIndex(d => Number(d.hour_idx) === selectedHour);
      if (idx > 0) handleHourChange(sofaData[idx - 1].hour_idx); 
    }
  };

  // 建立 Dev Validator
  useEffect(() => {
    if (serverReady && overview && insights) {
      debugStateValidator(selectedStayId, selectedHour, gap, insights);
    }
  }, [serverReady, selectedStayId, selectedHour, gap, insights, overview]);

  const isCritical = insights && insights.trend?.code === 1 && insights.actualSofa >= 10;
  const riskLevel = insights ? getRiskLevel(insights.actualSofa) : null;

  if (!serverReady) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#F0F4F8] gap-6">
        <div className="accent-gradient-bar w-48 rounded-full" />
        <div className="medical-card p-8 text-center max-w-md">
          <Loader className="w-10 h-10 text-blue-600 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-800 mb-2">ICU SOFA 監測系統</h2>
          <p className="text-slate-500 text-sm">正在載入及預處理預測資料...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-[#F0F4F8] text-slate-800 font-sans selection:bg-blue-200 ${isCritical ? 'critical-border-pulse' : ''}`}>
      <div className="accent-gradient-bar" />

      <Header
        patients={patients}
        selectedStayId={selectedStayId}
        onSelectPatient={setSelectedStayId}
        gap={gap}
        onGapChange={setGap}
        activeView={activeView}
        onViewChange={setActiveView}
        riskLevel={riskLevel}
        selectedHour={selectedHour}
        overview={overview}
      />

      <main className="max-w-[1600px] mx-auto px-4 md:px-6 py-6">
        {error && (
          <div className="medical-card p-4 mb-6 border-red-200 bg-red-50 text-red-700 text-sm">
            {error === 'DATA_LOADING' ? '資料仍在載入中，請稍候重試...' : `錯誤: ${error}`}
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="skeleton h-64" /><div className="skeleton h-64 lg:col-span-2" /><div className="skeleton h-64" />
          </div>
        ) : activeView === 'SOFA' ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-3 space-y-5">
              <PatientOverview overview={overview} vitals={vitals} selectedHour={selectedHour} />
            </div>

            <div className="lg:col-span-6 space-y-5">
              <VitalsHero vitals={vitals} selectedHour={selectedHour} />

              <SofaChart
                sofaData={sofaData}
                insights={insights}
                gap={gap}
                selectedHour={selectedHour}
                onHourChange={handleHourChange}
                selectedTarget={selectedTarget}
                onTargetChange={setSelectedTarget}
                isPlaying={isPlaying}
                playbackSpeed={playbackSpeed}
                playbackActions={playbackActions}
              />

              <OrganTrendRegistry
                insights={insights}
                gap={gap}
                selectedHour={selectedHour}
              />
            </div>

            <div className="lg:col-span-3 space-y-5">
              <OrganBreakdown
                insights={insights}
                gap={gap}
                selectedTarget={selectedTarget}
              />
              <ClinicalInsights insights={insights} gap={gap} />
            </div>
          </div>
        ) : (
          <OrganRiskView 
            selectedHour={selectedHour} 
            gap={gap}
            selectedPatientId={selectedStayId}
            rows={deteriorationData}
          />
        )}

        <div className="mt-10 border-t border-slate-200 pt-4 text-center">
          <p className="text-slate-400 text-xs leading-relaxed max-w-3xl mx-auto">
            ⚠ <strong>原型聲明</strong>：此為教學與作品集展示用途之前端原型。未連接實際病人資料、醫療設備或臨床決策支援系統。
          </p>
        </div>
      </main>
    </div>
  );
}
