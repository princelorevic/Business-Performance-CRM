import { z } from 'zod';
import { amount, isoDate, optionalText, listQuery, dateRange } from './common.js';

const idemKey = z.string().trim().min(8).max(100).regex(/^[A-Za-z0-9._:-]+$/, 'Invalid idempotency key');

export const invoiceSchema = z.object({
  customerId: z.coerce.number().int().positive(),
  opportunityId: z.coerce.number().int().positive().optional().nullable(),
  issueDate: isoDate,
  dueDate: isoDate,
  total: amount,
  notes: optionalText(5000),
}).refine((v) => v.dueDate >= v.issueDate, { message: 'Due date must not be before issue date', path: ['dueDate'] });
export const invoiceUpdateSchema = z.object({
  issueDate: isoDate.optional(), dueDate: isoDate.optional(), total: amount.optional(), notes: optionalText(5000),
}).refine((v) => Object.keys(v).length > 0, 'Nothing to update');
export const invoiceListQuery = listQuery.extend({
  status: z.enum(['draft', 'sent', 'partially_paid', 'paid', 'overdue', 'void']).optional(),
  customerId: z.coerce.number().int().positive().optional(),
});
export const voidSchema = z.object({ reason: z.string().trim().min(3).max(300) });

export const paymentSchema = z.object({
  invoiceId: z.coerce.number().int().positive(),
  amount,
  paidAt: isoDate,
  method: z.string().trim().min(1).max(40).default('bank_transfer'),
  reference: optionalText(100),
  idempotencyKey: idemKey,
});
export const refundSchema = z.object({ amount, paidAt: isoDate, reference: optionalText(100), reason: z.string().trim().min(3).max(300), idempotencyKey: idemKey });
export const paymentListQuery = listQuery.extend({ direction: z.enum(['incoming', 'outgoing']).optional(), status: z.enum(['pending', 'completed', 'failed', 'void']).optional() });

export const expenseSchema = z.object({
  categoryId: z.coerce.number().int().positive(),
  description: z.string().trim().min(1).max(300),
  vendor: optionalText(200),
  amount,
  expenseDate: isoDate,
});
export const expenseListQuery = listQuery.extend({ status: z.enum(['draft', 'approved', 'paid', 'void']).optional(), categoryId: z.coerce.number().int().positive().optional() });
export const expensePaySchema = z.object({ paidAt: isoDate, method: z.string().trim().min(1).max(40).default('bank_transfer'), reference: optionalText(100), idempotencyKey: idemKey });
export const categorySchema = z.object({ name: z.string().trim().min(1).max(100) });

export const investmentSchema = z.object({
  name: z.string().trim().min(1).max(200),
  category: z.string().trim().min(1).max(100),
  purpose: optionalText(500),
  amount,
  investedAt: isoDate,
});
export const investmentReturnSchema = z.object({ amount, returnedAt: isoDate, note: optionalText(300) });

export const rangeQuery = z.object({ from: isoDate, to: isoDate }).pipe(dateRange);
