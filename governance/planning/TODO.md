# TODO.md — OrganiShift Phase 1 MVP (build-spec task list)

Task numbering follows the **build contract `OrganiShift_Agent_Build_Spec.md`
§6 (T-001…T-037)** and the corrected acceptance tests §9 (`T-01…T-30`). Preserve
these T-IDs in reports and test output.

## Sprint 1 — Foundation (T-001…T-005)
- [ ] T-001 Repository scaffold: `client/`+`server/` per build §5; git init +
      `.gitignore` (node_modules/.env/dist/build); commit `.env.example` (all §5
      vars, empty). Done: `git status` clean, no `.env` tracked.
- [ ] T-002 Server bootstrap: Express, `express.json()`, CORS restricted to
      `CLIENT_ORIGIN` (credentials disabled), `config/db.js` via `MONGO_URI`,
      `GET /api/health` → `{success,data:{db:true}}`.
- [ ] T-003 Error/response plumbing: `asyncHandler`, `ApiError`,
      `errorMiddleware` (registered last); every response via §2.9 envelope;
      stack logged, never returned; 404/500 shapes exact.
- [ ] T-004 Client bootstrap: Vite+React+Router+Tailwind+Lucide;
      `services/api.js` (axios, auth/response interceptors, envelope unwrap).
- [ ] T-005 Design tokens: type scale, 4px spacing, status/priority colour+tiny
      icon tokens; scratch page renders every chip legible without colour.

## Sprint 2 — Authentication (T-006…T-013)
- [ ] T-006 User model: schema §3.1; bcrypt 10 pre-save; `toJSON` strips
      `passwordHash`; unique lower-cased email index.
- [ ] T-007 Seed users: 4 accounts; idempotent.
- [ ] T-008 Login + `/api/auth/me`: Zod login; JWT (id+role only); rate limiter.
- [ ] T-009 authMiddleware + requireRole; applied to all except login/health.
- [ ] T-010 AuthContext + ProtectedRoute (preserve attempted path) + RoleRoute.
- [ ] T-011 Login page (Zod+RHF, real labels, generic error, no registration).
- [ ] T-012 AppShell/Sidebar/TopBar/MobileNav/UserMenu; role-filtered nav.
- [ ] T-013 Global state components: Skeleton, Empty, Error(retry), Forbidden,
      Spinner, Toast, Modal, ConfirmDialog.

## Sprint 3 — Planning Library (T-014…T-019)
- [ ] T-014 PlanningItem model + §3.6 indexes; out-of-enum `scope` rejected.
- [ ] T-015 buildTree util — 3 passes O(n); missing-parent node surfaces as root.
- [ ] T-016 planningService: create/move(cycle→400 CYCLE_DETECTED)/remove
      (session cascade, no orphans)/update; §2.12 invariants.
- [ ] T-017 Six `/api/planning-items` endpoints + §2.6 role guards; GET requires
      `scope` or `planId`; returns built tree.
- [ ] T-018 TreeView (one comp, three contexts; keyboard + ARIA; sessionStorage
      expansion).
- [ ] T-019 Planning Library page: +New Item; Admin-only kebab; inline add/rename;
      move dialog; delete confirm (count + ≤5 names); optional single name filter.

## Sprint 4 — Event Plans (T-020…T-022)
- [ ] T-020 EventPlan model + CRUD; `GET /:id` = plan + item tree (one response);
      delete cascades items, leaves scheduled events intact.
- [ ] T-021 Copy from library: deep-copy subtree → scope PLAN, planId, fresh `_id`,
      `sourceLibraryItemId`, rebuilt path/level/order; **library never mutated**.
      Food → +7 rows, library stays 7. T-011 check.
- [ ] T-022 Event Plans page: cards + builder on same route; +Add Item / +Add From
      Library; no global Save; `[Library]`/`[Custom]` badges; explicit copy text.

## Sprint 5 — Events + Calendar (T-023…T-026)
- [ ] T-023 Event/EventItem models + §3.6 indexes; `startDate` not past + `endDate`
      ≥ startDate validated at schema AND Zod.
- [ ] T-024 Clone service: scheduleFromPlan — event + full execution copy (id map,
      path rebuild, NOT_STARTED/MEDIUM/0, `sourcePlanningItemId`), bulk insert,
      session (no partial event). `itemCount` = plan node count (13 with seed).
- [ ] T-025 Event routes: calendar `?from=&to=`, POST (Admin/Manager),
      GET `/:id` (with tree), PUT (title/dates/venue/status), DELETE (Admin only).
- [ ] T-026 Calendar page: month grid, event pill (title+bar+%), `+N more`, today
      outlined; schedule dialog fetches plan list on open; 1-query budget.

## Sprint 6 — Execution (T-027…T-031)
- [ ] T-027 progressService.recalculate(eventId): child-average per §2.4; returns
      refreshed tree; source example exact (Procurement 67, Food 72).
- [ ] T-028 `PUT /api/event-items/:id` field-gated: status (leaf-only, transition
      table, ownership/inheritance, `COMPLETED`→Manager/Admin); assignee/priority/
      due → Manager only. Also `POST /:eventId/items` + cascade `DELETE`.
- [ ] T-029 `GET /events/:id/progress` + `GET /dashboard/stats` (6 counters, **one
      aggregation**; Member scoped to owned work).
- [ ] T-030 Event Execution page: header/dates/venue-badge/progress/counts; role-
      gated controls; parent status = plain text; overdue badges;
      progress-cascade repaint (~300ms).
- [ ] T-031 Dashboard page: six counters (frozen order; Overdue overlap labelled;
      Blocked sub-line under Pending); upcoming events/deadlines; My Assigned Work.

## Sprint 7 — UI polish (T-032…T-035)
- [ ] T-032 State coverage: loading/empty/error/forbidden/saving on all six pages;
      no optimistic UI.
- [ ] T-033 Responsive: ≥1024/768–1023/<768 breakpoints; touch targets ≥44px;
      DoD completes at 375px.
- [ ] T-034 Accessibility: keyboard-only demo; focus ring; real labels; AA;
      icon+text status; aria-describedby; live region.
- [ ] T-035 Consistency pass: one style per shared component across all contexts.

## Sprint 8 — Testing + demo (T-036…T-037)
- [ ] T-036 Full seed script (idempotent; build §8.1): users 4, Food(7)+Stage(4)
      library trees, Annual Function plan, no scheduled event; library shows 7+4.
- [ ] T-037 Test pass: acceptance suite `T-01…T-30` green + client build clean +
      13-step DoD (corrected counts Food 7/Stage 4/plan 11/execution 13) without
      manual DB edits. README, SETUP-GUIDE, demo rehearsal notes.