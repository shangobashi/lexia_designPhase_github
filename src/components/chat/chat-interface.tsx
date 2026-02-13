import { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react';
import { PaperclipIcon, Plus, Send, X, FileText, Image, Loader2, Volume2, VolumeX, Mic, Square } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { gsap } from 'gsap';
import { useTheme } from '@/contexts/theme-context';
import { useLanguage } from '@/contexts/language-context';
import { useToast } from '@/hooks/use-toast';
import { useVoice } from '@/hooks/use-voice';
import { useSpeechInput } from '@/hooks/use-speech-input';
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

const COMPOSER_CONTROL_HEIGHT = 44;
const TEXTAREA_MIN_HEIGHT = COMPOSER_CONTROL_HEIGHT;
const TEXTAREA_MAX_HEIGHT = 220;
const COMPOSER_DRAFT_MAX_CHARS = 8000;
const EMPTY_STATE_GLYPH_SEQUENCE = ['[', '{', '(', '<', '|', '/', '-', '\\', '-', '/', '|', '>', ')', '}'];
const EMPTY_STATE_GLYPH_INTERVAL_MS = 230;
const LIVE_VOICE_STORAGE_KEY = 'kingsley-live-voice-enabled';
const PENDING_ATTACHMENT_STORAGE_SUFFIX = ':pending-attachments';
const PENDING_ATTACHMENT_TTL_MS = 1000 * 60 * 60 * 24;
type LegalQualityAssistId = 'assumptions' | 'citations' | 'nextSteps';
type QuickStartId = 'riskScan' | 'timeline' | 'clientBrief';
type VerificationStatus = 'strong' | 'partial' | 'missing';
type VerificationRecommendationId = 'addSources' | 'stateConfidence' | 'surfaceAssumptions' | 'addCounterarguments' | 'addDeadlines';

interface VerificationSnapshot {
  citations: string[];
  confidenceSignals: string[];
  status: VerificationStatus;
}

interface VerificationRecommendation {
  id: VerificationRecommendationId;
  title: string;
  prompt: string;
  priority: number;
}

interface PersistedAttachmentHint {
  name: string;
  size: number;
  type: LoadedFile['type'];
}

interface PersistedAttachmentManifest {
  updatedAt: string;
  files: PersistedAttachmentHint[];
}

interface ChatInterfaceProps {
  messages: Message[];
  onSend: (message: string, files?: LoadedFile[]) => void;
  onClearChat: () => void;
  isSending?: boolean;
  streamingText?: string;
  userName?: string;
  externalDraft?: string;
  onExternalDraftApplied?: () => void;
  draftStorageKey?: string;
  openAttachmentPickerSignal?: number;
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

function buildPendingAttachmentStorageKey(draftStorageKey?: string): string | null {
  if (!draftStorageKey) return null;
  return `${draftStorageKey}${PENDING_ATTACHMENT_STORAGE_SUFFIX}`;
}

function sanitizePersistedAttachmentHints(value: unknown): PersistedAttachmentHint[] {
  if (!Array.isArray(value)) return [];

  return value
    .filter((entry): entry is PersistedAttachmentHint => {
      if (!entry || typeof entry !== 'object') return false;
      const candidate = entry as Partial<PersistedAttachmentHint>;
      return (
        typeof candidate.name === 'string'
        && Number.isFinite(candidate.size)
        && candidate.size >= 0
        && (
          candidate.type === 'text'
          || candidate.type === 'pdf'
          || candidate.type === 'docx'
          || candidate.type === 'image'
        )
      );
    })
    .map((entry) => ({
      name: entry.name,
      size: entry.size,
      type: entry.type,
    }))
    .slice(0, MAX_FILES);
}

function parsePersistedAttachmentManifest(rawValue: string | null): PersistedAttachmentHint[] {
  if (!rawValue) return [];

  try {
    const parsed = JSON.parse(rawValue) as Partial<PersistedAttachmentManifest>;
    if (typeof parsed.updatedAt !== 'string') return [];

    const updatedAtMs = Date.parse(parsed.updatedAt);
    if (Number.isNaN(updatedAtMs)) return [];
    if (Date.now() - updatedAtMs > PENDING_ATTACHMENT_TTL_MS) return [];

    return sanitizePersistedAttachmentHints(parsed.files);
  } catch {
    return [];
  }
}

function buildVerificationSnapshot(content: string): VerificationSnapshot {
  const cleaned = content.replace(/```[\s\S]*?```/g, ' ');
  const citationPatterns = [
    /\b(?:article|art\.?)\s+\d+[a-z0-9\-/.]*/gi,
    /\b(?:code civil|code judiciaire|code penal|code p[ée]nal|rgpd|gdpr|c\.?\s*civ\.?|c\.?\s*jud\.)\b/gi,
    /\b(?:cass\.?|cour de cassation|cjue|cedh)\b/gi,
    /\bhttps?:\/\/[^\s)]+/gi,
  ];
  const confidencePattern = /\b(?:confidence|confiance)\s*[:\-]?\s*(?:high|medium|low|(?:\u00e9|e)lev(?:\u00e9|e)e?|moyen(?:ne)?|faible)\b/gi;
  const standaloneConfidencePattern = /\b(?:high confidence|medium confidence|low confidence|confiance (?:(?:\u00e9|e)lev(?:\u00e9|e)e?)|confiance moyenne|confiance faible)\b/gi;

  const citationSet = new Set<string>();
  citationPatterns.forEach((pattern) => {
    const matches = cleaned.match(pattern) ?? [];
    matches.forEach((match) => {
      const normalized = match.trim();
      if (normalized.length >= 4) {
        citationSet.add(normalized);
      }
    });
  });

  const confidenceSignals = [
    ...(cleaned.match(confidencePattern) ?? []),
    ...(cleaned.match(standaloneConfidencePattern) ?? []),
  ].map((signal) => signal.trim());

  const citations = Array.from(citationSet).slice(0, 4);
  const uniqueConfidenceSignals = Array.from(new Set(confidenceSignals)).slice(0, 3);

  const status: VerificationStatus = (
    citations.length > 0 && uniqueConfidenceSignals.length > 0
      ? 'strong'
      : (citations.length > 0 || uniqueConfidenceSignals.length > 0)
        ? 'partial'
        : 'missing'
  );

  return {
    citations,
    confidenceSignals: uniqueConfidenceSignals,
    status,
  };
}

function buildVerificationRecommendations(
  content: string,
  snapshot: VerificationSnapshot,
  t: {
    chat: {
      verification: {
        recommendations: {
          items: Record<VerificationRecommendationId, { title: string; prompt: string }>;
        };
      };
    };
  }
): VerificationRecommendation[] {
  const lowered = content.toLowerCase();
  const hasCounterarguments = /\b(counter-argument|counterargument|opposing argument|adverse position|defense argument|contre-argument|argument adverse|moyen adverse)\b/i.test(content);
  const hasDeadlines = /\b(deadline|time limit|limitation period|prescription|due date|échéance|délai)\b/i.test(content);
  const hasAssumptions = /\b(assumption|assuming|hypoth[eè]se|supposons|on suppose)\b/i.test(content);
  const mentionsRisk = /\b(risk|risque|exposure|liability|responsabilit[eé])\b/i.test(content);
  const mentionsProcedure = /\b(procedure|proc[eé]dure|appeal|recours|filing|notification)\b/i.test(content);

  const candidates: VerificationRecommendation[] = [];
  const items = t.chat.verification.recommendations.items;

  if (snapshot.citations.length === 0) {
    candidates.push({
      id: 'addSources',
      title: items.addSources.title,
      prompt: items.addSources.prompt,
      priority: 100,
    });
  }

  if (snapshot.confidenceSignals.length === 0) {
    candidates.push({
      id: 'stateConfidence',
      title: items.stateConfidence.title,
      prompt: items.stateConfidence.prompt,
      priority: 90,
    });
  }

  if (!hasAssumptions && (snapshot.status !== 'strong' || mentionsRisk)) {
    candidates.push({
      id: 'surfaceAssumptions',
      title: items.surfaceAssumptions.title,
      prompt: items.surfaceAssumptions.prompt,
      priority: 70,
    });
  }

  if (!hasCounterarguments && (mentionsRisk || mentionsProcedure)) {
    candidates.push({
      id: 'addCounterarguments',
      title: items.addCounterarguments.title,
      prompt: items.addCounterarguments.prompt,
      priority: 65,
    });
  }

  if (!hasDeadlines && (mentionsProcedure || lowered.includes('court') || lowered.includes('tribunal'))) {
    candidates.push({
      id: 'addDeadlines',
      title: items.addDeadlines.title,
      prompt: items.addDeadlines.prompt,
      priority: 55,
    });
  }

  return candidates.sort((a, b) => b.priority - a.priority).slice(0, 3);
}

export default function ChatInterface({
  messages,
  onSend,
  onClearChat,
  isSending = false,
  streamingText = '',
  userName = '',
  externalDraft,
  onExternalDraftApplied,
  draftStorageKey,
  openAttachmentPickerSignal = 0,
}: ChatInterfaceProps) {
  const [input, setInput] = useState('');
  const [loadedFiles, setLoadedFiles] = useState<LoadedFile[]>([]);
  const [isReadingFile, setIsReadingFile] = useState(false);
  const [emptyGlyph, setEmptyGlyph] = useState(EMPTY_STATE_GLYPH_SEQUENCE[0]);
  const [interimVoiceTranscript, setInterimVoiceTranscript] = useState('');
  const [restoredAttachmentHints, setRestoredAttachmentHints] = useState<PersistedAttachmentHint[]>([]);
  const [isLiveVoiceEnabled, setIsLiveVoiceEnabled] = useState(() => {
    if (typeof window === 'undefined') return true;
    const storedValue = window.localStorage.getItem(LIVE_VOICE_STORAGE_KEY);
    return storedValue ? storedValue === '1' : true;
  });
  const { theme } = useTheme();
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const {
    activeMessageId,
    isLoading: isVoiceLoading,
    isPlaying: isVoicePlaying,
    error: voiceError,
    play: playVoice,
    stop: stopVoice,
  } = useVoice();
  const isDark = theme === 'dark';
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const emptyStateRef = useRef<HTMLDivElement>(null);
  const emptyGlowOneRef = useRef<HTMLDivElement>(null);
  const emptyGlowTwoRef = useRef<HTMLDivElement>(null);
  const emptyIconRef = useRef<HTMLDivElement>(null);
  const emptyTitleRef = useRef<HTMLParagraphElement>(null);
  const emptySubtitleRef = useRef<HTMLParagraphElement>(null);
  const autoPlayedMessageIdsRef = useRef<Set<string>>(new Set());
  const voiceWasPlayingRef = useRef(false);
  const didHydrateDraftRef = useRef(false);
  const handledAttachmentPickerSignalRef = useRef(0);
  const pendingAttachmentStorageKey = buildPendingAttachmentStorageKey(draftStorageKey);

  const {
    isSupported: isSpeechInputSupported,
    isListening: isSpeechInputListening,
    isTranscribing: isSpeechInputTranscribing,
    errorCode: speechInputError,
    startListening: startSpeechInput,
    stopListening: stopSpeechInput,
  } = useSpeechInput({
    language,
    onInterimTranscript: setInterimVoiceTranscript,
    onFinalTranscript: (transcript) => {
      const composedMessage = [input.trim(), transcript.trim()].filter(Boolean).join(' ');
      if (!composedMessage) return;

      const sent = submitOutgoingMessage(composedMessage, loadedFiles, { allowDuringSpeechCapture: true });
      if (!sent) {
        setInput(composedMessage);
      }
    },
  });

  const clearPendingAttachmentManifest = useCallback(() => {
    if (!pendingAttachmentStorageKey || typeof window === 'undefined') return;
    window.localStorage.removeItem(pendingAttachmentStorageKey);
  }, [pendingAttachmentStorageKey]);

  const persistPendingAttachmentManifest = useCallback((files: LoadedFile[]) => {
    if (!pendingAttachmentStorageKey || typeof window === 'undefined') return;
    if (files.length === 0) {
      window.localStorage.removeItem(pendingAttachmentStorageKey);
      return;
    }

    const payload: PersistedAttachmentManifest = {
      updatedAt: new Date().toISOString(),
      files: files.slice(0, MAX_FILES).map((file) => ({
        name: file.name,
        size: file.size,
        type: file.type,
      })),
    };
    window.localStorage.setItem(pendingAttachmentStorageKey, JSON.stringify(payload));
  }, [pendingAttachmentStorageKey]);

  const submitOutgoingMessage = useCallback((
    messageText: string,
    filesToSend: LoadedFile[] = loadedFiles,
    options?: { allowDuringSpeechCapture?: boolean },
  ) => {
    const trimmedMessage = messageText.trim();
    const isSpeechBusy = isSpeechInputListening || isSpeechInputTranscribing;
    if (
      (!trimmedMessage && filesToSend.length === 0)
      || isSending
      || (isSpeechBusy && !options?.allowDuringSpeechCapture)
    ) {
      return false;
    }

    onSend(trimmedMessage, filesToSend.length > 0 ? filesToSend : undefined);
    setInput('');
    setLoadedFiles([]);
    setRestoredAttachmentHints([]);
    clearPendingAttachmentManifest();
    if (draftStorageKey && typeof window !== 'undefined') {
      window.localStorage.removeItem(draftStorageKey);
    }
    return true;
  }, [
    clearPendingAttachmentManifest,
    draftStorageKey,
    isSending,
    isSpeechInputListening,
    isSpeechInputTranscribing,
    loadedFiles,
    onSend,
  ]);

  const persistDraft = useCallback((value: string) => {
    if (!draftStorageKey || typeof window === 'undefined') return;

    const normalized = value.slice(0, COMPOSER_DRAFT_MAX_CHARS);
    if (!normalized.trim()) {
      window.localStorage.removeItem(draftStorageKey);
      return;
    }
    window.localStorage.setItem(draftStorageKey, normalized);
  }, [draftStorageKey]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingText]);

  useEffect(() => {
    if (!externalDraft) return;
    setInput((previousValue) => {
      if (!previousValue.trim()) {
        return externalDraft;
      }
      return `${previousValue.trimEnd()}\n\n${externalDraft}`;
    });
    onExternalDraftApplied?.();
    requestAnimationFrame(() => {
      textareaRef.current?.focus();
    });
  }, [externalDraft, onExternalDraftApplied]);

  useEffect(() => {
    if (openAttachmentPickerSignal <= 0) return;
    if (handledAttachmentPickerSignalRef.current === openAttachmentPickerSignal) return;
    handledAttachmentPickerSignalRef.current = openAttachmentPickerSignal;
    fileInputRef.current?.click();
  }, [openAttachmentPickerSignal]);

  useEffect(() => {
    didHydrateDraftRef.current = false;
  }, [draftStorageKey]);

  useEffect(() => {
    setRestoredAttachmentHints([]);
  }, [pendingAttachmentStorageKey]);

  useEffect(() => {
    if (!draftStorageKey || typeof window === 'undefined') {
      didHydrateDraftRef.current = true;
      return;
    }
    if (didHydrateDraftRef.current) return;

    const storedDraft = window.localStorage.getItem(draftStorageKey);
    if (storedDraft) {
      setInput((previousValue) => (
        previousValue.trim()
          ? previousValue
          : storedDraft.slice(0, COMPOSER_DRAFT_MAX_CHARS)
      ));
    }
    didHydrateDraftRef.current = true;
  }, [draftStorageKey]);

  useEffect(() => {
    if (!pendingAttachmentStorageKey || typeof window === 'undefined') return;

    const rawManifest = window.localStorage.getItem(pendingAttachmentStorageKey);
    const parsedManifest = parsePersistedAttachmentManifest(rawManifest);
    if (rawManifest && parsedManifest.length === 0) {
      window.localStorage.removeItem(pendingAttachmentStorageKey);
    }
    setRestoredAttachmentHints(parsedManifest);
  }, [pendingAttachmentStorageKey]);

  useEffect(() => {
    if (!didHydrateDraftRef.current) return;
    persistDraft(input);
  }, [input, persistDraft]);

  useEffect(() => {
    if (!draftStorageKey || typeof document === 'undefined') return;

    // Persist draft when tab visibility changes to reduce data loss on lifecycle transitions.
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        persistDraft(input);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [draftStorageKey, input, persistDraft]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (loadedFiles.length === 0) return;

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [loadedFiles.length]);

  useEffect(() => {
    if (!voiceError) return;
    toast({
      title: t.chat.voiceError,
      description: voiceError,
      variant: 'destructive',
    });
  }, [voiceError, toast, t.chat.voiceError]);

  useEffect(() => {
    if (!speechInputError || speechInputError === 'aborted') return;

    const speechErrorDescription = (() => {
      switch (speechInputError) {
        case 'not-supported':
          return t.chat.voiceInputUnsupported;
        case 'not-allowed':
          return t.chat.voiceInputPermissionDenied;
        case 'audio-capture':
          return t.chat.voiceInputCaptureError;
        case 'no-speech':
          return t.chat.voiceInputNoSpeech;
        case 'network':
          return t.chat.voiceInputNetworkError;
        case 'transcription-failed':
          return t.chat.voiceInputTranscriptionError;
        default:
          return t.chat.voiceInputUnexpectedError;
      }
    })();

    toast({
      title: t.chat.voiceInputErrorTitle,
      description: speechErrorDescription,
      variant: 'destructive',
    });
  }, [
    speechInputError,
    toast,
    t.chat.voiceInputCaptureError,
    t.chat.voiceInputErrorTitle,
    t.chat.voiceInputNetworkError,
    t.chat.voiceInputNoSpeech,
    t.chat.voiceInputPermissionDenied,
    t.chat.voiceInputTranscriptionError,
    t.chat.voiceInputUnexpectedError,
    t.chat.voiceInputUnsupported,
  ]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(LIVE_VOICE_STORAGE_KEY, isLiveVoiceEnabled ? '1' : '0');
  }, [isLiveVoiceEnabled]);

  useEffect(() => {
    if (!isLiveVoiceEnabled) return;
    if (isVoiceLoading || isVoicePlaying) return;
    if (isSending || streamingText) return;

    const lastMessage = messages[messages.length - 1];
    if (!lastMessage || lastMessage.sender !== 'assistant') return;
    if (autoPlayedMessageIdsRef.current.has(lastMessage.id)) return;

    autoPlayedMessageIdsRef.current.add(lastMessage.id);
    void playVoice(lastMessage.id, lastMessage.content, language);
  }, [
    isLiveVoiceEnabled,
    isVoiceLoading,
    isVoicePlaying,
    isSending,
    streamingText,
    messages,
    playVoice,
    language,
  ]);

  useEffect(() => {
    if (voiceWasPlayingRef.current && !isVoicePlaying && !isVoiceLoading) {
      textareaRef.current?.focus();
    }
    voiceWasPlayingRef.current = isVoicePlaying;
  }, [isVoicePlaying, isVoiceLoading]);

  useEffect(() => {
    if (messages.length !== 0) return;

    let i = 0;
    const tick = () => {
      setEmptyGlyph(EMPTY_STATE_GLYPH_SEQUENCE[i]);
      i = i === EMPTY_STATE_GLYPH_SEQUENCE.length - 1 ? 0 : i + 1;
    };

    tick();
    const interval = window.setInterval(tick, EMPTY_STATE_GLYPH_INTERVAL_MS);
    return () => window.clearInterval(interval);
  }, [messages.length]);

  useLayoutEffect(() => {
    if (messages.length !== 0) return;
    const container = emptyStateRef.current;
    const glowOne = emptyGlowOneRef.current;
    const glowTwo = emptyGlowTwoRef.current;
    const icon = emptyIconRef.current;
    const title = emptyTitleRef.current;
    const subtitle = emptySubtitleRef.current;
    if (!container || !glowOne || !glowTwo || !icon || !title || !subtitle) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        [icon, title, subtitle],
        { opacity: 0, y: 8 },
        { opacity: 1, y: 0, duration: 0.7, stagger: 0.08, ease: 'power2.out' }
      );

      gsap.to(glowOne, {
        x: 18,
        y: 12,
        scale: 1.08,
        opacity: isDark ? 0.28 : 0.22,
        duration: 8.5,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
      });

      gsap.to(glowTwo, {
        x: -16,
        y: -10,
        scale: 0.92,
        opacity: isDark ? 0.2 : 0.16,
        duration: 9.5,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
      });

      gsap.to(icon, {
        y: -1,
        duration: 5.2,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
      });
    }, container);

    return () => {
      ctx.revert();
    };
  }, [messages.length, isDark]);

  useLayoutEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    // Keep the single-line composer at an exact baseline height so Send aligns perfectly.
    textarea.style.height = `${TEXTAREA_MIN_HEIGHT}px`;
    const measured = textarea.scrollHeight;
    const needsGrowth = measured > TEXTAREA_MIN_HEIGHT + 1;
    const nextHeight = needsGrowth
      ? Math.min(measured, TEXTAREA_MAX_HEIGHT)
      : TEXTAREA_MIN_HEIGHT;
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
    submitOutgoingMessage(input);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submitOutgoingMessage(input);
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
      setLoadedFiles((prev) => {
        const nextFiles = [...prev, ...nextLoadedFiles];
        persistPendingAttachmentManifest(nextFiles);
        return nextFiles;
      });
      setRestoredAttachmentHints([]);
      toast({
        title: t.chat.fileLoaded,
        description: nextLoadedFiles.map((file) => file.name).join(', '),
      });
    }
  };

  const removeFile = (index: number) => {
    setLoadedFiles((prev) => {
      const nextFiles = prev.filter((_, i) => i !== index);
      if (nextFiles.length === 0) {
        clearPendingAttachmentManifest();
        setRestoredAttachmentHints([]);
        return nextFiles;
      }
      persistPendingAttachmentManifest(nextFiles);
      return nextFiles;
    });
  };

  const userInitials = userName
    ? userName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : '?';

  const fileTypeIcon = (type: LoadedFile['type']) => {
    if (type === 'image') return <Image className="w-3.5 h-3.5 flex-shrink-0" />;
    return <FileText className="w-3.5 h-3.5 flex-shrink-0" />;
  };

  const getAttachmentLabel = (count: number) => (count === 1 ? t.chat.attachedFile : t.chat.attachedFilesLabel);
  const totalLoadedSize = loadedFiles.reduce((sum, file) => sum + file.size, 0);
  const hasRecoveredAttachmentReminder = loadedFiles.length === 0 && restoredAttachmentHints.length > 0;
  const attachmentRecoveryDescription = t.chat.attachmentRecoveryDescription.replace(
    '{count}',
    String(restoredAttachmentHints.length)
  );
  const isEmptyState = messages.length === 0;
  const composerPlaceholder = isSpeechInputListening
    ? t.chat.voiceInputListeningPlaceholder
    : isSpeechInputTranscribing
      ? t.chat.voiceInputTranscribingPlaceholder
    : (isVoicePlaying ? t.chat.voiceSpeakingPlaceholder : t.chat.inputPlaceholder);
  const voicePresenceLabel = isVoiceLoading
    ? t.chat.generatingAudio
    : isVoicePlaying
      ? t.chat.voiceSpeaking
      : t.chat.voiceTurnReady;
  const speechPresenceLabel = isSpeechInputTranscribing
    ? t.chat.voiceInputTranscribing
    : isSpeechInputListening
      ? t.chat.voiceInputListening
      : '';
  const lastAssistantMessage = [...messages].reverse().find((message) => message.sender === 'assistant') ?? null;
  const latestVerificationSnapshot = lastAssistantMessage
    ? buildVerificationSnapshot(lastAssistantMessage.content)
    : null;
  const latestVerificationStatusClass = latestVerificationSnapshot?.status === 'strong'
    ? (isDark ? 'bg-emerald-500/15 text-emerald-300 border-emerald-400/30' : 'bg-emerald-50 text-emerald-700 border-emerald-200')
    : latestVerificationSnapshot?.status === 'partial'
      ? (isDark ? 'bg-amber-500/15 text-amber-300 border-amber-400/30' : 'bg-amber-50 text-amber-700 border-amber-200')
      : (isDark ? 'bg-rose-500/15 text-rose-300 border-rose-400/30' : 'bg-rose-50 text-rose-700 border-rose-200');
  const latestVerificationStatusLabel = latestVerificationSnapshot?.status === 'strong'
    ? t.chat.verification.statusStrong
    : latestVerificationSnapshot?.status === 'partial'
      ? t.chat.verification.statusPartial
      : t.chat.verification.statusMissing;
  const latestVerificationHint = latestVerificationSnapshot?.status === 'strong'
    ? t.chat.verification.composerHintStrong
    : latestVerificationSnapshot?.status === 'partial'
      ? t.chat.verification.composerHintPartial
      : t.chat.verification.composerHintMissing;
  const latestVerificationRecommendations = latestVerificationSnapshot && lastAssistantMessage
    ? buildVerificationRecommendations(lastAssistantMessage.content, latestVerificationSnapshot, t)
    : [];

  const toggleLiveVoice = () => {
    setIsLiveVoiceEnabled((previousValue) => {
      const nextValue = !previousValue;
      if (!nextValue) {
        stopVoice();
      }
      return nextValue;
    });
  };

  const handleSpeechInputToggle = () => {
    if (isSpeechInputTranscribing) return;

    if (isSpeechInputListening) {
      stopSpeechInput();
      return;
    }

    if (isVoiceLoading || isVoicePlaying) {
      stopVoice();
    }
    startSpeechInput();
  };

  const applyQualityAssist = (assistId: LegalQualityAssistId) => {
    const templateById: Record<LegalQualityAssistId, string> = {
      assumptions: t.chat.qualityAssistTemplates.assumptions,
      citations: t.chat.qualityAssistTemplates.citations,
      nextSteps: t.chat.qualityAssistTemplates.nextSteps,
    };

    const selectedTemplate = templateById[assistId];
    if (!selectedTemplate) return;

    if (input.includes(selectedTemplate)) {
      toast({
        title: t.chat.qualityAssistAlreadyAddedTitle,
        description: t.chat.qualityAssistAlreadyAddedDescription,
      });
      return;
    }

    const nextInput = [input.trimEnd(), selectedTemplate].filter(Boolean).join('\n\n');
    setInput(nextInput.slice(0, COMPOSER_DRAFT_MAX_CHARS));
    textareaRef.current?.focus();
  };

  const applyQuickStart = (quickStartId: QuickStartId) => {
    const templateById: Record<QuickStartId, string> = {
      riskScan: t.chat.quickStart.templates.riskScan,
      timeline: t.chat.quickStart.templates.timeline,
      clientBrief: t.chat.quickStart.templates.clientBrief,
    };

    const selectedTemplate = templateById[quickStartId];
    if (!selectedTemplate) return;

    const nextInput = [input.trimEnd(), selectedTemplate].filter(Boolean).join('\n\n');
    setInput(nextInput.slice(0, COMPOSER_DRAFT_MAX_CHARS));
    textareaRef.current?.focus();
    toast({
      title: t.chat.quickStart.insertedTitle,
      description: t.chat.quickStart.insertedDescription,
    });
  };

  const applyVerificationFollowUp = (messageContent: string) => {
    const snapshot = buildVerificationSnapshot(messageContent);
    const followUpLines = [
      t.chat.verification.followUpBase,
      snapshot.citations.length === 0
        ? t.chat.verification.followUpNeedCitations
        : t.chat.verification.followUpValidateCitations,
      snapshot.confidenceSignals.length === 0
        ? t.chat.verification.followUpNeedConfidence
        : t.chat.verification.followUpChallengeConfidence,
    ];

    const followUpPrompt = followUpLines.join('\n');
    const nextInput = [input.trimEnd(), followUpPrompt].filter(Boolean).join('\n\n');
    setInput(nextInput.slice(0, COMPOSER_DRAFT_MAX_CHARS));
    textareaRef.current?.focus();
    toast({
      title: t.chat.verification.followUpInsertedTitle,
      description: t.chat.verification.followUpInsertedDescription,
    });
  };

  const applyVerificationRecommendation = (recommendation: VerificationRecommendation) => {
    if (input.includes(recommendation.prompt)) {
      toast({
        title: t.chat.qualityAssistAlreadyAddedTitle,
        description: t.chat.qualityAssistAlreadyAddedDescription,
      });
      return;
    }

    const nextInput = [input.trimEnd(), recommendation.prompt].filter(Boolean).join('\n\n');
    setInput(nextInput.slice(0, COMPOSER_DRAFT_MAX_CHARS));
    textareaRef.current?.focus();
    toast({
      title: t.chat.verification.recommendations.insertedTitle,
      description: t.chat.verification.recommendations.insertedDescription,
    });
  };

  const VoiceOrb = ({ message }: { message: Message }) => {
    if (message.sender !== 'assistant') return null;

    const isActive = activeMessageId === message.id;
    const isThisLoading = isActive && isVoiceLoading;
    const isThisPlaying = isActive && isVoicePlaying;

    const label = isThisPlaying
      ? t.chat.stopListening
      : isThisLoading
        ? t.chat.generatingAudio
        : t.chat.listenToResponse;

    return (
      <div className="mt-2 flex items-center gap-2">
        <motion.button
          type="button"
          onClick={() => {
            if (isThisPlaying || isThisLoading) {
              stopVoice();
              return;
            }
            playVoice(message.id, message.content, language);
          }}
          disabled={isVoiceLoading && !isActive}
          className={cn(
            "relative inline-flex h-8 w-8 items-center justify-center rounded-full transition-colors duration-300",
            isDark
              ? 'bg-slate-700/50 text-slate-400 hover:text-white'
              : 'bg-gray-100/80 text-gray-400 hover:text-gray-700',
            isThisPlaying && (isDark ? 'bg-blue-500/20 text-blue-300' : 'bg-blue-50 text-blue-500'),
            (isVoiceLoading && !isActive) && 'opacity-30 cursor-not-allowed'
          )}
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.95 }}
          title={label}
          aria-label={label}
        >
          <AnimatePresence>
            {isThisPlaying && (
              <motion.span
                className={cn(
                  "absolute inset-0 rounded-full",
                  isDark ? 'border border-blue-400/40' : 'border border-blue-300/50'
                )}
                initial={{ scale: 1, opacity: 0.6 }}
                animate={{ scale: [1, 1.45, 1], opacity: [0.6, 0, 0.6] }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
              />
            )}
          </AnimatePresence>

          {isThisLoading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : isThisPlaying ? (
            <VolumeX className="h-3.5 w-3.5" />
          ) : (
            <Volume2 className="h-3.5 w-3.5" />
          )}
        </motion.button>

        <AnimatePresence>
          {isThisPlaying && (
            <motion.div
              className="flex h-4 items-center gap-[3px]"
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 'auto' }}
              exit={{ opacity: 0, width: 0 }}
              transition={{ duration: 0.3 }}
            >
              {[0, 1, 2, 3, 4].map((i) => (
                <motion.div
                  key={i}
                  className={cn(
                    "w-[3px] rounded-full",
                    isDark ? 'bg-blue-400/70' : 'bg-blue-400/60'
                  )}
                  animate={{
                    height: i % 2 === 0 ? ['4px', '14px', '5px'] : ['4px', '10px', '4px'],
                  }}
                  transition={{
                    duration: i % 2 === 0 ? 0.75 : 0.58,
                    repeat: Infinity,
                    ease: 'easeInOut',
                    delay: i * 0.08,
                  }}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {isThisLoading && (
            <motion.span
              className={cn(
                "text-xs font-clash tracking-wide",
                isDark ? 'text-slate-500' : 'text-gray-400'
              )}
              initial={{ opacity: 0, x: -4 }}
              animate={{ opacity: [0.4, 0.8, 0.4] }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              {t.chat.generatingAudio}
            </motion.span>
          )}
        </AnimatePresence>
      </div>
    );
  };

  return (
    <main className="flex-1 flex flex-col h-full overflow-hidden rounded-[1.25rem]">
      {/* Messages area */}
      <div
        ref={messagesContainerRef}
        className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-6 space-y-4"
      >
        {isEmptyState ? (
          <div className={cn(
            "relative overflow-hidden text-center px-4 sm:px-6 py-7 sm:py-16 rounded-[1.25rem] border min-h-[190px] sm:min-h-[320px] flex items-center justify-center",
            isDark
              ? 'border-slate-700/50 bg-slate-800/40 text-slate-300'
              : 'border-gray-200/80 bg-gray-50/50 text-gray-500'
          )}
          ref={emptyStateRef}
          >
            <div
              ref={emptyGlowOneRef}
              className={cn(
                "pointer-events-none absolute -left-12 -top-14 h-52 w-52 rounded-full blur-3xl",
                isDark ? 'bg-blue-500/20' : 'bg-blue-200/45'
              )}
            />
            <div
              ref={emptyGlowTwoRef}
              className={cn(
                "pointer-events-none absolute -right-10 -bottom-16 h-56 w-56 rounded-full blur-3xl",
                isDark ? 'bg-cyan-500/12' : 'bg-cyan-200/35'
              )}
            />

            <div className="relative z-10">
              <div className="mb-4">
                <div
                  ref={emptyIconRef}
                  className={cn(
                    "w-10 h-10 sm:w-12 sm:h-12 mx-auto rounded-[0.875rem] p-1.5 sm:p-2 flex items-center justify-center border",
                    isDark ? 'bg-slate-900/35 border-slate-600/35' : 'bg-white/85 border-gray-200/80'
                  )}
                >
                  <span
                    role="status"
                    aria-label={t.chat.thinking}
                    className={cn(
                      "inline-flex h-full w-full items-center justify-center font-mono text-[0.98rem] sm:text-[1.1rem] leading-none tracking-[0.01em] transition-colors duration-300",
                      isDark ? "text-slate-300" : "text-slate-600"
                    )}
                  >
                    {emptyGlyph}
                  </span>
                </div>
              </div>
              <p ref={emptyTitleRef} className="text-base sm:text-lg font-clash font-medium mb-2">{t.chat.emptyState.title}</p>
              <p ref={emptySubtitleRef} className="mx-auto max-w-[20rem] text-sm opacity-75">{t.chat.emptyState.subtitle}</p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                <button
                  type="button"
                  onClick={() => applyQuickStart('riskScan')}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                    isDark
                      ? 'border-slate-500/50 bg-slate-800/60 text-slate-200 hover:bg-slate-700/70'
                      : 'border-slate-300 bg-white/95 text-slate-700 hover:bg-slate-100'
                  )}
                >
                  {t.chat.quickStart.actions.riskScan}
                </button>
                <button
                  type="button"
                  onClick={() => applyQuickStart('timeline')}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                    isDark
                      ? 'border-slate-500/50 bg-slate-800/60 text-slate-200 hover:bg-slate-700/70'
                      : 'border-slate-300 bg-white/95 text-slate-700 hover:bg-slate-100'
                  )}
                >
                  {t.chat.quickStart.actions.timeline}
                </button>
                <button
                  type="button"
                  onClick={() => applyQuickStart('clientBrief')}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                    isDark
                      ? 'border-slate-500/50 bg-slate-800/60 text-slate-200 hover:bg-slate-700/70'
                      : 'border-slate-300 bg-white/95 text-slate-700 hover:bg-slate-100'
                  )}
                >
                  {t.chat.quickStart.actions.clientBrief}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <AnimatePresence>
              {messages.map((message) => {
                const isUser = message.sender === 'user';
                const { badges, text } = isUser ? parseFileBadges(message.content) : { badges: [], text: message.content };
                const isActiveVoiceMessage = !isUser && activeMessageId === message.id && isVoicePlaying;
                const verificationSnapshot = !isUser ? buildVerificationSnapshot(message.content) : null;
                const verificationStatusClass = verificationSnapshot?.status === 'strong'
                  ? (isDark ? 'bg-emerald-500/15 text-emerald-300 border-emerald-400/30' : 'bg-emerald-50 text-emerald-700 border-emerald-200')
                  : verificationSnapshot?.status === 'partial'
                    ? (isDark ? 'bg-amber-500/15 text-amber-300 border-amber-400/30' : 'bg-amber-50 text-amber-700 border-amber-200')
                    : (isDark ? 'bg-rose-500/15 text-rose-300 border-rose-400/30' : 'bg-rose-50 text-rose-700 border-rose-200');
                const verificationStatusLabel = verificationSnapshot?.status === 'strong'
                  ? t.chat.verification.statusStrong
                  : verificationSnapshot?.status === 'partial'
                    ? t.chat.verification.statusPartial
                    : t.chat.verification.statusMissing;
                const verificationRecommendations = verificationSnapshot
                  ? buildVerificationRecommendations(message.content, verificationSnapshot, t)
                  : [];

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
                      "px-4 py-3 leading-relaxed text-sm max-w-[88%] sm:max-w-[75%] break-words",
                      isUser
                        ? 'bg-blue-600 text-white rounded-[1.25rem] rounded-br-[0.375rem]'
                        : isDark
                          ? 'bg-slate-700/60 text-slate-100 rounded-[1.25rem] rounded-bl-[0.375rem] border border-slate-600/30'
                          : 'bg-white text-gray-800 rounded-[1.25rem] rounded-bl-[0.375rem] border border-gray-200/80 shadow-sm',
                      !isUser && "transition-shadow duration-500",
                      isActiveVoiceMessage && (
                        isDark
                          ? 'ring-1 ring-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.08)]'
                          : 'ring-1 ring-blue-200/50 shadow-[0_0_15px_rgba(59,130,246,0.06)]'
                      )
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
                          <div className="flex flex-col items-start gap-1.5 text-[10px] font-semibold tracking-[0.12em] uppercase sm:flex-row sm:items-center sm:justify-between">
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
                                className="inline-flex max-w-full min-w-0 items-center gap-1 px-2 py-0.5 rounded-md text-xs bg-white/20 text-white/90"
                              >
                                <FileText className="w-3 h-3 flex-shrink-0" />
                                <span className="max-w-[9rem] truncate sm:max-w-[13rem]">{badge.name}</span>
                                {badge.size && <span className="opacity-70 shrink-0">({badge.size})</span>}
                              </motion.span>
                            ))}
                          </div>
                        </motion.div>
                      )}
                      {message.sender === 'assistant' ? (
                        <>
                          <MarkdownContent content={message.content} isDark={isDark} />
                          {verificationSnapshot && (
                            <div
                              className={cn(
                                "mt-3 rounded-xl border p-2.5",
                                isDark ? 'border-slate-600/70 bg-slate-800/65' : 'border-slate-200 bg-slate-50/70'
                              )}
                            >
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <p className={cn("text-xs font-semibold tracking-wide", isDark ? 'text-slate-200' : 'text-slate-700')}>
                                  {t.chat.verification.title}
                                </p>
                                <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium", verificationStatusClass)}>
                                  {verificationStatusLabel}
                                </span>
                              </div>
                              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                                <div className={cn("rounded-lg border p-2", isDark ? 'border-slate-700 bg-slate-900/40' : 'border-slate-200 bg-white/80')}>
                                  <p className={cn("text-[11px] font-semibold uppercase tracking-[0.08em]", isDark ? 'text-slate-400' : 'text-slate-500')}>
                                    {t.chat.verification.referencesLabel}
                                  </p>
                                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                                    {verificationSnapshot.citations.length > 0 ? verificationSnapshot.citations.map((citation) => (
                                      <span key={citation} className={cn("rounded-md px-2 py-0.5 text-[11px]", isDark ? 'bg-slate-700/70 text-slate-200' : 'bg-slate-100 text-slate-700')}>
                                        {citation}
                                      </span>
                                    )) : (
                                      <span className={cn("text-xs", isDark ? 'text-slate-400' : 'text-slate-500')}>
                                        {t.chat.verification.referencesMissing}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <div className={cn("rounded-lg border p-2", isDark ? 'border-slate-700 bg-slate-900/40' : 'border-slate-200 bg-white/80')}>
                                  <p className={cn("text-[11px] font-semibold uppercase tracking-[0.08em]", isDark ? 'text-slate-400' : 'text-slate-500')}>
                                    {t.chat.verification.confidenceLabel}
                                  </p>
                                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                                    {verificationSnapshot.confidenceSignals.length > 0 ? verificationSnapshot.confidenceSignals.map((signal) => (
                                      <span key={signal} className={cn("rounded-md px-2 py-0.5 text-[11px]", isDark ? 'bg-slate-700/70 text-slate-200' : 'bg-slate-100 text-slate-700')}>
                                        {signal}
                                      </span>
                                    )) : (
                                      <span className={cn("text-xs", isDark ? 'text-slate-400' : 'text-slate-500')}>
                                        {t.chat.verification.confidenceMissing}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => applyVerificationFollowUp(message.content)}
                                className={cn(
                                  "mt-2.5 inline-flex items-center rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors",
                                  isDark
                                    ? 'border-blue-400/40 bg-blue-500/10 text-blue-200 hover:bg-blue-500/20'
                                    : 'border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100'
                                )}
                              >
                                {t.chat.verification.createFollowUp}
                              </button>
                              <div className="mt-2.5">
                                <p className={cn("text-[11px] font-semibold uppercase tracking-[0.08em]", isDark ? 'text-slate-400' : 'text-slate-500')}>
                                  {t.chat.verification.recommendations.label}
                                </p>
                                {verificationRecommendations.length > 0 ? (
                                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                                    {verificationRecommendations.map((recommendation) => (
                                      <button
                                        key={`${message.id}-${recommendation.id}`}
                                        type="button"
                                        onClick={() => applyVerificationRecommendation(recommendation)}
                                        className={cn(
                                          "inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors",
                                          isDark
                                            ? 'border-slate-500/70 bg-slate-700/60 text-slate-100 hover:bg-slate-600/70'
                                            : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
                                        )}
                                      >
                                        {recommendation.title}
                                      </button>
                                    ))}
                                  </div>
                                ) : (
                                  <p className={cn("mt-1.5 text-xs", isDark ? 'text-slate-400' : 'text-slate-500')}>
                                    {t.chat.verification.recommendations.empty}
                                  </p>
                                )}
                              </div>
                            </div>
                          )}
                          <VoiceOrb message={message} />
                        </>
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
                  "px-4 py-3 rounded-[1.25rem] rounded-bl-[0.375rem] text-sm max-w-[88%] sm:max-w-[75%] break-words",
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
        "border-t p-3 sm:p-4",
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
            <div
              className={cn(
                "mb-2.5 rounded-xl border px-2.5 py-2",
                isDark ? 'border-slate-700/70 bg-slate-800/55' : 'border-slate-200 bg-slate-50/75'
              )}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className={cn("text-[11px] font-semibold uppercase tracking-[0.08em]", isDark ? 'text-slate-300' : 'text-slate-700')}>
                  {t.chat.verification.composerLabel}
                </p>
                {latestVerificationSnapshot ? (
                  <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium", latestVerificationStatusClass)}>
                    {latestVerificationStatusLabel}
                  </span>
                ) : (
                  <span className={cn("text-[11px]", isDark ? 'text-slate-400' : 'text-slate-500')}>
                    {t.chat.verification.composerEmpty}
                  </span>
                )}
              </div>
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                <p className={cn("text-xs", isDark ? 'text-slate-400' : 'text-slate-600')}>
                  {latestVerificationSnapshot ? latestVerificationHint : t.chat.verification.composerNoReplyHint}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    if (!lastAssistantMessage) return;
                    applyVerificationFollowUp(lastAssistantMessage.content);
                  }}
                  disabled={!lastAssistantMessage}
                  className={cn(
                    "inline-flex shrink-0 items-center rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors",
                    "disabled:cursor-not-allowed disabled:opacity-45",
                    isDark
                      ? 'border-blue-400/40 bg-blue-500/10 text-blue-200 hover:bg-blue-500/20'
                      : 'border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100'
                  )}
                >
                  {t.chat.verification.composerAction}
                </button>
              </div>
              {latestVerificationSnapshot && (
                <div className="mt-2">
                  <p className={cn("text-[11px] font-semibold uppercase tracking-[0.08em]", isDark ? 'text-slate-400' : 'text-slate-500')}>
                    {t.chat.verification.recommendations.label}
                  </p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {latestVerificationRecommendations.length > 0 ? (
                      latestVerificationRecommendations.map((recommendation) => (
                        <button
                          key={`latest-${recommendation.id}`}
                          type="button"
                          onClick={() => applyVerificationRecommendation(recommendation)}
                          className={cn(
                            "inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors",
                            isDark
                              ? 'border-slate-500/70 bg-slate-700/60 text-slate-100 hover:bg-slate-600/70'
                              : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
                          )}
                        >
                          {recommendation.title}
                        </button>
                      ))
                    ) : (
                      <p className={cn("text-xs", isDark ? 'text-slate-400' : 'text-slate-500')}>
                        {t.chat.verification.recommendations.empty}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
            <div className="mb-2.5 flex items-center gap-2 overflow-x-auto pb-1 [scrollbar-width:thin] [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full">
              <span
                className={cn(
                  "shrink-0 text-[10px] font-semibold uppercase tracking-[0.12em]",
                  isDark ? 'text-slate-400' : 'text-slate-500'
                )}
              >
                {t.chat.qualityAssistLabel}
              </span>
              <button
                type="button"
                onClick={() => applyQualityAssist('assumptions')}
                className={cn(
                  "shrink-0 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                  isDark
                    ? 'border-slate-600 bg-slate-800/70 text-slate-200 hover:bg-slate-700/80'
                    : 'border-slate-300 bg-slate-100 text-slate-700 hover:bg-slate-200'
                )}
              >
                {t.chat.qualityAssistActions.assumptions}
              </button>
              <button
                type="button"
                onClick={() => applyQualityAssist('citations')}
                className={cn(
                  "shrink-0 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                  isDark
                    ? 'border-slate-600 bg-slate-800/70 text-slate-200 hover:bg-slate-700/80'
                    : 'border-slate-300 bg-slate-100 text-slate-700 hover:bg-slate-200'
                )}
              >
                {t.chat.qualityAssistActions.citations}
              </button>
              <button
                type="button"
                onClick={() => applyQualityAssist('nextSteps')}
                className={cn(
                  "shrink-0 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                  isDark
                    ? 'border-slate-600 bg-slate-800/70 text-slate-200 hover:bg-slate-700/80'
                    : 'border-slate-300 bg-slate-100 text-slate-700 hover:bg-slate-200'
                )}
              >
                {t.chat.qualityAssistActions.nextSteps}
              </button>
            </div>
            <div className="flex items-end gap-2">
              <div className="relative min-w-0 flex-1">
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={composerPlaceholder}
                  className={cn(
                    "w-full h-[44px] min-h-[44px] pl-12 pr-4 pt-[10px] pb-[12px] rounded-xl resize-none focus:outline-none focus:ring-2 transition-all text-sm leading-5 transition-[height]",
                    "[scrollbar-width:thin] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-corner]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full",
                    isDark
                      ? 'bg-slate-800/95 border border-slate-700 text-slate-100 placeholder-slate-500 focus:ring-blue-500/35 focus:border-blue-500/50 [scrollbar-color:rgba(148,163,184,0.45)_transparent] [&::-webkit-scrollbar-thumb]:bg-slate-500/45 [&::-webkit-scrollbar-thumb:hover]:bg-slate-400/60'
                      : 'bg-slate-50 border border-slate-200 text-gray-800 placeholder-gray-400 focus:ring-blue-500/25 focus:border-blue-400/60 [scrollbar-color:rgba(100,116,139,0.45)_transparent] [&::-webkit-scrollbar-thumb]:bg-slate-400/55 [&::-webkit-scrollbar-thumb:hover]:bg-slate-500/65'
                  )}
                  rows={1}
                  disabled={isSending || isSpeechInputTranscribing}
                />
                <button
                  type="button"
                  onClick={handleFileClick}
                  disabled={isSending || isReadingFile}
                  className={cn(
                    "absolute left-3 top-1/2 z-10 inline-flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full border transition-all duration-200",
                    "disabled:opacity-45 disabled:cursor-not-allowed",
                    isDark
                      ? 'bg-slate-700/75 border-slate-500/65 text-slate-100 hover:bg-slate-600/90 hover:border-slate-400/80'
                      : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100 hover:border-slate-400'
                  )}
                  title={t.chat.loadFile}
                  aria-label={t.chat.loadFile}
                >
                  {isReadingFile ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Plus className="h-3.5 w-3.5 -translate-y-px" strokeWidth={2.4} />
                  )}
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

              <button
                type="button"
                onClick={handleSpeechInputToggle}
                disabled={isSending || isSpeechInputTranscribing || !isSpeechInputSupported}
                className={cn(
                  "h-[44px] px-3.5 rounded-xl font-clash font-medium text-sm transition-colors shrink-0",
                  "inline-flex items-center justify-center gap-2",
                  "disabled:opacity-45 disabled:cursor-not-allowed",
                  isSpeechInputListening
                    ? (isDark ? 'bg-rose-500/20 text-rose-200 border border-rose-400/40' : 'bg-rose-50 text-rose-600 border border-rose-200')
                    : (isDark ? 'bg-slate-700/80 hover:bg-slate-600 text-slate-100 border border-slate-500/70' : 'bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300')
                )}
                aria-label={t.chat.voiceInput}
                title={isSpeechInputSupported ? t.chat.voiceInput : t.chat.voiceInputUnsupported}
              >
                {isSpeechInputListening ? (
                  <Square className="h-3.5 w-3.5" />
                ) : isSpeechInputTranscribing ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Mic className="h-4 w-4" />
                )}
                <span className="hidden sm:inline">
                  {isSpeechInputListening
                    ? t.chat.voiceInputListening
                    : isSpeechInputTranscribing
                      ? t.chat.voiceInputTranscribing
                      : t.chat.voiceInput}
                </span>
              </button>

              <button
                type="submit"
                disabled={isSending || isSpeechInputListening || isSpeechInputTranscribing || (!input.trim() && loadedFiles.length === 0)}
                className={cn(
                  "h-[44px] px-4 rounded-xl font-clash font-medium text-sm transition-colors shrink-0",
                  "inline-flex items-center justify-center gap-2",
                  "disabled:opacity-45 disabled:cursor-not-allowed",
                  "bg-blue-600 hover:bg-blue-700 text-white border border-blue-500/90",
                  "min-w-[7rem] sm:min-w-[7.5rem]"
                )}
              >
                <Send className="h-4 w-4" />
                {t.chat.send}
              </button>
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

            {hasRecoveredAttachmentReminder && (
              <div
                className={cn(
                  "mt-2.5 rounded-xl border px-3 py-2.5",
                  isDark ? 'bg-amber-500/10 border-amber-400/40' : 'bg-amber-50/90 border-amber-200'
                )}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className={cn("text-sm font-clash font-semibold", isDark ? 'text-amber-100' : 'text-amber-900')}>
                      {t.chat.attachmentRecoveryTitle}
                    </p>
                    <p className={cn("text-xs", isDark ? 'text-amber-200/90' : 'text-amber-800')}>
                      {attachmentRecoveryDescription}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      clearPendingAttachmentManifest();
                      setRestoredAttachmentHints([]);
                    }}
                    className={cn(
                      "shrink-0 rounded-lg px-2 py-1 text-[11px] font-clash font-semibold transition-colors",
                      isDark ? 'bg-slate-800/80 text-slate-200 hover:bg-slate-700' : 'bg-white text-slate-700 hover:bg-slate-100'
                    )}
                  >
                    {t.chat.attachmentRecoveryDismiss}
                  </button>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {restoredAttachmentHints.slice(0, 3).map((file) => (
                    <span
                      key={`${file.name}-${file.size}-${file.type}`}
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px]",
                        isDark ? 'bg-amber-400/15 text-amber-100' : 'bg-amber-100 text-amber-800'
                      )}
                    >
                      <span className="truncate max-w-[11rem]">{truncateFileName(file.name, 26)}</span>
                      <span className={cn(isDark ? 'text-amber-200/80' : 'text-amber-700/80')}>{formatFileSize(file.size)}</span>
                    </span>
                  ))}
                  {restoredAttachmentHints.length > 3 && (
                    <span className={cn("inline-flex items-center rounded-full px-2 py-1 text-[11px]", isDark ? 'bg-amber-400/15 text-amber-100' : 'bg-amber-100 text-amber-800')}>
                      +{restoredAttachmentHints.length - 3}
                    </span>
                  )}
                </div>
                <p className={cn("mt-1.5 text-[11px]", isDark ? 'text-amber-200/85' : 'text-amber-800')}>
                  {t.chat.attachmentRecoveryHint}
                </p>
              </div>
            )}

            <div className={cn(
              "mt-2.5 flex items-center justify-between border-t pt-2 text-xs",
              isDark ? 'border-slate-700/60 text-slate-400' : 'border-gray-200/80 text-gray-500'
            )}>
              <div className="flex min-w-0 items-center gap-2">
                <div className={cn(
                  "w-2 h-2 rounded-full",
                  isReadingFile
                    ? 'bg-yellow-500 animate-pulse'
                    : isSpeechInputTranscribing
                      ? 'bg-blue-400 animate-pulse'
                    : isSpeechInputListening
                      ? 'bg-rose-400 animate-pulse'
                      : 'bg-emerald-500'
                )} />
                <span>
                  {isReadingFile
                    ? t.chat.fileProcessing
                    : isSpeechInputTranscribing
                      ? t.chat.voiceInputTranscribing
                    : isSpeechInputListening
                      ? t.chat.voiceInputListening
                      : t.chat.ready}
                </span>
                {(isSpeechInputListening || isSpeechInputTranscribing) && (
                  <span
                    className={cn(
                      "hidden max-w-[14rem] truncate rounded-full px-2 py-0.5 text-[10px] font-medium sm:inline-flex",
                      isSpeechInputTranscribing
                        ? (isDark ? 'bg-blue-500/15 text-blue-200' : 'bg-blue-50 text-blue-700')
                        : (isDark ? 'bg-rose-500/15 text-rose-200' : 'bg-rose-50 text-rose-700')
                    )}
                  >
                    {isSpeechInputTranscribing ? speechPresenceLabel : (interimVoiceTranscript || t.chat.voiceInputPrompt)}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {(isVoiceLoading || isVoicePlaying) && (
                  <span
                    className={cn(
                      "hidden rounded-full px-2 py-0.5 text-[10px] font-medium tracking-[0.08em] uppercase sm:inline-flex",
                      isDark ? 'bg-blue-500/15 text-blue-200' : 'bg-blue-50 text-blue-700'
                    )}
                  >
                    {voicePresenceLabel}
                  </span>
                )}
                <button
                  type="button"
                  onClick={toggleLiveVoice}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold tracking-[0.08em] uppercase transition-colors",
                    isLiveVoiceEnabled
                      ? (isDark ? 'bg-cyan-500/15 text-cyan-200' : 'bg-cyan-50 text-cyan-700')
                      : (isDark ? 'bg-slate-700/70 text-slate-300 hover:text-slate-100' : 'bg-gray-100 text-gray-600 hover:text-gray-800')
                  )}
                  aria-label={t.chat.liveVoice}
                  title={t.chat.liveVoice}
                >
                  <span
                    className={cn(
                      "h-1.5 w-1.5 rounded-full",
                      isLiveVoiceEnabled ? 'bg-cyan-400' : (isDark ? 'bg-slate-500' : 'bg-gray-400')
                    )}
                  />
                  <span>{isLiveVoiceEnabled ? t.chat.voiceAutoOn : t.chat.voiceAutoOff}</span>
                </button>
                {isSending && <span className="animate-pulse">{t.chat.drafting}</span>}
              </div>
            </div>
          </div>
        </form>
      </div>
    </main>
  );
}
