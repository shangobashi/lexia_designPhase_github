import { useLanguage } from '@/contexts/language-context';
import { useTheme } from '@/contexts/theme-context';
import { cn } from '@/lib/utils';

export function LanguageToggle() {
  const { language, toggleLanguage, t } = useLanguage();
  const { theme } = useTheme();

  return (
    <button
      onClick={toggleLanguage}
      className={cn(
        "relative h-9 px-3 rounded-full border-2 transition-all duration-150 ease-out",
        "hover:scale-105 active:scale-95",
        "focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2",
        "flex items-center gap-1 text-xs font-clash font-semibold tracking-wide",
        theme === 'light'
          ? "bg-gradient-to-br from-gray-50 to-gray-100 border-gray-200 shadow-sm shadow-gray-200/50"
          : "bg-gradient-to-br from-slate-700 to-slate-800 border-slate-600/50 shadow-sm shadow-slate-800/40"
      )}
      aria-label={t.languageToggle.switchTo}
      title={t.languageToggle.switchTo}
    >
      <span
        className={cn(
          "transition-colors duration-150",
          language === 'fr'
            ? theme === 'light' ? "text-slate-800" : "text-slate-100"
            : theme === 'light' ? "text-slate-400" : "text-slate-500"
        )}
      >
        FR
      </span>
      <span
        className={cn(
          "mx-0.5",
          theme === 'light' ? "text-slate-300" : "text-slate-600"
        )}
      >
        |
      </span>
      <span
        className={cn(
          "transition-colors duration-150",
          language === 'en'
            ? theme === 'light' ? "text-slate-800" : "text-slate-100"
            : theme === 'light' ? "text-slate-400" : "text-slate-500"
        )}
      >
        EN
      </span>

      {/* Subtle glow effect */}
      <div
        className={cn(
          "absolute inset-0 rounded-full transition-all duration-150 ease-out -z-10 opacity-0 hover:opacity-60",
          theme === 'light'
            ? "bg-gradient-to-br from-gray-300/30 to-gray-200/30 blur-md"
            : "bg-gradient-to-br from-blue-500/25 to-indigo-500/25 blur-md"
        )}
      />
    </button>
  );
}
