import { z } from 'zod';
import { objectIdSchema, amountSchema } from './baseSchemas.js';

export const createSchema = z
  .object({
    category: objectIdSchema,
    month: z.coerce.number().int().min(1).max(12),
    year: z.coerce.number().int().min(2000).max(2100),
    amount: z.coerce.number().nonnegative(),
    rollover: z.boolean().optional(),
    alertThreshold: z.coerce.number().int().min(0).max(100).optional()
  })
  .strict();

export const updateSchema = z
  .object({
    category: objectIdSchema.optional(),
    month: z.coerce.number().int().min(1).max(12).optional(),
    year: z.coerce.number().int().min(2000).max(2100).optional(),
    amount: z.coerce.number().nonnegative().optional(),
    rollover: z.boolean().optional(),
    alertThreshold: z.coerce.number().int().min(0).max(100).optional()
  })
  .strict();

export const idParamSchema = z
  .object({
    accountId: objectIdSchema,
    id: objectIdSchema
  })
  .strict();

export const getListSchema = z
  .object({
    month: z.coerce.number().int().min(1).max(12).optional(),
    year: z.coerce.number().int().min(2000).max(2100).optional()
  })
  .strict();
