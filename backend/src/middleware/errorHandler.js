import { logger } from '../utils/logger.js';
import { ApiError } from '../utils/ApiError.js';

export function errorHandler(err, req, res, next) {
  logger.error('Error handler caught:', err && err.stack ? err.stack : err);

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(e => ({ field: e.path, message: e.message }));
    return res.status(400).json({ success: false, message: 'Validation error', errors });
  }

  // Duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern || {})[0];
    return res.status(400).json({ success: false, message: `${field || 'Field'} already exists` });
  }

  // JWT errors come through as ApiError or from jwt library
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ success: false, message: 'Token expired' });
  }

  // If it's our ApiError, use statusCode
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({ success: false, message: err.message, details: err.details || null });
  }

  // Generic error
  res.status(err.statusCode || 500).json({ success: false, message: err.message || 'Internal server error' });
}