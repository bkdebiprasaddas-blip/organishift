# API Reference — OrganiShift Phase 1

Base URL (local dev): `http://localhost:5000/api`

All responses use a fixed envelope:

```json
// success
{ "success": true, "data": { ... }, "message": "optional" }

// failure
{ "success": false, "error": { "code": "MACHINE_READABLE_CODE", "message": "human text", "details": [ ] } }
```

Authentication: send `Authorization: Bearer <token>` from
`POST /auth/login`. Tokens are JWTs carrying `id` + `role` only, expiring per
`JWT_EXPIRES_IN` (default 24h).

Roles: **ADMIN**, **MANAGER**, **MEMBER**. Role checks are enforced by the API,
not the UI. Login is rate-limited (20 attempts / 15 min).

Common error codes: `VALIDATION_ERROR` (400), `INVALID_ID` (400),
`UNAUTHORIZED` (401), `FORBIDDEN` (403), `NOT_FOUND` / `*_NOT_FOUND` (404),
`DUPLICATE_RESOURCE` (409), `CYCLE_DETECTED` (400), `NOT_A_LEAF` (400),
`INVALID_TRANSITION` (400), `TOO_MANY_REQUESTS` (429), `INTERNAL_SERVER_ERROR`
(500).

---

## Health

| Method | Path | Roles | Description |
|---|---|---|---|
| GET | `/health` | public | `{ db: true }` liveness probe |

## Auth

| Method | Path | Roles | Body / Notes |
|---|---|---|---|
| POST | `/auth/login` | public | `{ email, password }` → `{ token, user }`; generic 401 on bad credentials |
| GET | `/auth/me` | any | Current user profile |

## Users (admin panel)

| Method | Path | Roles | Notes |
|---|---|---|---|
| GET | `/users` | ADMIN, MANAGER | Active users only; hash stripped |
| POST | `/users` | ADMIN | `{ name, email, password, role? }` → 201; duplicate email → 409 |
| GET | `/users/:id` | ADMIN | Single user |
| PUT | `/users/:id` | ADMIN | `{ name?, role?, isActive? }` |
| DELETE | `/users/:id` | ADMIN | Soft delete — sets `isActive:false`; deactivated users cannot log in |

## Planning items (library trees + plan blueprints)

Items form materialized-path trees (`parentId`, `path`, `level`, `order`) with
`scope: LIBRARY | PLAN`.

| Method | Path | Roles | Notes |
|---|---|---|---|
| GET | `/planning-items?scope=LIBRARY\|PLAN&planId=` | ADMIN, MANAGER | Returns nested tree |
| POST | `/planning-items` | ADMIN | `{ title, scope, parentId?, planId? }`; cross-scope parent → rejected |
| GET | `/planning-items/:id` | ADMIN, MANAGER | Single item |
| PUT | `/planning-items/:id` | ADMIN | `{ title?, description?, order? }` (validated) |
| PUT | `/planning-items/:id/move` | ADMIN | `{ newParentId }` (null = root); moving under own descendant → 400 `CYCLE_DETECTED`, no changes made |
| DELETE | `/planning-items/:id` | ADMIN | Cascades the whole subtree |

## Event plans (blueprints)

| Method | Path | Roles | Notes |
|---|---|---|---|
| GET | `/event-plans` | ADMIN, MANAGER | Newest first |
| POST | `/event-plans` | ADMIN | `{ title, description?, category?, isTemplate? }` → 201 |
| GET | `/event-plans/:id` | ADMIN, MANAGER | `{ plan, tree }` |
| PUT | `/event-plans/:id` | ADMIN | `{ title?, description?, category?, isTemplate? }` (validated) |
| DELETE | `/event-plans/:id` | ADMIN | Transactional cascade of PLAN-scope items |
| POST | `/event-plans/:id/items/from-library` | ADMIN | `{ libraryItemId }` deep-copies a library branch into the plan → `{ copiedCount }`; transactional |

## Events + execution

| Method | Path | Roles | Notes |
|---|---|---|---|
| GET | `/events?from=&to=` | any | Date-range filters optional |
| POST | `/events` | ADMIN, MANAGER | `{ title, planId, startDate, endDate?, venue? }`; past start date → 400. Clones all blueprint items as `NOT_STARTED` execution items (transactional) |
| GET | `/events/:id` | any (scoped) | `{ event, tree }`. MEMBERs receive only their assigned branch + ancestors (§2.7); assignee names populated |
| PUT | `/events/:id` | ADMIN, MANAGER | `{ title?, startDate?, endDate?, venue?, status? }`; status enum `PLANNED/ONGOING/DONE` (validated) |
| DELETE | `/events/:id` | ADMIN | Transactional cascade of its execution items |
| GET | `/events/:id/progress` | any | Recalculates and returns `{ eventProgress, tree }` |
| POST | `/events/:eventId/items` | ADMIN, MANAGER | Add item during execution: `{ title, parentId?, priority?, dueDate? }` |
| PUT | `/events/items/:id` | any (field-gated) | Status change: leaf-only, transition table, MEMBER ownership rules, members cannot re-open `COMPLETED`. `assigneeId/priority/dueDate`: MANAGER only |
| DELETE | `/events/items/:id` | ADMIN, MANAGER | Deletes subtree + recalculates progress (transactional) |

Status transition table:

```
NOT_STARTED → IN_PROGRESS | BLOCKED
IN_PROGRESS → COMPLETED   | BLOCKED
BLOCKED     → IN_PROGRESS
COMPLETED   → IN_PROGRESS   (re-open; MEMBERs denied)
```

Priority enum: `LOW | MEDIUM | HIGH | CRITICAL`. Item status enum:
`NOT_STARTED | IN_PROGRESS | COMPLETED | BLOCKED`.

## Dashboard

| Method | Path | Roles | Returns |
|---|---|---|---|
| GET | `/dashboard/stats` | any (scoped) | `counters { total, completed, pending, inProgress, overdue, blocked, overallProgress }`, `upcomingEvents[]`, `myWork[]` (leaves assigned to caller incl. `allowedTransitions`). MEMBER counters are scoped to their visible branch |

### Example calls

```
POST /api/auth/login
{ "email": "admin@organishift.dev", "password": "Password123!" }

GET /api/dashboard/stats            (with Bearer token)
→ 200 { "success": true, "data": { "counters": { "total": 10, ... }, "upcomingEvents": [...], "myWork": [...] } }
```
