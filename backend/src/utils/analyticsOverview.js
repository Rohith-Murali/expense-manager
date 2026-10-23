const toAmount = (value) => Math.abs(Number(value) || 0);
const toCount = (value) => Number(value) || 0;
const round = (value) => Number(value.toFixed(2));

function createTotals() {
  return {
    income: { total: 0, count: 0 },
    expense: { total: 0, count: 0 },
    savings: { contributions: 0, withdrawals: 0, net: 0 },
  };
}

function applyTransactionTotals(totals, categoryRows, period) {
  for (const row of categoryRows) {
    if (row._id.period !== period || !totals[row._id.type]) continue;
    totals[row._id.type].total += toAmount(row.total);
    totals[row._id.type].count += toCount(row.count);
  }
}

function applySavingsTotals(totals, savingsRows, period) {
  for (const row of savingsRows) {
    if (row._id.period !== period) continue;
    const amount = toAmount(row.total);
    if (row._id.type === 'contribution') totals.savings.contributions += amount;
    if (row._id.type === 'withdrawal') totals.savings.withdrawals += amount;
  }
  totals.savings.net = totals.savings.contributions - totals.savings.withdrawals;
}

function categoryChange(total, previousTotal) {
  return {
    changeAmount: round(total - previousTotal),
    changePercent:
      previousTotal > 0 ? round(((total - previousTotal) / previousTotal) * 100) : null,
  };
}

function buildCategories(categoryRows, budgets) {
  const categoriesByKey = new Map();
  for (const row of categoryRows) {
    const categoryId = String(row._id.categoryId);
    const key = `${row._id.type}:${categoryId}`;
    const category = categoriesByKey.get(key) || {
      categoryId,
      categoryName: row.categoryData?.name || 'Uncategorized',
      categoryType: row._id.type,
      categoryIcon: row.categoryData?.icon || null,
      categoryColor: row.categoryData?.color || null,
      total: 0,
      previousTotal: 0,
      count: 0,
      previousCount: 0,
      subcategoriesById: new Map(),
    };
    const isCurrent = row._id.period === 'current';
    const amount = toAmount(row.total);
    if (isCurrent) {
      category.total += amount;
      category.count += toCount(row.count);
    } else {
      category.previousTotal += amount;
      category.previousCount += toCount(row.count);
    }

    if (row._id.subcategoryId) {
      const subcategoryId = String(row._id.subcategoryId);
      const subcategory = category.subcategoriesById.get(subcategoryId) || {
        subcategoryId,
        subcategoryName: row.subcategoryData?.name || 'Other',
        total: 0,
        previousTotal: 0,
        count: 0,
        previousCount: 0,
      };
      if (isCurrent) {
        subcategory.total += amount;
        subcategory.count += toCount(row.count);
      } else {
        subcategory.previousTotal += amount;
        subcategory.previousCount += toCount(row.count);
      }
      category.subcategoriesById.set(subcategoryId, subcategory);
    }
    categoriesByKey.set(key, category);
  }

  const budgetsByCategory = new Map(budgets.map((budget) => [String(budget._id), budget]));
  for (const budget of budgets) {
    const categoryId = String(budget._id);
    const key = `expense:${categoryId}`;
    if (!categoriesByKey.has(key)) {
      categoriesByKey.set(key, {
        categoryId,
        categoryName: budget.name || 'Category',
        categoryType: 'expense',
        categoryIcon: budget.icon || null,
        categoryColor: budget.color || null,
        total: 0,
        previousTotal: 0,
        count: 0,
        previousCount: 0,
        subcategoriesById: new Map(),
      });
    }
  }

  return [...categoriesByKey.values()]
    .map((category) => {
      const budget = budgetsByCategory.get(category.categoryId);
      const hasExplicitBudget = Boolean(budget?.hasExplicitBudget);
      const budgetAmount = hasExplicitBudget
        ? Number(budget.amount || 0)
        : Number(budget?.subcategoryTotal || 0);
      const subcategories = new Map(category.subcategoriesById);
      for (const subcategoryBudget of budget?.subcategories || []) {
        const subcategoryId = String(subcategoryBudget._id);
        const subcategory = subcategories.get(subcategoryId) || {
          subcategoryId,
          subcategoryName: subcategoryBudget.name || 'Subcategory',
          total: 0,
          previousTotal: 0,
          count: 0,
          previousCount: 0,
        };
        subcategory.budgetAmount = Number(subcategoryBudget.amount || 0);
        subcategories.set(subcategoryId, subcategory);
      }

      const normalizedSubcategories = [...subcategories.values()]
        .map((subcategory) => ({
          ...subcategory,
          ...categoryChange(subcategory.total, subcategory.previousTotal),
          remaining:
            subcategory.budgetAmount === undefined
              ? null
              : round(subcategory.budgetAmount - subcategory.total),
          percentUsed:
            subcategory.budgetAmount > 0
              ? round((subcategory.total / subcategory.budgetAmount) * 100)
              : null,
        }))
        .sort((a, b) => b.total - a.total);

      return {
        categoryId: category.categoryId,
        categoryName: category.categoryName,
        categoryType: category.categoryType,
        categoryIcon: category.categoryIcon,
        categoryColor: category.categoryColor,
        total: round(category.total),
        previousTotal: round(category.previousTotal),
        count: category.count,
        previousCount: category.previousCount,
        ...categoryChange(category.total, category.previousTotal),
        budgetAmount: category.categoryType === 'expense' && budgetAmount > 0 ? budgetAmount : null,
        remaining:
          category.categoryType === 'expense' && budgetAmount > 0
            ? round(budgetAmount - category.total)
            : null,
        percentUsed:
          category.categoryType === 'expense' && budgetAmount > 0
            ? round((category.total / budgetAmount) * 100)
            : null,
        subcategories: normalizedSubcategories,
      };
    })
    .sort((a, b) => b.total - a.total);
}

function buildInsights(categories, summary, comparison, periodType, accountId) {
  const insights = [];
  for (const category of categories) {
    if (category.categoryType !== 'expense' || !category.budgetAmount) continue;
    if (category.remaining < 0) {
      insights.push({
        id: `over-budget-${category.categoryId}`,
        kind: 'warning',
        title: `${category.categoryName} is over budget`,
        detail: `You are ${Math.abs(category.remaining).toFixed(2)} over this month's budget.`,
        categoryId: category.categoryId,
        action: 'budget',
        actionLabel: 'Review budget',
      });
    } else if (category.percentUsed >= 80) {
      insights.push({
        id: `near-budget-${category.categoryId}`,
        kind: 'warning',
        title: `${category.categoryName} is near its budget`,
        detail: `${category.percentUsed}% of the monthly budget has been used.`,
        categoryId: category.categoryId,
        action: 'category',
        actionLabel: 'Review spending',
      });
    }

    for (const subcategory of category.subcategories) {
      if (!subcategory.budgetAmount) continue;
      if (subcategory.remaining < 0) {
        insights.push({
          id: `over-budget-${category.categoryId}-${subcategory.subcategoryId}`,
          kind: 'warning',
          title: `${subcategory.subcategoryName} is over budget`,
          detail: `You are ${Math.abs(subcategory.remaining).toFixed(2)} over its monthly budget.`,
          categoryId: category.categoryId,
          action: 'budget',
          actionLabel: 'Review budget',
        });
      } else if (subcategory.percentUsed >= 80) {
        insights.push({
          id: `near-budget-${category.categoryId}-${subcategory.subcategoryId}`,
          kind: 'warning',
          title: `${subcategory.subcategoryName} is near its budget`,
          detail: `${subcategory.percentUsed}% of its monthly budget has been used.`,
          categoryId: category.categoryId,
          action: 'category',
          actionLabel: 'Review spending',
        });
      }
    }
  }

  const increases = categories
    .filter(
      (category) =>
        category.categoryType === 'expense' &&
        category.previousTotal > 0 &&
        category.changePercent >= 20 &&
        category.changeAmount >= 100,
    )
    .sort((a, b) => b.changeAmount - a.changeAmount);
  for (const category of increases.slice(0, 2)) {
    insights.push({
      id: `spending-increase-${category.categoryId}`,
      kind: 'info',
      title: `Spending rose in ${category.categoryName}`,
      detail: `${category.changePercent}% higher than the previous period.`,
      categoryId: category.categoryId,
      action: 'category',
      actionLabel: 'Review transactions',
    });
  }

  if (summary.savings.net < comparison.savings.net && comparison.savings.net > 0) {
    insights.push({
      id: 'savings-decreased',
      kind: 'info',
      title: 'Recorded savings are lower',
      detail: 'Net contributions were lower than in the previous period.',
      action: 'savings',
      actionLabel: 'Review savings',
    });
  }

  const largestUnbudgetedCategory =
    periodType === 'month' &&
    categories.find(
      (category) =>
        category.categoryType === 'expense' &&
        category.total > 0 &&
        category.budgetAmount === null,
    );
  if (largestUnbudgetedCategory) {
    insights.push({
      id: `create-budget-${largestUnbudgetedCategory.categoryId}`,
      kind: 'info',
      title: `Plan for ${largestUnbudgetedCategory.categoryName}`,
      detail: 'Set a monthly category budget to track this spending against a target.',
      categoryId: largestUnbudgetedCategory.categoryId,
      action: 'budget',
      actionLabel: 'Set a budget',
    });
  }

  if (summary.income.total === 0 && summary.expense.total === 0 && summary.savings.net === 0) {
    return [];
  }

  return insights.slice(0, 5).map((insight) => ({
    ...insight,
    accountId: String(accountId),
  }));
}

export function buildAnalyticsOverview({
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
}) {
  const summary = createTotals();
  const comparison = createTotals();
  applyTransactionTotals(summary, categoryRows, 'current');
  applySavingsTotals(summary, savingsRows, 'current');
  applyTransactionTotals(comparison, categoryRows, 'comparison');
  applySavingsTotals(comparison, savingsRows, 'comparison');
  summary.netCashflow = round(summary.income.total - summary.expense.total);
  comparison.netCashflow = round(comparison.income.total - comparison.expense.total);

  const trendByPeriod = new Map();
  for (const row of [...trendRows, ...savingsRows]) {
    const { period, date, type } = row._id;
    const key = `${period}:${date}`;
    const point = trendByPeriod.get(key) || {
      period,
      date,
      income: 0,
      expense: 0,
      savings: 0,
    };
    const amount = toAmount(row.total);
    if (type === 'income' || type === 'expense') point[type] += amount;
    if (type === 'contribution') point.savings += amount;
    if (type === 'withdrawal') point.savings -= amount;
    trendByPeriod.set(key, point);
  }

  const categories = buildCategories(categoryRows, budgets);
  return {
    period: {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      comparisonStartDate: comparisonStartDate.toISOString(),
      comparisonEndDate: comparisonEndDate.toISOString(),
      type: periodType,
    },
    summary,
    comparison,
    trends: [...trendByPeriod.values()].sort(
      (a, b) => a.date.localeCompare(b.date) || a.period.localeCompare(b.period),
    ),
    categories,
    insights: buildInsights(categories, summary, comparison, periodType, accountId),
  };
}
