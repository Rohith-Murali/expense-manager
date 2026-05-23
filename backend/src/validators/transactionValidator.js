import { z } from 'zod';
import {
  transactionTypeSchema,
  transactionTypeSchemaForCreation,
  amountSchema,
  dateSchema,
  objectIdSchema,
  descriptionSchema,
  notesSchema,
  tagsSchema,
  paginationSchema,
  dateRangeSchema
} from './baseSchemas.js';

/**
 * Create schema for transaction creation
 * For transfers, only the 'transfer' type is provided by the API
 * Internally, two documents will be created: transfer-out and transfer-in
 */
export const createSchema = z
  .object({
    type: transactionTypeSchemaForCreation,
    amount: amountSchema,
    date: z.coerce.date().optional().default(() => new Date()),
    categoryId: objectIdSchema.optional(),
    paymentTypeId: objectIdSchema.optional(),
    toAccountId: objectIdSchema.optional(),
    description: descriptionSchema,
    tags: tagsSchema.optional(),
    attachments: z.array(z.string()).optional(),
    notes: notesSchema
  })
  .strict()
  .superRefine((data, ctx) => {
    // For expense/income: category and payment type are required
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

    // For transfer: toAccountId is required
    if (data.type === 'transfer') {
      if (!data.toAccountId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['toAccountId'],
          message: 'Destination account is required for transfer transactions'
        });
      }
    }
  });

export const updateSchema = z
  .object({
    type: z.enum(['expense', 'income', 'transfer']).optional(),
    amount: amountSchema.optional(),
    date: z.coerce.date().optional(),
    categoryId: objectIdSchema.optional(),
    paymentTypeId: objectIdSchema.optional(),
    accountId: objectIdSchema.optional(),
    toAccountId: objectIdSchema.optional(),
    description: descriptionSchema,
    tags: tagsSchema.optional(),
    attachments: z.array(z.string()).optional(),
    notes: notesSchema
  })
  .strict()
  .superRefine((data, ctx) => {
    // Minimal validation for updates
    // Type cannot be changed (enforced at service level)
  });

export const idParamSchema = z
  .object({
    accountId: objectIdSchema,
    id: objectIdSchema
  })
  .strict();

/**
 * Get all transactions filter schema
 */
export const getAllSchema = z
  .object({
    type: transactionTypeSchema.optional(),
    categoryId: objectIdSchema.optional(),
    paymentTypeId: objectIdSchema.optional(),
    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().optional(),
    minAmount: z.coerce.number().optional().transform(v => v !== undefined ? Math.abs(v) : null),
    maxAmount: z.coerce.number().optional().transform(v => v !== undefined ? Math.abs(v) : null),
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
    if (data.minAmount !== null && data.maxAmount !== null && data.minAmount > data.maxAmount) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['maxAmount'],
        message: 'Max amount must be greater than or equal to min amount'
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