import express from 'express';
const router = express.Router();
import { authRouter } from './authRoutes.js';
import { accountRouter } from './accountRoutes.js';
import { categoryRouter } from './categoryRoutes.js';
import { paymentTypeRouter } from './paymentTypeRoutes.js';
import { transactionRouter } from './transactionRoutes.js';
import { budgetRouter } from './budgetRoutes.js';

router.use('/auth', authRouter);
router.use('/accounts', accountRouter);
router.use('/account/:accountId/categories', categoryRouter);
router.use('/account/:accountId/payment-types', paymentTypeRouter);
router.use('/account/:accountId/transactions', transactionRouter);
router.use('/account/:accountId/budgets', budgetRouter);

router.get('/health', (req, res) => {
  res.status(200).json({ success: true, message: 'API is running', timestamp: new Date().toISOString() });
});

export const apiRouter = router;