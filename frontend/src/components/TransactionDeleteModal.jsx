import React from 'react';
import { AlertTriangle } from 'lucide-react';

const TransactionDeleteModal = ({
  isOpen,
  transactionCount = 1,
  isDeleting = false,
  onCancel,
  onConfirm,
}) => {
  if (!isOpen) return null;

  const isMultiple = transactionCount !== 1;

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4'>
      <div
        className='w-full max-w-md rounded-lg bg-white dark:bg-slate-800 p-5 sm:p-6 shadow-lg text-gray-900 dark:text-gray-100'
        role='dialog'
        aria-modal='true'
        aria-labelledby='delete-transactions-title'
      >
        <div className='mb-4 flex items-center justify-center'>
          <span className='flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600'>
            <AlertTriangle size={24} />
          </span>
        </div>
        <h2 id='delete-transactions-title' className='mb-2 text-center text-lg font-semibold'>
          Delete {isMultiple ? `${transactionCount} transactions` : 'transaction'}?
        </h2>
        <p className='mb-6 text-center text-sm text-gray-600 dark:text-gray-300'>
          This action cannot be undone.
        </p>
        <div className='flex flex-col-reverse sm:flex-row justify-end gap-2'>
          <button
            type='button'
            className='rounded bg-gray-100 dark:bg-slate-700 px-3 py-2 text-gray-800 dark:text-gray-100 disabled:opacity-50'
            onClick={onCancel}
            disabled={isDeleting}
          >
            Cancel
          </button>
          <button
            type='button'
            className='rounded bg-red-600 px-3 py-2 text-white disabled:cursor-not-allowed disabled:opacity-50'
            onClick={onConfirm}
            disabled={isDeleting}
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TransactionDeleteModal;
