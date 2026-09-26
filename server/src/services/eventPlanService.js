const Event = require('../models/Event');
const EventPlan = require('../models/EventPlan');
const PlanningItem = require('../models/PlanningItem');
const ApiError = require('../utils/ApiError');
const withTx = require('../utils/withTx');

class EventPlanService {
  async updatePlan(planId, patch) {
    const plan = await EventPlan.findById(planId);
    if (!plan) {
      throw new ApiError(404, 'PLAN_NOT_FOUND', 'Event plan not found');
    }

    if (patch.title !== undefined) plan.title = patch.title;
    if (patch.description !== undefined) plan.description = patch.description;
    if (patch.category !== undefined) plan.category = patch.category;
    if (patch.isTemplate !== undefined) plan.isTemplate = patch.isTemplate;

    await plan.save();
    return plan;
  }

  async copyFromLibrary(planId, libraryItemId, userId) {
    const plan = await EventPlan.findById(planId);
    if (!plan) {
      throw new ApiError(404, 'PLAN_NOT_FOUND', 'Event plan not found');
    }

    const libRoot = await PlanningItem.findById(libraryItemId);
    if (!libRoot || libRoot.scope !== 'LIBRARY') {
      throw new ApiError(404, 'NOT_FOUND', 'Library item not found');
    }

    return withTx(async (session) => {
      const sopt = session ? { session } : {};

      // Find all items in this library branch
      const pathRegex = new RegExp(`,${libraryItemId},`);
      const libBranch = await PlanningItem.find({
        $or: [{ _id: libraryItemId }, { path: pathRegex }]
      }).sort({ level: 1, order: 1 });

      const idMap = new Map();
      const createdPlanItems = [];
      // Path/level of each item as it is created. The old code re-queried the
      // parent with PlanningItem.findById on every iteration (one extra round
      // trip per node); the value was always a document we had just written.
      const metaByLibId = new Map();

      for (const libItem of libBranch) {
        const parentPlanId = libItem.parentId ? idMap.get(String(libItem.parentId)) : null;

        let parentPath = ',';
        let computedLevel = 0;
        if (parentPlanId) {
          const parentMeta = metaByLibId.get(String(libItem.parentId));
          parentPath = parentMeta.path;
          computedLevel = parentMeta.level + 1;
        }

        const pItem = new PlanningItem({
          title: libItem.title,
          description: libItem.description,
          nodeType: libItem.nodeType || 'TASK',
          operationalNotes: libItem.operationalNotes || '',
          tags: libItem.tags || [],
          checklist: (libItem.checklist || []).map(c => ({ text: c.text, completed: c.completed })),
          parentId: parentPlanId || null,
          planId: plan._id,
          scope: 'PLAN',
          path: ',',
          level: computedLevel,
          order: libItem.order,
          sourceLibraryItemId: libItem._id,
          createdBy: userId
        });

        pItem.path = `${parentPath}${pItem._id},`;
        await pItem.save(sopt);

        idMap.set(String(libItem._id), pItem._id);
        metaByLibId.set(String(libItem._id), { path: pItem.path, level: pItem.level });
        createdPlanItems.push(pItem);
      }

      return createdPlanItems;
    });
  }

  async deletePlanCascade(planId) {
    const plan = await EventPlan.findById(planId);
    if (!plan) {
      throw new ApiError(404, 'PLAN_NOT_FOUND', 'Event plan not found');
    }

    // SV-M13: prevent deletion when events reference this plan (dangling planId)
    const referencingEvents = await Event.find({ planId }).select('_id');
    if (referencingEvents.length > 0) {
      throw new ApiError(
        409,
        'CONFLICT',
        `Cannot delete plan — ${referencingEvents.length} scheduled event(s) reference it. Unschedule or reassign those events first.`
      );
    }

    await withTx(async (session) => {
      const sopt = session ? { session } : {};
      await EventPlan.findByIdAndDelete(planId, sopt);
      await PlanningItem.deleteMany({ planId, scope: 'PLAN' }, sopt);
    });

    return plan;
  }
}

module.exports = new EventPlanService();
