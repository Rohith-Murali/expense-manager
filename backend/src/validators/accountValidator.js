import { z } from 'zod';
import {
  nameSchema,
  accountTypeSchema,
  amountSchema,
  openingBalanceSchema,
  currencySchema,
  descriptionSchema,
  colorSchema,
  iconSchema,
  objectIdSchema,
  paginationSchema,
  dateRangeSchema,
} from './baseSchemas.js';

/**
 * Account validation schemas using Zod
 * All schemas are strict and reject unknown fields
 */

export const createAccountSchema = z
  .object({
    name: z
      .string()
      .min(2, 'Account name must be at least 2 characters')
      .max(50, 'Account name must not exceed 50 characters')
      .trim(),
    type: accountTypeSchema.optional().default('BANK'),
    openingBalance: openingBalanceSchema.optional().default(0),
    currency: currencySchema,
    description: descriptionSchema,
    color: colorSchema,
    icon: iconSchema,
    creditLimit: z.number().finite().nonnegative().optional(),
    statementClosingDay: z.number().int().min(1).max(31).optional(),
    paymentDueDays: z.number().int().min(1).max(60).optional(),
  })
  .strict()
  .superRefine((data, ctx) => {
    const creditCardFields = ['creditLimit', 'statementClosingDay', 'paymentDueDays'];
    if (data.type === 'CREDIT_CARD') {
      for (const field of creditCardFields) {
        if (data[field] === undefined) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: [field],
            message: `${field} is required for credit card accounts`,
          });
        }
      }
    } else if (creditCardFields.some((field) => data[field] !== undefined)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['type'],
        message: 'Credit-card configuration can only be used for credit card accounts',
      });
    }
  });

export const updateAccountSchema = z
  .object({
    name: z.string().min(2).max(50).trim().optional(),
    type: accountTypeSchema.optional(),
    openingBalance: openingBalanceSchema.optional(),
    monthlyBudget: amountSchema.optional(),
    currency: currencySchema.optional(),
    description: descriptionSchema,
    color: colorSchema,
    icon: iconSchema,
    creditLimit: z.number().finite().nonnegative().optional(),
    statementClosingDay: z.number().int().min(1).max(31).optional(),
    paymentDueDays: z.number().int().min(1).max(60).optional(),
  })
  .strict()
  .superRefine((data, ctx) => {
    const creditCardFields = ['creditLimit', 'statementClosingDay', 'paymentDueDays'];
    if (data.type === 'CREDIT_CARD') {
      for (const field of creditCardFields) {
        if (data[field] === undefined) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: [field],
            message: `${field} is required when setting account type to CREDIT_CARD`,
          });
        }
      }
    } else if (
      data.type !== undefined &&
      creditCardFields.some((field) => data[field] !== undefined)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['type'],
        message: 'Credit-card configuration can only be used for credit card accounts',
      });
    }
  });

export const accountIdParamSchema = z
  .object({
    accountId: objectIdSchema,
  })
  .strict();

export const accountTransactionsQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1, 'Page must be a positive integer').optional().default(1),
    limit: z.coerce
      .number()
      .int()
      .min(1)
      .max(100, 'Limit must be between 1 and 100')
      .optional()
      .default(50),
    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().optional(),
  })
  .strict()
  .refine(
    (data) => {
      if (data.startDate && data.endDate) {
        return data.endDate >= data.startDate;
      }
      return true;
    },
    {
      message: 'End date must be after or equal to start date',
      path: ['endDate'],
    },
  );
