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

  const existing = await PaymentType.find(
    { accountId },
    { _id: 1, name: 1, type: 1, isActive: 1 },
  ).lean();
  const existingByKey = new Map(
    existing.map((item) => [`${normalizeName(item.name)}::${item.type}`, item]),
  );

  let created = 0;
  let reactivated = 0;

  for (const item of DEFAULT_PAYMENT_TYPES) {
    const key = `${normalizeName(item.name)}::${item.type}`;
    const existingPaymentType = existingByKey.get(key);
    if (existingPaymentType) {
      if (!existingPaymentType.isActive) {
        await PaymentType.findOneAndUpdate(
          { _id: existingPaymentType._id, accountId },
          { $set: { isActive: true } },
          { new: true, runValidators: true },
        );
        existingPaymentType.isActive = true;
        reactivated += 1;
      }
      continue;
    }

    try {
      const paymentType = await PaymentType.create({
        ...item,
        accountId,
      });
      created += 1;
      existingByKey.set(key, paymentType);
    } catch (error) {
      if (error?.code === 11000) {
        const racedPaymentType = await PaymentType.findOne({
          accountId,
          name: item.name,
          type: item.type,
        }).lean();
        if (!racedPaymentType) throw error;
        if (!racedPaymentType.isActive) {
          await PaymentType.findOneAndUpdate(
            { _id: racedPaymentType._id, accountId },
            { $set: { isActive: true } },
            { new: true, runValidators: true },
          );
          racedPaymentType.isActive = true;
          reactivated += 1;
        }
        existingByKey.set(key, racedPaymentType);
        continue;
      }
      throw error;
    }
  }

  return { created, reactivated };
}
