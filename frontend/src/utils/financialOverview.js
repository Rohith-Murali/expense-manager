export function unwrapResponseData(response) {
  return response?.data?.data ?? response?.data ?? response;
}

function getStatementClosingDate(year, month, closingDay) {
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return new Date(Date.UTC(year, month, Math.min(closingDay, lastDay), 23, 59, 59, 999));
}

export function getNextCreditCardDue(account, summary, referenceDate = new Date()) {
  const today = new Date(
    Date.UTC(referenceDate.getUTCFullYear(), referenceDate.getUTCMonth(), referenceDate.getUTCDate()),
  );
  const statements = (summary?.statements || [])
    .filter((statement) => new Date(statement.dueDate) >= today)
    .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));

  if (statements.length > 0) {
    return {
      dueDate: new Date(statements[0].dueDate),
      amount: Number(statements[0].statementBalance || 0),
      isEstimate: false,
    };
  }

  const closingDay = Number(account.statementClosingDay);
  const paymentDueDays = Number(account.paymentDueDays);
  if (!closingDay || !paymentDueDays) return null;

  const candidates = [];
  for (let offset = -1; offset <= 2; offset += 1) {
    const monthDate = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + offset, 1));
    const closeDate = getStatementClosingDate(
      monthDate.getUTCFullYear(),
      monthDate.getUTCMonth(),
      closingDay,
    );
    const dueDate = new Date(closeDate);
    dueDate.setUTCDate(dueDate.getUTCDate() + paymentDueDays);
    if (dueDate >= today) candidates.push(dueDate);
  }

  candidates.sort((a, b) => a - b);
  return candidates.length
    ? {
        dueDate: candidates[0],
        amount: Number(summary?.outstandingBalance ?? account.currentBalance ?? 0),
        isEstimate: true,
      }
    : null;
}

export function getGoalsLinkedToAccount(goals, entries, accountId) {
  const totals = new Map();
  for (const entry of entries) {
    const entryAccountId = String(entry.accountId?._id || entry.accountId || '');
    if (entryAccountId !== String(accountId)) continue;
    const bucketId = String(entry.bucketId?._id || entry.bucketId || '');
    const linkedGoals = goals.filter(
      (goal) =>
        String(goal._id) === String(entry.goalId?._id || entry.goalId || '') ||
        (goal.bucketId && String(goal.bucketId?._id || goal.bucketId) === bucketId),
    );
    for (const goal of linkedGoals) {
      const goalTotal = totals.get(String(goal._id)) || 0;
      totals.set(
        String(goal._id),
        goalTotal + (entry.type === 'contribution' ? Number(entry.amount) : -Number(entry.amount)),
      );
    }
  }

  return goals
    .filter((goal) => totals.has(String(goal._id)))
    .map((goal) => {
      const currentAmount = Math.max(0, totals.get(String(goal._id)) || 0);
      const targetAmount = Number(goal.targetAmount || 0);
      return {
        ...goal,
        currentAmount,
        remainingAmount: Math.max(targetAmount - currentAmount, 0),
        progressPercent:
          targetAmount > 0 ? Math.min((currentAmount / targetAmount) * 100, 100) : 0,
      };
    });
}
