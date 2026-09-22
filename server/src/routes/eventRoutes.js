const express = require('express');
const router = express.Router();
const eventController = require('../controllers/eventController');
const { authMiddleware, requireRole } = require('../middleware/authMiddleware');

router.use(authMiddleware);

router.get('/', eventController.getEvents);
router.post('/', requireRole('ADMIN', 'MANAGER'), eventController.createEvent);
router.get('/:id', eventController.getEventById);
router.put('/:id', requireRole('ADMIN', 'MANAGER'), eventController.updateEvent);
router.delete('/:id', requireRole('ADMIN'), eventController.deleteEvent);
router.get('/:id/progress', eventController.getEventProgress);

// Execution items under an event
router.post('/:eventId/items', requireRole('ADMIN', 'MANAGER'), eventController.addExecutionItem);

// Direct execution item operations
router.put('/items/:id', eventController.updateExecutionItem);
router.delete('/items/:id', requireRole('ADMIN', 'MANAGER'), eventController.deleteExecutionItem);

module.exports = router;
