import React, { useState } from 'react';
import { X } from 'lucide-react';
import { createCategory, updateCategory } from '../services/categoryService';
import { useParams } from 'react-router-dom';
import { validateCategoryForm } from '../utils/validation';
import { isDuplicateError, getUserFriendlyMessage } from '../utils/errorHandler';
import { logger } from '../utils/logger';

const CategoryModal = ({ category, type, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    name: category?.name || '',
    type: category?.type || type,
    icon: category?.icon || '📁',
    color: category?.color || '#4A90E2',
  });
  const [errors, setErrors] = useState({});
  const [apiErrorMessage, setApiErrorMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const { accountId } = useParams();

  const iconOptions = ['💰', '🍔', '🚗', '🏠', '💊', '🎬', '🛒', '✈️', '📱', '👔'];
  const colorOptions = ['#4A90E2', '#7B68EE', '#50C878', '#FF6B6B', '#FFA500', '#FF69B4'];

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
    const validationResult = validateCategoryForm(formData);
    if (validationResult !== null) {
      setErrors(validationResult);
      logger.debug('Category form validation failed', validationResult);
      return;
    }
    setErrors({});
    setApiErrorMessage('');
    setLoading(true);
    try {
      if (category) {
        await updateCategory(accountId, category._id, formData);
      } else {
        await createCategory(accountId, formData);
      }
      logger.info('Category saved successfully');
      onSave();
    } catch (error) {
      logger.error('Error saving category:', error);
      if (isDuplicateError(error)) {
        setApiErrorMessage(
          'A category with this name already exists in this account. Please use a different name.',
        );
      } else if (error?.response?.status === 409) {
        setApiErrorMessage('This category name is already in use in this account.');
      } else {
        setApiErrorMessage(
          getUserFriendlyMessage(error, 'Failed to save category. Please try again.'),
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
          <h2 className='text-lg font-semibold'>{category ? 'Edit Category' : 'Add Category'}</h2>
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
                placeholder='e.g., Groceries'
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

            <div>
              <label className='block text-sm font-medium mb-2'>Color</label>
              <div className='flex gap-2'>
                {colorOptions.map((color) => (
                  <button
                    key={color}
                    type='button'
                    disabled={loading}
                    className={`w-8 h-8 rounded-full border-2 transition-all ${
                      formData.color === color
                        ? 'ring-2 ring-offset-2 ring-primary-500 border-primary-500'
                        : 'border-gray-200 hover:border-primary-300'
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => setFormData({ ...formData, color })}
                  />
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
                  {category ? 'Updating...' : 'Creating...'}
                </span>
              ) : category ? (
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

export default CategoryModal;
