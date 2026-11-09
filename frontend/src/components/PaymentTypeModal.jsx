import React, { useState } from 'react';
import { X } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { createPaymentType, updatePaymentType } from '../services/paymentTypeService';
import { validatePaymentTypeForm } from '../utils/validation';
import { isDuplicateError, getUserFriendlyMessage } from '../utils/errorHandler';
import { logger } from '../utils/logger';
import IconPicker from './IconPicker';

const PaymentTypeModal = ({ paymentType, type, accountId: accountIdProp, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    name: paymentType?.name || '',
    type: paymentType?.type || type,
    icon: paymentType?.icon || 'card',
  });
  const [errors, setErrors] = useState({});
  const [apiErrorMessage, setApiErrorMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const { accountId: routeAccountId } = useParams();
  const accountId = accountIdProp || routeAccountId;


  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
    if (apiErrorMessage) {
      setApiErrorMessage('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationResult = validatePaymentTypeForm(formData);
    if (validationResult !== null) {
      setErrors(validationResult);
      logger.debug('Payment type form validation failed', validationResult);
      return;
    }
    setErrors({});
    setApiErrorMessage('');
    setLoading(true);
    try {
      if (paymentType) {
        // Payment type is immutable after creation; the update schema accepts only editable fields.
        const { type: _type, ...editableFields } = formData;
        await updatePaymentType(accountId, paymentType._id, editableFields);
      } else {
        await createPaymentType(accountId, formData);
      }
      logger.info('Payment type saved successfully');
      onSave();
    } catch (error) {
      logger.error('Error saving payment type:', error);
      if (isDuplicateError(error)) {
        setApiErrorMessage(
          'A payment type with this name already exists in this account. Please use a different name.',
        );
      } else if (error?.response?.status === 409) {
        setApiErrorMessage('This payment type name is already in use in this account.');
      } else {
        setApiErrorMessage(
          getUserFriendlyMessage(error, 'Failed to save payment type. Please try again.'),
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className='fixed inset-0 z-[1050] flex items-center justify-center bg-black/50 p-4'
      onClick={onClose}
    >
      <div
        className='w-full max-w-md rounded-card border border-gray-200 bg-white p-6 text-gray-900 shadow-card dark:border-slate-700 dark:bg-slate-800 dark:text-gray-100'
        onClick={(e) => e.stopPropagation()}
      >
        <div className='flex items-center justify-between mb-4'>
          <h2 className='text-lg font-semibold'>
            {paymentType ? 'Edit Payment Type' : 'Add Payment Type'}
          </h2>
          <button className='rounded-md p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-slate-700' onClick={onClose} disabled={loading}>
            <X size={24} />
          </button>
        </div>

        {apiErrorMessage && (
          <div className='mb-4 rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-900 dark:bg-red-950/40'>
            <p className='text-danger text-sm'>{apiErrorMessage}</p>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className='space-y-4'>
            <div>
              <label htmlFor='name' className='mb-1 block text-sm font-medium'>Name *</label>
              <div className='flex items-center gap-2'>
                <IconPicker value={formData.icon} onChange={(icon) => setFormData({ ...formData, icon })} disabled={loading} label='Payment type icon' />
                <input
                  type='text'
                  id='name'
                  name='name'
                  value={formData.name}
                  onChange={handleChange}
                  disabled={loading}
                  className={`input flex-1 dark:border-slate-600 dark:bg-slate-900 dark:text-gray-100 ${errors.name ? 'input-error' : ''}`}
                  placeholder='e.g., Credit Card'
                />
              </div>
              {errors.name && <p className='error-message'>{errors.name}</p>}
            </div>
          </div>

          <div className='flex justify-end gap-3 mt-6'>
            <button type='button' className='btn btn-outline' onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type='submit' className='btn btn-primary' disabled={loading}>
              {loading ? (
                <span className='flex items-center justify-center'>
                  <div
                    className='spinner mr-2'
                    style={{ width: '16px', height: '16px', borderWidth: '2px' }}
                  ></div>
                  {paymentType ? 'Updating...' : 'Creating...'}
                </span>
              ) : paymentType ? (
                'Update'
              ) : (
                'Create'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PaymentTypeModal;
