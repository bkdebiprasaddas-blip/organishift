const EventItem = require('../models/EventItem');
const Event = require('../models/Event');
const buildTree = require('../utils/buildTree');

class ProgressService {
  /**
   * Recalculates progress percentages for all nodes in an event execution tree,
   * updates the event progressPercent, and persists changes to MongoDB.
   */
  async recalculate(eventId, session = null) {
    const sopt = session ? { session } : {};
    const items = await EventItem.find({ eventId });
    if (!items || items.length === 0) {
      await Event.findByIdAndUpdate(eventId, { progressPercent: 0 }, sopt);
      return { eventProgress: 0, items: [] };
    }

    const itemMap = new Map();
    items.forEach(i => itemMap.set(String(i._id), i));

    // Helper to compute node progress recursively
    const calculateNodeProgress = (nodeId) => {
      const node = itemMap.get(String(nodeId));
      const children = items.filter(i => String(i.parentId) === String(nodeId));

      if (children.length === 0) {
        // Leaf node calculation
        if (node.status === 'COMPLETED') return 100;
        if (node.status === 'IN_PROGRESS') return 50;
        return 0; // NOT_STARTED or BLOCKED
      }

      // Parent node calculation: average of immediate children
      const childrenProgressSum = children.reduce((sum, child) => {
        return sum + calculateNodeProgress(child._id);
      }, 0);

      const avg = childrenProgressSum / children.length;
      return avg;
    };

    // Calculate root nodes progress
    const rootNodes = items.filter(i => i.parentId === null);
    let eventProgress = 0;

    if (rootNodes.length > 0) {
      const rootSum = rootNodes.reduce((sum, root) => {
        return sum + calculateNodeProgress(root._id);
      }, 0);
      eventProgress = Math.round(rootSum / rootNodes.length);
    }

    // Persist rounded progressPercent on each item
    for (const item of items) {
      const nodeProg = Math.round(calculateNodeProgress(item._id));
      item.progressPercent = nodeProg;
      await item.save(sopt);
    }

    // Persist event overall progress
    await Event.findByIdAndUpdate(eventId, { progressPercent: eventProgress }, sopt);

    const refreshedItems = await EventItem.find({ eventId }, null, sopt).sort({ level: 1, order: 1 });
    return {
      eventProgress,
      tree: buildTree(refreshedItems)
    };
  }
}

module.exports = new ProgressService();
