import api from './api';

export const getTransactions = async (accountId, params = {}) => {
  try {
    const response = await api.get(`/account/${accountId}/transactions`, { params });
    return response.data;
  } catch (error) {
    console.error('Error fetching transactions:', error);
    throw error;
  }
};

export const getTransaction = async (accountId, transactionId) => {
  try {
    const response = await api.get(`/account/${accountId}/transactions/${transactionId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching transaction:', error);
    throw error;
  }
};


// Helper to shape payload for create and update
function shapeTransactionPayload(formData, isUpdate = false) {
  const isTransfer = formData.type === 'transfer' || formData.type === 'transfer-out' || formData.type === 'transfer-in';
  const payload = {};

  // Only include type for creation, not update
  if (!isUpdate && formData.type) payload.type = formData.type;
  if (formData.amount !== undefined && formData.amount !== '') payload.amount = parseFloat(formData.amount);
  if (formData.date) payload.date = formData.date;
  if (formData.description) payload.description = formData.description;
  if (formData.notes) payload.notes = formData.notes;

  if (isTransfer) {
    if (formData.toAccountId) payload.toAccountId = formData.toAccountId?._id || formData.toAccountId;
    // Do not include categoryId/paymentTypeId
  } else {
    if (formData.categoryId) payload.categoryId = formData.categoryId?._id || formData.categoryId;
    if (formData.paymentTypeId) payload.paymentTypeId = formData.paymentTypeId?._id || formData.paymentTypeId;
    // Do not include toAccountId
  }

  // For update, remove any fields that are empty strings or undefined
  if (isUpdate) {
    Object.keys(payload).forEach((key) => {
      if (
        payload[key] === undefined ||
        payload[key] === '' ||
        (typeof payload[key] === 'number' && isNaN(payload[key]))
      ) {
        delete payload[key];
      }
    });
    return payload;
  }
  return payload;
}

export const createTransaction = async (accountId, formData) => {
  try {
    const payload = shapeTransactionPayload(formData, false);
    const response = await api.post(`/account/${accountId}/transactions`, payload);
    return response.data;
  } catch (error) {
    console.error('Error creating transaction:', error);
    throw error;
  }
};

export const updateTransaction = async (accountId, transactionId, formData) => {
  try {
    const payload = shapeTransactionPayload(formData, true);
    const response = await api.put(`/account/${accountId}/transactions/${transactionId}`, payload);
    return response.data;
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
    console.error('Error fetching transaction stats:', error);
    throw error;
  }
};
