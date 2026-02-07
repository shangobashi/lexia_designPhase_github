import { useState, useRef, useEffect } from 'react';
import { PaperclipIcon, Send } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { useTheme } from '@/contexts/theme-context';
import { useLanguage } from '@/contexts/language-context';
import { useToast } from '@/hooks/use-toast';
import { Message } from '@/types/message';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface ChatInterfaceProps {
  messages: Message[];
  onSend: (message: string) => void;
  onClearChat: () => void;
  onFileUpload: (files: File[]) => void;
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

export default function ChatInterface({ messages, onSend, onClearChat, onFileUpload, isSending = false, streamingText = '', userName = '' }: ChatInterfaceProps) {
  const [input, setInput] = useState('');
  const { theme } = useTheme();
  const { t } = useLanguage();
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingText]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isSending) {
      onSend(input);
      setInput('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (input.trim() && !isSending) {
        onSend(input);
        setInput('');
      }
    }
  };

  const handleFileClick = () => fileInputRef.current?.click();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      onFileUpload(files);
      e.target.value = '';
      toast({ title: `${files.length} ${t.chat.filesAdded}`, description: files.map(f => f.name).join(', ') });
    }
  };

  const isDark = theme === 'dark';

  const userInitials = userName
    ? userName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : '?';

  return (
    <main className="flex-1 flex flex-col h-full overflow-hidden rounded-[1.25rem]">
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4" style={{ minHeight: '400px', maxHeight: '60vh' }}>
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
              {messages.map((message) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className={cn(
                    "flex items-start gap-3",
                    message.sender === 'user' ? "justify-end" : "justify-start"
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
                    message.sender === 'user'
                      ? 'bg-blue-600 text-white rounded-[1.25rem] rounded-br-[0.375rem]'
                      : isDark
                        ? 'bg-slate-700/60 text-slate-100 rounded-[1.25rem] rounded-bl-[0.375rem] border border-slate-600/30'
                        : 'bg-white text-gray-800 rounded-[1.25rem] rounded-bl-[0.375rem] border border-gray-200/80 shadow-sm'
                  )}>
                    {message.sender === 'assistant' ? (
                      <MarkdownContent content={message.content} isDark={isDark} />
                    ) : (
                      <div className="whitespace-pre-wrap">{message.content}</div>
                    )}
                  </div>
                  {message.sender === 'user' && (
                    <div className={cn(
                      "w-8 h-8 rounded-[0.625rem] flex items-center justify-center flex-shrink-0 mt-1",
                      isDark ? 'bg-slate-600' : 'bg-gray-200'
                    )}>
                      <span className={cn("font-clash font-semibold text-xs", isDark ? 'text-slate-200' : 'text-gray-600')}>{userInitials}</span>
                    </div>
                  )}
                </motion.div>
              ))}
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
            <div ref={messagesEndRef} />
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
          <div className="flex items-end gap-3">
            <div className="flex-1 relative">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={t.chat.inputPlaceholder}
                className={cn(
                  "w-full px-4 py-3 pr-12 rounded-[1rem] resize-none focus:outline-none focus:ring-2 transition-all text-sm",
                  isDark
                    ? 'bg-slate-800 border border-slate-600/50 text-slate-100 placeholder-slate-500 focus:ring-blue-500/40 focus:border-blue-500/40'
                    : 'bg-gray-50 border border-gray-200 text-gray-800 placeholder-gray-400 focus:ring-blue-500/30 focus:border-blue-400'
                )}
                rows={2}
                disabled={isSending}
              />
              <button
                type="button"
                onClick={handleFileClick}
                className={cn(
                  "absolute right-3 bottom-3 p-1.5 rounded-[0.5rem] transition-colors",
                  isDark
                    ? 'text-slate-500 hover:text-slate-300 hover:bg-slate-700/50'
                    : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                )}
              >
                <PaperclipIcon className="h-4 w-4" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={handleFileChange}
              />
            </div>
            <button
              type="submit"
              disabled={isSending || !input.trim()}
              className={cn(
                "flex items-center gap-2 px-5 py-3 rounded-[0.875rem] font-clash font-medium text-sm transition-all",
                "disabled:opacity-40 disabled:cursor-not-allowed",
                "bg-blue-600 hover:bg-blue-700 text-white shadow-sm hover:shadow-md"
              )}
            >
              <Send className="h-4 w-4" />
              {t.chat.send}
            </button>
          </div>
          <div className={cn("flex items-center justify-between mt-2 text-xs", isDark ? 'text-slate-500' : 'text-gray-400')}>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full" />
              <span>{t.chat.ready}</span>
            </div>
            {isSending && <span className="animate-pulse">{t.chat.drafting}</span>}
          </div>
        </form>
      </div>
    </main>
  );
}
