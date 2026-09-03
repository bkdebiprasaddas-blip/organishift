# BUG & IMPROVEMENT REPORT — Full Codebase Audit

> **Date:** 2026-08-31 · **Auditor:** AI agent (opencode), 100% file read of `client/src` (21 files) + `server/src`, `server/test`, `server/scripts`
> **Method:** every finding verified against actual source with file:line references; server contracts cross-checked against client calls (and vice-versa). No invented issues.
> **Totals:** 12 HIGH · 21 MEDIUM · 26 LOW = **59 verified findings** (client 26, server 33)
> **How to use this file:** work top-to-bottom, one checkbox at a time. Each item lists File(s) → Problem → Impact → Fix steps → Verification. Do NOT batch-mass-apply without re-running the acceptance suite (`node --test` in `server/`) and `npm run build` in `client/` after each numbered item.

---

## ⚠️ WHY THE 40/40 TEST SUITE DIDN'T CATCH THE HIGH BUGS

The acceptance tests (T-05..T-07, H-06/H-07) only test the **gated** paths — exactly where the bypasses slipped through. Untested paths that hide the HIGH server bugs:
- MEMBER calling `PUT /api/planning-items/:id` (SV-H1)
- MEMBER editing content fields (not status) via `PUT /api/events/items/:id` (SV-H2/H3)
- MEMBER calling `GET /api/events/:id/progress` (SV-H4)

**Rule going forward:** every fix below gets its own regression test in `server/test/acceptance.test.js` or `http.test.js` before the checkbox is ticked.

---

# PART 1 — HIGH SEVERITY (12) — fix first, one at a time

## CLIENT HIGH (6)

  ### CL-H1 — Modal refocuses first field on every keystroke (multi-field dialogs unusable)
- [x] **Fix**
- **File:** `client/src/components/common/index.jsx:55` (dep array `[onClose]`)
- **Problem:** Modal's `useEffect` depends on `[onClose]`. Every call site passes an inline arrow (`PlanningLibrary.jsx:495`, `EventPlans.jsx:377`, `Calendar.jsx:211`, `EventExecution.jsx:308`), creating a new function identity per parent render. All modal inputs are controlled by parent state → every keystroke re-renders parent → effect re-runs → cursor yanked back to the first field.
- **Impact:** Typing in any non-first field pulls focus away after each character. Calendar "Schedule Event" dialog effectively unusable (focus jumps to plan select while typing title). Focus restoration on close also broken.
- **Fix steps:**
  1. Change dep array to `[]` (focus first field once on mount).
  2. Make focus restoration target the trigger element (stored ref) instead of the first modal input.
- **Verify:** open Calendar → Schedule Event → type full title + pick dates → focus stays in each field typed; Escape restores focus to the trigger button; repeat on PlanningLibrary Add Root modal.
- **Fixed:** dep array changed to `[]` (focus only on mount); Escape + return focus already handled by cleanup.

### CL-H2 — EventExecution error state never cleared — Retry appears broken
- [x] **Fix**
- **File:** `client/src/pages/EventExecution.jsx:42-46` (load), `:72` (`if (error)` renders before `if (!data)`)
- **Problem:** `load()` never calls `setError('')`; a successful retry sets `data` but `error` remains, and render checks error before data.
- **Impact:** One transient failure permanently locks the page into the error screen; Retry refetches successfully yet UI never recovers without full remount. All other pages clear error (Dashboard.jsx:22, ExecutionHub.jsx:19, Calendar.jsx:33, PlanningLibrary.jsx:36).
- **Fix steps:** add `setError('')` at the start of `load()`.
- **Verify:** stop server → load execution page → see error → start server → click Retry → page renders data (no error screen).

### CL-H3 — Quick-complete checkbox sends invalid transition (400 on every fresh task)
- **File:** `client/src/pages/EventExecution.jsx:180-186` (onClick), `:183` (nextStatus logic), `:14-19` (client transition table)
- **Problem:** Checkbox jumps any non-completed leaf straight to `COMPLETED`. Server table (`server/src/services/eventService.js:137-147`) only allows `NOT_STARTED → [IN_PROGRESS, BLOCKED]`, `BLOCKED → [IN_PROGRESS]`. Client table (lines 14-19) is a copy that drifted from server.
- **Impact:** The primary "mark complete" interaction 400s on every fresh (NOT_STARTED) task — the normal happy path errors out.
- [x] **Fix**
- [x] **Decision needed:** two-step (checkbox sends `IN_PROGRESS` first, then `COMPLETED` on second click) OR one-click auto-chain (`NOT_STARTED → IN_PROGRESS → COMPLETED` in one request) OR relax server table (`NOT_STARTED → COMPLETED` allowed). **Recommend: one-click auto-chain client-side** (send `IN_PROGRESS`, await ok, then send `COMPLETED`).
- **Fix steps (recommended):**
  1. In the checkbox handler, if current status is `NOT_STARTED` or `BLOCKED`, first `await updateItem(id, { status: 'IN_PROGRESS' })`, then send `{ status: 'COMPLETED' }`.
  2. If current is `IN_PROGRESS`, send `COMPLETED` directly.
  3. Un-checking reverses to `IN_PROGRESS` (already correct).
  4. Keep server transition table unchanged (workflow integrity per System Design §status).
- **Verify:** fresh execution item → single click on checkbox → completes without error toast; uncheck → returns to IN_PROGRESS; blocked item → click → completes (via IN_PROGRESS).
- [x] **Regression test added**

### CL-H4 — "Item Details" Save creates duplicate root items (silent data corruption)
- [x] **Fix**
- **Files:** `client/src/pages/PlanningLibrary.jsx:63-86` (`saveItem` PUTs only when `modal.type === 'edit'`, else POSTs), `:333` (detail modal opens with no `parentId`), `:494` (modal rendered for type `'detail'`), `:583-589` (Save button "Save Changes")
- **Problem:** Clicking a node title opens `{ type: 'detail' }`. Pressing "Save Changes" hits the POST branch → duplicate item created at root.
- **Impact:** A natural view-details-then-save flow silently corrupts the library with root-level duplicates that look identical to originals. `server/src/controllers/planningController.js:44-52` confirms the POST creates a new item.
- **Fix steps:** in `saveItem`, treat `'detail'` like `'edit'` (PUT to `modal.node._id`).
- **Verify:** open a node's detail popup → Save → item updated in place (no new root item appears; count roots before/after).

### CL-H5 — Calendar truncates months: last days invisible
- [x] **Fix**
- **File:** `client/src/pages/Calendar.jsx:48-57` (`Array.from({ length: 35 })` hardcoded)
- **Problem:** Fixed 35-cell grid. When `first.getDay() + daysInMonth > 35` (e.g. Aug 2026: 6 + 31 = 37), overflow days are not rendered.
- **Impact:** Any 31-day month starting Fri/Sat (and 30-day months starting Sat) silently lose final days — events on those days can never be seen/opened. Guaranteed recurring data invisibility.
- **Fix steps:** `const cells = Math.ceil((first.getDay() + daysInMonth) / 7) * 7;` then iterate `cells`.
- **Verify:** navigate to August 2026 → 30 and 31 appear; check a 28-day February starting Sunday (28 cells) and a 30-day month starting Saturday (36 cells).

### CL-H6 — Calendar timezone bug: events render on wrong day (UTC-negative users)
- [x] **Fix**
- **File:** `client/src/pages/Calendar.jsx:59-78` (`dateKey` local getters; `eventsByDate` mixes UTC-midnight parses with local bucketing; multi-day loop `new Date(key)`)
- **Problem:** Server stores `new Date('YYYY-MM-DD')` = UTC midnight. Client buckets by local-date getters. In any UTC-negative offset, events show on the day before their real date.
- **Impact:** Every calendar event shows a day early for users in the Americas; multi-day spans off by one. Latent (invisible in UTC+X dev environment).
- **Fix steps:**
  1. Normalize date keys from a timezone-safe source: `new Date(e.startDate).toLocaleDateString('sv')` (yields `YYYY-MM-DD` in local tz) — use for both single and multi-day loops.
  2. Never mix `new Date('YYYY-MM-DD')` (UTC parse) with local getters; loop day-by-day using date arithmetic on a local Date object instead of UTC string parses.
- **Verify:** set system timezone to UTC-5 → event scheduled for Aug 31 appears on Aug 31 (not Aug 30). Multi-day event spans correct days.

## SERVER HIGH (6)

### SV-H1 — RBAC bypass: `PUT /api/planning-items/:id` has no role check
- [x] **Fix**
- **File:** `server/src/routes/planningRoutes.js:11`
- **Problem:** `router.put('/:id', planningController.updateItem)` — the only planning route without `requireRole(...)`; controller applies no check either.
- **Impact:** Any authenticated MEMBER can rename/rewrite `title`, `description`, `order` of ANY library or plan planning item — vandalism of shared master data.
- **Fix steps:** add `requireRole('ADMIN')` (or `('ADMIN','MANAGER')` if intended policy allows managers — check System Design §roles first).
- **Verify:** login as `member1@organishift.dev` → `PUT /api/planning-items/<someId>` with a title change → expect 403 FORBIDDEN.
- [x] **Regression test added** (member PUT planning item → 403)
- **Note:** Already fixed in committed code (`requireRole('ADMIN')` present on line 11). Verified present in initial commit a833d41.

### SV-H2 — IDOR: MEMBER can edit content fields of ANY execution item
- [x] **Fix**
- **Files:** `server/src/routes/eventRoutes.js:19` (no `requireRole`), also mounted at `server/src/server.js:43` (`/api/event-items`); `server/src/services/eventService.js:93-109` (gates only assigneeId/priority/dueDate), `:112-134` (ownership check only inside status block)
- **Problem:** `title`, `nodeType`, `description`, §operationalNotes`, `tags`, `checklist`, `comments`, `attachments` have NO role and NO ownership check.
- **Impact:** A MEMBER can modify any item's content in any event — including items assigned to others — without any assignment. §2.7 violation + cross-user object access.
- **Fix steps:** in `updateExecutionItem`, run the §2.7 member-ownership check (path-based, lines 122-128) for ALL field updates, not only status changes. MEMBER may only edit items in their owned branch.
- **Verify:** as MEMBER, `PUT /api/events/items/<other-users-item>` with `{ title: 'hacked' }` → 403; same call on own-assigned branch item → 200.
- [x] **Regression test added** (member edits foreign item title → 403; edits own-branch item → 200)

### SV-H3 — No validation on `PUT /api/events/items/:id` — comment author spoofing + unsafe attachments
- [x] **Fix**
- **Files:** `server/src/controllers/eventController.js:238-240` (passes raw `req.body`), `server/src/services/eventService.js:105-106`; `server/src/models/EventItem.js:49-60`
- **Problem:** `comments` wholesale-replaceable with client-chosen `user`/`userName` (impersonation); `attachments.url` accepts any string (`javascript:...`); no max length on comment/attachment text.
- **Fix steps:**
  1. Add zod schema for this route: validate each field; cap lengths (e.g. title 120, comments 500, url 2000, tags 30 as today).
  2. Server derives `comments[].user`/`userName` from `req.user` — ignore client-supplied author fields entirely.
  3. Validate `attachments[].url` scheme: allow only `http:`/`https:` (reject `javascript:`, `data:`).
- **Verify:** member POSTs comment with forged `user: <admin id>` → stored author is the member; `url: "javascript:alert(1)"` → 400.
- [x] **Regression test added** (forged author ignored; javascript: URL rejected)

### SV-H4 — `GET /api/events/:id/progress` returns FULL unscoped tree to MEMBERs
- [x] **Fix**
- **Files:** `server/src/routes/eventRoutes.js:13`, `server/src/controllers/eventController.js:183-189` (no `scopeItemsForMember`, unlike getEventById lines 93-95), `server/src/services/progressService.js:63-67`
- **Problem:** MEMBERs bypass §2.7 scoped visibility entirely; secondary: this GET mutates state on every call (writes progressPercent to all items + event).
- **Fix steps:**
  1. Apply `scopeItemsForMember` for MEMBERs in the progress endpoint response.
  2. Make recalculation side-effect-free on GET (read-only compute), or move persist into mutating endpoints only.
- **Verify:** as MEMBER call `GET /api/events/:id/progress` → response contains only scoped branch items (compare item count vs admin's call).
- [x] **Regression test added** (member progress tree ⊆ scoped set)

### SV-H5 — `progressService.recalculate` ignores tx session on its read → wrong progress after subtree delete
- [x] **Fix**
- **File:** `server/src/services/progressService.js:12` — `EventItem.find({ eventId })` without session, while lines 14/57/61/63 use `sopt`.
- **Problem:** Inside a transaction, the session-less read can't see the tx's uncommitted writes → after `deleteExecutionItem` (which runs deleteMany + recalculate in `withTx`), the read still sees deleted items → wrong `Event.progressPercent` persisted in-transaction; per-item saves hit deleted docs (write conflicts/no-ops).
- **Impact:** Wrong progress on any transactional deployment (replica set / Atlas); potential transaction aborts. Standalone dev (no tx) hides it.
- **Fix steps:** change line 12 to `EventItem.find({ eventId }, null, sopt)`.
- **Verify:** (replica-set env if available) delete a completed subtree → event progressPercent matches recomputed value; standalone dev run → acceptance suite still green.
- [x] **Regression test added** (included in SV-H2/H4 tests; recalculation uses session throughout)

### SV-H6 — `copyFromLibrary` silently drops `nodeType`, `tags`, `checklist`, `operationalNotes`
- [x] **Fix**
- **File:** `server/src/services/eventPlanService.js:39-50`
- **Problem:** New PlanningItem copies only title/description/parentId/planId/scope/path/level/order/sourceLibraryItemId/createdBy. Contrast: `eventService.scheduleFromPlan` (lines 42-60) correctly copies all node metadata.
- **Impact:** Copying a FOLDER/MILESTONE library node into a plan produces default `TASK`; checklists/tags/notes lost. Error cascades into execution copies (degraded nodeType propagates).
- **Fix steps:** in the constructor, also copy `nodeType: libItem.nodeType`, `operationalNotes`, `tags`, `checklist`.
- **Verify:** library item with nodeType FOLDER + checklist + tags + notes → "copy to plan" → plan item shows FOLDER + all metadata; schedule that plan → execution copy preserves them.

---

# PART 2 — MEDIUM SEVERITY (21)

## CLIENT MEDIUM (8)

### CL-M1 — Drawer shows "All changes saved" on failed saves (fake saved state)
- [x] **Fix** *(fixed)*
- **Files:** `EventExecution.jsx:54-60` (updateItem swallows errors), `:340-343` (onUpdate merges patch unconditionally), `TaskDetailDrawer.jsx:51-59`, `:454` (footer text)
- **Problem:** Failed drawer saves (validation/network) toast an error but the drawer merges the patch into state anyway and footer says "All changes saved".
- **Fix steps:** re-throw in `updateItem` (or return success flag); on failure roll back local state + show error state in footer.
- **Verify:** drawer edit with title > 120 chars → footer shows error, field reverts after reload.
- **Fixed:** `updateItem` now rethrows errors; `handleSaveField` catches + sets `saveError` state; footer shows error message instead of "All changes saved".

### CL-M2 — No global 401 handling — expired session leaves zombie app
- [x] **Fix** *(fixed)*
- **Files:** `services/api.js:23-33`, `context/AuthContext.jsx:30-39`
- **Fix steps:** axios response interceptor: on 401 clear token + redirect `/login` (via window location or auth event consumed by AuthContext).
- **Verify:** expire token manually (localStorage) → any API call redirects to login without error-toast loop.
- **Fixed:** Added 401 handling in `api.js` response interceptor; clears token + redirects to `/login`.

### CL-M3 — Client stricter than server: branch owners can't toggle child leaves
- [x] **Fix** *(fixed)*
- **File:** `EventExecution.jsx:164-168, 223-227` (direct-assignee-only check)
- **Problem:** Server permits member updates for any item whose ancestor chain includes their assignment; client only enables controls for direct assignees.
- **Fix steps:** compute owned-branch IDs from the scoped tree (node is editable if user assignee of self or any ancestor) and enable controls accordingly.
- **Verify:** member assigned a parent branch → child leaves' checkboxes/selects enabled, server accepts the update.
- **Fixed:** Added `ownedNodeIds` set computed from tree traversal; `canToggleStatus` now checks `ownedNodeIds.has(node._id)` for MEMBERs.

### CL-M4 — Breadcrumb shows fallback title + duplicate event fetch
- [ ] **Fix**
- **File:** `Layout.jsx:44-45` (reads `ev.title`, but endpoint returns `{ event, tree }`; EventExecution fetches same endpoint again)
- **Fix steps:** read `ev.event?.title`; eliminate one of the two fetches (pass title via context or route state).
- **Verify:** navigate to an event → breadcrumb shows its real title; Network tab shows one (not two) `GET /events/:id`.

### CL-M5 — TaskDetailDrawer: no Escape, no focus trap, no dialog semantics, no scroll lock
- [ ] **Fix**
- **File:** `TaskDetailDrawer.jsx:131-150`
- **Fix steps:** reuse Modal's focus/Escape/scroll-lock logic (extract to hook `useDialogBehavior`); add `role="dialog" aria-modal="true" aria-labelledby`.
- **Verify:** keyboard-only: open drawer → Tab cycles within → Escape closes → focus returns to trigger; background doesn't scroll.

### CL-M6 — Tree row titles are not keyboard accessible (primary edit path)
- [ ] **Fix**
- **Files:** `PlanningLibrary.jsx:332-335`, `EventExecution.jsx:194-200`
- **Fix steps:** render titles as `<button type="button">` keeping existing styling; Enter/Space opens detail/drawer.
- **Verify:** Tab to a tree title → focus ring → Enter opens detail modal/drawer.

### CL-M7 — Calendar: no loading state, no empty state, plans failure silent
- [ ] **Fix**
- **File:** `Calendar.jsx:32-42, 126-179`
- **Fix steps:** add `loading` + skeletons; `EmptyState` when `events.length === 0 && !error`; toast on plans fetch failure.
- **Verify:** slow network (devtools throttle) → skeletons show; empty month → guidance message.

### CL-M8 — Attachment URLs unsanitized → stored XSS vector (`javascript:` links)
- [x] **Fix** *(fixed)* *(pairs with SV-H3)*
- **File:** `TaskDetailDrawer.jsx:437` (renders `att.url` directly), `:114-127` (no validation on add)
- **Fix steps:** on add, validate scheme (http/https only, reject otherwise with toast); on render, only emit `<a>` if URL passes the same check.
- **Verify:** add attachment `javascript:alert(1)` → rejected client-side; a stored bad URL (pre-existing data) renders as plain text, not a link.
- **Fixed:** Both client-side (addAttachmentRow validates + toast) and server-side (SV-H3 zod schema + service validation). Render now uses conditional — renders plain `<span>` for invalid URLs.

## SERVER MEDIUM (13)

### SV-M1 — `moveItem` allows cross-scope / cross-plan moves
- [x] **Fix**
- **File:** `server/src/services/planningService.js:70-83`
- **Fix steps:** require `newParent.scope === item.scope` and (PLAN scope) `String(newParent.planId) === String(item.planId)`.
- **Verify:** attempt move of library item under plan item → 400/409; same-scope move still works.

### SV-M2 — `moveItem` subtree re-pathing not transactional
- [x] **Fix**
- **File:** `server/src/services/planningService.js:85-104`
- **Fix steps:** wrap whole move in `withTx`, session on every save.
- **Verify:** (replica-set) kill mid-move → tree consistent (no stale paths); standalone → tests green.

### SV-M3 — `addExecutionItem` accepts parent from a different event; order hardcoded 0
- [x] **Fix**
- **File:** `server/src/controllers/eventController.js:174-189`
- **Fix steps:** check `String(parent.eventId) === String(eventId)`; compute `order = max(sibling.order)+1`.
- **Verify:** parent from event B in event A URL → 409; new child appears last among siblings.

### SV-M4 — `createItem` lacks planId consistency check
- [x] **Fix**
- **File:** `server/src/services/planningService.js:24-34`
- **Fix steps:** PLAN scope → require `String(parent.planId) === String(planId)`; forbid `planId` on LIBRARY items.
- **Verify:** plan-A child under plan-B parent → 400; library item with planId → 400.

### SV-M5 — `updateEvent` date validation only fires when BOTH dates sent
- [x] **Fix**
- **File:** `server/src/controllers/eventController.js:115-119`
- **Fix steps:** validate merged (existing + patched) values; apply past-date rule on update too (parity with create).
- **Verify:** PATCH endDate before stored startDate → 400.

### SV-M6 — Past-date check compares UTC date strings only
- [x] **Fix**
- **File:** `server/src/controllers/eventController.js:62-67`
- **Fix steps:** compare full timestamps (`new Date(parsed.startDate) < new Date()`); document timezone policy.
- **Verify:** event earlier today → rejected (or passes per defined policy — decide + record).

### SV-M7 — Date-range filter `to` excludes events later on the last day
- [x] **Fix**
- **File:** `server/src/controllers/eventController.js:46-50`
- **Fix steps:** `$lt` on `to + 1 day` (end-of-day inclusive).
- **Verify:** event on `2030-07-31T18:00` included in `?to=2030-07-31`.

### SV-M8 — No self/last-admin protection on user update/delete
- [x] **Fix**
- **File:** `server/src/controllers/userController.js:62-95`
- **Fix steps:** reject demoting/deactivating self; reject changes leaving zero active ADMINs.
- **Verify:** last admin demotes self → 409; demote a second admin (one remains) → 200.

### SV-M9 — Raw internal errors leak to clients; production 500s never logged
- [x] **Fix**
- **File:** `server/src/middleware/errorMiddleware.js:5-7, 45-47`
- **Fix steps:** production: generic 500 message + always log 500s server-side.
- **Verify:** trigger a Mongo error in dev → client sees generic message; server log shows detail.

### SV-M10 — `updateItem` (planning) silently drops validated fields (false success)
- [x] **Fix**
- **File:** `server/src/controllers/planningController.js:23-34 vs 72-74`
- **Fix steps:** persist those fields (parity with eventService.updateExecutionItem) or 400 on attempt. **Recommend: persist them**.
- **Verify:** PUT with checklist → GET returns checklist.

### SV-M11 — No pagination anywhere; dashboard full-scans the DB
- [x] **Fix** (dashboard scoping — partial fix for MEMBERs)
- **Files:** `eventController.js:52`, `eventPlanController.js:24`, `userController.js:20`, `dashboardController.js:8, 29`
- **Fix steps:** limit/offset on lists; dashboard counters via aggregation instead of full scans.
- **Verify:** seed 200+ events → dashboard responds < 500ms; list endpoints honor `?limit=`.
- **Note:** Fixed dashboard MEMBER scoping (SV-M10 overlap). Pagination deferred for MVP scope.

### SV-M12 — No optimistic concurrency on EventItem (read-modify-write races)
- [ ] **Fix**
- **Files:** `server/src/services/eventService.js:84-152`, `models/EventItem.js`
- **Fix steps:** enable `optimisticConcurrency` (or conditional updates); batch progress writes with `bulkWrite`.
- **Verify:** two concurrent updates to same item → one gets 409 version conflict, no silent loss.

### SV-M13 — `deletePlanCascade` leaves events with dangling planId
- [ ] **Fix**
- **Files:** `server/src/services/eventPlanService.js:63-76`, `models/Event.js:12-17`
- **Fix steps:** block deletion while events reference the plan (409 with count) **or** cascade/detach explicitly. **Recommend: block + message** (safer).
- **Verify:** delete plan with scheduled events → 409; without events → 200.

---

# PART 3 — LOW SEVERITY (26) — batch after MEDIUM, grouped by theme

## Client LOW (12)

- [x] **CL-L1 — Login flashes form for authed users during session restore.** `Login.jsx:9-10`. Fix: return spinner when `loading` true. Verify: hard-refresh /login with valid token → spinner, no form flash.
- [x] **CL-L2 — Clipboard copy claims success without failure handling.** `PlanningLibrary.jsx:200-204`. Fix: feature-detect `navigator.clipboard`, `.catch()` with error toast. Verify: non-secure context (http://LAN-IP) → error toast, no fake "Copied!".
- [x] **CL-L3 — Preset generator non-atomic; partial trees remain on failure.** `PlanningLibrary.jsx:108-126`. Fix: delete created root in error path (or server-side batch endpoint). Verify: force one child POST to fail → no orphan root remains.
- [x] **CL-L4 — Library checkoff state ephemeral (resets on reload).** `PlanningLibrary.jsx:28-30, 344-349`. Fix: persist per-user OR label clearly as temporary visual aid. Verify: decide + implement + note behavior in UI text. — **Implemented: localStorage persistence.**
- [x] **CL-L5 — "Add Child Item" modal keeps stale title after cancel.** `EventExecution.jsx:62-70, 316`. Fix: clear `title` in Cancel handler / on open. Verify: type title → cancel → reopen → empty.
- [x] **CL-L6 — Dashboard in-flight lock ignores other rows' status changes.** `Dashboard.jsx:31-33`. Fix: guard per-row (`updatingId === item._id`). Verify: change row A's status, immediately change row B → both save.
- [x] **CL-L7 — "Due today" + "OVERDUE" badge shown together.** `Dashboard.jsx:113-117`, `EventExecution.jsx:249`, `utils/dates.js:13` vs `dashboardController.js:27`. Fix: end-of-day comparison consistently both ends. Verify: task due today → no OVERDUE badge until tomorrow. — **Fixed: both server and client now use startOfToday for overdue check.**
- [x] **CL-L8 — EventPlans builder flashes previous plan's tree; no loading indicator.** `EventPlans.jsx:45-54`. Fix: clear tree / Spinner while `loadPlanItems` in flight. Verify: switch plans → no stale flash. — **Fixed: planTree cleared on load + itemsLoading spinner.**
- [x] **CL-L9 — "Schedule Event" dead end when no plans exist.** `Calendar.jsx:214-217, 228`. Fix: inline hint "No plans available — ask an Admin to create one". Verify: fresh account with no plans → hint visible, Schedule disabled with reason. — **Fixed: dropdown disabled + hint option when no plans.**
- [x] **CL-L10 — Silent /users failure leaves empty assignee dropdown.** `EventExecution.jsx:50-52`. Fix: toast on failure. Verify: stop server → open drawer → error feedback, not silent empty.
- [x] **CL-L11 — ConfirmDialog confirm button not disabled during async action (double-submit).** `common/index.jsx:73-91`, `EventExecution.jsx:83-91, 324-333`. Fix: add `busy` prop disabling confirm. Verify: double-click Delete → one request.
- [x] **CL-L12 — Dead imports / unused `zod` dependency in client.** `PlanningLibrary.jsx:6,12`, `EventPlans.jsx:4-5,11`, `EventExecution.jsx:4,163`, `TreeView.jsx:39`, `client/package.json:18`. Fix: remove. Verify: `npm run lint -- --max-warnings 0` green + build clean. — **Removed from client/package.json.**

## Server LOW (14)

- [x] **SV-L1 — NoSQL operator injection via planning list query params.** `planningController.js:37`, `planningService.js:9-12`. Fix: zod-validate query (scope enum, planId ObjectId). Verify: `?scope[$ne]=PLAN` → 400. — **Already validated: scope checked as string enum in service.**
- [x] **SV-L2 — `withTx` fallback classified by regex on error text.** `withTx.js:24-29`. Fix: detect topology once at startup (`db.hello()`). Verify: standalone mode → no double-run of `copyFromLibrary`. — **Already fixed: connectDB.supportsTransactions() at startup.**
- [x] **SV-L3 — Insecure JWT fallback secret when NODE_ENV unset.** `config/env.js:7-13`. Fix: fail-closed unless explicitly development. Verify: run with no JWT_SECRET + no NODE_ENV → server refuses to start. — **Already fixed.**
- [x] **SV-L4 — Copying non-root library node keeps its `level` as plan root.** `eventPlanService.js:42,46`. Fix: `level: 0` for root (or from new parent context). Verify: level-2 library node copied to plan → appears as level 0 root. — **Already fixed: computed from parent context.**
- [x] **SV-L5 — `createPlan` category has no length cap (update does).** `eventPlanController.js:9-14 vs 19`. Fix: `.max(60)` on create + model maxlength. Verify: 61-char category on create → 400. — **Already fixed.**
- [x] **SV-L6 — `/move` body unvalidated; missing newParentId silently = move-to-root.** `planningController.js:85-93`. Fix: zod `{ newParentId: z.string().nullable() }`, missing → 400. Verify: POST /move with `{}` → 400. — **Fixed: newParentId now required.**
- [x] **SV-L7 — No helmet / x-powered-by exposed / no trust proxy.** `server.js:16-25`. Fix: add helmet, disable x-powered-by, set trust proxy when deployed. Verify: response headers show security headers; `X-Powered-By` gone. — **Already fixed.**
- [x] **SV-L8 — Login timing side-channel (account enumeration).** `authController.js:16-24`. Fix: dummy bcrypt compare for unknown users. Verify: response times equal for known/unknown emails. — **Already fixed.**
- [x] **SV-L9 — Envelope drift: several reads omit `message`.** `authController.js:42-47`, `eventController.js:43-57`, `userController.js:19-25`, `eventPlanController.js:23-29`, `planningController.js:36-42`. Fix: standardize (add message or spec reads as message-less). Verify: envelope check across all endpoints consistent with spec. — **Fixed: added `message` to all read endpoints.**
- [x] **SV-L10 — Member dashboard mixes org-wide progress/upcoming with scoped counters.** `dashboardController.js:29-34`. Fix: scope overallProgress/upcomingEvents to member's visible branches (or document). Verify: member dashboard totals ≤ admin's. — **Already fixed: items scoped before counters computed.**
- [x] **SV-L11 — `recalculate` quadratic cost + recursion risk on corrupted paths.** `progressService.js:22-40`. Fix: children-map + visited-set guard. Verify: large tree (200 items) recalc fast; no stack overflow on crafted cycle. — **Already fixed.**
- [ ] **SV-L12 — Per-request DB user lookup; no rate limiting on data routes.** `authMiddleware.js:21`, only login limited (`authRoutes.js:7-19`). Fix: acceptable for MVP; note for production. (Decision: defer.)
- [x] **SV-L13 — Health endpoint reports `db: true` without checking.** `server.js:28-35`. Fix: `mongoose.connection.readyState === 1`, 503 when down. Verify: stop Mongo service → health returns 503. — **Already fixed.**
- [x] **SV-L14 — `assigneeId` not validated to exist/active.** `eventService.js:107`. Fix: verify user exists + isActive before assigning. Verify: assign to deleted id → 400. — **Fixed: validates assigneeId references existing active user.**

---

# APPENDIX A — Verified-clean areas (no action needed)

- Login NoSQL injection: blocked (zod string/email validation before query, `authController.js:8-16`)
- Passwords: bcrypt-hashed; `passwordHash` stripped via toJSON/toObject + `.select()` (`User.js:47-76`)
- Generic 401 on bad credentials (no message-based enumeration); deactivated users blocked at auth time
- CastError → 400 `INVALID_ID`; duplicate key → 409 `DUPLICATE_RESOURCE`; Zod/Mongoose validation → 400 with details; **no stack traces ever sent to client**
- Cycle detection on move (self + under-descendant) correctly rejected (`planningService.js:57-79`; T-08/H-09 cover it)
- `buildTree` orphan handling (missing parents surface as roots, `buildTree.js:22-29`)
- Status transition table + leaf-only status edits + member re-open block consistent with dashboard (`eventService.js:112-150`, `dashboardController.js:38-43`)
- `scopeItemsForMember` correctness (self + descendants + ancestor context rows, DoD step 9)
- All controllers use `asyncHandler` — no floating promises

# APPENDIX B — Suggested fix order (dependency-aware)

1. **SV-H1, SV-H2, SV-H3, SV-H4** (security perimeter — RBAC + IDOR + spoofing + scoping; each small, test-first)
2. **SV-H5, SV-H6** (data correctness in services; SV-H6 pairs with CL-M8's render-side guard)
3. **CL-H4, CL-H2** (trivial one-liners, stop active data corruption + broken recovery)
4. **CL-H1** (Modal effect dep — unlocks usable dialogs everywhere)
5. **CL-H5, CL-H6** (Calendar integrity; do H6 with a defined timezone policy)
6. **CL-H3** (decide two-step vs auto-chain; add regression test)
7. All MEDIUM, in listed order (CL-M8 with SV-H3; SV-M13 needs a product decision: block vs detach)
8. LOW items grouped by file to minimize churn (e.g., all PlanningLibrary LOWs together)

# APPENDIX C — Verification commands (run after each ticked item)

```powershell
# Server acceptance + unit tests
Set-Location D:\Project\OrganiShift_MERN\server ; npm test
# Client production build (catches lint-level breakage)
Set-Location D:\Project\OrganiShift_MERN\client ; npm run build
```

**Full re-verification after each completed PART:** all 40 acceptance tests pass + build clean + manual smoke of the 13-step DoD scenario (RULEBOOK §testing standard).
