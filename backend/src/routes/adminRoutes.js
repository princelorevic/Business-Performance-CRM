import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler as h } from '../utils/asyncHandler.js';
import { validate } from '../middleware/validate.js';
import { requirePermission as need } from '../middleware/auth.js';
import { idParam, listQuery, isoDate } from '../validation/common.js';
import { createUserSchema, updateUserSchema } from '../validation/authSchemas.js';
import * as users from '../controllers/authController.js';
import * as sub from '../services/subscriptionService.js';
import { listAudit } from '../services/auditQueryService.js';
import { can } from '../config/permissions.js';
import { subscriptionGuard } from '../middleware/subscriptionGuard.js';

const r = Router();

// User changes are blocked while the subscription is inactive; /subscription stays open.
r.use('/users', subscriptionGuard);
r.get('/users', need('users:read'), h(users.users));
r.post('/users', need('users:write'), validate({ body: createUserSchema }), h(users.addUser));
r.patch('/users/:id', need('users:write'), validate({ params: idParam, body: updateUserSchema }), h(users.editUser));

r.get('/subscription', need('subscription:read'), h(async (req, res) => res.json(await sub.getSubscription(req.auth.companyId))));
r.get('/subscription/plans', need('subscription:read'), h(async (_req, res) => res.json({ data: await sub.listPlans() })));
r.post('/subscription/transition', need('subscription:manage'),
  validate({ body: z.object({ to: z.enum(['active', 'past_due', 'suspended', 'canceled']) }) }),
  h(async (req, res) => res.json(await sub.transition(req.auth, req.body.to, req.ip))));
r.post('/subscription/plan', need('subscription:manage'),
  validate({ body: z.object({ plan: z.string().trim().min(1).max(40) }) }),
  h(async (req, res) => res.json(await sub.changePlan(req.auth, req.body.plan, req.ip))));

const auditQuery = listQuery.pick({ page: true, pageSize: true }).extend({
  entityType: z.string().trim().max(60).optional(), from: isoDate.optional(), to: isoDate.optional(),
});
r.get('/audit-logs', need('audit:read', 'audit:financial'), validate({ query: auditQuery }),
  h(async (req, res) => res.json(await listAudit(req.auth.companyId, req.validQuery, { financialOnly: !can(req.auth.role, 'audit:read') }))));

export default r;
