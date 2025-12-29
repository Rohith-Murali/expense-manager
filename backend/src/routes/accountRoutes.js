import express from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
const router = express.Router();
import * as accountController from '../controllers/accountController.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validator.js';
import {
  createAccountValidator,
  updateAccountValidator,
  accountIdValidator,
  transactionsQueryValidator
} from '../validators/accountValidator.js';

router.use(authenticate);

router.post('/', createAccountValidator, validate, asyncHandler(accountController.createAccount));
router.get('/', asyncHandler(accountController.getAccounts));
router.get('/:id', accountIdValidator, validate, asyncHandler(accountController.getAccountById));
router.put('/:id', accountIdValidator, updateAccountValidator, validate, asyncHandler(accountController.updateAccount));
router.delete('/:id', accountIdValidator, validate, asyncHandler(accountController.deleteAccount));

router.patch('/:id/archive', accountIdValidator, validate, asyncHandler(accountController.toggleArchive));
router.get('/:id/balance', accountIdValidator, validate, asyncHandler(accountController.getAccountBalance));
router.get('/:id/transactions', accountIdValidator, transactionsQueryValidator, validate, asyncHandler(accountController.getAccountTransactions));
router.get('/:id/stats', accountIdValidator, validate, asyncHandler(accountController.getAccountStats));

export const accountRouter = router;