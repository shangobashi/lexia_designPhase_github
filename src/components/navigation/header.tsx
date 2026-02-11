import { ThemeToggle } from '@/components/ui/theme-toggle';
import { LanguageToggle } from '@/components/ui/language-toggle';
import { useAuth } from '@/contexts/auth-context';
import { useTheme } from '@/contexts/theme-context';
import { useLanguage } from '@/contexts/language-context';
import { useToast } from '@/hooks/use-toast';
import { getUserInitials } from '@/lib/utils';
import { Bell, Search, MessageCircle, Menu, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface HeaderProps {
  toggleSidebar: () => void;
  isCollapsed: boolean;
  hideAIButton?: boolean;
}

export default function Header({ toggleSidebar, isCollapsed, hideAIButton = false }: HeaderProps) {
  const { user, continueAsGuest, logout } = useAuth();
  const { theme } = useTheme();
  const { t } = useLanguage();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const displayName = user?.isGuest ? t.common.guest : (user?.displayName || user?.email || t.common.guest);
  const initials = getUserInitials(displayName);

  const goToChat = async () => {
    if (!user) {
      await continueAsGuest();
    }
    navigate('/chat');
  };

  const handleLogout = async () => {
    try {
      await logout();
      toast({
        title: t.common.loggedOut,
        description: t.common.loggedOutDesc,
        variant: 'success',
      });
      navigate('/login', { replace: true });
    } catch (error: any) {
      toast({
        title: t.common.logoutFailed,
        description: error?.message || t.common.logoutFailedDesc,
        variant: 'destructive',
      });
    }
  };
  
  return (
    <header className={`${theme === 'dark' ? 'dark-header' : 'light-header'} px-3 sm:px-6 py-3 sm:py-4`}>
      <div className="flex items-center gap-2 sm:gap-4">
        {/* Mobile menu toggle (desktop collapse handled by sidebar's own toggle) */}
        <button
          onClick={toggleSidebar}
          className={`lg:hidden p-2 rounded-lg ${theme === 'dark' ? 'text-slate-200 hover:bg-slate-700' : 'text-slate-600 hover:bg-slate-100'}`}
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Search - takes main space since brand is in sidebar */}
        <div className={`${theme === 'dark' ? 'dark-executive-card' : 'executive-card'} hidden md:flex items-center rounded-xl px-4 py-2.5 flex-1 max-w-2xl`}>
          <Search className={`${theme === 'dark' ? 'text-slate-400' : 'text-gray-400'} h-4 w-4 mr-3`} />
          <input
            type="text"
            placeholder={t.header.searchPlaceholder}
            className={`flex-1 bg-transparent border-none focus:outline-none focus:ring-0 text-sm ${theme === 'dark' ? 'text-slate-100 placeholder-slate-400' : 'text-slate-800 placeholder-gray-400'}`}
          />
        </div>

        <div className="ml-auto flex items-center gap-2 sm:gap-4">
          <ThemeToggle />
          <LanguageToggle />
          {!hideAIButton && (
            <button
              onClick={goToChat}
              className={`${theme === 'dark' ? 'dark-primary-button' : 'primary-button'} text-white px-3 sm:px-4 py-2 rounded-xl font-clash font-medium flex items-center space-x-2 transition-all duration-300`}
            >
              <MessageCircle className="h-4 w-4" />
              <span className="hidden xl:inline">{t.header.consultAI}</span>
            </button>
          )}
          <button className={`${theme === 'dark' ? 'text-slate-200' : 'text-slate-600'} hover:text-slate-800 relative p-2`}>
            <Bell className="h-5 w-5" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-blue-500 rounded-full"></span>
          </button>
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="hidden md:block text-right">
              <p className={`text-sm font-clash font-medium ${theme === 'dark' ? 'text-slate-100' : 'text-slate-800'}`}>{displayName}</p>
              <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>{t.common.free}</p>
            </div>
            <div className={`${theme === 'dark' ? 'bg-slate-700 text-slate-100' : 'bg-slate-200 text-slate-700'} h-9 w-9 rounded-full flex items-center justify-center font-clash font-medium`}>
              {initials}
            </div>
          </div>
          {user && !user.isGuest && (
            <button
              type="button"
              onClick={handleLogout}
              className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-clash font-medium transition-colors ${
                theme === 'dark'
                  ? 'border border-slate-600 text-slate-200 hover:bg-slate-700/60'
                  : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
              title={t.common.logout}
              aria-label={t.common.logout}
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden xl:inline">{t.common.logout}</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
