import test from 'node:test';
import assert from 'node:assert/strict';
import { updateSchema } from '../src/validators/transactionValidator.js';

test('transaction update accepts null recurringPatternId when recurring is disabled', () => {
  const result = updateSchema.safeParse({
    type: 'expense',
    amount: 100,
    date: '2026-09-25T00:00:00.000Z',
    description: 'elec bill',
    accountId: '6a11d958f5a1df1b8375c121',
    categoryId: '6a11d958f5a1df1b8375c12b',
    subcategoryId: '6ab67c3f5718cc6119487133',
    paymentTypeId: '6a11d95af5a1df1b8375c143',
    isRecurring: false,
    recurringPatternId: null,
  });

  assert.equal(result.success, true);
});
