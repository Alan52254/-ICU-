import express from 'express';
import cors from 'cors';
import {
  loadAllData, isReady,
  getPatientList, getPatientOverview,
  getPatientVitals, getPatientSofa, getPatientInsights,
  getPatientDeterioration, getDeteriorationManifest,
} from './csvLoader.js';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// Health check must be reachable even while loading.
app.get('/api/health', (req, res) => {
  res.json({ status: isReady() ? 'ready' : 'loading', loading: !isReady() });
});

// Middleware: block requests until data is loaded
app.use('/api', (req, res, next) => {
  if (req.path === '/health') return next();
  if (!isReady()) return res.status(503).json({ error: 'Data still loading. Please wait...' });
  next();
});

// ─── API Routes ───

// GET /api/patients — list all patients
app.get('/api/patients', (req, res) => {
  res.json(getPatientList());
});

// GET /api/patients/:stayId/overview
app.get('/api/patients/:stayId/overview', (req, res) => {
  const data = getPatientOverview(req.params.stayId);
  if (!data) return res.status(404).json({ error: 'Patient not found' });
  res.json(data);
});

// GET /api/patients/:stayId/vitals?hours=48
app.get('/api/patients/:stayId/vitals', (req, res) => {
  const hours = req.query.hours ? parseInt(req.query.hours) : undefined;
  const data = getPatientVitals(req.params.stayId, hours);
  res.json(data);
});

// GET /api/patients/:stayId/sofa?gap=4
app.get('/api/patients/:stayId/sofa', (req, res) => {
  const gap = req.query.gap ? parseInt(req.query.gap) : 4;
  const data = getPatientSofa(req.params.stayId, gap);
  res.json(data);
});

// GET /api/patients/:stayId/insights?gap=4&hour=12
app.get('/api/patients/:stayId/insights', (req, res) => {
  const gap = req.query.gap ? parseInt(req.query.gap) : 4;
  const hour = req.query.hour !== undefined ? parseInt(req.query.hour) : undefined;
  const data = getPatientInsights(req.params.stayId, gap, hour);
  res.json(data);
});

// GET /api/patients/:stayId/deterioration?gap=4&hour=12
app.get('/api/patients/:stayId/deterioration', async (req, res) => {
  const gap = req.query.gap !== undefined ? parseInt(req.query.gap) : undefined;
  const hour = req.query.hour !== undefined ? parseInt(req.query.hour) : undefined;
  try {
    const data = await getPatientDeterioration(req.params.stayId, gap, hour);
    res.json(data);
  } catch (err) {
    console.error('Failed to read deterioration data:', err);
    res.status(500).json({ error: 'Failed to read deterioration data' });
  }
});

// GET /api/deterioration/manifest
app.get('/api/deterioration/manifest', (req, res) => {
  res.json(getDeteriorationManifest());
});

// ─── Start server ───
async function start() {
  // 1. Listen immediately so port is claimed and health-check is available
  app.listen(PORT, () => {
    console.log(`🚀 ICU Dashboard API Server is UP and listening on port ${PORT}`);
    console.log(`🏥 Status: Data loading in progress...`);
  });

  // 2. Load data in background
  try {
    await loadAllData();
    console.log(`\n🌐 API Server is READY. Data loaded successfully.`);
    console.log(`   Try: http://localhost:${PORT}/api/patients\n`);
  } catch (err) {
    console.error('❌ Data loading failed:', err);
    process.exit(1);
  }
}

start().catch(err => {
  console.error('❌ Failed to initialize server:', err);
  process.exit(1);
});
