import mongoose from 'mongoose';

const accountSchema = new mongoose.Schema(
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
      trim: true
    },
    type: {
      type: String,
      enum: ['CASH', 'BANK', 'CARD', 'WALLET', 'OTHER'],
      default: 'BANK'
    },
    openingBalance: {
      type: Number,
      required: true,
      default: 0
    },
    currentBalance: {
      type: Number,
      required: true,
      default: 0
    },
    currency: {
      type: String,
      default: 'INR'
    },
    description: {
      type: String,
      trim: true
    },
    color: {
      type: String,
      default: '#14b8a6' // Default teal color
    },
    icon: {
      type: String,
      default: 'wallet' // Icon identifier
    },
    isArchived: {
      type: Boolean,
      default: false
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

// Index for faster queries
accountSchema.index({ userId: 1, isDeleted: 1 });
accountSchema.index({ userId: 1, isArchived: 1, isDeleted: 1 });

// Set currentBalance to openingBalance on create if not provided
accountSchema.pre('save', function(next) {
  if (!this.currentBalance) {
    this.currentBalance = this.openingBalance;
  }
  next();
});

// Don't delete account ID and timestamps in JSON
accountSchema.set('toJSON', {
  virtuals: true,
  transform: function(doc, ret) {
    return ret;
  }
});

export const Account = mongoose.model('Account', accountSchema);