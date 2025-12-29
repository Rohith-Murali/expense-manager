import { PaymentType } from '../models/PaymentType.js';

export async function create(data) {
  const paymentType = new PaymentType(data);
  return await paymentType.save();
}

export async function getByAccount(accountIdOrType, type = null) {
  let accountId = null;
  if (typeof accountIdOrType === 'string' || accountIdOrType === null) {
    if (type === null) {
      type = accountIdOrType;
      accountId = null;
    } else {
      accountId = accountIdOrType;
    }
  }

  const query = { isActive: true };
  if (accountId) query.accountId = accountId;
  if (type) query.type = type;
  return await PaymentType.find(query).sort({ name: 1 });
}

export async function getById(id, accountId) {
  if (accountId) return await PaymentType.findOne({ _id: id, accountId });
  return await PaymentType.findById(id);
}

export async function update(id, accountId, data) {
  if (accountId) {
    return await PaymentType.findOneAndUpdate(
      { _id: id, accountId },
      data,
      { new: true, runValidators: true }
    );
  }
  return await PaymentType.findByIdAndUpdate(id, data, { new: true, runValidators: true });
}

export async function softDelete(id, accountId) {
  if (accountId) {
    return await PaymentType.findOneAndUpdate(
      { _id: id, accountId },
      { isActive: false },
      { new: true }
    );
  }
  return await PaymentType.findByIdAndUpdate(id, { isActive: false }, { new: true });
}

export async function hardDelete(id, accountId) {
  if (accountId) return await PaymentType.findOneAndDelete({ _id: id, accountId });
  return await PaymentType.findByIdAndDelete(id);
}

// Named exports only — no default export per project rules