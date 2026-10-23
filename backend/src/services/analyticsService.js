import mongoose from 'mongoose';
import { Account } from '../models/Account.js';
import { SavingsEntry } from '../models/SavingsEntry.js';
import { Transaction } from '../models/Transaction.js';
import * as budgetService from './budgetService.js';
import { ApiError } from '../utils/ApiError.js';
import { buildAnalyticsOverview } from '../utils/analyticsOverview.js';

function dateRangeMatch(startDate, endDate) {
  return { $gte: startDate, $lt: endDate };
}

function periodExpression(startDate) {
  return {
    $cond: [{ $lt: ['$date', startDate] }, 'comparison', 'current'],
  };
}

function dateBucketExpression(granularity, timezone) {
  return {
    $dateToString: {
      format: granularity === 'day' ? '%Y-%m-%d' : '%Y-%m',
      date: '$date',
      timezone,
    },
  };
}

export async function getOverview(userId, input) {
  const {
    accountId,
    startDate,
    endDate,
    comparisonStartDate,
    comparisonEndDate,
    periodType,
    budgetMonth,
    budgetYear,
    timezone,
  } = input;

  try {
    new Intl.DateTimeFormat('en', { timeZone: timezone });
  } catch {
    throw new ApiError(400, 'Invalid timezone');
  }

  const account = await Account.findOne({
    _id: accountId,
    userId,
    isDeleted: false,
  }).lean();
  if (!account) {
    throw new ApiError(403, 'Access denied: Account not found or does not belong to you');
  }

  const accountObjectId = new mongoose.Types.ObjectId(accountId);
  const userObjectId = new mongoose.Types.ObjectId(userId);
  const allStartDate = comparisonStartDate;
  const granularity = periodType === 'month' ? 'day' : 'month';
  const period = periodExpression(startDate);
  const dateBucket = dateBucketExpression(granularity, timezone);
  const transactionMatch = {
    accountId: accountObjectId,
    type: { $in: ['income', 'expense'] },
    date: dateRangeMatch(allStartDate, endDate),
  };
  const savingsMatch = {
    userId: userObjectId,
    accountId: accountObjectId,
    isDeleted: false,
    effectiveDate: dateRangeMatch(allStartDate, endDate),
  };

  const [categoryRows, trendRows, savingsRows, budgets] = await Promise.all([
    Transaction.aggregate([
      { $match: transactionMatch },
      {
        $group: {
          _id: {
            period,
            type: '$type',
            categoryId: '$categoryId',
            subcategoryId: '$subcategoryId',
          },
          total: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
      {
        $lookup: {
          from: 'categories',
          localField: '_id.categoryId',
          foreignField: '_id',
          as: 'categoryData',
        },
      },
      { $unwind: { path: '$categoryData', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: 'subcategories',
          localField: '_id.subcategoryId',
          foreignField: '_id',
          as: 'subcategoryData',
        },
      },
      { $unwind: { path: '$subcategoryData', preserveNullAndEmptyArrays: true } },
    ]),
    Transaction.aggregate([
      { $match: transactionMatch },
      {
        $group: {
          _id: {
            period,
            date: dateBucket,
            type: '$type',
          },
          total: { $sum: '$amount' },
        },
      },
      { $sort: { '_id.date': 1 } },
    ]),
    SavingsEntry.aggregate([
      { $match: savingsMatch },
      {
        $group: {
          _id: {
            period: {
              $cond: [{ $lt: ['$effectiveDate', startDate] }, 'comparison', 'current'],
            },
            date: {
              $dateToString: {
                format: granularity === 'day' ? '%Y-%m-%d' : '%Y-%m',
                date: '$effectiveDate',
                timezone,
              },
            },
            type: '$type',
          },
          total: { $sum: '$amount' },
        },
      },
      { $sort: { '_id.date': 1 } },
    ]),
    periodType === 'month'
      ? budgetService.getByAccountMonth(userId, accountId, budgetYear, budgetMonth)
      : Promise.resolve([]),
  ]);

  return buildAnalyticsOverview({
    accountId,
    categoryRows,
    trendRows,
    savingsRows,
    budgets,
    startDate,
    endDate,
    comparisonStartDate,
    comparisonEndDate,
    periodType,
  });
}
