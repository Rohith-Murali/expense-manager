import * as accountService from '../services/accountService.js';

export const createAccount = async (req, res) => {
  const account = await accountService.createAccount(req.userId, req.body);
  res.status(201).json({ success: true, message: 'Account created successfully', data: { account } });
};

export const getAccounts = async (req, res) => {
  const { includeArchived } = req.query;
  const accounts = await accountService.getUserAccounts(req.userId, includeArchived === 'true');
  res.status(200).json({ success: true, data: { accounts, count: accounts.length } });
};

export const getAccountById = async (req, res) => {
  const { id } = req.params;
  const account = await accountService.getAccountById(id, req.userId);
  res.status(200).json({ success: true, data: { account } });
};

export const updateAccount = async (req, res) => {
  const { id } = req.params;
  const account = await accountService.updateAccount(id, req.userId, req.body);
  res.status(200).json({ success: true, message: 'Account updated successfully', data: { account } });
};

export const toggleArchive = async (req, res) => {
  const { id } = req.params;
  const account = await accountService.toggleArchiveAccount(id, req.userId);
  res.status(200).json({ success: true, message: `Account ${account.isArchived ? 'archived' : 'unarchived'} successfully`, data: { account } });
};

export const deleteAccount = async (req, res) => {
  const { id } = req.params;
  const result = await accountService.deleteAccount(id, req.userId);
  res.status(200).json({ success: true, message: result.message });
};

export const getAccountBalance = async (req, res) => {
  const { id } = req.params;
  const balance = await accountService.calculateAccountBalance(id, req.userId);
  res.status(200).json({ success: true, data: { balance } });
};

export const getAccountTransactions = async (req, res) => {
  const { id } = req.params;
  const { page, limit, startDate, endDate } = req.query;
  const options = { page: parseInt(page) || 1, limit: parseInt(limit) || 50, startDate, endDate };
  const result = await accountService.getAccountTransactions(id, req.userId, options);
  res.status(200).json({ success: true, data: result });
};

export const getAccountStats = async (req, res) => {
  const { id } = req.params;
  const stats = await accountService.getAccountStats(id, req.userId);
  res.status(200).json({ success: true, data: stats });
};