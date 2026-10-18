import { z } from 'zod';

export const idParam = z.object({ id: z.coerce.number().int().positive() });

// Money arrives as a string/number with at most 2 decimals and is kept as a string.
export const amount = z
  .union([z.string(), z.number()])
  .transform((v) => String(v).trim())
  .refine((v) => /^\d{1,13}(\.\d{1,2})?$/.test(v), 'Must be a positive amount with at most 2 decimals')
  .refine((v) => Number(v) > 0, 'Must be greater than zero');

export const amountOrZero = z
  .union([z.string(), z.number()])
  .transform((v) => String(v).trim())
  .refine((v) => /^\d{1,13}(\.\d{1,2})?$/.test(v), 'Must be an amount with at most 2 decimals');

export const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD')
  .refine((v) => !Number.isNaN(Date.parse(`${v}T00:00:00Z`)) && new Date(`${v}T00:00:00Z`).toISOString().startsWith(v), 'Invalid date');

export const dateRange = z
  .object({ from: isoDate, to: isoDate })
  .refine((r) => r.from <= r.to, { message: '"from" must not be after "to"', path: ['to'] })
  .refine((r) => (new Date(r.to) - new Date(r.from)) / 86400000 <= 731, { message: 'Range may not exceed 2 years', path: ['to'] });

export const listQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(100).optional(),
  sort: z.string().trim().max(40).optional(),
  order: z.enum(['asc', 'desc']).default('desc'),
});

export const optionalText = (max) => z.string().trim().max(max).optional().nullable().transform((v) => (v ? v : null));
export const email = z.string().trim().toLowerCase().email().max(254);
export const password = z
  .string()
  .min(10, 'At least 10 characters')
  .max(128)
  .refine((v) => /[A-Za-z]/.test(v) && /\d/.test(v), 'Must contain letters and numbers');
