import { ApiError } from '../utils/ApiError.js';
import { logger } from '../utils/logger.js';

/**
 * Unified Zod validation middleware
 * Validates body, params, and query against provided schemas
 */
export const validateRequest = (schemas) => {
  return async (req, res, next) => {
    try {
      // Validate body if schema provided
      if (schemas.body) {
        const bodyResult = schemas.body.safeParse(req.body);
        if (!bodyResult.success) {
          const errors = bodyResult.error.issues.map((issue) => ({
            field: issue.path.join('.') || 'body',
            message: issue.message
          }));
          return next(new ApiError(400, 'Invalid request body', errors));
        }
        req.body = bodyResult.data;
      }

      // Validate params if schema provided
      if (schemas.params) {
        const paramsResult = schemas.params.safeParse(req.params);
        if (!paramsResult.success) {
          const errors = paramsResult.error.issues.map((issue) => ({
            field: issue.path.join('.') || 'params',
            message: issue.message
          }));
          return next(new ApiError(400, 'Invalid request parameters', errors));
        }
        req.params = paramsResult.data;
      }

      // Validate query if schema provided
      if (schemas.query) {
        const queryResult = schemas.query.safeParse(req.query);
        if (!queryResult.success) {
          const errors = queryResult.error.issues.map((issue) => ({
            field: issue.path.join('.') || 'query',
            message: issue.message
          }));
          return next(new ApiError(400, 'Invalid query parameters', errors));
        }
        req.query = queryResult.data;
      }

      next();
    } catch (error) {
      logger.error('Validation middleware error:', error);
      next(new ApiError(400, 'Validation error'));
    }
  };
};

export const validate = (req, res, next) => {
  // This function is no longer needed with Zod validation
  // Keeping it as a no-op to avoid breaking existing middleware chains
  next();
};