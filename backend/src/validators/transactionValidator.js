import { z } from 'zod';
import {
  transactionTypeSchema,
  amountSchema,
  dateSchema,
  objectIdSchema,
  descriptionSchema,
  notesSchema,
  tagsSchema,
  paginationSchema,
  dateRangeSchema
} from './baseSchemas.js';

export const createSchema = z
  .object({
    type: transactionTypeSchema,
    amount: amountSchema,
    date: z.coerce.date().optional().default(() => new Date()),
    categoryId: objectIdSchema.optional(),
    paymentTypeId: objectIdSchema.optional(),
    fromAccountId: objectIdSchema.optional(),
    toAccountId: objectIdSchema.optional(),
    description: descriptionSchema,
    tags: tagsSchema,
    notes: notesSchema
  })
  .strict()
  .superRefine((data, ctx) => {
    // If not transfer, category and payment type are required
    if (data.type !== 'transfer') {
      if (!data.categoryId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['categoryId'],
          message: 'Category is required for expense/income transactions'
        });
      }
      if (!data.paymentTypeId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['paymentTypeId'],
          message: 'Payment type is required for expense/income transactions'
        });
      }
    }

    // If transfer, from and to accounts are required
    if (data.type === 'transfer') {
      if (!data.fromAccountId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['fromAccountId'],
          message: 'From account is required for transfer transactions'
        });
      }
      if (!data.toAccountId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['toAccountId'],
          message: 'To account is required for transfer transactions'
        });
      }
      // From and to accounts cannot be the same
      if (data.fromAccountId && data.toAccountId && data.fromAccountId === data.toAccountId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['toAccountId'],
          message: 'From and to accounts cannot be the same'
        });
      }
    }
  });

export const updateSchema = z
  .object({
    type: transactionTypeSchema.optional(),
    amount: amountSchema.optional(),
    date: z.coerce.date().optional(),
    categoryId: objectIdSchema.optional(),
    paymentTypeId: objectIdSchema.optional(),
    fromAccountId: objectIdSchema.optional(),
    toAccountId: objectIdSchema.optional(),
    description: descriptionSchema,
    tags: tagsSchema,
    notes: notesSchema
  })
  .strict()
  .superRefine((data, ctx) => {
    // If both accounts provided in transfer, ensure they're different
    if (data.type === 'transfer' && data.fromAccountId && data.toAccountId) {
      if (data.fromAccountId === data.toAccountId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['toAccountId'],
          message: 'From and to accounts cannot be the same'
        });
      }
    }
  });

export const idParamSchema = z
  .object({
    accountId: objectIdSchema,
    id: objectIdSchema
  })
  .strict();

export const getAllSchema = z
  .object({
    type: transactionTypeSchema.optional(),
    categoryId: objectIdSchema.optional(),
    paymentTypeId: objectIdSchema.optional(),
    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().optional(),
    minAmount: z.coerce.number().nonnegative().optional(),
    maxAmount: z.coerce.number().nonnegative().optional(),
    limit: z.coerce.number().int().min(1).max(1000).optional().default(100),
    skip: z.coerce.number().int().nonnegative().optional().default(0)
  })
  .strict()
  .superRefine((data, ctx) => {
    if (data.startDate && data.endDate && data.endDate < data.startDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['endDate'],
        message: 'End date must be after start date'
      });
    }
    if (data.minAmount !== undefined && data.maxAmount !== undefined && data.maxAmount < data.minAmount) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['maxAmount'],
        message: 'Max amount must be greater than min amount'
      });
    }
  });

export const getStatsSchema = z
  .object({
    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().optional()
  })
  .strict()
  .superRefine((data, ctx) => {
    if (data.startDate && data.endDate && data.endDate < data.startDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['endDate'],
        message: 'End date must be after start date'
      });
    }
  });