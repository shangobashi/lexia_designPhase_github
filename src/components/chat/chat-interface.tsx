import { useState, useRef, useEffect } from 'react';
import { PaperclipIcon } from 'lucide-react';
import { useTheme } from '@/contexts/theme-context';
import { useToast } from '@/hooks/use-toast';
import { Message } from '@/types/message';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface ChatInterfaceProps {
  messages: Message[];
  onSend: (message: string) => void;
  onClearChat: () => void;
  onFileUpload: (files: File[]) => void;
}

export default function ChatInterface({ messages, onSend, onClearChat, onFileUpload }: ChatInterfaceProps) {
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const { theme } = useTheme();
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      onSend(input);
      setInput('');
    }
  };

  const handleFileClick = () => fileInputRef.current?.click();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      onFileUpload(files);
      e.target.value = '';
      toast({ title: `${files.length} fichier(s) ajoutAcs`, description: files.map(f => f.name).join(', ') });
    }
  };

  return (
    <main className="flex-1 flex flex-col h-full">
      <div className="chat-container flex-1 p-6 space-y-4">
        {messages.length === 0 ? (
          <div className={`text-center py-16 rounded-2xl border ${theme === 'dark' ? 'border-slate-700/50 bg-slate-900/40 text-slate-200' : 'border-gray-200 bg-white/70 text-gray-600'}`}>
            <p className="text-lg font-clash mb-2">Posez votre question juridique</p>
            <p className="text-sm">Choisissez un fournisseur, puis envoyez un message pour dAcmarrer.</p>
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
                    "flex items-start space-x-3",
                    message.sender === 'user' ? "justify-end" : "justify-start"
                  )}
                >
                  {message.sender === 'assistant' && (
                    <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
                      </svg>
                    </div>
                  )}
                  <div className={cn(
                    message.sender === 'user'
                      ? `${theme === 'dark' ? 'dark-chat-message-user' : 'chat-message-user'} max-w-2xl rounded-tr-md`
                      : `${theme === 'dark' ? 'dark-chat-message-ai' : 'chat-message-ai'} max-w-3xl rounded-tl-md`
                  )}>
                    <div className={`${theme === 'dark' ? 'text-slate-100' : 'text-gray-800'}`}>{message.content}</div>
                  </div>
                  {message.sender === 'user' && (
                    <div className={`w-8 h-8 ${theme === 'dark' ? 'bg-slate-600/50' : 'bg-gray-300'} rounded-full flex items-center justify-center flex-shrink-0`}>
                      <span className={`${theme === 'dark' ? 'text-slate-200' : 'text-gray-600'} font-clash font-semibold text-sm`}>Vous</span>
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <div className={`border-t ${theme === 'dark' ? 'border-slate-700/50 bg-slate-900/30' : 'border-gray-200/50 bg-white/70'} p-4 backdrop-blur-md`}>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="flex items-end space-x-3">
            <div className="flex-1 relative">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Decrivez votre question ou votre dossier..."
                className={`${theme === 'dark' ? 'dark-chat-input' : 'chat-input'} w-full px-4 py-3 rounded-2xl focus:outline-none resize-none`}
                rows={2}
              />
              <button
                type="button"
                onClick={handleFileClick}
                className={`absolute right-3 bottom-3 p-2 rounded-lg transition-colors ${theme === 'dark' ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/40' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}
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
              disabled={isTyping || !input.trim()}
              className={`${theme === 'dark' ? 'dark-primary-button' : 'primary-button'} text-white px-5 py-3 rounded-xl font-clash font-medium disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              Envoyer
            </button>
          </div>
          <div className={`flex items-center justify-between mt-1 text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-gray-500'}`}>
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 ${theme === 'dark' ? 'bg-green-400' : 'bg-green-500'} rounded-full`}></div>
              <span>PrA*t</span>
            </div>
            {isTyping && <span>RAdaction en cours...</span>}
          </div>
        </form>
      </div>
    </main>
  );
}
