/**
 * Browser compatibility utilities for voice features.
 * Handles differences between Chrome, Safari, Edge, and Firefox
 * for SpeechRecognition and audio playback.
 */

export interface BrowserVoiceSupport {
  /** Whether SpeechRecognition API is available */
  hasSpeechRecognition: boolean;
  /** Whether Web Audio API is available */
  hasAudioContext: boolean;
  /** Whether MediaDevices (getUserMedia) is available */
  hasMediaDevices: boolean;
  /** Browser name for logging */
  browser: 'chrome' | 'safari' | 'edge' | 'firefox' | 'unknown';
  /** Whether the browser requires user gesture to start audio */
  needsUserGesture: boolean;
  /** Whether continuous recognition is supported */
  supportsContinuous: boolean;
  /** Whether interimResults are supported */
  supportsInterimResults: boolean;
  /** Whether the browser needs recognition restart workaround (Safari) */
  needsRestartWorkaround: boolean;
  /** SpeechRecognition constructor if available */
  speechRecognition: (new () => SpeechRecognition) | null;
  /** Any warnings about browser compatibility */
  warnings: string[];
}

/**
 * Detect what voice features the current browser supports.
 */
export function detectVoiceSupport(): BrowserVoiceSupport {
  if (typeof window === 'undefined') {
    return {
      hasSpeechRecognition: false,
      hasAudioContext: false,
      hasMediaDevices: false,
      browser: 'unknown',
      needsUserGesture: true,
      supportsContinuous: false,
      supportsInterimResults: false,
      needsRestartWorkaround: false,
      speechRecognition: null,
      warnings: ['SpeechRecognition not available (server-side rendering)'],
    };
  }

  const ua = navigator.userAgent.toLowerCase();
  let browser: BrowserVoiceSupport['browser'] = 'unknown';

  if (ua.includes('edg/')) {
    browser = 'edge';
  } else if (ua.includes('chrome') && !ua.includes('edg/')) {
    browser = 'chrome';
  } else if (ua.includes('safari') && !ua.includes('chrome')) {
    browser = 'safari';
  } else if (ua.includes('firefox')) {
    browser = 'firefox';
  }

  const speechRecognition = getSpeechRecognitionClass();
  const hasSpeechRecognition = speechRecognition !== null;

  const hasAudioContext = !!(
    (window as any).AudioContext || (window as any).webkitAudioContext
  );

  const hasMediaDevices = !!(
    navigator.mediaDevices && navigator.mediaDevices.getUserMedia
  );

  // Safari and iOS require user gesture to play audio
  const needsUserGesture = browser === 'safari';

  // Firefox doesn't support SpeechRecognition natively
  // Safari has quirks with continuous mode
  const supportsContinuous = hasSpeechRecognition && browser !== 'firefox';
  const supportsInterimResults = hasSpeechRecognition && browser !== 'firefox';

  // Safari needs recognition restart after each result (no true continuous mode)
  const needsRestartWorkaround = browser === 'safari';

  // Collect warnings
  const warnings: string[] = [];
  if (!hasSpeechRecognition) {
    warnings.push(`SpeechRecognition not supported in ${browser}. Voice input unavailable.`);
  }
  if (browser === 'firefox') {
    warnings.push('Firefox has limited SpeechRecognition support. Consider Chrome or Edge.');
  }
  if (!hasMediaDevices) {
    warnings.push('MediaDevices API not available. Microphone access may fail.');
  }

  return {
    hasSpeechRecognition,
    hasAudioContext,
    hasMediaDevices,
    browser,
    needsUserGesture,
    supportsContinuous,
    supportsInterimResults,
    needsRestartWorkaround,
    speechRecognition,
    warnings,
  };
}

/**
 * Get the SpeechRecognition constructor for the current browser.
 * Returns null if not supported.
 */
export function getSpeechRecognitionClass(): (new () => SpeechRecognition) | null {
  if (typeof window === 'undefined') return null;

  const w = window as any;
  return (
    w.SpeechRecognition ||
    w.webkitSpeechRecognition ||
    w.mozSpeechRecognition ||
    w.msSpeechRecognition ||
    null
  );
}

/**
 * Warm up the audio context with a silent buffer.
 * Required on Safari/iOS to enable audio playback after user gesture.
 * Call this on the first user interaction (click/tap).
 */
export async function warmUpAudio(existingAudio?: HTMLAudioElement): Promise<void> {
  if (typeof window === 'undefined') return;

  try {
    const AudioCtx = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();
    // Create a short silent buffer and play it
    const buffer = ctx.createBuffer(1, 1, 22050);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    source.start(0);

    // Resume context if suspended (Safari requirement)
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }

    // Clean up after a short delay
    setTimeout(() => {
      ctx.close().catch(() => {});
    }, 100);
  } catch {
    // Silent fail — audio warmup is best-effort
  }
}
