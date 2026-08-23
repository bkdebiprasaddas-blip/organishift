const express = require('express');
const cors = require('cors');
const env = require('./config/env');
const connectDB = require('./config/db');
const errorMiddleware = require('./middleware/errorMiddleware');
const ApiError = require('./utils/ApiError');

// Import Routes
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const planningRoutes = require('./routes/planningRoutes');
const eventPlanRoutes = require('./routes/eventPlanRoutes');
const eventRoutes = require('./routes/eventRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');

const app = express();

// Middleware
app.use(express.json());
app.use(
  cors({
    origin: env.CLIENT_ORIGIN,
    credentials: false
  })
);

// Health Check Endpoint (T-002)
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      db: true
    }
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/planning-items', planningRoutes);
app.use('/api/event-plans', eventPlanRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/event-items', eventRoutes); // Alternate mount for PUT/DELETE /api/event-items/:id
app.use('/api/dashboard', dashboardRoutes);

// 404 Handler
app.use((req, res, next) => {
  next(new ApiError(404, 'NOT_FOUND', `Cannot ${req.method} ${req.originalUrl}`));
});

// Error Middleware (Must be last)
app.use(errorMiddleware);

// Start server if not required in tests
if (require.main === module) {
  connectDB().then(() => {
    app.listen(env.PORT, () => {
      console.log(`OrganiShift API Server running on port ${env.PORT} in ${env.NODE_ENV} mode`);
    });
  });
}

module.exports = app;
