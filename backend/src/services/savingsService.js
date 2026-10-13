import mongoose from 'mongoose';
import { ApiError } from '../utils/ApiError.js';
import { SavingsBucket } from '../models/SavingsBucket.js';
import { SavingsGoal } from '../models/SavingsGoal.js';
import { SavingsEntry } from '../models/SavingsEntry.js';

const toObjectId = (value) => new mongoose.Types.ObjectId(value);

async function assertBucketOwnership(bucketId, userId) {
  const bucket = await SavingsBucket.findOne({
    _id: bucketId,
    userId,
    isDeleted: false,
  }).lean();

  if (!bucket) {
    throw new ApiError(404, 'SAVINGS_BUCKET_NOT_FOUND');
  }

  return bucket;
}

async function assertGoalOwnership(goalId, userId) {
  const goal = await SavingsGoal.findOne({
    _id: goalId,
    userId,
    isDeleted: false,
  }).lean();

  if (!goal) {
    throw new ApiError(404, 'SAVINGS_GOAL_NOT_FOUND');
  }

  return goal;
}

async function getBucketBalance(bucketId, userId) {
  const [summary] = await SavingsEntry.aggregate([
    {
      $match: {
        userId: toObjectId(userId),
        bucketId: toObjectId(bucketId),
        isDeleted: false,
      },
    },
    {
      $group: {
        _id: null,
        contributions: {
          $sum: {
            $cond: [{ $eq: ['$type', 'contribution'] }, '$amount', 0],
          },
        },
        withdrawals: {
          $sum: {
            $cond: [{ $eq: ['$type', 'withdrawal'] }, '$amount', 0],
          },
        },
      },
    },
  ]);

  return (summary?.contributions || 0) - (summary?.withdrawals || 0);
}

async function getGoalCurrentAmount(goalId, userId, bucketId = null) {
  const match = {
    userId: toObjectId(userId),
    isDeleted: false,
    $or: [{ goalId: toObjectId(goalId) }],
  };

  if (bucketId) {
    match.$or.push({ bucketId: toObjectId(bucketId) });
  }

  const [summary] = await SavingsEntry.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        contributions: {
          $sum: {
            $cond: [{ $eq: ['$type', 'contribution'] }, '$amount', 0],
          },
        },
        withdrawals: {
          $sum: {
            $cond: [{ $eq: ['$type', 'withdrawal'] }, '$amount', 0],
          },
        },
      },
    },
  ]);

  return (summary?.contributions || 0) - (summary?.withdrawals || 0);
}

async function toBucketView(bucket, userId) {
  const balance = await getBucketBalance(bucket._id, userId);
  return {
    ...bucket,
    balance,
  };
}

async function toGoalView(goal, userId) {
  const currentAmount = await getGoalCurrentAmount(goal._id, userId, goal.bucketId);
  const targetAmount = Number(goal.targetAmount || 0);
  const progressPercent = targetAmount > 0 ? Math.min((currentAmount / targetAmount) * 100, 100) : 0;
  const remainingAmount = Math.max(targetAmount - currentAmount, 0);

  return {
    ...goal,
    currentAmount,
    remainingAmount,
    progressPercent,
    isComplete: currentAmount >= targetAmount,
  };
}

export async function createBucket(userId, input) {
  const bucket = await SavingsBucket.create({
    userId,
    ...input,
  });

  return bucket.toObject();
}

export async function getBuckets(userId, filters = {}) {
  const { status } = filters;
  const query = {
    userId,
    isDeleted: false,
  };

  if (status) {
    query.status = status;
  }

  const buckets = await SavingsBucket.find(query).sort({ createdAt: -1 }).lean();

  const bucketsWithBalance = await Promise.all(buckets.map((bucket) => toBucketView(bucket, userId)));

  return bucketsWithBalance;
}

export async function getBucketById(bucketId, userId) {
  const bucket = await assertBucketOwnership(bucketId, userId);
  return toBucketView(bucket, userId);
}

export async function updateBucket(bucketId, userId, updates) {
  const { userId: _userId, isDeleted, ...allowed } = updates;
  const existing = await SavingsBucket.findOne({
    _id: bucketId,
    userId,
    isDeleted: false,
  });

  if (!existing) {
    throw new ApiError(404, 'SAVINGS_BUCKET_NOT_FOUND');
  }

  const bucket = await SavingsBucket.findOneAndUpdate(
    { _id: bucketId, userId, isDeleted: false },
    { $set: allowed },
    { new: true, runValidators: true },
  ).lean();

  if (!bucket) {
    throw new ApiError(404, 'SAVINGS_BUCKET_NOT_FOUND');
  }

  return toBucketView(bucket, userId);
}

export async function archiveBucket(bucketId, userId) {
  const bucket = await SavingsBucket.findOne({
    _id: bucketId,
    userId,
    isDeleted: false,
  });

  if (!bucket) {
    throw new ApiError(404, 'SAVINGS_BUCKET_NOT_FOUND');
  }

  bucket.status = bucket.status === 'archived' ? 'active' : 'archived';
  await bucket.save();

  return toBucketView(bucket.toObject(), userId);
}

export async function deleteBucket(bucketId, userId) {
  const bucket = await SavingsBucket.findOne({
    _id: bucketId,
    userId,
    isDeleted: false,
  });

  if (!bucket) {
    throw new ApiError(404, 'SAVINGS_BUCKET_NOT_FOUND');
  }

  await SavingsBucket.updateOne(
    { _id: bucketId, userId },
    { $set: { isDeleted: true, status: 'archived' } },
  );

  await SavingsGoal.updateMany(
    { userId, bucketId, isDeleted: false },
    { $set: { bucketId: null, status: 'paused' } },
  );
}

export async function createGoal(userId, input) {
  if (input.bucketId) {
    await assertBucketOwnership(input.bucketId, userId);
  }

  const goal = await SavingsGoal.create({
    userId,
    ...input,
  });

  return toGoalView(goal.toObject(), userId);
}

export async function getGoals(userId, filters = {}) {
  const { status } = filters;
  const query = {
    userId,
    isDeleted: false,
  };

  if (status) {
    query.status = status;
  }

  const goals = await SavingsGoal.find(query).sort({ createdAt: -1 }).lean();

  const goalsWithProgress = await Promise.all(goals.map((goal) => toGoalView(goal, userId)));

  return goalsWithProgress;
}

export async function getGoalById(goalId, userId) {
  const goal = await assertGoalOwnership(goalId, userId);
  return toGoalView(goal, userId);
}

export async function updateGoal(goalId, userId, updates) {
  const { userId: _userId, isDeleted, ...allowed } = updates;
  const existing = await SavingsGoal.findOne({
    _id: goalId,
    userId,
    isDeleted: false,
  });

  if (!existing) {
    throw new ApiError(404, 'SAVINGS_GOAL_NOT_FOUND');
  }

  if (allowed.bucketId) {
    await assertBucketOwnership(allowed.bucketId, userId);
  }

  const goal = await SavingsGoal.findOneAndUpdate(
    { _id: goalId, userId, isDeleted: false },
    { $set: allowed },
    { new: true, runValidators: true },
  ).lean();

  if (!goal) {
    throw new ApiError(404, 'SAVINGS_GOAL_NOT_FOUND');
  }

  return toGoalView(goal, userId);
}

export async function archiveGoal(goalId, userId) {
  const goal = await SavingsGoal.findOne({
    _id: goalId,
    userId,
    isDeleted: false,
  });

  if (!goal) {
    throw new ApiError(404, 'SAVINGS_GOAL_NOT_FOUND');
  }

  goal.status = goal.status === 'archived' ? 'active' : 'archived';
  await goal.save();

  return toGoalView(goal.toObject(), userId);
}

export async function deleteGoal(goalId, userId) {
  const goal = await SavingsGoal.findOne({ _id: goalId, userId, isDeleted: false });

  if (!goal) {
    throw new ApiError(404, 'SAVINGS_GOAL_NOT_FOUND');
  }

  await SavingsGoal.updateOne(
    { _id: goalId, userId },
    { $set: { isDeleted: true, status: 'archived' } },
  );
}

export async function createEntry(userId, input) {
  const { bucketId, goalId, type, amount, ...rest } = input;

  const bucket = await assertBucketOwnership(bucketId, userId);
  if (bucket.status === 'archived') {
    throw new ApiError(400, 'SAVINGS_BUCKET_ARCHIVED');
  }

  let goal = null;
  if (goalId) {
    goal = await assertGoalOwnership(goalId, userId);
    if (goal.bucketId && String(goal.bucketId) !== String(bucketId)) {
      throw new ApiError(400, 'GOAL_BUCKET_MISMATCH');
    }
  }

  const balance = await getBucketBalance(bucketId, userId);
  if (type === 'withdrawal' && amount > balance) {
    throw new ApiError(400, 'INSUFFICIENT_SAVINGS_BALANCE');
  }

  let goalBalance = 0;
  if (goalId) {
    goalBalance = await getGoalCurrentAmount(goalId, userId, goal.bucketId || bucketId);
    if (type === 'withdrawal' && amount > goalBalance) {
      throw new ApiError(400, 'INSUFFICIENT_GOAL_BALANCE');
    }
  }

  const entry = await SavingsEntry.create({
    userId,
    bucketId,
    goalId: goalId || null,
    type,
    amount,
    ...rest,
  });

  if (goal && !goal.bucketId) {
    await SavingsGoal.updateOne({ _id: goalId, userId }, { $set: { bucketId } });
  }

  return {
    ...entry.toObject(),
    bucketBalance: await getBucketBalance(bucketId, userId),
    goalBalance: goalId ? await getGoalCurrentAmount(goalId, userId, goal.bucketId || bucketId) : 0,
  };
}

export async function getEntries(userId, { bucketId = null, goalId = null } = {}) {
  const query = { userId, isDeleted: false };
  if (bucketId) {
    query.bucketId = toObjectId(bucketId);
  }
  if (goalId) {
    query.goalId = toObjectId(goalId);
  }

  const entries = await SavingsEntry.find(query).sort({ effectiveDate: -1, createdAt: -1 }).lean();
  return entries;
}

export async function getEntryById(entryId, userId) {
  const entry = await SavingsEntry.findOne({
    _id: entryId,
    userId,
    isDeleted: false,
  }).lean();

  if (!entry) {
    throw new ApiError(404, 'SAVINGS_ENTRY_NOT_FOUND');
  }

  return entry;
}

export async function updateEntry(entryId, userId, updates) {
  const existing = await SavingsEntry.findOne({
    _id: entryId,
    userId,
    isDeleted: false,
  });

  if (!existing) {
    throw new ApiError(404, 'SAVINGS_ENTRY_NOT_FOUND');
  }

  const nextBucketId = updates.bucketId || existing.bucketId;
  const nextGoalId = updates.goalId ?? existing.goalId;
  const nextType = updates.type || existing.type;
  const nextAmount = updates.amount ?? existing.amount;

  if (nextGoalId) {
    const goal = await assertGoalOwnership(nextGoalId, userId);
    if (goal.bucketId && String(goal.bucketId) !== String(nextBucketId)) {
      throw new ApiError(400, 'GOAL_BUCKET_MISMATCH');
    }
  }

  await assertBucketOwnership(nextBucketId, userId);

  const nextBalance = await getBucketBalance(nextBucketId, userId);
  if (nextType === 'withdrawal' && nextAmount > nextBalance) {
    throw new ApiError(400, 'INSUFFICIENT_SAVINGS_BALANCE');
  }

  const updated = await SavingsEntry.findOneAndUpdate(
    { _id: entryId, userId, isDeleted: false },
    { $set: updates },
    { new: true, runValidators: true },
  ).lean();

  return updated;
}

export async function deleteEntry(entryId, userId) {
  const entry = await SavingsEntry.findOne({
    _id: entryId,
    userId,
    isDeleted: false,
  });

  if (!entry) {
    throw new ApiError(404, 'SAVINGS_ENTRY_NOT_FOUND');
  }

  await SavingsEntry.updateOne({ _id: entryId, userId }, { $set: { isDeleted: true } });
}

export async function getSavingsSummary(userId) {
  const [bucketSummary] = await SavingsBucket.aggregate([
    {
      $match: {
        userId: toObjectId(userId),
        isDeleted: false,
      },
    },
    {
      $lookup: {
        from: 'savingsentries',
        localField: '_id',
        foreignField: 'bucketId',
        as: 'entries',
      },
    },
    {
      $project: {
        balance: {
          $subtract: [
            {
              $sum: {
                $map: {
                  input: '$entries',
                  as: 'entry',
                  in: {
                    $cond: [{ $eq: ['$$entry.type', 'contribution'] }, '$$entry.amount', 0],
                  },
                },
              },
            },
            {
              $sum: {
                $map: {
                  input: '$entries',
                  as: 'entry',
                  in: {
                    $cond: [{ $eq: ['$$entry.type', 'withdrawal'] }, '$$entry.amount', 0],
                  },
                },
              },
            },
          ],
        },
      },
    },
    {
      $group: {
        _id: null,
        bucketCount: { $sum: 1 },
        totalSaved: { $sum: '$balance' },
      },
    },
  ]);

  const [goalSummary] = await SavingsGoal.aggregate([
    {
      $match: {
        userId: toObjectId(userId),
        isDeleted: false,
      },
    },
    {
      $lookup: {
        from: 'savingsentries',
        localField: '_id',
        foreignField: 'goalId',
        as: 'entries',
      },
    },
    {
      $project: {
        currentAmount: {
          $subtract: [
            {
              $sum: {
                $map: {
                  input: '$entries',
                  as: 'entry',
                  in: {
                    $cond: [{ $eq: ['$$entry.type', 'contribution'] }, '$$entry.amount', 0],
                  },
                },
              },
            },
            {
              $sum: {
                $map: {
                  input: '$entries',
                  as: 'entry',
                  in: {
                    $cond: [{ $eq: ['$$entry.type', 'withdrawal'] }, '$$entry.amount', 0],
                  },
                },
              },
            },
          ],
        },
        targetAmount: '$targetAmount',
        status: '$status',
      },
    },
    {
      $group: {
        _id: null,
        goalCount: { $sum: 1 },
        completedGoals: {
          $sum: {
            $cond: [{ $gte: ['$currentAmount', '$targetAmount'] }, 1, 0],
          },
        },
        totalTarget: { $sum: '$targetAmount' },
      },
    },
  ]);

  return {
    bucketCount: bucketSummary?.bucketCount || 0,
    totalSaved: bucketSummary?.totalSaved || 0,
    goalCount: goalSummary?.goalCount || 0,
    completedGoals: goalSummary?.completedGoals || 0,
    totalTarget: goalSummary?.totalTarget || 0,
  };
}
