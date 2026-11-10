import { z } from 'zod';
import {
  transactionTypeSchema,
  transactionTypeSchemaForCreation,
  amountSchema,
  positiveMoneySchema,
  nonNegativeMoneySchema,
  dateSchema,
  objectIdSchema,
  descriptionSchema,
  notesSchema,
  tagsSchema,
  paginationSchema,
  dateRangeSchema,
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
    date: z.coerce
      .date()
      .optional()
      .default(() => new Date()),
    categoryId: objectIdSchema.optional(),
    subcategoryId: objectIdSchema.nullable().optional(),
    paymentTypeId: objectIdSchema.nullable().optional(),
    creditCardAccountId: objectIdSchema.nullable().optional(),
    toAccountId: objectIdSchema.optional(),
    description: descriptionSchema,
    tags: tagsSchema.optional(),
    attachments: z.array(z.string()).optional(),
    notes: notesSchema,
    isRecurring: z.boolean().optional().default(false),
    recurringPatternId: objectIdSchema.nullable().optional(),
    sharedPayment: z
      .object({
        personalShare: nonNegativeMoneySchema,
        participants: z
          .array(
            z.object({
              name: z.string().trim().min(1).max(100),
              amount: positiveMoneySchema,
            }).strict(),
          )
          .min(1),
      })
      .strict()
      .optional(),
    repaymentAllocations: z
      .array(
        z
          .object({
            receiptId: objectIdSchema,
            amount: positiveMoneySchema,
          })
          .strict(),
      )
      .optional(),
  })
  .strict()
  .superRefine((data, ctx) => {
    if (data.type !== 'transfer') {
      if (!data.categoryId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['categoryId'],
          message: 'Category is required for expense/income transactions',
        });
      }
      if (!data.paymentTypeId && !data.creditCardAccountId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['paymentTypeId'],
          message: 'Payment type is required unless paying by credit card',
        });
      }
      if (data.creditCardAccountId && data.type !== 'expense') {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['creditCardAccountId'],
          message: 'Credit-card payment is only supported for expenses',
        });
      }
    }

    // For transfer: toAccountId is required
    if (data.type === 'transfer') {
      if (!data.toAccountId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['toAccountId'],
          message: 'Destination account is required for transfer transactions',
        });
      }
    }

    // Subcategory requires categoryId
    if (data.subcategoryId && !data.categoryId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['subcategoryId'],
        message: 'Category is required when subcategory is specified',
      });
    }

    // isRecurring and recurringPatternId validation
    if (data.isRecurring && !data.recurringPatternId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['recurringPatternId'],
        message: 'Recurring pattern is required when isRecurring is true',
      });
    }

    if (data.sharedPayment && data.type !== 'expense') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['sharedPayment'],
        message: 'Shared payments must be expenses',
      });
    }

    if (data.sharedPayment) {
      if (Math.abs(data.amount * 100 - Math.round(data.amount * 100)) >= 1e-6) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['amount'],
          message: 'Shared payment amount can have at most 2 decimal places',
        });
      }
      const participantTotal = data.sharedPayment.participants.reduce(
        (sum, participant) => sum + participant.amount,
        0,
      );
      if (Math.abs(data.sharedPayment.personalShare + participantTotal - data.amount) > 0.005) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['sharedPayment'],
          message: 'Personal share and participant shares must equal the transaction amount',
        });
      }
    }

    if (data.repaymentAllocations?.length && data.type !== 'transfer') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['repaymentAllocations'],
        message: 'Reserved repayments can only be applied to a card payment transfer',
      });
    }
  });

export const updateSchema = z
  .object({
    type: z.enum(['expense', 'income', 'transfer']).optional(),
    amount: amountSchema.optional(),
    date: z.coerce.date().optional(),
    categoryId: objectIdSchema.optional(),
    subcategoryId: objectIdSchema.nullable().optional(),
    paymentTypeId: objectIdSchema.nullable().optional(),
    creditCardAccountId: objectIdSchema.nullable().optional(),
    accountId: objectIdSchema.optional(),
    toAccountId: objectIdSchema.optional(),
    description: descriptionSchema,
    tags: tagsSchema.optional(),
    attachments: z.array(z.string()).optional(),
    notes: notesSchema,
    isRecurring: z.boolean().optional(),
    recurringPatternId: objectIdSchema.nullable().optional(),
  })
  .strict()
  .superRefine((data, ctx) => {
    // Subcategory requires categoryId
    if (data.subcategoryId && !data.categoryId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['subcategoryId'],
        message: 'Category is required when subcategory is specified',
      });
    }

    // isRecurring and recurringPatternId validation
    if (data.isRecurring === true && !data.recurringPatternId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['recurringPatternId'],
        message: 'Recurring pattern is required when isRecurring is true',
      });
    }
  });

export const idParamSchema = z
  .object({
    accountId: objectIdSchema,
    id: objectIdSchema,
  })
  .strict();

/**
 * Get all transactions filter schema
 */
export const getAllSchema = z
  .object({
    type: transactionTypeSchema.optional(),
    categoryId: objectIdSchema.optional(),
    subcategoryId: objectIdSchema.optional(),
    paymentTypeId: objectIdSchema.optional(),
    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().optional(),
    isRecurring: z.enum(['true', 'false']).transform((value) => value === 'true').optional(),
    minAmount: z.coerce
      .number()
      .optional()
      .transform((v) => (v !== undefined ? Math.abs(v) : null)),
    maxAmount: z.coerce
      .number()
      .optional()
      .transform((v) => (v !== undefined ? Math.abs(v) : null)),
    limit: z.coerce.number().int().min(1).max(1000).optional().default(100),
    skip: z.coerce.number().int().nonnegative().optional().default(0),
  })
  .strict()
  .superRefine((data, ctx) => {
    if (data.startDate && data.endDate && data.endDate < data.startDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['endDate'],
        message: 'End date must be after start date',
      });
    }
    if (data.minAmount !== null && data.maxAmount !== null && data.minAmount > data.maxAmount) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['maxAmount'],
        message: 'Max amount must be greater than or equal to min amount',
      });
    }
  });

export const getStatsSchema = z
  .object({
    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().optional(),
  })
  .strict()
  .superRefine((data, ctx) => {
    if (data.startDate && data.endDate && data.endDate < data.startDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['endDate'],
        message: 'End date must be after start date',
      });
    }
  });

export const getCategoryWiseAnalyticsSchema = z
  .object({
    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().optional(),
    type: z.enum(['income', 'expense']).optional(),
    budgetMonth: z.coerce.number().int().min(1).max(12).optional(),
    budgetYear: z.coerce.number().int().min(2000).max(2100).optional(),
  })
  .strict()
  .superRefine((data, ctx) => {
    if (data.startDate && data.endDate && data.endDate < data.startDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['endDate'],
        message: 'End date must be after start date',
      });
    }
    if ((data.budgetMonth === undefined) !== (data.budgetYear === undefined)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [data.budgetMonth === undefined ? 'budgetMonth' : 'budgetYear'],
        message: 'Budget month and year must be provided together',
      });
    }
  });
