'use client';

import { useState, useEffect, useCallback } from 'react';

const PUSH_TO_TALK_ENABLED_KEY = 'opie-push-to-talk-enabled';
const PUSH_TO_TALK_KEY_KEY = 'opie-push-to-talk-key';

export type PushToTalkKey = 
  | 'Space' 
  | 'KeyP' 
  | 'ShiftLeft' 
  | 'ShiftRight'
  | 'ControlLeft'
  | 'ControlRight'
  | 'AltLeft'
  | 'AltRight'
  | 'F1'
  | 'F2'
  | 'F3'
  | 'F4';

export const PUSH_TO_TALK_KEYS: { value: PushToTalkKey; label: string }[] = [
  { value: 'Space', label: 'Space' },
  { value: 'KeyP', label: 'P' },
  { value: 'ShiftLeft', label: 'Left Shift' },
  { value: 'ShiftRight', label: 'Right Shift' },
  { value: 'ControlLeft', label: 'Left Ctrl' },
  { value: 'ControlRight', label: 'Right Ctrl' },
  { value: 'AltLeft', label: 'Left Alt' },
  { value: 'AltRight', label: 'Right Alt' },
  { value: 'F1', label: 'F1' },
  { value: 'F2', label: 'F2' },
  { value: 'F3', label: 'F3' },
  { value: 'F4', label: 'F4' },
];

export function getPushToTalkKeyLabel(key: PushToTalkKey): string {
  const found = PUSH_TO_TALK_KEYS.find(k => k.value === key);
  return found?.label || key;
}

export interface VoiceSettings {
  pushToTalkEnabled: boolean;
  pushToTalkKey: PushToTalkKey;
}

export function useVoiceSettings() {
  const [pushToTalkEnabled, setPushToTalkEnabledState] = useState(false);
  const [pushToTalkKey, setPushToTalkKeyState] = useState<PushToTalkKey>('Space');
  const [mounted, setMounted] = useState(false);

  // Load preferences from localStorage
  useEffect(() => {
    setMounted(true);
    
    const savedEnabled = localStorage.getItem(PUSH_TO_TALK_ENABLED_KEY);
    if (savedEnabled !== null) {
      setPushToTalkEnabledState(savedEnabled === 'true');
    }

    const savedKey = localStorage.getItem(PUSH_TO_TALK_KEY_KEY) as PushToTalkKey | null;
    if (savedKey && PUSH_TO_TALK_KEYS.some(k => k.value === savedKey)) {
      setPushToTalkKeyState(savedKey);
    }
  }, []);

  const setPushToTalkEnabled = useCallback((enabled: boolean) => {
    setPushToTalkEnabledState(enabled);
    localStorage.setItem(PUSH_TO_TALK_ENABLED_KEY, String(enabled));
  }, []);

  const togglePushToTalk = useCallback(() => {
    setPushToTalkEnabledState((prev) => {
      const newValue = !prev;
      localStorage.setItem(PUSH_TO_TALK_ENABLED_KEY, String(newValue));
      return newValue;
    });
  }, []);

  const setPushToTalkKey = useCallback((key: PushToTalkKey) => {
    setPushToTalkKeyState(key);
    localStorage.setItem(PUSH_TO_TALK_KEY_KEY, key);
  }, []);

  return {
    pushToTalkEnabled,
    setPushToTalkEnabled,
    togglePushToTalk,
    pushToTalkKey,
    setPushToTalkKey,
    mounted,
  };
}

export default useVoiceSettings;