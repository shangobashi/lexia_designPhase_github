import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { getUserInitials } from '@/lib/utils';
import { useTheme } from '@/contexts/theme-context';
import { Menu, Bell, Search, MessageCircle } from 'lucide-react';

interface HeaderProps {
  toggleSidebar: () => void;
  isCollapsed: boolean;
}

export default function Header({ toggleSidebar, isCollapsed }: HeaderProps) {
  const { user } = useAuth();
  const { theme } = useTheme();
  
  const displayName = user?.displayName || user?.email || 'Jean Dupont';
  const initials = getUserInitials(displayName);
  
  return (
    <header className="bg-white/80 dark:dark-header backdrop-blur-md border-b border-gray-200/50 dark:border-slate-600/30 px-6 py-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-4">
          {/* Search */}
          <div className="flex items-center bg-gray-50/80 dark:bg-slate-700/50 rounded-xl px-4 py-2 w-96 backdrop-blur-sm">
            <Search className="h-4 w-4 text-gray-400 dark:text-slate-400 mr-3" />
            <input 
              type="text" 
              placeholder="Rechercher des dossiers, documents ou poser une question..."
              className="flex-1 bg-transparent border-none focus:outline-none focus:ring-0 text-sm text-gray-700 dark:text-slate-200 placeholder-gray-400 dark:placeholder-slate-400"
            />
          </div>
        </div>

        <div className="flex items-center space-x-4">
          {/* Theme Toggle */}
          <ThemeToggle />
          
          {/* AI Chat Button */}
          <button className="primary-button dark:dark-primary-button text-white px-4 py-2 rounded-xl font-medium flex items-center space-x-2 transition-all duration-300">
            <MessageCircle className="h-4 w-4" />
            <span>Consulter l'IA</span>
          </button>
          
          {/* Notifications */}
          <button className="text-gray-600 dark:text-slate-400 hover:text-gray-800 dark:hover:text-slate-200 relative p-2">
            <Bell className="h-5 w-5" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-blue-500 rounded-full"></span>
          </button>
          
          {/* User Menu */}
          <div className="flex items-center space-x-3">
            <div className="hidden md:block text-right">
              <p className="text-sm font-medium text-gray-900 dark:text-slate-100">{displayName}</p>
              <p className="text-xs text-gray-500 dark:text-slate-300">Premium</p>
            </div>
            
            <div className="h-9 w-9 rounded-full bg-gray-300 dark:bg-slate-500 flex items-center justify-center text-gray-700 dark:text-slate-200 font-medium">
              {initials}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}