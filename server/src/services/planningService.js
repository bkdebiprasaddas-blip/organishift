const mongoose = require('mongoose');
const PlanningItem = require('../models/PlanningItem');
const ApiError = require('../utils/ApiError');
const buildTree = require('../utils/buildTree');
const withTx = require('../utils/withTx');

class PlanningService {
  async getTree(query) {
    const { scope, planId } = query;
    const filter = {};
    if (scope) filter.scope = scope;
    if (planId) filter.planId = planId;

    const items = await PlanningItem.find(filter).sort({ level: 1, order: 1 });
    return buildTree(items);
  }

  async createItem(data, userId) {
    const { title, description, operationalNotes, nodeType, tags, checklist, parentId, planId, scope, order } = data;

    let level = 0;
    let parentPath = ',';

    if (parentId) {
      const parent = await PlanningItem.findById(parentId);
      if (!parent) {
        throw new ApiError(404, 'NOT_FOUND', 'Parent planning item not found');
      }
      if (parent.scope !== scope) {
        throw new ApiError(400, 'VALIDATION_ERROR', 'Parent scope must match item scope');
      }
      level = parent.level + 1;
      parentPath = parent.path;
    }

    const item = new PlanningItem({
      title,
      description,
      operationalNotes,
      nodeType: nodeType || 'TASK',
      tags: tags || [],
      checklist: checklist || [],
      parentId: parentId || null,
      planId: planId || null,
      scope,
      level,
      order: order || 0,
      path: ',', // Temporary placeholder
      createdBy: userId
    });

    item.path = `${parentPath}${item._id},`;
    await item.save();
    return item;
  }

  async moveItem(id, newParentId) {
    if (String(id) === String(newParentId)) {
      throw new ApiError(400, 'CYCLE_DETECTED', 'Cannot move an item under itself');
    }

    const item = await PlanningItem.findById(id);
    if (!item) {
      throw new ApiError(404, 'NOT_FOUND', 'Planning item not found');
    }

    let newLevel = 0;
    let newParentPath = ',';

    if (newParentId) {
      const newParent = await PlanningItem.findById(newParentId);
      if (!newParent) {
        throw new ApiError(404, 'NOT_FOUND', 'New parent item not found');
      }

      // Cycle Check: New parent's path cannot contain item's ID
      if (newParent.path.includes(`,${id},`)) {
        throw new ApiError(400, 'CYCLE_DETECTED', 'Cannot move an item under one of its descendants');
      }

      newLevel = newParent.level + 1;
      newParentPath = newParent.path;
    }

    const oldPath = item.path;
    const newPath = `${newParentPath}${item._id},`;
    const levelDelta = newLevel - item.level;

    // Update item and all descendants in path
    item.parentId = newParentId || null;
    item.level = newLevel;
    item.path = newPath;
    await item.save();

    // Re-path descendants
    const descendants = await PlanningItem.find({ path: new RegExp(`,${id},`) });
    for (const desc of descendants) {
      if (String(desc._id) === String(id)) continue;
      desc.path = desc.path.replace(oldPath, newPath);
      desc.level = desc.level + levelDelta;
      await desc.save();
    }

    return item;
  }

  async deleteSubtree(id) {
    const item = await PlanningItem.findById(id);
    if (!item) {
      throw new ApiError(404, 'NOT_FOUND', 'Planning item not found');
    }

    return withTx(async (session) => {
      const pathRegex = new RegExp(`,${id},`);
      const opts = session ? { session } : {};
      const result = await PlanningItem.deleteMany({
        $or: [{ _id: id }, { path: pathRegex }]
      }, opts);

      return { deletedCount: result.deletedCount };
    });
  }
}

module.exports = new PlanningService();
