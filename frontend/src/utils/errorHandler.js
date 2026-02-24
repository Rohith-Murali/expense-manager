/**
 * Error Handling Utilities
 * Handles all error response formats from backend
 */

import { logger } from './logger';

/**
 * Parse error response from backend
 * Handles new Zod validation format and standard error format
 */
export const parseErrorResponse = (error) => {
  const errorObj = {
    status: error.response?.status || 500,
    message: 'An error occurred',
    errors: [],
    raw: error
  };

  // Handle validation errors (400) with detailed field info
  if (error.response?.status === 400) {
    const data = error.response.data;
    errorObj.message = data?.message || 'Validation error';
    errorObj.errors = data?.errors || [];
    return errorObj;
  }

  // Handle duplicate key errors (409 Conflict)
  if (error.response?.status === 409) {
    const data = error.response.data;
    errorObj.message = data?.message || 'This resource already exists';
    errorObj.errors = data?.errors || [
      { field: 'general', message: data?.message }
    ];
    return errorObj;
  }

  // Handle authorization errors (403 Forbidden)
  if (error.response?.status === 403) {
    const data = error.response.data;
    errorObj.message = data?.message || 'You do not have permission to access this resource';
    errorObj.errors = data?.errors || [];
    return errorObj;
  }

  // Handle authentication errors (401 Unauthorized)
  if (error.response?.status === 401) {
    const data = error.response.data;
    errorObj.message = data?.message || 'Your session has expired. Please log in again.';
    errorObj.errors = data?.errors || [];
    return errorObj;
  }

  // Handle not found errors (404)
  if (error.response?.status === 404) {
    const data = error.response.data;
    errorObj.message = data?.message || 'Resource not found';
    errorObj.errors = data?.errors || [];
    return errorObj;
  }

  // Handle server errors (500+)
  if (error.response?.status >= 500) {
    const data = error.response.data;
    errorObj.message = data?.message || 'Server error. Please try again later.';
    return errorObj;
  }

  // Network error or timeout
  if (!error.response) {
    if (error.code === 'ECONNABORTED') {
      errorObj.message = 'Request timeout. Please check your connection.';
    } else if (error.message === 'Network Error') {
      errorObj.message = 'Network error. Please check your internet connection.';
    } else {
      errorObj.message = error.message || 'An error occurred';
    }
    return errorObj;
  }

  // Fallback
  errorObj.message = error.response?.data?.message || error.message || 'An error occurred';
  return errorObj;
};

/**
 * Get error message for a specific field
 */
export const getFieldError = (errors, fieldName) => {
  if (!errors || !Array.isArray(errors)) return null;
  const fieldError = errors.find(e => e.field === fieldName);
  return fieldError ? fieldError.message : null;
};

/**
 * Get all error messages as a single string
 */
export const getErrorMessage = (error) => {
  if (typeof error === 'string') return error;

  const parsed = parseErrorResponse(error);

  if (parsed.errors && parsed.errors.length > 0) {
    return parsed.errors.map(e => e.message).join('; ');
  }

  return parsed.message;
};

/**
 * Get all field errors as an object
 */
export const getFieldErrors = (error) => {
  if (!error.response?.data?.errors) return {};

  const errors = error.response.data.errors;
  const fieldErrors = {};

  errors.forEach(err => {
    if (err.field) {
      fieldErrors[err.field] = err.message;
    }
  });

  return fieldErrors;
};

/**
 * Check if error is validation error (400)
 */
export const isValidationError = (error) => {
  return error.response?.status === 400;
};

/**
 * Check if error is authentication error (401)
 */
export const isAuthenticationError = (error) => {
  return error.response?.status === 401;
};

/**
 * Check if error is authorization error (403)
 */
export const isAuthorizationError = (error) => {
  return error.response?.status === 403;
};

/**
 * Check if error is duplicate key error (409)
 */
export const isDuplicateError = (error) => {
  return error.response?.status === 409;
};

/**
 * Check if error is not found error (404)
 */
export const isNotFoundError = (error) => {
  return error.response?.status === 404;
};

/**
 * Check if error is server error (500+)
 */
export const isServerError = (error) => {
  return error.response?.status >= 500;
};

/**
 * Check if error is network error
 */
export const isNetworkError = (error) => {
  return !error.response;
};

/**
 * Handle API error and log it
 */
export const handleApiError = (error, context = '') => {
  const parsed = parseErrorResponse(error);

  logger.error(`API Error [${context}]:`, {
    status: parsed.status,
    message: parsed.message,
    errors: parsed.errors,
    originalError: error.message
  });

  return parsed;
};

/**
 * Create user-friendly error message based on error type
 */
export const getUserFriendlyMessage = (error) => {
  if (isAuthenticationError(error)) {
    return 'Your session has expired. Please log in again.';
  }

  if (isAuthorizationError(error)) {
    return 'You do not have permission to perform this action.';
  }

  if (isDuplicateError(error)) {
    return 'This resource already exists. Please use a different value.';
  }

  if (isNotFoundError(error)) {
    return 'The requested resource was not found.';
  }

  if (isServerError(error)) {
    return 'A server error occurred. Please try again later.';
  }

  if (isNetworkError(error)) {
    return 'Network error. Please check your internet connection.';
  }

  return getErrorMessage(error);
};

/**
 * Merge validation errors from response with existing form errors
 */
export const mergeValidationErrors = (existingErrors = {}, apiErrors = []) => {
  const merged = { ...existingErrors };

  if (Array.isArray(apiErrors)) {
    apiErrors.forEach(err => {
      if (err.field) {
        merged[err.field] = err.message;
      }
    });
  }

  return merged;
};

/**
 * Clear error for a specific field
 */
export const clearFieldError = (errors, fieldName) => {
  const newErrors = { ...errors };
  delete newErrors[fieldName];
  return newErrors;
};

/**
 * Check if there are any errors
 */
export const hasErrors = (errors) => {
  if (!errors) return false;
  if (Array.isArray(errors)) return errors.length > 0;
  return Object.keys(errors).length > 0;
};

/**
 * Create error object from API response
 */
export const createErrorFromResponse = (response) => {
  const error = new Error(response.message || 'Unknown error');
  error.response = {
    data: response,
    status: response.status || 400
  };
  return error;
};
