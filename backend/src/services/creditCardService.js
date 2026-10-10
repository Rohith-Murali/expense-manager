import { Account } from '../models/Account.js';
import { CreditCardStatement } from '../models/CreditCardStatement.js';
import { Transaction } from '../models/Transaction.js';
import { ApiError } from '../utils/ApiError.js';
import {
  applyCreditCardTransaction,
  getClosedStatementPeriods,
} from '../utils/creditCardBilling.js';
import { calculateAccountBalance } from './accountService.js';

async function getCreditCardAccount(accountId, userId) {
  const account = await Account.findOne({
    _id: accountId,
    userId,
    type: 'CREDIT_CARD',
    isDeleted: false,
  }).lean();

  if (!account) {
    throw new ApiError(404, 'CREDIT_CARD_NOT_FOUND');
  }

  return account;
}

async function materializeClosedStatements(account, asOf = new Date()) {
  const periods = getClosedStatementPeriods(
    account.createdAt,
    account.statementClosingDay,
    account.paymentDueDays,
    asOf,
  );
  if (!periods.length) return [];

  const existing = await CreditCardStatement.find({
    accountId: account._id,
    periodEnd: { $in: periods.map((period) => period.periodEnd) },
  })
    .select('periodEnd')
    .lean();
  const existingDates = new Set(existing.map((statement) => statement.periodEnd.getTime()));
  const lastPeriodEnd = periods[periods.length - 1].periodEnd;

  const dailyTransactions = await Transaction.aggregate([
    {
      $match: {
        accountId: account._id,
        date: { $gte: account.createdAt, $lte: lastPeriodEnd },
      },
    },
    {
      $group: {
        _id: {
          day: {
            $dateToString: { format: '%Y-%m-%d', date: '$date', timezone: 'UTC' },
          },
          type: '$type',
        },
        total: { $sum: { $abs: '$amount' } },
      },
    },
    { $sort: { '_id.day': 1 } },
  ]);

  let outstanding = account.openingBalance || 0;
  let transactionIndex = 0;
  const createdStatements = [];

  for (const period of periods) {
    let purchases = 0;
    let credits = 0;
    let payments = 0;
    const startDay = period.periodStart.toISOString().slice(0, 10);
    const endDay = period.periodEnd.toISOString().slice(0, 10);

    while (transactionIndex < dailyTransactions.length) {
      const transaction = dailyTransactions[transactionIndex];
      if (transaction._id.day < startDay) {
        transactionIndex += 1;
        continue;
      }
      if (transaction._id.day > endDay) break;

      const { type } = transaction._id;
      const amount = transaction.total;
      outstanding = applyCreditCardTransaction(outstanding, type, amount);
      if (type === 'expense') purchases += amount;
      if (type === 'income') credits += amount;
      if (type === 'transfer-in') payments += amount;
      transactionIndex += 1;
    }

    if (!existingDates.has(period.periodEnd.getTime())) {
      createdStatements.push({
        accountId: account._id,
        ...period,
        purchases,
        credits,
        payments,
        statementBalance: outstanding,
      });
    }
  }

  for (const statement of createdStatements) {
    try {
      await CreditCardStatement.create(statement);
    } catch (error) {
      if (error?.code !== 11000) throw error;
    }
  }

  return CreditCardStatement.find({ accountId: account._id })
    .sort({ periodEnd: -1 })
    .lean();
}

export async function getCreditCardSummary(accountId, userId) {
  const account = await getCreditCardAccount(accountId, userId);
  const [outstandingBalance, statements] = await Promise.all([
    calculateAccountBalance(accountId, userId),
    materializeClosedStatements(account),
  ]);
  const availableCredit = account.creditLimit - outstandingBalance;

  return {
    account: {
      _id: account._id,
      name: account.name,
      currency: account.currency,
      creditLimit: account.creditLimit,
      statementClosingDay: account.statementClosingDay,
      paymentDueDays: account.paymentDueDays,
    },
    outstandingBalance,
    availableCredit,
    statements,
  };
}

export async function getCreditCardPayments(accountId, userId) {
  await getCreditCardAccount(accountId, userId);
  const payments = await Transaction.find({
    accountId,
    type: 'transfer-in',
  })
    .sort({ date: -1, createdAt: -1 })
    .lean();

  if (!payments.length) return [];

  const transferIds = payments.map((payment) => payment.transferId).filter(Boolean);
  const sourceTransactions = await Transaction.find({
    transferId: { $in: transferIds },
    type: 'transfer-out',
  })
    .select('transferId accountId')
    .lean();
  const sourceAccountIds = sourceTransactions.map((transaction) => transaction.accountId);
  const sourceAccounts = await Account.find({
    _id: { $in: sourceAccountIds },
    userId,
  })
    .select('name')
    .lean();
  const accountNames = new Map(sourceAccounts.map((source) => [String(source._id), source.name]));
  const sourceAccountByTransfer = new Map(
    sourceTransactions.map((transaction) => [
      String(transaction.transferId),
      accountNames.get(String(transaction.accountId)) || null,
    ]),
  );

  return payments.map((payment) => ({
    ...payment,
    sourceAccountName: payment.transferId
      ? sourceAccountByTransfer.get(String(payment.transferId)) || null
      : null,
  }));
}

export async function getCreditCardStatements(accountId, userId) {
  const account = await getCreditCardAccount(accountId, userId);
  return materializeClosedStatements(account);
}
