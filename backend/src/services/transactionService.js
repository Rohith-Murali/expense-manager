import { Transaction } from '../models/Transaction.js';
import { Category } from '../models/Category.js';
import { PaymentType } from '../models/PaymentType.js';

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
  return await transaction.save();
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
  if (data.categoryId) {
    const category = await Category.findById(data.categoryId);
    const transaction = await Transaction.findById(id);
    if (!category || category.type !== transaction.type) {
      throw new Error('Invalid category for transaction type');
    }
  }

  if (data.paymentTypeId) {
    const paymentType = await PaymentType.findById(data.paymentTypeId);
    const transaction = await Transaction.findById(id);
    if (!paymentType || paymentType.type !== transaction.type) {
      throw new Error('Invalid payment type for transaction type');
    }
  }

  if (accountId) {
    return await Transaction.findOneAndUpdate(
      { _id: id, accountId },
      data,
      { new: true, runValidators: true }
    ).populate('categoryId').populate('paymentTypeId');
  }
  return await Transaction.findByIdAndUpdate(id, data, { new: true, runValidators: true })
    .populate('categoryId').populate('paymentTypeId');
}

export async function remove(id, accountId) {
  if (accountId) return await Transaction.findOneAndDelete({ _id: id, accountId });
  return await Transaction.findByIdAndDelete(id);
}

export async function getStats(accountId, startDate, endDate) {
  const match = {};
  if (accountId) match.accountId = accountId;
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

  return stats.reduce((acc, stat) => {
    acc[stat._id] = { total: stat.total, count: stat.count };
    return acc;
  }, {});
}

// Named exports only — no default export per project rules