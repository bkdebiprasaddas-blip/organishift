# AGENTS.md — OrganiShift Rule Book

> Auto-read at the start of every session. Short by design; full detail lives in
> the specs under `Scratch/OrganiShift/planning/`.

## Project
- **Name:** OrganiShift — unified event management system.
- **Product:** Manage events by breaking them into tasks, assigning tasks to people,
  tracking progress, and reporting — one modern system. Roles: admin / user.
- **Tech (confirmed 2026-08-12):** MERN — MongoDB, Express, React, Node.js
  (folder still says `_MEAN`; that's historical). Mongo 8.3, Node 24, npm 11.
- **Brand asset:** `Scratch/oraganishirft logo.svg` (existing, hands-off reference).

## Session bootstrap (in order, every session)
1. Read this file.
2. Read `Scratch/OrganiShift/ai-context/BOOTSTRAP.md` (~30-second snapshot).
3. Read the latest `Scratch/OrganiShift/ai-context/SESSION-*.md` (highest number; full technical context).
4. Read the latest `Scratch/OrganiShift/work-log/LOG-*.md` (plain-English).
5. Read `Scratch/OrganiShift/planning/PLAN.md` + `Scratch/OrganiShift/planning/TODO.md`.

If any log is missing or stale: flag it AND refresh it before working.

## Core rules
- **Plan first, code last.** Preparation before any code; coding `/*` files stay empty stubs until the user says **"code it"**.
- **Approval gates (never skip):** PLANNING → DESIGN FIXED → UI DESIGN CONFIRMED → CODING → TESTING. Only the exact phrase **"code it"** opens Coding.
- **Hands-off:** existing files (`Scratch/` logo) stay untouched. `scratch/` = prototypes/reference ONLY, never shipped. Final code lands at project root.
- **Do exactly what was asked.** One deliverable per request; no invented extras.
- **Mandatory logging every session:** refresh BOOTSTRAP + new `SESSION-<date>-<n>.md` + `work-log/LOG-<date>.md`. Full depth, never "same as before".
- **Confirm, don't assume.** Ambiguity → ask before proceeding.

## Folder map
| Path | Purpose |
|------|---------|
| `AGENTS.md` | This rule book |
| `Scratch/` | Reusable prompts + prototypes / reference (logo asset). Never shipped. |
| `Scratch/OrganiShift/planning/` | PLAN.md, ARCH-DESIGN.md, IMPL-SPEC.md, UI-SPEC.md, TODO.md |
| `Scratch/OrganiShift/coding/` | Implementation stubs (empty until approved) + `assets/` drafting mirror |
| `Scratch/OrganiShift/debugging/` | Bug logs |
| `Scratch/OrganiShift/suggestions/` | Feature ideas |
| `Scratch/OrganiShift/documentation/` | SETUP-GUIDE.md + guides |
| `Scratch/OrganiShift/ai-context/` | Technical logs + BOOTSTRAP (memory across model switches) |
| `Scratch/OrganiShift/work-log/` | Human-readable daily logs |

## Response style
Same language as the user; concise by default. No emojis in files unless asked.