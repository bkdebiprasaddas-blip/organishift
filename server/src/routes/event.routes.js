const { Router } = require('express');
const { body, param, query } = require('express-validator');
const { list, create, getById, update, remove } = require('../controllers/event.controller');
const auth = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/roles.middleware');
const validate = require('../middleware/validate.middleware');
const { EVENT_STATUS } = require('../utils/enums');

const router = Router();
router.use(auth);

router.get(
  '/',
  query('page').optional().isInt({ min: 1 }).withMessage('page must be a positive integer'),
  query('size').optional().isInt({ min: 1, max: 100 }).withMessage('size must be between 1 and 100'),
  validate,
  list
);

router.post(
  '/',
  requireRole('admin'),
  body('title').trim().isLength({ min: 3, max: 120 }).withMessage('Title must be 3-120 characters'),
  body('description').optional().isLength({ max: 2000 }).withMessage('Description must be at most 2000 characters'),
  body('status').optional().isIn(Object.values(EVENT_STATUS)).withMessage('Invalid event status'),
  body('startDate').optional().isISO8601().withMessage('startDate must be a valid date'),
  body('endDate').optional().isISO8601().withMessage('endDate must be a valid date'),
  validate,
  create
);

router.get('/:id', param('id').isMongoId().withMessage('Invalid event id'), validate, getById);

router.patch(
  '/:id',
  requireRole('admin'),
  param('id').isMongoId().withMessage('Invalid event id'),
  body('title').optional().trim().isLength({ min: 3, max: 120 }).withMessage('Title must be 3-120 characters'),
  body('description').optional().isLength({ max: 2000 }).withMessage('Description must be at most 2000 characters'),
  body('status').optional().isIn(Object.values(EVENT_STATUS)).withMessage('Invalid event status'),
  body('startDate').optional().isISO8601().withMessage('startDate must be a valid date'),
  body('endDate').optional().isISO8601().withMessage('endDate must be a valid date'),
  validate,
  update
);

router.delete('/:id', requireRole('admin'), param('id').isMongoId().withMessage('Invalid event id'), validate, remove);

module.exports = router;
