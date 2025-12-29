import express from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
const router = express.Router({ mergeParams: true });
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validator.js';
import * as transactionController from '../controllers/transactionController.js';
import * as transactionValidator from '../validators/transactionValidator.js';

router.use(authenticate);

router.post('/', transactionValidator.create, validate, asyncHandler(transactionController.create));
router.get('/', transactionValidator.getAll, validate, asyncHandler(transactionController.getAll));
router.get('/stats', transactionValidator.getStats, validate, asyncHandler(transactionController.getStats));
router.get('/:id', transactionValidator.getById, validate, asyncHandler(transactionController.getById));
router.put('/:id', transactionValidator.update, validate, asyncHandler(transactionController.update));
router.delete('/:id', transactionValidator.delete, validate, asyncHandler(transactionController.deleteTransaction));

export const transactionRouter = router;