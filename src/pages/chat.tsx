import { useEffect, useState, useCallback, useRef } from 'react';
import { v4 as uuid } from 'uuid';
import { gsap } from 'gsap';
import ChatInterface from '@/components/chat/chat-interface';
import { AIProviderSwitch } from '@/components/ai-provider-switch';
import { SaveChatButton } from '@/components/chat/save-chat-button';
import { useAuth } from '@/contexts/auth-context';
import { useTheme } from '@/contexts/theme-context';
import { useLanguage } from '@/contexts/language-context';
import { generateStreamingChat, KingsleyMode } from '@/lib/ai-service';
import { config } from '@/lib/config';
import { useToast } from '@/hooks/use-toast';
import { Message } from '@/types/message';
import { LoadedFile, buildFileContext, formatFileSize } from '@/lib/file-reader';

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
  const { t, language } = useLanguage();
  const { toast } = useToast();

  const [messages, setMessages] = useState<Message[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [mode, setMode] = useState<KingsleyMode>('fast');
  const messagesRef = useRef(messages);
  const subtitleRef = useRef<HTMLParagraphElement>(null);
  const titleWordRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const accentLineRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    if (!user) {
      continueAsGuest();
    }
  }, [user, continueAsGuest]);

  useEffect(() => {
    const titleWords = titleWordRefs.current.filter(Boolean) as HTMLSpanElement[];
    const timeline = gsap.timeline({
      defaults: { ease: 'power3.out' },
    });

    if (subtitleRef.current) {
      timeline.fromTo(
        subtitleRef.current,
        { opacity: 0, y: 10, filter: 'blur(6px)' },
        { opacity: 1, y: 0, filter: 'blur(0px)', duration: 0.65 }
      );
    }

    if (titleWords.length > 0) {
      timeline.fromTo(
        titleWords,
        { opacity: 0, y: 18, rotateX: 24, transformOrigin: '50% 100%' },
        { opacity: 1, y: 0, rotateX: 0, duration: 0.7, stagger: 0.06 },
        '-=0.3'
      );
    }

    if (accentLineRef.current) {
      timeline.fromTo(
        accentLineRef.current,
        { scaleX: 0, opacity: 0.5, transformOrigin: '0% 50%' },
        { scaleX: 1, opacity: 1, duration: 0.75 },
        '-=0.45'
      );
    }

    return () => {
      timeline.kill();
    };
  }, [t.chat.pageSubtitle, t.chat.pageTitle]);

  const handleModeChange = useCallback((newMode: KingsleyMode) => {
    setMode(newMode);
  }, []);

  const handleSend = useCallback(async (text: string, files?: LoadedFile[]) => {
    if (!text.trim() && (!files || files.length === 0)) return;
    if (isSending) return;

    // Build display content with file badges prefix
    let displayContent = '';
    if (files && files.length > 0) {
      const fileBadges = files.map(f => `${f.name} (${formatFileSize(f.size)})`).join(' | ');
      displayContent = `[FILES: ${fileBadges}]\n${text}`;
    } else {
      displayContent = text;
    }

    const userMessage: Message = {
      id: uuid(),
      content: displayContent,
      sender: 'user',
      timestamp: new Date().toISOString(),
      caseId: 'ad-hoc',
    };

    setMessages(prev => [...prev, userMessage]);
    setIsSending(true);
    setStreamingText('');

    try {
      // Build AI payload with file context prepended
      let aiUserContent = text;
      if (files && files.length > 0) {
        const fileContext = buildFileContext(files);
        aiUserContent = `${fileContext}\n\nUser message: ${text}`;
      }

      const currentMessages = [...messagesRef.current, { ...userMessage, content: aiUserContent }];
      const payloadMessages = currentMessages.map(m => ({
        role: m.sender === 'user' ? ('user' as const) : ('assistant' as const),
        content: m.content,
      }));

      const langName = language === 'fr' ? 'French' : 'English';
      const langPrompt = `[LANGUAGE DIRECTIVE: The user's interface is set to ${langName}. You MUST respond entirely in ${langName}. Do not mix languages.]\n\n${config.defaultSystemPrompt}`;

      const result = await generateStreamingChat(
        payloadMessages,
        langPrompt,
        mode,
        (partialText) => {
          setStreamingText(partialText);
        }
      );

      if (result.error || !result.message) {
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
  }, [isSending, toast, mode, t, language]);

  const handleClear = () => setMessages([]);

  const isDark = theme === 'dark';

  return (
    <div className={`min-h-screen ${isDark ? 'dark-bg' : 'sophisticated-bg'} pb-10`}>
      <div className="max-w-6xl mx-auto px-3 sm:px-6 lg:px-8 pt-6 sm:pt-10">
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <p
              ref={subtitleRef}
              className={`text-sm font-clash tracking-[0.08em] ${isDark ? 'text-slate-400' : 'text-gray-500'}`}
            >
              {t.chat.pageSubtitle}
            </p>
            <h1 className={`text-3xl sm:text-4xl font-clash font-semibold ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>
              {t.chat.pageTitle.split(' ').map((word, index) => (
                <span
                  key={`${word}-${index}`}
                  ref={(el) => {
                    titleWordRefs.current[index] = el;
                  }}
                  className="inline-block will-change-transform mr-[0.32ch] last:mr-0"
                >
                  {word}
                </span>
              ))}
            </h1>
            <div
              ref={accentLineRef}
              className={`mt-2 h-px w-44 ${isDark ? 'bg-slate-600/80' : 'bg-slate-300/90'}`}
            />
          </div>
          <div className="flex w-full flex-nowrap items-center gap-1.5 sm:gap-2 lg:w-auto lg:justify-end">
            <div className="min-w-0 flex-1 sm:min-w-[12rem]">
              <AIProviderSwitch
                currentProvider="openrouter"
                onProviderChange={() => {}}
                mode={mode}
                onModeChange={handleModeChange}
              />
            </div>
            <div className="shrink-0">
              <SaveChatButton messages={messages} />
            </div>
            <button
              onClick={handleClear}
              className={`${isDark ? 'bg-slate-700 text-slate-100 hover:bg-slate-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'} inline-flex h-10 shrink-0 items-center justify-center px-3 sm:px-4 rounded-xl text-sm font-clash transition-colors`}
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
            isSending={isSending}
            streamingText={streamingText}
            userName={user?.displayName || user?.email?.split('@')[0] || t.chat.defaultUser}
          />
        </div>
      </div>
    </div>
  );
}
