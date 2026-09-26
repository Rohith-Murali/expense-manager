import * as subcategoryService from '../services/subcategoryService.js';

export const create = async (req, res) => {
  const { accountId } = req.params;

  const subcategory = await subcategoryService.create(req.user._id, accountId, req.body);
  res.status(201).json({
    success: true,
    message: 'Subcategory created successfully',
    data: subcategory,
  });
};

export const getById = async (req, res) => {
  const { accountId, subcategoryId } = req.params;

  const subcategory = await subcategoryService.getById(req.user._id, subcategoryId, accountId);
  res.json({ success: true, data: subcategory });
};

export const getByParent = async (req, res) => {
  const { accountId, parentCategoryId } = req.params;

  const subcategories = await subcategoryService.getByParentCategory(
    req.user._id,
    parentCategoryId,
    accountId,
  );
  res.json({ success: true, data: subcategories });
};

export const getAll = async (req, res) => {
  const { accountId } = req.params;

  const subcategories = await subcategoryService.getByAccount(req.user._id, accountId);
  res.json({ success: true, data: subcategories });
};

export const update = async (req, res) => {
  const { accountId, subcategoryId } = req.params;

  const subcategory = await subcategoryService.update(
    req.user._id,
    subcategoryId,
    accountId,
    req.body,
  );
  res.json({
    success: true,
    message: 'Subcategory updated successfully',
    data: subcategory,
  });
};

export const softDelete = async (req, res) => {
  const { accountId, subcategoryId } = req.params;

  await subcategoryService.softDelete(req.user._id, subcategoryId, accountId);
  res.json({ success: true, message: 'Subcategory deleted successfully' });
};

export const hardDelete = async (req, res) => {
  const { accountId, subcategoryId } = req.params;

  await subcategoryService.hardDelete(req.user._id, subcategoryId, accountId);
  res.json({ success: true, message: 'Subcategory permanently deleted' });
};

export const ensureDefaults = async (req, res) => {
  const { accountId } = req.params;

  const result = await subcategoryService.ensureDefaultSubcategories(req.user._id, accountId);
  res.json({ success: true, data: result });
};
