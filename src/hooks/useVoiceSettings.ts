'use client';

import { useState, useCallback, useEffect } from 'react';

// ─── Available Voices ────────────────────────────────────────────────
export interface VoiceOption {
  id: string;
  label: string;
  gender: 'male' | 'female';
  provider: string;
}

export const AZURE_VOICES: VoiceOption[] = [
  { id: 'en-US-AriaNeural', label: 'Aria', gender: 'female', provider: 'azure' },
  { id: 'en-US-JennyNeural', label: 'Jenny', gender: 'female', provider: 'azure' },
  { id: 'en-US-GuyNeural', label: 'Guy', gender: 'male', provider: 'azure' },
  { id: 'en-US-DavisNeural', label: 'Davis', gender: 'male', provider: 'azure' },
];

export const OPENAI_VOICES: VoiceOption[] = [
  { id: 'nova', label: 'Nova', gender: 'female', provider: 'openai' },
  { id: 'alloy', label: 'Alloy', gender: 'female', provider: 'openai' },
  { id: 'echo', label: 'Echo', gender: 'male', provider: 'openai' },
  { id: 'fable', label: 'Fable', gender: 'male', provider: 'openai' },
  { id: 'onyx', label: 'Onyx', gender: 'male', provider: 'openai' },
  { id: 'shimmer', label: 'Shimmer', gender: 'female', provider: 'openai' },
];

export const TTS_PROVIDERS = [
  { id: 'azure', label: 'Azure Speech', note: '500K free/mo' },
  { id: 'openai', label: 'OpenAI TTS', note: '$15/1M chars' },
  { id: 'elevenlabs', label: 'ElevenLabs', note: 'Credits' },
  { id: 'edge', label: 'Edge TTS', note: 'Free' },
] as const;

// ─── Push-to-Talk key type (backward compat with useVoiceEngine) ─────
export type PushToTalkKey = string;

// ─── Settings Shape ──────────────────────────────────────────────────
export interface VoiceSettings {
  ttsProvider: string;
  ttsVoice: string;
  speechSpeed: number;
  autoSpeak: boolean;
  pushToTalkKey: string;
  pushToTalkLabel: string;
  silenceTimeout: number;
}

const STORAGE_KEY = 'opie-voice-settings';

const DEFAULTS: VoiceSettings = {
  ttsProvider: 'azure',
  ttsVoice: 'en-US-AriaNeural',
  speechSpeed: 1.0,
  autoSpeak: true,
  pushToTalkKey: 'Space',
  pushToTalkLabel: 'Space',
  silenceTimeout: 1200,
};

// ─── Friendly key labels ─────────────────────────────────────────────
export function formatKeyLabel(code: string): string {
  // Mouse button labels
  if (code.startsWith('Mouse')) {
    const btn = parseInt(code.slice(5));
    const mouseLabels: Record<number, string> = {
      0: 'Left Click',
      1: 'Middle Click',
      2: 'Right Click',
      3: 'Mouse 4',
      4: 'Mouse 5',
      5: 'Mouse 6',
    };
    return mouseLabels[btn] || `Mouse ${btn}`;
  }

  const map: Record<string, string> = {
    'Space': 'Space',
    'KeyV': 'V',
    'KeyT': 'T',
    'KeyM': 'M',
    'Backquote': '`',
    'CapsLock': 'Caps Lock',
    'ShiftLeft': 'Left Shift',
    'ShiftRight': 'Right Shift',
    'ControlLeft': 'Left Ctrl',
    'ControlRight': 'Right Ctrl',
    'AltLeft': 'Left Alt',
    'AltRight': 'Right Alt',
    'F1': 'F1', 'F2': 'F2', 'F3': 'F3', 'F4': 'F4',
    'F5': 'F5', 'F6': 'F6', 'F7': 'F7', 'F8': 'F8',
  };
  if (map[code]) return map[code];
  if (code.startsWith('Key')) return code.slice(3);
  if (code.startsWith('Digit')) return code.slice(5);
  return code;
}

// ─── Hook ────────────────────────────────────────────────────────────
export function useVoiceSettings() {
  const [settings, setSettings] = useState<VoiceSettings>(DEFAULTS);
  const [loaded, setLoaded] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        setSettings(prev => ({ ...prev, ...parsed }));
      }
    } catch {
      // ignore
    }
    setLoaded(true);
  }, []);

  // Persist on change (skip initial load)
  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
      // ignore
    }
  }, [settings, loaded]);

  const update = useCallback(<K extends keyof VoiceSettings>(key: K, value: VoiceSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  }, []);

  const reset = useCallback(() => {
    setSettings(DEFAULTS);
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
  }, []);

  // Get voices for current provider
  const voices: VoiceOption[] =
    settings.ttsProvider === 'openai' ? OPENAI_VOICES :
    settings.ttsProvider === 'azure' || settings.ttsProvider === 'edge' ? AZURE_VOICES :
    [{ id: 'default', label: 'Default', gender: 'female' as const, provider: 'elevenlabs' }];

  // Flat accessors for backward compatibility with useVoiceEngine
  const pushToTalkEnabled = true; // Always enabled when configured
  const pushToTalkKey = settings.pushToTalkKey as PushToTalkKey;

  return { settings, update, reset, voices, loaded, pushToTalkEnabled, pushToTalkKey };
}
