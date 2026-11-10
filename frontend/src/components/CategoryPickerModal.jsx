import React from 'react';
import { X } from 'lucide-react';
import Icon from './Icon';

const CategoryPickerModal = ({ categories, selectedId, onSelect, onAdd, onClose }) => (
  <div
    className='fixed inset-0 z-[1040] flex items-center justify-center bg-black/50 p-4'
    onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}
  >
    <section
      role='dialog'
      aria-modal='true'
      aria-labelledby='category-picker-title'
      className='w-full max-w-md rounded-xl border border-gray-200 bg-white p-5 text-gray-900 shadow-xl dark:border-slate-700 dark:bg-slate-800 dark:text-gray-100'
    >
      <div className='mb-4 flex items-center justify-between'>
        <h2 id='category-picker-title' className='text-lg font-semibold'>Select category</h2>
        <button type='button' onClick={onClose} aria-label='Close category picker' className='rounded p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-slate-700'>
          <X size={20} />
        </button>
      </div>
      <div className='max-h-[55vh] space-y-1 overflow-y-auto'>
        {categories.map((category) => (
          <button
            type='button'
            key={category._id}
            onClick={() => {
              onSelect(category);
              onClose();
            }}
            className={`flex w-full items-center gap-3 rounded-lg p-3 text-left hover:bg-gray-50 dark:hover:bg-slate-700 ${
              String(category._id) === String(selectedId || '') ? 'bg-indigo-50 dark:bg-indigo-950/50' : ''
            }`}
          >
            <span className='flex h-10 w-10 shrink-0 items-center justify-center rounded-lg' style={{ color: category.color || '#4f46e5', backgroundColor: `${category.color || '#4f46e5'}22` }}>
              <Icon name={category.icon} size={20} />
            </span>
            <span className='font-medium'>{category.name}</span>
          </button>
        ))}
        {!categories.length && <p className='p-3 text-sm text-gray-500 dark:text-gray-400'>No categories are available.</p>}
      </div>
      <div className='mt-4 flex justify-between gap-2 border-t border-gray-200 pt-4 dark:border-slate-700'>
        <button type='button' onClick={onAdd} className='text-sm font-medium text-indigo-600 hover:underline dark:text-indigo-300'>+ Add category</button>
        <button type='button' onClick={onClose} className='rounded-lg border border-gray-300 px-4 py-2 hover:bg-gray-50 dark:border-slate-600 dark:hover:bg-slate-700'>Close</button>
      </div>
    </section>
  </div>
);

export default CategoryPickerModal;
