import { Moon, Sun } from 'lucide-react';
import { useTheme } from '@/contexts/theme-context';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      className={cn(
        "relative h-9 w-9 rounded-full border-2 transition-all duration-150 ease-out",
        "hover:scale-110 active:scale-95",
        "focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2",
        theme === 'light' 
          ? "bg-gradient-to-br from-gray-50 to-gray-100 border-gray-200 text-slate-700 hover:from-gray-100 hover:to-gray-200 shadow-sm shadow-gray-200/50"
          : "bg-gradient-to-br from-slate-700 to-slate-800 border-slate-600/50 text-blue-300 hover:from-slate-600 hover:to-slate-700 shadow-sm shadow-slate-800/40"
      )}
      aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
    >
      <div className="relative h-full w-full flex items-center justify-center">
        <Sun
          className={cn(
            "h-4 w-4 transition-all duration-150 ease-out",
            theme === 'light' 
              ? "rotate-0 scale-100 opacity-100" 
              : "rotate-90 scale-0 opacity-0"
          )}
        />
        <Moon
          className={cn(
            "absolute h-4 w-4 transition-all duration-150 ease-out",
            theme === 'light' 
              ? "-rotate-90 scale-0 opacity-0" 
              : "rotate-0 scale-100 opacity-100"
          )}
        />
      </div>
      
      {/* Subtle glow effect */}
      <div 
        className={cn(
          "absolute inset-0 rounded-full transition-all duration-150 ease-out -z-10 opacity-0 hover:opacity-60",
          theme === 'light'
            ? "bg-gradient-to-br from-gray-300/30 to-gray-200/30 blur-md"
            : "bg-gradient-to-br from-blue-500/25 to-indigo-500/25 blur-md"
        )}
      />
    </Button>
  );
}
