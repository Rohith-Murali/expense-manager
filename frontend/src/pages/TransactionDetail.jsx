import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Edit2, Trash2, Save, X, Plus } from 'lucide-react';
import api from '../services/api';
import accountService from '../services/accountService';
import CategoryModal from '../components/CategoryModal';
import PaymentTypeModal from '../components/PaymentTypeModal';
import { validateTransactionForm } from '../utils/validation';
import { getUserFriendlyMessage } from '../utils/errorHandler';
import { logger } from '../utils/logger';

const TransactionDetail = () => {
  const { id } = useParams();
  const { accountId } = useParams();
  const navigate = useNavigate();
  const [transaction, setTransaction] = useState(null);
  const [categories, setCategories] = useState([]);
  const [paymentTypes, setPaymentTypes] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState({});
  const [apiErrorMessage, setApiErrorMessage] = useState('');
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showPaymentTypeModal, setShowPaymentTypeModal] = useState(false);

  useEffect(() => {
    if (id === 'new') {
      setEditing(true);
      setFormData({
        type: 'expense',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        description: '',
        categoryId: '',
        paymentTypeId: ''
      });
      fetchCategories('expense');
      fetchPaymentTypes('expense');
      // preload accounts in case user wants to create a transfer
      fetchAccounts();
      setLoading(false);
    } else {
      fetchTransaction();
    }
  }, [id]);

  const fetchTransaction = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/account/${accountId}/transactions/${id}`);
      setTransaction(response.data);
      // Normalize populated refs to simple ids for form handling
      const fd = { ...response.data };
      if (fd.categoryId && fd.categoryId._id) fd.categoryId = fd.categoryId._id;
      if (fd.paymentTypeId && fd.paymentTypeId._id) fd.paymentTypeId = fd.paymentTypeId._id;
      if (fd.fromAccountId && fd.fromAccountId._id) fd.fromAccountId = fd.fromAccountId._id;
      if (fd.toAccountId && fd.toAccountId._id) fd.toAccountId = fd.toAccountId._id;
      setFormData(fd);

      if (response.data.type !== 'transfer') {
        fetchCategories(response.data.type);
        fetchPaymentTypes(response.data.type);
      } else {
        // load accounts so we can display from/to selects
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
      const response = await api.get(`/account/${accountId}/categories`, { params: { type } });
      setCategories(response.data);
    } catch (error) {
      logger.error('Error fetching categories:', error);
    }
  };

  const fetchAccounts = async () => {
    try {
      const response = await accountService.getAccounts(false);
      // accountService returns API body, which contains `.data` array
      setAccounts(response.data || response || []);
    } catch (error) {
      logger.error('Error fetching accounts:', error);
    }
  };

  const fetchPaymentTypes = async (type) => {
    try {
      const response = await api.get(`/account/${accountId}/payment-types`, { params: { type } });
      setPaymentTypes(response.data);
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
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
    if (apiErrorMessage) {
      setApiErrorMessage('');
    }
  };

  const handleTypeChange = (type) => {
    handleChange('type', type);
    fetchCategories(type);
    fetchPaymentTypes(type);
    if (type === 'transfer') fetchAccounts();
  };

  const handleSave = async () => {
    // Client-side validation
    const validationResult = validateTransactionForm(formData, categories, paymentTypes);
    if (validationResult !== null) {
      setErrors(validationResult);
      logger.debug('Transaction form validation failed', validationResult);
      return;
    }

    // Clear previous errors
    setErrors({});
    setApiErrorMessage('');

    try {
      // Prepare data for submission - extract IDs from objects
      const submitData = {
        type: formData.type,
        amount: parseFloat(formData.amount),
        date: formData.date,
        description: formData.description || '',
      };

      // Add category and payment type if not a transfer
      if (formData.type !== 'transfer') {
        submitData.categoryId = formData.categoryId?._id || formData.categoryId;
        submitData.paymentTypeId = formData.paymentTypeId?._id || formData.paymentTypeId;
      } else {
        // For transfers include from/to account ids
        submitData.fromAccountId = formData.fromAccountId?._id || formData.fromAccountId;
        submitData.toAccountId = formData.toAccountId?._id || formData.toAccountId;
      }

      if (id === 'new') {
        await api.post(`/account/${accountId}/transactions`, submitData);
        logger.info('Transaction created successfully');
      } else {
        await api.put(`/account/${accountId}/transactions/${id}`, submitData);
        logger.info('Transaction updated successfully');
      }
      navigate(`/accounts/${accountId}`);
    } catch (error) {
      logger.error('Error saving transaction:', error);
      setApiErrorMessage(getUserFriendlyMessage(error, 'Failed to save transaction. Please try again.'));
    }
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this transaction?')) {
      try {
        await api.delete(`/account/${accountId}/transactions/${id}`);
        logger.info('Transaction deleted successfully');
        navigate(`/accounts/${accountId}`);
      } catch (error) {
        logger.error('Error deleting transaction:', error);
        setApiErrorMessage(getUserFriendlyMessage(error, 'Failed to delete transaction. Please try again.'));
      }
    }
  };

  if (loading) {
    return <div className="text-center text-gray-500 py-8">Loading...</div>;
  }

  if (apiErrorMessage && !formData.type) {
    return (
      <div className="min-h-screen p-6 bg-gray-50 text-gray-800">
        <div className="flex items-center gap-3 mb-6">
          <button className="p-2 rounded-md hover:bg-gray-100" onClick={() => navigate(-1)}>
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-xl font-semibold">Transaction Details</h1>
        </div>
        <div className="max-w-xl bg-white p-6 rounded shadow">
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-danger font-medium">{apiErrorMessage}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 bg-gray-50 text-gray-800">
      <header className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button className="p-2 rounded-md hover:bg-gray-100" onClick={() => navigate(-1)}>
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-xl font-semibold">{id === 'new' ? 'New Transaction' : 'Transaction Details'}</h1>
        </div>

        <div className="flex items-center gap-2">
          {!editing && id !== 'new' && (
            <>
              <button className="p-2 rounded-md hover:bg-gray-100" onClick={() => setEditing(true)}>
                <Edit2 size={20} />
              </button>
              <button className="p-2 rounded-md hover:bg-red-100 text-red-600" onClick={handleDelete}>
                <Trash2 size={20} />
              </button>
            </>
          )}
          {editing && (
            <>
              <button className="p-2 rounded-md hover:bg-gray-100" onClick={() => setEditing(false)}>
                <X size={20} />
              </button>
              <button className="p-2 rounded-md bg-green-600 text-white hover:bg-green-700" onClick={handleSave}>
                <Save size={18} />
              </button>
            </>
          )}
        </div>
      </header>

      <div className="max-w-xl bg-white p-6 rounded shadow">
        {apiErrorMessage && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-danger text-sm">{apiErrorMessage}</p>
          </div>
        )}

        

        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Type</label>
          <div className="flex gap-2">
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
              className={`px-3 py-1 rounded ${formData.type === 'transfer' ? 'bg-indigo-50 text-indigo-600' : 'bg-gray-100 text-gray-700'}`}
              onClick={() => handleTypeChange('transfer')}
              disabled={!editing}
            >
              Transfer
            </button>
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Amount *</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">₹</span>
            <input
              type="number"
              value={formData.amount}
              onChange={(e) => handleChange('amount', e.target.value)}
              disabled={!editing}
              placeholder="0.00"
              step="0.01"
              className={`w-full pl-8 border rounded px-3 py-2 ${errors.amount ? 'border-red-500' : ''}`}
            />
          </div>
          {errors.amount && <p className="error-message text-red-500 text-sm mt-1">{errors.amount}</p>}
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Date *</label>
          <input
            type="date"
            value={formData.date?.split('T')[0]}
            onChange={(e) => handleChange('date', e.target.value)}
            disabled={!editing}
            className={`w-full border rounded px-3 py-2 ${errors.date ? 'border-red-500' : ''}`}
          />
          {errors.date && <p className="error-message text-red-500 text-sm mt-1">{errors.date}</p>}
        </div>

        {formData.type === 'transfer' && (
          <>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">From Account *</label>
              <select
                value={formData.fromAccountId?._id || formData.fromAccountId || ''}
                onChange={(e) => handleChange('fromAccountId', e.target.value)}
                disabled={!editing}
                className={`w-full border rounded px-3 py-2 ${errors.fromAccountId ? 'border-red-500' : ''}`}
              >
                <option value="">Select account</option>
                {accounts.map(acc => (
                  <option key={acc._id} value={acc._id}>
                    {acc.name} {acc.currency ? `(${acc.currency})` : ''} {typeof acc.balance !== 'undefined' ? ` - ₹${acc.balance}` : ''}
                  </option>
                ))}
              </select>
              {errors.fromAccountId && <p className="error-message text-red-500 text-sm mt-1">{errors.fromAccountId}</p>}
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">To Account *</label>
              <select
                value={formData.toAccountId?._id || formData.toAccountId || ''}
                onChange={(e) => handleChange('toAccountId', e.target.value)}
                disabled={!editing}
                className={`w-full border rounded px-3 py-2 ${errors.toAccountId ? 'border-red-500' : ''}`}
              >
                <option value="">Select account</option>
                {accounts.map(acc => (
                  <option key={acc._id} value={acc._id}>
                    {acc.name} {acc.currency ? `(${acc.currency})` : ''} {typeof acc.balance !== 'undefined' ? ` - ₹${acc.balance}` : ''}
                  </option>
                ))}
              </select>
              {errors.toAccountId && <p className="error-message text-red-500 text-sm mt-1">{errors.toAccountId}</p>}
            </div>
          </>
        )}

        {formData.type !== 'transfer' && (
          <>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Category *</label>
              <div className="flex gap-2">
                <select
                  value={formData.categoryId?._id || formData.categoryId}
                  onChange={(e) => handleChange('categoryId', e.target.value)}
                  disabled={!editing}
                  className={`flex-1 border rounded px-3 py-2 ${errors.categoryId ? 'border-red-500' : ''}`}
                >
                  <option value="">Select Category</option>
                  {categories.map(cat => (
                    <option key={cat._id} value={cat._id}>
                      {cat.icon} {cat.name}
                    </option>
                  ))}
                </select>
                {editing && (
                  <button
                    type="button"
                    className="p-2 rounded border hover:bg-gray-50 text-indigo-600"
                    onClick={() => setShowCategoryModal(true)}
                    title="Add new category"
                  >
                    <Plus size={20} />
                  </button>
                )}
              </div>
              {errors.categoryId && <p className="error-message text-red-500 text-sm mt-1">{errors.categoryId}</p>}
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Payment Type *</label>
              <div className="flex gap-2">
                <select
                  value={formData.paymentTypeId?._id || formData.paymentTypeId}
                  onChange={(e) => handleChange('paymentTypeId', e.target.value)}
                  disabled={!editing}
                  className={`flex-1 border rounded px-3 py-2 ${errors.paymentTypeId ? 'border-red-500' : ''}`}
                >
                  <option value="">Select Payment Type</option>
                  {paymentTypes.map(pt => (
                    <option key={pt._id} value={pt._id}>
                      {pt.icon} {pt.name}
                    </option>
                  ))}
                </select>
                {editing && (
                  <button
                    type="button"
                    className="p-2 rounded border hover:bg-gray-50 text-indigo-600"
                    onClick={() => setShowPaymentTypeModal(true)}
                    title="Add new payment type"
                  >
                    <Plus size={20} />
                  </button>
                )}
              </div>
              {errors.paymentTypeId && <p className="error-message text-red-500 text-sm mt-1">{errors.paymentTypeId}</p>}
            </div>
          </>
        )}

        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Description</label>
          <textarea
            value={formData.description || ''}
            onChange={(e) => handleChange('description', e.target.value)}
            disabled={!editing}
            placeholder="Add a description..."
            rows="3"
            className="w-full border rounded px-3 py-2"
          />
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Notes</label>
          <textarea
            value={formData.notes || ''}
            onChange={(e) => handleChange('notes', e.target.value)}
            disabled={!editing}
            placeholder="Add notes..."
            rows="4"
            className="w-full border rounded px-3 py-2"
          />
        </div>

        {editing && (
          <button 
            className="mt-2 w-full bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 disabled:opacity-50" 
            onClick={handleSave}
            disabled={loading}
          >
            {id === 'new' ? 'Create Transaction' : 'Save Changes'}
          </button>
        )}
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
    </div>
  );
};

export default TransactionDetail;