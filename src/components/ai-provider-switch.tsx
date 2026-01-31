import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Brain, Sparkles, Zap, HelpCircle, Bot } from 'lucide-react';

export type AIProvider = 'gemini' | 'openai' | 'anthropic' | 'local' | 'demo';

interface AIProviderSwitchProps {
  currentProvider: AIProvider;
  onProviderChange: (provider: AIProvider) => void;
}

const getProviderLabel = (provider: AIProvider): string => {
  switch (provider) {
    case 'gemini':
      return 'Google Gemini';
    case 'openai':
      return 'OpenAI';
    case 'anthropic':
      return 'Anthropic Claude';
    case 'local':
      return 'Modèle local';
    case 'demo':
      return 'Mode démo';
    default:
      return 'Fournisseur inconnu';
  }
};

const getProviderIcon = (provider: AIProvider) => {
  switch (provider) {
    case 'gemini':
      return <Sparkles className="h-4 w-4" />;
    case 'openai':
      return <Zap className="h-4 w-4" />;
    case 'anthropic':
      return <Brain className="h-4 w-4" />;
    case 'local':
      return <Bot className="h-4 w-4" />;
    case 'demo':
      return <HelpCircle className="h-4 w-4" />;
    default:
      return <Brain className="h-4 w-4" />;
  }
};

export function AIProviderSwitch({ currentProvider, onProviderChange }: AIProviderSwitchProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-gray-700 dark:text-slate-300 rounded-xl text-sm font-medium transition-colors">
          {getProviderIcon(currentProvider)}
          {getProviderLabel(currentProvider)}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600/30 rounded-xl shadow-lg backdrop-blur-md p-2">
        <DropdownMenuItem onClick={() => onProviderChange('gemini')} className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 dark:hover:bg-slate-600/50 rounded-lg cursor-pointer transition-colors">
          <Sparkles className="h-4 w-4 text-green-600" />
          <div className="flex flex-col">
            <span className="text-slate-800 dark:text-slate-100 font-medium">Google Gemini</span>
            <span className="text-xs text-green-600">Gratuit • Recommandé</span>
          </div>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onProviderChange('openai')} className="gap-2">
          <Zap className="h-4 w-4" />
          <div className="flex flex-col">
            <span>OpenAI</span>
            <span className="text-xs text-blue-600">GPT récente</span>
          </div>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onProviderChange('anthropic')} className="gap-2">
          <Brain className="h-4 w-4" />
          <div className="flex flex-col">
            <span>Anthropic Claude</span>
            <span className="text-xs text-purple-600">Long contexte</span>
          </div>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onProviderChange('local')} className="gap-2">
          <Bot className="h-4 w-4" />
          <div className="flex flex-col">
            <span>Modèle local</span>
            <span className="text-xs text-orange-600">Sans clé</span>
          </div>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onProviderChange('demo')} className="gap-2">
          <HelpCircle className="h-4 w-4" />
          <div className="flex flex-col">
            <span>Mode démo</span>
            <span className="text-xs text-gray-600">Réponse instantanée</span>
          </div>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
