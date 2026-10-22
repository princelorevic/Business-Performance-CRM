import { Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from './layouts/AppLayout.jsx';
import { RequireAuth, RequirePermission as Guard } from './components/RouteGuards.jsx';
import { LoginPage, RegisterPage } from './pages/AuthPages.jsx';
import { DashboardPage } from './pages/DashboardPage.jsx';
import { CustomersPage } from './pages/CustomersPage.jsx';
import { LeadsPage } from './pages/LeadsPage.jsx';
import { PipelinePage } from './pages/PipelinePage.jsx';
import { QuotationsPage } from './pages/QuotationsPage.jsx';
import { InvoicesPage } from './pages/InvoicesPage.jsx';
import { PaymentsPage } from './pages/PaymentsPage.jsx';
import { ExpensesPage } from './pages/ExpensesPage.jsx';
import { InvestmentsPage } from './pages/InvestmentsPage.jsx';
import { ReportsPage } from './pages/ReportsPage.jsx';
import { AuditPage } from './pages/AuditPage.jsx';
import { TeamPage } from './pages/TeamPage.jsx';
import { SubscriptionPage } from './pages/SubscriptionPage.jsx';
import { LandingPage } from './pages/LandingPage.jsx';
import { useAuth } from './api/AuthContext.jsx';
import { Spinner } from './components/ui/Feedback.jsx';

// Public home: visitors see the landing page, signed-in users go straight to their dashboard.
function Home() {
  const { session, loading } = useAuth();
  if (loading) return <Spinner label="Loading" />;
  return session ? <Navigate to="/dashboard" replace /> : <LandingPage />;
}

export function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route element={<RequireAuth><AppLayout /></RequireAuth>}>
        <Route path="dashboard" element={<Guard perm="dashboard:read"><DashboardPage /></Guard>} />
        <Route path="customers" element={<Guard perm="customers:read"><CustomersPage /></Guard>} />
        <Route path="leads" element={<Guard perm="leads:read"><LeadsPage /></Guard>} />
        <Route path="pipeline" element={<Guard perm="opportunities:read"><PipelinePage /></Guard>} />
        <Route path="quotations" element={<Guard perm="quotations:read"><QuotationsPage /></Guard>} />
        <Route path="invoices" element={<Guard perm="invoices:read"><InvoicesPage /></Guard>} />
        <Route path="payments" element={<Guard perm="payments:read"><PaymentsPage /></Guard>} />
        <Route path="expenses" element={<Guard perm="expenses:read"><ExpensesPage /></Guard>} />
        <Route path="investments" element={<Guard perm="investments:read"><InvestmentsPage /></Guard>} />
        <Route path="reports" element={<Guard perm="dashboard:read"><ReportsPage /></Guard>} />
        <Route path="audit" element={<Guard perms={['audit:read', 'audit:financial']}><AuditPage /></Guard>} />
        <Route path="team" element={<Guard perm="users:read"><TeamPage /></Guard>} />
        <Route path="subscription" element={<Guard perm="subscription:read"><SubscriptionPage /></Guard>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
