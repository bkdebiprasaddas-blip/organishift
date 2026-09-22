// Single source of truth for EventItem status state machine (leaf nodes only).
// Role-gating (e.g. MEMBERs cannot touch a COMPLETED item) is enforced
// separately at the point of use — this table only describes valid
// state-machine edges once a caller is already authorized to change status.
const STATUS_TRANSITIONS = {
  NOT_STARTED: ['IN_PROGRESS', 'BLOCKED'],
  IN_PROGRESS: ['COMPLETED', 'BLOCKED'],
  BLOCKED: ['IN_PROGRESS'],
  COMPLETED: ['IN_PROGRESS']
};

// Role-aware view used for UI hints (e.g. dashboard quick-edit): MEMBERs
// never get an allowed transition out of COMPLETED, matching the
// enforcement guard in eventService.updateExecutionItem.
function getAllowedTransitions(status, role) {
  const allowed = STATUS_TRANSITIONS[status] || [];
  if (status === 'COMPLETED' && role === 'MEMBER') return [];
  return allowed;
}

module.exports = { STATUS_TRANSITIONS, getAllowedTransitions };
