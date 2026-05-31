import { CategoryBudget } from '../models/CategoryBudget.js';
import { Account } from '../models/Account.js';
import { Category } from '../models/Category.js';
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

  if (!account.monthlyBudget || account.monthlyBudget <= 0) {
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
  };

  if (excludeBudgetId) match._id = { $ne: excludeBudgetId };

  const res = await CategoryBudget.aggregate([
    { $match: match },
    { $group: { _id: null, total: { $sum: '$amount' } } },
  ]);

  const existingTotal = res && res[0] && res[0].total ? res[0].total : 0;
  const proposed = existingTotal + Number(newAmount || 0);

  if (proposed > account.monthlyBudget) {
    throw new ApiError(
      400,
      `Category budgets (${proposed}) exceed account monthly budget (${account.monthlyBudget})`,
    );
  }
}

export async function create(userId, accountId, data) {
  await assertAccountOwnership(accountId, userId);
  await assertExpenseCategoryBelongsToAccount(data.category, accountId);

  await validateCategoryBudgetsNotExceedTotal(
    accountId,
    userId,
    data.year,
    data.month,
    data.amount,
  );

  const budget = new CategoryBudget({
    ...data,
    userId,
  });

  const saved = await budget.save();
  logger.info('[budgetService] create');
  return saved;
}

export async function getByAccountMonth(userId, accountId, year, month) {
  await assertAccountOwnership(accountId, userId);

  const categoryIds = await getExpenseCategoryIds(accountId);

  const budgets = await CategoryBudget.find({
    userId,
    category: { $in: categoryIds },
    year,
    month,
    isDeleted: false,
  }).populate('category');

  logger.info('[budgetService] getByAccountMonth');

  return budgets;
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

  await validateCategoryBudgetsNotExceedTotal(
    accountId,
    userId,
    data.year || budget.year,
    data.month || budget.month,
    data.amount || budget.amount,
    id,
  );

  const updated = await CategoryBudget.findOneAndUpdate({ _id: id, userId }, data, {
    new: true,
    runValidators: true,
  });
  if (!updated) throw new ApiError(404, 'Budget not found');
  logger.info('[budgetService] update');
  return updated;
}

export async function softDelete(userId, id, accountId) {
  await getById(userId, id, accountId);

  const deleted = await CategoryBudget.findOneAndUpdate(
    { _id: id, userId },
    { isDeleted: true },
    { new: true },
  );
  if (!deleted) throw new ApiError(404, 'Budget not found');
  logger.info('[budgetService] softDelete');
  return deleted;
}
