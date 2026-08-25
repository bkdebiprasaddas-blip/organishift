const mongoose = require('mongoose');
const Event = require('../models/Event');
const EventItem = require('../models/EventItem');
const EventPlan = require('../models/EventPlan');
const PlanningItem = require('../models/PlanningItem');
const ApiError = require('../utils/ApiError');
const progressService = require('./progressService');
const buildTree = require('../utils/buildTree');
const withTx = require('../utils/withTx');

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

        if (parentEventItemId) {
          const parentDoc = await EventItem.findById(parentEventItemId).session(session);
          eItem.path = `${parentDoc.path}${eItem._id},`;
        } else {
          eItem.path = `,${eItem._id},`;
        }
        await eItem.save(sopt);

        idMap.set(String(pItem._id), eItem._id);
        createdItems.push(eItem);
      }

      await progressService.recalculate(event._id, session);

      return {
        event,
        itemCount: createdItems.length
      };
    });
  }

  async updateExecutionItem(itemId, updateData, user) {
    const item = await EventItem.findById(itemId);
    if (!item) {
      throw new ApiError(404, 'NOT_FOUND', 'Execution item not found');
    }

    const { title, nodeType, description, operationalNotes, tags, checklist, comments, attachments, status, assigneeId, priority, dueDate } = updateData;

    // Field-Gating Check (§4 Spec)
    // assigneeId, priority, dueDate -> Manager only
    if (assigneeId !== undefined || priority !== undefined || dueDate !== undefined) {
      if (user.role !== 'MANAGER') {
        throw new ApiError(403, 'FORBIDDEN', 'Only Managers can assign items, change priority, or update due dates');
      }
    }

    if (title !== undefined) item.title = title;
    if (nodeType !== undefined) item.nodeType = nodeType;
    if (description !== undefined) item.description = description;
    if (operationalNotes !== undefined) item.operationalNotes = operationalNotes;
    if (tags !== undefined) item.tags = tags;
    if (checklist !== undefined) item.checklist = checklist;
    if (comments !== undefined) item.comments = comments;
    if (attachments !== undefined) item.attachments = attachments;
    if (assigneeId !== undefined) item.assigneeId = assigneeId || null;
    if (priority !== undefined) item.priority = priority;
    if (dueDate !== undefined) item.dueDate = dueDate ? new Date(dueDate) : null;

    // Status Change Handling
    if (status !== undefined && status !== item.status) {
      // Leaf check: Status is editable ONLY on leaves
      const childCount = await EventItem.countDocuments({ parentId: item._id });
      if (childCount > 0) {
        throw new ApiError(400, 'NOT_A_LEAF', 'Cannot manually change status on a parent node');
      }

      // Member ownership check (§2.7)
      if (user.role === 'MEMBER') {
        // User must be assignee of self or any ancestor (via path)
        const pathIds = item.path.split(',').filter(Boolean);
        const ancestors = await EventItem.find({ _id: { $in: pathIds } });
        const isOwned = ancestors.some(a => String(a.assigneeId) === String(user._id));

        if (!isOwned) {
          throw new ApiError(403, 'FORBIDDEN', 'Members can only update status on items assigned to them or their branch');
        }

        // Member cannot re-open COMPLETED
        if (item.status === 'COMPLETED') {
          throw new ApiError(403, 'FORBIDDEN', 'Members cannot re-open completed items');
        }
      }

      // Status Transition Table (§2.11)
      const validTransitions = {
        'NOT_STARTED': ['IN_PROGRESS', 'BLOCKED'],
        'IN_PROGRESS': ['COMPLETED', 'BLOCKED'],
        'BLOCKED': ['IN_PROGRESS'],
        'COMPLETED': ['IN_PROGRESS'] // Re-open (Manager/Admin only)
      };

      const allowed = validTransitions[item.status] || [];
      if (!allowed.includes(status)) {
        throw new ApiError(400, 'INVALID_TRANSITION', `Invalid status transition from ${item.status} to ${status}`);
      }

      item.status = status;
    }

    await item.save();
    await progressService.recalculate(item.eventId);

    return item;
  }
}

module.exports = new EventService();
