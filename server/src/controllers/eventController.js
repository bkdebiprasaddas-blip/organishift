const { z } = require('zod');
const Event = require('../models/Event');
const EventItem = require('../models/EventItem');
const eventService = require('../services/eventService');
const progressService = require('../services/progressService');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const buildTree = require('../utils/buildTree');
const scopeItemsForMember = require('../utils/scopeItemsForMember');
const withTx = require('../utils/withTx');

const scheduleEventSchema = z.object({
  title: z.string().min(3).max(120),
  planId: z.string(),
  startDate: z.string().refine(val => !isNaN(Date.parse(val)), 'Invalid start date'),
  endDate: z.string().nullable().optional(),
  venue: z.string().max(200).optional()
});

const updateEventSchema = z.object({
  title: z.string().min(3).max(120).optional(),
  startDate: z.string().refine(val => !isNaN(Date.parse(val)), 'Invalid start date').optional(),
  endDate: z
    .string()
    .refine(val => !isNaN(Date.parse(val)), 'Invalid end date')
    .nullable()
    .optional(),
  venue: z.string().max(200).optional(),
  status: z.enum(['PLANNED', 'ONGOING', 'DONE']).optional()
});

const addExecutionItemSchema = z.object({
  title: z.string().min(1).max(120),
  parentId: z.string().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  dueDate: z
    .string()
    .refine(val => !isNaN(Date.parse(val)), 'Invalid due date')
    .nullable()
    .optional()
});

const VALID_URL_SCHEME = /^https?:\/\//i;

const updateExecutionItemSchema = z.object({
  title: z.string().min(1).max(120).optional(),
  nodeType: z.enum(['FOLDER', 'TASK', 'MILESTONE']).optional(),
  description: z.string().max(1000).optional(),
  operationalNotes: z.string().max(2000).optional(),
  tags: z.array(z.string().max(30)).optional(),
  checklist: z.array(z.object({
    text: z.string(),
    completed: z.boolean().optional()
  })).optional(),
  comments: z.array(z.object({
    text: z.string().min(1).max(500).optional(),
    user: z.any().optional(),
    userName: z.string().max(100).optional(),
    createdAt: z.any().optional()
  })).optional(),
  attachments: z.array(z.object({
    name: z.string().min(1).max(200),
    url: z.string().url().max(2000).refine(val => VALID_URL_SCHEME.test(val), { message: 'URL must use http or https scheme' }),
    size: z.number().optional(),
    uploadedAt: z.any().optional()
  })).optional(),
  status: z.enum(['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'BLOCKED']).optional(),
  assigneeId: z.string().nullable().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  dueDate: z.string().nullable().optional()
}).strict();

const getEvents = asyncHandler(async (req, res) => {
  const { from, to } = req.query;
  const filter = {};
  if (from || to) {
    filter.startDate = {};
    if (from) filter.startDate.$gte = new Date(from);
     if (to) {
      // SV-M7: end-of-day inclusive — include events later on the last day
      const end = new Date(to);
      end.setDate(end.getDate() + 1);
      filter.startDate.$lt = end;
    }
  }

  const events = await Event.find(filter).sort({ startDate: 1 });
  return res.status(200).json({
    success: true,
    data: events,
    message: 'Events retrieved'
  });
});

const createEvent = asyncHandler(async (req, res) => {
  const parsed = scheduleEventSchema.parse(req.body);
  
  // SV-M6: compare full timestamps (UTC), documenting policy: start date must be in the future
  if (new Date(parsed.startDate) < new Date()) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'Start date cannot be in the past');
  }

  if (parsed.endDate && new Date(parsed.endDate) < new Date(parsed.startDate)) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'End date must be on or after start date');
  }

  const result = await eventService.scheduleFromPlan(parsed, req.user._id);
  return res.status(201).json({
    success: true,
    data: result,
    message: `Scheduled event "${result.event.title}" with ${result.itemCount} items`
  });
});

const getEventById = asyncHandler(async (req, res) => {
  const event = await Event.findById(req.params.id);
  if (!event) {
    throw new ApiError(404, 'NOT_FOUND', 'Event not found');
  }

  let items = await EventItem.find({ eventId: event._id })
    .sort({ level: 1, order: 1 })
    .populate('assigneeId', 'name role');

  // Scoped view for MEMBER role (§2.7): owned branch = assigned node
  // + all its descendants + ancestor rows for context.
  if (req.user.role === 'MEMBER') {
    items = scopeItemsForMember(items, req.user._id);
  }

  const tree = buildTree(items);

  return res.status(200).json({
    success: true,
    data: {
      event,
      tree
    },
    message: 'Event retrieved'
  });
});

const updateEvent = asyncHandler(async (req, res) => {
  const parsed = updateEventSchema.parse(req.body);
  const event = await Event.findById(req.params.id);
  if (!event) {
    throw new ApiError(404, 'NOT_FOUND', 'Event not found');
  }

  // SV-M5: validate merged (existing + patched) dates, not only when both are sent
  const mergedStart = parsed.startDate ? new Date(parsed.startDate) : event.startDate;
  const mergedEnd = parsed.endDate !== undefined ? (parsed.endDate ? new Date(parsed.endDate) : null) : event.endDate;
  if (mergedEnd && mergedStart && mergedEnd < mergedStart) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'End date must be on or after start date');
  }

  if (parsed.title !== undefined) event.title = parsed.title;
  if (parsed.startDate !== undefined) event.startDate = new Date(parsed.startDate);
  if (parsed.endDate !== undefined) event.endDate = parsed.endDate ? new Date(parsed.endDate) : null;
  if (parsed.venue !== undefined) event.venue = parsed.venue;
  if (parsed.status !== undefined) event.status = parsed.status;

  await event.save();

  return res.status(200).json({
    success: true,
    data: event,
    message: 'Event updated'
  });
});

const deleteEvent = asyncHandler(async (req, res) => {
  const event = await Event.findById(req.params.id);
  if (!event) {
    throw new ApiError(404, 'NOT_FOUND', 'Event not found');
  }

  await withTx(async (session) => {
    await Event.findByIdAndDelete(req.params.id, session ? { session } : {});
    await EventItem.deleteMany({ eventId: req.params.id }, session ? { session } : {});
  });

  return res.status(200).json({
    success: true,
    message: 'Event and associated execution items deleted'
  });
});

const getEventProgress = asyncHandler(async (req, res) => {
  const result = await progressService.recalculate(req.params.id, null, req.user);
  return res.status(200).json({
    success: true,
    data: result,
    message: 'Event progress calculated'
  });
});

const addExecutionItem = asyncHandler(async (req, res) => {
  const parsed = addExecutionItemSchema.parse(req.body);
  const { eventId } = req.params;
  const { title, parentId, priority, dueDate } = parsed;

  const event = await Event.findById(eventId);
  if (!event) {
    throw new ApiError(404, 'NOT_FOUND', 'Event not found');
  }

  let level = 0;
  let parentPath = ',';

  if (parentId) {
    const parent = await EventItem.findById(parentId);
    if (!parent) {
      throw new ApiError(404, 'NOT_FOUND', 'Parent execution item not found');
    }
    // SV-M3: parent must belong to the same event
    if (String(parent.eventId) !== String(eventId)) {
      throw new ApiError(409, 'VALIDATION_ERROR', 'Parent item does not belong to this event');
    }
    level = parent.level + 1;
    parentPath = parent.path;
  }

  // SV-M3: compute order as max sibling order + 1
  const lastSibling = await EventItem.findOne({ eventId, parentId: parentId || null }).sort({ order: -1 });
  const order = lastSibling ? lastSibling.order + 1 : 0;

  const eItem = new EventItem({
    eventId,
    parentId: parentId || null,
    title,
    path: ',',
    level,
    order,
    priority: priority || 'MEDIUM',
    dueDate: dueDate ? new Date(dueDate) : event.startDate,
    status: 'NOT_STARTED',
    progressPercent: 0
  });

  eItem.path = `${parentPath}${eItem._id},`;
  await eItem.save();

  await progressService.recalculate(eventId);

  return res.status(201).json({
    success: true,
    data: eItem,
    message: 'Execution item added'
  });
});

const updateExecutionItem = asyncHandler(async (req, res) => {
  const parsed = updateExecutionItemSchema.parse(req.body);
  const item = await eventService.updateExecutionItem(req.params.id, parsed, req.user);
  return res.status(200).json({
    success: true,
    data: item,
    message: 'Execution item updated successfully'
  });
});

const deleteExecutionItem = asyncHandler(async (req, res) => {
  const item = await EventItem.findById(req.params.id);
  if (!item) {
    throw new ApiError(404, 'NOT_FOUND', 'Execution item not found');
  }

  const eventId = item.eventId;
  const progressResult = await withTx(async (session) => {
    const pathRegex = new RegExp(`,${item._id},`);
    await EventItem.deleteMany({
      $or: [{ _id: item._id }, { path: pathRegex }]
    }, session ? { session } : {});

    return progressService.recalculate(eventId, session);
  });

  return res.status(200).json({
    success: true,
    data: progressResult,
    message: 'Execution item and sub-tree deleted'
  });
});

module.exports = {
  getEvents,
  createEvent,
  getEventById,
  updateEvent,
  deleteEvent,
  getEventProgress,
  addExecutionItem,
  updateExecutionItem,
  deleteExecutionItem
};
