/**
 * MEMBER scoped visibility (§2.7 / OPEN-5):
 * A member sees an execution item if they own it (assignee of the item or any
 * ancestor) plus every descendant of an assigned node (the whole owned branch),
 * plus ancestor rows for context. Unowned branches are not returned.
 */
function scopeItemsForMember(items, userId) {
  const ownedIds = new Set();
  const userStr = String(userId);

  const assigned = items.filter(
    i => String(i.assigneeId?._id ?? i.assigneeId) === userStr
  );

  assigned.forEach(i => {
    // self + ancestors
    i.path.split(',').filter(Boolean).forEach(id => ownedIds.add(id));
    // descendants of the assigned node
    items.forEach(o => {
      if (o.path.startsWith(i.path)) ownedIds.add(String(o._id));
    });
  });

  return items.filter(item => ownedIds.has(String(item._id)));
}

module.exports = scopeItemsForMember;
