import { useState, useEffect } from 'react';
import { Outlet, useLocation, useOutlet, Navigate } from 'react-router-dom';
import Sidebar from '@/components/navigation/sidebar';
import Header from '@/components/navigation/header';
import { SetupBanner } from '@/components/setup-banner';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/auth-context';
import { useTheme } from '@/contexts/theme-context';

export default function DashboardLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const outlet = useOutlet();
  const { user, loading } = useAuth();
  const { theme } = useTheme();

  // Check if we're on the case detail page
  const isCaseDetailPage = location.pathname.startsWith('/cases/') && location.pathname !== '/cases';

  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  // Close mobile sidebar on resize to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setMobileOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Show loading while checking auth
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center sophisticated-bg">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary logo-animation"></div>
      </div>
    );
  }

  // Redirect to login if no user (not authenticated and not guest)
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return (
    <div className="flex h-screen min-h-screen sophisticated-bg overflow-hidden">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <Sidebar
        collapsed={sidebarCollapsed}
        setCollapsed={setSidebarCollapsed}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
      />

      <main className={`flex-1 flex flex-col overflow-hidden min-w-0 transition-all duration-300 ${sidebarCollapsed ? 'lg:ml-16' : 'lg:ml-64'}`}>
        <SetupBanner />
        <Header
          toggleSidebar={() => {
            // On mobile, toggle mobile overlay; on desktop, toggle collapse
            if (window.innerWidth < 1024) {
              setMobileOpen(!mobileOpen);
            } else {
              setSidebarCollapsed(!sidebarCollapsed);
            }
          }}
          isCollapsed={sidebarCollapsed}
          hideAIButton={isCaseDetailPage}
        />

        <div className="flex-1 overflow-auto">
          <AnimatePresence initial={false}>
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
              className="h-full"
            >
              {outlet}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}