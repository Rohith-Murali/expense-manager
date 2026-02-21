import axios from 'axios';
import { API_URL, TOKEN_KEY, REFRESH_TOKEN_KEY } from '../utils/constants';
import { logger } from '../utils/logger';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor to add token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    logger.debug('API Request:', config.method?.toUpperCase(), config.url, config.params || config.data || '');
    return config;
  },
  (error) => {
    logger.error('API Request Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor to handle token refresh
api.interceptors.response.use(
  (response) => {
    // Preserve original API wrapper
    response.api = response.data;
    // Normalize: if backend returns { success, data } use inner data
    response.data = response.data && Object.prototype.hasOwnProperty.call(response.data, 'data') ? response.data.data : response.data;
    logger.debug('API Response:', response.config.method?.toUpperCase(), response.config.url, response.status);
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // If error is 401 and we haven't retried yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
        if (!refreshToken) {
          throw new Error('No refresh token');
        }

        // Try to refresh token
        const response = await axios.post(`${API_URL}/auth/refresh-token`, {
          refreshToken
        });

        const { accessToken } = response.data.data;
        localStorage.setItem(TOKEN_KEY, accessToken);

        // Retry original request with new token
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh failed, logout user
        logger.warn('Refresh token failed:', refreshError);
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(REFRESH_TOKEN_KEY);
        localStorage.removeItem('expense_user');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    logger.error('API Response Error:', error.response?.status, error.message);
    return Promise.reject(error);
  }
);

export default api;