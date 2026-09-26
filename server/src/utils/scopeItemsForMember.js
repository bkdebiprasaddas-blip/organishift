/**
 * MEMBER scoped visibility (A‑2.7 / OPEN‑5):
 * A member sees an execution item if they own it (assignee of the item or any
 * ancestor) plus every descendant of an assigned node (the whole owned branch),
 * plus ancestor rows for context. Unowned branches are not returned.
 *
 * Complexity: O(total path length), i.e. O(n * depth).
 *
 * The previous implementation looped every item once per assigned item to test
 * `o.path.startsWith(i.path)`, which is O(n * assigned). Each `path` is short
 * (`,id,id,...`), so a single pass that inspects each item's own ancestor chain
 * is both simpler and dramatically cheaper on large events.
 */
function scopeItemsForMember(items, userId) {
  if (!Array.isArray(items) || items.length === 0) return [];
  const userStr = String(userId);

  // 1. Nodes assigned directly to this user.
  const assignedIds = new Set();
  for (const i of items) {
    if (String(i.assigneeId?._id ?? i.assigneeId) === userStr) {
      assignedIds.add(String(i._id));
    }
  }
  if (assignedIds.size === 0) return [];

  // 2. The assigned nodes plus all of their ancestors, kept for context rows.
  //    `path` is ",id,parentId,...," so it already contains the node's own id.
  const contextIds = new Set(assignedIds);
  for (const i of items) {
    if (!assignedIds.has(String(i._id))) continue;
    for (const id of String(i.path || ',').split(',')) {
      if (id) contextIds.add(id);
    }
  }

  // 3. Keep an item when it is an assigned node / ancestor row, or when its own
  //    ancestor chain contains an assigned node (i.e. it is a descendant).
  const visible = new Set();
  for (const item of items) {
    const id = String(item._id);
    if (contextIds.has(id)) {
      visible.add(id);
      continue;
    }
    for (const ancestorId of String(item.path || ',').split(',')) {
      if (ancestorId && assignedIds.has(ancestorId)) {
        visible.add(id);
        break;
      }
    }
  }

  return items.filter(item => visible.has(String(item._id)));
}

module.exports = scopeItemsForMember;
