'use client';

import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEYS = {
  PTT_ENABLED:  'opie-push-to-talk-enabled',
  PTT_KEY:      'opie-push-to-talk-key',
  TTS_PROVIDER: 'opie-tts-provider',
  TTS_VOICE:    'opie-tts-voice',
  TTS_SPEED:    'opie-tts-speed',
};

export type PushToTalkKey = string;

export type TTSProvider = 'elevenlabs' | 'azure' | 'openai' | 'edge';

export interface VoiceProvider {
  id: TTSProvider;
  label: string;
  note: string;
}

export const TTS_PROVIDERS: VoiceProvider[] = [
  { id: 'elevenlabs', label: 'ElevenLabs', note: 'Best quality — realistic voices' },
  { id: 'azure',      label: 'Azure Neural', note: 'Microsoft — 500k free/month' },
  { id: 'openai',     label: 'OpenAI TTS',  note: 'Natural, fast' },
  { id: 'edge',       label: 'Edge TTS',    note: 'Free, browser fallback' },
];

// Azure voices — browse at: https://speech.microsoft.com/portal/voicegallery
export const AZURE_VOICES: Record<string, string> = {
  'en-US-AvaMultilingualNeural': 'Ava (US Female — Dragon HD ⭐)',
  'en-US-GuyNeural':       'Guy (US Male)',
  'en-US-DavisNeural':     'Davis (US Male)',
  'en-US-JasonNeural':     'Jason (US Male)',
  'en-US-TonyNeural':      'Tony (US Male)',
  'en-US-AriaNeural':      'Aria (US Female)',
  'en-US-JennyNeural':     'Jenny (US Female)',
  'en-US-NancyNeural':     'Nancy (US Female)',
  'en-US-SaraNeural':      'Sara (US Female)',
  'en-GB-RyanNeural':      'Ryan (UK Male)',
  'en-GB-ThomasNeural':    'Thomas (UK Male)',
  'en-AU-WilliamNeural':   'William (AU Male)',
};

// ElevenLabs voices
export const ELEVENLABS_VOICES: Record<string, string> = {
  'MClEFoImJXBTgLwdLI5n': 'Ethan (Default)',
  'pNInz6obpgDQGcFmaJgB': 'Adam',
  'VR6AewLTigWG4xSOukaG': 'Arnold',
  'ErXwobaYiN019PkySvjV': 'Antoni',
  'yoZ06aMxZJJ28mfd3POQ': 'Sam',
  'EXAVITQu4vr4xnSDxMaL': 'Bella',
  'ThT5KcBeYPX3keUQqHPh': 'Dorothy',
};

// OpenAI voices
export const OPENAI_VOICES: Record<string, string> = {
  'onyx':    'Onyx (Deep Male)',
  'echo':    'Echo (Male)',
  'fable':   'Fable (Male)',
  'nova':    'Nova (Female)',
  'shimmer': 'Shimmer (Female)',
  'alloy':   'Alloy (Neutral)',
};

export function getVoicesForProvider(provider: TTSProvider): Record<string, string> {
  switch (provider) {
    case 'azure':      return AZURE_VOICES;
    case 'elevenlabs': return ELEVENLABS_VOICES;
    case 'openai':     return OPENAI_VOICES;
    default:           return {};
  }
}

/** Convert a KeyboardEvent.code to a human-readable label */
export function getPushToTalkKeyLabel(code: string): string {
  const labels: Record<string, string> = {
    Space: 'Space', ShiftLeft: 'Left Shift', ShiftRight: 'Right Shift',
    ControlLeft: 'Left Ctrl', ControlRight: 'Right Ctrl',
    AltLeft: 'Left Alt', AltRight: 'Right Alt',
    MetaLeft: 'Left Meta', MetaRight: 'Right Meta',
    Backquote: '`', CapsLock: 'Caps Lock', Tab: 'Tab',
    Enter: 'Enter', Backspace: 'Backspace', Escape: 'Esc',
  };
  if (labels[code]) return labels[code];
  if (/^F\d+$/.test(code)) return code;
  if (code.startsWith('Key')) return code.slice(3);
  if (code.startsWith('Digit')) return code.slice(5);
  if (code.startsWith('Numpad')) return 'Numpad ' + code.slice(6);
  return code;
}

export interface VoiceSettings {
  pushToTalkEnabled: boolean;
  pushToTalkKey: PushToTalkKey;
  ttsProvider: TTSProvider;
  ttsVoice: string;
  ttsSpeed: number;
}

export function useVoiceSettings() {
  const [pushToTalkEnabled, setPTTEnabled]   = useState(false);
  const [pushToTalkKey, setPTTKey]           = useState<PushToTalkKey>('Space');
  const [ttsProvider, setTTSProviderState]   = useState<TTSProvider>('azure');
  const [ttsVoice, setTTSVoiceState]         = useState<string>('en-US-AvaMultilingualNeural');
  const [ttsSpeed, setTTSSpeedState]         = useState<number>(1.0);
  const [mounted, setMounted]                = useState(false);

  useEffect(() => {
    setMounted(true);
    const pttE = localStorage.getItem(STORAGE_KEYS.PTT_ENABLED);
    if (pttE !== null) setPTTEnabled(pttE === 'true');
    const pttK = localStorage.getItem(STORAGE_KEYS.PTT_KEY);
    if (pttK) setPTTKey(pttK);
    const prov = localStorage.getItem(STORAGE_KEYS.TTS_PROVIDER) as TTSProvider | null;
    if (prov) setTTSProviderState(prov);
    const voice = localStorage.getItem(STORAGE_KEYS.TTS_VOICE);
    if (voice) setTTSVoiceState(voice);
    const speed = localStorage.getItem(STORAGE_KEYS.TTS_SPEED);
    if (speed) setTTSSpeedState(parseFloat(speed));
  }, []);

  const setPushToTalkEnabled = useCallback((enabled: boolean) => {
    setPTTEnabled(enabled);
    localStorage.setItem(STORAGE_KEYS.PTT_ENABLED, String(enabled));
  }, []);

  const togglePushToTalk = useCallback(() => {
    setPTTEnabled(prev => {
      const next = !prev;
      localStorage.setItem(STORAGE_KEYS.PTT_ENABLED, String(next));
      return next;
    });
  }, []);

  const setPushToTalkKey = useCallback((key: PushToTalkKey) => {
    setPTTKey(key);
    localStorage.setItem(STORAGE_KEYS.PTT_KEY, key);
  }, []);

  const setTTSProvider = useCallback((provider: TTSProvider) => {
    setTTSProviderState(provider);
    localStorage.setItem(STORAGE_KEYS.TTS_PROVIDER, provider);
    // Reset voice to default for new provider
    const voices = getVoicesForProvider(provider);
    const defaultVoice = Object.keys(voices)[0] || '';
    setTTSVoiceState(defaultVoice);
    localStorage.setItem(STORAGE_KEYS.TTS_VOICE, defaultVoice);
  }, []);

  const setTTSVoice = useCallback((voice: string) => {
    setTTSVoiceState(voice);
    localStorage.setItem(STORAGE_KEYS.TTS_VOICE, voice);
  }, []);

  const setTTSSpeed = useCallback((speed: number) => {
    setTTSSpeedState(speed);
    localStorage.setItem(STORAGE_KEYS.TTS_SPEED, String(speed));
  }, []);

  return {
    pushToTalkEnabled, setPushToTalkEnabled, togglePushToTalk,
    pushToTalkKey, setPushToTalkKey,
    ttsProvider, setTTSProvider,
    ttsVoice, setTTSVoice,
    ttsSpeed, setTTSSpeed,
    mounted,
  };
}

export default useVoiceSettings;
