import express from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
const router = express.Router({ mergeParams: true });
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validator.js';
import * as paymentTypeController from '../controllers/paymentTypeController.js';
import * as paymentTypeValidator from '../validators/paymentTypeValidator.js';

router.use(authenticate);

router.post('/', paymentTypeValidator.create, validate, asyncHandler(paymentTypeController.create));
router.get('/', asyncHandler(paymentTypeController.getAll));
router.get('/:id', paymentTypeValidator.getById, validate, asyncHandler(paymentTypeController.getById));
router.put('/:id', paymentTypeValidator.update, validate, asyncHandler(paymentTypeController.update));
router.delete('/:id', paymentTypeValidator.delete, validate, asyncHandler(paymentTypeController.deletePaymentType));

export const paymentTypeRouter = router;
