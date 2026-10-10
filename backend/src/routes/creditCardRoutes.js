import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { validateRequest } from '../middleware/validator.js';
import { accountIdParamSchema } from '../validators/accountValidator.js';
import * as creditCardController from '../controllers/creditCardController.js';

const router = Router({ mergeParams: true });
router.use(authenticate);

router.get(
  '/summary',
  validateRequest({ params: accountIdParamSchema }),
  asyncHandler(creditCardController.getSummary),
);
router.get(
  '/statements',
  validateRequest({ params: accountIdParamSchema }),
  asyncHandler(creditCardController.getStatements),
);
router.get(
  '/payments',
  validateRequest({ params: accountIdParamSchema }),
  asyncHandler(creditCardController.getPayments),
);

export const creditCardRouter = router;
