import { Category } from '../models/Category.js';

export async function create(data) {
  const category = new Category(data);
  return await category.save();
}

export async function getByAccount(accountId, type = null) {
  const query = { isActive: true };
  if (accountId) query.accountId = accountId;
  if (type) query.type = type;
  return await Category.find(query).sort({ name: 1 });
}

export async function getById(id, accountId) {
  if (accountId) return await Category.findOne({ _id: id, accountId });
  return await Category.findById(id);
}

export async function update(id, accountId, data) {
  if (accountId) {
    return await Category.findOneAndUpdate(
      { _id: id, accountId },
      data,
      { new: true, runValidators: true }
    );
  }
}

export async function softDelete(id, accountId) {
  if (accountId) {
    return await Category.findOneAndUpdate(
      { _id: id, accountId },
      { isActive: false },
      { new: true }
    );
  }
  return await Category.findByIdAndUpdate(id, { isActive: false }, { new: true });
}

export async function hardDelete(id, accountId) {
  if (accountId) return await Category.findOneAndDelete({ _id: id, accountId });
  return await Category.findByIdAndDelete(id);
}

// Named exports only — no default export per project rules