import { Router } from 'express';

import { authenticate } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { validate } from '../middleware/validator.js';

import {
  createAccount,
  getAccounts,
  getAccountById,
  updateAccount,
  deleteAccount,
  toggleArchive,
  getAccountBalance,
  getAccountTransactions,
  getAccountStats
} from '../controllers/accountController.js';

import {
  createAccountValidator,
  updateAccountValidator,
  accountIdValidator,
  transactionsQueryValidator
} from '../validators/accountValidator.js';

const router = Router();

router.use(authenticate);

router.post(
  '/',
  createAccountValidator,
  validate,
  asyncHandler(createAccount)
);

router.get(
  '/',
  asyncHandler(getAccounts)
);

router.get(
  '/:accountId',
  accountIdValidator,
  validate,
  asyncHandler(getAccountById)
);

router.put(
  '/:accountId',
  accountIdValidator,
  updateAccountValidator,
  validate,
  asyncHandler(updateAccount)
);

router.delete(
  '/:accountId',
  accountIdValidator,
  validate,
  asyncHandler(deleteAccount)
);

router.patch(
  '/:accountId/archive',
  accountIdValidator,
  validate,
  asyncHandler(toggleArchive)
);

router.get(
  '/:accountId/balance',
  accountIdValidator,
  validate,
  asyncHandler(getAccountBalance)
);

router.get(
  '/:accountId/transactions',
  accountIdValidator,
  transactionsQueryValidator,
  validate,
  asyncHandler(getAccountTransactions)
);

router.get(
  '/:accountId/stats',
  accountIdValidator,
  validate,
  asyncHandler(getAccountStats)
);

export const accountRouter = router;