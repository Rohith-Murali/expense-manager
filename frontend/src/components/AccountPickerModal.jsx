import React from 'react';
import { Check, X } from 'lucide-react';
import Icon from './Icon';
import { ACCOUNT_TYPE_ICONS } from '../config/iconRegistry';

const AccountPickerModal = ({ title, accounts, selectedId, onSelect, onClose }) => (
  <div
    className='fixed inset-0 z-[1040] flex items-center justify-center bg-black/50 p-4'
    onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}
  >
    <section
      role='dialog'
      aria-modal='true'
      aria-labelledby='account-picker-title'
      className='w-full max-w-md rounded-xl border border-gray-200 bg-white p-5 text-gray-900 shadow-xl dark:border-slate-700 dark:bg-slate-800 dark:text-gray-100'
    >
      <div className='mb-4 flex items-center justify-between'>
        <h2 id='account-picker-title' className='text-lg font-semibold'>{title}</h2>
        <button type='button' onClick={onClose} aria-label='Close account picker' className='rounded p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-slate-700'>
          <X size={20} />
        </button>
      </div>
      <div className='max-h-[55vh] space-y-1 overflow-y-auto'>
        {accounts.map((account) => {
          const icon = account.icon || ACCOUNT_TYPE_ICONS[account.type] || 'wallet';
          const selected = String(account._id) === String(selectedId || '');
          return (
            <button
              type='button'
              key={account._id}
              onClick={() => {
                onSelect(account._id);
                onClose();
              }}
              aria-pressed={selected}
              className={`flex w-full items-center gap-3 rounded-lg p-3 text-left hover:bg-gray-50 dark:hover:bg-slate-700 ${
                selected ? 'bg-indigo-50 dark:bg-indigo-950/50' : ''
              }`}
            >
              <span className='flex h-10 w-10 shrink-0 items-center justify-center rounded-lg' style={{ color: account.color || '#4f46e5', backgroundColor: `${account.color || '#4f46e5'}22` }}>
                <Icon name={icon} size={20} />
              </span>
              <span className='min-w-0 flex-1'>
                <span className='block truncate font-medium'>{account.name}</span>
                <span className='block truncate text-sm text-gray-500 dark:text-gray-400'>
                  {[account.type?.replaceAll('_', ' '), account.currency, typeof account.currentBalance !== 'undefined' ? `₹${account.currentBalance}` : null]
                    .filter(Boolean)
                    .join(' · ')}
                </span>
              </span>
              {selected && <Check size={18} className='shrink-0 text-indigo-600 dark:text-indigo-300' />}
            </button>
          );
        })}
        {!accounts.length && (
          <p className='p-3 text-sm text-gray-500 dark:text-gray-400'>No accounts are available.</p>
        )}
      </div>
      <div className='mt-4 flex justify-end border-t border-gray-200 pt-4 dark:border-slate-700'>
        <button type='button' onClick={onClose} className='rounded-lg border border-gray-300 px-4 py-2 hover:bg-gray-50 dark:border-slate-600 dark:hover:bg-slate-700'>
          Cancel
        </button>
      </div>
    </section>
  </div>
);

export default AccountPickerModal;
