import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema({
  accountId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Account',
    required: true,
    index: true
  },
  type: {
    type: String,
    enum: ['expense', 'income', 'transfer-out', 'transfer-in'],
    required: true,
    index: true
  },
  // Amount is stored as a positive value; semantics (add/subtract) are derived from type
  amount: {
    type: Number,
    required: true
  },
  // For expense/income transactions
  categoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: function() {
      return this.type !== 'transfer-out' && this.type !== 'transfer-in';
    }
  },
  paymentTypeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PaymentType',
    required: function() {
      return this.type !== 'transfer-out' && this.type !== 'transfer-in';
    }
  },
  // For linking transfer-out and transfer-in documents
  transferId: {
    type: mongoose.Schema.Types.ObjectId,
    required: function() {
      return this.type === 'transfer-out' || this.type === 'transfer-in';
    },
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
transactionSchema.index({ transferId: 1 });
transactionSchema.index({ date: -1, type: 1 });

export const Transaction = mongoose.model('Transaction', transactionSchema);