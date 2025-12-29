import React, { useState } from 'react';
import { X } from 'lucide-react';
import api from '../services/api';
import { useParams } from 'react-router-dom';

const CategoryModal = ({ category, type, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    name: category?.name || '',
    type: category?.type || type,
    icon: category?.icon || '📁',
    color: category?.color || '#4A90E2'
  });
  const {accountId} = useParams();

  const iconOptions = ['💰', '🍔', '🚗', '🏠', '💊', '🎬', '🛒', '✈️', '📱', '👔'];
  const colorOptions = ['#4A90E2', '#7B68EE', '#50C878', '#FF6B6B', '#FFA500', '#FF69B4'];

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (category) {
        await api.put(`/account/${accountId}/categories/${category._id}`, formData);
      } else {
        await api.post(`/account/${accountId}/categories`, formData);
      }
      onSave();
    } catch (error) {
      console.error('Error saving category:', error);
      alert('Failed to save category');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[1050]" onClick={onClose}>
      <div className="bg-white rounded-card shadow-card p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">{category ? 'Edit Category' : 'Add Category'}</h2>
          <button className="p-2 rounded-md hover:bg-gray-100" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                className="input"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Icon</label>
              <div className="flex gap-2 flex-wrap">
                {iconOptions.map(icon => (
                  <button
                    key={icon}
                    type="button"
                    className={`p-2 rounded-md border ${formData.icon === icon ? 'ring-2 ring-primary-500' : 'border-transparent'}`}
                    onClick={() => setFormData({ ...formData, icon })}
                  >
                    {icon}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Color</label>
              <div className="flex gap-2">
                {colorOptions.map(color => (
                  <button
                    key={color}
                    type="button"
                    className={`w-8 h-8 rounded-full border ${formData.color === color ? 'ring-2 ring-primary-500' : 'border-gray-200'}`}
                    style={{ backgroundColor: color }}
                    onClick={() => setFormData({ ...formData, color })}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <button type="button" className="btn btn-outline" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              {category ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CategoryModal;