# TODO.md — OrganiShift Phase 1 MVP (build-spec task list)

Task numbering follows the **build contract `OrganiShift_Agent_Build_Spec.md`
§6 (T-001…T-037)** and the corrected acceptance tests §9 (`T-01…T-30`). Preserve
these T-IDs in reports and test output.

## Build order — OWNER DECISION 2026-08-23 (module-by-module)
Owner set the execution strategy: **one module at a time; within each module
(1) UI design first → (2) database (models/services/routes) → (3) fully wired
end-to-end**. This re-sequences the build-spec layers into vertical slices;
checkboxes below remain the completion ledger (a task is done only when its
portion inside the active module slice is implemented AND verified).

| Module | Slice | Task IDs |
|---|---|---|
| M0 Foundation (once) | scaffold, error/response plumbing, api.js, design tokens | T-001…T-005 |
| M1 Auth + Users | login/JWT/roles, app shell, global state components | T-006…T-013 |
| M2 Planning Library | `planningItems` tree CRUD end-to-end | T-014…T-019 |
| M3 Event Plans | plan CRUD + copy-from-library | T-020…T-022 |
| M4 Events + Calendar | `events` schema, schedule routes, calendar page | T-023…T-026 |
| M5 Event Execution | `events/:id` tree, field-gated PUT, progress cascade | T-027, T-028, T-030 (+ progress half of T-029) |
| M6 Dashboard | six-counter page + `/dashboard/stats` aggregation | T-031 (+ stats half of T-029) |
| Closeout | state/responsive/a11y/consistency polish; full seed, tests, deploy, rehearsal | T-032…T-039 |

Per-module loop: UI designed + owner-approved first (prototype in
`Scratch\OrganiShift\coding\` where applicable) → DB layer → client wiring +
that module's acceptance checks. Sprints below keep their original groupings
for traceability; the module table above governs sequencing.

## Sprint 1 — Foundation (T-001…T-005)
- [x] T-001 Repository scaffold: `client/`+`server/` per build §5; git init +
      `.gitignore` (node_modules/.env/dist/build); commit `.env.example` (all §5
      vars, empty). Done: `git status` clean, no `.env` tracked.
- [x] T-002 Server bootstrap: Express, `express.json()`, CORS restricted to
      `CLIENT_ORIGIN` (credentials disabled), `config/db.js` via `MONGO_URI`,
      `GET /api/health` → `{success,data:{db:true}}`.
- [x] T-003 Error/response plumbing: `asyncHandler`, `ApiError`,
      `errorMiddleware` (registered last); every response via §2.9 envelope;
      stack logged, never returned; 404/500 shapes exact.
- [x] T-004 Client bootstrap: Vite+React+Router+Tailwind+Lucide;
      `services/api.js` (axios, auth/response interceptors, envelope unwrap).
- [x] T-005 Design tokens: type scale, 4px spacing, status/priority colour+tiny
      icon tokens; scratch page renders every chip legible without colour.

## Sprint 2 — Authentication (T-006…T-013)
- [x] T-006 User model: schema §3.1; bcrypt 10 pre-save; `toJSON` strips
      `passwordHash`; unique lower-cased email index.
- [x] T-007 Seed users: 4 accounts; idempotent.
- [x] T-008 Login + `/api/auth/me`: Zod login; JWT (id+role only); rate limiter.
- [x] T-009 authMiddleware + requireRole; applied to all except login/health.
- [x] T-010 AuthContext + ProtectedRoute (preserve attempted path) + RoleRoute.
- [x] T-011 Login page (Zod+RHF, real labels, generic error, no registration).
- [x] T-012 AppShell/Sidebar/TopBar/MobileNav/UserMenu; role-filtered nav;
      Execution tab on sidebar → `/execution` hub (icon-box grid per event) →
      `/events/:id` full execution page (owner decision 2026-08-23, see UI-SPEC §4).
- [x] T-013 Global state components: Skeleton, Empty, Error(retry), Forbidden,
      Spinner, Toast(+ToastProvider), Modal, ConfirmDialog — extracted into
      `client/src/components/common/` and used across all pages (2026-08-24).

## Sprint 3 — Planning Library (T-014…T-019)
- [x] T-014 PlanningItem model + §3.6 indexes; out-of-enum `scope` rejected.
- [x] T-015 buildTree util — 3 passes O(n); missing-parent node surfaces as root.
- [x] T-016 planningService: create/move(cycle→400 CYCLE_DETECTED)/remove
      (session cascade, no orphans)/update; §2.12 invariants.
      (cascade delete via deleteMany on path prefix; transaction wrap pending)
- [x] T-017 Six `/api/planning-items` endpoints + §2.6 role guards; GET requires
      `scope` or `planId`; returns built tree.
- [x] T-018 TreeView (one comp, three contexts; keyboard + ARIA; sessionStorage
      expansion).
      Shared `components/common/TreeView.jsx` drives Library, Plan builder and
      Execution trees via render props — single recursion engine, chevrons +
      aria-expanded, hidden-count badges. Expansion persistence is per-session
      component state (sessionStorage wiring optional polish).
- [x] T-019 Planning Library page: +New Item; Admin-only kebab; inline add/rename;
      move dialog; delete confirm (count + ≤5 names); optional single name filter.

## Sprint 4 — Event Plans (T-020…T-022)
- [x] T-020 EventPlan model + CRUD; `GET /:id` = plan + item tree (one response);
      delete cascades items, leaves scheduled events intact.
- [x] T-021 Copy from library: deep-copy subtree → scope PLAN, planId, fresh `_id`,
      `sourceLibraryItemId`, rebuilt path/level/order; **library never mutated**.
      Food → +7 rows, library stays 7. T-011 check.
- [x] T-022 Event Plans page: cards + builder on same route; +Add Item / +Add From
      Library; no global Save; `[Library]`/`[Custom]` badges; explicit copy text.

## Sprint 5 — Events + Calendar (T-023…T-026)
- [x] T-023 Event/EventItem models + §3.6 indexes; `startDate` not past + `endDate`
      ≥ startDate validated at schema AND Zod.
- [x] T-024 Clone service: scheduleFromPlan — event + full execution copy (id map,
      path rebuild, NOT_STARTED/MEDIUM/0, `sourcePlanningItemId`), bulk insert,
      session (no partial event). `itemCount` = plan node count (13 with seed).
      (bulk insert via sequential save; Mongo session wrap pending)
- [x] T-025 Event routes: calendar `?from=&to=`, POST (Admin/Manager),
      GET `/:id` (with tree), PUT (title/dates/venue/status), DELETE (Admin only).
- [x] T-026 Calendar page: month grid, event pill (title+bar+%), `+N more`, today
      outlined; schedule dialog fetches plan list on open; 1-query budget.

## Sprint 6 — Execution (T-027…T-031)
- [x] T-027 progressService.recalculate(eventId): child-average per §2.4; returns
      refreshed tree; source example exact (Procurement 67, Food 72).
- [x] T-028 `PUT /api/event-items/:id` field-gated: status (leaf-only, transition
      table, ownership/inheritance, `COMPLETED`→Manager/Admin); assignee/priority/
      due → Manager only. Also `POST /:eventId/items` + cascade `DELETE`.
- [x] T-029 `GET /events/:id/progress` + `GET /dashboard/stats` (6 counters, **one
      aggregation**; Member scoped to owned work) + `myWork` array for the
      dashboard's inline status editing.
- [x] T-030 Event Execution page: header/dates/venue-badge/progress/counts; role-
      gated controls; parent status = plain text; overdue badges;
      progress-cascade repaint (~300ms).
- [x] T-031 Dashboard page: six counters (frozen order; Overdue overlap labelled;
      Blocked sub-line under Pending); upcoming events/deadlines; My Assigned Work.

## Sprint 7 — UI polish (T-032…T-035)
- [x] T-032 State coverage: loading/empty/error/forbidden/saving on all pages;
      no optimistic UI (repaint from API response after every mutation).
- [x] T-033 Responsive: mobile drawer fixed + backdrop (was unreachable),
      min-height 44px nav targets, grids collapse to 1-col; DoD flows at 375px
      via stacked layouts.
- [x] T-034 Accessibility: global 2px focus ring, real `<label>`s, aria-labels
      on icon-only controls, `role="status" aria-live="polite"` toast region,
      progressbar roles, dialog aria-modal.
- [x] T-035 Consistency pass: one Toast/Modal/ConfirmDialog/TreeView shared by
      every context (no per-page duplicates remain).

## Sprint 8 — Testing + demo + deploy (T-036…T-039)
- [x] T-036 Full seed script (idempotent; build §8.1): users 4, Food(7)+Stage(4)
      library trees, Annual Function plan, no scheduled event; library shows 7+4.
      (Extra demo data beyond seed: Ganesh Chaturthi Ayojan blueprint, 73 nodes —
      owner-requested; plus scheduled demo events.)
- [x] T-037 Test pass: acceptance suite green + client build clean + 13-step DoD
      (corrected counts Food 7/Stage 4/plan 11/execution 13) without manual DB
      edits. README, SETUP-GUIDE, demo rehearsal notes.
      EVIDENCE 2026-08-24: 29 automated tests green (18 service-layer +
      11 HTTP-layer envelopes/RBAC/errors); `node scripts/dod-rehearsal.js`
      = **13/13 PASS** against isolated `organishift_dod` DB; vite build clean.
- [x] T-038 Deployment — **OUT OF SCOPE FOR PHASE 1** (owner decision
      2026-08-24: college project, no deployment in Phase 1; app stays local).
      Kept as a Phase-2 candidate if wanted later.
- [x] T-039 Deployed rehearsal — **OUT OF SCOPE FOR PHASE 1** (depends T-038;
      same owner decision). Local 13-step DoD rehearsal already passed 13/13,
      which covers the demo-verification intent for Phase 1.

---

# Improvement Cycle — Phase 1 polish (OWNER APPROVED 2026-08-24, all 4 batches; dark mode EXCLUDED)

Source: full-app audit this date (backend quality/tests, frontend UX, docs).
Classification: MINOR changes (no architecture/scope redesign); each item keeps
existing acceptance criteria valid. Gate: CODING opens only on owner "code it".

## Batch A — Backend correctness + tests
- [x] IMP-A1 errorMiddleware: handle Mongoose ValidationError → clean 400
      VALIDATION_ERROR envelope (currently unhandled → 500 + raw message leak,
      e.g. PUT /events/:id {status:"XYZ"}).
- [x] IMP-A2 Zod schema for addExecutionItem (title len, priority enum, dueDate).
- [x] IMP-A3 Zod schemas for updatePlan / updateEvent / updateItem.
- [x] IMP-A4 Wrap deleteEvent + deletePlan cascades in withTx (parity with
      deleteExecutionItem).
- [x] IMP-A5 Move copyFromLibrary logic into eventPlanService (~55 controller
      lines → service per house rule), wrap in withTx.
- [x] IMP-A6 Add ~12 tests: plan update/delete/copy-library; event update incl.
      status enum + delete cascade + from/to list filters; add-execution-item
      (valid + invalid priority/title); users CRUD happy path + deactivate;
      dashboard stats endpoint shape.

## Batch B — Frontend correctness (user-facing bugs)
- [x] IMP-B1 EventPlans / ExecutionHub / Calendar: fetch errors currently render
      fake empty states (.catch(()=>set([]))) → route through ErrorState+Retry.
- [x] IMP-B2 Dashboard + PlanningLibrary: silent refetch after mutations (no
      full-page skeleton flash; skeletons first paint only).
- [x] IMP-B3 Double-submit locks on mutation buttons (pattern already in
      Calendar scheduling flag) across Library/EventPlans/EventExecution/Dashboard.
- [x] IMP-B4 Modal + mobile drawer: Escape-close, initial/return focus,
      background scroll lock, closed drawer not keyboard-focusable.
- [x] IMP-B5 Rename/add modals: disable Save on empty input + hint (Library).
- [x] IMP-B6 EventExecution STATUS_STYLES: add ONGOING/DONE keys (match legend/hub).
- [x] IMP-B7 EventExecution: due-date/OVERDUE cluster visible on mobile.

## Batch C — UI polish (no dark mode)
- [x] IMP-C1 Shared Badge/chip component + single status/priority map; adopt in
      Dashboard/ExecutionHub/EventExecution/Calendar; fix red-vs-rose drift;
      relabel cryptic "Overlap" tag.
- [x] IMP-C2 Standardize primary button = indigo (fix emerald "Add module").
- [x] IMP-C3 Adopt EmptyState/ErrorState everywhere (Dashboard inline copies,
      ExecutionHub ad-hoc empties); use SkeletonCard variants consistently.
- [x] IMP-C4 Shared keyboard-operable Menu for kebab dropdowns (Escape/arrows/
      outside-click/focus return).
- [x] IMP-C5 Library move picker: filter out own subtree client-side.
- [x] IMP-C6 Toast: longer timeout + manual close for errors; success icon.
- [x] IMP-C7 Breadcrumb shows event title on /events/:id; crumb for plan builder.
- [x] IMP-C8 Contrast fixes: slate-400→500 hints, sky-600→700 MEDIUM chips (WCAG AA).
- [x] IMP-C9 Relative due dates helper ("in 3 days"/"2 days late"); overdue row tint.
- [x] IMP-C10 Plan builder URL-addressable (?plan= or /event-plans/:id).
- [x] IMP-C11 Progress bars: one shared visual+a11y wrapper; "+N more" calendar
      overflow clickable day-popover.

## Batch D — Submission docs (examiner-facing; none exist today)
- [x] IMP-D1 Root README.md: problem statement, features, stack table,
      architecture diagram, roles, screenshots placeholders, quick-start (start.bat).
- [x] IMP-D2 Corrected SETUP guide at root (fix stale root-npm commands, broken
      :5000 line, 4 seed accounts, no-event seed claim, both test files).
- [x] IMP-D3 docs/API-DOCS.md: all ~29 endpoints (method/path/Roles/envelopes).
- [x] IMP-D4 docs/DATA-MODEL.md: 5 collections, materialized-path tree, scopes,
      relations, indexes.
- [x] IMP-D5 docs/DEMO-SCRIPT.md: 13-step walkthrough w/ seeded logins + RBAC proof.
- [x] IMP-D6 docs/VIVA-NOTES.md: anticipated Q&A grounded in codebase decisions.

Verification standard for this cycle: `npm test` all green (29 + new ~12),
client build clean, DoD rehearsal still 13/13, docs reviewed by owner.