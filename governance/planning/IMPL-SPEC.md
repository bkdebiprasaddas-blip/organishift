# IMPL-SPEC.md — Implementation Specification (Phase 1 MVP)

Implementation contract to be executed **mechanically** once the CODING gate is
opened (**"code it"**). Derived from the frozen specs: System Design (.docx) +
AI Agent Execution Spec + **the build contract (`OrganiShift_Agent_Build_Spec.md`,
T-001…T-039)** — the build spec is the task-by-task authority and the planning
docs reconcile to it.

## 1. Repository layout (target — build spec §5)
```
server/            Express + Mongoose (API)
  src/
    config/ (env, db)                 ^ imports flow downward
    models/ (User, EventPlan, PlanningItem, Event, EventItem)
    controllers/ (auth, user, planning, eventPlan, event)
    routes/ (auth, user, planning, eventPlan, event)
    middleware/ (authMiddleware, errorMiddleware)
    services/ (planningService, eventService, progressService)
    utils/ (asyncHandler, ApiError, buildTree)
    server.js
  test/acceptance.test.js
client/            React + Vite + Tailwind + Lucide
  src/components/ (layout/, tree/, forms/, cards/, common/)
  src/pages/ (Login, Dashboard, PlanningLibrary, EventPlans, Calendar, EventExecution)
  src/services/ (api, authService, planningService, eventService)
  src/hooks/ · context/AuthContext.jsx · utils/ · routes/ · App.jsx · main.jsx
governance/        (RULEBOOK, BOOTSTRAP, planning/, ai-context/, work-log/, documentation/)
+ frozen spec files at ROOT
```
Environment surface: `server` = `PORT · MONGO_URI · JWT_SECRET ·
JWT_EXPIRES_IN=24h · CLIENT_ORIGIN · NODE_ENV`; `client` = `VITE_API_URL`.
`.env` git-ignored; `.env.example` committed; nothing hard-coded.

## 2. Server conventions (Phase 1 — build spec §2.9 / §5)
- Controllers readable in ~10s (≤ ~20 lines); delegate to services; **no
  try/catch in controllers** — `asyncHandler` forwards to `errorMiddleware`.
- Throw `ApiError(statusCode, code, message, details?)`; never raw `Error`
  for client messages.
- **Success envelope:** `{ success:true, data, message }` (HTTP 200/201/...).
- **Failure envelope:** `{ success:false, error:{ code, message, details } }`.
- **Named error codes:** `VALIDATION_ERROR`, `CYCLE_DETECTED`, `NOT_A_LEAF`,
  `PLAN_NOT_FOUND`, `FORBIDDEN`, `INVALID_TRANSITION`.
- HTTP semantics: 200 read/update, 201 create, 400 validation/cycle, 401 auth
  missing/invalid, 403 forbidden, 404 not found/wrong-owner, 409 conflict,
  500 unhandled.
- One central error middleware (logs the stack, returns safe code+message);
  registered last.

## 3. Validation (build spec §2.10)
- Backend Zod at the API boundary (authoritative). Frontend Zod + React Hook
  Form = instant feedback only.
- Login: valid email format; password ≥ 6. `POST /api/users`: email unique
  (lower), role in enum (409 dup / 400 bad role). Planning-items: title 1–120,
  `parentId` exists + shares `scope` (400). Move: new parent exists + not a
  descendant (400 CYCLE_DETECTED). `POST /api/events`: `planId` exists,
  `startDate` valid + **not past**, `endDate` ≥ `startDate` (400/404).
  `PUT /api/event-items/:id`: status in enum, item is a **leaf** for a manual
  status change (400 NOT_A_LEAF).
- Field limits: user name 2–60; plan title 3–120; plan description ≤500; item
  title 1–120; event title 3–120; venue ≤200.

## 4. Security (build spec §2.6 / §2.7 / §3)
- bcrypt (10 salt rounds); schema transform strips `passwordHash` from every
  response. Never log/store passwords.
- JWT env secret, 24h, payload = `{id, role}` **only**; Bearer header; never in
  URL. `GET /api/auth/me` restores session; **logout has no endpoint** (client
  discards token).
- `requireRole` + ownership on every protected route; login rate-limiter.
- §2.6 role matrix verbatim: **Admin owns structure, Manager owns operations
  (assign/priority/due = Manager only)**. Comment this in code so nobody "fixes" it.
- **Field-gated update:** `PUT /api/event-items/:id` — `status` → owner
  (self or ancestor assignee), Manager or Admin, leaf-only, per the transition
  table; `assigneeId/priority/dueDate` → **Manager only** (Member/Admin sending
  them → 403).
- Typed Mongoose queries only; CORS restricted to deployed client origin with
  credentials disabled.
- `.env` git-ignored; `.env.example` committed; secrets never hard-coded.

## 5. Core service rules (implement exactly — build spec §2.12)
- **tree:** buildTree O(n); add-child; move (cycle guard → `400 CYCLE_DETECTED`);
  cascade delete (transaction, no orphans); sibling ordering preserved (`order`).
  Invariants: `path` (comma-wrapped: `,` → `,64a1,` → `,64a1,64b2,`), `level`,
  `order` (`0`-based) correct for node + every descendant after every create/
  move/delete.
- **clone:** atomic plan→event execution copy (fresh id map, parent remap,
  path rebuild, `sourcePlanningItemId`, all start NOT_STARTED/MEDIUM/0), one
  bulk insert, session so a failure writes nothing; `{ event, itemCount }`.
- **progress:** **child-average recursive** (build spec §2.4): leaf =
  `{NOT_STARTED:0, IN_PROGRESS:50, BLOCKED:0, COMPLETED:100}`; parent = average
  of **immediate children**; event = average of roots. Server-side only; store
  rounded ints in `progressPercent`; leaf shows a chip, never `%`.
- **overdue:** `dueDate != null && dueDate < today && status !== 'COMPLETED'`
  (derived, no manual flag).
- **status transitions** (§2.11): NOT_STARTED→IN_PROGRESS/BLOCKED;
  IN_PROGRESS→COMPLETED/BLOCKED; BLOCKED→IN_PROGRESS (owner/Manager/Admin);
  COMPLETED→IN_PROGRESS (re-open) **Manager/Admin only**; else 400
  `INVALID_TRANSITION`.

## 6. Data model — required fields (summary)
Refer to ARCH-DESIGN §3 for full attributes + enums. Conform exactly; add
nothing beyond spec unless approved.

## 7. Frontend conventions (build spec §0.4 / §2.1 / T-004)
- **Stack:** React, React Router, **Axios**, **Tailwind CSS**, **Lucide React**,
  **React Hook Form**, **Zod**, **Vite**. No component library beyond Tailwind +
  Lucide. No state library — React context + local state.
- Six pages: `/login /dashboard /planning-library /event-plans /calendar /events/:id`.
  Plan builder lives **inside** `/event-plans` (no seventh page). Unmatched
  authenticated route → `/dashboard`; unauthenticated → `/login` preserving the
  attempted path. Execution is **not** a nav item (reached from Calendar/Dashboard).
- Shared `TreeView` renders library/plan/execution trees via
  `{ nodes, expandedIds, onToggle, permissions, renderMeta }`; owns recursion,
  indentation (20px/level), expand/collapse, keyboard nav + ARIA; expansion is
  local state persisted in `sessionStorage`.
- `services/api.js`: one Axios instance on `VITE_API_URL`, request interceptor
  attaches `Authorization: Bearer <token>`, response interceptor unwraps `data`
  on success and normalises the error envelope into `{ code, message, details }`.
- Role-filtered nav: Admin (Dashboard · Library · Event Plans · Calendar),
  Manager (Dashboard · Library · Calendar), Member (Dashboard · Calendar).
- **No optimistic UI** — repaint from the returned tree; disabled submit during
  save; confirm destructive ops.
- Every page handles `loading · empty · error · forbidden · saving` states;
  no blank-screen while loading; no silent errors.
- Design tokens: page title 24/600, section 18/600, card 16/600, body 14/400,
  secondary 13/400, meta 12/500; 4px spacing scale; status/priority colour
  tokens each paired with an icon (colour is never the only signal).

## 8. Testing standard (TESTING gate)
- Acceptance tests in `server/test/acceptance.test.js`, reported with T-IDs
  (build spec §9: `T-01`…`T-30` — e.g. `T-09 — PASS — move into own subtree
  returns CYCLE_DETECTED, nothing changes`).
- Cover: auth (T-01/02/03), authorization + field-gating (T-04, T-21…T-25),
  tree (T-05…T-10), plan (T-11), event (T-12/13, T-26/27/30), execution
  (T-14…T-17), UI (T-18/19/28/29).
- TESTING gate = all acceptance tests pass (T-IDs) + client build clean + the
  13-step DoD scenario passes without manual DB edits. UI-only: manual checklist.

## 9. Definition of Done
The 13-step end-to-end scenario (System Design Appendix B, corrected counts in
build spec §8: Food **7**, Stage **4**, plan **11**, execution **13**) passes
with evidence, no manual DB edits; acceptance suite (T-01…T-30) green; build
clean. See RULEBOOK PART III P12.

## 10. Sprints (build order — build spec §6, T-001…T-039)
1 Foundation (T-001…T-005) → 2 Authentication (T-006…T-013) → 3 Planning Library
(T-014…T-019) → 4 Event Plans (T-020…T-022) → 5 Events + Calendar (T-023…T-026)
→ 6 Execution (T-027…T-031) → 7 UI polish (T-032…T-035) → 8 Testing + demo +
deploy (T-036…T-039). TODO.md tracks each T-*/step; do not build layers all at
once without reason.

## 11. Open items & source defects (build spec §7 + §1.3) `[OPEN-n]/[S-n]`
Each has a stated working default — implement the default and leave a `// OPEN-n`
comment at the site, then continue. Do not silently diverge from a frozen value.

| ID | Question | Resolution / default | Covered by |
|---|---|---|---|
| OPEN-1 | Do dashboard counters count leaves, or all execution items? | Leaves only — parent status is derived | T-029 / DoD row 1 |
| OPEN-2 | `GET /api/users` Admin-only vs Manager needs it for assignment [S-1] | Widen to **Admin + Manager** (otherwise assignment is unusable) | T-017 / acceptance T-04 |
| OPEN-3 | Re-open a completed item: §26 says Admin+Manager, Figure 12 says Manager only [S-2] | Follow **§26** (Admin + Manager); figure is illustrative | T-028 / acceptance T-21–T-22 |
| OPEN-4 | Assign on a parent — inherit via `path`, or cascade to each leaf? [S-5] | **Inheritance** via `path`; assignee name appears on the parent node itself | T-024/T-028 / acceptance T-17 |
| OPEN-5 | Does a Member see the full tree, or only owned branches? | Owned branches + ancestor rows for context; ancestors read-only; unowned branches not returned | T-029 / acceptance T-17 |
| OPEN-6 | Do a Member's dashboard counters cover only their own work? | Yes — §2.6 "Member sees only assigned work" | T-029/T-031 / DoD row 1 |

Source defects (resolved above, recorded so they are not silently dropped):
S-1 (users route vs assignment), S-2 (re-open role), S-3 (seed counts 7/11/13),
S-4 (seed account count + Rahul role), S-5 (parent assignment vs ownership check).
Seed-account decision note: §8.1 seeds **4** users (Admin, Manager, 2 Members)
per §35.1, resolving S-4; Appendix B's `Rahul` is the seeded **Manager**.