import { Icon } from './Icon.jsx';
import { EmptyState, ErrorState, Spinner } from './Feedback.jsx';

// columns: [{ key, header, render?, sortKey?, align?: 'right' }]
export function DataTable({ columns, rows, loading, error, onRetry, empty, sort, order, onSort, page, totalPages, total, onPage, rowKey = (r) => r.id, caption }) {
  if (error) return <ErrorState error={error} onRetry={onRetry} />;
  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <caption className="sr-only">{caption}</caption>
          <thead className="bg-surface-2 text-left text-xs uppercase tracking-wide text-muted">
            <tr>
              {columns.map((c) => {
                const active = c.sortKey && sort === c.sortKey;
                return (
                  <th key={c.key} scope="col" aria-sort={active ? (order === 'asc' ? 'ascending' : 'descending') : undefined} className={`px-4 py-3 font-medium ${c.align === 'right' ? 'text-right' : ''}`}>
                    {c.sortKey && onSort ? (
                      <button type="button" className="inline-flex items-center gap-1 hover:text-text" onClick={() => onSort(c.sortKey)}>
                        {c.header}{active && <Icon name={order === 'asc' ? 'arrowUp' : 'arrowDown'} className="h-3 w-3" />}
                      </button>
                    ) : c.header}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows?.map((r) => (
              <tr key={rowKey(r)} className="hover:bg-surface-2/60">
                {columns.map((c) => (
                  <td key={c.key} className={`px-4 py-3 align-middle ${c.align === 'right' ? 'text-right tabular-nums' : ''}`}>{c.render ? c.render(r) : r[c.key] ?? '—'}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {loading && <Spinner />}
      {!loading && rows?.length === 0 && (empty ?? <EmptyState title="Nothing here yet" />)}
      {totalPages > 1 && (
        <nav aria-label="Pagination" className="flex items-center justify-between border-t border-border px-4 py-3 text-sm text-muted">
          <span>Page {page} of {totalPages} · {total} total</span>
          <div className="flex gap-2">
            <button type="button" className="btn-secondary" disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label="Previous page"><Icon name="chevronLeft" className="h-4 w-4" /></button>
            <button type="button" className="btn-secondary" disabled={page >= totalPages} onClick={() => onPage(page + 1)} aria-label="Next page"><Icon name="chevronRight" className="h-4 w-4" /></button>
          </div>
        </nav>
      )}
    </div>
  );
}
