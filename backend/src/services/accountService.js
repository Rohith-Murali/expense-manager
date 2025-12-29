import { Account } from '../models/Account.js';
import { Transaction } from '../models/Transaction.js';
import mongoose from 'mongoose';

export async function createAccount(userId, accountData) {
  const account = new Account({ userId, ...accountData });
  await account.save();
  const balance = await calculateAccountBalance(account._id, userId);
  account._currentBalance = balance;
  return account;
}

export async function getUserAccounts(userId, includeArchived = false) {
  const query = { userId, isDeleted: false };
  if (!includeArchived) query.isArchived = false;
  const accounts = await Account.find(query).sort({ createdAt: -1 });
  const accountsWithBalance = await Promise.all(
    accounts.map(async (account) => {
      const balance = await calculateAccountBalance(account._id, userId);
      account._currentBalance = balance;
      return account;
    })
  );
  return accountsWithBalance;
}

export async function getAccountById(accountId, userId) {
  const account = await Account.findOne({ _id: accountId, userId, isDeleted: false });
  if (!account) throw new Error('Account not found');
  const balance = await calculateAccountBalance(accountId, userId);
  account._currentBalance = balance;
  return account;
}

export async function updateAccount(accountId, userId, updateData) {
  const { openingBalance, userId: _, isDeleted, ...allowedUpdates } = updateData;
  const account = await Account.findOneAndUpdate(
    { _id: accountId, userId, isDeleted: false },
    { $set: allowedUpdates },
    { new: true, runValidators: true }
  );
  if (!account) throw new Error('Account not found');
  const balance = await calculateAccountBalance(accountId, userId);
  account._currentBalance = balance;
  return account;
}

export async function toggleArchiveAccount(accountId, userId) {
  const account = await Account.findOne({ _id: accountId, userId, isDeleted: false });
  if (!account) throw new Error('Account not found');
  account.isArchived = !account.isArchived;
  await account.save();
  return account;
}

export async function deleteAccount(accountId, userId) {
  const account = await Account.findOne({ _id: accountId, userId, isDeleted: false });
  if (!account) throw new Error('Account not found');
  const hasTx = await hasTransactions(accountId, userId);
  if (hasTx) throw new Error('Cannot delete account with existing transactions. Archive it instead.');
  account.isDeleted = true;
  await account.save();
  return { message: 'Account deleted successfully' };
}

export async function calculateAccountBalance(accountId, userId) {
  const account = await Account.findOne({ _id: accountId, userId });
  if (!account) return 0;
  let balance = account.openingBalance || 0;

  const incomeResult = await Transaction.aggregate([
    { $match: { accountId: new mongoose.Types.ObjectId(accountId), type: 'income' } },
    { $group: { _id: null, total: { $sum: '$amount' } } }
  ]);
  const totalIncome = incomeResult.length > 0 ? incomeResult[0].total : 0;
  balance += totalIncome;

  const expenseResult = await Transaction.aggregate([
    { $match: { accountId: new mongoose.Types.ObjectId(accountId), type: 'expense' } },
    { $group: { _id: null, total: { $sum: '$amount' } } }
  ]);
  const totalExpense = expenseResult.length > 0 ? expenseResult[0].total : 0;
  balance -= totalExpense;

  const transfersOut = await Transaction.aggregate([
    { $match: { fromAccountId: new mongoose.Types.ObjectId(accountId), type: 'transfer' } },
    { $group: { _id: null, total: { $sum: '$amount' } } }
  ]);
  const totalTransfersOut = transfersOut.length > 0 ? transfersOut[0].total : 0;
  balance -= totalTransfersOut;

  const transfersIn = await Transaction.aggregate([
    { $match: { toAccountId: new mongoose.Types.ObjectId(accountId), type: 'transfer' } },
    { $group: { _id: null, total: { $sum: '$amount' } } }
  ]);
  const totalTransfersIn = transfersIn.length > 0 ? transfersIn[0].total : 0;
  balance += totalTransfersIn;

  return balance;
}

export async function getAccountTransactions(accountId, userId, options = {}) {
  const { page = 1, limit = 50, startDate, endDate } = options;
  const skip = (page - 1) * limit;

  const dateFilter = {};
  if (startDate) dateFilter.$gte = new Date(startDate);
  if (endDate) dateFilter.$lte = new Date(endDate);

  const baseQuery = { accountId: new mongoose.Types.ObjectId(accountId) };
  if (startDate || endDate) baseQuery.date = dateFilter;

  const expenses = await Transaction.find({ ...baseQuery, type: 'expense' })
    .populate('categoryId', 'name type')
    .populate('paymentTypeId', 'name')
    .sort({ date: -1 })
    .skip(skip)
    .limit(limit)
    .lean();

  const income = await Transaction.find({ ...baseQuery, type: 'income' })
    .populate('categoryId', 'name type')
    .populate('paymentTypeId', 'name')
    .sort({ date: -1 })
    .skip(skip)
    .limit(limit)
    .lean();

  const transfers = await Transaction.find({
    $or: [ { fromAccountId: accountId }, { toAccountId: accountId } ],
    type: 'transfer'
  })
    .populate('fromAccountId', 'name')
    .populate('toAccountId', 'name')
    .sort({ date: -1 })
    .skip(skip)
    .limit(limit)
    .lean();

  const allTransactions = [
    ...expenses.map(exp => ({ ...exp, type: 'EXPENSE', transactionId: exp._id })),
    ...income.map(inc => ({ ...inc, type: 'INCOME', transactionId: inc._id })),
    ...transfers.map(trans => ({
      ...trans,
      type: 'TRANSFER',
      transactionId: trans._id,
      direction: (trans.fromAccountId?._id || trans.fromAccountId)?.toString() === accountId.toString() ? 'OUT' : 'IN'
    }))
  ];

  allTransactions.sort((a, b) => {
    const dateCompare = new Date(b.date) - new Date(a.date);
    if (dateCompare !== 0) return dateCompare;
    if (b.time && a.time) return b.time.localeCompare(a.time);
    return 0;
  });

  const totalExpenses = await Transaction.countDocuments({ accountId: accountId, type: 'expense' });
  const totalIncome = await Transaction.countDocuments({ accountId: accountId, type: 'income' });
  const totalTransfers = await Transaction.countDocuments({ $or: [ { fromAccountId: accountId }, { toAccountId: accountId } ], type: 'transfer' });
  const totalCount = totalExpenses + totalIncome + totalTransfers;

  return {
    transactions: allTransactions.slice(0, limit),
    pagination: {
      page,
      limit,
      totalCount,
      totalPages: Math.ceil(totalCount / limit)
    }
  };
}

export async function hasTransactions(accountId, userId) {
  const expenseCount = await Transaction.countDocuments({ accountId: accountId, type: 'expense' });
  const incomeCount = await Transaction.countDocuments({ accountId: accountId, type: 'income' });
  const transferCount = await Transaction.countDocuments({ $or: [ { fromAccountId: accountId }, { toAccountId: accountId } ], type: 'transfer' });
  return (expenseCount + incomeCount + transferCount) > 0;
}

export async function getAccountStats(accountId, userId) {
  const incomeResult = await Transaction.aggregate([
    { $match: { accountId: new mongoose.Types.ObjectId(accountId), type: 'income' } },
    { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }
  ]);

  const expenseResult = await Transaction.aggregate([
    { $match: { accountId: new mongoose.Types.ObjectId(accountId), type: 'expense' } },
    { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }
  ]);

  const totalIncome = incomeResult.length > 0 ? incomeResult[0].total : 0;
  const incomeCount = incomeResult.length > 0 ? incomeResult[0].count : 0;

  const totalExpense = expenseResult.length > 0 ? expenseResult[0].total : 0;
  const expenseCount = expenseResult.length > 0 ? expenseResult[0].count : 0;

  return {
    account: {
      id: accountId,
      currentBalance: await calculateAccountBalance(accountId, userId)
    },
    statistics: {
      totalIncome,
      totalExpense,
      netChange: totalIncome - totalExpense,
      incomeCount,
      expenseCount,
      totalTransactions: incomeCount + expenseCount
    }
  };
}

// Named exports only — no default export per project rules