const { Router } = require('express');
const authRoutes = require('./auth.routes');
const userRoutes = require('./user.routes');
const eventRoutes = require('./event.routes');
const { eventsTasksRouter, tasksRouter } = require('./task.routes');
const reportRoutes = require('./report.routes');

const router = Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/events', eventRoutes);
router.use('/events', eventsTasksRouter);
router.use('/tasks', tasksRouter);
router.use('/reports', reportRoutes);

module.exports = router;
