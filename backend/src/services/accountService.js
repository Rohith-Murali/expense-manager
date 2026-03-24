import mongoose from 'mongoose';
import { Account } from '../models/Account.js';
import { Transaction } from '../models/Transaction.js';
import { ApiError } from '../utils/ApiError.js';
import { ensureDefaultCategories } from './categoryService.js';
import { ensureDefaultPaymentTypes } from './paymentTypeService.js';

/**
 * Helpers
 */
const toObjectId = (id) => new mongoose.Types.ObjectId(id);

/**
 * Update account balance based on transactions.
 *
 * Amounts are stored as positive values. Balance is computed as:
 * Balance = openingBalance
 *   + income
 *   + transfer-in
 *   - expense
 *   - transfer-out
 */
export async function updateAccountBalance(accountId) {
  const [result] = await Transaction.aggregate([
    {
      $match: {
        accountId: toObjectId(accountId)
      }
    },
    {
      $group: {
        _id: null,
        income: {
          $sum: {
            $cond: [{ $eq: ['$type', 'income'] }, { $abs: '$amount' }, 0]
          }
        },
        expense: {
          $sum: {
            $cond: [{ $eq: ['$type', 'expense'] }, { $abs: '$amount' }, 0]
          }
        },
        transferOut: {
          $sum: {
            $cond: [{ $eq: ['$type', 'transfer-out'] }, { $abs: '$amount' }, 0]
          }
        },
        transferIn: {
          $sum: {
            $cond: [{ $eq: ['$type', 'transfer-in'] }, { $abs: '$amount' }, 0]
          }
        }
      }
    }
  ]);

  const account = await Account.findById(accountId);
  if (!account) {
    throw new ApiError(404, 'ACCOUNT_NOT_FOUND');
  }

  const openingBalance = account.openingBalance || 0;
  const income = result?.income || 0;
  const expense = result?.expense || 0;
  const transferOut = result?.transferOut || 0;
  const transferIn = result?.transferIn || 0;

  const totalTransactions = income + transferIn - expense - transferOut;
  const newBalance = openingBalance + totalTransactions;

  account.currentBalance = newBalance;
  await account.save();

  return newBalance;
}

async function assertAccountOwnership(accountId, userId) {
  const exists = await Account.exists({
    _id: accountId,
    userId,
    isDeleted: false
  });

  if (!exists) {
    throw new ApiError(404, 'ACCOUNT_NOT_FOUND');
  }
}

/**
 * Create account
 */
export async function createAccount(userId, data) {
  const account = await Account.create({
    userId,
    ...data
  });

  await ensureDefaultCategories(userId, account._id);
  await ensureDefaultPaymentTypes(userId, account._id);

  return account.toObject();
}

/**
 * Get all user accounts
 */
export async function getUserAccounts(userId, includeArchived = false) {
  const query = {
    userId,
    isDeleted: false
  };

  if (!includeArchived) {
    query.isArchived = false;
  }

  const accounts = await Account.find(query)
    .sort({ createdAt: -1 })
    .lean();

  return accounts;
}

/**
 * Get account by ID
 */
export async function getAccountById(accountId, userId) {
  const account = await Account.findOne({
    _id: accountId,
    userId,
    isDeleted: false
  }).lean();

  if (!account) {
    throw new ApiError(404, 'ACCOUNT_NOT_FOUND');
  }

  return account;
}

/**
 * Update account
 */
export async function updateAccount(accountId, userId, updates) {
  // Remove protected fields from updates (cannot be modified directly)
  const { userId: _, isDeleted, isArchived, openingBalance, currentBalance, ...allowed } = updates;

  const account = await Account.findOneAndUpdate(
    { _id: accountId, userId, isDeleted: false },
    { $set: allowed },
    { new: true, runValidators: true }
  ).lean();

  if (!account) {
    throw new ApiError(404, 'ACCOUNT_NOT_FOUND');
  }

  return account;
}

/**
 * Toggle archive
 */
export async function toggleArchiveAccount(accountId, userId) {
  const account = await Account.findOne({
    _id: accountId,
    userId,
    isDeleted: false
  });

  if (!account) {
    throw new ApiError(404, 'ACCOUNT_NOT_FOUND');
  }

  account.isArchived = !account.isArchived;
  await account.save();

  return account.toObject();
}

/**
 * Delete account (soft delete)
 */
export async function deleteAccount(accountId, userId) {
  await assertAccountOwnership(accountId, userId);

  const txCount = await Transaction.countDocuments({
    $or: [
      { accountId },
      { fromAccountId: accountId },
      { toAccountId: accountId }
    ]
  });

  if (txCount > 0) {
    throw new ApiError(409, 'ACCOUNT_HAS_TRANSACTIONS');
  }

  await Account.updateOne(
    { _id: accountId, userId },
    { $set: { isDeleted: true } }
  );
}

/**
 * Calculate account balance (explicit call only)
 */
export async function calculateAccountBalance(accountId, userId) {
  await assertAccountOwnership(accountId, userId);

  const [result] = await Transaction.aggregate([
    {
      $match: {
        accountId: toObjectId(accountId)
      }
    },
    {
      $group: {
        _id: null,
        income: {
          $sum: {
            $cond: [{ $eq: ['$type', 'income'] }, { $abs: '$amount' }, 0]
          }
        },
        expense: {
          $sum: {
            $cond: [{ $eq: ['$type', 'expense'] }, { $abs: '$amount' }, 0]
          }
        },
        transferOut: {
          $sum: {
            $cond: [
              { $eq: ['$type', 'transfer-out'] },
              { $abs: '$amount' },
              0
            ]
          }
        },
        transferIn: {
          $sum: {
            $cond: [
              { $eq: ['$type', 'transfer-in'] },
              { $abs: '$amount' },
              0
            ]
          }
        }
      }
    }
  ]);

  const opening = await Account.findById(accountId).select('openingBalance').lean();

  const openingBalance = opening?.openingBalance || 0;

  return (
    openingBalance +
    (result?.income || 0) +
    (result?.transferIn || 0) -
    (result?.expense || 0) -
    (result?.transferOut || 0)
  );
}

/**
 * Get current balance (from stored value)
 */
export async function getCurrentBalance(accountId, userId) {
  await assertAccountOwnership(accountId, userId);

  const account = await Account.findById(accountId).select('currentBalance').lean();

  if (!account) {
    throw new ApiError(404, 'ACCOUNT_NOT_FOUND');
  }

  return account.currentBalance;
}

/**
 * Get account transactions (correct pagination)
 */
export async function getAccountTransactions(accountId, userId, options) {
  await assertAccountOwnership(accountId, userId);

  const {
    page = 1,
    limit = 50,
    startDate,
    endDate
  } = options;

  const match = {
    $or: [
      { accountId: toObjectId(accountId) },
      { fromAccountId: toObjectId(accountId) },
      { toAccountId: toObjectId(accountId) }
    ]
  };

  if (startDate || endDate) {
    match.date = {};
    if (startDate) match.date.$gte = new Date(startDate);
    if (endDate) match.date.$lte = new Date(endDate);
  }

  const pipeline = [
    { $match: match },
    { $sort: { date: -1, createdAt: -1 } },
    {
      $facet: {
        items: [
          { $skip: (page - 1) * limit },
          { $limit: limit }
        ],
        total: [
          { $count: 'count' }
        ]
      }
    }
  ];

  const [result] = await Transaction.aggregate(pipeline);

  return {
    transactions: result.items,
    total: result.total[0]?.count || 0
  };
}

/**
 * Account statistics
 */
export async function getAccountStats(accountId, userId) {
  await assertAccountOwnership(accountId, userId);

  const [stats] = await Transaction.aggregate([
    {
      $match: {
        accountId: toObjectId(accountId),
        type: { $in: ['income', 'expense'] }
      }
    },
    {
      $group: {
        _id: '$type',
        total: { $sum: '$amount' },
        count: { $sum: 1 }
      }
    }
  ]);

  const income = stats?.find(s => s._id === 'income') || { total: 0, count: 0 };
  const expense = stats?.find(s => s._id === 'expense') || { total: 0, count: 0 };

  return {
    totalIncome: income.total,
    totalExpense: expense.total,
    netChange: income.total - expense.total,
    incomeCount: income.count,
    expenseCount: expense.count,
    totalTransactions: income.count + expense.count
  };
}
