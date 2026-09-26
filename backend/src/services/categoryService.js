import { Category } from '../models/Category.js';
import { Account } from '../models/Account.js';
import { Subcategory } from '../models/Subcategory.js';
import { ApiError } from '../utils/ApiError.js';
import {
  DEFAULT_CATEGORIES,
  DEFAULT_SUBCATEGORIES,
  DEFAULT_NONE_SUBCATEGORY,
} from '../config/defaultCategoryData.js';

async function assertAccountOwnership(accountId, userId) {
  const account = await Account.findOne({
    _id: accountId,
    userId,
    isDeleted: false,
  });

  if (!account) {
    throw new ApiError(403, 'Access denied: Account not found or does not belong to you');
  }

  return account;
}

function normalizeName(value) {
  return String(value || '')
    .trim()
    .toLowerCase();
}

export async function create(userId, accountId, data) {
  await assertAccountOwnership(accountId, userId);

  const category = new Category({
    ...data,
    accountId,
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

  const category = await Category.findOneAndUpdate({ _id: id, accountId }, data, {
    new: true,
    runValidators: true,
  });

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
    { new: true },
  );

  if (!category) {
    throw new ApiError(404, 'Category not found');
  }

  await Subcategory.updateMany(
    { parentCategoryId: id, accountId, isActive: true },
    { isActive: false },
  );

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

  const existing = await Category.find({ accountId }, { name: 1, type: 1 }).lean();

  const existingKeys = new Set(existing.map((item) => `${normalizeName(item.name)}::${item.type}`));

  const created = [];
  let subcategoriesCreated = 0;

  for (const item of DEFAULT_CATEGORIES) {
    const key = `${normalizeName(item.name)}::${item.type}`;
    if (existingKeys.has(key)) {
      continue;
    }

    try {
      const category = await Category.create({
        ...item,
        accountId,
      });
      created.push(category);
      existingKeys.add(key);
      subcategoriesCreated += await ensureDefaultSubcategoriesForCategory(category);
    } catch (error) {
      if (error?.code === 11000) {
        existingKeys.add(key);
        continue;
      }
      throw error;
    }
  }

  const existingDefaultCategories = await Category.find({
    accountId,
    isActive: true,
    name: { $in: DEFAULT_CATEGORIES.map((item) => item.name) },
  });

  for (const category of existingDefaultCategories) {
    subcategoriesCreated += await ensureDefaultSubcategoriesForCategory(category);
  }

  return { created: created.length, subcategoriesCreated };
}

async function ensureDefaultSubcategoriesForCategory(category) {
  const names = [DEFAULT_NONE_SUBCATEGORY.name, ...(DEFAULT_SUBCATEGORIES[category.name] || [])];
  let created = 0;

  for (const name of names) {
    const existing = await Subcategory.exists({
      accountId: category.accountId,
      parentCategoryId: category._id,
      name,
    });

    if (existing) continue;

    const isNone = name === DEFAULT_NONE_SUBCATEGORY.name;
    await Subcategory.create({
      name,
      parentCategoryId: category._id,
      accountId: category.accountId,
      ...(isNone ? DEFAULT_NONE_SUBCATEGORY : {}),
    });
    created += 1;
  }

  return created;
}
