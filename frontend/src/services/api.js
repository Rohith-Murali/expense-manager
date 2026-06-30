import axios from 'axios';
import { API_URL, TOKEN_KEY, REFRESH_TOKEN_KEY } from '../utils/constants';
import { logger } from '../utils/logger';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    logger.debug(
      'API Request:',
      config.method?.toUpperCase(),
      config.url,
      config.params || config.data || '',
    );
    return config;
  },
  (error) => {
    logger.error('API Request Error:', error);
    return Promise.reject(error);
  },
);

api.interceptors.response.use(
  (response) => {
    response.api = response.data;
    response.data =
      response.data && Object.prototype.hasOwnProperty.call(response.data, 'data')
        ? response.data.data
        : response.data;
    logger.debug(
      'API Response:',
      response.config.method?.toUpperCase(),
      response.config.url,
      response.status,
    );
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
        if (!refreshToken) {
          throw new Error('No refresh token');
        }

        const response = await axios.post(`${API_URL}/auth/refresh-token`, {
          refreshToken,
        });

        const { accessToken } = response.data.data;
        localStorage.setItem(TOKEN_KEY, accessToken);

        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        logger.warn('Refresh token failed:', refreshError);
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(REFRESH_TOKEN_KEY);
        localStorage.removeItem('expense_user');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    if (error.response?.status === 403) {
      logger.warn('Access denied (403):', error.response.data?.message);
      return Promise.reject(error);
    }

    if (error.response?.status === 409) {
      logger.warn('Conflict (409):', error.response.data?.message);
      return Promise.reject(error);
    }

    if (error.response?.status === 400) {
      logger.debug('Validation error (400):', error.response.data?.errors);
      return Promise.reject(error);
    }

    if (error.response?.status === 404) {
      logger.warn('Not found (404):', error.response.data?.message);
      return Promise.reject(error);
    }

    logger.error('API Response Error:', error.response?.status, error.message);
    return Promise.reject(error);
  },
);

export default api;
