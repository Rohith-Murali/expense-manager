import api from './api';

class AccountService {
  async getAccounts(includeArchived = false) {
    const response = await api.get(`/accounts?includeArchived=${includeArchived}`);
    return response.data;
  }

  async getAccountById(id) {
    const response = await api.get(`/accounts/${id}`);
    return response.data;
  }

  async createAccount(data) {
    const response = await api.post('/accounts', data);
    return response.data;
  }

  async updateAccount(id, data) {
    const response = await api.put(`/accounts/${id}`, data);
    return response.data;
  }

  async deleteAccount(id) {
    const response = await api.delete(`/accounts/${id}`);
    return response.data;
  }

  async toggleArchive(id) {
    const response = await api.patch(`/accounts/${id}/archive`);
    return response.data;
  }

  async getAccountBalance(id) {
    const response = await api.get(`/accounts/${id}/balance`);
    return response.data;
  }

  async getAccountTransactions(id, options = {}) {
    const { page = 1, limit = 50, startDate, endDate } = options;
    let url = `/accounts/${id}/transactions?page=${page}&limit=${limit}`;
    if (startDate) url += `&startDate=${startDate}`;
    if (endDate) url += `&endDate=${endDate}`;
    const response = await api.get(url);
    return response.data;
  }

  async getAccountStats(id) {
    const response = await api.get(`/accounts/${id}/stats`);
    return response.data;
  }
}

export default new AccountService();
