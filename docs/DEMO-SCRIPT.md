# Demo Script — 13-step viva walkthrough (OrganiShift Phase 1)

Printable demo sheet. Mirrors the automated rehearsal in
`server/scripts/dod-rehearsal.js` (which passes 13/13 against a fresh database).

**Before you start**

1. Start the app: `start.bat` (or SETUP.md §5).
2. Seed if needed: `cd server && npm run seed`.
3. Open a **private/incognito window** at `http://localhost:5173`.
4. Have a second browser profile ready to be logged in as two users at once.

Demo accounts — password `Password123!` for all:

| Email | Role |
|---|---|
| `admin@organishift.dev` | ADMIN |
| `manager@organishift.dev` | MANAGER |
| `member1@organishift.dev` / `member2@organishift.dev` | MEMBER |

> Tip: the seeded library already contains Food (7 items) and Stage (4 items)
> trees. For a fresh run, delete them first via the Planning Library, then
> recreate them in step 2–3.

---

## The 13 steps

| # | Do (as…) | Expected result |
|---|---|---|
| 1 | Log in as `admin@organishift.dev` | Dashboard loads; role chip shows ADMIN; sidebar shows Admin-only "Event Plans" entry |
| 2 | Planning Library → build a **Food & Catering** tree: root + children incl. *Procurement* with sub-items | Tree renders with expand/collapse; only ADMIN sees edit controls |
| 3 | Add a second root **Stage & Sound** (root + children) | Two independent master trees |
| 4 | Observe library counts | Food = 7 nodes, Stage = 4 nodes (matches seed/rehearsal) |
| 5 | Event Plans → Create New Plan ("Annual Cultural Fest") → open it → **Import Library Module**: Food, then Stage | Builder tree shows 11 items; imported rows carry the blue "Library" tag |
| 6 | Calendar → Schedule Event: pick the plan, title "Annual Cultural Fest", start date = today or later | Success toast; event appears on the calendar with a progress bar |
| 7 | Open Execution Hub → the event → add one custom child under any branch during execution | Checklist total becomes **13** items |
| 8 | As MANAGER (second window): assign the whole *Procurement* branch to `member1@organishift.dev`; set priority HIGH | Assignment saved; progress recalculation runs automatically |
| 9 | Log in as `member1` (third window/profile) → open the same event | Member sees **only their branch** (+ ancestors) — other branches invisible; a scoped-view note is shown. Dashboard counters count only visible leaves |
| 10 | As member: set leaf statuses so *Procurement* completes 2 of 3 leaves (IN_PROGRESS counts 50%) | Branch shows **67%**; parent averages update instantly; member's "My Assigned Work" allows IN_PROGRESS/BLOCKED moves only |
| 11 | Attempt illegal actions: set a parent node's status via API/UI; try NOT_STARTED → COMPLETED jump; as member try changing priority | Rejected with clear errors (`NOT_A_LEAF`, `INVALID_TRANSITION`, priority change → FORBIDDEN) |
| 12 | Prove RBAC walls: as MEMBER call admin-only screens/APIs; try assigning as ADMIN | UI hides controls AND API returns 403 `FORBIDDEN` (e.g. `POST /api/planning-items` as manager/admin-assign rule) |
| 13 | Return to admin Dashboard | Counters add up (total = leaves across events), overdue flagged red, overall % consistent with the event page |

**Wrap-up line for examiners:** every number above is also asserted
automatically — `cd server && npm test` prints 40 passing tests including this
exact scenario, and `node scripts/dod-rehearsal.js` replays these 13 steps over
real HTTP.

## If something misbehaves live

- Empty pages → re-run the seed (idempotent) and refresh.
- API errors → check `http://localhost:5000/api/health`.
- Fallback: run `node scripts/dod-rehearsal.js` and present its 13/13 output.
