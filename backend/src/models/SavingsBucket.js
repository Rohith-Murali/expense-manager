import mongoose from 'mongoose';

const savingsBucketSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 500,
      default: '',
    },
    icon: {
      type: String,
      default: 'piggy-bank',
      maxlength: 50,
    },
    color: {
      type: String,
      default: '#14b8a6',
      match: /^#[0-9A-Fa-f]{6}$/,
    },
    status: {
      type: String,
      enum: ['active', 'archived'],
      default: 'active',
      index: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
  },
);

savingsBucketSchema.index({ userId: 1, name: 1 }, { unique: true });

export const SavingsBucket = mongoose.model('SavingsBucket', savingsBucketSchema);
