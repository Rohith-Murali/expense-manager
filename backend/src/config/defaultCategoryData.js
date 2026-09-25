export const DEFAULT_CATEGORIES = [
  { name: 'Food & Dining', icon: '🍔', color: '#FF6B6B', type: 'expense' },
  { name: 'Groceries', icon: '🛒', color: '#FFA500', type: 'expense' },
  { name: 'Transport', icon: '🚗', color: '#4A90E2', type: 'expense' },
  { name: 'Bills & Utilities', icon: '🏠', color: '#7B68EE', type: 'expense' },
  { name: 'Health', icon: '💊', color: '#50C878', type: 'expense' },
  { name: 'Salary', icon: '💰', color: '#50C878', type: 'income' },
  { name: 'Business', icon: '🏢', color: '#4A90E2', type: 'income' },
  { name: 'Freelance', icon: '🧑‍💻', color: '#7B68EE', type: 'income' },
  { name: 'Interest', icon: '🏦', color: '#FFA500', type: 'income' },
  { name: 'Gifts', icon: '🎁', color: '#FF69B4', type: 'income' },
];

export const DEFAULT_SUBCATEGORIES = {
  'Food & Dining': ['Restaurants', 'Fast Food', 'Cafes', 'Takeout'],
  Groceries: ['Produce', 'Dairy', 'Meat', 'Household'],
  Transport: ['Fuel', 'Public Transit', 'Taxi & Rideshare', 'Parking'],
  'Bills & Utilities': ['Electricity', 'Water', 'Internet', 'Mobile', 'Rent'],
  Health: ['Pharmacy', 'Doctor', 'Hospital', 'Insurance'],
  Salary: ['Base Salary', 'Bonus', 'Commission'],
  Business: ['Revenue', 'Client Payment', 'Reimbursement'],
  Freelance: ['Client Payment', 'Projects', 'Consulting'],
  Interest: ['Bank Interest', 'Investment Interest'],
  Gifts: ['Received', 'Family', 'Friends'],
};

export const DEFAULT_NONE_SUBCATEGORY = {
  name: 'None',
  icon: '⊘',
  color: '#808080',
};
