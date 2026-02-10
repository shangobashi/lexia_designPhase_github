import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

type SpeechInputLanguage = 'en' | 'fr';
type SpeechInputErrorCode =
  | 'not-supported'
  | 'not-allowed'
  | 'service-not-allowed'
  | 'audio-capture'
  | 'no-speech'
  | 'network'
  | 'aborted'
  | 'unknown';

interface SpeechInputOptions {
  language: SpeechInputLanguage;
  onFinalTranscript: (text: string) => void;
  onInterimTranscript?: (text: string) => void;
}

interface SpeechRecognitionAlternativeLike {
  transcript: string;
}

interface SpeechRecognitionResultLike {
  isFinal: boolean;
  0: SpeechRecognitionAlternativeLike;
}

interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: SpeechRecognitionResultLike;
  };
}

interface SpeechRecognitionErrorEventLike {
  error?: string;
}

interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onstart: null | (() => void);
  onresult: null | ((event: SpeechRecognitionEventLike) => void);
  onerror: null | ((event: SpeechRecognitionErrorEventLike) => void);
  onend: null | (() => void);
  start: () => void;
  stop: () => void;
  abort: () => void;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

function mapSpeechError(error?: string): SpeechInputErrorCode {
  switch (error) {
    case 'not-allowed':
      return 'not-allowed';
    case 'service-not-allowed':
      return 'service-not-allowed';
    case 'audio-capture':
      return 'audio-capture';
    case 'no-speech':
      return 'no-speech';
    case 'network':
      return 'network';
    case 'aborted':
      return 'aborted';
    default:
      return 'unknown';
  }
}

function languageToLocale(language: SpeechInputLanguage): string {
  return language === 'fr' ? 'fr-BE' : 'en-US';
}

export function useSpeechInput({ language, onFinalTranscript, onInterimTranscript }: SpeechInputOptions) {
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const finalTranscriptRef = useRef('');
  const discardFinalTranscriptRef = useRef(false);
  const [isListening, setIsListening] = useState(false);
  const [errorCode, setErrorCode] = useState<SpeechInputErrorCode | null>(null);

  const recognitionCtor = useMemo<SpeechRecognitionConstructor | undefined>(() => {
    if (typeof window === 'undefined') return undefined;
    return window.SpeechRecognition || window.webkitSpeechRecognition;
  }, []);

  const isSupported = Boolean(recognitionCtor);

  const startListening = useCallback(() => {
    if (!recognitionCtor) {
      setErrorCode('not-supported');
      return;
    }

    if (recognitionRef.current || isListening) {
      return;
    }

    const recognition = new recognitionCtor();
    recognitionRef.current = recognition;
    finalTranscriptRef.current = '';
    discardFinalTranscriptRef.current = false;

    recognition.lang = languageToLocale(language);
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onstart = () => {
      setErrorCode(null);
      setIsListening(true);
    };

    recognition.onresult = (event) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        const transcript = result?.[0]?.transcript?.trim();
        if (!transcript) continue;
        if (result.isFinal) {
          finalTranscriptRef.current = `${finalTranscriptRef.current} ${transcript}`.trim();
        } else {
          interim = `${interim} ${transcript}`.trim();
        }
      }

      onInterimTranscript?.(interim);
    };

    recognition.onerror = (event) => {
      const code = mapSpeechError(event?.error);
      if (code !== 'aborted') {
        setErrorCode(code);
      }
    };

    recognition.onend = () => {
      setIsListening(false);
      onInterimTranscript?.('');

      const finalTranscript = finalTranscriptRef.current.trim();
      finalTranscriptRef.current = '';

      if (!discardFinalTranscriptRef.current && finalTranscript) {
        onFinalTranscript(finalTranscript);
      }

      discardFinalTranscriptRef.current = false;
      recognitionRef.current = null;
    };

    try {
      recognition.start();
    } catch {
      setErrorCode('unknown');
      recognitionRef.current = null;
    }
  }, [isListening, language, onFinalTranscript, onInterimTranscript, recognitionCtor]);

  const stopListening = useCallback(() => {
    if (!recognitionRef.current) return;
    recognitionRef.current.stop();
  }, []);

  const cancelListening = useCallback(() => {
    if (!recognitionRef.current) return;
    discardFinalTranscriptRef.current = true;
    recognitionRef.current.abort();
  }, []);

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
      return;
    }
    startListening();
  }, [isListening, startListening, stopListening]);

  useEffect(() => () => {
    if (recognitionRef.current) {
      discardFinalTranscriptRef.current = true;
      recognitionRef.current.abort();
      recognitionRef.current = null;
    }
  }, []);

  return {
    isSupported,
    isListening,
    errorCode,
    startListening,
    stopListening,
    cancelListening,
    toggleListening,
  };
}
