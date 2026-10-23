import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import * as dataTransferController from '../controllers/dataTransferController.js';

const router = express.Router();

router.use(authenticate);
router.get('/transactions.csv', asyncHandler(dataTransferController.exportTransactions));
router.get('/backup.json', asyncHandler(dataTransferController.exportFinancialBackup));

export const dataTransferRouter = router;
