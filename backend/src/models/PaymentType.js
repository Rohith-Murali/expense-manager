import mongoose from 'mongoose';

const paymentTypeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ['expense', 'income'],
      required: true,
    },
    accountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account',
      required: true,
    },
    icon: String,
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
);

paymentTypeSchema.index({ accountId: 1, type: 1, name: 1 }, { unique: true });

export const PaymentType = mongoose.model('PaymentType', paymentTypeSchema);
