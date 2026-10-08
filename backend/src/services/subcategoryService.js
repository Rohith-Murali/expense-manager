import { Subcategory } from '../models/Subcategory.js';
import { Category } from '../models/Category.js';
import { Account } from '../models/Account.js';
import { ApiError } from '../utils/ApiError.js';
import { moveTransactionsToOthers } from './transactionMigrationService.js';
import {
  DEFAULT_CATEGORIES,
  DEFAULT_SUBCATEGORIES,
  DEFAULT_NONE_SUBCATEGORY,
} from '../config/defaultCategoryData.js';

/**
 * Verify that user owns the account
 */
async function assertAccountOwnership(accountId, userId) {
  const account = await Account.findOne({
    _id: accountId,
    userId,
    isDeleted: false,
  });

  if (!account) {
    throw new ApiError(403, 'Access denied: Account not found or does not belong to you');
  }

  return account;
}

/**
 * Verify that category belongs to the account and is of correct type
 */
async function assertCategoryBelongsToAccount(categoryId, accountId) {
  const category = await Category.findOne({
    _id: categoryId,
    accountId,
    isActive: true,
  });

  if (!category) {
    throw new ApiError(404, 'Category not found or is inactive');
  }

  return category;
}

/**
 * Verify that subcategory belongs to account and parent category
 */
async function assertSubcategoryBelongsToCategory(subcategoryId, parentCategoryId, accountId) {
  const subcategory = await Subcategory.findOne({
    _id: subcategoryId,
    parentCategoryId,
    accountId,
    isActive: true,
  });

  if (!subcategory) {
    throw new ApiError(404, 'Subcategory not found or does not belong to the specified category');
  }

  return subcategory;
}

/**
 * Create subcategory
 */
export async function create(userId, accountId, data) {
  await assertAccountOwnership(accountId, userId);

  // Verify parent category exists and belongs to account
  const parentCategory = await assertCategoryBelongsToAccount(data.parentCategoryId, accountId);

  // Check for duplicate subcategory name under same parent
  const query = {
    accountId,
    parentCategoryId: data.parentCategoryId,
    name: data.name,
  };
  const existingSubcategory = await Subcategory.findOne(query).lean();

  if (existingSubcategory?.isActive) {
    throw new ApiError(
      409,
      'A subcategory with this name already exists under the selected category',
    );
  }

  if (existingSubcategory) {
    return await Subcategory.findOneAndUpdate(
      query,
      {
        $set: {
          isActive: true,
          ...(data.icon !== undefined && { icon: data.icon }),
          ...(data.color !== undefined && { color: data.color }),
        },
      },
      { new: true, runValidators: true },
    );
  }

  const subcategory = new Subcategory({
    name: data.name,
    parentCategoryId: data.parentCategoryId,
    accountId,
    icon: data.icon,
    color: data.color,
  });

  try {
    return await subcategory.save();
  } catch (error) {
    if (error?.code !== 11000) throw error;

    const racedSubcategory = await Subcategory.findOne(query).lean();
    if (!racedSubcategory) throw error;
    if (racedSubcategory.isActive) {
      throw new ApiError(
        409,
        'A subcategory with this name already exists under the selected category',
      );
    }

    return await Subcategory.findOneAndUpdate(
      query,
      {
        $set: {
          isActive: true,
          ...(data.icon !== undefined && { icon: data.icon }),
          ...(data.color !== undefined && { color: data.color }),
        },
      },
      { new: true, runValidators: true },
    );
  }
}

/**
 * Get subcategory by ID
 */
export async function getById(userId, subcategoryId, accountId) {
  await assertAccountOwnership(accountId, userId);

  const subcategory = await Subcategory.findOne({
    _id: subcategoryId,
    accountId,
  })
    .populate('parentCategoryId')
    .lean();

  if (!subcategory) {
    throw new ApiError(404, 'Subcategory not found');
  }

  return subcategory;
}

/**
 * Get all active subcategories for a parent category
 */
export async function getByParentCategory(userId, parentCategoryId, accountId) {
  await assertAccountOwnership(accountId, userId);

  // Verify parent category exists
  await assertCategoryBelongsToAccount(parentCategoryId, accountId);

  return await Subcategory.find({
    parentCategoryId,
    accountId,
    isActive: true,
  })
    .sort({ name: 1 })
    .lean();
}

/**
 * Get all subcategories for an account (all categories)
 */
export async function getByAccount(userId, accountId) {
  await assertAccountOwnership(accountId, userId);

  return await Subcategory.find({
    accountId,
    isActive: true,
  })
    .populate('parentCategoryId')
    .sort({ name: 1 })
    .lean();
}

/**
 * Update subcategory
 */
export async function update(userId, subcategoryId, accountId, data) {
  await assertAccountOwnership(accountId, userId);

  const subcategory = await Subcategory.findOne({
    _id: subcategoryId,
    accountId,
  });

  if (!subcategory) {
    throw new ApiError(404, 'Subcategory not found');
  }

  // If updating name, check for duplicates under same parent
  if (data.name && data.name !== subcategory.name) {
    const duplicate = await Subcategory.findOne({
      accountId,
      parentCategoryId: subcategory.parentCategoryId,
      name: data.name,
      _id: { $ne: subcategoryId },
    });

    if (duplicate) {
      throw new ApiError(
        409,
        'A subcategory with this name already exists under the selected category',
      );
    }
  }

  const updatedSubcategory = await Subcategory.findOneAndUpdate(
    { _id: subcategoryId, accountId },
    {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.icon !== undefined && { icon: data.icon }),
      ...(data.color !== undefined && { color: data.color }),
      ...(data.isActive !== undefined && { isActive: data.isActive }),
    },
    { new: true, runValidators: true },
  )
    .populate('parentCategoryId')
    .lean();

  if (!updatedSubcategory) {
    throw new ApiError(404, 'Subcategory not found after update');
  }

  return updatedSubcategory;
}

/**
 * Soft delete subcategory (set isActive to false)
 */
async function getActiveSubcategoryForDeletion(subcategoryId, accountId) {
  const subcategory = await Subcategory.findOne({
    _id: subcategoryId,
    accountId,
    isActive: true,
  });
  if (!subcategory) throw new ApiError(404, 'Subcategory not found');

  const parentCategory = await Category.findOne({
    _id: subcategory.parentCategoryId,
    accountId,
    isActive: true,
  });
  if (!parentCategory) throw new ApiError(404, 'Parent category not found');
  if (parentCategory.name === 'Others' && subcategory.name === DEFAULT_NONE_SUBCATEGORY.name) {
    throw new ApiError(400, 'The Others - None destination is reserved for deleted transaction reassignment');
  }

  return { subcategory, parentCategory };
}

async function moveSubcategoryTransactions(
  accountId,
  subcategory,
  parentCategory,
  confirmTransactionMove,
) {
  return await moveTransactionsToOthers(
    accountId,
    parentCategory.type,
    {
      accountId,
      categoryId: parentCategory._id,
      subcategoryId: subcategory._id,
    },
    confirmTransactionMove,
  );
}

export async function softDelete(userId, subcategoryId, accountId, confirmTransactionMove = false) {
  await assertAccountOwnership(accountId, userId);

  const { subcategory, parentCategory } = await getActiveSubcategoryForDeletion(
    subcategoryId,
    accountId,
  );
  const migration = await moveSubcategoryTransactions(
    accountId,
    subcategory,
    parentCategory,
    confirmTransactionMove,
  );

  const deletedSubcategory = await Subcategory.findOneAndUpdate(
    { _id: subcategoryId, accountId, isActive: true },
    { isActive: false },
    { new: true },
  );

  if (!deletedSubcategory) throw new ApiError(404, 'Subcategory not found');

  return { subcategory: deletedSubcategory, ...migration };
}

/**
 * Hard delete subcategory (delete from database)
 */
export async function hardDelete(userId, subcategoryId, accountId, confirmTransactionMove = false) {
  await assertAccountOwnership(accountId, userId);

  const { subcategory, parentCategory } = await getActiveSubcategoryForDeletion(
    subcategoryId,
    accountId,
  );
  const migration = await moveSubcategoryTransactions(
    accountId,
    subcategory,
    parentCategory,
    confirmTransactionMove,
  );

  const deletedSubcategory = await Subcategory.findOneAndDelete({
    _id: subcategoryId,
    accountId,
  });

  if (!deletedSubcategory) throw new ApiError(404, 'Subcategory not found');

  return { subcategory: deletedSubcategory, ...migration };
}

/**
 * Create default "None" subcategory for all categories in an account
 * This allows transactions without a specific subcategory
 */
export async function ensureDefaultSubcategories(userId, accountId) {
  await assertAccountOwnership(accountId, userId);

  // Get all active categories for the account
  const categories = await Category.find({
    accountId,
    isActive: true,
  }).lean();

  const created = [];
  const restored = [];

  for (const category of categories) {
    const defaultCategory = DEFAULT_CATEGORIES.find(
      (item) => item.name === category.name && item.type === category.type,
    );
    const names = [
      DEFAULT_NONE_SUBCATEGORY.name,
      ...(defaultCategory ? DEFAULT_SUBCATEGORIES[defaultCategory.name] || [] : []),
    ];

    for (const name of names) {
      const query = {
        parentCategoryId: category._id,
        accountId,
        name,
      };
      const isNone = name === DEFAULT_NONE_SUBCATEGORY.name;
      const defaults = isNone ? DEFAULT_NONE_SUBCATEGORY : {};
      const existing = await Subcategory.findOne(query).lean();

      if (existing) {
        if (existing.isActive === false) {
          const restoredSubcategory = await Subcategory.findOneAndUpdate(
            query,
            { $set: { ...defaults, isActive: true } },
            { new: true, runValidators: true },
          );
          restored.push(restoredSubcategory);
        }
        continue;
      }

      try {
        const subcategory = await Subcategory.create({
          name,
          parentCategoryId: category._id,
          accountId,
          ...defaults,
        });
        created.push(subcategory);
      } catch (error) {
        if (error?.code !== 11000) throw error;
        const racedSubcategory = await Subcategory.findOneAndUpdate(
          query,
          { $set: { ...defaults, isActive: true } },
          { new: true, runValidators: true },
        );
        if (!racedSubcategory) throw error;
        restored.push(racedSubcategory);
      }
    }
  }

  return {
    message: `Created ${created.length} and restored ${restored.length} default subcategories`,
    count: created.length + restored.length,
    createdCount: created.length,
    restoredCount: restored.length,
    created,
    restored,
  };
}

/**
 * Get all subcategories for a specific category
 */
export async function getAllForCategory(userId, categoryId, accountId) {
  await assertAccountOwnership(accountId, userId);

  const category = await assertCategoryBelongsToAccount(categoryId, accountId);

  return await Subcategory.find({
    parentCategoryId: categoryId,
    accountId,
  })
    .sort({ name: 1 })
    .lean();
}
