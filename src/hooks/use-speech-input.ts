import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { buildApiUrl } from '@/lib/api-base-url';

type SpeechInputLanguage = 'en' | 'fr';
type SpeechInputErrorCode =
  | 'not-supported'
  | 'not-allowed'
  | 'audio-capture'
  | 'no-speech'
  | 'network'
  | 'transcription-failed'
  | 'aborted'
  | 'unknown';

interface SpeechInputOptions {
  language: SpeechInputLanguage;
  onFinalTranscript: (text: string) => void;
  onInterimTranscript?: (text: string) => void;
}

interface MediaRecorderLike extends MediaRecorder {
  onstart: (() => void) | null;
  onstop: (() => void) | null;
  ondataavailable: ((event: BlobEvent) => void) | null;
  onerror: ((event: Event) => void) | null;
}

function mapRecordingError(error: unknown): SpeechInputErrorCode {
  const message = String((error as any)?.message || '');

  if ((error as any)?.name === 'NotAllowedError' || (error as any)?.name === 'SecurityError') {
    return 'not-allowed';
  }
  if ((error as any)?.name === 'NotFoundError' || (error as any)?.name === 'NotReadableError') {
    return 'audio-capture';
  }
  if (message.includes('Failed to fetch') || message.includes('NetworkError')) {
    return 'network';
  }
  return 'unknown';
}

function chooseMimeType(): string | undefined {
  if (typeof MediaRecorder === 'undefined' || typeof MediaRecorder.isTypeSupported !== 'function') {
    return undefined;
  }

  const candidates = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4',
    'audio/ogg;codecs=opus',
  ];

  return candidates.find((type) => MediaRecorder.isTypeSupported(type));
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let binary = '';

  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }

  return btoa(binary);
}

async function transcribeAudio(blob: Blob, language: SpeechInputLanguage): Promise<string> {
  const audioBuffer = await blob.arrayBuffer();
  const response = await fetch(buildApiUrl('/api/voice/transcribe'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      audioBase64: arrayBufferToBase64(audioBuffer),
      mimeType: blob.type || 'audio/webm',
      language,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
    const error = new Error(errorData.error || `HTTP ${response.status}`);
    (error as any).status = response.status;
    throw error;
  }

  const data = await response.json();
  return typeof data?.text === 'string' ? data.text.trim() : '';
}

export function useSpeechInput({ language, onFinalTranscript, onInterimTranscript }: SpeechInputOptions) {
  const recorderRef = useRef<MediaRecorderLike | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const cancelRequestedRef = useRef(false);
  const [isListening, setIsListening] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [errorCode, setErrorCode] = useState<SpeechInputErrorCode | null>(null);

  const isSupported = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return Boolean(window.navigator?.mediaDevices?.getUserMedia) && typeof MediaRecorder !== 'undefined';
  }, []);

  const cleanupStream = useCallback(() => {
    if (streamRef.current) {
      for (const track of streamRef.current.getTracks()) {
        track.stop();
      }
      streamRef.current = null;
    }
  }, []);

  const stopListening = useCallback(() => {
    const recorder = recorderRef.current;
    if (!recorder || recorder.state === 'inactive') return;
    recorder.stop();
  }, []);

  const cancelListening = useCallback(() => {
    const recorder = recorderRef.current;
    cancelRequestedRef.current = true;
    if (recorder && recorder.state !== 'inactive') {
      recorder.stop();
      return;
    }
    cleanupStream();
    setIsListening(false);
  }, [cleanupStream]);

  const startListening = useCallback(async () => {
    if (!isSupported) {
      setErrorCode('not-supported');
      return;
    }
    if (isListening || isTranscribing || recorderRef.current) return;

    setErrorCode(null);
    cancelRequestedRef.current = false;
    chunksRef.current = [];
    onInterimTranscript?.('');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeType = chooseMimeType();
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      recorderRef.current = recorder as MediaRecorderLike;

      recorderRef.current.onstart = () => {
        setIsListening(true);
        onInterimTranscript?.('');
      };

      recorderRef.current.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorderRef.current.onerror = () => {
        setErrorCode('audio-capture');
      };

      recorderRef.current.onstop = async () => {
        const wasCancelled = cancelRequestedRef.current;
        cancelRequestedRef.current = false;
        setIsListening(false);
        onInterimTranscript?.('');

        const blob = new Blob(chunksRef.current, {
          type: mimeType || 'audio/webm',
        });
        chunksRef.current = [];
        recorderRef.current = null;
        cleanupStream();

        if (wasCancelled) {
          setErrorCode('aborted');
          return;
        }

        if (!blob.size || blob.size < 1024) {
          setErrorCode('no-speech');
          return;
        }

        try {
          setIsTranscribing(true);
          const transcript = await transcribeAudio(blob, language);
          if (!transcript) {
            setErrorCode('no-speech');
            return;
          }
          onFinalTranscript(transcript);
        } catch (error) {
          const status = (error as any)?.status;
          if (status === 422) {
            setErrorCode('no-speech');
          } else if (status && status >= 500) {
            setErrorCode('network');
          } else {
            const mapped = mapRecordingError(error);
            setErrorCode(mapped === 'unknown' ? 'transcription-failed' : mapped);
          }
        } finally {
          setIsTranscribing(false);
        }
      };

      recorderRef.current.start(250);
      onInterimTranscript?.('...');
    } catch (error) {
      cleanupStream();
      recorderRef.current = null;
      setIsListening(false);
      setErrorCode(mapRecordingError(error));
    }
  }, [
    cleanupStream,
    isListening,
    isSupported,
    isTranscribing,
    language,
    onFinalTranscript,
    onInterimTranscript,
  ]);

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
      return;
    }
    startListening();
  }, [isListening, startListening, stopListening]);

  useEffect(() => () => {
    cancelRequestedRef.current = true;
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      recorderRef.current.stop();
    }
    recorderRef.current = null;
    cleanupStream();
  }, [cleanupStream]);

  return {
    isSupported,
    isListening,
    isTranscribing,
    errorCode,
    startListening,
    stopListening,
    cancelListening,
    toggleListening,
  };
}
