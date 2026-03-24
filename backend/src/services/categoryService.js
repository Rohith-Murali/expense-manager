import { Category } from '../models/Category.js';
import { Account } from '../models/Account.js';
import { ApiError } from '../utils/ApiError.js';

const DEFAULT_CATEGORIES = [
  { name: 'Food & Dining', icon: '🍔', color: '#FF6B6B', type: 'expense' },
  { name: 'Groceries', icon: '🛒', color: '#FFA500', type: 'expense' },
  { name: 'Transport', icon: '🚗', color: '#4A90E2', type: 'expense' },
  { name: 'Bills & Utilities', icon: '🏠', color: '#7B68EE', type: 'expense' },
  { name: 'Health', icon: '💊', color: '#50C878', type: 'expense' },
  { name: 'Salary', icon: '💰', color: '#50C878', type: 'income' },
  { name: 'Business', icon: '🏢', color: '#4A90E2', type: 'income' },
  { name: 'Freelance', icon: '🧑‍💻', color: '#7B68EE', type: 'income' },
  { name: 'Interest', icon: '🏦', color: '#FFA500', type: 'income' },
  { name: 'Gifts', icon: '🎁', color: '#FF69B4', type: 'income' }
];

async function assertAccountOwnership(accountId, userId) {
  const account = await Account.findOne({
    _id: accountId,
    userId,
    isDeleted: false
  });

  if (!account) {
    throw new ApiError(403, 'Access denied: Account not found or does not belong to you');
  }

  return account;
}

function normalizeName(value) {
  return String(value || '').trim().toLowerCase();
}

export async function create(userId, accountId, data) {
  await assertAccountOwnership(accountId, userId);

  const category = new Category({
    ...data,
    accountId
  });
  return await category.save();
}

export async function getByAccount(userId, accountId, type = null) {
  await assertAccountOwnership(accountId, userId);

  const query = { accountId, isActive: true };
  if (type) query.type = type;
  return await Category.find(query).sort({ name: 1 });
}

export async function getById(userId, id, accountId) {
  await assertAccountOwnership(accountId, userId);

  const category = await Category.findOne({ _id: id, accountId });
  if (!category) {
    throw new ApiError(404, 'Category not found');
  }
  return category;
}

export async function update(userId, id, accountId, data) {
  await assertAccountOwnership(accountId, userId);

  const category = await Category.findOneAndUpdate(
    { _id: id, accountId },
    data,
    { new: true, runValidators: true }
  );

  if (!category) {
    throw new ApiError(404, 'Category not found');
  }

  return category;
}

export async function softDelete(userId, id, accountId) {
  await assertAccountOwnership(accountId, userId);

  const category = await Category.findOneAndUpdate(
    { _id: id, accountId },
    { isActive: false },
    { new: true }
  );

  if (!category) {
    throw new ApiError(404, 'Category not found');
  }

  return category;
}

export async function hardDelete(userId, id, accountId) {
  await assertAccountOwnership(accountId, userId);

  const category = await Category.findOneAndDelete({ _id: id, accountId });

  if (!category) {
    throw new ApiError(404, 'Category not found');
  }

  return category;
}

export async function ensureDefaultCategories(userId, accountId) {
  await assertAccountOwnership(accountId, userId);

  const existing = await Category.find(
    { accountId },
    { name: 1, type: 1 }
  ).lean();

  const existingKeys = new Set(
    existing.map((item) => `${normalizeName(item.name)}::${item.type}`)
  );

  const created = [];

  for (const item of DEFAULT_CATEGORIES) {
    const key = `${normalizeName(item.name)}::${item.type}`;
    if (existingKeys.has(key)) {
      continue;
    }

    try {
      const category = await Category.create({
        ...item,
        accountId
      });
      created.push(category);
      existingKeys.add(key);
    } catch (error) {
      if (error?.code === 11000) {
        existingKeys.add(key);
        continue;
      }
      throw error;
    }
  }

  return created;
}
