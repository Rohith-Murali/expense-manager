import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema(
  {
    accountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['expense', 'income', 'transfer-out', 'transfer-in'],
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: function () {
        return this.type !== 'transfer-out' && this.type !== 'transfer-in';
      },
    },
    subcategoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subcategory',
      default: null,
    },
    paymentTypeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PaymentType',
      required: function () {
        return (
          this.type !== 'transfer-out' &&
          this.type !== 'transfer-in' &&
          !this.creditCardAccountId &&
          !this.isCreditCardPurchaseMirror
        );
      },
    },
    creditCardAccountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account',
      default: null,
    },
    linkedTransactionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Transaction',
      default: null,
    },
    isCreditCardPurchaseMirror: {
      type: Boolean,
      default: false,
    },
    transferId: {
      type: mongoose.Schema.Types.ObjectId,
      required: function () {
        return this.type === 'transfer-out' || this.type === 'transfer-in';
      },
    },
    description: {
      type: String,
      trim: true,
    },
    date: {
      type: Date,
      required: true,
      default: Date.now,
    },
    tags: [String],
    attachments: [String],
    notes: String,
    isRecurring: {
      type: Boolean,
      default: false,
    },
    recurringPatternId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'RecurringPattern',
      default: null,
    },
    repaymentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Repayment',
      default: null,
    },
    personalShare: {
      type: Number,
      min: 0,
    },
    receivableAmount: {
      type: Number,
      min: 0,
    },
  },
  { timestamps: true },
);

// Query indexes for transaction lookups
transactionSchema.index({ accountId: 1, date: -1 });
transactionSchema.index({ type: 1, accountId: 1 });
transactionSchema.index({ transferId: 1 });
transactionSchema.index({ linkedTransactionId: 1 });
transactionSchema.index({ date: -1, type: 1 });

// NEW: Indexes for category/subcategory analytics
transactionSchema.index({ categoryId: 1 });
transactionSchema.index({ subcategoryId: 1 });

// NEW: Compound index for budget tracking (atomic 2.2)
transactionSchema.index({ accountId: 1, categoryId: 1, date: -1 });

// NEW: Index for recurring transaction queries
transactionSchema.index({ accountId: 1, isRecurring: 1 });
transactionSchema.index({ repaymentId: 1 });

// Helper methods for cleaner logic
transactionSchema.methods.isTransfer = function () {
  return this.type === 'transfer-out' || this.type === 'transfer-in';
};

transactionSchema.methods.isExpense = function () {
  return this.type === 'expense';
};

transactionSchema.methods.isIncome = function () {
  return this.type === 'income';
};

export const Transaction = mongoose.model('Transaction', transactionSchema);
