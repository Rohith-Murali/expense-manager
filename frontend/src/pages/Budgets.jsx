import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import accountService from '../services/accountService';
import budgetService from '../services/budgetService';
import { getCategoryWiseAnalytics, getTransactions } from '../services/transactionService';
import { getCategories } from '../services/categoryService';
import { logger } from '../utils/logger';
import Modal from '../components/Modal';
import Toasts from '../components/Toasts';
import TransactionCard from '../components/TransactionCard';
import { ArrowLeft, ChevronLeft, ChevronRight, Pencil, Trash2, X } from 'lucide-react';

const Budgets = () => {
  const navigate = useNavigate();
  const { accountId } = useParams();
  const [account, setAccount] = useState(null);
  const [budgets, setBudgets] = useState([]);
  const [analytics, setAnalytics] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [transactionsLoading, setTransactionsLoading] = useState(false);
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
  const [totalBudgetInput, setTotalBudgetInput] = useState('');
  const [isEditingTotalBudget, setIsEditingTotalBudget] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [editRowId, setEditRowId] = useState(null);
  const [editAmount, setEditAmount] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState(null);
  const [budgetPeriods, setBudgetPeriods] = useState([]);
  const [showCopyModal, setShowCopyModal] = useState(false);
  const [sourcePeriod, setSourcePeriod] = useState('');
  const [copyingBudgets, setCopyingBudgets] = useState(false);
  const [copyRequiresRewrite, setCopyRequiresRewrite] = useState(false);
  const [copyPreview, setCopyPreview] = useState(null);
  const [totalBudgetValidationShown, setTotalBudgetValidationShown] = useState(false);
  useEffect(() => {
    fetchData();
  }, [accountId, month, year]);
  useEffect(() => {
    fetchBudgetPeriods();
  }, [accountId]);
  const fetchData = async () => {
    try {
      logger.info('Loading budget dashboard');
      setLoading(true);
      const acc = await accountService.getAccountById(accountId);
      const monthlyResult = await budgetService.getMonthlyBudget(accountId, { month, year });
      const monthlyBudget =
        monthlyResult?.data?.amount ?? monthlyResult?.amount ?? acc.data?.monthlyBudget ?? 0;
      setAccount({ ...acc.data, monthlyBudget });
      setTotalBudgetInput(monthlyBudget || '');
      const cats = await getCategories(accountId);
      setCategories(Array.isArray(cats) ? cats : cats?.data || []);
      const b = await budgetService.getBudgets(accountId, {
        month,
        year,
      });
      const budgetsResult = Array.isArray(b) ? b : b?.data || [];
      setBudgets(budgetsResult);
      const startDate = new Date(year, month - 1, 1).toISOString();
      const endDate = new Date(year, month, 0, 23, 59, 59, 999).toISOString();
      const a = await getCategoryWiseAnalytics(accountId, {
        startDate,
        endDate,
        type: 'expense',
      });
      const analyticsList = Array.isArray(a) ? a : a?.categories || a?.data || [];
      setAnalytics(analyticsList);
      logger.info('Budget dashboard loaded');
    } catch (error) {
      logger.error('Error fetching budgets data:', error);
      setBudgets([]);
      setAnalytics([]);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    if (!accountId || !selectedCategory) {
      setTransactions([]);
      return;
    }

    const fetchCategoryTransactions = async () => {
      setTransactionsLoading(true);
      try {
        const startDate = new Date(year, month - 1, 1).toISOString();
        const endDate = new Date(year, month, 0, 23, 59, 59, 999).toISOString();
        const result = await getTransactions(accountId, {
          categoryId: selectedCategory._id,
          startDate,
          endDate,
          type: 'expense',
          limit: 1000,
        });
        setTransactions(Array.isArray(result) ? result : result?.data || []);
      } catch (error) {
        logger.error('Error fetching category transactions:', error);
        setTransactions([]);
      } finally {
        setTransactionsLoading(false);
      }
    };

    fetchCategoryTransactions();
  }, [accountId, selectedCategory, month, year]);
  const fetchBudgetPeriods = async () => {
    try {
      const result = await budgetService.getBudgetPeriods(accountId);
      setBudgetPeriods(Array.isArray(result) ? result : result?.data || []);
    } catch (error) {
      logger.error('Error fetching budget periods:', error);
      setBudgetPeriods([]);
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
      if (val < totalCategoryBudget) {
        addToast({
          type: 'error',
          message: `Total budget cannot be less than category budgets total ₹${totalCategoryBudget.toLocaleString()}`,
        });
        return false;
      }
      await budgetService.updateMonthlyBudget(accountId, {
        month,
        year,
        amount: val,
      });
      setAccount((prev) => ({
        ...(prev || {}),
        monthlyBudget: val,
      }));
      logger.info('Monthly budget saved');
      addToast({
        type: 'success',
        message: 'Monthly budget saved',
      });
      await fetchData();
      return true;
    } catch (error) {
      logger.error('Error saving total budget:', error);
      const msg = error?.response?.data?.message || error?.message || 'Failed to save total budget';
      addToast({
        type: 'error',
        message: msg,
      });
      return false;
    }
  };
  const handleCopy = async (overwrite = false) => {
    if (!sourcePeriod) return;

    const [sourceYear, sourceMonth] = sourcePeriod.split('-').map(Number);
    try {
      setCopyingBudgets(true);
      const result = await budgetService.copyBudgets(accountId, {
        sourceMonth,
        sourceYear,
        targetMonth: month,
        targetYear: year,
        overwrite,
      });
      if (result?.requiresRewrite && !overwrite) {
        setCopyPreview(result);
        setCopyRequiresRewrite(true);
        return;
      }
      addToast({
        type: 'success',
        message: `${result?.copiedCount || result?.data?.copiedCount || 0} category budget(s) and monthly total copied successfully`,
      });
      setShowCopyModal(false);
      setSourcePeriod('');
      setCopyRequiresRewrite(false);
      setCopyPreview(null);
      await Promise.all([fetchData(), fetchBudgetPeriods()]);
    } catch (error) {
      logger.error('Error copying budgets:', error);
      if (error?.response?.status === 409) {
        setCopyRequiresRewrite(true);
        return;
      }
      const msg = error?.response?.data?.message || error?.message || 'Failed to copy budgets';
      addToast({ type: 'error', message: msg });
    } finally {
      setCopyingBudgets(false);
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
      logger.info('Budget deleted');
      addToast({
        type: 'success',
        message: 'Budget deleted',
      });
      await Promise.all([fetchData(), fetchBudgetPeriods()]);
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
    setEditRowId(b._id || b.category._id);
    setEditAmount(String(b.amount || 0));
  };
  const cancelEdit = () => {
    setEditRowId(null);
    setEditAmount('');
  };
  const saveEdit = async (b) => {
    try {
      const newAmt = Number(editAmount || 0);
      const currentAmount = Number(b.amount) || 0;
      const proposed = totalCategoryBudget - currentAmount + newAmt;
      if (account?.monthlyBudget && account.monthlyBudget > 0 && proposed > account.monthlyBudget) {
        addToast({
          type: 'error',
          message: `Budgets total ₹${proposed} exceeds account monthly budget ₹${account.monthlyBudget}`,
        });
        return;
      }
      if (b._id) {
        await budgetService.updateBudget(accountId, b._id, { amount: newAmt });
        logger.info('Budget updated');
      } else {
        await budgetService.createBudget(accountId, {
          category: b.category._id,
          month,
          year,
          amount: newAmt,
        });
        logger.info('Budget created');
      }
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
  const budgetByCategory = new Map(
    expenseBudgets.map((budget) => [String(budget.category?._id || budget.category), budget]),
  );
  const categoryRows = expenseCategories.map((category) => ({
    ...(budgetByCategory.get(String(category._id)) || {}),
    category,
    amount: budgetByCategory.get(String(category._id))?.amount || 0,
  }));
  const availableSourcePeriods = budgetPeriods.filter(
    (period) => period.month !== month || period.year !== year,
  );
  const copyExceedsBudget =
    copyRequiresRewrite &&
    Number(copyPreview?.proposedTotal || 0) > Number(copyPreview?.monthlyBudget || 0);
  const totalCategoryBudget = expenseBudgets.reduce(
    (sum, item) => sum + (Number(item.amount) || 0),
    0,
  );
  const enteredTotalBudget = Number(totalBudgetInput || 0);
  const totalBudgetBelowCategories =
    enteredTotalBudget > 0 && enteredTotalBudget < totalCategoryBudget;
  const totalRemaining = account?.monthlyBudget ? account.monthlyBudget - totalCategoryBudget : 0;
  const getProgressColor = (pct) => {
    if (pct >= 100) return 'bg-red-500';
    if (pct >= 80) return 'bg-amber-500';
    return 'bg-emerald-500';
  };
  const movePeriod = (direction) => {
    const next = new Date(year, month - 1 + direction, 1);
    setMonth(next.getMonth() + 1);
    setYear(next.getFullYear());
    cancelEdit();
    setIsEditingTotalBudget(false);
    setTotalBudgetValidationShown(false);
  };

  return (
    <Layout>
      <div className='max-w-7xl mx-auto'>
        <header className='flex flex-col gap-4 mb-4 sm:flex-row sm:items-center'>
          <button className='p-2 rounded-md hover:bg-gray-100' onClick={() => navigate(-1)}>
            <ArrowLeft size={20} />
          </button>
          <h1 className='text-2xl font-semibold'>Budget</h1>
        </header>
        <div className='card p-4 sm:p-6 mb-6'>
          <div className='flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between'>
            <div>
              <p className='text-xs font-semibold uppercase tracking-wide text-gray-500'>
                Budget dashboard
              </p>
              <h1 className='mt-2 text-2xl font-semibold text-gray-900'>Budget Overview</h1>
              <p className='mt-1 text-sm text-gray-600'>
                {account?.name || 'Account'} · Monthly expense limits
              </p>
            </div>
            <div className='flex flex-wrap items-center gap-2 sm:gap-3'>
              <button
                type='button'
                onClick={() => movePeriod(-1)}
                className='rounded-md border border-gray-300 p-2 hover:bg-gray-50'
                aria-label='Previous month'
                title='Previous month'
              >
                <ChevronLeft size={18} />
              </button>
              <span className='min-w-36 text-center font-semibold text-gray-900'>
                {monthNames[month - 1]} {year}
              </span>
              <button
                type='button'
                onClick={() => movePeriod(1)}
                className='rounded-md border border-gray-300 p-2 hover:bg-gray-50'
                aria-label='Next month'
                title='Next month'
              >
                <ChevronRight size={18} />
              </button>
              <button
                type='button'
                onClick={() => setShowCopyModal(true)}
                className='w-full rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 sm:w-auto'
              >
                Copy from
              </button>
            </div>
          </div>
          <div className='grid grid-cols-1 gap-4 mt-6 pt-6 border-t border-gray-200 md:grid-cols-3'>
            <div className='card bg-gradient-to-br from-indigo-50 to-white p-4'>
              <div className='flex items-start justify-between gap-3'>
                <p className='text-xs font-semibold uppercase tracking-wide text-gray-600'>
                  Total Budget
                </p>
                {!isEditingTotalBudget && (
                  <button
                    type='button'
                    onClick={() => setIsEditingTotalBudget(true)}
                    className='shrink-0 rounded-md p-2 text-indigo-600 hover:bg-indigo-100'
                    aria-label='Edit monthly budget'
                    title='Edit monthly budget'
                  >
                    <Pencil size={16} />
                  </button>
                )}
              </div>
              {!isEditingTotalBudget ? (
                <p className='mt-2 break-words text-2xl font-bold text-gray-900'>
                  ₹{(account?.monthlyBudget || 0).toLocaleString()}
                </p>
              ) : (
                <div className='mt-3 space-y-3'>
                  <input
                    type='number'
                    value={totalBudgetInput}
                    onChange={(event) => {
                      const value = event.target.value;
                      const enteredValue = Number(value || 0);
                      setTotalBudgetInput(value);
                      if (enteredValue > 0 && enteredValue < totalCategoryBudget) {
                        if (!totalBudgetValidationShown) {
                          addToast({
                            type: 'error',
                            message: `Total budget cannot be less than category budgets total ₹${totalCategoryBudget.toLocaleString()}`,
                          });
                          setTotalBudgetValidationShown(true);
                        }
                      } else {
                        setTotalBudgetValidationShown(false);
                      }
                    }}
                    className='w-full min-w-0 rounded-md border border-gray-300 px-3 py-2 text-lg text-gray-900'
                    aria-label='Monthly budget amount'
                  />
                  <div className='flex flex-col gap-2 sm:flex-row'>
                    <button
                      type='button'
                      onClick={async () => {
                        const saved = await saveTotalBudget();
                        if (saved) setIsEditingTotalBudget(false);
                      }}
                      disabled={!enteredTotalBudget || totalBudgetBelowCategories}
                      className='flex-1 rounded-md bg-indigo-600 py-2 font-semibold text-white hover:bg-indigo-700'
                    >
                      Save
                    </button>
                    <button
                      type='button'
                      onClick={() => {
                        setTotalBudgetInput(account?.monthlyBudget || '');
                        setIsEditingTotalBudget(false);
                        setTotalBudgetValidationShown(false);
                      }}
                      className='flex-1 rounded-md border border-gray-300 py-2 font-semibold text-gray-700 hover:bg-gray-50'
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
            <div className='card p-4 bg-gradient-to-br from-green-50 to-white'>
              <p className='text-xs text-gray-600 font-semibold uppercase tracking-wide'>
                Allocated
              </p>
              <p className='mt-2 text-2xl font-bold text-gray-900'>
                ₹{totalCategoryBudget.toLocaleString()}
              </p>
            </div>
            <div className='card p-4 bg-gradient-to-br from-purple-50 to-white'>
              <p className='text-xs text-gray-600 font-semibold uppercase tracking-wide'>
                Remaining
              </p>
              <p
                className={`mt-2 text-2xl font-bold ${totalRemaining < 0 ? 'text-red-600' : 'text-green-600'}`}
              >
                ₹{totalRemaining.toLocaleString()}
              </p>
            </div>
          </div>
        </div>
        <div className='grid gap-6'>
          <div className='min-w-0 space-y-6'>
            {loading ? (
              <div className='text-center py-10 text-slate-500'>Loading...</div>
            ) : categoryRows.length === 0 ? (
              <div className='card p-8 text-center text-gray-500'>
                No expense categories in this account.
              </div>
            ) : (
              <div className='card min-w-0 overflow-hidden'>
                <div className='max-w-full overflow-x-auto'>
                  <table className='w-full min-w-[760px]'>
                    <thead className='bg-gray-50 border-b border-gray-200'>
                      <tr>
                        <th className='px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700'>
                          Category
                        </th>
                        <th className='px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-700'>
                          Budget
                        </th>
                        <th className='px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-700'>
                          Spent
                        </th>
                        <th className='px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-700'>
                          Remaining
                        </th>
                        <th className='px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-700'>
                          Used
                        </th>
                        <th className='px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-700'>
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className='divide-y divide-gray-200'>
                      {categoryRows.map((b) => {
                        const spent = spentForCategory(b.category?._id || b.category);
                        const remaining = (b.amount || 0) - spent;
                        const pct =
                          b.amount > 0 ? Math.min(100, Math.round((spent / b.amount) * 100)) : 0;
                        const rowId = b._id || b.category._id;
                        const isEditing = editRowId === rowId;
                        return (
                          <tr
                            key={rowId}
                            onClick={() => setSelectedCategory(b.category)}
                            className={`cursor-pointer transition hover:bg-indigo-50 ${selectedCategory?._id === b.category?._id ? 'bg-indigo-50' : ''} ${remaining < 0 ? 'bg-red-50' : ''}`}
                          >
                            <td className='px-6 py-4 font-medium text-gray-900'>
                              <div className='flex items-center gap-3'>
                                {b.category.icon && (
                                  <span className='text-xl'>{b.category.icon}</span>
                                )}
                                <span className='font-medium text-gray-900'>
                                  {b.category.name || '—'}
                                </span>
                              </div>
                            </td>
                            <td className='px-6 py-4 text-right font-semibold text-indigo-600'>
                              {isEditing ? (
                                <input
                                  type='number'
                                  value={editAmount}
                                  onChange={(event) => setEditAmount(event.target.value)}
                                  onClick={(event) => event.stopPropagation()}
                                  className='w-28 rounded-md border border-gray-300 px-2 py-1 text-right'
                                  aria-label={`Budget amount for ${b.category?.name || 'category'}`}
                                />
                              ) : (
                                `₹${Number(b.amount || 0).toLocaleString()}`
                              )}
                            </td>
                            <td className='px-6 py-4 text-right text-gray-700'>
                              ₹{Number(spent).toLocaleString()}
                            </td>
                            <td
                              className={`px-6 py-4 text-right font-medium ${remaining < 0 ? 'text-red-600' : 'text-green-600'}`}
                            >
                              ₹{Number(remaining).toLocaleString()}
                            </td>
                            <td className='px-6 py-4 text-right'>
                              <div className='flex items-center justify-end gap-3'>
                                <div className='h-2 w-20 overflow-hidden rounded-full bg-gray-100'>
                                  <div
                                    className={`h-2 ${getProgressColor(pct)}`}
                                    style={{ width: `${b.amount > 0 ? pct : 0}%` }}
                                  />
                                </div>
                                <span className='text-sm font-medium text-gray-600'>{pct}%</span>
                              </div>
                            </td>
                            <td className='px-6 py-4 text-right'>
                              <div className='flex justify-end gap-2'>
                                {isEditing ? (
                                  <>
                                    <button
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        saveEdit(b);
                                      }}
                                      className='rounded-md bg-indigo-600 px-2 py-1 text-xs text-white'
                                    >
                                      Save
                                    </button>
                                    <button
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        cancelEdit();
                                      }}
                                      className='rounded-md border border-gray-300 px-2 py-1 text-xs text-gray-700'
                                    >
                                      Cancel
                                    </button>
                                  </>
                                ) : (
                                  <>
                                    <button
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        startEdit(b);
                                      }}
                                      className='rounded-md p-2 text-indigo-600 hover:bg-indigo-100'
                                      aria-label={`Edit ${b.category?.name || 'category'} budget`}
                                      title='Edit budget'
                                    >
                                      <Pencil size={16} />
                                    </button>
                                    {b._id && (
                                      <button
                                        onClick={(event) => {
                                          event.stopPropagation();
                                          handleDelete(b._id);
                                        }}
                                        className='rounded-md p-2 text-red-600 hover:bg-red-100'
                                        aria-label={`Delete ${b.category?.name || 'category'} budget`}
                                        title='Delete budget'
                                      >
                                        <Trash2 size={16} />
                                      </button>
                                    )}
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            {selectedCategory && (
              <section className='card overflow-hidden'>
                <div className='flex items-center justify-between border-b border-gray-200 px-6 py-4'>
                  <div>
                    <h2 className='font-semibold text-gray-900'>
                      {selectedCategory.name} transactions
                    </h2>
                    <p className='text-sm text-gray-500'>
                      {monthNames[month - 1]} {year} · {transactions.length} shown
                    </p>
                  </div>
                  <button
                    type='button'
                    onClick={() => setSelectedCategory(null)}
                    className='rounded-md p-2 text-gray-500 hover:bg-gray-100'
                    aria-label='Close category transactions'
                  >
                    <X size={18} />
                  </button>
                </div>
                <div className='space-y-3 p-4'>
                  {transactionsLoading ? (
                    <p className='py-6 text-center text-sm text-gray-500'>
                      Loading transactions...
                    </p>
                  ) : transactions.length === 0 ? (
                    <p className='py-6 text-center text-sm text-gray-500'>
                      No transactions found for this category and month.
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
        <Modal
          isOpen={showCopyModal}
          title='Copy budgets from another month'
          onConfirm={() => handleCopy(copyRequiresRewrite)}
          onCancel={() => {
            if (!copyingBudgets) {
              setShowCopyModal(false);
              setSourcePeriod('');
              setCopyRequiresRewrite(false);
              setCopyPreview(null);
            }
          }}
          confirmLabel={
            copyingBudgets
              ? 'Copying...'
              : copyRequiresRewrite
                ? copyExceedsBudget
                  ? 'Rewrite unavailable'
                  : 'Rewrite budgets'
                : 'Copy budgets'
          }
          confirmDisabled={
            !sourcePeriod ||
            availableSourcePeriods.length === 0 ||
            copyingBudgets ||
            copyExceedsBudget
          }
        >
          {copyRequiresRewrite ? (
            <div className='space-y-3'>
              <p className='text-amber-700'>
                The selected month already has budget data. Confirm to replace the existing values
                with the source month&apos;s budgets.
              </p>
              <div className='rounded-md border border-amber-200 bg-amber-50 p-3 text-sm'>
                <div className='flex items-center justify-between gap-3'>
                  <span className='text-amber-900'>Monthly total</span>
                  <span className='font-semibold text-indigo-600'>
                    ₹
                    {Number(
                      copyPreview?.replacementMonthlyBudget || copyPreview?.monthlyBudget || 0,
                    ).toLocaleString()}
                  </span>
                </div>
                {copyPreview?.currentMonthlyBudget !== null &&
                  copyPreview?.currentMonthlyBudget !== undefined && (
                    <p className='mt-1 text-xs text-amber-800'>
                      Current total: ₹{Number(copyPreview.currentMonthlyBudget).toLocaleString()}
                    </p>
                  )}
              </div>
              <div className='overflow-x-auto rounded-md border border-amber-200'>
                <table className='w-full text-sm'>
                  <thead className='bg-amber-50 text-left text-xs uppercase tracking-wide text-amber-900'>
                    <tr>
                      <th className='px-3 py-2'>Category</th>
                      <th className='px-3 py-2 text-right'>Current</th>
                      <th className='px-3 py-2 text-right'>Replace with</th>
                    </tr>
                  </thead>
                  <tbody className='divide-y divide-amber-100'>
                    {(copyPreview?.overlappingCategories || []).map((category) => (
                      <tr key={String(category.categoryId)}>
                        <td className='px-3 py-2 text-gray-900'>{category.categoryName}</td>
                        <td className='px-3 py-2 text-right text-gray-700'>
                          ₹{category.currentAmount.toLocaleString()}
                        </td>
                        <td className='px-3 py-2 text-right font-semibold text-indigo-600'>
                          ₹{category.replacementAmount.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className='text-sm font-medium text-gray-700'>
                New allocated total: ₹{Number(copyPreview?.proposedTotal || 0).toLocaleString()} / ₹
                {Number(copyPreview?.monthlyBudget || 0).toLocaleString()}
              </p>
              {copyExceedsBudget && (
                <p className='text-sm font-medium text-red-600'>
                  Rewrite cancelled: the copied budgets exceed the monthly budget limit.
                </p>
              )}
            </div>
          ) : availableSourcePeriods.length === 0 ? (
            <p className='text-slate-600'>No other months have budgets set.</p>
          ) : (
            <label className='block'>
              <span className='mb-2 block text-sm font-medium text-slate-700'>Source month</span>
              <select
                value={sourcePeriod}
                onChange={(event) => setSourcePeriod(event.target.value)}
                disabled={copyingBudgets}
                className='w-full rounded-xl border border-slate-300 px-4 py-3'
              >
                <option value=''>Select a month</option>
                {availableSourcePeriods.map((period) => (
                  <option
                    key={`${period.year}-${period.month}`}
                    value={`${period.year}-${period.month}`}
                  >
                    {monthNames[period.month - 1]} {period.year} ({period.count} budget
                    {period.count === 1 ? '' : 's'})
                  </option>
                ))}
              </select>
            </label>
          )}
        </Modal>
      </div>
    </Layout>
  );
};

export default Budgets;
