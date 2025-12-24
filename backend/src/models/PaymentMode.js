const mongoose = require('mongoose');

const paymentModeSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 50
    },
    type: {
      type: String,
      enum: ['CASH', 'CARD', 'UPI', 'NET_BANKING', 'WALLET', 'CHEQUE', 'OTHER'],
      default: 'OTHER'
    },
    color: {
      type: String,
      default: '#14b8a6',
      match: /^#[0-9A-Fa-f]{6}$/
    },
    icon: {
      type: String,
      default: 'payment'
    },
    description: {
      type: String,
      trim: true,
      maxlength: 200
    },
    isDefault: {
      type: Boolean,
      default: false
    },
    isSystem: {
      type: Boolean,
      default: false // System payment modes cannot be deleted
    },
    isDeleted: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

// Compound index
paymentModeSchema.index({ userId: 1, isDeleted: 1 });
paymentModeSchema.index({ userId: 1, name: 1 });

// Ensure unique payment mode names per user
paymentModeSchema.index(
  { userId: 1, name: 1, isDeleted: 1 },
  { unique: true, partialFilterExpression: { isDeleted: false } }
);

paymentModeSchema.set('toJSON', {
  virtuals: true
});

module.exports = mongoose.model('PaymentMode', paymentModeSchema);