import api from './api';

const root = '/repayments';

const unwrap = (response) => response.data;

export async function getRepayments() {
  return unwrap(await api.get(root));
}

export async function getRepayment(id) {
  return unwrap(await api.get(`${root}/${id}`));
}

export async function updateRepayment(id, data) {
  return unwrap(await api.put(`${root}/${id}`, data));
}

export async function deleteRepayment(id) {
  return unwrap(await api.delete(`${root}/${id}`));
}

export async function createReceipt(id, data) {
  return unwrap(await api.post(`${root}/${id}/receipts`, data));
}

export async function reverseReceipt(id, receiptId) {
  return unwrap(await api.delete(`${root}/${id}/receipts/${receiptId}`));
}

export async function updateReceipt(id, receiptId, data) {
  return unwrap(await api.put(`${root}/${id}/receipts/${receiptId}`, data));
}
