import React from 'react';
import { ArrowUpRight, ArrowDownLeft, ArrowRightLeft } from 'lucide-react';

const TransactionCard = ({ transaction, onClick }) => {
  const getIcon = () => {
    switch (transaction.type) {
      case 'income': return <ArrowDownLeft className="text-green-600" />;
      case 'expense': return <ArrowUpRight className="text-red-600" />;
      case 'transfer': return <ArrowRightLeft className="text-primary-600" />;
      default: return null;
    }
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    });
  };

  return (
    <div
      className="flex items-center justify-between bg-white p-3 rounded shadow-card hover:shadow-card-hover cursor-pointer"
      onClick={onClick}
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-md flex items-center justify-center bg-primary-50 text-primary-600">
          {getIcon()}
        </div>
        <div>
          <div className="font-medium">{transaction.categoryId?.name || transaction.type}</div>
          <div className="text-sm text-gray-500">{formatDate(transaction.date)}{transaction.description && ` • ${transaction.description}`}</div>
        </div>
      </div>

      <div className={`font-semibold ${transaction.type === 'expense' ? 'text-red-600' : 'text-green-600'}`}>
        {transaction.type === 'expense' ? '-' : '+'}₹{transaction.amount.toFixed(2)}
      </div>
    </div>
  );
};

export default TransactionCard;