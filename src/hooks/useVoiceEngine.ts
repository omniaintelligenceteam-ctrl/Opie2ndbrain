'use client';

import { useRef, useEffect, useCallback, useReducer } from 'react';
import {
  VoiceState,
  VoiceEvent,
  VoiceContext,
  SideEffect,
  transition,
  initialContext,
} from '@/lib/voiceStateMachine';
import {
  BrowserVoiceSupport,
  detectVoiceSupport,
  getSpeechRecognitionClass,
  warmUpAudio,
} from '@/lib/browserCompat';

// ─── Configuration ──────────────────────────────────────────────────
const SILENCE_TIMEOUT_MS = 1200;   // Send after 1.2s silence
const RECOGNITION_RESTART_DELAY = 150;
const TTS_RESTART_DELAY = 300;

// ─── Types ──────────────────────────────────────────────────────────
export interface UseVoiceEngineOptions {
  /** Called when voice input produces text to send */
  onSend: (text: string) => Promise<string | void>;
  /** TTS endpoint (default: /api/tts) */
  ttsEndpoint?: string;
  /** TTS provider */
  ttsProvider?: string;
  /** TTS voice */
  ttsVoice?: string;
  /** Enable auto-speak responses (default: true when mic is on) */
  autoSpeak?: boolean;
}

export interface UseVoiceEngineReturn {
  /** Current voice state */
  voiceState: VoiceState;
  /** Full voice context (for advanced UI) */
  context: VoiceContext;
  /** Whether mic is active */
  micOn: boolean;
  /** Current transcript text */
  transcript: string;
  /** Whether AI is speaking */
  isSpeaking: boolean;
  /** Whether processing (waiting for AI response) */
  isProcessing: boolean;
  /** Last error message */
  error: string | null;
  /** Browser support info */
  browserSupport: BrowserVoiceSupport;
  /** Toggle mic on/off */
  toggleMic: () => void;
  /** Stop TTS playback */
  stopSpeaking: () => void;
  /** Cancel pending processing */
  cancelProcessing: () => void;
  /** Speak text (manual trigger) */
  speak: (text: string) => Promise<void>;
  /** Notify that a response was received (for text-only mode) */
  notifyResponse: (text: string) => void;
  /** Audio element ref (for external use) */
  audioRef: React.RefObject<HTMLAudioElement | null>;
}

// ─── Reducer ────────────────────────────────────────────────────────
// We use useReducer for the state machine, but side effects are executed
// imperatively in the dispatch wrapper.

function voiceReducer(ctx: VoiceContext, event: VoiceEvent): VoiceContext {
  const { context } = transition(ctx, event);
  return context;
}

// ─── Hook ───────────────────────────────────────────────────────────
export function useVoiceEngine(options: UseVoiceEngineOptions): UseVoiceEngineReturn {
  const { onSend, ttsEndpoint = '/api/tts', ttsProvider, ttsVoice, autoSpeak = true } = options;

  // State machine
  const [ctx, rawDispatch] = useReducer(voiceReducer, undefined, initialContext);

  // Refs for side effects
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const blobUrlsRef = useRef<string[]>([]);
  const restartingRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const browserSupportRef = useRef<BrowserVoiceSupport | null>(null);
  const ctxRef = useRef(ctx);
  const onSendRef = useRef(onSend);
  const mountedRef = useRef(true);

  // Keep refs in sync
  ctxRef.current = ctx;
  onSendRef.current = onSend;

  // ─── Browser detection (once) ──────────────────────────────────
  if (!browserSupportRef.current && typeof window !== 'undefined') {
    browserSupportRef.current = detectVoiceSupport();
  }
  const browserSupport = browserSupportRef.current || detectVoiceSupport();

  // ─── Side effect executor ──────────────────────────────────────
  const executeSideEffects = useCallback((effects: SideEffect[]) => {
    for (const effect of effects) {
      switch (effect.type) {
        case 'START_RECOGNITION': {
          if (!recognitionRef.current || restartingRef.current) break;
          restartingRef.current = true;
          // Stop first to ensure clean state
          try { recognitionRef.current.stop(); } catch { /* ok */ }
          setTimeout(() => {
            if (!mountedRef.current) return;
            restartingRef.current = false;
            try {
              recognitionRef.current?.start();
            } catch (e) {
              console.warn('[VoiceEngine] Recognition start failed:', e);
              // Retry once
              setTimeout(() => {
                if (!mountedRef.current || !ctxRef.current.micOn) return;
                try { recognitionRef.current?.start(); } catch { /* give up */ }
              }, 500);
            }
          }, RECOGNITION_RESTART_DELAY);
          break;
        }

        case 'STOP_RECOGNITION': {
          restartingRef.current = false;
          try { recognitionRef.current?.stop(); } catch { /* ok */ }
          break;
        }

        case 'SEND_MESSAGE': {
          // Handle async send
          const sendText = effect.text;
          const controller = new AbortController();
          abortControllerRef.current = controller;

          onSendRef.current(sendText)
            .then((response) => {
              if (controller.signal.aborted || !mountedRef.current) return;
              abortControllerRef.current = null;
              if (typeof response === 'string' && response) {
                dispatch({ type: 'RESPONSE_RECEIVED', text: response });
              }
            })
            .catch((err) => {
              if (controller.signal.aborted || !mountedRef.current) return;
              abortControllerRef.current = null;
              dispatch({ type: 'ERROR', error: err.message || 'Send failed' });
            });
          break;
        }

        case 'START_TTS': {
          if (!autoSpeak) break;
          // Use the speak function
          speakInternal(effect.text);
          break;
        }

        case 'STOP_TTS': {
          if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
          }
          break;
        }

        case 'CLEAR_SILENCE_TIMER': {
          if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current);
            silenceTimerRef.current = null;
          }
          break;
        }

        case 'START_SILENCE_TIMER': {
          if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current);
          }
          const text = effect.text;
          silenceTimerRef.current = setTimeout(() => {
            if (!mountedRef.current) return;
            silenceTimerRef.current = null;
            dispatch({ type: 'SILENCE_DETECTED', text });
          }, SILENCE_TIMEOUT_MS);
          break;
        }

        case 'CLEANUP_AUDIO': {
          if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.removeAttribute('src');
            audioRef.current.load();
          }
          break;
        }

        case 'REVOKE_BLOB_URLS': {
          for (const url of blobUrlsRef.current) {
            try { URL.revokeObjectURL(url); } catch { /* ok */ }
          }
          blobUrlsRef.current = [];
          break;
        }

        case 'LOG': {
          const logFn = effect.level === 'error' ? console.error
            : effect.level === 'warn' ? console.warn
            : console.log;
          logFn(`[VoiceEngine] ${effect.message}`);
          break;
        }
      }
    }
  }, [autoSpeak]);

  // ─── Dispatch wrapper (state + effects) ────────────────────────
  const dispatch = useCallback((event: VoiceEvent) => {
    const currentCtx = ctxRef.current;
    const { context: newCtx, sideEffects } = transition(currentCtx, event);
    rawDispatch(event);
    if (sideEffects.length > 0) {
      executeSideEffects(sideEffects);
    }
  }, [executeSideEffects]);

  // ─── Internal speak function ───────────────────────────────────
  const speakInternal = useCallback(async (text: string) => {
    if (!audioRef.current || !mountedRef.current) return;

    try {
      const body: Record<string, string> = { text };
      if (ttsProvider) body.provider = ttsProvider;
      if (ttsVoice) body.voice = ttsVoice;

      const res = await fetch(ttsEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        console.error('[VoiceEngine] TTS API error:', res.status, errData);
        dispatch({ type: 'TTS_ERROR', error: `TTS failed: ${res.status}` });
        return;
      }

      const contentType = res.headers.get('content-type');
      if (!contentType || !contentType.includes('audio')) {
        dispatch({ type: 'TTS_ERROR', error: 'TTS returned non-audio response' });
        return;
      }

      const blob = await res.blob();
      if (blob.size < 500) {
        dispatch({ type: 'TTS_ERROR', error: 'TTS audio too small' });
        return;
      }

      if (!mountedRef.current) return;

      const url = URL.createObjectURL(blob);
      blobUrlsRef.current.push(url);

      audioRef.current.src = url;
      try {
        await audioRef.current.play();
      } catch (playError: any) {
        console.error('[VoiceEngine] Audio play failed:', playError);
        blobUrlsRef.current = blobUrlsRef.current.filter(u => u !== url);
        URL.revokeObjectURL(url);
        dispatch({ type: 'TTS_ERROR', error: playError.message || 'Autoplay blocked' });
      }
    } catch (err: any) {
      console.error('[VoiceEngine] TTS fetch error:', err);
      dispatch({ type: 'TTS_ERROR', error: err.message || 'TTS network error' });
    }
  }, [ttsEndpoint, ttsProvider, ttsVoice, dispatch]);

  // ─── Initialize Audio Element ──────────────────────────────────
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const audio = new Audio();
    audioRef.current = audio;

    audio.onended = () => {
      if (!mountedRef.current) return;
      dispatch({ type: 'TTS_ENDED' });
    };

    audio.onerror = () => {
      if (!mountedRef.current) return;
      dispatch({ type: 'TTS_ERROR', error: 'Audio playback error' });
    };

    // Warm up on iOS/Safari
    if (browserSupport.needsUserGesture) {
      const handleFirstInteraction = () => {
        warmUpAudio(audio);
        document.removeEventListener('touchstart', handleFirstInteraction);
        document.removeEventListener('click', handleFirstInteraction);
      };
      document.addEventListener('touchstart', handleFirstInteraction, { once: true });
      document.addEventListener('click', handleFirstInteraction, { once: true });
    }

    return () => {
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
      audio.onended = null;
      audio.onerror = null;
    };
  }, [dispatch, browserSupport.needsUserGesture]);

  // ─── Initialize Speech Recognition ────────────────────────────
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const SRClass = getSpeechRecognitionClass();
    if (!SRClass) return;

    const recognition = new SRClass();
    recognition.lang = 'en-US';
    recognition.interimResults = true;

    // Safari doesn't handle continuous well — we restart manually
    recognition.continuous = !browserSupport.needsRestartWorkaround;

    recognition.onresult = (e: SpeechRecognitionEvent) => {
      if (!mountedRef.current) return;

      // Collect finals and interims
      let finalText = '';
      let interimText = '';

      for (let i = 0; i < e.results.length; i++) {
        const result = e.results[i];
        if (result.isFinal) {
          finalText += result[0].transcript + ' ';
        } else {
          interimText += result[0].transcript;
        }
      }

      const combined = (finalText + interimText).trim();
      const isFinal = !!finalText.trim() && !interimText;

      if (combined) {
        dispatch({
          type: 'SPEECH_RESULT',
          transcript: combined,
          isFinal,
        });
      }
    };

    recognition.onend = () => {
      if (!mountedRef.current) return;
      // Auto-restart if mic should still be on and we're in listening state
      if (ctxRef.current.micOn && ctxRef.current.state === 'listening' && !restartingRef.current) {
        restartingRef.current = true;
        setTimeout(() => {
          if (!mountedRef.current) return;
          restartingRef.current = false;
          try { recognition.start(); } catch { /* ok */ }
        }, RECOGNITION_RESTART_DELAY);
      }
    };

    recognition.onerror = (e: SpeechRecognitionErrorEvent) => {
      if (!mountedRef.current) return;

      // 'no-speech' and 'aborted' are expected — just restart
      if (e.error === 'no-speech' || e.error === 'aborted') {
        if (ctxRef.current.micOn && !restartingRef.current) {
          restartingRef.current = true;
          setTimeout(() => {
            if (!mountedRef.current) return;
            restartingRef.current = false;
            try { recognition.start(); } catch { /* ok */ }
          }, 300);
        }
        return;
      }

      dispatch({
        type: 'ERROR',
        error: getErrorMessage(e.error),
        code: e.error,
      });
    };

    recognitionRef.current = recognition;

    return () => {
      try { recognition.stop(); } catch { /* ok */ }
      recognition.onresult = null;
      recognition.onend = null;
      recognition.onerror = null;
      recognitionRef.current = null;
    };
  }, [dispatch, browserSupport.needsRestartWorkaround]);

  // ─── Cleanup on unmount ────────────────────────────────────────
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      dispatch({ type: 'UNMOUNT' });

      // Cleanup silence timer
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }

      // Abort pending requests
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }

      // Revoke all blob URLs
      for (const url of blobUrlsRef.current) {
        try { URL.revokeObjectURL(url); } catch { /* ok */ }
      }
      blobUrlsRef.current = [];
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Public API ────────────────────────────────────────────────
  const toggleMic = useCallback(() => {
    if (!browserSupport.speechRecognition) {
      alert(
        browserSupport.warnings[0] ||
        'Voice input is not available in this browser. Try Chrome or Edge.'
      );
      return;
    }

    if (ctx.micOn) {
      dispatch({ type: 'MIC_OFF' });
    } else {
      dispatch({ type: 'MIC_ON' });
    }
  }, [ctx.micOn, dispatch, browserSupport]);

  const stopSpeaking = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    // Revoke blob URLs
    for (const url of blobUrlsRef.current) {
      try { URL.revokeObjectURL(url); } catch { /* ok */ }
    }
    blobUrlsRef.current = [];
    dispatch({ type: 'TTS_ENDED' });
  }, [dispatch]);

  const cancelProcessing = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    dispatch({ type: 'CANCEL' });
  }, [dispatch]);

  const speak = useCallback(async (text: string) => {
    dispatch({ type: 'TTS_STARTED' });
    await speakInternal(text);
  }, [dispatch, speakInternal]);

  const notifyResponse = useCallback((text: string) => {
    dispatch({ type: 'RESPONSE_RECEIVED', text });
  }, [dispatch]);

  return {
    voiceState: ctx.state,
    context: ctx,
    micOn: ctx.micOn,
    transcript: ctx.transcript,
    isSpeaking: ctx.state === 'speaking',
    isProcessing: ctx.state === 'processing',
    error: ctx.error,
    browserSupport,
    toggleMic,
    stopSpeaking,
    cancelProcessing,
    speak,
    notifyResponse,
    audioRef,
  };
}

// ─── Helpers ────────────────────────────────────────────────────────
function getErrorMessage(error: string): string {
  switch (error) {
    case 'not-allowed':
      return 'Microphone permission denied. Please allow microphone access in your browser settings.';
    case 'audio-capture':
      return 'No microphone found. Please connect a microphone and try again.';
    case 'network':
      return 'Network error — speech recognition service is unavailable. Check your internet connection.';
    case 'service-not-allowed':
      return 'Speech recognition service is not allowed. This may be a browser restriction.';
    default:
      return `Speech recognition error: ${error}`;
  }
}

export default useVoiceEngine;
