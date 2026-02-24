import { getErrorMessage as getErrorFromHandler, getFieldErrors, parseErrorResponse } from './errorHandler';

// Format currency
export const formatCurrency = (amount, currency = 'INR') => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2
  }).format(amount);
};

// Format date
export const formatDate = (date, format = 'short') => {
  const options = format === 'long' 
    ? { year: 'numeric', month: 'long', day: 'numeric' }
    : { year: 'numeric', month: 'short', day: 'numeric' };
  
  return new Intl.DateTimeFormat('en-IN', options).format(new Date(date));
};

// Format time
export const formatTime = (time) => {
  return new Date(`2000-01-01T${time}`).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
};

// Validate email
export const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Get error message from API response
 * Uses centralized error handler for consistent error format handling
 */
export const getErrorMessage = (error) => {
  // If it's a string, return as-is
  if (typeof error === 'string') return error;

  // Use centralized error handler
  return getErrorFromHandler(error);
};

/**
 * Get field errors from API response
 * Returns object with field names as keys and error messages as values
 */
export const getFieldErrorsFromResponse = (error) => {
  return getFieldErrors(error);
};

/**
 * Parse complete error response
 * Returns object with status, message, and errors array
 */
export const parseApiError = (error) => {
  return parseErrorResponse(error);
};

// Debounce function
export const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};