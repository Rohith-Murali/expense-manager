import {
  createAccount as createAccountService,
  getUserAccounts as getUserAccountsService,
  getAccountById as getAccountByIdService,
  updateAccount as updateAccountService,
  toggleArchiveAccount as toggleArchiveAccountService,
  deleteAccount as deleteAccountService,
  calculateAccountBalance as calculateAccountBalanceService,
  getAccountTransactions as getAccountTransactionsService,
  getAccountStats as getAccountStatsService
} from '../services/accountService.js';

export const createAccount = async (req, res) => {
  const account = await createAccountService(req.user.id, req.body);

  res.status(201).json({
    data: account
  });
};

export const getAccounts = async (req, res) => {
  const includeArchived = req.query.includeArchived === 'true';

  const accounts = await getUserAccountsService(req.user.id, includeArchived);

  res.status(200).json({
    data: accounts,
    meta: {
      count: accounts.length
    }
  });
};

export const getAccountById = async (req, res) => {
  const { accountId } = req.params;

  const account = await getAccountByIdService(accountId, req.user.id);

  res.status(200).json({
    data: account
  });
};

export const updateAccount = async (req, res) => {
  const { accountId } = req.params;

  const account = await updateAccountService(
    accountId,
    req.user.id,
    req.body
  );

  res.status(200).json({
    data: account
  });
};

export const toggleArchive = async (req, res) => {
  const { accountId } = req.params;

  const account = await toggleArchiveAccountService(
    accountId,
    req.user.id
  );

  res.status(200).json({
    data: account
  });
};

export const deleteAccount = async (req, res) => {
  const { accountId } = req.params;

  await deleteAccountService(accountId, req.user.id);

  res.status(204).send();
};

export const getAccountBalance = async (req, res) => {
  const { accountId } = req.params;

  const balance = await calculateAccountBalanceService(
    accountId,
    req.user.id
  );

  res.status(200).json({
    data: balance
  });
};

export const getAccountTransactions = async (req, res) => {
  const { accountId } = req.params;

  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 50;
  const { startDate, endDate } = req.query;

  const result = await getAccountTransactionsService(
    accountId,
    req.user.id,
    { page, limit, startDate, endDate }
  );

  res.status(200).json({
    data: result.transactions,
    meta: {
      page,
      limit,
      total: result.total
    }
  });
};

export const getAccountStats = async (req, res) => {
  const { accountId } = req.params;

  const stats = await getAccountStatsService(accountId, req.user.id);

  res.status(200).json({
    data: stats
  });
};
