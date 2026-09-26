import mongoose from 'mongoose';

const subcategorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    parentCategoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: true,
      index: true,
    },
    accountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account',
      required: true,
      index: true,
    },
    icon: String,
    color: String,
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
);

// Ensure unique subcategory names per parent category per account
subcategorySchema.index({ accountId: 1, parentCategoryId: 1, name: 1 }, { unique: true });

// Index for querying subcategories by parent category
subcategorySchema.index({ parentCategoryId: 1, isActive: 1 });

// Index for querying all subcategories for an account
subcategorySchema.index({ accountId: 1, isActive: 1 });

// Helper method to check if subcategory is active and valid
subcategorySchema.methods.isValid = function () {
  return this.isActive === true && this.parentCategoryId && this.accountId;
};

export const Subcategory = mongoose.model('Subcategory', subcategorySchema);
