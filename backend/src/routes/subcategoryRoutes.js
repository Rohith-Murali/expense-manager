import express from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
const router = express.Router({ mergeParams: true });
import * as subcategoryController from '../controllers/subcategoryController.js';
import { authenticate } from '../middleware/auth.js';
import { validateRequest } from '../middleware/validator.js';
import * as subcategoryValidator from '../validators/subcategoryValidator.js';

router.use(authenticate);

/**
 * Create subcategory under a parent category
 * POST /account/:accountId/categories/:parentCategoryId/subcategories
 */
router.post(
  '/',
  validateRequest({ body: subcategoryValidator.createSchema }),
  asyncHandler(subcategoryController.create),
);

/**
 * Get all subcategories for a parent category
 * GET /account/:accountId/categories/:parentCategoryId/subcategories
 */
router.get('/', asyncHandler(subcategoryController.getByParent));

/**
 * Get single subcategory
 * GET /account/:accountId/categories/:parentCategoryId/subcategories/:subcategoryId
 */
router.get('/:subcategoryId', asyncHandler(subcategoryController.getById));

/**
 * Update subcategory
 * PUT /account/:accountId/categories/:parentCategoryId/subcategories/:subcategoryId
 */
router.put(
  '/:subcategoryId',
  validateRequest({ body: subcategoryValidator.updateSchema }),
  asyncHandler(subcategoryController.update),
);

/**
 * Soft delete subcategory (set isActive to false)
 * DELETE /account/:accountId/categories/:parentCategoryId/subcategories/:subcategoryId
 */
router.delete('/:subcategoryId', asyncHandler(subcategoryController.softDelete));

/**
 * Hard delete subcategory (permanent)
 * DELETE /account/:accountId/categories/:parentCategoryId/subcategories/:subcategoryId?hard=true
 */
router.delete('/:subcategoryId/hard', asyncHandler(subcategoryController.hardDelete));

/**
 * Create default "None" subcategories for all categories
 * POST /account/:accountId/subcategories/defaults
 */
router.post('/defaults/ensure', asyncHandler(subcategoryController.ensureDefaults));

export default router;
