const EventPlan = require('../models/EventPlan');
const PlanningItem = require('../models/PlanningItem');
const ApiError = require('../utils/ApiError');
const withTx = require('../utils/withTx');

class EventPlanService {
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

      for (const libItem of libBranch) {
        const parentPlanId = libItem.parentId ? idMap.get(String(libItem.parentId)) : null;

        let parentPath = ',';
        if (parentPlanId) {
          const parentDoc = await PlanningItem.findById(parentPlanId).session(session);
          parentPath = parentDoc.path;
        }

        const pItem = new PlanningItem({
          title: libItem.title,
          description: libItem.description,
          parentId: parentPlanId || null,
          planId: plan._id,
          scope: 'PLAN',
          path: ',',
          level: libItem.level,
          order: libItem.order,
          sourceLibraryItemId: libItem._id,
          createdBy: userId
        });

        pItem.path = `${parentPath}${pItem._id},`;
        await pItem.save(sopt);

        idMap.set(String(libItem._id), pItem._id);
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

    await withTx(async (session) => {
      const sopt = session ? { session } : {};
      await EventPlan.findByIdAndDelete(planId, sopt);
      await PlanningItem.deleteMany({ planId, scope: 'PLAN' }, sopt);
    });

    return plan;
  }
}

module.exports = new EventPlanService();
