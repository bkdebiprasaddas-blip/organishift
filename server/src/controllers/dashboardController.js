const EventItem = require('../models/EventItem');
const Event = require('../models/Event');
const asyncHandler = require('../utils/asyncHandler');
const scopeItemsForMember = require('../utils/scopeItemsForMember');
const { getAllowedTransitions } = require('../utils/statusTransitions');
const { isBeforeToday } = require('../utils/dateOnly');

const getDashboardStats = asyncHandler(async (req, res) => {
  const user = req.user;
  let items = await EventItem.find({}).populate('assigneeId', 'name role');

  // Scoped calculation for Member role (§2.6 / OPEN-6): owned branch
  // (assigned node + descendants) + ancestor rows for context.
  if (user.role === 'MEMBER') {
    items = scopeItemsForMember(items, user._id);
  }

  // Identify leaf items (nodes that have no children)
  const parentIdSet = new Set(items.map(i => i.parentId ? String(i.parentId) : null).filter(Boolean));
  const leaves = items.filter(i => !parentIdSet.has(String(i._id)));

  const total = leaves.length;
  const completed = leaves.filter(i => i.status === 'COMPLETED').length;
  const inProgress = leaves.filter(i => i.status === 'IN_PROGRESS').length;
  const blocked = leaves.filter(i => i.status === 'BLOCKED').length;
  const pending = total - completed;

  // Compare due dates as UTC calendar days, not local-midnight timestamps —
  // see utils/dateOnly.js. A task due today is never overdue.
  const isOverdueItem = i =>
    Boolean(i.dueDate) && isBeforeToday(i.dueDate) && i.status !== 'COMPLETED';

  const overdue = leaves.filter(isOverdueItem).length;

  // SV-M10: scope events for MEMBERs — only events where they have assigned work
  let events;
  if (user.role === 'MEMBER') {
    const assignedEventIds = new Set(items
      .filter(i => String(i.assigneeId?._id ?? i.assigneeId) === String(user._id))
      .map(i => String(i.eventId)));
    events = await Event.find({ _id: { $in: Array.from(assignedEventIds) } }).sort({ startDate: 1 });
  } else {
    events = await Event.find({}).sort({ startDate: 1 });
  }
  const overallProgress = events.length > 0
    ? Math.round(events.reduce((acc, e) => acc + (e.progressPercent || 0), 0) / events.length)
    : 0;

  // "Upcoming" means not finished AND not already over — otherwise an event that
  // started months ago and is still PLANNED shows up as upcoming.
  const upcomingEvents = events
    .filter(e => e.status !== 'DONE' && !isBeforeToday(e.endDate || e.startDate))
    .slice(0, 5);

  // My Assigned Work — leaves assigned directly to the caller (any role), with
  // the allowed status transitions for inline editing (T-031 / UI-SPEC §6)
  const MY_WORK_LIMIT = 20;
  const userStr = String(user._id);
  const assignedLeaves = leaves.filter(i => String(i.assigneeId?._id) === userStr);
  const myWork = assignedLeaves.slice(0, MY_WORK_LIMIT).map(i => {
    const ev = events.find(e => String(e._id) === String(i.eventId));
    return {
      _id: i._id,
      title: i.title,
      status: i.status,
      priority: i.priority,
      dueDate: i.dueDate,
      isOverdue: isOverdueItem(i),
      eventId: i.eventId,
      eventTitle: ev ? ev.title : '',
      allowedTransitions: getAllowedTransitions(i.status, user.role)
    };
  });

  return res.status(200).json({
    success: true,
    data: {
      counters: {
        total,
        completed,
        pending,
        inProgress,
        overdue,
        blocked,
        overallProgress
      },
      upcomingEvents,
      myWork,
      // Surface the truncation so the UI can say "showing 20 of 27" instead of
      // silently hiding the remaining tasks with no way to discover them.
      myWorkTotal: assignedLeaves.length,
      myWorkTruncated: assignedLeaves.length > MY_WORK_LIMIT
    },
    message: 'Dashboard stats retrieved'
  });
});

module.exports = {
  getDashboardStats
};
