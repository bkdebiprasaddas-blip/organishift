# OrganiShift MERN — Comprehensive UI/UX Design & Product Feature Specification

> **Document Type:** Human Review & Compliance Reference  
> **Project:** OrganiShift (MERN Event & Operations Management System)  
> **Last Refreshed:** August 26, 2026  
> **Status:** Production-Ready & Tested (57/57 Server Tests Passing, Client Production Build Clean)

---

## Executive Summary & System Overview

**OrganiShift** is an enterprise event management, blueprint planning, and operations execution system built on the **MERN** stack (MongoDB, Express, React 18, Node.js). 

This document serves as an exhaustive, line-by-line breakdown of every UI/UX design decision, layout boundary, component contract, color system, accessibility control, and product workflow.

---

## 1. Visual Identity, Color System & Typography

### 1.1 Color Palette & Theme Tokens
OrganiShift uses a custom Tailwind CSS color token system configured for high legibility, clear visual hierarchy, and instant status recognition:

- **Primary Brand / Accent (Indigo)**:
  - Base: `bg-indigo-600` (`#4F46E5`), Hover: `hover:bg-indigo-500`, Active/Border: `border-indigo-200`, Soft Background: `bg-indigo-50/40`
  - *Usage*: Primary call-to-action buttons, active navigation indicators, root folder tree icons, primary badges.
- **Secondary Accent (Emerald / Success)**:
  - Base: `bg-emerald-600`, Soft Background: `bg-emerald-50`, Text: `text-emerald-700`
  - *Usage*: Task item badges, checklist checkboxes, completed status indicators, positive feedback toasts.
- **Warning / Overdue (Amber & Rose)**:
  - Warning Base: `bg-amber-500`, Text: `text-amber-800`, Border: `border-amber-200`
  - Danger/Delete Base: `bg-rose-600`, Soft Background: `bg-rose-50`, Text: `text-rose-600`, Border: `border-rose-200`
  - *Usage*: Overdue badges, destructive deletion confirm dialogs, high priority tags, blocked status.
- **Neutral Grays (Slate)**:
  - Page Background: `bg-slate-50` (`#F8FAFC`), Card Surface: `bg-white`, Borders: `border-slate-200/90`, Secondary Text: `text-slate-500`, Dark Text: `text-slate-900`
  - *Usage*: Background canvas, clean card containers, divider lines, body text.

### 1.2 Typography & Text Hierarchy
- **Font Stack**: System sans-serif optimized for crisp rendering on modern web browsers (`Inter`, `system-ui`, `-apple-system`, `sans-serif`).
- **Font Sizes & Weights**:
  - `Page Titles`: `text-lg` to `text-xl` (`font-bold`, `tracking-tight`, `text-slate-900`)
  - `Section Headers`: `text-sm` (`font-bold`, `text-slate-900`)
  - `Node Titles`: `text-xs` (`font-bold` for parent folders, `font-medium` for task items)
  - `Sub-text & Badges`: `text-[10px]` to `text-[11px]` (`font-semibold` / `font-bold`, `uppercase`)

---

## 2. Shared Shell Layout & Navigation

### 2.1 Fixed App Shell Structure
- **Sidebar (`client/src/components/Sidebar.jsx`)**:
  - Desktop Width: Fixed `248px` (`w-62`), non-collapsible layout grid preventing page shift.
  - Active Item styling: Marked by a dark fill (`bg-indigo-600 text-white`) and a left accent indicator bar.
  - Role-Filtered Navigation Items:
    - **Admin**: Dashboard · Reusable Event · Event Plans · Calendar · Execution Hub
    - **Manager**: Dashboard · Reusable Event · Calendar · Execution Hub
    - **Member**: Dashboard · Calendar · Execution Hub
- **Top Navigation Bar (`client/src/components/Header.jsx`)**:
  - Height: `64px` (`h-16`) fixed top bar.
  - Left: Mobile hamburger trigger button (`lg:hidden`), Breadcrumb trail with dynamic event titles (`Layout.jsx`).
  - Right: User Profile Chip (Avatar initial + User Name + Role Badge `ADMIN` | `MANAGER` | `MEMBER`), Logout button.
- **Mobile Drawer Navigation**:
  - Sliding backdrop overlay (`bg-slate-900/50 backdrop-blur-xs`) for small viewports.
  - Full keyboard accessibility (Close on `Escape`, focus trapping).

---

## 3. Page-by-Page Feature & UI/UX Breakdown

### 3.1 Login Page (`/login`)
- **Visual Design**: Centered modern card layout (`max-w-md`) over subtle gray canvas with application branding logo.
- **Form Controls**:
  - Real HTML `<label>` elements tied to input `id` attributes.
  - Password masking with toggleable eye icon.
  - Submit button with disabled spinner state during authentication request.
- **Security & UX Behavior**:
  - Generic inline error banners (`"Invalid email or password"`) preventing user enumeration attacks.
  - No client-side password strength validation on login to prevent timing leak hints.

---

### 3.2 Dashboard Page (`/dashboard`)
- **Counter Cards Row (6 Grid Cards)**:
  1. **Total Items**: Blue icon background, overall item count across assigned scope.
  2. **Completed**: Emerald icon background, count of completed tasks.
  3. **Pending**: Amber icon background, includes sub-line counter for `Blocked` tasks (`X Pending · Y blocked`).
  4. **In Progress**: Indigo icon background, tasks actively being worked on.
  5. **Overdue**: Rose icon background, flagged overdue deadlines requiring urgent attention.
  6. **Overall Progress**: Dynamic percentage ring/bar showing completion across events.
- **Section 2: Upcoming Deadlines & Calendar Shortcuts**:
  - Chronological list of upcoming milestone dates with direct deep-links to `/events/:id`.
- **Section 3: My Assigned Work (Member Focus)**:
  - Direct status modification inline dropdowns for assigned members, allowing quick status updates without opening full event execution trees.

---

### 3.3 Reusable Event Page (`/planning-library`)
*(Renamed from "Planning Library" for better operational clarity)*

#### **Top Control Banner & Tools**:
- **Title Header**: `"Reusable Event"` with subtitle `"Master blueprint templates with notes and folder organization"`.
- **Action Buttons**:
  - `+ Add Root Template`: Opens template creation popup modal.
  - `Presets`: Opens quick-template generator modal (Catering, Stage & AV, Guest Reception).
  - `Export`: Downloads entire template library as formatted JSON file (`organishift_reusable_events.json`).
  - `Copy Text`: Copies indented text summary of templates to system clipboard.
  - `Expand All` / `Collapse All`: Toggles tree expansion states across all nodes.
- **Search & Filter Bar**:
  - Real-time text search filter (`Search` icon) matching item titles and description notes.
  - Live count badge showing matching items (`X templates found`).

#### **Statistics Summary Cards**:
- **Root Templates**: Counter card showing top-level event blueprint packages.
- **Total Sub-items**: Counter card showing total nested folders and leaf tasks.
- **Max Nesting Depth**: Counter card displaying maximum folder hierarchy depth.

#### **Tree Structure & Interactive Items**:
- **Node Row Visuals**:
  - Folder Icon: `FolderOpen` (indigo) when expanded, `Folder` (indigo) when collapsed with hidden item count badge (`N hidden`).
  - Task Icon: Interactive `CheckSquare` (emerald) when checked, `Square` (slate) when unchecked.
  - Strikethrough Effect: Toggling a task checkbox strikes through text (`line-through text-slate-400 font-medium`).
- **Clickable Row Card**:
  - Clicking anywhere on the item row card opens the **Item Detail Popup Modal**.
- **Inline Hover Action Toolbar**:
  - Strictly isolated to the single hovered item row (`group-hover/row:opacity-100`).
  - Action Buttons: `+ Folder` (indigo), `+ Task` (emerald), `Edit` (pencil border button), `Move` (symlink border button), `Delete` (rose border button).
  - Mobile Fallback: Action toolbar remains visible on touch viewports (`opacity-100 sm:opacity-0`).

#### **Item Detail Popup Modal**:
- Title & subtitle header showing item type (`Folder / Branch` vs `Task Item`).
- Editable **Title** input field.
- Editable **Operational Notes / Instructions** multi-line textarea.
- Quick Tool Actions: `+ Add Sub-folder`, `+ Add Sub-task`, `Delete Item`.

---

### 3.4 Event Plans Builder (`/event-plans`)

- **Plan Selection Grid**:
  - Grid cards displaying event plan blueprints, category badges, total node count, and created timestamp.
  - `+ Create New Plan` button opening creation modal (Title, Category, Description).
- **Plan Builder View (`/event-plans?plan=<id>`)**:
  - Split View Header: Back button, plan title, category pill, description text.
  - Action Controls: `Delete Plan`, `+ Add Custom Module`, `+ Import Library Module`.
- **Import Library Module Modal**:
  - Previews master blueprints from Reusable Event library with exact node copy counts (`"7 items will be copied..."`).
- **Builder Tree View**:
  - Displays imported modules with `[LIBRARY]` badges and custom items with `[CUSTOM]` badges.
  - Inline action buttons (`+ Child`, `Delete`) appearing inline on row hover.

---

### 3.5 Calendar Page (`/calendar`)

- **Header Controls**:
  - Month Navigator: `◀ Month Year ▶` with `Today` jump button.
- **Grid Structure**:
  - 7-Column Weekday Header (`Sun` to `Sat`).
  - 35-Cell Date Grid with distinct styling for current month vs adjacent month dates.
  - Current Day highlight (`ring-2 ring-indigo-600 bg-indigo-50/30`).
- **Event Pills**:
  - Placed on event start date cells.
  - Display status color dot, event title, progress bar, and percentage.
  - Clicking an event pill navigates directly to `/events/:id`.
- **Schedule Event Dialog**:
  - Plan template picker (clones selected plan into live event execution tree).
  - Start Date & End Date pickers.
  - Venue location input field.

---

### 3.6 Execution Hub (`/execution`)

- **Header Filter Bar**:
  - Status Filter Pills: `All`, `Planned`, `Ongoing`, `Done`.
- **Event Card Grid**:
  - Large event tile display with title, date range, venue location tag, and status badge chip (`NOT_STARTED` | `IN_PROGRESS` | `COMPLETED` | `BLOCKED`).
  - Progress bar with percentage readout.
  - Scoped View Notice for Members (`"Scoped view — you see only your assigned branches"`).
  - Direct link to open event execution detail (`Open execution →`).

---

### 3.7 Event Execution Detail (`/events/:id`)

- **Event Header Summary**:
  - Title, Date Range, Venue, Status Chip, Overall Progress bar (`0%` to `100%`).
- **Interactive Execution Tree**:
  - **Checklist Checkboxes**: Interactive `Square` / `CheckSquare` on leaf task items.
  - **Status Update**: Toggling a checkbox updates database status (`IN_PROGRESS` ↔ `COMPLETED`) and triggers automatic progress percentage recalculation.
  - **Field-Gated Controls**:
    - **Member**: Status toggle on assigned incomplete tasks only.
    - **Manager**: Status dropdown, Assignee selector, Priority selector (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`), Due Date picker, Add Child button.
    - **Admin**: Status toggle, Add Child button (structural control).
  - **Overdue Indicator**: Red overdue badge (`OVERDUE`) displayed beside tasks past due date.

---

## 4. Shared UI Components (`client/src/components/common/`)

1. **`TreeView.jsx`**:
   - Recursive tree rendering engine supporting arbitrary depth.
   - Built with strict row hover containment (`group/row`) to prevent parent hover highlight bubbling.
   - Supports `renderMain`, `renderActions`, `renderSubRow`, and `renderCollapsed`.
2. **`Toast.jsx`**:
   - Fixed bottom-right toast notification system.
   - Types: Success (`emerald`), Error (`rose`), Info (`indigo`). Auto-dismisses after 3 seconds.
3. **`Modal.jsx`**:
   - Accessible dialog overlay with backdrop blur (`backdrop-blur-xs`), keyboard `Escape` closing, and focus management.
4. **`ConfirmDialog.jsx`**:
   - Destructive action confirmation popup showing item count and affected sub-item titles.
5. **`DropdownMenu.jsx`**:
   - Accessible dropdown popup menu with click-outside listener.

---

## 5. UI/UX Rules Compliance Matrix

| Rule | Requirement | Implementation Evidence |
| :--- | :--- | :--- |
| **Plan First, Code Last** | All design and UI structure confirmed before implementation | `UI-SPEC.md`, `IMPL-SPEC.md`, and `BOOTSTRAP.md` |
| **No Optimistic UI** | UI must repaint from API response; no false states | All actions (`saveItem`, `updateItem`, `deleteItem`) wait for API resolution before updating state |
| **5 Mandatory UI States** | Every page handles Loading, Empty, Error, Forbidden, and Saving states | Implemented via `SkeletonCard`, `EmptyState`, `ErrorState`, and disabled button submit states |
| **Scoped Hover** | Action menus appear only for the hovered item | TreeView rows use `.group/row` container with `group-hover/row:opacity-100` |
| **Inline Actions** | Buttons appear directly next to title text | Action toolbars positioned `ml-2 inline-flex items-center` right after node title |
| **Accessibility & A11y** | Proper ARIA roles, labels, and keyboard navigation | Checked via modal `labelledBy`, button `aria-label`s, and contrast ratios |

---

## 6. Verification & Automated Test Pass Evidence

- **Server Acceptance & HTTP Test Suite**:
  - Command: `npm test --prefix server`
  - Result: **57 / 57 Tests Passed** (`0 failed`, `duration_ms: 5840ms`)
- **Frontend Production Build**:
  - Command: `npm run build --prefix client`
  - Result: **Built Cleanly in 1.86s** (`dist/assets/index-*.js`, `0 errors`)
