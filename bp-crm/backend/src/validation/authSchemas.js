import { z } from 'zod';
import { email, password } from './common.js';

export const registerSchema = z.object({
  companyName: z.string().trim().min(2).max(200),
  fullName: z.string().trim().min(2).max(150),
  email,
  password,
  currency: z.string().trim().length(3).toUpperCase().default('USD'),
  timezone: z.string().trim().max(64).default('UTC'),
});

export const loginSchema = z.object({ email, password: z.string().min(1).max(128) });

export const createUserSchema = z.object({
  fullName: z.string().trim().min(2).max(150),
  email,
  password,
  role: z.enum(['ceo_coo', 'finance', 'sales']),
});

export const updateUserSchema = z
  .object({ role: z.enum(['ceo_coo', 'finance', 'sales']).optional(), status: z.enum(['active', 'disabled']).optional() })
  .refine((v) => v.role || v.status, 'Nothing to update');
