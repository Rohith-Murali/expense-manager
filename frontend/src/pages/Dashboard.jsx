import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ChevronLeft,
  ChevronRight,
  Search,
  Settings,
  Plus,
  AlertCircle,
  X,
  ChevronDown,
  BarChart3,
  DollarSign,
  CalendarClock,
  PiggyBank,
  Repeat,
  Target,
} from 'lucide-react';
import api from '../services/api';
import accountService from '../services/accountService';
import budgetService from '../services/budgetService';
import { getEntries, getGoals } from '../services/savingsService';
import { getTransactions } from '../services/transactionService';
import TransactionCard from '../components/TransactionCard';
import CreditCardPanel from '../components/accounts/CreditCardPanel';
import Layout from '../components/layout/Layout';
import { logger } from '../utils/logger';
import {
  getGoalsLinkedToAccount,
  getNextCreditCardDue,
  unwrapResponseData,
} from '../utils/financialOverview';

const formatRupees = (value) =>
  `₹${Number(value || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;

const formatDate = (value) =>
  new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));

const Dashboard = () => {
  const navigate = useNavigate();
  const { accountId } = useParams();
  const [view, setView] = useState('monthly'); // monthly, weekly, yearly
  const [currentDate, setCurrentDate] = useState(new Date());
  const [transactions, setTransactions] = useState([]);
  const [account, setAccount] = useState(null);
  const [stats, setStats] = useState({
    income: { total: 0, count: 0 },
    expense: { total: 0, count: 0 },
    transferOut: { total: 0, count: 0 },
    transferIn: { total: 0, count: 0 },
  });
  const [allTimeStats, setAllTimeStats] = useState({
    income: { total: 0, count: 0 },
    expense: { total: 0, count: 0 },
    transferOut: { total: 0, count: 0 },
    transferIn: { total: 0, count: 0 },
  });
  const [currentBalance, setCurrentBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showNegativeAlert, setShowNegativeAlert] = useState(false);
  const [showSummaryDetails, setShowSummaryDetails] = useState(false);
  const [monthlyBudget, setMonthlyBudget] = useState(0);
  const [monthToDateExpense, setMonthToDateExpense] = useState(0);
  const [linkedSavingsTotal, setLinkedSavingsTotal] = useState(0);
  const [linkedGoals, setLinkedGoals] = useState([]);
  const [recurringTransactions, setRecurringTransactions] = useState([]);
  const [upcomingCardDue, setUpcomingCardDue] = useState(null);
  const [dashboardError, setDashboardError] = useState('');
  const [dashboardWarning, setDashboardWarning] = useState('');

  useEffect(() => {
    fetchData();
  }, [accountId, currentDate, view]);

  useEffect(() => {
    if (currentBalance < 0) {
      setShowNegativeAlert(true);
    } else {
      setShowNegativeAlert(false);
    }
  }, [currentBalance]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setDashboardError('');
      setDashboardWarning('');
      const { startDate, endDate } = getDateRange();

      const [accountRes, transactionsRes, statsRes, allTimeStatsRes, balanceRes] = await Promise.all([
        accountService.getAccountById(accountId),
        api.get(`/account/${accountId}/transactions`, {
          params: { startDate, endDate, limit: 5 },
        }),
        api.get(`/account/${accountId}/transactions/stats`, {
          params: { startDate, endDate },
        }),
        api.get(`/account/${accountId}/transactions/stats`, {
          params: {},
        }),
        accountService.getAccountBalance(accountId),
      ]);

      const loadedAccount = accountRes.data || accountRes;
      setAccount(loadedAccount);
      setTransactions(transactionsRes.data || []);
      setStats(statsRes.data || {});
      setAllTimeStats(allTimeStatsRes.data || {});
      setCurrentBalance(balanceRes?.data ?? balanceRes);

      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      const [budgetResult, monthStatsResult, recurringResult, entriesResult, goalsResult, cardResult] =
        await Promise.allSettled([
          budgetService.getMonthlyBudget(accountId, {
            month: now.getMonth() + 1,
            year: now.getFullYear(),
          }),
          api
            .get(`/account/${accountId}/transactions/stats`, {
              params: {
                startDate: monthStart.toISOString(),
                endDate: monthEnd.toISOString(),
              },
            })
            .then((response) => response.data),
          getTransactions(accountId, { isRecurring: true, limit: 5 }),
          getEntries(),
          getGoals({ status: 'active' }),
          loadedAccount.type === 'CREDIT_CARD'
            ? accountService.getCreditCardSummary(accountId)
            : Promise.resolve(null),
        ]);

      const warnings = [];
      if (budgetResult.status === 'fulfilled') {
        setMonthlyBudget(Number(budgetResult.value?.amount || 0));
      } else {
        logger.error('Error loading account monthly budget:', budgetResult.reason);
        warnings.push('Monthly budget status is unavailable.');
      }

      if (monthStatsResult.status === 'fulfilled') {
        const monthStats = monthStatsResult.value;
        setMonthToDateExpense(Number(monthStats?.expense?.total || 0));
      } else {
        logger.error('Error loading account monthly expense total:', monthStatsResult.reason);
        warnings.push('Month-to-date spending is unavailable.');
      }

      if (recurringResult.status === 'fulfilled') {
        const result = recurringResult.value;
        setRecurringTransactions(Array.isArray(result) ? result : result?.data || []);
      } else {
        logger.error('Error loading recurring account transactions:', recurringResult.reason);
        warnings.push('Recurring transactions are unavailable.');
      }

      if (entriesResult.status === 'fulfilled' && goalsResult.status === 'fulfilled') {
        const entries = unwrapResponseData(entriesResult.value);
        const goals = unwrapResponseData(goalsResult.value);
        if (!Array.isArray(entries) || !Array.isArray(goals)) {
          warnings.push('Account-linked savings progress is unavailable.');
          setLinkedGoals([]);
          setLinkedSavingsTotal(0);
        } else {
          const linkedEntries = entries.filter(
            (entry) => String(entry.accountId?._id || entry.accountId || '') === String(accountId),
          );
          setLinkedSavingsTotal(
            linkedEntries.reduce(
              (total, entry) =>
                total +
                (entry.type === 'contribution' ? Number(entry.amount) : -Number(entry.amount)),
              0,
            ),
          );
          setLinkedGoals(getGoalsLinkedToAccount(goals, entries, accountId));
        }
      } else {
        if (entriesResult.status === 'rejected') {
          logger.error('Error loading savings entries for account:', entriesResult.reason);
        }
        if (goalsResult.status === 'rejected') {
          logger.error('Error loading savings goals for account:', goalsResult.reason);
        }
        warnings.push('Account-linked savings progress is unavailable.');
      }

      if (loadedAccount.type === 'CREDIT_CARD' && cardResult.status === 'fulfilled') {
        setUpcomingCardDue(
          getNextCreditCardDue(
            loadedAccount,
            unwrapResponseData(cardResult.value),
            now,
          ),
        );
      } else {
        setUpcomingCardDue(null);
        if (loadedAccount.type === 'CREDIT_CARD' && cardResult.status === 'rejected') {
          logger.error('Error loading credit-card due date:', cardResult.reason);
          warnings.push('Upcoming credit-card due information is unavailable.');
        }
      }
      setDashboardWarning(warnings.join(' '));
    } catch (error) {
      logger.error('Error fetching data:', error);
      setDashboardError(
        error.response?.data?.message || 'Could not load this account overview.',
      );
    } finally {
      setLoading(false);
    }
  };

  const getDateRange = () => {
    const date = new Date(currentDate);
    let startDate, endDate;

    if (view === 'monthly') {
      startDate = new Date(date.getFullYear(), date.getMonth(), 1);
      endDate = new Date(date.getFullYear(), date.getMonth() + 1, 1);
    } else if (view === 'weekly') {
      const day = date.getDay();
      startDate = new Date(date);
      startDate.setDate(date.getDate() - day);
      endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 7);
    } else {
      startDate = new Date(date.getFullYear(), 0, 1);
      endDate = new Date(date.getFullYear() + 1, 0, 1);
    }

    return {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    };
  };

  const navigateDate = (direction) => {
    const newDate = new Date(currentDate);

    if (view === 'monthly') {
      newDate.setMonth(newDate.getMonth() + direction);
    } else if (view === 'weekly') {
      newDate.setDate(newDate.getDate() + direction * 7);
    } else {
      newDate.setFullYear(newDate.getFullYear() + direction);
    }

    setCurrentDate(newDate);
  };

  const getDisplayDate = () => {
    const options =
      view === 'yearly'
        ? { year: 'numeric' }
        : view === 'monthly'
          ? { month: 'long', year: 'numeric' }
          : { month: 'short', day: 'numeric', year: 'numeric' };

    return currentDate.toLocaleDateString('en-US', options);
  };

  const filteredTransactions = transactions.filter((transaction) => {
    const query = searchTerm.trim().toLowerCase();
    return (
      !query ||
      transaction.description?.toLowerCase().includes(query) ||
      transaction.categoryId?.name?.toLowerCase().includes(query)
    );
  });

  return (
    <Layout>
      <main className='mx-auto min-h-screen max-w-7xl space-y-6 bg-gray-50 px-4 py-5 text-gray-800 sm:px-6'>
        {showNegativeAlert && account?.type !== 'CREDIT_CARD' && (
          <div className='mb-6 bg-red-50 border border-red-200 rounded-md p-4 flex items-start justify-between'>
            <div className='flex items-start gap-3'>
              <AlertCircle className='text-red-600 flex-shrink-0 mt-0.5' size={20} />
              <div>
                <h3 className='font-semibold text-red-900'>Account Balance is Negative</h3>
                <p className='text-red-700 text-sm mt-1'>
                  Your current balance is ₹{currentBalance.toFixed(2)}. Please add funds or review
                  your transactions.
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowNegativeAlert(false)}
              className='text-red-600 hover:text-red-800'
            >
              <X size={20} />
            </button>
          </div>
        )}

        <header className='flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
          <div>
            <p className='text-sm font-medium text-indigo-600'>Account overview</p>
            <h1 className='mt-1 text-2xl font-bold tracking-tight text-gray-900'>
              {account?.name || 'Dashboard'}
            </h1>
            <p className='mt-1 text-sm text-gray-500'>
              Balance, monthly budget, savings, and account activity.
            </p>
          </div>
          <div className='flex flex-wrap items-center gap-2 sm:gap-3'>
            <button
              className='inline-flex items-center justify-center gap-2 px-3 py-2 rounded-md bg-white border hover:bg-gray-50 text-gray-700 text-sm w-full sm:w-auto'
              onClick={() => navigate(`/category-analytics?account=${accountId}`)}
              title='View category-wise analytics'
            >
              <BarChart3 size={18} />
              Analytics
            </button>
            <button
              className='inline-flex items-center justify-center gap-2 px-3 py-2 rounded-md bg-white border hover:bg-gray-50 text-gray-700 text-sm w-full sm:w-auto'
              onClick={() => navigate(`/accounts/${accountId}/budgets`)}
              title='Manage budgets'
            >
              <DollarSign size={18} />
              Budget
            </button>
            <button
              className='p-2 rounded-md hover:bg-gray-100 self-start'
              onClick={() => navigate(`/accounts/${accountId}/settings`)}
            >
              <Settings size={20} />
            </button>
            <button
              className='inline-flex items-center justify-center gap-2 bg-indigo-600 text-white px-3 py-2 rounded-md hover:bg-indigo-700 w-full sm:w-auto'
              onClick={() => navigate(`/accounts/${accountId}/transaction/new`)}
            >
              <Plus size={20} />
              New Transaction
            </button>
          </div>
        </header>

        {dashboardError && (
          <div
            className='rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800'
            role='alert'
          >
            {dashboardError}
          </div>
        )}
        {dashboardWarning && (
          <div
            className='rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800'
            role='status'
          >
            {dashboardWarning}
          </div>
        )}

        {account?.type === 'CREDIT_CARD' && (
          <CreditCardPanel account={account} onPaymentRecorded={fetchData} />
        )}

        <section className='card overflow-hidden bg-gradient-to-br from-indigo-50 via-white to-white shadow-sm'>
          <div className='flex flex-wrap items-center justify-between gap-3 border-b border-indigo-100 px-5 py-4 sm:px-6'>
            <div>
              <h2 className='text-lg font-semibold text-gray-900'>Financial summary</h2>
              <p className='mt-1 text-xs text-gray-500'>
                {view.charAt(0).toUpperCase() + view.slice(1)} · {getDisplayDate()}
              </p>
            </div>
            <div className='flex items-center gap-2'>
              <button
                type='button'
                onClick={() => setShowSummaryDetails((visible) => !visible)}
                className='inline-flex items-center gap-1 rounded-md px-2 py-1 text-sm font-medium text-indigo-700 hover:bg-indigo-100'
                aria-expanded={showSummaryDetails}
              >
                Details
                <ChevronDown
                  size={16}
                  className={`transition-transform ${showSummaryDetails ? 'rotate-180' : ''}`}
                />
              </button>
            </div>
          </div>
          <div className='grid grid-cols-1 divide-y divide-indigo-100 sm:grid-cols-3 sm:divide-x sm:divide-y-0'>
            <div className='p-5 sm:p-6'>
              <span className='text-xs font-semibold uppercase tracking-wide text-gray-500'>
                  {account?.type === 'CREDIT_CARD' ? 'Outstanding' : 'Current Balance'}
              </span>
              <p
                className={`mt-2 text-2xl font-bold tracking-tight sm:text-3xl ${
                  account?.type === 'CREDIT_CARD' || currentBalance < 0
                    ? 'text-rose-700'
                    : 'text-gray-900'
                }`}
              >
                {loading ? '—' : formatRupees(currentBalance)}
              </p>
              <p className='mt-1 text-xs text-gray-400'>Current account balance in ₹</p>
            </div>
            <div className='p-5 sm:p-6'>
              <span className='text-xs font-semibold uppercase tracking-wide text-gray-500'>
                Income
              </span>
              <p className='mt-2 text-2xl font-bold tracking-tight text-emerald-700 sm:text-3xl'>
                {loading ? '—' : formatRupees(stats.income?.total)}
              </p>
              <p className='mt-1 text-xs text-gray-400'>Selected period</p>
            </div>
            <div className='p-5 sm:p-6'>
              <span className='text-xs font-semibold uppercase tracking-wide text-gray-500'>
                Expenses
              </span>
              <p className='mt-2 text-2xl font-bold tracking-tight text-rose-700 sm:text-3xl'>
                {loading ? '—' : formatRupees(stats.expense?.total)}
              </p>
              <p className='mt-1 text-xs text-gray-400'>Selected period</p>
            </div>
          </div>
          {showSummaryDetails && (
            <div className='grid grid-cols-2 gap-3 border-t border-indigo-100 px-5 py-4 text-sm sm:grid-cols-4 sm:px-6'>
              <div>
                <p className='text-xs text-gray-500'>Opening balance</p>
                <p className='mt-1 font-semibold text-gray-700'>
                  {formatRupees(account?.openingBalance)}
                </p>
              </div>
              <div>
                <p className='text-xs text-gray-500'>All-time income</p>
                <p className='mt-1 font-semibold text-gray-700'>
                  {formatRupees(allTimeStats.income?.total)}
                </p>
              </div>
              <div>
                <p className='text-xs text-gray-500'>Transfers in</p>
                <p className='mt-1 font-semibold text-gray-700'>
                  {formatRupees(allTimeStats.transferIn?.total)}
                </p>
              </div>
              <div>
                <p className='text-xs text-gray-500'>Transfers out</p>
                <p className='mt-1 font-semibold text-gray-700'>
                  {formatRupees(allTimeStats.transferOut?.total)}
                </p>
              </div>
            </div>
          )}
        </section>

        <section className='mb-6'>
          <div className='card p-4 sm:p-5 bg-white/90 rounded-xl shadow fade-in'>
            <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-3'>
              <h3 className='text-base font-semibold text-gray-900 flex items-center gap-2'>
                {view.charAt(0).toUpperCase() + view.slice(1)} Summary
              </h3>
              <div className='flex items-center gap-1 bg-gray-100 rounded px-1 py-0.5 self-start sm:self-auto'>
                <button
                  className={`px-2 py-1 rounded text-xs font-medium transition-colors ${view === 'weekly' ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-200'}`}
                  onClick={() => setView('weekly')}
                >
                  Weekly
                </button>
                <button
                  className={`px-2 py-1 rounded text-xs font-medium transition-colors ${view === 'monthly' ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-200'}`}
                  onClick={() => setView('monthly')}
                >
                  Monthly
                </button>
                <button
                  className={`px-2 py-1 rounded text-xs font-medium transition-colors ${view === 'yearly' ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-200'}`}
                  onClick={() => setView('yearly')}
                >
                  Yearly
                </button>
              </div>
            </div>
            <div className='flex items-center justify-between mb-4'>
              <div className='text-xs font-medium text-gray-500 flex items-center gap-2 flex-wrap'>
                <ChevronLeft
                  size={16}
                  className='cursor-pointer hover:text-indigo-600'
                  onClick={() => navigateDate(-1)}
                />
                <span className='font-semibold text-gray-700'>{getDisplayDate()}</span>
                <ChevronRight
                  size={16}
                  className='cursor-pointer hover:text-indigo-600'
                  onClick={() => navigateDate(1)}
                />
              </div>
            </div>
            <div className='grid grid-cols-1 gap-3 sm:grid-cols-3'>
              <div className='flex flex-col items-center'>
                <span className='text-xs text-gray-500 mb-1'>Income</span>
                <span className='text-lg sm:text-xl font-bold text-green-600 text-center break-words'>
                  ₹
                  {(stats.income?.total || 0).toLocaleString(undefined, {
                    maximumFractionDigits: 0,
                  })}
                </span>
              </div>
              <div className='flex flex-col items-center'>
                <span className='text-xs text-gray-500 mb-1'>Expense</span>
                <span className='text-lg sm:text-xl font-bold text-red-600 text-center break-words'>
                  ₹
                  {(stats.expense?.total || 0).toLocaleString(undefined, {
                    maximumFractionDigits: 0,
                  })}
                </span>
              </div>
              <div className='flex flex-col items-center'>
                <span className='text-xs text-gray-500 mb-1'>Transfers</span>
                <span className='text-lg sm:text-xl font-bold text-gray-600 text-center break-words'>
                  ₹
                  {(
                    (stats.transferIn?.total || 0) + (stats.transferOut?.total || 0)
                  ).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </span>
                <span className='text-[11px] text-gray-500'>In + Out</span>
              </div>
            </div>
          </div>
        </section>

        <section className='grid gap-4 lg:grid-cols-2'>
          <article className='card p-5 sm:p-6'>
            <div className='flex items-start justify-between gap-3'>
              <div>
                <h2 className='font-semibold text-gray-900'>This month’s budget</h2>
                <p className='mt-1 text-sm text-gray-500'>Monthly budget minus month-to-date expenses</p>
              </div>
              <span className='rounded-xl bg-indigo-50 p-2.5 text-indigo-700'>
                <DollarSign size={19} />
              </span>
            </div>
            <div className='mt-5 flex items-end justify-between gap-4'>
              <div>
                <p className='text-xs font-medium uppercase tracking-wide text-gray-400'>
                  Available to spend
                </p>
                <p
                  className={`mt-1 text-2xl font-bold ${
                    monthlyBudget - monthToDateExpense < 0 ? 'text-rose-700' : 'text-gray-900'
                  }`}
                >
                  {loading
                    ? '—'
                    : monthlyBudget > 0
                      ? formatRupees(monthlyBudget - monthToDateExpense)
                      : 'No budget set'}
                </p>
              </div>
              <div className='text-right text-xs text-gray-500'>
                <p>Spent {formatRupees(monthToDateExpense)}</p>
                <p className='mt-1'>of {formatRupees(monthlyBudget)}</p>
              </div>
            </div>
            <div className='mt-3 h-2 overflow-hidden rounded-full bg-gray-100'>
              <div
                className={`h-full rounded-full ${
                  monthlyBudget > 0 && monthToDateExpense / monthlyBudget >= 1
                    ? 'bg-rose-500'
                    : monthlyBudget > 0 && monthToDateExpense / monthlyBudget >= 0.8
                      ? 'bg-amber-500'
                      : 'bg-indigo-500'
                }`}
                style={{
                  width: `${
                    monthlyBudget > 0
                      ? Math.min((monthToDateExpense / monthlyBudget) * 100, 100)
                      : 0
                  }%`,
                }}
              />
            </div>
            <div className='mt-2 flex justify-between text-xs text-gray-400'>
              <span>
                {monthlyBudget > 0
                  ? `${Math.round((monthToDateExpense / monthlyBudget) * 100)}% used`
                  : 'Set a budget to track spending'}
              </span>
              <button
                type='button'
                onClick={() => navigate(`/accounts/${accountId}/budgets`)}
                className='font-medium text-indigo-600 hover:text-indigo-800'
              >
                Manage budget
              </button>
            </div>
          </article>

          <article className='card p-5 sm:p-6'>
            <div className='flex items-start justify-between gap-3'>
              <div>
                <h2 className='font-semibold text-gray-900'>Savings linked to this account</h2>
                <p className='mt-1 text-sm text-gray-500'>Recorded contributions less withdrawals</p>
              </div>
              <span className='rounded-xl bg-violet-50 p-2.5 text-violet-700'>
                <PiggyBank size={19} />
              </span>
            </div>
            <p className='mt-4 text-2xl font-bold text-gray-900'>
              {loading ? '—' : formatRupees(linkedSavingsTotal)}
            </p>
            {linkedGoals.length === 0 ? (
              <p className='mt-3 rounded-lg bg-gray-50 p-3 text-sm text-gray-500'>
                No active goals have savings entries linked to this account.
              </p>
            ) : (
              <ul className='mt-4 space-y-3'>
                {linkedGoals.slice(0, 3).map((goal) => (
                  <li key={goal._id}>
                    <div className='mb-1 flex items-center justify-between gap-3 text-sm'>
                      <span className='flex min-w-0 items-center gap-2 truncate font-medium text-gray-700'>
                        <Target size={15} className='shrink-0 text-violet-600' />
                        {goal.name}
                      </span>
                      <span className='shrink-0 text-xs text-gray-500'>
                        {Math.round(goal.progressPercent)}%
                      </span>
                    </div>
                    <div className='h-1.5 overflow-hidden rounded-full bg-gray-100'>
                      <div
                        className='h-full rounded-full bg-violet-500'
                        style={{ width: `${Math.min(goal.progressPercent, 100)}%` }}
                      />
                    </div>
                    <p className='mt-1 text-[11px] text-gray-400'>
                      {formatRupees(goal.currentAmount)} of {formatRupees(goal.targetAmount)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
            <button
              type='button'
              onClick={() => navigate('/savings')}
              className='mt-4 text-sm font-medium text-indigo-600 hover:text-indigo-800'
            >
              Manage savings
            </button>
          </article>
        </section>

        <section className='grid gap-4 lg:grid-cols-2'>
          {account?.type === 'CREDIT_CARD' && (
            <article className='card p-5 sm:p-6'>
              <div className='flex items-start justify-between gap-3'>
                <div>
                  <h2 className='font-semibold text-gray-900'>Upcoming card payment</h2>
                  <p className='mt-1 text-sm text-gray-500'>Based on this card’s billing cycle</p>
                </div>
                <span className='rounded-xl bg-rose-50 p-2.5 text-rose-700'>
                  <CalendarClock size={19} />
                </span>
              </div>
              {upcomingCardDue ? (
                <div className='mt-4 flex items-end justify-between gap-4'>
                  <div>
                    <p className='text-2xl font-bold text-gray-900'>
                      {formatRupees(upcomingCardDue.amount)}
                    </p>
                    <p className='mt-1 text-sm text-gray-500'>
                      Due {formatDate(upcomingCardDue.dueDate)}
                      {upcomingCardDue.isEstimate ? ' · estimated' : ''}
                    </p>
                  </div>
                  <button
                    type='button'
                    onClick={() => document.getElementById('credit-card-panel')?.scrollIntoView({ behavior: 'smooth' })}
                    className='text-sm font-medium text-indigo-600 hover:text-indigo-800'
                  >
                    Make payment
                  </button>
                </div>
              ) : (
                <p className='mt-4 rounded-lg bg-gray-50 p-3 text-sm text-gray-500'>
                  No upcoming due date is available for this card.
                </p>
              )}
            </article>
          )}

          <article className='card p-5 sm:p-6'>
            <div className='flex items-start justify-between gap-3'>
              <div>
                <h2 className='font-semibold text-gray-900'>Recurring transactions</h2>
                <p className='mt-1 text-sm text-gray-500'>Transactions marked as recurring</p>
              </div>
              <span className='rounded-xl bg-amber-50 p-2.5 text-amber-700'>
                <Repeat size={19} />
              </span>
            </div>
            {recurringTransactions.length === 0 ? (
              <p className='mt-4 rounded-lg bg-gray-50 p-3 text-sm text-gray-500'>
                No recurring transactions are marked for this account.
              </p>
            ) : (
              <ul className='mt-4 divide-y divide-gray-100'>
                {recurringTransactions.slice(0, 3).map((transaction) => (
                  <li
                    key={transaction._id}
                    className='flex items-center justify-between gap-3 py-3 first:pt-0'
                  >
                    <span className='min-w-0'>
                      <span className='block truncate text-sm font-medium text-gray-800'>
                        {transaction.description || transaction.categoryId?.name || 'Recurring item'}
                      </span>
                      <span className='text-xs text-gray-400'>
                        Last recorded {formatDate(transaction.date)} · no schedule date
                      </span>
                    </span>
                    <span className='shrink-0 text-sm font-semibold text-gray-800'>
                      {formatRupees(transaction.amount)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <p className='mt-2 text-[11px] text-gray-400'>
              Recurring transactions have no cadence or next-due date configured yet.
            </p>
          </article>
        </section>

        <div className='flex items-center gap-3 overflow-hidden rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-sm'>
          <Search size={20} />
          <input
            type='text'
            placeholder='Search transactions...'
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className='w-full outline-none'
          />
        </div>

        <section className='mb-6'>
          <div className='flex items-center justify-between mb-3'>
            <h2 className='text-lg font-medium'>Recent Transactions</h2>
            <button
              className='text-indigo-600 hover:underline'
              onClick={() => navigate(`/accounts/${accountId}/transactions`)}
            >
              View All
            </button>
          </div>
          {loading ? (
            <div className='text-center text-gray-500'>Loading...</div>
          ) : filteredTransactions.length === 0 ? (
            <div className='text-center text-gray-500'>No transactions found</div>
          ) : (
            <div className='space-y-3'>
              {filteredTransactions.map((transaction) => (
                <TransactionCard
                  key={transaction._id}
                  transaction={transaction}
                  onClick={() => navigate(`/accounts/${accountId}/transaction/${transaction._id}`)}
                />
              ))}
            </div>
          )}
        </section>

        <div className='card fade-in mb-8' style={{ animationDelay: '0.3s' }}>
          <h3 className='text-lg font-semibold text-gray-900 mb-4'>Quick Actions</h3>
          <div className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-5'>
            <button
              className='btn btn-primary flex items-center justify-center gap-2 py-3'
              onClick={() => navigate(`/accounts/${accountId}/transaction/expense`)}
            >
              <svg className='w-5 h-5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M12 4v16m8-8H4'
                />
              </svg>
              Expense
            </button>
            <button
              className='btn btn-success flex items-center justify-center gap-2 py-3'
              onClick={() => navigate(`/accounts/${accountId}/transaction/income`)}
            >
              <svg className='w-5 h-5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M12 4v16m8-8H4'
                />
              </svg>
              Income
            </button>
            <button
              className='btn btn-outline flex items-center justify-center gap-2 py-3'
              onClick={() => navigate(`/accounts/${accountId}/transaction/transfer`)}
            >
              <svg className='w-5 h-5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4'
                />
              </svg>
              Transfer
            </button>
          </div>
        </div>
      </main>
    </Layout>
  );
};

export default Dashboard;
