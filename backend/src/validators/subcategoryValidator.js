import { z } from 'zod';
import {
  nameSchema,
  iconSchema,
  colorSchema,
  objectIdSchema,
  booleanSchema,
} from './baseSchemas.js';

/**
 * Subcategory Validators
 * Validates subcategory CRUD operations and hierarchy relationships
 */

export const createSchema = z
  .object({
    name: nameSchema,
    parentCategoryId: objectIdSchema,
    icon: iconSchema,
    color: colorSchema,
  })
  .strict();

export const updateSchema = z
  .object({
    name: nameSchema.optional(),
    icon: iconSchema,
    color: colorSchema,
    isActive: booleanSchema,
  })
  .strict();

export const getByIdSchema = z
  .object({
    accountId: objectIdSchema,
    subcategoryId: objectIdSchema,
  })
  .strict();

export const getByParentSchema = z
  .object({
    accountId: objectIdSchema,
    parentCategoryId: objectIdSchema,
  })
  .strict();

export const deleteSchema = z
  .object({
    accountId: objectIdSchema,
    subcategoryId: objectIdSchema,
  })
  .strict();
