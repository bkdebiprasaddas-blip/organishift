# SETUP.md — Install, Run, Test (OrganiShift Phase 1)

Examiner-facing setup guide. Verified environment: **Node v24.18.0,
npm 11.16.0, MongoDB Server 8.3** (Windows). Steps are identical on other OSes
except `start.bat` (Windows-only convenience) and the Mongo service check.

## 1. Prerequisites

- Node.js 24+ and npm 11+ — check with:
  ```
  node --version
  npm --version
  ```
- MongoDB Server installed and running. On Windows check the service:
  ```
  sc query MongoDB
  ```
  Default local URI used by this project: `mongodb://127.0.0.1:27017/organishift`.

## 2. Install dependencies

There is no root `package.json` — install inside both app folders:

```
cd server
npm install

cd ../client
npm install
```

## 3. Configure environment variables

Real `.env` files are git-ignored; only `.env.example` templates are committed.

```
copy server\.env.example server\.env     # then edit values
copy client\.env.example client\.env     # optional; defaults work locally
```

Server variables (`server/.env`):

| Variable | Purpose | Local default |
|---|---|---|
| `PORT` | API port | `5000` |
| `MONGO_URI` | MongoDB connection string | `mongodb://127.0.0.1:27017/organishift` |
| `JWT_SECRET` | Token signing secret (**required in production**) | dev fallback |
| `JWT_EXPIRES_IN` | Token lifetime | `24h` |
| `CLIENT_ORIGIN` | Allowed CORS origin | `http://localhost:5173` |
| `NODE_ENV` | `development` / `production` | `development` |

Client variable (`client/.env`): `VITE_API_URL` (defaults to
`http://localhost:5000/api`).

## 4. Seed demo data (idempotent)

```
cd server
npm run seed
```

Creates **4 local demo accounts** (password for all: `Password123!`):

| Email | Role |
|---|---|
| `admin@organishift.dev` | ADMIN |
| `manager@organishift.dev` | MANAGER |
| `member1@organishift.dev` | MEMBER |
| `member2@organishift.dev` | MEMBER |

…plus reusable library trees (*Food & Catering* — 7 items, *Stage & Sound* —
4 items) and an event-plan blueprint ("Annual Function"). No events are
scheduled by the seed; schedule one via the Calendar to see execution tracking.
Demo credentials are local-only and not secrets.

## 5. Run the app

Easiest (Windows): double-click **`start.bat`** at the repository root — it
starts the MongoDB service if stopped, launches both dev servers, waits for the
API health check, and opens the browser.

Manual:

```
# terminal 1
cd server
npm run dev          # API on http://localhost:5000  (health: /api/health)

# terminal 2
cd client
npm run dev          # App on http://localhost:5173
```

## 6. Run the tests

```
cd server
npm test
```

Runs **40 automated tests** via the Node test runner against isolated test
databases (`organishift_test`, `organishift_test_http`) — never your demo data:

- `test/acceptance.test.js` (T-01…T-18): password hashing, JWT shape, RBAC
  denials, tree safety (cycle detection, atomic re-pathing, cascade deletes),
  blueprint cloning, progress roll-up maths, status transition rules, member
  scoping.
- `test/http.test.js` (H-01…H-22): response envelopes over real HTTP, route-level
  role walls, validation errors, ID-format errors, full lifecycle flows
  (schedule → update → delete), user management, dashboard stats.

Production build of the client:

```
cd client
npm run build
```

Full end-to-end rehearsal (13-step Definition-of-Done scenario against a fresh
`organishift_dod` database):

```
cd server
node scripts/dod-rehearsal.js
```

Expected: `===== DoD REHEARSAL: 13/13 steps passed =====`.

## 7. Troubleshooting

| Symptom | Fix |
|---|---|
| Login fails with seeded account | Re-run `npm run seed` (idempotent) |
| Client shows network errors | Confirm API is up: open `http://localhost:5000/api/health` |
| Mongo connection refused | Start MongoDB (`net start MongoDB` on Windows) or fix `MONGO_URI` |
| Port already in use | Change `PORT` in `server/.env`; restart |
