const accountService = require('../services/accountService');
const { getErrorMessage } = require('../utils/helpers');

class AccountController {
  // Create new account
  async createAccount(req, res, next) {
    try {
      const account = await accountService.createAccount(req.userId, req.body);
      
      res.status(201).json({
        success: true,
        message: 'Account created successfully',
        data: { account }
      });
    } catch (error) {
      next(error);
    }
  }

  // Get all user accounts
  async getAccounts(req, res, next) {
    try {
      const { includeArchived } = req.query;
      const accounts = await accountService.getUserAccounts(
        req.userId,
        includeArchived === 'true'
      );
      
      res.status(200).json({
        success: true,
        data: { 
          accounts,
          count: accounts.length
        }
      });
    } catch (error) {
      next(error);
    }
  }

  // Get single account
  async getAccountById(req, res, next) {
    try {
      const { id } = req.params;
      const account = await accountService.getAccountById(id, req.userId);
      
      res.status(200).json({
        success: true,
        data: { account }
      });
    } catch (error) {
      next(error);
    }
  }

  // Update account
  async updateAccount(req, res, next) {
    try {
      const { id } = req.params;
      const account = await accountService.updateAccount(id, req.userId, req.body);
      
      res.status(200).json({
        success: true,
        message: 'Account updated successfully',
        data: { account }
      });
    } catch (error) {
      next(error);
    }
  }

  // Toggle archive status
  async toggleArchive(req, res, next) {
    try {
      const { id } = req.params;
      const account = await accountService.toggleArchiveAccount(id, req.userId);
      
      res.status(200).json({
        success: true,
        message: `Account ${account.isArchived ? 'archived' : 'unarchived'} successfully`,
        data: { account }
      });
    } catch (error) {
      next(error);
    }
  }

  // Delete account
  async deleteAccount(req, res, next) {
    try {
      const { id } = req.params;
      const result = await accountService.deleteAccount(id, req.userId);
      
      res.status(200).json({
        success: true,
        message: result.message
      });
    } catch (error) {
      next(error);
    }
  }

  // Get account balance
  async getAccountBalance(req, res, next) {
    try {
      const { id } = req.params;
      const balance = await accountService.calculateAccountBalance(id, req.userId);
      
      res.status(200).json({
        success: true,
        data: { balance }
      });
    } catch (error) {
      next(error);
    }
  }

  // Get account transactions
  async getAccountTransactions(req, res, next) {
    try {
      const { id } = req.params;
      const { page, limit, startDate, endDate } = req.query;
      
      const options = {
        page: parseInt(page) || 1,
        limit: parseInt(limit) || 50,
        startDate,
        endDate
      };
      
      const result = await accountService.getAccountTransactions(id, req.userId, options);
      
      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  // Get account statistics
  async getAccountStats(req, res, next) {
    try {
      const { id } = req.params;
      const stats = await accountService.getAccountStats(id, req.userId);
      
      res.status(200).json({
        success: true,
        data: stats
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AccountController();