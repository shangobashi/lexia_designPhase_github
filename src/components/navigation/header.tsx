import { ThemeToggle } from '@/components/ui/theme-toggle';
import { useAuth } from '@/contexts/auth-context';
import { useTheme } from '@/contexts/theme-context';
import { getUserInitials } from '@/lib/utils';
import { Bell, Search, MessageCircle, Menu } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface HeaderProps {
  toggleSidebar: () => void;
  isCollapsed: boolean;
  hideAIButton?: boolean;
}

export default function Header({ toggleSidebar, isCollapsed, hideAIButton = false }: HeaderProps) {
  const { user, continueAsGuest } = useAuth();
  const { theme } = useTheme();
  const navigate = useNavigate();
  
  const displayName = user?.displayName || user?.email || 'Invité';
  const initials = getUserInitials(displayName);

  const goToChat = async () => {
    if (!user) {
      await continueAsGuest();
    }
    navigate('/chat');
  };
  
  return (
    <header className={`${theme === 'dark' ? 'dark-header' : 'light-header'} px-6 py-4`}>
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-3 md:space-x-5">
          {/* Mobile menu toggle (desktop collapse handled by sidebar's own toggle) */}
          <button
            onClick={toggleSidebar}
            className={`lg:hidden p-2 rounded-lg ${theme === 'dark' ? 'text-slate-200 hover:bg-slate-700' : 'text-slate-600 hover:bg-slate-100'}`}
          >
            <Menu className="h-5 w-5" />
          </button>
          {/* Brand */}
          <div className="flex items-center space-x-2">
            <div className="w-10 h-10 flex items-center justify-center">
              <img
                src={`${import.meta.env.BASE_URL}kingsley-logo.png`}
                alt="Kingsley Logo"
                className="w-full h-full object-contain"
              />
            </div>
            <span className={`text-xl font-clash font-light ${theme === 'dark' ? 'text-slate-100' : 'text-slate-800'}`}>
              Kingsley
            </span>
          </div>

          {/* Search */}
          <div className={`${theme === 'dark' ? 'dark-executive-card' : 'executive-card'} hidden md:flex items-center rounded-xl px-4 py-2 w-64 lg:w-96`}>
            <Search className={`${theme === 'dark' ? 'text-slate-400' : 'text-gray-400'} h-4 w-4 mr-3`} />
            <input 
              type="text" 
              placeholder="Rechercher des dossiers, documents ou poser une question..."
              className={`flex-1 bg-transparent border-none focus:outline-none focus:ring-0 text-sm ${theme === 'dark' ? 'text-slate-100 placeholder-slate-400' : 'text-slate-800 placeholder-gray-400'}`}
            />
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <ThemeToggle />
          {!hideAIButton && (
            <button
              onClick={goToChat}
              className={`${theme === 'dark' ? 'dark-primary-button' : 'primary-button'} text-white px-4 py-2 rounded-xl font-clash font-medium flex items-center space-x-2 transition-all duration-300`}
            >
              <MessageCircle className="h-4 w-4" />
              <span className="hidden lg:inline">Consulter l'IA</span>
            </button>
          )}
          <button className={`${theme === 'dark' ? 'text-slate-200' : 'text-slate-600'} hover:text-slate-800 relative p-2`}>
            <Bell className="h-5 w-5" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-blue-500 rounded-full"></span>
          </button>
          <div className="flex items-center space-x-3">
            <div className="hidden md:block text-right">
              <p className={`text-sm font-clash font-medium ${theme === 'dark' ? 'text-slate-100' : 'text-slate-800'}`}>{displayName}</p>
              <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>Gratuit</p>
            </div>
            <div className={`${theme === 'dark' ? 'bg-slate-700 text-slate-100' : 'bg-slate-200 text-slate-700'} h-9 w-9 rounded-full flex items-center justify-center font-clash font-medium`}>
              {initials}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
