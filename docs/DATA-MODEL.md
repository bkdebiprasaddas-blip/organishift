# Data Model — OrganiShift Phase 1

Five MongoDB collections (Mongoose 8). Trees use the **materialized path**
pattern: each node stores `path` — a comma-wrapped chain of ancestor IDs ending
with its own ID (root: `,<id>,`). Subtree reads are a single regex query;
deletes cascade the same way, inside a transaction when the deployment supports
sessions (`server/src/utils/withTx.js` falls back gracefully on standalone
MongoDB).

```
User ──creates──▶ EventPlan ──owns──▶ PlanningItem (scope PLAN)
                      │                     ▲ deep-copied from
                      │ schedules           │ PlanningItem (scope LIBRARY)
                      ▼                     │
                   Event ──owns──▶ EventItem ──assignedTo──▶ User
```

## 1. users

| Field | Type | Notes |
|---|---|---|
| name | String | required |
| email | String | unique, lower-cased index |
| passwordHash | String | bcrypt (cost 10), pre-save hook; stripped by `toJSON` |
| role | enum | `ADMIN \| MANAGER \| MEMBER` |
| isActive | Boolean | soft-delete flag; login blocked when false |
| createdBy | ObjectId → users | who created the account |

## 2. eventPlans

Blueprint container assembled from library modules.

| Field | Type | Notes |
|---|---|---|
| title | String | 3–120 chars |
| description | String | ≤500 chars |
| category | String | free label, default `General` |
| isTemplate | Boolean | marks reusable blueprints |
| createdBy | ObjectId → users | |

## 3. planningItems

One collection for **both** library trees and plan blueprints — discriminated
by `scope`.

| Field | Type | Notes |
|---|---|---|
| title / description | String | validated lengths |
| scope | enum | `LIBRARY` (master template) \| `PLAN` (blueprint node) |
| parentId | ObjectId → planningItems | null = root |
| planId | ObjectId → eventPlans | set when `scope: PLAN` |
| path | String | materialized ancestor chain (see above) |
| level | Number | depth (root = 0) |
| order | Number | sibling ordering |
| sourceLibraryItemId | ObjectId | provenance after copy-from-library |

Indexes: `{ planId, level, order }`, plus singles on `parentId`, `planId`,
`scope`, `path`.

**Tree safety rules** (enforced in services): moving a node under its own
descendant is rejected (`CYCLE_DETECTED`) before any write; valid moves re-path
the entire subtree atomically; deletes remove exactly the subtree.

## 4. events

A scheduled occurrence of a plan.

| Field | Type | Notes |
|---|---|---|
| title | String | 3–120 chars |
| planId | ObjectId → eventPlans | source blueprint |
| startDate / endDate | Date | start cannot be in the past; end ≥ start |
| venue | String | ≤200 chars |
| status | enum | `PLANNED \| ONGOING \| DONE` |
| progressPercent | Number | 0–100, auto-computed |

Index: `startDate`. Scheduling clones every plan item into an execution tree.

## 5. eventItems

The live execution checklist.

| Field | Type | Notes |
|---|---|---|
| eventId | ObjectId → events | owner tree |
| parentId / path / level / order | — | same materialized-path scheme as planningItems |
| assigneeId | ObjectId → users | MANAGER-only field |
| status | enum | `NOT_STARTED \| IN_PROGRESS \| COMPLETED \| BLOCKED`; editable on leaves only, transition-table enforced |
| priority | enum | `LOW \| MEDIUM \| HIGH \| CRITICAL`; MANAGER-only field |
| dueDate | Date | MANAGER-only field |
| progressPercent | Number | leaves derive from status; parents = rounded average of children |
| sourcePlanningItemId | ObjectId | provenance from the blueprint clone |

Indexes: `{ eventId, level, order }`, `{ dueDate, status }`, singles on
`eventId`, `assigneeId`, `dueDate`.

## Derived behaviour

- **Progress roll-up:** leaf status → {COMPLETED:100, IN_PROGRESS:50, else 0};
  parent = average of immediate children (rounded); event % = average of roots.
- **Member scoping (§2.7):** members read only nodes they (or an ancestor of
  theirs) are assigned to, plus ancestor rows for context — implemented once in
  `server/src/utils/scopeItemsForMember.js` and reused by the event and
  dashboard endpoints.
