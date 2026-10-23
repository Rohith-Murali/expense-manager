import { z } from 'zod';
import { objectIdSchema } from './baseSchemas.js';

export const accountParamSchema = z
  .object({
    accountId: objectIdSchema,
  })
  .strict();

export const overviewSchema = z
  .object({
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
    comparisonStartDate: z.coerce.date(),
    comparisonEndDate: z.coerce.date(),
    periodType: z.enum(['month', 'year']),
    budgetMonth: z.coerce.number().int().min(1).max(12).optional(),
    budgetYear: z.coerce.number().int().min(2000).max(2100).optional(),
    timezone: z.string().min(1).max(64).default('UTC'),
  })
  .strict()
  .superRefine((data, ctx) => {
    if (data.endDate <= data.startDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['endDate'],
        message: 'End date must be after start date',
      });
    }
    if (data.comparisonEndDate <= data.comparisonStartDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['comparisonEndDate'],
        message: 'Comparison end date must be after comparison start date',
      });
    }
    if (data.comparisonEndDate.getTime() !== data.startDate.getTime()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['comparisonEndDate'],
        message: 'Comparison period must end when the selected period begins',
      });
    }
    if ((data.budgetMonth === undefined) !== (data.budgetYear === undefined)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [data.budgetMonth === undefined ? 'budgetMonth' : 'budgetYear'],
        message: 'Budget month and year must be provided together',
      });
    }
    if (data.periodType === 'month' && data.budgetMonth === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['budgetMonth'],
        message: 'Monthly analytics require a budget month and year',
      });
    }
    if (data.periodType === 'year' && data.budgetMonth !== undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['budgetMonth'],
        message: 'Yearly analytics do not accept monthly budget filters',
      });
    }
  });
