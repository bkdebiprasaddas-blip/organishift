const Event = require('../models/event.model');
const Task = require('../models/task.model');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

const listByEvent = asyncHandler(async (req, res) => {
  const { eventId } = req.params;
  const event = await Event.findById(eventId);
  if (!event) {
    throw new ApiError(404, 'Event not found');
  }
  const tasks = await Task.find({ eventId })
    .sort({ createdAt: 1 })
    .populate('assigneeId', 'name email')
    .populate('createdBy', 'name email');
  res.status(200).json({ success: true, data: { tasks } });
});

const create = asyncHandler(async (req, res) => {
  const { eventId } = req.params;
  const event = await Event.findById(eventId);
  if (!event) {
    throw new ApiError(404, 'Event not found');
  }
  const task = await Task.create({ ...req.body, eventId, createdBy: req.user._id });
  res.status(201).json({ success: true, data: { task } });
});

const update = asyncHandler(async (req, res) => {
  const task = await Task.findById(req.params.id);
  if (!task) {
    throw new ApiError(404, 'Task not found');
  }

  const isAdmin = req.user.role === 'admin';
  const isAssignee = task.assigneeId && task.assigneeId.toString() === req.user._id.toString();
  const isCreator = task.createdBy.toString() === req.user._id.toString();
  if (!isAdmin && !isAssignee && !isCreator) {
    throw new ApiError(403, 'Only the admin, assignee, or creator can update this task');
  }

  // Assignee/creator may only transition status; admins may edit everything.
  const allowed = isAdmin
    ? ['title', 'description', 'status', 'priority', 'assigneeId', 'dueDate']
    : ['status'];
  const patch = {};
  for (const key of allowed) {
    if (req.body[key] !== undefined) patch[key] = req.body[key];
  }

  if (patch.status === 'done') {
    patch.completedAt = new Date();
  } else if (patch.status && patch.status !== 'done') {
    patch.completedAt = null;
  }

  const updated = await Task.findByIdAndUpdate(task._id, patch, { new: true })
    .populate('assigneeId', 'name email')
    .populate('createdBy', 'name email');
  res.status(200).json({ success: true, data: { task: updated } });
});

const remove = asyncHandler(async (req, res) => {
  const task = await Task.findById(req.params.id);
  if (!task) {
    throw new ApiError(404, 'Task not found');
  }
  await Task.deleteOne({ _id: task._id });
  res.status(204).end();
});

module.exports = { listByEvent, create, update, remove };
