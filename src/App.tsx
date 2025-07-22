import { Routes, Route, Navigate } from 'react-router-dom';
import DashboardLayout from './components/layouts/dashboard-layout';
import AuthLayout from './components/layouts/auth-layout';
import PublicLayout from './components/layouts/public-layout';
import LandingPage from './pages/landing';
import LoginPage from './pages/login';
import RegisterPage from './pages/register';
import DashboardPage from './pages/dashboard';
import NewCasePage from './pages/new-case';
import CasesPage from './pages/cases';
import CaseDetailPage from './pages/case-detail';
import BillingPage from './pages/billing';
import UploadsPage from './pages/uploads';
import AccountPage from './pages/account';
import { useAuth } from './contexts/auth-context';

function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<LandingPage />} />
      
      {/* Public Billing Page */}
      <Route element={<PublicLayout />}>
        <Route path="/billing" element={<BillingPage />} />
      </Route>
      
      {/* Auth Routes */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Route>
      
      {/* Protected Routes - Require auth or guest mode */}
      <Route element={<DashboardLayout />}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/new-case" element={<NewCasePage />} />
        <Route path="/cases" element={<CasesPage />} />
        <Route path="/cases/:id" element={<CaseDetailPage />} />
        <Route path="/uploads" element={<UploadsPage />} />
        <Route path="/account" element={<AccountPage />} />
      </Route>
      
      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

export default App;