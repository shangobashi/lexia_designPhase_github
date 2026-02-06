
import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { Tooltip } from '@/components/ui/tooltip';
import { useTheme } from '@/contexts/theme-context';
import { useLanguage } from '@/contexts/language-context';
import { ChevronLeft } from 'lucide-react';

interface SidebarProps {
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
  mobileOpen?: boolean;
  setMobileOpen?: (open: boolean) => void;
}

export default function Sidebar({ collapsed, setCollapsed, mobileOpen }: SidebarProps) {
  const { theme } = useTheme();
  const { t } = useLanguage();

  const handleToggleCollapse = () => {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem('sidebar-collapsed', JSON.stringify(next));
  };

  return (
    <aside className={cn(
      "fixed h-full z-40 sidebar transition-all duration-300 ease-in-out",
      collapsed ? "w-16" : "w-64",
      mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
    )}>
      <div className={cn("p-6 flex flex-col h-full", collapsed && "p-3")}>
        {/* Logo */}
        <div className={cn("flex items-center mb-6", collapsed ? "justify-center" : "")}>
          <div className={cn("flex items-center", collapsed ? "" : "space-x-3")}>
            <div className={cn("flex items-center justify-center flex-shrink-0", collapsed ? "w-10 h-10" : "w-12 h-12")}>
              <img
                src={`${import.meta.env.BASE_URL}kingsley-logo.png`}
                alt="Kingsley Logo"
                className="w-full h-full object-contain"
              />
            </div>
            <AnimatePresence>
              {!collapsed && (
                <motion.span
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 'auto' }}
                  exit={{ opacity: 0, width: 0 }}
                  transition={{ duration: 0.2 }}
                  className={`text-xl font-clash font-light whitespace-nowrap overflow-hidden ${theme === 'dark' ? 'text-slate-100' : 'text-slate-800'}`}
                >
                  Kingsley
                </motion.span>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Collapse Toggle Button - hidden on mobile, visible on lg+ */}
        <div className="hidden lg:block mb-2">
          {collapsed ? (
            <Tooltip content={t.sidebar.expand}>
              <button
                onClick={handleToggleCollapse}
                className={cn(
                  "sidebar-item flex items-center justify-center p-3 rounded-xl transition-all duration-300",
                  theme === 'dark'
                    ? "text-slate-400 hover:text-slate-200 hover:bg-slate-700/50"
                    : "text-gray-400 hover:text-gray-700 hover:bg-gray-100/80"
                )}
                aria-label="Expand sidebar"
              >
                <motion.div
                  animate={{ rotate: 180 }}
                  transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                >
                  <ChevronLeft className="w-5 h-5" />
                </motion.div>
              </button>
            </Tooltip>
          ) : (
            <button
              onClick={handleToggleCollapse}
              className={cn(
                "sidebar-item flex items-center px-4 py-3 space-x-3 rounded-xl transition-all duration-300",
                theme === 'dark'
                  ? "text-slate-400 hover:text-slate-200 hover:bg-slate-700/50"
                  : "text-gray-400 hover:text-gray-700 hover:bg-gray-100/80"
              )}
              aria-label="Collapse sidebar"
            >
              <ChevronLeft className="w-5 h-5" />
              <span className="font-clash font-medium">{t.sidebar.collapse}</span>
            </button>
          )}
        </div>

        {/* Navigation Links */}
        <nav className="space-y-2">
          <NavItem
            to="/dashboard"
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z"/>
              </svg>
            }
            label={t.sidebar.dashboard}
            collapsed={collapsed}
          />
          <NavItem
            to="/new-case"
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
              </svg>
            }
            label={t.sidebar.newCase}
            collapsed={collapsed}
          />
          <NavItem
            to="/cases"
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/>
              </svg>
            }
            label={t.sidebar.cases}
            collapsed={collapsed}
          />
          <NavItem
            to="/uploads"
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
              </svg>
            }
            label={t.sidebar.documents}
            collapsed={collapsed}
          />
          <NavItem
            to="/billing"
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/>
              </svg>
            }
            label={t.sidebar.billing}
            collapsed={collapsed}
          />
          <NavItem
            to="/chat"
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 8h10M7 12h6m-9 8l4-4h10a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12z"/>
              </svg>
            }
            label={t.sidebar.aiChat}
            collapsed={collapsed}
          />
          
          {/* Landing Page Link */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-2 mt-4">
            <NavItem
              to="/"
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>
                </svg>
              }
              label={t.sidebar.homePage}
              collapsed={collapsed}
            />
          </div>
        </nav>

        {/* Spacer */}
        <div className="flex-1" />

        {/* User Profile */}
        <div className={cn(collapsed ? "px-0" : "")}>
          <div className={cn(
            "rounded-xl transition-all duration-300",
            collapsed ? "p-2" : "p-4",
            theme === 'dark'
              ? 'bg-slate-700/50 border border-slate-600/30'
              : 'bg-gray-50 border border-gray-200'
          )}>
            <div className={cn("flex items-center", collapsed ? "justify-center" : "space-x-3")}>
              <div className={cn(
                "rounded-full flex-shrink-0",
                collapsed ? "w-7 h-7" : "w-8 h-8",
                theme === 'dark' ? 'bg-slate-500' : 'bg-gray-300'
              )} />
              <AnimatePresence>
                {!collapsed && (
                  <motion.div
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: 'auto' }}
                    exit={{ opacity: 0, width: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden whitespace-nowrap"
                  >
                    <div className={`text-sm font-clash font-medium ${
                      theme === 'dark' ? 'text-slate-100' : 'text-gray-900'
                    }`}>{t.common.guest}</div>
                    <div className={`text-xs ${
                      theme === 'dark' ? 'text-slate-300' : 'text-gray-500'
                    }`}>{t.common.free}</div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}

interface NavItemProps {
  to: string;
  icon: React.ReactNode;
  label: string;
  collapsed: boolean;
}

function NavItem({ to, icon, label, collapsed }: NavItemProps) {
  const { theme } = useTheme();
  
  const baseClasses = "sidebar-item flex items-center px-4 py-3 transition-all duration-300 cubic-bezier(0.4, 0, 0.2, 1) rounded-xl relative";
  const textClasses = theme === 'dark' 
    ? "text-slate-300 hover:text-slate-200" 
    : "text-gray-600 hover:text-gray-800";
  
  if (collapsed) {
    return (
      <Tooltip content={label}>
        <NavLink
          to={to}
          className={({ isActive }) =>
            cn(
              "sidebar-item flex items-center justify-center p-3 rounded-xl transition-all duration-300 cubic-bezier(0.4, 0, 0.2, 1) relative",
              textClasses,
              isActive && "active"
            )
          }
        >
          {icon}
        </NavLink>
      </Tooltip>
    );
  }

  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          baseClasses,
          "space-x-3",
          textClasses,
          isActive && "active"
        )
      }
    >
      {icon}
      <span className="font-clash font-medium">{label}</span>
    </NavLink>
  );
}
