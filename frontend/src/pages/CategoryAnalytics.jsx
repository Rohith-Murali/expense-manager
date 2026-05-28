import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { getCategoryWiseAnalytics } from '../services/transactionService';
import accountService from '../services/accountService';
import budgetService from '../services/budgetService';
import Layout from '../components/layout/Layout';
import { logger } from '../utils/logger';
import { AlertCircle, TrendingUp, Layers, ArrowLeft } from 'lucide-react';

const emptyAnalytics = {
  summary: { grandTotal: 0, totalTransactions: 0, categoryCount: 0 },
  categories: [],
};

const formatINR = (n) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
  }).format(n);

export default function CategoryAnalytics() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [allAccounts, setAllAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [analytics, setAnalytics] = useState(emptyAnalytics);
  const [budgets, setBudgets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [accountsLoading, setAccountsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterType, setFilterType] = useState('all');
  const [viewType, setViewType] = useState('list');
  const [dateRange, setDateRange] = useState('30days');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  useEffect(() => {
    const loadAccounts = async () => {
      try {
        setAccountsLoading(true);
        const res = await accountService.getAccounts(false);
        const accs = Array.isArray(res) ? res : res?.data || [];
        setAllAccounts(accs);
        const accountParam = searchParams.get('account');
        if (accountParam && accs.some((a) => a._id === accountParam)) {
          setSelectedAccount(accountParam);
        } else if (accs.length > 0) {
          setSelectedAccount(accs[0]._id);
        }
      } catch (err) {
        logger.error('Failed to load accounts:', err);
        setError('Failed to load accounts');
      } finally {
        setAccountsLoading(false);
      }
    };
    loadAccounts();
  }, [searchParams]);

  useEffect(() => {
    if (!selectedAccount) return;
    const fetchAnalytics = async () => {
      setLoading(true);
      setError(null);
      try {
        const params = {};
        let startDate;
        let endDate;
        if (dateRange === 'custom') {
          if (!customStartDate || !customEndDate) {
            setError('Please provide both start and end dates for custom range');
            setLoading(false);
            return;
          }
          startDate = customStartDate;
          endDate = customEndDate;
        } else {
          endDate = new Date().toISOString().split('T')[0];
          const start = new Date();
          if (dateRange === '7days') {
            start.setDate(start.getDate() - 7);
          } else if (dateRange === '30days') {
            start.setDate(start.getDate() - 30);
          } else if (dateRange === 'month') {
            start.setDate(1);
          }
          startDate = start.toISOString().split('T')[0];
        }
        params.startDate = startDate;
        params.endDate = endDate;
        if (filterType !== 'all') {
          params.type = filterType;
        }
        const response = await getCategoryWiseAnalytics(selectedAccount, params);
        const analyticsData = response?.categories ? response : emptyAnalytics;
        setAnalytics(analyticsData);
        if (filterType !== 'income') {
          const currentDate = new Date();
          const budgetMonth = currentDate.getMonth() + 1;
          const budgetYear = currentDate.getFullYear();
          const budgetResponse = await budgetService.getBudgets(selectedAccount, {
            month: budgetMonth,
            year: budgetYear,
          });
          setBudgets(Array.isArray(budgetResponse) ? budgetResponse : budgetResponse?.data || []);
        } else {
          setBudgets([]);
        }
        setError(null);
      } catch (err) {
        logger.error('Failed to fetch category analytics:', err);
        setError('Failed to load analytics. Please try again.');
        setAnalytics(emptyAnalytics);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, [selectedAccount, dateRange, customStartDate, customEndDate, filterType]);
  const getBadgeColor = (categoryType) => {
    return categoryType === 'income' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
  };
  const getBudgetForCategory = (categoryId) => {
    const budget = budgets.find(
      (b) => String(b.category?._id || b.category) === String(categoryId),
    );
    return Number(budget?.amount || 0);
  };
  const getRemainingBudget = (categoryId, spent) => {
    return getBudgetForCategory(categoryId) - spent;
  };
  const showBudgetColumns = filterType !== 'income';

  return (
    <Layout>
      <div className='max-w-7xl mx-auto'>
        <header className='flex items-center gap-4 mb-4'>
          <button className='p-2 rounded-md hover:bg-gray-100' onClick={() => navigate(-1)}>
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className='text-2xl font-semibold text-gray-900'>Category Analytics</h1>
            <p className='text-sm text-gray-600'>View income and expense breakdown by category</p>
          </div>
        </header>
        <div className='card p-6 mb-6'>
          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6'>
            <div>
              <label className='block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2'>
                Account
              </label>
              <select
                value={selectedAccount || ''}
                onChange={(e) => setSelectedAccount(e.target.value)}
                disabled={accountsLoading}
                className='w-full px-3 py-2 border border-gray-300 rounded-md text-sm'
              >
                {accountsLoading ? (
                  <option>Loading accounts...</option>
                ) : allAccounts.length === 0 ? (
                  <option>No accounts available</option>
                ) : (
                  allAccounts.map((acc) => (
                    <option key={acc._id} value={acc._id}>
                      {acc.name}
                    </option>
                  ))
                )}
              </select>
            </div>
            <div>
              <label className='block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2'>
                Date Range
              </label>
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className='w-full px-3 py-2 border border-gray-300 rounded-md text-sm'
              >
                <option value='7days'>Last 7 Days</option>
                <option value='30days'>Last 30 Days</option>
                <option value='month'>This Month</option>
                <option value='custom'>Custom Range</option>
              </select>
            </div>
            <div>
              <label className='block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2'>
                Type
              </label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className='w-full px-3 py-2 border border-gray-300 rounded-md text-sm'
              >
                <option value='all'>All</option>
                <option value='income'>Income Only</option>
                <option value='expense'>Expense Only</option>
              </select>
            </div>
            <div>
              <label className='block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2'>
                View
              </label>
              <div className='flex gap-2'>
                <button
                  onClick={() => setViewType('list')}
                  className={`flex-1 px-3 py-2 rounded-md font-medium text-sm transition ${viewType === 'list' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700'}`}
                >
                  List
                </button>
                <button
                  onClick={() => setViewType('chart')}
                  className={`flex-1 px-3 py-2 rounded-md font-medium text-sm transition ${viewType === 'chart' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700'}`}
                >
                  Chart
                </button>
              </div>
            </div>
          </div>
          {dateRange === 'custom' && (
            <div className='flex gap-4 flex-col md:flex-row pt-4 border-t'>
              <div className='flex-1'>
                <label className='block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2'>
                  Start Date
                </label>
                <input
                  type='date'
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className='w-full px-3 py-2 border border-gray-300 rounded-md text-sm'
                />
              </div>
              <div className='flex-1'>
                <label className='block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2'>
                  End Date
                </label>
                <input
                  type='date'
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className='w-full px-3 py-2 border border-gray-300 rounded-md text-sm'
                />
              </div>
            </div>
          )}
        </div>
        {error && (
          <div className='card bg-red-50 border border-red-200 p-4 mb-6 flex items-center gap-3'>
            <AlertCircle className='w-5 h-5 text-red-600 flex-shrink-0' />
            <span className='text-red-800 text-sm'>{error}</span>
          </div>
        )}
        {analytics && !loading && (
          <div className='grid grid-cols-1 md:grid-cols-3 gap-4 mb-6'>
            <div className='card p-4 bg-gradient-to-br from-indigo-50 to-white'>
              <div className='flex items-center justify-between'>
                <div>
                  <p className='text-xs text-gray-600 font-semibold uppercase tracking-wide'>
                    Grand Total
                  </p>
                  <p className='text-2xl font-bold text-gray-900 mt-2'>
                    {formatINR(analytics.summary.grandTotal)}
                  </p>
                </div>
                <TrendingUp className='w-10 h-10 text-indigo-600 opacity-20' />
              </div>
            </div>
            <div className='card p-4 bg-gradient-to-br from-green-50 to-white'>
              <div className='flex items-center justify-between'>
                <div>
                  <p className='text-xs text-gray-600 font-semibold uppercase tracking-wide'>
                    Transactions
                  </p>
                  <p className='text-2xl font-bold text-gray-900 mt-2'>
                    {analytics.summary.totalTransactions}
                  </p>
                </div>
                <Layers className='w-10 h-10 text-green-600 opacity-20' />
              </div>
            </div>
            <div className='card p-4 bg-gradient-to-br from-purple-50 to-white'>
              <div className='flex items-center justify-between'>
                <div>
                  <p className='text-xs text-gray-600 font-semibold uppercase tracking-wide'>
                    Categories
                  </p>
                  <p className='text-2xl font-bold text-gray-900 mt-2'>
                    {analytics.summary.categoryCount}
                  </p>
                </div>
                <Layers className='w-10 h-10 text-purple-600 opacity-20' />
              </div>
            </div>
          </div>
        )}
        {loading && (
          <div className='card p-8 text-center'>
            <div className='inline-block animate-spin rounded-full h-8 w-8 border-2 border-indigo-600 border-b-transparent'></div>
            <p className='text-gray-600 mt-4 text-sm'>Loading analytics...</p>
          </div>
        )}
        {!loading && analytics && analytics.categories && (
          <>
            {viewType === 'list' ? (
              <div className='card overflow-hidden'>
                <div className='overflow-x-auto'>
                  <table className='w-full'>
                    <thead className='bg-gray-50 border-b border-gray-200'>
                      <tr>
                        <th className='px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider'>
                          Category
                        </th>
                        <th className='px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider'>
                          Type
                        </th>
                        <th className='px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider'>
                          Used
                        </th>
                        {showBudgetColumns && (
                          <>
                            <th className='px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider'>
                              Budget
                            </th>
                            <th className='px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider'>
                              Remaining
                            </th>
                          </>
                        )}
                        <th className='px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider'>
                          Percentage
                        </th>
                        <th className='px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider'>
                          Count
                        </th>
                      </tr>
                    </thead>
                    <tbody className='divide-y divide-gray-200'>
                      {analytics.categories.length > 0 ? (
                        analytics.categories.map((category) => {
                          const isExpense = category.categoryType === 'expense';
                          const budget = isExpense ? getBudgetForCategory(category.categoryId) : 0;
                          const remaining = isExpense
                            ? getRemainingBudget(category.categoryId, category.total)
                            : 0;
                          return (
                            <tr key={category.categoryId} className='hover:bg-gray-50 transition'>
                              <td className='px-6 py-4 whitespace-nowrap'>
                                <div className='flex items-center gap-3'>
                                  {category.categoryIcon && (
                                    <span className='text-xl'>{category.categoryIcon}</span>
                                  )}
                                  <span className='font-medium text-gray-900'>
                                    {category.categoryName}
                                  </span>
                                </div>
                              </td>
                              <td className='px-6 py-4 whitespace-nowrap'>
                                <span
                                  className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${getBadgeColor(category.categoryType)}`}
                                >
                                  {category.categoryType}
                                </span>
                              </td>
                              <td className='px-6 py-4 whitespace-nowrap text-right'>
                                <span className='font-medium text-gray-900'>
                                  {formatINR(category.total)}
                                </span>
                              </td>
                              {showBudgetColumns && (
                                <>
                                  <td className='px-6 py-4 whitespace-nowrap text-right'>
                                    <span className='font-medium text-indigo-600'>
                                      {isExpense ? formatINR(budget) : '—'}
                                    </span>
                                  </td>
                                  <td className='px-6 py-4 whitespace-nowrap text-right'>
                                    <span
                                      className={`font-medium ${isExpense ? (remaining < 0 ? 'text-red-600' : 'text-green-600') : 'text-gray-400'}`}
                                    >
                                      {isExpense ? formatINR(remaining) : '—'}
                                    </span>
                                  </td>
                                </>
                              )}
                              <td className='px-6 py-4 whitespace-nowrap text-right'>
                                <span className='text-gray-600 font-medium'>
                                  {category.percentage}%
                                </span>
                              </td>
                              <td className='px-6 py-4 whitespace-nowrap text-right'>
                                <span className='inline-block bg-gray-100 text-gray-800 px-2.5 py-0.5 rounded-md text-xs font-medium'>
                                  {category.count}
                                </span>
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td
                            colSpan={showBudgetColumns ? 7 : 5}
                            className='px-6 py-8 text-center text-gray-500 text-sm'
                          >
                            No transactions found for the selected period
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className='card p-6'>
                {analytics.categories.length > 0 ? (
                  <div className='flex flex-wrap gap-6 justify-center items-start py-4'>
                    <div className='flex-1 min-w-72'>
                      <div className='flex flex-wrap gap-4 justify-center items-center'>
                        {analytics.categories.map((cat, idx) => {
                          const colors = [
                            '#4f46e5',
                            '#10b981',
                            '#f59e0b',
                            '#ef4444',
                            '#8b5cf6',
                            '#ec4899',
                            '#14b8a6',
                            '#f97316',
                          ];
                          const color = colors[idx % colors.length];
                          return (
                            <div key={cat.categoryId} className='flex flex-col items-center gap-2'>
                              <div
                                className='w-16 h-16 rounded-full flex items-center justify-center text-white font-semibold text-sm'
                                style={{ backgroundColor: color }}
                              >
                                {cat.percentage}%
                              </div>
                              <div className='text-center'>
                                <div className='text-xs font-medium text-gray-700'>
                                  {cat.categoryName}
                                </div>
                                <div className='text-xs text-gray-500 mt-0.5'>
                                  {cat.categoryType}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className='text-center text-gray-500 py-8 text-sm'>
                    No transactions found for the selected period
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}
