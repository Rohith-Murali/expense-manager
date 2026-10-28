import mongoose from 'mongoose';

const creditCardStatementSchema = new mongoose.Schema(
  {
    accountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account',
      required: true,
      index: true,
    },
    periodStart: { type: Date, required: true },
    periodEnd: { type: Date, required: true },
    dueDate: { type: Date, required: true },
    purchases: { type: Number, required: true, default: 0 },
    credits: { type: Number, required: true, default: 0 },
    payments: { type: Number, required: true, default: 0 },
    statementBalance: { type: Number, required: true },
  },
  { timestamps: true },
);

creditCardStatementSchema.index({ accountId: 1, periodEnd: -1 }, { unique: true });

export const CreditCardStatement = mongoose.model(
  'CreditCardStatement',
  creditCardStatementSchema,
);
