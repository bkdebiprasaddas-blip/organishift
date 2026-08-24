# OrganiShift

**Reusable event planning, scheduling and execution tracking system** — a MERN
stack web application built as a college project.

OrganiShift turns repeatable event checklists into reusable master templates:
an admin curates a **Planning Library** of module trees (e.g. *Food & Catering*,
*Stage & Sound*), assembles them into an **Event Plan** blueprint, schedules the
plan as a dated **Event**, and then tracks live **Execution** progress with
role-aware task assignment, status transitions and automatic roll-up
percentages.

## Problem statement

College fests and community events repeat the same planning work every year,
but the knowledge lives in spreadsheets and chat history. OrganiShift makes the
checklist itself the reusable asset: plan once, clone forever, track execution
in one place with clear accountability per role.

## Features (Phase 1 MVP)

| Area | What it does |
|---|---|
| Authentication | JWT login, three roles (**ADMIN / MANAGER / MEMBER**), no self-registration |
| Planning Library | Admin-only CRUD of master module trees; everyone else read-only |
| Event Plans | Blueprint builder — create plans, import library modules (deep copy), add custom modules |
| Calendar | Month grid of events; managers schedule an event from a plan (clones the blueprint) |
| Execution | Per-event checklist tree: assignees, priority, due dates, status transitions |
| Dashboard | Six role-scoped counters, "My Assigned Work" inline status updates, upcoming events |

Highlights:

- **Member scoping (§2.7)** — members see only their assigned branch (+ its
  ancestors), enforced server-side.
- **Field gating** — only MANAGERs change assignee/priority/due date; status is
  transition-table controlled (`NOT_STARTED → IN_PROGRESS → COMPLETED`, `BLOCKED`
  re-entry rules); members cannot re-open completed work.
- **Automatic progress** — leaves drive parent averages; event % rolls up live.
- **Safe cascades** — subtree deletes and plan→event cloning run inside MongoDB
  transactions when available.
- **Consistent API envelope** — `{ success, data, message }` /
  `{ success:false, error:{ code, message, details } }`.

## Tech stack

| Layer | Technology |
|---|---|
| Database | MongoDB 8.x + Mongoose 8 (materialized-path trees) |
| API | Node.js 24, Express 4, Zod validation, JWT auth, bcryptjs, express-rate-limit |
| Client | React 18, Vite 5, React Router 6, Tailwind CSS 3, Axios, lucide-react |
| Tests | Node test runner — 40 automated tests (service-level acceptance + HTTP layer), 13-step DoD rehearsal script |

## Architecture

Three tiers with a modular service layer on the API side:

```
React SPA (client/)                Express API (server/src/)
┌────────────────────┐   HTTP     ┌──────────┐   ┌───────────┐   ┌────────┐   ┌─────────┐
│ pages/ (7 screens) │ ─────────► │  routes  │──►│controllers│──►│services│──►│ models  │
│ components/common/ │  JSON      │(auth+RBAC)│  │ (~20 lines)│  │(business)│  │Mongoose │
│ AuthContext+api.js │ ◄───────── │ envelopes│   └───────────┘   └────┬─────┘   └────┬────┘
└────────────────────┘            └──────────┘                        ▼              ▼
                                                              MongoDB (transactions via withTx)
```

- Role checks happen at the **API boundary** (`requireRole`) and again in
  services (field gating / ownership) — hidden UI controls are convenience only.
- Trees are stored as materialized paths (`path = ",<grandparent>,<parent>,<id>,"`)
  for O(1) subtree reads.

## Repository layout

```
server/   Express + Mongoose REST API, tests, seed script, DoD rehearsal
client/   React SPA (Vite)
docs/     API reference, data model, demo script, viva notes
start.bat One-click Windows launcher (MongoDB service + API :5000 + client :5173)
```

## Quick start (Windows)

1. Install prerequisites: Node.js 24+, npm 11+, MongoDB Server running locally.
2. Double-click **`start.bat`** — it starts the Mongo service if needed, opens
   the API (`:5000`) and the client dev server (`:5173`), and launches your
   browser.
3. Log in with a seeded demo account (password `Password123!`):
   - `admin@organishift.dev` (ADMIN)
   - `manager@organishift.dev` (MANAGER)
   - `member1@organishift.dev` / `member2@organishift.dev` (MEMBER)

Manual setup, environment variables, seeding and test commands are documented
step by step in **[SETUP.md](SETUP.md)**.

## Documentation

| Doc | Contents |
|---|---|
| [SETUP.md](SETUP.md) | Install, configure, seed, run, test |
| [docs/API-DOCS.md](docs/API-DOCS.md) | Every endpoint with roles and envelope examples |
| [docs/DATA-MODEL.md](docs/DATA-MODEL.md) | The five collections, tree encoding, indexes |
| [docs/DEMO-SCRIPT.md](docs/DEMO-SCRIPT.md) | 13-step viva walkthrough with expected results |
| [docs/VIVA-NOTES.md](docs/VIVA-NOTES.md) | Anticipated viva questions, answered from this codebase |

## Screenshots

Add UI captures to `docs/screenshots/` (one per page: Login, Dashboard,
Planning Library, Event Plans builder, Calendar, Execution Hub, Event
Execution) and link them here.

## Scope note

Phase 2 candidates (AI plan generation, notifications/comments/attachments,
budgets, real-time collaboration, marketplace) are intentionally out of scope.
