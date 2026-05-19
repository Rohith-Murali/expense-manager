import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Search, Settings, Plus, AlertCircle, X } from 'lucide-react';
import api from '../services/api';
import accountService from '../services/accountService';
import TransactionCard from '../components/TransactionCard';
import OverviewCard from '../components/OverviewCard';
import Layout from '../components/layout/Layout';

const Dashboard = () => {
  const navigate = useNavigate();
  const { accountId } = useParams();
  const [view, setView] = useState('monthly'); // monthly, weekly, yearly
  const [currentDate, setCurrentDate] = useState(new Date());
  const [transactions, setTransactions] = useState([]);
  const [stats, setStats] = useState({
    income: { total: 0, count: 0 },
    expense: { total: 0, count: 0 },
    transferOut: { total: 0, count: 0 },
    transferIn: { total: 0, count: 0 }
  });
  const [currentBalance, setCurrentBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showNegativeAlert, setShowNegativeAlert] = useState(false);


  useEffect(() => {
    fetchData();
  }, [accountId, currentDate, view]);

  // Monitor balance and show alert if negative
  useEffect(() => {
    if (currentBalance < 0) {
      setShowNegativeAlert(true);
    } else {
      setShowNegativeAlert(false);
    }
  }, [currentBalance]);

  const fetchBalance = async () => {
    try {
      const balanceData = await accountService.getAccountBalance(accountId);
      setCurrentBalance(balanceData);
    } catch (error) {
      logger.error('Error fetching balance:', error);
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const { startDate, endDate } = getDateRange();

      const [transactionsRes, statsRes] = await Promise.all([
        api.get(`/account/${accountId}/transactions`, { params: { startDate, endDate, limit: 10 } }),
        api.get(`/account/${accountId}/transactions/stats`, { params: { startDate, endDate } })
      ]);

      setTransactions(transactionsRes.data);
      setStats(statsRes.data);

      // Fetch balance after data is loaded
      await fetchBalance();
    } catch (error) {
      logger.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDateRange = () => {
    const date = new Date(currentDate);
    let startDate, endDate;

    if (view === 'monthly') {
      startDate = new Date(date.getFullYear(), date.getMonth(), 1);
      endDate = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    } else if (view === 'weekly') {
      const day = date.getDay();
      startDate = new Date(date);
      startDate.setDate(date.getDate() - day);
      endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 6);
    } else {
      startDate = new Date(date.getFullYear(), 0, 1);
      endDate = new Date(date.getFullYear(), 11, 31);
    }

    return {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString()
    };
  };

  const navigateDate = (direction) => {
    const newDate = new Date(currentDate);

    if (view === 'monthly') {
      newDate.setMonth(newDate.getMonth() + direction);
    } else if (view === 'weekly') {
      newDate.setDate(newDate.getDate() + (direction * 7));
    } else {
      newDate.setFullYear(newDate.getFullYear() + direction);
    }

    setCurrentDate(newDate);
  };

  const getDisplayDate = () => {
    const options = view === 'yearly'
      ? { year: 'numeric' }
      : view === 'monthly'
        ? { month: 'long', year: 'numeric' }
        : { month: 'short', day: 'numeric', year: 'numeric' };

    return currentDate.toLocaleDateString('en-US', options);
  };

  const filteredTransactions = transactions.filter(t =>
    t.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Layout>
      <div className="min-h-screen p-6 bg-gray-50 text-gray-800">
        {/* Negative Balance Alert */}
        {showNegativeAlert && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4 flex items-start justify-between">
            <div className="flex items-start gap-3">
              <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
              <div>
                <h3 className="font-semibold text-red-900">Account Balance is Negative</h3>
                <p className="text-red-700 text-sm mt-1">
                  Your current balance is ₹{currentBalance.toFixed(2)}. Please add funds or review your transactions.
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowNegativeAlert(false)}
              className="text-red-600 hover:text-red-800"
            >
              <X size={20} />
            </button>
          </div>
        )}

        <header className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <div className="flex items-center gap-3">
            <button
              className="p-2 rounded-md hover:bg-gray-100"
              onClick={() => navigate(`/accounts/${accountId}/settings`)}
            >
              <Settings size={20} />
            </button>
            <button
              className="inline-flex items-center gap-2 bg-indigo-600 text-white px-3 py-2 rounded-md hover:bg-indigo-700"
              onClick={() => navigate(`/accounts/${accountId}/transaction/new`)}
            >
              <Plus size={20} />
              New Transaction
            </button>
          </div>
        </header>

        {/* Overview Section */}
        <section className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 bg-white rounded-md shadow-sm px-2 py-1">
              <button
                className={`px-3 py-1 rounded ${view === 'weekly' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600'}`}
                onClick={() => setView('weekly')}
              >
                Weekly
              </button>
              <button
                className={`px-3 py-1 rounded ${view === 'monthly' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600'}`}
                onClick={() => setView('monthly')}
              >
                Monthly
              </button>
              <button
                className={`px-3 py-1 rounded ${view === 'yearly' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600'}`}
                onClick={() => setView('yearly')}
              >
                Yearly
              </button>
            </div>

            <div className="flex items-center gap-3">
              <button className="p-2 rounded-md hover:bg-gray-100" onClick={() => navigateDate(-1)}>
                <ChevronLeft size={20} />
              </button>
              <span className="font-medium">{getDisplayDate()}</span>
              <button className="p-2 rounded-md hover:bg-gray-100" onClick={() => navigateDate(1)}>
                <ChevronRight size={20} />
              </button>
            </div>
          </div>

          {/* Net Summary - Updates with view changes */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
            <OverviewCard
              type="income"
              amount={(stats.income?.total || 0) +
                (stats.transferIn?.total || 0) || 0}
              count={stats.income?.count || 0}
            />
            <OverviewCard
              type="expense"
              amount={(stats.expense?.total || 0) +
                (stats.transferOut?.total || 0) || 0}
              count={stats.expense?.count || 0}
            />
            <OverviewCard
              type="balance"
              amount={
                (stats.income?.total || 0) +
                (stats.transferIn?.total || 0) -
                (stats.expense?.total || 0) -
                (stats.transferOut?.total || 0)
              }
            />
          </div>

        </section>

        {/* Search Bar */}
        <div className="flex items-center gap-3 bg-white border rounded px-3 py-2 mb-6 shadow-sm">
          <Search size={20} />
          <input
            type="text"
            placeholder="Search transactions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full outline-none"
          />
        </div>

        {/* Recent Transactions */}
        <section className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-medium">Recent Transactions</h2>
            <button
              className="text-indigo-600 hover:underline"
              onClick={() => navigate(`/accounts/${accountId}/transactions`)}
            >
              View All
            </button>
          </div>

          {loading ? (
            <div className="text-center text-gray-500">Loading...</div>
          ) : filteredTransactions.length === 0 ? (
            <div className="text-center text-gray-500">No transactions found</div>
          ) : (
            <div className="space-y-3">
              {filteredTransactions.map(transaction => (
                <TransactionCard
                  key={transaction._id}
                  transaction={transaction}
                  onClick={() => navigate(`/accounts/${accountId}/transaction/${transaction._id}`)}
                />
              ))}
            </div>
          )}
        </section>

        {/* Budget Section - Placeholder */}
        {/* <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-medium">Budget</h2>
            <button className="text-indigo-600 hover:underline" onClick={() => navigate('/budget')}>
              Manage
            </button>
          </div>
          <div className="text-gray-500">Coming Soon</div>
        </section> */}
      </div>
    </Layout>
  );
};

export default Dashboard;