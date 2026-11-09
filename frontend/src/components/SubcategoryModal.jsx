import React, { useState } from 'react';
import { X } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { createSubcategory, updateSubcategory } from '../services/subcategoryService';
import { validateCategoryName } from '../utils/validation';
import { getUserFriendlyMessage, isDuplicateError } from '../utils/errorHandler';
import { logger } from '../utils/logger';
import IconPicker from './IconPicker';
import { COLOR_OPTIONS } from '../config/colors';

const SubcategoryModal = ({ accountId, category, subcategory, onClose, onSave }) => {
  const { accountId: routeAccountId } = useParams();
  const resolvedAccountId = accountId || routeAccountId;
  const [formData, setFormData] = useState({
    name: subcategory?.name || '',
    icon: subcategory?.icon || 'other',
    color: subcategory?.color || category?.color || COLOR_OPTIONS[1],
  });
  const [errors, setErrors] = useState({});
  const [apiErrorMessage, setApiErrorMessage] = useState('');
  const [loading, setLoading] = useState(false);


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
        await updateSubcategory(resolvedAccountId, category._id, subcategory._id, formData);
      } else {
        await createSubcategory(resolvedAccountId, category._id, formData);
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
      className='fixed inset-0 z-[1060] flex items-center justify-center bg-black/50 p-4'
      onClick={onClose}
    >
      <div
        className='w-full max-w-md rounded-card border border-gray-200 bg-white p-6 text-gray-900 shadow-card dark:border-slate-700 dark:bg-slate-800 dark:text-gray-100'
        onClick={(event) => event.stopPropagation()}
      >
        <div className='flex items-center justify-between mb-4'>
          <h2 className='text-lg font-semibold'>
            {subcategory ? 'Edit Subcategory' : `Add Subcategory to ${category.name}`}
          </h2>
          <button className='rounded-md p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-slate-700' onClick={onClose} disabled={loading}>
            <X size={24} />
          </button>
        </div>

        {apiErrorMessage && (
          <p className='mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-danger dark:border-red-900 dark:bg-red-950/40'>
            {apiErrorMessage}
          </p>
        )}

        <form onSubmit={handleSubmit}>
          <label htmlFor='subcategory-name' className='mb-1 block text-sm font-medium'>Name *</label>
          <div className='flex items-center gap-2'>
            <IconPicker value={formData.icon} onChange={(icon) => setFormData((previous) => ({ ...previous, icon }))} disabled={loading} label='Subcategory icon' />
            <input
              id='subcategory-name'
              name='name'
              value={formData.name}
              onChange={handleChange}
              disabled={loading}
              className={`input flex-1 dark:border-slate-600 dark:bg-slate-900 dark:text-gray-100 ${errors.name ? 'input-error' : ''}`}
              placeholder='e.g., Restaurants'
            />
          </div>
          {errors.name && <p className='error-message'>{errors.name}</p>}

          <label className='block text-sm font-medium mt-4 mb-2'>Color</label>
          <div className='flex gap-2'>
            {COLOR_OPTIONS.map((color) => (
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
