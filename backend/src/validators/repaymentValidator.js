import { z } from 'zod';
import {
  dateSchema,
  nonNegativeMoneySchema,
  objectIdSchema,
  notesSchema,
  positiveMoneySchema,
} from './baseSchemas.js';

const participantUpdateSchema = z
  .object({
    id: objectIdSchema.optional(),
    name: z.string().trim().min(1).max(100),
    amount: positiveMoneySchema,
  })
  .strict();

export const repaymentIdParamSchema = z.object({ id: objectIdSchema }).strict();
export const receiptIdParamSchema = z
  .object({ id: objectIdSchema, receiptId: objectIdSchema })
  .strict();

export const updateRepaymentSchema = z
  .object({
    accountId: objectIdSchema.optional(),
    amount: positiveMoneySchema.optional(),
    categoryId: objectIdSchema.optional(),
    subcategoryId: objectIdSchema.nullable().optional(),
    paymentTypeId: objectIdSchema.nullable().optional(),
    creditCardAccountId: objectIdSchema.nullable().optional(),
    title: z.string().trim().max(200).optional(),
    date: dateSchema.optional(),
    notes: notesSchema,
    personalShare: nonNegativeMoneySchema.optional(),
    participants: z.array(participantUpdateSchema).min(1).optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, 'At least one field is required');

export const createReceiptSchema = z
  .object({
    participantId: objectIdSchema,
    amount: positiveMoneySchema,
    date: dateSchema.optional().default(() => new Date()),
    destinationAccountId: objectIdSchema,
    notes: notesSchema,
  })
  .strict();

export const updateReceiptSchema = z
  .object({
    participantId: objectIdSchema.optional(),
    amount: positiveMoneySchema.optional(),
    date: dateSchema.optional(),
    destinationAccountId: objectIdSchema.optional(),
    notes: notesSchema,
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, 'At least one field is required');
