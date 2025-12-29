import * as authService from '../services/authService.js';

export const register = async (req, res) => {
  const { email, password, name } = req.body;
  const result = await authService.register(email, password, name);
  res.status(201).json({ success: true, message: 'User registered successfully', data: { user: result.user, accessToken: result.accessToken, refreshToken: result.refreshToken } });
};

export const login = async (req, res) => {
  const { email, password } = req.body;
  const result = await authService.login(email, password);
  res.status(200).json({ success: true, message: 'Login successful', data: { user: result.user, accessToken: result.accessToken, refreshToken: result.refreshToken } });
};

export const refreshToken = async (req, res) => {
  const { refreshToken } = req.body;
  const result = await authService.refreshToken(refreshToken);
  res.status(200).json({ success: true, message: 'Token refreshed successfully', data: { accessToken: result.accessToken } });
};

export const logout = async (req, res) => {
  const { refreshToken } = req.body;
  await authService.logout(req.userId, refreshToken);
  res.status(200).json({ success: true, message: 'Logged out successfully' });
};

export const logoutAll = async (req, res) => {
  await authService.logoutAll(req.userId);
  res.status(200).json({ success: true, message: 'Logged out from all devices' });
};

export const getProfile = async (req, res) => {
  res.status(200).json({ success: true, data: { user: req.user } });
};