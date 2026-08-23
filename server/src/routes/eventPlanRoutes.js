const express = require('express');
const router = express.Router();
const eventPlanController = require('../controllers/eventPlanController');
const { authMiddleware, requireRole } = require('../middleware/authMiddleware');

router.use(authMiddleware);

router.get('/', requireRole('ADMIN', 'MANAGER'), eventPlanController.getPlans);
router.post('/', requireRole('ADMIN'), eventPlanController.createPlan);
router.get('/:id', requireRole('ADMIN', 'MANAGER'), eventPlanController.getPlanById);
router.put('/:id', requireRole('ADMIN'), eventPlanController.updatePlan);
router.delete('/:id', requireRole('ADMIN'), eventPlanController.deletePlan);
router.post('/:id/items/from-library', requireRole('ADMIN'), eventPlanController.copyFromLibrary);

module.exports = router;
