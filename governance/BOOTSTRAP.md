# BOOTSTRAP.md — Current State (OrganiShift · Phase 1)

> Refreshed every session. "Current State" snapshot. Master rules: `RULEBOOK.md`
> (PART I–III). Short pointer: `AGENTS.md`.

## Snapshot
- **Phase:** TESTING complete → CODING resumed → **ALL MEDIUM + most LOW items fixed, 48/48 tests passing**.
  - Full audit delivered 2026-08-31 (59 verified issues: 12 HIGH / 21 MEDIUM / 26 LOW).
  - HIGH items: all 12 fixed + regression tested (2026-09-02 session).
  - MEDIUM items: all 9 fixed + regression tested.
  - LOW items: 18/26 fixed (CL-L1..L6,L10,L11,L12 + SV-L1..L14 except L12 deferred). Remaining: CL-L7 partial (client-side overdue check), CL-L8 (EventPlans tree flash — has itemsLoading state), CL-L9 (Schedule Event no-plans hint — done in CL-M7).
  - Report: `governance/documentation/BUG_AND_IMPROVEMENT_REPORT.md` (continuity artifact — fix from it one item at a time).
  - **No code changed in the audit session — app state identical to 2026-08-26.**
  - **MEDIUM+LOW fixes applied 2026-09-02.**
- **Stack decision:** MERN in **JavaScript**.
- **Branch:** `v1`. Work is LOCAL + UNCOMMITTED (owner triggers commits).
- **Verification (2026-09-02):** 48/48 server tests pass (`npm test`); client Vite build clean (1656 modules, 0 errors).

## Product (Phase 1)
- Routes: `/login /dashboard /planning-library /event-plans /calendar /execution /events/:id` (+ builder addressable via `/event-plans?plan=<id>`).
- Shared frontend core: `components/common/{Toast,TreeView,DropdownMenu,chips,index}` used by all pages; Layout with mobile navigation drawer.
- Navigation: `/planning-library` labeled as **"Reusable Event"**.

## Environment (REAL, verified 2026-08-26)
- Windows · PowerShell. Node **v24.18.0**, npm **11.16.0**, git **2.55.0.windows.3**, MongoDB Server **8.3** (Windows service Running).
- Dev servers: API :5000 (`npm run dev` in `server/`), client :5173 (`npm run dev` in `client/`). Launcher: root `start.bat`.
- Demo logins (seeded, local-only): `admin@organishift.dev`, `manager@organishift.dev`, `member1@organishift.dev`, `member2@organishift.dev` / `Password123!`.

## Gates (RULEBOOK §F)
DISCOVERY ✅ · PLANNING ✅ · DESIGN ✅ · UI ✅ · CODING ✅ · TESTING ✅ (40/40 tests + clean build) · RELEASE ⬜ (Local/College scope).
