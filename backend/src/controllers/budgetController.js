import * as budgetService from '../services/budgetService.js';

export const create = async (req, res) => {
  const payload = req.body;
  console.log('[budgetController] create called by user:', req.user?._id, 'account:', req.params.accountId, 'payload:', payload);
  const budget = await budgetService.create(req.user._id, req.params.accountId, payload);
  console.log('[budgetController] created budget id:', budget?._id);
  res.status(201).json({ success: true, message: 'Budget created successfully', data: budget });
};

export const getAll = async (req, res) => {
  const { month, year } = req.query;
  const m = month ? Number(month) : new Date().getMonth() + 1;
  const y = year ? Number(year) : new Date().getFullYear();
  const budgets = await budgetService.getByAccountMonth(req.user._id, req.params.accountId, y, m);
  res.json({ success: true, data: budgets });
};

export const getById = async (req, res) => {
  const budget = await budgetService.getById(req.user._id, req.params.id, req.params.accountId);
  res.json({ success: true, data: budget });
};

export const update = async (req, res) => {
  const updated = await budgetService.update(req.user._id, req.params.id, req.params.accountId, req.body);
  res.json({ success: true, message: 'Budget updated successfully', data: updated });
};

export const deleteBudget = async (req, res) => {
  await budgetService.softDelete(req.user._id, req.params.id, req.params.accountId);
  res.json({ success: true, message: 'Budget deleted successfully' });
};
