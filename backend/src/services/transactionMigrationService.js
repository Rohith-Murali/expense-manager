import { Category } from '../models/Category.js';
import { Subcategory } from '../models/Subcategory.js';
import { Transaction } from '../models/Transaction.js';
import { ApiError } from '../utils/ApiError.js';
import { DEFAULT_CATEGORIES, DEFAULT_NONE_SUBCATEGORY } from '../config/defaultCategoryData.js';

async function ensureNoneSubcategory(category) {
  const query = {
    accountId: category.accountId,
    parentCategoryId: category._id,
    name: DEFAULT_NONE_SUBCATEGORY.name,
  };
  const existing = await Subcategory.findOne(query).lean();

  if (existing?.isActive === false) {
    return await Subcategory.findOneAndUpdate(
      query,
      { $set: { ...DEFAULT_NONE_SUBCATEGORY, isActive: true } },
      { new: true, runValidators: true },
    );
  }
  if (existing) return existing;

  try {
    return await Subcategory.create({
      ...DEFAULT_NONE_SUBCATEGORY,
      accountId: category.accountId,
      parentCategoryId: category._id,
    });
  } catch (error) {
    if (error?.code !== 11000) throw error;
    return await Subcategory.findOneAndUpdate(
      query,
      { $set: { ...DEFAULT_NONE_SUBCATEGORY, isActive: true } },
      { new: true, runValidators: true },
    );
  }
}

export async function ensureOthersDestination(accountId, type) {
  const defaults = DEFAULT_CATEGORIES.find((item) => item.name === 'Others' && item.type === type);
  if (!defaults) throw new ApiError(400, 'No Others destination exists for this transaction type');

  const query = { accountId, name: defaults.name, type };
  let category = await Category.findOne(query).lean();

  if (category?.isActive === false) {
    category = await Category.findOneAndUpdate(
      query,
      { $set: { isActive: true } },
      { new: true, runValidators: true },
    );
    await Subcategory.updateMany(
      { accountId, parentCategoryId: category._id, isActive: false },
      { $set: { isActive: true } },
    );
  } else if (!category) {
    try {
      category = await Category.create({ ...defaults, accountId });
    } catch (error) {
      if (error?.code !== 11000) throw error;
      category = await Category.findOneAndUpdate(
        query,
        { $set: { ...defaults, isActive: true } },
        { new: true, runValidators: true },
      );
    }
  }

  if (!category) throw new ApiError(500, 'Could not prepare the Others category');

  const noneSubcategory = await ensureNoneSubcategory(category);
  if (!noneSubcategory?.isActive) {
    throw new ApiError(500, 'Could not prepare the None subcategory for Others');
  }

  return { categoryId: category._id, subcategoryId: noneSubcategory._id };
}

export function transactionMoveConfirmationError(count) {
  return new ApiError(
    409,
    `This will move ${count} transaction${count === 1 ? '' : 's'} to Others - None. Confirm to continue.`,
    { requiresTransactionMove: true, transactionCount: count, destination: 'Others - None' },
  );
}

export async function moveTransactionsToOthers(accountId, type, filter, confirmed = false) {
  const transactionCount = await Transaction.countDocuments(filter);
  if (transactionCount && !confirmed) {
    throw transactionMoveConfirmationError(transactionCount);
  }
  if (!transactionCount) return { transactionCount: 0, movedCount: 0 };

  const destination = await ensureOthersDestination(accountId, type);
  const result = await Transaction.updateMany(filter, {
    $set: {
      categoryId: destination.categoryId,
      subcategoryId: destination.subcategoryId,
    },
  });

  return {
    transactionCount,
    movedCount: result.modifiedCount ?? result.nModified ?? transactionCount,
  };
}