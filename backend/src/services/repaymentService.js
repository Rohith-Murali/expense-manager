import mongoose from 'mongoose';
import { Account } from '../models/Account.js';
import { CreditCardRepaymentAllocation } from '../models/CreditCardRepaymentAllocation.js';
import { Repayment } from '../models/Repayment.js';
import { RepaymentReceipt } from '../models/RepaymentReceipt.js';
import { Transaction } from '../models/Transaction.js';
import { ApiError } from '../utils/ApiError.js';
import { updateAccountBalance } from './accountService.js';

const TOLERANCE = 0.005;
const closeEnough = (left, right) => Math.abs(Number(left) - Number(right)) <= TOLERANCE;
const idString = (value) => String(value?._id || value);

async function assertEligibleAccount(accountId, userId, session) {
  const account = await Account.findOne({
    _id: accountId,
    userId,
    isDeleted: false,
    isArchived: false,
    type: { $in: ['CASH', 'BANK'] },
  }).session(session);
  if (!account) throw new ApiError(400, 'DESTINATION_ACCOUNT_NOT_ELIGIBLE');
  return account;
}

async function assertParticipant(repayment, participantId) {
  const participant = repayment.participants.id(participantId);
  if (!participant) throw new ApiError(404, 'REPAYMENT_PARTICIPANT_NOT_FOUND');
  return participant;
}

async function getActiveReceipts(repaymentId, session) {
  return RepaymentReceipt.find({ repaymentId, isDeleted: false }).session(session).lean();
}

async function assertRepaymentTransaction(repayment, userId, session) {
  const [transaction, sourceAccount] = await Promise.all([
    Transaction.findOne({
      _id: repayment.transactionId,
      accountId: repayment.sourceAccountId,
      type: 'expense',
      repaymentId: repayment._id,
      isCreditCardPurchaseMirror: { $ne: true },
    }).session(session),
    Account.findOne({
      _id: repayment.sourceAccountId,
      userId,
      isDeleted: false,
    }).session(session),
  ]);
  if (!transaction || !sourceAccount) {
    throw new ApiError(409, 'REPAYMENT_TRANSACTION_INCONSISTENT');
  }
  return transaction;
}

function sumForParticipant(receipts, participantId, excludedId = null) {
  return receipts.reduce(
    (sum, receipt) =>
      idString(receipt.participantId) === idString(participantId) &&
      (!excludedId || idString(receipt._id) !== idString(excludedId))
        ? sum + Number(receipt.amount)
        : sum,
    0,
  );
}

async function lockRepayment(repaymentId, userId, session) {
  const repayment = await Repayment.findOneAndUpdate(
    { _id: repaymentId, userId, isDeleted: false },
    { $inc: { concurrencyVersion: 1 } },
    { new: true, session },
  );
  if (!repayment) throw new ApiError(404, 'REPAYMENT_NOT_FOUND');
  return repayment;
}

async function buildRepaymentSummary(repayment) {
  const receipts = await RepaymentReceipt.find({
    repaymentId: repayment._id,
    userId: repayment.userId,
    isDeleted: false,
  })
    .sort({ date: -1, createdAt: -1 })
    .lean();
  const byParticipant = new Map();
  for (const receipt of receipts) {
    const key = idString(receipt.participantId);
    byParticipant.set(key, (byParticipant.get(key) || 0) + Number(receipt.amount));
  }
  const participantSummaries = repayment.participants.map((participant) => {
    const repaid = byParticipant.get(idString(participant._id)) || 0;
    return {
      ...participant.toObject(),
      repaid,
      pending: Math.max(0, Number(participant.amount) - repaid),
    };
  });
  const totalRepaid = receipts.reduce((sum, receipt) => sum + Number(receipt.amount), 0);
  const allocations = receipts.length
    ? await CreditCardRepaymentAllocation.aggregate([
        {
          $match: {
            receiptId: { $in: receipts.map((receipt) => receipt._id) },
            userId: repayment.userId,
            isDeleted: false,
          },
        },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ])
    : [];
  return {
    ...repayment.toObject(),
    participants: participantSummaries,
    receipts,
    totalRepaid,
    totalPending: Math.max(0, Number(repayment.receivableAmount) - totalRepaid),
    allocatedToCard: Number(allocations[0]?.total || 0),
  };
}

export async function listRepayments(userId) {
  const repayments = await Repayment.find({ userId, isDeleted: false })
    .sort({ date: -1, createdAt: -1 })
    .lean();
  if (!repayments.length) return [];
  const receipts = await RepaymentReceipt.find({
    userId,
    repaymentId: { $in: repayments.map((repayment) => repayment._id) },
    isDeleted: false,
  }).lean();
  const transactions = await Transaction.find({
    _id: { $in: repayments.map((repayment) => repayment.transactionId) },
  })
    .select('repaymentId creditCardAccountId')
    .lean();
  const cardByRepayment = new Map(
    transactions.map((transaction) => [
      idString(transaction.repaymentId),
      transaction.creditCardAccountId || null,
    ]),
  );
  const totals = new Map();
  const participantTotals = new Map();
  for (const receipt of receipts) {
    const key = idString(receipt.repaymentId);
    totals.set(key, (totals.get(key) || 0) + Number(receipt.amount));
    const participantKey = `${key}:${idString(receipt.participantId)}`;
    participantTotals.set(
      participantKey,
      (participantTotals.get(participantKey) || 0) + Number(receipt.amount),
    );
  }
  return repayments.map((repayment) => {
    const key = idString(repayment._id);
    const totalRepaid = totals.get(key) || 0;
    return {
      ...repayment,
      creditCardAccountId: cardByRepayment.get(key),
      participants: repayment.participants.map((participant) => {
        const repaid = participantTotals.get(`${key}:${idString(participant._id)}`) || 0;
        return {
          ...participant,
          repaid,
          pending: Math.max(0, Number(participant.amount) - repaid),
        };
      }),
      receipts: receipts.filter((receipt) => idString(receipt.repaymentId) === key),
      totalRepaid,
      totalPending: Math.max(0, Number(repayment.receivableAmount) - totalRepaid),
    };
  });
}

export async function getRepayment(repaymentId, userId) {
  const repayment = await Repayment.findOne({ _id: repaymentId, userId, isDeleted: false });
  if (!repayment) throw new ApiError(404, 'REPAYMENT_NOT_FOUND');
  const [summary, transaction] = await Promise.all([
    buildRepaymentSummary(repayment),
    Transaction.findById(repayment.transactionId).select('creditCardAccountId').lean(),
  ]);
  return { ...summary, creditCardAccountId: transaction?.creditCardAccountId || null };
}

export async function createReceipt(repaymentId, userId, data) {
  let destinationAccountId;
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const repayment = await lockRepayment(repaymentId, userId, session);
      const participant = await assertParticipant(repayment, data.participantId);
      const destination = await assertEligibleAccount(data.destinationAccountId, userId, session);
      const receipts = await getActiveReceipts(repaymentId, session);
      const repaid = sumForParticipant(receipts, participant._id);
      if (data.amount > Number(participant.amount) - repaid + TOLERANCE) {
        throw new ApiError(400, 'REPAYMENT_EXCEEDS_PARTICIPANT_BALANCE');
      }
      const receipt = new RepaymentReceipt({
        ...data,
        userId,
        repaymentId,
        participantId: participant._id,
        destinationAccountId: destination._id,
      });
      await receipt.save({ session });
      destinationAccountId = destination._id;
    });
  } finally {
    await session.endSession();
  }
  await updateAccountBalance(destinationAccountId);
  return getRepayment(repaymentId, userId);
}

export async function updateReceipt(receiptId, userId, data) {
  let affectedAccountIds = [];
  const session = await mongoose.startSession();
  let repaymentId;
  try {
    await session.withTransaction(async () => {
      const receipt = await RepaymentReceipt.findOne({
        _id: receiptId,
        userId,
        isDeleted: false,
      }).session(session);
      if (!receipt) throw new ApiError(404, 'REPAYMENT_RECEIPT_NOT_FOUND');
      repaymentId = receipt.repaymentId;
      const repayment = await lockRepayment(repaymentId, userId, session);
      const participantId = data.participantId || receipt.participantId;
      const participant = await assertParticipant(repayment, participantId);
      const destinationAccountId = data.destinationAccountId || receipt.destinationAccountId;
      const destination = await assertEligibleAccount(destinationAccountId, userId, session);
      const previousDestinationAccountId = receipt.destinationAccountId;
      const receipts = await getActiveReceipts(repaymentId, session);
      const repaidByParticipant = sumForParticipant(receipts, participant._id, receipt._id);
      const amount = data.amount ?? receipt.amount;
      if (amount > Number(participant.amount) - repaidByParticipant + TOLERANCE) {
        throw new ApiError(400, 'REPAYMENT_EXCEEDS_PARTICIPANT_BALANCE');
      }
      const allocations = await CreditCardRepaymentAllocation.aggregate([
        { $match: { receiptId: receipt._id, userId, isDeleted: false } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]).session(session);
      if (amount + TOLERANCE < Number(allocations[0]?.total || 0)) {
        throw new ApiError(409, 'RECEIPT_HAS_ACTIVE_CARD_ALLOCATIONS');
      }
      Object.assign(receipt, data, { participantId: participant._id, destinationAccountId });
      await receipt.save({ session });
      affectedAccountIds = [previousDestinationAccountId, destination._id];
    });
  } finally {
    await session.endSession();
  }
  for (const accountId of new Set(affectedAccountIds.map(idString))) {
    await updateAccountBalance(accountId);
  }
  return getRepayment(repaymentId, userId);
}

export async function reverseReceipt(receiptId, userId) {
  let destinationAccountId;
  let repaymentId;
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const receipt = await RepaymentReceipt.findOne({
        _id: receiptId,
        userId,
        isDeleted: false,
      }).session(session);
      if (!receipt) throw new ApiError(404, 'REPAYMENT_RECEIPT_NOT_FOUND');
      repaymentId = receipt.repaymentId;
      await lockRepayment(repaymentId, userId, session);
      const allocation = await CreditCardRepaymentAllocation.exists({
        receiptId,
        userId,
        isDeleted: false,
      }).session(session);
      if (allocation) throw new ApiError(409, 'RECEIPT_HAS_ACTIVE_CARD_ALLOCATIONS');
      receipt.isDeleted = true;
      await receipt.save({ session });
      destinationAccountId = receipt.destinationAccountId;
    });
  } finally {
    await session.endSession();
  }
  await updateAccountBalance(destinationAccountId);
  return getRepayment(repaymentId, userId);
}

export async function updateRepayment(repaymentId, userId, data) {
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const repayment = await lockRepayment(repaymentId, userId, session);
      const transaction = await assertRepaymentTransaction(repayment, userId, session);
      const receipts = await getActiveReceipts(repaymentId, session);
      const participants = data.participants
        ? data.participants.map((participant) => ({
            _id:
              (participant.id && repayment.participants.id(participant.id)?._id) ||
              new mongoose.Types.ObjectId(),
            name: participant.name,
            amount: participant.amount,
          }))
        : repayment.participants.map((participant) => participant.toObject());
      const receivableAmount = Number(repayment.totalAmount) - Number(data.personalShare ?? repayment.personalShare);
      if (receivableAmount < -TOLERANCE) throw new ApiError(400, 'INVALID_PERSONAL_SHARE');
      const shareTotal = participants.reduce((sum, participant) => sum + Number(participant.amount), 0);
      if (!closeEnough(shareTotal, receivableAmount)) {
        throw new ApiError(400, 'PARTICIPANT_SHARES_MUST_EQUAL_RECEIVABLE');
      }
      for (const receipt of receipts) {
        const participant = participants.find(
          (item) => idString(item._id) === idString(receipt.participantId),
        );
        if (!participant || sumForParticipant(receipts, receipt.participantId) > participant.amount + TOLERANCE) {
          throw new ApiError(409, 'PARTICIPANT_SHARE_BELOW_REPAID_AMOUNT');
        }
      }
      repayment.participants = participants;
      repayment.personalShare = Number(data.personalShare ?? repayment.personalShare);
      repayment.receivableAmount = Math.max(0, receivableAmount);
      if (data.title !== undefined) repayment.title = data.title;
      if (data.date !== undefined) repayment.date = data.date;
      if (data.notes !== undefined) repayment.notes = data.notes;
      await repayment.save({ session });

      transaction.personalShare = repayment.personalShare;
      transaction.receivableAmount = repayment.receivableAmount;
      transaction.description = repayment.title;
      transaction.date = repayment.date;
      transaction.notes = repayment.notes;
      await transaction.save({ session });
      if (transaction.linkedTransactionId) {
        await Transaction.updateOne(
          { _id: transaction.linkedTransactionId, isCreditCardPurchaseMirror: true },
          {
            $set: {
              personalShare: repayment.personalShare,
              receivableAmount: repayment.receivableAmount,
              description: transaction.description,
              date: transaction.date,
              notes: transaction.notes,
            },
          },
          { session },
        );
      }
    });
  } finally {
    await session.endSession();
  }
  return getRepayment(repaymentId, userId);
}

export async function deleteRepayment(repaymentId, userId) {
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const repayment = await lockRepayment(repaymentId, userId, session);
      const receiptExists = await RepaymentReceipt.exists({
        repaymentId,
        userId,
        isDeleted: false,
      }).session(session);
      if (receiptExists) throw new ApiError(409, 'REPAYMENT_HAS_ACTIVE_RECEIPTS');
      const transaction = await assertRepaymentTransaction(repayment, userId, session);
      await Transaction.updateOne(
        { _id: transaction._id },
        { $unset: { repaymentId: 1, personalShare: 1, receivableAmount: 1 } },
        { session },
      );
      if (transaction.linkedTransactionId) {
        await Transaction.updateOne(
          { _id: transaction.linkedTransactionId },
          { $unset: { repaymentId: 1, personalShare: 1, receivableAmount: 1 } },
          { session },
        );
      }
      repayment.isDeleted = true;
      await repayment.save({ session });
    });
  } finally {
    await session.endSession();
  }
}

export async function getReservedFunds(creditCardAccountId, userId) {
  const repayments = await Repayment.find({ userId, isDeleted: false }).select('_id').lean();
  if (!repayments.length) return { total: 0, receipts: [] };
  const originalTransactions = await Transaction.find({
    repaymentId: { $in: repayments.map((repayment) => repayment._id) },
    type: 'expense',
    isCreditCardPurchaseMirror: { $ne: true },
    creditCardAccountId,
    accountId: { $exists: true },
  })
    .select('_id repaymentId')
    .lean();
  if (!originalTransactions.length) return { total: 0, receipts: [] };
  const repaymentIds = originalTransactions.map((transaction) => transaction.repaymentId);
  const receipts = await RepaymentReceipt.find({
    userId,
    repaymentId: { $in: repaymentIds },
    isDeleted: false,
  })
    .populate('destinationAccountId', 'name type currency')
    .sort({ date: 1, createdAt: 1 })
    .lean();
  const allocations = await CreditCardRepaymentAllocation.aggregate([
    {
      $match: {
        userId,
        creditCardAccountId: new mongoose.Types.ObjectId(creditCardAccountId),
        receiptId: { $in: receipts.map((receipt) => receipt._id) },
        isDeleted: false,
      },
    },
    { $group: { _id: '$receiptId', total: { $sum: '$amount' } } },
  ]);
  const repaymentDocuments = await Repayment.find({ _id: { $in: repaymentIds }, userId })
    .select('_id participants')
    .lean();
  const participantNames = new Map();
  for (const repayment of repaymentDocuments) {
    for (const participant of repayment.participants) {
      participantNames.set(
        `${idString(repayment._id)}:${idString(participant._id)}`,
        participant.name,
      );
    }
  }
  const allocatedByReceipt = new Map(allocations.map((item) => [idString(item._id), item.total]));
  const pendingReceipts = receipts
    .map((receipt) => ({
      ...receipt,
      participantName: participantNames.get(
        `${idString(receipt.repaymentId)}:${idString(receipt.participantId)}`,
      ),
      reservedAmount: Math.max(0, Number(receipt.amount) - Number(allocatedByReceipt.get(idString(receipt._id)) || 0)),
    }))
    .filter((receipt) => receipt.reservedAmount > TOLERANCE);
  return {
    total: pendingReceipts.reduce((sum, receipt) => sum + receipt.reservedAmount, 0),
    receipts: pendingReceipts,
  };
}

export async function allocateReservedReceipts(
  userId,
  sourceAccountId,
  creditCardAccountId,
  transferId,
  transferAmount,
  allocations,
  date,
  session,
) {
  const grouped = new Map();
  for (const item of allocations || []) {
    const key = idString(item.receiptId);
    grouped.set(key, (grouped.get(key) || 0) + Number(item.amount));
  }
  const total = [...grouped.values()].reduce((sum, amount) => sum + amount, 0);
  if (total > Number(transferAmount) + TOLERANCE) {
    throw new ApiError(400, 'ALLOCATIONS_EXCEED_CARD_PAYMENT');
  }

  for (const [receiptId, amount] of grouped) {
    const receipt = await RepaymentReceipt.findOne({
      _id: receiptId,
      userId,
      isDeleted: false,
    }).session(session);
    if (!receipt) throw new ApiError(404, 'REPAYMENT_RECEIPT_NOT_FOUND');
    const repayment = await Repayment.findOne({
      _id: receipt.repaymentId,
      userId,
      isDeleted: false,
    }).session(session);
    const originalTransaction = repayment
      ? await Transaction.findOne({
          _id: repayment.transactionId,
          type: 'expense',
          creditCardAccountId,
          isCreditCardPurchaseMirror: { $ne: true },
        }).session(session)
      : null;
    if (!originalTransaction) throw new ApiError(400, 'RECEIPT_NOT_RESERVED_FOR_THIS_CARD');
    await assertEligibleAccount(receipt.destinationAccountId, userId, session);
    if (idString(receipt.destinationAccountId) !== idString(sourceAccountId)) {
      throw new ApiError(400, 'RECEIPT_DESTINATION_MUST_FUND_CARD_PAYMENT');
    }
    const existing = await CreditCardRepaymentAllocation.aggregate([
      { $match: { receiptId: receipt._id, userId, isDeleted: false } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]).session(session);
    const available = Number(receipt.amount) - Number(existing[0]?.total || 0);
    if (amount > available + TOLERANCE) throw new ApiError(400, 'ALLOCATION_EXCEEDS_UNUSED_RECEIPT');
    const lockResult = await RepaymentReceipt.updateOne(
      { _id: receipt._id, userId, isDeleted: false },
      { $inc: { allocationVersion: 1 } },
      { session },
    );
    if (lockResult.modifiedCount !== 1) throw new ApiError(409, 'RECEIPT_ALLOCATION_CONFLICT');
    await CreditCardRepaymentAllocation.create(
      [
        {
          userId,
          receiptId: receipt._id,
          repaymentId: repayment._id,
          creditCardAccountId,
          transferId,
          amount,
          date,
        },
      ],
      { session },
    );
  }
}

export async function reverseTransferAllocations(transferId, userId, session) {
  const allocations = await CreditCardRepaymentAllocation.find({
    transferId,
    userId,
    isDeleted: false,
  }).session(session);
  for (const allocation of allocations) {
    const result = await RepaymentReceipt.updateOne(
      { _id: allocation.receiptId, userId, isDeleted: false },
      { $inc: { allocationVersion: 1 } },
      { session },
    );
    if (result.modifiedCount !== 1) throw new ApiError(409, 'ALLOCATED_RECEIPT_NOT_FOUND');
    allocation.isDeleted = true;
    await allocation.save({ session });
  }
}
