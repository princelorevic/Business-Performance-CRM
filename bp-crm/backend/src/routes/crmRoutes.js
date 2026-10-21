import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler as h } from '../utils/asyncHandler.js';
import { validate } from '../middleware/validate.js';
import { requirePermission as need } from '../middleware/auth.js';
import { idParam } from '../validation/common.js';
import * as s from '../validation/crmSchemas.js';
import * as c from '../controllers/crmController.js';

const r = Router();

r.get('/customers', need('customers:read'), validate({ query: s.customerListQuery }), h(c.customerList));
r.post('/customers', need('customers:write'), validate({ body: s.customerSchema }), h(c.customerCreate));
r.get('/customers/:id', need('customers:read'), validate({ params: idParam }), h(c.customerGet));
r.patch('/customers/:id', need('customers:write'), validate({ params: idParam, body: s.customerUpdateSchema }), h(c.customerUpdate));
r.delete('/customers/:id', need('customers:write'), validate({ params: idParam }), h(c.customerDelete));

r.get('/leads', need('leads:read'), validate({ query: s.leadListQuery }), h(c.leadList));
r.post('/leads', need('leads:write'), validate({ body: s.leadSchema }), h(c.leadCreate));
r.get('/leads/:id', need('leads:read'), validate({ params: idParam }), h(c.leadGet));
r.patch('/leads/:id', need('leads:write'), validate({ params: idParam, body: s.leadUpdateSchema }), h(c.leadUpdate));
r.post('/leads/:id/convert', need('leads:write'), validate({ params: idParam }), h(c.leadConvert));

r.get('/opportunities', need('opportunities:read'), validate({ query: s.opportunityListQuery }), h(c.oppList));
r.post('/opportunities', need('opportunities:write'), validate({ body: s.opportunitySchema }), h(c.oppCreate));
r.get('/opportunities/:id', need('opportunities:read'), validate({ params: idParam }), h(c.oppGet));
r.patch('/opportunities/:id', need('opportunities:write'), validate({ params: idParam, body: s.opportunityUpdateSchema }), h(c.oppUpdate));

r.get('/quotations', need('quotations:read'), validate({ query: s.quotationListQuery }), h(c.quoteList));
r.post('/quotations', need('quotations:write'), validate({ body: s.quotationSchema }), h(c.quoteCreate));
r.get('/quotations/:id', need('quotations:read'), validate({ params: idParam }), h(c.quoteGet));
r.patch('/quotations/:id/status', need('quotations:write'), validate({ params: idParam, body: z.object({ status: z.enum(['draft', 'sent', 'accepted', 'rejected', 'expired']) }) }), h(c.quoteStatus));

r.get('/targets', need('targets:read'), h(c.targetList));
r.post('/targets', need('targets:write'), validate({ body: s.targetSchema }), h(c.targetCreate));

export default r;
