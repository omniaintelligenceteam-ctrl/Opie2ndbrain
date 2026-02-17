'use client';

import { useState, useEffect, useCallback } from 'react';

const PUSH_TO_TALK_ENABLED_KEY = 'opie-push-to-talk-enabled';
const PUSH_TO_TALK_KEY_KEY = 'opie-push-to-talk-key';

// Accept any keyboard event code as a push-to-talk key
export type PushToTalkKey = string;

/** Convert a KeyboardEvent.code to a human-readable label */
export function getPushToTalkKeyLabel(code: string): string {
  // Common readable mappings
  const labels: Record<string, string> = {
    Space: 'Space',
    ShiftLeft: 'Left Shift',
    ShiftRight: 'Right Shift',
    ControlLeft: 'Left Ctrl',
    ControlRight: 'Right Ctrl',
    AltLeft: 'Left Alt',
    AltRight: 'Right Alt',
    MetaLeft: 'Left Meta',
    MetaRight: 'Right Meta',
    Backquote: '`',
    Minus: '-',
    Equal: '=',
    BracketLeft: '[',
    BracketRight: ']',
    Backslash: '\\',
    Semicolon: ';',
    Quote: "'",
    Comma: ',',
    Period: '.',
    Slash: '/',
    CapsLock: 'Caps Lock',
    Tab: 'Tab',
    Enter: 'Enter',
    Backspace: 'Backspace',
    Escape: 'Esc',
    ArrowUp: 'Up',
    ArrowDown: 'Down',
    ArrowLeft: 'Left',
    ArrowRight: 'Right',
  };
  if (labels[code]) return labels[code];
  // F-keys: F1 through F12
  if (/^F\d+$/.test(code)) return code;
  // Letter keys: KeyA → A
  if (code.startsWith('Key')) return code.slice(3);
  // Digit keys: Digit0 → 0
  if (code.startsWith('Digit')) return code.slice(5);
  // Numpad keys: Numpad0 → Numpad 0
  if (code.startsWith('Numpad')) return 'Numpad ' + code.slice(6);
  return code;
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

    const savedKey = localStorage.getItem(PUSH_TO_TALK_KEY_KEY);
    if (savedKey) {
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