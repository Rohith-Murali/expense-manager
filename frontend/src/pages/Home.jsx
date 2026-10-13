import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import AccountsList from '../components/accounts/AccountList';
import accountService from '../services/accountService';
import { getTransactionStats } from '../services/transactionService';
import { getBuckets, getGoals, getSavingsSummary } from '../services/savingsService';
import { logger } from '../utils/logger';

const Home = () => {
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const [totalBalance, setTotalBalance] = useState(0);
  const [totalIncome, setTotalIncome] = useState(0);
  const [totalExpense, setTotalExpense] = useState(0);
  const [loadingStats, setLoadingStats] = useState(true);
  const [savingsSummary, setSavingsSummary] = useState({
    bucketCount: 0,
    totalSaved: 0,
    goalCount: 0,
    completedGoals: 0,
    totalTarget: 0,
  });
  const [savingsBuckets, setSavingsBuckets] = useState([]);
  const [savingsGoals, setSavingsGoals] = useState([]);
  const [loadingSavings, setLoadingSavings] = useState(true);
  const [savingsError, setSavingsError] = useState('');

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        setLoadingStats(true);

        const accountsResponse = await accountService.getAccounts(false);
        const accounts = Array.isArray(accountsResponse)
          ? accountsResponse
          : accountsResponse?.data || [];

        const balance = (accounts || []).reduce((sum, acc) => sum + (acc.currentBalance || 0), 0);
        setTotalBalance(balance);

        if (!accounts || accounts.length === 0) {
          setTotalIncome(0);
          setTotalExpense(0);
          return;
        }

        const now = new Date();
        const startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString();

        const statsList = await Promise.all(
          accounts.map((acc) =>
            getTransactionStats(acc._id, { startDate, endDate }).catch((error) => {
              logger.error('Error fetching stats for account', acc._id, error);
              return null;
            }),
          ),
        );

        let incomeTotal = 0;
        let expenseTotal = 0;

        statsList.forEach((stats) => {
          if (!stats) return;
          incomeTotal += stats.income?.total || 0;
          expenseTotal += stats.expense?.total || 0;
        });

        setTotalIncome(incomeTotal);
        setTotalExpense(expenseTotal);
      } catch (error) {
        logger.error('Error fetching home summary stats:', error);
      } finally {
        setLoadingStats(false);
      }
    };

    fetchSummary();
  }, []);

  useEffect(() => {
    const fetchSavings = async () => {
      try {
        setLoadingSavings(true);
        setSavingsError('');

        const [summaryResponse, bucketsResponse, goalsResponse] = await Promise.all([
          getSavingsSummary(),
          getBuckets({ status: 'active' }),
          getGoals({ status: 'active' }),
        ]);

        const summary = summaryResponse?.data?.data ?? summaryResponse?.data ?? summaryResponse;
        const buckets = bucketsResponse?.data?.data ?? bucketsResponse?.data ?? bucketsResponse;
        const goals = goalsResponse?.data?.data ?? goalsResponse?.data ?? goalsResponse;

        if (!Array.isArray(buckets) || !Array.isArray(goals)) {
          throw new Error('Savings data was returned in an unexpected format');
        }

        setSavingsSummary(summary || {
          bucketCount: 0,
          totalSaved: 0,
          goalCount: 0,
          completedGoals: 0,
          totalTarget: 0,
        });
        setSavingsBuckets(buckets.slice(0, 3));
        setSavingsGoals(goals.slice(0, 3));
      } catch (error) {
        logger.error('Error fetching global savings summary:', error);
        setSavingsError(error.response?.data?.message || 'Could not load savings summary.');
      } finally {
        setLoadingSavings(false);
      }
    };

    fetchSavings();
  }, []);

  return (
    <Layout>
      <div className='max-w-7xl mx-auto'>
        <div className='card mb-8 gradient-card fade-in'>
          <h2 className='text-xl font-semibold text-gray-900 mb-2'>
            Welcome back, {user?.name}! 👋
          </h2>
          <p className='text-gray-600'>Here's what's happening with your expenses today.</p>
        </div>

        <div className='grid grid-cols-1 md:grid-cols-3 gap-6 mb-8'>
          <div className='stats-card fade-in'>
            <div className='flex items-center justify-between mb-4'>
              <h3 className='text-sm font-medium text-gray-500'>Total Balance</h3>
              <div className='stats-icon stats-icon-primary'>
                <svg className='w-6 h-6' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
                  />
                </svg>
              </div>
            </div>
            <p className='text-3xl font-bold text-gray-900'>
              {loadingStats ? '—' : `₹${totalBalance.toFixed(2)}`}
            </p>
            <p className='text-sm text-gray-500 mt-1'>Across all accounts</p>
          </div>

          <div className='stats-card fade-in' style={{ animationDelay: '0.1s' }}>
            <div className='flex items-center justify-between mb-4'>
              <h3 className='text-sm font-medium text-gray-500'>Total Income</h3>
              <div className='stats-icon stats-icon-success'>
                <svg className='w-6 h-6' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M7 11l5-5m0 0l5 5m-5-5v12'
                  />
                </svg>
              </div>
            </div>
            <p className='text-3xl font-bold text-gray-900'>
              {loadingStats ? '—' : `₹${totalIncome.toFixed(2)}`}
            </p>
            <p className='text-sm text-gray-500 mt-1'>This month</p>
          </div>

          <div className='stats-card fade-in' style={{ animationDelay: '0.2s' }}>
            <div className='flex items-center justify-between mb-4'>
              <h3 className='text-sm font-medium text-gray-500'>Total Expenses</h3>
              <div className='stats-icon stats-icon-danger'>
                <svg className='w-6 h-6' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M17 13l-5 5m0 0l-5-5m5 5V6'
                  />
                </svg>
              </div>
            </div>
            <p className='text-3xl font-bold text-gray-900'>
              {loadingStats ? '—' : `₹${totalExpense.toFixed(2)}`}
            </p>
            <p className='text-sm text-gray-500 mt-1'>This month</p>
          </div>
        </div>

        <section className='card mb-8 fade-in' aria-labelledby='home-savings-heading'>
          <div className='mb-5 flex flex-wrap items-center justify-between gap-3'>
            <div>
              <h2 id='home-savings-heading' className='text-lg font-semibold text-gray-900'>
                Savings
              </h2>
              <p className='mt-1 text-sm text-gray-500'>Your savings across all accounts.</p>
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

          <div className='mb-5 grid grid-cols-2 gap-4 lg:grid-cols-4'>
            <div className='rounded-lg bg-primary-50 p-4'>
              <p className='text-sm font-medium text-gray-500'>Allocated savings</p>
              <p className='mt-2 text-xl font-semibold text-gray-900'>
                {loadingSavings ? '—' : `₹${Number(savingsSummary.totalSaved || 0).toFixed(2)}`}
              </p>
            </div>
            <div className='rounded-lg bg-primary-50 p-4'>
              <p className='text-sm font-medium text-gray-500'>Buckets</p>
              <p className='mt-2 text-xl font-semibold text-gray-900'>
                {loadingSavings ? '—' : savingsSummary.bucketCount}
              </p>
            </div>
            <div className='rounded-lg bg-primary-50 p-4'>
              <p className='text-sm font-medium text-gray-500'>Goals</p>
              <p className='mt-2 text-xl font-semibold text-gray-900'>
                {loadingSavings ? '—' : savingsSummary.goalCount}
              </p>
            </div>
            <div className='rounded-lg bg-primary-50 p-4'>
              <p className='text-sm font-medium text-gray-500'>Completed goals</p>
              <p className='mt-2 text-xl font-semibold text-gray-900'>
                {loadingSavings ? '—' : savingsSummary.completedGoals}
              </p>
            </div>
          </div>

          {loadingSavings ? (
            <div className='py-5 text-center text-gray-500'>Loading savings...</div>
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
                        <span className='shrink-0 font-semibold text-primary-600'>
                          ₹{Number(bucket.balance || 0).toFixed(2)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div>
                <h3 className='mb-3 text-sm font-semibold text-gray-800'>Goals</h3>
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
                          <span className='shrink-0 text-xs text-gray-500'>
                            {Math.round(Number(goal.progressPercent || 0))}%
                          </span>
                        </div>
                        <div className='h-2 overflow-hidden rounded-full bg-gray-100'>
                          <div
                            className='h-full rounded-full bg-primary-500'
                            style={{ width: `${Math.min(Number(goal.progressPercent || 0), 100)}%` }}
                          />
                        </div>
                        <p className='mt-1 text-xs text-gray-500'>
                          ₹{Number(goal.currentAmount || 0).toFixed(2)} of ₹
                          {Number(goal.targetAmount || 0).toFixed(2)}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </section>

        <div className='mb-8 fade-in' style={{ animationDelay: '0.3s' }}>
          <AccountsList />
        </div>
      </div>
    </Layout>
  );
};

export default Home;
