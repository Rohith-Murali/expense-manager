import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';

const AllAccountsFilterModal = ({
  filters,
  onApply,
  onClose,
  showType = true,
  typeOptions = [
    { value: '', label: 'All' },
    { value: 'expense', label: 'Expense' },
    { value: 'income', label: 'Income' },
    { value: 'transfer', label: 'Transfer (all)' },
  ],
}) => {
  const [localFilters, setLocalFilters] = useState(filters);

  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  const handleApply = () => {
    onApply(localFilters);
    onClose();
  };

  const handleReset = () => {
    setLocalFilters({
      type: showType ? '' : filters.type || '',
      startDate: '',
      endDate: '',
      minAmount: '',
      maxAmount: '',
    });
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
          <h2 className='text-lg font-semibold'>Filter Transactions</h2>
          <button className='p-2 rounded-md hover:bg-gray-100' onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <div className='space-y-4'>
          {showType && (
            <div>
              <label className='block text-sm font-medium mb-1'>Type</label>
              <select
                value={localFilters.type}
                onChange={(e) => setLocalFilters({ ...localFilters, type: e.target.value })}
                className='input'
              >
                {typeOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className='grid grid-cols-2 gap-4'>
            <div>
              <label className='block text-sm font-medium mb-1'>Start Date</label>
              <input
                type='date'
                value={localFilters.startDate}
                onChange={(e) => setLocalFilters({ ...localFilters, startDate: e.target.value })}
                className='input'
              />
            </div>

            <div>
              <label className='block text-sm font-medium mb-1'>End Date</label>
              <input
                type='date'
                value={localFilters.endDate}
                onChange={(e) => setLocalFilters({ ...localFilters, endDate: e.target.value })}
                className='input'
              />
            </div>
          </div>

          <div className='grid grid-cols-2 gap-4'>
            <div>
              <label className='block text-sm font-medium mb-1'>Min Amount</label>
              <input
                type='number'
                value={localFilters.minAmount}
                onChange={(e) => setLocalFilters({ ...localFilters, minAmount: e.target.value })}
                placeholder='0'
                className='input'
              />
            </div>

            <div>
              <label className='block text-sm font-medium mb-1'>Max Amount</label>
              <input
                type='number'
                value={localFilters.maxAmount}
                onChange={(e) => setLocalFilters({ ...localFilters, maxAmount: e.target.value })}
                placeholder='10000'
                className='input'
              />
            </div>
          </div>
        </div>

        <div className='flex justify-end gap-3 mt-6'>
          <button className='btn btn-outline' onClick={handleReset}>
            Reset
          </button>
          <button className='btn btn-primary' onClick={handleApply}>
            Apply Filters
          </button>
        </div>
      </div>
    </div>
  );
};

export default AllAccountsFilterModal;
