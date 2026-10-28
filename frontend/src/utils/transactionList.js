const getId = (value) => (typeof value === 'string' ? value : value?._id);

const isTransfer = (type) => type === 'transfer' || type === 'transfer-out';

const matchesType = (transaction, type) => {
  if (!type) return true;
  if (isTransfer(type)) {
    return transaction.type === 'transfer-out' || transaction.type === 'transfer-in';
  }
  return transaction.type === type;
};

const matchesMode = (transaction, mode) => {
  if (!mode || mode === 'all') return true;
  if (mode === 'transfer') {
    return transaction.type === 'transfer-out' || transaction.type === 'transfer-in';
  }
  return transaction.type === mode;
};

const dateKey = (date) => {
  const parsedDate = new Date(date);
  return Number.isNaN(parsedDate.getTime()) ? '' : parsedDate.toISOString().slice(0, 10);
};

export const filterAndSortTransactions = ({
  transactions = [],
  searchTerm = '',
  filters = {},
  mode = 'all',
  sortOrder = 'date-desc',
}) => {
  const query = searchTerm.trim().toLowerCase();
  const filtered = transactions.filter((transaction) => {
    if (!matchesMode(transaction, mode) || !matchesType(transaction, filters.type)) return false;

    if (filters.categoryId && getId(transaction.categoryId) !== filters.categoryId) return false;
    if (filters.paymentTypeId && getId(transaction.paymentTypeId) !== filters.paymentTypeId) {
      return false;
    }

    if (query) {
      const searchableValues = [
        transaction.description,
        transaction.categoryId?.name,
        transaction.subcategoryId?.name,
        transaction.paymentTypeId?.name,
        transaction.__accountName,
        transaction.amount,
      ];
      if (!searchableValues.some((value) => String(value ?? '').toLowerCase().includes(query))) {
        return false;
      }
    }

    const transactionDate = dateKey(transaction.date);
    if (filters.startDate && (!transactionDate || transactionDate < filters.startDate)) return false;
    if (filters.endDate && (!transactionDate || transactionDate > filters.endDate)) return false;

    const amount = Math.abs(Number(transaction.amount));
    if (filters.minAmount !== '' && amount < Number(filters.minAmount)) return false;
    if (filters.maxAmount !== '' && amount > Number(filters.maxAmount)) return false;

    return true;
  });

  const sortDirection = sortOrder.endsWith('asc') ? 1 : -1;
  if (sortOrder.startsWith('amount')) {
    filtered.sort(
      (a, b) => (Math.abs(Number(a.amount)) - Math.abs(Number(b.amount))) * sortDirection,
    );
  } else {
    filtered.sort(
      (a, b) => (new Date(a.date).getTime() - new Date(b.date).getTime()) * sortDirection,
    );
  }

  return filtered;
};
