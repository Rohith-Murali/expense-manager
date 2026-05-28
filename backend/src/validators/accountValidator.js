import { z } from 'zod';
import {
  nameSchema,
  accountTypeSchema,
  amountSchema,
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
    openingBalance: amountSchema,
    currency: currencySchema,
    description: descriptionSchema,
    color: colorSchema,
    icon: iconSchema,
  })
  .strict();

export const updateAccountSchema = z
  .object({
    name: z.string().min(2).max(50).trim().optional(),
    type: accountTypeSchema.optional(),
    openingBalance: amountSchema.optional(),
    monthlyBudget: amountSchema.optional(),
    currency: currencySchema.optional(),
    description: descriptionSchema,
    color: colorSchema,
    icon: iconSchema,
  })
  .strict();

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
