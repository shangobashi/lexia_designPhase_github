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
  const location = useLocation();
  const outlet = useOutlet();
  const { user, loading } = useAuth();
  const { theme } = useTheme();
  
  // Show loading while checking auth
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center sophisticated-bg dark:dark-sophisticated-bg">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary logo-animation"></div>
      </div>
    );
  }
  
  // Redirect to login if no user (not authenticated and not guest)
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  
  return (
    <div className="flex h-screen min-h-screen sophisticated-bg dark:dark-sophisticated-bg">
      <Sidebar collapsed={sidebarCollapsed} setCollapsed={setSidebarCollapsed} />
      
      <main className={`flex-1 flex flex-col overflow-hidden ${sidebarCollapsed ? 'ml-16' : 'ml-64'} transition-all duration-300`}>
        <SetupBanner />
        <Header 
          toggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
          isCollapsed={sidebarCollapsed} 
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