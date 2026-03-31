import express from 'express';
import cors from 'cors';
import {
  loadAllData, isReady,
  getPatientList, getPatientOverview,
  getPatientVitals, getPatientSofa, getPatientInsights,
} from './csvLoader.js';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// Middleware: block requests until data is loaded
app.use('/api', (req, res, next) => {
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

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: isReady() ? 'ready' : 'loading', timestamp: new Date().toISOString() });
});

// ─── Start server ───
async function start() {
  console.log('🚀 Starting ICU Dashboard API Server...');
  await loadAllData();
  app.listen(PORT, () => {
    console.log(`\n🌐 API Server running at http://localhost:${PORT}`);
    console.log(`   Try: http://localhost:${PORT}/api/patients\n`);
  });
}

start().catch(err => {
  console.error('❌ Failed to start server:', err);
  process.exit(1);
});
