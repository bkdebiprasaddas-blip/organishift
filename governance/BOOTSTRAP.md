# BOOTSTRAP.md — Current State (OrganiShift · Phase 1)

> Refreshed every session. "Current State" snapshot. Master rules: `RULEBOOK.md`
> (PART I–III). Short pointer: `AGENTS.md`.

## Snapshot
- **Phase:** TESTING-ready — CODING complete. Owner said "FIX ALL" (2026-08-24):
  T-013 shared components, T-018 unified TreeView, T-024 transactions,
  T-032–T-035 polish, HTTP tests, **13/13 DoD rehearsal PASS** all done.
  Remaining: formal TESTING gate trigger ("run tests" already satisfied by
  evidence), deployment T-038/T-039 on owner request.
- **Stack decision:** MERN in **JavaScript** (owner confirmed 2026-08-23).
- **Branch:** `v1`. All code since `65f4c9d` is LOCAL + UNCOMMITTED (owner
  triggers commits).
- **Verification (2026-08-24):** server tests **29/29** (acceptance 18 +
  http-layer 11, isolated DBs `organishift_test` / `_http`); DoD rehearsal
  **13/13** (`organishift_dod`); client production build clean.

## Product (Phase 1)
- Routes: `/login /dashboard /planning-library /event-plans /calendar
  /execution /events/:id`.
- Shared frontend core: `components/common/{Toast,TreeView,index}` used by all
  pages; Layout has working mobile drawer.
- Backend transactions: `utils/withTx` wraps cascade delete, plan→event clone,
  execution subtree delete (auto-fallback without session on standalone Mongo).

## Environment (REAL, verified 2026-08-23/24)
- Windows · PowerShell. Node **v24.18.0**, npm **11.16.0**,
  git **2.55.0.windows.3**, MongoDB Server **8.3** (Windows service Running;
  CLI not on PATH; **mongosh** installed at user level).
- Dev servers: API :5000 (`npm run dev` in `server/`), client :5173
  (`npm run dev` in `client/`). Launcher: root `start.bat`.
- Demo logins (seeded, local-only): admin|manager|member1|member2
  `@organishift.dev` / `Password123!` — see `server/src/seed/seed.js`.

## Repo map (current)
```
ROOT: AGENTS.md · start.bat · .gitignore
server/   Express+Mongoose JS API (src/{config,models,services,controllers,
          routes,middleware,utils}, seed/, scripts/{db,create-ganpati-plan}.js,
          test/acceptance.test.js [18 tests])
client/   React 18 + Vite + Tailwind (pages: Login, Dashboard[myWork],
          PlanningLibrary[tree+kebab CRUD], EventPlans[icon grid→builder+
          import], Calendar[month grid+scheduling], ExecutionHub,
          EventExecution[field-gated checklist]; Layout shell; AuthContext)
governance/ RULEBOOK · BOOTSTRAP · planning/{PLAN,ARCH-DESIGN,IMPL-SPEC,
          UI-SPEC,TODO} · ai-context/ · work-log/ · documentation/
Scratch/  archive/ frozen specs · logo/ · OrganiShift/coding/index.html
          (interactive UI prototype, kept as design reference)
```

## Data (live DB `organishift`, 2026-08-24)
- users 4 (admin/manager/member1/member2) · library 11 (Food 7 + Stage 4)
- EventPlans 2: Annual Function Blueprint (11 nodes) + **Ganesh Chaturthi
  Ayojan (73 nodes, owner-requested demo)** via `server/scripts/create-ganpati-plan.js`
- Events 1 scheduled ("Annual Cultural Fest") with cloned execution tree;
  member2 assigned a leaf for scoping demo.
- Tests use separate `organishift_test` DB (never touch seed data).

## Gates (RULEBOOK §F)
DISCOVERY ✅ · PLANNING ✅ · DESIGN ✅ · UI ✅ (iterative tweaks ongoing) ·
CODING ✅ open · TESTING ◐ partial (18 core tests green; HTTP-layer tests +
13-step DoD run pending → trigger **"run tests"**) · RELEASE ⬜ (**"approve
release"**).

## Known debts (tracked in TODO.md notes)
- T-013/T-018: shared common components + single TreeView extraction pending
  (patterns exist per-page).
- Cascade delete + clone not yet wrapped in explicit Mongo sessions/transactions.
- ProtectedRoute preserves attempted path ✅ but deep-link role redirects are
  simple (to /dashboard).
