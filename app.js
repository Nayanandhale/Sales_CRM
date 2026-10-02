// ── DB & STATE ──────────────────────────────────
const DB_KEY = 'udyog_crm_v6';
let db = {leads:[],admissions:[],agents:[],admins:[],courses:[],webinars:[],batches:[],dailyNotes:[],
  settings:{orgName:'Udyogwardhini',adminName:'Admin',adminRole:'Admin',email:'',phone:''}};
let currentUser = null;
let agentSortCol = 'admissions', agentSortDir = -1;
let analyticsPeriod = 'month';
let importRows = [];
let leadPage=1, admPage=1, allocPage=1;
const PER_PAGE = 20;
let allocTab = 'unassigned';
// Lead modal domain filter
let leadModalDomain = '';

// ── LOAD / SAVE ─────────────────────────────────
function loadDB(){try{const d=localStorage.getItem(DB_KEY);if(d){const p=JSON.parse(d);db=Object.assign({leads:[],admissions:[],agents:[],admins:[],courses:[],webinars:[],batches:[],dailyNotes:[],settings:{orgName:'Udyogwardhini',adminName:'Admin',adminRole:'Admin',email:'',phone:''}},p);}}catch(e){console.warn(e);}seedData();}
function saveDB(){localStorage.setItem(DB_KEY,JSON.stringify(db));}
function uid(){return Date.now().toString(36)+Math.random().toString(36).slice(2,7);}
function escHtml(s){if(!s)return'';return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
function fmtDate(d){if(!d)return'—';const[y,m,day]=(d+'').split('-');return`${day||''}/${m||''}/${(y||'').slice(2)}`;}
function fmtCurrency(v){return'₹'+Number(v||0).toLocaleString('en-IN');}
function today(){return new Date().toISOString().slice(0,10);}

// ── COURSE LIST ──────────────────────────────────
const BASE_COURSES = [
  'EDP','Solar EDP','Export & Import with Global Management',
  'FV Processing','FV Dehydration','RTC Premixes Course','Spice Processing',
  'Global Spice Processing','Millet Processing','Frozen Retort','Snacks Processing',
  'Spice Blends Industrial Workshop','Industrial Dehydration Workshop',
  'RTC Premixes Industrial Workshop','Millet RTC Premixes','Real Estate',
  'Buildership Management','Site Engineer','Quantity Surveyor & Billing',
  'Warehouse Engineer','Redevelopment Workshop','GeM & e tendering',
  'AI for Sales & Business Growth','Tourism','Institutional Order Flow Analyst',
  'Packaging, Branding & Marketing Workshop','Milk Processing','Cloud Kitchen',
  'Packaging Business','Share Market Analyst','Bakery Workshop'
];

function getCourseNames(){
  const custom=(db.courses||[]).map(c=>c.name).filter(n=>!BASE_COURSES.includes(n));
  return [...BASE_COURSES,...custom];
}
function getCourseFee(name){const c=(db.courses||[]).find(x=>x.name===name);return c?Number(c.fee||0):0;}

function populateCourseSelects(...ids){
  const opts=getCourseNames().map(n=>`<option value="${escHtml(n)}">${escHtml(n)}</option>`).join('');
  ids.forEach(id=>{const el=document.getElementById(id);if(el)el.innerHTML='<option value="">All Courses</option>'+opts;});
}
function populateCourseSelectReq(...ids){
  const opts=getCourseNames().map(n=>`<option value="${escHtml(n)}">${escHtml(n)}</option>`).join('');
  ids.forEach(id=>{const el=document.getElementById(id);if(el)el.innerHTML='<option value="">Select course</option>'+opts;});
}
function populateAgentSelects(...ids){
  const opts=db.agents.filter(a=>a.status==='Active').map(a=>`<option value="${escHtml(a.name)}">${escHtml(a.name)}</option>`).join('');
  ids.forEach(id=>{const el=document.getElementById(id);if(el)el.innerHTML='<option value="">All Agents</option>'+opts;});
}
function populateAgentSelectsReq(...ids){
  const opts=db.agents.filter(a=>a.status==='Active').map(a=>`<option value="${escHtml(a.name)}">${escHtml(a.name)}</option>`).join('');
  ids.forEach(id=>{const el=document.getElementById(id);if(el)el.innerHTML='<option value="">Unassigned</option>'+opts;});
}
function statusBadge(s){
  const m={New:'badge-new',Interested:'badge-int','Hot Lead':'badge-hot','Not Interested':'badge-not',Admitted:'badge-adm','Cold Lead':'badge-cold',Active:'badge-active',Inactive:'badge-inactive',Completed:'badge-done',Dropped:'badge-not','On Hold':'badge-pending',Upcoming:'badge-blue',Ongoing:'badge-active',Cancelled:'badge-not'};
  return`<span class="badge ${m[s]||'badge-gray'}">${escHtml(s)}</span>`;
}

// ── SEED DATA ────────────────────────────────────
const DEFAULT_ADMINS = [
  { name: 'Gerry', password: 'gerry@26' },
  { name: 'Operations', password: 'ops@26' },
  { name: 'Rohit', password: 'rohit@26' },
  { name: 'Shriram_UDY', password: 'udy@2026' }
];

const DEFAULT_AGENTS = [
  { name: 'Komal',  password: 'komal123',  role: 'Counsellor', targetLeads: 50, targetAdm: 10 },
  { name: 'Sejal',  password: 'sejal123',  role: 'Counsellor', targetLeads: 50, targetAdm: 10 },
  { name: 'Yogesh', password: 'yogesh123', role: 'Counsellor', targetLeads: 50, targetAdm: 10 }
];

function seedData(){
  if(!db.admins || !Array.isArray(db.admins)) db.admins = [];
  // Purge any test admin created earlier - only official admins permitted
  db.admins = db.admins.filter(a => a.name.toLowerCase() !== 'admin');
  DEFAULT_ADMINS.forEach(defA => {
    const existing = db.admins.find(a => a.name.toLowerCase() === defA.name.toLowerCase());
    if(!existing){
      db.admins.push({ id: uid(), ...defA, createdAt: today() });
    } else if(!existing.password) {
      existing.password = defA.password;
    }
  });

  if(!db.agents || !Array.isArray(db.agents)) db.agents = [];
  DEFAULT_AGENTS.forEach(defAg => {
    const existing = db.agents.find(a => a.name.toLowerCase() === defAg.name.toLowerCase());
    if(!existing){
      db.agents.push({ id: uid(), ...defAg, phone: '', email: '', status: 'Active', createdAt: today() });
    } else {
      if(!existing.password) existing.password = defAg.password;
      if(!existing.status) existing.status = 'Active';
    }
  });

  seedSampleTestingData();

  try{localStorage.setItem(DB_KEY,JSON.stringify(db));}catch(e){}
}

function seedSampleTestingData(){
  const t = new Date();
  const dStr = (offsetDays) => {
    const d = new Date(t);
    d.setDate(d.getDate() + offsetDays);
    return d.toISOString().slice(0, 10);
  };

  // Batches
  if(!db.batches || db.batches.length === 0){
    db.batches = [
      { id: 'b_edp1', name: 'EDP - Batch 14', course: 'EDP', mode: 'Offline', startDate: dStr(-28), endDate: dStr(-10), timing: '10:00 AM - 01:00 PM', seats: 35, instructor: 'Dr. Suresh Patil', status: 'Completed', createdAt: dStr(-35) },
      { id: 'b_sol1', name: 'Solar EDP Masterclass', course: 'Solar EDP', mode: 'Hybrid', startDate: dStr(-12), endDate: dStr(6), timing: '02:00 PM - 05:00 PM', seats: 30, instructor: 'Er. Nitin Deshmukh', status: 'Ongoing', createdAt: dStr(-20) },
      { id: 'b_exp1', name: 'Export & Import Global Batch 8', course: 'Export & Import with Global Management', mode: 'Online', startDate: dStr(-7), endDate: dStr(14), timing: '06:30 PM - 08:30 PM', seats: 40, instructor: 'Rajesh Kulkarni', status: 'Ongoing', createdAt: dStr(-18) },
      { id: 'b_spc1', name: 'Spice Processing Workshop', course: 'Spice Processing', mode: 'Offline', startDate: dStr(8), endDate: dStr(22), timing: '10:30 AM - 04:30 PM', seats: 25, instructor: 'Mahesh Shinde', status: 'Upcoming', createdAt: dStr(-5) },
      { id: 'b_re1',  name: 'Real Estate & Buildership', course: 'Real Estate', mode: 'Offline', startDate: dStr(15), endDate: dStr(28), timing: '09:30 AM - 01:30 PM', seats: 30, instructor: 'Adv. Sanjay More', status: 'Upcoming', createdAt: dStr(-3) },
    ];
  }

  // Webinars
  if(!db.webinars || db.webinars.length === 0){
    db.webinars = [
      { id: 'w_sol', title: 'Solar Energy Startup & Government Subsidies 2026', date: dStr(-4), time: '11:00 AM', course: 'Solar EDP', platform: 'Zoom', link: 'https://zoom.us/j/987654321', desc: 'Guidance on project setup, Net Metering & PM Surya Ghar Yojana', createdAt: dStr(-10) },
      { id: 'w_exp', title: 'How to Start Export-Import Business in 30 Days', date: dStr(3), time: '06:00 PM', course: 'Export & Import with Global Management', platform: 'Google Meet', link: 'https://meet.google.com/abc-defg-hij', desc: 'Step-by-step buyer finding, container booking and custom clearance', createdAt: dStr(-2) },
      { id: 'w_spc', title: 'Spice & Food Processing Unit Setup & Licences', date: dStr(6), time: '04:00 PM', course: 'Spice Processing', platform: 'Zoom', link: 'https://zoom.us/j/123456789', desc: 'FSSAI, machinery procurement and blending secret formulations', createdAt: dStr(-1) }
    ];
  }

  // Leads
  if(!db.leads || db.leads.length === 0){
    db.leads = [
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
      { id: uid(), name: 'Ganesh Thombare', phone: '9970789012', email: 'ganesh.t@gmail.com', course: 'EDP', source: 'Website', agent: 'Sejal', callbackDate: dStr(1), callbackTime: '12:00', callCount: 2, remark1: 'Interested', remark2: '', remark3: '', payMode: '', payAmount: '', notes: 'Needs project report guidance for PMEGP loan', createdAt: dStr(-7) },
      { id: uid(), name: 'Sunita Wagh', phone: '9850890123', email: 'sunita.w@gmail.com', course: 'FV Processing', source: 'Social Media', agent: 'Yogesh', callbackDate: dStr(4), callbackTime: '10:00', callCount: 1, remark1: 'New', remark2: '', remark3: '', payMode: '', payAmount: '', notes: 'Fruit drying unit enquiry, wants brochure on WhatsApp', createdAt: dStr(-3) },
      { id: uid(), name: 'Rohan Mehta', phone: '9890901234', email: 'rohan.mehta@gmail.com', course: 'Export & Import with Global Management', source: 'Google Ads', agent: 'Komal', callbackDate: dStr(0), callbackTime: '17:00', callCount: 3, remark1: 'Hot Lead', remark2: '', remark3: '', payMode: '', payAmount: '', notes: 'Will pay token fee by evening', createdAt: dStr(-5) },
      { id: uid(), name: 'Deepak Chaudhari', phone: '9763012345', email: 'deepak.c@gmail.com', course: 'Real Estate', source: 'Webinar', agent: 'Yogesh', callbackDate: '', callbackTime: '', callCount: 4, remark1: 'Admitted', remark2: '', remark3: '', payMode: 'Cheque', payAmount: '22000', notes: 'Admitted for upcoming Real Estate batch', createdAt: dStr(-4) },
      { id: uid(), name: 'Kavita Salunkhe', phone: '9822123456', email: 'kavita.s@gmail.com', course: 'Spice Processing', source: 'Inbound Enquiry', agent: 'Sejal', callbackDate: '', callbackTime: '', callCount: 3, remark1: 'Admitted', remark2: '', remark3: '', payMode: 'UPI', payAmount: '20000', notes: 'Seat reserved for Spice processing workshop', createdAt: dStr(-6) },
      { id: uid(), name: 'Abhishek Raut', phone: '9867234567', email: 'abhishek.r@gmail.com', course: 'AI for Sales & Business Growth', source: 'Social Media', agent: '', callbackDate: '', callbackTime: '', callCount: 0, remark1: 'New', remark2: '', remark3: '', payMode: '', payAmount: '', notes: 'Direct website form lead', createdAt: dStr(-1) },
      { id: uid(), name: 'Pallavi Bhalerao', phone: '9890345678', email: 'pallavi.b@gmail.com', course: 'Solar EDP', source: 'Google Ads', agent: '', callbackDate: '', callbackTime: '', callCount: 0, remark1: 'New', remark2: '', remark3: '', payMode: '', payAmount: '', notes: 'Inquired about subsidy schemes', createdAt: dStr(0) },
      { id: uid(), name: 'Nilesh Sonawane', phone: '9922456789', email: 'nilesh.s@gmail.com', course: 'Export & Import with Global Management', source: 'Webinar', agent: '', callbackDate: '', callbackTime: '', callCount: 0, remark1: 'New', remark2: '', remark3: '', payMode: '', payAmount: '', notes: 'Attended weekend webinar', createdAt: dStr(0) }
    ];
  }

  // Admissions
  if(!db.admissions || db.admissions.length === 0){
    db.admissions = [
      { id: uid(), name: 'Rahul Shinde', phone: '9423156789', email: 'rahul.s@outlook.com', course: 'Solar EDP', batchId: 'b_sol1', date: dStr(-12), source: 'Google Ads', fee: 25000, paid: 25000, payment: 'UPI', status: 'Active', city: 'Pune', age: '28', notes: 'Full fee cleared, certificate in progress', agentName: 'Komal', createdAt: dStr(-12) },
      { id: uid(), name: 'Sachin Kale', phone: '9823678901', email: 'sachin.kale@yahoo.com', course: 'Solar EDP', batchId: 'b_sol1', date: dStr(-11), source: 'Referral', fee: 25000, paid: 15000, payment: 'UPI', status: 'Active', city: 'Nashik', age: '32', notes: 'First installment paid, balance 10,000 due next week', agentName: 'Komal', createdAt: dStr(-11) },
      { id: uid(), name: 'Anand Gaikwad', phone: '9881345678', email: 'anand.g@gmail.com', course: 'Export & Import with Global Management', batchId: 'b_exp1', date: dStr(-9), source: 'Social Media', fee: 30000, paid: 30000, payment: 'UPI', status: 'Active', city: 'Mumbai', age: '26', notes: 'Attending regular evening classes', agentName: 'Komal', createdAt: dStr(-9) },
      { id: uid(), name: 'Pooja Jadhav', phone: '9860234567', email: 'pooja.j@hotmail.com', course: 'EDP', batchId: 'b_edp1', date: dStr(-25), source: 'Webinar', fee: 18000, paid: 18000, payment: 'Net Banking', status: 'Completed', city: 'Nashik', age: '24', notes: 'Completed course successfully, preparing DPR', agentName: 'Sejal', createdAt: dStr(-25) },
      { id: uid(), name: 'Mahesh Borse', phone: '9850123987', email: 'mahesh.b@gmail.com', course: 'EDP', batchId: 'b_edp1', date: dStr(-24), source: 'Inbound Enquiry', fee: 18000, paid: 18000, payment: 'Cash', status: 'Completed', city: 'Aurangabad', age: '35', notes: 'EDP batch completed', agentName: 'Sejal', createdAt: dStr(-24) },
      { id: uid(), name: 'Deepak Chaudhari', phone: '9763012345', email: 'deepak.c@gmail.com', course: 'Real Estate', batchId: 'b_re1', date: dStr(-4), source: 'Webinar', fee: 22000, paid: 22000, payment: 'Cheque', status: 'On Hold', city: 'Pune', age: '41', notes: 'Upcoming batch starting on 15th', agentName: 'Yogesh', createdAt: dStr(-4) },
      { id: uid(), name: 'Kavita Salunkhe', phone: '9822123456', email: 'kavita.s@gmail.com', course: 'Spice Processing', batchId: 'b_spc1', date: dStr(-6), source: 'Inbound Enquiry', fee: 20000, paid: 10000, payment: 'UPI', status: 'On Hold', city: 'Kolhapur', age: '29', notes: 'Token 10,000 paid, balance on day 1 of workshop', agentName: 'Sejal', createdAt: dStr(-6) },
      { id: uid(), name: 'Chetan Mahajan', phone: '9730987654', email: 'chetan.m@gmail.com', course: 'Export & Import with Global Management', batchId: 'b_exp1', date: dStr(-8), source: 'Referral', fee: 30000, paid: 30000, payment: 'Net Banking', status: 'Active', city: 'Nagpur', age: '30', notes: 'Agricultural export focus', agentName: 'Sejal', createdAt: dStr(-8) },
      { id: uid(), name: 'Siddharth Ingle', phone: '9890876543', email: 'sid.ingle@gmail.com', course: 'Solar EDP', batchId: 'b_sol1', date: dStr(-10), source: 'Google Ads', fee: 25000, paid: 25000, payment: 'Card', status: 'Active', city: 'Nashik', age: '27', notes: 'EPC contractor trainee', agentName: 'Yogesh', createdAt: dStr(-10) }
    ];
  }

  // Daily notes
  if(!db.dailyNotes || db.dailyNotes.length === 0){
    db.dailyNotes = [
      { id: uid(), date: dStr(0), agent: 'Komal', text: 'Followed up with 14 leads for Solar batch; 2 confirmed for evening counseling call.', createdAt: dStr(0) },
      { id: uid(), date: dStr(0), agent: 'Sejal', text: 'Conducted Export-Import batch query session. 3 leads requested fee structure.', createdAt: dStr(0) },
      { id: uid(), date: dStr(-1), agent: 'Yogesh', text: 'Outreach to Spice Processing webinar attendees; 4 showed strong intent.', createdAt: dStr(-1) }
    ];
  }
}

// ── AUTO SYNC BATCH → ADMISSION STATUS ──────────
function syncBatchStatuses(){
  const t=today();
  db.batches.forEach(b=>{
    if(!b.startDate)return;
    let newStatus=b.status;
    if(b.startDate>t)newStatus='Upcoming';
    else if(b.endDate&&b.endDate<t)newStatus='Completed';
    else if(b.startDate<=t)newStatus='Ongoing';
    if(newStatus!==b.status){
      b.status=newStatus;
      // Update admission statuses linked to this batch
      db.admissions.filter(a=>a.batchId===b.id).forEach(a=>{
        if(newStatus==='Completed')a.status='Completed';
        else if(newStatus==='Ongoing')a.status='Active';
        else if(newStatus==='Upcoming')a.status='On Hold';
      });
    }
  });
}

// ── AUTH ─────────────────────────────────────────
function doLogin(){
  loadDB();
  const userInput = (document.getElementById('login-user')?.value || '').trim();
  const u = userInput.toLowerCase();
  const p = (document.getElementById('login-pass')?.value || '').trim();
  const r = (document.getElementById('login-role')?.value || 'admin').toLowerCase();

  if(!userInput || !p){
    return toast('Please enter both username and password','error');
  }

  const nameMatches = (candidateName, searchName) => {
    if(!candidateName || !searchName) return false;
    const c = candidateName.toLowerCase().trim();
    const s = searchName.toLowerCase().trim();
    if(c === s) return true;
    if(c.replace(/[^a-z0-9]/g, '') === s.replace(/[^a-z0-9]/g, '')) return true;
    if((c === 'shriram_udy' || c === 'shriram') && (s === 'shriram' || s === 'shriram_udy' || s === 'udy')) return true;
    return false;
  };

  const adminMatch = (db.admins || []).find(a => 
    nameMatches(a.name, u) && ((a.password || '').trim() === p)
  );

  const agentMatch = (db.agents || []).find(a => 
    nameMatches(a.name, u) && ((a.password || '').trim() === p) && (!a.status || a.status.toLowerCase() === 'active')
  );

  // Matching role selected
  if(r === 'admin' && adminMatch){
    currentUser = { username: adminMatch.name, role: 'admin', name: adminMatch.name, agentRef: null };
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('app-shell').style.display = '';
    initApp();
    toast(`Welcome back, ${adminMatch.name}!`, 'success');
    return;
  }

  if(r === 'agent' && agentMatch){
    currentUser = { username: agentMatch.name, role: 'agent', name: agentMatch.name, agentRef: agentMatch };
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('app-shell').style.display = '';
    initApp();
    toast(`Welcome back, ${agentMatch.name}!`, 'success');
    return;
  }

  // Auto-switch role if credentials belong to the other role
  if(adminMatch && r === 'agent'){
    currentUser = { username: adminMatch.name, role: 'admin', name: adminMatch.name, agentRef: null };
    const roleEl = document.getElementById('login-role');
    if(roleEl) roleEl.value = 'admin';
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('app-shell').style.display = '';
    initApp();
    toast(`Logged in as Admin: ${adminMatch.name}`, 'success');
    return;
  }

  if(agentMatch && r === 'admin'){
    currentUser = { username: agentMatch.name, role: 'agent', name: agentMatch.name, agentRef: agentMatch };
    const roleEl = document.getElementById('login-role');
    if(roleEl) roleEl.value = 'agent';
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('app-shell').style.display = '';
    initApp();
    toast(`Logged in as Agent: ${agentMatch.name}`, 'success');
    return;
  }

  toast('Invalid credentials. Check username & password.', 'error');
}

function toggleLoginPassword(){
  const p = document.getElementById('login-pass');
  const ic = document.getElementById('pw-toggle-icon');
  if(!p) return;
  if(p.type === 'password'){
    p.type = 'text';
    if(ic){ ic.classList.remove('fa-eye'); ic.classList.add('fa-eye-slash'); }
  } else {
    p.type = 'password';
    if(ic){ ic.classList.remove('fa-eye-slash'); ic.classList.add('fa-eye'); }
  }
}

function doLogout(){
  currentUser = null;
  document.getElementById('login-screen').style.display = '';
  document.getElementById('app-shell').style.display = 'none';
  const passEl = document.getElementById('login-pass');
  if(passEl) passEl.value = '';
}

// ── SIDEBAR ─────────────────────────────────────
const NAV_ADMIN=[
  {label:'MAIN',items:[{icon:'fa-gauge',label:'Dashboard',page:'dashboard'},{icon:'fa-users',label:'Leads',page:'leads'},{icon:'fa-graduation-cap',label:'Admissions',page:'admissions'}]},
  {label:'MANAGEMENT',items:[{icon:'fa-arrows-split-up-and-left',label:'Allocation',page:'allocation'},{icon:'fa-user-tie',label:'Agent Tracker',page:'agents'}]},
  {label:'SCHEDULE',items:[{icon:'fa-video',label:'Webinars',page:'webinars'},{icon:'fa-layer-group',label:'Batch Schedule',page:'batches'}]},
  {label:'INSIGHTS',items:[{icon:'fa-chart-line',label:'Analytics',page:'analytics'},{icon:'fa-clock',label:'Daily Tracker',page:'daily'}]},
  {label:'SYSTEM',items:[{icon:'fa-gear',label:'Settings',page:'settings'}]}
];
const NAV_AGENT=[
  {label:'MAIN',items:[{icon:'fa-gauge',label:'Dashboard',page:'dashboard'},{icon:'fa-users',label:'My Leads',page:'leads'}]},
  {label:'SCHEDULE',items:[{icon:'fa-calendar-days',label:'Calendar',page:'agent-calendar'}]},
  {label:'INSIGHTS',items:[{icon:'fa-clock',label:'Daily Tracker',page:'daily'}]}
];
function buildNav(){
  const nav=document.getElementById('sidebar-nav');
  const items=currentUser.role==='admin'?NAV_ADMIN:NAV_AGENT;
  nav.innerHTML=items.map(sec=>`
    <div class="nav-section-label">${sec.label}</div>
    ${sec.items.map(i=>`
      <div class="nav-item" onclick="showPage('${i.page}')" id="nav-${i.page}">
        <i class="fa-solid ${i.icon}"></i>${escHtml(i.label)}
      </div>`).join('')}`).join('');
}
function toggleSidebar(){document.getElementById('sidebar').classList.toggle('open');document.getElementById('sidebar-overlay').style.display=document.getElementById('sidebar').classList.contains('open')?'block':'none';}
function closeSidebar(){document.getElementById('sidebar').classList.remove('open');document.getElementById('sidebar-overlay').style.display='none';}

// ── PAGE ROUTING ─────────────────────────────────
const PAGE_TITLES={dashboard:'Dashboard',leads:'Leads',admissions:'Admissions',allocation:'Lead Allocation',agents:'Agent Tracker',webinars:'Webinars',batches:'Batch Schedule',analytics:'Analytics',daily:'Daily Tracker',settings:'Settings','agent-calendar':'Calendar'};
const PAGE_RENDERERS={dashboard:renderDashboard,leads:renderLeads,admissions:renderAdmissions,allocation:renderAllocation,agents:renderAgents,webinars:renderWebinars,batches:renderBatches,analytics:renderAnalytics,daily:renderDaily,settings:renderSettings,'agent-calendar':renderAgentCalendar};
function showPage(p){
  document.querySelectorAll('.page').forEach(el=>el.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(el=>el.classList.remove('active'));
  const pg=document.getElementById('page-'+p);
  const nv=document.getElementById('nav-'+p);
  if(pg)pg.classList.add('active');
  if(nv)nv.classList.add('active');
  document.getElementById('page-title').textContent=PAGE_TITLES[p]||p;
  if(PAGE_RENDERERS[p])PAGE_RENDERERS[p]();
  closeSidebar();
}

// ── INIT ─────────────────────────────────────────
function initApp(){
  loadDB(); seedData(); syncBatchStatuses();
  // Patch admissions missing agentName
  db.admissions.forEach(a=>{
    if(!a.agentName){const lead=db.leads.find(l=>l.phone===a.phone&&l.agent);if(lead)a.agentName=lead.agent;}
  });
  saveDB();
  const s=db.settings;
  // Safe element setters (some elements may not exist after logo redesign)
  const setEl=(id,val)=>{const el=document.getElementById(id);if(el)el.textContent=val;};
  const displayName=currentUser.role==='agent'?currentUser.name:(s.adminName||currentUser.name||'Admin');
  const displayRole=currentUser.role==='agent'?(currentUser.agentRef?.role||'Agent'):(s.adminRole||'Super Admin');
  setEl('sb-org',s.orgName||'Udyogwardhini');
  setEl('sb-name',displayName);
  setEl('sb-role',displayRole);
  const avEl=document.getElementById('sb-avatar');if(avEl)avEl.textContent=displayName.slice(0,2).toUpperCase();
  if(s.domain)document.title=s.domain+' CRM';
  buildNav();
  const n=new Date();
  document.getElementById('topbar-date').textContent=n.toLocaleDateString('en-IN',{weekday:'short',day:'numeric',month:'short'});
  document.getElementById('daily-date').value=today();
  const anMonthEl=document.getElementById('an-month-sel');if(anMonthEl)anMonthEl.value=today().slice(0,7);
  showPage('dashboard');
  if(currentUser.role==='admin')resetDashDates();
  else resetAgentDashDates();
}

// ── DASHBOARD ────────────────────────────────────
function resetDashDates(){
  const t=new Date();const y=t.getFullYear(),m=t.getMonth();
  document.getElementById('dash-from').value=new Date(y,m,1).toISOString().slice(0,10);
  document.getElementById('dash-to').value=today();
  renderDashboard();
}
function resetAgentDashDates(){
  // Agents always see last 3 months automatically
  const t=new Date();
  const from=new Date(t);from.setMonth(from.getMonth()-3);
  document.getElementById('dash-from').value=from.toISOString().slice(0,10);
  document.getElementById('dash-to').value=today();
  renderDashboard();
}
function renderDashboard(){
  const from=document.getElementById('dash-from').value;
  const to=document.getElementById('dash-to').value;
  const courseFilter=v('dash-course-filter');
  const agSearch=(document.getElementById('dash-agent-search')||{value:''}).value.toLowerCase();
  let leads=db.leads,adms=db.admissions;
  if(currentUser.role==='agent'){leads=leads.filter(l=>l.agent===currentUser.name);adms=adms.filter(a=>a.agentName===currentUser.name);}
  if(from)leads=leads.filter(l=>l.createdAt>=from);
  if(to)leads=leads.filter(l=>l.createdAt<=to);
  if(from)adms=adms.filter(a=>a.date>=from);
  if(to)adms=adms.filter(a=>a.date<=to);
  if(courseFilter){leads=leads.filter(l=>l.course===courseFilter);adms=adms.filter(a=>a.course===courseFilter);}
  const pipeline=leads.filter(l=>getLeadStatus(l)==='Interested');
  const revenue=adms.reduce((s,a)=>s+Number(a.paid||0),0);
  // Populate course dropdown
  populateCourseSelects('dash-course-filter');
  document.getElementById('dash-course-filter').value=courseFilter;
  // KPI
  const courses=getCourseNames();
  const kpiDefs=[
    {label:'Total Leads',val:leads.length,icon:'fa-users',color:'#EFF6FF',ic:'#2563EB',key:'leads'},
    {label:'Admissions Taken',val:adms.length,icon:'fa-graduation-cap',color:'#F0FDF4',ic:'#16A34A',key:'adm'},
    {label:'Pipeline Candidates',val:pipeline.length,icon:'fa-fire',color:'#FFF7ED',ic:'#EA580C',key:'int'},
    {label:'Revenue Generated',val:revenue,icon:'fa-indian-rupee-sign',color:'#FFF4EC',ic:'#FF6B00',key:'rev',currency:true},
  ];
  const topN=4;
  document.getElementById('dash-kpi-cards').innerHTML=kpiDefs.map(k=>{
    const byC=courses.map(c=>({name:c,val:k.key==='leads'?leads.filter(l=>l.course===c).length:k.key==='adm'?adms.filter(a=>a.course===c).length:k.key==='int'?pipeline.filter(l=>l.course===c).length:adms.filter(a=>a.course===c).reduce((s,a)=>s+Number(a.paid||0),0)})).sort((a,b)=>b.val-a.val).filter(c=>c.val>0);
    const max=byC[0]?.val||1;
    return`<div class="col-6 col-lg-3">
      <div class="stat-card">
        <div class="stat-top">
          <div>
            <div class="stat-value">${k.currency?fmtCurrency(k.val):k.val.toLocaleString()}</div>
            <div class="stat-label">${k.label}</div>
          </div>
          <div class="stat-icon" style="background:${k.color};color:${k.ic}"><i class="fa-solid ${k.icon}"></i></div>
        </div>
        <div class="stat-divider"></div>
        <div class="stat-courses">
          ${byC.slice(0,topN).map(c=>`<div class="stat-course-row">
            <span class="stat-course-name" title="${escHtml(c.name)}">${escHtml(c.name)}</span>
            <div class="stat-course-bar"><div class="stat-course-fill" style="width:${Math.round(c.val/max*100)}%"></div></div>
            <span class="stat-course-val">${k.currency?'₹'+Number(c.val).toLocaleString('en-IN',{notation:'compact',maximumFractionDigits:1}):c.val}</span>
          </div>`).join('')}
          ${byC.length>topN?`<span class="stat-show-more" onclick="showPage('analytics')">+${byC.length-topN} more →</span>`:''}
          ${!byC.length?`<span style="font-size:11.5px;color:var(--text-secondary)">No data in range</span>`:''}
        </div>
      </div></div>`;
  }).join('');
  // Course Tracker - only show courses that have activity in selected range
  const activeCourses=courseFilter?[courseFilter]:courses.filter(c=>leads.filter(l=>l.course===c).length>0||adms.filter(a=>a.course===c).length>0);
  document.getElementById('dash-course-tracker').innerHTML=activeCourses.length?activeCourses.map(c=>{
    const cl=leads.filter(l=>l.course===c).length;
    const ca=adms.filter(a=>a.course===c).length;
    const ci=leads.filter(l=>l.course===c&&getLeadStatus(l)==='Interested').length;
    const cr=adms.filter(a=>a.course===c).reduce((s,a)=>s+Number(a.paid||0),0);
    const conv=cl?Math.round(ca/cl*100):0;
    const domain='';
    return`<div class="col-6 col-md-4 col-xl-3">
      <div class="course-kpi-card">
        <div class="ckc-name">${escHtml(c)}</div>
        <div class="ckc-cat">${escHtml(domain)}</div>
        <div class="ckc-grid">
          <div class="ckc-stat"><div class="ckc-val" style="color:#2563EB">${cl}</div><div class="ckc-lbl">Leads</div></div>
          <div class="ckc-stat"><div class="ckc-val" style="color:#16A34A">${ca}</div><div class="ckc-lbl">Admitted</div></div>
          <div class="ckc-stat"><div class="ckc-val" style="color:#EA580C">${ci}</div><div class="ckc-lbl">Pipeline</div></div>
          <div class="ckc-stat"><div class="ckc-val" style="color:#FF6B00;font-size:13px">₹${Number(cr).toLocaleString('en-IN',{notation:'compact',maximumFractionDigits:1})}</div><div class="ckc-lbl">Revenue</div></div>
        </div>
        <div class="ckc-footer"><span style="color:var(--text-secondary)">Conversion</span><span class="ckc-conv-val">${conv}%</span></div>
      </div></div>`;
  }).join(''):`<div class="col-12"><div class="empty-state"><i class="fa-solid fa-book-open"></i><p>No course activity in selected range</p></div></div>`;
  renderAgentPerfTable(leads,adms,agSearch);
}
function renderAgentPerfTable(leads,adms,search){
  const isAgent=currentUser.role==='agent';
  const agents=isAgent?db.agents.filter(a=>a.name===currentUser.name):db.agents.filter(a=>a.status==='Active');
  let rows=agents.map(a=>{
    const al=leads.filter(l=>l.agent===a.name).length;
    const aa=adms.filter(x=>x.agentName===a.name).length;
    const ai=leads.filter(l=>l.agent===a.name&&getLeadStatus(l)==='Interested').length;
    const ar=adms.filter(x=>x.agentName===a.name).reduce((s,x)=>s+Number(x.paid||0),0);
    const conv=al?Math.round(aa/al*100):0;
    return{name:a.name,leads:al,admissions:aa,interested:ai,revenue:ar,conv};
  }).filter(r=>!search||r.name.toLowerCase().includes(search));
  rows.sort((a,b)=>(a[agentSortCol]>b[agentSortCol]?1:-1)*agentSortDir*-1);
  const ths=document.querySelectorAll('#dash-agent-table thead th');
  ths.forEach(th=>{th.classList.remove('sort-asc','sort-desc');});
  const colIdx={name:0,admissions:1,interested:2,revenue:3,leads:4,conv:5};
  const idx=colIdx[agentSortCol];
  if(ths[idx])ths[idx].classList.add(agentSortDir===1?'sort-desc':'sort-asc');
  // For agent role, update the panel title to say "My Performance (Last 3 Months)"
  const perfTitle=document.getElementById('dash-agent-perf-title');
  if(perfTitle)perfTitle.textContent=isAgent?`My Performance — Last 3 Months`:'Agent Performance';
  // Hide search + export for agent
  const perfSearch=document.getElementById('dash-agent-search-wrap');
  if(perfSearch)perfSearch.style.display=isAgent?'none':'';
  document.getElementById('dash-agent-tbody').innerHTML=rows.length?rows.map(r=>`
    <tr>
      <td><div class="agent-chip"><div class="agent-chip-av">${r.name.slice(0,2).toUpperCase()}</div>${escHtml(r.name)}</div></td>
      <td><strong style="color:var(--green)">${r.admissions}</strong></td>
      <td>${r.interested}</td>
      <td>${fmtCurrency(r.revenue)}</td>
      <td>${r.leads}</td>
      <td><span class="badge ${r.conv>=50?'badge-int':r.conv>=25?'badge-pending':'badge-gray'}">${r.conv}%</span></td>
    </tr>`).join(''):`<tr><td colspan="6" style="text-align:center;padding:24px;color:var(--text-secondary)">No data</td></tr>`;
}
function sortAgentTable(col){if(agentSortCol===col)agentSortDir*=-1;else{agentSortCol=col;agentSortDir=-1;}renderDashboard();}
function exportAgentPerf(){
  const rows=Array.from(document.querySelectorAll('#dash-agent-tbody tr')).map(tr=>Array.from(tr.querySelectorAll('td')).map(td=>td.innerText.trim()).join(','));
  dlCSV('agent-performance.csv','Agent,Admissions,Interested,Revenue,Total Leads,Conversion\n'+rows.join('\n'));
}

// ── LEADS ────────────────────────────────────────
// onLeadDomainChange removed - domain system removed
function getLeadStatus(l){
  // Derive effective status from latest non-empty remark; fallback to 'New'
  const remarks=[l.remark3,l.remark2,l.remark1].filter(Boolean);
  for(const r of remarks){
    if(r==='Admitted')return'Admitted';
    if(r==='Interested')return'Interested';
    if(r==='Not Interested')return'Not Interested';
  }
  return 'New';
}
function renderLeads(){
  const isAgent=currentUser.role==='agent';
  // Save filter values BEFORE repopulating dropdowns (prevents overwrite bug)
  const savedCourse=v('lead-course'), savedAgent=v('lead-agent');
  populateCourseSelects('lead-course');
  document.getElementById('lead-course').value=savedCourse;
  if(!isAgent){
    populateAgentSelects('lead-agent','lead-bulk-agent');
    document.getElementById('lead-agent').value=savedAgent;
  }
  const agentFilterEl=document.getElementById('lead-agent-wrap');
  if(agentFilterEl)agentFilterEl.style.display=isAgent?'none':'';
  // For agent: restrict source dropdown to agent-relevant options only
  const srcEl=document.getElementById('lead-source');
  if(srcEl&&isAgent&&srcEl.options.length>3){
    srcEl.innerHTML='<option value="">All Sources</option><option value="Webinar">Webinar</option><option value="Inbound Enquiry">Inbound Enquiry</option><option value="Seminar">Seminar</option>';
  }
  let leads=db.leads;
  if(isAgent)leads=leads.filter(l=>l.agent===currentUser.name);
  const s=v('lead-search').toLowerCase(),co=v('lead-course'),ag=isAgent?'':v('lead-agent'),src=v('lead-source'),fr=v('lead-from'),to=v('lead-to'),sf=v('lead-status-filter');
  if(s)leads=leads.filter(l=>l.name.toLowerCase().includes(s)||l.phone.includes(s));
  if(co)leads=leads.filter(l=>l.course===co);
  if(!isAgent&&ag)leads=leads.filter(l=>l.agent===ag);
  if(src)leads=leads.filter(l=>l.source===src);
  if(fr)leads=leads.filter(l=>l.createdAt>=fr);
  if(to)leads=leads.filter(l=>l.createdAt<=to);
  if(sf)leads=leads.filter(l=>getLeadStatus(l)===sf);
  leads.sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
  document.getElementById('leads-count-label').textContent=`${leads.length} lead${leads.length!==1?'s':''}`;
  const total=leads.length,pages=Math.ceil(total/PER_PAGE)||1;
  leadPage=Math.min(leadPage,pages);
  const slice=leads.slice((leadPage-1)*PER_PAGE,leadPage*PER_PAGE);
  // Render correct thead per role
  const thead=document.getElementById('leads-thead');
  if(thead){
    if(isAgent){
      // Agent: no checkbox, no Agent col — 7 cols: # | Name | Course | Source | Callback | Calls | Status | Actions
      thead.innerHTML='<tr><th>#</th><th>Name &amp; Info</th><th>Course</th><th>Source</th><th>Callback</th><th style="text-align:center">Calls</th><th>Status</th><th>Actions</th></tr>';
    }else{
      // Admin: checkbox + Agent col — 10 cols
      thead.innerHTML='<tr><th><input type="checkbox" id="lead-check-all" onchange="toggleAllLeads(this)"/></th><th>#</th><th>Name &amp; Info</th><th>Course</th><th>Source</th><th>Agent</th><th>Callback</th><th style="text-align:center">Calls</th><th>Status</th><th>Actions</th></tr>';
    }
  }
  const colSpan=isAgent?8:10;
  const bar=document.getElementById('lead-bulk-bar');
  if(bar&&isAgent)bar.style.setProperty('display','none','important');
  document.getElementById('leads-tbody').innerHTML=slice.length?slice.map((l,i)=>{
    const callCount=Number(l.callCount||0);
    const callCell=callCount>0
      ?`<span style="display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;border-radius:50%;background:var(--orange);color:white;font-size:11px;font-weight:800">${callCount}</span>`
      :`<span style="color:var(--text-secondary);font-size:12px">—</span>`;
    const noteIndicator=l.notes?`<span title="${escHtml(l.notes)}" style="cursor:pointer;color:var(--yellow);font-size:13px;margin-left:4px" onclick="showLeadNote('${l.id}')"><i class="fa-solid fa-note-sticky"></i></span>`:'';
    const effStatus=getLeadStatus(l);
    const isAdmitted=effStatus==='Admitted';
    const admittedBadge=isAdmitted?`<span class="badge badge-adm" style="font-size:9.5px;margin-left:4px">Admitted</span>`:'';
    return`<tr>
      ${!isAgent?`<td><input type="checkbox" class="lead-chk" value="${l.id}" onchange="updateLeadBulkBar()"/></td>`:''}
      <td style="color:var(--text-secondary);font-size:11.5px">${(leadPage-1)*PER_PAGE+i+1}</td>
      <td style="min-width:140px">
        <div style="font-weight:600;display:flex;align-items:center;gap:3px;flex-wrap:wrap">${escHtml(l.name)}${admittedBadge}${noteIndicator}</div>
        <div style="font-size:10.5px;color:var(--text-secondary)">${escHtml(l.phone)}</div>
        ${isAdmitted&&l.payMode?`<div style="font-size:10px;color:var(--green)"><i class="fa-solid fa-indian-rupee-sign fa-xs"></i> ${l.payAmount?fmtCurrency(l.payAmount):''} ${escHtml(l.payMode)}</div>`:''}
      </td>
      <td style="font-size:12px;max-width:120px;white-space:normal">${escHtml(l.course||'—')}</td>
      <td><span class="badge badge-gray" style="font-size:10px">${escHtml(l.source||'—')}</span></td>
      ${!isAgent?`<td style="font-size:12px">${l.agent?escHtml(l.agent):'<span style="color:var(--text-secondary)">—</span>'}</td>`:''}
      <td style="font-size:11px;white-space:nowrap">${l.callbackDate?`${fmtDate(l.callbackDate)}<br><span style="color:var(--text-secondary)">${l.callbackTime||''}</span>`:''}</td>
      <td style="text-align:center">${callCell}</td>
      <td>${statusBadge(effStatus)}</td>
      <td style="white-space:nowrap">
        <button class="tbl-action" onclick="openLeadModal('${l.id}')" title="Edit"><i class="fa-solid fa-pen"></i></button>
        ${isAdmitted?`<button class="tbl-action" onclick="convertToAdmission('${l.id}')" title="Convert"><i class="fa-solid fa-graduation-cap"></i></button>`:''}
        ${!isAgent?`<button class="tbl-action red" onclick="deleteLead('${l.id}')" title="Delete"><i class="fa-solid fa-trash"></i></button>`:''}
      </td>
    </tr>`;}).join(''):`<tr><td colspan="${colSpan}"><div class="empty-state"><i class="fa-solid fa-users"></i><p>No leads found</p></div></td></tr>`;
  renderPagination('leads-pagination',leadPage,pages,p=>{leadPage=p;renderLeads();},total);
}
function showLeadNote(id){
  const l=db.leads.find(x=>x.id===id);if(!l||!l.notes)return;
  toast(l.notes,'info');
}
function clearLeadFilters(){['lead-search','lead-course','lead-agent','lead-source','lead-from','lead-to','lead-status-filter'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});leadPage=1;renderLeads();}
function toggleAllLeads(cb){document.querySelectorAll('.lead-chk').forEach(c=>c.checked=cb.checked);updateLeadBulkBar();}
function updateLeadBulkBar(){
  if(currentUser.role==='agent')return;
  const sel=document.querySelectorAll('.lead-chk:checked').length;
  const bar=document.getElementById('lead-bulk-bar');
  bar.style.display=sel>0?'flex':'none';
  document.getElementById('lead-sel-count').textContent=`${sel} selected`;
}
function bulkAssignLeads(){
  const agent=v('lead-bulk-agent');if(!agent)return toast('Select an agent','error');
  const ids=Array.from(document.querySelectorAll('.lead-chk:checked')).map(c=>c.value);
  ids.forEach(id=>{const l=db.leads.find(x=>x.id===id);if(l){l.agent=agent;l.assignedOn=today();}});
  saveDB();renderLeads();toast(`${ids.length} lead(s) assigned to ${agent}`,'success');
}
function bulkDeleteLeads(){
  const ids=Array.from(document.querySelectorAll('.lead-chk:checked')).map(c=>c.value);
  if(!confirm(`Delete ${ids.length} leads?`))return;
  db.leads=db.leads.filter(l=>!ids.includes(l.id));
  saveDB();renderLeads();toast(`${ids.length} leads deleted`,'success');
}
// Lead Modal domain cascade removed - domain system removed
function openLeadModal(id){
  const isAgent=currentUser.role==='agent';
  populateCourseSelectReq('l-course');
  if(!isAgent)populateAgentSelectsReq('l-agent');
  // Hide agent assign for agent role
  const agentRow=document.getElementById('lead-modal-agent-row');
  if(agentRow)agentRow.style.display=isAgent?'none':'';
  // Source options: agent gets Webinar+Inbound Enquiry only; admin gets all
  const srcEl=document.getElementById('l-source');
  if(srcEl){
    if(isAgent){srcEl.innerHTML='<option value="">Select source</option><option>Webinar</option><option>Inbound Enquiry</option><option value="Seminar">Seminar</option>';}
    else{srcEl.innerHTML='<option value="">Select source</option><option>Webinar</option><option>Inbound Enquiry</option><option>Operations</option><option>Referral</option><option>Seminar</option><option>Affiliate</option><option>Other</option>';}
  }
  const webOpts=db.webinars.map(w=>`<option value="${w.id}">${escHtml(w.title)} (${fmtDate(w.date)})</option>`).join('');
  document.getElementById('l-webinar').innerHTML='<option value="">None</option>'+webOpts;
  const m=bootstrap.Modal.getOrCreateInstance(document.getElementById('leadModal'));
  if(id){
    const l=db.leads.find(x=>x.id===id);if(!l)return;
    document.getElementById('lead-modal-title').textContent='Edit Lead';
    setVals({['lead-id']:l.id,['l-name']:l.name,['l-phone']:l.phone,['l-email']:l.email||'',['l-course']:l.course||'',['l-source']:l.source||'',['l-agent']:l.agent||'',['l-webinar']:l.webinarId||'',['l-callback-date']:l.callbackDate||'',['l-callback-time']:l.callbackTime||'',['l-call-count']:l.callCount||0,['l-r1']:l.remark1||'',['l-r2']:l.remark2||'',['l-r3']:l.remark3||'',['l-pay-mode']:l.payMode||'',['l-pay-amount']:l.payAmount||'',['l-notes']:l.notes||''});
    checkAdmittedRemark();
  }else{
    document.getElementById('lead-modal-title').textContent='Add Lead';
    setVals({['lead-id']:'',['l-name']:'',['l-phone']:'',['l-email']:'',['l-source']:'',['l-agent']:isAgent?currentUser.name:'',['l-webinar']:'',['l-callback-date']:'',['l-callback-time']:'',['l-call-count']:0,['l-r1']:'',['l-r2']:'',['l-r3']:'',['l-pay-mode']:'',['l-pay-amount']:'',['l-notes']:'',['l-course']:''});
    document.getElementById('lead-admitted-fields').style.display='none';
  }
  m.show();
}
function checkAdmittedRemark(){
  const r1=v('l-r1'),r2=v('l-r2'),r3=v('l-r3');
  const anyAdmitted=r1==='Admitted'||r2==='Admitted'||r3==='Admitted';
  document.getElementById('lead-admitted-fields').style.display=anyAdmitted?'':'none';
}
function saveLead(){
  const name=v('l-name').trim(),phone=v('l-phone').trim();
  if(!name||!phone)return toast('Name and phone are required','error');
  const id=v('lead-id');
  const callbackDate=v('l-callback-date'),callbackTime=v('l-callback-time');
  const r1=v('l-r1'),r2=v('l-r2'),r3=v('l-r3');
  const anyAdmitted=r1==='Admitted'||r2==='Admitted'||r3==='Admitted';
  const callCount=Number(v('l-call-count')||0);
  const isAgent=currentUser.role==='agent';const obj={name,phone,email:v('l-email'),course:v('l-course'),source:v('l-source'),agent:isAgent?currentUser.name:v('l-agent'),webinarId:v('l-webinar'),callbackDate,callbackTime,callCount,remark1:r1,remark2:r2,remark3:r3,payMode:anyAdmitted?v('l-pay-mode'):'',payAmount:anyAdmitted?v('l-pay-amount'):'',notes:v('l-notes')};
  if(id){const l=db.leads.find(x=>x.id===id);if(l)Object.assign(l,obj);}
  else{db.leads.push({id:uid(),...obj,createdAt:today()});}
  saveDB();bootstrap.Modal.getOrCreateInstance(document.getElementById('leadModal')).hide();
  renderLeads();toast(id?'Lead updated':'Lead added','success');
}
function deleteLead(id){if(!confirm('Delete this lead?'))return;db.leads=db.leads.filter(l=>l.id!==id);saveDB();renderLeads();toast('Lead deleted','success');}
function exportLeads(){
  const rows=db.leads.map(l=>[l.name,l.phone,l.email||'',l.course||'',l.source||'',l.agent||'',l.callbackDate||'',l.callCount||0,getLeadStatus(l),l.createdAt].map(x=>`"${x}"`).join(','));
  dlCSV('leads.csv','Name,Phone,Email,Course,Source,Agent,Callback Date,Calls,Status,Created\n'+rows.join('\n'));
}
function convertToAdmission(id){const l=db.leads.find(x=>x.id===id);if(!l)return;openAdmModal(null,l);toast('Pre-filled from lead','info');}

// ── ADMISSIONS ───────────────────────────────────
function renderAdmissions(){
  const savedAdmCourse=v('adm-course');
  const savedAdmBatch=v('adm-batch');
  populateCourseSelects('adm-course');
  document.getElementById('adm-course').value=savedAdmCourse;
  const batchOpts=db.batches.map(b=>`<option value="${b.id}">${escHtml(b.name)}</option>`).join('');
  const admBatch=document.getElementById('adm-batch');
  if(admBatch){admBatch.innerHTML='<option value="">All Batches</option>'+batchOpts;admBatch.value=savedAdmBatch;}
  let adms=db.admissions;
  if(currentUser.role==='agent')adms=adms.filter(a=>a.agentName===currentUser.name);
  const s=v('adm-search').toLowerCase(),co=v('adm-course'),bi=v('adm-batch'),st=v('adm-status'),mo=v('adm-month'),src=v('adm-source');
  if(s)adms=adms.filter(a=>a.name.toLowerCase().includes(s)||a.phone.includes(s));
  if(co)adms=adms.filter(a=>a.course===co);
  if(bi)adms=adms.filter(a=>a.batchId===bi);
  if(st)adms=adms.filter(a=>a.status===st);
  if(mo)adms=adms.filter(a=>a.date&&a.date.startsWith(mo));
  if(src)adms=adms.filter(a=>a.source===src);
  adms.sort((a,b)=>b.date?.localeCompare(a.date||'')||0);
  const totalFee=adms.reduce((s,a)=>s+Number(a.fee||0),0);
  const totalPaid=adms.reduce((s,a)=>s+Number(a.paid||0),0);
  document.getElementById('adm-stat-row').innerHTML=[
    {label:'Total Admissions',val:adms.length,ic:'#2563EB'},
    {label:'Total Fee',val:fmtCurrency(totalFee),ic:'#16A34A'},
    {label:'Collected',val:fmtCurrency(totalPaid),ic:'#FF6B00'},
    {label:'Pending Balance',val:fmtCurrency(totalFee-totalPaid),ic:totalFee-totalPaid>0?'#DC2626':'#16A34A'},
  ].map(k=>`<div class="col-6 col-md-3"><div class="card-panel" style="text-align:center;padding:14px">
    <div style="font-size:11px;color:var(--text-secondary);margin-bottom:3px">${k.label}</div>
    <div style="font-family:'Sora',sans-serif;font-size:20px;font-weight:800;color:${k.ic}">${k.val}</div>
  </div></div>`).join('');
  const total=adms.length,pages=Math.ceil(total/PER_PAGE)||1;
  admPage=Math.min(admPage,pages);
  const slice=adms.slice((admPage-1)*PER_PAGE,admPage*PER_PAGE);
  document.getElementById('adm-tbody').innerHTML=slice.length?slice.map((a,i)=>{
    const bal=Number(a.fee||0)-Number(a.paid||0);
    const batch=db.batches.find(b=>b.id===a.batchId);
    return`<tr>
      <td style="color:var(--text-secondary);font-size:11.5px">${(admPage-1)*PER_PAGE+i+1}</td>
      <td style="min-width:130px"><div style="font-weight:600">${escHtml(a.name)}</div><div style="font-size:10.5px;color:var(--text-secondary)">${fmtDate(a.date)}</div></td>
      <td style="font-size:12px">${escHtml(a.phone)}</td>
      <td style="font-size:12px;max-width:110px;white-space:normal">${escHtml(a.course||'—')}</td>
      <td style="font-size:12px">${escHtml(batch?.name||'—')}</td>
      <td><span class="badge badge-gray" style="font-size:10px">${escHtml(a.source||'—')}</span></td>
      <td style="font-size:12px">${fmtCurrency(a.fee)}</td>
      <td style="color:var(--green);font-weight:600;font-size:12px">${fmtCurrency(a.paid)}</td>
      <td style="color:${bal>0?'var(--red)':'var(--green)'};font-weight:600;font-size:12px">${fmtCurrency(bal)}</td>
      <td>${statusBadge(a.status||'Active')}</td>
      <td style="white-space:nowrap">
        <button class="tbl-action" onclick="openAdmModal('${a.id}')" title="Edit"><i class="fa-solid fa-pen"></i></button>
        <button class="tbl-action red" onclick="deleteAdm('${a.id}')" title="Delete"><i class="fa-solid fa-trash"></i></button>
      </td>
    </tr>`;}).join(''):`<tr><td colspan="11"><div class="empty-state"><i class="fa-solid fa-graduation-cap"></i><p>No admissions found</p></div></td></tr>`;
  renderPagination('adm-pagination',admPage,pages,p=>{admPage=p;renderAdmissions();},total);
}
function clearAdmFilters(){['adm-search','adm-course','adm-batch','adm-status','adm-month','adm-source'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});admPage=1;renderAdmissions();}
function openAdmModal(id,prefill){
  populateCourseSelectReq('a-course');
  const bOpts=db.batches.map(b=>`<option value="${b.id}">${escHtml(b.name)}</option>`).join('');
  document.getElementById('a-batch').innerHTML='<option value="">Select batch</option>'+bOpts;
  const m=bootstrap.Modal.getOrCreateInstance(document.getElementById('admModal'));
  if(id){
    const a=db.admissions.find(x=>x.id===id);if(!a)return;
    document.getElementById('adm-modal-title').textContent='Edit Admission';
    setVals({['adm-id']:a.id,['a-name']:a.name,['a-phone']:a.phone,['a-email']:a.email||'',['a-date']:a.date||'',['a-course']:a.course||'',['a-batch']:a.batchId||'',['a-source']:a.source||'',['a-fee']:a.fee||'',['a-paid']:a.paid||'',['a-balance']:Number(a.fee||0)-Number(a.paid||0),['a-payment']:a.payment||'Cash',['a-status']:a.status||'Active',['a-city']:a.city||'',['a-age']:a.age||'',['a-notes']:a.notes||''});
  }else if(prefill){
    document.getElementById('adm-modal-title').textContent='Add Admission';
    setVals({['adm-id']:'',['a-name']:prefill.name||'',['a-phone']:prefill.phone||'',['a-email']:prefill.email||'',['a-date']:today(),['a-course']:prefill.course||'',['a-batch']:'',['a-source']:prefill.source||'',['a-fee']:getCourseFee(prefill.course)||'',['a-paid']:'',['a-balance']:'',['a-payment']:'Cash',['a-status']:'Active',['a-city']:'',['a-age']:'',['a-notes']:''});
  }else{
    document.getElementById('adm-modal-title').textContent='Add Admission';
    setVals({['adm-id']:'',['a-name']:'',['a-phone']:'',['a-email']:'',['a-date']:today(),['a-course']:'',['a-batch']:'',['a-source']:'',['a-fee']:'',['a-paid']:'',['a-balance']:'',['a-payment']:'Cash',['a-status']:'Active',['a-city']:'',['a-age']:'',['a-notes']:''});
  }
  // Auto-derive status from batch
  document.getElementById('a-batch').onchange=function(){
    const bid=this.value;if(!bid)return;
    const b=db.batches.find(x=>x.id===bid);if(!b)return;
    const t=today();
    let st='Active';
    if(b.startDate>t)st='On Hold';
    else if(b.endDate&&b.endDate<t)st='Completed';
    document.getElementById('a-status').value=st;
  };
  m.show();
}
function calcBalance(){const f=Number(v('a-fee')||0),p=Number(v('a-paid')||0);document.getElementById('a-balance').value=f-p;}
function saveAdmission(){
  const name=v('a-name').trim(),phone=v('a-phone').trim();
  if(!name||!phone)return toast('Name and phone required','error');
  const id=v('adm-id');
  let agentName='';
  if(id){const existing=db.admissions.find(x=>x.id===id);agentName=existing?.agentName||'';}
  if(!agentName&&currentUser.role==='agent')agentName=currentUser.name;
  if(!agentName){const linkedLead=db.leads.find(l=>l.phone===phone);if(linkedLead?.agent)agentName=linkedLead.agent;}
  const obj={name,phone,email:v('a-email'),course:v('a-course'),batchId:v('a-batch'),date:v('a-date'),source:v('a-source'),fee:v('a-fee'),paid:v('a-paid'),payment:v('a-payment'),status:v('a-status'),city:v('a-city'),age:v('a-age'),notes:v('a-notes'),agentName};
  if(id){const a=db.admissions.find(x=>x.id===id);if(a)Object.assign(a,obj);}
  else db.admissions.push({id:uid(),...obj,createdAt:today()});
  saveDB();bootstrap.Modal.getOrCreateInstance(document.getElementById('admModal')).hide();
  renderAdmissions();toast(id?'Updated':'Admission added','success');
}
function deleteAdm(id){if(!confirm('Delete?'))return;db.admissions=db.admissions.filter(a=>a.id!==id);saveDB();renderAdmissions();toast('Deleted','success');}
function exportAdmissions(){
  const rows=db.admissions.map(a=>[a.name,a.phone,a.email||'',a.course||'',a.date||'',a.fee||0,a.paid||0,Number(a.fee||0)-Number(a.paid||0),a.status||''].map(x=>`"${x}"`).join(','));
  dlCSV('admissions.csv','Name,Phone,Email,Course,Date,Fee,Paid,Balance,Status\n'+rows.join('\n'));
}

// ── ALLOCATION ───────────────────────────────────
function switchAllocTab(tab,el){allocTab=tab;allocPage=1;document.querySelectorAll('.alloc-tab').forEach(t=>t.classList.remove('active'));if(el)el.classList.add('active');renderAllocation();}
function renderAllocation(){
  const savedAllocCourse=v('alloc-course');
  const savedAllocAgent=v('alloc-agent-filter');
  populateCourseSelects('alloc-course');
  document.getElementById('alloc-course').value=savedAllocCourse;
  populateAgentSelects('alloc-agent-filter');
  document.getElementById('alloc-agent-filter').value=savedAllocAgent;
  const agOpts=db.agents.filter(a=>a.status==='Active').map(a=>`<option value="${escHtml(a.name)}">${escHtml(a.name)}</option>`).join('');
  document.getElementById('alloc-bulk-agent').innerHTML='<option value="">Select agent...</option>'+agOpts;
  document.getElementById('assign-agent-sel').innerHTML='<option value="">Unassigned</option>'+agOpts;
  const wl=db.agents.filter(a=>a.status==='Active').map(a=>{const c=db.leads.filter(l=>l.agent===a.name).length;return{name:a.name,count:c};}).sort((a,b)=>b.count-a.count);
  const maxWl=wl[0]?.count||1;
  document.getElementById('workload-cards').innerHTML=wl.length?wl.map(w=>`
    <div class="col-6 col-md-4 col-lg-3"><div class="workload-card">
      <div class="workload-top"><div class="workload-av">${w.name.slice(0,2).toUpperCase()}</div>
        <div style="flex:1;min-width:0"><div class="workload-name">${escHtml(w.name)}</div><div class="workload-count">${w.count} leads</div></div>
      </div>
      <div class="workload-bar-wrap"><div class="workload-bar" style="width:${Math.round(w.count/maxWl*100)}%"></div></div>
    </div></div>`).join(''):'';
  const unassigned=db.leads.filter(l=>!l.agent).length;
  const assigned=db.leads.filter(l=>l.agent).length;
  document.getElementById('cnt-unassigned').textContent=unassigned;
  document.getElementById('cnt-assigned').textContent=assigned;
  document.getElementById('cnt-all').textContent=db.leads.length;
  const s=v('alloc-search').toLowerCase(),co=v('alloc-course'),ag=v('alloc-agent-filter');
  let leads=db.leads;
  if(allocTab==='unassigned')leads=leads.filter(l=>!l.agent);
  else if(allocTab==='assigned')leads=leads.filter(l=>l.agent);
  if(s)leads=leads.filter(l=>l.name.toLowerCase().includes(s)||l.phone.includes(s));
  if(co)leads=leads.filter(l=>l.course===co);
  if(ag)leads=leads.filter(l=>l.agent===ag);
  leads.sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
  const total=leads.length,pages=Math.ceil(total/PER_PAGE)||1;
  allocPage=Math.min(allocPage,pages);
  const slice=leads.slice((allocPage-1)*PER_PAGE,allocPage*PER_PAGE);
  document.getElementById('alloc-tbody').innerHTML=slice.length?slice.map((l,i)=>`
    <tr>
      <td><input type="checkbox" class="alloc-chk" value="${l.id}" onchange="updateAllocSelCount()"/></td>
      <td style="color:var(--text-secondary)">${(allocPage-1)*PER_PAGE+i+1}</td>
      <td style="font-weight:600">${escHtml(l.name)}</td>
      <td>${escHtml(l.phone)}</td>
      <td style="font-size:12px">${escHtml(l.course||'—')}</td>
      <td><span class="badge badge-gray">${escHtml(l.source||'—')}</span></td>
      <td>${l.agent?`<span style="font-weight:600;font-size:12.5px">${escHtml(l.agent)}</span>`:'<span class="badge badge-pending">Unassigned</span>'}</td>
      <td style="font-size:11.5px;color:var(--text-secondary)">${fmtDate(l.assignedOn)}</td>
      <td>
        <button class="tbl-action" onclick="openAssignModal('${l.id}')" title="Assign"><i class="fa-solid fa-user-tag"></i></button>
        <button class="tbl-action" onclick="openLeadModal('${l.id}')" title="Edit"><i class="fa-solid fa-pen"></i></button>
      </td>
    </tr>`).join(''):`<tr><td colspan="9"><div class="empty-state"><i class="fa-solid fa-inbox"></i><p>No leads</p></div></td></tr>`;
  renderPagination('alloc-pagination',allocPage,pages,p=>{allocPage=p;renderAllocation();},total);
}
function clearAllocFilters(){['alloc-search','alloc-course','alloc-agent-filter'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});allocPage=1;renderAllocation();}
function toggleAllAlloc(cb){document.querySelectorAll('.alloc-chk').forEach(c=>c.checked=cb.checked);updateAllocSelCount();}
function updateAllocSelCount(){const c=document.querySelectorAll('.alloc-chk:checked').length;document.getElementById('alloc-sel-count').textContent=c+' selected';}
function bulkAssignAlloc(){
  const agent=v('alloc-bulk-agent');if(!agent)return toast('Select agent','error');
  const ids=Array.from(document.querySelectorAll('.alloc-chk:checked')).map(c=>c.value);
  if(!ids.length)return toast('Select at least one lead','error');
  const allowReassign=document.getElementById('alloc-reassign').checked;
  let count=0;
  ids.forEach(id=>{const l=db.leads.find(x=>x.id===id);if(l&&(!l.agent||allowReassign)){l.agent=agent;l.assignedOn=today();count++;}});
  saveDB();renderAllocation();toast(`${count} lead(s) assigned to ${agent}`,'success');
}
function openAssignModal(id){
  const l=db.leads.find(x=>x.id===id);if(!l)return;
  document.getElementById('assign-lead-id').value=id;
  document.getElementById('assign-agent-sel').value=l.agent||'';
  bootstrap.Modal.getOrCreateInstance(document.getElementById('assignModal')).show();
}
function saveAssign(){
  const id=v('assign-lead-id'),agent=v('assign-agent-sel');
  const l=db.leads.find(x=>x.id===id);if(!l)return;
  l.agent=agent;l.assignedOn=agent?today():'';
  saveDB();bootstrap.Modal.getOrCreateInstance(document.getElementById('assignModal')).hide();
  renderAllocation();toast(agent?`Assigned to ${agent}`:'Lead unassigned','success');
}
function openImportModal(){bootstrap.Modal.getOrCreateInstance(document.getElementById('importModal')).show();document.getElementById('import-preview').style.display='none';document.getElementById('import-confirm-btn').disabled=true;importRows=[];}
function previewCSV(input){
  const file=input.files[0];if(!file)return;
  const reader=new FileReader();
  reader.onload=e=>{
    const lines=e.target.result.split('\n').filter(l=>l.trim());
    if(!lines.length)return;
    const headers=lines[0].split(',').map(h=>h.trim().replace(/"/g,'').toLowerCase());
    const nameIdx=headers.findIndex(h=>h.includes('name'));
    const phoneIdx=headers.findIndex(h=>h.includes('phone')||h.includes('mobile'));
    const emailIdx=headers.findIndex(h=>h.includes('email'));
    const courseIdx=headers.findIndex(h=>h.includes('course'));
    const sourceIdx=headers.findIndex(h=>h.includes('source'));
    if(nameIdx<0||phoneIdx<0){return toast('CSV must have name and phone columns','error');}
    importRows=[];
    for(let i=1;i<lines.length;i++){
      const cols=lines[i].split(',').map(c=>c.trim().replace(/"/g,''));
      const name=cols[nameIdx]||'',phone=cols[phoneIdx]||'';
      if(!name||!phone)continue;
      importRows.push({name,phone,email:emailIdx>=0?cols[emailIdx]||'':'',course:courseIdx>=0?cols[courseIdx]||'':'',source:sourceIdx>=0?cols[sourceIdx]||'':'Imported'});
    }
    const dups=importRows.filter(r=>db.leads.find(l=>l.phone===r.phone)).length;
    document.getElementById('import-preview-label').textContent=`${importRows.length} records found | ${dups} duplicates (will skip)`;
    const tbl=document.getElementById('import-preview-table');
    tbl.innerHTML=`<thead><tr><th>Name</th><th>Phone</th><th>Email</th><th>Course</th><th>Source</th></tr></thead><tbody>`+
      importRows.slice(0,10).map(r=>`<tr><td>${escHtml(r.name)}</td><td>${escHtml(r.phone)}</td><td>${escHtml(r.email)}</td><td>${escHtml(r.course)}</td><td>${escHtml(r.source)}</td></tr>`).join('')+
      (importRows.length>10?`<tr><td colspan="5" style="text-align:center;color:var(--text-secondary);font-size:12px">...and ${importRows.length-10} more</td></tr>`:'')+`</tbody>`;
    document.getElementById('import-preview').style.display='';
    document.getElementById('import-confirm-btn').disabled=false;
  };
  reader.readAsText(file);
}
function confirmImport(){
  let added=0,skipped=0;
  importRows.forEach(r=>{
    if(db.leads.find(l=>l.phone===r.phone)){skipped++;return;}
    db.leads.push({id:uid(),...r,agent:'',callbackDate:'',callbackTime:'',callCount:0,remark1:'',remark2:'',remark3:'',payMode:'',payAmount:'',notes:'',createdAt:today()});
    added++;
  });
  saveDB();bootstrap.Modal.getOrCreateInstance(document.getElementById('importModal')).hide();
  renderAllocation();toast(`Imported ${added} leads. ${skipped} duplicates skipped.`,'success');
}

// ── AGENTS ───────────────────────────────────────
function renderAgents(){
  const agFrom=v('agent-from'),agTo=v('agent-to')||today();
  const agents=db.agents;
  const totalLeads=db.leads.length,totalAdm=db.admissions.length;
  const summaryItems=[
    {label:'Total Agents',val:agents.filter(a=>a.status==='Active').length,color:'var(--blue)'},
    {label:'Total Leads',val:totalLeads,color:'var(--orange)'},
    {label:'Total Admissions',val:totalAdm,color:'var(--green)'},
    {label:'Overall Conversion',val:totalLeads?Math.round(totalAdm/totalLeads*100)+'%':'0%',color:'var(--yellow)'},
  ];
  document.getElementById('agent-summary-row').innerHTML=summaryItems.map(s=>`
    <div class="col-6 col-md-3"><div class="card-panel" style="text-align:center;padding:14px 10px">
      <div style="font-family:'Sora',sans-serif;font-size:26px;font-weight:800;color:${s.color}">${s.val}</div>
      <div style="font-size:11px;color:var(--text-secondary)">${s.label}</div>
    </div></div>`).join('');
  document.getElementById('agent-cards').innerHTML=agents.length?agents.map(a=>{
    // Date-filtered leads and admissions for this agent
    let agLeads=db.leads.filter(l=>l.agent===a.name);
    let agAdms=db.admissions.filter(x=>x.agentName===a.name);
    if(agFrom){agLeads=agLeads.filter(l=>l.createdAt>=agFrom);agAdms=agAdms.filter(x=>x.date>=agFrom);}
    if(agTo){agLeads=agLeads.filter(l=>l.createdAt<=agTo);agAdms=agAdms.filter(x=>x.date<=agTo);}
    const totalL=agLeads.length;
    const totalA=agAdms.length;
    const conv=totalL?Math.round(totalA/totalL*100):0;
    // Course-wise admissions
    const courseAdms=getCourseNames().map(c=>({name:c,count:agAdms.filter(x=>x.course===c).length})).filter(c=>c.count>0).sort((a,b)=>b.count-a.count);
    // Monthly progress (current month)
    const nowPrefix=today().slice(0,7);
    const mLeads=db.leads.filter(l=>l.agent===a.name&&l.createdAt.startsWith(nowPrefix)).length;
    const mAdms=db.admissions.filter(x=>x.agentName===a.name&&x.date&&x.date.startsWith(nowPrefix)).length;
    const lPct=Math.min(Math.round(mLeads/Math.max(a.targetLeads,1)*100),100);
    const aPct=Math.min(Math.round(mAdms/Math.max(a.targetAdm,1)*100),100);
    return`<div class="col-md-6 col-xl-4">
      <div class="agent-card">
        <div class="agent-card-hd">
          <div class="agent-av-lg">${a.name.slice(0,2).toUpperCase()}</div>
          <div style="flex:1;min-width:0">
            <div class="agent-card-name">${escHtml(a.name)}</div>
            <div class="agent-card-role">${escHtml(a.role||'Counsellor')}</div>
          </div>
          ${statusBadge(a.status||'Active')}
          <div style="display:flex;gap:4px">
            <button class="tbl-action" onclick="openAgentModal('${a.id}')"><i class="fa-solid fa-pen"></i></button>
            <button class="tbl-action red" onclick="deleteAgent('${a.id}')"><i class="fa-solid fa-trash"></i></button>
          </div>
        </div>
        <div class="agent-kpis">
          <div class="agent-kpi"><div class="agent-kpi-val" style="color:var(--blue)">${totalL}</div><div class="agent-kpi-lbl">Leads</div></div>
          <div class="agent-kpi"><div class="agent-kpi-val" style="color:var(--green)">${totalA}</div><div class="agent-kpi-lbl">Admitted</div></div>
          <div class="agent-kpi"><div class="agent-kpi-val" style="color:var(--orange)">${conv}%</div><div class="agent-kpi-lbl">Conv.</div></div>
        </div>
        ${courseAdms.length?`
        <div style="margin-bottom:10px">
          <div style="font-size:10.5px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--text-secondary);margin-bottom:6px">Course-wise Admissions</div>
          ${courseAdms.map(c=>`<div style="display:flex;align-items:center;justify-content:space-between;font-size:12px;padding:3px 0;border-bottom:1px solid var(--border)">
            <span style="color:var(--text-secondary);flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${escHtml(c.name)}">${escHtml(c.name)}</span>
            <span style="font-weight:700;color:var(--green);flex-shrink:0;margin-left:8px">${c.count} adm.</span>
          </div>`).join('')}
        </div>`:''}
        <div class="prog-row"><div class="prog-label"><span>This month leads</span><strong>${mLeads}/${a.targetLeads||50}</strong></div><div class="prog-wrap"><div class="prog-bar" style="width:${lPct}%;background:var(--blue)"></div></div></div>
        <div class="prog-row"><div class="prog-label"><span>This month admissions</span><strong>${mAdms}/${a.targetAdm||10}</strong></div><div class="prog-wrap"><div class="prog-bar" style="width:${aPct}%;background:var(--green)"></div></div></div>
        <div style="font-size:11.5px;color:var(--text-secondary);margin-top:8px;display:flex;gap:12px">
          ${a.phone?`<span><i class="fa-solid fa-phone fa-xs"></i> ${escHtml(a.phone)}</span>`:''}
          ${a.email?`<span><i class="fa-solid fa-envelope fa-xs"></i> ${escHtml(a.email)}</span>`:''}
        </div>
      </div></div>`;
  }).join(''):`<div class="col-12"><div class="empty-state"><i class="fa-solid fa-user-tie"></i><p>No agents yet</p></div></div>`;
}
function openAgentModal(id){
  const m=bootstrap.Modal.getOrCreateInstance(document.getElementById('agentModal'));
  if(id){const a=db.agents.find(x=>x.id===id);if(!a)return;document.getElementById('agent-modal-title').textContent='Edit Agent';setVals({['agent-id']:a.id,['ag-name']:a.name,['ag-password']:a.password||'',['ag-phone']:a.phone||'',['ag-email']:a.email||'',['ag-role']:a.role||'',['ag-tleads']:a.targetLeads||50,['ag-tadm']:a.targetAdm||10,['ag-status']:a.status||'Active'});}
  else{document.getElementById('agent-modal-title').textContent='Add Agent';setVals({['agent-id']:'',['ag-name']:'',['ag-password']:'',['ag-phone']:'',['ag-email']:'',['ag-role']:'',['ag-tleads']:50,['ag-tadm']:10,['ag-status']:'Active'});}
  m.show();
}
function saveAgent(){
  const name=v('ag-name').trim();if(!name)return toast('Name is required','error');
  const id=v('agent-id');const pw=v('ag-password').trim();const obj={name,password:pw,phone:v('ag-phone'),email:v('ag-email'),role:v('ag-role'),targetLeads:Number(v('ag-tleads')),targetAdm:Number(v('ag-tadm')),status:v('ag-status')};
  if(id){const a=db.agents.find(x=>x.id===id);if(a)Object.assign(a,obj);}
  else db.agents.push({id:uid(),...obj,createdAt:today()});
  saveDB();bootstrap.Modal.getOrCreateInstance(document.getElementById('agentModal')).hide();renderAgents();toast(id?'Agent updated':'Agent added','success');
}
function deleteAgent(id){if(!confirm('Delete agent?'))return;db.agents=db.agents.filter(a=>a.id!==id);saveDB();renderAgents();toast('Agent deleted','success');}

// Add course functionality removed - using fixed BASE_COURSES list

// ── WEBINARS ─────────────────────────────────────
function renderWebinars(){
  populateCourseSelectReq('w-course');
  const now=today();
  document.getElementById('webinar-cards').innerHTML=db.webinars.length?db.webinars.sort((a,b)=>b.date.localeCompare(a.date)).map(w=>{
    const upcoming=w.date>=now;
    return`<div class="col-md-6 col-lg-4">
      <div class="card-panel" style="border-top:3px solid ${upcoming?'var(--orange)':'#9CA3AF'}">
        <div class="d-flex align-items-start justify-content-between gap-2 mb-2">
          <div style="font-weight:700;font-size:13.5px">${escHtml(w.title)}</div>
          <span class="badge ${upcoming?'badge-orange':'badge-gray'}">${upcoming?'Upcoming':'Completed'}</span>
        </div>
        <div style="font-size:12px;color:var(--text-secondary);margin-bottom:8px">
          <i class="fa-solid fa-calendar fa-xs me-1"></i>${fmtDate(w.date)} ${w.time||''}
          &nbsp;|&nbsp;<i class="fa-solid fa-video fa-xs me-1"></i>${escHtml(w.platform||'')}
          ${w.course?`&nbsp;|&nbsp;<i class="fa-solid fa-book fa-xs me-1"></i>${escHtml(w.course)}`:''}
        </div>
        ${w.desc?`<div style="font-size:12px;color:var(--text-secondary);margin-bottom:8px">${escHtml(w.desc)}</div>`:''}
        <div class="d-flex gap-2">
          ${w.link?`<a href="${escHtml(w.link)}" target="_blank" class="btn-sm-o"><i class="fa-solid fa-arrow-up-right-from-square"></i> Join</a>`:''}
          <button class="btn-sm-o" onclick="openWebinarModal('${w.id}')"><i class="fa-solid fa-pen"></i></button>
          <button class="btn-danger-sm" onclick="deleteWebinar('${w.id}')"><i class="fa-solid fa-trash"></i></button>
        </div>
      </div></div>`;}).join(''):`<div class="col-12"><div class="empty-state"><i class="fa-solid fa-video"></i><p>No webinars yet</p></div></div>`;
}
function openWebinarModal(id){
  const m=bootstrap.Modal.getOrCreateInstance(document.getElementById('webinarModal'));
  populateCourseSelectReq('w-course');
  if(id){const w=db.webinars.find(x=>x.id===id);if(!w)return;document.getElementById('webinar-modal-title').textContent='Edit Webinar';setVals({['webinar-id']:w.id,['w-title']:w.title,['w-date']:w.date||'',['w-time']:w.time||'',['w-course']:w.course||'',['w-platform']:w.platform||'Zoom',['w-link']:w.link||'',['w-desc']:w.desc||''});}
  else{document.getElementById('webinar-modal-title').textContent='Add Webinar';setVals({['webinar-id']:'',['w-title']:'',['w-date']:'',['w-time']:'',['w-course']:'',['w-platform']:'Zoom',['w-link']:'',['w-desc']:''});}
  m.show();
}
function saveWebinar(){
  const title=v('w-title').trim(),date=v('w-date');if(!title||!date)return toast('Title and date required','error');
  const id=v('webinar-id');const obj={title,date,time:v('w-time'),course:v('w-course'),platform:v('w-platform'),link:v('w-link'),desc:v('w-desc')};
  if(id){const w=db.webinars.find(x=>x.id===id);if(w)Object.assign(w,obj);}
  else db.webinars.push({id:uid(),...obj,createdAt:today()});
  saveDB();bootstrap.Modal.getOrCreateInstance(document.getElementById('webinarModal')).hide();renderWebinars();toast(id?'Updated':'Webinar added','success');
}
function deleteWebinar(id){if(!confirm('Delete webinar?'))return;db.webinars=db.webinars.filter(w=>w.id!==id);saveDB();renderWebinars();toast('Deleted','success');}

// ── BATCHES ──────────────────────────────────────
function renderBatches(){
  const savedBatchCourse=v('batch-course-filter');
  populateCourseSelects('batch-course-filter');
  document.getElementById('batch-course-filter').value=savedBatchCourse;
  syncBatchStatuses();saveDB();
  const cf=v('batch-course-filter'),sf=v('batch-status-filter'),df=v('batch-date-filter');
  let batches=db.batches;
  if(cf)batches=batches.filter(b=>b.course===cf);
  if(sf)batches=batches.filter(b=>b.status===sf);
  if(df)batches=batches.filter(b=>b.startDate<=df&&(!b.endDate||b.endDate>=df));
  batches.sort((a,b)=>b.startDate?.localeCompare(a.startDate)||0);
  document.getElementById('batch-cards').innerHTML=batches.length?batches.map(b=>{
    const enrolled=db.admissions.filter(a=>a.batchId===b.id).length;
    const pct=Math.min(Math.round(enrolled/Math.max(b.seats||30,1)*100),100);
    const statusColor={Upcoming:'var(--blue)',Ongoing:'var(--green)',Completed:'var(--text-secondary)',Cancelled:'var(--red)'};
    return`<div class="col-md-6 col-lg-4">
      <div class="card-panel" style="border-left:4px solid ${statusColor[b.status]||'var(--orange)'}">
        <div class="d-flex align-items-start justify-content-between gap-2 mb-2">
          <div style="font-weight:700;font-size:13.5px">${escHtml(b.name)}</div>
          ${statusBadge(b.status||'Upcoming')}
        </div>
        <div style="font-size:12px;color:var(--text-secondary);margin-bottom:10px">
          <i class="fa-solid fa-book fa-xs me-1"></i>${escHtml(b.course||'')}
          &nbsp;|&nbsp;<i class="fa-solid fa-calendar fa-xs me-1"></i>${fmtDate(b.startDate)}${b.endDate?' – '+fmtDate(b.endDate):''}
          ${b.timing?`&nbsp;|&nbsp;<i class="fa-solid fa-clock fa-xs me-1"></i>${escHtml(b.timing)}`:''}
          ${b.instructor?`&nbsp;|&nbsp;<i class="fa-solid fa-person-chalkboard fa-xs me-1"></i>${escHtml(b.instructor)}`:''}
        </div>
        <div class="d-flex align-items-center justify-content-between mb-1" style="font-size:12px">
          <span>Enrolled: <strong>${enrolled}/${b.seats||30}</strong></span>
          <span style="color:${pct>=80?'var(--red)':pct>=60?'var(--yellow)':'var(--green)'};font-weight:600">${pct}% full</span>
        </div>
        <div class="prog-wrap mb-3"><div class="prog-bar" style="width:${pct}%;background:${pct>=80?'var(--red)':pct>=60?'var(--yellow)':'var(--green)'}"></div></div>
        <div class="d-flex gap-2 flex-wrap">
          <button class="btn-sm-o" onclick="toggleBatchStudents('${b.id}',this)"><i class="fa-solid fa-users"></i> Students (${enrolled})</button>
          <button class="tbl-action" onclick="openBatchModal('${b.id}')"><i class="fa-solid fa-pen"></i></button>
          <button class="tbl-action red" onclick="deleteBatch('${b.id}')"><i class="fa-solid fa-trash"></i></button>
        </div>
        <div id="bsp-${b.id}" class="batch-students-panel" style="display:none"></div>
      </div></div>`;}).join(''):`<div class="col-12"><div class="empty-state"><i class="fa-solid fa-layer-group"></i><p>No batches yet</p></div></div>`;
}
function clearBatchFilters(){['batch-course-filter','batch-status-filter','batch-date-filter'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});renderBatches();}
function toggleBatchStudents(batchId,btn){
  const panel=document.getElementById('bsp-'+batchId);
  if(panel.style.display==='none'){
    const students=db.admissions.filter(a=>a.batchId===batchId);
    panel.innerHTML=students.length?`
      <div style="font-weight:700;font-size:12.5px;margin-bottom:8px"><i class="fa-solid fa-users me-1" style="color:var(--orange)"></i>Enrolled Students (${students.length})</div>
      <div class="table-wrap"><table class="main-tbl">
        <thead><tr><th>#</th><th>Name</th><th>Phone</th><th>Course</th><th>Fee</th><th>Paid</th><th>Status</th></tr></thead>
        <tbody>${students.map((s,i)=>`<tr><td>${i+1}</td><td style="font-weight:600">${escHtml(s.name)}</td><td>${escHtml(s.phone)}</td><td>${escHtml(s.course||'')}</td><td>${fmtCurrency(s.fee)}</td><td style="color:var(--green)">${fmtCurrency(s.paid)}</td><td>${statusBadge(s.status||'Active')}</td></tr>`).join('')}</tbody>
      </table></div>`:
      `<div class="empty-state" style="padding:16px"><p style="font-size:12.5px">No students enrolled</p></div>`;
    panel.style.display='';btn.innerHTML='<i class="fa-solid fa-chevron-up"></i> Hide';
  }else{panel.style.display='none';btn.innerHTML=`<i class="fa-solid fa-users"></i> Students (${db.admissions.filter(a=>a.batchId===batchId).length})`;}
}
function openBatchModal(id){
  populateCourseSelectReq('b-course');
  const m=bootstrap.Modal.getOrCreateInstance(document.getElementById('batchModal'));
  if(id){const b=db.batches.find(x=>x.id===id);if(!b)return;document.getElementById('batch-modal-title').textContent='Edit Batch';setVals({['batch-id']:b.id,['b-name']:b.name,['b-course']:b.course||'',['b-mode']:b.mode||'Offline',['b-start']:b.startDate||'',['b-end']:b.endDate||'',['b-timing']:b.timing||'',['b-seats']:b.seats||30,['b-instructor']:b.instructor||'',['b-status']:b.status||'Upcoming'});}
  else{document.getElementById('batch-modal-title').textContent='Add Batch';setVals({['batch-id']:'',['b-name']:'',['b-course']:'',['b-mode']:'Offline',['b-start']:'',['b-end']:'',['b-timing']:'',['b-seats']:30,['b-instructor']:'',['b-status']:'Upcoming'});}
  m.show();
}
function saveBatch(){
  const name=v('b-name').trim(),start=v('b-start');if(!name||!start)return toast('Name and start date required','error');
  const id=v('batch-id');const obj={name,course:v('b-course'),mode:v('b-mode'),startDate:start,endDate:v('b-end'),timing:v('b-timing'),seats:Number(v('b-seats')),instructor:v('b-instructor'),status:v('b-status')};
  if(id){const b=db.batches.find(x=>x.id===id);if(b)Object.assign(b,obj);}
  else db.batches.push({id:uid(),...obj,createdAt:today()});
  syncBatchStatuses();
  saveDB();bootstrap.Modal.getOrCreateInstance(document.getElementById('batchModal')).hide();renderBatches();toast(id?'Updated':'Batch added','success');
}
function deleteBatch(id){if(!confirm('Delete batch?'))return;db.batches=db.batches.filter(b=>b.id!==id);saveDB();renderBatches();toast('Deleted','success');}

// ── ANALYTICS ────────────────────────────────────
let anLocationChart=null, anAgeChart=null;
function setAnalyticsPeriod(p,btn){analyticsPeriod=p;document.querySelectorAll('#page-analytics .btn-tab').forEach(b=>b.classList.remove('active'));if(btn)btn.classList.add('active');renderAnalytics();}
function getAnalyticsPrefixes(){
  const period=v('an-period-sel')||'month';
  const selMonth=v('an-month-sel')||today().slice(0,7);
  const [yr,mo]=selMonth.split('-').map(Number);
  if(period==='month') return [selMonth];
  if(period==='quarter'){
    const q=Math.floor((mo-1)/3);
    return [0,1,2].map(i=>`${yr}-${String(q*3+1+i).padStart(2,'0')}`);
  }
  if(period==='year'){
    return Array.from({length:12},(_,i)=>`${yr}-${String(i+1).padStart(2,'0')}`);
  }
  return [selMonth];
}
function renderAnalytics(){
  const prefixes=getAnalyticsPrefixes();
  const selMonth=v('an-month-sel')||today().slice(0,7);
  const [yr]=selMonth.split('-').map(Number);
  const period=v('an-period-sel')||'month';
  // Build period label for KPIs
  const mo=Number(selMonth.split('-')[1]);
  const periodLabel=period==='month'?selMonth:period==='quarter'?`Q${Math.ceil(mo/3)} ${yr}`:`${yr}`;
  // Find courses with active batches in any prefix
  const activeBatchCourses=new Set();
  db.batches.forEach(b=>{
    if(!b.startDate)return;
    const bStart=b.startDate.slice(0,7),bEnd=(b.endDate||b.startDate).slice(0,7);
    if(prefixes.some(p=>bStart<=p&&bEnd>=p))activeBatchCourses.add(b.course);
  });
  const useCoursesFilter=activeBatchCourses.size>0;
  const courses=useCoursesFilter?getCourseNames().filter(c=>activeBatchCourses.has(c)):getCourseNames();
  const leads=db.leads, adms=db.admissions;
  const leadsMonth=leads.filter(l=>prefixes.some(p=>l.createdAt?.startsWith(p)));
  const admsMonth=adms.filter(a=>prefixes.some(p=>a.date?.startsWith(p)));
  const prefix=prefixes[0];
  // KPIs
  const kpis=[
    {label:`Leads (${periodLabel})`,val:leadsMonth.length,color:'var(--blue)',icon:'fa-users'},
    {label:'Admissions',val:admsMonth.length,color:'var(--green)',icon:'fa-graduation-cap'},
    {label:'Revenue',val:fmtCurrency(admsMonth.reduce((s,a)=>s+Number(a.paid||0),0)),color:'var(--orange)',icon:'fa-indian-rupee-sign'},
    {label:'Conversion',val:(leadsMonth.length?Math.round(admsMonth.length/leadsMonth.length*100):0)+'%',color:'var(--yellow)',icon:'fa-chart-line'},
  ];
  document.getElementById('an-kpi-row').innerHTML=kpis.map(k=>`<div class="col-6 col-md-3"><div class="card-panel" style="text-align:center;padding:14px">
    <div style="font-family:'Sora',sans-serif;font-size:24px;font-weight:800;color:${k.color}">${k.val}</div>
    <div style="font-size:11.5px;color:var(--text-secondary);margin-top:3px">${k.label}</div>
  </div></div>`).join('');
  // Course table (active-batch courses) — shown FIRST
  document.getElementById('an-course-tbody').innerHTML=courses.map(c=>{
    const cl=leadsMonth.filter(l=>l.course===c).length;
    const ca=admsMonth.filter(a=>a.course===c).length;
    const ci=leadsMonth.filter(l=>l.course===c&&getLeadStatus(l)==='Interested').length;
    const cw=db.webinars.filter(w=>w.course===c&&prefixes.some(p=>w.date?.startsWith(p))).length;
    const cr=admsMonth.filter(a=>a.course===c).reduce((s,a)=>s+Number(a.paid||0),0);
    const conv=cl?Math.round(ca/cl*100):0;
    if(cl===0&&ca===0&&cw===0)return'';
    return`<tr><td style="font-weight:600">${escHtml(c)}</td><td>${cl}</td><td>${ci}</td><td>${cw}</td><td>${ca}</td><td>${fmtCurrency(cr)}</td><td><span class="badge ${conv>=50?'badge-int':conv>=25?'badge-pending':'badge-gray'}">${conv}%</span></td></tr>`;}).join('');
  // Agent performance
  document.getElementById('an-agent-tbody').innerHTML=db.agents.filter(a=>a.status==='Active').map(a=>{
    const al=leadsMonth.filter(l=>l.agent===a.name).length;
    const aa=admsMonth.filter(x=>x.agentName===a.name).length;
    const ai=leadsMonth.filter(l=>l.agent===a.name&&getLeadStatus(l)==='Interested').length;
    const ar=admsMonth.filter(x=>x.agentName===a.name).reduce((s,x)=>s+Number(x.paid||0),0);
    const conv=al?Math.round(aa/al*100):0;
    return`<tr><td><div class="agent-chip"><div class="agent-chip-av">${a.name.slice(0,2).toUpperCase()}</div>${escHtml(a.name)}</div></td><td>${al}</td><td>${ai}</td><td>${aa}</td><td>${fmtCurrency(ar)}</td><td><span class="badge ${conv>=50?'badge-int':conv>=25?'badge-pending':'badge-gray'}">${conv}%</span></td></tr>`;}).join('');
  // Top 5 Locations chart — shown AFTER tables
  const locMap={};
  admsMonth.forEach(a=>{const city=(a.city||'Unknown').trim();locMap[city]=(locMap[city]||0)+1;});
  const top5=Object.entries(locMap).sort((a,b)=>b[1]-a[1]).slice(0,5);
  const locColors=['#FF6B00','#2563EB','#16A34A','#D97706','#7C3AED'];
  if(anLocationChart)anLocationChart.destroy();
  if(top5.length){
    const lc=document.getElementById('an-location-chart').getContext('2d');
    anLocationChart=new Chart(lc,{type:'bar',data:{labels:top5.map(([c])=>c),datasets:[{label:'Admissions',data:top5.map(([,vv])=>vv),backgroundColor:locColors,borderRadius:6,borderSkipped:false}]},options:{indexAxis:'y',responsive:true,plugins:{legend:{display:false}},scales:{x:{beginAtZero:true,ticks:{stepSize:1,font:{size:10}}},y:{ticks:{font:{size:11}}}}}});
  }
  const locTotal=top5.reduce((s,[,vv])=>s+vv,0)||1;
  document.getElementById('an-location-table').innerHTML=top5.length?`<div style="display:flex;flex-direction:column;gap:5px;margin-top:6px">
    ${top5.map(([city,cnt],i)=>`<div style="display:flex;align-items:center;gap:8px;font-size:12px">
      <div style="width:10px;height:10px;border-radius:3px;background:${locColors[i]};flex-shrink:0"></div>
      <span style="flex:1;font-weight:600">${escHtml(city)}</span>
      <span style="color:var(--text-secondary)">${cnt} adm.</span>
      <span style="font-weight:700;color:${locColors[i]};min-width:32px;text-align:right">${Math.round(cnt/locTotal*100)}%</span>
    </div>`).join('')}
  </div>`:'<div style="font-size:12px;color:var(--text-secondary);padding:8px">No location data yet</div>';
  // Age Groups chart — shown AFTER tables
  const ageBrackets=[{label:'15–19',min:15,max:19},{label:'20–24',min:20,max:24},{label:'25–29',min:25,max:29},{label:'30–34',min:30,max:34},{label:'35–44',min:35,max:44},{label:'45+',min:45,max:99}];
  const ageData=ageBrackets.map(b=>admsMonth.filter(a=>{const age=Number(a.age||0);return age>=b.min&&age<=b.max;}).length);
  const ageColors=['#2563EB','#FF6B00','#16A34A','#D97706','#7C3AED','#DB2777'];
  if(anAgeChart)anAgeChart.destroy();
  const ac=document.getElementById('an-age-chart').getContext('2d');
  anAgeChart=new Chart(ac,{type:'bar',data:{labels:ageBrackets.map(b=>b.label),datasets:[{label:'Admissions',data:ageData,backgroundColor:ageColors,borderRadius:6,borderSkipped:false}]},options:{responsive:true,plugins:{legend:{display:false}},scales:{y:{beginAtZero:true,ticks:{stepSize:1,font:{size:10}}},x:{ticks:{font:{size:11}}}}}});
  const peakIdx=ageData.indexOf(Math.max(...ageData));
  document.getElementById('an-age-table').innerHTML=`<div style="display:flex;flex-wrap:wrap;gap:5px;margin-top:6px">
    ${ageBrackets.map((b,i)=>`<div style="display:flex;align-items:center;gap:5px;font-size:11.5px;background:var(--bg);border-radius:6px;padding:4px 8px;border:1px solid ${i===peakIdx?'var(--orange)':'var(--border)'}">
      <div style="width:8px;height:8px;border-radius:2px;background:${ageColors[i]}"></div>
      <span>${b.label}</span><strong>${ageData[i]}</strong>
      ${i===peakIdx?'<span style="font-size:9px;font-weight:700;color:var(--orange)">PEAK</span>':''}
    </div>`).join('')}
  </div>`;
}
function exportAnalytics(){
  const rows=getCourseNames().map(c=>{
    const cl=db.leads.filter(l=>l.course===c).length;
    const ca=db.admissions.filter(a=>a.course===c).length;
    const cr=db.admissions.filter(a=>a.course===c).reduce((s,a)=>s+Number(a.paid||0),0);
    return[c,cl,ca,cr].map(x=>`"${x}"`).join(',');});
  dlCSV('analytics.csv','Course,Leads,Admissions,Revenue\n'+rows.join('\n'));
}

// ── AGENT CALENDAR ───────────────────────────────
let agCalYear, agCalMonth;
function renderAgentCalendar(){
  const now=new Date();
  if(!agCalYear){agCalYear=now.getFullYear();agCalMonth=now.getMonth();}
  const y=agCalYear,m=agCalMonth;
  const label=new Date(y,m,1).toLocaleDateString('en-IN',{month:'long',year:'numeric'});
  document.getElementById('ag-cal-label').textContent=label;
  const first=new Date(y,m,1).getDay();
  const days=new Date(y,m+1,0).getDate();
  const prevDays=new Date(y,m,0).getDate();
  const t=today();
  const grid=document.getElementById('ag-cal-grid');
  grid.innerHTML=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d=>`<div class="cal-head">${d}</div>`).join('');
  for(let i=0;i<first;i++){const d=prevDays-first+1+i;grid.innerHTML+=`<div class="cal-cell other-month"><div class="cal-day">${d}</div></div>`;}
  for(let d=1;d<=days;d++){
    const ds=`${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const isToday=ds===t;
    const batches=db.batches.filter(b=>b.startDate===ds);
    const webinars=db.webinars.filter(w=>w.date===ds);
    const callbacks=db.leads.filter(l=>l.agent===currentUser.name&&l.callbackDate===ds);
    const dots=[...batches.map(()=>'#2563EB'),...webinars.map(()=>'#FF6B00'),...callbacks.map(()=>'#16A34A')].slice(0,4);
    grid.innerHTML+=`<div class="cal-cell${isToday?' today':''}" onclick="showAgCalDay('${ds}')">
      <div class="cal-day">${d}</div>
      <div class="cal-dots">${dots.map(c=>`<div class="cal-dot" style="background:${c}"></div>`).join('')}</div>
    </div>`;
  }
  const rem=(7-((first+days)%7))%7;
  for(let d=1;d<=rem;d++)grid.innerHTML+=`<div class="cal-cell other-month"><div class="cal-day">${d}</div></div>`;
}
function showAgCalDay(ds){
  const panel=document.getElementById('ag-cal-day-panel');
  const list=document.getElementById('ag-cal-events-list');
  document.getElementById('ag-cal-events-title').textContent=`Events — ${fmtDate(ds)}`;
  const batches=db.batches.filter(b=>b.startDate===ds);
  const webinars=db.webinars.filter(w=>w.date===ds);
  const callbacks=db.leads.filter(l=>l.agent===currentUser.name&&l.callbackDate===ds);
  const items=[
    ...batches.map(b=>({color:'#2563EB',icon:'fa-layer-group',type:'Batch Start',text:`${b.name} (${b.course||''}) — ${b.timing||''} — ${b.mode||''}`})),
    ...webinars.map(w=>({color:'#FF6B00',icon:'fa-video',type:'Webinar',text:`${w.title} at ${w.time||''} via ${w.platform||''}${w.link?` <a href="${escHtml(w.link)}" target="_blank" style="color:var(--orange)"><i class="fa-solid fa-arrow-up-right-from-square fa-xs"></i></a>`:''}`})),
    ...callbacks.map(l=>({color:'#16A34A',icon:'fa-phone',type:'My Callback',text:`${l.name} (${l.phone}) · ${l.course||''} · ${l.callbackTime||'No time'}`})),
  ];
  list.innerHTML=items.length?items.map(it=>`
    <div style="display:flex;align-items:flex-start;gap:10px;padding:8px 0;border-bottom:1px solid var(--border)">
      <div style="width:28px;height:28px;border-radius:6px;background:${it.color}22;color:${it.color};display:flex;align-items:center;justify-content:center;flex-shrink:0"><i class="fa-solid ${it.icon} fa-xs"></i></div>
      <div><div style="font-size:10.5px;font-weight:700;color:${it.color};text-transform:uppercase;letter-spacing:.5px">${it.type}</div><div style="font-size:12.5px;margin-top:2px">${it.text}</div></div>
    </div>`).join(''):`<div class="empty-state" style="padding:16px"><p style="font-size:12.5px">No events on this day</p></div>`;
  panel.style.display='';
}
function agCalNav(dir){
  agCalMonth+=dir;
  if(agCalMonth>11){agCalMonth=0;agCalYear++;}
  if(agCalMonth<0){agCalMonth=11;agCalYear--;}
  renderAgentCalendar();
}
function agCalToday(){const n=new Date();agCalYear=n.getFullYear();agCalMonth=n.getMonth();renderAgentCalendar();}

// ── DAILY TRACKER ────────────────────────────────
function renderDaily(){
  const d=v('daily-date')||today();
  const isAgent=currentUser.role==='agent';
  // For agent: always use their data scoped to today
  let allLeads=isAgent?db.leads.filter(l=>l.agent===currentUser.name):db.leads;
  let allAdms=isAgent?db.admissions.filter(a=>a.agentName===currentUser.name):db.admissions;
  const callbacks=allLeads.filter(l=>l.callbackDate===d);
  const admsToday=allAdms.filter(a=>a.date===d);
  const intLeads=allLeads.filter(l=>getLeadStatus(l)==='Interested');
  if(isAgent){
    // ── AGENT DAILY VIEW ──────────────────────────
    const admsDayAgent=allAdms.filter(a=>a.date===d);
    const intLeadsDay=allLeads.filter(l=>getLeadStatus(l)==='Interested'&&l.callbackDate===d||l.createdAt===d&&getLeadStatus(l)==='Interested');
    document.getElementById('daily-kpi-row').innerHTML=[
      {label:'Leads Added',val:allLeads.filter(l=>l.createdAt===d).length,color:'var(--blue)',icon:'fa-user-plus'},
      {label:'Admissions Done',val:admsDayAgent.length,color:'var(--green)',icon:'fa-graduation-cap'},
      {label:'Pipeline Leads',val:allLeads.filter(l=>getLeadStatus(l)==='Interested').length,color:'var(--orange)',icon:'fa-fire'},
      {label:"Callbacks Due",val:callbacks.length,color:'var(--red)',icon:'fa-phone'},
    ].map(k=>`<div class="col-6 col-md-3"><div class="card-panel" style="display:flex;align-items:center;gap:12px;padding:14px">
      <div style="background:${k.color}22;color:${k.color};font-size:18px;width:42px;height:42px;border-radius:9px;display:flex;align-items:center;justify-content:center"><i class="fa-solid ${k.icon}"></i></div>
      <div><div style="font-family:'Sora',sans-serif;font-size:22px;font-weight:800">${k.val}</div><div style="font-size:11px;color:var(--text-secondary)">${k.label}</div></div>
    </div></div>`).join('');
    // Today's callbacks list
    document.getElementById('daily-callbacks').innerHTML=callbacks.length?callbacks.map(l=>`
      <div class="callback-item">
        <div class="cb-avatar">${l.name.slice(0,2).toUpperCase()}</div>
        <div style="flex:1;min-width:0">
          <div class="cb-name">${escHtml(l.name)}</div>
          <div class="cb-sub">${escHtml(l.phone)} · ${escHtml(l.course||'')} · ${l.callbackTime||'No time'}</div>
        </div>
        <div style="margin-top:2px">${statusBadge(l.status||'New')}</div>
      </div>`).join(''):`<div class="empty-state" style="padding:20px"><i class="fa-solid fa-phone-slash"></i><p>No callbacks for ${fmtDate(d)}</p></div>`;
    // WhatsApp log
    const waKey=`wa_${currentUser.name.replace(/\s+/g,'_')}_${d}`;
    const waEntry=db.dailyNotes.find(n=>n.date===d&&n.waLog&&n.agentName===currentUser.name);
    const waCount=waEntry?waEntry.waCount:0;
    document.getElementById('agent-wa-count').value=waCount;
    document.getElementById('agent-wa-saved').textContent=waCount?`Last saved: ${waCount} msgs`:'';
    // Agent daily activity summary — scoped to selected day
    const courses=getCourseNames();
    const dayLeadsAgent=allLeads.filter(l=>l.createdAt===d);
    const dayAdmsAgent=allAdms.filter(a=>a.date===d);
    const courseAdms=courses.map(c=>({name:c,count:dayAdmsAgent.filter(a=>a.course===c).length})).filter(c=>c.count>0);
    const courseLeads=courses.map(c=>({name:c,count:dayLeadsAgent.filter(l=>l.course===c).length})).filter(c=>c.count>0);
    document.getElementById('agent-daily-summary').innerHTML=`
      <div class="row g-3 mb-3">
        <div class="col-12">
          <div class="card-panel">
            <div class="panel-header"><div class="panel-title"><i class="fa-solid fa-chart-pie" style="color:var(--orange)"></i> Activity Summary — ${fmtDate(d)}</div></div>
            <div class="row g-3">
              <div class="col-md-6">
                <div style="font-size:11.5px;font-weight:700;color:var(--text-secondary);text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px">Leads Added This Day</div>
                ${courseLeads.length?courseLeads.map(c=>`
                  <div style="display:flex;align-items:center;justify-content:space-between;padding:4px 0;border-bottom:1px solid var(--border);font-size:12px">
                    <span style="color:var(--text-secondary)">${escHtml(c.name)}</span>
                    <span class="badge badge-blue">${c.count}</span>
                  </div>`).join(''):'<div style="font-size:12px;color:var(--text-secondary)">No leads added on this day</div>'}
              </div>
              <div class="col-md-6">
                <div style="font-size:11.5px;font-weight:700;color:var(--text-secondary);text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px">Admissions Done This Day</div>
                ${courseAdms.length?courseAdms.map(c=>`
                  <div style="display:flex;align-items:center;justify-content:space-between;padding:4px 0;border-bottom:1px solid var(--border);font-size:12px">
                    <span style="color:var(--text-secondary)">${escHtml(c.name)}</span>
                    <span class="badge badge-int">${c.count}</span>
                  </div>`).join(''):'<div style="font-size:12px;color:var(--text-secondary)">No admissions on this day</div>'}
              </div>
            </div>
          </div>
        </div>
      </div>`;
  } else {
    // ── ADMIN DAILY VIEW (unchanged) ──────────────
    document.getElementById('daily-kpi-row').innerHTML=[
      {label:'Leads Added',val:allLeads.filter(l=>l.createdAt===d).length,color:'var(--blue)',icon:'fa-user-plus'},
      {label:'Admissions',val:admsToday.length,color:'var(--green)',icon:'fa-graduation-cap'},
      {label:'Callbacks Due',val:callbacks.length,color:'var(--orange)',icon:'fa-phone'},
      {label:'Pipeline (Interested)',val:allLeads.filter(l=>getLeadStatus(l)==='Interested').length,color:'var(--yellow)',icon:'fa-fire'},
    ].map(k=>`<div class="col-6 col-md-3"><div class="card-panel" style="display:flex;align-items:center;gap:12px;padding:14px">
      <div style="background:${k.color}22;color:${k.color};font-size:18px;width:42px;height:42px;border-radius:9px;display:flex;align-items:center;justify-content:center"><i class="fa-solid ${k.icon}"></i></div>
      <div><div style="font-family:'Sora',sans-serif;font-size:22px;font-weight:800">${k.val}</div><div style="font-size:11px;color:var(--text-secondary)">${k.label}</div></div>
    </div></div>`).join('');
    document.getElementById('daily-callbacks').innerHTML=callbacks.length?callbacks.map(l=>`
      <div class="callback-item">
        <div class="cb-avatar">${l.name.slice(0,2).toUpperCase()}</div>
        <div style="flex:1;min-width:0">
          <div class="cb-name">${escHtml(l.name)}</div>
          <div class="cb-sub">${escHtml(l.phone)} · ${escHtml(l.course||'')} · ${l.callbackTime||'No time'}</div>
        </div>
        <div style="text-align:right;flex-shrink:0">
          ${l.agent?`<div style="font-size:11.5px;font-weight:700;color:var(--orange)">${escHtml(l.agent)}</div>`:''}
          <div style="margin-top:2px">${statusBadge(l.status||'New')}</div>
        </div>
      </div>`).join(''):`<div class="empty-state" style="padding:20px"><i class="fa-solid fa-phone-slash"></i><p>No callbacks for this date</p></div>`;
    document.getElementById('agent-daily-summary').innerHTML='';
  }
  // Notes (common for both roles)
  const notes=db.dailyNotes.filter(n=>n.date===d&&!n.waLog&&(isAgent?n.agentName===currentUser.name:true)).sort((a,b)=>b.ts.localeCompare(a.ts));
  document.getElementById('daily-notes-list').innerHTML=notes.length?notes.map(n=>`
    <div class="daily-note">
      <div class="note-dot"></div>
      <div style="flex:1"><div class="note-text">${escHtml(n.text)}</div><div class="note-time">${n.ts.slice(11,16)}${isAgent?'':(n.agentName?` · ${escHtml(n.agentName)}`:' · Admin')}</div></div>
      <button class="tbl-action red" onclick="deleteDailyNote('${n.id}')"><i class="fa-solid fa-xmark"></i></button>
    </div>`).join(''):`<div style="font-size:12.5px;color:var(--text-secondary);padding:8px 0">No notes yet</div>`;
  // Show/hide agent-specific UI sections
  document.getElementById('agent-wa-section').style.display=isAgent?'':'none';
  // Agents CAN choose date to see historical reports; admin also has date picker
  document.getElementById('daily-date-wrap').style.display='';
}
function saveAgentWA(){
  const d=v('daily-date')||today();
  const count=Number(document.getElementById('agent-wa-count').value||0);
  // Remove existing entry for today
  db.dailyNotes=db.dailyNotes.filter(n=>!(n.date===d&&n.waLog&&n.agentName===currentUser.name));
  if(count>0)db.dailyNotes.push({id:uid(),date:d,text:`WhatsApp msgs: ${count}`,waLog:true,waCount:count,agentName:currentUser.name,ts:new Date().toISOString()});
  saveDB();
  document.getElementById('agent-wa-saved').textContent=count?`Saved: ${count} msgs`:'Cleared';
  toast('WhatsApp count saved','success');
}
function addDailyNote(){
  const t=document.getElementById('daily-note-input').value.trim();if(!t)return;
  const isAgent=currentUser.role==='agent';
  db.dailyNotes.push({id:uid(),date:v('daily-date')||today(),text:t,waLog:false,agentName:isAgent?currentUser.name:'Admin',ts:new Date().toISOString()});
  saveDB();document.getElementById('daily-note-input').value='';renderDaily();
}
function deleteDailyNote(id){db.dailyNotes=db.dailyNotes.filter(n=>n.id!==id);saveDB();renderDaily();}

// ── SETTINGS ─────────────────────────────────────
function renderSettings(){
  const s=db.settings;
  setVals({['set-org']:s.orgName||'',['set-admin']:s.adminName||'',['set-role']:s.adminRole||'',['set-email']:s.email||'',['set-phone']:s.phone||''});
  // Render admin accounts list
  const adminListEl=document.getElementById('admin-accounts-list');
  if(adminListEl){
    adminListEl.innerHTML=`<div style="display:flex;flex-direction:column;gap:6px;margin-bottom:12px">
      ${(db.admins||[]).map(a=>`<div style="display:flex;align-items:center;gap:8px;padding:8px 10px;background:var(--bg);border-radius:7px;font-size:12.5px">
        <div style="width:28px;height:28px;border-radius:7px;background:var(--orange);color:white;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:11px;flex-shrink:0">${a.name.slice(0,2).toUpperCase()}</div>
        <div style="flex:1;font-weight:600">${escHtml(a.name)}</div>
        <button class="btn-sm-o" style="padding:3px 8px;font-size:11px" onclick="changeAdminPassword('${a.id}')"><i class="fa-solid fa-key"></i> PW</button>
        <button class="tbl-action red" onclick="removeAdmin('${a.id}')" title="Remove"><i class="fa-solid fa-trash"></i></button>
      </div>`).join('')}
    </div>
    <button class="btn-sm-o" onclick="openAddAdminModal()"><i class="fa-solid fa-plus"></i> Add Admin</button>`;
  }
}
function saveSettings(){
  db.settings={orgName:v('set-org'),adminName:v('set-admin'),adminRole:v('set-role'),email:v('set-email'),phone:v('set-phone')};
  saveDB();
  const setEl2=(id,val)=>{const el=document.getElementById(id);if(el)el.textContent=val;};
  setEl2('sb-org',db.settings.orgName||'Udyogwardhini');
  setEl2('sb-name',db.settings.adminName||currentUser.name);
  setEl2('sb-role',db.settings.adminRole||currentUser.role);
  if(db.settings.domain)document.title=db.settings.domain+' CRM';
  toast('Settings saved','success');
}
function openAddAdminModal(){
  document.getElementById('new-admin-name').value='';
  document.getElementById('new-admin-pass').value='';
  bootstrap.Modal.getOrCreateInstance(document.getElementById('addAdminModal')).show();
}
function saveNewAdmin(){
  const name=document.getElementById('new-admin-name').value.trim();
  const pass=document.getElementById('new-admin-pass').value.trim();
  if(!name||!pass)return toast('Name and password required','error');
  if((db.admins||[]).find(a=>a.name.toLowerCase()===name.toLowerCase()))return toast('Admin already exists','error');
  if(!db.admins)db.admins=[];
  db.admins.push({id:uid(),name,password:pass,createdAt:today()});
  saveDB();renderSettings();
  bootstrap.Modal.getOrCreateInstance(document.getElementById('addAdminModal')).hide();
  toast(`Admin "${name}" added`,'success');
}
function removeAdmin(id){
  if((db.admins||[]).length<=1)return toast('Must keep at least one admin','error');
  if(!confirm('Remove this admin?'))return;
  db.admins=db.admins.filter(a=>a.id!==id);saveDB();renderSettings();toast('Admin removed','success');
}
function changeAdminPassword(id){
  const a=(db.admins||[]).find(x=>x.id===id);if(!a)return;
  const pw=prompt(`New password for ${a.name}:`);
  if(!pw||!pw.trim())return;
  a.password=pw.trim();saveDB();renderSettings();
  toast(`Password updated for ${a.name}`,'success');
}
function clearLeadsData(){
  if(!confirm('Delete ALL leads and admissions? Cannot be undone.'))return;
  db.leads=[];db.admissions=[];db.dailyNotes=[];
  saveDB();showPage('leads');toast('Leads and admissions cleared','success');
}
function clearAllData(){if(!confirm('Are you sure? ALL data will be permanently deleted!'))return;localStorage.removeItem(DB_KEY);location.reload();}

// ── GLOBAL SEARCH ────────────────────────────────
function globalSearch(q){
  const overlay=document.getElementById('search-overlay');
  const results=document.getElementById('search-results');
  if(!q||q.length<2){overlay.style.display='none';results.style.display='none';return;}
  overlay.style.display='block';results.style.display='';
  const ql=q.toLowerCase();
  const leads=db.leads.filter(l=>l.name.toLowerCase().includes(ql)||l.phone.includes(ql)).slice(0,5);
  const adms=db.admissions.filter(a=>a.name.toLowerCase().includes(ql)||a.phone.includes(ql)).slice(0,5);
  let html='';
  if(leads.length)html+=`<div class="sr-section">Leads</div>`+leads.map(l=>`<div class="sr-item" onclick="closeSearch();showPage('leads')"><i class="fa-solid fa-user" style="color:var(--blue)"></i><div><div style="font-weight:600">${escHtml(l.name)}</div><div style="font-size:11px;color:var(--text-secondary)">${l.phone} · ${l.course||''}</div></div>${statusBadge(l.status||'New')}</div>`).join('');
  if(adms.length)html+=`<div class="sr-section">Admissions</div>`+adms.map(a=>`<div class="sr-item" onclick="closeSearch();showPage('admissions')"><i class="fa-solid fa-graduation-cap" style="color:var(--green)"></i><div><div style="font-weight:600">${escHtml(a.name)}</div><div style="font-size:11px;color:var(--text-secondary)">${a.phone} · ${a.course||''}</div></div></div>`).join('');
  results.innerHTML=html||`<div class="sr-empty">No results for "${escHtml(q)}"</div>`;
}
function closeSearch(){document.getElementById('search-overlay').style.display='none';document.getElementById('search-results').style.display='none';document.getElementById('global-search').value='';}

// ── PAGINATION ───────────────────────────────────
function renderPagination(containerId,current,total,onPage,count){
  const el=document.getElementById(containerId);if(!el)return;
  if(total<=1){el.innerHTML='';return;}
  const info=`Showing ${(current-1)*PER_PAGE+1}–${Math.min(current*PER_PAGE,count)} of ${count}`;
  const pages=[];
  pages.push(`<button class="pg-btn" onclick="(${onPage})(${current-1})" ${current<=1?'disabled':''}>‹</button>`);
  for(let p=1;p<=total;p++){if(p===1||p===total||Math.abs(p-current)<=1)pages.push(`<button class="pg-btn${p===current?' active':''}" onclick="(${onPage})(${p})">${p}</button>`);else if(Math.abs(p-current)===2)pages.push(`<span style="padding:0 3px;color:var(--text-secondary)">…</span>`);}
  pages.push(`<button class="pg-btn" onclick="(${onPage})(${current+1})" ${current>=total?'disabled':''}>›</button>`);
  el.innerHTML=`<div class="pagination-wrap"><span class="pagination-info">${info}</span><div class="pagination-btns">${pages.join('')}</div></div>`;
}

// ── UTILS ────────────────────────────────────────
function v(id){const el=document.getElementById(id);return el?el.value:'';}
function setVals(obj){Object.entries(obj).forEach(([id,val])=>{const el=document.getElementById(id);if(!el)return;el.tagName==='TEXTAREA'?el.value=val:el.value=val;});}
function toast(msg,type='info'){
  const c=document.getElementById('toast-container');
  const t=document.createElement('div');t.className=`toast-msg ${type}`;
  const icons={success:'fa-circle-check',error:'fa-circle-xmark',info:'fa-circle-info'};
  t.innerHTML=`<i class="fa-solid ${icons[type]||icons.info}"></i>${escHtml(msg)}`;
  c.appendChild(t);setTimeout(()=>{t.style.animation='fadeOut .3s forwards';setTimeout(()=>t.remove(),300);},2800);
}
function dlCSV(filename,content){const a=document.createElement('a');a.href='data:text/csv;charset=utf-8,'+encodeURIComponent(content);a.download=filename;a.click();}

// ── START ────────────────────────────────────────
document.addEventListener('DOMContentLoaded',()=>{
  loadDB();
  const userEl = document.getElementById('login-user');
  if(userEl) userEl.addEventListener('keydown',e=>{if(e.key==='Enter')doLogin();});
});
