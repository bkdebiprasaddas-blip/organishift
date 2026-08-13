const Event = require('../models/event.model');
const Task = require('../models/task.model');
const User = require('../models/user.model');
const asyncHandler = require('../utils/asyncHandler');

const getEventProgress = asyncHandler(async (req, res) => {
  const events = await Event.find().sort({ createdAt: -1 });
  const counts = await Task.aggregate([
    {
      $group: {
        _id: '$eventId',
        total: { $sum: 1 },
        done: { $sum: { $cond: [{ $eq: ['$status', 'done'] }, 1, 0] } }
      }
    }
  ]);
  const map = new Map(counts.map((c) => [c._id.toString(), c]));
  const rows = events.map((event) => {
    const c = map.get(event._id.toString()) || { total: 0, done: 0 };
    return {
      eventId: event._id,
      title: event.title,
      status: event.status,
      totalTasks: c.total,
      doneTasks: c.done,
      progress: c.total === 0 ? 0 : Math.round((c.done / c.total) * 100)
    };
  });
  res.status(200).json({ success: true, data: { rows } });
});

const getWorkload = asyncHandler(async (req, res) => {
  const now = new Date();
  const users = await User.find({ isActive: true }).select('name email role');
  const agg = await Task.aggregate([
    { $match: { assigneeId: { $ne: null } } },
    {
      $group: {
        _id: '$assigneeId',
        totalTasks: { $sum: 1 },
        done: { $sum: { $cond: [{ $eq: ['$status', 'done'] }, 1, 0] } },
        inProgress: { $sum: { $cond: [{ $eq: ['$status', 'in-progress'] }, 1, 0] } },
        todo: { $sum: { $cond: [{ $eq: ['$status', 'todo'] }, 1, 0] } },
        overdue: {
          $sum: {
            $cond: [{ $and: [{ $ne: ['$status', 'done'] }, { $lt: ['$dueDate', now] }] }, 1, 0]
          }
        }
      }
    }
  ]);
  const map = new Map(agg.map((r) => [r._id.toString(), r]));
  const rows = users.map((user) => {
    const r = map.get(user._id.toString()) || { totalTasks: 0, done: 0, inProgress: 0, todo: 0, overdue: 0 };
    return { user, ...r };
  });
  res.status(200).json({ success: true, data: { rows } });
});

const getOverdue = asyncHandler(async (req, res) => {
  const now = new Date();
  const tasks = await Task.find({ dueDate: { $lt: now }, status: { $ne: 'done' } })
    .populate('eventId', 'title')
    .populate('assigneeId', 'name email')
    .sort({ dueDate: 1 });
  res.status(200).json({ success: true, data: { tasks } });
});

module.exports = { getEventProgress, getWorkload, getOverdue };
