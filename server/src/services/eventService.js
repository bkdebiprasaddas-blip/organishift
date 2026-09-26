const mongoose = require('mongoose');
const Event = require('../models/Event');
const EventItem = require('../models/EventItem');
const EventPlan = require('../models/EventPlan');
const PlanningItem = require('../models/PlanningItem');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const progressService = require('./progressService');
const buildTree = require('../utils/buildTree');
const withTx = require('../utils/withTx');
const VALID_URL_SCHEME = require('../utils/urlScheme');
const { STATUS_TRANSITIONS } = require('../utils/statusTransitions');

class EventService {
  async scheduleFromPlan(data, userId) {
    const { title, planId, startDate, endDate, venue } = data;

    const plan = await EventPlan.findById(planId);
    if (!plan) {
      throw new ApiError(404, 'PLAN_NOT_FOUND', 'Event plan not found');
    }

    return withTx(async (session) => {
      const sopt = session ? { session } : {};

      const event = new Event({
        title,
        planId,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
        venue: venue || '',
        status: 'PLANNED',
        progressPercent: 0,
        createdBy: userId
      });
      await event.save(sopt);

      const planItems = await PlanningItem.find({ planId, scope: 'PLAN' }).sort({ level: 1, order: 1 });
      const idMap = new Map();
      const createdItems = [];
      // Path of each EventItem as it is created. The old code re-queried the
      // parent with EventItem.findById on every iteration (an extra round trip
      // per node, and it went through .session(session) with a possibly-null
      // session); the value was always a document we had just written.
      const pathByPlanItemId = new Map();

      for (const pItem of planItems) {
        const parentEventItemId = pItem.parentId ? idMap.get(String(pItem.parentId)) : null;

        const eItem = new EventItem({
          eventId: event._id,
          parentId: parentEventItemId || null,
          title: pItem.title,
          nodeType: pItem.nodeType || 'TASK',
          description: pItem.description || '',
          operationalNotes: pItem.operationalNotes || '',
          tags: pItem.tags || [],
          checklist: (pItem.checklist || []).map(c => ({ text: c.text, completed: c.completed })),
          path: ',',
          level: pItem.level,
          order: pItem.order,
          assigneeId: null,
          status: 'NOT_STARTED',
          priority: 'MEDIUM',
          dueDate: event.startDate,
          progressPercent: 0,
          sourcePlanningItemId: pItem._id
        });

        const parentPath = parentEventItemId
          ? pathByPlanItemId.get(String(pItem.parentId))
          : ',';
        eItem.path = `${parentPath}${eItem._id},`;
        await eItem.save(sopt);

        idMap.set(String(pItem._id), eItem._id);
        pathByPlanItemId.set(String(pItem._id), eItem.path);
        createdItems.push(eItem);
      }

      await progressService.recalculate(event._id, session);

      return {
        event,
        itemCount: createdItems.length
      };
    });
  }

  async addExecutionItem(eventId, data) {
    const { title, parentId, priority, dueDate } = data;

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

    return eItem;
  }

  async updateExecutionItem(itemId, updateData, user) {
    const item = await EventItem.findById(itemId);
    if (!item) {
      throw new ApiError(404, 'NOT_FOUND', 'Execution item not found');
    }

    const { title, nodeType, description, operationalNotes, tags, checklist, comments, attachments, status, assigneeId, priority, dueDate } = updateData;

    // Field-Gating Check (§4 Spec)
    // assigneeId, priority, dueDate -> Manager only.
    //
    // ADMIN being excluded here is deliberate, not an oversight: the role model
    // is "Admin owns structure, not operations" (ADMIN builds plans and the
    // library; MANAGER runs the event). This is asserted by test T-05 in
    // test/acceptance.test.js — do not widen it to ADMIN without changing that
    // test and the documented role model first.
    if (assigneeId !== undefined || priority !== undefined || dueDate !== undefined) {
      if (user.role !== 'MANAGER') {
        throw new ApiError(403, 'FORBIDDEN', 'Only Managers can assign items, change priority, or update due dates');
      }
    }

    // SV-L14: validate assigneeId refers to an existing active user
    if (assigneeId !== undefined && assigneeId !== null) {
      const assignee = await User.findById(assigneeId);
      if (!assignee || !assignee.isActive) {
        throw new ApiError(400, 'VALIDATION_ERROR', 'Assignee must be an existing active user');
      }
    }

    // Member ownership check for content fields (§2.7 / SV-H2)
    const contentUpdates = [title, nodeType, description, operationalNotes, tags, checklist, comments, attachments];
    const hasContentUpdate = contentUpdates.some(v => v !== undefined);
    if (user.role === 'MEMBER' && hasContentUpdate) {
      const pathIds = item.path.split(',').filter(Boolean);
      const ancestors = await EventItem.find({ _id: { $in: pathIds } });
      const isOwned = ancestors.some(a => String(a.assigneeId) === String(user._id));
      if (!isOwned) {
        throw new ApiError(403, 'FORBIDDEN', 'Members can only edit items in their assigned branch');
      }
    }

    const updateFields = {};
    if (title !== undefined) updateFields.title = title;
    if (nodeType !== undefined) updateFields.nodeType = nodeType;
    if (description !== undefined) updateFields.description = description;
    if (operationalNotes !== undefined) updateFields.operationalNotes = operationalNotes;
    if (tags !== undefined) updateFields.tags = tags;
    if (checklist !== undefined) updateFields.checklist = checklist;
    if (comments !== undefined) {
      // SV-H3: the server derives comment authorship from the authenticated user
      // so a client cannot forge an author. The client sends the WHOLE array
      // (existing comments + the new one), so only entries that arrive WITHOUT
      // an author are attributed to the caller. Stamping every entry re-attributed
      // all pre-existing comments to whoever happened to add the latest one,
      // silently rewriting the audit trail.
      const existingIds = new Set(
        (item.comments || []).map(c => String(c._id)).filter(Boolean)
      );
      updateFields.comments = comments.map(c => {
        const isExisting = c._id && existingIds.has(String(c._id));
        if (isExisting) {
          // Preserve the original author and timestamp verbatim.
          const prior = (item.comments || []).find(x => String(x._id) === String(c._id));
          return {
            _id: prior._id,
            text: c.text,
            user: prior.user,
            userName: prior.userName,
            createdAt: prior.createdAt
          };
        }
        return {
          text: c.text,
          user: user._id,
          userName: user.name,
          createdAt: c.createdAt || new Date()
        };
      });
    }
    if (attachments !== undefined) {
      // SV-H3: URL scheme validated by zod + service defense-in-depth
      attachments.forEach(a => {
        if (!VALID_URL_SCHEME.test(a.url)) {
          throw new ApiError(400, 'VALIDATION_ERROR', 'Attachment URL must use http or https scheme');
        }
      });
      updateFields.attachments = attachments;
    }
    if (assigneeId !== undefined) updateFields.assigneeId = assigneeId || null;
    if (priority !== undefined) updateFields.priority = priority;
    if (dueDate !== undefined) updateFields.dueDate = dueDate ? new Date(dueDate) : null;

    // SV-M12: optimistic concurrency — atomic conditional update prevents
    // read-modify-write races; write applies only if version is unchanged.
    // Status changes require leaf check + ownership/transition validation first.
    if (status !== undefined && status !== item.status) {
      const childCount = await EventItem.countDocuments({ parentId: item._id });
      if (childCount > 0) {
        throw new ApiError(400, 'NOT_A_LEAF', 'Cannot manually change status on a parent node');
      }

      if (user.role === 'MEMBER') {
        const pathIds = item.path.split(',').filter(Boolean);
        const ancestors = await EventItem.find({ _id: { $in: pathIds } });
        const isOwned = ancestors.some(a => String(a.assigneeId) === String(user._id));
        if (!isOwned) {
          throw new ApiError(403, 'FORBIDDEN', 'Members can only update status on items assigned to them or their branch');
        }
        if (item.status === 'COMPLETED') {
          throw new ApiError(403, 'FORBIDDEN', 'Members cannot re-open completed items');
        }
      }

      const allowed = STATUS_TRANSITIONS[item.status] || [];
      if (!allowed.includes(status)) {
        throw new ApiError(400, 'INVALID_TRANSITION', `Invalid status transition from ${item.status} to ${status}`);
      }
      updateFields.status = status;
    }

    const updated = await EventItem.findOneAndUpdate(
      { _id: itemId, __v: item.__v },
      { $set: updateFields, $inc: { __v: 1 } },
      { new: true, runValidators: true }
    );
    if (!updated) {
      throw new ApiError(409, 'CONFLICT', 'Item was modified by another user. Please refresh and try again.');
    }
    await progressService.recalculate(item.eventId);

    return updated;
  }
}

module.exports = new EventService();
