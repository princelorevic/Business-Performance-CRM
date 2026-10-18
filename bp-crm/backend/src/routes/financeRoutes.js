import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler as h } from '../utils/asyncHandler.js';
import { validate } from '../middleware/validate.js';
import { requirePermission as need } from '../middleware/auth.js';
import { idParam, isoDate } from '../validation/common.js';
import * as s from '../validation/financeSchemas.js';
import * as c from '../controllers/financeController.js';

const r = Router();

r.get('/invoices', need('invoices:read'), validate({ query: s.invoiceListQuery }), h(c.invoiceList));
r.post('/invoices', need('invoices:create'), validate({ body: s.invoiceSchema }), h(c.invoiceCreate));
r.get('/invoices/:id', need('invoices:read'), validate({ params: idParam }), h(c.invoiceGet));
r.patch('/invoices/:id', need('invoices:manage'), validate({ params: idParam, body: s.invoiceUpdateSchema }), h(c.invoiceUpdate));
r.post('/invoices/:id/issue', need('invoices:manage'), validate({ params: idParam }), h(c.invoiceIssue));
r.post('/invoices/:id/void', need('invoices:manage'), validate({ params: idParam, body: s.voidSchema }), h(c.invoiceVoid));

r.get('/payments', need('payments:read'), validate({ query: s.paymentListQuery }), h(c.paymentList));
r.post('/payments', need('payments:write'), validate({ body: s.paymentSchema }), h(c.paymentCreate));
r.post('/payments/:id/refund', need('payments:write'), validate({ params: idParam, body: s.refundSchema }), h(c.paymentRefund));
r.post('/payments/:id/void', need('payments:write'), validate({ params: idParam, body: s.voidSchema }), h(c.paymentVoid));

r.get('/expense-categories', need('expenses:read'), h(c.categoryList));
r.post('/expense-categories', need('expenses:write'), validate({ body: s.categorySchema }), h(c.categoryCreate));
r.get('/expenses', need('expenses:read'), validate({ query: s.expenseListQuery }), h(c.expenseList));
r.post('/expenses', need('expenses:write'), validate({ body: s.expenseSchema }), h(c.expenseCreate));
r.get('/expenses/:id', need('expenses:read'), validate({ params: idParam }), h(c.expenseGet));
r.post('/expenses/:id/approve', need('expenses:write'), validate({ params: idParam }), h(c.expenseApprove));
r.post('/expenses/:id/void', need('expenses:write'), validate({ params: idParam }), h(c.expenseVoid));
r.post('/expenses/:id/pay', need('payments:write'), validate({ params: idParam, body: s.expensePaySchema }), h(c.expensePay));

r.get('/investments', need('investments:read'), validate({ query: z.object({ asOf: isoDate.default(() => new Date().toISOString().slice(0, 10)) }) }), h(c.investmentList));
r.post('/investments', need('investments:write'), validate({ body: s.investmentSchema }), h(c.investmentCreate));
r.post('/investments/:id/returns', need('investments:write'), validate({ params: idParam, body: s.investmentReturnSchema }), h(c.investmentReturn));

export default r;
