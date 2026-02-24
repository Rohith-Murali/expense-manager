import { logger } from '../utils/logger.js';
import { ApiError } from '../utils/ApiError.js';

export function errorHandler(err, req, res, next) {
  logger.error('Error handler caught:', err && err.stack ? err.stack : err);

  // Mongoose validation error (400)
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(e => ({ field: e.path, message: e.message }));
    return res.status(400).json({ success: false, message: 'Validation error', errors });
  }

  // Duplicate key error - return 409 Conflict per HTTP standards
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern || {})[0];
    const message = `${field || 'Field'} already exists`;
    return res.status(409).json({ 
      success: false, 
      message, 
      errors: [{ field: field || 'database', message }]
    });
  }

  // JWT token expired (401)
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ 
      success: false, 
      message: 'Token has expired. Please refresh your token or log in again' 
    });
  }

  // JWT invalid/malformed token (401)
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ 
      success: false, 
      message: 'Invalid or malformed token' 
    });
  }

  // Our custom ApiError
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({ 
      success: false, 
      message: err.message, 
      errors: err.details || null 
    });
  }

  // Cast error (invalid ObjectId format)
  if (err.name === 'CastError') {
    return res.status(400).json({ 
      success: false, 
      message: 'Invalid ID format',
      errors: [{ field: 'id', message: 'Invalid MongoDB ObjectId format' }]
    });
  }

  // Generic error fallback
  res.status(err.statusCode || 500).json({ 
    success: false, 
    message: err.message || 'Internal server error' 
  });
}