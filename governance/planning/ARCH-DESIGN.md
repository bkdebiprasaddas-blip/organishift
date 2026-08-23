# ARCH-DESIGN.md — Architecture & Data Design (Phase 1 MVP)

Derived from the frozen specs (`OrganiShift_Phase1_System_Design.docx` +
`OrganiShift_AI_Agent_Execution_Spec.md`). This is the engineering elaboration
for the PLANNING/DESIGN gate; the frozen System Design remains authoritative.

## 1. Architectural style
- **MERN three-tier** with a modular service layer:
  `React UI → REST API → Express Route → Controller → Service → Mongoose Model → MongoDB`.
- Strict import direction (downward only): `Routes → Controllers → Services →
  Models`. No circular imports.
- **Controller rule of thumb:** short enough to read in ~10s (≤ ~20 lines).
  Business rules live in services.
- One central error middleware; one API envelope; one shared `TreeView`.

## 2. Request pipeline (8 steps per spec)
`Route` guards → parse/validate → controller extracts → service runs business
logic → transaction where needed → shape response → error middleware on failure
→ consistent envelope.

## 3. Collections & key attributes (build spec §3 — exact)
- **users**: name(2–60), email(unique, lower, indexed), passwordHash(bcrypt 10,
  stripped by schema transform), role `ADMIN|MANAGER|MEMBER` (default MEMBER),
  isActive(default true), createdBy/createdAt/updatedAt.
- **eventPlans**: title(3–120), description(≤500), category, createdBy→users
  (required), isTemplate(default false), timestamps.
- **planningItems** (one self-referencing tree, `scope: LIBRARY|PLAN`):
  title(1–120), description(≤500), parentId(self-ref, null=root, indexed),
  planId(ref→eventPlans, **null = library row**, indexed), scope `LIBRARY|PLAN`,
  path(indexed), level(0 at root), order(default 0), sourceLibraryItemId(ref),
  createdBy→users, timestamps.
- **events**: title(3–120), planId(ref→eventPlans, indexed), startDate(**not
  past on creation**), endDate(optional, ≥ startDate), venue(≤200), status
  `PLANNED|ONGOING|DONE` (default PLANNED), progressPercent(0–100, cached),
  createdBy→users, timestamps.
- **eventItems** (execution copy): eventId→events (denormalised on every node,
  indexed), parentId(self-ref), title(copied, editable after), path, level,
  order, assigneeId→users(indexed), status `NOT_STARTED|IN_PROGRESS|COMPLETED|
  BLOCKED` (default NOT_STARTED), priority `LOW|MEDIUM|HIGH|CRITICAL` (default
  MEDIUM), dueDate(indexed), progressPercent(cached), sourcePlanningItemId→
  planningItems, timestamps.

## 4. Indexes — build spec §3.6 (each has a query justification)
- users: `email` unique (login + duplicate prevention)
- planningItems: `parentId` · `path` (subtree/cycle/cascade) · `scope`
  (library vs plan) · compound `planId, level, order` (plan render order)
- events: `startDate` (calendar range) · `planId`
- eventItems: `assigneeId` · compound `eventId, level, order` (whole-tree
  load) · compound `dueDate, status` (overdue)

## 5. Tree design
- Adopted model: **parentId self-reference** (no depth limit) + materialised
  `path` + `level` + `order`. Build tree in memory in O(n) with a two-pass
  `Map` (buildTree) — never per-node queries.
- **Move / cycle guard:** reject `newParentId === id` or a `newParentId` whose
  `path` contains `id` (`400 CYCLE_DETECTED`); recompute path+level for the
  subtree and re-sequence siblings; atomic.
- **Cascade delete:** `deleteMany({ _id | path{prefix} })` in a session
  (transaction so a failure deletes nothing); no orphans.
- **Add child:** compute `path/level/order` from parent; return the node.

## 6. Clone / scheduling (atomic)
Scheduling an event = clone the plan tree into `eventItems`:
1. create the event; 2. build the execution copy in memory with a fresh
  `_id` map preserving parent links + `sourcePlanningItemId`; 3. insert items;
  4. write `event.progressPercent` and item `progressPercent` (0).
Run inside a transaction/session so a failed clone leaves **no half event**.
The master plan tree is **never modified** (master/execution isolation).

## 7. Progress (ONE progress service — build spec §2.4)
The single formula, verified against the source example:
```
leaf:     NOT_STARTED=0 · IN_PROGRESS=50 · BLOCKED=0 · COMPLETED=100
parent:   average of IMMEDIATE CHILDREN (recursive), not leaf-weighted
event:    average of the root items
```
- Server-side only; React never computes a percentage.
- Store rounded integers in `progressPercent`; keep full precision in recursion.
- Leaf shows a **status chip, never a `%`**; only parents and the event show `%`.
- A parent cannot be `COMPLETED` while descendants are incomplete.
- Example (source-verified): Procurement = (100+100+0)/3 = 66.7; Food =
  (66.7+80+70)/3 = 72.2.

### Overdue (build spec §2.5)
`isOverdue = dueDate != null && dueDate < today && status !== 'COMPLETED'`. Derived,
server-side, single timezone. No `OVERDUE` status/manual flag; a UI badge beside
the status chip; overdue marks propagate on collapsed ancestors. `[DERIVED]`

## 8. AuthN / AuthZ (build spec §2.6 / §2.7)
- JWT (env secret, 24h, Bearer, carries `id` + `role` only). `/api/auth/me`
  restores the session on refresh. **Logout has no endpoint** — client discards
  the token (C-10).
- `requireRole(...)` guards on every protected route. **Admin owns structure,
  Manager owns operations** — Admin cannot assign/priority/dueDate.
- **`PUT /api/event-items/:id` is field-gated, not route-gated:** `status` →
  owner/Manager/Admin (leaf-only, transition table); `assigneeId/priority/dueDate`
  → **Manager only**.
- **Ownership & inheritance (§2.7, resolves S-5):** assignee may be set on any
  node; a member owns a node if assigned to it *or any ancestor* (resolved via
  `path`); status editable only on leaves; a member may not change assignee/
  priority/due nor re-open `COMPLETED`. Members see owned items + read-only
  ancestor rows; branches they don't own are not returned.
- UI hiding is convenience; **API is the security boundary**.

## 9. Deployment topology (demo)
Build the client, deploy all tiers on hosting free tiers (React static +
Express API + Atlas/cloud Mongo) so the demo opens on the examiner's laptop.
Production config in env vars; `.env` git-ignored, `.env.example` committed.

## 10. What is deliberately NOT in Phase 1
AI generation, notifications, reminders, comments, attachments, budgets,
dependencies, real-time/Socket.IO, weighted progress, marketplace, template
sharing, complex analytics, GraphQL, extra collections/microservices, drag-drop,
Kanban, Gantt, charts beyond one progress bar (build spec §0.4).