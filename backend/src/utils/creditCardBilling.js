export function getStatementClosingDate(year, month, closingDay) {
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return new Date(Date.UTC(year, month, Math.min(closingDay, lastDay), 23, 59, 59, 999));
}

export function getClosedStatementPeriods(
  createdAt,
  closingDay,
  dueDaysAfterClose,
  asOf = new Date(),
) {
  const created = new Date(createdAt);
  const now = new Date(asOf);
  const periods = [];

  for (
    let year = created.getUTCFullYear(), month = created.getUTCMonth();
    year < now.getUTCFullYear() || (year === now.getUTCFullYear() && month <= now.getUTCMonth());
    month += 1
  ) {
    if (month > 11) {
      year += 1;
      month = 0;
    }

    const periodEnd = getStatementClosingDate(year, month, closingDay);
    if (periodEnd < created || periodEnd >= now) continue;

    const periodStart = periods.length
      ? new Date(periods[periods.length - 1].periodEnd.getTime() + 1)
      : created;

    periods.push({
      periodStart,
      periodEnd,
      dueDate: new Date(
        Date.UTC(year, month, periodEnd.getUTCDate() + dueDaysAfterClose, 23, 59, 59, 999),
      ),
    });
  }

  return periods;
}

export function applyCreditCardTransaction(balance, type, amount) {
  const magnitude = Math.abs(amount);
  if (type === 'expense' || type === 'transfer-out') return balance + magnitude;
  if (type === 'income' || type === 'transfer-in') return balance - magnitude;
  return balance;
}
