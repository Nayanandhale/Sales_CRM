/*
 * Udyogwardhini CRM v6 — server.js
 * Node.js + Express + PostgreSQL Backend
 *
 * Install:  npm install
 * Dev run:  npm run dev
 * Prod run: npm start
 *
 * Required environment variables (set in .env or hosting dashboard):
 *   DATABASE_URL=postgresql://user:pass@host:5432/dbname
 *   PORT=5000          (optional, defaults to 5000)
 *   NODE_ENV=production
 */

require('dotenv').config();
const express  = require('express');
const cors     = require('cors');
const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');

const app  = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// ── DATABASE POOL ─────────────────────────────────────
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

// ── REAL COURSES (mirrors BASE_COURSES in app.js) ─────
const BASE_COURSES = [
  'EDP', 'Solar EDP', 'Export & Import with Global Management',
  'FV Processing', 'FV Dehydration', 'RTC Premixes Course', 'Spice Processing',
  'Global Spice Processing', 'Millet Processing', 'Frozen Retort', 'Snacks Processing',
  'Spice Blends Industrial Workshop', 'Industrial Dehydration Workshop',
  'RTC Premixes Industrial Workshop', 'Millet RTC Premixes', 'Real Estate',
  'Buildership Management', 'Site Engineer', 'Quantity Surveyor & Billing',
  'Warehouse Engineer', 'Redevelopment Workshop', 'GeM & e tendering',
  'AI for Sales & Business Growth', 'Tourism', 'Institutional Order Flow Analyst',
  'Packaging, Branding & Marketing Workshop', 'Milk Processing', 'Cloud Kitchen',
  'Packaging Business', 'Share Market Analyst', 'Bakery Workshop',
];

const REAL_AGENTS = [
  { name: 'Komal',  password: 'komal123',  role: 'Counsellor', targetLeads: 50, targetAdm: 10 },
  { name: 'Sejal',  password: 'sejal123',  role: 'Counsellor', targetLeads: 50, targetAdm: 10 },
  { name: 'Yogesh', password: 'yogesh123', role: 'Counsellor', targetLeads: 50, targetAdm: 10 },
];

const REAL_ADMINS = [
      {name:'Gerry',password:'gerry@26'},
      {name:'Operations',password:'ops@26'},
      {name:'Rohit',password:'rohit@26'},
      {name:'Shriram_UDY',password:'udy@2026'},
];

// ── HELPERS ───────────────────────────────────────────
const uid   = () => uuidv4().replace(/-/g, '').slice(0, 8);
const today = () => new Date().toISOString().slice(0, 10);

/** Mirrors getLeadStatus() in app.js */
function getLeadStatus(lead) {
  for (const r of [lead.remark3, lead.remark2, lead.remark1]) {
    if (['Admitted', 'Interested', 'Not Interested'].includes(r)) return r;
  }
  return 'New';
}

// ── DB INIT ───────────────────────────────────────────
// All data is stored as JSONB in a single key-value store table.
// Each "collection" (leads, admissions, agents, ...) is one row.
// This keeps the schema identical to the original JSON-file approach
// while using PostgreSQL as the storage engine.

async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS crm_store (
      key   TEXT PRIMARY KEY,
      value JSONB NOT NULL DEFAULT '[]'::jsonb
    );
  `);
  await pool.query(`
    INSERT INTO crm_store (key, value) VALUES
      ('leads',      '[]'),
      ('admissions', '[]'),
      ('agents',     '[]'),
      ('admins',     '[]'),
      ('courses',    '[]'),
      ('webinars',   '[]'),
      ('batches',    '[]'),
      ('dailyNotes', '[]'),
      ('settings',   '{}')
    ON CONFLICT (key) DO NOTHING;
  `);

  // Seed real agents if none exist
  const { rows: agentRows } = await pool.query(`SELECT value FROM crm_store WHERE key='agents'`);
  const agents = agentRows[0].value;
  const hasPasswordAgents = agents.some(a => a.password);
  if (!agents.length || !hasPasswordAgents) {
    const seeded = REAL_AGENTS.map(a => ({
      id: uid(), ...a, phone: '', email: '', status: 'Active', createdAt: today()
    }));
    await pool.query(`UPDATE crm_store SET value=$1 WHERE key='agents'`, [JSON.stringify(seeded)]);
    console.log('✅ Real agents seeded');
  }

  // Seed real admins if none exist
  const { rows: adminRows } = await pool.query(`SELECT value FROM crm_store WHERE key='admins'`);
  if (!adminRows[0].value.length) {
    const seeded = REAL_ADMINS.map(a => ({ id: uid(), ...a, createdAt: today() }));
    await pool.query(`UPDATE crm_store SET value=$1 WHERE key='admins'`, [JSON.stringify(seeded)]);
    console.log('✅ Real admins seeded');
  }

  // Ensure settings has defaults
  const { rows: settRows } = await pool.query(`SELECT value FROM crm_store WHERE key='settings'`);
  const sett = settRows[0].value;
  if (!sett.orgName) {
    const defaults = {
      orgName: 'Udyogwardhini', adminName: 'Admin', adminRole: 'Super Admin',
      email: '', phone: '', domain: '', driveLink: ''
    };
    await pool.query(`UPDATE crm_store SET value=$1 WHERE key='settings'`, [JSON.stringify(defaults)]);
  }

  console.log('✅ Database initialised');
}

// ── GENERIC COLLECTION HELPERS ────────────────────────
async function getCollection(key) {
  const { rows } = await pool.query(`SELECT value FROM crm_store WHERE key=$1`, [key]);
  return rows[0]?.value || [];
}

async function setCollection(key, data) {
  await pool.query(`UPDATE crm_store SET value=$1 WHERE key=$2`, [JSON.stringify(data), key]);
}

async function getSetting() {
  const { rows } = await pool.query(`SELECT value FROM crm_store WHERE key='settings'`);
  return rows[0]?.value || {};
}

// ── BATCH → ADMISSION STATUS AUTO-SYNC ──────────────
async function syncBatchStatuses() {
  const t       = today();
  const batches = await getCollection('batches');
  const adms    = await getCollection('admissions');
  let changed   = false;

  for (const b of batches) {
    if (!b.startDate) continue;
    let ns = b.status || 'Upcoming';
    if      (b.startDate > t)                      ns = 'Upcoming';
    else if (b.endDate && b.endDate < t)            ns = 'Completed';
    else if (b.startDate <= t)                      ns = 'Ongoing';
    if (ns !== b.status) {
      b.status = ns;
      adms.forEach(a => {
        if (a.batchId === b.id) {
          if      (ns === 'Completed') a.status = 'Completed';
          else if (ns === 'Ongoing')   a.status = 'Active';
          else if (ns === 'Upcoming')  a.status = 'On Hold';
        }
      });
      changed = true;
    }
  }
  if (changed) {
    await setCollection('batches',    batches);
    await setCollection('admissions', adms);
  }
}

// ── GENERIC CRUD ROUTES ────────────────────────────────
const COLLECTIONS = ['leads','admissions','agents','admins','courses','webinars','batches','dailyNotes'];

for (const col of COLLECTIONS) {
  // GET all
  app.get(`/api/${col}`, async (req, res) => {
    try {
      const items = await getCollection(col);
      if (col === 'leads') items.forEach(l => { l._status = getLeadStatus(l); });
      res.json(items);
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  // POST create
  app.post(`/api/${col}`, async (req, res) => {
    try {
      const items = await getCollection(col);
      const item  = { id: uid(), createdAt: today(), ...req.body };
      items.push(item);
      await setCollection(col, items);
      if (col === 'batches') await syncBatchStatuses();
      res.status(201).json(item);
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  // PUT update
  app.put(`/api/${col}/:id`, async (req, res) => {
    try {
      const items = await getCollection(col);
      const idx   = items.findIndex(x => x.id === req.params.id);
      if (idx === -1) return res.status(404).json({ error: 'Not found' });
      items[idx] = { ...items[idx], ...req.body };
      await setCollection(col, items);
      if (col === 'batches') await syncBatchStatuses();
      res.json(items[idx]);
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  // DELETE
  app.delete(`/api/${col}/:id`, async (req, res) => {
    try {
      const items    = await getCollection(col);
      const filtered = items.filter(x => x.id !== req.params.id);
      await setCollection(col, filtered);
      res.json({ deleted: req.params.id });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });
}

// ── SETTINGS ──────────────────────────────────────────
app.get('/api/settings', async (req, res) => {
  try { res.json(await getSetting()); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/settings', async (req, res) => {
  try {
    const cur = await getSetting();
    const upd = { ...cur, ...req.body };
    await pool.query(`UPDATE crm_store SET value=$1 WHERE key='settings'`, [JSON.stringify(upd)]);
    res.json(upd);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── AUTH ──────────────────────────────────────────────
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username = '', password = '', role = '' } = req.body;
    const uname = username.trim().toLowerCase();
    const pass  = password.trim();

    if (role === 'admin') {
      const admins = await getCollection('admins');
      const match  = admins.find(a => a.name.toLowerCase() === uname && a.password === pass);
      if (match) return res.json({ success: true, user: { username: match.name, name: match.name, role: 'admin' } });
      return res.status(401).json({ success: false, error: 'Invalid admin credentials' });
    }

    if (role === 'agent') {
      const agents = await getCollection('agents');
      const match  = agents.find(a => a.name.trim().toLowerCase() === uname && a.password === pass && a.status === 'Active');
      if (match) return res.json({ success: true, user: { username: match.name, name: match.name, role: 'agent', agentRef: match } });
      return res.status(401).json({ success: false, error: 'Invalid agent credentials' });
    }

    res.status(400).json({ success: false, error: 'Invalid role' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── COURSES: full list (BASE + custom) ────────────────
app.get('/api/courses/all', async (req, res) => {
  try {
    const custom  = await getCollection('courses');
    const names   = custom.map(c => c.name).filter(n => !BASE_COURSES.includes(n));
    res.json([...BASE_COURSES, ...names]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── BULK ASSIGN LEADS ─────────────────────────────────
app.post('/api/leads/bulk-assign', async (req, res) => {
  try {
    const { ids = [], agent = '', allowReassign = false } = req.body;
    const leads = await getCollection('leads');
    let count = 0;
    leads.forEach(l => {
      if (ids.includes(l.id) && (!l.agent || allowReassign)) {
        l.agent = agent; l.assignedOn = today(); count++;
      }
    });
    await setCollection('leads', leads);
    res.json({ assigned: count });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── DASHBOARD SUMMARY ─────────────────────────────────
app.get('/api/dashboard', async (req, res) => {
  try {
    const { from = '', to = today(), agent: agentFilter = '' } = req.query;
    let leads = await getCollection('leads');
    let adms  = await getCollection('admissions');
    if (agentFilter) { leads = leads.filter(l => l.agent === agentFilter); adms = adms.filter(a => a.agentName === agentFilter); }
    if (from)        { leads = leads.filter(l => l.createdAt >= from); adms = adms.filter(a => a.date >= from); }
    leads = leads.filter(l => l.createdAt <= to);
    adms  = adms.filter(a => a.date <= to);
    res.json({
      totalLeads:      leads.length,
      totalAdmissions: adms.length,
      totalInterested: leads.filter(l => getLeadStatus(l) === 'Interested').length,
      totalRevenue:    adms.reduce((s, a) => s + Number(a.paid || 0), 0),
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── AGENT PERFORMANCE ─────────────────────────────────
app.get('/api/agent-performance', async (req, res) => {
  try {
    const { from = '', to = today() } = req.query;
    let leads = await getCollection('leads');
    let adms  = await getCollection('admissions');
    const agents = await getCollection('agents');
    if (from) { leads = leads.filter(l => l.createdAt >= from); adms = adms.filter(a => a.date >= from); }
    leads = leads.filter(l => l.createdAt <= to);
    adms  = adms.filter(a => a.date <= to);
    const result = agents.filter(a => a.status === 'Active').map(a => {
      const al = leads.filter(l => l.agent === a.name);
      const aa = adms.filter(x => x.agentName === a.name);
      const courseAdms = {};
      aa.forEach(x => { courseAdms[x.course || 'Unknown'] = (courseAdms[x.course || 'Unknown'] || 0) + 1; });
      return {
        name: a.name, totalLeads: al.length, admissions: aa.length,
        interested: al.filter(l => getLeadStatus(l) === 'Interested').length,
        revenue: aa.reduce((s, x) => s + Number(x.paid || 0), 0),
        conversion: al.length ? Math.round(aa.length / al.length * 100) : 0,
        courseWise: courseAdms,
      };
    });
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── ANALYTICS: Top Locations ──────────────────────────
app.get('/api/analytics/locations', async (req, res) => {
  try {
    const { month = '' } = req.query;
    let adms = await getCollection('admissions');
    if (month) adms = adms.filter(a => (a.date || '').startsWith(month));
    const map = {};
    adms.forEach(a => { const c = (a.city || 'Unknown').trim(); map[c] = (map[c] || 0) + 1; });
    const top5 = Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 5);
    res.json(top5.map(([city, count]) => ({ city, count })));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── ANALYTICS: Age Groups ─────────────────────────────
app.get('/api/analytics/age-groups', async (req, res) => {
  try {
    const { month = '' } = req.query;
    let adms = await getCollection('admissions');
    if (month) adms = adms.filter(a => (a.date || '').startsWith(month));
    const brackets = [['15–19',15,19],['20–24',20,24],['25–29',25,29],['30–34',30,34],['35–44',35,44],['45+',45,99]];
    res.json(brackets.map(([label, lo, hi]) => ({
      label, count: adms.filter(a => { const age = Number(a.age || 0); return age >= lo && age <= hi; }).length
    })));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── ANALYTICS: Course Stats ───────────────────────────
app.get('/api/analytics/courses', async (req, res) => {
  try {
    const month = req.query.month || today().slice(0, 7);
    const leads    = (await getCollection('leads')).filter(l => (l.createdAt || '').startsWith(month));
    const adms     = (await getCollection('admissions')).filter(a => (a.date || '').startsWith(month));
    const batches  = await getCollection('batches');
    const custom   = await getCollection('courses');

    const activeCourses = new Set();
    batches.forEach(b => {
      const bs = (b.startDate || '').slice(0, 7), be = (b.endDate || b.startDate || '').slice(0, 7);
      if (bs <= month && month <= be) activeCourses.add(b.course);
    });
    const allC   = [...BASE_COURSES, ...custom.map(c => c.name).filter(n => !BASE_COURSES.includes(n))];
    const target = activeCourses.size ? allC.filter(c => activeCourses.has(c)) : allC;

    const result = [];
    for (const c of target) {
      const cl = leads.filter(l => l.course === c);
      const ca = adms.filter(a => a.course === c);
      const cw = (await getCollection('webinars')).filter(w => w.course === c && (w.date || '').startsWith(month)).length;
      if (!cl.length && !ca.length && !cw) continue;
      result.push({
        course: c, leads: cl.length, interested: cl.filter(l => getLeadStatus(l) === 'Interested').length,
        webinars: cw, admissions: ca.length, revenue: ca.reduce((s, a) => s + Number(a.paid || 0), 0),
        conversion: cl.length ? Math.round(ca.length / cl.length * 100) : 0,
      });
    }
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── DAILY TRACKER ─────────────────────────────────────
app.get('/api/daily', async (req, res) => {
  try {
    const { date = today(), agent: agentName = '' } = req.query;
    let leads = await getCollection('leads');
    let adms  = await getCollection('admissions');
    let notes = await getCollection('dailyNotes');
    if (agentName) {
      leads = leads.filter(l => l.agent === agentName);
      adms  = adms.filter(a => a.agentName === agentName);
      notes = notes.filter(n => n.agentName === agentName);
    }
    const waEntry = notes.find(n => n.date === date && n.waLog);
    const courseLeads = {}, courseAdms = {};
    leads.forEach(l => { courseLeads[l.course || 'Unknown'] = (courseLeads[l.course || 'Unknown'] || 0) + 1; });
    adms.forEach(a  => { courseAdms[a.course  || 'Unknown'] = (courseAdms[a.course  || 'Unknown'] || 0) + 1; });
    res.json({
      totalLeads:      leads.length,
      totalAdmissions: adms.length,
      interestedLeads: leads.filter(l => getLeadStatus(l) === 'Interested').length,
      callbacksDue:    leads.filter(l => l.callbackDate === date).length,
      callbacks:       leads.filter(l => l.callbackDate === date),
      admissionsToday: adms.filter(a => a.date === date),
      notes:           notes.filter(n => n.date === date && !n.waLog),
      waCount:         waEntry ? (waEntry.waCount || 0) : 0,
      courseLeads, courseAdms,
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── CSV EXPORT ────────────────────────────────────────
app.get('/api/export/:collection', async (req, res) => {
  try {
    const { collection } = req.params;
    const allowed = ['leads','admissions','agents','webinars','batches'];
    if (!allowed.includes(collection)) return res.status(403).json({ error: 'Not allowed' });
    let items = await getCollection(collection);
    if (!items.length) return res.send('No data');
    if (collection === 'leads') items.forEach(i => { i.effectiveStatus = getLeadStatus(i); });
    const keys = Object.keys(items[0]);
    const csv  = [keys.join(','), ...items.map(r => keys.map(k => `"${(r[k] || '').toString().replace(/"/g, '""')}"`).join(','))].join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment;filename=${collection}.csv`);
    res.send(csv);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── BATCH SYNC ────────────────────────────────────────
app.post('/api/batches/sync', async (req, res) => {
  try { await syncBatchStatuses(); res.json({ ok: true }); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

// ── RESET (wipe data, keep agents/admins) ─────────────
app.post('/api/reset', async (req, res) => {
  try {
    for (const k of ['leads','admissions','webinars','batches','dailyNotes','courses']) {
      await setCollection(k, []);
    }
    res.json({ ok: true, message: 'Operational data cleared. Agents and admins kept.' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── HEALTH CHECK ──────────────────────────────────────
app.get('/api/health', async (req, res) => {
  try {
    const leads  = await getCollection('leads');
    const adms   = await getCollection('admissions');
    const agents = await getCollection('agents');
    const admins = await getCollection('admins');
    const custom = await getCollection('courses');
    res.json({
      status: 'ok', version: '6.0',
      leads: leads.length, admissions: adms.length,
      agents: agents.length, admins: admins.length,
      courses: BASE_COURSES.length + custom.length,
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── SERVE FRONTEND (production) ───────────────────────
// Uncomment if you want Node.js to serve index.html directly
// const path = require('path');
// app.use(express.static(path.join(__dirname, 'public')));
// app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

// ── START ─────────────────────────────────────────────
async function start() {
  try {
    await initDB();
    app.listen(PORT, () => {
      console.log(`\n🌱 Udyogwardhini CRM v6 — Node.js Backend`);
      console.log(`   URL    : http://localhost:${PORT}`);
      console.log(`   Health : GET  /api/health`);
      console.log(`   Reset  : POST /api/reset`);
      console.log(`   Agents : Komal / Sejal / Yogesh`);
      console.log(`   Admins : Gerry / Operations / Rohit / Shriram_UDY\n`);
    });
  } catch (err) {
    console.error('❌ Failed to start:', err.message);
    process.exit(1);
  }
}
start();
