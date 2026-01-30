'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

const SOUND_STORAGE_KEY = 'opie-sounds-enabled';

interface SoundOptions {
  volume?: number;
}

export function useSounds() {
  const [soundsEnabled, setSoundsEnabled] = useState(true);
  const [mounted, setMounted] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Load preference from localStorage
  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem(SOUND_STORAGE_KEY);
    if (saved !== null) {
      setSoundsEnabled(saved === 'true');
    }
  }, []);

  // Initialize AudioContext lazily
  const getAudioContext = useCallback(() => {
    if (typeof window === 'undefined') return null;
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return audioContextRef.current;
  }, []);

  // Generate notification sound using Web Audio API
  const playNotification = useCallback((options: SoundOptions = {}) => {
    if (!soundsEnabled || !mounted) return;
    
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      const { volume = 0.3 } = options;

      // Create oscillator for pleasant notification sound
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      // Pleasant two-tone notification
      oscillator.frequency.setValueAtTime(880, ctx.currentTime); // A5
      oscillator.frequency.setValueAtTime(1108.73, ctx.currentTime + 0.1); // C#6
      
      oscillator.type = 'sine';
      
      // Fade in and out for smooth sound
      gainNode.gain.setValueAtTime(0, ctx.currentTime);
      gainNode.gain.linearRampToValueAtTime(volume, ctx.currentTime + 0.05);
      gainNode.gain.linearRampToValueAtTime(volume * 0.6, ctx.currentTime + 0.1);
      gainNode.gain.linearRampToValueAtTime(volume * 0.8, ctx.currentTime + 0.15);
      gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.3);

      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.3);
    } catch (e) {
      console.warn('Could not play notification sound:', e);
    }
  }, [soundsEnabled, mounted, getAudioContext]);

  // Generate success sound (task complete)
  const playSuccess = useCallback((options: SoundOptions = {}) => {
    if (!soundsEnabled || !mounted) return;

    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      const { volume = 0.25 } = options;

      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      // Ascending arpeggio for success
      oscillator.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
      oscillator.frequency.setValueAtTime(659.25, ctx.currentTime + 0.08); // E5
      oscillator.frequency.setValueAtTime(783.99, ctx.currentTime + 0.16); // G5
      oscillator.frequency.setValueAtTime(1046.5, ctx.currentTime + 0.24); // C6

      oscillator.type = 'sine';

      gainNode.gain.setValueAtTime(0, ctx.currentTime);
      gainNode.gain.linearRampToValueAtTime(volume, ctx.currentTime + 0.02);
      gainNode.gain.setValueAtTime(volume, ctx.currentTime + 0.32);
      gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.4);

      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.4);
    } catch (e) {
      console.warn('Could not play success sound:', e);
    }
  }, [soundsEnabled, mounted, getAudioContext]);

  // Generate error sound
  const playError = useCallback((options: SoundOptions = {}) => {
    if (!soundsEnabled || !mounted) return;

    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      const { volume = 0.2 } = options;

      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      // Low descending tone for error
      oscillator.frequency.setValueAtTime(220, ctx.currentTime); // A3
      oscillator.frequency.linearRampToValueAtTime(180, ctx.currentTime + 0.2);

      oscillator.type = 'triangle';

      gainNode.gain.setValueAtTime(0, ctx.currentTime);
      gainNode.gain.linearRampToValueAtTime(volume, ctx.currentTime + 0.02);
      gainNode.gain.setValueAtTime(volume, ctx.currentTime + 0.15);
      gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.25);

      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.25);
    } catch (e) {
      console.warn('Could not play error sound:', e);
    }
  }, [soundsEnabled, mounted, getAudioContext]);

  // Toggle sounds
  const toggleSounds = useCallback(() => {
    setSoundsEnabled((prev) => {
      const newValue = !prev;
      localStorage.setItem(SOUND_STORAGE_KEY, String(newValue));
      return newValue;
    });
  }, []);

  // Set sounds enabled/disabled
  const setSounds = useCallback((enabled: boolean) => {
    setSoundsEnabled(enabled);
    localStorage.setItem(SOUND_STORAGE_KEY, String(enabled));
  }, []);

  return {
    soundsEnabled,
    toggleSounds,
    setSounds,
    playNotification,
    playSuccess,
    playError,
  };
}
