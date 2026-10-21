import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler as h } from '../utils/asyncHandler.js';
import { validate } from '../middleware/validate.js';
import { requirePermission as need } from '../middleware/auth.js';
import { rangeQuery } from '../validation/financeSchemas.js';
import * as c from '../controllers/reportController.js';

const type = z.object({ type: z.enum(['sales', 'expenses', 'cashflow', 'profitability']) });
const r = Router();
r.get('/dashboard', need('dashboard:read'), validate({ query: rangeQuery }), h(c.dashboard));
r.get('/reports/:type', need('dashboard:read'), validate({ params: type, query: rangeQuery }), h(c.report));
r.get('/reports/:type/export.csv', need('exports:read'), validate({ params: type, query: rangeQuery }), h(c.exportCsv));
export default r;
