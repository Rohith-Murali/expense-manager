import * as budgetService from '../services/budgetService.js';
import { logger } from '../utils/logger.js';

const debugContext = '[budgetController]';

export const create = async (req, res) => {
  logger.info(`${debugContext} create`);
  const budget = await budgetService.create(req.user._id, req.params.accountId, req.body);
  logger.info(`${debugContext} create success`);
  res.status(201).json({ success: true, message: 'Budget created successfully', data: budget });
};

export const getAll = async (req, res) => {
  const { month, year } = req.query;
  const m = month ? Number(month) : new Date().getMonth() + 1;
  const y = year ? Number(year) : new Date().getFullYear();
  logger.info(`${debugContext} getAll`);
  const budgets = await budgetService.getByAccountMonth(req.user._id, req.params.accountId, y, m);
  logger.info(`${debugContext} getAll success`);
  res.json({ success: true, data: budgets });
};

export const getById = async (req, res) => {
  logger.info(`${debugContext} getById`);
  const budget = await budgetService.getById(req.user._id, req.params.id, req.params.accountId);
  logger.info(`${debugContext} getById success`);
  res.json({ success: true, data: budget });
};

export const update = async (req, res) => {
  logger.info(`${debugContext} update`);
  const updated = await budgetService.update(
    req.user._id,
    req.params.id,
    req.params.accountId,
    req.body,
  );
  logger.info(`${debugContext} update success`);
  res.json({ success: true, message: 'Budget updated successfully', data: updated });
};

export const deleteBudget = async (req, res) => {
  logger.info(`${debugContext} deleteBudget`);
  await budgetService.softDelete(req.user._id, req.params.id, req.params.accountId);
  logger.info(`${debugContext} deleteBudget success`);
  res.json({ success: true, message: 'Budget deleted successfully' });
};
