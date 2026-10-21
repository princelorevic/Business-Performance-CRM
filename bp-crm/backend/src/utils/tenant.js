import { notFound, badRequest } from './errors.js';

const TABLES = new Set(['customers', 'leads', 'opportunities', 'quotations', 'invoices', 'expenses', 'expense_categories', 'investments', 'users', 'payments']);

// Confirms a referenced row belongs to the caller's company. Missing and
// cross-tenant rows are reported identically.
export async function assertOwned(db, table, id, companyId, { asBadRequest = false } = {}) {
  if (!TABLES.has(table)) throw new Error(`Unknown tenant table: ${table}`);
  const [rows] = await db.execute(`SELECT id FROM ${table} WHERE id = ? AND company_id = ?`, [id, companyId]);
  if (!rows.length) throw asBadRequest ? badRequest(`Invalid reference: ${table}`) : notFound();
  return rows[0];
}

export async function nextNumber(conn, companyId, kind, prefix) {
  await conn.execute(
    `INSERT INTO document_counters (company_id, kind, last_number) VALUES (?, ?, LAST_INSERT_ID(1))
     ON DUPLICATE KEY UPDATE last_number = LAST_INSERT_ID(last_number + 1)`,
    [companyId, kind],
  );
  const [rows] = await conn.query('SELECT LAST_INSERT_ID() AS n');
  return `${prefix}-${String(rows[0].n).padStart(6, '0')}`;
}
