import { validationResult } from 'express-validator';
import { ApiError } from '../utils/ApiError.js';

export const validate = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const details = errors.array().map(err => ({ field: err.path, message: err.msg }));
    return next(new ApiError(400, 'Invalid request data', details));
  }

  next();
};
