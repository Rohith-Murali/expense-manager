const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema(
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
      enum: ['EXPENSE', 'INCOME'],
      required: true
    },
    color: {
      type: String,
      default: '#14b8a6', // Default teal
      match: /^#[0-9A-Fa-f]{6}$/
    },
    icon: {
      type: String,
      default: 'tag'
    },
    description: {
      type: String,
      trim: true,
      maxlength: 200
    },
    parentCategory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      default: null // For subcategories
    },
    isSystem: {
      type: Boolean,
      default: false // System categories cannot be deleted
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

// Compound index for user and type
categorySchema.index({ userId: 1, type: 1, isDeleted: 1 });
categorySchema.index({ userId: 1, name: 1 });

// Ensure unique category names per user per type
categorySchema.index(
  { userId: 1, name: 1, type: 1, isDeleted: 1 },
  { unique: true, partialFilterExpression: { isDeleted: false } }
);

categorySchema.set('toJSON', {
  virtuals: true
});

module.exports = mongoose.model('Category', categorySchema);