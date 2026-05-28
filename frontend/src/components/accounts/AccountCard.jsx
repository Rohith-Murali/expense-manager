import React from 'react';
import { formatCurrency } from '../../utils/helpers';

const AccountCard = ({ account, onEdit, onDelete, onClick }) => {
  const getTypeIcon = (type) => {
    switch (type) {
      case 'CASH':
        return '💵';
      case 'BANK':
        return '🏦';
      case 'CARD':
        return '💳';
      case 'WALLET':
        return '📱';
      default:
        return '💼';
    }
  };

  return (
    <div className='card card-hover cursor-pointer relative group' onClick={onClick}>
      <div
        className='absolute top-0 left-0 right-0 h-1 rounded-t-xl'
        style={{ backgroundColor: account.color }}
      />

      <div className='pt-2'>
        <div className='flex items-start justify-between mb-3'>
          <div className='flex items-center gap-3'>
            <div
              className='w-12 h-12 rounded-xl flex items-center justify-center text-2xl'
              style={{ backgroundColor: `${account.color}20` }}
            >
              {getTypeIcon(account.type)}
            </div>
            <div>
              <h3 className='font-semibold text-gray-900'>{account.name}</h3>
              <p className='text-sm text-gray-500'>{account.type}</p>
            </div>
          </div>

          <div className='flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity'>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit(account);
              }}
              className='p-2 hover:bg-primary-50 rounded-lg transition-colors'
              title='Edit Account'
            >
              <svg
                className='w-4 h-4 text-primary-600'
                fill='none'
                stroke='currentColor'
                viewBox='0 0 24 24'
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z'
                />
              </svg>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(account);
              }}
              className='p-2 hover:bg-red-50 rounded-lg transition-colors'
              title='Delete Account'
            >
              <svg
                className='w-4 h-4 text-red-600'
                fill='none'
                stroke='currentColor'
                viewBox='0 0 24 24'
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16'
                />
              </svg>
            </button>
          </div>
        </div>

        <div className='mt-4 pt-4 border-t border-gray-100'>
          <div className='flex items-baseline justify-between'>
            <span className='text-sm text-gray-500'>Current Balance</span>
            <span className='text-xl font-bold text-gray-900'>
              {formatCurrency(account.currentBalance || account.openingBalance)}
            </span>
          </div>
          {account.description && (
            <p className='text-xs text-gray-500 mt-2 line-clamp-2'>{account.description}</p>
          )}
        </div>

        {account.isArchived && (
          <div className='mt-3'>
            <span className='inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-700'>
              Archived
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default AccountCard;
