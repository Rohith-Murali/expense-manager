import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { logger } from '../utils/logger.js';
import { Audit } from './Audit.js';

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    refreshTokens: [
      {
        token: {
          type: String,
          required: true,
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
);

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Log when a user is marked as deleted via save
userSchema.post('save', function (doc) {
  try {
    if (doc.isDeleted) {
      logger.warn('User saved with isDeleted=true', {
        userId: doc._id,
        email: doc.email,
        stack: new Error().stack,
      });
      // record audit
      try {
        Audit.create({
          collection: 'users',
          documentId: doc._id,
          action: 'soft_delete',
          payload: doc.toObject(),
        });
      } catch (e) {
        logger.error('Failed to write audit record for user soft-delete', e);
      }
    }
  } catch (e) {
    logger.error('Error in post-save user hook', e);
  }
});

// Detect updates that mark user deleted via query-based updates
userSchema.pre('findOneAndUpdate', function (next) {
  try {
    const update = this.getUpdate() || {};
    const isDeletedSet = (update.$set && update.$set.isDeleted) || update.isDeleted;
    if (isDeletedSet) {
      logger.warn('User being marked deleted via findOneAndUpdate', {
        query: this.getQuery(),
        update,
      });
      // write an audit record (note: can't access resulting doc here)
      try {
        const docId = this.getQuery()?._id || this.getQuery()?.id;
        Audit.create({
          collection: 'users',
          documentId: docId,
          action: 'soft_delete_via_query',
          payload: { query: this.getQuery(), update },
        });
      } catch (e) {
        logger.error('Failed to write audit record in pre-findOneAndUpdate', e);
      }
    }
  } catch (e) {
    logger.error('Error in pre-findOneAndUpdate hook for User', e);
  }
  next();
});

userSchema.pre('updateOne', function (next) {
  try {
    const update = this.getUpdate() || {};
    const isDeletedSet = (update.$set && update.$set.isDeleted) || update.isDeleted;
    if (isDeletedSet) {
      logger.warn('User being marked deleted via updateOne', { query: this.getQuery(), update });
      try {
        const docId = this.getQuery()?._id || this.getQuery()?.id;
        Audit.create({
          collection: 'users',
          documentId: docId,
          action: 'soft_delete_via_updateOne',
          payload: { query: this.getQuery(), update },
        });
      } catch (e) {
        logger.error('Failed to write audit record in pre-updateOne', e);
      }
    }
  } catch (e) {
    logger.error('Error in pre-updateOne hook for User', e);
  }
  next();
});

// Log hard deletes performed via model methods
userSchema.post('findOneAndDelete', function (doc) {
  try {
    if (doc) {
      logger.warn('User document hard-deleted via findOneAndDelete', {
        userId: doc._id,
        email: doc.email,
      });
      try {
        Audit.create({
          collection: 'users',
          documentId: doc._id,
          action: 'hard_delete',
          payload: doc.toObject(),
        });
      } catch (e) {
        logger.error('Audit write failed', e);
      }
    }
  } catch (e) {
    logger.error('Error in post-findOneAndDelete hook', e);
  }
});

userSchema.post('findByIdAndDelete', function (doc) {
  try {
    if (doc) {
      logger.warn('User document hard-deleted via findByIdAndDelete', {
        userId: doc._id,
        email: doc.email,
      });
      try {
        Audit.create({
          collection: 'users',
          documentId: doc._id,
          action: 'hard_delete',
          payload: doc.toObject(),
        });
      } catch (e) {
        logger.error('Audit write failed', e);
      }
    }
  } catch (e) {
    logger.error('Error in post-findByIdAndDelete hook', e);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Remove password from JSON output
userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.refreshTokens;
  return obj;
};

export const User = mongoose.model('User', userSchema);
