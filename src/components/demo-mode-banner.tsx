import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/auth-context';
import { useTheme } from '@/contexts/theme-context';
import { AlertCircle, X } from 'lucide-react';

export function DemoModeBanner() {
  const { isDemoMode, exitDemoMode } = useAuth();
  const { theme } = useTheme();

  if (!isDemoMode) return null;

  const isDark = theme === 'dark';

  return (
    <div className={`${isDark ? 'bg-yellow-900/30 border-yellow-700/50' : 'bg-yellow-50 border-yellow-200'} border-b px-4 py-3`}>
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center space-x-3">
          <AlertCircle className={`h-5 w-5 ${isDark ? 'text-yellow-400' : 'text-yellow-600'}`} />
          <div>
            <p className={`font-clash text-sm font-medium ${isDark ? 'text-yellow-300' : 'text-yellow-800'}`}>
              Mode Démonstration
            </p>
            <p className={`text-xs ${isDark ? 'text-yellow-400/80' : 'text-yellow-700'}`}>
              Vous utilisez Kingsley en mode démo avec des données fictives. Les fonctionnalités réelles nécessitent une configuration.
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={exitDemoMode}
            className={`${isDark ? 'text-yellow-300 border-yellow-600 hover:bg-yellow-900/50' : 'text-yellow-800 border-yellow-300 hover:bg-yellow-100'}`}
          >
            Sortir du mode démo
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={exitDemoMode}
            className={`${isDark ? 'text-yellow-400 hover:text-yellow-300' : 'text-yellow-600 hover:text-yellow-800'}`}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}