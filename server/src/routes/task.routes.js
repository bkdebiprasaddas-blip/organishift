const { Router } = require('express');
const { body, param } = require('express-validator');
const { listByEvent, create, update, remove } = require('../controllers/task.controller');
const auth = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/roles.middleware');
const validate = require('../middleware/validate.middleware');
const { TASK_STATUS, TASK_PRIORITY } = require('../utils/enums');

// Mounted at /events -> provides /events/:eventId/tasks
const eventsTasksRouter = Router();
eventsTasksRouter.use(auth);

eventsTasksRouter.get(
  '/:eventId/tasks',
  param('eventId').isMongoId().withMessage('Invalid event id'),
  validate,
  listByEvent
);

eventsTasksRouter.post(
  '/:eventId/tasks',
  requireRole('admin'),
  param('eventId').isMongoId().withMessage('Invalid event id'),
  body('title').trim().isLength({ min: 3, max: 160 }).withMessage('Title must be 3-160 characters'),
  body('description').optional().isLength({ max: 1000 }).withMessage('Description must be at most 1000 characters'),
  body('status').optional().isIn(Object.values(TASK_STATUS)).withMessage('Invalid task status'),
  body('priority').optional().isIn(Object.values(TASK_PRIORITY)).withMessage('Invalid priority'),
  body('assigneeId').optional().isMongoId().withMessage('Invalid assignee'),
  body('dueDate').optional().isISO8601().withMessage('dueDate must be a valid date'),
  validate,
  create
);

// Mounted at /tasks -> provides /tasks/:id
const tasksRouter = Router();
tasksRouter.use(auth);

tasksRouter.patch(
  '/:id',
  param('id').isMongoId().withMessage('Invalid task id'),
  body('status').optional().isIn(Object.values(TASK_STATUS)).withMessage('Invalid task status'),
  validate,
  update
);

tasksRouter.delete('/:id', requireRole('admin'), param('id').isMongoId().withMessage('Invalid task id'), validate, remove);

module.exports = { eventsTasksRouter, tasksRouter };
