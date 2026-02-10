import { useState, useRef, useEffect } from 'react';
import { PaperclipIcon, Send, X, FileText, Image, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { useTheme } from '@/contexts/theme-context';
import { useLanguage } from '@/contexts/language-context';
import { useToast } from '@/hooks/use-toast';
import { Message } from '@/types/message';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LoadedFile,
  readFileContent,
  isSupported,
  formatFileSize,
  truncateFileName,
  ACCEPT_STRING,
  MAX_FILE_SIZE,
  MAX_FILES,
} from '@/lib/file-reader';

const TEXTAREA_MIN_HEIGHT = 60;
const TEXTAREA_MAX_HEIGHT = 220;

interface ChatInterfaceProps {
  messages: Message[];
  onSend: (message: string, files?: LoadedFile[]) => void;
  onClearChat: () => void;
  isSending?: boolean;
  streamingText?: string;
  userName?: string;
}

function MarkdownContent({ content, isDark }: { content: string; isDark: boolean }) {
  return (
    <ReactMarkdown
      components={{
        p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
        strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
        em: ({ children }) => <em className="italic">{children}</em>,
        ul: ({ children }) => <ul className="list-disc pl-4 mb-2 space-y-1">{children}</ul>,
        ol: ({ children }) => <ol className="list-decimal pl-4 mb-2 space-y-1">{children}</ol>,
        li: ({ children }) => <li>{children}</li>,
        h1: ({ children }) => <h1 className="text-base font-bold mb-2">{children}</h1>,
        h2: ({ children }) => <h2 className="text-sm font-bold mb-1.5">{children}</h2>,
        h3: ({ children }) => <h3 className="text-sm font-semibold mb-1">{children}</h3>,
        code: ({ children, className }) => {
          const isBlock = className?.includes('language-');
          if (isBlock) {
            return (
              <pre className={cn(
                "rounded-xl p-3 my-2 text-xs overflow-x-auto font-mono",
                isDark ? 'bg-slate-900/80 text-slate-200' : 'bg-gray-100 text-gray-800'
              )}>
                <code>{children}</code>
              </pre>
            );
          }
          return (
            <code className={cn(
              "px-1.5 py-0.5 rounded-md text-xs font-mono",
              isDark ? 'bg-slate-900/60 text-blue-300' : 'bg-gray-100 text-blue-700'
            )}>
              {children}
            </code>
          );
        },
        blockquote: ({ children }) => (
          <blockquote className={cn(
            "border-l-3 pl-3 my-2 italic",
            isDark ? 'border-blue-500/50 text-slate-400' : 'border-blue-300 text-gray-600'
          )}>
            {children}
          </blockquote>
        ),
        hr: () => <hr className={cn("my-3", isDark ? 'border-slate-700' : 'border-gray-200')} />,
        a: ({ children, href }) => (
          <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-500 underline hover:text-blue-400">
            {children}
          </a>
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  );
}

/** Extract file badges from a user message that was sent with files */
function parseFileBadges(content: string): { badges: { name: string; size: string }[]; text: string } {
  const regex = /^\[FILES: (.+?)\]\n?/;
  const match = content.match(regex);
  if (!match) return { badges: [], text: content };

  const badgeStr = match[1];
  const badges = badgeStr.split(' | ').map(b => {
    const parts = b.split(' (');
    return { name: parts[0], size: parts[1]?.replace(')', '') || '' };
  });
  const text = content.slice(match[0].length);
  return { badges, text };
}

export default function ChatInterface({ messages, onSend, onClearChat, isSending = false, streamingText = '', userName = '' }: ChatInterfaceProps) {
  const [input, setInput] = useState('');
  const [loadedFiles, setLoadedFiles] = useState<LoadedFile[]>([]);
  const [isReadingFile, setIsReadingFile] = useState(false);
  const { theme } = useTheme();
  const { t } = useLanguage();
  const { toast } = useToast();
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingText]);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.style.height = '0px';
    const nextHeight = Math.max(
      TEXTAREA_MIN_HEIGHT,
      Math.min(textarea.scrollHeight, TEXTAREA_MAX_HEIGHT)
    );
    textarea.style.height = `${nextHeight}px`;
    textarea.style.overflowY = textarea.scrollHeight > TEXTAREA_MAX_HEIGHT ? 'auto' : 'hidden';
  }, [input]);

  const scrollToBottom = () => {
    const container = messagesContainerRef.current;
    if (!container) return;
    container.scrollTop = container.scrollHeight;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if ((input.trim() || loadedFiles.length > 0) && !isSending) {
      onSend(input, loadedFiles.length > 0 ? loadedFiles : undefined);
      setInput('');
      setLoadedFiles([]);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if ((input.trim() || loadedFiles.length > 0) && !isSending) {
        onSend(input, loadedFiles.length > 0 ? loadedFiles : undefined);
        setInput('');
        setLoadedFiles([]);
      }
    }
  };

  const handleFileClick = () => fileInputRef.current?.click();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;

    const files = Array.from(e.target.files);
    e.target.value = '';

    // Check total file count
    if (loadedFiles.length + files.length > MAX_FILES) {
      toast({ title: t.chat.tooManyFiles, description: t.chat.tooManyFilesDesc, variant: 'destructive' });
      return;
    }

    setIsReadingFile(true);
    const nextLoadedFiles: LoadedFile[] = [];

    try {
      for (const file of files) {
        // Validate size
        if (file.size > MAX_FILE_SIZE) {
          toast({ title: t.chat.fileTooLarge, description: t.chat.fileTooLargeDesc, variant: 'destructive' });
          continue;
        }

        // Validate format
        if (!isSupported(file)) {
          toast({ title: t.chat.unsupportedFormat, description: file.name, variant: 'destructive' });
          continue;
        }

        try {
          const loaded = await readFileContent(file);
          nextLoadedFiles.push(loaded);
        } catch {
          toast({ title: t.chat.fileReadError, description: file.name, variant: 'destructive' });
        }
      }
    } finally {
      setIsReadingFile(false);
    }

    if (nextLoadedFiles.length > 0) {
      setLoadedFiles(prev => [...prev, ...nextLoadedFiles]);
      toast({
        title: t.chat.fileLoaded,
        description: nextLoadedFiles.map(file => file.name).join(', '),
      });
    }
  };

  const removeFile = (index: number) => {
    setLoadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const isDark = theme === 'dark';

  const userInitials = userName
    ? userName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : '?';

  const fileTypeIcon = (type: LoadedFile['type']) => {
    if (type === 'image') return <Image className="w-3.5 h-3.5 flex-shrink-0" />;
    return <FileText className="w-3.5 h-3.5 flex-shrink-0" />;
  };

  const getAttachmentLabel = (count: number) => (count === 1 ? t.chat.attachedFile : t.chat.attachedFilesLabel);
  const totalLoadedSize = loadedFiles.reduce((sum, file) => sum + file.size, 0);

  return (
    <main className="flex-1 flex flex-col h-full overflow-hidden rounded-[1.25rem]">
      {/* Messages area */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto p-6 space-y-4"
        style={{ minHeight: '400px', maxHeight: '60vh' }}
      >
        {messages.length === 0 ? (
          <div className={cn(
            "text-center py-16 rounded-[1.25rem] border",
            isDark
              ? 'border-slate-700/50 bg-slate-800/40 text-slate-300'
              : 'border-gray-200/80 bg-gray-50/50 text-gray-500'
          )}>
            <div className="mb-4">
              <div className={cn(
                "w-12 h-12 mx-auto rounded-[0.875rem] flex items-center justify-center",
                isDark ? 'bg-blue-600/20' : 'bg-blue-50'
              )}>
                <svg className={cn("w-6 h-6", isDark ? 'text-blue-400' : 'text-blue-600')} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
                </svg>
              </div>
            </div>
            <p className="text-lg font-clash font-medium mb-2">{t.chat.emptyState.title}</p>
            <p className="text-sm opacity-75">{t.chat.emptyState.subtitle}</p>
          </div>
        ) : (
          <div className="space-y-4">
            <AnimatePresence>
              {messages.map((message) => {
                const isUser = message.sender === 'user';
                const { badges, text } = isUser ? parseFileBadges(message.content) : { badges: [], text: message.content };

                return (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className={cn(
                      "flex items-start gap-3",
                      isUser ? "justify-end" : "justify-start"
                    )}
                  >
                    {message.sender === 'assistant' && (
                      <div className="w-8 h-8 bg-blue-600 rounded-[0.625rem] flex items-center justify-center flex-shrink-0 mt-1">
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
                        </svg>
                      </div>
                    )}
                    <div className={cn(
                      "px-4 py-3 leading-relaxed text-sm max-w-[75%]",
                      isUser
                        ? 'bg-blue-600 text-white rounded-[1.25rem] rounded-br-[0.375rem]'
                        : isDark
                          ? 'bg-slate-700/60 text-slate-100 rounded-[1.25rem] rounded-bl-[0.375rem] border border-slate-600/30'
                          : 'bg-white text-gray-800 rounded-[1.25rem] rounded-bl-[0.375rem] border border-gray-200/80 shadow-sm'
                    )}>
                      {/* File badges for user messages */}
                      {isUser && badges.length > 0 && (
                        <motion.div
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.22, ease: 'easeOut' }}
                          className={cn(
                            "mb-2.5 rounded-xl border px-2.5 py-2",
                            "backdrop-blur-[2px]",
                            "bg-white/10 border-white/25 text-white/95"
                          )}
                        >
                          <div className="flex items-center justify-between gap-3 text-[10px] font-semibold tracking-[0.12em] uppercase">
                            <span className="inline-flex items-center gap-1.5">
                              <PaperclipIcon className="w-3 h-3" />
                              {badges.length} {getAttachmentLabel(badges.length)}
                            </span>
                            <span className="text-white/70">{t.chat.attachmentsInMessage}</span>
                          </div>
                          <div className="mt-1.5 flex flex-wrap gap-1.5">
                            {badges.map((badge, i) => (
                              <motion.span
                                key={i}
                                whileHover={{ y: -1, scale: 1.015 }}
                                transition={{ type: 'spring', stiffness: 380, damping: 24 }}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs bg-white/20 text-white/90"
                              >
                                <FileText className="w-3 h-3" />
                                {badge.name}
                                {badge.size && <span className="opacity-70">({badge.size})</span>}
                              </motion.span>
                            ))}
                          </div>
                        </motion.div>
                      )}
                      {message.sender === 'assistant' ? (
                        <MarkdownContent content={message.content} isDark={isDark} />
                      ) : (
                        <div className="whitespace-pre-wrap">{text}</div>
                      )}
                    </div>
                    {isUser && (
                      <div className={cn(
                        "w-8 h-8 rounded-[0.625rem] flex items-center justify-center flex-shrink-0 mt-1",
                        isDark ? 'bg-slate-600' : 'bg-gray-200'
                      )}>
                        <span className={cn("font-clash font-semibold text-xs", isDark ? 'text-slate-200' : 'text-gray-600')}>{userInitials}</span>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>
            {isSending && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-start gap-3 justify-start"
              >
                <div className="w-8 h-8 bg-blue-600 rounded-[0.625rem] flex items-center justify-center flex-shrink-0 mt-1">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
                  </svg>
                </div>
                <div className={cn(
                  "px-4 py-3 rounded-[1.25rem] rounded-bl-[0.375rem] text-sm max-w-[75%]",
                  isDark
                    ? 'bg-slate-700/60 text-slate-100 border border-slate-600/30'
                    : 'bg-white text-gray-800 border border-gray-200/80 shadow-sm'
                )}>
                  {streamingText ? (
                    <MarkdownContent content={streamingText} isDark={isDark} />
                  ) : (
                    <div className={cn("flex items-center gap-2", isDark ? 'text-slate-400' : 'text-gray-400')}>
                      <span>{t.chat.thinking}</span>
                      <span className="flex gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-current animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-1.5 h-1.5 rounded-full bg-current animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-1.5 h-1.5 rounded-full bg-current animate-bounce" style={{ animationDelay: '300ms' }} />
                      </span>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </div>
        )}
      </div>

      {/* Input area */}
      <div className={cn(
        "border-t p-4",
        isDark
          ? 'border-slate-700/50 bg-slate-900/40'
          : 'border-gray-200/60 bg-white/80'
      )}>
        <form onSubmit={handleSubmit}>
          <div
            className={cn(
              "rounded-2xl border p-2.5 sm:p-3",
              isDark
                ? 'bg-slate-900/55 border-slate-700/60 shadow-[inset_0_1px_0_0_rgba(148,163,184,0.08)]'
                : 'bg-white/95 border-gray-200 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.6)]'
            )}
          >
            <div className="flex flex-col gap-2.5 sm:grid sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end sm:gap-2">
              <div className="flex-1 relative">
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={t.chat.inputPlaceholder}
                  className={cn(
                    "w-full h-[60px] min-h-[60px] px-4 py-3 pr-12 rounded-xl resize-none focus:outline-none focus:ring-2 transition-all text-sm leading-5 transition-[height]",
                    "[scrollbar-width:thin] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-corner]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full",
                    isDark
                      ? 'bg-slate-800/95 border border-slate-700 text-slate-100 placeholder-slate-500 focus:ring-blue-500/35 focus:border-blue-500/50 [scrollbar-color:rgba(148,163,184,0.45)_transparent] [&::-webkit-scrollbar-thumb]:bg-slate-500/45 [&::-webkit-scrollbar-thumb:hover]:bg-slate-400/60'
                      : 'bg-slate-50 border border-slate-200 text-gray-800 placeholder-gray-400 focus:ring-blue-500/25 focus:border-blue-400/60 [scrollbar-color:rgba(100,116,139,0.45)_transparent] [&::-webkit-scrollbar-thumb]:bg-slate-400/55 [&::-webkit-scrollbar-thumb:hover]:bg-slate-500/65'
                  )}
                  rows={2}
                  disabled={isSending}
                />
                <button
                  type="button"
                  onClick={handleFileClick}
                  className={cn(
                    "absolute right-2.5 bottom-2.5 p-1.5 rounded-md transition-colors",
                    isDark
                      ? 'text-slate-500 hover:text-slate-300 hover:bg-slate-700/60'
                      : 'text-gray-400 hover:text-gray-600 hover:bg-gray-200/70'
                  )}
                  title={t.chat.loadFile}
                >
                  <PaperclipIcon className="h-4 w-4" />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept={ACCEPT_STRING}
                  className="hidden"
                  onChange={handleFileChange}
                />
              </div>

              <div className="flex items-center gap-2 sm:items-end">
                <button
                  type="button"
                  onClick={handleFileClick}
                  disabled={isSending || isReadingFile}
                  className={cn(
                    "h-11 px-4 rounded-xl font-clash font-medium text-sm transition-colors",
                    "inline-flex items-center justify-center gap-2",
                    "border disabled:opacity-45 disabled:cursor-not-allowed",
                    "flex-1 sm:flex-none",
                    isDark
                      ? 'bg-slate-800/80 hover:bg-slate-700 text-slate-200 border-slate-600/70'
                      : 'bg-slate-100 hover:bg-slate-200/90 text-gray-700 border-slate-200'
                  )}
                >
                  {isReadingFile ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <PaperclipIcon className="h-4 w-4" />
                  )}
                  {t.chat.loadFile}
                </button>

                <button
                  type="submit"
                  disabled={isSending || (!input.trim() && loadedFiles.length === 0)}
                  className={cn(
                    "h-11 px-4 rounded-xl font-clash font-medium text-sm transition-colors",
                    "inline-flex items-center justify-center gap-2",
                    "disabled:opacity-45 disabled:cursor-not-allowed",
                    "bg-blue-600 hover:bg-blue-700 text-white shadow-sm",
                    "flex-1 sm:flex-none"
                  )}
                >
                  <Send className="h-4 w-4" />
                  {t.chat.send}
                </button>
              </div>
            </div>

            <AnimatePresence>
              {loadedFiles.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className={cn(
                    "mt-2.5 rounded-xl border px-3 py-2.5",
                    isDark ? 'bg-slate-800/65 border-slate-600/70' : 'bg-blue-50/60 border-blue-200/70'
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className={cn("inline-flex items-center gap-2", isDark ? 'text-blue-200' : 'text-blue-700')}>
                      <span
                        className={cn(
                          "inline-flex items-center justify-center w-6 h-6 rounded-full",
                          isDark ? 'bg-blue-500/20 text-blue-300' : 'bg-blue-100 text-blue-700'
                        )}
                      >
                        <PaperclipIcon className="w-3.5 h-3.5" />
                      </span>
                      <span className="text-sm font-clash font-medium">
                        {loadedFiles.length} {getAttachmentLabel(loadedFiles.length)}
                      </span>
                    </div>
                    <span className={cn("text-xs font-medium", isDark ? 'text-slate-300' : 'text-blue-700/80')}>
                      {formatFileSize(totalLoadedSize)}
                    </span>
                  </div>

                  <div className="mt-2 flex flex-wrap gap-2">
                    {loadedFiles.map((file, index) => (
                      <motion.div
                        key={`${file.name}-${index}`}
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        className={cn(
                          "inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1.5 rounded-full text-xs font-medium",
                          isDark
                            ? 'bg-slate-700/80 text-slate-200 border border-slate-600/60'
                            : 'bg-white text-gray-700 border border-gray-200/90'
                        )}
                      >
                        {fileTypeIcon(file.type)}
                        <span>{truncateFileName(file.name)}</span>
                        <span className={cn("text-[10px]", isDark ? 'text-slate-400' : 'text-gray-400')}>
                          {formatFileSize(file.size)}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeFile(index)}
                          className={cn(
                            "ml-0.5 p-0.5 rounded-full transition-colors",
                            isDark
                              ? 'hover:bg-slate-600 text-slate-400 hover:text-slate-200'
                              : 'hover:bg-gray-200 text-gray-400 hover:text-gray-600'
                          )}
                          title={t.chat.removeFile}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className={cn(
              "mt-2.5 flex items-center justify-between border-t pt-2 text-xs",
              isDark ? 'border-slate-700/60 text-slate-400' : 'border-gray-200/80 text-gray-500'
            )}>
              <div className="flex items-center gap-2">
                <div className={cn(
                  "w-2 h-2 rounded-full",
                  isReadingFile ? 'bg-yellow-500 animate-pulse' : 'bg-emerald-500'
                )} />
                <span>{isReadingFile ? t.chat.fileProcessing : t.chat.ready}</span>
              </div>
              {isSending && <span className="animate-pulse">{t.chat.drafting}</span>}
            </div>
          </div>
        </form>
      </div>
    </main>
  );
}
