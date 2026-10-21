import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../api/AuthContext.jsx';
import { Spinner } from './ui/Feedback.jsx';
import { EmptyState } from './ui/Feedback.jsx';

export function RequireAuth({ children }) {
  const { session, loading } = useAuth();
  const location = useLocation();
  if (loading) return <Spinner label="Loading workspace" />;
  if (!session) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return children;
}

// UX guard only. The API rejects the same requests regardless.
export function RequirePermission({ perm, perms, children }) {
  const { can } = useAuth();
  const allowed = perms ? perms.some(can) : can(perm);
  if (!allowed) return <EmptyState icon="shield" title="You don't have access to this page">Ask your company's CEO/COO if you need access.</EmptyState>;
  return children;
}
