import mongoose from 'mongoose';

const savingsEntrySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    bucketId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SavingsBucket',
      required: true,
      index: true,
    },
    accountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account',
      default: null,
      index: true,
    },
    transactionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Transaction',
      default: null,
      index: true,
    },
    goalId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SavingsGoal',
      default: null,
      index: true,
    },
    type: {
      type: String,
      enum: ['contribution', 'withdrawal'],
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0.01,
    },
    effectiveDate: {
      type: Date,
      default: Date.now,
      index: true,
    },
    note: {
      type: String,
      trim: true,
      maxlength: 500,
      default: '',
    },
    reference: {
      type: String,
      trim: true,
      maxlength: 100,
      default: '',
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
  },
);

savingsEntrySchema.index({ userId: 1, bucketId: 1, effectiveDate: -1 });

export const SavingsEntry = mongoose.model('SavingsEntry', savingsEntrySchema);
