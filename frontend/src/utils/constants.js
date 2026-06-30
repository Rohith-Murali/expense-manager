export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const TOKEN_KEY = 'expense_access_token';
export const REFRESH_TOKEN_KEY = 'expense_refresh_token';
export const USER_KEY = 'expense_user';

export const ROUTES = {
  LOGIN: '/login',
  REGISTER: '/register',
  HOME: '/',
  DASHBOARD: '/dashboard',
  ACCOUNTS: '/accounts',
  EXPENSES: '/expenses',
  INCOME: '/income',
  TRANSFER: '/transfer',
  ANALYTICS: '/analytics',
  SETTINGS: '/settings',
};

export const API_ENDPOINTS = {
  AUTH: {
    REGISTER: '/auth/register',
    LOGIN: '/auth/login',
    REFRESH: '/auth/refresh-token',
    LOGOUT: '/auth/logout',
    LOGOUT_ALL: '/auth/logout-all',
    PROFILE: '/auth/profile',
  },
};
