import { body, param } from 'express-validator';

const createPaymentTypeValidator = [
    body('name')
      .trim()
      .notEmpty()
      .withMessage('Name is required')
      .isLength({ min: 2, max: 50 })
      .withMessage('Name must be between 2 and 50 characters'),
    body('type')
      .isIn(['expense', 'income'])
      .withMessage('Type must be either expense or income'),
    body('icon')
      .optional()
      .trim()
      .isLength({ max: 10 })
      .withMessage('Icon must be at most 10 characters')
  ];

  const updatePaymentTypeValidator = [
    param('id')
      .isMongoId()
      .withMessage('Invalid payment type ID'),
    body('name')
      .optional()
      .trim()
      .notEmpty()
      .withMessage('Name cannot be empty')
      .isLength({ min: 2, max: 50 })
      .withMessage('Name must be between 2 and 50 characters'),
    body('icon')
      .optional()
      .trim()
      .isLength({ max: 10 })
      .withMessage('Icon must be at most 10 characters'),
    body('isActive')
      .optional()
      .isBoolean()
      .withMessage('isActive must be a boolean')
  ];

  const getByIdPaymentTypeValidator = [
    param('id')
      .isMongoId()
      .withMessage('Invalid payment type ID')
  ];

    const deletePaymentTypeValidator = [
    param('id')
      .isMongoId()
      .withMessage('Invalid payment type ID')
  ];

export {
  createPaymentTypeValidator as create,
  updatePaymentTypeValidator as update,
  getByIdPaymentTypeValidator as getById,
  deletePaymentTypeValidator as delete
};