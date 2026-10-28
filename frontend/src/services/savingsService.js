import api from './api';

export const getSavingsSummary = () => api.get('/savings/summary');
export const getBuckets = (params = {}) => api.get('/savings/buckets', { params });
export const createBucket = (payload) => api.post('/savings/buckets', payload);
export const updateBucket = (bucketId, payload) => api.put(`/savings/buckets/${bucketId}`, payload);
export const archiveBucket = (bucketId) => api.patch(`/savings/buckets/${bucketId}/archive`);
export const deleteBucket = (bucketId) => api.delete(`/savings/buckets/${bucketId}`);

export const getGoals = (params = {}) => api.get('/savings/goals', { params });
export const createGoal = (payload) => api.post('/savings/goals', payload);
export const updateGoal = (goalId, payload) => api.put(`/savings/goals/${goalId}`, payload);
export const archiveGoal = (goalId) => api.patch(`/savings/goals/${goalId}/archive`);
export const deleteGoal = (goalId) => api.delete(`/savings/goals/${goalId}`);

export const getEntries = (params = {}) => api.get('/savings/entries', { params });
export const createEntry = (payload) => api.post('/savings/entries', payload);
