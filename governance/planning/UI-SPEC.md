# UI-SPEC.md — UI Design Specification (Phase 1 MVP, six pages)

UI requirements for the DESIGN/UI gate. The UI is iterative by default until
the owner says **"UI is final"** / **"start backend"**. Derived from System
Design §31 + AI Execution Spec §16 + **build spec §2.8 / §4 / T-012…T-035**.

## 1. Page inventory
| Route | Page | Key components | Endpoints |
|---|---|---|---|
| `/login` | Login | email, password, submit, inline error banner | POST /api/auth/login |
| `/dashboard` | Dashboard | six counter cards, progress, upcoming deadlines | GET /api/dashboard/stats |
| `/planning-library` | Planning Library | recursive tree, expand/collapse, inline add/rename, move, delete confirm | planning-item routes |
| `/event-plans` | Event Plans | plan cards, builder panel, add-from-library picker, custom item form | event-plan routes + from-library |
| `/calendar` | Calendar | month grid, event pill, schedule dialog with plan picker | GET/POST /api/events |
| `/execution` | Execution Hub | icon box grid per event, status filter pills | GET /api/events |
| `/events/:id` | Event Execution | progress header, recursive tree with status/assignee/priority/due controls | event-item + progress routes |

## 2. States every page must handle
- **Loading** — skeleton rows/spinner inside the panel; never a blank screen.
- **Empty** — short line + primary action (e.g. "No library items yet — create
  your first one").
- **Error** — retry button + message from the error envelope; never silent.
- **Forbidden** — control hidden; a blocked request shows a clear 403 message.
- **Saving/submitting** — button disables + progress; no double submission.

## 3. Shared TreeView contract (one component, three contexts)
`<TreeView nodes tree expandedIds onToggle permissions={{add,edit,remove,move}}
renderMeta>`
- Library rows: `renderMeta` → nothing.
- Plan rows: `renderMeta` → source badge.
- Event rows: `renderMeta` → status, assignee, %.
- Drives expand/collapse, ordering, permitted actions, per-context metadata.
No separate tree implementations.

## 4. Layout & navigation (build spec T-012)
- **AppShell + Sidebar (248px fixed) + TopBar + PageHeader + MobileNavigation
  drawer + UserMenu (logout).** Role-filtered navigation:
  - Admin: Dashboard · Planning Library · Event Plans · Calendar
  - Manager: Dashboard · Planning Library · Calendar
  - Member: Dashboard · Calendar
- **Execution is a top-level sidebar nav item — OWNER DECISION 2026-08-23
  (replaces the earlier "not a nav item" rule).** Route: `/execution`.
  Lists all scheduled events as clickable icon boxes (large icon tile + title +
  date/venue + status badge + progress bar + summary line + "Open execution"
  link). Clicking a box opens `/events/:id` (full execution tree). Visible to
  all roles; the API filters the list by permissions (Member sees only events
  where they have assigned work). Status-filter pills at the top: All / Planned
  / Ongoing / Done. Breadcrumb from execution detail: `Execution / <event title>`.
- **Sidebar nav (updated):
  - Admin: Dashboard · Planning Library · Event Plans · Calendar · Execution
  - Manager: Dashboard · Planning Library · Calendar · Execution
  - Member: Dashboard · Calendar · Execution
- Active item marked by **fill AND a left accent bar**. No notification bell,
  no settings link. Role badge visible.
- Delete of a parent = cascade; **require confirmation** showing the item count
  and up to five names (build spec T-019) before destructive deletion.

## 5. Pages — behaviors (build spec §2.8 / §4 / T-019…T-031)
- **Login (T-011):** Zod + React Hook Form with real `<label>`s; submit disabled
  + `Signing in…` while pending; **generic inline error (never reveals whether
  email exists)**; no registration/social. Logo/back to dashboard.
- **Planning Library (Admin only, T-019):** `+ New Item`; row kebab `⋮`
  `Add Child · Rename · Move · Delete` shown on hover/focus **only for Admin**
  (Manager sees no kebab at all); tree with expand/collapse chevron per parent
  node, `Expand All` / `Collapse All` buttons; collapse shows folder icon +
  hidden count badge. Inline add-child (Enter submit / Escape cancel), inline
  rename, move dialog (parent picker excludes item + descendants; show
  `CYCLE_DETECTED` and leave the tree on rejection); delete confirm with
  count + up to 5 names. Optional one client-side name filter. All five states.
- **Event Plans (Admin, T-022):** plan cards (title, item count, last updated)
  + `Open`; builder **on the same route** (no seventh page); tree left / details
  right; `+ Add Item` (custom, parent picker) + `+ Add From Library`; **no global
  Save — every action commits immediately**; `[Library]` vs `[Custom]` badges;
  explicit copy picker ("7 items will be copied… later changes won't affect this
  plan").
- **Calendar (T-026):** month grid `◀ September 2026 ▶` + `Today` button; 7-column weekday grid (Sun–Sat); 35-cell date grid; event pills placed on start/duration dates with status color dot + title + progress bar + %; clicking pill navigates to `/events/:id`. Schedule dialog: plan picker, title, start date, optional end date, optional venue.
- **Event Execution (T-028…T-030):** header = title, dates, venue (omit row when
  absent), event-status badge, progress bar, counts line. Field-gated controls
  per build spec §4:
  - **Member:** status dropdown on **owned incomplete leaves** only; read-only
    chips elsewhere (ancestors read-only).
  - **Manager:** status · assignee · priority · due date · add child.
  - **Admin:** status · add child — **no assign / priority / due date**.
  - Parent status = **plain derived text**, never a disabled dropdown. Overdue =
    badge beside status chip + marks collapsed ancestors.
  - Progress cascade repaint from the returned tree (no reload), ~300ms animate.

## 6. Dashboard (T-031)
Six counter cards in frozen order: Total Items · Completed · Pending ·
In Progress · Overdue · Progress. **Overdue card labelled as overlapping**;
Blocked shown as a sub-line under Pending (e.g. `12 Pending · 1 blocked`).
One progress bar. Upcoming events + deadlines → `/events/:id` (branch
pre-expanded). **My Assigned Work** section for Members (inline status editing)
— reachable in one click from login, not a seventh page.

## 7. Accessibility / polish (Sprint 7 — T-032…T-035)
- **No optimistic UI** — repaint from the returned tree; no flip-back-on-failure.
- Content-shaped loading skeletons (never blank/full-page spinner after shell);
  permission-aware empty states; error with retry (envelope message, no stack);
  forbidden 403 message; saving disables + labels.
- Responsive: ≥1024 fixed sidebar/3-col; 768–1023 icon rail/2-col; <768
  drawer/1-col stacked tree cards/scrollable calendar; touch targets ≥44px.
- Accessibility: keyboard reach for every control, 2px focus ring, real labels
  (placeholders are not labels), AA contrast, status by icon + text, errors via
  `aria-describedby`, polite live region announcing mutations.
- Status/priority colour tokens each paired with an icon (colour is never the
  only signal). Requirements note: status by icon + text, AA contrast, real
  labels, 2px focus ring.

## 8. Acceptance mapping
Each page maps to UI acceptance checks in System Design §37 (states + flows);
report with T-IDs during TESTING. UI-only changes: manual checklist sufficient.