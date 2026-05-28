import { verifyAccessToken } from '../utils/jwt.js';
import { User } from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import { logger } from '../utils/logger.js';

export async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(new ApiError(401, 'Access token required'));
    }
    const token = authHeader.split(' ')[1];
    const decoded = verifyAccessToken(token);
    const user = await User.findOne({ _id: decoded.userId, isDeleted: false });
    if (!user) return next(new ApiError(401, 'User not found'));
    req.user = user;
    req.userId = user._id;
    next();
  } catch (error) {
    logger.debug('Authentication error:', error);
    return next(new ApiError(401, 'Invalid or expired token'));
  }
}
