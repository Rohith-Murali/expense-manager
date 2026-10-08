import { Category } from '../models/Category.js';
import { Account } from '../models/Account.js';
import { Subcategory } from '../models/Subcategory.js';
import { ApiError } from '../utils/ApiError.js';
import {
  DEFAULT_CATEGORIES,
  DEFAULT_NONE_SUBCATEGORY,
  getDefaultSubcategoryNames,
} from '../config/defaultCategoryData.js';

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

function normalizeName(value) {
  return String(value || '')
    .trim()
    .toLowerCase();
}

export async function ensureNoneSubcategoryForCategory(category) {
  const query = {
    accountId: category.accountId,
    parentCategoryId: category._id,
    name: DEFAULT_NONE_SUBCATEGORY.name,
  };
  const existing = await Subcategory.findOne(query).lean();

  if (existing?.isActive !== false) {
    if (existing) return existing;
  } else {
    return await Subcategory.findOneAndUpdate(
      query,
      { $set: { ...DEFAULT_NONE_SUBCATEGORY, isActive: true } },
      { new: true, runValidators: true },
    ).lean();
  }

  try {
    return await Subcategory.create({
      name: DEFAULT_NONE_SUBCATEGORY.name,
      parentCategoryId: category._id,
      accountId: category.accountId,
      ...DEFAULT_NONE_SUBCATEGORY,
    });
  } catch (error) {
    if (error?.code === 11000) {
      return await Subcategory.findOneAndUpdate(
        query,
        { $set: { ...DEFAULT_NONE_SUBCATEGORY, isActive: true } },
        { new: true, runValidators: true },
      ).lean();
    }

    throw error;
  }
}

export async function create(userId, accountId, data) {
  await assertAccountOwnership(accountId, userId);

  const query = { accountId, name: data.name, type: data.type };
  const existing = await Category.findOne(query).lean();
  if (existing?.isActive) {
    throw new ApiError(409, 'A category with this name and type already exists in this account');
  }

  let savedCategory;
  if (existing) {
    savedCategory = await Category.findOneAndUpdate(
      { _id: existing._id, accountId },
      { $set: { ...data, isActive: true } },
      { new: true, runValidators: true },
    );
    await Subcategory.updateMany(
      { parentCategoryId: existing._id, accountId, isActive: false },
      { $set: { isActive: true } },
    );
  } else {
    const category = new Category({ ...data, accountId });
    try {
      savedCategory = await category.save();
    } catch (error) {
      if (error?.code === 11000) {
        throw new ApiError(409, 'A category with this name and type already exists in this account');
      }
      throw error;
    }
  }

  await ensureNoneSubcategoryForCategory(savedCategory);

  return savedCategory;
}

export async function getByAccount(userId, accountId, type = null) {
  await assertAccountOwnership(accountId, userId);

  const query = { accountId, isActive: true };
  if (type) query.type = type;
  return await Category.find(query).sort({ name: 1 });
}

export async function getById(userId, id, accountId) {
  await assertAccountOwnership(accountId, userId);

  const category = await Category.findOne({ _id: id, accountId });
  if (!category) {
    throw new ApiError(404, 'Category not found');
  }

  return category;
}

export async function update(userId, id, accountId, data) {
  await assertAccountOwnership(accountId, userId);

  const category = await Category.findOneAndUpdate({ _id: id, accountId }, data, {
    new: true,
    runValidators: true,
  });

  if (!category) {
    throw new ApiError(404, 'Category not found');
  }

  return category;
}

export async function softDelete(userId, id, accountId) {
  await assertAccountOwnership(accountId, userId);

  const category = await Category.findOneAndUpdate(
    { _id: id, accountId },
    { isActive: false },
    { new: true },
  );

  if (!category) {
    throw new ApiError(404, 'Category not found');
  }

  await Subcategory.updateMany(
    { parentCategoryId: id, accountId, isActive: true },
    { isActive: false },
  );

  return category;
}

export async function hardDelete(userId, id, accountId) {
  await assertAccountOwnership(accountId, userId);

  const category = await Category.findOneAndDelete({ _id: id, accountId });

  if (!category) {
    throw new ApiError(404, 'Category not found');
  }

  return category;
}

export async function ensureDefaultCategories(userId, accountId) {
  await assertAccountOwnership(accountId, userId);

  const existing = await Category.find(
    { accountId },
    { _id: 1, name: 1, type: 1, isActive: 1 },
  ).lean();
  const existingByKey = new Map(
    existing.map((item) => [`${normalizeName(item.name)}::${item.type}`, item]),
  );

  const created = [];
  let reactivated = 0;
  let subcategoriesCreated = 0;
  let subcategoriesRestored = 0;

  for (const item of DEFAULT_CATEGORIES) {
    const key = `${normalizeName(item.name)}::${item.type}`;
    const existingCategory = existingByKey.get(key);
    if (existingCategory) {
      if (!existingCategory.isActive) {
        await Category.findOneAndUpdate(
          { _id: existingCategory._id, accountId },
          { $set: { isActive: true } },
          { new: true, runValidators: true },
        );
        await Subcategory.updateMany(
          { parentCategoryId: existingCategory._id, accountId, isActive: false },
          { $set: { isActive: true } },
        );
        reactivated += 1;
        existingCategory.isActive = true;
      }
      continue;
    }

    try {
      const category = await Category.create({
        ...item,
        accountId,
      });
      created.push(category);
      existingByKey.set(key, category);
    } catch (error) {
      if (error?.code === 11000) {
        const racedCategory = await Category.findOne({
          accountId,
          name: item.name,
          type: item.type,
        }).lean();
        if (!racedCategory) throw error;
        if (!racedCategory.isActive) {
          await Category.findOneAndUpdate(
            { _id: racedCategory._id, accountId },
            { $set: { isActive: true } },
            { new: true, runValidators: true },
          );
          await Subcategory.updateMany(
            { parentCategoryId: racedCategory._id, accountId, isActive: false },
            { $set: { isActive: true } },
          );
          reactivated += 1;
          racedCategory.isActive = true;
        }
        existingByKey.set(key, racedCategory);
        continue;
      }
      throw error;
    }
  }

  const existingDefaultCategories = await Category.find({
    accountId,
    isActive: true,
    _id: {
      $in: DEFAULT_CATEGORIES.map(
        (item) => existingByKey.get(`${normalizeName(item.name)}::${item.type}`)?._id,
      ).filter(Boolean),
    },
  });

  for (const category of existingDefaultCategories) {
    const result = await ensureDefaultSubcategoriesForCategory(category);
    subcategoriesCreated += result.created;
    subcategoriesRestored += result.restored;
  }

  return {
    created: created.length,
    reactivated,
    subcategoriesCreated,
    subcategoriesRestored,
  };
}

async function ensureDefaultSubcategoriesForCategory(category) {
  const names = getDefaultSubcategoryNames(category.name);
  let created = 0;
  let restored = 0;

  for (const name of names) {
    const query = {
      accountId: category.accountId,
      parentCategoryId: category._id,
      name,
    };
    const isNone = name === DEFAULT_NONE_SUBCATEGORY.name;
    const defaults = isNone ? DEFAULT_NONE_SUBCATEGORY : {};
    const existing = await Subcategory.findOne(query).lean();

    if (existing) {
      if (existing.isActive === false) {
        await Subcategory.findOneAndUpdate(
          query,
          { $set: { ...defaults, isActive: true } },
          { new: true, runValidators: true },
        );
        restored += 1;
      }
      continue;
    }

    try {
      await Subcategory.create({
        name,
        parentCategoryId: category._id,
        accountId: category.accountId,
        ...defaults,
      });
      created += 1;
    } catch (error) {
      if (error?.code !== 11000) throw error;

      const racedSubcategory = await Subcategory.findOneAndUpdate(
        query,
        { $set: { ...defaults, isActive: true } },
        { new: true, runValidators: true },
      );
      if (!racedSubcategory) throw error;
      restored += 1;
    }
  }

  return { created, restored };
}
