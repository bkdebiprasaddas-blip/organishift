# BOOTSTRAP.md — Current State (OrganiShift · Phase 1)

> Refreshed every session. "Current State" snapshot. Master rules: `RULEBOOK.md`
> (PART I–III). Short pointer: `AGENTS.md`.

## Snapshot
- **Phase:** PLANNING (fresh start). Prior project was fully reset/wiped on
  2026-08-23; this is a brand-new Phase 1 MVP per the frozen specs.
- **Branch:** `v1` — fresh, empty repo (no commits yet).
- **Remote:** `origin` → `https://github.com/bkdebiprasaddas-blip/organishift.git`
  (not pushed; remote still holds old history — next push replaces it, needs
  explicit approval).
- **Approved:** research/wipe scope + RULEBOOK PART III / AGENTS alignment
  (owner, 2026-08-23) + ingest `OrganiShift_Agent_Build_Spec.md` and reconcile
  planning docs to it (owner, 2026-08-23). This PLANNING bootstrap is
  auto-created; the PLANNING gate itself awaits **"approve plan"**.

## Frozen authoritative specs (current location: reference-only in Scratch)
> Moved to `Scratch/archive/` on 2026-08-23 by owner (reference-only,
> **git-ignored** — not shipped, not tracked). Governance/planning docs already
> encode the rules; these files remain the canonical originals for reference.
- `OrganiShift_Phase1_System_Design.docx` — System Design (the "what").
- `OrganiShift_AI_Agent_Execution_Spec.md` — AI Agent Execution Spec (the "how").
- `OrganiShift_Agent_Build_Spec.md` — **build contract** (task-by-task T-001…T-037,
  corrections C-1…C-11, source-defect fixes S-1…S-5, derived rules).
- Source-of-truth order: user decision → frozen System Design → documented
  additive improvements (build-spec corrections/derived) → AI Execution Spec →
  existing code/conventions → judgment.

## Product (Phase 1)
- Reusable event planning, scheduling and execution tracking.
- Core workflow: Reusable planning structures → Event Plan → Scheduled Event →
  Execution Copy → Progress Tracking.
- Six pages: `/login /dashboard /planning-library /event-plans /calendar /events/:id`.
- Roles: ADMIN / MANAGER / MEMBER (enforce at API). Five collections:
  `users, eventPlans, planningItems, events, eventItems`.
- OUT of Phase 1: AI generation, notifications, reminders, comments,
  attachments, budgets, dependencies, real-time/Socket.IO, weighted progress,
  marketplace, template sharing, complex analytics, GraphQL, extra collections/
  microservices, drag-and-drop, Kanban, Gantt, charts beyond one progress bar.

## Environment (REAL, verified 2026-08-23)
- OS: Windows (PowerShell shell).
- Node: **v24.18.0** (`node --version`).
- npm: **11.16.0** (`npm --version`).
- Git: **2.55.0.windows.3** (`git --version`).
- MongoDB: **Server 8.3** installed at
  `C:\Program Files\MongoDB\Server\8.3\bin\mongod.exe`; Windows service
  **MongoDB** = `Running` (status verified, `Get-Service`). CLI not on PATH.
- Stack: MERN — MongoDB, Express, React (Vite), Node. Three-tier + modular
  service layer.

## Folder map (current)
- ROOT: `server/` (target), `client/` (target), `AGENTS.md`, `.gitignore`.
- `Scratch/`: `archive/` holds the three frozen spec files (reference-only,
  git-ignored). Recreate normal prep subfolders only if disposable prep is needed.
- `governance/`: `RULEBOOK.md`, `BOOTSTRAP.md` (this), `ai-context/` (+`archive/`),
  `work-log/`, `planning/`, `documentation/`.

## Seed / DoD counts (corrected — build spec §8)
Food library tree = **7** nodes · Stage = **4** · Annual Function plan =
**11** copied nodes · scheduled execution = **13** items. Acceptance tests =
`T-01…T-30`; build task list = `T-001…T-037`.

## Gates (RULEBOOK §F — trigger words)
RUNBOOK trigger phrases: **"approve discovery"** · **"approve plan"** ·
**"approve design"** · **"UI is final"** / **"start backend"** ·
**"code it"** · **"run tests"** / **"test it"** · **"approve release"**.
Current: PLANNING docs exist; awaiting owner review + **"approve plan"**.