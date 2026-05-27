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

    const magnitude = Math.abs(data.amount);

    // Create transfer-out document (from source account, amount stored as positive)
    const transferOut = new Transaction({
      ...baseTransferData,
      type: 'transfer-out',
      accountId: accountId,
      amount: magnitude
    });

    // Create transfer-in document (to destination account, amount stored as positive)
    const transferIn = new Transaction({
      ...baseTransferData,
      type: 'transfer-in',
      accountId: data.toAccountId,
      amount: magnitude
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

    // Create transaction - always store positive amount
    const amount = Math.abs(data.amount);

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


export async function update(userId, id, accountId, data) {
  let originalTransaction = await Transaction.findOne({ _id: id })
    .lean();

  if (!originalTransaction) {
    throw new ApiError(404, 'Transaction not found');
  }

  await assertAccountOwnership(originalTransaction.accountId, userId);

  if (accountId && String(accountId) !== String(originalTransaction.accountId)) {
    accountId = originalTransaction.accountId;
  }

  if (originalTransaction.type === 'transfer-in' && originalTransaction.transferId) {
    const transferOut = await Transaction.findOne({
      transferId: originalTransaction.transferId,
      type: 'transfer-out'
    }).lean();

    if (transferOut) {
      originalTransaction = transferOut;
      id = transferOut._id;
      accountId = transferOut.accountId;
    }
  }

  const isOriginalTransfer = originalTransaction.type === 'transfer-out' || originalTransaction.type === 'transfer-in';
  const newType = data.type ? (data.type === 'transfer' ? 'transfer-out' : data.type) : null;
  const isNewTypeTransfer = newType && (newType === 'transfer-out' || newType === 'transfer-in');

  if (data.type && newType !== originalTransaction.type) {
    if (originalTransaction.type === 'transfer-in') {
      throw new ApiError(400, 'Cannot edit transfer-in directly. Edit the transfer-out transaction instead.');
    }

    if (!isOriginalTransfer && data.type === 'transfer') {
      if (!data.toAccountId) {
        throw new ApiError(400, 'Destination account is required to convert to transfer');
      }
      await assertAccountsOwnership(accountId, data.toAccountId, userId);

      if (accountId === data.toAccountId) {
        throw new ApiError(400, 'Cannot transfer to the same account');
      }

      const transferId = new mongoose.Types.ObjectId();
      const magnitude = Math.abs(data.amount || originalTransaction.amount);

      const baseTransferData = {
        transferId,
        date: data.date || originalTransaction.date,
        description: data.description !== undefined ? data.description : originalTransaction.description,
        tags: data.tags !== undefined ? data.tags : originalTransaction.tags,
        attachments: data.attachments !== undefined ? data.attachments : originalTransaction.attachments,
        notes: data.notes !== undefined ? data.notes : originalTransaction.notes
      };

      await Transaction.deleteOne({ _id: id });
      const transferOut = new Transaction({
        ...baseTransferData,
        type: 'transfer-out',
        accountId: accountId,
        amount: magnitude
      });
      const transferIn = new Transaction({
        ...baseTransferData,
        type: 'transfer-in',
        accountId: data.toAccountId,
        amount: magnitude
      });

      await transferOut.save();
      await transferIn.save();
      await updateAccountBalance(accountId);
      await updateAccountBalance(data.toAccountId);

      return {
        transferId,
        transferOut: transferOut.toObject(),
        transferIn: transferIn.toObject(),
        _id: transferId
      };
    }

    if (isOriginalTransfer && newType && (newType === 'expense' || newType === 'income')) {
      if (!data.categoryId) {
        throw new ApiError(400, `Category is required to convert transfer to ${newType}`);
      }
      if (!data.paymentTypeId) {
        throw new ApiError(400, `Payment type is required to convert transfer to ${newType}`);
      }

      const category = await assertCategoryBelongsToAccount(data.categoryId, accountId);
      if (category.type !== newType) {
        throw new ApiError(400, `Category type must match transaction type (${newType})`);
      }
      const paymentType = await assertPaymentTypeBelongsToAccount(data.paymentTypeId, accountId);
      if (paymentType.type !== newType) {
        throw new ApiError(400, `Payment type type must match transaction type (${newType})`);
      }
      const linkedTransferId = originalTransaction.transferId;
      if (linkedTransferId) {
        await Transaction.deleteOne({
          transferId: linkedTransferId,
          type: 'transfer-in'
        });
        const linkedTx = await Transaction.findOne({
          transferId: linkedTransferId,
          type: 'transfer-in'
        });
        if (linkedTx) {
          await updateAccountBalance(linkedTx.accountId);
        }
      }
      const amount = Math.abs(data.amount || originalTransaction.amount);
      const updatedTransaction = await Transaction.findOneAndUpdate(
        { _id: id, accountId },
        {
          type: newType,
          amount: amount,
          categoryId: data.categoryId,
          paymentTypeId: data.paymentTypeId,
          transferId: undefined,
          description: data.description !== undefined ? data.description : originalTransaction.description,
          date: data.date !== undefined ? data.date : originalTransaction.date,
          tags: data.tags !== undefined ? data.tags : originalTransaction.tags,
          attachments: data.attachments !== undefined ? data.attachments : originalTransaction.attachments,
          notes: data.notes !== undefined ? data.notes : originalTransaction.notes
        },
        { new: true, runValidators: true }
      )
        .populate('categoryId')
        .populate('paymentTypeId')
        .lean();

      await updateAccountBalance(accountId);

      return updatedTransaction;
    }

    if (!isOriginalTransfer && !isNewTypeTransfer && ['expense', 'income'].includes(newType)) {
      if (data.categoryId) {
        const category = await assertCategoryBelongsToAccount(data.categoryId, accountId);
        if (category.type !== newType) {
          throw new ApiError(400, 'Category type must match transaction type');
        }
      }
      if (data.paymentTypeId) {
        const paymentType = await assertPaymentTypeBelongsToAccount(data.paymentTypeId, accountId);
        if (paymentType.type !== newType) {
          throw new ApiError(400, 'Payment type must match transaction type');
        }
      }

      const updateData = {
        type: newType
      };

      if (data.amount !== undefined) updateData.amount = Math.abs(data.amount);
      if (data.categoryId !== undefined) updateData.categoryId = data.categoryId;
      if (data.paymentTypeId !== undefined) updateData.paymentTypeId = data.paymentTypeId;
      if (data.description !== undefined) updateData.description = data.description;
      if (data.date !== undefined) updateData.date = data.date;
      if (data.tags !== undefined) updateData.tags = data.tags;
      if (data.attachments !== undefined) updateData.attachments = data.attachments;
      if (data.notes !== undefined) updateData.notes = data.notes;

      const updatedTransaction = await Transaction.findOneAndUpdate(
        { _id: id, accountId },
        updateData,
        { new: true, runValidators: true }
      )
        .populate('categoryId')
        .populate('paymentTypeId')
        .lean();
      await updateAccountBalance(accountId);

      return updatedTransaction;
    }
    throw new ApiError(400, `Cannot convert transaction type from ${originalTransaction.type} to ${data.type}`);
  }


  // Build update object
  const updateData = {};
  if (data.description !== undefined) updateData.description = data.description;
  if (data.date !== undefined) updateData.date = data.date;
  if (data.tags !== undefined) updateData.tags = data.tags;
  if (data.attachments !== undefined) updateData.attachments = data.attachments;
  if (data.notes !== undefined) updateData.notes = data.notes;

  if (!isOriginalTransfer) {
    if (data.amount !== undefined) {
      updateData.amount = Math.abs(data.amount);
    }
    if (data.categoryId !== undefined) updateData.categoryId = data.categoryId;
    if (data.paymentTypeId !== undefined) updateData.paymentTypeId = data.paymentTypeId;

    const updatedTransaction = await Transaction.findOneAndUpdate(
      { _id: id, accountId },
      updateData,
      { new: true, runValidators: true }
    )
      .populate('categoryId')
      .populate('paymentTypeId')
      .lean();
    await updateAccountBalance(accountId);

    return updatedTransaction;
  }

  if (isOriginalTransfer) {
    const oldSourceAccountId = accountId;
    let oldLinkedTx = null;
    let oldDestinationAccountId = null;
    if (originalTransaction.transferId) {
      oldLinkedTx = await Transaction.findOne({
        transferId: originalTransaction.transferId,
        _id: { $ne: id }
      });
      if (!oldLinkedTx) {
        throw new ApiError(500, 'Linked transfer transaction not found. Data integrity issue.');
      }
      oldDestinationAccountId = oldLinkedTx.accountId;
    }

    if (data.accountId && data.accountId !== oldSourceAccountId) {
      if (data.accountId === (data.toAccountId || oldDestinationAccountId)) {
        throw new ApiError(400, 'Cannot transfer from and to the same account');
      }
      await assertAccountOwnership(data.accountId, userId);
      await Transaction.updateOne(
        { _id: id, type: 'transfer-out' },
        { accountId: data.accountId }
      );
      await updateAccountBalance(oldSourceAccountId);
      await updateAccountBalance(data.accountId);
    }
    if (data.amount !== undefined && originalTransaction.transferId) {
      const newAmount = Math.abs(data.amount);
      await Transaction.updateOne(
        { _id: id, type: 'transfer-out' },
        { amount: newAmount, ...updateData }
      );
      await Transaction.updateOne(
        { transferId: originalTransaction.transferId, type: 'transfer-in' },
        { amount: newAmount, ...updateData }
      );

      // Update both accounts
      const finalSourceAccountId = data.accountId || oldSourceAccountId;
      if (oldLinkedTx) {
        await updateAccountBalance(finalSourceAccountId);
        await updateAccountBalance(oldLinkedTx.accountId);
      }
    } else if (originalTransaction.transferId) {
      await Transaction.updateOne(
        { _id: id, type: 'transfer-out' },
        updateData
      );
      await Transaction.updateOne(
        { transferId: originalTransaction.transferId, type: 'transfer-in' },
        updateData
      );
    }
    if (data.toAccountId && originalTransaction.transferId) {
      const finalSourceAccountId = data.accountId || oldSourceAccountId;
      if (data.toAccountId === finalSourceAccountId) {
        throw new ApiError(400, 'Cannot transfer to the same account');
      }
      await assertAccountsOwnership(finalSourceAccountId, data.toAccountId, userId);
      const linkedTx = await Transaction.findOne({
        transferId: originalTransaction.transferId,
        type: 'transfer-in'
      });

      if (linkedTx) {
        await Transaction.updateOne(
          { _id: linkedTx._id },
          { accountId: data.toAccountId }
        );
        await updateAccountBalance(linkedTx.accountId);
        await updateAccountBalance(data.toAccountId);
      }
    }
  }
  const updatedTransaction = await Transaction.findOne({ _id: id })
    .populate('categoryId')
    .populate('paymentTypeId')
    .lean();

  if (!updatedTransaction) {
    throw new ApiError(404, 'Transaction not found after update');
  }

  if (updatedTransaction.transferId) {
    const linkedTransaction = await Transaction.findOne({
      transferId: updatedTransaction.transferId,
      _id: { $ne: id }
    })
      .populate('categoryId')
      .populate('paymentTypeId')
      .lean();

    return {
      ...updatedTransaction,
      linkedTransaction
    };
  }

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
    transferOut: { total: 0, count: 0 },
    transferIn: { total: 0, count: 0 }
  };

  // Fill in actual values from aggregation
  stats.forEach(stat => {
    const absTotal = Math.abs(stat.total);

    if (stat._id === 'income') {
      result.income = { total: absTotal, count: stat.count };
    } else if (stat._id === 'expense') {
      result.expense = { total: absTotal, count: stat.count };
    } else if (stat._id === 'transfer-out') {
      result.transferOut = { total: absTotal, count: stat.count };
    } else if (stat._id === 'transfer-in') {
      result.transferIn = { total: absTotal, count: stat.count };
    }
  });

  return result;
}

/**
 * Get category-wise analytics with income/expense breakdown
 */
export async function getCategoryWiseAnalytics(userId, accountId, startDate, endDate, type) {
  // Verify account ownership
  await assertAccountOwnership(accountId, userId);

  const accountObjectId = new mongoose.Types.ObjectId(accountId);

  const match = {
    accountId: accountObjectId,
    type: { $in: ['income', 'expense'] } // Exclude transfers
  };

  // Filter by specific type if provided
  if (type && ['income', 'expense'].includes(type)) {
    match.type = type;
  }

  if (startDate || endDate) {
    match.date = {};
    if (startDate) match.date.$gte = new Date(startDate);
    if (endDate) match.date.$lte = new Date(endDate);
  }

  const analytics = await Transaction.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$categoryId',
        total: { $sum: '$amount' },
        count: { $sum: 1 }
      }
    },
    {
      $lookup: {
        from: 'categories',
        localField: '_id',
        foreignField: '_id',
        as: 'categoryData'
      }
    },
    {
      $unwind: '$categoryData'
    },
    {
      $sort: { total: -1 }
    }
  ]);

  // Calculate grand total for percentage calculations
  const grandTotal = analytics.reduce((sum, item) => sum + item.total, 0);

  // Format response
  const result = analytics.map(item => ({
    categoryId: item._id,
    categoryName: item.categoryData.name,
    categoryType: item.categoryData.type,
    categoryIcon: item.categoryData.icon,
    categoryColor: item.categoryData.color,
    total: Math.abs(item.total),
    count: item.count,
    percentage: grandTotal > 0 ? ((Math.abs(item.total) / grandTotal) * 100).toFixed(2) : 0
  }));

  return {
    summary: {
      grandTotal: Math.abs(grandTotal),
      totalTransactions: result.reduce((sum, item) => sum + item.count, 0),
      categoryCount: result.length
    },
    categories: result
  };
}