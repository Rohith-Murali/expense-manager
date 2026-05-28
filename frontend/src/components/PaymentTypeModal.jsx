import React, { useState } from 'react';
import { X } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { createPaymentType, updatePaymentType } from '../services/paymentTypeService';
import { validatePaymentTypeForm } from '../utils/validation';
import { isDuplicateError, getUserFriendlyMessage } from '../utils/errorHandler';
import { logger } from '../utils/logger';

const PaymentTypeModal = ({ paymentType, type, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    name: paymentType?.name || '',
    type: paymentType?.type || type,
    icon: paymentType?.icon || '💳',
  });
  const [errors, setErrors] = useState({});
  const [apiErrorMessage, setApiErrorMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const { accountId } = useParams();

  const iconOptions = ['💳', '💰', '🏦', '📱', '💵', '🪙', '💸', '🧾'];

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
        await updatePaymentType(accountId, paymentType._id, formData);
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
      className='fixed inset-0 bg-black/40 flex items-center justify-center z-[1050]'
      onClick={onClose}
    >
      <div
        className='bg-white rounded-card shadow-card p-6 w-full max-w-md'
        onClick={(e) => e.stopPropagation()}
      >
        <div className='flex items-center justify-between mb-4'>
          <h2 className='text-lg font-semibold'>
            {paymentType ? 'Edit Payment Type' : 'Add Payment Type'}
          </h2>
          <button className='p-2 rounded-md hover:bg-gray-100' onClick={onClose} disabled={loading}>
            <X size={24} />
          </button>
        </div>

        {apiErrorMessage && (
          <div className='mb-4 p-3 bg-red-50 border border-red-200 rounded-lg'>
            <p className='text-danger text-sm'>{apiErrorMessage}</p>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className='space-y-4'>
            <div>
              <label htmlFor='name' className='block text-sm font-medium mb-1'>
                Name *
              </label>
              <input
                type='text'
                id='name'
                name='name'
                value={formData.name}
                onChange={handleChange}
                disabled={loading}
                className={`input ${errors.name ? 'input-error' : ''}`}
                placeholder='e.g., Credit Card'
              />
              {errors.name && <p className='error-message'>{errors.name}</p>}
            </div>

            <div>
              <label className='block text-sm font-medium mb-2'>Icon</label>
              <div className='flex gap-2 flex-wrap'>
                {iconOptions.map((icon) => (
                  <button
                    key={icon}
                    type='button'
                    disabled={loading}
                    className={`p-2 rounded-md border ${
                      formData.icon === icon
                        ? 'ring-2 ring-primary-500 bg-primary-50'
                        : 'border-gray-200 hover:border-primary-300'
                    } transition-all`}
                    onClick={() => setFormData({ ...formData, icon })}
                  >
                    {icon}
                  </button>
                ))}
              </div>
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
