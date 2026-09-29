import mongoose from 'mongoose';
import { CategoryBudget } from '../models/CategoryBudget.js';
import { MonthlyBudget } from '../models/MonthlyBudget.js';
import { Account } from '../models/Account.js';
import { Category } from '../models/Category.js';
import { Subcategory } from '../models/Subcategory.js';
import { ApiError } from '../utils/ApiError.js';
import { logger } from '../utils/logger.js';

async function assertAccountOwnership(accountId, userId) {
  const account = await Account.findOne({ _id: accountId, userId, isDeleted: false });
  if (!account) {
    throw new ApiError(403, 'Access denied: Account not found or does not belong to you');
  }
  logger.debug('[budgetService] assertAccountOwnership');
  return account;
}

async function assertExpenseCategoryBelongsToAccount(categoryId, accountId) {
  const category = await Category.findOne({
    _id: categoryId,
    accountId,
    isActive: true,
    type: 'expense',
  });
  if (!category) {
    throw new ApiError(400, 'Budgets can only be set for expense categories');
  }
  logger.debug('[budgetService] assertExpenseCategoryBelongsToAccount');
  return category;
}

async function getExpenseCategoryIds(accountId) {
  const categories = await Category.find(
    { accountId, isActive: true, type: 'expense' },
    { _id: 1 },
  ).lean();
  logger.debug('[budgetService] getExpenseCategoryIds');
  return categories.map((c) => c._id);
}

export function parentBudgetMatch(userId, categoryId, year, month) {
  return {
    userId,
    category: categoryId,
    year,
    month,
    isDeleted: false,
    $or: [{ subcategory: { $exists: false } }, { subcategory: null }],
  };
}

export function resolveDefaultSubcategoryId(subcategory, defaultNoneSubcategoryId = null) {
  return subcategory || defaultNoneSubcategoryId || null;
}

async function getDefaultNoneSubcategoryIds(accountId, categoryIds = []) {
  if (!categoryIds.length) return [];

  const subcategories = await Subcategory.find(
    {
      accountId,
      parentCategoryId: { $in: categoryIds },
      name: 'None',
      isActive: { $ne: false },
    },
    { _id: 1 },
  ).lean();

  return subcategories.map((item) => item._id);
}

export function normalizeBudgetHierarchy(categories = [], budgets = []) {
  const categoryMap = new Map();

  for (const category of categories) {
    const key = String(category._id);
    categoryMap.set(key, {
      ...category,
      amount: 0,
      hasExplicitBudget: false,
      subcategoryTotal: 0,
      subcategories: [],
    });
  }

  for (const budget of budgets) {
    const categoryKey = String(budget.category?._id || budget.category);
    const existing = categoryMap.get(categoryKey) || {
      _id: categoryKey,
      name: 'Category',
      amount: 0,
      subcategoryTotal: 0,
      subcategories: [],
    };

    if (budget.subcategory) {
      const subcategoryId = String(budget.subcategory?._id || budget.subcategory);
      existing.subcategories.push({
        ...budget.subcategory,
        ...budget,
        budgetId: budget._id,
        _id: subcategoryId,
        subcategory: subcategoryId,
        amount: Number(budget.amount || 0),
      });
    } else {
      existing.amount = Number(budget.amount || 0);
      existing.budgetId = budget._id;
      existing.hasExplicitBudget = true;
    }

    categoryMap.set(categoryKey, existing);
  }

  for (const row of categoryMap.values()) {
    const childTotal = row.subcategories.reduce(
      (sum, item) => sum + Number(item.amount || 0),
      0,
    );
    row.subcategoryTotal = childTotal;

    // Only use an explicit parent budget if it exists. If no explicit
    // category-level budget was created, keep the category amount as 0.
    row.amount = row.hasExplicitBudget ? Number(row.amount || 0) : 0;
  }

  return [...categoryMap.values()];
}

async function assertSubcategoryBelongsToCategory(subcategoryId, categoryId, accountId) {
  const subcategory = await Subcategory.findOne({
    _id: subcategoryId,
    parentCategoryId: categoryId,
    accountId,
    isActive: true,
  }).lean();

  if (!subcategory) {
    throw new ApiError(400, 'Subcategory does not belong to the selected category');
  }

  return subcategory;
}

async function reconcileCategoryBudgetTotal(userId, accountId, categoryId, year, month) {
  const category = await Category.findOne({ _id: categoryId, accountId, isActive: true, type: 'expense' });
  if (!category) return null;

  const childBudgets = await CategoryBudget.find({
    userId,
    category: categoryId,
    year,
    month,
    isDeleted: false,
    subcategory: { $ne: null },
  }).lean();

  const total = childBudgets.reduce((sum, budget) => sum + Number(budget.amount || 0), 0);
  if (total <= 0) return null;

  const parentBudget = await CategoryBudget.findOneAndUpdate(
    parentBudgetMatch(userId, categoryId, year, month),
    {
      $set: {
        amount: total,
        userId,
        category: categoryId,
        year,
        month,
        isDeleted: false,
        subcategory: null,
      },
    },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true },
  );

  return parentBudget;
}

async function getMonthlyBudgetAmount(account, accountId, userId, year, month) {
  const monthlyBudget = await MonthlyBudget.findOne({ userId, accountId, year, month }).lean();
  return monthlyBudget ? Number(monthlyBudget.amount) : Number(account.monthlyBudget || 0);
}

async function validateCategoryBudgetsNotExceedTotal(
  accountId,
  userId,
  year,
  month,
  newAmount,
  excludeBudgetId = null,
) {
  logger.debug('[budgetService] validateCategoryBudgetsNotExceedTotal');
  const account = await assertAccountOwnership(accountId, userId);

  const monthlyBudget = await getMonthlyBudgetAmount(account, accountId, userId, year, month);

  if (!monthlyBudget || monthlyBudget <= 0) {
    throw new ApiError(
      400,
      'Please set the account total monthly budget before creating category budgets',
    );
  }

  const categoryIds = await getExpenseCategoryIds(accountId);
  const noneSubcategoryIds = await getDefaultNoneSubcategoryIds(accountId, categoryIds);

  const match = {
    userId,
    category: { $in: categoryIds },
    year,
    month,
    isDeleted: false,
    $or: [
      { subcategory: { $exists: false } },
      { subcategory: null },
      ...(noneSubcategoryIds.length ? [{ subcategory: { $in: noneSubcategoryIds } }] : []),
    ],
  };

  if (excludeBudgetId) {
    match._id = { $ne: new mongoose.Types.ObjectId(excludeBudgetId) };
  }

  const res = await CategoryBudget.aggregate([
    { $match: match },
    { $group: { _id: null, total: { $sum: '$amount' } } },
  ]);

  const existingTotal = res && res[0] && res[0].total ? res[0].total : 0;
  const proposed = existingTotal + Number(newAmount || 0);

  if (proposed > monthlyBudget) {
    throw new ApiError(
      400,
      `Category budgets (${proposed}) exceed monthly budget (${monthlyBudget})`,
    );
  }
}

export async function getMonthly(userId, accountId, year, month) {
  const account = await assertAccountOwnership(accountId, userId);
  const monthlyBudget = await MonthlyBudget.findOne({ userId, accountId, year, month }).lean();
  return {
    amount: monthlyBudget ? monthlyBudget.amount : Number(account.monthlyBudget || 0),
    month,
    year,
  };
}

export async function updateMonthly(userId, accountId, data) {
  await assertAccountOwnership(accountId, userId);
  const monthlyBudget = await MonthlyBudget.findOneAndUpdate(
    { userId, accountId, year: data.year, month: data.month },
    { $set: { amount: data.amount } },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true },
  );
  return monthlyBudget;
}

export async function create(userId, accountId, data) {
  await assertAccountOwnership(accountId, userId);
  await assertExpenseCategoryBelongsToAccount(data.category, accountId);

  const defaultNoneSubcategory = await Subcategory.findOne({
    accountId,
    parentCategoryId: data.category,
    name: 'None',
    isActive: { $ne: false },
  }).lean();

  const resolvedSubcategoryId = resolveDefaultSubcategoryId(
    data.subcategory,
    defaultNoneSubcategory?._id || null,
  );
  if (resolvedSubcategoryId) {
    await assertSubcategoryBelongsToCategory(resolvedSubcategoryId, data.category, accountId);
  }

  await validateCategoryBudgetsNotExceedTotal(
    accountId,
    userId,
    data.year,
    data.month,
    data.amount,
  );

  const budgetData = {
    ...data,
    userId,
    subcategory: resolvedSubcategoryId,
  };

  const budget = new CategoryBudget(budgetData);

  const saved = await budget.save();

  if (resolvedSubcategoryId) {
    await reconcileCategoryBudgetTotal(userId, accountId, data.category, data.year, data.month);
  }

  logger.info('[budgetService] create');
  return saved;
}

export async function getByAccountMonth(userId, accountId, year, month) {
  await assertAccountOwnership(accountId, userId);

  const categoryIds = await getExpenseCategoryIds(accountId);
  const categories = await Category.find({
    _id: { $in: categoryIds },
    accountId,
    isActive: true,
    type: 'expense',
  }).lean();

  const budgets = await CategoryBudget.find({
    userId,
    category: { $in: categoryIds },
    year,
    month,
    isDeleted: false,
  })
    .populate('category')
    .populate('subcategory');

  logger.info('[budgetService] getByAccountMonth');

  return normalizeBudgetHierarchy(categories, budgets);
}

export async function getPeriods(userId, accountId) {
  await assertAccountOwnership(accountId, userId);

  const categoryIds = await getExpenseCategoryIds(accountId);
  const noneSubcategoryIds = await getDefaultNoneSubcategoryIds(accountId, categoryIds);
  const periods = await CategoryBudget.aggregate([
    {
      $match: {
        userId,
        category: { $in: categoryIds },
        isDeleted: false,
        $or: [
          { subcategory: { $exists: false } },
          { subcategory: null },
          ...(noneSubcategoryIds.length ? [{ subcategory: { $in: noneSubcategoryIds } }] : []),
        ],
      },
    },
    {
      $group: {
        _id: { year: '$year', month: '$month' },
        count: { $sum: 1 },
      },
    },
    { $sort: { '_id.year': -1, '_id.month': -1 } },
    {
      $project: {
        _id: 0,
        year: '$_id.year',
        month: '$_id.month',
        count: 1,
      },
    },
  ]);

  logger.info('[budgetService] getPeriods');
  return periods;
}

export async function copy(userId, accountId, data) {
  const account = await assertAccountOwnership(accountId, userId);
  const { sourceMonth, sourceYear, targetMonth, targetYear, overwrite = false } = data;

  if (sourceMonth === targetMonth && sourceYear === targetYear) {
    throw new ApiError(400, 'Source and target periods must be different');
  }

  const categoryIds = await getExpenseCategoryIds(accountId);
  const sourceBudgets = await CategoryBudget.find({
    userId,
    category: { $in: categoryIds },
    month: sourceMonth,
    year: sourceYear,
    isDeleted: false,
  }).lean();

  if (sourceBudgets.length === 0) {
    throw new ApiError(404, 'No budgets found for the source period');
  }

  const sourceMonthlyBudget = await getMonthlyBudgetAmount(
    account,
    accountId,
    userId,
    sourceYear,
    sourceMonth,
  );
  if (!sourceMonthlyBudget || sourceMonthlyBudget <= 0) {
    throw new ApiError(400, 'Please set a total monthly budget for the source period');
  }

  const targetBudgets = await CategoryBudget.find({
    userId,
    category: { $in: categoryIds },
    month: targetMonth,
    year: targetYear,
    isDeleted: false,
  }).lean();
  const targetMonthlyBudget = await MonthlyBudget.findOne({
    userId,
    accountId,
    year: targetYear,
    month: targetMonth,
  }).lean();
  const targetByCategory = new Map(
    targetBudgets.map((budget) => [String(budget.category), budget]),
  );
  const sourceByCategory = new Map(
    sourceBudgets.map((budget) => [String(budget.category), budget]),
  );
  const overlappingBudgets = targetBudgets.filter((budget) =>
    sourceByCategory.has(String(budget.category)),
  );

  const targetTotal = targetBudgets.reduce((sum, budget) => {
    return sourceByCategory.has(String(budget.category))
      ? sum + Number(sourceByCategory.get(String(budget.category)).amount || 0)
      : sum + Number(budget.amount || 0);
  }, 0);
  const newSourceTotal = sourceBudgets.reduce((sum, budget) => {
    return targetByCategory.has(String(budget.category)) ? sum : sum + Number(budget.amount || 0);
  }, 0);
  const proposedTotal = targetTotal + newSourceTotal;

  if ((overlappingBudgets.length > 0 || targetMonthlyBudget) && !overwrite) {
    const categoryNames = await Category.find(
      { _id: { $in: overlappingBudgets.map((budget) => budget.category) } },
      { _id: 1, name: 1 },
    ).lean();
    const namesById = new Map(
      categoryNames.map((category) => [String(category._id), category.name]),
    );

    return {
      requiresRewrite: true,
      overlappingCategories: overlappingBudgets.map((targetBudget) => ({
        categoryId: targetBudget.category,
        categoryName: namesById.get(String(targetBudget.category)) || 'Category',
        currentAmount: Number(targetBudget.amount || 0),
        replacementAmount: Number(sourceByCategory.get(String(targetBudget.category)).amount || 0),
      })),
      proposedTotal,
      monthlyBudget: sourceMonthlyBudget,
      currentMonthlyBudget: targetMonthlyBudget?.amount ?? null,
      replacementMonthlyBudget: sourceMonthlyBudget,
      month: targetMonth,
      year: targetYear,
    };
  }

  if (proposedTotal > sourceMonthlyBudget) {
    throw new ApiError(
      400,
      `Category budgets (${proposedTotal}) exceed monthly budget (${sourceMonthlyBudget})`,
    );
  }

  const operations = sourceBudgets.map((sourceBudget) => ({
    updateOne: {
      filter: {
        userId,
        category: sourceBudget.category,
        month: targetMonth,
        year: targetYear,
        isDeleted: false,
      },
      update: {
        $set: {
          amount: sourceBudget.amount,
          rollover: sourceBudget.rollover,
          alertThreshold: sourceBudget.alertThreshold,
        },
        $setOnInsert: {
          userId,
          category: sourceBudget.category,
          month: targetMonth,
          year: targetYear,
        },
      },
      upsert: true,
    },
  }));

  await CategoryBudget.bulkWrite(operations);
  await MonthlyBudget.findOneAndUpdate(
    { userId, accountId, year: targetYear, month: targetMonth },
    { $set: { amount: sourceMonthlyBudget } },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true },
  );
  logger.info('[budgetService] copy');
  return {
    copiedCount: sourceBudgets.length,
    monthlyBudget: sourceMonthlyBudget,
    month: targetMonth,
    year: targetYear,
  };
}

export async function getById(userId, id, accountId) {
  const budget = await CategoryBudget.findOne({ _id: id, userId });
  if (!budget) throw new ApiError(404, 'Budget not found');

  const category = await Category.findOne({ _id: budget.category, accountId });
  if (!category) throw new ApiError(403, 'Access denied: Budget does not belong to this account');

  return budget;
}

export async function update(userId, id, accountId, data) {
  const budget = await getById(userId, id, accountId);

  if (data.category) await assertExpenseCategoryBelongsToAccount(data.category, accountId);
  if (data.subcategory) {
    await assertSubcategoryBelongsToCategory(data.subcategory, data.category || budget.category, accountId);
  }

  const targetCategory = data.category || budget.category;
  const targetMonth = data.month || budget.month;
  const targetYear = data.year || budget.year;
  const targetAmount = data.amount !== undefined ? data.amount : budget.amount;

  await validateCategoryBudgetsNotExceedTotal(
    accountId,
    userId,
    targetYear,
    targetMonth,
    targetAmount,
    id,
  );

  const updated = await CategoryBudget.findOneAndUpdate({ _id: id, userId }, data, {
    new: true,
    runValidators: true,
  });
  if (!updated) throw new ApiError(404, 'Budget not found');

  if (updated.subcategory) {
    await reconcileCategoryBudgetTotal(userId, accountId, targetCategory, targetYear, targetMonth);
  }

  logger.info('[budgetService] update');
  return updated;
}

export async function softDelete(userId, id, accountId) {
  const budget = await getById(userId, id, accountId);

  const deleted = await CategoryBudget.findOneAndUpdate(
    { _id: id, userId },
    { isDeleted: true },
    { new: true },
  );
  if (!deleted) throw new ApiError(404, 'Budget not found');

  if (budget.subcategory) {
    await reconcileCategoryBudgetTotal(userId, accountId, budget.category, budget.year, budget.month);
  }

  logger.info('[budgetService] softDelete');
  return deleted;
}
