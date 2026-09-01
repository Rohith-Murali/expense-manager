import { Subcategory } from '../models/Subcategory.js';
import { Category } from '../models/Category.js';
import { Account } from '../models/Account.js';
import { ApiError } from '../utils/ApiError.js';

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
  const existingSubcategory = await Subcategory.findOne({
    accountId,
    parentCategoryId: data.parentCategoryId,
    name: data.name,
    isActive: true,
  });

  if (existingSubcategory) {
    throw new ApiError(
      409,
      'A subcategory with this name already exists under the selected category',
    );
  }

  const subcategory = new Subcategory({
    name: data.name,
    parentCategoryId: data.parentCategoryId,
    accountId,
    icon: data.icon,
    color: data.color,
  });

  return await subcategory.save();
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
      isActive: true,
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
export async function softDelete(userId, subcategoryId, accountId) {
  await assertAccountOwnership(accountId, userId);

  const subcategory = await Subcategory.findOneAndUpdate(
    { _id: subcategoryId, accountId },
    { isActive: false },
    { new: true },
  );

  if (!subcategory) {
    throw new ApiError(404, 'Subcategory not found');
  }

  return subcategory;
}

/**
 * Hard delete subcategory (delete from database)
 */
export async function hardDelete(userId, subcategoryId, accountId) {
  await assertAccountOwnership(accountId, userId);

  const subcategory = await Subcategory.findOneAndDelete({
    _id: subcategoryId,
    accountId,
  });

  if (!subcategory) {
    throw new ApiError(404, 'Subcategory not found');
  }

  return subcategory;
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

  for (const category of categories) {
    // Check if "None" subcategory already exists
    const existingNone = await Subcategory.findOne({
      parentCategoryId: category._id,
      accountId,
      name: 'None',
    });

    if (!existingNone) {
      const noneSubcategory = new Subcategory({
        name: 'None',
        parentCategoryId: category._id,
        accountId,
        icon: '⊘',
        color: '#808080',
        isActive: true,
      });

      await noneSubcategory.save();
      created.push(noneSubcategory);
    }
  }

  return {
    message: `Created ${created.length} default "None" subcategories`,
    created,
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
