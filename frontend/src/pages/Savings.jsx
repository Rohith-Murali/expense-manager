import { useEffect, useMemo, useState } from 'react';
import Layout from '../components/layout/Layout';
import Modal from '../components/Modal';
import accountService from '../services/accountService';
import {
  archiveBucket,
  archiveGoal,
  createBucket,
  createEntry,
  createGoal,
  deleteBucket,
  deleteGoal,
  getBuckets,
  getEntries,
  getGoals,
  getSavingsSummary,
  updateBucket,
  updateGoal,
} from '../services/savingsService';

const defaultBucketForm = {
  name: '',
  description: '',
  color: '#14b8a6',
  icon: 'piggy-bank',
};

const defaultGoalForm = {
  name: '',
  targetAmount: '',
  targetDate: '',
  bucketId: '',
  description: '',
};

const defaultEntryForm = {
  bucketId: '',
  accountId: '',
  goalId: '',
  type: 'contribution',
  amount: '',
  effectiveDate: new Date().toISOString().slice(0, 10),
  note: '',
  reference: '',
};

function formatCurrency(value) {
  const amount = Number(value || 0);
  return `₹${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function getResponseData(response) {
  return response?.data?.data ?? response?.data ?? response;
}

function Savings() {
  const [summary, setSummary] = useState({
    bucketCount: 0,
    totalSaved: 0,
    goalCount: 0,
    completedGoals: 0,
    totalTarget: 0,
  });
  const [buckets, setBuckets] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [goals, setGoals] = useState([]);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [bucketForm, setBucketForm] = useState(defaultBucketForm);
  const [goalForm, setGoalForm] = useState(defaultGoalForm);
  const [entryForm, setEntryForm] = useState(defaultEntryForm);
  const [editingBucketId, setEditingBucketId] = useState(null);
  const [editingGoalId, setEditingGoalId] = useState(null);
  const [notice, setNotice] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const bucketOptions = useMemo(
    () => (Array.isArray(buckets) ? buckets : []).filter((bucket) => bucket.status !== 'archived'),
    [buckets],
  );

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');

      const [
        summaryResponse,
        bucketResponse,
        goalResponse,
        entryResponse,
        accountResponse,
      ] = await Promise.all([
        getSavingsSummary(),
        getBuckets(),
        getGoals(),
        getEntries(),
        accountService.getAccounts(false),
      ]);

      const nextSummary = getResponseData(summaryResponse) || {
        bucketCount: 0,
        totalSaved: 0,
        goalCount: 0,
        completedGoals: 0,
        totalTarget: 0,
      };
      const bucketList = getResponseData(bucketResponse) || [];
      const goalList = getResponseData(goalResponse) || [];
      const entryList = getResponseData(entryResponse) || [];
      const accountList = getResponseData(accountResponse) || [];

      if (
        !Array.isArray(bucketList) ||
        !Array.isArray(goalList) ||
        !Array.isArray(entryList) ||
        !Array.isArray(accountList)
      ) {
        throw new Error(
          'The savings API returned data in an unexpected format. Please refresh and try again.',
        );
      }

      setSummary(nextSummary);
      setBuckets(bucketList);
      setGoals(goalList);
      setEntries(entryList);
      setAccounts(accountList);

      setEntryForm((prev) => ({
        ...prev,
        bucketId: prev.bucketId || bucketList[0]?._id || '',
        accountId: accountList.some((account) => account._id === prev.accountId)
          ? prev.accountId
          : accountList[0]?._id || '',
      }));
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Unable to load savings data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const resetBucketForm = () => {
    setBucketForm(defaultBucketForm);
    setEditingBucketId(null);
  };

  const resetGoalForm = () => {
    setGoalForm(defaultGoalForm);
    setEditingGoalId(null);
  };

  const handleBucketSubmit = async (event) => {
    event.preventDefault();

    try {
      if (editingBucketId) {
        await updateBucket(editingBucketId, bucketForm);
        setNotice('Bucket updated successfully');
      } else {
        await createBucket(bucketForm);
        setNotice('Bucket created successfully');
      }

      resetBucketForm();
      fetchData();
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to save bucket');
    }
  };

  const handleEditBucket = (bucket) => {
    setEditingBucketId(bucket._id);
    setBucketForm({
      name: bucket.name || '',
      description: bucket.description || '',
      color: bucket.color || '#14b8a6',
      icon: bucket.icon || 'piggy-bank',
    });
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget || isDeleting) return;
    setIsDeleting(true);
    try {
      if (deleteTarget.type === 'bucket') {
        await deleteBucket(deleteTarget.id);
        setNotice('Bucket removed');
        if (editingBucketId === deleteTarget.id) resetBucketForm();
      } else {
        await deleteGoal(deleteTarget.id);
        setNotice('Goal removed');
        if (editingGoalId === deleteTarget.id) resetGoalForm();
      }

      setDeleteTarget(null);
      await fetchData();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          `Unable to delete ${deleteTarget.type === 'bucket' ? 'bucket' : 'goal'}`,
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const handleToggleBucketArchive = async (bucketId) => {
    try {
      await archiveBucket(bucketId);
      setNotice('Bucket status updated');
      fetchData();
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to update bucket');
    }
  };

  const handleGoalSubmit = async (event) => {
    event.preventDefault();

    const payload = {
      ...goalForm,
      targetAmount: Number(goalForm.targetAmount),
      targetDate: goalForm.targetDate ? new Date(goalForm.targetDate).toISOString() : null,
      bucketId: goalForm.bucketId || null,
    };

    try {
      if (editingGoalId) {
        await updateGoal(editingGoalId, payload);
        setNotice('Goal updated successfully');
      } else {
        await createGoal(payload);
        setNotice('Goal created successfully');
      }

      resetGoalForm();
      fetchData();
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to save goal');
    }
  };

  const handleEditGoal = (goal) => {
    setEditingGoalId(goal._id);
    setGoalForm({
      name: goal.name || '',
      targetAmount: goal.targetAmount || '',
      targetDate: goal.targetDate ? new Date(goal.targetDate).toISOString().slice(0, 10) : '',
      bucketId: goal.bucketId || '',
      description: goal.description || '',
    });
  };

  const handleToggleGoalArchive = async (goalId) => {
    try {
      await archiveGoal(goalId);
      setNotice('Goal status updated');
      fetchData();
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to update goal');
    }
  };

  const handleEntrySubmit = async (event) => {
    event.preventDefault();

    const payload = {
      ...entryForm,
      amount: Number(entryForm.amount),
      effectiveDate: entryForm.effectiveDate ? new Date(entryForm.effectiveDate).toISOString() : new Date().toISOString(),
      goalId: entryForm.goalId || null,
      bucketId: entryForm.bucketId,
      accountId: entryForm.accountId,
    };

    try {
      await createEntry(payload);
      setNotice('Savings entry saved');
      setEntryForm({
        ...defaultEntryForm,
        accountId: entryForm.accountId,
        bucketId: entryForm.bucketId || bucketOptions[0]?._id || '',
      });
      fetchData();
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to save savings entry');
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className='max-w-6xl mx-auto'>
          <div className='card text-center text-gray-500 py-12'>Loading savings...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className='mx-auto max-w-6xl'>
        <div className='card mb-6'>
          <div className='flex flex-wrap items-start justify-between gap-4'>
            <div>
              <h1 className='text-2xl font-semibold text-gray-900'>Savings</h1>
              <p className='mt-1 text-sm text-gray-500'>
                Organize savings into buckets, track goals, and record contributions or withdrawals.
              </p>
            </div>
            <button className='btn btn-outline' onClick={fetchData} disabled={loading}>
              Refresh
            </button>
          </div>
        </div>

        {notice && (
          <div className='card mb-4 flex items-center justify-between gap-3' role='status'>
            <p className='text-sm text-gray-700'>{notice}</p>
            <button className='text-sm text-indigo-700' onClick={() => setNotice('')}>
              Dismiss
            </button>
          </div>
        )}

        {error && (
          <div className='card mb-4 border border-red-200' role='alert'>
            <div className='flex items-center justify-between gap-3'>
              <p className='text-sm text-red-700'>{error}</p>
              <button className='text-sm font-medium text-red-700' onClick={() => setError('')}>
                Dismiss
              </button>
            </div>
          </div>
        )}

        <div className='mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4'>
          <div className='card'>
            <p className='text-sm font-medium text-gray-500'>Savings buckets</p>
            <p className='mt-2 text-2xl font-semibold text-gray-900'>{summary.bucketCount}</p>
          </div>
          <div className='card'>
            <p className='text-sm font-medium text-gray-500'>Total allocated</p>
            <p className='mt-2 text-2xl font-semibold text-primary-600'>{formatCurrency(summary.totalSaved)}</p>
          </div>
          <div className='card'>
            <p className='text-sm font-medium text-gray-500'>Savings goals</p>
            <p className='mt-2 text-2xl font-semibold text-gray-900'>{summary.goalCount}</p>
          </div>
          <div className='card'>
            <p className='text-sm font-medium text-gray-500'>Goals completed</p>
            <p className='mt-2 text-2xl font-semibold text-success'>{summary.completedGoals}</p>
          </div>
        </div>

        <div className='grid grid-cols-1 items-start gap-6 xl:grid-cols-2'>
          <section className='card'>
            <div className='mb-4 flex flex-wrap items-center justify-between gap-3'>
              <div>
                <h2 className='text-lg font-semibold text-gray-900'>Savings buckets</h2>
                <p className='text-sm text-gray-500'>Allocate money by purpose.</p>
              </div>
              <span className='rounded-full bg-primary-50 px-3 py-1 text-sm font-medium text-primary-700'>
                {buckets.length} {buckets.length === 1 ? 'bucket' : 'buckets'}
              </span>
            </div>

            <form onSubmit={handleBucketSubmit} className='mb-5 space-y-3 rounded-lg border border-gray-200 bg-gray-50 p-4'>
              <h3 className='text-sm font-semibold text-gray-800'>
                {editingBucketId ? 'Edit bucket' : 'Create a bucket'}
              </h3>
              <input
                className='input'
                value={bucketForm.name}
                onChange={(e) => setBucketForm({ ...bucketForm, name: e.target.value })}
                placeholder='Bucket name'
                required
              />
              <textarea
                className='input'
                value={bucketForm.description}
                onChange={(e) => setBucketForm({ ...bucketForm, description: e.target.value })}
                placeholder='Description'
                rows={3}
              />
              <button className='btn btn-primary'>
                {editingBucketId ? 'Update bucket' : 'Create bucket'}
              </button>
              {editingBucketId && (
                <button type='button' onClick={resetBucketForm} className='btn btn-outline ml-2'>
                  Cancel edit
                </button>
              )}
            </form>

            <div className='space-y-3'>
              {buckets.length === 0 ? (
                <div className='rounded-lg border border-dashed border-gray-300 px-4 py-8 text-center'>
                  <p className='font-medium text-gray-700'>No savings buckets yet</p>
                  <p className='mt-1 text-sm text-gray-500'>Create a bucket to start organizing your savings.</p>
                </div>
              ) : (
                buckets.map((bucket) => (
                  <div key={bucket._id} className='rounded-lg border border-gray-200 bg-white p-4'>
                    <div className='flex flex-wrap items-center justify-between gap-3'>
                      <div className='flex items-center gap-3'>
                        <span
                          className='inline-flex h-10 w-10 items-center justify-center rounded-lg text-lg font-semibold'
                          style={{ backgroundColor: `${bucket.color || '#14b8a6'}22`, color: bucket.color || '#14b8a6' }}
                          aria-hidden='true'
                        >
                          {(bucket.name || 'S').charAt(0).toUpperCase()}
                        </span>
                        <div>
                          <p className='font-medium text-gray-900'>{bucket.name}</p>
                          <p className='text-xs capitalize text-gray-500'>{bucket.status || 'active'}</p>
                        </div>
                      </div>
                      <span className='text-lg font-semibold text-gray-900'>{formatCurrency(bucket.balance)}</span>
                    </div>
                    {bucket.description && <p className='mt-3 text-sm text-gray-600'>{bucket.description}</p>}
                    <div className='mt-4 flex flex-wrap gap-2'>
                      <button type='button' onClick={() => handleEditBucket(bucket)} className='btn btn-outline !px-3 !py-1.5 text-sm'>Edit</button>
                      <button type='button' onClick={() => handleToggleBucketArchive(bucket._id)} className='btn btn-outline !px-3 !py-1.5 text-sm'>
                        {bucket.status === 'archived' ? 'Restore' : 'Archive'}
                      </button>
                      <button type='button' onClick={() => setDeleteTarget({ type: 'bucket', id: bucket._id, name: bucket.name })} className='btn btn-danger !px-3 !py-1.5 text-sm'>Delete</button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className='card'>
            <div className='mb-4 flex flex-wrap items-center justify-between gap-3'>
              <div>
                <h2 className='text-lg font-semibold text-gray-900'>Savings goals</h2>
                <p className='text-sm text-gray-500'>Set targets and follow your progress.</p>
              </div>
              <span className='rounded-full bg-indigo-50 px-3 py-1 text-sm font-medium text-indigo-700'>
                {goals.length} {goals.length === 1 ? 'goal' : 'goals'}
              </span>
            </div>

            <form onSubmit={handleGoalSubmit} className='mb-5 space-y-3 rounded-lg border border-gray-200 bg-gray-50 p-4'>
              <h3 className='text-sm font-semibold text-gray-800'>
                {editingGoalId ? 'Edit goal' : 'Create a goal'}
              </h3>
              <input
                className='input'
                value={goalForm.name}
                onChange={(e) => setGoalForm({ ...goalForm, name: e.target.value })}
                placeholder='Goal name'
                required
              />
              <textarea
                className='input'
                value={goalForm.description}
                onChange={(e) => setGoalForm({ ...goalForm, description: e.target.value })}
                placeholder='Goal description'
                rows={2}
              />
              <div className='grid grid-cols-1 gap-3 sm:grid-cols-2'>
                <input
                  type='number'
                  min='0.01'
                  step='0.01'
                  className='input'
                  value={goalForm.targetAmount}
                  onChange={(e) => setGoalForm({ ...goalForm, targetAmount: e.target.value })}
                  placeholder='Target amount'
                  required
                />
                <input
                  type='date'
                  className='input'
                  value={goalForm.targetDate}
                  onChange={(e) => setGoalForm({ ...goalForm, targetDate: e.target.value })}
                />
              </div>
              <select
                className='input'
                value={goalForm.bucketId}
                onChange={(e) => setGoalForm({ ...goalForm, bucketId: e.target.value })}
              >
                <option value=''>No linked bucket</option>
                {bucketOptions.map((bucket) => (
                  <option key={bucket._id} value={bucket._id}>
                    {bucket.name}
                  </option>
                ))}
              </select>
              <button className='btn btn-primary'>
                {editingGoalId ? 'Update goal' : 'Create goal'}
              </button>
              {editingGoalId && (
                <button type='button' onClick={resetGoalForm} className='btn btn-outline ml-2'>
                  Cancel edit
                </button>
              )}
            </form>

            <div className='space-y-3'>
              {goals.length === 0 ? (
                <div className='rounded-lg border border-dashed border-gray-300 px-4 py-8 text-center'>
                  <p className='font-medium text-gray-700'>No savings goals yet</p>
                  <p className='mt-1 text-sm text-gray-500'>Create a goal to track a savings target.</p>
                </div>
              ) : (
                goals.map((goal) => (
                  <div key={goal._id} className='rounded-lg border border-gray-200 bg-white p-4'>
                    <div className='flex flex-wrap items-start justify-between gap-2'>
                      <div>
                        <p className='font-medium text-gray-900'>{goal.name}</p>
                        <p className='mt-1 text-xs capitalize text-gray-500'>{goal.status}</p>
                      </div>
                      {goal.targetDate && (
                        <span className='text-xs text-gray-500'>
                          Target {new Date(goal.targetDate).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    <div className='mt-3 flex items-baseline justify-between gap-3'>
                      <p className='text-sm text-gray-600'>Saved {formatCurrency(goal.currentAmount)}</p>
                      <p className='text-sm font-medium text-gray-800'>of {formatCurrency(goal.targetAmount)}</p>
                    </div>
                    <div className='mt-2 h-2.5 w-full overflow-hidden rounded-full bg-gray-100'>
                      <div
                        className='h-full rounded-full bg-primary-500 transition-all'
                        style={{ width: `${Math.min(Number(goal.progressPercent || 0), 100)}%` }}
                      />
                    </div>
                    <p className='mt-1 text-right text-xs text-gray-500'>
                      {Math.round(Number(goal.progressPercent || 0))}% complete
                    </p>
                    <div className='mt-3 flex flex-wrap gap-2'>
                      <button type='button' onClick={() => handleEditGoal(goal)} className='btn btn-outline !px-3 !py-1.5 text-sm'>Edit</button>
                      <button type='button' onClick={() => handleToggleGoalArchive(goal._id)} className='btn btn-outline !px-3 !py-1.5 text-sm'>
                        {goal.status === 'archived' ? 'Restore' : 'Archive'}
                      </button>
                      <button type='button' onClick={() => setDeleteTarget({ type: 'goal', id: goal._id, name: goal.name })} className='btn btn-danger !px-3 !py-1.5 text-sm'>Delete</button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>

        <section className='card mt-6'>
          <div className='mb-4 flex flex-wrap items-center justify-between gap-3'>
            <div>
              <h2 className='text-lg font-semibold text-gray-900'>Savings activity</h2>
              <p className='text-sm text-gray-500'>Record a contribution or withdrawal and review recent entries.</p>
            </div>
            <span className='rounded-full bg-gray-100 px-3 py-1 text-sm font-medium text-gray-700'>
              {entries.length} {entries.length === 1 ? 'entry' : 'entries'}
            </span>
          </div>

          <div className='grid grid-cols-1 items-start gap-6 lg:grid-cols-2'>
            <form onSubmit={handleEntrySubmit} className='space-y-3 rounded-lg border border-gray-200 bg-gray-50 p-4'>
              <h3 className='text-sm font-semibold text-gray-800'>Add an entry</h3>
              <select
                className='input'
                value={entryForm.accountId}
                onChange={(e) => setEntryForm({ ...entryForm, accountId: e.target.value })}
                required
              >
                <option value=''>Choose account</option>
                {accounts.map((account) => (
                  <option key={account._id} value={account._id}>
                    {account.name}
                  </option>
                ))}
              </select>
              {accounts.length === 0 && (
                <p className='text-sm text-amber-700'>
                  Create an active account before adding a savings entry.
                </p>
              )}
              <select
                className='input'
                value={entryForm.bucketId}
                onChange={(e) => setEntryForm({ ...entryForm, bucketId: e.target.value, goalId: '' })}
                required
              >
                <option value=''>Choose bucket</option>
                {bucketOptions.map((bucket) => (
                  <option key={bucket._id} value={bucket._id}>
                    {bucket.name}
                  </option>
                ))}
              </select>
              <select
                className='input'
                value={entryForm.goalId}
                onChange={(e) => setEntryForm({ ...entryForm, goalId: e.target.value })}
              >
                <option value=''>No linked goal</option>
                {goals
                  .filter((goal) => !goal.bucketId || goal.bucketId === entryForm.bucketId)
                  .map((goal) => (
                    <option key={goal._id} value={goal._id}>
                      {goal.name}
                    </option>
                  ))}
              </select>
              <div className='grid grid-cols-1 gap-3 sm:grid-cols-2'>
                <select
                  className='input'
                  value={entryForm.type}
                  onChange={(e) => setEntryForm({ ...entryForm, type: e.target.value })}
                >
                  <option value='contribution'>Contribution</option>
                  <option value='withdrawal'>Withdrawal</option>
                </select>
                <input
                  type='number'
                  min='0.01'
                  step='0.01'
                  className='input'
                  value={entryForm.amount}
                  onChange={(e) => setEntryForm({ ...entryForm, amount: e.target.value })}
                  placeholder='Amount'
                  required
                />
              </div>
              <input
                type='date'
                className='input'
                value={entryForm.effectiveDate}
                onChange={(e) => setEntryForm({ ...entryForm, effectiveDate: e.target.value })}
                required
              />
              <input
                className='input'
                value={entryForm.note}
                onChange={(e) => setEntryForm({ ...entryForm, note: e.target.value })}
                placeholder='Note'
              />
              <input
                className='input'
                value={entryForm.reference}
                onChange={(e) => setEntryForm({ ...entryForm, reference: e.target.value })}
                placeholder='Reference/code'
              />
              <button className='btn btn-primary' disabled={accounts.length === 0}>
                Save entry
              </button>
            </form>

            <div className='space-y-3'>
              {entries.length === 0 ? (
                <div className='rounded-lg border border-dashed border-gray-300 px-4 py-8 text-center'>
                  <p className='font-medium text-gray-700'>No savings activity yet</p>
                  <p className='mt-1 text-sm text-gray-500'>New contributions and withdrawals will appear here.</p>
                </div>
              ) : (
                entries.slice(0, 8).map((entry) => (
                  <div key={entry._id} className='rounded-lg border border-gray-200 bg-white p-3'>
                    <div className='flex items-center justify-between gap-3'>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize ${entry.type === 'contribution' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>
                        {entry.type}
                      </span>
                      <span className={`font-semibold ${entry.type === 'contribution' ? 'text-green-700' : 'text-amber-700'}`}>
                        {entry.type === 'contribution' ? '+' : '-'}{formatCurrency(entry.amount)}
                      </span>
                    </div>
                    <p className='mt-2 text-sm text-gray-700'>{entry.note || 'No note'}</p>
                    <p className='mt-1 text-xs text-gray-500'>
                      {new Date(entry.effectiveDate).toLocaleDateString()}
                      {entry.reference ? ` · ${entry.reference}` : ''}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>
      </div>
      <Modal
        isOpen={Boolean(deleteTarget)}
        title={`Delete ${deleteTarget?.type === 'bucket' ? 'bucket' : 'goal'}?`}
        onConfirm={handleConfirmDelete}
        onCancel={() => {
          if (!isDeleting) setDeleteTarget(null);
        }}
        confirmLabel={isDeleting ? 'Deleting…' : 'Delete'}
        confirmDisabled={isDeleting}
      >
        <p className='text-sm text-gray-600'>
          {deleteTarget?.type === 'bucket'
            ? `Delete “${deleteTarget.name}”? This will archive the bucket and unlink any linked goals.`
            : `Delete “${deleteTarget?.name}”?`}
        </p>
      </Modal>
    </Layout>
  );
}

export default Savings;
