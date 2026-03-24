import * as categoryService from '../services/categoryService.js';

export const create = async (req, res) => {
  const category = await categoryService.create(req.user._id, req.params.accountId, req.body);
  res.status(201).json({ success: true, message: 'Category created successfully', data: category });
};

export const getAll = async (req, res) => {
  const { type } = req.query;
  const categories = await categoryService.getByAccount(req.user._id, req.params.accountId, type);
  res.json({ success: true, data: categories });
};

export const getById = async (req, res) => {
  const category = await categoryService.getById(req.user._id, req.params.id, req.params.accountId);
  res.json({ success: true, data: category });
};

export const update = async (req, res) => {
  const category = await categoryService.update(req.user._id, req.params.id, req.params.accountId, req.body);
  res.json({ success: true, message: 'Category updated successfully', data: category });
};

export const deleteCategory = async (req, res) => {
  const category = await categoryService.softDelete(req.user._id, req.params.id, req.params.accountId);
  res.json({ success: true, message: 'Category deleted successfully' });
};

export const seedDefaults = async (req, res) => {
  const categories = await categoryService.ensureDefaultCategories(
    req.user._id,
    req.params.accountId
  );

  res.status(201).json({
    success: true,
    message: 'Default categories ensured successfully',
    data: {
      created: categories.length
    }
  });
};
