# BOOTSTRAP.md — Current State (OrganiShift · Phase 1)

> Refreshed every session. "Current State" snapshot. Master rules: `RULEBOOK.md`
> (PART I–III). Short pointer: `AGENTS.md`.

## Snapshot
- **Phase:** PHASE 1 COMPLETE + **improvement cycle delivered** (2026-08-24).
  All 4 approved batches implemented & verified: backend hardening (validation,
  transactions, service extraction), frontend correctness (error states,
  double-submit locks, modal a11y, silent refreshes), UI polish (shared chips/
  menus, relative dates, calendar day popover, URL-addressable plan builder),
  and full submission docs (README/SETUP/API-DOCS/DATA-MODEL/DEMO-SCRIPT/
  VIVA-NOTES). Deployment stays OUT OF SCOPE for Phase 1.
- **Stack decision:** MERN in **JavaScript** (owner confirmed 2026-08-23).
- **Branch:** `v1`. Improvement work is LOCAL + UNCOMMITTED (owner triggers).
- **Verification (2026-08-24, post-improvements):** server tests **40/40**
  (acceptance 18 + http-layer 22); DoD rehearsal **13/13**; client build clean;
  client `npm run lint` NOT runnable (eslint not installed — noted limitation).

## Product (Phase 1)
- Routes: `/login /dashboard /planning-library /event-plans /calendar
  /execution /events/:id` (+ builder addressable via `/event-plans?plan=<id>`).
- Shared frontend core: components/common/{Toast,TreeView,DropdownMenu,chips,
  index} used by all pages; Layout has working + accessible mobile drawer;
  breadcrumb shows event titles.
- Backend transactions: `utils/withTx` wraps cascade delete, plan→event clone,
  library→plan copy, execution subtree delete (auto-fallback without session).
- All write endpoints Zod-validated; Mongoose ValidationError → clean 400.

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
DISCOVERY ✅ · PLANNING ✅ · DESIGN ✅ · UI ✅ · CODING ✅ ·
TESTING ✅ (owner acknowledged; now 40/40 tests + 13/13 DoD + clean build) ·
RELEASE ⬜ DE-SCOPED from Phase 1 by owner (college project, local-only).
Improvement cycle: planned + approved + implemented same day, verified.

## Known debts / notes
- Client eslint not installed → `npm run lint` fails locally (build is the
  working check). Installing it = owner-approved dependency change.
- Deployment (T-038/T-039) intentionally out of scope. Deep-link role redirects
  remain simple (to /dashboard) — accepted.
