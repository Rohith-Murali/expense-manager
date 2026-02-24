import { Category } from '../models/Category.js';
import { Account } from '../models/Account.js';
import { ApiError } from '../utils/ApiError.js';

/**
 * Verify that user owns the account
 */
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

export async function create(userId, accountId, data) {
  // Verify account ownership
  await assertAccountOwnership(accountId, userId);

  const category = new Category({
    ...data,
    accountId
  });
  return await category.save();
}

export async function getByAccount(userId, accountId, type = null) {
  // Verify account ownership
  await assertAccountOwnership(accountId, userId);

  const query = { accountId, isActive: true };
  if (type) query.type = type;
  return await Category.find(query).sort({ name: 1 });
}

export async function getById(userId, id, accountId) {
  // Verify account ownership
  await assertAccountOwnership(accountId, userId);

  const category = await Category.findOne({ _id: id, accountId });
  if (!category) {
    throw new ApiError(404, 'Category not found');
  }
  return category;
}

export async function update(userId, id, accountId, data) {
  // Verify account ownership
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
  // Verify account ownership
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
  // Verify account ownership
  await assertAccountOwnership(accountId, userId);

  const category = await Category.findOneAndDelete({ _id: id, accountId });

  if (!category) {
    throw new ApiError(404, 'Category not found');
  }

  return category;
}

// Named exports only — no default export per project rules