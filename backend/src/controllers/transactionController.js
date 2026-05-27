import * as transactionService from '../services/transactionService.js';

export const create = async (req, res) => {
  const transaction = await transactionService.create(
    req.user._id,
    req.params.accountId,
    req.body
  );
  res.status(201).json({ success: true, message: 'Transaction created successfully', data: transaction });
};

export const getAll = async (req, res) => {
  const filters = {
    type: req.query.type,
    categoryId: req.query.categoryId,
    paymentTypeId: req.query.paymentTypeId,
    startDate: req.query.startDate,
    endDate: req.query.endDate,
    minAmount: req.query.minAmount ? parseFloat(req.query.minAmount) : null,
    maxAmount: req.query.maxAmount ? parseFloat(req.query.maxAmount) : null,
    limit: req.query.limit ? parseInt(req.query.limit) : 100,
    skip: req.query.skip ? parseInt(req.query.skip) : 0
  };
  const transactions = await transactionService.getByAccount(req.user._id, req.params.accountId, filters);
  res.json({ success: true, data: transactions });
};

export const getById = async (req, res) => {
  const transaction = await transactionService.getById(req.user._id, req.params.id, req.params.accountId);
  res.json({ success: true, data: transaction });
};

export const update = async (req, res) => {
  const transaction = await transactionService.update(req.user._id, req.params.id, req.params.accountId, req.body);
  res.json({ success: true, message: 'Transaction updated successfully', data: transaction });
};

export const deleteTransaction = async (req, res) => {
  const transaction = await transactionService.remove(req.user._id, req.params.id, req.params.accountId);
  res.json({ success: true, message: 'Transaction deleted successfully' });
};

export const getStats = async (req, res) => {
  const stats = await transactionService.getStats(req.user._id, req.params.accountId, req.query.startDate, req.query.endDate);
  res.json({ success: true, data: stats });
};

export const getCategoryWiseAnalytics = async (req, res) => {
  const analytics = await transactionService.getCategoryWiseAnalytics(
    req.user._id,
    req.params.accountId,
    req.query.startDate,
    req.query.endDate,
    req.query.type
  );
  res.json({ success: true, data: analytics });
};