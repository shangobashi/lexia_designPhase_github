import { useState, useRef, useEffect } from 'react';
import { Brain, Zap, ChevronDown } from 'lucide-react';
import { useTheme } from '@/contexts/theme-context';
import { useLanguage } from '@/contexts/language-context';
import { KingsleyMode } from '@/lib/ai-service';
import { cn } from '@/lib/utils';

export type AIProvider = 'openrouter';

interface AIProviderSwitchProps {
  currentProvider: AIProvider;
  onProviderChange: (provider: AIProvider) => void;
  mode: KingsleyMode;
  onModeChange: (mode: KingsleyMode) => void;
}

const MODE_ICONS: Record<KingsleyMode, typeof Brain> = {
  fast: Zap,
  thinking: Brain,
};

export function AIProviderSwitch({ mode, onModeChange }: AIProviderSwitchProps) {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const isDark = theme === 'dark';

  const MODE_CONFIG: Record<KingsleyMode, { label: string; desc: string }> = {
    fast: { label: t.chat.modeFast, desc: t.chat.modeFastDesc },
    thinking: { label: t.chat.modeThinking, desc: t.chat.modeThinkingDesc },
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const current = MODE_CONFIG[mode];
  const Icon = MODE_ICONS[mode];

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          "inline-flex h-10 w-full min-w-0 max-w-full items-center justify-between gap-2 px-3 sm:px-4 rounded-xl text-sm font-clash font-medium transition-colors cursor-pointer",
          isDark
            ? 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'
            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
        )}
      >
        <Icon className={cn("h-4 w-4", mode === 'fast' ? 'text-amber-500' : 'text-blue-600')} />
        <span className="truncate">Kingsley — {current.label}</span>
        <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", open && 'rotate-180')} />
      </button>

      {open && (
        <div className={cn(
          "absolute right-0 top-full mt-2 w-56 rounded-xl border shadow-lg z-50 overflow-hidden",
          isDark
            ? 'bg-slate-800 border-slate-700'
            : 'bg-white border-gray-200'
        )}>
          {(Object.keys(MODE_CONFIG) as KingsleyMode[]).map((m) => {
            const cfg = MODE_CONFIG[m];
            const MIcon = MODE_ICONS[m];
            const isActive = m === mode;
            return (
              <button
                key={m}
                type="button"
                onClick={() => { onModeChange(m); setOpen(false); }}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 text-left transition-colors",
                  isActive
                    ? isDark ? 'bg-blue-600/20 text-blue-300' : 'bg-blue-50 text-blue-700'
                    : isDark ? 'text-slate-300 hover:bg-slate-700/50' : 'text-gray-700 hover:bg-gray-50'
                )}
              >
                <MIcon className={cn(
                  "h-4 w-4 flex-shrink-0",
                  m === 'fast' ? 'text-amber-500' : 'text-blue-600'
                )} />
                <div>
                  <div className="text-sm font-medium">{cfg.label}</div>
                  <div className={cn("text-xs", isDark ? 'text-slate-500' : 'text-gray-400')}>{cfg.desc}</div>
                </div>
                {isActive && (
                  <span className="ml-auto w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}


