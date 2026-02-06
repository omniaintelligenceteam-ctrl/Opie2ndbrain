'use client';

import { useRef, useEffect, useCallback } from 'react';

// Silence detection timeout (1 second)
const SILENCE_TIMEOUT_MS = 3000;

export interface VoiceControllerProps {
  micOn: boolean;
  setMicOn: (on: boolean) => void;
  transcript: string;
  setTranscript: (text: string) => void;
  isSpeaking: boolean;
  setIsSpeaking: (speaking: boolean) => void;
  isLoading: boolean;
  onSend: (text: string) => void;
  audioRef: React.RefObject<HTMLAudioElement | null>;
}

export interface VoiceControllerHandles {
  toggleMic: () => void;
  stopSpeaking: () => void;
  speak: (text: string) => Promise<void>;
  startRecognition: () => void;
}

/**
 * Custom hook for voice recognition and speech synthesis
 * Extracts all voice-related logic from OpieKanban
 */
export function useVoiceController(props: VoiceControllerProps): VoiceControllerHandles {
  const {
    micOn,
    setMicOn,
    setTranscript,
    isSpeaking,
    setIsSpeaking,
    isLoading,
    onSend,
    audioRef,
  } = props;

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const micOnRef = useRef(false);
  const isSpeakingRef = useRef(false);
  const isLoadingRef = useRef(false);
  
  // Silence detection refs
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pendingTranscriptRef = useRef('');
  const accumulatedTranscriptRef = useRef('');

  // Keep refs in sync with props
  useEffect(() => { micOnRef.current = micOn; }, [micOn]);
  useEffect(() => { isSpeakingRef.current = isSpeaking; }, [isSpeaking]);
  useEffect(() => { isLoadingRef.current = isLoading; }, [isLoading]);

  // Stop TTS playback (for barge-in/interrupt)
  const stopSpeaking = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setIsSpeaking(false);
  }, [audioRef, setIsSpeaking]);

  // Start speech recognition
  const startRecognition = useCallback(() => {
    if (recognitionRef.current && micOnRef.current) {
      try { 
        recognitionRef.current.start(); 
      } catch (e) {
        // Already started, ignore
      }
    }
  }, []);

  // Speak text using TTS API
  const speak = useCallback(async (text: string) => {
    setIsSpeaking(true);
    
    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        console.error('[TTS] API error:', res.status, errorData);
        setIsSpeaking(false);
        setTimeout(() => startRecognition(), 300);
        return;
      }
      
      const contentType = res.headers.get('content-type');
      if (!contentType || !contentType.includes('audio')) {
        console.error('[TTS] Invalid content type:', contentType);
        setIsSpeaking(false);
        setTimeout(() => startRecognition(), 300);
        return;
      }
      
      const blob = await res.blob();
      
      if (blob.size < 1000) {
        console.error('[TTS] Audio blob too small:', blob.size, 'bytes');
        setIsSpeaking(false);
        setTimeout(() => startRecognition(), 300);
        return;
      }
      
      console.log('[TTS] Received audio:', blob.size, 'bytes');
      const url = URL.createObjectURL(blob);
      
      if (audioRef.current) {
        audioRef.current.src = url;
        try {
          await audioRef.current.play();
          console.log('[Audio] Playback started');
        } catch (playError) {
          console.error('[Audio] Play failed (autoplay policy?):', playError);
          setIsSpeaking(false);
          setTimeout(() => startRecognition(), 300);
          URL.revokeObjectURL(url);
        }
      }
    } catch (err) {
      console.error('[TTS] Fetch error:', err);
      setIsSpeaking(false);
      setTimeout(() => startRecognition(), 300);
    }
  }, [audioRef, setIsSpeaking, startRecognition]);

  // Toggle microphone on/off
  const toggleMic = useCallback(() => {
    if (!micOn) {
      setMicOn(true);
      try { recognitionRef.current?.stop(); } catch (e) { /* ignore */ }
      setTimeout(() => {
        try { recognitionRef.current?.start(); } catch (e) { 
          console.log('Start error:', e); 
        }
      }, 100);
    } else {
      setMicOn(false);
      try { recognitionRef.current?.stop(); } catch (e) { /* ignore */ }
      setTranscript('');
      pendingTranscriptRef.current = '';
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    }
  }, [micOn, setMicOn, setTranscript]);

  // Initialize audio element
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const audio = new Audio();
    if (audioRef.current !== audio) {
      // @ts-expect-error - we need to set the ref directly
      audioRef.current = audio;
    }
    
    audio.onended = () => {
      setIsSpeaking(false);
      setTimeout(() => startRecognition(), 300);
    };
    
    audio.onerror = (e) => {
      console.error('[Audio] Playback error:', e);
      setIsSpeaking(false);
      setTimeout(() => startRecognition(), 300);
    };
  }, [audioRef, setIsSpeaking, startRecognition]);

  // Clear silence timer on unmount
  useEffect(() => {
    return () => {
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    };
  }, []);

  // Initialize speech recognition
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('webkitSpeechRecognition' in window)) return;
    
    const SpeechRecognitionClass = window.webkitSpeechRecognition;
    if (!SpeechRecognitionClass) return;
    
    const recognition = new SpeechRecognitionClass();
    recognition.continuous = true;
    recognition.interimResults = true;
    
    recognition.onresult = (e: SpeechRecognitionEvent) => {
      // BARGE-IN: If AI is speaking and user starts talking, interrupt immediately
      if (isSpeakingRef.current) {
        stopSpeaking();
        accumulatedTranscriptRef.current = '';
        pendingTranscriptRef.current = '';
        setTranscript('');
      }
      
      // Don't process if loading (waiting for AI response)
      if (isLoadingRef.current) return;
      
      // Build complete transcript from ALL results
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
      
      // Store accumulated finals
      if (finalText.trim()) {
        accumulatedTranscriptRef.current = finalText.trim();
      }
      
      // Display current state: accumulated + interim
      const displayText = (accumulatedTranscriptRef.current + ' ' + interimText).trim();
      setTranscript(displayText);
      pendingTranscriptRef.current = displayText;
      
      // SILENCE DETECTION: Reset timer on ANY activity
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      
      silenceTimerRef.current = setTimeout(() => {
        const textToSend = accumulatedTranscriptRef.current.trim() || pendingTranscriptRef.current.trim();
        if (textToSend && !isLoadingRef.current && !isSpeakingRef.current) {
          accumulatedTranscriptRef.current = '';
          pendingTranscriptRef.current = '';
          setTranscript('');
          onSend(textToSend);
        }
      }, SILENCE_TIMEOUT_MS);
    };
    
    recognition.onend = () => {
      if (micOnRef.current) {
        setTimeout(() => { 
          try { 
            recognition.start(); 
          } catch (e) {
            setTimeout(() => {
              if (micOnRef.current) {
                try { recognition.start(); } catch (e) { /* ignore */ }
              }
            }, 500);
          }
        }, 100);
      }
    };
    
    recognition.onerror = (e: SpeechRecognitionErrorEvent) => {
      console.log('Speech recognition error:', e.error);
      if (e.error === 'not-allowed' || e.error === 'audio-capture') {
        setMicOn(false);
      } else if (micOnRef.current) {
        setTimeout(() => {
          try { recognition.start(); } catch (e) { /* ignore */ }
        }, 500);
      }
    };
    
    recognitionRef.current = recognition;
  }, [stopSpeaking, setTranscript, setMicOn, onSend]);

  return {
    toggleMic,
    stopSpeaking,
    speak,
    startRecognition,
  };
}

export default useVoiceController;
