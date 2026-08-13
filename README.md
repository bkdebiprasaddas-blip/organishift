# OrganiShift

Unified **event management system**: create events, break them into tasks, assign
tasks to people, track progress, and view reports. One MERN application
(MongoDB, Express, React, Node.js). Roles: **admin** / **user**.

## Stack

| Layer    | Tech                                        |
|----------|---------------------------------------------|
| Frontend | React 18 + Vite 5, React Router v6, axios   |
| Backend  | Express 4 + Node 24, Mongoose ODM           |
| Database | MongoDB 8.x (local service)                 |
| Auth     | JWT (access token) + bcrypt                 |

## Requirements

- Node 24+, npm 11+
- MongoDB running locally (default `mongodb://127.0.0.1:27017/organishift`)

## Setup

```bash
npm install                  # root (concurrently)
npm --prefix server install  # API dependencies
npm --prefix client install  # SPA dependencies
```

Env files (secrets never committed):

```bash
cp server/.env.example server/.env
# optionally: cp client/.env.example client/.env
```

Seed demo data (admin + demo users, events, tasks):

```bash
npm run seed
```

## Run

```bash
npm run dev        # starts API (:5000) + client (:5173) together
```

> Tip: `OrganiShift.bat` (double-click) is the recommended way to run. It
> auto-assigns free ports (API 5050+, web 5173+) so it never clashes with your
> other local projects, and remembers the chosen ports for instant relaunch.

- API: http://localhost:5050/api — client: http://localhost:5173 (ports auto-assigned when launched via `OrganiShift.bat`)
- Seed admin: `admin@organishift.dev` / `ChangeMe!123`
- Demo users: `alice@organishift.dev`, `bob@organishift.dev`,
  `carol@organishift.dev` / `DemoPass!1`

## Tests & build

```bash
npm test           # API acceptance tests (IMPL-SPEC §5)
npm run build      # production build of the client
```

## Docs

Planning, design, and implementation specs live under `Scratch/OrganiShift/`
(planning/*) — git-ignored prep/AI memory, not shipped.
