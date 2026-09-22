# PLAN.md — OrganiShift Phase 1 MVP

Master planning doc derived from the frozen specs
(`OrganiShift_Phase1_System_Design.docx` + `OrganiShift_AI_Agent_Execution_Spec.md`
+ **`OrganiShift_Agent_Build_Spec.md`** build contract, T-001…T-037).
Build-precise detail defers to the build spec; this is the top-level plan.

## 1. Product (Phase 1)
Unified event management built around reusable plans: build reusable planning
structures once, derive event plans from them, schedule events, clone an
execution copy, track progress bottom-up via child-average roll-up.

## 2. Scope boundary
IN: CRUD on planning library/plans/events/execution, calendar, dashboard six
counters, recursive trees, roles (Admin/Manager/Member), progress, 13-step DoD.
OUT (no Phase-2 features in the demo — build spec §0.4 adds): AI generation,
notifications, reminders, comments, attachments, budgets, dependencies,
real-time/Socket.IO, weighted progress, marketplace, template sharing, complex
analytics, GraphQL, extra collections/microservices, **drag-and-drop, Kanban,
Gantt, charts beyond one progress bar**.

## 3. Stack & architecture
- MERN three-tier + modular service layer:
  `React UI → REST → Route → Controller → Service → Mongoose Model → MongoDB`.
- Import flow downward only; no circular imports; controllers ≤ ~20 lines;
  business rules in services; one error middleware; one shared `TreeView`.

## 4. Data model (5 collections)
- `users` (name, email unique, passwordHash, role, isActive, timestamps).
- `eventPlans` (title, createdBy, isTemplate).
- `planningItems` (title, parentId self-ref, planId, scope LIBRARY|PLAN,
  path, level, order, sourceLibraryItemId, createdBy).
- `events` (title, planId, startDate, endDate?, venue, status
  PLANNED|ONGOING|DONE, progressPercent, createdBy).
- `eventItems` (eventId, parentId, title, path, level, order, assigneeId,
  status NOT_STARTED|IN_PROGRESS|COMPLETED|BLOCKED, priority, dueDate,
  progressPercent, sourcePlanningItemId).
- Indexes per spec §33 (email, parentId, planId+level+order, path, scope,
  startDate, eventId+level+order, assigneeId, dueDate+status).

## 5. Roles & authorization (API is the boundary — build spec §2.6/§2.7)
Per P5 matrix: Admin manages users/library/plans (structure); Manager assigns/
priority/due/adds children (operations); Admin+Manager schedule; Member updates
owned leaf status only. **Admin cannot assign** (Manager-only). Ownership
resolved via `assigneeId` on self **or any ancestor** (`path`); member cannot
re-open COMPLETED. One field-gated update route. Never rely on UI hiding as
security.

## 6. API contract
Success `{success:true,data,message}`; failure `{success:false,error:{code,message,details}}`.
HTTP 200/201/400/401/403/404/409/500. Named codes: VALIDATION_ERROR,
CYCLE_DETECTED, NOT_A_LEAF, PLAN_NOT_FOUND, FORBIDDEN, INVALID_TRANSITION.
Endpoints per build spec §4 (auth incl. `/api/auth/me`; no logout endpoint;
users Admin+Manager for assignee dropdown).

## 7. Security
bcrypt(10), JWT(env secret, 24h, Bearer), requireRole + ownership, typed
Mongoose, CORS restricted, login rate-limit, central error middleware,
.env git-ignored / .env.example committed.

## 8. Core invariants
Tree (parentId+path+level+order), cycle protection (`400 CYCLE_DETECTED`),
cascade delete, leaf-only status (transition table §2.11), **child-average
progress roll-up** (single server-side formula), field-gated update ownership +
inheritance, master/execution isolation, atomic scheduling. (Detail in RULEBOOK
PART III P8 + build spec §2.)

## 9. Development order (sprints — build spec §6, T-001…T-037)
1 Foundation (T-001–005) → 2 Authentication (T-006–013) → 3 Planning Library
(T-014–019) → 4 Event Plans (T-020–022) → 5 Events + Calendar (T-023–026) →
6 Execution (T-027–031) → 7 UI polish (T-032–035) → 8 Testing + demo (T-036–037).

## 10. Definition of Done
Phase 1 complete when the 13-step end-to-end scenario (System Design Appendix B
**with corrected counts** — build spec §8: Food **7**, Stage **4**, plan **11**,
execution **13**) passes without manual DB edits, all acceptance tests
(`T-01…T-30`) pass, and the client builds clean.

## 11. Approvals / status
- Owner-approved: wipe/reset (2026-08-23), RULEBOOK PART III + AGENTS alignment
  (2026-08-23), reconcile planning docs to the build spec (2026-08-23).
  This PLAN is a starting document for the PLANNING gate.
- Pending: review this PLAN (gate = **"approve plan"**), then DESIGN, UI, CODING.