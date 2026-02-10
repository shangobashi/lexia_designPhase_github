import { Outlet, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/contexts/theme-context';

export default function PublicLayout() {
  const { theme } = useTheme();
  
  return (
    <div className="min-h-screen sophisticated-bg">
      {/* Header */}
      <header className={`${theme === 'dark' ? 'dark-header' : 'light-header'} sticky top-0 z-50`}>
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-3 sm:py-4">
            <Link to="/" className="flex items-center space-x-2">
              <div className={`w-10 h-10 flex items-center justify-center`}>
                <img src={`${import.meta.env.BASE_URL}kingsley-logo.png`} alt="Kingsley Logo" className="w-full h-full object-contain" />
              </div>
              <span className={`hidden sm:inline text-2xl font-clash font-light ${theme === 'dark' ? 'text-slate-100' : 'text-slate-800'}`}>Kingsley</span>
            </Link>
            
            <div className="flex items-center gap-2 sm:gap-3">
              <Button variant="ghost" asChild className="hidden sm:inline-flex">
                <Link to="/login" className="text-slate-600 hover:text-slate-800">Se connecter</Link>
              </Button>
              <Button asChild className="primary-button text-white rounded-xl px-3 sm:px-4">
                <Link to="/register">S'inscrire</Link>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main>
        <Outlet />
      </main>
    </div>
  );
}
