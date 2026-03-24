import express from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
const router = express.Router({ mergeParams: true });
import * as categoryController from '../controllers/categoryController.js';
import { authenticate } from '../middleware/auth.js';
import { validateRequest } from '../middleware/validator.js';
import { validateObjectId } from '../middleware/objectIdValidator.js';
import * as categoryValidator from '../validators/categoryValidator.js';

router.use(authenticate);

router.post(
  '/',
  validateRequest({ body: categoryValidator.createSchema }),
  asyncHandler(categoryController.create)
);

router.post(
  '/defaults',
  validateRequest({ params: categoryValidator.seedDefaultsSchema }),
  asyncHandler(categoryController.seedDefaults)
);

router.get('/', asyncHandler(categoryController.getAll));

router.get(
  '/:id',
  validateRequest({ params: categoryValidator.getByIdSchema }),
  asyncHandler(categoryController.getById)
);

router.put(
  '/:id',
  validateRequest({ params: categoryValidator.getByIdSchema, body: categoryValidator.updateSchema }),
  asyncHandler(categoryController.update)
);

router.delete(
  '/:id',
  validateRequest({ params: categoryValidator.deleteSchema }),
  asyncHandler(categoryController.deleteCategory)
);

export const categoryRouter = router;
