export const getSpentForCategory = (analytics = [], categoryId) => {
  if (!categoryId) return 0;

  const item = analytics.find((entry) => String(entry.categoryId || entry._id) === String(categoryId));
  return Number(item?.total || 0);
};

export const getSpentForSubcategory = (monthTransactions = [], categoryId, subcategoryId) => {
  if (!categoryId || !subcategoryId) return 0;

  return monthTransactions.reduce((sum, transaction) => {
    const txCategory = String(transaction.categoryId?._id || transaction.categoryId || '');
    const txSubcategory = String(transaction.subcategoryId?._id || transaction.subcategoryId || '');

    if (String(categoryId) === txCategory && String(subcategoryId) === txSubcategory) {
      return sum + Number(transaction.amount || 0);
    }

    return sum;
  }, 0);
};

const buildNormalizedBudgetRow = (budget) => {
  const categoryId = String(budget.category?._id || budget.category || budget._id || budget.categoryId || '');
  const hasExplicitBudget =
    budget.hasExplicitBudget !== undefined
      ? Boolean(budget.hasExplicitBudget)
      : Boolean(budget.budgetId || Number(budget.amount || 0) > 0);

  if (!categoryId || categoryId === 'undefined') {
    return null;
  }

  return {
    ...budget,
    category: budget.category || {
      _id: budget._id,
      name: budget.name,
      icon: budget.icon,
      type: budget.type,
    },
    amount: Number(budget.amount || 0),
    hasExplicitBudget,
    subcategories: Array.isArray(budget.subcategories)
      ? budget.subcategories.map((sub) => ({
          ...sub,
          _id: String(sub._id || sub.subcategory || ''),
          budgetId: sub.budgetId || sub._id,
          amount: Number(sub.amount || 0),
        }))
      : [],
  };
};

export const buildCategoryRows = (expenseCategories = [], budgets = []) => {
  const budgetsByCategory = new Map();

  for (const budget of budgets || []) {
    const categoryId = String(budget.category?._id || budget.category || budget._id || budget.categoryId || '');
    if (!categoryId || categoryId === 'undefined') continue;

    if (Array.isArray(budget.subcategories) || budget.hasExplicitBudget !== undefined || (!budget.category && budget._id)) {
      const normalizedRow = buildNormalizedBudgetRow(budget);
      if (normalizedRow) {
        budgetsByCategory.set(categoryId, normalizedRow);
      }
      continue;
    }

    const existing = budgetsByCategory.get(categoryId) || {
      category: budget.category || categoryId,
      amount: 0,
      hasExplicitBudget: false,
      subcategories: [],
    };

    if (budget.subcategory) {
      const subId = String(budget.subcategory?._id || budget.subcategory);
      existing.subcategories = existing.subcategories || [];
      existing.subcategories.push({
        ...budget.subcategory,
        ...budget,
        budgetId: budget._id,
        _id: subId,
        subcategory: subId,
        amount: Number(budget.amount || 0),
      });
    } else {
      existing.amount = Number(budget.amount || 0);
      existing.budgetId = budget._id;
      existing.hasExplicitBudget = true;
    }

    budgetsByCategory.set(categoryId, existing);
  }

  return expenseCategories.map((category) => {
    const key = String(category._id);
    const row = budgetsByCategory.get(key) || {
      category,
      amount: 0,
      hasExplicitBudget: false,
      subcategories: [],
    };

    const baseSubcategories = Array.isArray(category.subcategories) ? category.subcategories : [];
    const rowSubcategories = Array.isArray(row.subcategories) ? row.subcategories : [];

    const mergedSubcategories = baseSubcategories.map((subcategory) => {
      const match = rowSubcategories.find(
        (item) => String(item._id || item.subcategory) === String(subcategory._id),
      );

      return {
        ...subcategory,
        ...match,
        _id: String(subcategory._id || match?._id || match?.subcategory || ''),
        budgetId: match?.budgetId || null,
        name: subcategory.name || match?.name || 'Subcategory',
        amount: Number(match?.amount || 0),
      };
    });

    const extraSubcategories = rowSubcategories
      .filter(
        (item) => !baseSubcategories.some((subcategory) => String(subcategory._id) === String(item._id || item.subcategory)),
      )
      .map((item) => ({
        ...item,
        _id: String(item._id || item.subcategory || ''),
        name: item.name || 'Subcategory',
        amount: Number(item.amount || 0),
        budgetId: item.budgetId || null,
      }));

    const subcategories = [...mergedSubcategories, ...extraSubcategories];
    const childTotal = subcategories.reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const hasExplicitBudget =
      row.hasExplicitBudget !== undefined
        ? Boolean(row.hasExplicitBudget)
        : Boolean(row.budgetId || Number(row.amount || 0) > 0);
    const effectiveAmount = hasExplicitBudget ? Number(row.amount || 0) : 0;

    return {
      ...row,
      category,
      amount: effectiveAmount,
      hasExplicitBudget,
      subcategoryTotal: childTotal,
      subcategories,
    };
  });
};

export const calculateTotalCategoryBudget = (categoryRows = []) =>
  categoryRows.reduce(
    (sum, item) =>
      sum +
      (item.hasExplicitBudget
        ? Number(item.amount || 0)
        : Number(item.subcategoryTotal || 0)),
    0,
  );

export const calculateRemainingBudget = (monthlyBudget, categoryRows = []) =>
  Number(monthlyBudget || 0) - calculateTotalCategoryBudget(categoryRows);

export const getCategoryBudgetRow = (categoryRows = [], categoryId) =>
  categoryRows.find(
    (row) => String(row.category?._id || row.category || row._id) === String(categoryId),
  );

export const getCategoryBudgetAmount = (categoryRows = [], categoryId) => {
  const row = getCategoryBudgetRow(categoryRows, categoryId);
  if (!row) return 0;
  return row.hasExplicitBudget
    ? Number(row.amount || 0)
    : Number(row.subcategoryTotal || 0);
};

export const calculateRemainingCategoryBudget = (categoryRows = [], categoryId, spent = 0) =>
  getCategoryBudgetAmount(categoryRows, categoryId) - Number(spent || 0);

export const calculateCategoryBudgetAfterUpdate = (categoryRows = [], categoryId, amount) =>
  calculateTotalCategoryBudget(categoryRows) -
  getCategoryBudgetAmount(categoryRows, categoryId) +
  Number(amount || 0);

export const hasExplicitCategoryBudget = (categoryRows = [], categoryId) => {
  const row = getCategoryBudgetRow(categoryRows, categoryId);
  return Boolean(row?.hasExplicitBudget || row?.budgetId);
};

export const calculateSubcategoryBudgetTotal = (
  subcategories = [],
  subcategoryId,
  replacementAmount,
) =>
  subcategories.reduce((sum, item) => {
    const itemId = item._id || item.subcategory?._id || item.subcategory;
    if (subcategoryId && String(itemId) === String(subcategoryId)) {
      return sum;
    }
    return sum + Number(item.amount || 0);
  }, 0) + Number(replacementAmount || 0);
