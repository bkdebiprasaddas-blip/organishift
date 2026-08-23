const EventItem = require('../models/EventItem');
const Event = require('../models/Event');
const asyncHandler = require('../utils/asyncHandler');
const scopeItemsForMember = require('../utils/scopeItemsForMember');

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

  const today = new Date();
  const overdue = leaves.filter(i => i.dueDate && new Date(i.dueDate) < today && i.status !== 'COMPLETED').length;

  const events = await Event.find({});
  const overallProgress = events.length > 0
    ? Math.round(events.reduce((acc, e) => acc + (e.progressPercent || 0), 0) / events.length)
    : 0;

  const upcomingEvents = events.filter(e => e.status !== 'DONE').slice(0, 5);

  // My Assigned Work — leaves assigned directly to the caller (any role), with
  // the allowed status transitions for inline editing (T-031 / UI-SPEC §6)
  const TRANSITIONS = {
    NOT_STARTED: ['IN_PROGRESS', 'BLOCKED'],
    IN_PROGRESS: ['COMPLETED', 'BLOCKED'],
    BLOCKED: ['IN_PROGRESS'],
    COMPLETED: (user.role === 'MEMBER' ? [] : ['IN_PROGRESS'])
  };
  const userStr = String(user._id);
  const myWork = leaves
    .filter(i => String(i.assigneeId?._id) === userStr)
    .slice(0, 20)
    .map(i => {
      const ev = events.find(e => String(e._id) === String(i.eventId));
      return {
        _id: i._id,
        title: i.title,
        status: i.status,
        priority: i.priority,
        dueDate: i.dueDate,
        isOverdue: Boolean(i.dueDate && new Date(i.dueDate) < today && i.status !== 'COMPLETED'),
        eventId: i.eventId,
        eventTitle: ev ? ev.title : '',
        allowedTransitions: TRANSITIONS[i.status] || []
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
      myWork
    }
  });
});

module.exports = {
  getDashboardStats
};
