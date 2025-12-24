const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema(
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
    account: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account',
      required: true,
      index: true
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: true,
      index: true
    },
    paymentMode: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PaymentMode',
      default: null // Optional
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
    receipt: {
      type: String, // URL or file path
      default: null
    },
    isRecurring: {
      type: Boolean,
      default: false
    },
    recurringFrequency: {
      type: String,
      enum: ['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'],
      default: null
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
expenseSchema.index({ userId: 1, date: -1 });
expenseSchema.index({ userId: 1, account: 1, isDeleted: 1 });
expenseSchema.index({ userId: 1, category: 1, isDeleted: 1 });
expenseSchema.index({ userId: 1, isDeleted: 1, date: -1 });

// Virtual for full datetime
expenseSchema.virtual('datetime').get(function() {
  return `${this.date}T${this.time}`;
});

// Method to check if expense belongs to user
expenseSchema.methods.belongsToUser = function(userId) {
  return this.userId.toString() === userId.toString();
};

expenseSchema.set('toJSON', {
  virtuals: true,
  transform: function(doc, ret) {
    return ret;
  }
});

module.exports = mongoose.model('Expense', expenseSchema);