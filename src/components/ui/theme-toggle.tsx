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
        "relative h-9 w-9 rounded-full border-2 transition-all duration-300 ease-in-out",
        "hover:scale-110 active:scale-95",
        "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
        theme === 'light' 
          ? "bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200/50 text-orange-600 hover:from-amber-100 hover:to-orange-100 shadow-lg shadow-amber-200/20"
          : "bg-gradient-to-br from-slate-700 to-slate-800 border-slate-600/50 text-blue-400 hover:from-slate-600 hover:to-slate-700 shadow-lg shadow-slate-500/20"
      )}
      aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
    >
      <div className="relative h-full w-full flex items-center justify-center">
        <Sun
          className={cn(
            "h-4 w-4 transition-all duration-300 ease-in-out",
            theme === 'light' 
              ? "rotate-0 scale-100 opacity-100" 
              : "rotate-90 scale-0 opacity-0"
          )}
        />
        <Moon
          className={cn(
            "absolute h-4 w-4 transition-all duration-300 ease-in-out",
            theme === 'light' 
              ? "-rotate-90 scale-0 opacity-0" 
              : "rotate-0 scale-100 opacity-100"
          )}
        />
      </div>
      
      {/* Subtle glow effect */}
      <div 
        className={cn(
          "absolute inset-0 rounded-full transition-all duration-300 ease-in-out -z-10 opacity-0 hover:opacity-100",
          theme === 'light'
            ? "bg-gradient-to-br from-amber-400/30 to-orange-400/30 blur-md"
            : "bg-gradient-to-br from-blue-400/30 to-indigo-400/30 blur-md"
        )}
      />
    </Button>
  );
}