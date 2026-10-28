function getUsage(total, budgetAmount, hasBudget) {
  return {
    budgetAmount,
    remaining: hasBudget ? budgetAmount - total : null,
    percentUsed:
      hasBudget && budgetAmount > 0
        ? Number(((total / budgetAmount) * 100).toFixed(2))
        : null,
  };
}

export function resolveBudgetPeriod(startDate, endDate, budgetMonth, budgetYear, now = new Date()) {
  if (budgetMonth !== undefined && budgetYear !== undefined) {
    return { month: budgetMonth, year: budgetYear };
  }

  let referenceDate = now;
  if (startDate && endDate) {
    const midpoint = (new Date(startDate).getTime() + new Date(endDate).getTime()) / 2;
    referenceDate = new Date(midpoint);
  } else if (startDate || endDate) {
    referenceDate = new Date(startDate || endDate);
  }

  return {
    month: referenceDate.getMonth() + 1,
    year: referenceDate.getFullYear(),
  };
}

export function buildCategoryAnalytics(analytics, budgetRows = []) {
  const budgetsByCategory = new Map(budgetRows.map((row) => [String(row._id), row]));
  const categoriesById = new Map();

  for (const item of analytics) {
    const category = item.categoryData;
    const categoryId = String(category._id);
    const entry = categoriesById.get(categoryId) || {
      category,
      total: 0,
      count: 0,
      subcategoriesById: new Map(),
    };
    entry.total += Number(item.total) || 0;
    entry.count += Number(item.count) || 0;

    if (item.subcategoryData?._id) {
      const subcategoryId = String(item.subcategoryData._id);
      const subcategory =
        entry.subcategoriesById.get(subcategoryId) || {
          data: item.subcategoryData,
          total: 0,
          count: 0,
        };
      subcategory.total += Number(item.total) || 0;
      subcategory.count += Number(item.count) || 0;
      entry.subcategoriesById.set(subcategoryId, subcategory);
    }

    categoriesById.set(categoryId, entry);
  }

  const normalized = [...categoriesById.entries()].map(([categoryId, item]) => {
    const total = Math.abs(item.total);
    const budget = budgetsByCategory.get(categoryId);
    const hasExplicitBudget = Boolean(budget?.hasExplicitBudget);
    const budgetAmount = hasExplicitBudget
      ? Number(budget.amount || 0)
      : Number(budget?.subcategoryTotal || 0);
    const hasBudget = hasExplicitBudget || budgetAmount > 0;
    const subcategoriesById = new Map(item.subcategoriesById);

    for (const subcategoryBudget of budget?.subcategories || []) {
      const subcategoryId = String(subcategoryBudget._id);
      const subcategory = subcategoriesById.get(subcategoryId) || {
        data: subcategoryBudget,
        total: 0,
        count: 0,
      };
      subcategory.budget = subcategoryBudget;
      subcategoriesById.set(subcategoryId, subcategory);
    }

    const subcategories = [...subcategoriesById.entries()]
      .map(([subcategoryId, subcategory]) => {
        const subcategoryTotal = Math.abs(subcategory.total);
        const hasSubcategoryBudget = Boolean(subcategory.budget?.budgetId);
        const subcategoryBudgetAmount = hasSubcategoryBudget
          ? Number(subcategory.budget.amount || 0)
          : 0;
        return {
          subcategoryId,
          subcategoryName: subcategory.data.name,
          total: subcategoryTotal,
          ...getUsage(
            subcategoryTotal,
            subcategoryBudgetAmount,
            hasSubcategoryBudget,
          ),
          count: subcategory.count,
          percentage: total > 0 ? ((subcategoryTotal / total) * 100).toFixed(2) : 0,
        };
      })
      .sort((a, b) => b.total - a.total);

    return {
      categoryId,
      categoryName: item.category.name,
      categoryType: item.category.type,
      categoryIcon: item.category.icon,
      categoryColor: item.category.color,
      total,
      ...getUsage(total, budgetAmount, hasBudget),
      subcategories,
      count: item.count,
    };
  });

  normalized.sort((a, b) => b.total - a.total);
  const grandTotal = normalized.reduce((sum, item) => sum + item.total, 0);
  const categories = normalized.map((item) => ({
    ...item,
    percentage: grandTotal > 0 ? ((item.total / grandTotal) * 100).toFixed(2) : 0,
  }));

  return {
    summary: {
      grandTotal,
      totalTransactions: categories.reduce((sum, item) => sum + item.count, 0),
      categoryCount: categories.length,
    },
    categories,
  };
}
