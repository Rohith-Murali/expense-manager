import { z } from 'zod';
import {
  nameSchema,
  categoryTypeSchema,
  iconSchema,
  objectIdSchema,
  booleanSchema
} from './baseSchemas.js';

export const createSchema = z
  .object({
    name: nameSchema,
    type: categoryTypeSchema,
    icon: iconSchema
  })
  .strict();

export const updateSchema = z
  .object({
    name: nameSchema.optional(),
    icon: iconSchema,
    isActive: booleanSchema
  })
  .strict();

export const getByIdSchema = z
  .object({
    accountId: objectIdSchema,
    id: objectIdSchema
  })
  .strict();

export const deleteSchema = z
  .object({
    accountId: objectIdSchema,
    id: objectIdSchema
  })
  .strict();

export const seedDefaultsSchema = z
  .object({
    accountId: objectIdSchema
  })
  .strict();
