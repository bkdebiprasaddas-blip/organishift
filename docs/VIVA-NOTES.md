# Viva Notes — anticipated questions with codebase-grounded answers

Short, defensible answers. Every claim points at real code in this repository.

## Architecture & stack

**Q: Why MERN?**
A: Single language (JavaScript) across the stack; MongoDB's document model fits
tree-shaped checklists without joins; React suits the dashboard-heavy UI. The
API is a plain Express server — no framework lock-in.

**Q: Explain your three-tier + service layer design.**
A: `routes/` (auth + RBAC) → `controllers/` (HTTP only, ~20 lines each) →
`services/` (business rules: tree ops, clone, progress, transactions) →
`models/` (Mongoose). Cross-cutting concerns live in `utils/` (`ApiError`,
`asyncHandler`, `withTx`, `buildTree`, `scopeItemsForMember`) and
`middleware/` (`authMiddleware`, `errorMiddleware`).

**Q: Where is authorization enforced — UI or API?**
A: API only, twice: route-level `requireRole(...)` and field-level rules inside
services (e.g. only MANAGERs send `assigneeId/priority/dueDate`; MEMBERs can
only touch statuses of their own branch). Hiding buttons in React is cosmetic;
every denial is reproducible with curl (see docs/API-DOCS.md).

## Data modelling

**Q: How are hierarchical checklists stored? Why not MongoDB `$graphLookup`?**
A: Materialized paths: each node stores `path = ",<ancestor ids>,<id>,"`.
Subtree fetch = one regex query; subtree delete = same regex inside a
transaction. `$graphLookup` re-walks edges on every read; materialized paths
make our dominant operation (read whole tree per event) a single indexed query.
Trade-off acknowledged: moves must re-path descendants — done atomically
(`planningService.moveItem`, tested by T-09).

**Q: Library items and plan items share a collection — why?**
A: They are the same entity in two lifecycles (`scope: LIBRARY | PLAN`);
sharing keeps copy-from-library a pure clone with provenance
(`sourceLibraryItemId`) instead of an ETL between models.

**Q: How do you prevent moving a node into its own subtree?**
A: Before any write, the target's `path` is checked for the moved node's ID →
400 `CYCLE_DETECTED`, zero writes executed (T-08). Valid moves re-path the
subtree in order (T-09).

## Security

**Q: How are passwords and tokens handled?**
A: bcrypt hashing (cost 10) with a pre-save hook; hashes never leave the API
(`toJSON` strip + explicit test T-02/H-02). JWTs carry **only** `{ id, role }`
and expire (`JWT_EXPIRES_IN`). Login is rate-limited 20/15min and returns a
generic 401 that doesn't reveal whether the email exists.

**Q: Where do secrets live?**
A: Environment variables via `.env` (git-ignored); production refuses to boot
without `JWT_SECRET` (`config/env.js`). Only `.env.example` templates are
committed.

**Q: What does your error middleware guarantee?**
A: One JSON envelope for every failure — Zod errors → 400 `VALIDATION_ERROR`
with field details; Mongoose duplicate keys → 409; bad ObjectIds → 400
`INVALID_ID`; schema violations → 400 (not 500); unknown routes → JSON 404;
stack traces never reach clients.

## Correctness & reliability

**Q: Where could concurrent/partial writes corrupt data, and what protects it?**
A: Multi-document cascades: plan→event cloning, plan/event deletes, execution
subtree deletes. They run through `withTx.js` — a MongoDB session transaction
with automatic fallback on standalone servers. Progress recalculation threads
the session so counts can't diverge mid-transaction.

**Q: How does progress math work? Is it tested?**
A: Leaves map status→{100,50,0}; parents = rounded average of children; event =
average of roots. The spec's worked example (Procurement 67%, event-level
roll-up) is asserted verbatim by tests T-14 and DoD step 10.

**Q: How do you know member scoping actually works?**
A: Enforced once in `scopeItemsForMember` (assigned node + descendants +
ancestors) and used by both `/events/:id` and `/dashboard/stats`. Verified by
test T-18 and demonstrated manually in the demo script (step 9).

## Testing

**Q: What is tested and how do you run it?**
A: 40 automated Node-test-runner tests in `server/test/`: acceptance (T-01…T-18:
hashing, JWT shape, RBAC, cycles, cascade deletes, clone isolation, progress
maths, transitions, scoping) and HTTP-layer (H-01…H-22: envelopes over real
sockets, validation details, lifecycle flows, user management, stats). Plus a
13-step end-to-end rehearsal script against a disposable database. Run: `npm
test` in `server/`. Test DBs (`organishift_test*`, `organishift_dod`) never
touch demo data.

**Q: What is deliberately NOT in Phase 1?**
A: Deployment/hosting, AI plan generation, notifications, comments,
attachments, budgets, dependencies between tasks, real-time collaboration,
weighted progress, marketplace/sharing, GraphQL. Scope was frozen up-front to
keep the MVP complete rather than broad.

## Honest limitations (say these before being asked)

1. No pagination yet — list endpoints return full result sets (fine for demo
   data volumes).
2. Transactions require a replica set; standalone MongoDB falls back to
   non-transactional execution (documented in `withTx.js`).
3. Client eslint tooling isn't installed locally; verification relies on the
   production build + backend suite.
