# OrganiShift --- Final UI/UX & Feature Implementation Specification

**Project:** OrganiShift --- Event & Operations Management System\
**Document Type:** Final Agent Implementation Specification\
**Purpose:** This document is the authoritative UI/UX and feature
direction for implementation. The implementation agent should use the
existing project architecture as the base and implement the improvements
below without unnecessarily replacing working functionality.

------------------------------------------------------------------------

## 1. Implementation Objective

OrganiShift must function as a complete Event Operations Management
System.

The primary design principle is:

> **Organize with hierarchy. Execute with tasks. Monitor with multiple
> views.**

The system must support:

-   Unlimited nested folders/workstreams
-   Unlimited tasks and subtasks
-   Task assignment and ownership
-   Status, priority and due dates
-   Task descriptions and operational notes
-   Checklists
-   Comments and collaboration
-   Attachments
-   Tags
-   Dependencies
-   Milestones
-   Search and advanced filtering
-   Bulk task operations
-   Multiple task views
-   Reusable event templates
-   Event plans
-   Live event execution
-   Team management
-   Notifications
-   Activity/audit history
-   Progress and event-health monitoring
-   Role-based permissions
-   Responsive and accessible UI

Do not redesign the application into unrelated modules. Improve the
existing OrganiShift architecture and preserve working functionality.

------------------------------------------------------------------------

# 2. Existing Foundation To Preserve

The existing project already contains:

-   Dashboard
-   Reusable Event
-   Event Plans
-   Calendar
-   Execution Hub
-   Event Execution Detail
-   Recursive TreeView
-   Role-filtered navigation
-   Status management
-   Priority management
-   Assignee selection
-   Due dates
-   Operational notes
-   Search
-   Expand/collapse
-   Move
-   Delete
-   Progress calculation
-   Loading/empty/error/forbidden/saving states
-   Accessibility-oriented components

The existing recursive `TreeView` supports arbitrary depth. Keep this
approach and extend it rather than replacing it.

The existing Reusable Event system must remain the source for reusable
event blueprints.

The existing Event Plans system must remain the layer between reusable
blueprints and live events.

The live event must have its own task structure after a plan/template is
applied.

------------------------------------------------------------------------

# 3. Product Architecture

Use this conceptual hierarchy:

``` text
OrganiShift
│
├── Dashboard
│
├── Reusable Events
│   ├── Templates
│   └── Template Builder
│
├── Event Plans
│   ├── Plan Library
│   └── Plan Builder
│
├── Events
│   ├── Event Overview
│   ├── Tasks
│   ├── Calendar
│   ├── Team
│   ├── Files
│   ├── Notes
│   ├── Activity
│   └── Reports
│
├── My Tasks
│
├── Calendar
│
├── Notifications
│
└── Administration
    ├── Users
    ├── Roles
    ├── Permissions
    ├── Categories
    ├── Tags
    └── Settings
```

Do not require every event to use a fixed folder structure. The system
must allow users to create their own structure.

------------------------------------------------------------------------

# 4. Event Lifecycle

The complete workflow should be:

``` text
Reusable Template
        ↓
Event Plan
        ↓
Schedule Event
        ↓
Create Live Event
        ↓
Customize Structure
        ↓
Assign Team
        ↓
Execute Tasks
        ↓
Monitor Progress
        ↓
Complete Event
        ↓
Event Review
```

Important rule:

**Templates and plans are reusable definitions. Live events contain
their own cloned execution structure.**

Changing a reusable template must not silently modify already-created
live events.

------------------------------------------------------------------------

# 5. Unlimited Recursive Task Structure

The task hierarchy must not have an artificial maximum nesting level.

Recommended conceptual structure:

``` text
EVENT
│
├── FOLDER
│   ├── FOLDER
│   │   ├── FOLDER
│   │   │   ├── TASK
│   │   │   │   ├── SUBTASK
│   │   │   │   └── SUBTASK
│   │   │   └── TASK
│   │   └── TASK
│   └── TASK
│
├── FOLDER
└── MILESTONE
```

The underlying node model should use a recursive parent relationship.

Minimum conceptual fields:

``` text
id
eventId
parentId
type
title
description
position
status
createdBy
createdAt
updatedAt
```

Do not implement separate database tables/logic for every possible
hierarchy level.

Use a generic recursive node model.

------------------------------------------------------------------------

# 6. Node Types

The system should support at least:

``` text
FOLDER
TASK
MILESTONE
```

`PHASE` and `WORKSTREAM` may be represented as specialized folders if
that keeps the implementation simpler.

## Folder

A folder is organizational.

Support:

-   Title
-   Description
-   Owner
-   Operational notes
-   Icon
-   Optional color
-   Position
-   Child count
-   Calculated progress

Folders do not need task status controls like executable tasks.

## Task

A task represents actual work.

Support:

-   Title
-   Description
-   Primary assignee
-   Additional assignees
-   Reviewer
-   Approver
-   Status
-   Priority
-   Start date
-   Due date
-   Operational notes
-   Checklist
-   Tags
-   Attachments
-   Comments
-   Dependencies
-   Activity history

## Milestone

A milestone represents an important event checkpoint.

Examples:

``` text
Venue Finalized
Guest List Locked
Stage Ready
Event Open
Event Closed
```

------------------------------------------------------------------------

# 7. Task Status

Use:

``` text
NOT_STARTED
IN_PROGRESS
BLOCKED
COMPLETED
CANCELLED
```

Do not treat `OVERDUE` as a primary status.

Overdue should be a calculated condition:

``` text
status = IN_PROGRESS
dueDate < currentDate
```

The UI may display:

``` text
IN PROGRESS
OVERDUE
```

This preserves the actual workflow status.

------------------------------------------------------------------------

# 8. Priority

Use:

``` text
LOW
MEDIUM
HIGH
CRITICAL
```

Priority must be visible in list views and task details.

Critical and high-priority tasks should be surfaced prominently in:

-   Dashboard
-   My Tasks
-   Event Overview
-   Notifications
-   Filters

------------------------------------------------------------------------

# 9. Task Detail UI

Replace the current limited item-detail experience with a stronger task
detail drawer/panel.

Desktop layout:

``` text
┌──────────────────────────────────────────────────────────────┐
│ Breadcrumb / Event / Folder / Task                           │
├──────────────────────────────────────────────────────────────┤
│ TASK TITLE                                  HIGH             │
│                                                              │
│ Status: IN PROGRESS        Assignee: Rahul                  │
│ Due: 28 Aug 2026           Priority: HIGH                   │
├──────────────────────────────────────────────────────────────┤
│ Description                                                  │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│ Checklist                                      3 / 5         │
│ ☑ Confirm pricing                                           │
│ ☑ Review contract                                           │
│ ☑ Confirm facilities                                        │
│ ☐ Get manager approval                                      │
│ ☐ Upload signed agreement                                   │
├──────────────────────────────────────────────────────────────┤
│ Operational Notes                                            │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│ Attachments                                                  │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│ Comments                                                     │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│ Dependencies                                                 │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│ Activity                                                     │
└──────────────────────────────────────────────────────────────┘
```

Use a side drawer/persistent detail panel on desktop.

Use a full-screen or large drawer on mobile.

Do not force users to repeatedly open small modals for ordinary task
inspection.

------------------------------------------------------------------------

# 10. Three Separate Text Concepts

Do not combine all textual information into one Notes field.

Use:

## Description

What the task is.

Example:

``` text
Finalize and sign the venue agreement.
```

## Operational Notes

Instructions, context, constraints and useful information.

Example:

``` text
Ask the venue manager to include generator and parking in the agreement.
```

## Comments

Conversation between users.

Example:

``` text
Rahul:
The revised contract has been received.

Manager:
Approved. Proceed with signing.
```

These must remain separate.

------------------------------------------------------------------------

# 11. Checklist System

Tasks must support lightweight checklists.

Example:

``` text
Prepare Registration Desk

☑ Registration table
☑ Registration forms
☐ Name badges
☐ Pens
☐ Staff assigned
```

Show:

``` text
3 / 5 complete
60%
```

Checklist items should be lightweight and should not require full task
fields unless they are promoted to a separate child task.

Do not automatically complete the parent task purely because every
checklist item is complete unless that behavior is explicitly
configured.

------------------------------------------------------------------------

# 12. Assignment System

Support:

``` text
Primary Owner
Additional Assignees
Reviewer
Approver
```

Example:

``` text
Owner: Rahul
Support: Amit, Jay
Reviewer: Manager
Approver: Admin
```

At minimum, the existing single-assignee workflow must continue to work.

------------------------------------------------------------------------

# 13. Task Dependencies

Implement:

``` text
DEPENDS_ON
BLOCKS
RELATED_TO
```

Example:

``` text
Venue Approval
      ↓
Venue Contract
      ↓
Stage Setup
      ↓
Sound Testing
```

If a task is blocked by an incomplete dependency, display:

``` text
BLOCKED

Waiting for:
Venue Contract

Owner:
Rahul
```

Dependencies must also be visible in the task detail panel.

The system must prevent invalid/circular dependency relationships where
practical.

------------------------------------------------------------------------

# 14. Tags

Add tags for cross-cutting classification.

Examples:

``` text
#vendor
#urgent
#guest
#finance
#logistics
#security
#approval
```

Users should not have to create a folder for every classification.

Tags should be searchable and filterable.

------------------------------------------------------------------------

# 15. Attachments

Support attachments at minimum for tasks.

Preferred support:

``` text
PDF
DOC/DOCX
XLS/XLSX
Images
Common office files
```

Example:

``` text
Attachments

Venue_Contract.pdf
Quotation.xlsx
Venue_Reference.jpg
```

Show filename, file type, upload date and uploader where available.

------------------------------------------------------------------------

# 16. Comments and Mentions

Tasks should support comments.

Support user mentions:

``` text
@Rahul please review this.
```

Mentioned users should receive a notification.

Comments remain attached to the relevant task.

------------------------------------------------------------------------

# 17. Activity / Audit History

Record important task changes.

Example:

``` text
10:42 Rahul assigned task to Amit
10:45 Priority changed LOW → HIGH
11:10 Quotation uploaded
11:30 Comment added
12:15 Task completed
```

Activity history should be read-only.

For important operations, retain:

-   Who
-   What changed
-   When
-   Previous value where useful
-   New value where useful

------------------------------------------------------------------------

# 18. Tree View UX

The tree remains the main organizational interface.

Recommended row:

``` text
▾ 📁 Venue & Logistics                         72%
   │
   ├─▾ 📁 Venue Booking                         80%
   │   ├─ ☐ Contact venue                      HIGH
   │   ├─ ☑ Confirm pricing                    DONE
   │   └─ ☐ Sign contract                      HIGH
   │
   ├─▾ 📁 Seating                               40%
   │   ├─ ☐ Design seating plan
   │   └─ ☐ Confirm tables
   │
   └─ ☐ Parking arrangement                     MEDIUM
```

Rows should support:

-   Expand/collapse
-   Selection
-   Open details
-   Add child folder
-   Add child task
-   Edit
-   Move
-   Duplicate
-   Delete

Do not overcrowd the tree with every metadata field.

Primary information:

``` text
Icon
Title
Status/progress
```

Secondary information:

``` text
Assignee
Priority
Due date
```

Keep secondary metadata visually subdued.

------------------------------------------------------------------------

# 19. Tree Actions

Use contextual row actions.

At minimum:

``` text
+ Folder
+ Task
Edit
Move
Duplicate
Delete
```

For tasks:

``` text
Open
Assign
Change Status
Change Priority
Move
Duplicate
Delete
```

Preserve scoped hover behavior so one row's actions do not visually
activate neighboring rows.

On touch devices, provide a visible action mechanism rather than relying
on hover.

------------------------------------------------------------------------

# 20. Breadcrumbs

Deep hierarchy requires breadcrumbs.

Example:

``` text
Annual Fest
> Logistics
> Venue
> Booking
> Contract
```

Every breadcrumb segment should be clickable.

This prevents users from becoming lost in deeply nested structures.

------------------------------------------------------------------------

# 21. Move UI

The Move operation should use a destination tree picker.

Example:

``` text
Move "Venue Contract"

Event
├── Logistics
│   ├── Venue
│   └── Transport
├── Marketing
└── Finance

[Cancel] [Move Here]
```

Rules:

-   Do not allow a folder to be moved into itself.
-   Do not allow a folder to be moved into its descendants.
-   Confirm potentially large moves.
-   Preserve child structure when moving a folder.
-   Maintain ordering.

------------------------------------------------------------------------

# 22. Duplicate / Copy

Support:

``` text
Duplicate Task
Duplicate Folder
Copy Folder Structure
Copy to Another Event
```

When copying a folder, preserve its internal hierarchy.

Example:

``` text
Guest Reception
├── Registration
├── Welcome Desk
└── Guest Support
```

can be copied into another event as the same structure.

Allow the user to choose whether to copy:

-   Structure only
-   Tasks
-   Checklists
-   Notes
-   Default assignments
-   Dependencies where valid

For the initial implementation, structure + tasks + checklists is
sufficient.

------------------------------------------------------------------------

# 23. Multiple Views

The tree must not be the only way to work with tasks.

Implement:

``` text
Tree
List
My Tasks
Calendar
```

A Board/Kanban view is recommended as a later enhancement.

All views must operate on the same underlying task data.

------------------------------------------------------------------------

# 24. List View

For large events, users need a dense management table.

Example:

``` text
┌─────────────────────────────────────────────────────────────┐
│ Tasks                                      428 tasks        │
├─────────────────────────────────────────────────────────────┤
│ □ │ Task             │ Owner │ Priority │ Due │ Status     │
│ □ │ Venue Contract   │ Rahul │ HIGH     │ 28  │ In Progress│
│ □ │ Stage Setup      │ Amit  │ CRITICAL │ 29  │ Blocked    │
│ □ │ Guest List       │ Jay   │ MEDIUM   │ 30  │ Pending    │
└─────────────────────────────────────────────────────────────┘
```

Support:

-   Sorting
-   Filtering
-   Multi-select
-   Bulk operations
-   Pagination or virtualization
-   Search

------------------------------------------------------------------------

# 25. My Tasks

Create a dedicated personal execution view.

Example:

``` text
MY TASKS

OVERDUE        4
TODAY          6
THIS WEEK     18
UPCOMING       9
```

Sections:

``` text
Overdue
Due Today
Due Tomorrow
This Week
Later
Completed
```

Members should be able to manage their assigned work without opening
every event.

------------------------------------------------------------------------

# 26. Filtering

Support filters for:

``` text
Status
Priority
Assignee
Due Date
Created Date
Folder
Phase
Tags
Milestone
Overdue
Blocked
Unassigned
```

Example filter:

``` text
Assignee = Rahul
Status != Completed
Priority = High/Critical
Due = This Week
```

Display:

``` text
12 matching tasks
```

Filters should be combinable.

------------------------------------------------------------------------

# 27. Search

Search should work across:

-   Task title
-   Folder title
-   Description
-   Operational notes
-   Comments
-   Tags
-   Assignee

Search results should show context.

Example:

``` text
Venue Contract

Annual Fest
→ Logistics
→ Venue
→ Contract
```

This allows users to locate deeply nested tasks immediately.

Use debouncing for live search.

------------------------------------------------------------------------

# 28. Bulk Operations

When multiple tasks are selected:

``` text
3 selected

Assign
Change Status
Change Priority
Change Due Date
Move
Add Tag
Delete
```

Support:

-   Select visible
-   Select all filtered
-   Clear selection

Require confirmation for destructive bulk operations.

------------------------------------------------------------------------

# 29. Calendar

Keep the existing event calendar but expand it to include task
deadlines.

Views:

``` text
Month
Week
Day
Agenda
```

Tasks should appear based on due/start dates.

Example:

``` text
Aug 28

10:00 Venue Contract
14:00 Stage Inspection
16:00 Guest List Approval
```

Clicking a task opens the task detail panel.

------------------------------------------------------------------------

# 30. Event Workspace

Every live event should have:

``` text
Overview
Tasks
Calendar
Team
Files
Notes
Activity
Reports
```

Header:

``` text
Annual College Fest

15 Sep 2026 · College Ground

IN PROGRESS
74%

128 Tasks · 14 In Progress · 7 Overdue · 3 Blocked
```

The event header should remain visible or easily accessible while
navigating within the event.

------------------------------------------------------------------------

# 31. Event Overview

Show:

``` text
Total Tasks
Completed
In Progress
Pending
Blocked
Overdue
Overall Progress
```

Then show:

``` text
Attention Required
```

Example:

``` text
4 overdue tasks
3 blocked tasks
5 unassigned tasks
7 tasks due today
```

The dashboard should answer:

> What requires action right now?

Do not make the dashboard purely statistical.

------------------------------------------------------------------------

# 32. Event Health

Calculate an event health state using operational indicators such as:

-   Overdue tasks
-   Blocked tasks
-   Critical incomplete tasks
-   Upcoming deadlines
-   Overall progress

Example:

``` text
EVENT HEALTH: AT RISK

5 overdue tasks
3 critical tasks incomplete
2 blocked dependencies
```

Health is a management signal, not a replacement for actual task status.

------------------------------------------------------------------------

# 33. Workstream Progress

Folders/workstreams should automatically calculate progress from
descendant tasks.

Example:

``` text
Logistics       92%
Marketing       78%
Finance         64%
Guest Mgmt      85%
Security        71%
```

Progress calculation should be consistent throughout:

``` text
Completed executable tasks
--------------------------
Total executable tasks
```

Folders containing only folders should derive progress from descendant
executable tasks.

------------------------------------------------------------------------

# 34. Team Management

For each event, support:

``` text
Event Manager
Team Leads
Members
Viewers
```

Provide a team summary:

``` text
Team Member     Assigned   Completed   Overdue
Rahul           24         18          2
Amit            18         14          0
Jay             12         7           3
```

Do not expose users to events or tasks outside their permissions.

------------------------------------------------------------------------

# 35. Notifications

Notify users for:

``` text
Task assigned
Task reassigned
Task mentioned
Comment added
Task due soon
Task overdue
Dependency completed
Task completed
```

Notification example:

``` text
Rahul assigned you:

"Finalize Stage Contract"

Due tomorrow
```

Notifications should deep-link to the relevant task/event.

------------------------------------------------------------------------

# 36. Reusable Events

Retain the current Reusable Event functionality:

-   Root templates
-   Presets
-   Search
-   Expand all/collapse all
-   Folder creation
-   Task creation
-   Notes
-   Move
-   Delete
-   Export if already implemented

Add:

``` text
Duplicate Template
Rename
Archive
Version
Preview
Create Event From Template
```

The template builder should support the same recursive structure as live
events.

------------------------------------------------------------------------

# 37. Template Versioning

Reusable event templates should support versions when practical.

Example:

``` text
Annual Conference Template

Version 1.0
Version 1.1
Version 2.0
```

Important:

**Existing live events must remain unchanged when a template is
updated.**

------------------------------------------------------------------------

# 38. Event Plan Builder

Keep the current plan-builder concept.

Recommended workflow:

``` text
Create Plan
    ↓
Choose Template
    ↓
Select Modules
    ↓
Customize Structure
    ↓
Set Default Roles
    ↓
Save Plan
```

Modules may be:

``` text
Required
Optional
Recommended
```

When importing a module, show a preview of the structure and number of
nodes/tasks being copied.

------------------------------------------------------------------------

# 39. Task Templates

Recommended reusable task templates:

``` text
Venue Booking
Stage Setup
Guest Registration
Vendor Payment
Security Preparation
```

A task template may contain:

``` text
Title
Description
Default Priority
Default Role
Checklist
Operational Notes
```

This is a P2 feature unless implementation time allows it.

------------------------------------------------------------------------

# 40. Recurring Tasks

Optional advanced feature.

Support:

``` text
None
Daily
Weekly
Monthly
Custom
```

Examples:

``` text
Weekly vendor meeting
Daily event preparation
Monthly planning review
```

Do not implement this before the core task system is stable.

------------------------------------------------------------------------

# 41. Role Model

Retain the current:

``` text
ADMIN
MANAGER
MEMBER
```

Optionally add:

``` text
VIEWER
```

Recommended permissions:

## Admin

Full system access.

## Manager

Manage assigned events, plans, teams and tasks.

## Member

Execute assigned tasks and participate in permitted collaboration.

## Viewer

Read-only access.

Task-level permissions should prevent users from changing fields they do
not control.

------------------------------------------------------------------------

# 42. Permission Rules

At minimum:

``` text
MEMBER
- View permitted events/tasks
- Update assigned task status
- Update permitted checklist items
- Add comments
- Upload permitted attachments

MANAGER
- All member capabilities
- Assign/reassign tasks
- Change priority
- Change due dates
- Manage workstreams
- Add/edit operational structure where permitted

ADMIN
- Full structural control
- User/role management
- Template management
- Event management
```

Do not rely only on hiding UI controls. Backend authorization must
enforce permissions.

------------------------------------------------------------------------

# 43. Responsive Design

## Desktop

Use:

``` text
Sidebar
Header
Main Workspace
Tree/List
Task Detail Panel
```

## Tablet

Use:

``` text
Collapsible Sidebar
Main Workspace
Task Detail Drawer
```

## Mobile

Use:

``` text
Header
Breadcrumb
Task/List View
Task Detail Drawer
Floating/Add Action
```

Do not attempt to display a dense desktop tree unchanged on mobile.

------------------------------------------------------------------------

# 44. Accessibility

Preserve and extend the existing accessibility requirements.

Implement:

-   Semantic labels
-   Accessible buttons
-   Keyboard navigation
-   Visible focus states
-   Proper modal/drawer focus management
-   Escape-to-close
-   Screen-reader labels
-   Sufficient contrast
-   Status indicators that do not rely on color alone

Tree keyboard behavior should support:

``` text
Arrow Up/Down = Navigate
Arrow Right = Expand
Arrow Left = Collapse
Enter = Open
Space = Toggle task where applicable
```

------------------------------------------------------------------------

# 45. Standard UI States

Every page and major component must support:

``` text
LOADING
EMPTY
ERROR
FORBIDDEN
SAVING
SUCCESS
```

Do not leave blank screens when data is unavailable.

Use:

-   Skeletons for loading
-   Helpful empty states
-   Actionable errors
-   Permission messages
-   Disabled/loading buttons during save operations
-   Success feedback after successful operations

Do not use optimistic state updates where the project specification
requires the UI to repaint from the API response.

------------------------------------------------------------------------

# 46. Performance for Large Task Trees

"Unlimited" is a logical hierarchy requirement, not a requirement to
render thousands of DOM nodes simultaneously.

Implement scalable rendering.

Preferred:

``` text
Lazy child loading
Collapsed folders by default for large trees
Virtualized list rendering where necessary
Pagination in large list views
Server-side filtering
Server-side sorting
Debounced search
```

The UI should remain responsive with hundreds or thousands of tasks.

Do not load/render the entire hierarchy unnecessarily.

------------------------------------------------------------------------

# 47. Error Prevention

Important destructive operations must use confirmation.

Examples:

``` text
Delete folder containing 37 tasks
Delete task
Bulk delete
Move large folder
```

The confirmation dialog should explain the impact.

Example:

``` text
Delete "Venue Management"?

This folder contains:
7 folders
24 tasks
16 checklist items

This action cannot be undone.

[Cancel] [Delete]
```

------------------------------------------------------------------------

# 48. Empty States

Examples:

``` text
No tasks yet.

Create your first task or import a reusable module.
```

For My Tasks:

``` text
You're all caught up.

No overdue or pending assigned tasks.
```

For events:

``` text
No events yet.

Create an event from a reusable plan.
```

Empty states should always tell the user what to do next.

------------------------------------------------------------------------

# 49. Visual Design Direction

Retain the current clean enterprise visual direction.

Use:

-   Indigo as primary action/accent
-   Emerald for completion/success
-   Amber for warnings
-   Rose for destructive/critical states
-   Slate/neutral surfaces
-   System/Inter-style sans-serif typography

Do not introduce unnecessary gradients, excessive decoration, or
dashboard-heavy visual noise.

The product should feel like a professional operations tool.

------------------------------------------------------------------------

# 50. UI Density Rules

For task-management screens:

-   Keep rows compact.
-   Prioritize task title.
-   Keep metadata secondary.
-   Use badges selectively.
-   Avoid large cards for every task.
-   Prefer dense list/table layouts when many tasks exist.
-   Keep primary actions close to the current context.
-   Do not force navigation away from the current event to perform
    common task actions.

------------------------------------------------------------------------

# 51. Recommended Sidebar

Admin:

``` text
Dashboard
Reusable Events
Event Plans
Events
Calendar
My Tasks
Notifications
Administration
```

Manager:

``` text
Dashboard
Reusable Events
Event Plans
Events
Calendar
My Tasks
Notifications
```

Member:

``` text
Dashboard
My Tasks
Calendar
Events
Notifications
```

Navigation must remain role-filtered.

------------------------------------------------------------------------

# 52. Event Navigation

Inside an event:

``` text
Overview
Tasks
Calendar
Team
Files
Notes
Activity
Reports
```

Do not make users return to the global sidebar to move between sections
of the same event.

------------------------------------------------------------------------

# 53. Implementation Priority

## P0 --- Mandatory

Implement first:

``` text
1. Recursive unlimited folder structure
2. Tasks
3. Subtasks
4. Assignment
5. Status
6. Priority
7. Due dates
8. Description
9. Operational notes
10. Checklists
11. Progress calculation
12. Overdue detection
13. Search
14. Filters
15. Move
16. Duplicate
17. Delete
18. Role permissions
19. Event → Plan → Execution workflow
20. Tree view
21. List view
22. My Tasks
```

## P1 --- High Value

Implement next:

``` text
23. Multiple assignees
24. Comments
25. @Mentions
26. Attachments
27. Tags
28. Dependencies
29. Activity history
30. Bulk operations
31. Notifications
32. Milestones
33. Calendar task deadlines
34. Team management
35. Event health
36. Template versioning
```

## P2 --- Advanced

Implement only after P0/P1 are stable:

``` text
37. Kanban board
38. Recurring tasks
39. Task templates
40. Custom fields
41. Time tracking
42. Approval workflows
43. Vendor management
44. Advanced reports
45. Automated reminders
```

Do not sacrifice core reliability to implement P2 features.

------------------------------------------------------------------------

# 54. Recommended Implementation Sequence

## Phase 1 --- Data and Core Architecture

Implement and verify:

``` text
Event
Node
Folder
Task
Milestone
Assignment
Status
Priority
Due Date
```

The recursive parent/child relationship must be correct before advanced
UI work begins.

## Phase 2 --- Core Task UX

Implement:

``` text
Tree
Task Detail Drawer
Create/Edit
Move
Duplicate
Delete
Checklist
Notes
Assignment
```

## Phase 3 --- Scalability

Implement:

``` text
List View
Search
Filters
Bulk Actions
My Tasks
Breadcrumbs
Lazy Loading
```

## Phase 4 --- Collaboration

Implement:

``` text
Comments
Mentions
Attachments
Notifications
Activity
Dependencies
```

## Phase 5 --- Event Management

Implement:

``` text
Event Overview
Team
Calendar Tasks
Event Health
Reports
```

## Phase 6 --- Templates and Plans

Finalize:

``` text
Reusable Templates
Template Builder
Template Versioning
Event Plans
Plan Modules
Live Event Cloning
```

## Phase 7 --- Quality

Perform:

``` text
Permission Testing
Responsive Testing
Accessibility Testing
Large Dataset Testing
Tree Stress Testing
API Error Testing
Loading/Empty/Error State Testing
Destructive Action Testing
```

------------------------------------------------------------------------

# 55. Agent Implementation Rules

The implementation agent must follow these rules:

1.  Do not remove working functionality unless required by this
    specification.
2.  Do not replace the recursive hierarchy with a fixed-depth
    implementation.
3.  Do not create separate task systems for Tree, List, Calendar and My
    Tasks.
4.  All views must operate on the same underlying task records.
5.  Do not hard-code a maximum task count.
6.  Do not hard-code a maximum nesting depth.
7.  Do not rely on client-side permission checks alone.
8.  Backend authorization must enforce role permissions.
9.  Preserve API response as the source of truth after mutations.
10. Maintain loading, empty, error, forbidden and saving states.
11. Keep destructive actions confirmed.
12. Prevent invalid parent/child relationships.
13. Prevent circular folder structures.
14. Prevent invalid/circular dependencies where possible.
15. Do not make the UI dependent on hover-only interactions.
16. Maintain keyboard accessibility.
17. Avoid unnecessary modal usage for routine task inspection.
18. Prefer a task detail drawer/panel.
19. Keep task rows compact and scalable.
20. Optimize rendering for large task trees.
21. Do not implement advanced P2 features before P0 is stable.
22. Preserve the existing visual identity unless there is a concrete UX
    reason to change it.
23. Keep the application understandable for a college project
    demonstration.
24. Every new feature must have clear role/permission behavior.
25. Every mutation must have success and error feedback.

------------------------------------------------------------------------

# 56. Final UX Acceptance Workflow

The finished application must allow this complete flow:

``` text
Create Event
      ↓
Choose Reusable Template
      ↓
Customize Folder Structure
      ↓
Create Unlimited Folders
      ↓
Create Unlimited Tasks
      ↓
Create Subtasks
      ↓
Add Checklist
      ↓
Add Description + Operational Notes
      ↓
Assign Team
      ↓
Set Priority + Deadlines
      ↓
Add Tags
      ↓
Add Attachments
      ↓
Create Dependencies
      ↓
Execute Tasks
      ↓
Update Status
      ↓
Comment / Mention Team
      ↓
Monitor Notifications
      ↓
Resolve Blocked / Overdue Tasks
      ↓
Monitor Event Health
      ↓
Complete Event
      ↓
Review Activity / Reports
```

------------------------------------------------------------------------

# 57. Final Design Principle

The application must not become a collection of disconnected feature
pages.

The central relationship is:

``` text
                EVENT
                  │
          ┌───────┴────────┐
          │                │
       FOLDERS          MILESTONES
          │
      ┌───┴────┐
      │        │
    FOLDER    TASK
      │        │
    FOLDER   ┌─┼──────────────┐
      │      │ │              │
    TASK  Checklist Notes  Comments
             │       │          │
             └───────┼──────────┘
                     │
              Dependencies
                     │
                ASSIGNMENT
                     │
                EXECUTION
                     │
        ┌────────────┼────────────┐
        │            │            │
       TREE         LIST       CALENDAR
        │            │            │
        └────────────┼────────────┘
                     │
                 DASHBOARD
                     │
               EVENT HEALTH
```

The tree is the organizational backbone.

The task detail panel is the execution workspace.

List view solves large-scale management.

My Tasks solves individual execution.

Calendar solves deadline visibility.

Dashboard and Event Health solve management visibility.

Templates and Plans solve repeatability.

Comments, attachments, dependencies and activity solve collaboration and
accountability.

This architecture should be treated as the final UI/UX direction for
implementation.
