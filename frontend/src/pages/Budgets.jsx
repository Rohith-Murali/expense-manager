import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import accountService from '../services/accountService';
import budgetService from '../services/budgetService';
import { getCategoryWiseAnalytics } from '../services/transactionService';
import { getCategories } from '../services/categoryService';
import { logger } from '../utils/logger';
import Modal from '../components/Modal';
import Toasts from '../components/Toasts';
import { ArrowLeft } from 'lucide-react';

const Budgets = () => {
  const navigate = useNavigate();
  const { accountId } = useParams();
  const [account, setAccount] = useState(null);
  const [budgets, setBudgets] = useState([]);
  const [analytics, setAnalytics] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const monthNames = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];
  const [newCategory, setNewCategory] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [totalBudgetInput, setTotalBudgetInput] = useState('');
  const [isEditingTotalBudget, setIsEditingTotalBudget] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [editRowId, setEditRowId] = useState(null);
  const [editAmount, setEditAmount] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState(null);
  useEffect(() => {
    fetchData();
  }, [accountId, month, year]);
  const fetchData = async () => {
    try {
      setLoading(true);
      const acc = await accountService.getAccountById(accountId);
      setAccount(acc.data);
      setTotalBudgetInput(acc.data?.monthlyBudget || '');
      const cats = await getCategories(accountId);
      setCategories(Array.isArray(cats) ? cats : cats?.data || []);
      const b = await budgetService.getBudgets(accountId, {
        month,
        year,
      });
      setBudgets(Array.isArray(b) ? b : b?.data || []);
      const startDate = new Date(year, month - 1, 1).toISOString();
      const endDate = new Date(year, month, 0).toISOString();
      const a = await getCategoryWiseAnalytics(accountId, {
        startDate,
        endDate,
        type: 'expense',
      });
      const analyticsList = Array.isArray(a) ? a : a?.categories || a?.data || [];
      setAnalytics(analyticsList);
    } catch (error) {
      logger.error('Error fetching budgets data:', error);
      setBudgets([]);
      setAnalytics([]);
    } finally {
      setLoading(false);
    }
  };
  const addToast = (t) => {
    const id = Date.now() + Math.random();
    const item = { id, ...t };
    setToasts((s) => [...s, item]);
    setTimeout(() => {
      setToasts((s) => s.filter((x) => x.id !== id));
    }, 5000);
  };
  const saveTotalBudget = async () => {
    try {
      const val = Number(totalBudgetInput || 0);
      if (!val || val <= 0) {
        addToast({
          type: 'error',
          message: 'Total budget must be greater than 0',
        });
        return;
      }
      await accountService.updateAccount(accountId, {
        monthlyBudget: val,
      });
      setAccount((prev) => ({
        ...(prev || {}),
        monthlyBudget: val,
      }));
      addToast({
        type: 'success',
        message: 'Account total budget saved',
      });
      fetchData();
    } catch (error) {
      logger.error('Error saving total budget:', error);
      const msg = error?.response?.data?.message || error?.message || 'Failed to save total budget';
      addToast({
        type: 'error',
        message: msg,
      });
    }
  };
  const handleCreate = async () => {
    if (!newCategory || !newAmount) {
      return alert('Select a category and amount');
    }
    if (!account?.monthlyBudget || account.monthlyBudget <= 0) {
      addToast({
        type: 'error',
        message: 'Please set the account total monthly budget first',
      });
      return;
    }
    try {
      const selected = expenseCategories.find((c) => String(c._id) === String(newCategory));
      if (!selected) {
        addToast({ type: 'error', message: 'Please select an expense category' });
        return;
      }
      const existingTotal = expenseBudgets.reduce((s, x) => s + (Number(x.amount) || 0), 0);
      const proposed = existingTotal + Number(newAmount || 0);
      if (account?.monthlyBudget && account.monthlyBudget > 0 && proposed > account.monthlyBudget) {
        addToast({
          type: 'error',
          message: `Budgets total ₹${proposed} exceeds account monthly budget ₹${account.monthlyBudget}`,
        });
        return;
      }
      await budgetService.createBudget(accountId, {
        category: newCategory,
        month,
        year,
        amount: Number(newAmount),
      });
      setNewCategory('');
      setNewAmount('');
      addToast({
        type: 'success',
        message: 'Budget created',
      });
      fetchData();
    } catch (error) {
      logger.error('Error creating budget:', error);
      const msg = error?.response?.data?.message || error?.message || 'Failed to create budget';
      addToast({
        type: 'error',
        message: msg,
      });
    }
  };
  const handleDelete = async (id) => {
    setPendingDeleteId(id);
    setShowDeleteModal(true);
  };
  const handleDeleteConfirmed = async () => {
    const id = pendingDeleteId;
    setShowDeleteModal(false);
    setPendingDeleteId(null);
    try {
      await budgetService.deleteBudget(accountId, id);
      addToast({
        type: 'success',
        message: 'Budget deleted',
      });
      fetchData();
    } catch (error) {
      logger.error('Error deleting budget:', error);
      const msg = error?.response?.data?.message || error?.message || 'Failed to delete budget';
      addToast({
        type: 'error',
        message: msg,
      });
    }
  };
  const startEdit = (b) => {
    setEditRowId(b._id);
    setEditAmount(String(b.amount || ''));
  };
  const cancelEdit = () => {
    setEditRowId(null);
    setEditAmount('');
  };
  const saveEdit = async (b) => {
    try {
      const newAmt = Number(editAmount || 0);
      const existingTotal = expenseBudgets.reduce(
        (s, x) => s + (String(x._id) === String(b._id) ? 0 : Number(x.amount) || 0),
        0,
      );
      const proposed = existingTotal + newAmt;
      if (account?.monthlyBudget && account.monthlyBudget > 0 && proposed > account.monthlyBudget) {
        addToast({
          type: 'error',
          message: `Budgets total ₹${proposed} exceeds account monthly budget ₹${account.monthlyBudget}`,
        });
        return;
      }
      await budgetService.updateBudget(accountId, b._id, {
        amount: newAmt,
      });
      addToast({
        type: 'success',
        message: 'Budget updated',
      });
      cancelEdit();
      fetchData();
    } catch (error) {
      logger.error('Error updating budget:', error);
      const msg = error?.response?.data?.message || error?.message || 'Failed to update budget';
      addToast({
        type: 'error',
        message: msg,
      });
    }
  };
  const spentForCategory = (categoryId) => {
    const item = analytics.find((a) => String(a.categoryId || a._id) === String(categoryId));
    return item?.total || 0;
  };
  const expenseCategories = categories.filter((c) => c.type === 'expense');
  const expenseBudgets = budgets.filter((b) => {
    const cat = b.category;
    if (cat && typeof cat === 'object') return cat.type === 'expense';
    return expenseCategories.some((c) => String(c._id) === String(b.category));
  });
  const totalCategoryBudget = expenseBudgets.reduce(
    (sum, item) => sum + (Number(item.amount) || 0),
    0,
  );
  const totalRemaining = account?.monthlyBudget ? account.monthlyBudget - totalCategoryBudget : 0;
  const totalSpent = analytics.reduce((sum, item) => sum + (Number(item.total) || 0), 0);
  const getProgressColor = (pct) => {
    if (pct >= 100) return 'bg-red-500';
    if (pct >= 80) return 'bg-amber-500';
    return 'bg-emerald-500';
  };

  return (
    <Layout>
      <div className='max-w-6xl mx-auto py-6 px-4'>
        <header className='flex items-center gap-4 mb-4'>
          <button className='p-2 rounded-md hover:bg-gray-100' onClick={() => navigate(-1)}>
            <ArrowLeft size={20} />
          </button>
          <h1 className='text-2xl font-semibold'>Budget</h1>
        </header>
        <div className='mb-8 rounded-3xl overflow-hidden shadow-sm border border-slate-200 bg-white'>
          <div className='p-6 sm:p-8 bg-white'>
            <div className='flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6'>
              <div>
                <p className='text-sm uppercase tracking-[0.25em] text-slate-500'>
                  Budget Dashboard
                </p>
                <h1 className='mt-2 text-4xl font-bold text-slate-900'>Budget Overview</h1>
                <p className='mt-3 text-slate-600 max-w-2xl'>
                  Set monthly spending limits for expense categories. Income categories do not use
                  budgets.
                </p>
              </div>
              <div className='rounded-3xl bg-slate-100 p-5 border border-slate-200'>
                <p className='text-sm text-slate-500'>Selected Period</p>
                <p className='mt-2 text-2xl font-semibold text-slate-900'>
                  {monthNames[month - 1]} {year}
                </p>
                <div className='mt-4 flex flex-wrap gap-3'>
                  <select
                    value={month}
                    onChange={(e) => setMonth(Number(e.target.value))}
                    className='border border-slate-300 rounded-xl px-4 py-3'
                  >
                    {monthNames.map((m, i) => (
                      <option key={i} value={i + 1}>
                        {m}
                      </option>
                    ))}
                  </select>
                  <select
                    value={year}
                    onChange={(e) => setYear(Number(e.target.value))}
                    className='border border-slate-300 rounded-xl px-4 py-3'
                  >
                    {Array.from({ length: 11 }, (_, idx) => {
                      const y = new Date().getFullYear() - 5 + idx;
                      return (
                        <option key={y} value={y}>
                          {y}
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>
            </div>
          </div>
          <div className='grid grid-cols-1 md:grid-cols-3 gap-4 p-6 bg-slate-50 border-t border-slate-200'>
            <div className='rounded-3xl bg-white border border-slate-200 p-5 shadow-sm'>
              <p className='text-sm text-slate-300'>Total Budget</p>
              <p className='mt-3 text-3xl font-bold'>
                ₹{(account?.monthlyBudget || 0).toLocaleString()}
              </p>
            </div>
            <div className='rounded-3xl bg-white border border-slate-200 p-5 shadow-sm'>
              <p className='text-sm text-slate-300'>Allocated</p>
              <p className='mt-3 text-3xl font-bold'>₹{totalCategoryBudget.toLocaleString()}</p>
            </div>
            <div className='rounded-3xl bg-white border border-slate-200 p-5 shadow-sm'>
              <p className='text-sm text-slate-300'>Remaining</p>
              <p
                className={`mt-3 text-3xl font-bold ${totalRemaining < 0 ? 'text-red-400' : 'text-emerald-300'}`}
              >
                ₹{totalRemaining.toLocaleString()}
              </p>
            </div>
          </div>
        </div>
        <div className='grid gap-6 lg:grid-cols-[1fr_340px]'>
          <div className='space-y-6'>
            <div className='rounded-3xl bg-white border border-slate-200 p-5 shadow-sm'>
              <h2 className='text-xl font-semibold mb-5'>Add Expense Category Budget</h2>
              <div className='grid sm:grid-cols-3 gap-3'>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className='border border-slate-300 rounded-xl px-4 py-3'
                  disabled={
                    !account?.monthlyBudget ||
                    account.monthlyBudget <= 0 ||
                    expenseCategories.length === 0
                  }
                >
                  <option value=''>Select expense category</option>
                  {expenseCategories.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <input
                  type='number'
                  placeholder='Amount'
                  value={newAmount}
                  onChange={(e) => setNewAmount(e.target.value)}
                  className='border border-slate-300 rounded-xl px-4 py-3'
                  disabled={!account?.monthlyBudget || account.monthlyBudget <= 0}
                />
                <button
                  onClick={handleCreate}
                  disabled={!account?.monthlyBudget || account.monthlyBudget <= 0}
                  className='rounded-xl bg-sky-500 text-white font-semibold hover:bg-sky-600 transition'
                >
                  Add Budget
                </button>
              </div>
            </div>
            {loading ? (
              <div className='text-center py-10 text-slate-500'>Loading...</div>
            ) : expenseBudgets.length === 0 ? (
              <div className='rounded-3xl bg-white border border-slate-200 p-8 text-center text-slate-500'>
                {expenseCategories.length === 0
                  ? 'No expense categories in this account.'
                  : 'No expense budgets created for this period.'}
              </div>
            ) : (
              <div className='grid grid-cols-1 md:grid-cols-2 gap-5'>
                {expenseBudgets.map((b) => {
                  const spent = spentForCategory(b.category?._id || b.category);
                  const remaining = (b.amount || 0) - spent;
                  const pct =
                    b.amount > 0 ? Math.min(100, Math.round((spent / b.amount) * 100)) : 0;
                  return (
                    <div
                      key={b._id}
                      className={`rounded-3xl border p-5 shadow-sm min-w-0 overflow-hidden ${remaining < 0 ? 'border-red-200 bg-red-50' : 'border-slate-200 bg-white'}`}
                    >
                      <div className='flex justify-between items-start'>
                        <div>
                          <p className='text-sm text-slate-500'>{b.category?.name || '—'}</p>
                          <h3 className='mt-1 text-2xl font-bold'>
                            ₹{(b.amount || 0).toLocaleString()}
                          </h3>
                        </div>
                        <div className='text-right'>
                          <p className='text-sm text-slate-500'>Used</p>
                          <p className='text-xl font-semibold'>{pct}%</p>
                        </div>
                      </div>
                      <div className='mt-4 w-full h-3 rounded-full bg-slate-100 overflow-hidden'>
                        <div
                          className={`h-3 ${getProgressColor(pct)}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <div className='mt-4 flex justify-between text-sm'>
                        <div>
                          Spent: <span className='font-semibold'>₹{spent.toLocaleString()}</span>
                        </div>
                        <div>
                          Remaining:{' '}
                          <span className={`font-semibold ${remaining < 0 ? 'text-red-600' : ''}`}>
                            ₹{remaining.toLocaleString()}
                          </span>
                        </div>
                      </div>
                      <div className='mt-5'>
                        {editRowId === b._id ? (
                          <div className='space-y-2'>
                            <input
                              type='number'
                              value={editAmount}
                              onChange={(e) => setEditAmount(e.target.value)}
                              className='w-full min-w-0 border border-slate-300 rounded-xl px-3 py-2'
                            />
                            <div className='flex gap-2'>
                              <button
                                onClick={() => saveEdit(b)}
                                className='flex-1 px-3 py-2 rounded-xl bg-sky-500 text-white text-sm font-medium'
                              >
                                Save
                              </button>
                              <button
                                onClick={cancelEdit}
                                className='flex-1 px-3 py-2 rounded-xl border text-sm font-medium'
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className='flex gap-3'>
                            <button
                              onClick={() => startEdit(b)}
                              className='flex-1 rounded-xl border border-slate-300 py-2 font-medium hover:bg-slate-50'
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDelete(b._id)}
                              className='flex-1 rounded-xl bg-red-500 text-white py-2 font-medium hover:bg-red-600'
                            >
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          <div className='rounded-3xl bg-slate-900 text-white p-6 shadow-xl h-fit sticky top-6 min-w-0 overflow-hidden'>
            <div className='flex items-start justify-between gap-3 min-w-0'>
              <div className='min-w-0'>
                <h2 className='text-xl font-semibold'>Monthly Budget</h2>
                <p className='mt-1 text-sm text-slate-400'>Total account spending limit</p>
              </div>
              {!isEditingTotalBudget && (
                <button
                  onClick={() => setIsEditingTotalBudget(true)}
                  className='shrink-0 rounded-xl border border-slate-700 px-4 py-2 text-sm hover:bg-white/10'
                >
                  Edit
                </button>
              )}
            </div>
            <div className='mt-6 min-w-0'>
              {!isEditingTotalBudget ? (
                <div className='text-3xl sm:text-4xl font-bold tracking-tight break-words'>
                  ₹{(account?.monthlyBudget || 0).toLocaleString()}
                </div>
              ) : (
                <div className='space-y-3'>
                  <input
                    type='number'
                    value={totalBudgetInput}
                    onChange={(e) => setTotalBudgetInput(e.target.value)}
                    className='w-full min-w-0 rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-lg'
                  />
                  <div className='flex flex-col sm:flex-row gap-2 sm:gap-3'>
                    <button
                      onClick={async () => {
                        await saveTotalBudget();
                        setIsEditingTotalBudget(false);
                      }}
                      className='flex-1 rounded-2xl bg-sky-500 py-3 font-semibold hover:bg-sky-600'
                    >
                      Save
                    </button>
                    <button
                      onClick={() => {
                        setTotalBudgetInput(account?.monthlyBudget || '');
                        setIsEditingTotalBudget(false);
                      }}
                      className='flex-1 rounded-2xl border border-slate-700 py-3 font-semibold hover:bg-white/10'
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
            <div className='mt-8 rounded-2xl bg-white/5 border border-white/10 p-5'>
              <p className='text-xs uppercase tracking-[0.2em] text-slate-400'>Total Spent</p>
              <div className='mt-3 text-3xl font-bold'>₹{totalSpent.toLocaleString()}</div>
              <p className='mt-2 text-sm text-slate-400'>Across all categories this month</p>
            </div>
          </div>
        </div>
        <Toasts toasts={toasts} />
        <Modal
          isOpen={showDeleteModal}
          title='Delete budget'
          onConfirm={handleDeleteConfirmed}
          onCancel={() => {
            setShowDeleteModal(false);
            setPendingDeleteId(null);
          }}
          confirmLabel='Delete'
        >
          <p>Are you sure you want to delete this budget?</p>
        </Modal>
      </div>
    </Layout>
  );
};

export default Budgets;
