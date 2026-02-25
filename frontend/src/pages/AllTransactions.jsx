import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Search, Filter, X, ArrowLeft } from 'lucide-react';
import api from '../services/api';
import TransactionCard from '../components/TransactionCard';
import FilterModal from '../components/FilterModal';
// Converted to Tailwind: removed AllTransactions.css

const AllTransactions = () => {
  const navigate = useNavigate();
  const {accountId} = useParams();
  const [transactions, setTransactions] = useState([]);
  const [filteredTransactions, setFilteredTransactions] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    type: '',
    categoryId: '',
    startDate: '',
    endDate: '',
    minAmount: '',
    maxAmount: ''
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTransactions();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [transactions, searchTerm, filters]);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/account/${accountId}/transactions`, { 
        params: { limit: 1000 } 
      });
      setTransactions(response.data);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...transactions];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(t => 
        t.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.categoryId?.name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Type filter - handle backward compatibility
    if (filters.type) {
      if (filters.type === 'transfer') {
        // Include both transfer-out and transfer-in when user selects 'transfer'
        filtered = filtered.filter(t => t.type === 'transfer-out' || t.type === 'transfer-in');
      } else {
        filtered = filtered.filter(t => t.type === filters.type);
      }
    }

    // Category filter
    if (filters.categoryId) {
      filtered = filtered.filter(t => t.categoryId?._id === filters.categoryId);
    }

    // Date filters
    if (filters.startDate) {
      filtered = filtered.filter(t => 
        new Date(t.date) >= new Date(filters.startDate)
      );
    }
    if (filters.endDate) {
      filtered = filtered.filter(t => 
        new Date(t.date) <= new Date(filters.endDate)
      );
    }

    // Amount filters - use absolute value since amounts can be negative
    if (filters.minAmount) {
      filtered = filtered.filter(t => Math.abs(t.amount) >= parseFloat(filters.minAmount));
    }
    if (filters.maxAmount) {
      filtered = filtered.filter(t => Math.abs(t.amount) <= parseFloat(filters.maxAmount));
    }

    setFilteredTransactions(filtered);
  };

  const clearFilters = () => {
    setFilters({
      type: '',
      categoryId: '',
      startDate: '',
      endDate: '',
      minAmount: '',
      maxAmount: ''
    });
    setSearchTerm('');
  };

  const activeFilterCount = Object.values(filters).filter(v => v !== '').length;

  return (
    <div className="min-h-screen p-6 bg-gray-50 text-gray-800">
      <header className="flex items-center gap-4 mb-4">
        <button className="p-2 rounded-md hover:bg-gray-100" onClick={() => navigate(-1)}>
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-2xl font-semibold">All Transactions</h1>
      </header>

      <div className="flex items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-3 bg-white border rounded px-3 py-2 shadow-sm w-full max-w-xl">
          <Search size={20} />
          <input
            type="text"
            placeholder="Search transactions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full outline-none"
          />
        </div>

        <button
          className="inline-flex items-center gap-2 bg-white border px-3 py-2 rounded hover:shadow"
          onClick={() => setShowFilters(true)}
        >
          <Filter size={20} />
          Filters
          {activeFilterCount > 0 && (
            <span className="ml-2 inline-flex items-center justify-center bg-indigo-600 text-white text-xs px-2 py-0.5 rounded">{activeFilterCount}</span>
          )}
        </button>
      </div>

      {activeFilterCount > 0 && (
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-gray-600">Active Filters:</span>
          <button className="inline-flex items-center gap-2 text-sm text-gray-600" onClick={clearFilters}>
            <X size={16} />
            Clear All
          </button>
        </div>
      )}

      <div className="text-sm text-gray-600 mb-3">{filteredTransactions.length} transactions found</div>

      {loading ? (
        <div className="text-center text-gray-500">Loading...</div>
      ) : filteredTransactions.length === 0 ? (
        <div className="text-center text-gray-500">No transactions found</div>
      ) : (
        <div className="space-y-3">
          {filteredTransactions.map(transaction => (
            <TransactionCard
              key={transaction._id}
              transaction={transaction}
              onClick={() => navigate(`/accounts/${accountId}/transaction/${transaction._id}`)}
            />
          ))}
        </div>
      )}

      {showFilters && (
        <FilterModal
          filters={filters}
          onApply={setFilters}
          onClose={() => setShowFilters(false)}
        />
      )}
    </div>
  );
};

export default AllTransactions;