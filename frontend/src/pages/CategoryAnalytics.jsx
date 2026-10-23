import { Fragment, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  AlertCircle,
  ArrowDownRight,
  ArrowLeft,
  ArrowUpRight,
  BarChart3,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Lightbulb,
  PiggyBank,
  Wallet,
} from 'lucide-react';
import Layout from '../components/layout/Layout';
import TransactionCard from '../components/TransactionCard';
import accountService from '../services/accountService';
import { getAnalyticsOverview, getTransactions } from '../services/transactionService';
import { logger } from '../utils/logger';

const formatMoney = (value, currency = 'INR') =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);

function getPeriodRange(periodDate, periodType) {
  if (periodType === 'month') {
    const start = new Date(periodDate.getFullYear(), periodDate.getMonth(), 1);
    const end = new Date(periodDate.getFullYear(), periodDate.getMonth() + 1, 1);
    const comparisonStart = new Date(periodDate.getFullYear(), periodDate.getMonth() - 1, 1);
    return { start, end, comparisonStart, comparisonEnd: start };
  }

  const start = new Date(periodDate.getFullYear(), 0, 1);
  const end = new Date(periodDate.getFullYear() + 1, 0, 1);
  const comparisonStart = new Date(periodDate.getFullYear() - 1, 0, 1);
  return { start, end, comparisonStart, comparisonEnd: start };
}

function localDateKey(date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
}

function buildTrendPoints(trends, periodDate, periodType) {
  const rows = new Map(
    trends.filter((item) => item.period === 'current').map((item) => [item.date, item]),
  );
  const points = [];
  if (periodType === 'month') {
    const cursor = new Date(periodDate.getFullYear(), periodDate.getMonth(), 1);
    const end = new Date(periodDate.getFullYear(), periodDate.getMonth() + 1, 1);
    while (cursor < end) {
      const key = localDateKey(cursor);
      points.push({ date: key, ...(rows.get(key) || {}) });
      cursor.setDate(cursor.getDate() + 1);
    }
  } else {
    for (let month = 0; month < 12; month += 1) {
      const key = `${periodDate.getFullYear()}-${String(month + 1).padStart(2, '0')}`;
      points.push({ date: key, ...(rows.get(key) || {}) });
    }
  }
  return points.map((point) => ({
    ...point,
    income: Number(point.income) || 0,
    expense: Number(point.expense) || 0,
    savings: Number(point.savings) || 0,
  }));
}

function MetricTrendChart({ points, metric, currency, granularity }) {
  const width = 480;
  const height = 184;
  const padding = { top: 14, right: 8, bottom: 18, left: 8 };
  const values = points.map((point) => point[metric.key]);
  const minValue = Math.min(0, ...values);
  const maxValue = Math.max(1, ...values);
  const range = maxValue - minValue || 1;
  const getX = (index) =>
    points.length <= 1
      ? width / 2
      : padding.left + (index * (width - padding.left - padding.right)) / (points.length - 1);
  const getY = (value) =>
    padding.top + ((maxValue - value) * (height - padding.top - padding.bottom)) / range;
  const coords = points.map((point, index) => `${getX(index)},${getY(point[metric.key])}`);
  const line = coords.join(' ');
  const area = `${getX(0)},${getY(0)} ${line} ${getX(points.length - 1)},${getY(0)}`;
  const labels = points.filter((_, index) => {
    const step = Math.max(1, Math.ceil(points.length / 4));
    return index % step === 0 || index === points.length - 1;
  });

  return (
    <div>
      <div className='flex items-end justify-between gap-3'>
        <div>
          <p className='text-xs font-medium text-gray-500'>{metric.label}</p>
          <p className='mt-1 text-2xl font-bold tracking-tight text-gray-900'>
            {formatMoney(metric.total, currency)}
          </p>
        </div>
        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${metric.badge}`}>
          {granularity}
        </span>
      </div>
      <p className='mt-1 text-xs text-gray-500'>{metric.description}</p>
      {points.length === 0 ? (
        <p className='py-10 text-center text-sm text-gray-500'>No trend data in this period.</p>
      ) : (
        <>
          <svg
            viewBox={`0 0 ${width} ${height}`}
            role='img'
            aria-label={`${metric.label} trend in ${currency}`}
            className='mt-4 h-44 w-full'
          >
            <defs>
              <linearGradient id={`fill-${metric.key}`} x1='0' x2='0' y1='0' y2='1'>
                <stop offset='0%' stopColor={metric.color} stopOpacity='0.2' />
                <stop offset='100%' stopColor={metric.color} stopOpacity='0.01' />
              </linearGradient>
            </defs>
            {[0, 0.5, 1].map((fraction) => {
              const y = padding.top + fraction * (height - padding.top - padding.bottom);
              return (
                <line
                  key={fraction}
                  x1={padding.left}
                  x2={width - padding.right}
                  y1={y}
                  y2={y}
                  stroke='#e5e7eb'
                  strokeDasharray='3 5'
                />
              );
            })}
            <polygon points={area} fill={`url(#fill-${metric.key})`} />
            {points.length > 1 && (
              <polyline
                points={line}
                fill='none'
                stroke={metric.color}
                strokeWidth='3'
                strokeLinejoin='round'
                strokeLinecap='round'
              />
            )}
            {points.map((point, index) => (
              <circle
                key={`${metric.key}-${point.date}`}
                cx={getX(index)}
                cy={getY(point[metric.key])}
                r={index === points.length - 1 ? 4 : 2}
                fill={metric.color}
              >
                <title>
                  {point.date}: {formatMoney(point[metric.key], currency)}
                </title>
              </circle>
            ))}
          </svg>
          <div className='flex justify-between text-[11px] text-gray-400'>
            {labels.map((point) => (
              <span key={point.date}>{periodTypeLabel(point.date)}</span>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function CategoryBreakdownChart({ categories, currency }) {
  const expenses = categories
    .filter((category) => category.categoryType === 'expense' && category.total > 0)
    .slice(0, 5);
  const maxTotal = Math.max(1, ...expenses.map((category) => category.total));

  return (
    <div className='space-y-4'>
      {expenses.length === 0 ? (
        <p className='py-6 text-sm text-gray-500'>No expense categories to compare.</p>
      ) : (
        expenses.map((category, index) => (
          <div key={category.categoryId}>
            <div className='mb-1.5 flex items-center justify-between gap-3 text-sm'>
              <span className='truncate font-medium text-gray-700'>
                <span className='mr-2 text-gray-400'>{String(index + 1).padStart(2, '0')}</span>
                {category.categoryName}
              </span>
              <span className='shrink-0 font-semibold text-gray-900'>
                {formatMoney(category.total, currency)}
              </span>
            </div>
            <div className='h-2 overflow-hidden rounded-full bg-gray-100'>
              <div
                className='h-full rounded-full bg-gradient-to-r from-violet-500 to-indigo-500'
                style={{ width: `${(category.total / maxTotal) * 100}%` }}
              />
            </div>
          </div>
        ))
      )}
    </div>
  );
}

function BudgetProgressChart({ categories, currency }) {
  const budgeted = categories.filter(
    (category) => category.categoryType === 'expense' && category.budgetAmount > 0,
  );

  return (
    <div className='space-y-4'>
      {budgeted.length === 0 ? (
        <p className='py-6 text-sm text-gray-500'>No expense budgets set for this month.</p>
      ) : (
        budgeted
          .sort((a, b) => b.percentUsed - a.percentUsed)
          .slice(0, 5)
          .map((category) => (
            <div key={category.categoryId}>
              <div className='mb-1.5 flex items-center justify-between gap-3 text-sm'>
                <span className='truncate font-medium text-gray-700'>{category.categoryName}</span>
                <span
                  className={`shrink-0 text-xs font-semibold ${
                    category.percentUsed >= 100
                      ? 'text-rose-600'
                      : category.percentUsed >= 80
                        ? 'text-amber-600'
                        : 'text-gray-500'
                  }`}
                >
                  {category.percentUsed}% used
                </span>
              </div>
              <div className='h-2 overflow-hidden rounded-full bg-gray-100'>
                <div
                  className={`h-full rounded-full ${
                    category.percentUsed >= 100
                      ? 'bg-rose-500'
                      : category.percentUsed >= 80
                        ? 'bg-amber-400'
                        : 'bg-emerald-500'
                  }`}
                  style={{ width: `${Math.min(category.percentUsed, 100)}%` }}
                />
              </div>
              <div className='mt-1 flex justify-between text-[11px] text-gray-400'>
                <span>{formatMoney(category.total, currency)} spent</span>
                <span>{formatMoney(category.budgetAmount, currency)} budget</span>
              </div>
            </div>
          ))
      )}
    </div>
  );
}

function periodTypeLabel(key) {
  if (key.length === 7) {
    const [year, month] = key.split('-').map(Number);
    return new Date(year, month - 1, 1).toLocaleDateString('en-IN', { month: 'short' });
  }
  return new Date(`${key}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric' });
}

function Comparison({ current, previous, currency, positiveWhenUp }) {
  const change = Number(current || 0) - Number(previous || 0);
  const percent = Number(previous) > 0 ? (change / Number(previous)) * 100 : null;
  const isUp = change > 0;
  const changeColor =
    change === 0 ? 'text-gray-500' : isUp === positiveWhenUp ? 'text-emerald-700' : 'text-rose-600';
  return (
    <div className={`mt-2 flex items-center gap-1 text-xs ${changeColor}`}>
      {isUp ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
      <span>
        {previous > 0 && percent !== null ? `${Math.abs(percent).toFixed(0)}%` : 'vs. '}
        {previous > 0 ? (isUp ? 'higher' : change < 0 ? 'lower' : 'unchanged') : 'previous period'}
      </span>
      <span className='text-gray-400'>({formatMoney(Math.abs(change), currency)})</span>
    </div>
  );
}

export default function CategoryAnalytics() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const accountId = searchParams.get('account');
  const [account, setAccount] = useState(null);
  const [overview, setOverview] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [transactionsLoading, setTransactionsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filterType, setFilterType] = useState('all');
  const [periodType, setPeriodType] = useState('month');
  const [periodDate, setPeriodDate] = useState(new Date());
  const [expandedCategories, setExpandedCategories] = useState({});
  const periodRange = useMemo(
    () => getPeriodRange(periodDate, periodType),
    [periodDate, periodType],
  );
  const currency = /^[A-Z]{3}$/.test(account?.currency || '') ? account.currency : 'INR';
  const periodLabel =
    periodType === 'month'
      ? periodDate.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
      : String(periodDate.getFullYear());

  useEffect(() => {
    if (!accountId) {
      setAccount(null);
      return;
    }
    let cancelled = false;
    const loadAccount = async () => {
      try {
        const response = await accountService.getAccountById(accountId);
        if (!cancelled) setAccount(response?.data || response);
      } catch (err) {
        logger.error('Failed to load selected account:', err);
        if (!cancelled) setError('Failed to load the selected account.');
      }
    };
    loadAccount();
    return () => {
      cancelled = true;
    };
  }, [accountId]);

  useEffect(() => {
    if (!accountId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    const fetchOverview = async () => {
      setLoading(true);
      setError(null);
      const params = {
        startDate: periodRange.start.toISOString(),
        endDate: periodRange.end.toISOString(),
        comparisonStartDate: periodRange.comparisonStart.toISOString(),
        comparisonEndDate: periodRange.comparisonEnd.toISOString(),
        periodType,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
      };
      if (periodType === 'month') {
        params.budgetMonth = periodDate.getMonth() + 1;
        params.budgetYear = periodDate.getFullYear();
      }
      try {
        const result = await getAnalyticsOverview(accountId, params);
        if (!cancelled) setOverview(result);
      } catch (err) {
        logger.error('Failed to fetch analytics overview:', err);
        if (!cancelled) {
          setOverview(null);
          setError('Failed to load analytics. Please try again.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchOverview();
    return () => {
      cancelled = true;
    };
  }, [accountId, periodType, periodDate, periodRange]);

  useEffect(() => {
    if (!accountId || !selectedCategory) {
      setTransactions([]);
      return;
    }
    let cancelled = false;
    const fetchCategoryTransactions = async () => {
      setTransactionsLoading(true);
      try {
        const result = await getTransactions(accountId, {
          categoryId: selectedCategory.categoryId,
          type: selectedCategory.categoryType,
          startDate: periodRange.start.toISOString(),
          endDate: new Date(periodRange.end.getTime() - 1).toISOString(),
          limit: 1000,
        });
        if (!cancelled) setTransactions(Array.isArray(result) ? result : result?.data || []);
      } catch (err) {
        logger.error('Failed to fetch category transactions:', err);
        if (!cancelled) setTransactions([]);
      } finally {
        if (!cancelled) setTransactionsLoading(false);
      }
    };
    fetchCategoryTransactions();
    return () => {
      cancelled = true;
    };
  }, [accountId, periodRange, selectedCategory]);

  const categories = useMemo(() => {
    const all = overview?.categories || [];
    return filterType === 'all'
      ? all
      : all.filter((category) => category.categoryType === filterType);
  }, [filterType, overview]);
  const trendPoints = useMemo(
    () => buildTrendPoints(overview?.trends || [], periodDate, periodType),
    [overview, periodDate, periodType],
  );
  const trendMetrics = [
    {
      key: 'income',
      label: 'Income trend',
      total: overview?.summary.income.total || 0,
      previous: overview?.comparison.income.total || 0,
      color: '#059669',
      badge: 'bg-emerald-50 text-emerald-700',
      description: 'Money coming into this account',
      positiveWhenUp: true,
    },
    {
      key: 'expense',
      label: 'Expense trend',
      total: overview?.summary.expense.total || 0,
      previous: overview?.comparison.expense.total || 0,
      color: '#e11d48',
      badge: 'bg-rose-50 text-rose-700',
      description: 'Spending across all categories',
      positiveWhenUp: false,
    },
    {
      key: 'savings',
      label: 'Savings trend',
      total: overview?.summary.savings.net || 0,
      previous: overview?.comparison.savings.net || 0,
      color: '#4f46e5',
      badge: 'bg-indigo-50 text-indigo-700',
      description: 'Recorded contributions minus withdrawals',
      positiveWhenUp: true,
    },
  ];

  const movePeriod = (direction) => {
    setPeriodDate((current) =>
      periodType === 'month'
        ? new Date(current.getFullYear(), current.getMonth() + direction, 1)
        : new Date(current.getFullYear() + direction, current.getMonth(), 1),
    );
    setSelectedCategory(null);
  };

  const toggleCategory = (category) => {
    setExpandedCategories((current) => ({
      ...current,
      [category.categoryId]: !current[category.categoryId],
    }));
    setSelectedCategory(category);
  };

  const goToInsight = (insight) => {
    if (insight.action === 'budget') {
      navigate(`/accounts/${accountId}/budgets`);
    } else if (insight.action === 'savings') {
      navigate('/savings');
    } else {
      const category = overview?.categories?.find((item) => item.categoryId === insight.categoryId);
      if (category) {
        setFilterType(category.categoryType);
        setExpandedCategories((current) => ({ ...current, [category.categoryId]: true }));
        setSelectedCategory(category);
      }
    }
  };

  return (
    <Layout>
      <main className='mx-auto max-w-7xl space-y-6 px-4 py-5 sm:px-6'>
        <header className='flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
          <div className='flex items-start gap-3'>
            <button
              className='mt-1 rounded-md p-2 text-gray-600 hover:bg-gray-100'
              onClick={() => navigate(-1)}
              aria-label='Go back'
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className='text-2xl font-semibold text-gray-900'>Analytics &amp; Insights</h1>
              <p className='mt-1 text-sm text-gray-600'>
                Explore category spending, budgets, cash flow, and recorded savings.
              </p>
            </div>
          </div>
          <div className='rounded-lg border border-gray-200 bg-white px-4 py-2'>
            <p className='text-[11px] font-semibold uppercase tracking-wide text-gray-500'>
              Account
            </p>
            <p className='font-medium text-gray-900'>
              {account?.name || (accountId ? 'Loading account…' : 'No account selected')}
            </p>
          </div>
        </header>

        <section className='card flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between'>
          <div className='flex rounded-lg bg-gray-100 p-1'>
            {[
              ['month', 'Monthly'],
              ['year', 'Yearly'],
            ].map(([value, label]) => (
              <button
                key={value}
                type='button'
                onClick={() => {
                  setPeriodType(value);
                  setSelectedCategory(null);
                }}
                className={`rounded-md px-4 py-2 text-sm font-medium ${
                  periodType === value ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-600'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <div className='flex items-center justify-center gap-3'>
            <button
              type='button'
              onClick={() => movePeriod(-1)}
              className='rounded-md border border-gray-300 p-2 hover:bg-gray-50'
              aria-label='Previous period'
            >
              <ChevronLeft size={18} />
            </button>
            <span className='min-w-36 text-center font-semibold text-gray-900'>{periodLabel}</span>
            <button
              type='button'
              onClick={() => movePeriod(1)}
              className='rounded-md border border-gray-300 p-2 hover:bg-gray-50'
              aria-label='Next period'
            >
              <ChevronRight size={18} />
            </button>
          </div>
          <div className='flex items-center gap-2 text-sm text-gray-500'>
            <BarChart3 size={17} />
            Compared with the previous {periodType}
          </div>
        </section>

        {error && (
          <div className='flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800'>
            <AlertCircle size={18} className='shrink-0' />
            {error}
          </div>
        )}

        {loading ? (
          <div className='card p-12 text-center text-sm text-gray-500'>Loading analytics…</div>
        ) : overview ? (
          <>
            <section className='grid gap-4 sm:grid-cols-2 xl:grid-cols-4'>
              {[
                {
                  title: 'Income',
                  amount: overview.summary.income.total,
                  previous: overview.comparison.income.total,
                  tint: 'from-emerald-50',
                  text: 'text-emerald-700',
                  icon: ArrowDownRight,
                  positiveWhenUp: true,
                },
                {
                  title: 'Expenses',
                  amount: overview.summary.expense.total,
                  previous: overview.comparison.expense.total,
                  tint: 'from-rose-50',
                  text: 'text-rose-700',
                  icon: ArrowUpRight,
                  positiveWhenUp: false,
                },
                {
                  title: 'Net cash flow',
                  amount: overview.summary.netCashflow,
                  previous: overview.comparison.netCashflow,
                  tint: 'from-indigo-50',
                  text: 'text-indigo-700',
                  icon: Wallet,
                  positiveWhenUp: true,
                },
                {
                  title: 'Recorded net savings',
                  amount: overview.summary.savings.net,
                  previous: overview.comparison.savings.net,
                  tint: 'from-violet-50',
                  text: 'text-violet-700',
                  icon: PiggyBank,
                  positiveWhenUp: true,
                },
              ].map((metric) => {
                const Icon = metric.icon;
                return (
                  <article
                    key={metric.title}
                    className={`card bg-gradient-to-br ${metric.tint} to-white p-5`}
                  >
                    <div className='flex items-start justify-between'>
                      <div>
                        <p className='text-xs font-semibold uppercase tracking-wide text-gray-500'>
                          {metric.title}
                        </p>
                        <p className={`mt-2 text-2xl font-bold ${metric.text}`}>
                          {formatMoney(metric.amount, currency)}
                        </p>
                        <Comparison
                          current={metric.amount}
                          previous={metric.previous}
                          currency={currency}
                          positiveWhenUp={metric.positiveWhenUp}
                        />
                      </div>
                      <Icon className={`${metric.text} opacity-70`} size={22} />
                    </div>
                  </article>
                );
              })}
            </section>

            <section>
              <div className='mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between'>
                <div>
                  <h2 className='text-lg font-semibold text-gray-900'>Trends over time</h2>
                  <p className='mt-1 text-sm text-gray-500'>
                    Separate views make each money flow easier to read.
                  </p>
                </div>
                <span className='text-xs font-medium text-gray-400'>
                  {periodType === 'month' ? 'Daily' : 'Monthly'} · {periodLabel}
                </span>
              </div>
              <div className='grid gap-4 lg:grid-cols-3'>
                {trendMetrics.map((metric) => (
                  <article key={metric.key} className='card overflow-hidden p-4 sm:p-5'>
                    <MetricTrendChart
                      points={trendPoints}
                      metric={metric}
                      currency={currency}
                      granularity={periodType === 'month' ? 'Daily' : 'Monthly'}
                    />
                    <div className='mt-3 border-t border-gray-100 pt-2'>
                      <Comparison
                        current={metric.total}
                        previous={metric.previous}
                        currency={currency}
                        positiveWhenUp={metric.positiveWhenUp}
                      />
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <section className='grid gap-4 lg:grid-cols-2'>
              <article className='card p-5 sm:p-6'>
                <div className='mb-5 flex items-start justify-between gap-3'>
                  <div>
                    <h2 className='font-semibold text-gray-900'>Where expenses go</h2>
                    <p className='mt-1 text-sm text-gray-500'>Top categories by actual spending</p>
                  </div>
                  <span className='rounded-lg bg-violet-50 p-2 text-violet-700'>
                    <BarChart3 size={18} />
                  </span>
                </div>
                <CategoryBreakdownChart categories={overview.categories} currency={currency} />
              </article>
              {periodType === 'month' && (
                <article className='card p-5 sm:p-6'>
                  <div className='mb-5 flex items-start justify-between gap-3'>
                    <div>
                      <h2 className='font-semibold text-gray-900'>Budget pace</h2>
                      <p className='mt-1 text-sm text-gray-500'>Monthly budget usage by category</p>
                    </div>
                    <span className='rounded-lg bg-emerald-50 p-2 text-emerald-700'>
                      <Wallet size={18} />
                    </span>
                  </div>
                  <BudgetProgressChart categories={overview.categories} currency={currency} />
                </article>
              )}
            </section>

            <section className='card overflow-hidden'>
              <div className='flex flex-col gap-4 border-b border-gray-200 p-5 sm:flex-row sm:items-center sm:justify-between'>
                <div>
                  <h2 className='text-lg font-semibold text-gray-900'>Categories &amp; budgets</h2>
                  <p className='mt-1 text-sm text-gray-500'>
                    Compare category and subcategory activity with the previous period
                    {periodType === 'month' ? ' and monthly budgets.' : '.'}
                  </p>
                </div>
                <div className='flex rounded-lg bg-gray-100 p-1'>
                  {[
                    ['all', 'All'],
                    ['expense', 'Expenses'],
                    ['income', 'Income'],
                  ].map(([value, label]) => (
                    <button
                      key={value}
                      type='button'
                      onClick={() => setFilterType(value)}
                      className={`rounded-md px-3 py-1.5 text-xs font-medium ${
                        filterType === value
                          ? 'bg-white text-indigo-700 shadow-sm'
                          : 'text-gray-600'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              {periodType === 'year' && (
                <p className='border-b border-indigo-100 bg-indigo-50 px-5 py-2.5 text-xs text-indigo-800'>
                  Budgets are monthly, so yearly views show actuals and period comparisons only.
                </p>
              )}
              {categories.length === 0 ? (
                <p className='p-10 text-center text-sm text-gray-500'>
                  No category activity for this period.
                </p>
              ) : (
                <div className='overflow-x-auto'>
                  <table className='w-full min-w-[850px] border-collapse text-left'>
                    <thead className='bg-gray-50'>
                      <tr className='border-b border-gray-200'>
                        {['Category', 'Actual', 'Previous period', 'Change', 'Budget status'].map(
                          (heading) => (
                            <th
                              key={heading}
                              scope='col'
                              className='px-5 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500'
                            >
                              {heading}
                            </th>
                          ),
                        )}
                      </tr>
                    </thead>
                    <tbody className='divide-y divide-gray-100'>
                      {categories.map((category) => {
                        const isExpanded = Boolean(expandedCategories[category.categoryId]);
                        const changeTone =
                          category.changeAmount === 0
                            ? 'bg-gray-100 text-gray-600'
                            : category.categoryType === 'expense'
                              ? category.changeAmount > 0
                                ? 'bg-rose-50 text-rose-700'
                                : 'bg-emerald-50 text-emerald-700'
                              : category.changeAmount > 0
                                ? 'bg-emerald-50 text-emerald-700'
                                : 'bg-gray-100 text-gray-600';

                        return (
                          <Fragment key={`${category.categoryType}-${category.categoryId}`}>
                            <tr
                              className={`cursor-pointer transition hover:bg-gray-50 ${
                                isExpanded || selectedCategory?.categoryId === category.categoryId
                                  ? 'bg-indigo-50/50'
                                  : 'bg-white'
                              }`}
                              onClick={() => toggleCategory(category)}
                              aria-expanded={isExpanded}
                            >
                              <th scope='row' className='px-5 py-4 font-normal'>
                                <button
                                  type='button'
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    toggleCategory(category);
                                  }}
                                  aria-expanded={isExpanded}
                                  className='flex items-center gap-3 text-left'
                                >
                                  <span
                                    className='flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-lg'
                                    style={
                                      category.categoryColor
                                        ? { color: category.categoryColor }
                                        : undefined
                                    }
                                  >
                                    {category.categoryIcon || '•'}
                                  </span>
                                  <span>
                                    <span className='block font-semibold text-gray-900'>
                                      {category.categoryName}
                                    </span>
                                    <span className='text-xs capitalize text-gray-500'>
                                      {category.categoryType} · {category.count} transactions
                                    </span>
                                  </span>
                                  <ChevronDown
                                    size={16}
                                    className={`ml-1 shrink-0 text-gray-400 transition-transform ${
                                      isExpanded ? 'rotate-180' : ''
                                    }`}
                                  />
                                </button>
                              </th>
                              <td className='whitespace-nowrap px-5 py-4 font-semibold text-gray-900'>
                                {formatMoney(category.total, currency)}
                              </td>
                              <td className='whitespace-nowrap px-5 py-4 text-sm text-gray-700'>
                                {formatMoney(category.previousTotal, currency)}
                              </td>
                              <td className='whitespace-nowrap px-5 py-4'>
                                <span
                                  className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${changeTone}`}
                                >
                                  {category.changePercent === null
                                    ? category.total > 0
                                      ? 'New'
                                      : '—'
                                    : `${category.changeAmount > 0 ? '+' : ''}${category.changePercent}%`}
                                </span>
                              </td>
                              <td className='min-w-56 px-5 py-4'>
                                {category.budgetAmount !== null ? (
                                  <div className='min-w-44'>
                                    <div className='mb-1 flex items-center justify-between gap-3 text-xs'>
                                      <span className='text-gray-500'>
                                        {formatMoney(category.total, currency)} /{' '}
                                        {formatMoney(category.budgetAmount, currency)}
                                      </span>
                                      <span
                                        className={`font-semibold ${
                                          category.remaining < 0
                                            ? 'text-rose-600'
                                            : 'text-gray-500'
                                        }`}
                                      >
                                        {category.percentUsed}%
                                      </span>
                                    </div>
                                    <div className='h-1.5 overflow-hidden rounded-full bg-gray-100'>
                                      <div
                                        className={`h-full rounded-full ${
                                          category.percentUsed >= 100
                                            ? 'bg-rose-500'
                                            : category.percentUsed >= 80
                                              ? 'bg-amber-500'
                                              : 'bg-indigo-500'
                                        }`}
                                        style={{
                                          width: `${Math.min(100, category.percentUsed)}%`,
                                        }}
                                      />
                                    </div>
                                    <span
                                      className={`mt-1 block text-[11px] ${
                                        category.remaining < 0
                                          ? 'text-rose-600'
                                          : 'text-gray-400'
                                      }`}
                                    >
                                      {category.remaining < 0
                                        ? `${formatMoney(Math.abs(category.remaining), currency)} over`
                                        : `${formatMoney(category.remaining, currency)} remaining`}
                                    </span>
                                  </div>
                                ) : (
                                  <span className='text-sm text-gray-400'>
                                    {category.categoryType === 'expense' && periodType === 'month'
                                      ? 'No budget set'
                                      : '—'}
                                  </span>
                                )}
                              </td>
                            </tr>
                            {isExpanded && (
                              <tr key={`${category.categoryType}-${category.categoryId}-details`}>
                                <td colSpan={5} className='bg-gray-50 px-5 py-4'>
                                  {category.subcategories.length > 0 ? (
                                    <div className='overflow-x-auto rounded-lg border border-gray-200 bg-white'>
                                      <table className='w-full min-w-[700px] text-left text-sm'>
                                        <thead className='bg-gray-50'>
                                          <tr>
                                            {[
                                              'Subcategory',
                                              'Actual',
                                              'Previous period',
                                              'Change',
                                              ...(periodType === 'month' &&
                                              category.categoryType === 'expense'
                                                ? ['Budget status']
                                                : []),
                                            ].map((heading) => (
                                              <th
                                                key={heading}
                                                scope='col'
                                                className='px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-gray-500'
                                              >
                                                {heading}
                                              </th>
                                            ))}
                                          </tr>
                                        </thead>
                                        <tbody className='divide-y divide-gray-100'>
                                          {category.subcategories.map((subcategory) => {
                                            const subcategoryChangeTone =
                                              subcategory.changeAmount === 0
                                                ? 'text-gray-500'
                                                : category.categoryType === 'expense'
                                                  ? subcategory.changeAmount > 0
                                                    ? 'text-rose-600'
                                                    : 'text-emerald-700'
                                                  : subcategory.changeAmount > 0
                                                    ? 'text-emerald-700'
                                                    : 'text-gray-500';
                                            return (
                                              <tr key={subcategory.subcategoryId}>
                                                <th
                                                  scope='row'
                                                  className='px-4 py-3 font-medium text-gray-800'
                                                >
                                                  {subcategory.subcategoryName}
                                                </th>
                                                <td className='whitespace-nowrap px-4 py-3 font-medium text-gray-800'>
                                                  {formatMoney(subcategory.total, currency)}
                                                  <span className='ml-1 text-xs font-normal text-gray-400'>
                                                    · {subcategory.count}
                                                  </span>
                                                </td>
                                                <td className='whitespace-nowrap px-4 py-3 text-gray-600'>
                                                  {formatMoney(subcategory.previousTotal, currency)}
                                                </td>
                                                <td
                                                  className={`whitespace-nowrap px-4 py-3 font-medium ${subcategoryChangeTone}`}
                                                >
                                                  {subcategory.changePercent === null
                                                    ? subcategory.total > 0
                                                      ? 'New'
                                                      : '—'
                                                    : `${subcategory.changeAmount > 0 ? '+' : ''}${subcategory.changePercent}%`}
                                                </td>
                                                {periodType === 'month' &&
                                                  category.categoryType === 'expense' && (
                                                    <td className='min-w-52 px-4 py-3'>
                                                      {subcategory.budgetAmount === undefined ? (
                                                        <span className='text-gray-400'>
                                                          No budget
                                                        </span>
                                                      ) : (
                                                        <div>
                                                          <div className='mb-1 flex justify-between gap-2 text-xs text-gray-500'>
                                                            <span>
                                                              {formatMoney(
                                                                subcategory.total,
                                                                currency,
                                                              )}{' '}
                                                              /{' '}
                                                              {formatMoney(
                                                                subcategory.budgetAmount,
                                                                currency,
                                                              )}
                                                            </span>
                                                            <span
                                                              className={
                                                                subcategory.remaining < 0
                                                                  ? 'font-semibold text-rose-600'
                                                                  : ''
                                                              }
                                                            >
                                                              {subcategory.percentUsed}%
                                                            </span>
                                                          </div>
                                                          <div className='h-1.5 overflow-hidden rounded-full bg-gray-100'>
                                                            <div
                                                              className={`h-full rounded-full ${
                                                                subcategory.percentUsed >= 100
                                                                  ? 'bg-rose-500'
                                                                  : subcategory.percentUsed >= 80
                                                                    ? 'bg-amber-500'
                                                                    : 'bg-indigo-500'
                                                              }`}
                                                              style={{
                                                                width: `${Math.min(100, subcategory.percentUsed)}%`,
                                                              }}
                                                            />
                                                          </div>
                                                          <span
                                                            className={`mt-1 block text-[11px] ${
                                                              subcategory.remaining < 0
                                                                ? 'text-rose-600'
                                                                : 'text-gray-400'
                                                            }`}
                                                          >
                                                            {subcategory.remaining < 0
                                                              ? `${formatMoney(Math.abs(subcategory.remaining), currency)} over`
                                                              : `${formatMoney(subcategory.remaining, currency)} remaining`}
                                                          </span>
                                                        </div>
                                                      )}
                                                    </td>
                                                  )}
                                              </tr>
                                            );
                                          })}
                                        </tbody>
                                      </table>
                                    </div>
                                  ) : (
                                    <p className='rounded-lg border border-dashed border-gray-300 bg-white px-4 py-6 text-center text-sm text-gray-500'>
                                      No subcategory analytics for this category in the selected
                                      period.
                                    </p>
                                  )}
                                </td>
                              </tr>
                            )}
                          </Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <section className='card p-5 sm:p-6'>
              <div className='mb-4 flex items-center gap-2'>
                <Lightbulb size={19} className='text-amber-500' />
                <div>
                  <h2 className='text-lg font-semibold text-gray-900'>Actionable insights</h2>
                  <p className='text-sm text-gray-500'>
                    Signals based on your budgets and recent activity.
                  </p>
                </div>
              </div>
              {overview.insights.length === 0 ? (
                <p className='rounded-lg bg-gray-50 p-4 text-sm text-gray-600'>
                  No spending alerts for this period. Add transactions or a monthly budget to get
                  personalized insights here.
                </p>
              ) : (
                <div className='grid gap-3 md:grid-cols-2'>
                  {overview.insights.map((insight) => (
                    <article
                      key={insight.id}
                      className={`flex items-start justify-between gap-3 rounded-lg border p-4 ${
                        insight.kind === 'warning'
                          ? 'border-amber-200 bg-amber-50'
                          : 'border-indigo-100 bg-indigo-50/60'
                      }`}
                    >
                      <div>
                        <h3 className='font-medium text-gray-900'>{insight.title}</h3>
                        <p className='mt-1 text-sm text-gray-600'>{insight.detail}</p>
                      </div>
                      <button
                        type='button'
                        onClick={() => goToInsight(insight)}
                        className='shrink-0 rounded-md bg-white px-3 py-1.5 text-xs font-semibold text-indigo-700 shadow-sm hover:bg-indigo-50'
                      >
                        {insight.actionLabel}
                      </button>
                    </article>
                  ))}
                </div>
              )}
            </section>

            {selectedCategory && (
              <section className='card overflow-hidden'>
                <div className='flex items-center justify-between border-b border-gray-200 px-5 py-4'>
                  <div>
                    <h2 className='font-semibold text-gray-900'>
                      {selectedCategory.categoryName} transactions
                    </h2>
                    <p className='mt-1 text-sm text-gray-500'>{periodLabel}</p>
                  </div>
                  <button
                    type='button'
                    onClick={() => setSelectedCategory(null)}
                    className='rounded-md px-3 py-1.5 text-sm text-gray-500 hover:bg-gray-100'
                  >
                    Close
                  </button>
                </div>
                <div className='space-y-3 p-4'>
                  {transactionsLoading ? (
                    <p className='py-6 text-center text-sm text-gray-500'>Loading transactions…</p>
                  ) : transactions.length === 0 ? (
                    <p className='py-6 text-center text-sm text-gray-500'>
                      No transactions found for this category and period.
                    </p>
                  ) : (
                    transactions.map((transaction) => (
                      <TransactionCard
                        key={transaction._id}
                        transaction={transaction}
                        onClick={() =>
                          navigate(`/accounts/${accountId}/transaction/${transaction._id}`)
                        }
                      />
                    ))
                  )}
                </div>
              </section>
            )}
          </>
        ) : !error ? (
          <div className='card p-10 text-center text-sm text-gray-500'>
            {accountId
              ? 'No analytics are available for this period.'
              : 'Open analytics from an account dashboard to see insights.'}
          </div>
        ) : null}
      </main>
    </Layout>
  );
}
