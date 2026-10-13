import { z } from 'zod';
import {
  amountSchema,
  colorSchema,
  dateSchema,
  descriptionSchema,
  iconSchema,
  nameSchema,
  objectIdSchema,
} from './baseSchemas.js';

export const bucketCreateSchema = z
  .object({
    name: nameSchema,
    description: descriptionSchema,
    color: colorSchema,
    icon: iconSchema,
    status: z.enum(['active', 'archived']).optional(),
  })
  .strict();

export const bucketUpdateSchema = z
  .object({
    name: nameSchema.optional(),
    description: descriptionSchema,
    color: colorSchema,
    icon: iconSchema,
    status: z.enum(['active', 'archived']).optional(),
  })
  .strict();

export const goalCreateSchema = z
  .object({
    name: nameSchema,
    targetAmount: amountSchema,
    targetDate: z.union([dateSchema, z.null()]).optional(),
    bucketId: objectIdSchema.optional().nullable(),
    description: descriptionSchema,
    status: z.enum(['active', 'completed', 'paused', 'archived']).optional(),
  })
  .strict();

export const goalUpdateSchema = z
  .object({
    name: nameSchema.optional(),
    targetAmount: amountSchema.optional(),
    targetDate: z.union([dateSchema, z.null()]).optional(),
    bucketId: objectIdSchema.optional().nullable(),
    description: descriptionSchema,
    status: z.enum(['active', 'completed', 'paused', 'archived']).optional(),
  })
  .strict();

export const entryCreateSchema = z
  .object({
    bucketId: objectIdSchema,
    goalId: objectIdSchema.optional().nullable(),
    type: z.enum(['contribution', 'withdrawal']),
    amount: amountSchema,
    effectiveDate: dateSchema.optional(),
    note: z.string().max(500).trim().optional(),
    reference: z.string().max(100).trim().optional(),
  })
  .strict();

export const entryUpdateSchema = z
  .object({
    bucketId: objectIdSchema.optional(),
    goalId: objectIdSchema.optional().nullable(),
    type: z.enum(['contribution', 'withdrawal']).optional(),
    amount: amountSchema.optional(),
    effectiveDate: dateSchema.optional(),
    note: z.string().max(500).trim().optional(),
    reference: z.string().max(100).trim().optional(),
  })
  .strict();

export const bucketParamSchema = z.object({ bucketId: objectIdSchema }).strict();
export const goalParamSchema = z.object({ goalId: objectIdSchema }).strict();
export const entryParamSchema = z.object({ entryId: objectIdSchema }).strict();
export const listQuerySchema = z
  .object({
    status: z.enum(['active', 'archived', 'completed', 'paused']).optional(),
    bucketId: objectIdSchema.optional(),
    goalId: objectIdSchema.optional(),
    page: z.coerce.number().int().min(1).default(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).default(20).optional(),
  })
  .strict();
