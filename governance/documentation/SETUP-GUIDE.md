# SETUP-GUIDE.md — Install, Run, Configure, Test (OrganiShift Phase 1)

Local + deployment setup for the OrganiShift Phase 1 MVP. **Real, verified
environment (2026-08-23):** Node v24.18.0, npm 11.16.0, git 2.55.0.windows.3,
MongoDB Server 8.3 (Windows service `MongoDB` = Running). Re-check versions if
the machine changes (RULEBOOK §A.8: never guess).

> Secrets note: real `.env` files are git-ignored. Only `.env.example`
> templates are committed. Never paste real credentials into docs or logs.

## 1. Prerequisites
- Node.js 24+ and npm 11+ (`node --version`, `npm --version`).
- MongoDB Server installed. If not on PATH, confirm the Windows service:
  `sc query MongoDB` or check `C:\Program Files\MongoDB\Server\<ver>\bin\mongod.exe`
  (this machine: 8.3, service Running). Default URI:
  `mongodb://127.0.0.1:27017/organishift` (or `mongodb+srv://…` for a cloud DB).

## 2. Clone / branch convention
- Solo project on branch **`v1`**; direct commits to `v1` only after owner approval.
- Never commit/stage/push unless the owner asks.

## 3. Install (target, once code exists)
```
npm install                  # root (concurrently etc.)
npm --prefix server install  # API dependencies
npm --prefix client install  # SPA dependencies
```

## 4. Configure (env)
```
cp server/.env.example server/.env    # then fill real values (never commit)
# options: cp client/.env.example client/.env
```
`.env` holds: MongoDB connection string, JWT signing secret, port, client origin.
Root `.gitignore` already blocks `.env`, `.env.*`, `**/.env`, `**/.env.*` and
allows `.env.example` templates.

## 5. Seed demo data
```
npm run seed   # local-only demo (Admin/Rahul/Amit @organishift.dev +
               # Food/Stage reusable trees + Annual Function plan + event)
```
Seed values live in `server/src/seed/seed.js`, not docs; not production secrets.

## 6. Run
```
npm run dev    # API + client together
# API  -> e.g. http://localhost:5 port /api  (health: /api/health)
# App  -> e.g. http://localhost:5173
```
Default ports are placeholders; configure via env to avoid clashes.

## 7. Tests & build
```
npm test        # API acceptance tests (server/test/acceptance.test.js)
npm run build   # production build of the client
```
TESTING gate = all acceptance tests pass (T-IDs reported) + client build clean
+ the 13-step Definition-of-Done scenario passes without manual DB edits.

## 8. Security hardening (before any production demo)
- Enforce role guards + ownership on every protected route (API is the boundary;
  hidden UI controls are convenience only).
- Keep JWT secret + DB credentials only in env vars. Restrict CORS to the
  deployed origin, credentials disabled. Use the login rate-limiter.
- Never log passwords, JWT secrets, DB credentials. Central error middleware
  returns safe messages (no stack traces to clients).
- Ensure indexes (users.email unique; planningItems parentId/path/scope/
  planId-level-order; events startDate/planId; eventItems eventId-level-order/
  assigneeId/dueDate-status).

## 9. Demo (college viva)
- Deploy, don't run from a laptop terminal (survives examiner laptop).
- Seed first (fixes empty-screen problem); rehearse the 13-step DoD sheet
  (System Design Appendix B); prove RBAC with a blocked 403 request.