import React from 'react';
import { ArrowRightLeft } from 'lucide-react';
import Icon from './Icon';

const TransactionCard = ({ transaction, onClick, selected, onSelect }) => {
  const getIcon = () => {
    if (transaction.type === 'income' || transaction.type === 'expense') {
      return <Icon name={transaction.categoryId?.icon} size={21} />;
    }
    switch (transaction.type) {
      case 'transfer-out':
        return <ArrowRightLeft className='text-primary-600' />;
      case 'transfer-in':
        return <ArrowRightLeft className='text-primary-600 transform rotate-180' />;
      default:
        return null;
    }
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const getDisplayLabel = () => {
    if (transaction.type === 'transfer-out' || transaction.type === 'transfer-in') {
      return 'Transfer';
    }
    const categoryName = transaction.categoryId?.name || transaction.type;
    const subcategoryName = transaction.subcategoryId?.name;
    return subcategoryName ? `${categoryName} · ${subcategoryName}` : categoryName;
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
  const categoryColor = transaction.categoryId?.color;
  const iconTone =
    transaction.type === 'income'
      ? 'text-green-600'
      : transaction.type === 'expense'
        ? 'text-red-600'
        : 'text-primary-600';

  return (
    <div
      className={`flex items-center justify-between bg-white p-3 rounded shadow-card hover:shadow-card-hover ${onSelect ? '' : 'cursor-pointer'} ${selected ? 'ring-2 ring-indigo-500' : ''}`}
      onClick={onClick}
    >
      <div className='flex min-w-0 items-center gap-3'>
        {onSelect && (
          <input
            type='checkbox'
            checked={selected}
            onChange={() => onSelect(transaction._id)}
            onClick={(event) => event.stopPropagation()}
            aria-label={`Select transaction ${transaction.description || getDisplayLabel()}`}
            className='h-4 w-4 shrink-0 accent-indigo-600'
          />
        )}
        <div
          className={`w-10 h-10 rounded-md flex items-center justify-center bg-primary-50 ${iconTone}`}
          style={
            categoryColor
              ? { color: categoryColor, backgroundColor: `${categoryColor}18` }
              : undefined
          }
        >
          {getIcon()}
        </div>
        <div>
          <div
            className={`font-medium ${transaction.type === 'income' ? 'text-green-600' : transaction.type === 'expense' ? 'text-red-600' : ''}`}
          >
            {getDisplayLabel()}
          </div>
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
