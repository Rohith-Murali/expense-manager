const Account = require('../models/Account');
const Expense = require('../models/Expense');
const Income = require('../models/Income');
const Transfer = require('../models/Transfer');

class AccountService {
  // Create new account
  async createAccount(userId, accountData) {
    const account = new Account({
      userId,
      ...accountData
    });
    
    await account.save();
    
    // Calculate and attach current balance
    const balance = await this.calculateAccountBalance(account._id, userId);
    account._currentBalance = balance;
    
    return account;
  }

  // Get all accounts for user
  async getUserAccounts(userId, includeArchived = false) {
    const query = { 
      userId, 
      isDeleted: false 
    };
    
    if (!includeArchived) {
      query.isArchived = false;
    }
    
    const accounts = await Account.find(query).sort({ createdAt: -1 });
    
    // Calculate balance for each account
    const accountsWithBalance = await Promise.all(
      accounts.map(async (account) => {
        const balance = await this.calculateAccountBalance(account._id, userId);
        account._currentBalance = balance;
        return account;
      })
    );
    
    return accountsWithBalance;
  }

  // Get single account by ID
  async getAccountById(accountId, userId) {
    const account = await Account.findOne({
      _id: accountId,
      userId,
      isDeleted: false
    });
    
    if (!account) {
      throw new Error('Account not found');
    }
    
    // Calculate current balance
    const balance = await this.calculateAccountBalance(accountId, userId);
    account._currentBalance = balance;
    
    return account;
  }

  // Update account
  async updateAccount(accountId, userId, updateData) {
    // Don't allow updating openingBalance, userId, or soft delete flags
    const { openingBalance, userId: _, isDeleted, ...allowedUpdates } = updateData;
    
    const account = await Account.findOneAndUpdate(
      { _id: accountId, userId, isDeleted: false },
      { $set: allowedUpdates },
      { new: true, runValidators: true }
    );
    
    if (!account) {
      throw new Error('Account not found');
    }
    
    // Calculate current balance
    const balance = await this.calculateAccountBalance(accountId, userId);
    account._currentBalance = balance;
    
    return account;
  }

  // Archive/Unarchive account
  async toggleArchiveAccount(accountId, userId) {
    const account = await Account.findOne({
      _id: accountId,
      userId,
      isDeleted: false
    });
    
    if (!account) {
      throw new Error('Account not found');
    }
    
    account.isArchived = !account.isArchived;
    await account.save();
    
    return account;
  }

  // Soft delete account
  async deleteAccount(accountId, userId) {
    const account = await Account.findOne({
      _id: accountId,
      userId,
      isDeleted: false
    });
    
    if (!account) {
      throw new Error('Account not found');
    }
    
    // Check if account has transactions
    const hasTransactions = await this.hasTransactions(accountId, userId);
    if (hasTransactions) {
      throw new Error('Cannot delete account with existing transactions. Archive it instead.');
    }
    
    account.isDeleted = true;
    await account.save();
    
    return { message: 'Account deleted successfully' };
  }

  // Calculate account balance
  async calculateAccountBalance(accountId, userId) {
    // Get opening balance
    const account = await Account.findOne({ _id: accountId, userId });
    if (!account) return 0;
    
    let balance = account.openingBalance;
    
    // Add all income
    const incomeResult = await Income.aggregate([
      {
        $match: {
          account: accountId,
          userId: new mongoose.Types.ObjectId(userId),
          isDeleted: false
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' }
        }
      }
    ]);
    
    const totalIncome = incomeResult.length > 0 ? incomeResult[0].total : 0;
    balance += totalIncome;
    
    // Subtract all expenses
    const expenseResult = await Expense.aggregate([
      {
        $match: {
          account: accountId,
          userId: new mongoose.Types.ObjectId(userId),
          isDeleted: false
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' }
        }
      }
    ]);
    
    const totalExpense = expenseResult.length > 0 ? expenseResult[0].total : 0;
    balance -= totalExpense;
    
    // Handle transfers (money out)
    const transfersOut = await Transfer.aggregate([
      {
        $match: {
          fromAccount: accountId,
          userId: new mongoose.Types.ObjectId(userId),
          isDeleted: false
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' }
        }
      }
    ]);
    
    const totalTransfersOut = transfersOut.length > 0 ? transfersOut[0].total : 0;
    balance -= totalTransfersOut;
    
    // Handle transfers (money in)
    const transfersIn = await Transfer.aggregate([
      {
        $match: {
          toAccount: accountId,
          userId: new mongoose.Types.ObjectId(userId),
          isDeleted: false
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' }
        }
      }
    ]);
    
    const totalTransfersIn = transfersIn.length > 0 ? transfersIn[0].total : 0;
    balance += totalTransfersIn;
    
    return balance;
  }

  // Get all transactions for an account
  async getAccountTransactions(accountId, userId, options = {}) {
    const { page = 1, limit = 50, startDate, endDate } = options;
    const skip = (page - 1) * limit;
    
    // Verify account ownership
    const account = await Account.findOne({ _id: accountId, userId, isDeleted: false });
    if (!account) {
      throw new Error('Account not found');
    }
    
    // Build date filter
    const dateFilter = {};
    if (startDate || endDate) {
      if (startDate) dateFilter.$gte = startDate;
      if (endDate) dateFilter.$lte = endDate;
    }
    
    // Get expenses
    const expenseQuery = {
      account: accountId,
      userId,
      isDeleted: false
    };
    if (startDate || endDate) expenseQuery.date = dateFilter;
    
    const expenses = await Expense.find(expenseQuery)
      .populate('category', 'name type')
      .populate('paymentMode', 'name')
      .sort({ date: -1, time: -1 })
      .skip(skip)
      .limit(limit)
      .lean();
    
    // Get income
    const incomeQuery = {
      account: accountId,
      userId,
      isDeleted: false
    };
    if (startDate || endDate) incomeQuery.date = dateFilter;
    
    const income = await Income.find(incomeQuery)
      .populate('category', 'name type')
      .sort({ date: -1, time: -1 })
      .skip(skip)
      .limit(limit)
      .lean();
    
    // Get transfers (both from and to this account)
    const transferQuery = {
      $or: [
        { fromAccount: accountId },
        { toAccount: accountId }
      ],
      userId,
      isDeleted: false
    };
    if (startDate || endDate) transferQuery.date = dateFilter;
    
    const transfers = await Transfer.find(transferQuery)
      .populate('fromAccount', 'name')
      .populate('toAccount', 'name')
      .sort({ date: -1, time: -1 })
      .skip(skip)
      .limit(limit)
      .lean();
    
    // Combine and format all transactions
    const allTransactions = [
      ...expenses.map(exp => ({
        ...exp,
        type: 'EXPENSE',
        transactionId: exp._id
      })),
      ...income.map(inc => ({
        ...inc,
        type: 'INCOME',
        transactionId: inc._id
      })),
      ...transfers.map(trans => ({
        ...trans,
        type: 'TRANSFER',
        transactionId: trans._id,
        direction: trans.fromAccount._id.toString() === accountId.toString() ? 'OUT' : 'IN'
      }))
    ];
    
    // Sort by date and time
    allTransactions.sort((a, b) => {
      const dateCompare = new Date(b.date) - new Date(a.date);
      if (dateCompare !== 0) return dateCompare;
      return b.time.localeCompare(a.time);
    });
    
    // Get total counts
    const totalExpenses = await Expense.countDocuments(expenseQuery);
    const totalIncome = await Income.countDocuments(incomeQuery);
    const totalTransfers = await Transfer.countDocuments(transferQuery);
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

  // Check if account has any transactions
  async hasTransactions(accountId, userId) {
    const expenseCount = await Expense.countDocuments({
      account: accountId,
      userId,
      isDeleted: false
    });
    
    const incomeCount = await Income.countDocuments({
      account: accountId,
      userId,
      isDeleted: false
    });
    
    const transferCount = await Transfer.countDocuments({
      $or: [
        { fromAccount: accountId },
        { toAccount: accountId }
      ],
      userId,
      isDeleted: false
    });
    
    return (expenseCount + incomeCount + transferCount) > 0;
  }

  // Get account statistics
  async getAccountStats(accountId, userId) {
    const account = await this.getAccountById(accountId, userId);
    
    // Get total income
    const incomeResult = await Income.aggregate([
      {
        $match: {
          account: new mongoose.Types.ObjectId(accountId),
          userId: new mongoose.Types.ObjectId(userId),
          isDeleted: false
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      }
    ]);
    
    // Get total expenses
    const expenseResult = await Expense.aggregate([
      {
        $match: {
          account: new mongoose.Types.ObjectId(accountId),
          userId: new mongoose.Types.ObjectId(userId),
          isDeleted: false
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      }
    ]);
    
    const totalIncome = incomeResult.length > 0 ? incomeResult[0].total : 0;
    const incomeCount = incomeResult.length > 0 ? incomeResult[0].count : 0;
    
    const totalExpense = expenseResult.length > 0 ? expenseResult[0].total : 0;
    const expenseCount = expenseResult.length > 0 ? expenseResult[0].count : 0;
    
    return {
      account: {
        id: account._id,
        name: account.name,
        type: account.type,
        openingBalance: account.openingBalance,
        currentBalance: account._currentBalance
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
}

// Need to import mongoose for ObjectId
const mongoose = require('mongoose');

module.exports = new AccountService();