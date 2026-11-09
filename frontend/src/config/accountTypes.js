export const ACCOUNT_TYPE_OPTIONS = [
  { value: 'CASH', label: 'Cash', icon: 'cash' },
  { value: 'BANK', label: 'Bank Account', icon: 'bank' },
  { value: 'SAVINGS', label: 'Savings Account', icon: 'savings' },
  { value: 'INVESTMENTS', label: 'Investments', icon: 'coins' },
  { value: 'CARD', label: 'Debit Card', icon: 'card' },
  { value: 'CREDIT_CARD', label: 'Credit Card', icon: 'card' },
  { value: 'WALLET', label: 'Digital Wallet', icon: 'mobile' },
  { value: 'OTHER', label: 'Other', icon: 'wallet' },
];

export const ACCOUNT_TYPES = ACCOUNT_TYPE_OPTIONS.map(({ value }) => value);

export const ACCOUNT_TYPE_LABELS = Object.fromEntries(
  ACCOUNT_TYPE_OPTIONS.map(({ value, label }) => [value, label]),
);

export const ACCOUNT_TYPE_ICONS = Object.fromEntries(
  ACCOUNT_TYPE_OPTIONS.map(({ value, icon }) => [value, icon]),
);
