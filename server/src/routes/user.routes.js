const { Router } = require('express');
const { body, param, query } = require('express-validator');
const { list, create, update } = require('../controllers/user.controller');
const auth = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/roles.middleware');
const validate = require('../middleware/validate.middleware');
const { ROLES } = require('../utils/enums');

const router = Router();
router.use(auth, requireRole(ROLES.ADMIN));

router.get(
  '/',
  query('page').optional().isInt({ min: 1 }).withMessage('page must be a positive integer'),
  query('size').optional().isInt({ min: 1, max: 100 }).withMessage('size must be between 1 and 100'),
  validate,
  list
);

router.post(
  '/',
  body('name').trim().isLength({ min: 2, max: 60 }).withMessage('Name must be 2-60 characters'),
  body('email').isEmail().withMessage('A valid email is required'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/(?=.*[A-Za-z])(?=.*\d)/)
    .withMessage('Password must contain at least one letter and one number'),
  body('role').optional().isIn(Object.values(ROLES)).withMessage('Invalid role'),
  body('isActive').optional().isBoolean().withMessage('isActive must be a boolean'),
  validate,
  create
);

router.patch(
  '/:id',
  param('id').isMongoId().withMessage('Invalid user id'),
  body('role').optional().isIn(Object.values(ROLES)).withMessage('Invalid role'),
  body('isActive').optional().isBoolean().withMessage('isActive must be a boolean'),
  validate,
  update
);

module.exports = router;
