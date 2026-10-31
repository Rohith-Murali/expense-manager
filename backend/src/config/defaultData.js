export const DEFAULT_CATEGORIES = [
  { name: 'Food & Dining', icon: '🍔', color: '#FF6B6B', type: 'expense' },
  { name: 'Groceries', icon: '🛒', color: '#FFA500', type: 'expense' },
  { name: 'Transport', icon: '🚗', color: '#4A90E2', type: 'expense' },
  { name: 'Bills & Utilities', icon: '🏠', color: '#7B68EE', type: 'expense' },
  { name: 'Health', icon: '💊', color: '#50C878', type: 'expense' },
  { name: 'Others', icon: '🧾', color: '#64748B', type: 'expense' },
  { name: 'Salary', icon: '💰', color: '#50C878', type: 'income' },
  { name: 'Business', icon: '🏢', color: '#4A90E2', type: 'income' },
  { name: 'Freelance', icon: '🧑‍💻', color: '#7B68EE', type: 'income' },
  { name: 'Interest', icon: '🏦', color: '#FFA500', type: 'income' },
  { name: 'Gifts', icon: '🎁', color: '#FF69B4', type: 'income' },
  { name: 'Others', icon: '💵', color: '#10B981', type: 'income' },
];

export const DEFAULT_SUBCATEGORIES = {
  'Food & Dining': ['Restaurants', 'Takeout'],
  Groceries: [ 'Dairy', 'Household'],
  Transport: ['Fuel', 'Public Transit' ],
  'Bills & Utilities': ['Electricity', 'Internet'],
  Health: ['Pharmacy',  'Hospital'],
  Salary: ['Base Salary', 'Bonus' ],
  Business: ['Revenue', 'Client Payment' ],
  Freelance: ['Client Payment', 'Projects' ],
  Interest: ['Bank Interest', 'Investment Interest'],
  Gifts: ['Received', 'Family'],
};

export const DEFAULT_NONE_SUBCATEGORY = {
  name: 'None',
  icon: '⊘',
  color: '#808080',
};

export const DEFAULT_PAYMENT_TYPES = [
  { name: 'UPI', type: 'expense', icon: '📱' },
  { name: 'Credit Card', type: 'expense', icon: '💳' },
  { name: 'Bank Transfer', type: 'expense', icon: '🏦' },
  { name: 'Cash', type: 'expense', icon: '💵' },
  { name: 'Debit Card', type: 'expense', icon: '💳' }, 
  { name: 'Bank Transfer', type: 'income', icon: '🏦' },
  { name: 'Cash', type: 'income', icon: '💵' },
  { name: 'UPI', type: 'income', icon: '📱' }
];

export function getDefaultSubcategoryNames(categoryName = '') {
  return [DEFAULT_NONE_SUBCATEGORY.name, ...(DEFAULT_SUBCATEGORIES[categoryName] || [])];
}
