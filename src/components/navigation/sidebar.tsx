
import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { Home, Plus, Folder, CreditCard, Upload, User, FileText } from 'lucide-react';
import { Tooltip } from '@/components/ui/tooltip';
import { useTheme } from '@/contexts/theme-context';

interface SidebarProps {
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
}

export default function Sidebar({ collapsed, setCollapsed }: SidebarProps) {
  const { theme } = useTheme();
  
  return (
    <aside className={cn(
      "w-64 fixed h-full z-40 sidebar dark:dark-sidebar",
      collapsed && "w-16"
    )}>
      <div className="p-6">
        {/* Logo */}
        <div className="flex items-center space-x-3 mb-8">
          <div className="w-8 h-8 bg-gray-700 dark:bg-slate-200 rounded-lg flex items-center justify-center logo-animation">
            <img 
              src={`${import.meta.env.BASE_URL}owl-logo.png`} 
              alt="LexiA Logo" 
              className="h-6 w-6 object-contain" 
            />
          </div>
          {!collapsed && (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="text-xl font-light text-slate-800 dark:text-slate-100"
            >
              LexiA
            </motion.span>
          )}
        </div>
        
        {/* Navigation Links */}
        <nav className="space-y-2">
          <NavItem
            to="/dashboard"
            icon={<Home size={20} />}
            label="Tableau de bord"
            collapsed={collapsed}
          />
          <NavItem
            to="/new-case"
            icon={<Plus size={20} />}
            label="Nouveau dossier"
            collapsed={collapsed}
          />
          <NavItem
            to="/cases"
            icon={<Folder size={20} />}
            label="Dossiers"
            collapsed={collapsed}
          />
          <NavItem
            to="/uploads"
            icon={<FileText size={20} />}
            label="Documents"
            collapsed={collapsed}
          />
          <NavItem
            to="/billing"
            icon={<CreditCard size={20} />}
            label="Facturation"
            collapsed={collapsed}
          />
        </nav>
      </div>
      
      {/* User Profile */}
      <div className="absolute bottom-6 left-6 right-6">
        <div className="bg-gray-50 dark:bg-slate-700/50 rounded-xl p-4 border border-gray-200 dark:border-slate-600/30">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gray-300 dark:bg-slate-500 rounded-full"></div>
            {!collapsed && (
              <div>
                <div className="text-sm font-medium text-gray-900 dark:text-slate-100">Jean Dupont</div>
                <div className="text-xs text-gray-500 dark:text-slate-300">Premium</div>
              </div>
            )}
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
  const itemClasses = "sidebar-item dark:dark-sidebar-item flex items-center space-x-3 px-4 py-3 text-gray-600 hover:text-gray-700 dark:text-slate-300 dark:hover:text-slate-100 transition-all duration-300 cubic-bezier(0.4, 0, 0.2, 1) rounded-xl";
  const activeClasses = "sidebar-item active dark:dark-sidebar-item text-gray-700 dark:text-slate-100 bg-gray-100/50 dark:bg-slate-600/20";
  
  if (collapsed) {
    return (
      <Tooltip content={label}>
        <NavLink
          to={to}
          className={({ isActive }) =>
            cn(
              "flex items-center justify-center p-3 rounded-xl transition-all duration-300",
              isActive
                ? activeClasses
                : itemClasses
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
          itemClasses,
          isActive && activeClasses
        )
      }
    >
      {icon}
      <span className="font-medium">{label}</span>
    </NavLink>
  );
}