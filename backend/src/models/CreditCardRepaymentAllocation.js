import mongoose from 'mongoose';

const creditCardRepaymentAllocationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    receiptId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'RepaymentReceipt',
      required: true,
      index: true,
    },
    repaymentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Repayment', required: true },
    creditCardAccountId: { type: mongoose.Schema.Types.ObjectId, ref: 'Account', required: true },
    transferId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    amount: { type: Number, required: true, min: 0 },
    date: { type: Date, required: true },
    isDeleted: { type: Boolean, default: false, index: true },
  },
  { timestamps: true },
);

creditCardRepaymentAllocationSchema.index({ transferId: 1, isDeleted: 1 });

export const CreditCardRepaymentAllocation = mongoose.model(
  'CreditCardRepaymentAllocation',
  creditCardRepaymentAllocationSchema,
);
