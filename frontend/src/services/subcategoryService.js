import { logger } from '../utils/logger';
import api from './api';

export const getSubcategories = async (accountId, parentCategoryId) => {
  try {
    const response = await api.get(
      `/account/${accountId}/categories/${parentCategoryId}/subcategories`,
    );
    return response.data;
  } catch (error) {
    logger.error('Error fetching subcategories:', error);
    throw error;
  }
};

export const createSubcategory = async (accountId, parentCategoryId, subcategoryData) => {
  try {
    const response = await api.post(
      `/account/${accountId}/categories/${parentCategoryId}/subcategories`,
      { ...subcategoryData, parentCategoryId },
    );
    return response.data;
  } catch (error) {
    logger.error('Error creating subcategory:', error);
    throw error;
  }
};

export const updateSubcategory = async (accountId, parentCategoryId, subcategoryId, data) => {
  try {
    const response = await api.put(
      `/account/${accountId}/categories/${parentCategoryId}/subcategories/${subcategoryId}`,
      data,
    );
    return response.data;
  } catch (error) {
    logger.error('Error updating subcategory:', error);
    throw error;
  }
};

export const deleteSubcategory = async (accountId, parentCategoryId, subcategoryId) => {
  try {
    await api.delete(
      `/account/${accountId}/categories/${parentCategoryId}/subcategories/${subcategoryId}`,
    );
  } catch (error) {
    logger.error('Error deleting subcategory:', error);
    throw error;
  }
};

export const ensureDefaultSubcategories = async (accountId) => {
  try {
    const response = await api.post(`/account/${accountId}/subcategories/defaults/ensure`);
    return response.data;
  } catch (error) {
    logger.error('Error creating default subcategories:', error);
    throw error;
  }
};
