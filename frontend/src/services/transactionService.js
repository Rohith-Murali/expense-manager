import api from './api';

export const getTransactions = async (accountId, params = {}) => {
  try {
    const response = await api.get(`/account/${accountId}/transactions`, { params });
    return response.data.data;
  } catch (error) {
    console.error('Error fetching transactions:', error);
    throw error;
  }
};

export const getTransaction = async (accountId, transactionId) => {
  try {
    const response = await api.get(`/account/${accountId}/transactions/${transactionId}`);
    return response.data.data;
  } catch (error) {
    console.error('Error fetching transaction:', error);
    throw error;
  }
};

export const createTransaction = async (accountId, transactionData) => {
  try {
    const response = await api.post(`/account/${accountId}/transactions`, transactionData);
    return response.data.data;
  } catch (error) {
    console.error('Error creating transaction:', error);
    throw error;
  }
};

export const updateTransaction = async (accountId, transactionId, transactionData) => {
  try {
    const response = await api.put(`/account/${accountId}/transactions/${transactionId}`, transactionData);
    return response.data.data;
  } catch (error) {
    console.error('Error updating transaction:', error);
    throw error;
  }
};

export const deleteTransaction = async (accountId, transactionId) => {
  try {
    await api.delete(`/account/${accountId}/transactions/${transactionId}`);
  } catch (error) {
    console.error('Error deleting transaction:', error);
    throw error;
  }
};

export const getTransactionStats = async (accountId, params = {}) => {
  try {
    const response = await api.get(`/account/${accountId}/transactions/stats`, { params });
    return response.data.data;
  } catch (error) {
    console.error('Error fetching transaction stats:', error);
    throw error;
  }
};
