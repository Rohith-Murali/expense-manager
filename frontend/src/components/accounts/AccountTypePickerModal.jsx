import React from 'react';
import { Check, X } from 'lucide-react';
import Icon from '../Icon';
import { ACCOUNT_TYPE_OPTIONS } from '../../config/accountTypes';

const AccountTypePickerModal = ({ selectedType, onSelect, onClose }) => (
  <div
    className='fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4'
    onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}
  >
    <section
      role='dialog'
      aria-modal='true'
      aria-labelledby='account-type-picker-title'
      className='w-full max-w-md rounded-xl border border-gray-200 bg-white p-5 text-gray-900 shadow-xl dark:border-slate-700 dark:bg-slate-800 dark:text-gray-100'
    >
      <div className='mb-4 flex items-center justify-between'>
        <h2 id='account-type-picker-title' className='text-lg font-semibold'>
          Select account type
        </h2>
        <button
          type='button'
          onClick={onClose}
          aria-label='Close account type picker'
          className='rounded p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-slate-700'
        >
          <X size={20} />
        </button>
      </div>
      <div className='grid grid-cols-2 gap-2'>
        {ACCOUNT_TYPE_OPTIONS.map((type) => {
          const selected = type.value === selectedType;
          return (
            <button
              type='button'
              key={type.value}
              onClick={() => {
                onSelect(type.value);
                onClose();
              }}
              aria-pressed={selected}
              className={`flex min-h-20 items-center gap-3 rounded-xl border p-3 text-left transition hover:border-indigo-400 hover:bg-indigo-50 dark:hover:bg-slate-700 ${
                selected
                  ? 'border-indigo-500 bg-indigo-50 dark:border-indigo-400 dark:bg-indigo-950/50'
                  : 'border-gray-200 dark:border-slate-600'
              }`}
            >
              <span className='flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300'>
                <Icon name={type.icon} size={20} />
              </span>
              <span className='min-w-0 flex-1 text-sm font-medium'>{type.label}</span>
              {selected && <Check size={17} className='shrink-0 text-indigo-600 dark:text-indigo-300' />}
            </button>
          );
        })}
      </div>
      <div className='mt-4 flex justify-end border-t border-gray-200 pt-4 dark:border-slate-700'>
        <button
          type='button'
          onClick={onClose}
          className='rounded-lg border border-gray-300 px-4 py-2 hover:bg-gray-50 dark:border-slate-600 dark:hover:bg-slate-700'
        >
          Cancel
        </button>
      </div>
    </section>
  </div>
);

export default AccountTypePickerModal;
