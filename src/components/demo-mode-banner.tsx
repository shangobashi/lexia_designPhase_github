import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/auth-context';
import { AlertCircle, X } from 'lucide-react';

export function DemoModeBanner() {
  const { isDemoMode, exitDemoMode } = useAuth();

  if (!isDemoMode) return null;

  return (
    <div className="bg-yellow-50 border-b border-yellow-200 px-4 py-3">
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center space-x-3">
          <AlertCircle className="h-5 w-5 text-yellow-600" />
          <div>
            <p className="text-sm font-medium text-yellow-800">
              Mode Démonstration
            </p>
            <p className="text-xs text-yellow-700">
              Vous utilisez LexiA en mode démo avec des données fictives. Les fonctionnalités réelles nécessitent une configuration.
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={exitDemoMode}
            className="text-yellow-800 border-yellow-300 hover:bg-yellow-100"
          >
            Sortir du mode démo
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={exitDemoMode}
            className="text-yellow-600 hover:text-yellow-800"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}