import api from './api';
import { API_ENDPOINTS, TOKEN_KEY, REFRESH_TOKEN_KEY, USER_KEY } from '../utils/constants';

class AuthService {
  async register(data) {
    const response = await api.post(API_ENDPOINTS.AUTH.REGISTER, data);
    // `api` response interceptor normalizes `response.data` to inner data
    // and preserves original payload on `response.api`. Check `response.api.success`.
    if (response.api?.success || response.data?.success) {
      // `response.data` will be the inner data (accessToken, refreshToken, user)
      this.setAuthData(response.data);
    }
    return response.data;
  }

  async login(data) {
    const response = await api.post(API_ENDPOINTS.AUTH.LOGIN, data);
    if (response.api?.success || response.data?.success) {
      this.setAuthData(response.data);
    }
    return response.data;
  }

  async logout() {
    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
    try {
      await api.post(API_ENDPOINTS.AUTH.LOGOUT, { refreshToken });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      this.clearAuthData();
    }
  }

  async logoutAll() {
    try {
      await api.post(API_ENDPOINTS.AUTH.LOGOUT_ALL);
    } catch (error) {
      console.error('Logout all error:', error);
    } finally {
      this.clearAuthData();
    }
  }

  async getProfile() {
    const response = await api.get(API_ENDPOINTS.AUTH.PROFILE);
    return response.data;
  }

  setAuthData(data) {
    localStorage.setItem(TOKEN_KEY, data.accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, data.refreshToken);
    localStorage.setItem(USER_KEY, JSON.stringify(data.user));
  }

  clearAuthData() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }

  getStoredUser() {
    const user = localStorage.getItem(USER_KEY);
    return user ? JSON.parse(user) : null;
  }

  isAuthenticated() {
    return !!localStorage.getItem(TOKEN_KEY);
  }
}

export default new AuthService();