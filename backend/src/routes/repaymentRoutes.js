import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { validateRequest } from '../middleware/validator.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import * as repaymentController from '../controllers/repaymentController.js';
import * as repaymentValidator from '../validators/repaymentValidator.js';

const router = Router();
router.use(authenticate);

router.get('/', asyncHandler(repaymentController.list));
router.get(
  '/:id',
  validateRequest({ params: repaymentValidator.repaymentIdParamSchema }),
  asyncHandler(repaymentController.get),
);
router.put(
  '/:id',
  validateRequest({
    params: repaymentValidator.repaymentIdParamSchema,
    body: repaymentValidator.updateRepaymentSchema,
  }),
  asyncHandler(repaymentController.update),
);
router.delete(
  '/:id',
  validateRequest({ params: repaymentValidator.repaymentIdParamSchema }),
  asyncHandler(repaymentController.remove),
);
router.post(
  '/:id/receipts',
  validateRequest({
    params: repaymentValidator.repaymentIdParamSchema,
    body: repaymentValidator.createReceiptSchema,
  }),
  asyncHandler(repaymentController.createReceipt),
);
router.put(
  '/:id/receipts/:receiptId',
  validateRequest({
    params: repaymentValidator.receiptIdParamSchema,
    body: repaymentValidator.updateReceiptSchema,
  }),
  asyncHandler(repaymentController.updateReceipt),
);
router.delete(
  '/:id/receipts/:receiptId',
  validateRequest({ params: repaymentValidator.receiptIdParamSchema }),
  asyncHandler(repaymentController.reverseReceipt),
);

export const repaymentRouter = router;
