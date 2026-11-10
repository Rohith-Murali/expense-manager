import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CalendarDays, Calculator, ChevronDown, CreditCard, Trash2 } from 'lucide-react';
import Icon from '../components/Icon';
import AccountPickerModal from '../components/AccountPickerModal';
import { ACCOUNT_TYPE_ICONS } from '../config/iconRegistry';
import AmountCalculatorModal from '../components/AmountCalculatorModal';
import DateTimePickerModal from '../components/DateTimePickerModal';
import CategoryPickerModal from '../components/CategoryPickerModal';
import SubcategoryPickerModal from '../components/SubcategoryPickerModal';
import PaymentTypePickerModal from '../components/PaymentTypePickerModal';
import accountService from '../services/accountService';
import * as transactionService from '../services/transactionService';
import * as categoryService from '../services/categoryService';
import * as subcategoryService from '../services/subcategoryService';
import * as paymentTypeService from '../services/paymentTypeService';
import CategoryModal from '../components/CategoryModal';
import SubcategoryModal from '../components/SubcategoryModal';
import PaymentTypeModal from '../components/PaymentTypeModal';
import SavingModal from '../components/SavingModal';
import TransactionDeleteModal from '../components/TransactionDeleteModal';
import { validateTransactionForm } from '../utils/validation';
import { getUserFriendlyMessage } from '../utils/errorHandler';
import { logger } from '../utils/logger';
import Layout from '../components/layout/Layout';
import BackButton from '../components/layout/BackButton';

const TransactionDetail = () => {
  const { id, accountId } = useParams();
  const navigate = useNavigate();
  const [transaction, setTransaction] = useState(null);
  const [transactionIdForSave, setTransactionIdForSave] = useState(null); // Store actual ID for saving
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [paymentTypes, setPaymentTypes] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [formAccountId, setFormAccountId] = useState(accountId);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [errors, setErrors] = useState({});
  const [apiErrorMessage, setApiErrorMessage] = useState('');
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showSubcategoryModal, setShowSubcategoryModal] = useState(false);
  const [showPaymentTypeModal, setShowPaymentTypeModal] = useState(false);
  const [showAmountCalculator, setShowAmountCalculator] = useState(false);
  const [showDateTimePicker, setShowDateTimePicker] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showSubcategoryPicker, setShowSubcategoryPicker] = useState(false);
  const [showPaymentTypePicker, setShowPaymentTypePicker] = useState(false);
  const [accountPickerField, setAccountPickerField] = useState('');
  const [subcategoryPickerLoading, setSubcategoryPickerLoading] = useState(false);
  const [subcategoryPickerError, setSubcategoryPickerError] = useState('');
  const [isNew, setIsNew] = useState(false);
  const [suggestionTransactions, setSuggestionTransactions] = useState([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [suggestionError, setSuggestionError] = useState('');
  const [showDescriptionSuggestions, setShowDescriptionSuggestions] = useState(false);
  const suggestionRequestId = useRef(0);
  let transactionType = '';

  const toDateTimeLocal = (value) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    const pad = (part) => String(part).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  };

  const formatDateTimeDisplay = (value) => {
    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? 'Select date and time'
      : date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
  };

  useEffect(() => {
    const requestId = ++suggestionRequestId.current;
    if (id === 'new' || id === 'expense' || id === 'income' || id === 'transfer') {
      setEditing(true);
      transactionType = id == 'new' ? 'expense' : id == 'transfer' ? 'transfer-out' : id;
      setIsNew(true);
      setSuggestionTransactions([]);
      setSuggestionsLoading(false);
      setSuggestionError('');
      setFormData({
        type: transactionType,
        amount: '',
        date: toDateTimeLocal(new Date()),
        description: '',
        categoryId: '',
        subcategoryId: '',
        paymentTypeId: '',
        accountId: accountId,
      });
      setFormAccountId(accountId);
      fetchCategories(transactionType, accountId);
      fetchPaymentTypes(transactionType, accountId);
      fetchAccounts();
      if (transactionType === 'expense' || transactionType === 'income') {
        fetchTransactionSuggestions(requestId);
      }
      setLoading(false);
    } else {
      setIsNew(false);
      setEditing(false);
      setSuggestionTransactions([]);
      setSuggestionsLoading(false);
      setSuggestionError('');
      fetchTransaction();
    }

    return () => {
      suggestionRequestId.current += 1;
    };
  }, [id, accountId]);

  const fetchTransaction = async () => {
    try {
      setLoading(true);
      const data = await transactionService.fetchTransactionDetail(accountId, id);
      setTransaction(data);
      let fd = { ...data };
      let actualTransactionId = id;

      if (data.isCreditCardPurchaseMirror && data.linkedTransaction) {
        fd = { ...data.linkedTransaction };
      }

      if (fd.categoryId && fd.categoryId._id) fd.categoryId = fd.categoryId._id;
      if (fd.subcategoryId && fd.subcategoryId._id) fd.subcategoryId = fd.subcategoryId._id;
      if (fd.paymentTypeId && fd.paymentTypeId._id) fd.paymentTypeId = fd.paymentTypeId._id;
      if (fd.creditCardAccountId && fd.creditCardAccountId._id) {
        fd.creditCardAccountId = fd.creditCardAccountId._id;
      }
      if (!fd.creditCardAccountId) delete fd.creditCardAccountId;

      if (fd.type === 'transfer-in' && fd.linkedTransaction) {
        actualTransactionId = fd.linkedTransaction._id;
        fd = { ...fd.linkedTransaction };
        fd.type = 'transfer-out';
        fd.toAccountId = data.accountId;
      } else if (
        fd.type === 'transfer-out' &&
        !fd.toAccountId &&
        fd.linkedTransaction &&
        fd.linkedTransaction.accountId
      ) {
        fd.toAccountId = fd.linkedTransaction.accountId._id || fd.linkedTransaction.accountId;
      }
      setTransactionIdForSave(actualTransactionId);
      setFormData(fd);
      const currentFormAccountId = fd.accountId?._id || fd.accountId || accountId;
      setFormAccountId(currentFormAccountId);
      fetchAccounts();

      if (!isTransferType(fd.type)) {
        fetchCategories(fd.type, currentFormAccountId);
        fetchPaymentTypes(fd.type, currentFormAccountId);
        if (fd.categoryId) fetchSubcategories(fd.categoryId, currentFormAccountId);
      } else {
        setSubcategories([]);
      }
    } catch (error) {
      logger.error('Error fetching transaction:', error);
      if (error.response?.status === 404) {
        setApiErrorMessage('Transaction not found');
      } else if (error.response?.status === 403) {
        setApiErrorMessage('You do not have permission to view this transaction');
      } else if (error.response?.status === 400) {
        setApiErrorMessage('Invalid transaction');
      } else {
        setApiErrorMessage(getUserFriendlyMessage(error, 'Failed to load transaction'));
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async (type, targetAccountId = formAccountId) => {
    try {
      const data = await transactionService.fetchCategoriesForType(
        categoryService,
        targetAccountId,
        type,
      );
      setCategories(data);
    } catch (error) {
      logger.error('Error fetching categories:', error);
    }
  };

  const fetchAccounts = async () => {
    try {
      const response = await accountService.getAccounts(false);
      setAccounts(response.data || response || []);
    } catch (error) {
      logger.error('Error fetching accounts:', error);
    }
  };

  const fetchPaymentTypes = async (type, targetAccountId = formAccountId) => {
    try {
      const data = await transactionService.fetchPaymentTypesForType(
        paymentTypeService,
        targetAccountId,
        type,
      );
      setPaymentTypes(data);
    } catch (error) {
      logger.error('Error fetching payment types:', error);
    }
  };

  const fetchTransactionSuggestions = async (requestId) => {
    try {
      setSuggestionsLoading(true);
      const data = await transactionService.getTransactions(accountId, { limit: 1000 });
      if (requestId === suggestionRequestId.current) {
        setSuggestionTransactions(Array.isArray(data) ? data : data?.data || []);
      }
    } catch (error) {
      if (requestId === suggestionRequestId.current) {
        logger.error('Error fetching transaction description suggestions:', error);
        setSuggestionError('Could not load transaction suggestions.');
      }
    } finally {
      if (requestId === suggestionRequestId.current) {
        setSuggestionsLoading(false);
      }
    }
  };

  const fetchSubcategories = async (categoryId, targetAccountId = formAccountId) => {
    if (!categoryId) {
      setSubcategories([]);
      return [];
    }

    try {
      const data = await subcategoryService.getSubcategories(targetAccountId, categoryId);
      const entries = data?.data || data || [];
      setSubcategories(entries);
      return entries;
    } catch (error) {
      logger.error('Error fetching subcategories:', error);
      setSubcategories([]);
      return null;
    }
  };

  const handleCategorySelect = async (category) => {
    setFormData((previous) => ({
      ...previous,
      categoryId: category._id,
      subcategoryId: '',
    }));
    setErrors((previous) => ({ ...previous, categoryId: '', subcategoryId: '' }));

    const loadedSubcategories = await fetchSubcategories(category._id, formAccountId);
    if (loadedSubcategories === null) return;

    const noneSubcategory = loadedSubcategories.find(
      (subcategory) => subcategory.name?.trim().toLowerCase() === 'none',
    );
    if (!noneSubcategory) {
      setErrors((previous) => ({
        ...previous,
        subcategoryId: 'The None subcategory is not available for this category.',
      }));
      return;
    }

    setFormData((previous) =>
      String(previous.categoryId?._id || previous.categoryId || '') === String(category._id)
        ? { ...previous, subcategoryId: noneSubcategory._id }
        : previous,
    );
  };

  const openSubcategoryPicker = async () => {
    const categoryId = formData.categoryId?._id || formData.categoryId;
    if (!categoryId) return;
    setShowSubcategoryPicker(true);
    setSubcategoryPickerLoading(true);
    setSubcategoryPickerError('');
    const loaded = await fetchSubcategories(categoryId, formAccountId);
    if (loaded === null) {
      setSubcategoryPickerError('Could not load subcategories. Please try again.');
    }
    setSubcategoryPickerLoading(false);
  };

  const handleCategoryModalClose = () => {
    setShowCategoryModal(false);
  };

  const handleCategoryModalSave = async () => {
    setShowCategoryModal(false);
    await fetchCategories(formData.type, formAccountId);
  };

  const handleSubcategoryModalClose = () => {
    setShowSubcategoryModal(false);
  };

  const handleSubcategoryModalSave = async () => {
    setShowSubcategoryModal(false);
    await fetchSubcategories(formData.categoryId, formAccountId);
  };

  const handlePaymentTypeModalClose = () => {
    setShowPaymentTypeModal(false);
  };

  const handlePaymentTypeModalSave = async () => {
    setShowPaymentTypeModal(false);
    await fetchPaymentTypes(formData.type, formAccountId);
  };

  const handleChange = (field, value) => {
    if (field === 'categoryId') {
      setFormData((prev) => ({ ...prev, categoryId: value, subcategoryId: '' }));
      fetchSubcategories(value, formAccountId);
    } else {
      setFormData((prev) => ({ ...prev, [field]: value }));
    }
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
    if (apiErrorMessage) {
      setApiErrorMessage('');
    }
  };

  const handlePaymentTypeChange = (value) => {
    setFormData((previous) => {
      const updated = { ...previous, paymentTypeId: '' };
      if (value.startsWith('credit-card:')) {
        updated.creditCardAccountId = value.slice('credit-card:'.length);
      } else {
        updated.paymentTypeId = value;
        if (previous.creditCardAccountId) {
          updated.creditCardAccountId = null;
        } else {
          delete updated.creditCardAccountId;
        }
      }
      return updated;
    });
    if (errors.paymentTypeId) {
      setErrors((previous) => ({ ...previous, paymentTypeId: '' }));
    }
    if (apiErrorMessage) setApiErrorMessage('');
  };

  const handleSuggestionSelect = (suggestion) => {
    const categoryId = suggestion.categoryId?._id || suggestion.categoryId || '';
    const subcategoryId = suggestion.subcategoryId?._id || suggestion.subcategoryId || '';
    const paymentTypeId = suggestion.paymentTypeId?._id || suggestion.paymentTypeId || '';
    const creditCardAccountId =
      suggestion.creditCardAccountId?._id || suggestion.creditCardAccountId || '';
    setFormData((prev) => ({
      ...prev,
      description: suggestion.description,
      categoryId,
      subcategoryId,
      paymentTypeId,
      creditCardAccountId: creditCardAccountId || null,
      ...(creditCardAccountId ? { paymentTypeId: '' } : {}),
    }));
    setErrors((prev) => ({ ...prev, categoryId: '', subcategoryId: '', paymentTypeId: '' }));
    if (apiErrorMessage) {
      setApiErrorMessage('');
    }
    fetchSubcategories(categoryId, formAccountId);
    setShowDescriptionSuggestions(false);
  };

  const isTransferType = (type) => ['transfer-out', 'transfer-in'].includes(type);

  const handleTypeChange = (type) => {
    setFormData((prev) => {
      const updated = { ...prev, type };
      const isTransfer = isTransferType(type);
      const wasTransfer = isTransferType(prev.type);

      if (isTransfer && !wasTransfer) {
        updated.categoryId = '';
        updated.subcategoryId = '';
        updated.paymentTypeId = '';
        updated.creditCardAccountId = null;
        if (!updated.accountId) updated.accountId = accountId;
        if (!updated.toAccountId) updated.toAccountId = '';
      } else if (!isTransfer && wasTransfer) {
        updated.toAccountId = '';
      }
      if (type !== 'expense') {
        updated.creditCardAccountId = null;
      }

      return updated;
    });

    if (type === 'expense' || type === 'income') {
      fetchCategories(type, formAccountId);
      fetchPaymentTypes(type, formAccountId);
      if (!formData.categoryId) setSubcategories([]);
    } else if (isTransferType(type)) {
      setSubcategories([]);
      fetchAccounts();
    }
    if (errors.type) {
      setErrors((prev) => ({ ...prev, type: '' }));
    }
  };

  const handleSave = async () => {
    const validationResult = validateTransactionForm(formData, categories, paymentTypes);
    if (validationResult !== null) {
      setErrors(validationResult);
      logger.debug('Transaction form validation failed', validationResult);
      return;
    }

    setErrors({});
    setApiErrorMessage('');

    setIsSaving(true);
    try {
      if (isNew) {
        await transactionService.createTransaction(accountId, formData);
        logger.info('Transaction created successfully');
      } else {
        await transactionService.updateTransaction(accountId, transactionIdForSave || id, formData);
        logger.info('Transaction updated successfully');
      }
      navigate(`/accounts/${accountId}`);
    } catch (error) {
      logger.error('Error saving transaction:', error);
      setApiErrorMessage(
        getUserFriendlyMessage(error, 'Failed to save transaction. Please try again.'),
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await transactionService.deleteTransaction(accountId, transactionIdForSave || id);
      logger.info('Transaction deleted successfully');
      navigate(`/accounts/${accountId}`);
    } catch (error) {
      logger.error('Error deleting transaction:', error);
      setApiErrorMessage(
        getUserFriendlyMessage(error, 'Failed to delete transaction. Please try again.'),
      );
      setShowDeleteModal(false);
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading) {
    return <div className='text-center text-gray-500 py-8'>Loading...</div>;
  }

  if (apiErrorMessage && !formData.type) {
    return (
      <div className='min-h-screen p-6 bg-gray-50 text-gray-800'>
        <div className='flex items-center gap-3 mb-6'>
          <BackButton fallback={`/accounts/${accountId}`} />
          <h1 className='text-xl font-semibold'>Transaction Details</h1>
        </div>
        <div className='max-w-xl mx-auto bg-white p-6 rounded shadow'>
          <div className='p-4 bg-red-50 border border-red-200 rounded-lg'>
            <p className='text-danger font-medium'>{apiErrorMessage}</p>
          </div>
        </div>
      </div>
    );
  }

  const isTransfer = isTransferType(formData.type);
  const descriptionQuery = (formData.description || '').trim().toLowerCase();
  const selectedCategory = categories.find(
    (category) =>
      String(category._id) === String(formData.categoryId?._id || formData.categoryId || ''),
  );
  const selectedSubcategory = subcategories.find(
    (subcategory) =>
      String(subcategory._id) ===
      String(formData.subcategoryId?._id || formData.subcategoryId || ''),
  );
  const selectedPaymentType = paymentTypes.find(
    (paymentType) =>
      String(paymentType._id) ===
      String(formData.paymentTypeId?._id || formData.paymentTypeId || ''),
  );
  const selectedCreditCard = accounts.find(
    (account) =>
      String(account._id) ===
      String(formData.creditCardAccountId?._id || formData.creditCardAccountId || ''),
  );
  const selectedSourceAccount = accounts.find(
    (account) =>
      String(account._id) === String(formData.accountId?._id || formData.accountId || ''),
  );
  const selectedDestinationAccount = accounts.find(
    (account) =>
      String(account._id) === String(formData.toAccountId?._id || formData.toAccountId || ''),
  );
  const availableCategoryIds = new Set(categories.map((category) => category._id));
  const availablePaymentTypeIds = new Set(paymentTypes.map((paymentType) => paymentType._id));
  const availableCreditCardIds = new Set(
    accounts.filter((account) => account.type === 'CREDIT_CARD').map((account) => account._id),
  );
  const seenDescriptions = new Set();
  const descriptionSuggestions =
    isNew && !isTransfer && descriptionQuery
      ? [...suggestionTransactions]
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
          .filter((candidate) => {
            const description = candidate.description?.trim();
            const categoryId = candidate.categoryId?._id || candidate.categoryId;
            const paymentTypeId = candidate.paymentTypeId?._id || candidate.paymentTypeId;
            const creditCardAccountId =
              candidate.creditCardAccountId?._id || candidate.creditCardAccountId;
            const normalizedDescription = description?.toLowerCase();
            if (
              candidate.type !== formData.type ||
              !normalizedDescription?.includes(descriptionQuery) ||
              !categoryId ||
              (!paymentTypeId && !creditCardAccountId) ||
              !availableCategoryIds.has(categoryId) ||
              (paymentTypeId && !availablePaymentTypeIds.has(paymentTypeId)) ||
              (creditCardAccountId && !availableCreditCardIds.has(creditCardAccountId)) ||
              seenDescriptions.has(normalizedDescription)
            ) {
              return false;
            }
            seenDescriptions.add(normalizedDescription);
            return true;
          })
          .slice(0, 5)
      : [];

  return (
    <Layout>
      <div className='min-h-screen p-4 text-gray-800 dark:text-gray-100 sm:p-6'>
        <div className='mx-auto w-full max-w-3xl'>
          <header className='mb-6 flex items-center gap-3'>
            <div>
              <h1 className='truncate text-2xl font-semibold'>
                {isNew ? 'New Transaction' : 'Transaction Details'}
              </h1>
              <p className='mt-1 text-sm text-gray-500 dark:text-gray-400'>
                {isNew ? 'Add the details for this transaction.' : 'Review and update transaction details.'}
              </p>
            </div>
          </header>

          <div className='rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800 sm:p-7'>
            {apiErrorMessage && (
              <div className='mb-5 rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-900 dark:bg-red-950/40'>
                <p className='text-danger text-sm'>{apiErrorMessage}</p>
              </div>
            )}
            <section className='mb-6'>
              <div className='grid grid-cols-3 gap-2 rounded-xl bg-gray-100 p-1 dark:bg-slate-900'>
                <button
                  type='button'
                  className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${formData.type === 'expense' ? 'bg-white text-red-600 shadow-sm dark:bg-slate-700 dark:text-red-300' : 'text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white'}`}
                  onClick={() => handleTypeChange('expense')}
                  disabled={!editing}
                >
                  Expense
                </button>
                <button
                  type='button'
                  className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${formData.type === 'income' ? 'bg-white text-green-600 shadow-sm dark:bg-slate-700 dark:text-green-300' : 'text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white'}`}
                  onClick={() => handleTypeChange('income')}
                  disabled={!editing}
                >
                  Income
                </button>
                <button
                  type='button'
                  className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${isTransfer ? 'bg-white text-indigo-600 shadow-sm dark:bg-slate-700 dark:text-indigo-300' : 'text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white'}`}
                  onClick={() => handleTypeChange('transfer-out')}
                  disabled={!editing}
                >
                  Transfer
                </button>
              </div>
            </section>

            <div className='mb-6 grid gap-4 sm:grid-cols-2'>
              <div>
                <label className='mb-2 block text-sm font-semibold'>Amount</label>
                <button
                  type='button'
                  disabled={!editing}
                  onClick={() => setShowAmountCalculator(true)}
                  aria-label='Calculate transaction amount'
                  aria-invalid={Boolean(errors.amount)}
                  className={`flex min-h-14 w-full items-center justify-between rounded-xl border bg-gray-50 px-4 py-3 text-left transition hover:border-indigo-400 disabled:cursor-not-allowed disabled:opacity-70 dark:border-slate-600 dark:bg-slate-900 dark:hover:border-indigo-400 ${errors.amount ? 'border-red-500 dark:border-red-500' : 'border-gray-200'}`}
                >
                  <span className='flex items-center gap-2'>
                    <span className='text-lg text-gray-500 dark:text-gray-400'>₹</span>
                    <span className='text-xl font-semibold tabular-nums'>
                      {formData.amount === '' || formData.amount == null ? '0.00' : formData.amount}
                    </span>
                  </span>
                  <Calculator size={18} className='text-gray-400' />
                </button>
                {errors.amount && <p className='mt-1 text-sm text-red-500'>{errors.amount}</p>}
              </div>
              <div>
                <label className='mb-2 block text-sm font-semibold'>Date and time</label>
                <button
                  type='button'
                  disabled={!editing}
                  onClick={() => setShowDateTimePicker(true)}
                  aria-invalid={Boolean(errors.date)}
                  className={`flex min-h-14 w-full items-center justify-between rounded-xl border bg-gray-50 px-4 py-3 text-left transition hover:border-indigo-400 disabled:cursor-not-allowed disabled:opacity-70 dark:border-slate-600 dark:bg-slate-900 dark:hover:border-indigo-400 ${errors.date ? 'border-red-500 dark:border-red-500' : 'border-gray-200'}`}
                >
                  <span>{formatDateTimeDisplay(formData.date)}</span>
                  <CalendarDays size={18} className='text-gray-400' />
                </button>
                {errors.date && <p className='mt-1 text-sm text-red-500'>{errors.date}</p>}
              </div>
            </div>

            {isTransfer && (
              <section className='mb-6'>
                <h2 className='mb-3 text-sm font-semibold'>Transfer accounts</h2>
                <div className='grid grid-cols-2 gap-3'>
                  <div className='min-w-0'>
                    <label className='mb-2 block text-sm font-medium'>From account *</label>
                    <button
                      type='button'
                      disabled={!editing}
                      onClick={() => setAccountPickerField('accountId')}
                      aria-invalid={Boolean(errors.accountId)}
                      className={`flex min-h-[4.25rem] w-full items-center gap-2 rounded-xl border bg-gray-50 px-3 py-2 text-left transition hover:border-indigo-400 disabled:cursor-not-allowed disabled:opacity-70 dark:border-slate-600 dark:bg-slate-900 dark:hover:border-indigo-400 ${errors.accountId ? 'border-red-500 dark:border-red-500' : 'border-gray-200'}`}
                    >
                      <span
                        className='flex h-9 w-9 shrink-0 items-center justify-center rounded-lg'
                        style={{
                          color: selectedSourceAccount?.color || '#4f46e5',
                          backgroundColor: `${selectedSourceAccount?.color || '#4f46e5'}22`,
                        }}
                      >
                        <Icon
                          name={
                            selectedSourceAccount?.icon ||
                            ACCOUNT_TYPE_ICONS[selectedSourceAccount?.type]
                          }
                          size={19}
                        />
                      </span>
                      <span className='min-w-0 flex-1 truncate text-sm font-medium'>
                        {selectedSourceAccount?.name || 'Select source'}
                      </span>
                      <ChevronDown size={16} className='shrink-0 text-gray-400' />
                    </button>
                    {errors.accountId && <p className='mt-1 text-sm text-red-500'>{errors.accountId}</p>}
                  </div>
                  <div className='min-w-0'>
                    <label className='mb-2 block text-sm font-medium'>To account *</label>
                    <button
                      type='button'
                      disabled={!editing}
                      onClick={() => setAccountPickerField('toAccountId')}
                      aria-invalid={Boolean(errors.toAccountId)}
                      className={`flex min-h-[4.25rem] w-full items-center gap-2 rounded-xl border bg-gray-50 px-3 py-2 text-left transition hover:border-indigo-400 disabled:cursor-not-allowed disabled:opacity-70 dark:border-slate-600 dark:bg-slate-900 dark:hover:border-indigo-400 ${errors.toAccountId ? 'border-red-500 dark:border-red-500' : 'border-gray-200'}`}
                    >
                      <span
                        className='flex h-9 w-9 shrink-0 items-center justify-center rounded-lg'
                        style={{
                          color: selectedDestinationAccount?.color || '#4f46e5',
                          backgroundColor: `${selectedDestinationAccount?.color || '#4f46e5'}22`,
                        }}
                      >
                        <Icon
                          name={
                            selectedDestinationAccount?.icon ||
                            ACCOUNT_TYPE_ICONS[selectedDestinationAccount?.type]
                          }
                          size={19}
                        />
                      </span>
                      <span className='min-w-0 flex-1 truncate text-sm font-medium'>
                        {selectedDestinationAccount?.name || 'Select destination'}
                      </span>
                      <ChevronDown size={16} className='shrink-0 text-gray-400' />
                    </button>
                    {errors.toAccountId && <p className='mt-1 text-sm text-red-500'>{errors.toAccountId}</p>}
                  </div>
                </div>
              </section>
            )}

            {!isTransfer && (
              <>
                <section className='mb-6'>
                  <div className='grid grid-cols-2 gap-3'>
                    <div className='min-w-0'>
                      <label className='mb-2 block text-sm font-medium'>Category</label>
                      <button
                        type='button'
                        disabled={!editing}
                        onClick={() => setShowCategoryPicker(true)}
                        aria-invalid={Boolean(errors.categoryId)}
                        className={`flex min-h-[4.25rem] w-full items-center gap-2 rounded-xl border bg-gray-50 px-3 py-2 text-left transition hover:border-indigo-400 disabled:cursor-not-allowed disabled:opacity-70 dark:border-slate-600 dark:bg-slate-900 dark:hover:border-indigo-400 ${errors.categoryId ? 'border-red-500 dark:border-red-500' : 'border-gray-200'}`}
                      >
                        <span className='flex h-9 w-9 shrink-0 items-center justify-center rounded-lg' style={{ color: selectedCategory?.color || '#4f46e5', backgroundColor: `${selectedCategory?.color || '#4f46e5'}22` }}>
                          <Icon name={selectedCategory?.icon || formData.categoryId?.icon} size={19} />
                        </span>
                        <span className='min-w-0 flex-1 truncate text-sm font-medium'>
                          {selectedCategory?.name || 'Select category'}
                        </span>
                        <ChevronDown size={16} className='shrink-0 text-gray-400' />
                      </button>
                      {errors.categoryId && <p className='mt-1 text-sm text-red-500'>{errors.categoryId}</p>}
                    </div>
                    <div className='min-w-0'>
                      <label className='mb-2 block text-sm font-medium'>Subcategory</label>
                      <button
                        type='button'
                        disabled={!editing || !formData.categoryId}
                        onClick={openSubcategoryPicker}
                        aria-invalid={Boolean(errors.subcategoryId)}
                        className={`flex min-h-[4.25rem] w-full items-center gap-2 rounded-xl border bg-gray-50 px-3 py-2 text-left transition hover:border-indigo-400 disabled:cursor-not-allowed disabled:opacity-70 dark:border-slate-600 dark:bg-slate-900 dark:hover:border-indigo-400 ${errors.subcategoryId ? 'border-red-500 dark:border-red-500' : 'border-gray-200'}`}
                      >
                        <span className='flex h-9 w-9 shrink-0 items-center justify-center rounded-lg' style={{ color: selectedSubcategory?.color || selectedCategory?.color || '#4f46e5', backgroundColor: `${selectedSubcategory?.color || selectedCategory?.color || '#4f46e5'}22` }}>
                          <Icon name={selectedSubcategory?.icon || formData.subcategoryId?.icon} size={19} />
                        </span>
                        <span className='min-w-0 flex-1 truncate text-sm font-medium'>
                          {selectedSubcategory?.name || 'Select subcategory'}
                        </span>
                        <ChevronDown size={16} className='shrink-0 text-gray-400' />
                      </button>
                      {errors.subcategoryId && <p className='mt-1 text-sm text-red-500'>{errors.subcategoryId}</p>}
                    </div>
                  </div>
                </section>

                <div className='mb-6'>
                  <label className='mb-2 block text-sm font-semibold'>Payment type</label>
                  <button
                    type='button'
                    disabled={!editing}
                    onClick={() => setShowPaymentTypePicker(true)}
                    aria-invalid={Boolean(errors.paymentTypeId)}
                    className={`flex min-h-14 w-full items-center gap-3 rounded-xl border bg-gray-50 px-4 py-3 text-left transition hover:border-indigo-400 disabled:cursor-not-allowed disabled:opacity-70 dark:border-slate-600 dark:bg-slate-900 dark:hover:border-indigo-400 ${errors.paymentTypeId ? 'border-red-500 dark:border-red-500' : 'border-gray-200'}`}
                  >
                    <span
                      className='flex h-10 w-10 shrink-0 items-center justify-center rounded'
                      style={{
                        color: selectedCreditCard?.color || selectedPaymentType?.color || '#4f46e5',
                        backgroundColor: `${selectedCreditCard?.color || selectedPaymentType?.color || '#4f46e5'}22`,
                      }}
                    >
                      <Icon name={selectedCreditCard?.icon || selectedPaymentType?.icon || 'card'} size={20} />
                    </span>
                    <span className='flex-1 font-medium'>
                      {selectedCreditCard?.name || selectedPaymentType?.name || 'Select payment type'}
                    </span>
                    <CreditCard size={18} className='text-gray-400' />
                  </button>
                  {errors.paymentTypeId && (
                    <p className='error-message text-red-500 text-sm mt-1'>
                      {errors.paymentTypeId}
                    </p>
                  )}
                </div>
              </>
            )}
            <div
              className='relative mb-6'
              onBlur={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget)) {
                  setShowDescriptionSuggestions(false);
                }
              }}
            >
              <label className='mb-2 block text-sm font-semibold'>Description</label>
              <input
                value={formData.description || ''}
                onChange={(e) => {
                  handleChange('description', e.target.value);
                  setShowDescriptionSuggestions(true);
                }}
                onFocus={() => setShowDescriptionSuggestions(true)}
                disabled={!editing}
                placeholder='Add a description...'
                className='w-full rounded-xl border border-gray-200 bg-white px-3 py-3 text-gray-900 placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:bg-gray-50 dark:border-slate-600 dark:bg-slate-900 dark:text-gray-100 dark:placeholder:text-gray-500 dark:disabled:bg-slate-800'
                role='combobox'
                aria-autocomplete='list'
                aria-expanded={showDescriptionSuggestions && Boolean(descriptionQuery)}
                aria-controls={
                  showDescriptionSuggestions && descriptionQuery
                    ? 'transaction-description-suggestions'
                    : undefined
                }
              />
              {isNew && !isTransfer && suggestionError && (
                <p className='mt-1 text-sm text-red-600 dark:text-red-400'>{suggestionError}</p>
              )}
              {isNew && !isTransfer && showDescriptionSuggestions && descriptionQuery && (
                <div
                  id='transaction-description-suggestions'
                className='absolute left-0 right-0 top-full z-30 mt-1 max-h-64 overflow-y-auto rounded-xl border border-gray-200 bg-white text-gray-900 shadow-lg dark:border-slate-700 dark:bg-slate-800 dark:text-gray-100'
                  role='listbox'
                  aria-label='Suggested transactions'
                >
                  <p className='px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400'>
                    Suggested transactions
                  </p>
                  {suggestionsLoading ? (
                    <p className='border-t border-gray-200 px-3 py-2 text-sm text-gray-500 dark:border-slate-700 dark:text-gray-400'>
                      Loading suggestions...
                    </p>
                  ) : suggestionError ? (
                    <p className='border-t border-gray-200 px-3 py-2 text-sm text-gray-500 dark:border-slate-700 dark:text-gray-400'>
                      Suggestions are unavailable.
                    </p>
                  ) : descriptionSuggestions.length ? (
                    descriptionSuggestions.map((suggestion) => (
                      <button
                        key={suggestion._id}
                        type='button'
                        role='option'
                        aria-selected='false'
                        className='block w-full border-t border-gray-200 px-3 py-2 text-left hover:bg-gray-50 dark:border-slate-700 dark:hover:bg-slate-700'
                        onClick={() => handleSuggestionSelect(suggestion)}
                      >
                        <span className='block text-sm font-medium'>{suggestion.description}</span>
                        <span className='block text-xs text-gray-500 dark:text-gray-400'>
                          {suggestion.categoryId?.name || 'Category'}
                          {suggestion.subcategoryId?.name &&
                            ` · ${suggestion.subcategoryId.name}`}{' '}
                          ·{' '}
                          {suggestion.creditCardAccountId?.name ||
                            suggestion.paymentTypeId?.name ||
                            'Payment mode'}
                        </span>
                      </button>
                    ))
                  ) : (
                    <p className='border-t border-gray-200 px-3 py-2 text-sm text-gray-500 dark:border-slate-700 dark:text-gray-400'>
                      No matching transactions
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className='mb-6'>
              <label className='mb-2 block text-sm font-semibold'>Notes</label>
              <input
                value={formData.notes || ''}
                onChange={(e) => handleChange('notes', e.target.value)}
                disabled={!editing}
                placeholder='Add notes...'
                className='w-full rounded-xl border border-gray-200 bg-white px-3 py-3 text-gray-900 placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:bg-gray-50 dark:border-slate-600 dark:bg-slate-900 dark:text-gray-100 dark:placeholder:text-gray-500 dark:disabled:bg-slate-800'
              />
            </div>

            <div className='flex flex-col-reverse gap-3 border-t border-gray-200 pt-5 dark:border-slate-700 sm:flex-row sm:justify-end'>
              {isNew ? (
                <>
                  <button type='button' onClick={() => navigate(`/accounts/${accountId}`)} disabled={isSaving} className='rounded-xl border border-gray-300 px-5 py-3 font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-slate-600 dark:text-gray-200 dark:hover:bg-slate-700'>
                    Cancel
                  </button>
                  <button type='button' onClick={handleSave} disabled={loading || isSaving} className='rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white hover:bg-indigo-700 disabled:opacity-50'>
                    {isSaving ? 'Saving...' : 'Save transaction'}
                  </button>
                </>
              ) : editing ? (
                <>
                  <button type='button' onClick={() => setEditing(false)} disabled={isSaving} className='rounded-xl border border-gray-300 px-5 py-3 font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-slate-600 dark:text-gray-200 dark:hover:bg-slate-700'>
                    Cancel
                  </button>
                  <button type='button' onClick={handleSave} disabled={loading || isSaving} className='rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white hover:bg-indigo-700 disabled:opacity-50'>
                    {isSaving ? 'Saving...' : 'Save changes'}
                  </button>
                </>
              ) : (
                <>
                  <button type='button' onClick={() => setShowDeleteModal(true)} disabled={isDeleting} className='inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 px-5 py-3 font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950/40'>
                    <Trash2 size={17} /> Delete
                  </button>
                  <button type='button' onClick={() => setEditing(true)} className='rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white hover:bg-indigo-700'>
                    Edit transaction
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {showAmountCalculator && (
          <AmountCalculatorModal
            initialValue={formData.amount}
            onApply={(amount) => {
              handleChange('amount', amount);
              setShowAmountCalculator(false);
            }}
            onClose={() => setShowAmountCalculator(false)}
          />
        )}
        {showDateTimePicker && (
          <DateTimePickerModal
            initialValue={formData.date}
            onApply={(date) => {
              handleChange('date', date);
              setShowDateTimePicker(false);
            }}
            onClose={() => setShowDateTimePicker(false)}
          />
        )}
        {showCategoryPicker && (
          <CategoryPickerModal
            categories={categories}
            selectedId={formData.categoryId?._id || formData.categoryId}
            onSelect={handleCategorySelect}
            onAdd={() => setShowCategoryModal(true)}
            onClose={() => setShowCategoryPicker(false)}
          />
        )}
        {showSubcategoryPicker && (
          <SubcategoryPickerModal
            category={selectedCategory}
            subcategories={subcategories}
            selectedId={formData.subcategoryId?._id || formData.subcategoryId}
            loading={subcategoryPickerLoading}
            error={subcategoryPickerError}
            onSelect={(subcategory) => handleChange('subcategoryId', subcategory._id)}
            onAdd={() => setShowSubcategoryModal(true)}
            onClose={() => setShowSubcategoryPicker(false)}
          />
        )}
        {showPaymentTypePicker && (
          <PaymentTypePickerModal
            paymentTypes={paymentTypes}
            creditCards={
              formData.type === 'expense' &&
              accounts.find((account) => String(account._id) === String(formAccountId))?.type !==
                'CREDIT_CARD'
                ? accounts.filter(
                    (account) =>
                      account.type === 'CREDIT_CARD' &&
                      String(account._id) !== String(formAccountId),
                  )
                : []
            }
            selectedValue={
              formData.creditCardAccountId
                ? `credit-card:${formData.creditCardAccountId?._id || formData.creditCardAccountId}`
                : formData.paymentTypeId?._id || formData.paymentTypeId || ''
            }
            onSelect={handlePaymentTypeChange}
            onAddPaymentType={() => setShowPaymentTypeModal(true)}
            onClose={() => setShowPaymentTypePicker(false)}
          />
        )}
        {accountPickerField && (
          <AccountPickerModal
            title={accountPickerField === 'accountId' ? 'Select source account' : 'Select destination account'}
            accounts={
              accounts
                .filter((account) => account.type !== 'CREDIT_CARD')
                .filter(
                  (account) =>
                    accountPickerField !== 'toAccountId' ||
                    String(account._id) !==
                      String(formData.accountId?._id || formData.accountId || accountId),
                )
            }
            selectedId={
              accountPickerField === 'accountId'
                ? formData.accountId?._id || formData.accountId
                : formData.toAccountId?._id || formData.toAccountId
            }
            onSelect={(value) => handleChange(accountPickerField, value)}
            onClose={() => setAccountPickerField('')}
          />
        )}
        {showCategoryModal && (
          <CategoryModal
            accountId={formAccountId}
            type={formData.type}
            onClose={handleCategoryModalClose}
            onSave={handleCategoryModalSave}
          />
        )}

        {showSubcategoryModal && (
          <SubcategoryModal
            accountId={formAccountId}
            category={categories.find(
              (category) => category._id === (formData.categoryId?._id || formData.categoryId),
            )}
            onClose={handleSubcategoryModalClose}
            onSave={handleSubcategoryModalSave}
          />
        )}

        {showPaymentTypeModal && (
          <PaymentTypeModal
            accountId={formAccountId}
            type={formData.type}
            onClose={handlePaymentTypeModalClose}
            onSave={handlePaymentTypeModalSave}
          />
        )}
        {isSaving && <SavingModal />}
        <TransactionDeleteModal
          isOpen={showDeleteModal}
          isDeleting={isDeleting}
          onCancel={() => setShowDeleteModal(false)}
          onConfirm={handleDelete}
        />
      </div>
    </Layout>
  );
};

export default TransactionDetail;
