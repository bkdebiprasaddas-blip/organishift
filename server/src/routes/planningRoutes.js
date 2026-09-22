const express = require('express');
const router = express.Router();
const planningController = require('../controllers/planningController');
const { authMiddleware, requireRole } = require('../middleware/authMiddleware');

router.use(authMiddleware);

router.get('/', requireRole('ADMIN', 'MANAGER'), planningController.getItems);
router.post('/', requireRole('ADMIN'), planningController.createItem);
router.get('/:id', requireRole('ADMIN', 'MANAGER'), planningController.getItemById);
router.put('/:id', requireRole('ADMIN'), planningController.updateItem);
router.put('/:id/move', requireRole('ADMIN'), planningController.moveItem);
router.delete('/:id', requireRole('ADMIN'), planningController.deleteItem);

module.exports = router;
