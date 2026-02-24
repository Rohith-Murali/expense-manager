import express from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
const router = express.Router({ mergeParams: true });
import { authenticate } from '../middleware/auth.js';
import { validateRequest } from '../middleware/validator.js';
import { validateObjectId } from '../middleware/objectIdValidator.js';
import * as paymentTypeController from '../controllers/paymentTypeController.js';
import * as paymentTypeValidator from '../validators/paymentTypeValidator.js';

router.use(authenticate);

router.post(
  '/',
  validateRequest({ body: paymentTypeValidator.createSchema }),
  asyncHandler(paymentTypeController.create)
);

router.get('/', asyncHandler(paymentTypeController.getAll));

router.get(
  '/:id',
  validateRequest({ params: paymentTypeValidator.getByIdSchema }),
  asyncHandler(paymentTypeController.getById)
);

router.put(
  '/:id',
  validateRequest({ params: paymentTypeValidator.getByIdSchema, body: paymentTypeValidator.updateSchema }),
  asyncHandler(paymentTypeController.update)
);

router.delete(
  '/:id',
  validateRequest({ params: paymentTypeValidator.deleteSchema }),
  asyncHandler(paymentTypeController.deletePaymentType)
);

export const paymentTypeRouter = router;
