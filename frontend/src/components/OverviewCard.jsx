import React from 'react';
import { TrendingUp, TrendingDown, Wallet } from 'lucide-react';

const OverviewCard = ({ type, amount, count }) => {
  const getIcon = () => {
    switch (type) {
      case 'income': return <TrendingDown className="text-green-600" />;
      case 'expense': return <TrendingUp className="text-red-600" />;
      case 'balance': return <Wallet className="text-primary-600" />;
      default: return null;
    }
  };

  const getTitle = () => {
    switch (type) {
      case 'income': return 'Total Income';
      case 'expense': return 'Total Expense';
      case 'balance': return 'Balance';
      default: return '';
    }
  };

  return (
    <div className="bg-white p-4 rounded shadow-card flex items-center gap-4">
      <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${type === 'income' ? 'bg-green-50 text-green-600' : type === 'expense' ? 'bg-red-50 text-red-600' : 'bg-primary-50 text-primary-600'}`}>
        {getIcon()}
      </div>
      <div>
        <div className="text-sm text-gray-600">{getTitle()}</div>
        <div className="text-xl font-semibold">₹{amount.toFixed(2)}</div>
        {count !== undefined && (
          <div className="text-sm text-gray-500">{count} transactions</div>
        )}
      </div>
    </div>
  );
};

export default OverviewCard;