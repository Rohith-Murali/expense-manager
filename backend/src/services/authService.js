const User = require('../models/User');
const { generateAccessToken, generateRefreshToken, verifyRefreshToken } = require('../utils/jwt');

class AuthService {
  async register(email, password, name) {
    // Check if user already exists
    const existingUser = await User.findOne({ email, isDeleted: false });
    if (existingUser) {
      throw new Error('User already exists with this email');
    }

    // Create new user
    const user = new User({ email, password, name });
    await user.save();

    // Generate tokens
    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    // Save refresh token
    user.refreshTokens.push({ token: refreshToken });
    await user.save();

    return { user, accessToken, refreshToken };
  }

  async login(email, password) {
    // Find user
    const user = await User.findOne({ email, isDeleted: false });
    if (!user) {
      throw new Error('Invalid credentials');
    }

    // Check password
    const isValidPassword = await user.comparePassword(password);
    if (!isValidPassword) {
      throw new Error('Invalid credentials');
    }

    // Generate tokens
    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    // Save refresh token
    user.refreshTokens.push({ token: refreshToken });
    await user.save();

    return { user, accessToken, refreshToken };
  }

  async refreshToken(refreshToken) {
    // Verify refresh token
    const decoded = verifyRefreshToken(refreshToken);

    // Find user and check if refresh token exists
    const user = await User.findOne({
      _id: decoded.userId,
      isDeleted: false,
      'refreshTokens.token': refreshToken
    });

    if (!user) {
      throw new Error('Invalid refresh token');
    }

    // Generate new access token
    const newAccessToken = generateAccessToken(user._id);

    return { accessToken: newAccessToken };
  }

  async logout(userId, refreshToken) {
    // Remove refresh token from user
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    user.refreshTokens = user.refreshTokens.filter(rt => rt.token !== refreshToken);
    await user.save();

    return { message: 'Logged out successfully' };
  }

  async logoutAll(userId) {
    // Remove all refresh tokens
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    user.refreshTokens = [];
    await user.save();

    return { message: 'Logged out from all devices' };
  }
}

module.exports = new AuthService();