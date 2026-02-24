import { Router } from 'express';

import { authenticate } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { validateRequest } from '../middleware/validator.js';
import { validateObjectId } from '../middleware/objectIdValidator.js';

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
  createAccountSchema,
  updateAccountSchema,
  accountIdParamSchema,
  accountTransactionsQuerySchema
} from '../validators/accountValidator.js';

const router = Router();

router.use(authenticate);

router.post(
  '/',
  validateRequest({ body: createAccountSchema }),
  asyncHandler(createAccount)
);

router.get(
  '/',
  asyncHandler(getAccounts)
);

router.get(
  '/:accountId',
  validateRequest({ params: accountIdParamSchema }),
  asyncHandler(getAccountById)
);

router.put(
  '/:accountId',
  validateRequest({ params: accountIdParamSchema, body: updateAccountSchema }),
  asyncHandler(updateAccount)
);

router.delete(
  '/:accountId',
  validateRequest({ params: accountIdParamSchema }),
  asyncHandler(deleteAccount)
);

router.patch(
  '/:accountId/archive',
  validateRequest({ params: accountIdParamSchema }),
  asyncHandler(toggleArchive)
);

router.get(
  '/:accountId/balance',
  validateRequest({ params: accountIdParamSchema }),
  asyncHandler(getAccountBalance)
);

router.get(
  '/:accountId/transactions',
  validateRequest({ params: accountIdParamSchema, query: accountTransactionsQuerySchema }),
  asyncHandler(getAccountTransactions)
);

router.get(
  '/:accountId/stats',
  validateRequest({ params: accountIdParamSchema }),
  asyncHandler(getAccountStats)
);

export const accountRouter = router;