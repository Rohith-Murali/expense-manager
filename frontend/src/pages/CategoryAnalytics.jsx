import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { getCategoryWiseAnalytics } from '../services/transactionService';
import accountService from '../services/accountService';
import Layout from '../components/layout/Layout';
import logger from '../utils/logger';
import { AlertCircle, TrendingUp, Layers, ArrowLeft } from 'lucide-react';

export default function CategoryAnalytics() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [allAccounts, setAllAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [analytics, setAnalytics] = useState({ summary: { grandTotal: 0, totalTransactions: 0, categoryCount: 0 }, categories: [] });
  const [loading, setLoading] = useState(false);
  const [accountsLoading, setAccountsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterType, setFilterType] = useState('all');
  const [viewType, setViewType] = useState('list');
  const [dateRange, setDateRange] = useState('30days');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // Load accounts from API on component mount
  useEffect(() => {
    const loadAccounts = async () => {
      try {
        setAccountsLoading(true);
        const res = await accountService.getAccounts(false);
        const accs = Array.isArray(res) ? res : res?.data || [];
        setAllAccounts(accs);

        // Try to select account from URL params or use first account
        const accountParam = searchParams.get('account');
        if (accountParam && accs.some(a => a._id === accountParam)) {
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

  // Fetch analytics whenever dependencies change
  useEffect(() => {
    if (!selectedAccount) return;

    const fetchAnalytics = async () => {
      setLoading(true);
      setError(null);
      try {
        const params = {};
        let startDate, endDate;

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
        const analyticsData = response?.categories ? response : { summary: { grandTotal: 0, totalTransactions: 0, categoryCount: 0 }, categories: [] };
        setAnalytics(analyticsData);
        setError(null);
      } catch (err) {
        logger.error('Failed to fetch category analytics:', err);
        setError('Failed to load analytics. Please try again.');
        setAnalytics({ summary: { grandTotal: 0, totalTransactions: 0, categoryCount: 0 }, categories: [] });
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [selectedAccount, dateRange, customStartDate, customEndDate, filterType]);

  const getBadgeColor = (categoryType) => {
    return categoryType === 'income'
      ? 'bg-green-100 text-green-800'
      : 'bg-red-100 text-red-800';
  };

  const getSelectedAccountName = () => {
    return allAccounts.find(a => a._id === selectedAccount)?.name || 'Select Account';
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <header className="flex items-center gap-4 mb-4">
          <button className="p-2 rounded-md hover:bg-gray-100" onClick={() => navigate(-1)}>
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-2xl font-semibold text-gray-900 mb-1">Category Analytics</h1>
          <p className="text-sm text-gray-600">View income and expense breakdown by category</p>
        </header>
        {/* Controls Card */}
        <div className="card p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {/* Account Selector */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">Account</label>
              <select
                value={selectedAccount || ''}
                onChange={(e) => setSelectedAccount(e.target.value)}
                disabled={accountsLoading}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                {accountsLoading ? (
                  <option>Loading accounts...</option>
                ) : allAccounts.length === 0 ? (
                  <option>No accounts available</option>
                ) : (
                  allAccounts.map(acc => (
                    <option key={acc._id} value={acc._id}>
                      {acc.name}
                    </option>
                  ))
                )}
              </select>
            </div>

            {/* Date Range Selector */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">Date Range</label>
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="7days">Last 7 Days</option>
                <option value="30days">Last 30 Days</option>
                <option value="month">This Month</option>
                <option value="custom">Custom Range</option>
              </select>
            </div>

            {/* Transaction Type Filter */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">Type</label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="all">All</option>
                <option value="income">Income Only</option>
                <option value="expense">Expense Only</option>
              </select>
            </div>

            {/* View Type Toggle */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">View</label>
              <div className="flex gap-2 h-full">
                <button
                  onClick={() => setViewType('list')}
                  className={`flex-1 px-3 py-2 rounded-md font-medium text-sm transition ${viewType === 'list'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                >
                  List
                </button>
                <button
                  onClick={() => setViewType('chart')}
                  className={`flex-1 px-3 py-2 rounded-md font-medium text-sm transition ${viewType === 'chart'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                >
                  Chart
                </button>
              </div>
            </div>
          </div>

          {/* Custom Date Range Inputs */}
          {dateRange === 'custom' && (
            <div className="flex gap-4 flex-col md:flex-row pt-4 border-t">
              <div className="flex-1">
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">Start Date</label>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">End Date</label>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="card bg-red-50 border border-red-200 p-4 mb-6 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
            <span className="text-red-800 text-sm">{error}</span>
          </div>
        )}

        {/* Summary Cards */}
        {analytics && !loading && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="card p-4 bg-gradient-to-br from-indigo-50 to-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-600 font-semibold uppercase tracking-wide">Grand Total</p>
                  <p className="text-2xl font-bold text-gray-900 mt-2">
                    {new Intl.NumberFormat('en-IN', {
                      style: 'currency',
                      currency: 'INR',
                      minimumFractionDigits: 0
                    }).format(analytics.summary.grandTotal)}
                  </p>
                </div>
                <TrendingUp className="w-10 h-10 text-indigo-600 opacity-20" />
              </div>
            </div>

            <div className="card p-4 bg-gradient-to-br from-green-50 to-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-600 font-semibold uppercase tracking-wide">Total Transactions</p>
                  <p className="text-2xl font-bold text-gray-900 mt-2">
                    {analytics.summary.totalTransactions}
                  </p>
                </div>
                <Layers className="w-10 h-10 text-green-600 opacity-20" />
              </div>
            </div>

            <div className="card p-4 bg-gradient-to-br from-purple-50 to-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-600 font-semibold uppercase tracking-wide">Categories</p>
                  <p className="text-2xl font-bold text-gray-900 mt-2">
                    {analytics.summary.categoryCount}
                  </p>
                </div>
                <Layers className="w-10 h-10 text-purple-600 opacity-20" />
              </div>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="card p-8 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-indigo-600 border-b-transparent"></div>
            <p className="text-gray-600 mt-4 text-sm">Loading analytics...</p>
          </div>
        )}

        {/* Analytics Content */}
        {!loading && analytics && analytics.categories && (
          <>
            {viewType === 'list' ? (
              // List View
              <div className="card overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Category
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Type
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Amount
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Percentage
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Count
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {analytics.categories.length > 0 ? (
                        analytics.categories.map((category) => (
                          <tr key={category.categoryId} className="hover:bg-gray-50 transition">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center gap-3">
                                {category.categoryIcon && (
                                  <span className="text-xl">{category.categoryIcon}</span>
                                )}
                                <span className="font-medium text-gray-900">{category.categoryName}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${getBadgeColor(category.categoryType)}`}>
                                {category.categoryType}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right">
                              <span className="font-medium text-gray-900">
                                {new Intl.NumberFormat('en-IN', {
                                  style: 'currency',
                                  currency: 'INR',
                                  minimumFractionDigits: 0
                                }).format(category.total)}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right">
                              <span className="text-gray-600 font-medium">{category.percentage}%</span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right">
                              <span className="inline-block bg-gray-100 text-gray-800 px-2.5 py-0.5 rounded-md text-xs font-medium">
                                {category.count}
                              </span>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="5" className="px-6 py-8 text-center text-gray-500 text-sm">
                            No transactions found for the selected period
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              // Chart View
              <div className="card p-6">
                {analytics.categories.length > 0 ? (
                  <div className="flex flex-wrap gap-6 justify-center items-start py-4">
                    <div className="flex-1 min-w-72">
                      <div className="flex flex-wrap gap-4 justify-center items-center">
                        {analytics.categories.map((cat, idx) => {
                          const colors = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];
                          const color = colors[idx % colors.length];
                          return (
                            <div key={cat.categoryId} className="flex flex-col items-center gap-2">
                              <div
                                className="w-16 h-16 rounded-full flex items-center justify-center text-white font-semibold text-sm"
                                style={{ backgroundColor: color }}
                              >
                                {cat.percentage}%
                              </div>
                              <div className="text-center">
                                <div className="text-xs font-medium text-gray-700">{cat.categoryName}</div>
                                <div className="text-xs text-gray-500 mt-0.5">{cat.categoryType}</div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Legend */}
                    <div className="flex-1 min-w-72">
                      <h3 className="text-sm font-semibold text-gray-900 mb-3">Breakdown</h3>
                      <div className="space-y-2">
                        {analytics.categories.map((cat, idx) => {
                          const colors = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];
                          const color = colors[idx % colors.length];
                          return (
                            <div key={cat.categoryId} className="flex items-center gap-2 text-sm">
                              <div
                                className="w-3 h-3 rounded-full flex-shrink-0"
                                style={{ backgroundColor: color }}
                              />
                              <div className="flex-1 flex items-center justify-between">
                                <span className="text-gray-700">{cat.categoryName}</span>
                                <span className="text-gray-600 font-medium">{cat.percentage}%</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-gray-500 py-8 text-sm">
                    No transactions found for the selected period
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* No data state */}
        {!loading && !analytics && !error && (
          <div className="card p-8 text-center">
            <p className="text-gray-600 text-sm">Select an account and adjust filters to view analytics</p>
          </div>
        )}
      </div>
    </Layout>
  );
}
