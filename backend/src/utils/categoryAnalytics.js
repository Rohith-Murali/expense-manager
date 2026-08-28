export function buildCategoryAnalytics(analytics) {
  const normalized = analytics.map((item) => ({
    ...item,
    total: Math.abs(Number(item.total) || 0),
  }));

  const grandTotal = normalized.reduce((sum, item) => sum + item.total, 0);

  const categories = normalized.map((item) => ({
    categoryId: item._id,
    categoryName: item.categoryData.name,
    categoryType: item.categoryData.type,
    categoryIcon: item.categoryData.icon,
    categoryColor: item.categoryData.color,
    total: item.total,
    budgetAmount: item.budgetData ? item.budgetData.amount : 0,
    remaining: item.budgetData ? item.budgetData.amount - item.total : null,
    percentUsed:
      item.budgetData && item.budgetData.amount > 0
        ? Number(((item.total / item.budgetData.amount) * 100).toFixed(2))
        : null,
    count: item.count,
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
