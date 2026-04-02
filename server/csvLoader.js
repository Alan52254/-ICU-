import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Transform } from 'stream';
import Papa from 'papaparse';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(__dirname, '..');

// ─── In-memory data stores ───
let patientIndex = new Map();   // stay_id → { gender, age, ... }
let vitalsIndex = new Map();    // stay_id → [ { hour_idx, hr, map, ... } ]
let sofaIndex = new Map();      // stay_id → [ { hour_idx, sofa, sofa_resp, ... } ]
// futureIndex: `${stay_id}|${hour_t}|${horizon}` → { resp:{pred,true,curr}, coag:{...}, ... }
let futureIndex = new Map();
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

// ─── Streaming CSV parser ───
function parseCSVStream(filePath, onRow, silent = false) {
  return new Promise((resolve, reject) => {
    if (!filePath || !fs.existsSync(filePath)) {
      if (!silent) console.warn(`  ⚠ CSV not found: ${filePath}`);
      resolve();
      return;
    }
    const fileSize = fs.statSync(filePath).size;
    const sizeMB = (fileSize / 1024 / 1024).toFixed(1);
    if (!silent) console.log(`  📄 Parsing ${path.basename(filePath)} (${sizeMB} MB)...`);

    let rowCount = 0;
    const startTime = Date.now();
    const stream = fs.createReadStream(filePath, { encoding: 'utf-8' });

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

    Papa.parse(stream.pipe(bomStrip), {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      step: (result) => {
        if (result.errors.length > 0) return;
        onRow(result.data);
        rowCount++;
        if (!silent && rowCount % 500000 === 0) {
          const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
          console.log(`    ...${(rowCount / 1000).toFixed(0)}K rows (${elapsed}s)`);
        }
      },
      complete: () => {
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        if (!silent) console.log(`  ✅ Done: ${(rowCount / 1000).toFixed(0)}K rows in ${elapsed}s`);
        resolve();
      },
      error: (err) => reject(err),
    });
  });
}

// ─── ID Normalization ───
function normalizeId(row) {
  const raw = row.stay_id !== undefined ? row.stay_id : row.patient_id;
  if (raw === undefined || raw === null || raw === '') return null;
  return String(raw);
}

// ─── Load all CSVs ───
export async function loadAllData() {
  console.log('\n🏥 ICU Dashboard — Loading CSV data Standardizing IDs...\n');

  // Initialize indices
  patientIndex = new Map();
  vitalsIndex = new Map();
  sofaIndex = new Map();
  futureIndex = new Map();
  stayIds = [];

  // 1. Patient demographics + vitals
  if (PATIENT_DATA_FILE && fs.existsSync(PATIENT_DATA_FILE)) {
    await parseCSVStream(PATIENT_DATA_FILE, (row) => {
      const sid = normalizeId(row);
      if (!sid) return;

      const hour = Number(row.hour_idx);

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

      if (!vitalsIndex.has(sid)) vitalsIndex.set(sid, []);
      vitalsIndex.get(sid).push({
        hour_idx: hour,
        hr: row.hr, sbp: row.sbp, dbp: row.dbp, map: row.map,
        rr: row.rr, spo2: row.spo2, temp: row.temp,
        gcs: row.gcs,
        vent: row.vent, urineoutput: row.urineoutput,
        lactate: row.lactate, creatinine: row.creatinine, bilirubin_total: row.bilirubin_total,
        platelet: row.platelet, wbc: row.wbc, hemoglobin: row.hemoglobin,
        norepinephrine: row.norepinephrine, dopamine: row.dopamine,
        epinephrine: row.epinephrine, dobutamine: row.dobutamine,
      });
    });
  } else {
    console.warn('  ⚠ Main demographics file missing. Will fallback to extracting IDs from other CSVs.');
  }

  // 2. SOFA scores
  await parseCSVStream(SOFA_FILE, (row) => {
    const sid = normalizeId(row);
    if (!sid) return;

    // Fallback: If demographics file was missing, create placeholder
    if (!patientIndex.has(sid)) {
      patientIndex.set(sid, { stay_id: sid, gender: 0, age: 0, admissiontype: 'Unknown', icu_days: 0 });
    }

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

  // 3. Future SOFA predictions from multiple files in src/
  const srcDir = path.join(DATA_DIR, 'src');
  if (fs.existsSync(srcDir)) {
    const predictionFiles = fs.readdirSync(srcDir)
      .filter(f => f.includes('future_sofa_compare'))
      .map(f => path.join(srcDir, f));

    if (predictionFiles.length > 0) {
      console.log(`  📂 Loading ${predictionFiles.length} prediction files (Parallel Batching) from src/...`);
      
      const BATCH_SIZE = 100;
      let count = 0;

      for (let i = 0; i < predictionFiles.length; i += BATCH_SIZE) {
        const batch = predictionFiles.slice(i, i + BATCH_SIZE);
        
        await Promise.all(batch.map(file => 
          parseCSVStream(file, (row) => {
            const sid = normalizeId(row);
            if (!sid) return;

            // Fallback: If demographics file was missing, create placeholder
            if (!patientIndex.has(sid)) {
              patientIndex.set(sid, { stay_id: sid, gender: 0, age: 0, admissiontype: 'Unknown', icu_days: 0 });
            }

            const horizon = Number(row.predict_horizon);
            const hourT = Number(row.hour_t);
            const key = `${sid}|${hourT}|${horizon}`;

            if (!futureIndex.has(key)) {
              futureIndex.set(key, {
                stay_id: sid,
                hour_t: hourT,
                predict_horizon: horizon,
                target_start_hour: row.target_start_hour,
                target_end_hour: row.target_end_hour,
              });
            }

            const entry = futureIndex.get(key);
            const ORGANS = ['resp', 'coag', 'liver', 'cv', 'cns', 'renal'];
            for (const org of ORGANS) {
              entry[`pred_sofa_${org}`] = row[`pred_sofa_${org}`];
              entry[`true_sofa_${org}`] = row[`true_sofa_${org}`];
              entry[`current_sofa_${org}`] = row[`current_sofa_${org}`];
              entry[`y_pred_${org}`] = row[`y_pred_${org}`];
              entry[`y_true_${org}`] = row[`y_true_${org}`];
            }
          }, true)
        ));

        count += batch.length;
        if (count % BATCH_SIZE === 0 || count === predictionFiles.length) {
          console.log(`    ...${count}/${predictionFiles.length} files processed`);
        }
      }
      console.log(`  ✅ Finished loading all ${predictionFiles.length} prediction files.`);
    } else {
      console.warn(`  ⚠ No prediction files found inside src/`);
    }
  } else {
    console.warn(`  ⚠ src/ directory not found for prediction files`);
  }

  // Sort by hour_idx
  for (const [, arr] of vitalsIndex) arr.sort((a, b) => a.hour_idx - b.hour_idx);
  for (const [, arr] of sofaIndex) arr.sort((a, b) => a.hour_idx - b.hour_idx);

  stayIds = [...patientIndex.keys()].sort();
  loadingComplete = true;

  console.log(`\n✅ All data loaded. ${stayIds.length} patients, ${futureIndex.size} prediction entries.`);
  console.log(`   Memory: ${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(0)} MB\n`);
}

// ─── Query functions ───
export function getPatientList() {
  return stayIds.map(sid => {
    const p = patientIndex.get(sid);
    const maxHour = vitalsIndex.get(sid)?.length || 0;
    return {
      stay_id: sid,
      gender: p.gender,
      age: p.age ? Math.floor(p.age) : null,
      admissiontype: p.admissiontype,
      icu_days: p.icu_days,
      maxHours: maxHour,
      hospmort: p.hospmort,
    };
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

  return actual.map(row => {
    const key = `${stayId}|${row.hour_idx}|${horizon}`;
    const pred = futureIndex.get(key) || null;
    return { ...row, predictions: pred };
  });
}

export function getPatientInsights(stayId, gap, hour) {
  const sofaArr = sofaIndex.get(stayId) || [];
  const vitalsArr = vitalsIndex.get(stayId) || [];
  const horizon = gap || 4;
  const targetHour = hour !== undefined ? Number(hour) : (sofaArr.length > 0 ? Number(sofaArr[sofaArr.length - 1].hour_idx) : 0);

  // Use Number() for index matching
  const sofaRow = sofaArr.find(r => Number(r.hour_idx) === targetHour);
  const vitalsRow = vitalsArr.find(r => Number(r.hour_idx) === targetHour);
  const predKey = `${stayId}|${targetHour}|${horizon}`;
  const pred = futureIndex.get(predKey) || null;

  if (!sofaRow) return { hour: targetHour, status: 'no_data' };

  const ORGANS = ['resp', 'coag', 'liver', 'cv', 'cns', 'renal'];
  const actualTotal = Number(sofaRow.sofa);
  let predictedTotal = null;
  let trueTotal = null;
  let organPredictions = null;

  if (pred) {
    // Sum for totals
    predictedTotal = ORGANS.reduce((sum, org) => {
      const val = Number(pred[`pred_sofa_${org}`]);
      return sum + (isNaN(val) ? 0 : val);
    }, 0);
    
    trueTotal = ORGANS.reduce((sum, org) => {
      const val = Number(pred[`true_sofa_${org}`]);
      return sum + (isNaN(val) ? 0 : val);
    }, 0);

    organPredictions = {};
    for (const org of ORGANS) {
      // Normalize organ key for frontend (Resp, Coag, etc.)
      const key = org === 'cv' ? 'CV' : org === 'cns' ? 'CNS' : org.charAt(0).toUpperCase() + org.slice(1);
      organPredictions[key] = {
        current_sofa: Number(pred[`current_sofa_${org}`]),
        future_max_pred: Number(pred[`pred_sofa_${org}`]),
        future_max_true: Number(pred[`true_sofa_${org}`]),
        y_pred: Number(pred[`y_pred_${org}`]),
        y_true: Number(pred[`y_true_${org}`]),
      };
    }
  }

  const diff = predictedTotal != null ? (predictedTotal - actualTotal) : 0;
  let trendCode, trendLabel, trendColor, trendIcon;
  if (diff > 0)      { trendCode = 1;  trendLabel = '惡化'; trendColor = '#EF4444'; trendIcon = '↑'; }
  else if (diff < 0) { trendCode = -1; trendLabel = '改善'; trendColor = '#10B981'; trendIcon = '↓'; }
  else               { trendCode = 0;  trendLabel = '穩定'; trendColor = '#64748B'; trendIcon = '→'; }

  let summary = '';
  if (trendCode === 1) {
    summary = `⚠ 預測未來 ${horizon} 小時 SOFA 總分可能從 ${actualTotal} 升至 ${predictedTotal}，顯示器官功能有惡化風險。`;
    if (pred && Number(pred.pred_sofa_cv) > Number(pred.current_sofa_cv)) summary += ' 心血管系統需密切關注。';
    if (pred && Number(pred.pred_sofa_resp) > Number(pred.current_sofa_resp)) summary += ' 呼吸功能有下降趨勢。';
  } else if (trendCode === -1) {
    summary = `✅ 預測未來 ${horizon} 小時 SOFA 總分可能從 ${actualTotal} 降至 ${predictedTotal}，器官功能呈改善趨勢。繼續當前治療方案。`;
  } else {
    summary = `→ 預測未來 ${horizon} 小時 SOFA 總分維持在 ${actualTotal} 附近，病情相對穩定。持續監測生命徵象變化。`;
  }

  return {
    hour: targetHour,
    actualSofa: actualTotal,
    predictedSofa: predictedTotal,
    trueSofa: trueTotal,
    diff,
    trend: { code: trendCode, label: trendLabel, color: trendColor, icon: trendIcon },
    summary,
    organPredictions,
    target_start_hour: pred ? Number(pred.target_start_hour) : null,
    target_end_hour: pred ? Number(pred.target_end_hour) : null,
    vitals: vitalsRow,
  };
}

export function isReady() { return loadingComplete; }
