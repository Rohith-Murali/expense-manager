import logger from '../utils/logger';
import api from './api';

const getBudgets = async (accountId, params = {}) => {
  try {
    const response = await api.get(`/account/${accountId}/budgets`, { params });
    return response.data;
  } catch (error) {
    logger.error('Error fetching budgets:', error);
    throw error;
  }
};

const createBudget = async (accountId, payload) => {
  try {
    const response = await api.post(`/account/${accountId}/budgets`, payload);
    return response.data;
  } catch (error) {
    logger.error('Error creating budget:', error);
    throw error;
  }
};

const updateBudget = async (accountId, id, payload) => {
  try {
    const response = await api.put(`/account/${accountId}/budgets/${id}`, payload);
    return response.data;
  } catch (error) {
    logger.error('Error updating budget:', error);
    throw error;
  }
};

const deleteBudget = async (accountId, id) => {
  try {
    const response = await api.delete(`/account/${accountId}/budgets/${id}`);
    return response.data;
  } catch (error) {
    logger.error('Error deleting budget:', error);
    throw error;
  }
};

export default {
  getBudgets,
  createBudget,
  updateBudget,
  deleteBudget,
};
