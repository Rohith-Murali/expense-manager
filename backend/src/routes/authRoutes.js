import express from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
const router = express.Router();
import * as authController from '../controllers/authController.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validator.js';
import { registerValidator, loginValidator, refreshTokenValidator } from '../validators/authValidator.js';

router.post('/register', registerValidator, validate, asyncHandler(authController.register));
router.post('/login', loginValidator, validate, asyncHandler(authController.login));
router.post('/refresh-token', refreshTokenValidator, validate, asyncHandler(authController.refreshToken));

router.post('/logout', authenticate, asyncHandler(authController.logout));
router.post('/logout-all', authenticate, asyncHandler(authController.logoutAll));
router.get('/profile', authenticate, asyncHandler(authController.getProfile));

export const authRouter = router;