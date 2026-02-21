import mongoose from 'mongoose';
import { Transaction } from '../models/Transaction.js';
import { Category } from '../models/Category.js';
import { PaymentType } from '../models/PaymentType.js';
import { updateAccountBalance } from './accountService.js';

export async function create(data) {
  if (data.type !== 'transfer') {
    const category = await Category.findById(data.categoryId);
    if (!category || category.type !== data.type) {
      throw new Error('Invalid category for transaction type');
    }

    const paymentType = await PaymentType.findById(data.paymentTypeId);
    if (!paymentType || paymentType.type !== data.type) {
      throw new Error('Invalid payment type for transaction type');
    }
  }

  const transaction = new Transaction(data);
  await transaction.save();
  
  // Update account balance
  if (data.type === 'transfer') {
    await updateAccountBalance(data.fromAccountId);
    await updateAccountBalance(data.toAccountId);
  } else {
    await updateAccountBalance(data.accountId);
  }
  
  return transaction;
}

export async function getByAccount(accountId, filters = {}) {

  const query = {};
  if (accountId) query.accountId = accountId;
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

export async function getById(id, accountId) {
  if (accountId) {
    return await Transaction.findOne({ _id: id, accountId })
      .populate('categoryId')
      .populate('paymentTypeId')
      .populate('fromAccountId')
      .populate('toAccountId');
  }
  return await Transaction.findById(id)
    .populate('categoryId')
    .populate('paymentTypeId')
    .populate('fromAccountId')
    .populate('toAccountId');
}

export async function update(id, accountId, data) {
  // Get original transaction to know which accounts to update
  const originalTransaction = await Transaction.findById(id);
  if (!originalTransaction) {
    throw new Error('Transaction not found');
  }

  // Clean up data: extract IDs from populated objects if needed
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

  if (cleanData.categoryId) {
    const category = await Category.findById(cleanData.categoryId);
    if (!category || category.type !== originalTransaction.type) {
      throw new Error('Invalid category for transaction type');
    }
  }

  if (cleanData.paymentTypeId) {
    const paymentType = await PaymentType.findById(cleanData.paymentTypeId);
    if (!paymentType || paymentType.type !== originalTransaction.type) {
      throw new Error('Invalid payment type for transaction type');
    }
  }

  let updatedTransaction;
  if (accountId) {
    updatedTransaction = await Transaction.findOneAndUpdate(
      { _id: id, accountId },
      cleanData,
      { new: true, runValidators: true }
    )
      .populate('categoryId')
      .populate('paymentTypeId')
      .populate('fromAccountId')
      .populate('toAccountId');
  } else {
    updatedTransaction = await Transaction.findByIdAndUpdate(id, cleanData, { new: true, runValidators: true })
      .populate('categoryId')
      .populate('paymentTypeId')
      .populate('fromAccountId')
      .populate('toAccountId');
  }

  // Update account balance(s)
  if (updatedTransaction.type === 'transfer') {
    await updateAccountBalance(updatedTransaction.fromAccountId);
    await updateAccountBalance(updatedTransaction.toAccountId);
  } else {
    await updateAccountBalance(updatedTransaction.accountId);
  }

  return updatedTransaction;
}

export async function remove(id, accountId) {
  const transaction = accountId 
    ? await Transaction.findOne({ _id: id, accountId })
    : await Transaction.findById(id);

  if (!transaction) {
    return null;
  }

  // Delete transaction
  let result;
  if (accountId) {
    result = await Transaction.findOneAndDelete({ _id: id, accountId });
  } else {
    result = await Transaction.findByIdAndDelete(id);
  }

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

export async function getStats(accountId, startDate, endDate) {
  const accountObjectId = new mongoose.Types.ObjectId(accountId);
  
  const match = {
    $or: [
      { accountId: accountObjectId },
      { fromAccountId: accountObjectId },
      { toAccountId: accountObjectId }
    ]
  };
  
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