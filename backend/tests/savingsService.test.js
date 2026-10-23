import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { Account } from '../src/models/Account.js';
import { Category } from '../src/models/Category.js';
import { PaymentType } from '../src/models/PaymentType.js';
import { SavingsBucket } from '../src/models/SavingsBucket.js';
import { SavingsEntry } from '../src/models/SavingsEntry.js';
import { Transaction } from '../src/models/Transaction.js';
import { createEntry, deleteEntry, updateEntry } from '../src/services/savingsService.js';

test('creating savings entries creates and links account transactions', async () => {
  const originals = {
    accountFindOne: Account.findOne,
    accountFindById: Account.findById,
    accountSave: Account.prototype.save,
    categoryFindOne: Category.findOne,
    paymentTypeFindOne: PaymentType.findOne,
    bucketFindOne: SavingsBucket.findOne,
    savingsEntryAggregate: SavingsEntry.aggregate,
    savingsEntryCreate: SavingsEntry.create,
    transactionAggregate: Transaction.aggregate,
    transactionSave: Transaction.prototype.save,
  };
  const userId = new mongoose.Types.ObjectId().toString();
  const bucketId = new mongoose.Types.ObjectId().toString();
  const accountId = new mongoose.Types.ObjectId().toString();
  const categories = {
    expense: { _id: new mongoose.Types.ObjectId(), type: 'expense' },
    income: { _id: new mongoose.Types.ObjectId(), type: 'income' },
  };
  const paymentTypes = {
    expense: { _id: new mongoose.Types.ObjectId(), type: 'expense' },
    income: { _id: new mongoose.Types.ObjectId(), type: 'income' },
  };
  const createdEntries = [];
  const transactions = [];

  Account.findOne = () => ({ lean: async () => ({ _id: accountId, isArchived: false }) });
  Account.findById = async () => ({
    openingBalance: 0,
    type: 'BANK',
    save: async () => {},
  });
  Account.prototype.save = async function () {};
  Category.findOne = async ({ type, _id }) =>
    type
      ? categories[type]
      : Object.values(categories).find((item) => item._id.toString() === _id.toString());
  PaymentType.findOne = async ({ type, _id }) =>
    type
      ? paymentTypes[type]
      : Object.values(paymentTypes).find((item) => item._id.toString() === _id.toString());
  SavingsBucket.findOne = () => ({ lean: async () => ({ _id: bucketId, status: 'active' }) });
  SavingsEntry.aggregate = async () => [{ contributions: 50, withdrawals: 0 }];
  SavingsEntry.create = async (data) => {
    createdEntries.push(data);
    return {
      ...data,
      _id: new mongoose.Types.ObjectId(),
      toObject() {
        return { ...data, _id: this._id };
      },
    };
  };
  Transaction.aggregate = async () => [];
  Transaction.prototype.save = async function () {
    transactions.push(this);
    return this;
  };

  try {
    for (const [entryType, transactionType] of [
      ['contribution', 'expense'],
      ['withdrawal', 'income'],
    ]) {
      const entry = await createEntry(userId, {
        bucketId,
        accountId,
        type: entryType,
        amount: 10,
        note: 'Monthly savings',
      });
      const transaction = transactions.at(-1);
      const savedEntry = createdEntries.at(-1);
      const category = categories[transactionType];

      assert.equal(transaction.type, transactionType);
      assert.equal(transaction.categoryId.toString(), category._id.toString());
      assert.equal(transaction.accountId.toString(), accountId);
      assert.equal(savedEntry.transactionId.toString(), transaction._id.toString());
      assert.equal(entry.transactionId.toString(), transaction._id.toString());
      assert.equal(transaction.description, `Savings ${entryType}`);
    }
  } finally {
    Account.findOne = originals.accountFindOne;
    Account.findById = originals.accountFindById;
    Account.prototype.save = originals.accountSave;
    Category.findOne = originals.categoryFindOne;
    PaymentType.findOne = originals.paymentTypeFindOne;
    SavingsBucket.findOne = originals.bucketFindOne;
    SavingsEntry.aggregate = originals.savingsEntryAggregate;
    SavingsEntry.create = originals.savingsEntryCreate;
    Transaction.aggregate = originals.transactionAggregate;
    Transaction.prototype.save = originals.transactionSave;
  }
});

test('updating a savings entry updates its linked transaction', async () => {
  const originals = {
    accountFindOne: Account.findOne,
    accountFindById: Account.findById,
    accountSave: Account.prototype.save,
    categoryFindOne: Category.findOne,
    paymentTypeFindOne: PaymentType.findOne,
    bucketFindOne: SavingsBucket.findOne,
    savingsEntryAggregate: SavingsEntry.aggregate,
    savingsEntryFindOne: SavingsEntry.findOne,
    savingsEntryFindOneAndUpdate: SavingsEntry.findOneAndUpdate,
    savingsEntryUpdateOne: SavingsEntry.updateOne,
    transactionAggregate: Transaction.aggregate,
    transactionFindOne: Transaction.findOne,
    transactionFindOneAndUpdate: Transaction.findOneAndUpdate,
  };
  const userId = new mongoose.Types.ObjectId().toString();
  const bucketId = new mongoose.Types.ObjectId().toString();
  const accountId = new mongoose.Types.ObjectId().toString();
  const transactionId = new mongoose.Types.ObjectId();
  const category = { _id: new mongoose.Types.ObjectId(), type: 'expense' };
  const paymentType = { _id: new mongoose.Types.ObjectId(), type: 'expense' };
  const existing = {
    _id: new mongoose.Types.ObjectId(),
    bucketId,
    accountId,
    transactionId,
    type: 'contribution',
    amount: 10,
    effectiveDate: new Date('2026-01-01T00:00:00.000Z'),
    note: 'Old note',
    reference: 'old-ref',
  };
  const transaction = {
    _id: transactionId,
    accountId,
    type: 'expense',
    amount: 10,
  };
  let transactionUpdate;

  Account.findOne = () => ({ lean: async () => ({ _id: accountId }) });
  Account.findById = async () => ({
    openingBalance: 0,
    type: 'BANK',
    save: async () => {},
  });
  Account.prototype.save = async function () {};
  Category.findOne = async ({ _id }) => category;
  PaymentType.findOne = async ({ _id }) => paymentType;
  SavingsBucket.findOne = () => ({ lean: async () => ({ _id: bucketId, status: 'active' }) });
  SavingsEntry.aggregate = async () => [{ contributions: 100, withdrawals: 0 }];
  SavingsEntry.findOne = async () => existing;
  SavingsEntry.findOneAndUpdate = () => ({
    lean: async () => ({ ...existing, amount: 20, note: 'Updated note', reference: 'updated-ref' }),
  });
  SavingsEntry.updateOne = async () => ({ modifiedCount: 1 });
  Transaction.aggregate = async () => [];
  Transaction.findOne = () => ({ lean: async () => transaction });
  Transaction.findOneAndUpdate = (_query, update) => {
    transactionUpdate = update;
    return {
      populate() {
        return this;
      },
      lean: async () => ({ ...transaction, ...update }),
    };
  };

  try {
    await updateEntry(existing._id.toString(), userId, {
      amount: 20,
      note: 'Updated note',
      reference: 'updated-ref',
    });

    assert.equal(transactionUpdate.amount, 20);
    assert.equal(transactionUpdate.description, 'Savings contribution');
    assert.equal(transactionUpdate.notes, 'Updated note\nReference: updated-ref');
  } finally {
    Account.findOne = originals.accountFindOne;
    Account.findById = originals.accountFindById;
    Account.prototype.save = originals.accountSave;
    Category.findOne = originals.categoryFindOne;
    PaymentType.findOne = originals.paymentTypeFindOne;
    SavingsBucket.findOne = originals.bucketFindOne;
    SavingsEntry.aggregate = originals.savingsEntryAggregate;
    SavingsEntry.findOne = originals.savingsEntryFindOne;
    SavingsEntry.findOneAndUpdate = originals.savingsEntryFindOneAndUpdate;
    SavingsEntry.updateOne = originals.savingsEntryUpdateOne;
    Transaction.aggregate = originals.transactionAggregate;
    Transaction.findOne = originals.transactionFindOne;
    Transaction.findOneAndUpdate = originals.transactionFindOneAndUpdate;
  }
});

test('deleting a savings entry removes its linked transaction', async () => {
  const originals = {
    accountFindOne: Account.findOne,
    accountFindById: Account.findById,
    accountSave: Account.prototype.save,
    savingsEntryFindOne: SavingsEntry.findOne,
    savingsEntryUpdateOne: SavingsEntry.updateOne,
    transactionAggregate: Transaction.aggregate,
    transactionFindOne: Transaction.findOne,
    transactionFindOneAndDelete: Transaction.findOneAndDelete,
  };
  const userId = new mongoose.Types.ObjectId().toString();
  const accountId = new mongoose.Types.ObjectId().toString();
  const entryId = new mongoose.Types.ObjectId().toString();
  const transactionId = new mongoose.Types.ObjectId();
  const entry = { _id: entryId, accountId, transactionId };
  const transaction = { _id: transactionId, accountId, type: 'expense' };
  const calls = [];

  Account.findOne = () => ({ lean: async () => ({ _id: accountId }) });
  Account.findById = async () => ({
    openingBalance: 0,
    type: 'BANK',
    save: async () => {},
  });
  Account.prototype.save = async function () {};
  SavingsEntry.findOne = async () => entry;
  SavingsEntry.updateOne = async () => {
    calls.push('entry-soft-delete');
  };
  Transaction.aggregate = async () => [];
  Transaction.findOne = async () => transaction;
  Transaction.findOneAndDelete = async () => {
    calls.push('transaction-delete');
    return transaction;
  };

  try {
    await deleteEntry(entryId, userId);

    assert.deepEqual(calls, ['transaction-delete', 'entry-soft-delete']);
  } finally {
    Account.findOne = originals.accountFindOne;
    Account.findById = originals.accountFindById;
    Account.prototype.save = originals.accountSave;
    SavingsEntry.findOne = originals.savingsEntryFindOne;
    SavingsEntry.updateOne = originals.savingsEntryUpdateOne;
    Transaction.aggregate = originals.transactionAggregate;
    Transaction.findOne = originals.transactionFindOne;
    Transaction.findOneAndDelete = originals.transactionFindOneAndDelete;
  }
});
