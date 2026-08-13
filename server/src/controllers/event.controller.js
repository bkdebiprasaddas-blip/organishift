const Event = require('../models/event.model');
const Task = require('../models/task.model');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

const computeProgress = (total, done) => (total === 0 ? 0 : Math.round((done / total) * 100));

const escapeRegExp = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// counts: [{ _id: eventId, total, done }] from the tasks aggregation.
const attachProgress = (events, counts) => {
  const map = new Map(counts.map((c) => [c._id.toString(), c]));
  return events.map((event) => {
    const c = map.get(event._id.toString()) || { total: 0, done: 0 };
    const obj = event.toObject ? event.toObject() : event;
    return { ...obj, progress: computeProgress(c.total, c.done) };
  });
};

const countByEvent = (eventIds) =>
  Task.aggregate([
    { $match: { eventId: { $in: eventIds } } },
    {
      $group: {
        _id: '$eventId',
        total: { $sum: 1 },
        done: { $sum: { $cond: [{ $eq: ['$status', 'done'] }, 1, 0] } }
      }
    }
  ]);

const list = asyncHandler(async (req, res) => {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const size = Math.min(Math.max(parseInt(req.query.size, 10) || 20, 1), 100);

  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  if (req.query.search) filter.title = { $regex: escapeRegExp(req.query.search), $options: 'i' };

  const [events, total] = await Promise.all([
    Event.find(filter).sort({ createdAt: -1 }).skip((page - 1) * size).limit(size),
    Event.countDocuments(filter)
  ]);

  const counts = await countByEvent(events.map((e) => e._id));
  res.status(200).json({
    success: true,
    data: { events: attachProgress(events, counts), pagination: { page, size, total, pages: Math.ceil(total / size) } }
  });
});

const create = asyncHandler(async (req, res) => {
  const event = await Event.create({ ...req.body, createdBy: req.user._id });
  res.status(201).json({ success: true, data: { event: { ...event.toObject(), progress: 0 } } });
});

const getById = asyncHandler(async (req, res) => {
  const event = await Event.findById(req.params.id);
  if (!event) {
    throw new ApiError(404, 'Event not found');
  }
  const [tasks, counts] = await Promise.all([
    Task.find({ eventId: event._id })
      .sort({ createdAt: 1 })
      .populate('assigneeId', 'name email')
      .populate('createdBy', 'name email'),
    countByEvent([event._id])
  ]);
  const [withProgress] = attachProgress([event], counts);
  res.status(200).json({ success: true, data: { event: withProgress, tasks } });
});

const update = asyncHandler(async (req, res) => {
  const event = await Event.findById(req.params.id);
  if (!event) {
    throw new ApiError(404, 'Event not found');
  }

  const allowed = ['title', 'description', 'startDate', 'endDate', 'status'];
  const patch = {};
  for (const key of allowed) {
    if (req.body[key] !== undefined) patch[key] = req.body[key];
  }

  if (patch.startDate && patch.endDate && new Date(patch.startDate) > new Date(patch.endDate)) {
    throw new ApiError(400, 'startDate must be before or equal to endDate');
  }
  // Cancelled is terminal.
  if (event.status === 'cancelled' && patch.status && patch.status !== 'cancelled') {
    throw new ApiError(400, 'A cancelled event cannot be reopened');
  }

  const updated = await Event.findByIdAndUpdate(event._id, patch, { new: true });
  res.status(200).json({ success: true, data: { event: updated } });
});

const remove = asyncHandler(async (req, res) => {
  const event = await Event.findById(req.params.id);
  if (!event) {
    throw new ApiError(404, 'Event not found');
  }
  // Cascade delete tasks in the service layer.
  await Task.deleteMany({ eventId: event._id });
  await Event.deleteOne({ _id: event._id });
  res.status(204).end();
});

module.exports = { list, create, getById, update, remove };
