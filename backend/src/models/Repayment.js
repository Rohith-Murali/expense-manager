import mongoose from 'mongoose';

const participantSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    amount: { type: Number, required: true, min: 0 },
  },
  { _id: true },
);

const repaymentSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    transactionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Transaction', required: true },
    title: { type: String, trim: true, maxlength: 200, default: '' },
    date: { type: Date, required: true },
    notes: { type: String, trim: true, maxlength: 1000 },
    sourceAccountId: { type: mongoose.Schema.Types.ObjectId, ref: 'Account', required: true },
    totalAmount: { type: Number, required: true, min: 0 },
    personalShare: { type: Number, required: true, min: 0 },
    receivableAmount: { type: Number, required: true, min: 0 },
    participants: { type: [participantSchema], required: true },
    isDeleted: { type: Boolean, default: false, index: true },
    concurrencyVersion: { type: Number, default: 0 },
  },
  { timestamps: true },
);

repaymentSchema.index({ userId: 1, isDeleted: 1, date: -1 });
repaymentSchema.index(
  { transactionId: 1 },
  { unique: true, partialFilterExpression: { isDeleted: false } },
);

export const Repayment = mongoose.model('Repayment', repaymentSchema);
