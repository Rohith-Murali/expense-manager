import test from 'node:test';
import assert from 'node:assert/strict';
import { entryCreateSchema } from '../src/validators/savingsValidator.js';
import { mapSavingsEntryTypeToTransactionType } from '../src/services/savingsService.js';

const bucketId = '6a11d958f5a1df1b8375c121';
const accountId = '6a11d958f5a1df1b8375c122';

test('savings entry creation requires an account ID', () => {
  const result = entryCreateSchema.safeParse({
    bucketId,
    type: 'contribution',
    amount: 100,
  });

  assert.equal(result.success, false);
  assert.ok(result.error.issues.some((issue) => issue.path[0] === 'accountId'));
});

test('savings entry creation accepts a valid account ID', () => {
  const result = entryCreateSchema.safeParse({
    bucketId,
    accountId,
    type: 'contribution',
    amount: 100,
  });

  assert.equal(result.success, true);
  assert.equal(result.data.accountId, accountId);
});

test('contributions become expenses and withdrawals become income', () => {
  assert.equal(mapSavingsEntryTypeToTransactionType('contribution'), 'expense');
  assert.equal(mapSavingsEntryTypeToTransactionType('withdrawal'), 'income');
});
