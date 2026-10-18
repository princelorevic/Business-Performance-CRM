import { z } from 'zod';
import { email, optionalText, amountOrZero, amount, isoDate, listQuery } from './common.js';

const optEmail = z.union([email, z.literal('')]).optional().nullable().transform((v) => v || null);

export const customerSchema = z.object({
  name: z.string().trim().min(1).max(200),
  email: optEmail,
  phone: optionalText(40),
  address: optionalText(500),
  notes: optionalText(5000),
  ownerUserId: z.coerce.number().int().positive().optional().nullable(),
});
export const customerUpdateSchema = customerSchema.partial().refine((v) => Object.keys(v).length > 0, 'Nothing to update');
export const customerListQuery = listQuery;

export const LEAD_STATUSES = ['new', 'contacted', 'qualified', 'unqualified', 'converted'];
export const leadSchema = z.object({
  name: z.string().trim().min(1).max(200),
  email: optEmail,
  phone: optionalText(40),
  source: optionalText(100),
  status: z.enum(LEAD_STATUSES).default('new'),
});
export const leadUpdateSchema = leadSchema.partial().refine((v) => Object.keys(v).length > 0, 'Nothing to update');
export const leadListQuery = listQuery.extend({ status: z.enum(LEAD_STATUSES).optional() });

export const STAGES = ['prospecting', 'qualification', 'proposal', 'negotiation', 'won', 'lost'];
export const opportunitySchema = z.object({
  customerId: z.coerce.number().int().positive(),
  title: z.string().trim().min(1).max(200),
  stage: z.enum(STAGES).default('prospecting'),
  value: amountOrZero,
  expectedCloseDate: isoDate.optional().nullable(),
});
export const opportunityUpdateSchema = opportunitySchema.omit({ customerId: true }).partial().refine((v) => Object.keys(v).length > 0, 'Nothing to update');
export const opportunityListQuery = listQuery.extend({ stage: z.enum(STAGES).optional() });

export const quotationSchema = z.object({
  customerId: z.coerce.number().int().positive(),
  opportunityId: z.coerce.number().int().positive().optional().nullable(),
  issueDate: isoDate,
  validUntil: isoDate.optional().nullable(),
  total: amount,
  status: z.enum(['draft', 'sent', 'accepted', 'rejected', 'expired']).default('draft'),
  notes: optionalText(5000),
});
export const quotationListQuery = listQuery.extend({ status: z.enum(['draft', 'sent', 'accepted', 'rejected', 'expired']).optional() });

export const targetSchema = z.object({
  userId: z.coerce.number().int().positive().optional().nullable(),
  periodStart: isoDate,
  periodEnd: isoDate,
  amount,
}).refine((v) => v.periodStart <= v.periodEnd, { message: 'periodEnd must not be before periodStart', path: ['periodEnd'] });
