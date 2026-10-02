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
  { name: 'Gerry', password: 'gerry@26' },
  { name: 'Operations', password: 'ops@26' },
  { name: 'Rohit', password: 'rohit@26' },
  { name: 'Shriram_UDY', password: 'udy@2026' },
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
      orgName: 'Udyogwardhini', adminName: 'Rohit', adminRole: 'Super Admin',
      email: 'info@udyogwardhini.com', phone: '', domain: 'Udyogwardhini', driveLink: ''
    };
    await pool.query(`UPDATE crm_store SET value=$1 WHERE key='settings'`, [JSON.stringify(defaults)]);
  }

  // Seed sample testing data if leads are empty
  const { rows: leadRows } = await pool.query(`SELECT value FROM crm_store WHERE key='leads'`);
  if (!leadRows[0].value.length) {
    const dStr = (offsetDays) => {
      const d = new Date();
      d.setDate(d.getDate() + offsetDays);
      return d.toISOString().slice(0, 10);
    };

    const sampleBatches = [
      { id: 'b_edp1', name: 'EDP - Batch 14', course: 'EDP', mode: 'Offline', startDate: dStr(-28), endDate: dStr(-10), timing: '10:00 AM - 01:00 PM', seats: 35, instructor: 'Dr. Suresh Patil', status: 'Completed', createdAt: dStr(-35) },
      { id: 'b_sol1', name: 'Solar EDP Masterclass', course: 'Solar EDP', mode: 'Hybrid', startDate: dStr(-12), endDate: dStr(6), timing: '02:00 PM - 05:00 PM', seats: 30, instructor: 'Er. Nitin Deshmukh', status: 'Ongoing', createdAt: dStr(-20) },
      { id: 'b_exp1', name: 'Export & Import Global Batch 8', course: 'Export & Import with Global Management', mode: 'Online', startDate: dStr(-7), endDate: dStr(14), timing: '06:30 PM - 08:30 PM', seats: 40, instructor: 'Rajesh Kulkarni', status: 'Ongoing', createdAt: dStr(-18) },
      { id: 'b_spc1', name: 'Spice Processing Workshop', course: 'Spice Processing', mode: 'Offline', startDate: dStr(8), endDate: dStr(22), timing: '10:30 AM - 04:30 PM', seats: 25, instructor: 'Mahesh Shinde', status: 'Upcoming', createdAt: dStr(-5) },
      { id: 'b_re1',  name: 'Real Estate & Buildership', course: 'Real Estate', mode: 'Offline', startDate: dStr(15), endDate: dStr(28), timing: '09:30 AM - 01:30 PM', seats: 30, instructor: 'Adv. Sanjay More', status: 'Upcoming', createdAt: dStr(-3) },
    ];
    await pool.query(`UPDATE crm_store SET value=$1 WHERE key='batches'`, [JSON.stringify(sampleBatches)]);

    const sampleWebinars = [
      { id: 'w_sol', title: 'Solar Energy Startup & Government Subsidies 2026', date: dStr(-4), time: '11:00 AM', course: 'Solar EDP', platform: 'Zoom', link: 'https://zoom.us/j/987654321', desc: 'Guidance on project setup, Net Metering & PM Surya Ghar Yojana', createdAt: dStr(-10) },
      { id: 'w_exp', title: 'How to Start Export-Import Business in 30 Days', date: dStr(3), time: '06:00 PM', course: 'Export & Import with Global Management', platform: 'Google Meet', link: 'https://meet.google.com/abc-defg-hij', desc: 'Step-by-step buyer finding, container booking and custom clearance', createdAt: dStr(-2) },
      { id: 'w_spc', title: 'Spice & Food Processing Unit Setup & Licences', date: dStr(6), time: '04:00 PM', course: 'Spice Processing', platform: 'Zoom', link: 'https://zoom.us/j/123456789', desc: 'FSSAI, machinery procurement and blending secret formulations', createdAt: dStr(-1) }
    ];
    await pool.query(`UPDATE crm_store SET value=$1 WHERE key='webinars'`, [JSON.stringify(sampleWebinars)]);

    const sampleLeads = [
      { id: uid(), name: 'Amit Patil', phone: '9822014589', email: 'amit.patil@gmail.com', course: 'Solar EDP', source: 'Webinar', agent: 'Komal', callbackDate: dStr(1), callbackTime: '11:00', callCount: 3, remark1: 'Interested', remark2: '', remark3: '', payMode: '', payAmount: '', notes: 'Has 500 sq ft rooftop, interested in solar dealership', createdAt: dStr(-10) },
      { id: uid(), name: 'Priya Deshmukh', phone: '9765432101', email: 'priya.deshmukh@yahoo.com', course: 'Export & Import with Global Management', source: 'Social Media', agent: 'Sejal', callbackDate: dStr(0), callbackTime: '14:30', callCount: 2, remark1: 'Hot Lead', remark2: '', remark3: '', payMode: '', payAmount: '', notes: 'Family into onion & grape farming, wants to export to Dubai', createdAt: dStr(-8) },
      { id: uid(), name: 'Rahul Shinde', phone: '9423156789', email: 'rahul.s@outlook.com', course: 'Solar EDP', source: 'Google Ads', agent: 'Komal', callbackDate: '', callbackTime: '', callCount: 4, remark1: 'Admitted', remark2: '', remark3: '', payMode: 'UPI', payAmount: '25000', notes: 'Enrolled in Solar EDP Masterclass batch', createdAt: dStr(-12) },
      { id: uid(), name: 'Sneha Kulkarni', phone: '9890123456', email: 'sneha.k@gmail.com', course: 'Spice Processing', source: 'Inbound Enquiry', agent: 'Yogesh', callbackDate: dStr(2), callbackTime: '16:00', callCount: 1, remark1: 'Interested', remark2: '', remark3: '', payMode: '', payAmount: '', notes: 'Looking to start packaged spice manufacturing in Nashik', createdAt: dStr(-5) },
      { id: uid(), name: 'Vikas More', phone: '9921456780', email: 'vikas.more@gmail.com', course: 'Real Estate', source: 'Referral', agent: 'Yogesh', callbackDate: dStr(1), callbackTime: '10:30', callCount: 2, remark1: 'Hot Lead', remark2: '', remark3: '', payMode: '', payAmount: '', notes: 'Civil engineer planning RERA agent & project advisory', createdAt: dStr(-4) },
      { id: uid(), name: 'Pooja Jadhav', phone: '9860234567', email: 'pooja.j@hotmail.com', course: 'EDP', source: 'Webinar', agent: 'Sejal', callbackDate: '', callbackTime: '', callCount: 3, remark1: 'Admitted', remark2: '', remark3: '', payMode: 'Net Banking', payAmount: '18000', notes: 'Admitted in EDP Batch 14, completed training', createdAt: dStr(-25) },
      { id: uid(), name: 'Anand Gaikwad', phone: '9881345678', email: 'anand.g@gmail.com', course: 'Export & Import with Global Management', source: 'Social Media', agent: 'Komal', callbackDate: '', callbackTime: '', callCount: 3, remark1: 'Admitted', remark2: '', remark3: '', payMode: 'UPI', payAmount: '30000', notes: 'Completed full payment for Global Export batch', createdAt: dStr(-9) },
      { id: uid(), name: 'Swapnil Pawar', phone: '9730456789', email: 'swapnil.p@gmail.com', course: 'Spice Processing', source: 'Google Ads', agent: 'Yogesh', callbackDate: dStr(0), callbackTime: '15:00', callCount: 2, remark1: 'Interested', remark2: '', remark3: '', payMode: '', payAmount: '', notes: 'Comparing machinery costs, requesting syllabus PDF', createdAt: dStr(-6) },
      { id: uid(), name: 'Neha Joshi', phone: '9403567890', email: 'neha.joshi@gmail.com', course: 'Bakery Workshop', source: 'Inbound Enquiry', agent: 'Sejal', callbackDate: dStr(3), callbackTime: '11:30', callCount: 1, remark1: 'New', remark2: '', remark3: '', payMode: '', payAmount: '', notes: 'Enquired about 3-day industrial bakery practicals', createdAt: dStr(-2) },
      { id: uid(), name: 'Sachin Kale', phone: '9823678901', email: 'sachin.kale@yahoo.com', course: 'Solar EDP', source: 'Referral', agent: 'Komal', callbackDate: '', callbackTime: '', callCount: 2, remark1: 'Admitted', remark2: '', remark3: '', payMode: 'UPI', payAmount: '25000', notes: 'Enrolled in ongoing Solar batch', createdAt: dStr(-11) },
      { id: uid(), name: 'Abhishek Raut', phone: '9867234567', email: 'abhishek.r@gmail.com', course: 'AI for Sales & Business Growth', source: 'Social Media', agent: '', callbackDate: '', callbackTime: '', callCount: 0, remark1: 'New', remark2: '', remark3: '', payMode: '', payAmount: '', notes: 'Direct website form lead', createdAt: dStr(-1) },
      { id: uid(), name: 'Pallavi Bhalerao', phone: '9890345678', email: 'pallavi.b@gmail.com', course: 'Solar EDP', source: 'Google Ads', agent: '', callbackDate: '', callbackTime: '', callCount: 0, remark1: 'New', remark2: '', remark3: '', payMode: '', payAmount: '', notes: 'Inquired about subsidy schemes', createdAt: dStr(0) }
    ];
    await pool.query(`UPDATE crm_store SET value=$1 WHERE key='leads'`, [JSON.stringify(sampleLeads)]);

    const sampleAdmissions = [
      { id: uid(), name: 'Rahul Shinde', phone: '9423156789', email: 'rahul.s@outlook.com', course: 'Solar EDP', batchId: 'b_sol1', date: dStr(-12), source: 'Google Ads', fee: 25000, paid: 25000, payment: 'UPI', status: 'Active', city: 'Pune', age: '28', notes: 'Full fee cleared', agentName: 'Komal', createdAt: dStr(-12) },
      { id: uid(), name: 'Sachin Kale', phone: '9823678901', email: 'sachin.kale@yahoo.com', course: 'Solar EDP', batchId: 'b_sol1', date: dStr(-11), source: 'Referral', fee: 25000, paid: 15000, payment: 'UPI', status: 'Active', city: 'Nashik', age: '32', notes: 'First installment paid', agentName: 'Komal', createdAt: dStr(-11) },
      { id: uid(), name: 'Anand Gaikwad', phone: '9881345678', email: 'anand.g@gmail.com', course: 'Export & Import with Global Management', batchId: 'b_exp1', date: dStr(-9), source: 'Social Media', fee: 30000, paid: 30000, payment: 'UPI', status: 'Active', city: 'Mumbai', age: '26', notes: 'Regular classes', agentName: 'Komal', createdAt: dStr(-9) },
      { id: uid(), name: 'Pooja Jadhav', phone: '9860234567', email: 'pooja.j@hotmail.com', course: 'EDP', batchId: 'b_edp1', date: dStr(-25), source: 'Webinar', fee: 18000, paid: 18000, payment: 'Net Banking', status: 'Completed', city: 'Nashik', age: '24', notes: 'Completed course', agentName: 'Sejal', createdAt: dStr(-25) },
      { id: uid(), name: 'Deepak Chaudhari', phone: '9763012345', email: 'deepak.c@gmail.com', course: 'Real Estate', batchId: 'b_re1', date: dStr(-4), source: 'Webinar', fee: 22000, paid: 22000, payment: 'Cheque', status: 'On Hold', city: 'Pune', age: '41', notes: 'Starting on 15th', agentName: 'Yogesh', createdAt: dStr(-4) }
    ];
    await pool.query(`UPDATE crm_store SET value=$1 WHERE key='admissions'`, [JSON.stringify(sampleAdmissions)]);
    console.log('✅ Testing data seeded');
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

    const nameMatches = (cand, target) => {
      const c = (cand || '').toLowerCase().trim();
      const t = (target || '').toLowerCase().trim();
      return c === t || c.replace(/[^a-z0-9]/g, '') === t.replace(/[^a-z0-9]/g, '');
    };

    if (role === 'admin' || !role) {
      const admins = await getCollection('admins');
      const match  = admins.find(a => nameMatches(a.name, uname) && (a.password || '').trim() === pass);
      if (match) return res.json({ success: true, user: { username: match.name, name: match.name, role: 'admin' } });
      if (role === 'admin') return res.status(401).json({ success: false, error: 'Invalid admin credentials' });
    }

    if (role === 'agent' || !role) {
      const agents = await getCollection('agents');
      const match  = agents.find(a => nameMatches(a.name, uname) && (a.password || '').trim() === pass && (!a.status || a.status === 'Active'));
      if (match) return res.json({ success: true, user: { username: match.name, name: match.name, role: 'agent', agentRef: match } });
      if (role === 'agent') return res.status(401).json({ success: false, error: 'Invalid agent credentials' });
    }

    res.status(401).json({ success: false, error: 'Invalid credentials' });
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

// ── SERVE FRONTEND ────────────────────────────────────
const path = require('path');
app.use(express.static(__dirname));
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

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
