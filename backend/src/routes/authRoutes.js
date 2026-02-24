import express from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
const router = express.Router();
import * as authController from '../controllers/authController.js';
import { authenticate } from '../middleware/auth.js';
import { validateRequest } from '../middleware/validator.js';
import { registerSchema, loginSchema, refreshTokenSchema } from '../validators/authValidator.js';

router.post(
  '/register',
  validateRequest({ body: registerSchema }),
  asyncHandler(authController.register)
);

router.post(
  '/login',
  validateRequest({ body: loginSchema }),
  asyncHandler(authController.login)
);

router.post(
  '/refresh-token',
  validateRequest({ body: refreshTokenSchema }),
  asyncHandler(authController.refreshToken)
);

router.post('/logout', authenticate, asyncHandler(authController.logout));
router.post('/logout-all', authenticate, asyncHandler(authController.logoutAll));
router.get('/profile', authenticate, asyncHandler(authController.getProfile));

export const authRouter = router;