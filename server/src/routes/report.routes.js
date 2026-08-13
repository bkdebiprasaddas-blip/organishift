const { Router } = require('express');
const { getEventProgress, getWorkload, getOverdue } = require('../controllers/report.controller');
const auth = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/roles.middleware');

const router = Router();
router.use(auth, requireRole('admin'));

router.get('/events', getEventProgress);
router.get('/workload', getWorkload);
router.get('/overdue', getOverdue);

module.exports = router;
