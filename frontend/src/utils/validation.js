/**
 * Frontend Validation Schemas
 * Mirrors backend Zod schemas for consistency
 */

/**
 * Email validation
 */
export const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email) return 'Email is required';
  if (!emailRegex.test(email)) return 'Please provide a valid email address';
  return null;
};

/**
 * Password validation
 */
export const validatePassword = (password) => {
  if (!password) return 'Password is required';
  if (password.length < 6) return 'Password must be at least 6 characters long';
  if (password.length > 128) return 'Password must not exceed 128 characters';
  return null;
};

/**
 * Name validation
 */
export const validateName = (name) => {
  if (!name || !name.trim()) return 'Name is required';
  if (name.trim().length < 2) return 'Name must be at least 2 characters long';
  if (name.length > 100) return 'Name must not exceed 100 characters';
  return null;
};

/**
 * Account name validation
 */
export const validateAccountName = (name) => {
  if (!name || !name.trim()) return 'Account name is required';
  if (name.trim().length < 2) return 'Account name must be at least 2 characters long';
  if (name.length > 50) return 'Account name must not exceed 50 characters';
  return null;
};

/**
 * Amount validation
 */
export const validateAmount = (amount) => {
  if (amount === null || amount === undefined || amount === '') return 'Amount is required';
  const num = parseFloat(amount);
  if (isNaN(num)) return 'Amount must be a valid number';
  if (num <= 0) return 'Amount must be greater than 0';
  return null;
};

/**
 * Category name validation
 */
export const validateCategoryName = (name) => {
  if (!name || !name.trim()) return 'Category name is required';
  if (name.trim().length < 2) return 'Category name must be at least 2 characters long';
  if (name.length > 50) return 'Category name must not exceed 50 characters';
  return null;
};

/**
 * Payment type name validation
 */
export const validatePaymentTypeName = (name) => {
  if (!name || !name.trim()) return 'Payment type name is required';
  if (name.trim().length < 2) return 'Payment type name must be at least 2 characters long';
  if (name.length > 50) return 'Payment type name must not exceed 50 characters';
  return null;
};

/**
 * Color validation (hex)
 */
export const validateColor = (color) => {
  if (!color) return null; // Optional
  const hexRegex = /^#[0-9A-Fa-f]{6}$/;
  if (!hexRegex.test(color)) return 'Color must be a valid hex color code';
  return null;
};

/**
 * Currency validation
 */
export const validateCurrency = (currency) => {
  if (!currency) return null; // Optional, defaults to INR
  if (currency.length !== 3) return 'Currency code must be 3 characters';
  return null;
};

/**
 * Icon validation
 */
export const validateIcon = (icon) => {
  if (!icon) return null; // Optional
  if (icon.length > 50) return 'Icon must not exceed 50 characters';
  return null;
};

/**
 * Description validation
 */
export const validateDescription = (description) => {
  if (!description) return null; // Optional
  if (description.length > 200) return 'Description must not exceed 200 characters';
  return null;
};

/**
 * Transaction type validation
 * API accepts: 'expense', 'income', 'transfer'
 * Backend stores: 'expense', 'income', 'transfer-out', 'transfer-in'
 */
export const validateTransactionType = (type) => {
  if (!type) return 'Transaction type is required';
  if (!['expense', 'income', 'transfer'].includes(type)) return 'Invalid transaction type';
  return null;
};

/**
 * Category type validation
 */
export const validateCategoryType = (type) => {
  if (!type) return 'Category type is required';
  if (!['expense', 'income'].includes(type)) return 'Type must be either expense or income';
  return null;
};

/**
 * Account type validation
 */
export const validateAccountType = (type) => {
  if (!type) return null; // Optional, defaults to BANK
  if (!['CASH', 'BANK', 'CARD', 'WALLET', 'OTHER'].includes(type)) return 'Invalid account type';
  return null;
};

/**
 * Date validation
 */
export const validateDate = (date) => {
  if (!date) return 'Date is required';
  const d = new Date(date);
  if (isNaN(d.getTime())) return 'Invalid date format';
  if (d < new Date('1900-01-01')) return 'Date cannot be before 1900';
  if (d > new Date('2100-12-31')) return 'Date cannot be after 2100';
  return null;
};

/**
 * Date range validation
 */
export const validateDateRange = (startDate, endDate) => {
  if (startDate && endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (end < start) return 'End date must be after start date';
  }
  return null;
};

/**
 * Account type enum
 */
export const ACCOUNT_TYPES = ['CASH', 'BANK', 'CARD', 'WALLET', 'OTHER'];

/**
 * Transaction type enum
 */
export const TRANSACTION_TYPES = ['expense', 'income', 'transfer'];

/**
 * Category type enum
 */
export const CATEGORY_TYPES = ['expense', 'income'];

/**
 * Registration form validation
 */
export const validateRegistrationForm = (formData) => {
  const errors = {};

  const emailError = validateEmail(formData.email);
  if (emailError) errors.email = emailError;

  const passwordError = validatePassword(formData.password);
  if (passwordError) errors.password = passwordError;

  const nameError = validateName(formData.name);
  if (nameError) errors.name = nameError;

  return Object.keys(errors).length ? errors : null;
};

/**
 * Login form validation
 */
export const validateLoginForm = (formData) => {
  const errors = {};

  const emailError = validateEmail(formData.email);
  if (emailError) errors.email = emailError;

  if (!formData.password) {
    errors.password = 'Password is required';
  }

  return Object.keys(errors).length ? errors : null;
};

/**
 * Account form validation
 */
export const validateAccountForm = (formData) => {
  const errors = {};

  const nameError = validateAccountName(formData.name);
  if (nameError) errors.name = nameError;

  const typeError = validateAccountType(formData.type);
  if (typeError) errors.type = typeError;

  const amountError = validateAmount(formData.openingBalance);
  if (amountError) errors.openingBalance = amountError;

  const currencyError = validateCurrency(formData.currency);
  if (currencyError) errors.currency = currencyError;

  const descriptionError = validateDescription(formData.description);
  if (descriptionError) errors.description = descriptionError;

  const colorError = validateColor(formData.color);
  if (colorError) errors.color = colorError;

  const iconError = validateIcon(formData.icon);
  if (iconError) errors.icon = iconError;

  return Object.keys(errors).length ? errors : null;
};

/**
 * Category form validation
 */
export const validateCategoryForm = (formData) => {
  const errors = {};

  const nameError = validateCategoryName(formData.name);
  if (nameError) errors.name = nameError;

  const typeError = validateCategoryType(formData.type);
  if (typeError) errors.type = typeError;

  const colorError = validateColor(formData.color);
  if (colorError) errors.color = colorError;

  const iconError = validateIcon(formData.icon);
  if (iconError) errors.icon = iconError;

  return Object.keys(errors).length ? errors : null;
};

/**
 * Payment type form validation
 */
export const validatePaymentTypeForm = (formData) => {
  const errors = {};

  const nameError = validatePaymentTypeName(formData.name);
  if (nameError) errors.name = nameError;

  const typeError = validateCategoryType(formData.type); // Same as category
  if (typeError) errors.type = typeError;

  const iconError = validateIcon(formData.icon);
  if (iconError) errors.icon = iconError;

  return Object.keys(errors).length ? errors : null;
};

/**
 * Transaction form validation
 */
export const validateTransactionForm = (formData) => {
  const errors = {};

  const typeError = validateTransactionType(formData.type);
  if (typeError) errors.type = typeError;

  const amountError = validateAmount(formData.amount);
  if (amountError) errors.amount = amountError;

  const dateError = validateDate(formData.date || new Date());
  if (dateError) errors.date = dateError;

  // For non-transfer transactions
  if (formData.type !== 'transfer') {
    if (!formData.categoryId) {
      errors.categoryId = 'Category is required for expense/income transactions';
    }
    if (!formData.paymentTypeId) {
      errors.paymentTypeId = 'Payment type is required for expense/income transactions';
    }
  }

  // For transfer transactions (only need toAccountId, from is the current account from route)
  if (formData.type === 'transfer') {
    if (!formData.toAccountId) {
      errors.toAccountId = 'Destination account is required for transfer transactions';
    }
  }

  return Object.keys(errors).length ? errors : null;
};
