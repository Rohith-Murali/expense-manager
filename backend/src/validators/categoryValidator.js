import { body, param } from 'express-validator';

const createCategoryValidator =  [
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
      .withMessage('Icon must be at most 10 characters'),
    body('color')
      .optional()
      .trim()
      .matches(/^#[0-9A-Fa-f]{6}$/)
      .withMessage('Color must be a valid hex color code')
  ];

  const updateCategoryValidator =  [
    param('id')
      .isMongoId()
      .withMessage('Invalid category ID'),
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
    body('color')
      .optional()
      .trim()
      .matches(/^#[0-9A-Fa-f]{6}$/)
      .withMessage('Color must be a valid hex color code'),
    body('isActive')
      .optional()
      .isBoolean()
      .withMessage('isActive must be a boolean')
  ];

const accountIdValidator = [
    param('id')
      .isMongoId()
      .withMessage('Invalid category ID')
  ];

  const deleteCategoryValidator = [
    param('id')
      .isMongoId()
      .withMessage('Invalid category ID')
  ];


export {
  createCategoryValidator as create,
  updateCategoryValidator as update,
  accountIdValidator as getById,
  deleteCategoryValidator as delete
};