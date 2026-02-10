import { useState, useRef, useEffect } from 'react';
import { Download, FileText, FileCode, FileJson, ChevronDown } from 'lucide-react';
import { useTheme } from '@/contexts/theme-context';
import { useLanguage } from '@/contexts/language-context';
import { cn } from '@/lib/utils';
import { Message } from '@/types/message';

type ExportFormat = 'txt' | 'md' | 'json';

interface SaveChatButtonProps {
  messages: Message[];
}

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function generateFilename(format: ExportFormat): string {
  const now = new Date();
  const date = now.toISOString().slice(0, 10);
  const time = now.toTimeString().slice(0, 5).replace(':', '');
  return `kingsley-chat-${date}-${time}.${format}`;
}

function exportAsTxt(messages: Message[]): string {
  const header = `Kingsley Legal AI — Chat Export\nExported: ${new Date().toLocaleString()}\n${'='.repeat(50)}\n\n`;

  const body = messages
    .map((m) => {
      const sender = m.sender === 'user' ? 'You' : 'Kingsley';
      const time = formatTimestamp(m.timestamp);
      return `[${time}] ${sender}:\n${m.content}\n`;
    })
    .join('\n');

  return header + body;
}

function exportAsMd(messages: Message[]): string {
  const header = `# Kingsley Legal AI — Chat Export\n\n**Exported:** ${new Date().toLocaleString()}  \n**Messages:** ${messages.length}\n\n---\n\n`;

  const body = messages
    .map((m) => {
      const sender = m.sender === 'user' ? '**You**' : '**Kingsley**';
      const time = formatTimestamp(m.timestamp);
      return `### ${sender} — _${time}_\n\n${m.content}\n`;
    })
    .join('\n---\n\n');

  return header + body;
}

function exportAsJson(messages: Message[]): string {
  const payload = {
    export: {
      application: 'Kingsley Legal AI',
      exportedAt: new Date().toISOString(),
      messageCount: messages.length,
    },
    messages: messages.map((m) => ({
      id: m.id,
      sender: m.sender,
      content: m.content,
      timestamp: m.timestamp,
    })),
  };
  return JSON.stringify(payload, null, 2);
}

function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

const FORMAT_CONFIG: Record<ExportFormat, { icon: typeof FileText; mime: string }> = {
  txt: { icon: FileText, mime: 'text/plain' },
  md: { icon: FileCode, mime: 'text/markdown' },
  json: { icon: FileJson, mime: 'application/json' },
};

const EXPORTERS: Record<ExportFormat, (messages: Message[]) => string> = {
  txt: exportAsTxt,
  md: exportAsMd,
  json: exportAsJson,
};

export function SaveChatButton({ messages }: SaveChatButtonProps) {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const isDark = theme === 'dark';
  const isEmpty = messages.length === 0;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleExport = (format: ExportFormat) => {
    const content = EXPORTERS[format](messages);
    const filename = generateFilename(format);
    downloadFile(content, filename, FORMAT_CONFIG[format].mime);
    setOpen(false);
  };

  const formatLabels: Record<ExportFormat, { label: string; desc: string }> = {
    txt: { label: t.chat.saveFormats.txt, desc: t.chat.saveFormats.txtDesc },
    md: { label: t.chat.saveFormats.md, desc: t.chat.saveFormats.mdDesc },
    json: { label: t.chat.saveFormats.json, desc: t.chat.saveFormats.jsonDesc },
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => !isEmpty && setOpen(!open)}
        disabled={isEmpty}
        className={cn(
          'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-clash transition-colors',
          isEmpty
            ? isDark
              ? 'bg-slate-800 text-slate-600 cursor-not-allowed'
              : 'bg-gray-50 text-gray-300 cursor-not-allowed'
            : isDark
              ? 'bg-slate-700 text-slate-100 hover:bg-slate-600'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
        )}
      >
        <Download className="h-4 w-4" />
        <span>{t.chat.saveChat}</span>
        <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div
          className={cn(
            'absolute right-0 top-full mt-2 w-56 rounded-xl border shadow-lg z-50 overflow-hidden',
            isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'
          )}
        >
          {(Object.keys(FORMAT_CONFIG) as ExportFormat[]).map((fmt) => {
            const FmtIcon = FORMAT_CONFIG[fmt].icon;
            const labels = formatLabels[fmt];
            return (
              <button
                key={fmt}
                type="button"
                onClick={() => handleExport(fmt)}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-3 text-left transition-colors',
                  isDark
                    ? 'text-slate-300 hover:bg-slate-700/50'
                    : 'text-gray-700 hover:bg-gray-50'
                )}
              >
                <FmtIcon
                  className={cn(
                    'h-4 w-4 flex-shrink-0',
                    isDark ? 'text-blue-400' : 'text-blue-600'
                  )}
                />
                <div>
                  <div className="text-sm font-medium">{labels.label}</div>
                  <div className={cn('text-xs', isDark ? 'text-slate-500' : 'text-gray-400')}>
                    {labels.desc}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
