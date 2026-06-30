import { PaymentType } from '../models/PaymentType.js';
import { Account } from '../models/Account.js';
import { ApiError } from '../utils/ApiError.js';

const DEFAULT_PAYMENT_TYPES = [
  { name: 'Cash', type: 'expense', icon: '💵' },
  { name: 'UPI', type: 'expense', icon: '📱' },
  { name: 'Debit Card', type: 'expense', icon: '💳' },
  { name: 'Credit Card', type: 'expense', icon: '💳' },
  { name: 'Bank Transfer', type: 'expense', icon: '🏦' },
  { name: 'Bank Transfer', type: 'income', icon: '🏦' },
  { name: 'Cash', type: 'income', icon: '💵' },
  { name: 'UPI', type: 'income', icon: '📱' },
  { name: 'Cheque', type: 'income', icon: '🧾' },
  { name: 'Card Settlement', type: 'income', icon: '💸' },
];

/**
 * Verify that user owns the account
 */
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

  const paymentType = new PaymentType({
    ...data,
    accountId,
  });
  return await paymentType.save();
}

export async function getByAccount(userId, accountId, type = null) {
  await assertAccountOwnership(accountId, userId);

  const query = { accountId, isActive: true };
  if (type) query.type = type;
  return await PaymentType.find(query).sort({ name: 1 });
}

export async function getById(userId, id, accountId) {
  await assertAccountOwnership(accountId, userId);

  const paymentType = await PaymentType.findOne({ _id: id, accountId });
  if (!paymentType) {
    throw new ApiError(404, 'Payment type not found');
  }
  return paymentType;
}

export async function update(userId, id, accountId, data) {
  await assertAccountOwnership(accountId, userId);

  const paymentType = await PaymentType.findOneAndUpdate({ _id: id, accountId }, data, {
    new: true,
    runValidators: true,
  });

  if (!paymentType) {
    throw new ApiError(404, 'Payment type not found');
  }

  return paymentType;
}

export async function softDelete(userId, id, accountId) {
  await assertAccountOwnership(accountId, userId);

  const paymentType = await PaymentType.findOneAndUpdate(
    { _id: id, accountId },
    { isActive: false },
    { new: true },
  );

  if (!paymentType) {
    throw new ApiError(404, 'Payment type not found');
  }

  return paymentType;
}

export async function hardDelete(userId, id, accountId) {
  await assertAccountOwnership(accountId, userId);

  const paymentType = await PaymentType.findOneAndDelete({ _id: id, accountId });

  if (!paymentType) {
    throw new ApiError(404, 'Payment type not found');
  }

  return paymentType;
}

export async function ensureDefaultPaymentTypes(userId, accountId) {
  await assertAccountOwnership(accountId, userId);

  const existing = await PaymentType.find({ accountId }, { name: 1, type: 1 }).lean();

  const existingKeys = new Set(existing.map((item) => `${normalizeName(item.name)}::${item.type}`));

  const created = [];

  for (const item of DEFAULT_PAYMENT_TYPES) {
    const key = `${normalizeName(item.name)}::${item.type}`;
    if (existingKeys.has(key)) {
      continue;
    }

    try {
      const paymentType = await PaymentType.create({
        ...item,
        accountId,
      });
      created.push(paymentType);
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
