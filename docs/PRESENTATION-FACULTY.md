# OrganiShift — Faculty Demonstration & Technical Presentation

> A presentation-ready companion to `docs/PROJECT-ARCHITECTURE.md` (the full
> deep-dive) and `docs/DEMO-SCRIPT.md` (the 13-step live demo). This document is
> written for **faculty reviewers** — it leads with *what the system does for
> each user* and *why the engineering is sound*, with diagrams that render in
> GitHub/Markdown viewers.
>
> **Project:** OrganiShift — Reusable Event Planning, Scheduling & Execution Tracking
> **Stack:** MERN (MongoDB · Express · React · Node) · **Phase:** 1 MVP · **Status:** 53/53 tests passing

---

## 1. One-Minute Pitch

**OrganiShift turns repeatable event checklists into reusable master templates.**

Every college fest or community event repeats the same planning work: *Food &
Catering*, *Stage & Sound*, *Guest Reception*. Normally that knowledge lives in
spreadsheets and chat history. OrganiShift makes the **checklist itself the
reusable asset**:

> **Plan once → Clone forever → Track execution in one place, with clear
> accountability per role.**

The system orchestrates four ideas across six screens:

```
Planning Library         Event Plan           Scheduled Event          Execution
(admin builds master    (blueprint from       (dated instance)         (live checklist,
   module trees)           library modules)    │ clones blueprint)     status + % done)
        └─────── deep-copy ──────┘                 │                    ▲
                                                     └─── builds ───────┘
```

---

## 2. Project at a Glance

| Area | Detail |
|---|---|
| **Name** | OrganiShift |
| **Purpose** | Reusable event planning, scheduling & execution tracking |
| **Architecture** | Three-tier monolith + modular service layer (clean layering) |
| **Tech** | MongoDB · Express · React 18 · Node.js (**MERN**) |
| **Roles** | ADMIN, MANAGER, MEMBER — enforced at the API, not just the UI |
| **Auth** | JWT bearer tokens + bcrypt password hashing |
| **Database** | MongoDB, 5 collections, materialized-path trees |
| **Pages** | Login, Dashboard, Planning Library, Event Plans, Calendar, Execution |
| **Testing** | 40/40 server tests passing; client production build clean |
| **Language** | JavaScript (server CommonJS, client ESM) |

---

## 3. Feature Showcase — by Role

### 👑 ADMIN (System Curator)

| Feature | What Admin can do | Where |
|---|---|---|
| **Planning Library** | Build master module trees (folders / tasks / milestones), edit, move, delete, reorder | `/planning-library` |
| **Operational Notes** | Add rich operational notes + descriptions to any tree node | Library / drawer |
| **Checklists** | Author interactive checklists inside reusable items | Library / drawer |
| **Templates** | Quick pre-built template presets (Catering, Stage & AV, Guest Reception) | Library |
| **Search & Stats** | Real-time search bar with count badge; stats (Roots, Sub-items, Max depth) | Library |
| **JSON Export / Copy** | Export library or copy summary text (sharing / backup) | Library |
| **Event Plans** | Create blueprints; import library modules (deep copy); add custom modules | `/event-plans` |
| **User Management** | Create / edit / soft-delete user accounts, assign roles | Users API |
| **Delete Events** | Full control incl. deleting scheduled events | Execution |
| **Everything Managers/Members can do** | Admin inherits all lower-role capabilities | — |

### 🧑💼 MANAGER (Planner / Scheduler)

| Feature | What Manager can do | Where |
|---|---|---|
| **Schedule Events** | Pick a plan + date → clones blueprint into an execution copy | Calendar |
| **Calendar** | Month grid of events; schedule directly from it | `/calendar` |
| **Import Library Modules** | Pull master Food/Stage/… trees into a plan | Event Plans |
| **Assign Work** | Set assignee, priority (LOW→CRITICAL), due dates on execution items | Execution |
| **Field Gating** | Only MANAGERs change assignee/priority/due date (API-enforced) | Execution |
| **Status Overrides** | Mark execution items through the controlled transition table | Execution / Dashboard |
| **Read-only Library** | View the full library (cannot edit — admin-only writes) | Library |

### 🙋 MEMBER (Executor)

| Feature | What Member can do | Where |
|---|---|---|
| **Scoped View** | Sees **only their assigned branch** (+ ancestors) of the event tree — enforced server-side | Execution |
| **Update My Status** | Change status of their own tasks (NOT_STARTED→IN_PROGRESS→COMPLETED / BLOCKED) | Dashboard / Execution |
| **My Assigned Work** | Inline status updates directly from the dashboard | Dashboard |
| **Checklists** | Tick interactive checklists; progress recalculates automatically | Execution |
| **No Admin Controls** | Cannot edit library, plans, or others' fields (API blocks + UI hides) | — |

> **Key point for faculty:** Authorization is **enforced at the API**, not just by
> hiding buttons. Every denial is reproducible with `curl` (see
> `docs/API-DOCS.md`).

---

## 4. Feature Showcase — by Screen (UI tour)

```
Browser SPA → /login → /dashboard (hub)
                         ├─ /planning-library   (admin: master trees)
                         ├─ /event-plans        (builder + import)
                         ├─ /calendar           (schedule events)
                         ├─ /execution          (hub of all events)
                         └─ /events/:id         (live execution checklist)
```

| Screen | What you see | Notable UX |
|---|---|---|
| **Login** | Gradient splash, logo, email+password, inline error banner | Redirects to intended page after login; role-aware redirect |
| **Dashboard** | 6 role-scoped counter cards, progress bar, upcoming events, **My Assigned Work** inline updates | Skeletons on load; one in-flight update per row; toast feedback |
| **Planning Library** | Recursive tree with expand/collapse; hover action toolbar (`+ Folder`, `+ Task`, `Edit`, `Move`, `Delete`); search; stats cards; template presets | Group-hover scoped toolbar; real-time count badge |
| **Event Plans** | Grid/list of blueprints; builder panel; import-from-library picker (blue "Library" tag) | Open plan lives in the URL (`?plan=`) → refresh/bookmark safe |
| **Calendar** | Month grid, event pills, status dots (PLANNED/ONGOING/DONE); schedule dialog with plan picker | "More" popover when >2 events on a day |
| **Execution Hub** | Icon-box grid of all events + status filter pills | Quick jump into any live event |
| **Event Execution** | Progress header, recursive checklist tree with assignee / priority / due / status controls; interactive checkboxes with strikethrough | Item detail drawer (details / checklist / notes / comments / attachments tabs) |

---

## 5. UI / UX Highlights

### Design system
- **Tailwind CSS** utility-first styling with a custom **token-based color system**:
  - **Indigo** = primary brand / active nav / CTAs
  - **Emerald** = success / completed / checkboxes
  - **Amber / Rose** = warnings / overdue / danger
- **Status & priority chips** — single source of truth (`common/chips.jsx`):
  `NOT_STARTED`, `IN_PROGRESS`, `COMPLETED`, `BLOCKED`, `PLANNED`, `ONGOING`, `DONE`; priorities `LOW→CRITICAL`.
- **Typography:** Inter font stack; consistent `shadow-card` elevation tokens.

### Component reuse (DRY)
- **One shared `TreeView`** drives **three contexts** — Library, Plan builder, and
  Event execution (`common/TreeView.jsx`). One recursion engine, three callers.
- **Reusable primitives:** accessible `Modal` (focus trap + Escape + scroll lock),
  `Toast` system, `Chip`, `ConfirmDialog`, `EmptyState` / `ErrorState` /
  `SkeletonCard`.

### Responsive & accessible
- **Mobile drawer sidebar** with backdrop, `z-50` over modal `z-40` > header `z-10`;
  Escape-to-close + background scroll lock.
- **Accessible modals / toasts:** `role="status"`, `aria-live="polite"`, labelled-by,
  keyboard (Tab) focus trapping, focus return to trigger.
- **Every page handles four states:** loading (skeleton/spinner) · empty (with CTA) ·
  error (retry + message) · forbidden (control hidden / clear 403).

### Micro-interactions
- Interactive **checklist checkboxes** with strikethrough + automatic progress
  recalculation (Library + Execution).
- Toast confirmations on every save/delete; errors persist longer + dismissible.
- Inline dashboard status updates without a full page reload.

---

## 6. Tech & Architecture Rigor (for the technical Q&A)

### Clean layered architecture

```
Browser (React SPA)
   │  HTTP + JSON (Bearer JWT)          ← REST API, fixed envelope
   ▼
Route layer      auth + role guards (RBAC)
   ▼
Controller layer HTTP only · Zod validation · ~≤20 lines
   ▼
Service layer    business rules (trees, clone, progress, transactions)
   ▼
Model layer      Mongoose schemas + pre-save hooks
   ▼
MongoDB          5 collections
```

**Design rules followed:**
- Imports **flow downward only** — `Routes → Controllers → Services → Models`;
  **no circular dependencies**.
- Controllers stay **short (~≤20 lines)**; business logic lives in services.
- One **central error middleware** + one **API envelope**.

### Why these decisions (defensible answers)

| Question you might be asked | Answer (grounded in code) |
|---|---|
| **Why MERN?** | Single language (JS) across the stack; MongoDB's document model suits **tree-shaped checklists without joins**; React suits the dashboard-heavy UI. |
| **How do you store hierarchical checklists?** | **Materialized path** — each node stores `path = ",<ancestorIds>,<ownId>,"`. A subtree read/delete is **one indexed regex query** (`utils/buildTree.js`, `withTx.js`). Not `$graphLookup` (which re-walks edges on every read). |
| **Why one collection for library AND plans?** | Library and plan items are the **same entity at two lifecycle stages**, discriminated by `scope` (`LIBRARY` \| `PLAN`). |
| **Where is authorization enforced?** | **API only, twice**: route-level `requireRole(...)` + field-level rules in services. Hiding buttons in React is cosmetic. Every denial is `curl`-reproducible. |
| **How is progress computed?** | **Child-average roll-up** in `services/progressService.js` — leaf `COMPLETED=100%`, `IN_PROGRESS=50%`; parents average their children; event stores the rolled-up `progressPercent`. |
| **How do you keep multi-document ops atomic?** | `utils/withTx.js` runs real MongoDB **transactions** when a replica set is available, and **gracefully falls back** to a no-session path on standalone dev Mongo. |

### Security highlights
- **JWT** bearer auth (`jsonwebtoken`); tokens carry `id`+`role`, expire per `24h`.
- **bcrypt** password hashing (cost 10) via a `User` pre-save hook; **`passwordHash`
  stripped from every serialization**.
- **Generic login errors** — no user enumeration.
- **Login rate limiting** (20 attempts / 15 min, `express-rate-limit`).
- **RBAC** (ADMIN/MANAGER/MEMBER) at route + field level.
- **Member object-scoping** (`utils/scopeItemsForMember.js`) — a member only sees
  their assigned branch — a form of **object-level authorization (BOLA mitigation)**.
- **Secrets safe:** `.env` git-ignored; production **throws** if `JWT_SECRET` unset.

### Testing & quality (evidence)
```
cd server && npm test     → 40/40 passing (node:test, acceptance + HTTP)
cd client && npm run lint → clean (ESLint, --max-warnings 0)
cd client && npm run build→ clean Vite production build
node scripts/dod-rehearsal.js → 13-step Definition-of-Done scenario passes over HTTP
```
- **Acceptance tests** keyed to spec T-IDs (tree ops, cycle rejection, deep-copy
  clone, status transitions, progress, member scoping).
- **HTTP tests** boot the real Express app with real JWT tokens.
- **`node:test`** — Node's built-in runner, zero extra test dependencies.

---

## 7. Data Model (quick reference)

```
users ──creates──▶ eventPlans ──owns──▶ planningItems (scope: PLAN)
                        │                    ▲ deep-copied (withTx)
                        │ schedules          │
                        ▼                    │
                     events ──owns──▶ eventItems ──assignedTo──▶ users
                         (status, progressPercent)   (status, assignee, priority, due)
```

| Collection | Purpose | Sample fields |
|---|---|---|
| `users` | Accounts + roles | name, email (unique), passwordHash, role, isActive |
| `eventPlans` | Blueprint container | title, description, category, isTemplate, createdBy |
| `planningItems` | Library + plan trees (scope) | title, parentId, planId, path, level, order, scope, nodeType |
| `events` | Scheduled event | title, planId, startDate, endDate, status, progressPercent |
| `eventItems` | Live execution copy | eventId, parentId, status, assigneeId, priority, dueDate |

---

## 8. API Surface (evidence of real back-end)

Base `/api` · envelope `{ success, data, message }` / `{ success:false, error }`.

| Method | Endpoint | Use |
|---|---|---|
| POST | `/auth/login` · GET `/auth/me` | Login / current user |
| */ | `/users(/:id)` | User management (ADMIN) |
| */ | `/planning-items(/:id, /move)` | Planning Library tree CRUD (ADMIN writes) |
| */ | `/event-plans(/:id, /:id/items/from-library)` | Plan builder + module import |
| */ | `/events(/:id, /:id/items, /:id/progress)` | Schedule + execution |
| GET | `/dashboard/stats` | Dashboard counters |

Error codes: `VALIDATION_ERROR`(400) · `INVALID_ID`(400) · `UNAUTHORIZED`(401) ·
`FORBIDDEN`(403) · `NOT_FOUND`(404) · `DUPLICATE_RESOURCE`(409) ·
`TOO_MANY_REQUESTS`(429) · `INVALID_TRANSITION`(400) · `CYCLE_DETECTED`(400).

---

## 9. Suggested Live-Demo Flow (talking points)

> Full click-by-click sheet: `docs/DEMO-SCRIPT.md`. Demo accounts (password
> `Password123!`): `admin@` · `manager@` · `member1@` / `member2@`
> (`@organishift.dev`).

1. **Login as ADMIN** — point out the role chip; note the sidebar shows the
   admin-only "Event Plans" entry. *(Auth + RBAC in action.)*
2. **Planning Library** — build a small *Food & Catering* tree (root +
   children). Show expand/collapse, hover toolbar, checklist checkboxes,
   operational notes popup. *(UI reuse + tree engine.)*
3. **Search & Stats** — type in the search bar, show the live count badge;
   show the Roots/Sub-items/Depth stat cards; try the Catering template preset.
   *(Readiness of library tooling.)*
4. **Event Plans** — Create "Annual Cultural Fest"; **Import Library Module:**
   Food then Stage → the builder shows 11 items with blue "Library" tags.
   *(Deep-copy clone — the core differentiator.)*
5. **Calendar** — Schedule the event today. Show the toast + the event pill.
   *(Plan → Event scheduling.)*
6. **Execution** — Open the event's live checklist; assign a task to a member,
   set priority/due; **switch to a MEMBER browser** and show that they see only
   their branch; tick a checklist; watch progressPercent recalculate.
   *(Object-scoping + progress roll-up.)*
7. **Dashboard** — show the six counters and "My Assigned Work" inline update.
   *(Aggregation + real-time feel.)*
8. **Prove security** — (optional) send a `curl` from a member token to a
   restricted endpoint and show the 403. *(API-enforced authorization.)*

### Faculty FAQ — short answers
- **Q: What is the single most important feature?** *A: The reusable template
  that deep-copies a library module into a plan and then into an execution copy —
  so a whole event's checklist is assembled and tracked without re-typing.*
- **Q: Why is authorization better than just hiding buttons?** *A: It's enforced
  server-side at both the route and field level, so a crafted request can't bypass
  the UI.*
- **Q: How is this tested?** *A: 40 automated server tests across acceptance +
  HTTP layers, plus a scripted 13-step end-to-end Definition-of-Done rehearsal,
  plus a linted + clean production build.*

---

## 10. Appendix — where things live

| Concern | File(s) |
|---|---|
| Server entry / routes | `server/src/server.js` |
| Auth + RBAC | `server/src/middleware/authMiddleware.js` |
| Controllers (short) | `server/src/controllers/*` |
| Business logic services | `server/src/services/{planning,eventPlan,event,progress}Service.js` |
| Models | `server/src/models/*.js` |
| Tree + tx + scoping utils | `server/src/utils/{buildTree,withTx,scopeItemsForMember}.js` |
| Central error handling | `server/src/middleware/errorMiddleware.js` |
| Client routes & shell | `client/src/App.jsx`, `client/src/components/Layout.jsx` |
| Shared TreeView + primitives | `client/src/components/common/*` |
| Test suite | `server/test/{acceptance,http}.test.js` |
| DoD rehearsal | `server/scripts/dod-rehearsal.js` |
| Full deep-dive | `docs/PROJECT-ARCHITECTURE.md` |

---

*Optimized for demonstration. For exhaustive implementation detail, see
`docs/PROJECT-ARCHITECTURE.md`, `docs/API-DOCS.md`, `docs/DATA-MODEL.md`, and the
governance specs.*
