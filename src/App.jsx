import React, { useState, useEffect, useCallback } from 'react';
import { fetchPatients, fetchPatientOverview, fetchPatientVitals, fetchPatientSofa, fetchPatientInsights, fetchHealth } from './lib/api';
import { getRiskLevel } from './lib/clinicalRules';
import { GAP_WINDOWS } from './lib/fieldMapping';
import Header from './components/Header';
import PatientOverview from './components/PatientOverview';
import VitalsHero from './components/VitalsHero';
import SofaChart from './components/SofaChart';
import OrganBreakdown from './components/OrganBreakdown';
import ClinicalInsights from './components/ClinicalInsights';
import { Loader } from './components/Icons';

export default function App() {
  // ─── Global state ───
  const [patients, setPatients] = useState([]);
  const [selectedStayId, setSelectedStayId] = useState(null);
  const [gap, setGap] = useState(4);
  const [selectedHour, setSelectedHour] = useState(null);
  const [timeWindow, setTimeWindow] = useState(48); // 24 or 48

  // ─── Data state ───
  const [overview, setOverview] = useState(null);
  const [vitals, setVitals] = useState([]);
  const [sofaData, setSofaData] = useState([]);
  const [insights, setInsights] = useState(null);

  // ─── UI state ───
  const [loading, setLoading] = useState(true);
  const [serverReady, setServerReady] = useState(false);
  const [error, setError] = useState(null);

  // Check server health
  useEffect(() => {
    const check = async () => {
      try {
        const h = await fetchHealth();
        if (h.status === 'ready') {
          setServerReady(true);
          return;
        }
      } catch {}
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
        if (list.length > 0) setSelectedStayId(list[0].stay_id);
      })
      .catch(e => setError(e.message));
  }, [serverReady]);

  // Load patient data when selection changes
  const loadPatientData = useCallback(async (stayId, gapVal, tw) => {
    if (!stayId) return;
    setLoading(true);
    setError(null);
    try {
      const [ov, vit, sofa] = await Promise.all([
        fetchPatientOverview(stayId),
        fetchPatientVitals(stayId, tw),
        fetchPatientSofa(stayId, gapVal),
      ]);
      setOverview(ov);
      setVitals(vit);
      setSofaData(sofa);

      // Set selected hour to the latest available
      const maxHour = sofa.length > 0 ? sofa[sofa.length - 1].hour_idx : 0;
      setSelectedHour(maxHour);

      // Load insights for latest hour
      const ins = await fetchPatientInsights(stayId, gapVal, maxHour);
      setInsights(ins);
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadPatientData(selectedStayId, gap, timeWindow);
  }, [selectedStayId, gap, timeWindow, loadPatientData]);

  // Load insights when selected hour changes
  const handleHourChange = useCallback(async (hour) => {
    setSelectedHour(hour);
    if (!selectedStayId) return;
    try {
      const ins = await fetchPatientInsights(selectedStayId, gap, hour);
      setInsights(ins);
    } catch {}
  }, [selectedStayId, gap]);

  // Determine if critical state
  const isCritical = insights && insights.trend?.code === 1 && insights.actualSofa >= 10;
  const riskLevel = insights ? getRiskLevel(insights.actualSofa) : null;

  // ─── Server loading screen ───
  if (!serverReady) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#F0F4F8] gap-6">
        <div className="accent-gradient-bar w-48 rounded-full" />
        <div className="medical-card p-8 text-center max-w-md">
          <Loader className="w-10 h-10 text-blue-600 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-800 mb-2">ICU SOFA 監測系統</h2>
          <p className="text-slate-500 text-sm">正在載入臨床資料，請稍候...</p>
          <p className="text-slate-400 text-xs mt-3 font-mono">Loading CSV datasets into memory</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-[#F0F4F8] text-slate-800 font-sans selection:bg-blue-200 ${isCritical ? 'critical-border-pulse' : ''}`}>
      {/* Top accent bar */}
      <div className="accent-gradient-bar" />

      {/* Header */}
      <Header
        patients={patients}
        selectedStayId={selectedStayId}
        onSelectPatient={setSelectedStayId}
        gap={gap}
        onGapChange={setGap}
        timeWindow={timeWindow}
        onTimeWindowChange={setTimeWindow}
        riskLevel={riskLevel}
        selectedHour={selectedHour}
        overview={overview}
      />

      {/* Main content */}
      <main className="max-w-[1600px] mx-auto px-4 md:px-6 py-6">
        {error && (
          <div className="medical-card p-4 mb-6 border-red-200 bg-red-50 text-red-700 text-sm">
            {error === 'DATA_LOADING' ? '資料仍在載入中，請稍候重試...' : `錯誤: ${error}`}
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="skeleton h-64" />
            <div className="skeleton h-64 lg:col-span-2" />
            <div className="skeleton h-64" />
            <div className="skeleton h-48 lg:col-span-4" />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left sidebar — Patient overview */}
            <div className="lg:col-span-3 space-y-5">
              <PatientOverview overview={overview} vitals={vitals} selectedHour={selectedHour} />
            </div>

            {/* Center — Charts */}
            <div className="lg:col-span-6 space-y-5">
              {/* Vitals cards */}
              <VitalsHero vitals={vitals} selectedHour={selectedHour} />

              {/* SOFA Chart */}
              <SofaChart
                sofaData={sofaData}
                gap={gap}
                selectedHour={selectedHour}
                onHourChange={handleHourChange}
              />
            </div>

            {/* Right sidebar — SOFA comparison + insights */}
            <div className="lg:col-span-3 space-y-5">
              <OrganBreakdown
                insights={insights}
                gap={gap}
              />
              <ClinicalInsights insights={insights} gap={gap} />
            </div>
          </div>
        )}

        {/* Disclaimer */}
        <div className="mt-10 border-t border-slate-200 pt-4 text-center">
          <p className="text-slate-400 text-xs leading-relaxed max-w-3xl mx-auto">
            ⚠ <strong>原型聲明</strong>：此為教學與作品集展示用途之前端原型。未連接實際病人資料、醫療設備或臨床決策支援系統。
            不適用於臨床實務，所有分析均為模擬。未符合 HIPAA、GDPR 或任何醫療器材法規。
          </p>
        </div>
      </main>
    </div>
  );
}
