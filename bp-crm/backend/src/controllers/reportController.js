import { getDashboard, getReport } from '../services/reportService.js';
import { getSubscription } from '../services/subscriptionService.js';
import { can } from '../config/permissions.js';
import { forbidden } from '../utils/errors.js';
import { toCsv } from '../utils/csv.js';
import { audit } from '../services/auditService.js';

export const dashboard = async (req, res) => {
  const { from, to } = req.validQuery;
  res.json(await getDashboard(req.auth, from, to, (p) => can(req.auth.role, p)));
};

const PERMISSION_FOR = { sales: 'reports:sales', expenses: 'reports:financial', cashflow: 'reports:financial', profitability: 'reports:financial' };

function assertReportAccess(req) {
  const needed = PERMISSION_FOR[req.params.type];
  if (!needed || !can(req.auth.role, needed)) throw forbidden();
}

export const report = async (req, res) => {
  assertReportAccess(req);
  const { from, to } = req.validQuery;
  res.json(await getReport(req.auth.companyId, req.params.type, from, to));
};

export const exportCsv = async (req, res) => {
  assertReportAccess(req);
  const sub = await getSubscription(req.auth.companyId);
  if (!sub.features?.exports) throw forbidden('Exports are not included in your plan');
  const { from, to } = req.validQuery;
  const data = await getReport(req.auth.companyId, req.params.type, from, to);
  if (!data.rows) throw forbidden('This report has no tabular export');
  await audit(null, { companyId: req.auth.companyId, userId: req.auth.userId, action: 'report.exported', entityType: 'report', details: { type: req.params.type, from, to, rows: data.rows.length }, ip: req.ip });
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${req.params.type}-${from}_${to}.csv"`);
  res.send(toCsv(data.columns, data.rows, data.total));
};
