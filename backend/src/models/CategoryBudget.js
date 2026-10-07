import mongoose from 'mongoose';

const categoryBudgetSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: true,
      index: true,
    },
    subcategory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subcategory',
      index: true,
      default: null,
    },
    month: {
      type: Number,
      required: true,
      min: 1,
      max: 12,
    },
    year: {
      type: Number,
      required: true,
      min: 2000,
      max: 2100,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    rollover: {
      type: Boolean,
      default: false,
    },
    alertThreshold: {
      type: Number,
      default: 80,
      min: 0,
      max: 100,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
);

// Compound indexes
categoryBudgetSchema.index({ userId: 1, year: 1, month: 1 });
categoryBudgetSchema.index({ userId: 1, category: 1, year: 1, month: 1 });
categoryBudgetSchema.index({ userId: 1, category: 1, subcategory: 1, year: 1, month: 1 });

const parentBudgetIndexName = 'userId_1_category_1_year_1_month_1_isDeleted_1';
const parentBudgetIndexKey = {
  userId: 1,
  category: 1,
  year: 1,
  month: 1,
  isDeleted: 1,
};
const parentBudgetPartialFilter = {
  isDeleted: false,
  subcategory: null,
};

// Ensure one budget per category per month, and one per subcategory per month
categoryBudgetSchema.index(
  parentBudgetIndexKey,
  {
    name: parentBudgetIndexName,
    unique: true,
    partialFilterExpression: parentBudgetPartialFilter,
  },
);
categoryBudgetSchema.index(
  { userId: 1, category: 1, subcategory: 1, year: 1, month: 1, isDeleted: 1 },
  {
    unique: true,
    partialFilterExpression: { isDeleted: false, subcategory: { $exists: true } },
  },
);

// Virtual for period string
categoryBudgetSchema.virtual('period').get(function () {
  return `${this.year}-${String(this.month).padStart(2, '0')}`;
});

categoryBudgetSchema.set('toJSON', {
  virtuals: true,
});

export const CategoryBudget = mongoose.model('CategoryBudget', categoryBudgetSchema);
