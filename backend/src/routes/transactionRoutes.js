import express from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
const router = express.Router({ mergeParams: true });
import { authenticate } from '../middleware/auth.js';
import { validateRequest } from '../middleware/validator.js';
import * as transactionController from '../controllers/transactionController.js';
import * as transactionValidator from '../validators/transactionValidator.js';

router.use(authenticate);

// Specific routes before parameterized routes
router.post(
  '/',
  validateRequest({ body: transactionValidator.createSchema }),
  asyncHandler(transactionController.create)
);

router.get(
  '/stats',
  validateRequest({ query: transactionValidator.getStatsSchema }),
  asyncHandler(transactionController.getStats)
);

router.get(
  '/analytics/category-wise',
  validateRequest({ query: transactionValidator.getCategoryWiseAnalyticsSchema }),
  asyncHandler(transactionController.getCategoryWiseAnalytics)
);

router.get(
  '/',
  validateRequest({ query: transactionValidator.getAllSchema }),
  asyncHandler(transactionController.getAll)
);

// Parameterized routes at the end
router.get(
  '/:id',
  validateRequest({ params: transactionValidator.idParamSchema }),
  asyncHandler(transactionController.getById)
);

router.put(
  '/:id',
  validateRequest({ params: transactionValidator.idParamSchema, body: transactionValidator.updateSchema }),
  asyncHandler(transactionController.update)
);

router.delete(
  '/:id',
  validateRequest({ params: transactionValidator.idParamSchema }),
  asyncHandler(transactionController.deleteTransaction)
);

export const transactionRouter = router;