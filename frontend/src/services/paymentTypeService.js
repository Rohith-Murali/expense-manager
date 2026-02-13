import api from './api';

export const getPaymentTypes = async (accountId, params = {}) => {
  try {
    const response = await api.get(`/account/${accountId}/payment-types`, { params });
    return response.data.data;
  } catch (error) {
    console.error('Error fetching payment types:', error);
    throw error;
  }
};

export const getPaymentType = async (accountId, paymentTypeId) => {
  try {
    const response = await api.get(`/account/${accountId}/payment-types/${paymentTypeId}`);
    return response.data.data;
  } catch (error) {
    console.error('Error fetching payment type:', error);
    throw error;
  }
};

export const createPaymentType = async (accountId, paymentTypeData) => {
  try {
    const response = await api.post(`/account/${accountId}/payment-types`, paymentTypeData);
    return response.data.data;
  } catch (error) {
    console.error('Error creating payment type:', error);
    throw error;
  }
};

export const updatePaymentType = async (accountId, paymentTypeId, paymentTypeData) => {
  try {
    const response = await api.put(`/account/${accountId}/payment-types/${paymentTypeId}`, paymentTypeData);
    return response.data.data;
  } catch (error) {
    console.error('Error updating payment type:', error);
    throw error;
  }
};

export const deletePaymentType = async (accountId, paymentTypeId) => {
  try {
    await api.delete(`/account/${accountId}/payment-types/${paymentTypeId}`);
  } catch (error) {
    console.error('Error deleting payment type:', error);
    throw error;
  }
};
