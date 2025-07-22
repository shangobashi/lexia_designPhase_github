import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { SendHorizontal, PaperclipIcon, MicIcon, Trash2 } from 'lucide-react';
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

export default function ChatInterface({
  messages,
  onSend,
  onClearChat,
  onFileUpload,
}: ChatInterfaceProps) {
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

  const handleFileClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      onFileUpload(files);
      
      // Reset the input
      e.target.value = '';
      
      toast({
        title: `${files.length} file(s) uploaded`,
        description: `${files.map(f => f.name).join(', ')}`,
      });
    }
  };

  return (
    <main className="flex-1 flex flex-col h-full">
      {/* Chat Messages */}
      <div className="chat-container flex-1 p-6 space-y-4">
        {messages.length === 0 ? (
          <div className="flex items-start space-x-3">
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
              </svg>
            </div>
            <div className="chat-message-ai dark:dark-chat-message-ai max-w-3xl p-4 rounded-2xl rounded-tl-md">
              <p className="text-gray-800 dark:text-slate-100 mb-2"><strong>Bonjour!</strong></p>
              <p className="text-gray-700 dark:text-slate-200">Je suis votre assistant juridique IA spécialisé en droit belge. Je peux vous aider avec:</p>
              <ul className="list-disc list-inside mt-3 text-gray-700 dark:text-slate-200 space-y-1">
                <li>Questions de droit des contrats</li>
                <li>Droit immobilier et transactions</li>
                <li>Droit du travail et procédures</li>
                <li>Succession et planification patrimoniale</li>
                <li>Création d'entreprise et statuts</li>
              </ul>
              <p className="text-gray-700 dark:text-slate-200 mt-3">Comment puis-je vous assister aujourd'hui?</p>
            </div>
          </div>
        ) : (
          <>
            <AnimatePresence initial={false}>
              {messages.map((message) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
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
                  
                  <div
                    className={cn(
                      "p-4 rounded-2xl",
                      message.sender === 'user'
                        ? "chat-message-user dark:dark-chat-message-user max-w-2xl rounded-tr-md"
                        : "chat-message-ai dark:dark-chat-message-ai max-w-3xl rounded-tl-md"
                    )}
                  >
                    <div className="text-gray-800 dark:text-slate-100">{message.content}</div>
                    
                    {message.files && message.files.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-border/50">
                        <p className="text-xs font-semibold mb-1">Pièces jointes :</p>
                        <div className="flex flex-wrap gap-2">
                          {message.files.map((file, index) => (
                            <div 
                              key={index} 
                              className="flex items-center bg-background/20 rounded px-2 py-1 text-xs"
                            >
                              <PaperclipIcon className="h-3 w-3 mr-1" />
                              {file.name}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {message.sender === 'user' && (
                    <div className="w-8 h-8 bg-gray-300 dark:bg-slate-600/50 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-gray-600 dark:text-slate-200 font-semibold text-sm">U</span>
                    </div>
                  )}
                </motion.div>
              ))}
              
              {isTyping && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-start space-x-3"
                >
                  <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
                    </svg>
                  </div>
                  <div className="chat-message-ai dark:dark-chat-message-ai p-4 rounded-2xl rounded-tl-md">
                    <div className="flex space-x-1 items-center">
                      <div className="w-2 h-2 bg-blue-500 dark:bg-blue-400 rounded-full typing-indicator dark:dark-typing-indicator"></div>
                      <div className="w-2 h-2 bg-blue-500 dark:bg-blue-400 rounded-full typing-indicator dark:dark-typing-indicator" style={{animationDelay: '0.3s'}}></div>
                      <div className="w-2 h-2 bg-blue-500 dark:bg-blue-400 rounded-full typing-indicator dark:dark-typing-indicator" style={{animationDelay: '0.6s'}}></div>
                      <span className="text-gray-600 dark:text-slate-300 text-sm ml-2">LexiA rédige votre réponse...</span>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            <div ref={messagesEndRef} />
          </>
        )}
      </div>
      
      {/* Chat Input */}
      <div className="border-t border-gray-200/50 dark:border-slate-700/50 p-4 bg-white/50 dark:bg-slate-900/30 backdrop-blur-md">
        <div className="max-w-4xl mx-auto">
          <form onSubmit={handleSubmit} className="flex items-end space-x-3">
            <input
              type="file"
              ref={fileInputRef}
              multiple
              onChange={handleFileChange}
              className="hidden"
            />
            
            <div className="flex-1">
              <textarea 
                rows={3} 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                className="chat-input dark:dark-chat-input w-full px-4 py-3 rounded-2xl focus:outline-none resize-none" 
                placeholder="Posez votre question juridique..."
              />
            </div>
            <div className="flex flex-col space-y-2">
              <button 
                type="submit" 
                disabled={!input.trim()}
                className="primary-button dark:dark-primary-button text-white p-3 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/>
                </svg>
              </button>
              <button 
                type="button" 
                onClick={handleFileClick}
                className="p-3 text-gray-400 dark:text-slate-400 hover:text-gray-600 dark:hover:text-slate-300 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"/>
                </svg>
              </button>
            </div>
          </form>
          <div className="flex items-center justify-between mt-2 text-xs text-gray-500 dark:text-slate-400">
            <div className="flex items-center space-x-4">
              <span>Appuyez sur Entrée pour envoyer</span>
              <span>•</span>
              <span>Shift + Entrée pour nouvelle ligne</span>
            </div>
            <div className="flex items-center space-x-2">
              <span>Propulsé par IA juridique</span>
              <div className="w-2 h-2 bg-green-500 dark:bg-green-400 rounded-full"></div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}