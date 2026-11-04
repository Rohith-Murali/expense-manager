export const DEFAULT_CATEGORIES = [
  { name: 'Food & Dining', icon: 'food', color: '#FF6B6B', type: 'expense' },
  { name: 'Groceries', icon: 'groceries', color: '#FFA500', type: 'expense' },
  { name: 'Transport', icon: 'transport', color: '#4A90E2', type: 'expense' },
  { name: 'Bills & Utilities', icon: 'bills', color: '#7B68EE', type: 'expense' },
  { name: 'Health', icon: 'health', color: '#50C878', type: 'expense' },
  { name: 'Others', icon: 'other', color: '#64748B', type: 'expense' },
  { name: 'Salary', icon: 'salary', color: '#50C878', type: 'income' },
  { name: 'Business', icon: 'business', color: '#4A90E2', type: 'income' },
  { name: 'Freelance', icon: 'freelance', color: '#7B68EE', type: 'income' },
  { name: 'Interest', icon: 'interest', color: '#FFA500', type: 'income' },
  { name: 'Gifts', icon: 'gift', color: '#FF69B4', type: 'income' },
  { name: 'Others', icon: 'other', color: '#10B981', type: 'income' },
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
  icon: 'none',
  color: '#808080',
};

// Stable Lucide identifiers for seeded subcategories. These are stored in MongoDB.
export const DEFAULT_SUBCATEGORY_ICONS = {
  None: { icon: 'none', color: '#808080' },
  Restaurants: { icon: 'food', color: '#FF6B6B' },
  Takeout: { icon: 'shoppingBag', color: '#F97316' },
  Dairy: { icon: 'groceries', color: '#F59E0B' },
  Household: { icon: 'home', color: '#8B5CF6' },
  Fuel: { icon: 'transport', color: '#4A90E2' },
  'Public Transit': { icon: 'train', color: '#2563EB' },
  Electricity: { icon: 'electricity', color: '#EAB308' },
  Internet: { icon: 'internet', color: '#0EA5E9' },
  Pharmacy: { icon: 'health', color: '#10B981' },
  Hospital: { icon: 'health', color: '#EF4444' },
  'Base Salary': { icon: 'salary', color: '#16A34A' },
  Bonus: { icon: 'badgeDollar', color: '#22C55E' },
  Revenue: { icon: 'business', color: '#2563EB' },
  'Client Payment': { icon: 'cash', color: '#16A34A' },
  Projects: { icon: 'tools', color: '#7C3AED' },
  'Bank Interest': { icon: 'interest', color: '#0F766E' },
  'Investment Interest': { icon: 'coins', color: '#CA8A04' },
  Received: { icon: 'gift', color: '#DB2777' },
  Family: { icon: 'home', color: '#EC4899' },
};

export const DEFAULT_PAYMENT_TYPES = [
  { name: 'UPI', type: 'expense', icon: 'mobile' },
  { name: 'Credit Card', type: 'expense', icon: 'card' },
  { name: 'Bank Transfer', type: 'expense', icon: 'bank' },
  { name: 'Cash', type: 'expense', icon: 'cash' },
  { name: 'Debit Card', type: 'expense', icon: 'card' },
  { name: 'Bank Transfer', type: 'income', icon: 'bank' },
  { name: 'Cash', type: 'income', icon: 'cash' },
  { name: 'UPI', type: 'income', icon: 'mobile' }
];

export function getDefaultSubcategoryNames(categoryName = '') {
  return [DEFAULT_NONE_SUBCATEGORY.name, ...(DEFAULT_SUBCATEGORIES[categoryName] || [])];
}

export function getDefaultSubcategoryData(name) {
  return {
    name,
    ...(DEFAULT_SUBCATEGORY_ICONS[name] || { icon: 'other', color: '#64748B' }),
  };
}
