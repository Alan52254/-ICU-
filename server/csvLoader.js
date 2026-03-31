import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Transform } from 'stream';
import Papa from 'papaparse';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(__dirname, '..');

// ─── In-memory data stores ───
let patientIndex = new Map();   // stay_id → { gender, age, admissiontype, icu_days, weight, hospmort }
let vitalsIndex = new Map();    // stay_id → [ { hour_idx, hr, map, rr, temp, spo2, gcs, ... } ]
let sofaIndex = new Map();      // stay_id → [ { hour_idx, sofa, sofa_resp, sofa_coag, ... } ]
let futureIndex = new Map();    // `${stay_id}|${hour_t}|${horizon}` → { Resp:{...}, Coag:{...}, ... }
let stayIds = [];
let loadingComplete = false;

// ─── CSV file paths ───
function findFile(patterns) {
  const files = fs.readdirSync(DATA_DIR);
  for (const p of patterns) {
    const found = files.find(f => f.includes(p));
    if (found) return path.join(DATA_DIR, found);
  }
  return null;
}

const PATIENT_DATA_FILE = findFile(['patient_data']);
const SOFA_FILE = findFile(['patient_sofa(1)', 'patient_sofa_1', 'mimiciv_patient_sofa']);
const FUTURE_FILE = findFile(['futuremax', 'future']);

// ─── Streaming CSV parser ───
function parseCSVStream(filePath, onRow) {
  return new Promise((resolve, reject) => {
    if (!filePath || !fs.existsSync(filePath)) {
      console.warn(`  ⚠ CSV not found: ${filePath}`);
      resolve();
      return;
    }
    const fileSize = fs.statSync(filePath).size;
    const sizeMB = (fileSize / 1024 / 1024).toFixed(1);
    console.log(`  📄 Parsing ${path.basename(filePath)} (${sizeMB} MB)...`);

    let rowCount = 0;
    const startTime = Date.now();
    const stream = fs.createReadStream(filePath, { encoding: 'utf-8' });

    // Strip UTF-8 BOM if present
    let isFirstChunk = true;
    const bomStrip = new Transform({
      transform(chunk, encoding, callback) {
        if (isFirstChunk) {
          const str = chunk.toString();
          this.push(str.replace(/^\uFEFF/, ''));
          isFirstChunk = false;
        } else {
          this.push(chunk);
        }
        callback();
      }
    });
    const cleanStream = stream.pipe(bomStrip);

    Papa.parse(cleanStream, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      step: (result) => {
        if (result.errors.length > 0) return;
        onRow(result.data);
        rowCount++;
        if (rowCount % 500000 === 0) {
          const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
          console.log(`    ...${(rowCount / 1000).toFixed(0)}K rows (${elapsed}s)`);
        }
      },
      complete: () => {
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        console.log(`  ✅ Done: ${(rowCount / 1000).toFixed(0)}K rows in ${elapsed}s`);
        resolve();
      },
      error: (err) => reject(err),
    });
  });
}

// ─── Load all CSVs ───
export async function loadAllData() {
  console.log('\n🏥 ICU Dashboard — Loading CSV data...\n');

  // 1. Patient data
  await parseCSVStream(PATIENT_DATA_FILE, (row) => {
    const sid = String(row.stay_id);
    const hour = Number(row.hour_idx);

    // Store demographics from hour 0 only
    if (!patientIndex.has(sid)) {
      patientIndex.set(sid, {
        stay_id: sid,
        gender: row.gender,
        age: row.age,
        admissiontype: row.admissiontype,
        icu_days: row.icu_days,
        weight: row.weight,
        hospmort: row.hospmort,
      });
    }

    // Store all hourly vitals
    if (!vitalsIndex.has(sid)) vitalsIndex.set(sid, []);
    vitalsIndex.get(sid).push({
      hour_idx: hour,
      hr: row.hr, sbp: row.sbp, dbp: row.dbp, map: row.map,
      rr: row.rr, spo2: row.spo2, temp: row.temp,
      gcs: row.gcs, gcs_eye: row.gcs_eye, gcs_motor: row.gcs_motor, gcs_verbal: row.gcs_verbal,
      vent: row.vent, urineoutput: row.urineoutput,
      lactate: row.lactate, creatinine: row.creatinine, bilirubin_total: row.bilirubin_total,
      platelet: row.platelet, wbc: row.wbc, hemoglobin: row.hemoglobin,
      norepinephrine: row.norepinephrine, dopamine: row.dopamine, epinephrine: row.epinephrine, dobutamine: row.dobutamine,
    });
  });

  // 2. SOFA scores
  await parseCSVStream(SOFA_FILE, (row) => {
    const sid = String(row.stay_id);
    if (!sofaIndex.has(sid)) sofaIndex.set(sid, []);
    sofaIndex.get(sid).push({
      hour_idx: Number(row.hour_idx),
      sofa: row.sofa,
      sofa_resp: row.sofa_resp,
      sofa_coag: row.sofa_coag,
      sofa_liver: row.sofa_liver,
      sofa_cv: row.sofa_cv,
      sofa_cns: row.sofa_cns,
      sofa_renal: row.sofa_renal,
    });
  });

  // 3. Future SOFA predictions (large file — stream with compact storage)
  await parseCSVStream(FUTURE_FILE, (row) => {
    const key = `${row.stay_id}|${row.hour_t}|${row.horizon}`;
    if (!futureIndex.has(key)) futureIndex.set(key, {});
    const target = row.target; // Resp, Coag, Liver, CV, CNS, Renal
    futureIndex.get(key)[target] = {
      current_sofa: row.current_sofa,
      future_max: row.future_max_sofa,
      future_min: row.future_min_sofa,
      true_label: row.true_label,
    };
  });

  // Sort vitals and sofa by hour_idx
  for (const [, arr] of vitalsIndex) arr.sort((a, b) => a.hour_idx - b.hour_idx);
  for (const [, arr] of sofaIndex) arr.sort((a, b) => a.hour_idx - b.hour_idx);

  stayIds = [...patientIndex.keys()].sort();
  loadingComplete = true;

  console.log(`\n✅ All data loaded. ${stayIds.length} patients available.`);
  console.log(`   Memory: ${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(0)} MB\n`);
}

// ─── Query functions ───
export function getPatientList() {
  return stayIds.map(sid => {
    const p = patientIndex.get(sid);
    const maxHour = vitalsIndex.get(sid)?.length || 0;
    return { stay_id: sid, gender: p.gender, age: p.age ? Math.floor(p.age) : null, admissiontype: p.admissiontype, icu_days: p.icu_days, maxHours: maxHour, hospmort: p.hospmort };
  });
}

export function getPatientOverview(stayId) {
  return patientIndex.get(stayId) || null;
}

export function getPatientVitals(stayId, maxHours) {
  const all = vitalsIndex.get(stayId);
  if (!all) return [];
  if (maxHours) return all.filter(v => v.hour_idx < maxHours);
  return all;
}

export function getPatientSofa(stayId, gap) {
  const actual = sofaIndex.get(stayId) || [];
  const horizon = gap || 4;

  // For each hour, attach future predictions
  const result = actual.map(row => {
    const key = `${stayId}|${row.hour_idx}|${horizon}`;
    const pred = futureIndex.get(key) || null;
    return { ...row, predictions: pred };
  });

  return result;
}

export function getPatientInsights(stayId, gap, hour) {
  const sofaArr = sofaIndex.get(stayId) || [];
  const vitalsArr = vitalsIndex.get(stayId) || [];
  const horizon = gap || 4;
  const targetHour = hour !== undefined ? hour : (sofaArr.length > 0 ? sofaArr[sofaArr.length - 1].hour_idx : 0);

  const sofaRow = sofaArr.find(r => r.hour_idx === targetHour);
  const vitalsRow = vitalsArr.find(r => r.hour_idx === targetHour);
  const predKey = `${stayId}|${targetHour}|${horizon}`;
  const pred = futureIndex.get(predKey) || null;

  if (!sofaRow) return { hour: targetHour, status: 'no_data' };

  // Calculate predicted total SOFA (sum of future_max across organs)
  let predictedTotal = 0;
  if (pred) {
    predictedTotal = ['Resp', 'Coag', 'Liver', 'CV', 'CNS', 'Renal']
      .reduce((sum, org) => sum + (pred[org]?.future_max ?? 0), 0);
  }

  const actualTotal = sofaRow.sofa;
  const diff = predictedTotal - actualTotal;

  let trendCode, trendLabel, trendColor, trendIcon;
  if (diff > 1) { trendCode = 1; trendLabel = '惡化'; trendColor = '#EF4444'; trendIcon = '↑'; }
  else if (diff < -1) { trendCode = -1; trendLabel = '改善'; trendColor = '#10B981'; trendIcon = '↓'; }
  else { trendCode = 0; trendLabel = '穩定'; trendColor = '#F59E0B'; trendIcon = '→'; }

  // Generate clinical summary
  let summary = '';
  if (trendCode === 1) {
    summary = `⚠ 預測未來 ${horizon} 小時 SOFA 總分可能從 ${actualTotal} 升至 ${predictedTotal}，顯示器官功能有惡化風險。`;
    if (pred?.CV?.future_max > (pred?.CV?.current_sofa ?? 0)) summary += ' 心血管系統需密切關注。';
    if (pred?.Resp?.future_max > (pred?.Resp?.current_sofa ?? 0)) summary += ' 呼吸功能有下降趨勢。';
  } else if (trendCode === -1) {
    summary = `✅ 預測未來 ${horizon} 小時 SOFA 總分可能從 ${actualTotal} 降至 ${predictedTotal}，器官功能呈改善趨勢。繼續當前治療方案。`;
  } else {
    summary = `→ 預測未來 ${horizon} 小時 SOFA 總分維持在 ${actualTotal} 附近，病情相對穩定。持續監測生命徵象變化。`;
  }

  return {
    hour: targetHour,
    actualSofa: actualTotal,
    predictedSofa: predictedTotal,
    diff,
    trend: { code: trendCode, label: trendLabel, color: trendColor, icon: trendIcon },
    summary,
    organPredictions: pred,
    vitals: vitalsRow,
  };
}

export function isReady() { return loadingComplete; }
