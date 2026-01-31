import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, CheckCircle, Settings } from 'lucide-react';
import { checkSetup, getSetupInstructions, type SetupStatus } from '@/lib/setup-checker';
import { useTheme } from '@/contexts/theme-context';

export function SetupBanner() {
  const [setupStatus, setSetupStatus] = useState<SetupStatus | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  useEffect(() => {
    const checkConfiguration = async () => {
      try {
        const status = await checkSetup();
        setSetupStatus(status);
      } catch (error) {
        console.error('Setup check failed:', error);
      } finally {
        setIsChecking(false);
      }
    };

    checkConfiguration();
  }, []);

  if (isChecking || !setupStatus) {
    return null;
  }

  // Don't show banner if everything is configured
  if (setupStatus.overall) {
    return null;
  }

  const instructions = getSetupInstructions(setupStatus);

  return (
    <div className={`${theme === 'dark' ? 'bg-amber-900/30 border-amber-700/50' : 'bg-amber-50 border-amber-200'} border-b`}>
      <div className="px-4 py-3">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center space-x-3">
            <AlertTriangle className={`h-5 w-5 ${isDark ? 'text-amber-400' : 'text-amber-600'}`} />
            <div>
              <p className={`font-clash text-sm font-medium ${isDark ? 'text-amber-300' : 'text-amber-800'}`}>
                Configuration Required
              </p>
              <p className={`text-xs ${isDark ? 'text-amber-400/80' : 'text-amber-700'}`}>
                {!setupStatus.supabase.configured && !setupStatus.ai.anyConfigured 
                  ? 'Database and AI services need to be configured'
                  : !setupStatus.supabase.configured 
                    ? 'Database configuration required'
                    : 'AI service configuration required'
                }
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className={`${isDark ? 'text-amber-300 border-amber-600 hover:bg-amber-900/50' : 'text-amber-800 border-amber-300 hover:bg-amber-100'}`}
            >
              <Settings className="h-4 w-4 mr-2" />
              {isExpanded ? 'Hide' : 'Show'} Setup Guide
            </Button>
          </div>
        </div>
        
        {isExpanded && (
          <div className="mt-4 max-w-7xl mx-auto">
            <div className={`${isDark ? 'bg-slate-800 border-amber-700/50' : 'bg-white border-amber-200'} rounded-md border p-4`}>
              <h3 className={`font-clash font-medium ${isDark ? 'text-amber-300' : 'text-amber-900'} mb-3`}>Setup Instructions:</h3>
              
              <div className="grid md:grid-cols-2 gap-4">
                {/* Supabase Status */}
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    {setupStatus.supabase.configured ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-amber-600" />
                    )}
                    <span className="font-clash font-medium text-sm">
                      Database (Supabase)
                    </span>
                  </div>
                  {!setupStatus.supabase.configured && (
                    <div className="text-xs text-gray-600 ml-6 space-y-1">
                      <p>• Visit supabase.com and create a project</p>
                      <p>• Get Project URL and Anon Key from Settings → API</p>
                      <p>• Add them to your .env file</p>
                      <p>• Run the database migration</p>
                    </div>
                  )}
                </div>

                {/* AI Status */}
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    {setupStatus.ai.anyConfigured ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-amber-600" />
                    )}
                    <span className="font-clash font-medium text-sm">
                      AI Services
                    </span>
                  </div>
                  {!setupStatus.ai.anyConfigured && (
                    <div className="text-xs text-gray-600 ml-6 space-y-1">
                      <p>• Get Gemini API key (makersuite.google.com)</p>
                      <p>• OR get Groq API key (console.groq.com)</p>
                      <p>• Add VITE_GEMINI_API_KEY or VITE_GROQ_API_KEY to .env</p>
                    </div>
                  )}
                  
                  <div className="ml-6 text-xs space-y-1">
                    <div className="flex items-center space-x-2">
                      {setupStatus.ai.gemini ? (
                        <CheckCircle className="h-3 w-3 text-green-600" />
                      ) : (
                        <div className="h-3 w-3 rounded-full border border-gray-300" />
                      )}
                      <span className="text-gray-600">Gemini (Google)</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      {setupStatus.ai.groq ? (
                        <CheckCircle className="h-3 w-3 text-green-600" />
                      ) : (
                        <div className="h-3 w-3 rounded-full border border-gray-300" />
                      )}
                      <span className="text-gray-600">Groq</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className={`mt-4 pt-3 border-t ${isDark ? 'border-amber-700/50' : 'border-amber-200'}`}>
                <p className="text-xs text-gray-600">
                  📖 For detailed instructions, see <code className="bg-gray-100 px-1 rounded">SETUP_GUIDE.md</code> in the project root.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}