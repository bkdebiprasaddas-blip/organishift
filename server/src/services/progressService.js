const EventItem = require('../models/EventItem');
const Event = require('../models/Event');
const buildTree = require('../utils/buildTree');
const scopeItemsForMember = require('../utils/scopeItemsForMember');

class ProgressService {
  /**
   * Recalculates progress percentages for all nodes in an event execution tree.
   * By default also persists the result to MongoDB (Event + every EventItem).
   * @param {string} eventId
   * @param {object|null} session - mongoose session for transactions
   * @param {object|null} user - requesting user; if MEMBER, returned tree is scoped
   * @param {object} opts - { persist = true }. BC-5: the plain GET progress route
   *   passes persist:false so a read has no side effects — only mutating
   *   endpoints (add/update/delete item, schedule) should actually write.
   */
  async recalculate(eventId, session = null, user = null, opts = {}) {
    const { persist = true } = opts;
    const sopt = session ? { session } : {};
    const items = await EventItem.find({ eventId }, null, sopt);
    if (!items || items.length === 0) {
      if (persist) await Event.findByIdAndUpdate(eventId, { progressPercent: 0 }, sopt);
      return { eventProgress: 0, tree: [] };
    }

    const itemMap = new Map();
    items.forEach(i => itemMap.set(String(i._id), i));

    // Build children map for O(n) lookups (SV-L11: avoids O(n²) filter)
    const childrenMap = new Map();
    items.forEach(i => {
      const pid = i.parentId ? String(i.parentId) : 'null';
      if (!childrenMap.has(pid)) childrenMap.set(pid, []);
      childrenMap.get(pid).push(i);
    });

    // Calculate root nodes progress
    const rootNodes = items.filter(i => i.parentId === null);
    let eventProgress = 0;

    // SV-L11: visited-set guard to prevent stack overflow on corrupted cycles
    const visited = new Set();
    const calculateNodeProgress = (nodeId) => {
      const key = String(nodeId);
      if (visited.has(key)) return 0; // cycle guard
      visited.add(key);

      const node = itemMap.get(key);
      if (!node) return 0;
      const children = childrenMap.get(key) || [];

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

    if (rootNodes.length > 0) {
      visited.clear(); // reset for root-level traversal
      const rootSum = rootNodes.reduce((sum, root) => {
        return sum + calculateNodeProgress(root._id);
      }, 0);
      eventProgress = Math.round(rootSum / rootNodes.length);
    }

    // Compute rounded progressPercent per item (always, in-memory)
    const progressById = new Map();
    for (const item of items) {
      visited.clear(); // fresh traversal per item
      progressById.set(String(item._id), Math.round(calculateNodeProgress(item._id)));
    }

    let refreshedItems;
    if (persist) {
      // BC-5: only write to MongoDB when the caller is a mutating operation
      // (schedule / add / update / delete item) — not a plain progress read.
      for (const item of items) {
        item.progressPercent = progressById.get(String(item._id));
        await item.save(sopt);
      }
      await Event.findByIdAndUpdate(eventId, { progressPercent: eventProgress }, sopt);

      refreshedItems = await EventItem.find({ eventId }, null, sopt)
        .populate('assigneeId', 'name role')
        .sort({ level: 1, order: 1 });
    } else {
      refreshedItems = await EventItem.find({ eventId }, null, sopt)
        .populate('assigneeId', 'name role')
        .sort({ level: 1, order: 1 });
      // Decorate the in-memory docs with the freshly computed values without saving.
      refreshedItems.forEach(i => {
        const p = progressById.get(String(i._id));
        if (p !== undefined) i.progressPercent = p;
      });
    }

    // SV-H4: scope the returned tree for MEMBERs (§2.7)
    if (user && user.role === 'MEMBER') {
      refreshedItems = scopeItemsForMember(refreshedItems, user._id);
    }

    return {
      eventProgress,
      tree: buildTree(refreshedItems)
    };
  }
}

module.exports = new ProgressService();
