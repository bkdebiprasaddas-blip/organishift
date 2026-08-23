const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authMiddleware, requireRole } = require('../middleware/authMiddleware');

router.use(authMiddleware);

// GET /api/users is Admin + Manager (S-1 fix for assignee dropdown)
router.get('/', requireRole('ADMIN', 'MANAGER'), userController.getUsers);
router.post('/', requireRole('ADMIN'), userController.createUser);
router.get('/:id', requireRole('ADMIN'), userController.getUserById);
router.put('/:id', requireRole('ADMIN'), userController.updateUser);
router.delete('/:id', requireRole('ADMIN'), userController.deleteUser);

module.exports = router;
