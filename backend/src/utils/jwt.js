import jwt from 'jsonwebtoken';
import {
  JWT_ACCESS_SECRET,
  JWT_REFRESH_SECRET,
  JWT_ACCESS_EXPIRY,
  JWT_REFRESH_EXPIRY,
} from '../config/env.js';
import { ApiError } from './ApiError.js';
import { logger } from './logger.js';

/**
 * Default token expirations (in seconds)
 * These are used if env variables aren't specified
 */
const DEFAULT_ACCESS_EXPIRY = '15m'; // 15 minutes
const DEFAULT_REFRESH_EXPIRY = '7d'; // 7 days
const MAX_REFRESH_AGE = 30 * 24 * 60 * 60; // 30 days - absolute max for refresh token

/**
 * Generate access token (short-lived)
 * @param {string} userId - User ID
 * @returns {string} JWT token
 */
const generateAccessToken = (userId) => {
  try {
    return jwt.sign({ userId }, JWT_ACCESS_SECRET, {
      expiresIn: JWT_ACCESS_EXPIRY || DEFAULT_ACCESS_EXPIRY,
      issuer: 'expense-manager',
      audience: 'expense-manager-app',
    });
  } catch (error) {
    logger.error('Error generating access token:', error);
    throw new ApiError(500, 'Failed to generate access token');
  }
};

/**
 * Generate refresh token (long-lived)
 * @param {string} userId - User ID
 * @returns {string} JWT token
 */
const generateRefreshToken = (userId) => {
  try {
    return jwt.sign({ userId, tokenType: 'refresh' }, JWT_REFRESH_SECRET, {
      expiresIn: JWT_REFRESH_EXPIRY || DEFAULT_REFRESH_EXPIRY,
      issuer: 'expense-manager',
      audience: 'expense-manager-app',
    });
  } catch (error) {
    logger.error('Error generating refresh token:', error);
    throw new ApiError(500, 'Failed to generate refresh token');
  }
};

/**
 * Verify access token
 * @param {string} token - JWT token
 * @returns {object} Decoded token
 * @throws {ApiError} If token is invalid or expired
 */
const verifyAccessToken = (token) => {
  try {
    const decoded = jwt.verify(token, JWT_ACCESS_SECRET, {
      issuer: 'expense-manager',
      audience: 'expense-manager-app',
    });

    if (decoded.tokenType === 'refresh') {
      throw new ApiError(401, 'Invalid token: refresh token cannot be used as access token');
    }

    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new ApiError(401, 'Access token has expired');
    }
    if (error instanceof jwt.JsonWebTokenError) {
      logger.debug('JWT verification failed:', error.message);
      throw new ApiError(401, 'Invalid access token');
    }
    throw error;
  }
};

/**
 * Verify refresh token
 * @param {string} token - JWT token
 * @returns {object} Decoded token
 * @throws {ApiError} If token is invalid or expired
 */
const verifyRefreshToken = (token) => {
  try {
    const decoded = jwt.verify(token, JWT_REFRESH_SECRET, {
      issuer: 'expense-manager',
      audience: 'expense-manager-app',
    });

    if (decoded.tokenType !== 'refresh') {
      throw new ApiError(401, 'Invalid token: access token cannot be used as refresh token');
    }

    const issuedAt = decoded.iat;
    const now = Math.floor(Date.now() / 1000);
    const tokenAge = now - issuedAt;

    if (tokenAge > MAX_REFRESH_AGE) {
      throw new ApiError(
        401,
        'Refresh token has expired: max refresh age exceeded. Please log in again.',
      );
    }

    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new ApiError(401, 'Refresh token has expired. Please log in again.');
    }
    if (error instanceof jwt.JsonWebTokenError) {
      logger.debug('JWT refresh verification failed:', error.message);
      throw new ApiError(401, 'Invalid refresh token');
    }
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(401, 'Token verification failed');
  }
};

/**
 * Decode token without verification (for debugging only)
 * @param {string} token - JWT token
 * @returns {object|null} Decoded token or null if invalid
 */
const decodeToken = (token) => {
  try {
    return jwt.decode(token);
  } catch {
    return null;
  }
};

export {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  decodeToken,
  MAX_REFRESH_AGE,
};
