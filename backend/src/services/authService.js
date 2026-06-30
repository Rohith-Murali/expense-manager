import { User } from '../models/User.js';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../utils/jwt.js';
import { ApiError } from '../utils/ApiError.js';

export async function register(email, password, name) {
  const existingUser = await User.findOne({ email, isDeleted: false });
  if (existingUser) throw new ApiError(409, 'User already exists with this email');

  const user = new User({ email, password, name });
  await user.save();

  const accessToken = generateAccessToken(user._id);
  const refreshToken = generateRefreshToken(user._id);

  user.refreshTokens.push({ token: refreshToken });
  await user.save();

  return { user, accessToken, refreshToken };
}

export async function login(email, password) {
  const user = await User.findOne({ email, isDeleted: false });
  if (!user) throw new ApiError(401, 'Invalid credentials');

  const isValidPassword = await user.comparePassword(password);
  if (!isValidPassword) throw new ApiError(401, 'Invalid credentials');

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  user.refreshTokens = user.refreshTokens.filter((rt) => rt.createdAt > sevenDaysAgo);

  const accessToken = generateAccessToken(user._id);
  const refreshToken = generateRefreshToken(user._id);

  user.refreshTokens.push({ token: refreshToken });
  await user.save();

  return { user, accessToken, refreshToken };
}

export async function refreshToken(token) {
  const decoded = verifyRefreshToken(token);

  const user = await User.findOne({
    _id: decoded.userId,
    isDeleted: false,
    'refreshTokens.token': token,
  });
  if (!user) throw new ApiError(401, 'Invalid refresh token');

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  user.refreshTokens = user.refreshTokens.filter((rt) => rt.createdAt > sevenDaysAgo);

  const newAccessToken = generateAccessToken(user._id);
  return { accessToken: newAccessToken };
}

export async function logout(userId, refreshToken) {
  const user = await User.findById(userId);
  if (!user) throw new ApiError(404, 'User not found');

  user.refreshTokens = user.refreshTokens.filter((rt) => rt.token !== refreshToken);
  await user.save();

  return { message: 'Logged out successfully' };
}

export async function logoutAll(userId) {
  const user = await User.findById(userId);
  if (!user) throw new ApiError(404, 'User not found');

  user.refreshTokens = [];
  await user.save();

  return { message: 'Logged out from all devices' };
}
