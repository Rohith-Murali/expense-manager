import logger from '../utils/logger';
import api from './api';

export const getCategories = async (accountId, params = {}) => {
  try {
    const response = await api.get(`/account/${accountId}/categories`, { params });
    return response.data;
  } catch (error) {
    logger.error('Error fetching categories:', error);
    throw error;
  }
};

export const getCategory = async (accountId, categoryId) => {
  try {
    const response = await api.get(`/account/${accountId}/categories/${categoryId}`);
    return response.data;
  } catch (error) {
    logger.error('Error fetching category:', error);
    throw error;
  }
};

export const createCategory = async (accountId, categoryData) => {
  try {
    const response = await api.post(`/account/${accountId}/categories`, categoryData);
    return response.data;
  } catch (error) {
    logger.error('Error creating category:', error);
    throw error;
  }
};

export const seedDefaultCategories = async (accountId) => {
  try {
    const response = await api.post(`/account/${accountId}/categories/defaults`);
    return response.data;
  } catch (error) {
    logger.error('Error seeding default categories:', error);
    throw error;
  }
};

export const updateCategory = async (accountId, categoryId, categoryData) => {
  try {
    const response = await api.put(`/account/${accountId}/categories/${categoryId}`, categoryData);
    return response.data;
  } catch (error) {
    logger.error('Error updating category:', error);
    throw error;
  }
};

export const deleteCategory = async (accountId, categoryId) => {
  try {
    await api.delete(`/account/${accountId}/categories/${categoryId}`);
  } catch (error) {
    logger.error('Error deleting category:', error);
    throw error;
  }
};
