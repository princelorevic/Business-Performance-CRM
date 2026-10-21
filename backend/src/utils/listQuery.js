// Builds tenant-scoped, paginated list queries. `company_id = ?` is ALWAYS the first
// predicate and its value comes from the authenticated session, never from the client.
export async function paginate(db, { table, columns, companyId, extraWhere = '', extraParams = [], search, searchColumns = [], sort, order, sortable, defaultSort, page, pageSize, joins = '' }) {
  const where = [`${table}.company_id = ?`];
  const params = [companyId];
  if (extraWhere) { where.push(extraWhere); params.push(...extraParams); }
  if (search && searchColumns.length) {
    where.push('(' + searchColumns.map((c) => `${c} LIKE ?`).join(' OR ') + ')');
    const like = `%${search.replace(/[%_\\]/g, '\\$&')}%`;
    params.push(...searchColumns.map(() => like));
  }
  const sortCol = sortable[sort] || sortable[defaultSort];
  const dir = order === 'asc' ? 'ASC' : 'DESC';
  const whereSql = where.join(' AND ');
  const [[{ total }]] = await db.query(`SELECT COUNT(*) AS total FROM ${table} ${joins} WHERE ${whereSql}`, params);
  const [rows] = await db.query(
    `SELECT ${columns} FROM ${table} ${joins} WHERE ${whereSql} ORDER BY ${sortCol} ${dir}, ${table}.id DESC LIMIT ? OFFSET ?`,
    [...params, pageSize, (page - 1) * pageSize],
  );
  return { data: rows, page, pageSize, total: Number(total), totalPages: Math.max(1, Math.ceil(Number(total) / pageSize)) };
}
