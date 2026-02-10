import { useCallback, useEffect, useRef, useState } from 'react';

interface VoiceState {
  activeMessageId: string | null;
  isLoading: boolean;
  isPlaying: boolean;
  error: string | null;
}

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export function useVoice() {
  const [state, setState] = useState<VoiceState>({
    activeMessageId: null,
    isLoading: false,
    isPlaying: false,
    error: null,
  });

  const stateRef = useRef(state);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const audioCacheRef = useRef<Map<string, string>>(new Map());

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const clearAbort = () => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
  };

  const attachAudioEvents = (audio: HTMLAudioElement, messageId: string) => {
    audio.onended = () => {
      setState((prev) => {
        if (prev.activeMessageId !== messageId) return prev;
        return { ...prev, isPlaying: false, activeMessageId: null };
      });
    };
    audio.onpause = () => {
      setState((prev) => {
        if (prev.activeMessageId !== messageId) return prev;
        return { ...prev, isPlaying: false };
      });
    };
    audio.onerror = () => {
      setState((prev) => {
        if (prev.activeMessageId !== messageId) return prev;
        return { ...prev, isPlaying: false, isLoading: false, error: 'Playback failed' };
      });
    };
  };

  const startFromSource = useCallback(async (messageId: string, sourceUrl: string) => {
    const audio = new Audio(sourceUrl);
    audioRef.current = audio;
    attachAudioEvents(audio, messageId);

    setState({
      activeMessageId: messageId,
      isLoading: false,
      isPlaying: false,
      error: null,
    });

    await audio.play();

    setState((prev) => ({
      ...prev,
      activeMessageId: messageId,
      isLoading: false,
      isPlaying: true,
      error: null,
    }));
  }, []);

  const stop = useCallback(() => {
    clearAbort();
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current.onended = null;
      audioRef.current.onpause = null;
      audioRef.current.onerror = null;
      audioRef.current = null;
    }
    setState((prev) => ({
      ...prev,
      activeMessageId: null,
      isLoading: false,
      isPlaying: false,
      error: null,
    }));
  }, []);

  const play = useCallback(async (messageId: string, text: string, language: string) => {
    const current = stateRef.current;
    const currentAudio = audioRef.current;

    if (current.activeMessageId === messageId && currentAudio) {
      if (current.isPlaying) {
        currentAudio.pause();
        setState((prev) => ({ ...prev, isPlaying: false }));
        return;
      }

      if (currentAudio.src) {
        try {
          await currentAudio.play();
          setState((prev) => ({ ...prev, isPlaying: true, error: null }));
        } catch (error: any) {
          setState((prev) => ({ ...prev, isPlaying: false, error: error?.message || 'Playback failed' }));
        }
        return;
      }
    }

    stop();

    const cached = audioCacheRef.current.get(messageId);
    if (cached) {
      try {
        await startFromSource(messageId, cached);
      } catch (error: any) {
        setState({
          activeMessageId: null,
          isLoading: false,
          isPlaying: false,
          error: error?.message || 'Playback failed',
        });
      }
      return;
    }

    setState({
      activeMessageId: messageId,
      isLoading: true,
      isPlaying: false,
      error: null,
    });

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const response = await fetch(`${API_BASE_URL}/api/voice/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text, language }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const audioBlob = await response.blob();
      const blobUrl = URL.createObjectURL(audioBlob);
      audioCacheRef.current.set(messageId, blobUrl);

      await startFromSource(messageId, blobUrl);
      abortRef.current = null;
    } catch (error: any) {
      if (error?.name === 'AbortError') return;

      setState({
        activeMessageId: null,
        isLoading: false,
        isPlaying: false,
        error: error?.message || 'Voice generation failed',
      });
    }
  }, [startFromSource, stop]);

  useEffect(() => {
    return () => {
      clearAbort();
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      for (const url of audioCacheRef.current.values()) {
        URL.revokeObjectURL(url);
      }
      audioCacheRef.current.clear();
    };
  }, []);

  return {
    ...state,
    play,
    stop,
  };
}
