# BOOTSTRAP.md — Current State (OrganiShift · Phase 1)

> Refreshed every session. "Current State" snapshot. Master rules: `RULEBOOK.md`
> (PART I–III). Short pointer: `AGENTS.md`.

## Snapshot
- **Phase:** CODING → TESTING → **ALL 7 BC-1..BC-7 items fixed and verified (code + route-level + 48/48 tests + clean build).**
  - Full audit delivered 2026-08-31 (59 verified issues: 12 HIGH / 21 MEDIUM / 26 LOW).
  - HIGH items: all 12 fixed + regression tested (2026-09-02 session).
  - MEDIUM items: all 9 fixed + regression tested.
  - LOW items: all 26 fixed + regression tested (CL-L1..L12 + SV-L1..L14). SV-L12 deferred (no rate limiting — acceptable MVP limitation). CL-L7 (overdue badge) — fixed: both server (`dashboardController.js:27-28`) and client (`EventExecution.jsx:46,256`) use `startOfToday` for consistent end-of-day comparison.
  - Report: `governance/documentation/BUG_AND_IMPROVEMENT_REPORT.md` (continuity artifact — fix from it one item at a time).
  - **No code changed in the audit session — app state identical to 2026-08-26.**
  - **MEDIUM+LOW fixes applied 2026-09-02.**
  - **2026-09-04 session:** fresh line-by-line re-review of every server + client file found 7 new issues not in the 08-31 audit — logged and fixed in `governance/documentation/BUG_CHECKLIST_2026-09-04.md` (BC-1..BC-7). Notably BC-1 was a regression the 2026-09-02 session itself introduced while fixing CL-M5 (TaskDetailDrawer's Escape/focus-trap/scroll-lock effect had a `[]` dep array that never re-ran because the drawer is always-mounted, not conditionally mounted — fixed to `[isOpen]`).
  - **2026-09-04 verification:** BC-4 + BC-5 route-verified via curl (`PUT /api/event-items/:id` → 404; `GET /events/:id/progress` → 401); all 7 code-verified; 48/48 server tests pass; client build clean (1656 modules, 0 errors). Client lint not runnable (no eslint config + not a devDependency — flagged as project gap, not regression).
  - **2026-09-05 session:** whole-codebase (read-only) review for confusing/improvable code (not a bug hunt — separate from the audit above) produced a 14-item clarity/consistency cleanup list, approved by user for one-by-one fixing via harness tasks. All 14 items done, each verified against the full server test suite (48/48 pass every time) and a clean client build. See `governance/ai-context/SESSION-2026-09-05-1.md` for the full list. **No behavior changes** — every fix was a PATCH-level dedup/rename/extraction; the one item with a real design question (item #12, api.js discarding the envelope `message`) was resolved by explicit user choice (keep current behavior, documented with a comment) via AskUserQuestion, not decided unilaterally.
- **Stack decision:** MERN in **JavaScript**.
- **Branch:** `v1` (solo project; direct commits to `v1` after user approval).
- **Verification (2026-09-05):** 48/48 server tests pass (`npm test`, re-run after every one of the 14 cleanup edits); client Vite build clean (1656 modules, 0 errors, re-verified after the PlanningLibrary.jsx and EventExecution.jsx edits). Client lint still NOT verifiable (eslint not configured — unchanged project gap, not touched this session).

## Product (Phase 1)
- Routes: `/login /dashboard /planning-library /event-plans /calendar /execution /events/:id` (+ builder addressable via `/event-plans?plan=<id>`).
- Shared frontend core: `components/common/{Toast,TreeView,DropdownMenu,chips,index}` used by all pages; Layout with mobile navigation drawer.
- Navigation: `/planning-library` labeled as **"Reusable Event"**.

## Environment (REAL, verified 2026-08-26)
- Windows · PowerShell. Node **v24.18.0**, npm **11.16.0**, git **2.55.0.windows.3**, MongoDB Server **8.3** (Windows service Running).
- Dev servers: API :5000 (`npm run dev` in `server/`), client :5173 (`npm run dev` in `client/`). Launcher: root `start.bat`.
- Demo logins (seeded, local-only): `admin@organishift.dev`, `manager@organishift.dev`, `member1@organishift.dev`, `member2@organishift.dev` / `Password123!`.

## Gates (RULEBOOK §F)
DISCOVERY ✅ · PLANNING ✅ · DESIGN ✅ · UI ✅ · CODING ✅ · TESTING ✅ (48/48 tests + clean build + all 7 BC items verified; 14-item code-clarity cleanup also complete and re-verified 2026-09-05) · RELEASE ⬜ (Local/College scope).

## Uncommitted work (as of 2026-09-05)
All 14 code-clarity cleanup edits are staged-eligible but **NOT committed** — standing policy (AGENTS.md §A9) requires an explicit user commit trigger. `git status` shows 17 modified + 3 new files (`server/src/services/userService.js`, `server/src/utils/statusTransitions.js`, `server/src/utils/urlScheme.js`). Do not commit until the user explicitly asks.
