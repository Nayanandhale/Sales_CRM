# 🏢 Udyogwardhini CRM

### Internal Sales & Admission Management System

**A centralized CRM for managing leads, admissions, agents, batches, webinars, analytics, and daily operations.**

## 🧭 Quick Navigation

- [✨ Overview](#-overview)
- [🛠️ Tech Stack](#️-tech-stack)
- [📁 Project Structure](#-project-structure)
- [🔐 Admin Portal](#-admin-portal-features)
- [👤 Agent Portal](#-agent-portal-features)
- [🎓 Built-in Courses](#-courses-31-built-in)
- [🔌 API](#-api-endpoints)
- [🗄️ Database](#️-database-schema)
- [⚙️ Environment](#️-environment-variables)
- [🛡️ Security](#️-security-notes-for-tech-head)
- [🚀 Deployment](#-deployment)
- [🤝 Support](#-support)

---

## ✨ Overview

Udyogwardhini CRM is an internal **Sales & Admission Management System** built for Udyogwardhini. It brings lead management, admissions, agent allocation, batch scheduling, webinars, analytics, and daily activity tracking into one place.

### 🎯 Two portals, one CRM

| 🧑‍💼 Admin Portal | 👤 Agent Portal |
|---|---|
| Full operational control | Personal sales workspace |
| Lead allocation & bulk assignment | Assigned leads only |
| Admissions & batch management | Callback & activity tracking |
| Agent performance tracking | Personal performance view |
| Analytics & exports | Read-only schedule |

> 💡 **Core idea:** give administrators a complete operational view while keeping each agent focused on the leads and activities assigned to them.

---

## 🛠️ Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| 🎨 Frontend | HTML5 · CSS3 · Vanilla JavaScript · Bootstrap 5 · Chart.js | UI, interactions & analytics visualizations |
| ⚙️ Backend | Node.js v18+ · Express.js | REST API & application server |
| 🗄️ Database | PostgreSQL · JSONB | Flexible persistent data storage |
| 🔐 Auth | Name + Password | Role-based Admin / Agent access |

---

## 📁 Project Structure

```
udyogwardhini-crm/
├── index.html        ← Complete frontend SPA (single file)
├── app.js            ← All frontend logic
├── style.css         ← All styles
├── logo.png          ← Udyogwardhini logo
├── server.js         ← Node.js + Express + PostgreSQL backend
├── package.json      ← Node dependencies
├── .env              ← Environment variables (never commit this)
├── .env.example      ← Template for .env
├── .gitignore        ← Excludes node_modules, .env, etc.
├── README.md         ← This file
└── DEPLOYMENT.md     ← Step-by-step deployment guide
```

---

---

## 🔐 Admin Portal Features

| Module | What it does |
|--------|-------------|
| **Dashboard** | KPI cards (Total Leads, Admissions, Pipeline, Revenue) with course-wise breakdown. Agent performance table. Course Performance Tracker. Date range + course filter. |
| **Leads** | Full lead management — add, edit, convert to admission. Filters: course, status, source, agent, date. Calls counter, note indicator, admitted badge. CSV export. Bulk assign leads to agents. |
| **Admissions** | Student enrollment tracker. Filters: course, batch, status, source, month. Auto-derives status from linked batch (Active / On Hold / Completed). Fee, paid, balance tracking. City and age fields for analytics. CSV export. |
| **Allocation** | Import leads via CSV. Assign unassigned leads to agents individually or in bulk. Agent workload summary cards. Reassign option. |
| **Agent Tracker** | View all agents with their leads, admissions, and course-wise breakdown. Date range filter for daily performance tracking. Edit agent details and passwords. Add / remove agents. Monthly target progress bars. |
| **Webinars** | Schedule webinars with platform, link, course, date and time. Upcoming / Completed badge. |
| **Batch Schedule** | Create and manage batches with start/end date, timing, instructor, seats. Auto-syncs admission statuses when batch dates pass. Enrolled students panel per batch with filters. |
| **Analytics** | Monthly / Quarterly / Yearly filter. Course-wise stats (active batches only). Agent performance table. Top 5 Admission Locations (bar chart). Admissions by Age Group (bar chart). |
| **Daily Tracker** | Leads added, admissions, callbacks due, pipeline count — for selected date. Callbacks list. Activity notes. |
| **Settings** | Organisation info. Admin account management (add/remove admins, change passwords). Smart CRM suggestions. Danger zone (clear leads, clear everything). |

---

---

## 👤 Agent Portal Features

| Module | What it does |
|--------|-------------|
| **Dashboard** | Same as admin but filtered to this agent's data. Last 3 months auto-range. "My Performance" section. |
| **My Leads** | Only shows leads assigned to this agent. Can add, edit leads. No delete, no assign options. Sources limited to Webinar and Inbound Enquiry. |
| **Calendar** | Read-only view of all batches and webinars scheduled by admin. Agent's own callback dates shown in green. Click any date to see event details. |
| **Daily Tracker** | Leads added today, admissions done today, pipeline leads, callbacks due — all for selected date. WhatsApp message counter (saved per day). Course-wise leads and admissions breakdown for selected date. Activity notes. |

---

---

## 🔌 API Endpoints

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | Login as admin or agent |

### Collections (CRUD for all)
All collections support GET (list), POST (create), PUT /:id (update), DELETE /:id

| Collection | Endpoint |
|------------|----------|
| Leads | `/api/leads` |
| Admissions | `/api/admissions` |
| Agents | `/api/agents` |
| Admins | `/api/admins` |
| Courses | `/api/courses` |
| Webinars | `/api/webinars` |
| Batches | `/api/batches` |
| Daily Notes | `/api/dailyNotes` |
| Settings | `/api/settings` (GET + PUT only) |

### Special Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/leads/bulk-assign` | Bulk assign leads to an agent |
| GET | `/api/courses/all` | Base + custom courses list |
| GET | `/api/dashboard` | Summary KPIs with date + agent filter |
| GET | `/api/agent-performance` | All agents performance with date filter |
| GET | `/api/analytics/locations` | Top 5 admission cities |
| GET | `/api/analytics/age-groups` | Admissions by age bracket |
| GET | `/api/analytics/courses` | Course-wise stats for a period |
| GET | `/api/daily` | Daily tracker summary |
| GET | `/api/export/:collection` | CSV export |
| POST | `/api/batches/sync` | Force batch→admission status sync |
| POST | `/api/reset` | Clear leads/admissions, keep agents/admins |
| GET | `/api/health` | Server and DB health check |

---

---

## 🛡️ Security Notes for Tech Head

The following are known items to harden before public launch:

1. 🔑 **Passwords are plain text** — implement bcrypt hashing for all passwords
2. 🎟️ **No JWT/session tokens** — authentication is frontend-only; add server-side token validation for API security
3. 🌐 **CORS is open** — restrict to company domain only in `server.js`
4. 🚦 **No rate limiting** — add express-rate-limit on auth endpoints
5. 🔒 **No HTTPS enforcement** — configure via domain/hosting (not in app code)

---

### 🏢 Udyogwardhini CRM

**Manage leads. Track admissions. Empower agents.**

Made for streamlined internal sales & admission operations.
