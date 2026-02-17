import { body, param, query } from 'express-validator';

const createAccountValidator = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Account name is required')
    .isLength({ min: 2, max: 50 })
    .withMessage('Account name must be between 2 and 50 characters'),
  
  body('type')
    .optional()
    .isIn(['CASH', 'BANK', 'CARD', 'WALLET', 'OTHER'])
    .withMessage('Invalid account type'),
  
  body('openingBalance')
    .notEmpty()
    .withMessage('Opening balance is required')
    .isNumeric()
    .withMessage('Opening balance must be a number'),
  
  body('currency')
    .optional()
    .isString()
    .withMessage('Currency must be a string'),
  
  body('description')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Description must not exceed 200 characters'),
  
  body('color')
    .optional()
    .matches(/^#[0-9A-Fa-f]{6}$/)
    .withMessage('Color must be a valid hex color code'),
  
  body('icon')
    .optional()
    .isString()
    .withMessage('Icon must be a string')
];

const updateAccountValidator = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Account name must be between 2 and 50 characters'),
  
  body('type')
    .optional()
    .isIn(['CASH', 'BANK', 'CARD', 'WALLET', 'OTHER'])
    .withMessage('Invalid account type'),
  
  body('description')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Description must not exceed 200 characters'),
  
  body('color')
    .optional()
    .matches(/^#[0-9A-Fa-f]{6}$/)
    .withMessage('Color must be a valid hex color code'),
  
  body('icon')
    .optional()
    .isString()
    .withMessage('Icon must be a string')
];

const accountIdValidator = [
  param('accountId')
    .isMongoId()
    .withMessage('Invalid account ID')
];

const transactionsQueryValidator = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Start date must be a valid date'),
  
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('End date must be a valid date')
];

export { createAccountValidator, updateAccountValidator, accountIdValidator, transactionsQueryValidator };