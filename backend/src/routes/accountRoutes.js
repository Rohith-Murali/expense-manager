const express = require('express');
const router = express.Router();
const accountController = require('../controllers/accountController');
const authenticate = require('../middleware/auth');
const validate = require('../middleware/validator');
const {
  createAccountValidator,
  updateAccountValidator,
  accountIdValidator,
  transactionsQueryValidator
} = require('../validators/accountValidator');

// All routes require authentication
router.use(authenticate);

// Account CRUD
router.post(
  '/',
  createAccountValidator,
  validate,
  accountController.createAccount
);

router.get(
  '/',
  accountController.getAccounts
);

router.get(
  '/:id',
  accountIdValidator,
  validate,
  accountController.getAccountById
);

router.put(
  '/:id',
  accountIdValidator,
  updateAccountValidator,
  validate,
  accountController.updateAccount
);

router.delete(
  '/:id',
  accountIdValidator,
  validate,
  accountController.deleteAccount
);

// Account operations
router.patch(
  '/:id/archive',
  accountIdValidator,
  validate,
  accountController.toggleArchive
);

router.get(
  '/:id/balance',
  accountIdValidator,
  validate,
  accountController.getAccountBalance
);

router.get(
  '/:id/transactions',
  accountIdValidator,
  transactionsQueryValidator,
  validate,
  accountController.getAccountTransactions
);

router.get(
  '/:id/stats',
  accountIdValidator,
  validate,
  accountController.getAccountStats
);

module.exports = router;