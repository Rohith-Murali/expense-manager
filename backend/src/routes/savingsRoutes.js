import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { validateRequest } from '../middleware/validator.js';
import * as savingsValidator from '../validators/savingsValidator.js';
import * as savingsController from '../controllers/savingsController.js';

const router = Router();

router.use(authenticate);

router.get('/', asyncHandler(savingsController.getSavingsSummary));
router.get('/summary', asyncHandler(savingsController.getSavingsSummary));

router.post(
  '/buckets',
  validateRequest({ body: savingsValidator.bucketCreateSchema }),
  asyncHandler(savingsController.createBucket),
);
router.get(
  '/buckets',
  validateRequest({ query: savingsValidator.listQuerySchema }),
  asyncHandler(savingsController.listBuckets),
);
router.get(
  '/buckets/:bucketId',
  validateRequest({ params: savingsValidator.bucketParamSchema }),
  asyncHandler(savingsController.getBucket),
);
router.put(
  '/buckets/:bucketId',
  validateRequest({ params: savingsValidator.bucketParamSchema, body: savingsValidator.bucketUpdateSchema }),
  asyncHandler(savingsController.updateBucket),
);
router.patch(
  '/buckets/:bucketId/archive',
  validateRequest({ params: savingsValidator.bucketParamSchema }),
  asyncHandler(savingsController.archiveBucket),
);
router.delete(
  '/buckets/:bucketId',
  validateRequest({ params: savingsValidator.bucketParamSchema }),
  asyncHandler(savingsController.deleteBucket),
);

router.post(
  '/goals',
  validateRequest({ body: savingsValidator.goalCreateSchema }),
  asyncHandler(savingsController.createGoal),
);
router.get(
  '/goals',
  validateRequest({ query: savingsValidator.listQuerySchema }),
  asyncHandler(savingsController.listGoals),
);
router.get(
  '/goals/:goalId',
  validateRequest({ params: savingsValidator.goalParamSchema }),
  asyncHandler(savingsController.getGoal),
);
router.put(
  '/goals/:goalId',
  validateRequest({ params: savingsValidator.goalParamSchema, body: savingsValidator.goalUpdateSchema }),
  asyncHandler(savingsController.updateGoal),
);
router.patch(
  '/goals/:goalId/archive',
  validateRequest({ params: savingsValidator.goalParamSchema }),
  asyncHandler(savingsController.archiveGoal),
);
router.delete(
  '/goals/:goalId',
  validateRequest({ params: savingsValidator.goalParamSchema }),
  asyncHandler(savingsController.deleteGoal),
);

router.post(
  '/entries',
  validateRequest({ body: savingsValidator.entryCreateSchema }),
  asyncHandler(savingsController.createEntry),
);
router.get(
  '/entries',
  validateRequest({ query: savingsValidator.listQuerySchema }),
  asyncHandler(savingsController.listEntries),
);
router.get(
  '/entries/:entryId',
  validateRequest({ params: savingsValidator.entryParamSchema }),
  asyncHandler(savingsController.getEntry),
);
router.put(
  '/entries/:entryId',
  validateRequest({ params: savingsValidator.entryParamSchema, body: savingsValidator.entryUpdateSchema }),
  asyncHandler(savingsController.updateEntry),
);
router.delete(
  '/entries/:entryId',
  validateRequest({ params: savingsValidator.entryParamSchema }),
  asyncHandler(savingsController.deleteEntry),
);

export const savingsRouter = router;
