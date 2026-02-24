import React, { useState, useEffect } from 'react';
import { validateAccountForm } from '../../utils/validation';
import { isDuplicateError, getUserFriendlyMessage } from '../../utils/errorHandler';
import { logger } from '../../utils/logger';

const ACCOUNT_TYPES = [
  { value: 'CASH', label: 'Cash', icon: '💵' },
  { value: 'BANK', label: 'Bank Account', icon: '🏦' },
  { value: 'CARD', label: 'Credit/Debit Card', icon: '💳' },
  { value: 'WALLET', label: 'Digital Wallet', icon: '📱' },
  { value: 'OTHER', label: 'Other', icon: '💼' }
];

const ACCOUNT_COLORS = [
  '#14b8a6', // Teal
  '#3b82f6', // Blue
  '#8b5cf6', // Purple
  '#ec4899', // Pink
  '#f59e0b', // Amber
  '#10b981', // Green
  '#ef4444', // Red
  '#6366f1', // Indigo
];

const AccountModal = ({ isOpen, onClose, onSubmit, account, loading }) => {
  const [formData, setFormData] = useState({
    name: '',
    type: 'BANK',
    openingBalance: '',
    description: '',
    color: '#14b8a6',
    icon: 'wallet'
  });
  const [errors, setErrors] = useState({});
  const [apiErrorMessage, setApiErrorMessage] = useState('');

  useEffect(() => {
    if (account) {
      setFormData({
        name: account.name || '',
        type: account.type || 'BANK',
        openingBalance: account.openingBalance?.toString() || '',
        description: account.description || '',
        color: account.color || '#14b8a6',
        icon: account.icon || 'wallet'
      });
    } else {
      setFormData({
        name: '',
        type: 'BANK',
        openingBalance: '',
        description: '',
        color: '#14b8a6',
        icon: 'wallet'
      });
    }
    setErrors({});
    setApiErrorMessage('');
  }, [account, isOpen]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
    if (apiErrorMessage) {
      setApiErrorMessage('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Client-side validation using validation.js
    const validationResult = validateAccountForm(formData, !!account);
    if (validationResult !== null) {
      setErrors(validationResult);
      logger.debug('Account form validation failed', validationResult);
      return;
    }

    // Clear previous errors
    setErrors({});
    setApiErrorMessage('');

    const submitData = {
      ...formData,
      openingBalance: parseFloat(formData.openingBalance)
    };

    try {
      await onSubmit(submitData);
    } catch (error) {
      logger.error('Account operation failed:', error);
      
      // Handle API errors with improved error display
      if (isDuplicateError(error)) {
        setApiErrorMessage('An account with this name already exists. Please use a different name.');
      } else if (error?.response?.status === 409) {
        setApiErrorMessage('This account name is already in use. Please try with a different name.');
      } else {
        setApiErrorMessage(getUserFriendlyMessage(error, 'Failed to save account. Please try again.'));
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">
              {account ? 'Edit Account' : 'Add New Account'}
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              disabled={loading}
            >
              <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* API Error Message */}
        {apiErrorMessage && (
          <div className="mx-6 mt-6 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-danger text-sm">{apiErrorMessage}</p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Account Name */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Account Name *
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className={`input ${errors.name ? 'input-error' : ''}`}
              placeholder="e.g., HDFC Bank"
              disabled={loading}
            />
            {errors.name && <p className="error-message">{errors.name}</p>}
          </div>

          {/* Account Type */}
          <div>
            <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-1">
              Account Type
            </label>
            <select
              id="type"
              name="type"
              value={formData.type}
              onChange={handleChange}
              className="input"
              disabled={loading}
            >
              {ACCOUNT_TYPES.map(type => (
                <option key={type.value} value={type.value}>
                  {type.icon} {type.label}
                </option>
              ))}
            </select>
          </div>

          {/* Opening Balance */}
          <div>
            <label htmlFor="openingBalance" className="block text-sm font-medium text-gray-700 mb-1">
              Opening Balance * {account && '(Cannot be changed)'}
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">₹</span>
              <input
                type="number"
                id="openingBalance"
                name="openingBalance"
                value={formData.openingBalance}
                onChange={handleChange}
                className={`input pl-8 ${errors.openingBalance ? 'input-error' : ''}`}
                placeholder="0.00"
                step="0.01"
                disabled={loading || !!account}
              />
            </div>
            {errors.openingBalance && <p className="error-message">{errors.openingBalance}</p>}
            {account && (
              <p className="text-xs text-gray-500 mt-1">
                Opening balance cannot be modified after account creation
              </p>
            )}
          </div>

          {/* Color Picker */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Account Color
            </label>
            <div className="flex flex-wrap gap-2">
              {ACCOUNT_COLORS.map(color => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, color }))}
                  className={`w-10 h-10 rounded-lg transition-all ${
                    formData.color === color 
                      ? 'ring-2 ring-offset-2 ring-primary-500 scale-110' 
                      : 'hover:scale-105'
                  }`}
                  style={{ backgroundColor: color }}
                  disabled={loading}
                />
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              Description (Optional)
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              className="input resize-none"
              rows="3"
              placeholder="Add notes about this account..."
              maxLength="200"
              disabled={loading}
            />
            <p className="text-xs text-gray-500 mt-1">
              {formData.description.length}/200 characters
            </p>
          </div>

          {/* Form Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-outline flex-1"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary flex-1"
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <div className="spinner mr-2" style={{ width: '16px', height: '16px', borderWidth: '2px' }}></div>
                  {account ? 'Updating...' : 'Creating...'}
                </span>
              ) : (
                account ? 'Update Account' : 'Create Account'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AccountModal;