import { useEffect, useState, useCallback, useRef } from 'react';
import { v4 as uuid } from 'uuid';
import ChatInterface from '@/components/chat/chat-interface';
import { AIProviderSwitch } from '@/components/ai-provider-switch';
import { useAuth } from '@/contexts/auth-context';
import { useTheme } from '@/contexts/theme-context';
import { useLanguage } from '@/contexts/language-context';
import { generateStreamingChat, KingsleyMode } from '@/lib/ai-service';
import { config } from '@/lib/config';
import { useToast } from '@/hooks/use-toast';
import { Message } from '@/types/message';

const ERROR_MESSAGES = [
  "Objection! All my neural pathways are currently in recess. Even AI lawyers need a break sometimes. Please try again in a moment.",
  "Court is temporarily adjourned. My legal circuits are experiencing a brief intermission. I'll be back faster than a Belgian court ruling.",
  "The jury of AI models is currently deliberating... in another dimension. Please retry — justice delayed is not justice denied!",
  "My legal library seems to have misplaced itself. Like a good lawyer, I'll find the right argument — just give me another try.",
  "Brief technical sidebar: all engines are refueling. In the meantime, may I suggest a nice Belgian waffle while you wait?",
];

const getRandomErrorMessage = () =>
  ERROR_MESSAGES[Math.floor(Math.random() * ERROR_MESSAGES.length)];

export default function ChatPage() {
  const { user, continueAsGuest } = useAuth();
  const { theme } = useTheme();
  const { t } = useLanguage();
  const { toast } = useToast();

  const [messages, setMessages] = useState<Message[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [mode, setMode] = useState<KingsleyMode>('fast');
  const messagesRef = useRef(messages);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    if (!user) {
      continueAsGuest();
    }
  }, [user, continueAsGuest]);

  const handleModeChange = useCallback((newMode: KingsleyMode) => {
    setMode(newMode);
  }, []);

  const handleSend = useCallback(async (text: string) => {
    if (!text.trim() || isSending) return;

    const userMessage: Message = {
      id: uuid(),
      content: text,
      sender: 'user',
      timestamp: new Date().toISOString(),
      caseId: 'ad-hoc',
    };

    setMessages(prev => [...prev, userMessage]);
    setIsSending(true);
    setStreamingText('');

    try {
      const currentMessages = [...messagesRef.current, userMessage];
      const payloadMessages = currentMessages.map(m => ({
        role: m.sender === 'user' ? ('user' as const) : ('assistant' as const),
        content: m.content,
      }));

      const result = await generateStreamingChat(
        payloadMessages,
        config.defaultSystemPrompt,
        mode,
        (partialText) => {
          setStreamingText(partialText);
        }
      );

      if (result.error || !result.message) {
        // All providers failed — show a beautiful, funny error in the chat
        const aiErrorMessage: Message = {
          id: uuid(),
          content: getRandomErrorMessage(),
          sender: 'assistant',
          timestamp: new Date().toISOString(),
          caseId: 'ad-hoc',
        };
        setMessages(prev => [...prev, aiErrorMessage]);

        toast({
          title: t.chat.errorTitle,
          description: result.error || t.chat.errorDefault,
          variant: 'destructive',
        });
        return;
      }

      const aiMessage: Message = {
        id: uuid(),
        content: result.message,
        sender: 'assistant',
        timestamp: new Date().toISOString(),
        caseId: 'ad-hoc',
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error: any) {
      // Unexpected error — still show something in the chat
      const aiErrorMessage: Message = {
        id: uuid(),
        content: getRandomErrorMessage(),
        sender: 'assistant',
        timestamp: new Date().toISOString(),
        caseId: 'ad-hoc',
      };
      setMessages(prev => [...prev, aiErrorMessage]);

      toast({
        title: t.chat.errorTitle,
        description: error?.message || t.chat.errorDefault,
        variant: 'destructive',
      });
    } finally {
      setIsSending(false);
      setStreamingText('');
    }
  }, [isSending, toast, mode, t]);

  const handleClear = () => setMessages([]);

  const handleFileUpload = (_files: File[]) => {
    toast({ title: t.chat.fileUploadSoon, description: t.chat.fileUploadSoonDesc });
  };

  const isDark = theme === 'dark';

  return (
    <div className={`min-h-screen ${isDark ? 'dark-bg' : 'sophisticated-bg'} pb-10`}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-10">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className={`text-sm font-clash ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>{t.chat.pageSubtitle}</p>
            <h1 className={`text-3xl font-clash font-semibold ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>{t.chat.pageTitle}</h1>
          </div>
          <div className="flex items-center gap-3">
            <AIProviderSwitch
              currentProvider="openrouter"
              onProviderChange={() => {}}
              mode={mode}
              onModeChange={handleModeChange}
            />
            <button
              onClick={handleClear}
              className={`${isDark ? 'bg-slate-700 text-slate-100 hover:bg-slate-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'} px-3 py-2 rounded-lg text-sm font-clash transition-colors`}
            >
              {t.chat.reset}
            </button>
          </div>
        </div>

        <div className={`${isDark ? 'dark-executive-card' : 'executive-card'} rounded-2xl shadow-lg border border-transparent`}>
          <ChatInterface
            messages={messages}
            onSend={handleSend}
            onClearChat={handleClear}
            onFileUpload={handleFileUpload}
            isSending={isSending}
            streamingText={streamingText}
            userName={user?.displayName || user?.email?.split('@')[0] || t.chat.defaultUser}
          />
        </div>
      </div>
    </div>
  );
}
