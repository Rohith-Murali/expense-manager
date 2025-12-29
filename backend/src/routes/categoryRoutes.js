import express from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
const router = express.Router({ mergeParams: true });
import * as categoryController from '../controllers/categoryController.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validator.js';
import * as categoryValidator from '../validators/categoryValidator.js';

router.use(authenticate);

router.post('/', categoryValidator.create, validate, asyncHandler(categoryController.create));
router.get('/', asyncHandler(categoryController.getAll));
router.get('/:id', categoryValidator.getById, validate, asyncHandler(categoryController.getById));
router.put('/:id', categoryValidator.update, validate, asyncHandler(categoryController.update));
router.delete('/:id', categoryValidator.delete, validate, asyncHandler(categoryController.deleteCategory));

export const categoryRouter = router;