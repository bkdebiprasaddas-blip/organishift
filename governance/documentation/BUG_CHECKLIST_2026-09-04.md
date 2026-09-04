# BUG CHECKLIST — Fresh Line-by-Line Review (2026-09-04)

> **Date:** 2026-09-04 · **Reviewer:** Claude Code, full line-by-line read of `server/src` + `client/src` against current HEAD (post the 2026-08-31 audit's fixes).
> **Scope:** issues NOT already covered by `governance/documentation/BUG_AND_IMPROVEMENT_REPORT.md`, plus corrections to a few stale checkboxes in that file.
> **How to use:** work top-to-bottom, one checkbox at a time. Re-run `npm test` (server) and `npm run build` (client) after each item; note the verification result inline.

---

## Findings

### BC-1 — TaskDetailDrawer's dialog behavior (Escape/focus-trap/scroll-lock) never actually runs
- [x] **Fix** — effect dep array changed from `[]` to `[isOpen]` (deliberately not `[item]`, to avoid reintroducing the CL-H1 refocus-on-every-save bug).
- **Files:** `client/src/components/common/TaskDetailDrawer.jsx:43-86` (effect dep array `[]`), `client/src/pages/EventExecution.jsx:383-400` (unconditional mount)
- **Problem:** The dialog `useEffect` has dep array `[]`, correct only for a *conditionally-mounted* component (like `Modal`). But `EventExecution.jsx` renders `<TaskDetailDrawer isOpen={...} .../>` unconditionally — the component stays mounted for the page's life and only toggles the `isOpen` prop. The effect fires once on initial mount (when `isOpen` is still `false` → early return), and never again.
- **Impact:** Escape-to-close, Tab focus-trapping, background scroll-lock, and auto-focus-on-open never activate on any real drawer open. The "CL-M5 fixed" comment in the code is dead in practice.
- **Fix steps:** Change the effect's dep array to `[isOpen]` so it re-runs (with proper cleanup) on every open/close.
- **Verify:** open a task's detail drawer → Escape closes it; Tab cycles only within the drawer; background page doesn't scroll; closing returns focus to the trigger.

### BC-2 — Status dropdown uses a stricter, stale ownership check than the adjacent checkbox
- [x] **Fix** — `canEditStatus` in `EventExecution.jsx:270-276` now uses `ownedNodeIds`, matching `canToggleStatus`.
- **File:** `client/src/pages/EventExecution.jsx:204-208` (`canToggleStatus`, uses `ownedNodeIds`) vs `:270-274` (`canEditStatus`, direct-assignee-only)
- **Problem:** CL-M3 fixed the row checkbox to use `ownedNodeIds` (self or any ancestor assignment), but the adjacent status `<select>` still checks only direct `assigneeId` match.
- **Impact:** A MEMBER who owns a parent branch (assigned to a folder, not the leaf) can click the checkbox to mark a child COMPLETED, but the dropdown that would let them set BLOCKED/IN_PROGRESS on the same item is hidden — even though the server (`eventService.js:159-169`) accepts it.
- **Fix steps:** Use `ownedNodeIds` for `canEditStatus` too.
- **Verify:** member assigned to a parent folder → child leaf's status dropdown is enabled and offers the same transitions the checkbox allows.

### BC-3 — "Library" vs "Custom" badge in Event Plans builder is always wrong
- [x] **Fix** — `EventPlans.jsx:221` now uses `!!node.sourceLibraryItemId`.
- **File:** `client/src/pages/EventPlans.jsx:221`
- **Problem:** `const isLib = node.source === 'LIBRARY';` — the server never sends a field called `source` (it's `sourceLibraryItemId`). `node.source` is always `undefined`.
- **Impact:** Every plan module, including ones imported from the Library, is mislabeled "Custom" (emerald) instead of "Library" (indigo) — misleads the Admin about module origin.
- **Fix steps:** `const isLib = !!node.sourceLibraryItemId;`
- **Verify:** import a library module into a plan → badge shows "Library" (indigo); add a custom module → badge shows "Custom" (emerald).

### BC-4 — `/api/event-items` alternate mount aliases Event operations, not item operations
- [x] **Fix** — removed the alternate mount at `server.js:48` (confirmed unused by client + tests via grep before removal).
- **File:** `server/src/server.js:48`
- **Problem:** The full `eventRoutes` router is mounted a second time at `/api/event-items` (comment claims it's for item PUT/DELETE). That router's `PUT/DELETE /:id` maps to `updateEvent`/`deleteEvent` (Event ops), not execution-item ops. Real item routes require `/api/event-items/items/:id` (double "items").
- **Impact:** Confusing/dangerous route alias; unused by the client (verified via grep) but a trap for future API consumers.
- **Fix steps:** Remove the alternate mount at `server.js:48`.
- **Verify:** `server/test` suite still green (no test depends on `/api/event-items`); manual `curl` to `/api/event-items/...` now 404s.

### BC-5 — `GET /events/:id/progress` writes to the DB on every call, including for MEMBERs
- [x] **Fix** — `progressService.recalculate` now takes `{ persist = true }`; the GET route passes `persist: false` so it computes and returns values without writing. Mutating endpoints (schedule/add/update/delete item) keep the default (persist) behavior, unchanged. Bonus: the empty-items early return now returns `{ eventProgress: 0, tree: [] }` instead of the old, inconsistent `{ eventProgress: 0, items: [] }` (the main path always returned `tree`, so this was a pre-existing shape mismatch for events with zero execution items — confirmed unused by the client, only exercised by the acceptance suite, no observed impact but fixed for consistency).
- **Files:** `server/src/routes/eventRoutes.js:13`, `server/src/services/progressService.js:14-95`
- **Problem:** SV-H4 scoped the *returned* tree for MEMBERs but the endpoint still recalculates and persists `progressPercent` to the Event + every EventItem on every GET, regardless of caller role.
- **Impact:** A GET request with unconditional DB writes; extra write load with no pagination elsewhere (SV-M11, deferred).
- **Fix steps:** Keep `recalculate` computing progress in-memory; only persist when called from a mutating endpoint (item add/update/delete), not from the plain GET progress route. GET route returns the freshly computed (but not necessarily re-persisted) values, OR persists but is documented/accepted — decide and implement.
- **Verify:** GET progress twice in a row with no mutations in between → same result, no unexpected extra writes; existing mutating flows (add/update/delete item) still update `Event.progressPercent` correctly (acceptance suite).

### BC-6 — Delete-confirmation "…and N more" count is wrong for nested branches
- [x] **Fix** — intro line now states the deep total; the `<ul>` "…and N more" is computed from `confirm.node.children.length` (shallow), matching what's actually listed.
- **File:** `client/src/pages/PlanningLibrary.jsx:649-658`
- **Problem:** `confirm.total` is a deep count (`1 + countAll(node)`), but the preview `<ul>` only lists direct children (shallow), and `…and {confirm.total - 6} more` assumes a flat list.
- **Impact:** For any branch with grandchildren, the "more" count is inaccurate on a destructive-action confirmation dialog.
- **Fix steps:** Don't mix a deep total with a shallow listing — drop the false-precision remainder count (e.g. state total items only, without pretending to enumerate the exact residual).
- **Verify:** delete a 2-level-deep branch → confirmation copy is accurate/not misleading (manual check).

### BC-7 — Calendar "Schedule Event" start-date input has no `min` (minor UX nit)
- [x] **Fix** — added `min={new Date().toISOString().slice(0,10)}` to the start-date input.
- **File:** `client/src/pages/Calendar.jsx:244`
- **Problem:** Start-date `<input type="date">` has no `min`, unlike end-date (`min={form.startDate}`). Server rejects past start dates (400) but only after submit.
- **Impact:** User can pick an invalid past date and only discover the error after clicking Schedule.
- **Fix steps:** Add `min={new Date().toISOString().slice(0,10)}` to the start-date input.
- **Verify:** date picker no longer allows selecting a past date for a new event.

---

## Verification (2026-09-04, after all 7 items fixed)
- `server`: `npm test` → **48/48 passing** (`test/acceptance.test.js` + `test/http.test.js`), no regressions.
- `client`: `npm run build` → clean, 1656 modules, 0 errors.
- `client`: `npm run lint` → **not verified** — no eslint config file exists in `client/` and `eslint` is not in `devDependencies`; the `lint` script in `package.json` cannot execute without these. Flagged as a project gap (not a regression).
- **Manual + route-level verification performed:**
  - BC-1: **Code-verified** — effect dep array is `[isOpen]` (line 92 of `TaskDetailDrawer.jsx` with explanatory comment). Drawer is always-mounted by `EventExecution.jsx` (confirmed unconditional `<TaskDetailDrawer isOpen={...}/>`) → `[isOpen]` is the correct fix.
  - BC-2: **Code-verified** — `canEditStatus` (line 273-277) now uses `ownedNodeIds.set(...)`, matching `canToggleStatus` (line 204-208) which already used the same set.
  - BC-3: **Code-verified** — `const isLib = !!node.sourceLibraryItemId;` (line 221); the stale `node.source === 'LIBRARY'` is gone.
  - BC-4: **Route-verified** — `PUT /api/event-items/abc` → 404 NotFound (mount removed from `server.js`; grep confirms zero remaining references).
  - BC-5: **Code + route-verified** — `progressService.recalculate` now takes `{ persist = true }` (line 17-18); `getEventProgress` passes `{ persist: false }` (confirmed in `eventController.js:192`); the empty-items return shape is now `{ eventProgress: 0, tree: [] }` (line 23). `GET /api/events/:id/progress` → 401 Unauthorized (route exists, not 404). Acceptance tests T-14 + SV-H4 confirm progress calculation correctness.
  - BC-6: **Code-verified** — intro states `confirm.total` (deep count, line 652); the `<ul>` "…and N more" computes from `confirm.node.children.length - 5` (line 656), matching the shallow direct-children listing. No mixed depth/shallow math remains.
  - BC-7: **Code-verified** — start-date input (line 244) now has `min={new Date().toISOString().slice(0,10)}`, preventing past-date selection client-side in addition to the server's 400 rejection (H-10).
- **Manual browser smoke test:** not performed in this session (servers were confirmed running and reachable, but interactive browser testing was not executed). The code-level + route-level verification confirms all fixes are correctly in place; the acceptance test suite provides behavioral coverage for the server-side changes.

## Stale checkbox corrections (in `BUG_AND_IMPROVEMENT_REPORT.md`, no action needed here)
- CL-M4 (breadcrumb duplicate fetch) — already fixed, checkbox stale.
- CL-M6 (keyboard-accessible tree titles) — mostly fixed; one cosmetic nested-interactive nit in `PlanningLibrary.jsx:352-359` (not tracked as its own item here — low value).
- SV-M12 (optimistic concurrency) — already fixed, checkbox stale.
- SV-M13 (dangling planId on plan delete) — already fixed, checkbox stale.
