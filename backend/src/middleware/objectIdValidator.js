import mongoose from 'mongoose';
import { ApiError } from '../utils/ApiError.js';

/**
 * Middleware to validate MongoDB ObjectIds in routes
 * Provides consistent validation and error handling for ID parameters
 */

/**
 * Validates a single ObjectId parameter
 * @param {string} paramName - Name of the parameter to validate
 * @returns {function} Express middleware
 */
export const validateObjectId = (paramName = 'id') => {
  return (req, res, next) => {
    const id = req.params[paramName];

    if (!id) {
      return next(new ApiError(400, 'ID parameter is required'));
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return next(
        new ApiError(400, 'Invalid ID format', [
          {
            field: paramName,
            message: 'Invalid MongoDB ObjectId format',
          },
        ]),
      );
    }

    next();
  };
};

/**
 * Validates multiple ObjectId parameters
 * @param {string[]} paramNames - Array of parameter names to validate
 * @returns {function} Express middleware
 */
export const validateObjectIds = (paramNames = []) => {
  return (req, res, next) => {
    const errors = [];

    for (const paramName of paramNames) {
      const id = req.params[paramName];

      if (!id) {
        errors.push({
          field: paramName,
          message: `${paramName} parameter is required`,
        });
        continue;
      }

      if (!mongoose.Types.ObjectId.isValid(id)) {
        errors.push({
          field: paramName,
          message: 'Invalid MongoDB ObjectId format',
        });
      }
    }

    if (errors.length > 0) {
      return next(new ApiError(400, 'Invalid ID format(s)', errors));
    }

    next();
  };
};

/**
 * Express-compatible middleware factory
 * Usage: app.use(requireObjectId('userId'))
 */
export const requireObjectId = (paramName = 'id') => {
  return validateObjectId(paramName);
};
