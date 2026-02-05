/**
 * Browser Compatibility Layer for Voice Features
 * 
 * Handles differences between:
 * - Chrome (webkitSpeechRecognition, stable)
 * - Safari (webkitSpeechRecognition, quirky continuous mode)
 * - Firefox (no SpeechRecognition API)
 * - Edge (SpeechRecognition, Chromium-based)
 * - Mobile browsers (permission prompts differ)
 */

export interface BrowserVoiceSupport {
  speechRecognition: boolean;
  speechSynthesis: boolean;
  audioContext: boolean;
  mediaDevices: boolean;
  browser: 'chrome' | 'safari' | 'firefox' | 'edge' | 'other';
  isMobile: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  warnings: string[];
  /** Safari has issues with continuous mode; use restart-based approach */
  needsRestartWorkaround: boolean;
  /** Safari/iOS may need user gesture to start audio */
  needsUserGesture: boolean;
}

/**
 * Detect browser capabilities for voice features.
 * Call once on mount; result is stable for the session.
 */
export function detectVoiceSupport(): BrowserVoiceSupport {
  if (typeof window === 'undefined') {
    return {
      speechRecognition: false,
      speechSynthesis: false,
      audioContext: false,
      mediaDevices: false,
      browser: 'other',
      isMobile: false,
      isIOS: false,
      isAndroid: false,
      warnings: ['Server-side rendering — no voice support'],
      needsRestartWorkaround: false,
      needsUserGesture: false,
    };
  }

  const ua = navigator.userAgent.toLowerCase();
  const warnings: string[] = [];

  // Detect browser
  let browser: BrowserVoiceSupport['browser'] = 'other';
  if (ua.includes('edg/')) {
    browser = 'edge';
  } else if (ua.includes('chrome') && !ua.includes('edg/')) {
    browser = 'chrome';
  } else if (ua.includes('safari') && !ua.includes('chrome')) {
    browser = 'safari';
  } else if (ua.includes('firefox')) {
    browser = 'firefox';
  }

  // Detect platform
  const isMobile = /android|iphone|ipad|ipod|mobile/i.test(ua);
  const isIOS = /iphone|ipad|ipod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isAndroid = /android/i.test(ua);

  // Check APIs
  const hasSpeechRecognition = !!(
    (window as any).SpeechRecognition ||
    (window as any).webkitSpeechRecognition
  );
  const hasSpeechSynthesis = !!window.speechSynthesis;
  const hasAudioContext = !!(
    (window as any).AudioContext ||
    (window as any).webkitAudioContext
  );
  const hasMediaDevices = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);

  // Collect warnings
  if (!hasSpeechRecognition) {
    if (browser === 'firefox') {
      warnings.push('Firefox does not support the Web Speech Recognition API. Voice input is unavailable. Try Chrome, Edge, or Safari.');
    } else {
      warnings.push('Speech recognition is not available in this browser. Try Chrome, Edge, or Safari.');
    }
  }

  if (browser === 'safari') {
    warnings.push('Safari has limited support for continuous speech recognition. Voice may restart between sentences.');
  }

  if (isIOS) {
    warnings.push('iOS requires a user tap to start audio playback.');
  }

  // Safari continuous mode is buggy — we use restart-based approach
  const needsRestartWorkaround = browser === 'safari' || isIOS;

  // iOS and Safari need user gesture for audio
  const needsUserGesture = isIOS || browser === 'safari';

  return {
    speechRecognition: hasSpeechRecognition,
    speechSynthesis: hasSpeechSynthesis,
    audioContext: hasAudioContext,
    mediaDevices: hasMediaDevices,
    browser,
    isMobile,
    isIOS,
    isAndroid,
    warnings,
    needsRestartWorkaround,
    needsUserGesture,
  };
}

/**
 * Get the SpeechRecognition constructor for this browser.
 * Returns null if not supported.
 */
export function getSpeechRecognitionClass(): (new () => SpeechRecognition) | null {
  if (typeof window === 'undefined') return null;
  return (
    (window as any).SpeechRecognition ||
    (window as any).webkitSpeechRecognition ||
    null
  );
}

/**
 * Request microphone permission explicitly.
 * Returns true if granted, false if denied.
 * Useful for pre-checking before starting recognition.
 */
export async function requestMicPermission(): Promise<boolean> {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices) return false;
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    // Immediately stop — we just needed the permission
    stream.getTracks().forEach(t => t.stop());
    return true;
  } catch {
    return false;
  }
}

/**
 * Warm up audio context with a silent buffer.
 * Required on iOS/Safari to unlock audio playback from user gesture.
 */
export function warmUpAudio(audio: HTMLAudioElement): void {
  // Create a tiny silent audio buffer and play it
  // This "unlocks" the audio element for future programmatic playback
  try {
    const AudioCtx = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();
    const buffer = ctx.createBuffer(1, 1, 22050);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    source.start(0);

    // Also set the audio element to a brief silent src
    // Ensures the element is "activated"
    audio.volume = 0;
    audio.play().catch(() => {});
    setTimeout(() => {
      audio.pause();
      audio.volume = 1;
      audio.currentTime = 0;
      ctx.close().catch(() => {});
    }, 100);
  } catch {
    // Silently fail — non-critical
  }
}
