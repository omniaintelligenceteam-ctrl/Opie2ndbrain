'use client';

import React from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useSounds } from '../hooks/useSounds';

export interface ThemeToggleProps {
  showLabel?: boolean;
  size?: 'small' | 'medium' | 'large';
}

/**
 * Theme toggle button component
 * Switches between dark and light themes
 */
export function ThemeToggle({ 
  showLabel = true, 
  size = 'medium' 
}: ThemeToggleProps): React.ReactElement {
  const { themeName, toggleTheme } = useTheme();

  const sizeStyles = {
    small: { padding: '8px 14px', fontSize: '0.75rem' },
    medium: { padding: '10px 18px', fontSize: '0.85rem' },
    large: { padding: '12px 22px', fontSize: '0.95rem' },
  };

  return (
    <button 
      onClick={toggleTheme}
      style={{
        ...styles.toggle,
        ...sizeStyles[size],
        background: themeName === 'dark' 
          ? 'linear-gradient(135deg, #1a1a2e 0%, #0d0d1a 100%)'
          : 'linear-gradient(135deg, #f8f9fc 0%, #e8eaed 100%)',
        color: themeName === 'dark' ? '#fff' : '#1a1a2e',
      }}
      title={`Switch to ${themeName === 'dark' ? 'light' : 'dark'} theme`}
    >
      {themeName === 'dark' ? '🌙' : '☀️'}
      {showLabel && (
        <span style={styles.label}>
          {themeName === 'dark' ? ' Dark' : ' Light'}
        </span>
      )}
    </button>
  );
}

export interface SoundToggleProps {
  showLabel?: boolean;
  size?: 'small' | 'medium' | 'large';
}

/**
 * Sound toggle button component
 * Enables/disables notification sounds
 */
export function SoundToggle({ 
  showLabel = true, 
  size = 'medium' 
}: SoundToggleProps): React.ReactElement {
  const { soundsEnabled, toggleSounds } = useSounds();

  const sizeStyles = {
    small: { padding: '8px 14px', fontSize: '0.75rem' },
    medium: { padding: '10px 18px', fontSize: '0.85rem' },
    large: { padding: '12px 22px', fontSize: '0.95rem' },
  };

  return (
    <button 
      onClick={toggleSounds}
      style={{
        ...styles.toggle,
        ...sizeStyles[size],
        background: soundsEnabled ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)',
        color: soundsEnabled ? '#22c55e' : '#ef4444',
      }}
      title={soundsEnabled ? 'Mute sounds' : 'Enable sounds'}
    >
      {soundsEnabled ? '🔔' : '🔕'}
      {showLabel && (
        <span style={styles.label}>
          {soundsEnabled ? ' On' : ' Muted'}
        </span>
      )}
    </button>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  toggle: {
    borderRadius: '10px',
    border: '1px solid rgba(255,255,255,0.08)',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    minHeight: '40px',
    fontWeight: 600,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '4px',
  },
  label: {
    marginLeft: '4px',
  },
};

export default ThemeToggle;
