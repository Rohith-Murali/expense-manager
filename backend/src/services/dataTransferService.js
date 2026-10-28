import { Account } from '../models/Account.js';
import { Category } from '../models/Category.js';
import { CategoryBudget } from '../models/CategoryBudget.js';
import { CreditCardStatement } from '../models/CreditCardStatement.js';
import { MonthlyBudget } from '../models/MonthlyBudget.js';
import { PaymentType } from '../models/PaymentType.js';
import { SavingsBucket } from '../models/SavingsBucket.js';
import { SavingsEntry } from '../models/SavingsEntry.js';
import { SavingsGoal } from '../models/SavingsGoal.js';
import { Subcategory } from '../models/Subcategory.js';
import { Transaction } from '../models/Transaction.js';
import * as transactionService from './transactionService.js';
import { ApiError } from '../utils/ApiError.js';
import { logger } from '../utils/logger.js';
import { createSchema as transactionCreateSchema } from '../validators/transactionValidator.js';

const MAX_IMPORT_ROWS = 500;

function quoteCsv(value, { protectFormula = false } = {}) {
  if (value === null || value === undefined) return '';
  let text = String(value);
  if (protectFormula && /^[\s\uFEFF\u200B]*[=+\-@]/.test(text)) {
    text = `'${text}`;
  }
  return `"${text.replaceAll('"', '""')}"`;
}

function csvCell(value) {
  return quoteCsv(value, { protectFormula: typeof value === 'string' });
}

export async function getTransactionCsv(userId) {
  const accounts = await Account.find({ userId }).select('_id name').lean();
  const accountIds = accounts.map(({ _id }) => _id);
  const [transactions, categories, subcategories, paymentTypes] = await Promise.all([
    Transaction.find({ accountId: { $in: accountIds } }).sort({ date: -1 }).lean(),
    Category.find({ accountId: { $in: accountIds } }).select('_id name').lean(),
    Subcategory.find({ accountId: { $in: accountIds } }).select('_id name').lean(),
    PaymentType.find({ accountId: { $in: accountIds } }).select('_id name').lean(),
  ]);
  const accountNames = new Map(accounts.map((account) => [String(account._id), account.name]));
  const categoryNames = new Map(categories.map((item) => [String(item._id), item.name]));
  const subcategoryNames = new Map(subcategories.map((item) => [String(item._id), item.name]));
  const paymentTypeNames = new Map(paymentTypes.map((item) => [String(item._id), item.name]));
  const headers = [
    'date',
    'account',
    'type',
    'amount',
    'category',
    'subcategory',
    'paymentType',
    'description',
    'notes',
    'tags',
    'attachments',
    'isRecurring',
    'transferId',
    'transactionId',
  ];
  const lines = [headers.map((header) => csvCell(header)).join(',')];

  for (const transaction of transactions) {
    lines.push(
      [
        transaction.date ? new Date(transaction.date).toISOString() : '',
        accountNames.get(String(transaction.accountId)),
        transaction.type,
        transaction.amount,
        categoryNames.get(String(transaction.categoryId)),
        subcategoryNames.get(String(transaction.subcategoryId)),
        paymentTypeNames.get(String(transaction.paymentTypeId)),
        transaction.description,
        transaction.notes,
        JSON.stringify(Array.isArray(transaction.tags) ? transaction.tags : []),
        Array.isArray(transaction.attachments) ? transaction.attachments.join('|') : '',
        transaction.isRecurring,
        transaction.transferId,
        transaction._id,
      ]
        .map(csvCell)
        .join(','),
    );
  }

  return `\uFEFF${lines.join('\r\n')}`;
}

export async function getFinancialBackup(userId) {
  const accounts = await Account.find({ userId }).lean();
  const accountIds = accounts.map(({ _id }) => _id);
  const accountQuery = { accountId: { $in: accountIds } };
  const [
    transactions,
    categories,
    subcategories,
    paymentTypes,
    categoryBudgets,
    monthlyBudgets,
    creditCardStatements,
    savingsBuckets,
    savingsGoals,
    savingsEntries,
  ] = await Promise.all([
    Transaction.find(accountQuery).lean(),
    Category.find(accountQuery).lean(),
    Subcategory.find(accountQuery).lean(),
    PaymentType.find(accountQuery).lean(),
    CategoryBudget.find({ userId }).lean(),
    MonthlyBudget.find({ userId }).lean(),
    CreditCardStatement.find(accountQuery).lean(),
    SavingsBucket.find({ userId }).lean(),
    SavingsGoal.find({ userId }).lean(),
    SavingsEntry.find({ userId }).lean(),
  ]);

  return {
    format: 'expense-manager-financial-backup',
    version: 1,
    exportedAt: new Date().toISOString(),
    data: {
      accounts,
      transactions,
      categories,
      subcategories,
      paymentTypes,
      categoryBudgets,
      monthlyBudgets,
      creditCardStatements,
      savingsBuckets,
      savingsGoals,
      savingsEntries,
    },
  };
}

function normalizeText(value) {
  return String(value ?? '').trim().toLowerCase();
}

function mappedValue(row, mapping, field) {
  const column = mapping[field];
  return column ? String(row[column] ?? '').trim() : '';
}

function parseImportDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function parseImportAmount(value) {
  const input = String(value ?? '').trim();
  if (!/^-?(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d{1,2})?$/.test(input)) return null;
  const normalized = input.replace(/,/g, '');
  const amount = Number(normalized);
  return Number.isFinite(amount) && amount !== 0 ? Math.abs(amount) : null;
}

function duplicateKey(transaction) {
  return [
    transaction.date.toISOString().slice(0, 10),
    transaction.type,
    Math.abs(transaction.amount).toFixed(2),
    String(transaction.categoryId),
    String(transaction.paymentTypeId),
    normalizeText(transaction.description),
  ].join('|');
}

async function prepareImport(userId, accountId, rows, mapping) {
  if (rows.length > MAX_IMPORT_ROWS) {
    throw new ApiError(400, `A maximum of ${MAX_IMPORT_ROWS} rows can be imported at once`);
  }

  const account = await Account.findOne({ _id: accountId, userId, isDeleted: false }).lean();
  if (!account) throw new ApiError(404, 'ACCOUNT_NOT_FOUND');

  const categories = await Category.find({ accountId, isActive: true }).lean();
  const subcategories = await Subcategory.find({ accountId, isActive: true }).lean();
  const paymentTypes = await PaymentType.find({ accountId, isActive: true }).lean();
  const categoryByTypeAndName = new Map(
    categories.map((item) => [`${item.type}|${normalizeText(item.name)}`, item]),
  );
  const paymentTypeByTypeAndName = new Map(
    paymentTypes.map((item) => [`${item.type}|${normalizeText(item.name)}`, item]),
  );
  const subcategoryByCategoryAndName = new Map(
    subcategories.map((item) => [
      `${String(item.parentCategoryId)}|${normalizeText(item.name)}`,
      item,
    ]),
  );
  const seen = new Set();
  const prepared = rows.map((row, index) => {
    const rowNumber = index + 2;
    const issues = [];
    const type = normalizeText(mappedValue(row, mapping, 'type'));
    const dateValue = mappedValue(row, mapping, 'date');
    const date = parseImportDate(dateValue);
    const amount = parseImportAmount(mappedValue(row, mapping, 'amount'));
    const tagsValue = mappedValue(row, mapping, 'tags');
    let tags = [];
    const categoryName = mappedValue(row, mapping, 'category');
    const paymentTypeName = mappedValue(row, mapping, 'paymentType');
    const category = categoryByTypeAndName.get(`${type}|${normalizeText(categoryName)}`);
    const paymentType = paymentTypeByTypeAndName.get(`${type}|${normalizeText(paymentTypeName)}`);
    const subcategoryName = mappedValue(row, mapping, 'subcategory');
    const subcategory = subcategoryName && category
      ? subcategoryByCategoryAndName.get(`${String(category._id)}|${normalizeText(subcategoryName)}`)
      : null;

    if (!['expense', 'income'].includes(type)) {
      issues.push('Type must be expense or income');
    }
    if (!date) issues.push('Date is missing or invalid');
    if (!amount) issues.push('Amount must be a non-zero number');
    if (!categoryName || !category) issues.push('Category does not match an active category for this account and type');
    if (!paymentTypeName || !paymentType) {
      issues.push('Payment type does not match an active payment type for this account and type');
    }
    if (subcategoryName && !subcategory) {
      issues.push('Subcategory does not belong to the mapped category');
    }
    if (tagsValue) {
      if (tagsValue.startsWith('[')) {
        try {
          const parsedTags = JSON.parse(tagsValue);
          if (!Array.isArray(parsedTags) || parsedTags.some((tag) => typeof tag !== 'string')) {
            issues.push('Tags JSON must be an array of strings');
          } else {
            tags = parsedTags.map((tag) => tag.trim()).filter(Boolean);
          }
        } catch {
          issues.push('Tags JSON is invalid');
        }
      } else {
        tags = tagsValue
          .split('|')
          .map((tag) => tag.trim())
          .filter(Boolean);
      }
    }

    const transaction = {
      type,
      date,
      amount,
      categoryId: category ? String(category._id) : undefined,
      paymentTypeId: paymentType ? String(paymentType._id) : undefined,
      subcategoryId: subcategory ? String(subcategory._id) : null,
      description: mappedValue(row, mapping, 'description'),
      notes: mappedValue(row, mapping, 'notes'),
      tags,
    };
    const validation = transactionCreateSchema.safeParse(transaction);
    if (!validation.success) {
      for (const issue of validation.error.issues) {
        if (!issues.includes(issue.message)) issues.push(issue.message);
      }
    } else {
      Object.assign(transaction, validation.data);
    }
    const key = !issues.length ? duplicateKey(transaction) : null;
    const duplicate = key ? seen.has(key) : false;
    if (key) seen.add(key);

    return {
      rowNumber,
      transaction,
      issues,
      duplicate,
      status: issues.length ? 'invalid' : duplicate ? 'duplicate' : 'ready',
      values: {
        date: date ? date.toISOString().slice(0, 10) : dateValue,
        type: type || mappedValue(row, mapping, 'type'),
        amount: amount ?? mappedValue(row, mapping, 'amount'),
        category: category?.name || categoryName,
        subcategory: subcategory?.name || subcategoryName,
        paymentType: paymentType?.name || paymentTypeName,
        description: transaction.description,
      },
    };
  });

  const validDates = prepared
    .filter(({ transaction, issues }) => !issues.length && transaction.date)
    .map(({ transaction }) => transaction.date.getTime());
  if (validDates.length) {
    const start = new Date(Math.min(...validDates));
    start.setUTCHours(0, 0, 0, 0);
    const end = new Date(Math.max(...validDates));
    end.setUTCHours(23, 59, 59, 999);
    const existing = await Transaction.find({
      accountId,
      date: { $gte: start, $lte: end },
      type: { $in: ['expense', 'income'] },
    })
      .select('type amount date categoryId paymentTypeId description')
      .lean();
    const existingKeys = new Set(
      existing.map((transaction) => duplicateKey({ ...transaction, date: new Date(transaction.date) })),
    );

    for (const item of prepared) {
      if (item.status === 'ready' && existingKeys.has(duplicateKey(item.transaction))) {
        item.status = 'duplicate';
        item.duplicate = true;
      }
    }
  }

  return prepared.map(({ rowNumber, transaction, issues, duplicate, status, values }) => ({
    rowNumber,
    status,
    duplicate,
    issues,
    values,
    ...(status === 'ready'
      ? {
          transaction: {
            ...transaction,
            amount: Math.abs(transaction.amount),
          },
        }
      : {}),
  }));
}

export async function previewCsvImport(userId, accountId, rows, mapping) {
  if (!Array.isArray(rows) || !rows.length) {
    throw new ApiError(400, 'CSV must contain at least one data row');
  }
  const results = await prepareImport(userId, accountId, rows, mapping);
  return {
    rows: results,
    summary: {
      total: results.length,
      ready: results.filter(({ status }) => status === 'ready').length,
      duplicates: results.filter(({ status }) => status === 'duplicate').length,
      invalid: results.filter(({ status }) => status === 'invalid').length,
    },
  };
}

export async function importCsvTransactions(userId, accountId, rows, mapping) {
  const preview = await previewCsvImport(userId, accountId, rows, mapping);
  const imported = [];
  const errors = preview.rows
    .filter(({ status }) => status === 'invalid')
    .map(({ rowNumber, issues }) => ({ rowNumber, message: issues.join('; ') }));
  const duplicates = preview.rows
    .filter(({ status }) => status === 'duplicate')
    .map(({ rowNumber }) => rowNumber);
  const readyRows = preview.rows.filter(({ status }) => status === 'ready');

  for (const row of readyRows) {
    try {
      await transactionService.create(userId, accountId, row.transaction);
      imported.push(row.rowNumber);
    } catch (error) {
      logger.error('CSV transaction import failed for row', row.rowNumber, error);
      errors.push({
        rowNumber: row.rowNumber,
        message: error.message || 'Transaction could not be imported',
      });
    }
  }

  return {
    imported: imported.length,
    skippedDuplicates: duplicates.length,
    failed: errors.length,
    importedRows: imported,
    duplicateRows: duplicates,
    errors,
  };
}
