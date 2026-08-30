import { logger } from '../utils/logger';
import api from './api';
import { buildCreatePayload, buildUpdatePayload } from '../utils/transactionPayload';

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

export { buildCreatePayload, buildUpdatePayload } from '../utils/transactionPayload';

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

export const getCategoryWiseAnalytics = async (accountId, params = {}) => {
  try {
    const response = await api.get(`/account/${accountId}/transactions/analytics/category-wise`, {
      params,
    });
    logger.info('Category-wise analytics fetched');
    return response.data;
  } catch (error) {
    logger.error('Error fetching category-wise analytics:', error);
    throw error;
  }
};
