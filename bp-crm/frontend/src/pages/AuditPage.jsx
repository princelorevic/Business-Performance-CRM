import { useState } from 'react';
import { api } from '../api/client.js';
import { useAsync } from '../hooks/useAsync.js';
import { PageHeader } from '../components/ui/PageHeader.jsx';
import { DataTable } from '../components/ui/DataTable.jsx';
import { EmptyState } from '../components/ui/Feedback.jsx';
import { formatDate } from '../lib/format.js';

export function AuditPage() {
  const [page, setPage] = useState(1);
  const { data, error, loading, reload } = useAsync(() => api.get('/audit-logs', { page, pageSize: 25 }), [page]);
  const columns = [
    { key: 'createdAt', header: 'When', render: (r) => `${formatDate(r.createdAt)} ${String(r.createdAt).slice(11, 16)}` },
    { key: 'userName', header: 'User', render: (r) => r.userName ?? 'System' },
    { key: 'action', header: 'Action', render: (r) => <code className="text-xs">{r.action}</code> },
    { key: 'entity', header: 'Record', render: (r) => `${r.entityType}${r.entityId ? ` #${r.entityId}` : ''}` },
    { key: 'details', header: 'Details', render: (r) => <span className="text-xs text-muted">{r.details ? JSON.stringify(r.details) : ''}</span> },
  ];
  return (
    <>
      <PageHeader title="Audit trail" subtitle="Who changed what, and when. Passwords and tokens are never recorded." />
      <DataTable caption="Audit log" columns={columns} rows={data?.data} loading={loading} error={error} onRetry={reload} page={page} totalPages={data?.totalPages} total={data?.total} onPage={setPage} empty={<EmptyState icon="shield" title="No activity recorded yet" />} />
    </>
  );
}
