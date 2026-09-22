# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Filesystem boundary (hard rule)

Stay inside the project folder — `D:\Project\OrganiShift_MERN` — for every read,
write, edit, and shell command. Never read, write, or execute anything outside
this folder (including parent directories, sibling projects, or elsewhere on the
machine) without first stopping and asking the user for explicit permission.
This applies to every tool: Read/Write/Edit, Bash/PowerShell (including `cd`
outside the folder, absolute paths outside it, or commands that touch files
elsewhere), Glob/Grep search roots, and any other filesystem or process access.
If a task seems to require going outside the project folder, stop, explain
why, and ask before doing it — do not just proceed. This reinforces (and is
stricter than) `AGENTS.md` §J0 (least authority) and §J9 (scope control) below.

## Governance comes first

@AGENTS.md

This repo runs under a strict phase-gated workflow defined in `AGENTS.md` (root)
and its canonical source `governance/RULEBOOK.md`. Read `AGENTS.md` before doing
anything else — it is not optional boilerplate. Key points that affect how you
should behave here:

- Work proceeds through gates (`DISCOVERY → CLARIFY → PLANNING → DESIGN FIXED →
  UI DESIGN CONFIRMED → CODING → TESTING → RELEASE → OPERATE`); only the exact
  trigger phrases in `AGENTS.md` §F advance a gate (e.g. **"code it"** opens
  coding — "continue" / "ok go" do not count).
- Never commit to git unless explicitly asked, even if a task is otherwise done.
- After any completed change, refresh `governance/BOOTSTRAP.md`, add a delta to
  the latest `governance/ai-context/SESSION-*.md`, and append
  `governance/work-log/LOG-*.md` — see `AGENTS.md` §D.
- Check current project state before assuming what phase you're in:
  `governance/BOOTSTRAP.md` (snapshot) → latest `governance/ai-context/SESSION-*.md`
  → latest `governance/work-log/LOG-*.md`.

## Commands

All commands run from the respective app folder — there is no root `package.json`.

```bash
# Server (server/)
npm install
npm run dev              # API on :5000 with --watch, health check at /api/health
npm test                 # 40+ tests via node --test (acceptance.test.js + http.test.js)
node --test --test-force-exit test/acceptance.test.js   # single test file
node --test --test-force-exit test/acceptance.test.js --test-name-pattern="T-09"  # single case
npm run seed              # idempotent demo data (4 users + library trees + 1 plan)
node scripts/dod-rehearsal.js   # 13-step end-to-end Definition-of-Done scenario

# Client (client/)
npm install
npm run dev               # Vite dev server on :5173
npm run build              # production build
npm run lint                # ESLint, zero warnings allowed
```

`start.bat` at repo root (Windows) starts the MongoDB service, both dev servers,
waits for the health check, and opens the browser — the fastest way to get a
working stack.

Tests run against isolated databases (`organishift_test`, `organishift_test_http`)
— never the demo/dev database. Demo logins (local-only, not secrets):
`admin@organishift.dev` / `manager@organishift.dev` / `member1@organishift.dev` /
`member2@organishift.dev`, password `Password123!`.

## Architecture

Three tiers, JavaScript MERN, CommonJS on the server:

```
client/src (React 18 + Vite)          server/src (Express 4)
pages/*.jsx  ──HTTP/JSON──►  routes/ ──► controllers/ ──► services/ ──► models/
components/common/*                    (auth+RBAC)      (~20 lines)   (business    Mongoose
AuthContext, api.js (axios)                                            logic)       (MongoDB)
```

- **Route → Controller → Service → Model.** Controllers stay thin (≈≤20 lines);
  all tree operations, cloning, progress roll-up, and transactions live in
  `server/src/services/`. Business logic never lives in controllers or routes.
- **Auth/RBAC**: `server/src/middleware/authMiddleware.js` — `authMiddleware`
  verifies the JWT and loads `req.user`; `requireRole(...roles)` gates routes.
  Three roles: `ADMIN` / `MANAGER` / `MEMBER`. Role checks happen at the route
  boundary *and* again inside services (field gating, ownership, member scoping)
  — hidden UI controls are convenience only, never the real enforcement.
- **Errors**: throw `new ApiError(statusCode, code, message, details)`
  (`server/src/utils/ApiError.js`) — never a raw `Error` for anything that
  reaches the client. `errorMiddleware` is the last middleware in `server.js`
  and converts these into the standard envelope.
- **API envelope** (consistent everywhere): success
  `{ success: true, data, message }`; failure
  `{ success: false, error: { code, message, details } }`.
  HTTP codes used: `200/201/400/401/403/404/409/500`.
- **Materialized-path trees**: `PlanningItem` (reusable library) and `EventItem`
  (per-event execution copy) both store `path = ",<grandparent>,<parent>,<id>,"`
  for O(1) subtree reads. Tree helpers live in `server/src/utils/buildTree.js`;
  member-scoped visibility (a MEMBER sees only their assigned branch + ancestors)
  is in `server/src/utils/scopeItemsForMember.js`. Cascading deletes and
  plan→event cloning run inside MongoDB transactions via
  `server/src/utils/withTx.js` when the deployment supports them.
- **Core domain flow**: Planning Library (admin-curated module trees) →
  Event Plan (blueprint built from imported/cloned library modules + custom
  modules) → scheduled Event (deep clone of the plan into `EventItem`s for that
  date) → Execution tracking (status transitions, assignee/priority/due-date
  field gating by role, automatic progress roll-up from leaves to ancestors).
- **Status transitions** are transition-table controlled:
  `NOT_STARTED → IN_PROGRESS → COMPLETED`, with `BLOCKED` re-entry rules; a
  MEMBER cannot re-open completed work. Only a MANAGER changes assignee,
  priority, or due date.
- **Client structure**: `pages/` holds the 7 screens (Login, Dashboard,
  PlanningLibrary, EventPlans, Calendar, ExecutionHub, EventExecution);
  `components/common/` holds shared UI (`TreeView`, `TaskDetailDrawer`, `Toast`,
  `DropdownMenu`, `chips`) used across pages; `context/AuthContext.jsx` holds
  the JWT/session; `services/api.js` is the single axios instance all API calls
  go through.
- Phase 2 is explicitly out of scope unless separately authorized: AI plan
  generation, notifications/comments/attachments, budgets, real-time
  collaboration (Socket.IO), weighted progress, marketplace/template sharing,
  GraphQL.

## Docs worth knowing about

- `docs/API-DOCS.md` — every endpoint, required role, envelope examples.
- `docs/DATA-MODEL.md` — the five Mongoose collections and their indexes.
- `docs/PROJECT-ARCHITECTURE.md` — deep architecture reference.
- `SETUP.md` — full install/env/seed/test walkthrough with troubleshooting table.
