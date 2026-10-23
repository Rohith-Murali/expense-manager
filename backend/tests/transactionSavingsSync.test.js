import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { Account } from '../src/models/Account.js';
import { SavingsEntry } from '../src/models/SavingsEntry.js';
import { Transaction } from '../src/models/Transaction.js';
import { remove, update } from '../src/services/transactionService.js';

test('editing a linked transaction updates the savings entry shown in the list', async () => {
  const originals = {
    accountFindOne: Account.findOne,
    accountFindById: Account.findById,
    accountSave: Account.prototype.save,
    savingsEntryUpdateOne: SavingsEntry.updateOne,
    transactionAggregate: Transaction.aggregate,
    transactionFindOne: Transaction.findOne,
    transactionFindOneAndUpdate: Transaction.findOneAndUpdate,
  };
  const userId = new mongoose.Types.ObjectId();
  const accountId = new mongoose.Types.ObjectId();
  const transactionId = new mongoose.Types.ObjectId();
  const newDate = new Date('2026-10-20T00:00:00.000Z');
  const original = {
    _id: transactionId,
    accountId,
    type: 'expense',
    amount: 10,
  };
  const updated = {
    ...original,
    type: 'income',
    amount: 25,
    date: newDate,
    notes: 'Updated savings note\nReference: updated-ref',
  };
  let savingsUpdate;

  Account.findOne = async () => ({ _id: accountId, userId });
  Account.findById = async () => ({
    openingBalance: 0,
    type: 'BANK',
    save: async () => {},
  });
  Account.prototype.save = async function () {};
  SavingsEntry.updateOne = async (query, updateData) => {
    savingsUpdate = { query, updateData };
  };
  Transaction.aggregate = async () => [];
  Transaction.findOne = () => ({ lean: async () => original });
  Transaction.findOneAndUpdate = () => ({
    populate() {
      return this;
    },
    lean: async () => updated,
  });

  try {
    await update(userId, transactionId, accountId, {
      type: 'income',
      amount: 25,
      date: newDate,
      notes: 'Updated savings note\nReference: updated-ref',
    });

    assert.equal(savingsUpdate.query.transactionId.toString(), transactionId.toString());
    assert.equal(savingsUpdate.query.accountId.toString(), accountId.toString());
    assert.equal(savingsUpdate.updateData.$set.type, 'withdrawal');
    assert.equal(savingsUpdate.updateData.$set.amount, 25);
    assert.equal(savingsUpdate.updateData.$set.effectiveDate, newDate);
    assert.equal(savingsUpdate.updateData.$set.note, 'Updated savings note');
    assert.equal(savingsUpdate.updateData.$set.reference, 'updated-ref');
  } finally {
    Account.findOne = originals.accountFindOne;
    Account.findById = originals.accountFindById;
    Account.prototype.save = originals.accountSave;
    SavingsEntry.updateOne = originals.savingsEntryUpdateOne;
    Transaction.aggregate = originals.transactionAggregate;
    Transaction.findOne = originals.transactionFindOne;
    Transaction.findOneAndUpdate = originals.transactionFindOneAndUpdate;
  }
});

test('editing a linked transaction without changing its type updates its savings entry', async () => {
  const originals = {
    accountFindOne: Account.findOne,
    accountFindById: Account.findById,
    accountSave: Account.prototype.save,
    savingsEntryUpdateOne: SavingsEntry.updateOne,
    transactionAggregate: Transaction.aggregate,
    transactionFindOne: Transaction.findOne,
    transactionFindOneAndUpdate: Transaction.findOneAndUpdate,
  };
  const userId = new mongoose.Types.ObjectId();
  const accountId = new mongoose.Types.ObjectId();
  const transactionId = new mongoose.Types.ObjectId();
  const newDate = new Date('2026-10-21T00:00:00.000Z');
  const original = {
    _id: transactionId,
    accountId,
    type: 'expense',
    amount: 10,
  };
  const updated = {
    ...original,
    amount: 25,
    date: newDate,
    notes: 'Updated savings note\nReference: updated-ref',
  };
  let savingsUpdate;

  Account.findOne = async () => ({ _id: accountId, userId });
  Account.findById = async () => ({
    openingBalance: 0,
    type: 'BANK',
    save: async () => {},
  });
  Account.prototype.save = async function () {};
  SavingsEntry.updateOne = async (query, updateData) => {
    savingsUpdate = { query, updateData };
  };
  Transaction.aggregate = async () => [];
  Transaction.findOne = () => ({ lean: async () => original });
  Transaction.findOneAndUpdate = () => ({
    populate() {
      return this;
    },
    lean: async () => updated,
  });

  try {
    await update(userId, transactionId, accountId, {
      type: 'expense',
      amount: 25,
      date: newDate,
      notes: 'Updated savings note\nReference: updated-ref',
    });

    assert.equal(savingsUpdate.query.transactionId.toString(), transactionId.toString());
    assert.equal(savingsUpdate.updateData.$set.type, 'contribution');
    assert.equal(savingsUpdate.updateData.$set.amount, 25);
    assert.equal(savingsUpdate.updateData.$set.effectiveDate, newDate);
    assert.equal(savingsUpdate.updateData.$set.note, 'Updated savings note');
    assert.equal(savingsUpdate.updateData.$set.reference, 'updated-ref');
  } finally {
    Account.findOne = originals.accountFindOne;
    Account.findById = originals.accountFindById;
    Account.prototype.save = originals.accountSave;
    SavingsEntry.updateOne = originals.savingsEntryUpdateOne;
    Transaction.aggregate = originals.transactionAggregate;
    Transaction.findOne = originals.transactionFindOne;
    Transaction.findOneAndUpdate = originals.transactionFindOneAndUpdate;
  }
});

test('deleting a linked transaction removes its savings entry from the list', async () => {
  const originals = {
    accountFindOne: Account.findOne,
    accountFindById: Account.findById,
    accountSave: Account.prototype.save,
    savingsEntryUpdateOne: SavingsEntry.updateOne,
    transactionAggregate: Transaction.aggregate,
    transactionFindOne: Transaction.findOne,
    transactionFindOneAndDelete: Transaction.findOneAndDelete,
  };
  const userId = new mongoose.Types.ObjectId();
  const accountId = new mongoose.Types.ObjectId();
  const transactionId = new mongoose.Types.ObjectId();
  const transaction = { _id: transactionId, accountId, type: 'expense' };
  let savingsUpdate;

  Account.findOne = async () => ({ _id: accountId, userId });
  Account.findById = async () => ({
    openingBalance: 0,
    type: 'BANK',
    save: async () => {},
  });
  Account.prototype.save = async function () {};
  SavingsEntry.updateOne = async (query, updateData) => {
    savingsUpdate = { query, updateData };
  };
  Transaction.aggregate = async () => [];
  Transaction.findOne = () => ({
    ...transaction,
    lean: async () => transaction,
  });
  Transaction.findOneAndDelete = async () => transaction;

  try {
    await remove(userId, transactionId, accountId);

    assert.equal(savingsUpdate.query.transactionId.toString(), transactionId.toString());
    assert.equal(savingsUpdate.query.isDeleted, false);
    assert.equal(savingsUpdate.updateData.$set.isDeleted, true);
  } finally {
    Account.findOne = originals.accountFindOne;
    Account.findById = originals.accountFindById;
    Account.prototype.save = originals.accountSave;
    SavingsEntry.updateOne = originals.savingsEntryUpdateOne;
    Transaction.aggregate = originals.transactionAggregate;
    Transaction.findOne = originals.transactionFindOne;
    Transaction.findOneAndDelete = originals.transactionFindOneAndDelete;
  }
});
