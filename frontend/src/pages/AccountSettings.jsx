import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Plus, Edit2, Trash2 } from 'lucide-react';
import api from '../services/api';
import CategoryModal from '../components/CategoryModal';
import PaymentTypeModal from '../components/PaymentTypeModal';
import logger from '../utils/logger';

const Settings = () => {
  const navigate = useNavigate();
  const {accountId} = useParams();
  const [account, setAccount] = useState({});
  const [categories, setCategories] = useState([]);
  const [paymentTypes, setPaymentTypes] = useState([]);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [categoryType, setCategoryType] = useState('expense');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [categoriesRes, paymentTypesRes, accountRes] = await Promise.all([
        api.get(`/account/${accountId}/categories`),
        api.get(`/account/${accountId}/payment-types`),
        api.get(`/accounts/${accountId}`)
      ]);
      setCategories(categoriesRes.data);
      setPaymentTypes(paymentTypesRes.data);
      setAccount(accountRes.data);
    } catch (error) {
      logger.error('Error fetching data:', error);
    }
  };

  const handleDeleteCategory = async (id) => {
    if (window.confirm('Delete this category?')) {
      try {
        await api.delete(`/account/${accountId}/categories/${id}`);
        fetchData();
      } catch (error) {
        logger.error('Error deleting category:', error);
      }
    }
  };

  const handleDeletePaymentType = async (id) => {
    if (window.confirm('Delete this payment type?')) {
      try {
        await api.delete(`/account/${accountId}/payment-types/${id}`);
        fetchData();
      } catch (error) {
        logger.error('Error deleting payment type:', error);
      }
    }
  };

  const expenseCategories = categories.filter(c => c.type === 'expense');
  const incomeCategories = categories.filter(c => c.type === 'income');
  const expensePayments = paymentTypes.filter(p => p.type === 'expense');
  const incomePayments = paymentTypes.filter(p => p.type === 'income');

  return (
    <div className="min-h-screen p-6 bg-gray-50 text-gray-800">
      <header className="flex items-center gap-4 mb-6">
        <button className="p-2 rounded-md hover:bg-gray-100" onClick={() => navigate(-1)}>
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-2xl font-semibold">Settings</h1>
      </header>

      <section className="mb-6">
        <h2 className="text-lg font-medium mb-2">Account Information</h2>
        <div className="bg-white p-4 rounded shadow">
          <div className="flex justify-between mb-2">
            <span className="text-sm text-gray-600">Account Name</span>
            <span className="font-medium">{account.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Balance</span>
            <span className="font-medium">{account.currentBalance}</span>
          </div>
        </div>
      </section>

      <section className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-medium">Categories</h2>
          <button
            className="inline-flex items-center gap-2 bg-indigo-600 text-white px-3 py-2 rounded"
            onClick={() => {
              setEditingItem(null);
              setShowCategoryModal(true);
            }}
          >
            <Plus size={18} />
            Add Category
          </button>
        </div>

        <div className="flex gap-2 mb-4 bg-white rounded p-2 shadow-sm">
          <button
            className={`px-3 py-1 rounded ${categoryType === 'expense' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600'}`}
            onClick={() => setCategoryType('expense')}
          >
            Expense
          </button>
          <button
            className={`px-3 py-1 rounded ${categoryType === 'income' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600'}`}
            onClick={() => setCategoryType('income')}
          >
            Income
          </button>
        </div>

        <div className="space-y-3">
          {(categoryType === 'expense' ? expenseCategories : incomeCategories).map(cat => (
            <div key={cat._id} className="flex items-center justify-between bg-white p-3 rounded shadow-sm">
              <div className="flex items-center gap-3">
                <span className="text-xl" style={{ color: cat.color }}>{cat.icon}</span>
                <span className="font-medium">{cat.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  className="p-2 rounded-md hover:bg-gray-100"
                  onClick={() => {
                    setEditingItem(cat);
                    setShowCategoryModal(true);
                  }}
                >
                  <Edit2 size={16} />
                </button>
                <button
                  className="p-2 rounded-md hover:bg-red-100 text-red-600"
                  onClick={() => handleDeleteCategory(cat._id)}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-medium">Payment Types</h2>
          <button
            className="inline-flex items-center gap-2 bg-indigo-600 text-white px-3 py-2 rounded"
            onClick={() => {
              setEditingItem(null);
              setShowPaymentModal(true);
            }}
          >
            <Plus size={18} />
            Add Payment Type
          </button>
        </div>

        <div className="flex gap-2 mb-4 bg-white rounded p-2 shadow-sm">
          <button
            className={`px-3 py-1 rounded ${categoryType === 'expense' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600'}`}
            onClick={() => setCategoryType('expense')}
          >
            Expense
          </button>
          <button
            className={`px-3 py-1 rounded ${categoryType === 'income' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600'}`}
            onClick={() => setCategoryType('income')}
          >
            Income
          </button>
        </div>

        <div className="space-y-3">
          {(categoryType === 'expense' ? expensePayments : incomePayments).map(pt => (
            <div key={pt._id} className="flex items-center justify-between bg-white p-3 rounded shadow-sm">
              <div className="flex items-center gap-3">
                <span className="text-xl">{pt.icon}</span>
                <span className="font-medium">{pt.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  className="p-2 rounded-md hover:bg-gray-100"
                  onClick={() => {
                    setEditingItem(pt);
                    setShowPaymentModal(true);
                  }}
                >
                  <Edit2 size={16} />
                </button>
                <button
                  className="p-2 rounded-md hover:bg-red-100 text-red-600"
                  onClick={() => handleDeletePaymentType(pt._id)}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-6">
        <h2 className="text-lg font-medium mb-2">Danger Zone</h2>
        <div className="bg-white p-4 rounded shadow">
          <button className="w-full bg-red-600 text-white px-4 py-2 rounded">Delete Account</button>
        </div>
      </section>

      {showCategoryModal && (
        <CategoryModal
          category={editingItem}
          type={categoryType}
          onClose={() => {
            setShowCategoryModal(false);
            setEditingItem(null);
          }}
          onSave={() => {
            fetchData();
            setShowCategoryModal(false);
            setEditingItem(null);
          }}
        />
      )}

      {showPaymentModal && (
        <PaymentTypeModal
          paymentType={editingItem}
          type={categoryType}
          onClose={() => {
            setShowPaymentModal(false);
            setEditingItem(null);
          }}
          onSave={() => {
            fetchData();
            setShowPaymentModal(false);
            setEditingItem(null);
          }}
        />
      )}
    </div>
  );
};

export default Settings;