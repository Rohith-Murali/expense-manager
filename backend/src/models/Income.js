const mongoose = require('mongoose');

const incomeSchema = new mongoose.Schema(
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
    source: {
      type: String,
      trim: true,
      maxlength: 100 // e.g., "Salary", "Freelance Project", "Investment Returns"
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
    invoice: {
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
incomeSchema.index({ userId: 1, date: -1 });
incomeSchema.index({ userId: 1, account: 1, isDeleted: 1 });
incomeSchema.index({ userId: 1, category: 1, isDeleted: 1 });
incomeSchema.index({ userId: 1, isDeleted: 1, date: -1 });

// Virtual for full datetime
incomeSchema.virtual('datetime').get(function() {
  return `${this.date}T${this.time}`;
});

// Method to check if income belongs to user
incomeSchema.methods.belongsToUser = function(userId) {
  return this.userId.toString() === userId.toString();
};

incomeSchema.set('toJSON', {
  virtuals: true,
  transform: function(doc, ret) {
    return ret;
  }
});

module.exports = mongoose.model('Income', incomeSchema);