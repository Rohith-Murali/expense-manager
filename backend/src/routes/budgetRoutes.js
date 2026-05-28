import express from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
const router = express.Router({ mergeParams: true });
import * as budgetController from '../controllers/budgetController.js';
import { authenticate } from '../middleware/auth.js';
import { validateRequest } from '../middleware/validator.js';
import * as budgetValidator from '../validators/budgetValidator.js';

router.use(authenticate);

router.post(
  '/',
  validateRequest({ body: budgetValidator.createSchema }),
  asyncHandler(budgetController.create)
);

router.get('/', validateRequest({ query: budgetValidator.getListSchema }), asyncHandler(budgetController.getAll));

router.get(
  '/:id',
  validateRequest({ params: budgetValidator.idParamSchema }),
  asyncHandler(budgetController.getById)
);

router.put(
  '/:id',
  validateRequest({ params: budgetValidator.idParamSchema, body: budgetValidator.updateSchema }),
  asyncHandler(budgetController.update)
);

router.delete(
  '/:id',
  validateRequest({ params: budgetValidator.idParamSchema }),
  asyncHandler(budgetController.deleteBudget)
);

export const budgetRouter = router;
