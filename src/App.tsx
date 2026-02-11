import { Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import DashboardLayout from './components/layouts/dashboard-layout';
import AuthLayout from './components/layouts/auth-layout';
import PublicLayout from './components/layouts/public-layout';
import { ErrorBoundary } from './components/error-boundary';
import { useAuth } from './contexts/auth-context';

// Lazy load pages for better performance
const LandingPage = lazy(() => import('./pages/landing'));
const LoginPage = lazy(() => import('./pages/login'));
const RegisterPage = lazy(() => import('./pages/register'));
const ForgotPasswordPage = lazy(() => import('./pages/forgot-password'));
const ResetPasswordPage = lazy(() => import('./pages/reset-password'));
const DashboardPage = lazy(() => import('./pages/dashboard'));
const NewCasePage = lazy(() => import('./pages/new-case'));
const CasesPage = lazy(() => import('./pages/cases'));
const CaseDetailPage = lazy(() => import('./pages/case-detail'));
const BillingPage = lazy(() => import('./pages/billing'));
const PricingPage = lazy(() => import('./pages/pricing'));
const DemoPage = lazy(() => import('./pages/demo'));
const UploadsPage = lazy(() => import('./pages/uploads'));
const AccountPage = lazy(() => import('./pages/account'));
const ChatPage = lazy(() => import('./pages/chat'));

// Loading spinner component
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
  </div>
);

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
    <ErrorBoundary>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<LandingPage />} />
          
          {/* Public Pricing Page for unauthenticated users */}
          <Route path="/pricing" element={<PricingPage />} />
          
          {/* Public Demo Page */}
          <Route path="/demo" element={<DemoPage />} />
          
          {/* Auth Routes */}
          <Route element={<AuthLayout />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
          </Route>
          
          {/* Protected Routes - Require auth or guest mode */}
          <Route element={<DashboardLayout />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/new-case" element={<NewCasePage />} />
            <Route path="/cases" element={<CasesPage />} />
            <Route path="/cases/:id" element={<CaseDetailPage />} />
            <Route path="/uploads" element={<UploadsPage />} />
            <Route path="/account" element={<AccountPage />} />
            <Route path="/billing" element={<BillingPage />} />
            <Route path="/chat" element={<ChatPage />} />
          </Route>
          
          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  );
}

export default App;
