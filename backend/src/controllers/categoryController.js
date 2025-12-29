import * as categoryService from '../services/categoryService.js';

export const create = async (req, res) => {
  const category = await categoryService.create(req.body);
  res.status(201).json({ success: true, message: 'Category created successfully', data: category });
};

export const getAll = async (req, res) => {
  const { type } = req.query;
  const categories = await categoryService.getByAccount(type);
  res.json({ success: true, data: categories });
};

export const getById = async (req, res) => {
  const category = await categoryService.getById(req.params.id);
  if (!category) return res.status(404).json({ success: false, message: 'Category not found' });
  res.json({ success: true, data: category });
};

export const update = async (req, res) => {
  const category = await categoryService.update(req.params.id, null, req.body);
  if (!category) return res.status(404).json({ success: false, message: 'Category not found' });
  res.json({ success: true, message: 'Category updated successfully', data: category });
};

export const deleteCategory = async (req, res) => {
  const category = await categoryService.softDelete(req.params.id);
  if (!category) return res.status(404).json({ success: false, message: 'Category not found' });
  res.json({ success: true, message: 'Category deleted successfully' });
};