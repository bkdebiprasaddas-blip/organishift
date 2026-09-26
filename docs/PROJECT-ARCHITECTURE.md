# OrganiShift — Project Deep-Dive, Architecture & Engineering Analysis

> Comprehensive technical documentation covering the entire repository — from
> executive overview to low-level implementation. Written for a new developer,
> architect, technical lead, or reviewer. All claims are grounded in the actual
> repository files referenced inline. Where a statement is inference rather than
> fact it is explicitly labelled **[inference]**.
>
> **Source of truth:** This document is an *analysis*, not an authoritative
> spec. The governing specs are the frozen files at the root and the
> `governance/` planning docs (see §5). This document may lag the code.

---

## 1. Executive Summary

**OrganiShift** is a reusable event planning, scheduling, and execution-tracking
web application built on the **MERN stack** (MongoDB, Express, React, Node.js).
It was built as a college project and is currently at **Phase 1 MVP** maturity.

### The problem it solves

College fests and community events repeat the same planning work every year, but
the knowledge lives in spreadsheets and chat history. OrganiShift makes the
**checklist itself the reusable asset**: an admin curates a master library of
module trees, assembles them into an Event Plan blueprint, schedules the plan as
a dated Event, and then tracks live Execution progress with role-aware task
assignment, status transitions, and automatic roll-up percentages. *Plan once,
clone forever, track execution in one place with clear accountability per role.*

### Primary users / consumers

- **ADMIN** — curates the Planning Library, creates/imports event plans, manages
  users, deletes events.
- **MANAGER** — schedules events from plans, assigns work, sets priorities/due
  dates/status field transitions.
- **MEMBER** — sees only their assigned branches of an event execution tree and
  updates their own task statuses.
- The "client" is a browser-based SPA consumed through a REST API.

### Major capabilities (Phase 1 MVP)

- JWT authentication with three roles (ADMIN / MANAGER / MEMBER), no
  self-registration.
- **Planning Library** — admin-only CRUD of master module trees (folders /
  tasks / milestones), search, templates, JSON export, interactive checklists.
- **Event Plans** — blueprint builder with deep-copy import of library modules.
- **Calendar** — month grid; managers schedule events from plans (clones the
  blueprint into an execution copy).
- **Execution** — per-event checklist tree with assignees, priority, due dates,
  status transitions, and recursive progress roll-up.
- **Dashboard** — six role-scoped counters, "My Assigned Work" inline status
  updates, upcoming events.

### Maturity

- Branch `v1`; a single-person (solo) project.
- Server acceptance test suite: **40/40 passing** (`node --test`).
- Client Vite production build: clean, 0 errors.
- Current phase per `BOOTSTRAP.md`: **TESTING complete + UI/UX refinement
  delivered**; release gate not yet approved.

### Application type

A **three-tier web application** (client / API / database) with a **modular
service layer** on the server. It is a **monolith** — a single Express server
process and a single MongoDB database, with a separate Vite dev/build process for
the React client.

### High-level architecture

```
Browser (React SPA)
   │  HTTP + JSON (Bearer JWT)
   ▼
Express REST API (routes → controllers → services → Mongoose models)
   │  MongoDB driver / Mongoose ODM
   ▼
MongoDB (5 collections)
```

### Technology stack (summary)

| Tier | Technology |
|---|---|
| Frontend | React 18, Vite 5, React Router 6, Tailwind CSS 3, Lucide React icons, Axios, Zod |
| Backend | Node.js, Express 4, Mongoose 8, JWT (jsonwebtoken), bcryptjs, express-rate-limit, Zod, dotenv, CORS |
| Database | MongoDB (local, port 27017), database `organishift` |
| Language | JavaScript (CommonJS server, ES Modules client) |

### Deployment model

**Local / development only in practice.** There is no cloud deployment,
containerization, or production infrastructure in the repository. The primary
deliverable is a local run via `OrganiShift.bat` / `start.bat`, with verifiable
build + tests. Deployment is gated and not yet executed.

### Major external integrations

None at runtime beyond the MongoDB database server. No third-party SaaS, payment,
analytics, or storage providers are integrated. *(The system is self-contained.)*

### Key architectural decisions (summarized; full analysis in §26)

1. **Three-tier + modular service layer** with a strict downward import
   direction (`Routes → Controllers → Services → Models`) and NO circular
   imports.
2. **Materialized-path tree storage** for hierarchical checklists (single indexed
   regex query per subtree read/delete) rather than `$graphLookup` or adjacency
   lists.
3. **Single `planningItems` collection** discriminated by `scope` (`LIBRARY` vs
   `PLAN`) to represent two lifecycle stages of the same entity.
4. **API-only, field-level authorization** (RBAC at the route + business rules in
   services) — the UI hiding buttons is cosmetic.
5. **Child-average progress roll-up** (`progressService`) for automatic
   percentage computation.
6. **`withTx` graceful transaction fallback** so multi-document operations work
   on standalone dev MongoDB (no replica set) while still using real transactions
   where available.

### Project at a Glance

| Attribute | Value |
|---|---|
| **Name** | OrganiShift |
| **Type** | Reusable event planning / scheduling / execution tracker |
| **Stack** | MERN (MongoDB · Express · React · Node) |
| **Language** | JavaScript (server CommonJS, client ESM) |
| **Phase** | Phase 1 MVP — TESTING complete, not yet released |
| **Architecture** | Three-tier monolith + modular service layer |
| **Auth** | JWT bearer tokens, 3 roles (ADMIN/MANAGER/MEMBER) |
| **Database** | MongoDB, 5 collections, materialized-path trees |
| **Tests** | Node's built-in test runner (`node:test`), 40 passing |
| **Build** | Vite (client), plain Node (server) |
| **Deployment** | Local only — not yet deployed |
| **Branch** | `v1` (solo project) |
| **Notes** | Work local + uncommitted; owner triggers commits |

---

## 2. Project at a Glance

(Table above in §1. Key facts: **monolith**, **MERN**, **solo**, **LOCAL +
UNCOMMITTED**, **6 pages**, **3 roles**, **53 tests passing**.)

---

## 3. Repository Structure

```
OrganiShift_MERN/
├── AGENTS.md                       # Rule book (governance, at root)
├── README.md                       # Project overview / problem / features
├── SETUP.md                        # Install / run / test guide
├── .gitignore                      # Ignore rules (Scratch, .env, dist, etc.)
├── OrganiShift.bat                 # Windows dev launcher
├── docs/                           # Human-facing technical docs
│   ├── API-DOCS.md                 #   REST API reference
│   ├── DATA-MODEL.md               #   Data model / collections
│   ├── DEMO-SCRIPT.md              #   13-step manual demo / viva walkthrough
│   ├── VIVA-NOTES.md               #   Anticipated Q&A (defensible answers)
│   └── PROJECT-ARCHITECTURE.md     #   THIS document
├── governance/                     # Continuity records (git-tracked)
│   ├── RULEBOOK.md                 #   Master compliance rule book (PART I–III)
│   ├── BOOTSTRAP.md                #   Current-state snapshot
│   ├── ai-context/                 #   SESSION-*.md technical logs (+ archive/)
│   ├── work-log/                   #   LOG-*.md plain-English daily logs
│   ├── planning/                   #   PLAN, TODO, IMPL-SPEC, UI-SPEC, ARCH-DESIGN
│   └── documentation/              #   UI/UX specs, SETUP-GUIDE
├── Scratch/                        # Disposable prep material (git-ignored)
│   ├── archive/                    #   Referenced spec copies (unused)
│   └── ...                          #   Empty drafting stubs / prework
├── server/                         # Express + Mongoose REST API
│   ├── package.json                #   Server manifest & scripts
│   ├── package-lock.json           #   Dependency lock
│   ├── .env.example                #   Env template (committed)
│   ├── .env                        #   Real env (git-ignored; NOT shown)
│   ├── src/
│   │   ├── server.js               #   App entry point + middleware + routes
│   │   ├── config/
│   │   │   ├── env.js              #   Env loading/defaults
│   │   │   └── db.js               #   Mongoose connection
│   │   ├── models/                 #   User, EventPlan, PlanningItem, Event, EventItem
│   │   ├── controllers/            #   auth, user, planning, eventPlan, event, dashboard
│   │   ├── routes/                 #   authRoutes, userRoutes, planningRoutes,
│   │   │                           #   eventPlanRoutes, eventRoutes, dashboardRoutes
│   │   ├── middleware/             #   authMiddleware, errorMiddleware
│   │   ├── services/               #   planningService, eventPlanService,
│   │   │                           #   eventService, progressService
│   │   ├── utils/                  #   ApiError, asyncHandler, buildTree,
│   │   │                           #   withTx, scopeItemsForMember
│   │   └── seed/seed.js            #   Idempotent demo-data seeder
│   ├── scripts/
│   │   ├── db.js                   #   DB viewer CLI
│   │   └── dod-rehearsal.js        #   13-step Definition-of-Done HTTP rehearsal
│   └── test/
│       ├── acceptance.test.js      #   Build-spec acceptance tests (T-IDs)
│       └── http.test.js            #   HTTP-level API tests
└── client/                         # React + Vite + Tailwind SPA
    ├── package.json                #   Client manifest & scripts
    ├── package-lock.json           #   Dependency lock
    ├── .env.example                #   Env template (VITE_API_URL)
    ├── index.html                  #   Vite entry HTML
    ├── vite.config.js              #   Vite config (port 5173, host)
    ├── postcss.config.js           #   PostCSS (Tailwind)
    ├── tailwind.config.js          #   Tailwind theme
    ├── public/assets/              #   Static SVG logos
    ├── dist/                       #   Vite build output (generated, ignored)
    └── src/
        ├── main.jsx                #   React root render
        ├── App.jsx                 #   Router + protected routes
        ├── index.css               #   Tailwind directives + global styles
        ├── context/AuthContext.jsx #   Auth state provider
        ├── components/
        │   ├── Layout.jsx          #   App shell: sidebar, header, outlet
        │   └── common/             #   TreeView, Modal, Toast, chips, etc.
        ├── pages/                  #   Login, Dashboard, PlanningLibrary,
        │                           #   EventPlans, Calendar, ExecutionHub,
        │                           #   EventExecution
        ├── services/
        │   ├── api.js              #   Axios instance + interceptors
        │   └── authService.js      #   Auth API helpers + token handling
        └── utils/dates.js          #   Date formatting helpers
```

---

## 4. File & Directory Reference

Legend — **Type:** `runtime` (ships/executes), `config`, `tooling`, `testing`,
`documentation`, `deployment`, `governance`. **Generated:** Y/N.
**Modify:** Direct guidance.

### Root

| Path | Type | Purpose / Responsibility | Dependencies | Modification Guidance |
|---|---|---|---|---|
| `AGENTS.md` | governance | The project "rule book" — phase gates, logging, engineering rules | self-contained | **Governance policy. Do not weaken rules.** Owner-review only |
| `README.md` | documentation | Public project overview, problem, features, highlights | — | Edit freely to keep accurate |
| `SETUP.md` | documentation | Install/run/test/examiner guide | references server/client | Edit when setup changes |
| `.gitignore` | config | Ignore rules (Scratch, .env, node_modules, dist, etc.) | — | Edit carefully; keep secret ignore coverage |
| `OrganiShift.bat` | tooling | Windows dev launcher (Mongo check, both servers, browser) | npm scripts, MongoDB | Windows-only convenience; safe to edit |
| `docs/` | documentation | Human-facing technical docs | — | Add/keep accurate |

### governance/

| Path | Type | Purpose | Dependencies | Modification Guidance |
|---|---|---|---|---|
| `RULEBOOK.md` | governance | Master compliance rule book (PART I–III) | — | **Governance policy; owner-reviewed exceptions only** |
| `BOOTSTRAP.md` | governance | Current-state snapshot: phase, approvals, env versions | — | Refresh every session (mandatory) |
| `ai-context/SESSION-*.md` | governance | Technical session logs (next-AI audience) | prior sessions | Write deltas; keep latest 3, archive older |
| `work-log/LOG-*.md` | governance | Plain-English daily logs (human audience) | — | Append per day |
| `planning/*` | governance | PLAN, TODO, IMPL-SPEC, UI-SPEC, ARCH-DESIGN | frozen specs | Update when gate-approved scope changes |
| `documentation/*` | governance | UI/UX implementation specs, SETUP-GUIDE | — | Keep consistent with planning |

### server/

| Path | Type | Purpose | Dependencies | Modification Guidance |
|---|---|---|---|---|
| `package.json` | config | Manifest + scripts (`start/dev/seed/test/db`) | deps | Edit to add scripts/deps (with approval) |
| `package-lock.json` | config | Version-locked dependency tree | — | **Generated by npm; do not hand-edit** |
| `.env.example` | config | Env template (committed, safe) | — | Edit when adding env vars |
| `.env` | config | Real secrets/env (git-ignored) | — | **Never commit; contains secrets** |
| `src/server.js` | runtime | App entry: middleware, routes, 404, error handler | all modules | Approve changes (core) |
| `src/config/env.js` | runtime/config | Env loading + defaults; production JWT guard | dotenv | Edit for new env vars |
| `src/config/db.js` | runtime/config | Mongoose connection | env | Edit rarely |
| `src/models/*` | runtime | Mongoose schemas (User, EventPlan, PlanningItem, Event, EventItem) | mongoose | Approve schema changes (data model) |
| `src/controllers/*` | runtime | HTTP-only handlers, Zod validation, envelope shaping | services, zod | Keep short (~≤20 lines) |
| `src/routes/*` | runtime | Route + RBAC guard wiring | controllers, middleware | Edit for new endpoints |
| `src/middleware/authMiddleware.js` | runtime | JWT verify + `requireRole` | jwt, User | Approve (security) |
| `src/middleware/errorMiddleware.js` | runtime | Central error → envelope translation | ApiError | Edit for new error mapping |
| `src/services/*` | runtime | Business rules: tree ops, clone, progress, transactions | models, utils | Core business logic — approve |
| `src/utils/*` | runtime | `ApiError`, `asyncHandler`, `buildTree`, `withTx`, `scopeItemsForMember` | mongoose | Small utilities; edit as needed |
| `src/seed/seed.js` | tooling | Idempotent demo-data seeder (4 demo accounts) | models | Edit demo fixtures |
| `scripts/db.js` | tooling | DB viewer CLI (`npm run db`) | mongoose | Edit freely |
| `scripts/dod-rehearsal.js` | tooling | 13-step DoD HTTP rehearsal on isolated DB | app, models | Run for verification |
| `test/*.test.js` | testing | Acceptance + HTTP tests | node:test | Extend with new T-IDs |

### client/

| Path | Type | Purpose | Dependencies | Modification Guidance |
|---|---|---|---|---|
| `package.json` | config | Manifest + scripts (`dev/build/lint/preview`) | deps | Edit with approval |
| `vite.config.js` | config | Vite: react plugin, port 5173, host true | vite | Edit for build/dev config |
| `tailwind.config.js` | config | Tailwind theme (Inter font, card shadow) | tailwind | Edit for design tokens |
| `postcss.config.js` | config | PostCSS wiring (Tailwind/autoprefixer) | postcss/autoprefixer | Edit rarely |
| `index.html` | runtime | Vite HTML entry | — | Edit for meta/title |
| `public/assets/*` | runtime (static) | SVG logos | — | Replace freely |
| `dist/` | generated | Vite production build output | — | **Generated; ignore, never hand-edit** |
| `src/main.jsx` | runtime | React root render | react-dom | Edit rarely |
| `src/App.jsx` | runtime | Router + protected-route wrapper | react-router | Edit to add routes/guards |
| `src/context/AuthContext.jsx` | runtime | Auth state (user, loading, login, logout) | authService | Edit auth flows |
| `src/components/Layout.jsx` | runtime | App shell: sidebar, header, mobile drawer | api, auth | Edit nav/layout |
| `src/components/common/*` | runtime | Reusable UI: TreeView, Modal, Toast, chips, drawer, Dropdown | lucide | Reuse/extend components |
| `src/pages/*` | runtime | One component per route | api, auth, components | Feature work |
| `src/services/api.js` | runtime | Axios instance + interceptors (token attach, envelope unwrap) | axios | Core; edit carefully |
| `src/services/authService.js` | runtime | Auth API + localStorage token | api | Edit auth logic |
| `src/utils/dates.js` | runtime | Date formatting (relative dates) | — | Edit freely |

---

## 5. Governance & Engineering Policies

### Overview of the governance model

OrganiShift uses a **heavy project-governance regime** designed to direct AI
agents (and humans) through phase-gated development. The governance stack is:

1. **`AGENTS.md` (root)** — the "rule book" pointer carrying universal compliance
   rules verbatim plus a short project-specific section.
2. **`governance/RULEBOOK.md`** — the master compliance rule book (PART I–III),
   the canonical home of the rules. `AGENTS.md` reproduces the universal rules
   and must never contradict `RULEBOOK.md`; if they conflict, the stricter rule
   governs.
3. **`governance/BOOTSTRAP.md`** — current-state snapshot refreshed every
   session.
4. **`governance/ai-context/SESSION-*.md`** — technical session logs.
5. **`governance/work-log/LOG-*.md`** — plain-English daily logs.
6. **`governance/planning/*`** — PLAN, TODO, IMPL-SPEC, UI-SPEC, ARCH-DESIGN.

> Note: Standard GitHub governance files (`CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`,
> `SECURITY.md`, `LICENSE`, `CHANGELOG.md`, `CODEOWNERS`, issue/PR templates) are
> **not present** in this repository. This is **not determinable** as absent by
> design — they simply were not part of the solo-project governance model. The
> repository instead relies on the phase-gate governance in `AGENTS.md` /
> `RULEBOOK.md`.

### Phase gates (§F of AGENTS.md)

Development is driven through explicit, approval-gated phases:

```
DISCOVERY → CLARIFY → PLANNING → DESIGN FIXED → UI DESIGN CONFIRMED → CODING → TESTING → RELEASE → OPERATE
```

Each gate requires the owner's **explicit trigger phrase** to advance:

| Gate | Trigger phrase |
|---|---|
| DISCOVERY | "approve discovery" |
| PLANNING | "approve plan" |
| DESIGN FIXED | "approve design" |
| UI DESIGN CONFIRMED | "UI is final" / "confirm UI" / "start backend" |
| CODING | "code it" |
| TESTING | "run tests" / "test it" |
| RELEASE | "approve release" |

Vague input ("continue", "ok go") is **not** an approval. Only "code it" opens
CODING. This gate model is a **manual, convention-based** control — not
enforced by tooling; it relies on discipline.

### Rules each party must follow

- **AI agents (and this process):** plan-first/code-last; never jump gates; log
  every session; keep `Scratch/` disposable; keep production code at the ROOT;
  protect existing work (§J1); inspect before modifying (§J2); never destroy user
  work (§J3); ask before destructive ops (§J4); protect secrets (§J6); dependency
  discipline (§J7); no fake completion (§J10); evidence-based verification (§J13);
  report change summaries (§J15).
- **Developers:** follow the same rules. Concretely: never commit unless the
  owner asks (work stays staged + "staged, not committed"); never write secrets
  to tracked files; verify the environment before writing specs; bundle
  clarifying questions.

### Enforcement

- **Automatic:** `.gitignore` rules (secrets/build output never committed);
  `git check-ignore` verification before stage/commit; lint via `npm run lint`
  in the client (ESLint with `--max-warnings 0`).
- **Manual / convention-based:** phase gates, logging, code-review-by-agents,
  acceptance-criteria discipline. These rely on the owner and agents following
  the documented rules — there is no CI to enforce them automatically.

### Consequences of violation

The rule book treats violations as process failures: premature coding gets
reverted (Lesson §H.1); missed logging triggers "if the user says 'log it', that
means I missed a step"); unauthorized scope expansion or destructive ops require
a **STOP + bundled approval request**; critical security/data issues invoke
"stop-the-line" (§J0H).

### Governance Model summary

> **Technical governance here = documented, convention-enforced, phase-gated
> development policy.** It governs *how* code is produced and *when* it may
> proceed, enforced by discipline (not CI). The quality gates that *are*
> automated are the test suite and the ESLint build check.

---

## 6. Technology Stack

### Frontend

| Category | Technology | Evidence | Role |
|---|---|---|---|
| Framework | React 18 (`^18.3.1`) | `client/package.json` | SPA rendering |
| Build tool | Vite 5 (`^5.4.11`) | `client/package.json` | Dev server + production bundling |
| Routing | React Router 6 (`^6.28.1`) | `client/package.json`, `App.jsx` | Client-side routes |
| Styling | Tailwind CSS 3 (`^3.4.17`) | `tailwind.config.js`, `index.css` | Utility-first styling |
| Icons | Lucide React (`^0.469.0`) | `Layout.jsx`, pages | Icon library |
| HTTP | Axios (`^1.7.9`) | `services/api.js` | API calls + interceptors |
| Validation | Zod (`^3.24.1`) | client deps (shared pattern) | Client-side schema (auth) |
| Language | JavaScript (ESM) | `"type": "module"` | All client source |

### Backend

| Category | Technology | Evidence | Role |
|---|---|---|---|
| Language | JavaScript (CommonJS) | `server/package.json` `"type":"commonjs"` | Server source |
| Runtime | Node.js (v24.18.0 verified) | `SETUP.md` | Server execution |
| Framework | Express 4 (`^4.21.2`) | `server.js` | REST API framework |
| ODM | Mongoose 8 (`^8.9.5`) | `config/db.js`, models | Schema + data access |
| Auth | `jsonwebtoken` 9 | `authController.js`, `authMiddleware.js` | JWT issue/verify |
| Password hashing | bcryptjs 2 | `User.js` pre-save hook | Hash + compare |
| Validation | Zod 3 | controllers | Request body/query validation |
| Rate limiting | express-rate-limit 7 | `authRoutes.js` | Login brute-force protection |
| Env | dotenv 16 | `config/env.js` | Load `.env` |
| CORS | cors 2 | `server.js` | Cross-origin policy |

*(No message bus, background-job framework, or queue is used; no sockets/websockets
in Phase 1.)*

### Database

| Category | Technology | Evidence | Role |
|---|---|---|---|
| Engine | MongoDB (Server 8.3 verified locally) | `SETUP.md`, `config/db.js` | Document store |
| ODM | Mongoose 8 | models | Schema, validation, queries |
| Schema mgmt | Manual (no migration tool) | models + seed | Models define shape |
| Migration mechanism | **None / not determinable** | — | No migration framework present |
| Caching | **None** | — | No Redis/in-memory cache layer |

### Infrastructure / Deployment

| Category | Status |
|---|---|
| Cloud provider | **None** (local only) |
| Containers / Docker | **Not present** (no Dockerfile, no compose) |
| Kubernetes / Helm | **Not present** |
| Serverless / Terraform / CloudFormation | **Not present** |
| Reverse proxy / CDN / object storage | **Not determinable / not used** |
| TLS | **Not configured** (dev HTTP only) |

### Development Tooling

| Category | Technology | Evidence |
|---|---|---|
| Package manager | npm | `package-lock.json` files |
| Build | Vite (client) / Node (server) | scripts |
| Linter | ESLint (client, `--max-warnings 0`) | `client/package.json` `lint` script |
| Formatter | **Not configured** | no prettier config found |
| Testing | Node built-in test runner (`node --test`) | server scripts |
| Static analysis | **None beyond ESLint + Zod** | — |
| Git hooks / pre-commit | **Not configured** | no husky/lint-staged |

### DevOps / CI-CD / Observability

| Category | Status |
|---|---|
| CI/CD | **Not present** (no `.github/workflows`, no CI config) |
| Build pipelines | Local scripts only (`npm run build`, `npm test`) |
| Deployment mechanism | Manual local run |
| Release mgmt | Manual (gate-led) |
| Monitoring / logging / tracing / alerting | **Minimal** — `console.log`/`console.error` only; no structured logging, metrics, or APM |

### External Services

**None** beyond the local MongoDB server. No SaaS, payment, analytics, storage,
messaging, or AI providers are integrated at runtime.

### Technology selection rationale **[inference]**

- **MERN** provides a single language (JS) across the stack; MongoDB's document
  model fits tree-shaped checklists without joins (corroborated in `VIVA-NOTES.md`);
  React fits the dashboard-heavy UI.
- **Materialized paths** over adjacency lists / `$graphLookup` for the dominant
  whole-tree-read workload (see §11).
- **Zod** gives shared validation on both server (controllers) and client.
- **bcryptjs** = pure-JS bcrypt (no native build) — convenient for a demo/solo
  project.
- **Vite** for fast dev server + simple production build over CRA-style tooling.

---

## 7. Build System

### Overview

There is **no root-level build** orchestrating the whole repo. Each app builds
independently:

```
Server:  (no compilation) plain Node CJS  →  run directly, or run tests
Client:  Vite → dev server (HMR) or `vite build` → dist/ (static assets)
```

No transpilation (no TypeScript/Babel step for the server); the client is
handled by Vite/esbuild/rollup.

### Server

- **No build step.** The server runs directly with Node (`node src/server.js`),
  CommonJS modules.
- **Dev:** `npm run dev` → `node --watch src/server.js` (auto-restart on change).
- **Start:** `npm start` → `node src/server.js`.
- **Dependencies:** `npm install` in `server/` — reads `package.json` +
  `package-lock.json`.

### Client

- **Dev:** `npm run dev` → `vite` (port 5173, `host:true`), HMR.
- **Build:** `npm run build` → `vite build` → outputs to `client/dist/`.
- **Preview:** `npm run preview` → `vite preview`.
- **Lint:** `npm run lint` → `eslint . --ext js,jsx --report-unused-disable-directives --max-warnings 0`.
- Vite processes: JSX via `@vitejs/plugin-react`, CSS via PostCSS + Tailwind +
  autoprefixer, static assets from `public/`.

### Build flow diagram

```
Client source (.jsx/.css)
   → Vite (esbuild transpile JSX/ESM → rollup bundle)
   → Tailwind/PostCSS/autoprefixer (CSS)
   → dist/ (index.html + hashed JS/CSS + assets)
   → served statically or by dev server

Server source (.js CJS)
   → (no compile) npm start / npm test (node --test)
```

### Environment variables in build

- **Client build:** `VITE_API_URL` is inlined at build time from
  `client/.env` (via `import.meta.env`), default `http://localhost:5000/api`.
- **Server:** env read at runtime via dotenv (`server/.env`).

---

## 8. Runtime Architecture (Application Startup & Runtime Flow)

### Server startup

1. **Entry:** `server/src/server.js`.
2. Reads env via `config/env.js` (dotenv loads `server/.env`; production guards
   missing `JWT_SECRET`).
3. Creates the Express `app`.
4. **Middleware order:**
   - `express.json()` — parse JSON bodies.
   - `cors({ origin: env.CLIENT_ORIGIN, credentials: false })`.
5. **Health endpoint** `/api/health` (public) → `{ success, data: { db: true } }`.
6. Mounts routers: `/api/auth`, `/api/users`, `/api/planning-items`,
   `/api/event-plans`, `/api/events`, `/api/event-items` (alias), `/api/dashboard`.
7. Mounts the **404 handler** (falls through to `ApiError(404, ...)`).
8. Mounts the **central error middleware** (must be last).
9. `if (require.main === module)` → `connectDB()` (Mongoose connects to
   `MONGO_URI`) then `app.listen(env.PORT)`.
   - When imported by tests (`require('../src/server')`), it does **not**
     auto-listen; tests connect their own DB and spin their own HTTP server.

### Request flow

```
HTTP Request
   ↓
[any server] caller → Express
   ↓
express.json() + cors()
   ↓
Router (e.g. /api/event-plans)
   ↓
authMiddleware (verify Bearer JWT → load user)        ← Authentication
   ↓
requireRole('ADMIN', ...) (route-level RBAC)           ← Authorization (role)
   ↓
Controller (Zod parse body/query → call service)      ← Validation + orchestration
   ↓
Service (business rules; tree ops; transactions)       ← Business logic
   ↓
Mongoose Model → MongoDB                               ← Persistence
   ↓
Response shaped into { success, data, message }
   ↓
On error → errorMiddleware → { success:false, error:{...} }
```

### Client startup

1. `client/index.html` loads `src/main.jsx`.
2. `main.jsx` mounts `<App>` into the root element.
3. `App.jsx` wraps everything in `AuthProvider` (auth state) and `ToastProvider`,
   then a `BrowserRouter` with `<Routes>`.
4. `AuthProvider` on mount reads `localStorage 'token'`; if present, calls
   `authService.getMe()` to restore the user (loading state until resolved).
5. `ProtectedRoute` gates the `/dashboard` and other routes; unauthenticated
   users are redirected to `/login`, role-mismatch users to `/dashboard`.
6. `Layout` renders the sidebar/header shell and an `<Outlet>` for page content.
7. Each page component (Dashboard, PlanningLibrary, etc.) calls the API through
   the shared `api.js` Axios instance.

### Shutdown / cleanup

No explicit graceful-shutdown hooks are defined **[inference — no SIGINT/SIGTERM
handlers in server.js]**. `OrganiShift.bat` simply `taskkill`s the spawned
windows. Mongoose connections close when the process exits; tests close the
connection in `after()`.

---

## 9. Application Architecture

### Actual architecture

A **three-tier MERN monolith** with a **modular service layer** on the server:

```
┌─────────────────────────────┐
│   Client (React SPA)        │
│   pages / components / ctx  │
└──────────────┬──────────────┘
               │ REST/JSON (Bearer JWT)
┌──────────────▼──────────────┐
│   Express Server             │
│   routes  →  controllers     │  (HTTP + validation)
│      ↓                       │
│   services                   │  (business rules)
│      ↓                       │
│   models (Mongoose)          │
└──────────────┬──────────────┘
               │ MongoDB driver
┌──────────────▼──────────────┐
│   MongoDB (5 collections)    │
└─────────────────────────────┘
```

**Layers & responsibilities:**

- **Routes** — HTTP path + HTTP verb + guarded by `authMiddleware` +
  `requireRole(...)`. Thin.
- **Controllers** — parse/validate input (Zod), call services, shape the response
  envelope. Kept to ~≤20 lines (per governance).
- **Services** — business rules: tree construction (`planningService`), library→
  plan deep-copy (`eventPlanService`), plan→event scheduling clone
  (`eventService`), progress roll-up (`progressService`).
- **Models** — Mongoose schemas + pre-save hooks.
- **Middleware** — cross-cutting: auth/RBAC and error handling.
- **Utils** — shared helpers: `ApiError`, `asyncHandler`, `buildTree`, `withTx`,
  `scopeItemsForMember`.

### Dependency direction

Strict downward-only: `Routes → Controllers → Services → Models`. No circular
imports (governance mandates this; verified by inspection — controllers import
services, services import models, utils are shared leaves).

### Coupling / cohesion

- **High cohesion** per layer: each controller maps to one resource; each service
  owns one cohesive business concern.
- **Loose coupling** between layers: controllers don't know DB internals; views
  don't know business rules. But `buildTree` is used by both controller and
  service (slight layering blur).

### Intended vs. actual architecture

- **Intended** (per `ARCH-DESIGN.md` / `IMPL-SPEC.md`): exactly the layered
  three-tier + service model described above.
- **Actual:** matches the intent closely. Minor divergences:
  - `buildTree`, `scopeItemsForMember`, `withTx` are used from *both* controllers
    and services (utility helpers cross layers) — acceptable, not a structural
    violation.
  - The `/api/event-items` route is **mounted to the same `eventRoutes` router**
    as `/api/events` (`server.js:43`) as an alias — a small naming accommodation,
    not a design deviation.

---

## 10. Module Architecture

### Auth & Users module

```
Module: Auth & Users
├── Responsibility        Login/JWT, current-user, user CRUD + RBAC
├── Entry Points          POST /api/auth/login, GET /api/auth/me,
│                         GET/POST/PUT/DELETE /api/users(/:id)
├── Routes                authRoutes.js, userRoutes.js
├── Controllers           authController.js, userController.js
├── Services               (login logic inline in controller; no dedicated auth service)
├── Models                User.js
├── Middleware            authMiddleware.js (auth + requireRole)
├── Internal Dependencies ApiError, asyncHandler, env
├── External Dependencies jsonwebtoken, bcryptjs, zod
├── Data Flow             login: body → zod → find user → comparePassword →
│                         jwt.sign → { token, user }
├── Error Handling        generic 401; duplicate email 409 (controller); zod→400
│                         (errorMiddleware)
└── Tests                 acceptance.test.js, http.test.js
```

### Planning Library module

```
Module: Planning Library
├── Responsibility        Admin-only CRUD of master LIBRARY tree; read for others
├── Entry Points          /api/planning-items (+ /:id, /:id/move)
├── Routes                planningRoutes.js
├── Controllers           planningController.js
├── Services              planningService.js
├── Models                PlanningItem.js
├── Internal Dependencies ApiError, asyncHandler, buildTree, withTx
├── External Dependencies mongoose, zod
├── Data Flow             tree read: find(scope=LIBRARY) → buildTree; create/move
│                         maintain level/order/path; move re-paths subtree (Tx)
├── Error Handling        NOT_FOUND, VALIDATION_ERROR, CYCLE_DETECTED, 403 (ADMIN)
└── Tests                 acceptance (T-*) incl. tree ops + cycle rejection
```

### Event Plans module

```
Module: Event Plans
├── Responsibility        Plan CRUD + deep-copy import of library modules
├── Entry Points          /api/event-plans (/:id, /:id/items/from-library)
├── Routes                eventPlanRoutes.js
├── Controllers           eventPlanController.js
├── Services              eventPlanService.js
├── Models                EventPlan.js (+ PlanningItem PLAN scope)
├── Internal Dependencies ApiError, asyncHandler, buildTree, withTx
├── External Dependencies mongoose, zod
├── Data Flow             copyFromLibrary: find lib branch (regex on path) →
│                         for each lib item deep-copy into PLAN scope with
│                         idMap remap + sourceLibraryItemId (in Tx)
├── Error Handling        PLAN_NOT_FOUND / NOT_FOUND / 403 (ADMIN)
└── Tests                 acceptance (copy-from-library T-*)
```

### Calendar / Events module

```
Module: Calendar / Events
├── Responsibility        Event CRUD, event-from-plan scheduling (clone), calendar feed
├── Entry Points          /api/events (/:id, /:id/progress, /:id/items)
├── Routes                eventRoutes.js
├── Controllers           eventController.js
├── Services              eventService.js
├── Models                Event.js (+ EventItem)
├── Internal Dependencies progressService, buildTree, withTx,
│                         scopeItemsForMember, ApiError
├── External Dependencies mongoose, zod
├── Data Flow             scheduleFromPlan: create Event → for each PLAN item
│                         clone into EventItem with idMap remap + assignee (Tx)
├── Error Handling        PLAN_NOT_FOUND, NOT_A_LEAF, INVALID_TRANSITION, 403
└── Tests                 acceptance (schedule + execution + transitions)
```

### Execution module (Event Execution page)

```
Module: Event Execution
├── Responsibility        Per-event live checklist: status, assignee, priority, due
├── Entry Points          GET /api/events/:id, PUT /api/event-items/:id,
│                         DELETE /api/event-items/:id
├── Routes                eventRoutes.js (items nested)
├── Controllers           eventController.js (execution handlers)
├── Services              eventService.js, progressService.js
├── Models                EventItem.js, Event.js
├── Internal Dependencies withTx, scopeItemsForMember, buildTree
├── External Dependencies mongoose (edge name conflict — uses `path`)
├── Data Flow             status update → validate transition table → recalc
│                         progress → update event.progressPercent (Tx)
├── Error Handling        INVALID_TRANSITION, NOT_A_LEAF, FORBIDDEN (gating)
└── Tests                 acceptance (field gating, transitions, progress)
```

### Dashboard module

```
Module: Dashboard
├── Responsibility        Six counters + "My Assigned Work" + upcoming events
├── Entry Points          GET /api/dashboard/stats
├── Routes                dashboardRoutes.js
├── Controllers           dashboardController.js
├── Models                EventItem.js, Event.js
├── Services               (aggregation inline in controller; uses scopeItemsForMember)
├── Internal Dependencies scopeItemsForMember
├── Data Flow             load all EventItems (populate assignee) → scope for MEMBER
│                         → compute leaf counters → load events → overall/upcoming
├── Error Handling        (central middleware)
└── Tests                 acceptance (six counters, member scoping)
```

---

## 11. Data Architecture

### Entities & collections (5 collections)

```
users
  ├─ name, email (unique, lower, indexed), passwordHash (bcrypt), role
  ├─ isActive (soft delete), createdBy → users, timestamps

eventPlans
  ├─ title, description, category, isTemplate, createdBy → users, timestamps

planningItems            ← ONE collection, scope discriminator LIBRARY | PLAN
  ├─ title, description, operationalNotes, nodeType (FOLDER|TASK|MILESTONE)
  ├─ tags, checklist[], comments[], attachments[]
  ├─ parentId (self-ref, indexed), planId (ref eventPlans), scope
  ├─ path (materialized, indexed), level, order, sourceLibraryItemId
  ├─ createdBy, timestamps

events
  ├─ title, planId (ref eventPlans, indexed), startDate (indexed), endDate
  ├─ venue, status (PLANNED|ONGOING|DONE), progressPercent, createdBy, timestamps

eventItems                 ← execution copy of plan items
  ├─ eventId (ref events, indexed), parentId (self-ref), title, nodeType
  ├─ description, operationalNotes, tags, checklist[], comments[], attachments[]
  ├─ status (NOT_STARTED|IN_PROGRESS|COMPLETED|BLOCKED)
  ├─ assigneeId (ref users), priority (LOW|MEDIUM|HIGH|CRITICAL), dueDate
  ├─ path (materialized), level, order, createdBy, timestamps
```

### ER-style conceptual diagram

```
         creates
  User ───────────▶ EventPlan ────── owns ──────▶ PlanningItem (scope: PLAN)
  │  ▲                                                            ▲
  │  │ createdBy                               deep-copied from    │
  │  │                                          (withTx, idMap)    │
  │  └─────────────── assigns/E <── EventItem ◄─── owns ──┐       │
  │                                                       │       │
  │                       schedules                        │       │
  └──▶ Event ◄────────────────── EventPlan ◄───── PlanningItem (scope: LIBRARY)
        │  ▲                                   (one collection, discriminated)
        │  │ owns
        └──┴──▶ EventItem ◄── assignedTo ── User
```

### Tree storage strategy (materialized path)

- Each node stores `path = ",<ancestorIds>,<ownId>,"` (root: `,<id>,`).
- Subtree **read** = one regex query on `path` (e.g. `new RegExp(`,<id>,`)`).
- **Delete** cascades via the same regex inside a transaction (`withTx`).
- **Move** must re-path all descendants — done atomically in
  `planningService.moveItem` (tested, T-09).
- **Indexes:** `path` is indexed; `parentId`, `planId` indexed; `email` unique.

### Keys

- **Primary keys:** MongoDB `_id` (ObjectId) on every document.
- **Foreign keys (logical refs, no FKs):** `createdBy`, `planId`, `parentId`,
  `eventId`, `assigneeId`, `sourceLibraryItemId`.

### Migrations & seed

- **No migration tool.** Schema is defined in models and changes with code.
- **Seed:** `server/src/seed/seed.js` — idempotent (wipes then recreates users,
  plans, items, events). Creates 4 demo accounts (`admin/manager/member1/member2`
  at `@organishift.dev`, password `Password123!`).

### Data lifecycle

```
Input (HTTP body)
   ↓ Zod validation (controller)
   ↓ Mongoose schema validation (model)
   ↓ Service business logic (tree ops, clone, progress)
   ↓ Persistence (save/update; Tx via withTx where multi-document)
   ↓ MongoDB
```

### Validation & serialization

- **Input:** Zod schemas in controllers (required fields, lengths, enums, dates).
- **Model:** Mongoose required/minlength/maxlength/enum/default; pre-save hooks
  (e.g. bcrypt hash).
- **Serialization:** `User` schema `toJSON` transform strips `passwordHash`;
  controllers selectively omit sensitive fields.

---

## 12. API Architecture

### API overview

- **Base URL (dev):** `http://localhost:5000/api`.
- **Style:** REST-ish, JSON, fixed **envelope**.
- **No versioning** in the URL (no `/v1` prefix) — **not versioned**.
- **No pagination/sorting/filtering** beyond calendar `from`/`to` defaults —
  none elsewhere implemented.

### Envelope

```json
// success
{ "success": true, "data": { ... }, "message": "optional" }
// failure
{ "success": false, "error": { "code": "MACHINE_CODE", "message": "human", "details": [ ] } }
```

### Endpoint inventory

| Method | Endpoint | Purpose | Auth | Input | Output | Implementation |
|---|---|---|---|---|---|---|
| GET | `/api/health` | liveness probe | public | – | `{db:true}` | `server.js:28` |
| POST | `/api/auth/login` | login → JWT | public (rate-limited 20/15m) | `{email,password}` | `{token,user}` | `authController.login` |
| GET | `/api/auth/me` | current user | any (JWT) | – | `user` | `authController.getMe` |
| GET | `/api/users` | list active users | ADMIN/MANAGER | – | `[user]` | `userController.getUsers` |
| POST | `/api/users` | create user | ADMIN | `{name,email,password,role?}` | `user` (201) | `userController.createUser` |
| GET | `/api/users/:id` | get user | ADMIN | – | `user` | `userController.getUserById` |
| PUT | `/api/users/:id` | update user | ADMIN | `{name?,role?,isActive?}` | `user` | `userController.updateUser` |
| DELETE | `/api/users/:id` | soft-delete | ADMIN | – | message | `userController.deleteUser` |
| GET | `/api/planning-items` | list tree | ADMIN/MANAGER | `?scope=` | `[tree]` | `planningController.getItems` |
| POST | `/api/planning-items` | create item | ADMIN | `{title,nodeType?,scope,...}` | `item` (201) | `planningController.createItem` |
| GET | `/api/planning-items/:id` | get item | ADMIN/MANAGER | – | `item` | `planningController.getItemById` |
| PUT | `/api/planning-items/:id` | update item | ADMIN | `{title?,...}` | `item` | `planningController.updateItem` |
| PUT | `/api/planning-items/:id/move` | move node | ADMIN | `{newParentId}` | `item` | `planningController.moveItem` |
| DELETE | `/api/planning-items/:id` | delete subtree | ADMIN | – | message | `planningController.deleteItem` |
| GET | `/api/event-plans` | list plans | ADMIN/MANAGER | – | `[plan]` | `eventPlanController.getPlans` |
| POST | `/api/event-plans` | create plan | ADMIN | `{title,description?,category?}` | `plan` (201) | `eventPlanController.createPlan` |
| GET | `/api/event-plans/:id` | plan + tree | ADMIN/MANAGER | – | `{plan,items}` | `eventPlanController.getPlanById` |
| PUT | `/api/event-plans/:id` | update plan | ADMIN | `{title?,...}` | `plan` | `eventPlanController.updatePlan` |
| DELETE | `/api/event-plans/:id` | delete plan | ADMIN | – | message | `eventPlanController.deletePlan` |
| POST | `/api/event-plans/:id/items/from-library` | import module | ADMIN | `{libraryItemId}` | message | `eventPlanController.copyFromLibrary` |
| GET | `/api/events` | list events | any (JWT) | `?from&to` | `[event]` | `eventController.getEvents` |
| POST | `/api/events` | create event | ADMIN/MANAGER | `{title,planId,startDate,...}` | `event` (201) | `eventController.createEvent` |
| GET | `/api/events/:id` | event + execution tree | any (JWT) | – | `{event,items}` | `eventController.getEventById` |
| PUT | `/api/events/:id` | update event | ADMIN/MANAGER | `{title?,status?,...}` | `event` | `eventController.updateEvent` |
| DELETE | `/api/events/:id` | delete event | ADMIN | – | message | `eventController.deleteEvent` |
| GET | `/api/events/:id/progress` | progress roll-up | any (JWT) | – | `{eventProgress,items}` | `eventController.getEventProgress` |
| POST | `/api/events/:eventId/items` | add execution item | ADMIN/MANAGER | `{title,parentId?,priority?,dueDate?}` | `item` (201) | `eventController.addExecutionItem` |
| PUT | `/api/event-items/:id` | update exec item (status etc.) | any (JWT) field-gated | `{status?,assigneeId?,...}` | `item` | `eventController.updateExecutionItem` |
| DELETE | `/api/event-items/:id` | delete exec item | ADMIN/MANAGER | – | message | `eventController.deleteExecutionItem` |
| GET | `/api/dashboard/stats` | dashboard counters | any (JWT) | – | stats object | `dashboardController.getDashboardStats` |

### Error responses

Uniform via `errorMiddleware`:

| HTTP | Code | Meaning |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Zod/Mongoose validation failed |
| 400 | `INVALID_ID` | Bad ObjectId (CastError) |
| 400 | `CYCLE_DETECTED` / `NOT_A_LEAF` / `INVALID_TRANSITION` | Business-rule rejections |
| 401 | `UNAUTHORIZED` | Missing/invalid/expired token, bad creds, inactive user |
| 403 | `FORBIDDEN` | Role/field denial |
| 404 | `NOT_FOUND` / `*_NOT_FOUND` | Not found |
| 409 | `DUPLICATE_RESOURCE` | Unique key conflict |
| 429 | `TOO_MANY_REQUESTS` | Login rate limit |
| 500 | `INTERNAL_SERVER_ERROR` | Unexpected |

### Representative call trace — `GET /api/events/:id`

1. `express` route `/api/events/:id` → `eventRoutes.js:10`.
2. `router.use(authMiddleware)` (verify JWT, load user) → `authMiddleware.js`.
3. `eventController.getEventById(req,res)` — Zod not needed here (no body); loads
   `Event.find`, then `EventItem.find({eventId})` held in an in-memory map,
   builds tree via `buildTree`, applies `scopeItemsForMember` for MEMBER role,
   merges assignee (populate), returns `{event, items}`.

---

## 13. Authentication & Authorization

### Authentication ("who are you?")

- **Login:** `POST /api/auth/login` — Zod-validated `{email,password}`:
  - find user by (lowercased) email; generic `401` for bad email, inactive user,
    or wrong password (no user enumeration).
  - `bcrypt.compare` via `User.comparePassword`.
  - On success: `jwt.sign({ id, role }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN })`
    → returns `{ token, user }`.
- **Token:** JWT in the `Authorization: Bearer <token>` header.
- **Verification:** `authMiddleware` verifies the token, rejects on no/invalid
  header, then loads the full user by `decoded.id` and rejects if `!isActive`.
  Stored on `req.user`.
- **Token lifecycle:** signed with `id`+`role` only; expiry from
  `JWT_EXPIRES_IN` (default `24h`). **No refresh-token mechanism, no server-side
  session/revocation** — tokens are stateless JWTs (logout is client-only
  `localStorage` removal).
- **Password storage:** bcrypt (cost 10) via `User` pre-save hook; `passwordHash`
  stripped from all serializations via schema `toJSON`/`toObject` transform.

### Authorization ("what are you allowed to do?")

Two layers, **both enforced on the API** (not just the UI):

1. **Route-level RBAC** — `requireRole('ADMIN', ...)` middleware. E.g.
   `planningRoutes.js` uses `requireRole('ADMIN')` for writes, `ADMIN/MANAGER`
   for reads; `userRoutes.js` ADMIN for writes.
2. **Field-level rules in services** — e.g. only MANAGERs may change
   `assigneeId/priority/dueDate`; MEMBERs only update status of their own branch
   (enforced within `eventService` / `execution` handlers). Status changes go
   through a **transition table** (`NOT_STARTED→IN_PROGRESS/BLOCKED` etc.,
   replicated in client `EventExecution.jsx`).

**(Authentication here also serves as the bearer credential for "who"; the three
roles then gate "what".)**

### Object-level / scoped access

- **MEMBER scoping (§2.7):** a member sees an execution item only if they own it
  (assignee of the item or an ancestor) plus descendants of the owned node, plus
  ancestor rows for context — implemented in `utils/scopeItemsForMember.js` and
  used by the dashboard + event view. This is a form of **object-level
  authorization** (BOLA mitigation) on the execution tree.

### Protected routes (client)

- `App.jsx` `ProtectedRoute` redirects to `/login` when unauthenticated and to
  `/dashboard` on role mismatch. Access is still server-gated regardless of UI.

### Secrets

- `JWT_SECRET` from env; **production throws** if not set (`env.js`). Dev fallback
  is a clearly-marked insecure constant.

### Potential weaknesses (evidence-based, non-exploitative)

- **Stateless JWTs with no revocation/refresh** — a leaked token is valid until
  expiry; logout is cosmetic on the server. **[note — not a claim of a live
  exploit]**
- **`isActive` gating** guards login and `authMiddleware`, which mitigates
  disabled accounts on API use. **[good]**
- JWT payload carries `role` but authorization *also* loads the user from DB and
  uses `req.user.role` — so the JWT role claim is **not** trusted directly for
  the effective check (defense-in-depth). **[good]**

---

## 14. Configuration & Environment Management

### Mechanisms

- **Server:** `server/.env` loaded by `dotenv` in `config/env.js`
  (`path.join(__dirname, '../../.env')` → `server/.env`). Defaults applied in
  code.
- **Client:** `client/.env` with `VITE_API_URL` (inlined at build time via Vite
  `import.meta.env`; default `http://localhost:5000/api`).
- **Test:** tests derive a separate DB name by replacing the last path segment
  of `MONGO_URI` (e.g. `organishift_test`, `organishift_test_http`) — see
  `acceptance.test.js:23`, `http.test.js:29`.

### Configuration inventory

| Variable | Purpose | Required | Default | Used by | Sensitive |
|---|---|---|---|---|---|
| `PORT` | API listen port | no | `5000` | `server.js` | no |
| `MONGO_URI` | MongoDB connection | no | `mongodb://127.0.0.1:27017/organishift` | `db.js` | maybe (creds) |
| `JWT_SECRET` | JWT signing secret | **yes in prod** | dev fallback (insecure) | `authController`/`authMiddleware` | **yes** |
| `JWT_EXPIRES_IN` | token lifetime | no | `24h` | `authController` | no |
| `CLIENT_ORIGIN` | CORS allowed origin | no | `http://localhost:5173` | `server.js` | no |
| `NODE_ENV` | `development`/`production` | no | `development` | `env.js`/`errorMiddleware` | no |
| `VITE_API_URL` | client base URL | no | `http://localhost:5000/api` | `api.js` | no |

> Secret values are NOT reproduced here and real `.env` files are
> git-ignored (see `.gitignore`). Only `.env.example` templates are committed.

### Secrets handling

- `.env` and `.env.*` and `**/.env*` are git-ignored; `!.env.example` /
  `!**/.env.example` allow templates.
- Before any stage/commit, the project rule is to verify ignore coverage with
  `git check-ignore -v <env file>`.

---

## 15. Dependency Architecture

### Server dependencies (`server/package.json`)

| Package | Version | Type | Role |
|---|---|---|---|
| `express` | ^4.21.2 | runtime | HTTP framework |
| `mongoose` | ^8.9.5 | runtime | ODM + schema |
| `jsonwebtoken` | ^9.0.2 | runtime | JWT create/verify |
| `bcryptjs` | ^2.4.3 | runtime | password hashing (pure JS) |
| `zod` | ^3.24.1 | runtime | input validation |
| `cors` | ^2.8.5 | runtime | cross-origin |
| `dotenv` | ^16.4.7 | runtime | env loading |
| `express-rate-limit` | ^7.5.0 | runtime | login throttling |

### Client dependencies (`client/package.json`)

**Runtime:** `react` ^18.3.1, `react-dom` ^18.3.1, `react-router-dom` ^6.28.1,
`axios` ^1.7.9, `lucide-react` ^0.469.0, `zod` ^3.24.1.
**Dev:** `vite` ^5.4.11, `@vitejs/plugin-react` ^4.3.4, `tailwindcss` ^3.4.17,
`postcss` ^8.4.49, `autoprefixer` ^10.4.20.

### Management strategy

- **Version pinning:** semver ranges (`^`), with `package-lock.json` files for
  exact resolution.
- **No root workspace** — two independent `node_modules` trees (server + client),
  installed separately per `SETUP.md`.
- **Notable transitive presence** (from `node_modules`): esbuild, rollup,
  postcss, autoprefixer, browserslist, etc. — normal Vite/Tailwind toolchain.
- **No dedicated backend test/assert framework** — uses Node's built-in
  `node:test` + `node:assert` (no jest/mocha) — a deliberate lighter choice.

### Architectural role of key dependencies

- **Zod on both tiers** gives a single validation vocabulary shared conceptually
  between client and server.
- **bcryptjs over node's native `bcrypt`** avoids native compilation (portable,
  simpler for a demo).
- **Mongoose** provides the schema/validation that partially substitutes for a
  separate migration tool.

---

## 16. Testing Strategy

### Test artifacts

| File | Kind | What it does |
|---|---|---|
| `server/test/acceptance.test.js` | Acceptance (service-level) | Build-spec acceptance tests keyed to T-IDs (e.g. tree ops, cycle rejection, copy-from-library, progress, transitions, member scoping) |
| `server/test/http.test.js` | HTTP / integration | Boots the real Express app on an ephemeral port, drives requests with real JWT tokens, asserts status + envelope |
| `server/scripts/dod-rehearsal.js` | E2E-style rehearsal | Spins up the app on an isolated DB and drives the 13-step Definition-of-Done scenario over HTTP |

### Command

```
cd server
npm test        # node --test --test-force-exit test/acceptance.test.js test/http.test.js
```

- Reported result: **40/40 passing** (BOOTSTRAP).
- **Test DB:** derived from `MONGO_URI` with `_test` / `_test_http` suffix;
  tests clean collections in `beforeEach`/`before`.
- **Auth in tests:** real JWT tokens signed for seeded test users.
- **Coverage:** **not reportable** — no coverage tooling is configured, so no %
  can be claimed.

### What is tested well

- Roles/RBAC denial (401/403) at both route and field level.
- Tree build/move/cycle rejection.
- Library→plan→event cloning and deep-copy integrity.
- Status transition table + progress recalculation.
- Member-scoped visibility.
- Envelope + error-code contract via HTTP tests.

### Coverage gaps (evidence-based)

- **Client has no tests** (no unit/component/E2E for React).
- **No coverage threshold/metrics** configured.
- **No visual/regression tests.**
- Progress service relies on a recursive recompute on whole tree (correctness
  intent, but not `$graphLookup`).

---

## 17. Code Quality & Standards

- **Linter:** ESLint on the client only (`npm run lint`, `--max-warnings 0`).
  No ESLint config for the server.
- **Formatter:** **Not configured** — no Prettier/EditorConfig found.
- **Type checking:** none (plain JS; Zod provides runtime validation, not types).
- **Tab/indent/semicolon conventions:** implied by the codebase (2-space,
  semicolons in server CJS; client JSX follows Vite defaults).
- **Folder conventions:** enforced by governance — `routes → controllers →
  services → models`, `utils`, `middleware`. Controllers short (~≤20 lines).
- **Commit conventions:** no conventional-commits tooling; git policy is
  conservative (owner triggers commits; secrets must be ignored/verified).
- **Pre-commit hooks:** **none**.
- **Server lint/static analysis gap:** the server has no automated linter in its
  scripts — quality relies on review + tests.

---

## 18. CI/CD

**Not present.** There is no `.github/` directory, no workflow YAML, no `.gitlab-ci.yml`,
no Jenkins pipeline, no build-automation service configuration anywhere in the
repository.

What exists is **local, manual** automation:

- `npm test` (server acceptance + HTTP).
- `npm run build` (client production build) + `npm run lint`.
- `OrganiShift.bat` dev launcher.
- `server/scripts/dod-rehearsal.js` for the 13-step DoD rehearsal.

**Consequence:** the "CI quality gates" are run by hand/per convention; there is
no automated gate on push/PR. This is a notable gap for a codebase this size.

---

## 19. Deployment Architecture

- **Deployment target:** **None configured.** No cloud host, Docker host,
  Kubernetes, serverless, or platform config.
- **Deployment lifecycle:** commit → (manual) build → (manual) run. The
  "production" posture today is running the Vite build + Express server locally.
- **Environments:** `development`/`production` distinguished only via
  `NODE_ENV` for error verbosity and the JWT_SECRET guard. No staging.
- **Health check:** `GET /api/health` (liveness). No readiness probe, TLS,
  domains, scaling, replicas, or rollback tooling.
- **Gate:** deployment is explicitly gated by the RELEASE gate ("approve
  release") per governance; **not yet approved** per BOOTSTRAP.

---

## 20. Docker / Infrastructure

**Not present.** No `Dockerfile`, no `docker-compose.yml`, no container-related
infrastructure, no Kubernetes/Helm/Terraform/CloudFormation in the repository.

`SETUP.md` describes running on bare Node + local MongoDB (Windows service). So
containerization is currently **not used** — deployment/orchestration content is
**not determinable** beyond local execution.

---

## 21. Observability

- **Logging:** plain `console.log` / `console.error` — e.g. DB connect message
  (`db.js`), server start, `[SERVER ERROR]` stack in non-production
  (`errorMiddleware.js`). No structured logging (no pino/winston), no log levels
  beyond implicit, no log correlation IDs.
- **Metrics / tracing / APM:** **none.**
- **Error tracking:** **none** (no Sentry etc.).
- **Health endpoint:** `GET /api/health` — a basic liveness signal.
- **Operational visibility:** minimal; acceptable for a demo but insufficient
  for production assumptions (label accordingly).

---

## 22. Error Handling

### Architecture

A **single central error middleware** (`middleware/errorMiddleware.js`) is the
final Express handler. Errors flow: any controller/service throws `ApiError` (or
other error), `asyncHandler` forwards it via `next(err)`, the middleware maps it
to an envelope and HTTP status.

### Error-type mapping (evidence)

| Error source | How detected | Result |
|---|---|---|
| Zod validation | `err.name === 'ZodError'` | 400 `VALIDATION_ERROR`, `details` field map |
| Mongoose validation | `ValidationError` | 400 `VALIDATION_ERROR` |
| Duplicate key | `err.code === 11000` | 409 `DUPLICATE_RESOURCE` |
| Bad ObjectId | `CastError` | 400 `INVALID_ID` |
| Business rules | `ApiError(status, code, ...)` | specified status/code |
| Unexpected / 500 | fallback | 500 `INTERNAL_SERVER_ERROR` |
| 404 path | final 404 handler | 404 `NOT_FOUND` |

### Consistencies

- Envelope is uniform; `details` only present when provided.
- Stack trace logged only in non-production AND only for 500s (`errorMiddleware.js:45`).

### Gaps / inferences

- **Non-JSON/body-parse errors** (malformed JSON) would surface as `500` or
  generic rather than a specific 400 code **[inference — not a dedicated body
  parse error handler]**.
- **Async code without `asyncHandler`** would not be caught — but all handlers
  use `asyncHandler`, so risk is low.
- **Auth middleware** catches its own errors and forwards them.

---

## 23. Security Review

> Scope: repository-level static review only. No exploitation was performed.
> Findings are evidence-grounded and labeled by severity.

### Findings

| Severity | Finding | Evidence | Detail / Recommendation |
|---|---|---|---|
| **Medium** | Dev-only insecure JWT fallback | `env.js:12` | If `NODE_ENV !== 'production'`, falls back to `'dev-only-insecure-secret-change-me'`. Acceptable in dev; the production throw mitigates real risk. Ensure prod always sets `JWT_SECRET`. |
| **Medium** | Stateless JWT, no revocation/refresh | `authController.js` | Tokens valid until expiry (24h); logout is client-side only. For production, add token version/revocation (DB-side) or short-lived tokens + refresh. **[inference]** |
| **Low** | Potential `path` field name collision | `EventItem.js` | The `path` regex-based tree field; existing field named `path` may collide with Mongoose/MongoDB helpers. Verify before extending. |
| **Low** | No CSRF protection | 3-tier + Bearer tokens | SPA uses Bearer tokens (not cookies), so CSRF risk is limited; if cookies were used, CSRF would be needed. **[inference]** |
| **Low** | CORS `credentials:false`, origin allow-listed | `server.js:20-25` | `CLIENT_ORIGIN` explicit (good). `credentials:false` disables cookies. Fine for the Bearer-token model. |
| **Low** | No request size / body limits beyond defaults | `server.js:19` | `express.json()` default limit applies; consider explicit limit for uploads later. |
| **Info** | No security headers (helmet) | `server.js` | Not present; consider `helmet` for production hardening. |
| **Info** | Password stored via bcrypt correctly | `User.js` | Good — cost 10, pre-save hook, stripped from output. |
| **Info** | No rate limiting beyond login | `authRoutes.js` | Only login is rate-limited (20/15m). Other endpoints unprotected. Consider API-wide rate limiting for production. |
| **Info** | No server lint | `server/package.json` | No ESLint for server; static-analysis gap. |
| **Positive** | Email lowercased + unique; passwords hashed; errors generic on login; no user enumeration; `passwordHash` never serialized. | various | Solid security defaults. |

### Injection / SSRF / deserialization

- **No SQL injection** — MongoDB via Mongoose with parameterized queries.
- **No SSRF / file-upload / deserialization** attack surface in Phase 1 (no
  external URL fetching, no upload endpoint wired in MVP; attachments fields
  exist in schema but no handler found).
- **XSS:** React escapes by default; no `dangerouslySetInnerHTML` found by
  inspection **[inference from code scan]**.

### Secrets in repo

- **No real secrets found in tracked files.** `.env` files are git-ignored;
  only `.env.example` templates are committed. Demo credentials are
  `@organishift.dev` test accounts (documented, not secrets).

---

## 24. Design Patterns

| Pattern | Where | Why | Benefits | Drawbacks |
|---|---|---|---|---|
| **Layered/REST three-tier** | `routes→controllers→services→models` | Separation of concerns, testability | Clear responsibilities, downward deps | Boilerplate; some logic still in controllers |
| **Service layer (business logic)** | `services/*` | Move business rules out of HTTP handlers | Testable, singular authority | Extra files/indirection for tiny ops |
| **Middleware** | `authMiddleware`, `errorMiddleware` | Cross-cutting auth + error handling | DRY, declarative | Order sensitivity |
| **`asyncHandler` wrapper** | `utils/asyncHandler.js` | Uniform async error forwarding | No try/catch repetition | Slight indirection |
| **Repository/DAO (via Mongoose)** | `models/*` + services | Encapsulate data access | Swappable persistence, validation | Leaky at tree logic |
| **Factory-ish model instantiation** | `new Model` in services/controllers | Clear doc creation | Readable | Minor duplication |
| **Transaction wrapper** | `withTx` | Atomic multi-doc ops with graceful fallback | Portable | Fallback disables atomicity on standalone |
| **Strategy-ish progress calc** | `progressService.recalculate` | Single progress algorithm reused | Consistent roll-up | Recursive overhead on large trees |
| **Materialized path tree (data pattern)** | `path` field + `buildTree` | Efficient subtree ops | Single-query subtree | Re-path cost on moves |

*(No GoF factory/strategy/adapter/singleton beyond the above — patterns are not
forced where absent.)*

---

## 25. Important End-to-End Flows

### Flow A — Login
```
POST /api/auth/login
 → loginLimiter (rate limit)
 → authController.login
   → zod parse {email,password}
   → User.findOne(email lower)
   → user.comparePassword(password)
   → jwt.sign({id, role}, SECRET, {expiresIn})
 → res { success, data: { token, user } }
```
File: `server/src/controllers/authController.js`.

### Flow B — Library → Plan import (deep copy)
```
POST /api/event-plans/:id/items/from-library  {libraryItemId}
 → eventPlanController.copyFromLibrary
 → eventPlanService.copyFromLibrary(planId, libraryItemId, userId)
   → verify plan + lib item scope
   → withTx:
       find library branch (regex on path)
       for each libItem (level asc):
         remap parentId via idMap
         create PLAN-scope PlanningItem clone (sourceLibraryItemId set)
         re-link parents, save with session
 → 201 message
```
File: `server/src/services/eventPlanService.js`.

### Flow C — Schedule an event from a plan (clone)
```
POST /api/events {title, planId, startDate, ...}
 → eventController.createEvent
 → eventService.scheduleFromPlan
   → verify plan
   → withTx:
       create Event (PLANNED, progress 0)
       for each PLAN-scope planningItem:
         remap parent via idMap → create EventItem clone
       (optionally assign default assignee)
   → recalc progress
 → 201 {event}
```
File: `server/src/services/eventService.js`.

### Flow D — Member updates a task status (field-gating + progress)
```
PUT /api/event-items/:id {status}
 → authMiddleware (any role)
 → eventController.updateExecutionItem
   → field gating: assignee/priority/due only MANAGER;
     status only within transition table; MEMBER limited to own branch
   → update item
   → progressService.recalculate(eventId) → updates event.progressPercent
 → {success, data}
```
Files: `server/src/controllers/eventController.js`,
`server/src/services/progressService.js`.

### Flow E — Dashboard (six counters + member scoping)
```
GET /api/dashboard/stats
 → dashboardController.getDashboardStats
   → EventItem.find({}).populate('assigneeId')
   → if MEMBER: scopeItemsForMember(items, user._id)
   → compute leaf counters (total/completed/inProgress/blocked/pending/overdue)
   → Event.find({}) → overallProgress (avg), upcomingEvents (non-DONE, ≤5)
   → "My Assigned Work" leaves assigned to caller + transition options
 → { success, data: {...} }
```
File: `server/src/controllers/dashboardController.js`.

---

## 26. Architectural Decisions

| # | Decision | Evidence | Reasoning **[inference unless noted]** | Advantages | Trade-offs | Alternatives |
|---|---|---|---|---|---|---|
| 1 | MERN + three-tier service layer | `ARCH-DESIGN.md`, code layout | Single language; fits tree UI; separation | Testability, clear deps | Boilerplate | MEAN, JAMstack, microservices (overkill) |
| 2 | Materialized-path trees | `path` field, `withTx`, `buildTree` | Dominant op = whole-tree read/delete as single query | Single-query subtree; no recursion per read | Move re-paths O(descendants); manual invariant | `$graphLookup`, adjacency list, nested sets |
| 3 | One `planningItems` collection, `scope` discriminator | model + services | Library & plan are same entity at two stages | Fewer collections, shared ops | Scope must be respected everywhere | Two collections |
| 4 | API-only, field-level authorization | routes + `requireRole` + service gating + `scopeItemsForMember` | UI hiding is cosmetic; security at the boundary | Defense-in-depth, curl-reproducible | More code in services | UI-first auth (rejected) |
| 5 | Child-average progress roll-up | `progressService.recalculate` | Simple, deterministic, spec-mandated | Easy to reason about | Unweighted; recursive recompute | Weighted progress (out of scope) |
| 6 | `withTx` graceful fallback | `withTx.js` | Works on standalone dev Mongo AND real replica sets | Portable across environments | Silent atomicity loss on standalone | Always-require replica set (breaks dev) |
| 7 | No refresh tokens / stateless JWT | `authController`, `authMiddleware` | Simplicity, no server session store | Stateless, scalable | No revocation until expiry | Refresh tokens, sessions |
| 8 | Node built-in test runner | `server/package.json` | Zero extra deps, spec-aligned | No tooling overhead | Fewer features than jest | Jest/Mocha (heavier) |
| 9 | Vite + Tailwind + Lucide | client deps | Fast dev, utility styling, lightweight icons | Fast DX | — | CRA, Material UI |
| 10 | No CI/CD in repo | absent `.github/` | Solo project, local verification | Simplicity | No automated gates | GitHub Actions (add for rigor) |

*(Decision #3 and #6 are confirmed as deliberate in `DATA-MODEL.md`/`VIVA-NOTES.md`;
others are inferred labelled accordingly.)*

---

## 27. Development Workflow

### Prerequisites (verified)
- **Node.js 24+** (24.18.0 verified), **npm 11+** (11.16.0).
- **MongoDB Server 8.3** running (Windows service: `sc query MongoDB`).
- Git repo initialized (branch `v1`).

### Setup
```
# 1. Install (no root package.json)
cd server && npm install
cd ../client && npm install

# 2. Env (templates committed; real .env git-ignored)
copy server\.env.example server\.env     # edit JWT_SECRET etc.
copy client\.env.example client\.env     # optional; VITE_API_URL default works

# 3. Seed demo data (idempotent)
cd server && npm run seed

# 4. Run
#    Option A: launcher
OrganiShift.bat
#    Option B: manually (two terminals)
cd server && npm run dev      # API on :5000
cd client && npm run dev      # client on :5173

# 5. Open http://localhost:5173
```

### Tests
```
cd server && npm test
```

### Lint / build
```
cd client && npm run lint
cd client && npm run build
cd client && npm run preview
```

### DB viewer
```
cd server && npm run db            # overview
cd server && npm run db users      # collection dump
```

### DoD rehearsal
```
cd server && npm run dod           # if wired via package.json (run script directly: node scripts/dod-rehearsal.js)
```

### Feature workflow (per governance)
1. Confirm gate (plan → design → UI → **"code it"**).
2. Implement module slice (UI → DB → wiring).
3. Test + build + lint.
4. Do **not** commit; report "staged, not committed" and let owner commit.
5. Log session + refresh BOOTSTRAP.

---

## 28. Developer Onboarding Guide

### Day 1
- Read `README.md`, `SETUP.md`, `docs/API-DOCS.md`, `docs/DATA-MODEL.md`.
- Skim `AGENTS.md` §A/F and `governance/BOOTSTRAP.md` for the phase model.
- Get the app running locally (log in with the seeded demo accounts).
- Run the test suite and client build to confirm a clean baseline.

### First week — modules to study
1. **Auth:** `server/src/controllers/authController.js`, `server/src/middleware/authMiddleware.js`,
   `client/src/context/AuthContext.jsx`, `client/src/services/authService.js`.
2. **Tree model:** `server/src/models/PlanningItem.js`, `server/src/utils/buildTree.js`,
   `server/src/utils/withTx.js`, `docs/DATA-MODEL.md`.
3. **Clone pipeline:** `server/src/services/eventPlanService.js`,
   `server/src/services/eventService.js` (library→plan→event).
4. **Progress:** `server/src/services/progressService.js`.
5. **UI:** `client/src/App.jsx`, `client/src/components/Layout.jsx`,
   `client/src/components/common/TreeView.jsx`, the six pages.

### Before making changes
- Respect phase gates; do not jump to coding without approval ("code it").
- Keep controllers short; business rules in services; import direction downward.
- Do not commit; do not touch `.env`; verify ignore rules before staging.
- Never write secrets to tracked files.
- Preserve existing behavior unless the active gate authorizes change (§J1/§J2).

### Common tasks — quick commands
| Task | Command |
|---|---|
| Start dev (API) | `cd server && npm run dev` |
| Start dev (client) | `cd client && npm run dev` |
| Run tests | `cd server && npm test` |
| Build | `cd client && npm run build` |
| Lint | `cd client && npm run lint` |
| Seed DB | `cd server && npm run seed` |
| DB inspect | `cd server && npm run db [collection] [limit]` |
| One-shot everything | `OrganiShift.bat` |

*(No docker/`docker compose` commands — not used.)*

---

## 29. Technical Debt & Improvement Opportunities

| Issue | Evidence | Impact | Priority | Recommended Action |
|---|---|---|---|---|
| No client tests | `client/` has no test files | Regression risk in UI | High | Add Vitest + React Testing Library for pages/components |
| No CI/CD | no `.github/`, no CI config | No automated quality gate | High | Add GitHub Actions: lint → test → build on push/PR |
| No server lint | server scripts lack `eslint` | Static-analysis gap on backend | Medium | Add ESLint to server, wire to `npm` script |
| No formatter / EditorConfig | no prettier/editorconfig | Inconsistent style | Low | Add Prettier + EditorConfig |
| No migrations | schema changes by code only | Upgrade/rollback risk | Medium | Adopt a migration tool (e.g. migrate-mongo) or document manual migration |
| Duplicate tree/leaf logic | `buildTree`/`scopeItemsForMember` reused in controllers + services | Layering blur | Low | Consolidate into services |
| Recursive progress recompute | `progressService` recomputes whole tree each update | Scales poorly on large trees | Medium | Cache progress or compute incrementally |
| No structured logging / observability | plain `console.*` | Ops blind spots | Medium | Add structured logger + health/ready endpoints |
| Security headers missing | no `helmet` | Hardening gap | Low | Add `helmet` |
| Rate limiting only on login | only `authRoutes` limited | Abuse of other endpoints | Medium | Add API-wide rate limit |
| No CSRF (cookies not used) + stateless JWT | see §23 | Token revocation gap | Medium | Token versioning / shorter TTL |
| Demo/uncommitted state | BOOTSTRAP: work local + uncommitted | Continuity risk | High | Commit per owner workflow once approved |

---

## 30. Performance & Scalability

### Observed issues (evidence, not speculation)
- **Whole-tree recompute on every status change** — `progressService.recalculate`
  fetches all `EventItem` for the event and recursively reconciles every node on
  each update (`EventItem.find({eventId})` + recursive parents). Fine for MVP;
  O(N) per edit.
- **`EventItem.find({eventId})` / whole-collection loads** in dashboard
  (`EventItem.find({})` then in-memory scoping) — loads *all* event items for
  every dashboard call, then filters in JS. Fine at MVP scale; not scalable.
- **Whole-tree fetch per plan/event view** — intentional materialized-path trade
  (single query, but returns full subtree).

### Potential future risks
- Large libraries / many events → unbounded `find({})` + in-memory aggregation.
- No caching layer; each render refetches.
- No pagination on tree/list endpoints.
- Recursive JS progress computation on deeply nested trees.

### Horizontal scaling / statelessness
- Server is **stateless** (JWT, no in-memory session) → horizontally scalable in
  principle; no container/load-balancer present to exploit it.
- DB (MongoDB) is a single instance locally; no replica set (per `withTx`
  fallback design).

*(Separate observed vs. potential is maintained throughout.)*

---

## 31. Integration & Dependency Map

```
Application (Express + React)
 ├── MongoDB (local :27017)          — primary store · failure = app unusable
 ├── (no separate cache)
 ├── (no auth provider — self-contained JWT)
 ├── (no external APIs)
 ├── (no object storage)
 └── (no messaging / queues)
```

| External dependency | Purpose | Failure impact | Notes |
|---|---|---|---|
| MongoDB | All persistence | Total outage | Startup fails (`db.js` exits code 1) |
| (None other) | — | — | Self-contained; no third-party runtime deps |

---

## 32. Risk Register

| Risk | Probability | Impact | Evidence | Mitigation |
|---|---|---|---|---|
| UI regression from untested client | Med | Med | no client tests | Add component/E2E tests |
| Token theft / no revocation | Low-Med | High | stateless JWT, 24h | Shorter TTL, token versioning |
| Dev-secret fallback in prod misconfig | Low | High | `env.js` throws in prod | Keep prod throw + CI check |
| Uncommitted work loss | Med | High | BOOTSTRAP "local + uncommitted" | Follow owner commit workflow |
| Schema drift without migrations | Med | Med | no migration tool | Adopt migrations |
| Single-DB/no-replica set | Low | Med | `withTx` fallback | Provision replica set for prod |
| Solo maintainer knowledge loss | Med | Med | heavy docs (good) | Keep docs/ logs current |
| No rate limits beyond login | Med | Med | `authRoutes` only | Add API-wide limiting |
| SQL/NoSQL injection | Low | High | Mongoose parameterized | Keep using Mongoose, review queries |

---

## 33. Glossary

| Term | Meaning |
|---|---|
| **MERN** | MongoDB + Express + React + Node stack |
| **Planning Library** | Admin-curated master tree of modules (scope `LIBRARY`) |
| **Event Plan** | Blueprint assembled from library modules (scope `PLAN`) |
| **Event** | A scheduled, dated instance of a plan |
| **Execution / EventItem** | The live per-event checklist copy with status/assignee |
| **Materialized path** | Storing each node's ancestor chain in `path` for O(1)-ish subtree queries |
| **scope** | Discriminator `LIBRARY`\|`PLAN` on `planningItems` |
| **progressPercent** | Auto-computed child-average roll-up (0–100) |
| **DoD** | Definition of Done — the 13-step acceptance scenario |
| **T-ID** | Task/acceptance identifiers from the build spec (e.g. T-09, T-031) |
| **RBAC** | Role-based access control (ADMIN/MANAGER/MEMBER) |
| **JWT** | JSON Web Token (stateless auth) |
| **withTx** | Transaction wrapper with graceful standalone fallback |
| **scopeItemsForMember** | Server-side MEMBER branch-visibility filter (BOLA mitigation) |
| **USD/UUID** | n/a here — all PKs are Mongo ObjectIds |
| **Node `node:test`** | Node's built-in test runner used for the server suite |

---

## 34. Final Architecture Summary

### What the project is
**OrganiShift** — a reusable event planning, scheduling, and execution-tracking
web app (MERN, Phase 1 MVP). Repeatable checklists become reusable master
templates; plans, events, and live execution tracking build on them, with
role-aware authorization and automatic progress roll-up.

### How it works
Three-tier monolith: a React SPA calls an Express REST API (JWT + RBAC), which
orchestrates Mongoose models over MongoDB's 5 collections. Trees use
materialized paths; library→plan→event cloning runs inside best-effort
transactions; progress is child-average recursion. Members are scoped server-side
to their assigned branches.

### How it is built
- **Client:** Vite (esbuild→rollup) + Tailwind; `npm run build` → `dist/`.
- **Server:** no compile; runs directly on Node (CJS). Tests: `node --test`.

### How it is deployed
**Not deployed.** Local run only (`OrganiShift.bat` or two npm dev servers);
deployment is gated behind the RELEASE approval and is not yet executed. No
Docker/CI/CD/cloud config exists.

### How it is governed
By a documented, convention-enforced, phase-gated policy (`AGENTS.md` +
`governance/RULEBOOK.md` + `BOOTSTRAP`/session logs). Gates: DISCOVERY→CLARIFY→
PLANNING→DESIGN→UI→CODING→TESTING→RELEASE→OPERATE, each needing an explicit
owner trigger. Logging is mandatory every session; git commits are owner-triggered.

### Major technologies
React 18 · Vite 5 · Tailwind 3 · Express 4 · Mongoose 8 · MongoDB · JWT ·
bcryptjs · Zod · express-rate-limit · Node `node:test`.

### Most important modules
`planningService` (tree ops), `eventPlanService`/`eventService` (clone pipeline),
`progressService` (roll-up), `scopeItemsForMember` + `withTx` (security &
atomicity), and the shared `TreeView` component.

### Major risks
No client tests & no CI; stateless JWT without revocation; uncommitted solo work;
no migrations; whole-collection/in-memory aggregation patterns that won't scale.

### Recommended improvements (priority)
1. Add CI (lint→test→build) and server lint.
2. Add client tests.
3. Adopt a migration story.
4. Add API-wide rate limiting + `helmet`.
5. Token revocation / shorter TTL for production.
6. Move scaling-heavy aggregations (`dashboard`, `progress`) to indexed queries
   or caching.

### What a new developer needs to know first
1. It's a **monolith MERN, solo, Phase-1 MVP, local + uncommitted.**
2. Follow the **phase gates**; do not code until "code it".
3. **Never commit** unless asked; never touch `.env`; keep server controllers
   short, business rules in services, imports downward.
4. Run `npm test` (server) and `npm run lint`/`build` (client) to verify.
5. Five collections, materialized-path trees, one `TreeView` for three contexts.
6. Log every session + refresh `BOOTSTRAP.md`.

---

*End of OrganiShift Deep-Dive & Architecture Analysis.*
