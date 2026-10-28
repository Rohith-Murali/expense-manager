import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  ArrowDownLeft,
  ArrowUpRight,
  CalendarClock,
  CreditCard,
  PiggyBank,
  Wallet,
} from 'lucide-react';
import Layout from '../components/layout/Layout';
import AccountsList from '../components/accounts/AccountList';
import accountService from '../services/accountService';
import budgetService from '../services/budgetService';
import { getTransactionStats, getTransactions } from '../services/transactionService';
import { getBuckets, getGoals, getSavingsSummary } from '../services/savingsService';
import { logger } from '../utils/logger';
import { getNextCreditCardDue, unwrapResponseData } from '../utils/financialOverview';

const EMPTY_SAVINGS_SUMMARY = {
  bucketCount: 0,
  totalSaved: 0,
  goalCount: 0,
  completedGoals: 0,
  totalTarget: 0,
};

const formatRupees = (amount) =>
  `₹${Number(amount || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;

const formatDate = (date) =>
  new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).format(
    new Date(date),
  );

const Home = () => {
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const [accounts, setAccounts] = useState([]);
  const [monthlySummary, setMonthlySummary] = useState({
    income: 0,
    expense: 0,
    budget: 0,
  });
  const [upcomingCardDues, setUpcomingCardDues] = useState([]);
  const [recurringTransactions, setRecurringTransactions] = useState([]);
  const [loadingStats, setLoadingStats] = useState(true);
  const [overviewError, setOverviewError] = useState('');
  const [overviewWarning, setOverviewWarning] = useState('');
  const [savingsSummary, setSavingsSummary] = useState(EMPTY_SAVINGS_SUMMARY);
  const [savingsBuckets, setSavingsBuckets] = useState([]);
  const [savingsGoals, setSavingsGoals] = useState([]);
  const [loadingSavings, setLoadingSavings] = useState(true);
  const [savingsError, setSavingsError] = useState('');

  useEffect(() => {
    let cancelled = false;
    const fetchSummary = async () => {
      setLoadingStats(true);
      setOverviewError('');
      setOverviewWarning('');
      try {
        const accounts = unwrapResponseData(await accountService.getAccounts(false));
        if (!Array.isArray(accounts)) {
          throw new Error('Accounts data was returned in an unexpected format');
        }
        if (cancelled) return;
        setAccounts(accounts);

        const now = new Date();
        const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        const warnings = [];
        const accountResults = await Promise.all(
          accounts.map(async (account) => {
            const [statsResult, budgetResult, recurringResult, creditResult] =
              await Promise.allSettled([
                getTransactionStats(account._id, {
                  startDate: startDate.toISOString(),
                  endDate: endDate.toISOString(),
                }),
                budgetService.getMonthlyBudget(account._id, {
                  month: now.getMonth() + 1,
                  year: now.getFullYear(),
                }),
                getTransactions(account._id, {
                  isRecurring: true,
                  limit: 3,
                }),
                account.type === 'CREDIT_CARD'
                  ? accountService.getCreditCardSummary(account._id)
                  : Promise.resolve(null),
              ]);

            if (statsResult.status === 'rejected') {
              logger.error('Error fetching monthly stats for account', account._id, statsResult.reason);
              warnings.push(`Monthly summary unavailable for ${account.name}.`);
            }
            if (budgetResult.status === 'rejected') {
              logger.error('Error fetching monthly budget for account', account._id, budgetResult.reason);
              warnings.push(`Budget status unavailable for ${account.name}.`);
            }
            if (recurringResult.status === 'rejected') {
              logger.error('Error fetching recurring transactions for account', account._id, recurringResult.reason);
              warnings.push(`Recurring items unavailable for ${account.name}.`);
            }
            if (creditResult.status === 'rejected') {
              logger.error('Error fetching credit-card due for account', account._id, creditResult.reason);
              warnings.push(`Card due details unavailable for ${account.name}.`);
            }

            const summary = statsResult.status === 'fulfilled' ? statsResult.value : null;
            const budget = budgetResult.status === 'fulfilled' ? budgetResult.value : null;
            const recurring = recurringResult.status === 'fulfilled' ? recurringResult.value : [];
            const creditSummary =
              creditResult.status === 'fulfilled'
                ? unwrapResponseData(creditResult.value)
                : null;

            return {
              income: Number(summary?.income?.total || 0),
              expense: Number(summary?.expense?.total || 0),
              budget: Number(budget?.amount || 0),
              recurring: (Array.isArray(recurring) ? recurring : recurring?.data || []).map(
                (transaction) => ({
                  ...transaction,
                  accountId: account._id,
                  accountName: account.name,
                }),
              ),
              cardDue:
                account.type === 'CREDIT_CARD' && creditSummary
                  ? {
                      ...getNextCreditCardDue(account, creditSummary, now),
                      accountId: account._id,
                      accountName: account.name,
                    }
                  : null,
            };
          }),
        );

        if (cancelled) return;
        setMonthlySummary(
          accountResults.reduce(
            (totals, result) => ({
              income: totals.income + result.income,
              expense: totals.expense + result.expense,
              budget: totals.budget + result.budget,
            }),
            { income: 0, expense: 0, budget: 0 },
          ),
        );
        setRecurringTransactions(
          accountResults.flatMap((result) => result.recurring).slice(0, 5),
        );
        setUpcomingCardDues(
          accountResults
            .flatMap((result) => (result.cardDue ? [result.cardDue] : []))
            .sort((a, b) => a.dueDate - b.dueDate)
            .slice(0, 4),
        );
        if (warnings.length > 0) setOverviewWarning([...new Set(warnings)].join(' '));
      } catch (error) {
        logger.error('Error fetching home financial overview:', error);
        if (!cancelled) {
          setOverviewError(
            error.message || error.response?.data?.message || 'Could not load your financial overview.',
          );
        }
      } finally {
        if (!cancelled) setLoadingStats(false);
      }
    };

    fetchSummary();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const fetchSavings = async () => {
      try {
        setLoadingSavings(true);
        setSavingsError('');
        const [summaryResponse, bucketsResponse, goalsResponse] = await Promise.all([
          getSavingsSummary(),
          getBuckets({ status: 'active' }),
          getGoals({ status: 'active' }),
        ]);
        const summary = unwrapResponseData(summaryResponse);
        const buckets = unwrapResponseData(bucketsResponse);
        const goals = unwrapResponseData(goalsResponse);
        if (!Array.isArray(buckets) || !Array.isArray(goals)) {
          throw new Error('Savings data was returned in an unexpected format');
        }
        if (cancelled) return;
        setSavingsSummary(summary || EMPTY_SAVINGS_SUMMARY);
        setSavingsBuckets(buckets.slice(0, 3));
        setSavingsGoals(goals.slice(0, 3));
      } catch (error) {
        logger.error('Error fetching global savings summary:', error);
        if (!cancelled) {
          setSavingsError(error.response?.data?.message || 'Could not load savings summary.');
        }
      } finally {
        if (!cancelled) setLoadingSavings(false);
      }
    };

    fetchSavings();
    return () => {
      cancelled = true;
    };
  }, []);

  const totalBalance = accounts.reduce(
    (sum, account) => sum + Number(account.currentBalance || 0),
    0,
  );
  const availableToSpend = monthlySummary.budget - monthlySummary.expense;
  const budgetUsePercent =
    monthlySummary.budget > 0
      ? Math.min((monthlySummary.expense / monthlySummary.budget) * 100, 100)
      : 0;

  return (
    <Layout>
      <main className='mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6'>
        <header className='flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between'>
          <div>
            <h1 className='mt-1 text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl'>
              Welcome back, {user?.name || 'there'}
            </h1>
            <p className='mt-1 text-sm text-gray-500'>A clear view of your money this month.</p>
          </div>
          <button className='btn btn-primary' onClick={() => navigate('/accounts')}>
            View accounts
          </button>
        </header>

        {overviewError && (
          <div className='rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800' role='alert'>
            {overviewError}
          </div>
        )}
        {overviewWarning && (
          <div className='rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800' role='status'>
            {overviewWarning}
          </div>
        )}

        <section className='grid gap-4 lg:grid-cols-[1.2fr_1fr_1fr]'>
          <article className='card relative overflow-hidden rounded-2xl p-6 shadow-lg'>
            <div className='absolute -right-8 -top-10 h-40 w-40 rounded-full' />
            <div className='relative flex items-start justify-between gap-4'>
              <div>
                <p className='text-sm font-medium text-gray-500'>Current balance</p>
                <p className='mt-3 text-3xl font-bold tracking-tight'>
                  {loadingStats ? '—' : formatRupees(totalBalance)}
                </p>
                <p className='mt-2 text-xs text-grey-500'>Combined account balances · displayed in ₹</p>
              </div>
              <span className='rounded-xl bg-white/10 p-3'>
                <Wallet size={22} />
              </span>
            </div>
            <button
              onClick={() => navigate('/accounts')}
              className='relative mt-6 text-sm font-semibold underline decoration-grey/40 underline-offset-4 hover:decoration-white'
            >
              Manage accounts
            </button>
          </article>

          <article className='card flex flex-col justify-between p-5'>
            <div className='flex items-start justify-between'>
              <div>
                <p className='text-sm font-medium text-gray-500'>Income this month</p>
                <p className='mt-2 text-2xl font-bold text-emerald-700'>
                  {loadingStats ? '—' : formatRupees(monthlySummary.income)}
                </p>
              </div>
              <span className='rounded-xl bg-emerald-50 p-3 text-emerald-700'>
                <ArrowDownLeft size={20} />
              </span>
            </div>
            <p className='mt-4 text-xs text-gray-400'>
              {new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
            </p>
          </article>

          <article className='card flex flex-col justify-between p-5'>
            <div className='flex items-start justify-between'>
              <div>
                <p className='text-sm font-medium text-gray-500'>Expenses this month</p>
                <p className='mt-2 text-2xl font-bold text-rose-700'>
                  {loadingStats ? '—' : formatRupees(monthlySummary.expense)}
                </p>
              </div>
              <span className='rounded-xl bg-rose-50 p-3 text-rose-700'>
                <ArrowUpRight size={20} />
              </span>
            </div>
            <p className='mt-4 text-xs text-gray-400'>Across all active accounts</p>
          </article>
        </section>

        <section className='grid gap-4 lg:grid-cols-[1.1fr_0.9fr]'>
          <article className='card p-5 sm:p-6'>
            <div className='flex flex-wrap items-start justify-between gap-3'>
              <div>
                <h2 className='font-semibold text-gray-900'>Budget &amp; available to spend</h2>
                <p className='mt-1 text-sm text-gray-500'>Monthly budgets minus spending so far</p>
              </div>
              <button
                onClick={() => navigate('/accounts')}
                className='text-sm font-medium text-grey-400 hover:text-indigo-800'
              >
                View account budgets
              </button>
            </div>
            <div className='mt-6 grid gap-4 sm:grid-cols-2'>
              <div className='rounded-xl bg-gray-50 p-4'>
                <p className='text-xs font-medium uppercase tracking-wide text-gray-500'>
                  Available to spend
                </p>
                <p
                  className={`mt-2 text-2xl font-bold ${
                    availableToSpend < 0 ? 'text-rose-700' : 'text-gray-900'
                  }`}
                >
                  {loadingStats
                    ? '—'
                    : monthlySummary.budget > 0
                      ? formatRupees(availableToSpend)
                      : 'No budget set'}
                </p>
                {monthlySummary.budget > 0 && (
                  <p className='mt-1 text-xs text-gray-500'>
                    {availableToSpend < 0 ? 'Over budget' : 'Remaining this month'}
                  </p>
                )}
              </div>
              <div className='rounded-xl border border-gray-100 p-4'>
                <div className='flex items-center justify-between text-sm'>
                  <span className='text-gray-500'>Spent</span>
                  <span className='font-semibold text-gray-900'>
                    {loadingStats ? '—' : formatRupees(monthlySummary.expense)}
                  </span>
                </div>
                <div className='mt-3 h-2 overflow-hidden rounded-full bg-gray-100'>
                  <div
                    className={`h-full rounded-full ${
                      budgetUsePercent >= 100
                        ? 'bg-rose-500'
                        : budgetUsePercent >= 80
                          ? 'bg-amber-500'
                          : 'bg-indigo-500'
                    }`}
                    style={{ width: `${budgetUsePercent}%` }}
                  />
                </div>
                <div className='mt-2 flex justify-between text-xs text-gray-400'>
                  <span>{monthlySummary.budget > 0 ? `${Math.round(budgetUsePercent)}% used` : 'Budget not set'}</span>
                  <span>{formatRupees(monthlySummary.budget)} budget</span>
                </div>
              </div>
            </div>
          </article>

          <article className='card p-5 sm:p-6'>
            <div className='mb-4 flex items-center justify-between gap-3'>
              <div>
                <h2 className='font-semibold text-gray-900'>Upcoming obligations</h2>
                <p className='mt-1 text-sm text-gray-500'>Known card dues and recurring items</p>
              </div>
              <CalendarClock className='text-grey-300' size={20} />
            </div>
            {upcomingCardDues.length === 0 && recurringTransactions.length === 0 ? (
              <p className='rounded-lg bg-gray-50 p-4 text-sm text-gray-500'>
                No upcoming dated obligations found.
              </p>
            ) : (
              <div className='space-y-2'>
                {upcomingCardDues.map((due) => (
                  <button
                    key={due.accountId}
                    type='button'
                    onClick={() => navigate(`/accounts/${due.accountId}`)}
                    className='flex w-full items-center justify-between gap-3 rounded-lg border border-gray-100 p-3 text-left hover:bg-gray-50'
                  >
                    <span className='flex min-w-0 items-center gap-3'>
                      <CreditCard size={18} className='shrink-0 text-grey-300' />
                      <span className='min-w-0'>
                        <span className='block truncate text-sm font-medium text-gray-800'>
                          {due.accountName} card payment
                        </span>
                        <span className='text-xs text-gray-500'>
                          Due {formatDate(due.dueDate)}{due.isEstimate ? ' · estimated' : ''}
                        </span>
                      </span>
                    </span>
                    <span className='shrink-0 text-sm font-semibold text-gray-900'>
                      {formatRupees(due.amount)}
                    </span>
                  </button>
                ))}
                {recurringTransactions.slice(0, 3).map((transaction) => (
                  <button
                    key={transaction._id}
                    type='button'
                    onClick={() => navigate(`/accounts/${transaction.accountId}/transactions`)}
                    className='flex w-full items-center justify-between gap-3 rounded-lg border border-gray-100 p-3 text-left hover:bg-gray-50'
                  >
                    <span className='min-w-0'>
                      <span className='block truncate text-sm font-medium text-gray-800'>
                        {transaction.description || 'Recurring transaction'}
                      </span>
                      <span className='text-xs text-gray-500'>
                        {transaction.accountName} · marked recurring; schedule date unavailable
                      </span>
                    </span>
                    <span className='shrink-0 text-sm font-semibold text-gray-900'>
                      {formatRupees(transaction.amount)}
                    </span>
                  </button>
                ))}
              </div>
            )}
            <p className='mt-3 text-[11px] text-gray-400'>
              Recurring transactions do not yet have a schedule or next-due date.
            </p>
          </article>
        </section>

        <section className='card fade-in' aria-labelledby='home-savings-heading'>
          <div className='mb-5 flex flex-wrap items-center justify-between gap-3'>
            <div>
              <h2 id='home-savings-heading' className='flex items-center gap-2 text-lg font-semibold text-gray-900'>
                <PiggyBank size={20} className='text-indigo-600' />
                Savings &amp; goals
              </h2>
              <p className='mt-1 text-sm text-gray-500'>Progress across your savings buckets and active goals.</p>
            </div>
            <button className='btn btn-outline' onClick={() => navigate('/savings')}>
              Manage savings
            </button>
          </div>

          {savingsError && (
            <div className='mb-4 rounded-lg border border-red-200 bg-red-50 p-3' role='alert'>
              <p className='text-sm text-danger'>{savingsError}</p>
            </div>
          )}

          <div className='mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4'>
            {[
              ['Total saved', formatRupees(savingsSummary.totalSaved)],
              ['Savings buckets', savingsSummary.bucketCount],
              ['Active goals', savingsSummary.goalCount],
              ['Completed goals', savingsSummary.completedGoals],
            ].map(([label, value]) => (
              <div key={label} className='rounded-xl bg-indigo-50/70 p-4'>
                <p className='text-xs font-medium text-gray-500'>{label}</p>
                <p className='mt-2 text-xl font-semibold text-gray-900'>
                  {loadingSavings ? '—' : value}
                </p>
              </div>
            ))}
          </div>

          {loadingSavings ? (
            <div className='py-5 text-center text-gray-500'>Loading savings…</div>
          ) : savingsError ? null : (
            <div className='grid grid-cols-1 gap-6 lg:grid-cols-2'>
              <div>
                <h3 className='mb-3 text-sm font-semibold text-gray-800'>Buckets</h3>
                {savingsBuckets.length === 0 ? (
                  <p className='rounded-lg border border-dashed border-gray-300 p-4 text-sm text-gray-500'>
                    No active savings buckets yet.
                  </p>
                ) : (
                  <ul className='space-y-2'>
                    {savingsBuckets.map((bucket) => (
                      <li
                        key={bucket._id}
                        className='flex items-center justify-between gap-3 rounded-lg border border-gray-100 bg-white p-3'
                      >
                        <span className='truncate font-medium text-gray-800'>{bucket.name}</span>
                        <span className='shrink-0 font-semibold text-indigo-700'>
                          {formatRupees(bucket.balance)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div>
                <h3 className='mb-3 text-sm font-semibold text-gray-800'>Goal progress</h3>
                {savingsGoals.length === 0 ? (
                  <p className='rounded-lg border border-dashed border-gray-300 p-4 text-sm text-gray-500'>
                    No active savings goals yet.
                  </p>
                ) : (
                  <ul className='space-y-2'>
                    {savingsGoals.map((goal) => (
                      <li key={goal._id} className='rounded-lg border border-gray-100 bg-white p-3'>
                        <div className='mb-2 flex items-center justify-between gap-3'>
                          <span className='truncate font-medium text-gray-800'>{goal.name}</span>
                          <span className='shrink-0 text-xs font-semibold text-indigo-700'>
                            {Math.round(Number(goal.progressPercent || 0))}%
                          </span>
                        </div>
                        <div className='h-2 overflow-hidden rounded-full bg-gray-100'>
                          <div
                            className='h-full rounded-full bg-indigo-500'
                            style={{ width: `${Math.min(Number(goal.progressPercent || 0), 100)}%` }}
                          />
                        </div>
                        <p className='mt-1 text-xs text-gray-500'>
                          {formatRupees(goal.currentAmount)} of {formatRupees(goal.targetAmount)}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </section>

        <section className='fade-in' style={{ animationDelay: '0.3s' }}>
          <AccountsList />
        </section>
      </main>
    </Layout>
  );
};

export default Home;
