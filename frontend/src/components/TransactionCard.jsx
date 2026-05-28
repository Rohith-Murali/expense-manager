import React from 'react';
import { ArrowUpRight, ArrowDownLeft, ArrowRightLeft } from 'lucide-react';

const TransactionCard = ({ transaction, onClick }) => {
  const getIcon = () => {
    switch (transaction.type) {
      case 'income':
        return <ArrowDownLeft className='text-green-600' />;
      case 'expense':
        return <ArrowUpRight className='text-red-600' />;
      case 'transfer-out':
        return <ArrowRightLeft className='text-primary-600' />;
      case 'transfer-in':
        return <ArrowRightLeft className='text-primary-600 transform rotate-180' />;
      default:
        return null;
    }
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const getDisplayLabel = () => {
    if (transaction.type === 'transfer-out' || transaction.type === 'transfer-in') {
      return 'Transfer';
    }
    return transaction.categoryId?.name || transaction.type;
  };

  const getAmountDisplay = () => {
    const amount = Math.abs(transaction.amount);
    if (transaction.type === 'expense') {
      return { prefix: '-', color: 'text-red-600' };
    } else if (transaction.type === 'income') {
      return { prefix: '+', color: 'text-green-600' };
    } else if (transaction.type === 'transfer-out') {
      return { prefix: '-', color: 'text-red-600' };
    } else if (transaction.type === 'transfer-in') {
      return { prefix: '+', color: 'text-green-600' };
    }
    return { prefix: '', color: 'text-gray-600' };
  };

  const display = getAmountDisplay();

  return (
    <div
      className='flex items-center justify-between bg-white p-3 rounded shadow-card hover:shadow-card-hover cursor-pointer'
      onClick={onClick}
    >
      <div className='flex items-center gap-3'>
        <div className='w-10 h-10 rounded-md flex items-center justify-center bg-primary-50 text-primary-600'>
          {getIcon()}
        </div>
        <div>
          <div className='font-medium'>{getDisplayLabel()}</div>
          <div className='text-sm text-gray-500'>
            {transaction.__accountName ? `${transaction.__accountName} • ` : ''}
            {formatDate(transaction.date)}
            {transaction.description && ` • ${transaction.description}`}
          </div>
        </div>
      </div>

      <div className={`font-semibold ${display.color}`}>
        {display.prefix}₹{Math.abs(transaction.amount).toFixed(2)}
      </div>
    </div>
  );
};

export default TransactionCard;
