import * as transactionService from '../services/transactionService.js';

export const create = async (req, res) => {
  console.log(req.params)
  const transaction = await transactionService.create({ ...req.body,accountId: req.params.accountId });
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
  const transactions = await transactionService.getByAccount(undefined, filters);
  res.json({ success: true, data: transactions });
};

export const getById = async (req, res) => {
  const transaction = await transactionService.getById(req.params.id);
  if (!transaction) return res.status(404).json({ success: false, message: 'Transaction not found' });
  res.json({ success: true, data: transaction });
};

export const update = async (req, res) => {
  const transaction = await transactionService.update(req.params.id, null, req.body);
  if (!transaction) return res.status(404).json({ success: false, message: 'Transaction not found' });
  res.json({ success: true, message: 'Transaction updated successfully', data: transaction });
};

export const deleteTransaction = async (req, res) => {
  const transaction = await transactionService.remove(req.params.id);
  if (!transaction) return res.status(404).json({ success: false, message: 'Transaction not found' });
  res.json({ success: true, message: 'Transaction deleted successfully' });
};

export const getStats = async (req, res) => {
  const stats = await transactionService.getStats(undefined, req.query.startDate, req.query.endDate);
  res.json({ success: true, data: stats });
};