import mongoose from 'mongoose';

const repaymentReceiptSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    repaymentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Repayment', required: true, index: true },
    participantId: { type: mongoose.Schema.Types.ObjectId, required: true },
    amount: { type: Number, required: true, min: 0 },
    date: { type: Date, required: true },
    destinationAccountId: { type: mongoose.Schema.Types.ObjectId, ref: 'Account', required: true },
    notes: { type: String, trim: true, maxlength: 1000 },
    allocationVersion: { type: Number, default: 0 },
    isDeleted: { type: Boolean, default: false, index: true },
  },
  { timestamps: true },
);

repaymentReceiptSchema.index({ repaymentId: 1, isDeleted: 1, participantId: 1 });
repaymentReceiptSchema.index({ destinationAccountId: 1, isDeleted: 1 });

export const RepaymentReceipt = mongoose.model('RepaymentReceipt', repaymentReceiptSchema);
