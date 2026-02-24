import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema({
  accountId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Account',
    required: function() {
      return this.type !== 'transfer';
    }
  },
  type: {
    type: String,
    enum: ['expense', 'income', 'transfer'],
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  categoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: function() {
      return this.type !== 'transfer';
    }
  },
  paymentTypeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PaymentType',
    required: function() {
      return this.type !== 'transfer';
    }
  },
  // For transfers
  fromAccountId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Account',
    required: function() {
      return this.type === 'transfer';
    }
  },
  toAccountId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Account',
    required: function() {
      return this.type === 'transfer';
    }
  },
  description: {
    type: String,
    trim: true
  },
  date: {
    type: Date,
    required: true,
    default: Date.now
  },
  tags: [String],
  attachments: [String],
  notes: String
}, { timestamps: true });

transactionSchema.index({ accountId: 1, date: -1 });
transactionSchema.index({ type: 1, accountId: 1 });

export const Transaction = mongoose.model('Transaction', transactionSchema);