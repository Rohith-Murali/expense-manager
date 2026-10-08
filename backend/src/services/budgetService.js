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

function categoryBudgetIdentity(budget) {
  const categoryId = String(budget.category?._id || budget.category);
  const subcategoryId = budget.subcategory?._id || budget.subcategory;
  return `${categoryId}:${subcategoryId ? String(subcategoryId) : 'parent'}`;
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
      hasExplicitBudget: false,
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

async function getSubcategoryBudgetTotal(userId, categoryId, year, month, excludeBudgetId = null) {
  const match = {
    userId,
    category: categoryId,
    year,
    month,
    isDeleted: false,
    subcategory: { $ne: null },
  };

  if (excludeBudgetId) match._id = { $ne: new mongoose.Types.ObjectId(excludeBudgetId) };

  const budgets = await CategoryBudget.find(match, { amount: 1 }).lean();
  return budgets.reduce((sum, budget) => sum + Number(budget.amount || 0), 0);
}

async function hasSubcategoryBudgets(userId, categoryId, year, month) {
  return Boolean(
    await CategoryBudget.exists({
      userId,
      category: categoryId,
      year,
      month,
      isDeleted: false,
      subcategory: { $ne: null },
    }),
  );
}

async function validateSubcategoryBudgetsWithinParent(
  userId,
  categoryId,
  year,
  month,
  proposedChildAmount,
  excludeBudgetId = null,
) {
  const parentBudget = await CategoryBudget.findOne(
    parentBudgetMatch(userId, categoryId, year, month),
  ).lean();

  if (!parentBudget) {
    throw new ApiError(400, 'Please set a category budget before creating subcategory budgets');
  }

  const currentChildTotal = await getSubcategoryBudgetTotal(
    userId,
    categoryId,
    year,
    month,
    excludeBudgetId,
  );
  const proposedChildTotal = currentChildTotal + Number(proposedChildAmount || 0);

  if (proposedChildTotal > Number(parentBudget.amount || 0)) {
    throw new ApiError(
      400,
      `Subcategory budgets (${proposedChildTotal}) exceed category budget (${parentBudget.amount})`,
    );
  }
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

  const match = {
    userId,
    category: { $in: categoryIds },
    year,
    month,
    isDeleted: false,
    $or: [{ subcategory: { $exists: false } }, { subcategory: null }],
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

  const subcategoryId = data.subcategory || null;
  if (subcategoryId) {
    await assertSubcategoryBelongsToCategory(subcategoryId, data.category, accountId);
    await validateSubcategoryBudgetsWithinParent(
      userId,
      data.category,
      data.year,
      data.month,
      data.amount,
    );
  } else {
    await validateCategoryBudgetsNotExceedTotal(
      accountId,
      userId,
      data.year,
      data.month,
      data.amount,
    );
  }

  const budgetData = {
    ...data,
    userId,
    subcategory: subcategoryId,
  };

  const budget = new CategoryBudget(budgetData);

  const saved = await budget.save();

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
  const periods = await CategoryBudget.aggregate([
    {
      $match: {
        userId,
        category: { $in: categoryIds },
        isDeleted: false,
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
  const targetByIdentity = new Map(
    targetBudgets.map((budget) => [categoryBudgetIdentity(budget), budget]),
  );
  const sourceByIdentity = new Map(
    sourceBudgets.map((budget) => [categoryBudgetIdentity(budget), budget]),
  );
  const proposedBudgets = new Map(targetByIdentity);
  if (overwrite) proposedBudgets.clear();
  for (const sourceBudget of sourceBudgets) {
    proposedBudgets.set(categoryBudgetIdentity(sourceBudget), sourceBudget);
  }
  const proposedBudgetList = [...proposedBudgets.values()];
  const proposedTotal = proposedBudgetList.reduce(
    (sum, budget) => sum + (!budget.subcategory ? Number(budget.amount || 0) : 0),
    0,
  );

  if ((targetMonthlyBudget || targetBudgets.length > 0) && !overwrite) {
    const categoryNames = await Category.find(
      { _id: { $in: targetBudgets.map((budget) => budget.category) } },
      { _id: 1, name: 1 },
    ).lean();
    const namesById = new Map(
      categoryNames.map((category) => [String(category._id), category.name]),
    );
    const subcategoryIds = targetBudgets
      .filter((budget) => budget.subcategory)
      .map((budget) => budget.subcategory);
    const subcategoryNames = await Subcategory.find(
      { _id: { $in: subcategoryIds } },
      { _id: 1, name: 1 },
    ).lean();
    const subcategoryNamesById = new Map(
      subcategoryNames.map((subcategory) => [String(subcategory._id), subcategory.name]),
    );

    return {
      requiresRewrite: true,
      overlappingCategories: targetBudgets.map((targetBudget) => {
        const subcategoryId = targetBudget.subcategory
          ? String(targetBudget.subcategory)
          : null;
        const replacementBudget = sourceByIdentity.get(categoryBudgetIdentity(targetBudget));
        return {
          budgetKey: categoryBudgetIdentity(targetBudget),
          categoryId: targetBudget.category,
          categoryName: namesById.get(String(targetBudget.category)) || 'Category',
          subcategoryName: subcategoryId
            ? subcategoryNamesById.get(subcategoryId) || 'Subcategory'
            : null,
          currentAmount: Number(targetBudget.amount || 0),
          replacementAmount: Number(replacementBudget?.amount || 0),
        };
      }),
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

  const parentAmounts = new Map(
    proposedBudgetList
      .filter((budget) => !budget.subcategory)
      .map((budget) => [String(budget.category), Number(budget.amount || 0)]),
  );
  const childTotals = new Map();
  for (const budget of proposedBudgetList) {
    if (!budget.subcategory) continue;
    const categoryId = String(budget.category);
    childTotals.set(
      categoryId,
      (childTotals.get(categoryId) || 0) + Number(budget.amount || 0),
    );
  }
  for (const [categoryId, childTotal] of childTotals) {
    const parentAmount = parentAmounts.get(categoryId);
    if (parentAmount === undefined || childTotal > parentAmount) {
      throw new ApiError(
        400,
        'Copied subcategory budgets must have a category budget and fit within it',
      );
    }
  }

  const operations = sourceBudgets.map((sourceBudget) => ({
    updateOne: {
      filter: {
        userId,
        category: sourceBudget.category,
        subcategory: sourceBudget.subcategory || null,
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
          subcategory: sourceBudget.subcategory || null,
          month: targetMonth,
          year: targetYear,
        },
      },
      upsert: true,
    },
  }));

  if (overwrite) {
    for (const targetBudget of targetBudgets) {
      if (sourceByIdentity.has(categoryBudgetIdentity(targetBudget))) continue;
      operations.push({
        updateOne: {
          filter: { _id: targetBudget._id, userId, isDeleted: false },
          update: { $set: { isDeleted: true } },
        },
      });
    }
  }

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

  if (budget.subcategory) {
    await validateSubcategoryBudgetsWithinParent(
      userId,
      targetCategory,
      targetYear,
      targetMonth,
      targetAmount,
      id,
    );
  } else {
    const identityChanged =
      String(targetCategory) !== String(budget.category) ||
      targetYear !== budget.year ||
      targetMonth !== budget.month;
    const hasCurrentChildren = await hasSubcategoryBudgets(
      userId,
      budget.category,
      budget.year,
      budget.month,
    );

    if (identityChanged && hasCurrentChildren) {
      throw new ApiError(400, 'Remove subcategory budgets before moving this category budget');
    }
    const currentChildTotal = await getSubcategoryBudgetTotal(
      userId,
      budget.category,
      budget.year,
      budget.month,
    );
    if (targetAmount < currentChildTotal) {
      throw new ApiError(
        400,
        `Category budget (${targetAmount}) cannot be less than subcategory budgets (${currentChildTotal})`,
      );
    }
    await validateCategoryBudgetsNotExceedTotal(
      accountId,
      userId,
      targetYear,
      targetMonth,
      targetAmount,
      id,
    );
  }

  const updated = await CategoryBudget.findOneAndUpdate({ _id: id, userId }, data, {
    new: true,
    runValidators: true,
  });
  if (!updated) throw new ApiError(404, 'Budget not found');

  logger.info('[budgetService] update');
  return updated;
}

export async function softDelete(userId, id, accountId) {
  const budget = await getById(userId, id, accountId);

  if (!budget.subcategory) {
    const hasChildren = await hasSubcategoryBudgets(
      userId,
      budget.category,
      budget.year,
      budget.month,
    );
    if (hasChildren) {
      throw new ApiError(400, 'Remove subcategory budgets before deleting the category budget');
    }
  }

  const deleted = await CategoryBudget.findOneAndUpdate(
    { _id: id, userId },
    { isDeleted: true },
    { new: true },
  );
  if (!deleted) throw new ApiError(404, 'Budget not found');

  logger.info('[budgetService] softDelete');
  return deleted;
}
