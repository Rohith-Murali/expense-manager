import React, { useEffect, useMemo, useState } from 'react';
import { Filter, Search, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import TransactionCard from '../components/TransactionCard';
import accountService from '../services/accountService';
import { getTransactions } from '../services/transactionService';
import AllAccountsFilterModal from '../components/AllAccountsFilterModal';
import logger from '../utils/logger';

const MODE_TO_TITLE = {
  all: 'All Transactions',
  expense: 'Expenses',
  income: 'Income',
  transfer: 'Transfers',
};

function normalizeMode(mode) {
  if (mode === 'expenses') return 'expense';
  if (mode === 'incomes') return 'income';
  if (mode === 'transfers') return 'transfer';
  return mode || 'all';
}

function matchesMode(transaction, mode) {
  if (!mode || mode === 'all') return true;
  if (mode === 'transfer')
    return transaction.type === 'transfer-out' || transaction.type === 'transfer-in';
  return transaction.type === mode;
}

const AllAccountsTransactions = ({ mode = 'all' }) => {
  const navigate = useNavigate();
  const normalizedMode = useMemo(() => normalizeMode(mode), [mode]);

  const [transactions, setTransactions] = useState([]);
  const [filteredTransactions, setFilteredTransactions] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    type: normalizedMode === 'all' ? '' : normalizedMode,
    startDate: '',
    endDate: '',
    minAmount: '',
    maxAmount: '',
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setFilters((prev) => ({
      ...prev,
      type: normalizedMode === 'all' ? prev.type : normalizedMode,
    }));
  }, [normalizedMode]);

  useEffect(() => {
    fetchAllTransactions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    applyFilters();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transactions, searchTerm, filters, normalizedMode]);

  const fetchAllTransactions = async () => {
    try {
      setLoading(true);
      const accountsResponse = await accountService.getAccounts(false);
      const accounts = Array.isArray(accountsResponse)
        ? accountsResponse
        : accountsResponse?.data || [];

      if (!accounts.length) {
        setTransactions([]);
        return;
      }

      const txLists = await Promise.all(
        accounts.map(async (acc) => {
          try {
            const list = await getTransactions(acc._id, { limit: 1000 });
            const transactionsArr = Array.isArray(list) ? list : list?.data || [];
            return (transactionsArr || []).map((t) => ({
              ...t,
              __accountId: acc._id,
              __accountName: acc.name,
            }));
          } catch (e) {
            logger.error('Error fetching transactions for account:', acc?._id, e);
            return [];
          }
        }),
      );

      const merged = txLists.flat();
      merged.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setTransactions(merged);
    } catch (error) {
      logger.error('Error fetching all accounts transactions:', error);
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...transactions];

    filtered = filtered.filter((t) => matchesMode(t, normalizedMode));

    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (t) =>
          t.description?.toLowerCase().includes(q) ||
          t.categoryId?.name?.toLowerCase().includes(q) ||
          t.__accountName?.toLowerCase().includes(q),
      );
    }

    if (filters.type) {
      if (filters.type === 'transfer') {
        filtered = filtered.filter((t) => t.type === 'transfer-out' || t.type === 'transfer-in');
      } else {
        filtered = filtered.filter((t) => t.type === filters.type);
      }
    }

    if (filters.startDate) {
      filtered = filtered.filter((t) => new Date(t.date) >= new Date(filters.startDate));
    }
    if (filters.endDate) {
      filtered = filtered.filter((t) => new Date(t.date) <= new Date(filters.endDate));
    }

    if (filters.minAmount) {
      filtered = filtered.filter((t) => Math.abs(t.amount) >= parseFloat(filters.minAmount));
    }
    if (filters.maxAmount) {
      filtered = filtered.filter((t) => Math.abs(t.amount) <= parseFloat(filters.maxAmount));
    }

    setFilteredTransactions(filtered);
  };

  const clearFilters = () => {
    setFilters({
      type: normalizedMode === 'all' ? '' : normalizedMode,
      startDate: '',
      endDate: '',
      minAmount: '',
      maxAmount: '',
    });
    setSearchTerm('');
  };

  const activeFilterCount = Object.entries(filters).filter(([k, v]) => {
    if (k === 'type') {
      const base = normalizedMode === 'all' ? '' : normalizedMode;
      return v !== base && v !== '';
    }
    return v !== '';
  }).length;

  const title = MODE_TO_TITLE[normalizedMode] || 'Transactions';

  return (
    <Layout>
      <div className='min-h-screen p-6 bg-gray-50 text-gray-800'>
        <header className='flex items-center justify-between gap-4 mb-4'>
          <h1 className='text-2xl font-semibold'>{title}</h1>
          <button
            className='inline-flex items-center gap-2 bg-white border px-3 py-2 rounded hover:shadow'
            onClick={() => setShowFilters(true)}
          >
            <Filter size={20} />
            Filters
            {activeFilterCount > 0 && (
              <span className='ml-2 inline-flex items-center justify-center bg-indigo-600 text-white text-xs px-2 py-0.5 rounded'>
                {activeFilterCount}
              </span>
            )}
          </button>
        </header>

        <div className='flex items-center justify-between gap-4 mb-4'>
          <div className='flex items-center gap-3 bg-white border rounded px-3 py-2 shadow-sm w-full max-w-xl'>
            <Search size={20} />
            <input
              type='text'
              placeholder={`Search ${title.toLowerCase()}...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className='w-full outline-none'
            />
          </div>

          {activeFilterCount > 0 && (
            <button
              className='inline-flex items-center gap-2 text-sm text-gray-600'
              onClick={clearFilters}
            >
              <X size={16} />
              Clear
            </button>
          )}
        </div>

        <div className='text-sm text-gray-600 mb-3'>
          {filteredTransactions.length} transactions found
        </div>

        {loading ? (
          <div className='text-center text-gray-500'>Loading...</div>
        ) : filteredTransactions.length === 0 ? (
          <div className='text-center text-gray-500'>No transactions found</div>
        ) : (
          <div className='space-y-3'>
            {filteredTransactions.map((transaction) => (
              <TransactionCard
                key={`${transaction.__accountId || 'acc'}-${transaction._id}`}
                transaction={transaction}
                onClick={() => {
                  const accId =
                    transaction.__accountId || transaction.accountId?._id || transaction.accountId;
                  if (!accId) return;
                  navigate(`/accounts/${accId}/transaction/${transaction._id}`);
                }}
              />
            ))}
          </div>
        )}

        {showFilters && (
          <AllAccountsFilterModal
            filters={filters}
            onApply={setFilters}
            onClose={() => setShowFilters(false)}
            showType={normalizedMode === 'all'}
          />
        )}
      </div>
    </Layout>
  );
};

export default AllAccountsTransactions;
