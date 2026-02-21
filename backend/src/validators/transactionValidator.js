import { body, param, query } from 'express-validator';

const createTransactionValidator = [
  body('type')
    .isIn(['expense', 'income', 'transfer'])
    .withMessage('Invalid transaction type'),
  body('amount')
    .isFloat({ min: 0.01 })
    .withMessage('Amount must be greater than 0'),
  body('date')
    .optional()
    .isISO8601()
    .withMessage('Invalid date format'),
  body('categoryId')
    .if(body('type').not().equals('transfer'))
    .notEmpty()
    .withMessage('Category is required for expense/income transactions')
    .isMongoId()
    .withMessage('Invalid category ID'),
  body('paymentTypeId')
    .if(body('type').not().equals('transfer'))
    .notEmpty()
    .withMessage('Payment type is required for expense/income transactions')
    .isMongoId()
    .withMessage('Invalid payment type ID'),
  body('fromAccountId')
    .if(body('type').equals('transfer'))
    .notEmpty()
    .withMessage('From account is required for transfer transactions')
    .isMongoId()
    .withMessage('Invalid from account ID'),
  body('toAccountId')
    .if(body('type').equals('transfer'))
    .notEmpty()
    .withMessage('To account is required for transfer transactions')
    .isMongoId()
    .withMessage('Invalid to account ID')
    .custom((value, { req }) => {
      if (req.body.fromAccountId && value === req.body.fromAccountId) {
        throw new Error('From and to accounts cannot be the same');
      }
      return true;
    }),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description must be at most 500 characters'),
  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array'),
  body('tags.*')
    .optional()
    .trim()
    .isLength({ min: 1, max: 30 })
    .withMessage('Each tag must be between 1 and 30 characters'),
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Notes must be at most 1000 characters')
];

const updateTransactionValidator = [
  param('id')
    .isMongoId()
    .withMessage('Invalid transaction ID'),
  body('amount')
    .optional()
    .isFloat({ min: 0.01 })
    .withMessage('Amount must be greater than 0'),
  body('date')
    .optional()
    .isISO8601()
    .withMessage('Invalid date format'),
  body('categoryId')
    .optional()
    .custom((value) => {
      // Handle both string IDs and populated objects with _id
      const idToCheck = typeof value === 'object' && value._id ? value._id : value;
      if (!idToCheck || !/^[0-9a-fA-F]{24}$/.test(idToCheck)) {
        throw new Error('Invalid category ID');
      }
      return true;
    }),
  body('paymentTypeId')
    .optional()
    .custom((value) => {
      // Handle both string IDs and populated objects with _id
      const idToCheck = typeof value === 'object' && value._id ? value._id : value;
      if (!idToCheck || !/^[0-9a-fA-F]{24}$/.test(idToCheck)) {
        throw new Error('Invalid payment type ID');
      }
      return true;
    }),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description must be at most 500 characters'),
  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array'),
  body('tags.*')
    .optional()
    .trim()
    .isLength({ min: 1, max: 30 })
    .withMessage('Each tag must be between 1 and 30 characters'),
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Notes must be at most 1000 characters')
];

const getAllTransactionValidator = [
  query('type')
    .optional()
    .isIn(['expense', 'income', 'transfer'])
    .withMessage('Invalid transaction type'),
  query('categoryId')
    .optional()
    .isMongoId()
    .withMessage('Invalid category ID'),
  query('paymentTypeId')
    .optional()
    .isMongoId()
    .withMessage('Invalid payment type ID'),
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid start date format'),
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid end date format')
    .custom((value, { req }) => {
      if (req.query.startDate && new Date(value) < new Date(req.query.startDate)) {
        throw new Error('End date must be after start date');
      }
      return true;
    }),
  query('minAmount')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Min amount must be a positive number'),
  query('maxAmount')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Max amount must be a positive number')
    .custom((value, { req }) => {
      if (req.query.minAmount && parseFloat(value) < parseFloat(req.query.minAmount)) {
        throw new Error('Max amount must be greater than min amount');
      }
      return true;
    }),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 1000 })
    .withMessage('Limit must be between 1 and 1000'),
  query('skip')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Skip must be a non-negative integer')
];

const getByIdTransactionValidator = [
  param('id')
    .isMongoId()
    .withMessage('Invalid transaction ID')
];

const deleteTransactionValidator = [
  param('id')
    .isMongoId()
    .withMessage('Invalid transaction ID')
];

const getStatsTransactionValidator = [
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid start date format'),
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid end date format')
    .custom((value, { req }) => {
      if (req.query.startDate && new Date(value) < new Date(req.query.startDate)) {
        throw new Error('End date must be after start date');
      }
      return true;
    })
]
export {
  createTransactionValidator as create,
  updateTransactionValidator as update,
  getAllTransactionValidator as getAll,
  getByIdTransactionValidator as getById,
  deleteTransactionValidator as delete,
  getStatsTransactionValidator as getStats
};