import { pool } from '../db/pool.js';

const REDACT = /pass(word)?|token|secret|authorization|cookie/i;

function scrub(value) {
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.entries(value).map(([k, v]) => [k, REDACT.test(k) ? '[redacted]' : scrub(v)]),
  );
}

// `executor` may be a transaction connection so the audit row commits with the change.
export async function audit(executor, { companyId, userId = null, action, entityType, entityId = null, details = null, ip = null }) {
  const db = executor || pool;
  await db.execute(
    `INSERT INTO audit_logs (company_id, user_id, action, entity_type, entity_id, details, ip_address)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [companyId, userId, action, entityType, entityId, details ? JSON.stringify(scrub(details)) : null, ip],
  );
}

export const FINANCIAL_ENTITIES = ['invoice', 'payment', 'expense', 'investment', 'investment_return'];
