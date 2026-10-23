import { z } from 'zod';
import { objectIdSchema } from './baseSchemas.js';

export const importParamsSchema = z
  .object({
    accountId: objectIdSchema,
  })
  .strict();

const importMappingSchema = z
  .object({
    date: z.string().min(1),
    type: z.string().min(1),
    amount: z.string().min(1),
    category: z.string().min(1),
    paymentType: z.string().min(1),
    subcategory: z.string().optional(),
    description: z.string().optional(),
    notes: z.string().optional(),
    tags: z.string().optional(),
  })
  .strict();

export const csvImportSchema = z
  .object({
    rows: z.array(z.record(z.string(), z.string())).min(1).max(500),
    mapping: importMappingSchema,
  })
  .strict();
