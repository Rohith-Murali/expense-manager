import { z } from 'zod';

export const emailSchema = z
  .string()
  .min(1, 'Email is required')
  .email('Please provide a valid email address')
  .toLowerCase()
  .trim();

export const passwordSchema = z
  .string()
  .min(6, 'Password must be at least 6 characters long')
  .max(128, 'Password must not exceed 128 characters');

export const nameSchema = z
  .string()
  .min(2, 'Name must be at least 2 characters long')
  .max(100, 'Name must not exceed 100 characters')
  .trim();

export const objectIdSchema = z
  .string()
  .regex(/^[0-9a-fA-F]{24}$/, 'Invalid MongoDB ID format');

export const colorSchema = z
  .string()
  .regex(/^#[0-9A-Fa-f]{6}$/, 'Color must be a valid hex color code')
  .optional();

export const descriptionSchema = z
  .string()
  .max(200, 'Description must not exceed 200 characters')
  .trim()
  .optional();

export const categoryTypeSchema = z.enum(['expense', 'income'], {
  errorMap: () => ({ message: 'Type must be either expense or income' })
});

export const accountTypeSchema = z.enum(['CASH', 'BANK', 'CARD', 'WALLET', 'OTHER'], {
  errorMap: () => ({ message: 'Invalid account type' })
});

export const transactionTypeSchema = z.enum(['expense', 'income', 'transfer'], {
  errorMap: () => ({ message: 'Invalid transaction type' })
});

export const currencySchema = z
  .string()
  .length(3, 'Currency code must be 3 characters')
  .toUpperCase()
  .optional()
  .default('INR');

export const amountSchema = z
  .number()
  .positive('Amount must be greater than 0')
  .finite('Amount must be a valid number');

export const dateSchema = z
  .coerce
  .date()
  .min(new Date('1900-01-01'), 'Date cannot be before 1900')
  .max(new Date('2100-12-31'), 'Date cannot be after 2100');

export const dateStringSchema = z
  .string()
  .datetime({ offset: true })
  .optional();

export const booleanSchema = z.boolean().optional();

export const iconSchema = z
  .string()
  .max(50, 'Icon must not exceed 50 characters')
  .optional();

export const tagsSchema = z
  .array(
    z
      .string()
      .min(1, 'Each tag must have at least 1 character')
      .max(30, 'Each tag must not exceed 30 characters')
      .trim()
  )
  .optional();

export const notesSchema = z
  .string()
  .max(1000, 'Notes must not exceed 1000 characters')
  .trim()
  .optional();

export const paginationSchema = z
  .object({
    page: z.coerce.number().int().positive('Page must be a positive integer').optional().default(1),
    limit: z.coerce.number().int().min(1).max(100, 'Limit must be between 1 and 100').optional().default(50),
    skip: z.coerce.number().int().nonnegative('Skip must be non-negative').optional().default(0)
  })
  .strict();

export const dateRangeSchema = z
  .object({
    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().optional()
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
      path: ['endDate']
    }
  );

// Reusable base object schema for params
export const idParamSchema = z
  .object({
    id: objectIdSchema
  })
  .strict();

export const accountIdParamSchema = z
  .object({
    accountId: objectIdSchema
  })
  .strict();

export const accountIdWithIdParamSchema = z
  .object({
    accountId: objectIdSchema,
    id: objectIdSchema
  })
  .strict();

export const createStrictSchema = (shape, message = 'Unknown field') => {
  return z.object(shape).strict();
};