import test from 'node:test';
import assert from 'node:assert/strict';
import { Account } from '../src/models/Account.js';
import { PaymentType } from '../src/models/PaymentType.js';
import { ensureDefaultPaymentTypes } from '../src/services/paymentTypeService.js';

test('default payment types restore inactive defaults and are idempotent', async () => {
  const originals = {
    accountFindOne: Account.findOne,
    paymentTypeFind: PaymentType.find,
    paymentTypeCreate: PaymentType.create,
    paymentTypeFindOneAndUpdate: PaymentType.findOneAndUpdate,
  };
  const accountId = 'account-id';
  const paymentTypes = [
    {
      _id: 'inactive-cash',
      accountId,
      name: 'Cash',
      type: 'expense',
      isActive: false,
    },
  ];

  Account.findOne = async () => ({ _id: accountId });
  PaymentType.find = () => ({
    lean: async () => paymentTypes.map((paymentType) => ({ ...paymentType })),
  });
  PaymentType.create = async (data) => {
    const paymentType = {
      _id: `payment-type-${paymentTypes.length}`,
      ...data,
      isActive: true,
    };
    paymentTypes.push(paymentType);
    return paymentType;
  };
  PaymentType.findOneAndUpdate = async ({ _id }, { $set }) => {
    const paymentType = paymentTypes.find((item) => item._id === _id);
    Object.assign(paymentType, $set);
    return paymentType;
  };

  try {
    const result = await ensureDefaultPaymentTypes('user-id', accountId);

    assert.deepEqual(result, { created: 9, reactivated: 1 });
    assert.equal(paymentTypes.find((item) => item._id === 'inactive-cash').isActive, true);
    assert.equal(paymentTypes.length, 10);
    assert.ok(paymentTypes.every((item) => item.isActive));

    const secondResult = await ensureDefaultPaymentTypes('user-id', accountId);
    assert.deepEqual(secondResult, { created: 0, reactivated: 0 });
    assert.equal(paymentTypes.length, 10);
  } finally {
    Account.findOne = originals.accountFindOne;
    PaymentType.find = originals.paymentTypeFind;
    PaymentType.create = originals.paymentTypeCreate;
    PaymentType.findOneAndUpdate = originals.paymentTypeFindOneAndUpdate;
  }
});
