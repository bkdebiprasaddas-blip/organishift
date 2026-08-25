# BOOTSTRAP.md — Current State (OrganiShift · Phase 1)

> Refreshed every session. "Current State" snapshot. Master rules: `RULEBOOK.md`
> (PART I–III). Short pointer: `AGENTS.md`.

## Snapshot
- **Phase:** TESTING COMPLETE + **UI/UX & Reusable Event Refinement Delivered** (2026-08-26).
  All owner-requested features implemented & verified:
  - "Planning Library" renamed to **"Reusable Event"** across routes, sidebar navigation, and header breadcrumbs.
  - Reusable Event features added: Real-time Search bar with count badge, Statistics cards (Root Templates, Sub-items, Max Depth), Quick Pre-built Template Presets (Catering, Stage & AV, Guest Reception), JSON Export & Copy Text summary tools.
  - Add Root Template, Add Folder, Add Sub-item, and Operational Notes/Description support integrated across tree items.
  - Hover Action Toolbar redesign: Action buttons (`+ Folder`, `+ Task`, `Edit`, `Move`, `Delete`) positioned inline immediately after title text, strictly scoped to hovered item row (`group-hover/row`).
  - Interactive Checklist Checkboxes added to Reusable Event and Event Execution pages (`Square` / `CheckSquare` with strikethrough styling and automatic progress recalculation).
  - Item Detail Popup Modal: Click any item card to open popup editor with operational notes & sub-item tools.
- **Stack decision:** MERN in **JavaScript**.
- **Branch:** `v1`. Work is LOCAL + UNCOMMITTED (owner triggers commits).
- **Verification (2026-08-26):** Server test suite **40/40 passed** (`node --test`); Client Vite production build clean (0 errors, built in 1.86s).

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
