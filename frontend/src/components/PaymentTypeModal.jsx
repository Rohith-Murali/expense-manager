import React, { useState } from 'react';
import { X } from 'lucide-react';
import { useParams } from 'react-router-dom';
import api from '../services/api';

const PaymentTypeModal = ({ paymentType, type, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    name: paymentType?.name || '',
    type: paymentType?.type || type,
    icon: paymentType?.icon || '💳'
  });
  const { accountId } = useParams();

  const iconOptions = ['💳', '💰', '🏦', '📱', '💵', '🪙', '💸', '🧾'];

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (paymentType) {
        await api.put(`/account/${accountId}/payment-types/${paymentType._id}`, formData);
      } else {
        await api.post(`/account/${accountId}/payment-types`, formData);
      }
      onSave();
    } catch (error) {
      console.error('Error saving payment type:', error);
      alert('Failed to save payment type');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[1050]" onClick={onClose}>
      <div className="bg-white rounded-card shadow-card p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">{paymentType ? 'Edit Payment Type' : 'Add Payment Type'}</h2>
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
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <button type="button" className="btn btn-outline" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              {paymentType ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PaymentTypeModal;
