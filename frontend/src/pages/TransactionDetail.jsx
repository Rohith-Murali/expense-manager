import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Edit2, Trash2, Save, X, Plus } from 'lucide-react';
import accountService from '../services/accountService';
import * as transactionService from '../services/transactionService';
import * as categoryService from '../services/categoryService';
import * as paymentTypeService from '../services/paymentTypeService';
import CategoryModal from '../components/CategoryModal';
import PaymentTypeModal from '../components/PaymentTypeModal';
import SavingModal from '../components/SavingModal';
import { validateTransactionForm } from '../utils/validation';
import { getUserFriendlyMessage } from '../utils/errorHandler';
import { logger } from '../utils/logger';

const TransactionDetail = () => {
  const { id, accountId } = useParams();
  const navigate = useNavigate();
  const [transaction, setTransaction] = useState(null);
  const [transactionIdForSave, setTransactionIdForSave] = useState(null); // Store actual ID for saving
  const [categories, setCategories] = useState([]);
  const [paymentTypes, setPaymentTypes] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [apiErrorMessage, setApiErrorMessage] = useState('');
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showPaymentTypeModal, setShowPaymentTypeModal] = useState(false);
  const [isNew, setIsNew] = useState(false);
  let transactionType = '';

  useEffect(() => {
    if (id === 'new' || id === 'expense' || id === 'income' || id === 'transfer') {
      setEditing(true);
      transactionType = id == 'new' ? 'expense' : id == 'transfer' ? 'transfer-out' : id;
      setIsNew(true);
      setFormData({
        type: transactionType,
        amount: '',
        date: new Date().toISOString().split('T')[0],
        description: '',
        categoryId: '',
        paymentTypeId: '',
        accountId: accountId,
      });
      fetchCategories(transactionType);
      fetchPaymentTypes(transactionType);
      fetchAccounts();
      setLoading(false);
    } else {
      fetchTransaction();
    }
  }, [id, accountId]);

  const fetchTransaction = async () => {
    try {
      setLoading(true);
      const data = await transactionService.fetchTransactionDetail(accountId, id);
      setTransaction(data);
      let fd = { ...data };
      let actualTransactionId = id;

      if (fd.categoryId && fd.categoryId._id) fd.categoryId = fd.categoryId._id;
      if (fd.paymentTypeId && fd.paymentTypeId._id) fd.paymentTypeId = fd.paymentTypeId._id;

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

      if (!isTransferType(fd.type)) {
        fetchCategories(fd.type);
        fetchPaymentTypes(fd.type);
      } else {
        fetchAccounts();
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

  const fetchCategories = async (type) => {
    try {
      const data = await transactionService.fetchCategoriesForType(
        categoryService,
        accountId,
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

  const fetchPaymentTypes = async (type) => {
    try {
      const data = await transactionService.fetchPaymentTypesForType(
        paymentTypeService,
        accountId,
        type,
      );
      setPaymentTypes(data);
    } catch (error) {
      logger.error('Error fetching payment types:', error);
    }
  };

  const handleCategoryModalClose = () => {
    setShowCategoryModal(false);
  };

  const handleCategoryModalSave = async () => {
    setShowCategoryModal(false);
    await fetchCategories(formData.type);
  };

  const handlePaymentTypeModalClose = () => {
    setShowPaymentTypeModal(false);
  };

  const handlePaymentTypeModalSave = async () => {
    setShowPaymentTypeModal(false);
    await fetchPaymentTypes(formData.type);
  };

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
    if (apiErrorMessage) {
      setApiErrorMessage('');
    }
  };

  const isTransferType = (type) => ['transfer-out', 'transfer-in'].includes(type);

  const handleTypeChange = (type) => {
    setFormData((prev) => {
      const updated = { ...prev, type };
      const isTransfer = isTransferType(type);
      const wasTransfer = isTransferType(prev.type);

      if (isTransfer && !wasTransfer) {
        updated.categoryId = '';
        updated.paymentTypeId = '';
        if (!updated.accountId) updated.accountId = accountId;
        if (!updated.toAccountId) updated.toAccountId = '';
      } else if (!isTransfer && wasTransfer) {
        updated.toAccountId = '';
      }

      return updated;
    });

    if (type === 'expense' || type === 'income') {
      fetchCategories(type);
      fetchPaymentTypes(type);
    } else if (isTransferType(type)) {
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
    if (window.confirm('Are you sure you want to delete this transaction?')) {
      try {
        await transactionService.deleteTransaction(accountId, transactionIdForSave || id);
        logger.info('Transaction deleted successfully');
        navigate(`/accounts/${accountId}`);
      } catch (error) {
        logger.error('Error deleting transaction:', error);
        setApiErrorMessage(
          getUserFriendlyMessage(error, 'Failed to delete transaction. Please try again.'),
        );
      }
    }
  };

  if (loading) {
    return <div className='text-center text-gray-500 py-8'>Loading...</div>;
  }

  if (apiErrorMessage && !formData.type) {
    return (
      <div className='min-h-screen p-6 bg-gray-50 text-gray-800'>
        <div className='flex items-center gap-3 mb-6'>
          <button className='p-2 rounded-md hover:bg-gray-100' onClick={() => navigate(-1)}>
            <ArrowLeft size={20} />
          </button>
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

  return (
    <div className='min-h-screen p-6 bg-gray-50 text-gray-800'>
      <div className='max-w-xl mx-auto'>
        <header className='flex items-center justify-between mb-6'>
          <div className='flex items-center gap-3'>
            <button className='p-2 rounded-md hover:bg-gray-100' onClick={() => navigate(-1)}>
              <ArrowLeft size={20} />
            </button>
            <h1 className='text-xl font-semibold'>
              {isNew ? 'New Transaction' : 'Transaction Details'}
            </h1>
          </div>
        </header>

        <div className='bg-white p-6 rounded shadow'>
        {apiErrorMessage && (
          <div className='mb-4 p-3 bg-red-50 border border-red-200 rounded-lg'>
            <p className='text-danger text-sm'>{apiErrorMessage}</p>
          </div>
        )}
        <label className='block text-sm font-medium mb-2'>Type</label>
        <div className='flex justify-between gap-10 mb-4'>
          <div className='flex gap-2'>
            <button
              className={`px-3 py-1 rounded ${formData.type === 'expense' ? 'bg-red-50 text-red-600' : 'bg-gray-100 text-gray-700'}`}
              onClick={() => handleTypeChange('expense')}
              disabled={!editing}
            >
              Expense
            </button>
            <button
              className={`px-3 py-1 rounded ${formData.type === 'income' ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-700'}`}
              onClick={() => handleTypeChange('income')}
              disabled={!editing}
            >
              Income
            </button>
            <button
              className={`px-3 py-1 rounded ${isTransfer ? 'bg-indigo-50 text-indigo-600' : 'bg-gray-100 text-gray-700'}`}
              onClick={() => handleTypeChange('transfer-out')}
              disabled={!editing}
            >
              Transfer
            </button>
          </div>
          <div className='flex items-center gap-2'>
            {!editing && id !== 'new' && (
              <>
                <button
                  className='p-2 rounded-md hover:bg-gray-100'
                  onClick={() => setEditing(true)}
                >
                  <Edit2 size={20} />
                </button>
                <button
                  className='p-2 rounded-md hover:bg-red-100 text-red-600'
                  onClick={handleDelete}
                >
                  <Trash2 size={20} />
                </button>
              </>
            )}
            {editing && (
              <>
                <button
                  className='p-2 rounded-md hover:bg-gray-100'
                  onClick={() => setEditing(false)}
                >
                  <X size={20} />
                </button>
                <button
                  className='p-2 rounded-md bg-green-600 text-white hover:bg-green-700'
                  onClick={handleSave}
                  disabled={isSaving}
                >
                  <Save size={18} />
                </button>
              </>
            )}
          </div>
        </div>

        <div className='mb-4'>
          <label className='block text-sm font-medium mb-2'>Amount *</label>
          <div className='relative'>
            <span className='absolute left-3 top-1/2 -translate-y-1/2 text-gray-500'>₹</span>
            <input
              type='number'
              value={formData.amount}
              onChange={(e) => handleChange('amount', e.target.value)}
              disabled={!editing}
              placeholder='0.00'
              step='0.01'
              className={`w-full pl-8 border rounded px-3 py-2 ${errors.amount ? 'border-red-500' : ''}`}
            />
          </div>
          {errors.amount && (
            <p className='error-message text-red-500 text-sm mt-1'>{errors.amount}</p>
          )}
        </div>

        <div className='mb-4'>
          <label className='block text-sm font-medium mb-2'>Date *</label>
          <input
            type='date'
            value={formData.date?.split('T')[0]}
            onChange={(e) => handleChange('date', e.target.value)}
            disabled={!editing}
            className={`w-full border rounded px-3 py-2 ${errors.date ? 'border-red-500' : ''}`}
          />
          {errors.date && <p className='error-message text-red-500 text-sm mt-1'>{errors.date}</p>}
        </div>

        {isTransfer && (
          <>
            <div className='mb-4'>
              <label className='block text-sm font-medium mb-2'>From Account *</label>
              <select
                value={formData.accountId || ''}
                onChange={(e) => handleChange('accountId', e.target.value)}
                disabled={!editing}
                className='w-full border rounded px-3 py-2'
              >
                <option value=''>Select source account</option>
                {accounts.map((acc) => (
                  <option key={acc._id} value={acc._id}>
                    {acc.name} {acc.currency ? `(${acc.currency})` : ''}{' '}
                    {typeof acc.currentBalance !== 'undefined' ? ` - ₹${acc.currentBalance}` : ''}
                  </option>
                ))}
              </select>
              {errors.accountId && (
                <p className='error-message text-red-500 text-sm mt-1'>{errors.accountId}</p>
              )}
            </div>
            <div className='mb-4'>
              <label className='block text-sm font-medium mb-2'>To Account *</label>
              <select
                value={formData.toAccountId || ''}
                onChange={(e) => handleChange('toAccountId', e.target.value)}
                disabled={!editing}
                className={`w-full border rounded px-3 py-2 ${errors.toAccountId ? 'border-red-500' : ''}`}
              >
                <option value=''>Select destination account</option>
                {accounts
                  .filter((acc) => acc._id !== (formData.accountId || accountId))
                  .map((acc) => (
                    <option key={acc._id} value={acc._id}>
                      {acc.name} {acc.currency ? `(${acc.currency})` : ''}{' '}
                      {typeof acc.currentBalance !== 'undefined' ? ` - ₹${acc.currentBalance}` : ''}
                    </option>
                  ))}
              </select>
              {errors.toAccountId && (
                <p className='error-message text-red-500 text-sm mt-1'>{errors.toAccountId}</p>
              )}
            </div>
          </>
        )}

        {!isTransfer && (
          <>
            <div className='mb-4'>
              <label className='block text-sm font-medium mb-2'>Category *</label>
              <div className='flex gap-2'>
                <select
                  value={formData.categoryId?._id || formData.categoryId}
                  onChange={(e) => handleChange('categoryId', e.target.value)}
                  disabled={!editing}
                  className={`flex-1 border rounded px-3 py-2 ${errors.categoryId ? 'border-red-500' : ''}`}
                >
                  <option value=''>Select Category</option>
                  {categories.map((cat) => (
                    <option key={cat._id} value={cat._id}>
                      {cat.icon} {cat.name}
                    </option>
                  ))}
                </select>
                {editing && (
                  <button
                    type='button'
                    className='p-2 rounded border hover:bg-gray-50 text-indigo-600'
                    onClick={() => setShowCategoryModal(true)}
                    title='Add new category'
                  >
                    <Plus size={20} />
                  </button>
                )}
              </div>
              {errors.categoryId && (
                <p className='error-message text-red-500 text-sm mt-1'>{errors.categoryId}</p>
              )}
            </div>

            <div className='mb-4'>
              <label className='block text-sm font-medium mb-2'>Payment Type *</label>
              <div className='flex gap-2'>
                <select
                  value={formData.paymentTypeId?._id || formData.paymentTypeId}
                  onChange={(e) => handleChange('paymentTypeId', e.target.value)}
                  disabled={!editing}
                  className={`flex-1 border rounded px-3 py-2 ${errors.paymentTypeId ? 'border-red-500' : ''}`}
                >
                  <option value=''>Select Payment Type</option>
                  {paymentTypes.map((pt) => (
                    <option key={pt._id} value={pt._id}>
                      {pt.icon} {pt.name}
                    </option>
                  ))}
                </select>
                {editing && (
                  <button
                    type='button'
                    className='p-2 rounded border hover:bg-gray-50 text-indigo-600'
                    onClick={() => setShowPaymentTypeModal(true)}
                    title='Add new payment type'
                  >
                    <Plus size={20} />
                  </button>
                )}
              </div>
              {errors.paymentTypeId && (
                <p className='error-message text-red-500 text-sm mt-1'>{errors.paymentTypeId}</p>
              )}
            </div>
          </>
        )}
        <div className='mb-4'>
          <label className='block text-sm font-medium mb-2'>Description</label>
          <textarea
            value={formData.description || ''}
            onChange={(e) => handleChange('description', e.target.value)}
            disabled={!editing}
            placeholder='Add a description...'
            rows='3'
            className='w-full border rounded px-3 py-2'
          />
        </div>

        <div className='mb-4'>
          <label className='block text-sm font-medium mb-2'>Notes</label>
          <textarea
            value={formData.notes || ''}
            onChange={(e) => handleChange('notes', e.target.value)}
            disabled={!editing}
            placeholder='Add notes...'
            rows='4'
            className='w-full border rounded px-3 py-2'
          />
        </div>

        {editing && (
          <button
            className='mt-2 w-full bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 disabled:opacity-50'
            onClick={handleSave}
            disabled={loading || isSaving}
          >
            {isNew ? 'Create Transaction' : 'Save Changes'}
          </button>
        )}
        </div>
      </div>

      {showCategoryModal && (
        <CategoryModal
          type={formData.type}
          onClose={handleCategoryModalClose}
          onSave={handleCategoryModalSave}
        />
      )}

      {showPaymentTypeModal && (
        <PaymentTypeModal
          type={formData.type}
          onClose={handlePaymentTypeModalClose}
          onSave={handlePaymentTypeModalSave}
        />
      )}
      {isSaving && <SavingModal />}
    </div>
  );
};

export default TransactionDetail;
