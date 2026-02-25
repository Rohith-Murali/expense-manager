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
 * For transfers, creates two atomic documents (transfer-out and transfer-in)
 */
export async function create(userId, accountId, data) {
  // For transfers, accountId is the source account (required in the route)
  if (data.type === 'transfer') {
    // Verify both accounts belong to user
    await assertAccountsOwnership(accountId, data.toAccountId, userId);

    const transferId = new mongoose.Types.ObjectId();
    const baseTransferData = {
      transferId,
      date: data.date || new Date(),
      description: data.description,
      tags: data.tags || [],
      attachments: data.attachments || [],
      notes: data.notes
    };

    // Create transfer-out document (from source account with negative amount)
    const transferOut = new Transaction({
      ...baseTransferData,
      type: 'transfer-out',
      accountId: accountId,
      amount: -Math.abs(data.amount)
    });

    // Create transfer-in document (to destination account with positive amount)
    const transferIn = new Transaction({
      ...baseTransferData,
      type: 'transfer-in',
      accountId: data.toAccountId,
      amount: Math.abs(data.amount)
    });

    // Save both documents (linked by transferId)
    await transferOut.save();
    await transferIn.save();

    // Update balances for both accounts
    await updateAccountBalance(accountId);
    await updateAccountBalance(data.toAccountId);

    // Return transfer pair as an object with both sides
    return {
      transferId,
      transferOut: transferOut.toObject(),
      transferIn: transferIn.toObject(),
      _id: transferId
    };
  } else {
    // For income/expense transactions
    // Verify account ownership
    await assertAccountOwnership(accountId, userId);

    // Validate category and payment type
    const category = await assertCategoryBelongsToAccount(data.categoryId, accountId);
    if (category.type !== data.type) {
      throw new ApiError(400, 'Category type must match transaction type');
    }

    const paymentType = await assertPaymentTypeBelongsToAccount(data.paymentTypeId, accountId);
    if (paymentType.type !== data.type) {
      throw new ApiError(400, 'Payment type must match transaction type');
    }

    // Create transaction with amount adjustment based on type
    const amount = data.type === 'expense' ? -Math.abs(data.amount) : Math.abs(data.amount);

    const transaction = new Transaction({
      type: data.type,
      accountId,
      amount,
      categoryId: data.categoryId,
      paymentTypeId: data.paymentTypeId,
      date: data.date || new Date(),
      description: data.description,
      tags: data.tags || [],
      attachments: data.attachments || [],
      notes: data.notes
    });

    await transaction.save();

    // Update account balance
    await updateAccountBalance(accountId);

    return transaction;
  }
}

/**
 * Get transactions for account with filters
 */
export async function getByAccount(userId, accountId, filters = {}) {
  // Verify account ownership
  await assertAccountOwnership(accountId, userId);

  const query = { accountId };

  // Handle type filter - map old 'transfer' to both new types if needed
  if (filters.type) {
    if (filters.type === 'transfer') {
      query.type = { $in: ['transfer-out', 'transfer-in'] };
    } else {
      query.type = filters.type;
    }
  }

  if (filters.categoryId) query.categoryId = filters.categoryId;
  if (filters.paymentTypeId) query.paymentTypeId = filters.paymentTypeId;

  if (filters.startDate || filters.endDate) {
    query.date = {};
    if (filters.startDate) query.date.$gte = new Date(filters.startDate);
    if (filters.endDate) query.date.$lte = new Date(filters.endDate);
  }

  if (filters.minAmount !== null || filters.maxAmount !== null) {
    query.amount = {};
    if (filters.minAmount !== null) query.amount.$gte = filters.minAmount;
    if (filters.maxAmount !== null) query.amount.$lte = filters.maxAmount;
  }

  return await Transaction.find(query)
    .populate('categoryId')
    .populate('paymentTypeId')
    .sort({ date: -1, createdAt: -1 })
    .limit(filters.limit || 100)
    .skip(filters.skip || 0)
    .lean();
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
    .lean();

  if (!transaction) {
    throw new ApiError(404, 'Transaction not found');
  }

  // If this is a transfer, also fetch the linked transaction
  if (transaction.transferId) {
    const linkedTransaction = await Transaction.findOne({
      transferId: transaction.transferId,
      _id: { $ne: id }
    })
      .populate('categoryId')
      .populate('paymentTypeId')
      .lean();

    return {
      ...transaction,
      linkedTransaction
    };
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

  // Cannot change type of transfer transactions
  if ((originalTransaction.type === 'transfer-out' || originalTransaction.type === 'transfer-in') && data.type) {
    throw new ApiError(400, 'Cannot change type of transfer transactions');
  }

  // Validate category if provided
  if (data.categoryId && !originalTransaction.transferId) {
    const category = await assertCategoryBelongsToAccount(data.categoryId, accountId);
    const txType = originalTransaction.type;
    if (category.type !== txType) {
      throw new ApiError(400, 'Category type must match transaction type');
    }
  }

  // Validate payment type if provided
  if (data.paymentTypeId && !originalTransaction.transferId) {
    const paymentType = await assertPaymentTypeBelongsToAccount(data.paymentTypeId, accountId);
    const txType = originalTransaction.type;
    if (paymentType.type !== txType) {
      throw new ApiError(400, 'Payment type must match transaction type');
    }
  }

  // Build update object
  const updateData = {};
  if (data.description !== undefined) updateData.description = data.description;
  if (data.date !== undefined) updateData.date = data.date;
  if (data.tags !== undefined) updateData.tags = data.tags;
  if (data.attachments !== undefined) updateData.attachments = data.attachments;
  if (data.notes !== undefined) updateData.notes = data.notes;

  // For non-transfer transactions, allow amount and category/payment type updates
  if (!originalTransaction.transferId) {
    if (data.amount !== undefined) {
      const amount = originalTransaction.type === 'expense'
        ? -Math.abs(data.amount)
        : Math.abs(data.amount);
      updateData.amount = amount;
    }
    if (data.categoryId !== undefined) updateData.categoryId = data.categoryId;
    if (data.paymentTypeId !== undefined) updateData.paymentTypeId = data.paymentTypeId;
  } else {
    // For transfers, can update amount (both documents)
    if (data.amount !== undefined) {
      const newAmount = Math.abs(data.amount);
      await Transaction.updateOne(
        { _id: id, type: 'transfer-out' },
        { amount: -newAmount }
      );
      await Transaction.updateOne(
        { transferId: originalTransaction.transferId, type: 'transfer-in' },
        { amount: newAmount }
      );

      // Update both accounts
      await updateAccountBalance(accountId);
      const linkedTx = await Transaction.findOne({
        transferId: originalTransaction.transferId,
        _id: { $ne: id }
      });
      if (linkedTx) {
        await updateAccountBalance(linkedTx.accountId);
      }
    }
  }

  const updatedTransaction = await Transaction.findOneAndUpdate(
    { _id: id, accountId },
    { ...updateData },
    { new: true, runValidators: true }
  )
    .populate('categoryId')
    .populate('paymentTypeId')
    .lean();

  // Update account balance
  await updateAccountBalance(accountId);

  return updatedTransaction;
}

/**
 * Delete transaction
 * For transfers, deletes both transfer-out and transfer-in documents
 */
export async function remove(userId, id, accountId) {
  // Verify account ownership
  await assertAccountOwnership(accountId, userId);

  const transaction = await Transaction.findOne({ _id: id, accountId });
  if (!transaction) {
    throw new ApiError(404, 'Transaction not found');
  }

  // If this is a transfer, delete both documents
  if (transaction.transferId) {
    // Find both transactions
    const transferOut = await Transaction.findOne({
      type: 'transfer-out',
      transferId: transaction.transferId
    });
    const transferIn = await Transaction.findOne({
      type: 'transfer-in',
      transferId: transaction.transferId
    });

    if (!transferOut || !transferIn) {
      throw new ApiError(500, 'Transfer documents are inconsistent');
    }

    // Delete both
    await Transaction.deleteOne({ _id: transferOut._id });
    await Transaction.deleteOne({ _id: transferIn._id });

    // Update both accounts
    await updateAccountBalance(transferOut.accountId);
    await updateAccountBalance(transferIn.accountId);

    return { transferOut: transferOut.toObject(), transferIn: transferIn.toObject() };
  } else {
    // Regular transaction deletion
    const result = await Transaction.findOneAndDelete({ _id: id, accountId });

    if (result) {
      await updateAccountBalance(accountId);
    }

    return result;
  }
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
    expense: { total: 0, count: 0 },
    transfer: { total: 0, count: 0 }
  };

  // Fill in actual values from aggregation
  stats.forEach(stat => {
    if (stat._id === 'income') {
      result.income = { total: stat.total, count: stat.count };
    } else if (stat._id === 'expense') {
      result.expense = { total: Math.abs(stat.total), count: stat.count };
    } else if (stat._id === 'transfer-out' || stat._id === 'transfer-in') {
      result.transfer.total += Math.abs(stat.total);
      result.transfer.count += stat.count;
    }
  });

  return result;
}