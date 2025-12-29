import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Edit2, Trash2, Save, X } from 'lucide-react';
import api from '../services/api';
// Converted to Tailwind: removed TransactionDetail.css

const TransactionDetail = () => {
  const { id } = useParams();
  const {accountId} = useParams();
  const navigate = useNavigate();
  const [transaction, setTransaction] = useState(null);
  const [categories, setCategories] = useState([]);
  const [paymentTypes, setPaymentTypes] = useState([]);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(true);

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
      setLoading(false);
    } else {
      fetchTransaction();
    }
  }, [id]);

  const fetchTransaction = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/account/${accountId}/transactions/${id}`);
      setTransaction(response.data.data);
      setFormData(response.data.data);
      
      if (response.data.data.type !== 'transfer') {
        fetchCategories(response.data.data.type);
        fetchPaymentTypes(response.data.data.type);
      }
    } catch (error) {
      console.error('Error fetching transaction:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async (type) => {
    try {
      const response = await api.get(`/account/${accountId}/categories`, { params: { type } });
      setCategories(response.data.data);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchPaymentTypes = async (type) => {
    try {
      const response = await api.get(`/account/${accountId}/payment-types`, { params: { type } });
      setPaymentTypes(response.data.data);
    } catch (error) {
      console.error('Error fetching payment types:', error);
    }
  };

  const handleTypeChange = (type) => {
    setFormData({ ...formData, type });
    fetchCategories(type);
    fetchPaymentTypes(type);
  };

  const handleSave = async () => {
    try {
      if (id === 'new') {
        await api.post(`/account/${accountId}/transactions`, formData);
      } else {
        await api.put(`/account/${accountId}/transactions/${id}`, formData);
      }
      navigate(`/accounts/${accountId}`);
    } catch (error) {
      console.error('Error saving transaction:', error);
      alert('Failed to save transaction');
    }
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this transaction?')) {
      try {
        await api.delete(`/account/${accountId}/transactions/${id}`);
        navigate(`/accounts/${accountId}`);
      } catch (error) {
        console.error('Error deleting transaction:', error);
        alert('Failed to delete transaction');
      }
    }
  };

  if (loading) {
    return <div className="text-center text-gray-500">Loading...</div>;
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
          <label className="block text-sm font-medium mb-2">Amount</label>
          <input
            type="number"
            value={formData.amount}
            onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
            disabled={!editing}
            placeholder="0.00"
            className="w-full border rounded px-3 py-2"
          />
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Date</label>
          <input
            type="date"
            value={formData.date?.split('T')[0]}
            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            disabled={!editing}
            className="w-full border rounded px-3 py-2"
          />
        </div>

        {formData.type !== 'transfer' && (
          <>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Category</label>
              <select
                value={formData.categoryId?._id || formData.categoryId}
                onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                disabled={!editing}
                className="w-full border rounded px-3 py-2"
              >
                <option value="">Select Category</option>
                {categories.map(cat => (
                  <option key={cat._id} value={cat._id}>
                    {cat.icon} {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Payment Type</label>
              <select
                value={formData.paymentTypeId?._id || formData.paymentTypeId}
                onChange={(e) => setFormData({ ...formData, paymentTypeId: e.target.value })}
                disabled={!editing}
                className="w-full border rounded px-3 py-2"
              >
                <option value="">Select Payment Type</option>
                {paymentTypes.map(pt => (
                  <option key={pt._id} value={pt._id}>
                    {pt.icon} {pt.name}
                  </option>
                ))}
              </select>
            </div>
          </>
        )}

        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Description</label>
          <textarea
            value={formData.description || ''}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
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
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            disabled={!editing}
            placeholder="Add notes..."
            rows="4"
            className="w-full border rounded px-3 py-2"
          />
        </div>

        {editing && (
          <button className="mt-2 w-full bg-indigo-600 text-white px-4 py-2 rounded" onClick={handleSave}>
            {id === 'new' ? 'Create Transaction' : 'Save Changes'}
          </button>
        )}
      </div>
    </div>
  );
};

export default TransactionDetail;