const ApiError = require('../utils/ApiError');
const env = require('../config/env');

const errorMiddleware = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let code = err.code || 'INTERNAL_SERVER_ERROR';
  let message = err.message || 'An unexpected error occurred';
  let details = err.details || null;

  // Handle Zod validation errors
  if (err.name === 'ZodError') {
    statusCode = 400;
    code = 'VALIDATION_ERROR';
    message = 'Validation failed';
    details = err.errors.map(e => ({ field: e.path.join('.'), message: e.message }));
  }

  // Handle Mongoose schema validation errors (e.g. bad enum values)
  if (err.name === 'ValidationError' && err.errors) {
    statusCode = 400;
    code = 'VALIDATION_ERROR';
    message = 'Validation failed';
    details = Object.values(err.errors).map(e => ({
      field: e.path,
      message: e.message
    }));
  }

  // Handle Mongoose duplicate key (409)
  if (err.code === 11000) {
    statusCode = 409;
    code = 'DUPLICATE_RESOURCE';
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    message = `A resource with that ${field} already exists`;
  }

  // Handle Mongoose CastError (bad ObjectId)
  if (err.name === 'CastError') {
    statusCode = 400;
    code = 'INVALID_ID';
    message = `Invalid ID format: ${err.value}`;
  }

  // Handle Mongoose optimistic concurrency conflict (SV-M12)
  if (err.name === 'VersionError') {
    statusCode = 409;
    code = 'CONFLICT';
    message = 'Item was modified by another user. Please refresh and try again.';
    details = null;
  }

  // Log stack trace (always, for server-side visibility)
  if (statusCode === 500) {
    console.error('[SERVER ERROR]', err);
  }

  // SV-M9: production never returns internal error details to client
  if (env.NODE_ENV === 'production' && statusCode === 500) {
    message = 'An unexpected server error occurred';
    details = null;
  }

  return res.status(statusCode).json({
    success: false,
    error: {
      code,
      message,
      ...(details ? { details } : {})
    }
  });
};

module.exports = errorMiddleware;
