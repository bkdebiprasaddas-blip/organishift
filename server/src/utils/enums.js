const ROLES = Object.freeze({
  ADMIN: 'admin',
  USER: 'user'
});

const EVENT_STATUS = Object.freeze({
  DRAFT: 'draft',
  ACTIVE: 'active',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled'
});

const TASK_STATUS = Object.freeze({
  TODO: 'todo',
  IN_PROGRESS: 'in-progress',
  DONE: 'done'
});

const TASK_PRIORITY = Object.freeze({
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high'
});

module.exports = { ROLES, EVENT_STATUS, TASK_STATUS, TASK_PRIORITY };
