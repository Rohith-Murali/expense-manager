import mongoose from 'mongoose';
import { Transaction } from '../models/Transaction.js';
import { Category } from '../models/Category.js';
import { PaymentType } from '../models/PaymentType.js';
import { Account } from '../models/Account.js';
import { updateAccountBalance } from './accountService.js';
import { ApiError } from '../utils/ApiError.js';

/**
 * Verify that user owns the account
 */
async function assertAccountOwnership(accountId, userId) {
  const account = await Account.findOne({
    _id: accountId,
    userId,
    isDeleted: false
  });

  if (!account) {
    throw new ApiError(403, 'Access denied: Account not found or does not belong to you');
  }

  return account;
}

/**
 * Verify that user owns both accounts (for transfers)
 */
async function assertAccountsOwnership(fromAccountId, toAccountId, userId) {
  const accounts = await Account.find({
    _id: { $in: [fromAccountId, toAccountId] },
    userId,
    isDeleted: false
  });

  if (accounts.length !== 2) {
    throw new ApiError(403, 'Access denied: One or both accounts do not belong to you or do not exist');
  }

  return accounts;
}

/**
 * Verify that category belongs to the account
 */
async function assertCategoryBelongsToAccount(categoryId, accountId) {
  const category = await Category.findOne({
    _id: categoryId,
    accountId,
    isActive: true
  });

  if (!category) {
    throw new ApiError(404, 'Category not found or is inactive');
  }

  return category;
}

/**
 * Verify that payment type belongs to the account
 */
async function assertPaymentTypeBelongsToAccount(paymentTypeId, accountId) {
  const paymentType = await PaymentType.findOne({
    _id: paymentTypeId,
    accountId,
    isActive: true
  });

  if (!paymentType) {
    throw new ApiError(404, 'Payment type not found or is inactive');
  }

  return paymentType;
}

/**
 * Create transaction with full validation
 */
export async function create(userId, accountId, data) {
  // Verify account ownership
  await assertAccountOwnership(accountId, userId);

  if (data.type !== 'transfer') {
    // For expense/income: category and paymentType must belong to the account
    const category = await assertCategoryBelongsToAccount(data.categoryId, accountId);
    if (category.type !== data.type) {
      throw new ApiError(400, 'Category type must match transaction type');
    }

    const paymentType = await assertPaymentTypeBelongsToAccount(data.paymentTypeId, accountId);
    if (paymentType.type !== data.type) {
      throw new ApiError(400, 'Payment type must match transaction type');
    }
  } else {
    // For transfers: verify both accounts belong to user
    const from = data.fromAccountId.toString();
    const to = data.toAccountId.toString();
    await assertAccountsOwnership(from, to, userId);
  }

  const transaction = new Transaction({
    ...data,
    accountId: data.type === 'transfer' ? undefined : accountId
  });

  await transaction.save();

  // Update account balance(s)
  if (data.type === 'transfer') {
    await updateAccountBalance(data.fromAccountId);
    await updateAccountBalance(data.toAccountId);
  } else {
    await updateAccountBalance(accountId);
  }

  return transaction;
}

/**
 * Get transactions for account with filters
 */
export async function getByAccount(userId, accountId, filters = {}) {
  // Verify account ownership
  await assertAccountOwnership(accountId, userId);

  const query = { accountId };
  if (filters.type) query.type = filters.type;
  if (filters.categoryId) query.categoryId = filters.categoryId;
  if (filters.paymentTypeId) query.paymentTypeId = filters.paymentTypeId;

  if (filters.startDate || filters.endDate) {
    query.date = {};
    if (filters.startDate) query.date.$gte = new Date(filters.startDate);
    if (filters.endDate) query.date.$lte = new Date(filters.endDate);
  }

  if (filters.minAmount || filters.maxAmount) {
    query.amount = {};
    if (filters.minAmount) query.amount.$gte = filters.minAmount;
    if (filters.maxAmount) query.amount.$lte = filters.maxAmount;
  }

  return await Transaction.find(query)
    .populate('categoryId')
    .populate('paymentTypeId')
    .populate('fromAccountId')
    .populate('toAccountId')
    .sort({ date: -1, createdAt: -1 })
    .limit(filters.limit || 100)
    .skip(filters.skip || 0);
}

/**
 * Get transaction by ID
 */
export async function getById(userId, id, accountId) {
  // Verify account ownership
  await assertAccountOwnership(accountId, userId);

  const transaction = await Transaction.findOne({ _id: id, accountId })
    .populate('categoryId')
    .populate('paymentTypeId')
    .populate('fromAccountId')
    .populate('toAccountId');

  if (!transaction) {
    throw new ApiError(404, 'Transaction not found');
  }

  return transaction;
}

/**
 * Update transaction with validation
 */
export async function update(userId, id, accountId, data) {
  // Verify account ownership
  await assertAccountOwnership(accountId, userId);

  // Get original transaction
  const originalTransaction = await Transaction.findOne({ _id: id, accountId });
  if (!originalTransaction) {
    throw new ApiError(404, 'Transaction not found');
  }

  // Clean up data
  const cleanData = { ...data };
  if (cleanData.categoryId && typeof cleanData.categoryId === 'object' && cleanData.categoryId._id) {
    cleanData.categoryId = cleanData.categoryId._id;
  }
  if (cleanData.paymentTypeId && typeof cleanData.paymentTypeId === 'object' && cleanData.paymentTypeId._id) {
    cleanData.paymentTypeId = cleanData.paymentTypeId._id;
  }
  if (cleanData.fromAccountId && typeof cleanData.fromAccountId === 'object' && cleanData.fromAccountId._id) {
    cleanData.fromAccountId = cleanData.fromAccountId._id;
  }
  if (cleanData.toAccountId && typeof cleanData.toAccountId === 'object' && cleanData.toAccountId._id) {
    cleanData.toAccountId = cleanData.toAccountId._id;
  }

  // Validate category if provided
  if (cleanData.categoryId) {
    const category = await assertCategoryBelongsToAccount(cleanData.categoryId, accountId);
    const txType = cleanData.type || originalTransaction.type;
    if (category.type !== txType) {
      throw new ApiError(400, 'Category type must match transaction type');
    }
  }

  // Validate payment type if provided
  if (cleanData.paymentTypeId) {
    const paymentType = await assertPaymentTypeBelongsToAccount(cleanData.paymentTypeId, accountId);
    const txType = cleanData.type || originalTransaction.type;
    if (paymentType.type !== txType) {
      throw new ApiError(400, 'Payment type must match transaction type');
    }
  }

  // Validate transfer accounts if provided
  if ((cleanData.fromAccountId || cleanData.toAccountId) && originalTransaction.type === 'transfer') {
    const from = cleanData.fromAccountId || originalTransaction.fromAccountId;
    const to = cleanData.toAccountId || originalTransaction.toAccountId;
    await assertAccountsOwnership(from, to, userId);
  }

  const updatedTransaction = await Transaction.findOneAndUpdate(
    { _id: id, accountId },
    cleanData,
    { new: true, runValidators: true }
  )
    .populate('categoryId')
    .populate('paymentTypeId')
    .populate('fromAccountId')
    .populate('toAccountId');

  // Update account balance(s)
  if (updatedTransaction.type === 'transfer') {
    await updateAccountBalance(updatedTransaction.fromAccountId);
    await updateAccountBalance(updatedTransaction.toAccountId);
  } else {
    await updateAccountBalance(updatedTransaction.accountId);
  }

  return updatedTransaction;
}

/**
 * Delete transaction
 */
export async function remove(userId, id, accountId) {
  // Verify account ownership
  await assertAccountOwnership(accountId, userId);

  const transaction = await Transaction.findOne({ _id: id, accountId });
  if (!transaction) {
    throw new ApiError(404, 'Transaction not found');
  }

  const result = await Transaction.findOneAndDelete({ _id: id, accountId });

  // Update account balance(s)
  if (result) {
    if (result.type === 'transfer') {
      await updateAccountBalance(result.fromAccountId);
      await updateAccountBalance(result.toAccountId);
    } else {
      await updateAccountBalance(result.accountId);
    }
  }

  return result;
}

/**
 * Get transaction statistics
 */
export async function getStats(userId, accountId, startDate, endDate) {
  // Verify account ownership
  await assertAccountOwnership(accountId, userId);

  const accountObjectId = new mongoose.Types.ObjectId(accountId);

  const match = { accountId: accountObjectId };

  if (startDate || endDate) {
    match.date = {};
    if (startDate) match.date.$gte = new Date(startDate);
    if (endDate) match.date.$lte = new Date(endDate);
  }

  const stats = await Transaction.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$type',
        total: { $sum: '$amount' },
        count: { $sum: 1 }
      }
    }
  ]);

  // Build result with default structure
  const result = {
    income: { total: 0, count: 0 },
    expense: { total: 0, count: 0 }
  };

  // Fill in actual values from aggregation
  stats.forEach(stat => {
    if (stat._id === 'income' || stat._id === 'expense') {
      result[stat._id] = { total: stat.total, count: stat.count };
    }
  });

  return result;
}