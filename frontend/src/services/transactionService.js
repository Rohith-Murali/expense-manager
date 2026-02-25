import logger from '../utils/logger';
import api from './api';

export const getTransactions = async (accountId, params = {}) => {
  try {
    const response = await api.get(`/account/${accountId}/transactions`, { params });
    return response.data;
  } catch (error) {
    logger.error('Error fetching transactions:', error);
    throw error;
  }
};

export const getTransaction = async (accountId, transactionId) => {
  try {
    const response = await api.get(`/account/${accountId}/transactions/${transactionId}`);
    return response.data;
  } catch (error) {
    logger.error('Error fetching transaction:', error);
    throw error;
  }
};

/**
 * Helper to build payload for transaction creation.
 *
 * Backend createSchema expects:
 * {
 *   type: 'expense' | 'income' | 'transfer',
 *   amount,
 *   date?,
 *   categoryId?,
 *   paymentTypeId?,
 *   toAccountId?,      // for transfers only
 *   description?,
 *   notes?
 * }
 *
 * - UI uses 'transfer-out' for transfers; we map it to 'transfer' here.
 * - We never send accountId or linkedAccountId in the body; accountId comes from the route.
 */
function buildCreatePayload(formData) {
  const payload = {};

  if (formData.type) {
    if (formData.type === 'transfer-out' || formData.type === 'transfer-in') {
      payload.type = 'transfer';
    } else {
      payload.type = formData.type;
    }
  }

  if (formData.amount !== undefined && formData.amount !== '') {
    payload.amount = Number(formData.amount);
  }

  if (formData.date) {
    payload.date = formData.date;
  }

  if (formData.description) {
    payload.description = formData.description;
  }

  if (formData.notes) {
    payload.notes = formData.notes;
  }

  if (payload.type === 'transfer') {
    if (formData.toAccountId) {
      payload.toAccountId = formData.toAccountId?._id || formData.toAccountId;
    }
  } else if (payload.type === 'expense' || payload.type === 'income') {
    if (formData.categoryId) {
      payload.categoryId = formData.categoryId?._id || formData.categoryId;
    }
    if (formData.paymentTypeId) {
      payload.paymentTypeId = formData.paymentTypeId?._id || formData.paymentTypeId;
    }
  }

  return payload;
}

/**
 * Helper to build payload for transaction updates.
 *
 * Backend updateSchema expects only:
 * {
 *   amount?,
 *   date?,
 *   categoryId?,
 *   paymentTypeId?,
 *   description?,
 *   notes?
 * }
 *
 * - Type and transfer linkage (toAccountId, accountId, linkedAccountId) cannot be updated.
 */
function buildUpdatePayload(formData) {
  const payload = {};

  if (formData.type === 'expense' || formData.type === 'income') {
    payload.type = formData.type;
  }

  if (formData.amount !== undefined && formData.amount !== '') {
    payload.amount = Number(formData.amount);
  }

  if (formData.date) {
    payload.date = formData.date;
  }

  if (formData.description !== undefined) {
    payload.description = formData.description;
  }

  if (formData.notes !== undefined) {
    payload.notes = formData.notes;
  }

  if (formData.categoryId) {
    payload.categoryId = formData.categoryId?._id || formData.categoryId;
  }

  if (formData.paymentTypeId) {
    payload.paymentTypeId = formData.paymentTypeId?._id || formData.paymentTypeId;
  }

  return payload;
}

export const createTransaction = async (accountId, formData) => {
  try {
    const payload = buildCreatePayload(formData);
    const response = await api.post(`/account/${accountId}/transactions`, payload);
    return response.data;
  } catch (error) {
    logger.error('Error creating transaction:', error);
    throw error;
  }
};

export const updateTransaction = async (accountId, transactionId, formData) => {
  try {
    const payload = buildUpdatePayload(formData);
    const response = await api.put(`/account/${accountId}/transactions/${transactionId}`, payload);
    return response.data;
  } catch (error) {
    logger.error('Error updating transaction:', error);
    throw error;
  }
};

export const deleteTransaction = async (accountId, transactionId) => {
  try {
    await api.delete(`/account/${accountId}/transactions/${transactionId}`);
  } catch (error) {
    logger.error('Error deleting transaction:', error);
    throw error;
  }
};

// Fetch helpers for TransactionDetail
export const fetchTransactionDetail = async (accountId, id) => {
  return getTransaction(accountId, id);
};

export const fetchCategoriesForType = async (categoryService, accountId, type) => {
  return categoryService.getCategories(accountId, { type });
};

export const fetchPaymentTypesForType = async (paymentTypeService, accountId, type) => {
  return paymentTypeService.getPaymentTypes(accountId, { type });
};

export const getTransactionStats = async (accountId, params = {}) => {
  try {
    const response = await api.get(`/account/${accountId}/transactions/stats`, { params });
    return response.data;
  } catch (error) {
    logger.error('Error fetching transaction stats:', error);
    throw error;
  }
};
