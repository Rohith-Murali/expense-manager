import React, { useEffect, useMemo, useState } from 'react';
import { ChevronDown, CreditCard, Pencil, Plus, RotateCcw, Trash2, Users, X } from 'lucide-react';
import Layout from '../components/layout/Layout';
import Icon from '../components/Icon';
import AccountPickerModal from '../components/AccountPickerModal';
import CategoryPickerModal from '../components/CategoryPickerModal';
import SubcategoryPickerModal from '../components/SubcategoryPickerModal';
import PaymentTypePickerModal from '../components/PaymentTypePickerModal';
import DateTimePickerModal from '../components/DateTimePickerModal';
import Modal from '../components/Modal';
import accountService from '../services/accountService';
import { getCategories } from '../services/categoryService';
import { getPaymentTypes } from '../services/paymentTypeService';
import * as subcategoryService from '../services/subcategoryService';
import { createTransaction } from '../services/transactionService';
import * as repaymentService from '../services/repaymentService';
import { buildCreateReceiptPayload } from '../utils/repaymentPayload';
import { logger } from '../utils/logger';

const unwrap = (result) => result?.data ?? result;
const today = () => new Date().toISOString().slice(0, 10);
const localDateTime = () => {
  const date = new Date();
  const pad = (value) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};
const money = (value, currency = 'INR') =>
  new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(Number(value) || 0);

const Repayments = () => {
  const [accounts, setAccounts] = useState([]);
  const [repayments, setRepayments] = useState([]);
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [paymentTypes, setPaymentTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [editingRepaymentId, setEditingRepaymentId] = useState('');
  const [editForm, setEditForm] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [picker, setPicker] = useState('');
  const [subcategoryLoading, setSubcategoryLoading] = useState(false);
  const [subcategoryError, setSubcategoryError] = useState('');
  const [repaymentToDelete, setRepaymentToDelete] = useState(null);
  const [receiptToReverse, setReceiptToReverse] = useState(null);
  const [receiptToEdit, setReceiptToEdit] = useState(null);
  const [receiptAmount, setReceiptAmount] = useState('');
  const [noPersonalShare, setNoPersonalShare] = useState(false);
  const [form, setForm] = useState({
    accountId: '',
    categoryId: '',
    paymentTypeId: '',
    creditCardAccountId: '',
    amount: '',
    personalShare: '',
    title: '',
    date: localDateTime(),
    subcategoryId: '',
    notes: '',
    participants: [{ name: '', amount: '' }],
  });
  const [receiptForms, setReceiptForms] = useState({});

  const spendingAccounts = useMemo(
    () => accounts.filter((account) => ['CASH', 'BANK'].includes(account.type)),
    [accounts],
  );
  const cards = useMemo(
    () => accounts.filter((account) => account.type === 'CREDIT_CARD'),
    [accounts],
  );

  const loadRepayments = async () => {
    try {
      const result = await repaymentService.getRepayments();
      setRepayments(unwrap(result) || []);
    } catch (loadError) {
      logger.error('Error loading repayments:', loadError);
      setError(loadError?.response?.data?.message || 'Unable to load repayments.');
    }
  };

  useEffect(() => {
    let active = true;
    Promise.all([accountService.getAccounts(false), repaymentService.getRepayments()])
      .then(([accountsResult, repaymentResult]) => {
        if (!active) return;
        const accountRows = unwrap(accountsResult) || [];
        setAccounts(accountRows);
        setRepayments(unwrap(repaymentResult) || []);
        const firstAccount = accountRows.find((account) => ['CASH', 'BANK'].includes(account.type));
        if (firstAccount) setForm((current) => ({ ...current, accountId: firstAccount._id }));
      })
      .catch((loadError) => {
        logger.error('Error loading repayment page:', loadError);
        if (active) setError(loadError?.response?.data?.message || 'Unable to load repayments.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!form.accountId) {
      setCategories([]);
      setPaymentTypes([]);
      return;
    }
    let active = true;
    Promise.all([
      getCategories(form.accountId, { type: 'expense' }),
      getPaymentTypes(form.accountId, { type: 'expense' }),
    ])
      .then(([categoryResult, paymentResult]) => {
        if (!active) return;
        const categoryRows = unwrap(categoryResult) || [];
        const paymentRows = unwrap(paymentResult) || [];
        setCategories(categoryRows);
        setPaymentTypes(paymentRows);
        setForm((current) => ({
          ...current,
          categoryId: categoryRows.some((item) => item._id === current.categoryId)
            ? current.categoryId
            : categoryRows[0]?._id || '',
          paymentTypeId: paymentRows.some((item) => item._id === current.paymentTypeId)
            ? current.paymentTypeId
            : paymentRows[0]?._id || '',
        }));
      })
      .catch((loadError) => {
        logger.error('Error loading expense categories and payment types:', loadError);
        if (active)
          setError(loadError?.response?.data?.message || 'Unable to load expense options.');
      });
    return () => {
      active = false;
    };
  }, [form.accountId]);

  const loadSubcategories = async (categoryId, accountId = form.accountId) => {
    if (!categoryId || !accountId) {
      setSubcategories([]);
      return [];
    }
    try {
      setSubcategoryLoading(true);
      setSubcategoryError('');
      const result = await subcategoryService.getSubcategories(accountId, categoryId);
      const rows = unwrap(result) || [];
      setSubcategories(rows);
      return rows;
    } catch (loadError) {
      logger.error('Error loading repayment subcategories:', loadError);
      setSubcategories([]);
      setSubcategoryError('Could not load subcategories. Please try again.');
      return null;
    } finally {
      setSubcategoryLoading(false);
    }
  };

  const selectCategory = async (category) => {
    setForm((current) => ({ ...current, categoryId: category._id, subcategoryId: '' }));
    setPicker('');
    const rows = await loadSubcategories(category._id);
    const none = rows?.find((item) => item.name?.trim().toLowerCase() === 'none');
    if (none) setForm((current) => ({ ...current, subcategoryId: none._id }));
  };

  const selectPaymentType = (value) => {
    setForm((current) =>
      value.startsWith('credit-card:')
        ? { ...current, creditCardAccountId: value.slice('credit-card:'.length), paymentTypeId: '' }
        : { ...current, creditCardAccountId: '', paymentTypeId: value },
    );
    setPicker('');
  };

  const selectEditCategory = async (category) => {
    setEditForm((current) => ({ ...current, categoryId: category._id, subcategoryId: '' }));
    setPicker('');
    const rows = await loadSubcategories(category._id, editForm?.accountId?._id || editForm?.accountId);
    const none = rows?.find((item) => item.name?.trim().toLowerCase() === 'none');
    if (none) setEditForm((current) => ({ ...current, subcategoryId: none._id }));
  };

  const selectEditPaymentType = (value) => {
    setEditForm((current) => value.startsWith('credit-card:')
      ? { ...current, creditCardAccountId: value.slice('credit-card:'.length), paymentTypeId: '' }
      : { ...current, creditCardAccountId: '', paymentTypeId: value });
    setPicker('');
  };

  const updateParticipant = (index, key, value) => {
    setForm((current) => ({
      ...current,
      participants: current.participants.map((participant, itemIndex) =>
        itemIndex === index ? { ...participant, [key]: value } : participant,
      ),
    }));
  };

  const sharesAreValid = (amountValue, personalShareValue, participantValues) => {
    const amount = Number(amountValue);
    const personalShare = Number(personalShareValue);
    const participants = participantValues.map((participant) => ({
      name: participant.name.trim(),
      amount: Number(participant.amount),
    }));
    return amount > 0 && personalShare >= 0 && participants.length > 0 &&
      participants.every((participant) => participant.name && participant.amount > 0) &&
      Math.abs(personalShare + participants.reduce((sum, item) => sum + item.amount, 0) - amount) <= 0.005;
  };

  const submitSharedPayment = async (event) => {
    event.preventDefault();
    const amount = Number(form.amount);
    const personalShare = noPersonalShare ? 0 : Number(form.personalShare);
    const participants = form.participants.map((participant) => ({
      name: participant.name.trim(),
      amount: Number(participant.amount),
    }));
    if (
      !form.accountId ||
      !form.categoryId ||
      (!form.creditCardAccountId && !form.paymentTypeId) ||
      amount <= 0 ||
      personalShare < 0 ||
      participants.some((participant) => !participant.name || participant.amount <= 0) ||
      !sharesAreValid(amount, personalShare, participants)
    ) {
      setError('Enter valid shares whose total equals the full payment amount.');
      return;
    }
    try {
      setSaving(true);
      setError('');
      await createTransaction(form.accountId, {
        type: 'expense',
        amount,
        date: new Date(form.date).toISOString(),
        description: form.title.trim(),
        notes: form.notes.trim(),
        categoryId: form.categoryId,
        subcategoryId: form.subcategoryId || undefined,
        paymentTypeId: form.creditCardAccountId ? undefined : form.paymentTypeId,
        creditCardAccountId: form.creditCardAccountId || undefined,
        sharedPayment: { personalShare, participants },
      });
      setForm((current) => ({
        ...current,
        amount: '',
        personalShare: '',
        title: '',
        notes: '',
        participants: [{ name: '', amount: '' }],
        date: localDateTime(),
        subcategoryId: '',
      }));
      setNoPersonalShare(false);
      await loadRepayments();
    } catch (saveError) {
      logger.error('Error creating shared payment:', saveError);
      setError(saveError?.response?.data?.message || 'Unable to create the shared payment.');
    } finally {
      setSaving(false);
    }
  };

  const submitReceipt = async (event, repayment) => {
    event.preventDefault();
    const values = receiptForms[repayment._id] || {};
    try {
      setSaving(true);
      setError('');
      await repaymentService.createReceipt(
        repayment._id,
        buildCreateReceiptPayload(repayment, values, spendingAccounts, today()),
      );
      await loadRepayments();
      setReceiptForms((current) => ({
        ...current,
        [repayment._id]: { ...current[repayment._id], amount: '', notes: '' },
      }));
    } catch (saveError) {
      logger.error('Error recording repayment receipt:', saveError);
      setError(saveError?.response?.data?.message || 'Unable to record the repayment.');
    } finally {
      setSaving(false);
    }
  };

  const beginEditRepayment = (repayment) => {
    setEditingRepaymentId(repayment._id);
    setEditForm({
      title: repayment.title || '',
      accountId: repayment.sourceAccountId || '',
      amount: String(repayment.totalAmount ?? ''),
      categoryId: repayment.categoryId || '',
      subcategoryId: repayment.subcategoryId || '',
      paymentTypeId: repayment.paymentTypeId || '',
      creditCardAccountId: repayment.creditCardAccountId || '',
      date: new Date(repayment.date).toISOString().slice(0, 16),
      notes: repayment.notes || '',
      personalShare: String(repayment.personalShare),
      participants: repayment.participants.map((participant) => ({
        id: participant._id,
        name: participant.name,
        amount: String(participant.amount),
      })),
    });
    if (repayment.categoryId && repayment.sourceAccountId) {
      loadSubcategories(repayment.categoryId?._id || repayment.categoryId, repayment.sourceAccountId?._id || repayment.sourceAccountId);
    }
  };

  const saveRepaymentEdit = async (repayment) => {
    if (!repayment || !editForm || !sharesAreValid(editForm.amount, editForm.personalShare, editForm.participants)) {
      setError('The full amount must equal your share plus everyone else’s shares.');
      return;
    }
    try {
      setSaving(true);
      setError('');
      await repaymentService.updateRepayment(repayment._id, {
        accountId: editForm.accountId,
        amount: Number(editForm.amount),
        categoryId: editForm.categoryId,
        subcategoryId: editForm.subcategoryId || null,
        paymentTypeId: editForm.creditCardAccountId ? null : editForm.paymentTypeId,
        creditCardAccountId: editForm.creditCardAccountId || null,
        title: editForm.title,
        date: new Date(editForm.date).toISOString(),
        notes: editForm.notes,
        personalShare: Number(editForm.personalShare),
        participants: editForm.participants.map((participant) => ({
          ...(participant.id && { id: participant.id }),
          name: participant.name.trim(),
          amount: Number(participant.amount),
        })),
      });
      setEditingRepaymentId('');
      setEditForm(null);
      await loadRepayments();
    } catch (updateError) {
      setError(
        updateError?.response?.data?.message ||
          'Unable to update shares. Check the share totals and existing receipts.',
      );
    } finally {
      setSaving(false);
    }
  };

  const removeRepayment = (repayment) => {
    setRepaymentToDelete(repayment);
  };

  const confirmRemoveRepayment = async () => {
    if (!repaymentToDelete) return;
    try {
      setSaving(true);
      await repaymentService.deleteRepayment(repaymentToDelete._id);
      setRepaymentToDelete(null);
      await loadRepayments();
    } catch (deleteError) {
      setError(
        deleteError?.response?.data?.message || 'Repayments with receipts cannot be removed.',
      );
    } finally {
      setSaving(false);
    }
  };

  const reverseReceipt = (repayment, receipt) => {
    setReceiptToReverse({ repayment, receipt });
  };

  const confirmReverseReceipt = async () => {
    if (!receiptToReverse) return;
    try {
      setSaving(true);
      await repaymentService.reverseReceipt(
        receiptToReverse.repayment._id,
        receiptToReverse.receipt._id,
      );
      setReceiptToReverse(null);
      await loadRepayments();
    } catch (reverseError) {
      setError(reverseError?.response?.data?.message || 'Unable to reverse this receipt.');
    } finally {
      setSaving(false);
    }
  };

  const editReceipt = (repayment, receipt) => {
    setReceiptToEdit({ repayment, receipt });
    setReceiptAmount(String(receipt.amount));
  };

  const confirmEditReceipt = async () => {
    if (!receiptToEdit) return;
    const amount = Number(receiptAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setError('Enter a positive amount.');
      return;
    }
    try {
      setSaving(true);
      await repaymentService.updateReceipt(receiptToEdit.repayment._id, receiptToEdit.receipt._id, {
        amount,
      });
      setReceiptToEdit(null);
      await loadRepayments();
    } catch (updateError) {
      setError(updateError?.response?.data?.message || 'Unable to edit this receipt.');
    } finally {
      setSaving(false);
    }
  };

  const selectedAccount = spendingAccounts.find(
    (account) => String(account._id) === String(form.accountId),
  );
  const selectedCategory = categories.find(
    (category) => String(category._id) === String(form.categoryId),
  );
  const selectedSubcategory = subcategories.find(
    (subcategory) => String(subcategory._id) === String(form.subcategoryId),
  );
  const selectedPaymentType = paymentTypes.find(
    (paymentType) => String(paymentType._id) === String(form.paymentTypeId),
  );
  const selectedCard = cards.find((card) => String(card._id) === String(form.creditCardAccountId));
  const selectedEditAccount = spendingAccounts.find((account) => String(account._id) === String(editForm?.accountId?._id || editForm?.accountId || ''));
  const selectedEditCategory = categories.find((category) => String(category._id) === String(editForm?.categoryId?._id || editForm?.categoryId || ''));
  const selectedEditSubcategory = subcategories.find((subcategory) => String(subcategory._id) === String(editForm?.subcategoryId?._id || editForm?.subcategoryId || ''));
  const selectedEditPaymentType = paymentTypes.find((paymentType) => String(paymentType._id) === String(editForm?.paymentTypeId?._id || editForm?.paymentTypeId || ''));
  const selectedEditCard = cards.find((card) => String(card._id) === String(editForm?.creditCardAccountId?._id || editForm?.creditCardAccountId || ''));
  const formatDateTime = (value) => {
    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? 'Select date and time'
      : date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
  };

  return (
    <Layout>
      <main className='mx-auto min-h-screen max-w-6xl space-y-6 p-4 text-gray-800 dark:text-gray-100 sm:p-6'>
        <header className='flex flex-wrap items-end justify-between gap-4'>
          <div>
            <h1 className='text-2xl font-semibold tracking-tight'>Repayments</h1>
            <p className='mt-1 max-w-2xl text-sm text-gray-500 dark:text-gray-400'>
              Track shared expenses and the money you receive back. Only your personal share affects
              budgets.
            </p>
          </div>
          <button
            type='button'
            className='btn btn-primary inline-flex items-center gap-2'
            onClick={() => setShowForm((visible) => !visible)}
          >
            {showForm ? <X size={17} /> : <Plus size={17} />}
            {showForm ? 'Close form' : 'Record shared payment'}
          </button>
        </header>

        {error && (
          <p
            role='alert'
            className='rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300'
          >
            {error}
          </p>
        )}

        {showForm && (
          <section className='rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800 sm:p-7'>
            <div className='mb-6 flex items-start justify-between gap-3'>
              <div>
                <h2 className='text-xl font-semibold'>New shared payment</h2>
                <p className='mt-1 text-sm text-gray-500 dark:text-gray-400'>
                  Add the payment details first, then split the amount between everyone.
                </p>
              </div>
              <div className='hidden rounded-xl bg-indigo-50 p-3 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-300 sm:block'>
                <Users size={22} />
              </div>
            </div>
            {!spendingAccounts.length ? (
              <p className='text-sm text-gray-600'>
                Add a cash or bank account before recording a shared payment.
              </p>
            ) : (
              <form onSubmit={submitSharedPayment} className='space-y-4'>
                <div className='grid gap-3 md:grid-cols-2'>
                  <div className='min-w-0'>
                    <label className='mb-2 block text-sm font-medium'>Paid from</label>
                    <button
                      type='button'
                      className='flex min-h-[4.25rem] w-full items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-left transition hover:border-indigo-400 dark:border-slate-600 dark:bg-slate-900 dark:hover:border-indigo-400'
                      onClick={() => setPicker('account')}
                    >
                      <span
                        className='flex h-9 w-9 shrink-0 items-center justify-center rounded-lg'
                        style={{
                          color: selectedAccount?.color || '#4f46e5',
                          backgroundColor: `${selectedAccount?.color || '#4f46e5'}22`,
                        }}
                      >
                        <Icon name={selectedAccount?.icon || 'wallet'} size={19} />
                      </span>
                      <span className='min-w-0 flex-1 truncate text-sm font-medium'>
                        {selectedAccount?.name || 'Select account'}
                      </span>
                      <ChevronDown size={16} className='shrink-0 text-gray-400' />
                    </button>
                  </div>
                  <div className='min-w-0'>
                    <label className='mb-2 block text-sm font-medium'>Category</label>
                    <button
                      type='button'
                      className='flex min-h-[4.25rem] w-full items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-left transition hover:border-indigo-400 dark:border-slate-600 dark:bg-slate-900 dark:hover:border-indigo-400'
                      onClick={() => setPicker('category')}
                    >
                      <span
                        className='flex h-9 w-9 shrink-0 items-center justify-center rounded-lg'
                        style={{
                          color: selectedCategory?.color || '#4f46e5',
                          backgroundColor: `${selectedCategory?.color || '#4f46e5'}22`,
                        }}
                      >
                        <Icon name={selectedCategory?.icon || 'tag'} size={19} />
                      </span>
                      <span className='min-w-0 flex-1 truncate text-sm font-medium'>
                        {selectedCategory?.name || 'Select category'}
                      </span>
                      <ChevronDown size={16} className='shrink-0 text-gray-400' />
                    </button>
                  </div>
                  <div className='min-w-0'>
                    <label className='mb-2 block text-sm font-medium'>Subcategory</label>
                    <button
                      type='button'
                      disabled={!form.categoryId}
                      className='flex min-h-[4.25rem] w-full items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-left transition hover:border-indigo-400 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-600 dark:bg-slate-900 dark:hover:border-indigo-400'
                      onClick={() => setPicker('subcategory')}
                    >
                      <span
                        className='flex h-9 w-9 shrink-0 items-center justify-center rounded-lg'
                        style={{
                          color: selectedSubcategory?.color || selectedCategory?.color || '#4f46e5',
                          backgroundColor: `${selectedSubcategory?.color || selectedCategory?.color || '#4f46e5'}22`,
                        }}
                      >
                        <Icon name={selectedSubcategory?.icon || 'tag'} size={19} />
                      </span>
                      <span className='min-w-0 flex-1 truncate text-sm font-medium'>
                        {selectedSubcategory?.name || 'Select subcategory'}
                      </span>
                      <ChevronDown size={16} className='shrink-0 text-gray-400' />
                    </button>
                  </div>
                  <div className='min-w-0'>
                    <label className='mb-2 block text-sm font-medium'>Payment type</label>
                    <button
                      type='button'
                      className='flex min-h-[4.25rem] w-full items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-left transition hover:border-indigo-400 dark:border-slate-600 dark:bg-slate-900 dark:hover:border-indigo-400'
                      onClick={() => setPicker('paymentType')}
                    >
                      <span
                        className='flex h-9 w-9 shrink-0 items-center justify-center rounded-lg'
                        style={{
                          color: selectedCard?.color || selectedPaymentType?.color || '#4f46e5',
                          backgroundColor: `${selectedCard?.color || selectedPaymentType?.color || '#4f46e5'}22`,
                        }}
                      >
                        <Icon
                          name={selectedCard?.icon || selectedPaymentType?.icon || 'card'}
                          size={19}
                        />
                      </span>
                      <span className='min-w-0 flex-1 truncate text-sm font-medium'>
                        {selectedCard?.name || selectedPaymentType?.name || 'Select payment type'}
                      </span>
                      <CreditCard size={17} className='text-gray-400' />
                    </button>
                  </div>
                  <input
                    className='input'
                    value={form.title}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, title: event.target.value }))
                    }
                    placeholder='What was paid for?'
                    maxLength='200'
                    required
                  />
                  <div className='min-w-0'>
                    <label className='mb-2 block text-sm font-medium'>Date and time</label>
                    <button
                      type='button'
                      className='flex min-h-[4.25rem] w-full items-center justify-between rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-left transition hover:border-indigo-400 dark:border-slate-600 dark:bg-slate-900 dark:hover:border-indigo-400'
                      onClick={() => setPicker('date')}
                    >
                      <span className='text-sm font-medium'>{formatDateTime(form.date)}</span>
                      <ChevronDown size={17} className='text-gray-400' />
                    </button>
                  </div>
                  <input
                    className='input'
                    type='number'
                    min='0.01'
                    step='0.01'
                    value={form.amount}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, amount: event.target.value }))
                    }
                    placeholder='Full amount paid'
                    required
                  />
                  <div>
                    <label className='mb-2 block text-sm font-medium'>Your personal share</label>
                    <input
                      className='input'
                      type='number'
                      min='0'
                      step='0.01'
                      value={form.personalShare}
                      onChange={(event) => {
                        setNoPersonalShare(false);
                        setForm((current) => ({ ...current, personalShare: event.target.value }));
                      }}
                      placeholder='0.00'
                      disabled={noPersonalShare}
                      required={!noPersonalShare}
                    />
                    <label className='mt-2 inline-flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400'>
                      <input type='checkbox' checked={noPersonalShare} onChange={(event) => { setNoPersonalShare(event.target.checked); if (event.target.checked) setForm((current) => ({ ...current, personalShare: '0' })); }} />
                      I have no personal share (₹0)
                    </label>
                  </div>
                  <input
                    className='input md:col-span-2'
                    value={form.notes}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, notes: event.target.value }))
                    }
                    placeholder='Notes (optional)'
                    maxLength='1000'
                  />
                </div>
                <div className='space-y-2'>
                  <h3 className='text-sm font-semibold'>Other people’s shares</h3>
                  {form.participants.map((participant, index) => (
                    <div key={index} className='grid gap-2 sm:grid-cols-[1fr_1fr_auto]'>
                      <input
                        className='input'
                        value={participant.name}
                        onChange={(event) => updateParticipant(index, 'name', event.target.value)}
                        placeholder='Name'
                        required
                      />
                      <input
                        className='input'
                        type='number'
                        min='0.01'
                        step='0.01'
                        value={participant.amount}
                        onChange={(event) => updateParticipant(index, 'amount', event.target.value)}
                        placeholder='Share amount'
                        required
                      />
                      {form.participants.length > 1 && (
                        <button
                          type='button'
                          className='rounded px-3 text-sm text-red-700 hover:bg-red-50'
                          onClick={() =>
                            setForm((current) => ({
                              ...current,
                              participants: current.participants.filter(
                                (_, itemIndex) => itemIndex !== index,
                              ),
                            }))
                          }
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type='button'
                    className='inline-flex items-center gap-1 text-sm font-medium text-indigo-700'
                    onClick={() =>
                      setForm((current) => ({
                        ...current,
                        participants: [...current.participants, { name: '', amount: '' }],
                      }))
                    }
                  >
                    <Plus size={16} /> Add person
                  </button>
                </div>
                <button
                  type='submit'
                  className='btn btn-primary'
                  disabled={saving || !categories.length}
                >
                  {saving ? 'Saving…' : 'Save shared payment'}
                </button>
              </form>
            )}
          </section>
        )}

        <section className='space-y-4'>
          <div className='flex items-center justify-between'>
            <div>
              <h2 className='text-xl font-semibold'>Shared payments</h2>
              <p className='mt-1 text-sm text-gray-500 dark:text-gray-400'>
                See what is settled and what is still owed.
              </p>
            </div>
            {repayments.length > 0 && (
              <span className='rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600 dark:bg-slate-800 dark:text-gray-300'>
                {repayments.length} {repayments.length === 1 ? 'payment' : 'payments'}
              </span>
            )}
          </div>
          {loading ? (
            <p className='text-sm text-gray-500'>Loading repayments…</p>
          ) : !repayments.length ? (
            <div className='rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center text-sm text-gray-500 dark:border-slate-700 dark:bg-slate-800 dark:text-gray-400'>
              No shared payments recorded yet.
            </div>
          ) : (
            repayments.map((repayment) => {
              const values = receiptForms[repayment._id] || {};
              const participantId =
                values.participantId ||
                repayment.participants.find((item) => item.pending > 0)?._id ||
                '';
              const activeParticipants = repayment.participants.filter(
                (participant) => participant.pending > 0,
              );
              return (
                <article
                  key={repayment._id}
                  className='rounded-2xl border border-gray-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md dark:border-slate-700 dark:bg-slate-800 sm:p-5'
                >
                  <div className='flex flex-wrap items-start justify-between gap-4'>
                    <div>
                      <div className='flex items-center gap-2'>
                        <h3 className='font-semibold'>{repayment.title || 'Shared expense'}</h3>
                        <button
                          type='button'
                          onClick={() => beginEditRepayment(repayment)}
                          title='Edit shared payment'
                          className='rounded-lg p-1 text-gray-400 hover:bg-indigo-50 hover:text-indigo-700 dark:text-gray-400 dark:hover:bg-indigo-950/50 dark:hover:text-indigo-300'
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          type='button'
                          onClick={() => removeRepayment(repayment)}
                          title='Remove tracking record'
                          className='rounded-lg p-1 text-gray-400 hover:bg-red-50 hover:text-red-700 dark:text-gray-400 dark:hover:bg-red-950/40 dark:hover:text-red-300'
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                      <p className='mt-1 text-xs text-gray-500 dark:text-gray-400'>
                        {new Date(repayment.date).toLocaleDateString()}
                      </p>
                    </div>
                    <div className='grid grid-cols-2 gap-x-5 gap-y-1 text-right text-sm sm:grid-cols-4'>
                      <span className='text-gray-500 dark:text-gray-400'>Original</span>
                      <strong>{money(repayment.totalAmount)}</strong>
                      <span className='text-gray-500 dark:text-gray-400'>Your share</span>
                      <strong>{money(repayment.personalShare)}</strong>
                      <span className='text-gray-500 dark:text-gray-400'>Recovered</span>
                      <strong className='text-green-700 dark:text-green-300'>
                        {money(repayment.totalRepaid)}
                      </strong>
                      <span className='text-gray-500 dark:text-gray-400'>Pending</span>
                      <strong
                        className={
                          repayment.totalPending > 0
                            ? 'text-amber-700 dark:text-amber-300'
                            : 'text-green-700 dark:text-green-300'
                        }
                      >
                        {money(repayment.totalPending)}
                      </strong>
                    </div>
                  </div>

                  {false && editingRepaymentId === repayment._id && editForm && (
                    <form
                      onSubmit={(event) => saveRepaymentEdit(event, repayment)}
                      className='space-y-3 rounded-xl border border-indigo-100 bg-indigo-50 p-4 dark:border-indigo-900/70 dark:bg-indigo-950/30'
                    >
                      <h4 className='text-sm font-semibold'>Edit shared payment and shares</h4>
                      <div className='grid gap-2 sm:grid-cols-2'>
                        <input
                          className='input'
                          value={editForm.title}
                          onChange={(event) =>
                            setEditForm((current) => ({ ...current, title: event.target.value }))
                          }
                          placeholder='Title'
                          maxLength='200'
                          required
                        />
                        <input
                          className='input'
                          type='date'
                          value={editForm.date}
                          onChange={(event) =>
                            setEditForm((current) => ({ ...current, date: event.target.value }))
                          }
                          required
                        />
                        <input
                          className='input'
                          type='number'
                          min='0'
                          step='0.01'
                          value={editForm.personalShare}
                          onChange={(event) =>
                            setEditForm((current) => ({
                              ...current,
                              personalShare: event.target.value,
                            }))
                          }
                          placeholder='Your personal share'
                          required
                        />
                        <input
                          className='input'
                          value={editForm.notes}
                          onChange={(event) =>
                            setEditForm((current) => ({ ...current, notes: event.target.value }))
                          }
                          placeholder='Notes (optional)'
                          maxLength='1000'
                        />
                      </div>
                      {editForm.participants.map((participant, index) => (
                        <div
                          key={participant.id || index}
                          className='grid gap-2 sm:grid-cols-[1fr_1fr_auto]'
                        >
                          <input
                            className='input'
                            value={participant.name}
                            onChange={(event) =>
                              setEditForm((current) => ({
                                ...current,
                                participants: current.participants.map((item, itemIndex) =>
                                  itemIndex === index
                                    ? { ...item, name: event.target.value }
                                    : item,
                                ),
                              }))
                            }
                            placeholder='Name'
                            required
                          />
                          <input
                            className='input'
                            type='number'
                            min='0.01'
                            step='0.01'
                            value={participant.amount}
                            onChange={(event) =>
                              setEditForm((current) => ({
                                ...current,
                                participants: current.participants.map((item, itemIndex) =>
                                  itemIndex === index
                                    ? { ...item, amount: event.target.value }
                                    : item,
                                ),
                              }))
                            }
                            placeholder='Share amount'
                            required
                          />
                          {editForm.participants.length > 1 && (
                            <button
                              type='button'
                              className='px-3 text-sm text-red-700'
                              onClick={() =>
                                setEditForm((current) => ({
                                  ...current,
                                  participants: current.participants.filter(
                                    (_, itemIndex) => itemIndex !== index,
                                  ),
                                }))
                              }
                            >
                              Remove
                            </button>
                          )}
                        </div>
                      ))}
                      <div className='flex flex-wrap gap-2'>
                        <button
                          type='button'
                          className='text-sm font-medium text-indigo-700'
                          onClick={() =>
                            setEditForm((current) => ({
                              ...current,
                              participants: [...current.participants, { name: '', amount: '' }],
                            }))
                          }
                        >
                          Add person
                        </button>
                        <button type='submit' className='btn btn-primary' disabled={saving}>
                          Save changes
                        </button>
                        <button
                          type='button'
                          className='rounded px-3 text-sm text-gray-600'
                          onClick={() => {
                            setEditingRepaymentId('');
                            setEditForm(null);
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  )}

                  <div className='grid gap-2 sm:grid-cols-2 lg:grid-cols-4 mt-4'>
                    {repayment.participants.map((participant) => (
                      <div
                        key={participant._id}
                        className='rounded-lg border border-gray-100 bg-gray-50 p-3 text-sm dark:border-slate-700 dark:bg-slate-900/60'
                      >
                        <div className='flex justify-between gap-2'>
                          <span className='font-medium'>{participant.name}</span>
                          <span
                            className={
                              participant.pending > 0
                                ? 'text-amber-700 dark:text-amber-300'
                                : 'text-green-700 dark:text-green-300'
                            }
                          >
                            {money(participant.pending)} pending
                          </span>
                        </div>
                        <p className='mt-0.5 text-[11px] text-gray-500 dark:text-gray-400'>
                          Share {money(participant.amount)} · Received {money(participant.repaid)}
                        </p>
                      </div>
                    ))}
                  </div>

                  {repayment.receipts?.length > 0 && (
                    <div>
                      <h4 className='mt-3 text-m font-medium text-gray-700 dark:text-gray-200'>
                        Receipt history
                      </h4>
                      <div className='grid sm:grid-cols-2 lg:grid-cols-4'>
                        {repayment.receipts.map((receipt) => {
                          const participant = repayment.participants.find(
                            (item) => String(item._id) === String(receipt.participantId),
                          );
                          return (
                            <div
                              key={receipt._id}
                              className='flex items-center justify-between gap-2 rounded-lg border border-gray-200 p-2 m-2 text-sm dark:border-slate-700'
                            >
                              <span>
                                {participant?.name || 'Participant'} ·{' '}
                                {new Date(receipt.date).toLocaleDateString()}
                              </span>
                              <span className='ml-auto font-medium text-green-500'>
                                {money(receipt.amount)}
                              </span>
                              <button
                                type='button'
                                onClick={() => editReceipt(repayment, receipt)}
                                title='Edit receipt'
                                className='text-gray-500 hover:text-indigo-700 dark:text-gray-400 dark:hover:text-indigo-300'
                              >
                                <Pencil size={15} />
                              </button>
                              <button
                                type='button'
                                onClick={() => reverseReceipt(repayment, receipt)}
                                title='Reverse receipt'
                                className='text-gray-500 hover:text-red-700 dark:text-gray-400 dark:hover:text-red-300'
                              >
                                <RotateCcw size={15} />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {activeParticipants.length > 0 && spendingAccounts.length > 0 && (
                    <form
                      onSubmit={(event) => submitReceipt(event, repayment)}
                      className='grid gap-3 rounded-xl border border-indigo-100 bg-indigo-50 p-3 mt-3 dark:border-indigo-900/70 dark:bg-indigo-950/30 sm:grid-cols-2 lg:grid-cols-5'
                    >
                      <select
                        className='input'
                        value={participantId}
                        onChange={(event) =>
                          setReceiptForms((current) => ({
                            ...current,
                            [repayment._id]: {
                              ...current[repayment._id],
                              participantId: event.target.value,
                            },
                          }))
                        }
                        required
                      >
                        {activeParticipants.map((participant) => (
                          <option key={participant._id} value={participant._id}>
                            {participant.name} · {money(participant.pending)} due
                          </option>
                        ))}
                      </select>
                      <input
                        className='input'
                        type='number'
                        min='0.01'
                        step='0.01'
                        max={
                          repayment.participants.find((item) => item._id === participantId)
                            ?.pending || undefined
                        }
                        value={values.amount || ''}
                        onChange={(event) =>
                          setReceiptForms((current) => ({
                            ...current,
                            [repayment._id]: {
                              ...current[repayment._id],
                              amount: event.target.value,
                              participantId,
                            },
                          }))
                        }
                        placeholder='Amount received'
                        required
                      />
                      <input
                        className='input'
                        type='date'
                        value={values.date || today()}
                        onChange={(event) =>
                          setReceiptForms((current) => ({
                            ...current,
                            [repayment._id]: {
                              ...current[repayment._id],
                              date: event.target.value,
                              participantId,
                            },
                          }))
                        }
                        required
                      />
                      <select
                        className='input'
                        value={values.destinationAccountId || spendingAccounts[0]._id}
                        onChange={(event) =>
                          setReceiptForms((current) => ({
                            ...current,
                            [repayment._id]: {
                              ...current[repayment._id],
                              destinationAccountId: event.target.value,
                              participantId,
                            },
                          }))
                        }
                        required
                      >
                        {spendingAccounts.map((account) => (
                          <option key={account._id} value={account._id}>
                            {account.name}
                          </option>
                        ))}
                      </select>
                      <button type='submit' className='btn btn-primary' disabled={saving}>
                        Record repayment
                      </button>
                      <input
                        className='input sm:col-span-2 lg:col-span-4'
                        value={values.notes || ''}
                        onChange={(event) =>
                          setReceiptForms((current) => ({
                            ...current,
                            [repayment._id]: {
                              ...current[repayment._id],
                              notes: event.target.value,
                              participantId,
                            },
                          }))
                        }
                        placeholder='Notes (optional)'
                      />
                    </form>
                  )}
                  {repayment.receivableAmount > 0 && repayment.creditCardAccountId && (
                    <p className='rounded-lg bg-amber-50 p-3 text-xs text-amber-800 dark:bg-amber-950/30 dark:text-amber-200'>
                      Repayments are earmarked for the original credit card bill and are not
                      spendable.
                    </p>
                  )}
                </article>
              );
            })
          )}
        </section>
        {picker === 'date' && (
          <DateTimePickerModal
            initialValue={form.date}
            onApply={(date) => {
              setForm((current) => ({ ...current, date }));
              setPicker('');
            }}
            onClose={() => setPicker('')}
          />
        )}
        {picker === 'account' && (
          <AccountPickerModal
            title='Select payment account'
            accounts={spendingAccounts}
            selectedId={form.accountId}
            onSelect={(value) =>
              setForm((current) => ({
                ...current,
                accountId: value,
                creditCardAccountId: '',
                categoryId: '',
                subcategoryId: '',
                paymentTypeId: '',
              }))
            }
            onClose={() => setPicker('')}
          />
        )}
        {picker === 'category' && (
          <CategoryPickerModal
            categories={categories}
            selectedId={form.categoryId}
            onSelect={selectCategory}
            onAdd={() => setPicker('')}
            onClose={() => setPicker('')}
          />
        )}
        {picker === 'subcategory' && (
          <SubcategoryPickerModal
            category={selectedCategory}
            subcategories={subcategories}
            selectedId={form.subcategoryId}
            loading={subcategoryLoading}
            error={subcategoryError}
            onSelect={(subcategory) => {
              setForm((current) => ({ ...current, subcategoryId: subcategory._id }));
              setPicker('');
            }}
            onAdd={() => setPicker('')}
            onClose={() => setPicker('')}
          />
        )}
        {picker === 'paymentType' && (
          <PaymentTypePickerModal
            paymentTypes={paymentTypes}
            creditCards={cards}
            selectedValue={
              form.creditCardAccountId
                ? `credit-card:${form.creditCardAccountId}`
                : form.paymentTypeId
            }
            onSelect={selectPaymentType}
            onAddPaymentType={() => setPicker('')}
            onClose={() => setPicker('')}
          />
        )}
        {picker === 'edit-date' && editForm && (
          <DateTimePickerModal
            initialValue={editForm.date}
            onApply={(date) => { setEditForm((current) => ({ ...current, date })); setPicker(''); }}
            onClose={() => setPicker('')}
          />
        )}
        {picker === 'edit-account' && editForm && (
          <AccountPickerModal
            title='Select payment account'
            accounts={spendingAccounts}
            selectedId={editForm.accountId?._id || editForm.accountId}
            onSelect={(value) => { setEditForm((current) => ({ ...current, accountId: value, categoryId: '', subcategoryId: '', paymentTypeId: '', creditCardAccountId: '' })); setPicker(''); }}
            onClose={() => setPicker('')}
          />
        )}
        {picker === 'edit-category' && editForm && (
          <CategoryPickerModal
            categories={categories}
            selectedId={editForm.categoryId?._id || editForm.categoryId}
            onSelect={selectEditCategory}
            onAdd={() => setPicker('')}
            onClose={() => setPicker('')}
          />
        )}
        {picker === 'edit-subcategory' && editForm && (
          <SubcategoryPickerModal
            category={selectedEditCategory}
            subcategories={subcategories}
            selectedId={editForm.subcategoryId?._id || editForm.subcategoryId}
            loading={subcategoryLoading}
            error={subcategoryError}
            onSelect={(subcategory) => { setEditForm((current) => ({ ...current, subcategoryId: subcategory._id })); setPicker(''); }}
            onAdd={() => setPicker('')}
            onClose={() => setPicker('')}
          />
        )}
        {picker === 'edit-paymentType' && editForm && (
          <PaymentTypePickerModal
            paymentTypes={paymentTypes}
            creditCards={cards}
            selectedValue={editForm.creditCardAccountId ? `credit-card:${editForm.creditCardAccountId}` : editForm.paymentTypeId}
            onSelect={selectEditPaymentType}
            onAddPaymentType={() => setPicker('')}
            onClose={() => setPicker('')}
          />
        )}
        <Modal
          isOpen={Boolean(repaymentToDelete)}
          title='Delete shared payment?'
          confirmLabel='Delete repayment'
          confirmDisabled={saving}
          onCancel={() => setRepaymentToDelete(null)}
          onConfirm={confirmRemoveRepayment}
        >
          <p className='text-sm text-gray-600 dark:text-gray-300'>
            This removes the repayment tracking record for{' '}
            <strong>{repaymentToDelete?.title || 'this shared payment'}</strong>. The original
            expense will remain.
          </p>
        </Modal>
        <Modal
          isOpen={Boolean(receiptToReverse)}
          title='Reverse repayment receipt?'
          confirmLabel='Reverse receipt'
          confirmDisabled={saving}
          onCancel={() => setReceiptToReverse(null)}
          onConfirm={confirmReverseReceipt}
        >
          <p className='text-sm text-gray-600 dark:text-gray-300'>
            This will return {money(receiptToReverse?.receipt?.amount)} to the participant’s pending
            balance.
          </p>
        </Modal>
        <Modal
          isOpen={Boolean(receiptToEdit)}
          title='Edit repayment receipt'
          confirmLabel='Save amount'
          confirmClassName='btn btn-primary disabled:cursor-not-allowed disabled:opacity-50'
          confirmDisabled={saving}
          onCancel={() => setReceiptToEdit(null)}
          onConfirm={confirmEditReceipt}
        >
          <label className='block text-sm font-medium'>
            Amount received
            <input
              className='input mt-2'
              type='number'
              min='0.01'
              step='0.01'
              value={receiptAmount}
              onChange={(event) => setReceiptAmount(event.target.value)}
              autoFocus
            />
          </label>
        </Modal>
        <Modal
          isOpen={Boolean(editingRepaymentId && editForm)}
          title='Edit shared payment'
          confirmLabel='Save changes'
          confirmClassName='btn btn-primary disabled:cursor-not-allowed disabled:opacity-50'
          confirmDisabled={saving}
          onCancel={() => {
            setEditingRepaymentId('');
            setEditForm(null);
          }}
          onConfirm={() =>
            saveRepaymentEdit(repayments.find((item) => item._id === editingRepaymentId))
          }
        >
          {editForm && (
            <div className='space-y-4'>
              <div className='grid gap-3 sm:grid-cols-2'>
                <div><label className='mb-2 block text-sm font-medium'>Paid from</label><button type='button' className='flex min-h-[4.25rem] w-full items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-left dark:border-slate-600 dark:bg-slate-900' onClick={() => setPicker('edit-account')}><Icon name={selectedEditAccount?.icon || 'wallet'} size={19} /><span className='flex-1 truncate'>{selectedEditAccount?.name || 'Select account'}</span><ChevronDown size={16} className='text-gray-400' /></button></div>
                <label className='block text-sm font-medium'>Full amount paid<input className='input mt-2' type='number' min='0.01' step='0.01' value={editForm.amount} onChange={(event) => setEditForm((current) => ({ ...current, amount: event.target.value }))} /></label>
                <div><label className='mb-2 block text-sm font-medium'>Category</label><button type='button' className='flex min-h-[4.25rem] w-full items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-left dark:border-slate-600 dark:bg-slate-900' onClick={() => setPicker('edit-category')}><Icon name={selectedEditCategory?.icon || 'tag'} size={19} /><span className='flex-1 truncate'>{selectedEditCategory?.name || 'Select category'}</span><ChevronDown size={16} className='text-gray-400' /></button></div>
                <div><label className='mb-2 block text-sm font-medium'>Subcategory</label><button type='button' disabled={!editForm.categoryId} className='flex min-h-[4.25rem] w-full items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-left disabled:opacity-60 dark:border-slate-600 dark:bg-slate-900' onClick={() => setPicker('edit-subcategory')}><Icon name={selectedEditSubcategory?.icon || 'tag'} size={19} /><span className='flex-1 truncate'>{selectedEditSubcategory?.name || 'Select subcategory'}</span><ChevronDown size={16} className='text-gray-400' /></button></div>
                <div><label className='mb-2 block text-sm font-medium'>Payment type</label><button type='button' className='flex min-h-[4.25rem] w-full items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-left dark:border-slate-600 dark:bg-slate-900' onClick={() => setPicker('edit-paymentType')}><Icon name={selectedEditCard?.icon || selectedEditPaymentType?.icon || 'card'} size={19} /><span className='flex-1 truncate'>{selectedEditCard?.name || selectedEditPaymentType?.name || 'Select payment type'}</span><CreditCard size={17} className='text-gray-400' /></button></div>
                <label className='block text-sm font-medium'>
                  Title
                  <input
                    className='input mt-2'
                    value={editForm.title}
                    onChange={(event) =>
                      setEditForm((current) => ({ ...current, title: event.target.value }))
                    }
                    maxLength='200'
                  />
                </label>
                <label className='block text-sm font-medium'>
                  Date
                  <button type='button' className='mt-2 flex min-h-[2.625rem] w-full items-center justify-between rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-left dark:border-slate-600 dark:bg-slate-900' onClick={() => setPicker('edit-date')}><span>{formatDateTime(editForm.date)}</span><ChevronDown size={16} className='text-gray-400' /></button>
                </label>
                <label className='block text-sm font-medium'>
                  Your personal share
                  <input
                    className='input mt-2'
                    type='number'
                    min='0'
                    step='0.01'
                    value={editForm.personalShare}
                    onChange={(event) =>
                      setEditForm((current) => ({ ...current, personalShare: event.target.value }))
                    }
                  />
                </label>
                <label className='block text-sm font-medium sm:col-span-2'>
                  Notes
                  <input
                    className='input mt-2'
                    value={editForm.notes}
                    onChange={(event) =>
                      setEditForm((current) => ({ ...current, notes: event.target.value }))
                    }
                    maxLength='1000'
                  />
                </label>
              </div>
              <div className='space-y-2 rounded-xl border border-gray-200 bg-gray-50 p-3 dark:border-slate-700 dark:bg-slate-900/60'>
                <p className='text-sm font-semibold'>People’s shares</p>
                {editForm.participants.map((participant, index) => (
                  <div key={participant.id || index} className='grid gap-2 sm:grid-cols-2'>
                    <input
                      className='input bg-white dark:bg-slate-800'
                      value={participant.name}
                      onChange={(event) =>
                        setEditForm((current) => ({
                          ...current,
                          participants: current.participants.map((item, itemIndex) =>
                            itemIndex === index ? { ...item, name: event.target.value } : item,
                          ),
                        }))
                      }
                      placeholder='Name'
                    />
                    <input
                      className='input bg-white dark:bg-slate-800'
                      type='number'
                      min='0.01'
                      step='0.01'
                      value={participant.amount}
                      onChange={(event) =>
                        setEditForm((current) => ({
                          ...current,
                          participants: current.participants.map((item, itemIndex) =>
                            itemIndex === index ? { ...item, amount: event.target.value } : item,
                          ),
                        }))
                      }
                      placeholder='Share amount'
                    />
                  </div>
                ))}
                <button type='button' className='text-sm font-medium text-indigo-600 dark:text-indigo-300' onClick={() => setEditForm((current) => ({ ...current, participants: [...current.participants, { name: '', amount: '' }] }))}><Plus size={15} className='mr-1 inline' />Add person</button>
              </div>
            </div>
          )}
        </Modal>
      </main>
    </Layout>
  );
};

export default Repayments;
