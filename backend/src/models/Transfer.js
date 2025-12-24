const mongoose = require('mongoose');

const transferSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    amount: {
      type: Number,
      required: true,
      min: [0.01, 'Amount must be greater than 0']
    },
    date: {
      type: String, // YYYY-MM-DD format
      required: true,
      match: /^\d{4}-\d{2}-\d{2}$/
    },
    time: {
      type: String, // HH:mm format (24-hour)
      required: true,
      match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/,
      default: '00:00'
    },
    fromAccount: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account',
      required: true,
      index: true
    },
    toAccount: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account',
      required: true,
      index: true
    },
    fee: {
      type: Number,
      default: 0,
      min: [0, 'Fee cannot be negative']
    },
    note: {
      type: String,
      trim: true,
      maxlength: 500
    },
    tags: [{
      type: String,
      trim: true
    }],
    reference: {
      type: String, // Transaction reference number
      trim: true,
      maxlength: 100
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

// Compound indexes for efficient queries
transferSchema.index({ userId: 1, date: -1 });
transferSchema.index({ userId: 1, fromAccount: 1, isDeleted: 1 });
transferSchema.index({ userId: 1, toAccount: 1, isDeleted: 1 });
transferSchema.index({ userId: 1, isDeleted: 1, date: -1 });

// Virtual for full datetime
transferSchema.virtual('datetime').get(function() {
  return `${this.date}T${this.time}`;
});

// Validation: Cannot transfer to the same account
transferSchema.pre('save', function(next) {
  if (this.fromAccount.toString() === this.toAccount.toString()) {
    next(new Error('Cannot transfer to the same account'));
  } else {
    next();
  }
});

// Method to check if transfer belongs to user
transferSchema.methods.belongsToUser = function(userId) {
  return this.userId.toString() === userId.toString();
};

// Method to get the other account in the transfer
transferSchema.methods.getOtherAccount = function(accountId) {
  const accountIdStr = accountId.toString();
  if (this.fromAccount.toString() === accountIdStr) {
    return this.toAccount;
  }
  return this.fromAccount;
};

// Method to check direction relative to an account
transferSchema.methods.getDirection = function(accountId) {
  const accountIdStr = accountId.toString();
  if (this.fromAccount.toString() === accountIdStr) {
    return 'OUT';
  }
  if (this.toAccount.toString() === accountIdStr) {
    return 'IN';
  }
  return null;
};

transferSchema.set('toJSON', {
  virtuals: true,
  transform: function(doc, ret) {
    return ret;
  }
});

module.exports = mongoose.model('Transfer', transferSchema);