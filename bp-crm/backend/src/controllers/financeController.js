import * as invoices from '../services/invoiceService.js';
import * as payments from '../services/paymentService.js';
import * as expenses from '../services/expenseService.js';
import * as investments from '../services/investmentService.js';
import { can } from '../config/permissions.js';
import { forbidden } from '../utils/errors.js';

const cid = (req) => req.auth.companyId;

export const invoiceList = async (req, res) => res.json(await invoices.listInvoices(cid(req), req.validQuery));
export const invoiceGet = async (req, res) => res.json(await invoices.getInvoice(cid(req), req.params.id));
export const invoiceCreate = async (req, res) => res.status(201).json(await invoices.createInvoice(req.auth, req.body, req.ip));
export const invoiceUpdate = async (req, res) => res.json(await invoices.updateDraftInvoice(req.auth, req.params.id, req.body, req.ip));
export const invoiceIssue = async (req, res) => res.json(await invoices.issueInvoice(req.auth, req.params.id, req.ip));
export const invoiceVoid = async (req, res) => res.json(await invoices.voidInvoice(req.auth, req.params.id, req.body.reason, req.ip));

export const paymentList = async (req, res) => res.json(await payments.listPayments(cid(req), req.validQuery));
export const paymentCreate = async (req, res) => {
  const r = await payments.recordPayment(req.auth, req.body, req.ip);
  res.status(r.replayed ? 200 : 201).json(r);
};
export const paymentRefund = async (req, res) => {
  const r = await payments.refundPayment(req.auth, req.params.id, req.body, req.ip);
  res.status(r.replayed ? 200 : 201).json(r);
};
export const paymentVoid = async (req, res) => res.json(await payments.voidPayment(req.auth, req.params.id, req.body.reason, req.ip));

export const categoryList = async (req, res) => res.json({ data: await expenses.listCategories(cid(req)) });
export const categoryCreate = async (req, res) => res.status(201).json(await expenses.createCategory(req.auth, req.body.name, req.ip));
export const expenseList = async (req, res) => res.json(await expenses.listExpenses(cid(req), req.validQuery));
export const expenseGet = async (req, res) => res.json(await expenses.getExpense(cid(req), req.params.id));
export const expenseCreate = async (req, res) => res.status(201).json(await expenses.createExpense(req.auth, req.body, req.ip));
export const expenseApprove = async (req, res) => res.json(await expenses.changeExpenseStatus(req.auth, req.params.id, 'approve', req.ip));
export const expenseVoid = async (req, res) => res.json(await expenses.changeExpenseStatus(req.auth, req.params.id, 'void', req.ip));
export const expensePay = async (req, res) => {
  const r = await expenses.payExpense(req.auth, req.params.id, req.body, req.ip);
  res.status(r.replayed ? 200 : 201).json(r);
};

export const investmentList = async (req, res) => res.json(await investments.listInvestments(cid(req), req.validQuery.asOf));
export const investmentCreate = async (req, res) => res.status(201).json(await investments.createInvestment(req.auth, req.body, req.ip));
export const investmentReturn = async (req, res) => res.status(201).json(await investments.addReturn(req.auth, req.params.id, req.body, req.ip));

// Only finance/CEO may see the full invoice ledger; sales may create drafts and read invoices (read-only).
export function assertCanManage(req) {
  if (!can(req.auth.role, 'invoices:manage')) throw forbidden();
}
