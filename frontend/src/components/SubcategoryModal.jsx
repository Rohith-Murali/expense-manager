import React, { useState } from 'react';
import { X } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { createSubcategory, updateSubcategory } from '../services/subcategoryService';
import { validateCategoryName } from '../utils/validation';
import { getUserFriendlyMessage, isDuplicateError } from '../utils/errorHandler';
import { logger } from '../utils/logger';

const SubcategoryModal = ({ category, subcategory, onClose, onSave }) => {
  const { accountId } = useParams();
  const [formData, setFormData] = useState({
    name: subcategory?.name || '',
    icon: subcategory?.icon || '•',
    color: subcategory?.color || category?.color || '#4A90E2',
  });
  const [errors, setErrors] = useState({});
  const [apiErrorMessage, setApiErrorMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const iconOptions = ['•', '🏠', '💳', '🛒', '🚗', '💊', '🎁', '📱', '✈️', '🏦'];
  const colorOptions = ['#4A90E2', '#50C878', '#FF6B6B', '#FFA500', '#7B68EE', '#808080'];

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((previous) => ({ ...previous, [name]: value }));
    setErrors((previous) => ({ ...previous, [name]: '' }));
    setApiErrorMessage('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const nameError = validateCategoryName(formData.name);
    if (nameError) {
      setErrors({ name: nameError });
      return;
    }

    setLoading(true);
    setErrors({});
    setApiErrorMessage('');
    try {
      if (subcategory) {
        await updateSubcategory(accountId, category._id, subcategory._id, formData);
      } else {
        await createSubcategory(accountId, category._id, formData);
      }
      onSave();
    } catch (error) {
      logger.error('Error saving subcategory:', error);
      if (isDuplicateError(error) || error?.response?.status === 409) {
        setApiErrorMessage('A subcategory with this name already exists under this category.');
      } else {
        setApiErrorMessage(
          getUserFriendlyMessage(error, 'Failed to save subcategory. Please try again.'),
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className='fixed inset-0 bg-black/40 flex items-center justify-center z-[1060]'
      onClick={onClose}
    >
      <div
        className='bg-white rounded-card shadow-card p-6 w-full max-w-md'
        onClick={(event) => event.stopPropagation()}
      >
        <div className='flex items-center justify-between mb-4'>
          <h2 className='text-lg font-semibold'>
            {subcategory ? 'Edit Subcategory' : `Add Subcategory to ${category.name}`}
          </h2>
          <button className='p-2 rounded-md hover:bg-gray-100' onClick={onClose} disabled={loading}>
            <X size={24} />
          </button>
        </div>

        {apiErrorMessage && (
          <p className='mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-danger text-sm'>
            {apiErrorMessage}
          </p>
        )}

        <form onSubmit={handleSubmit}>
          <label htmlFor='subcategory-name' className='block text-sm font-medium mb-1'>
            Name *
          </label>
          <input
            id='subcategory-name'
            name='name'
            value={formData.name}
            onChange={handleChange}
            disabled={loading}
            className={`input w-full ${errors.name ? 'input-error' : ''}`}
            placeholder='e.g., Restaurants'
          />
          {errors.name && <p className='error-message'>{errors.name}</p>}

          <label className='block text-sm font-medium mt-4 mb-2'>Icon</label>
          <div className='flex gap-2 flex-wrap'>
            {iconOptions.map((icon) => (
              <button
                key={icon}
                type='button'
                disabled={loading}
                className={`p-2 rounded-md border ${formData.icon === icon ? 'ring-2 ring-primary-500 bg-primary-50' : 'border-gray-200 hover:border-primary-300'}`}
                onClick={() => setFormData((previous) => ({ ...previous, icon }))}
              >
                {icon}
              </button>
            ))}
          </div>

          <label className='block text-sm font-medium mt-4 mb-2'>Color</label>
          <div className='flex gap-2'>
            {colorOptions.map((color) => (
              <button
                key={color}
                type='button'
                disabled={loading}
                aria-label={`Select ${color}`}
                className={`w-8 h-8 rounded-full border-2 ${formData.color === color ? 'ring-2 ring-offset-2 ring-primary-500 border-primary-500' : 'border-gray-200'}`}
                style={{ backgroundColor: color }}
                onClick={() => setFormData((previous) => ({ ...previous, color }))}
              />
            ))}
          </div>

          <div className='flex justify-end gap-3 mt-6'>
            <button type='button' className='btn btn-outline' onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type='submit' className='btn btn-primary' disabled={loading}>
              {subcategory ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SubcategoryModal;
