import { useState, useRef, useEffect } from 'react';
import { Download, FileText, FileCode, FileJson, ChevronDown, Loader2 } from 'lucide-react';
import { useTheme } from '@/contexts/theme-context';
import { useLanguage } from '@/contexts/language-context';
import { cn } from '@/lib/utils';
import { Message } from '@/types/message';

type ExportFormat = 'txt' | 'md' | 'json' | 'docx' | 'pdf';

interface SaveChatButtonProps {
  messages: Message[];
}

interface ExportRow {
  sender: string;
  time: string;
  content: string;
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

function getExportRows(messages: Message[]): ExportRow[] {
  return messages.map((m) => ({
    sender: m.sender === 'user' ? 'You' : 'Kingsley',
    time: formatTimestamp(m.timestamp),
    content: m.content,
  }));
}

function generateFilename(format: ExportFormat): string {
  const now = new Date();
  const date = now.toISOString().slice(0, 10);
  const time = now.toTimeString().slice(0, 5).replace(':', '');
  return `kingsley-chat-${date}-${time}.${format}`;
}

function exportAsTxt(messages: Message[]): Blob {
  const rows = getExportRows(messages);
  const header = `Kingsley Legal AI - Chat Export\nExported: ${new Date().toLocaleString()}\n${'='.repeat(50)}\n\n`;
  const body = rows.map((row) => `[${row.time}] ${row.sender}:\n${row.content}\n`).join('\n');

  return new Blob([header + body], { type: 'text/plain;charset=utf-8' });
}

function exportAsMd(messages: Message[]): Blob {
  const rows = getExportRows(messages);
  const header = `# Kingsley Legal AI - Chat Export\n\n**Exported:** ${new Date().toLocaleString()}  \n**Messages:** ${messages.length}\n\n---\n\n`;
  const body = rows.map((row) => `### **${row.sender}** - _${row.time}_\n\n${row.content}\n`).join('\n---\n\n');

  return new Blob([header + body], { type: 'text/markdown;charset=utf-8' });
}

function exportAsJson(messages: Message[]): Blob {
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

  return new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' });
}

async function exportAsDocx(messages: Message[]): Promise<Blob> {
  const { Document, Packer, Paragraph, TextRun, HeadingLevel } = await import('docx');
  const rows = getExportRows(messages);

  const children: import('docx').Paragraph[] = [
    new Paragraph({
      text: 'Kingsley Legal AI - Chat Export',
      heading: HeadingLevel.HEADING_1,
    }),
    new Paragraph({
      children: [new TextRun({ text: `Exported: ${new Date().toLocaleString()}`, italics: true })],
      spacing: { after: 140 },
    }),
    new Paragraph({
      children: [new TextRun({ text: `Messages: ${messages.length}`, italics: true })],
      spacing: { after: 220 },
    }),
  ];

  rows.forEach((row) => {
    children.push(
      new Paragraph({
        children: [new TextRun({ text: `${row.sender} - ${row.time}`, bold: true })],
        spacing: { before: 180, after: 80 },
      })
    );

    row.content.split('\n').forEach((line) => {
      children.push(
        new Paragraph({
          text: line || ' ',
          spacing: { after: 40 },
        })
      );
    });
  });

  const doc = new Document({
    sections: [{ children }],
  });

  return Packer.toBlob(doc);
}

async function exportAsPdf(messages: Message[]): Promise<Blob> {
  const { jsPDF } = await import('jspdf');
  const rows = getExportRows(messages);

  const pdf = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 44;
  const maxLineWidth = pageWidth - margin * 2;
  let y = margin;

  const ensurePage = (lineHeight = 16) => {
    if (y + lineHeight > pageHeight - margin) {
      pdf.addPage();
      y = margin;
    }
  };

  const writeBlock = (
    text: string,
    options: {
      size: number;
      style: 'normal' | 'bold';
      lineHeight: number;
      before?: number;
      after?: number;
    }
  ) => {
    y += options.before ?? 0;
    pdf.setFont('helvetica', options.style);
    pdf.setFontSize(options.size);

    const lines = pdf.splitTextToSize(text || ' ', maxLineWidth) as string[];
    lines.forEach((line) => {
      ensurePage(options.lineHeight);
      pdf.text(line, margin, y);
      y += options.lineHeight;
    });

    y += options.after ?? 0;
  };

  writeBlock('Kingsley Legal AI - Chat Export', { size: 16, style: 'bold', lineHeight: 20, after: 8 });
  writeBlock(`Exported: ${new Date().toLocaleString()}`, { size: 10, style: 'normal', lineHeight: 14, after: 2 });
  writeBlock(`Messages: ${messages.length}`, { size: 10, style: 'normal', lineHeight: 14, after: 12 });

  rows.forEach((row) => {
    writeBlock(`${row.sender} - ${row.time}`, { size: 11, style: 'bold', lineHeight: 15, before: 6, after: 4 });
    writeBlock(row.content, { size: 10, style: 'normal', lineHeight: 14, after: 4 });
  });

  return pdf.output('blob');
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

const FORMAT_CONFIG: Record<ExportFormat, { icon: typeof FileText }> = {
  txt: { icon: FileText },
  md: { icon: FileCode },
  json: { icon: FileJson },
  docx: { icon: FileText },
  pdf: { icon: FileText },
};

const EXPORTERS: Record<ExportFormat, (messages: Message[]) => Blob | Promise<Blob>> = {
  txt: exportAsTxt,
  md: exportAsMd,
  json: exportAsJson,
  docx: exportAsDocx,
  pdf: exportAsPdf,
};

export function SaveChatButton({ messages }: SaveChatButtonProps) {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [isExporting, setIsExporting] = useState<ExportFormat | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const isDark = theme === 'dark';
  const isEmpty = messages.length === 0;
  const isBusy = isExporting !== null;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleExport = async (format: ExportFormat) => {
    if (isBusy) return;

    try {
      setIsExporting(format);
      const blob = await EXPORTERS[format](messages);
      const filename = generateFilename(format);
      downloadBlob(blob, filename);
      setOpen(false);
    } catch (error) {
      console.error(`Failed to export chat as ${format}:`, error);
    } finally {
      setIsExporting(null);
    }
  };

  const formatLabels: Record<ExportFormat, { label: string; desc: string }> = {
    txt: { label: t.chat.saveFormats.txt, desc: t.chat.saveFormats.txtDesc },
    md: { label: t.chat.saveFormats.md, desc: t.chat.saveFormats.mdDesc },
    json: { label: t.chat.saveFormats.json, desc: t.chat.saveFormats.jsonDesc },
    docx: { label: t.chat.saveFormats.docx, desc: t.chat.saveFormats.docxDesc },
    pdf: { label: t.chat.saveFormats.pdf, desc: t.chat.saveFormats.pdfDesc },
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => !isEmpty && !isBusy && setOpen(!open)}
        disabled={isEmpty || isBusy}
        className={cn(
          'inline-flex h-10 items-center justify-center gap-2 px-3 sm:px-4 rounded-xl text-sm font-clash transition-colors',
          isEmpty || isBusy
            ? isDark
              ? 'bg-slate-800 text-slate-600 cursor-not-allowed'
              : 'bg-gray-50 text-gray-300 cursor-not-allowed'
            : isDark
              ? 'bg-slate-700 text-slate-100 hover:bg-slate-600'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
        )}
      >
        {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
        <span className="hidden sm:inline">{t.chat.saveChat}</span>
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
            const isCurrentExport = isExporting === fmt;

            return (
              <button
                key={fmt}
                type="button"
                disabled={isBusy}
                onClick={() => void handleExport(fmt)}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-3 text-left transition-colors',
                  'disabled:opacity-60 disabled:cursor-not-allowed',
                  isDark
                    ? 'text-slate-300 hover:bg-slate-700/50'
                    : 'text-gray-700 hover:bg-gray-50'
                )}
              >
                {isCurrentExport ? (
                  <Loader2
                    className={cn(
                      'h-4 w-4 flex-shrink-0 animate-spin',
                      isDark ? 'text-blue-400' : 'text-blue-600'
                    )}
                  />
                ) : (
                  <FmtIcon
                    className={cn(
                      'h-4 w-4 flex-shrink-0',
                      isDark ? 'text-blue-400' : 'text-blue-600'
                    )}
                  />
                )}
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
