'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useSounds } from '../hooks/useSounds';
import {
  useVoiceSettings,
  AZURE_VOICES,
  OPENAI_VOICES,
  TTS_PROVIDERS,
  formatKeyLabel,
  type VoiceOption,
} from '../hooks/useVoiceSettings';

export interface SettingsViewProps {
  isMobile: boolean;
  isTablet: boolean;
  sidebarExpanded: boolean;
  onToggleSidebar: () => void;
  onShowShortcuts: () => void;
}

/**
 * Settings panel — voice, appearance, push-to-talk, keyboard
 */
export function SettingsView({
  isMobile,
  isTablet,
  sidebarExpanded,
  onToggleSidebar,
  onShowShortcuts,
}: SettingsViewProps): React.ReactElement {
  const { themeName, toggleTheme } = useTheme();
  const { soundsEnabled, toggleSounds } = useSounds();
  const { settings, update, reset, voices } = useVoiceSettings();

  // ─── Push-to-Talk key capture ──────────────────────────────────
  const [isCapturing, setIsCapturing] = useState(false);
  const captureRef = useRef<HTMLButtonElement>(null);

  const handleStartCapture = useCallback(() => {
    setIsCapturing(true);
  }, []);

  useEffect(() => {
    if (!isCapturing) return;
    const handler = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      // Ignore modifier-only presses that aren't standalone keys
      if (['Meta', 'Control', 'Alt', 'Shift'].includes(e.key) && !['ShiftLeft','ShiftRight','ControlLeft','ControlRight','AltLeft','AltRight','CapsLock'].includes(e.code)) {
        return;
      }
      update('pushToTalkKey', e.code);
      update('pushToTalkLabel', formatKeyLabel(e.code));
      setIsCapturing(false);
    };
    window.addEventListener('keydown', handler, true);
    return () => window.removeEventListener('keydown', handler, true);
  }, [isCapturing, update]);

  // ─── TTS preview ──────────────────────────────────────────────
  const [previewing, setPreviewing] = useState(false);
  const previewVoice = useCallback(async () => {
    if (previewing) return;
    setPreviewing(true);
    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: 'Hey Wes, this is what I sound like. Ready when you are.',
          provider: settings.ttsProvider,
          voice: settings.ttsVoice,
        }),
      });
      if (!res.ok) throw new Error('TTS failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.playbackRate = settings.speechSpeed;
      audio.onended = () => {
        URL.revokeObjectURL(url);
        setPreviewing(false);
      };
      audio.onerror = () => setPreviewing(false);
      await audio.play();
    } catch {
      setPreviewing(false);
    }
  }, [settings.ttsProvider, settings.ttsVoice, settings.speechSpeed, previewing]);

  // ─── Voice grid for selection ──────────────────────────────────
  const renderVoiceGrid = () => (
    <div style={s.voiceGrid}>
      {voices.map((v: VoiceOption) => {
        const active = settings.ttsVoice === v.id;
        return (
          <button
            key={v.id}
            onClick={() => update('ttsVoice', v.id)}
            style={{
              ...s.voiceCard,
              ...(active ? s.voiceCardActive : {}),
            }}
          >
            <span style={s.voiceIcon}>{v.gender === 'female' ? '👩' : '👨'}</span>
            <span style={s.voiceName}>{v.label}</span>
            {active && <span style={s.voiceCheck}>✓</span>}
          </button>
        );
      })}
    </div>
  );

  return (
    <div style={{
      ...s.settingsGrid,
      gridTemplateColumns: isMobile ? '1fr' : isTablet ? 'repeat(2, 1fr)' : 'repeat(2, 1fr)',
      gap: isMobile ? '16px' : '20px',
    }}>

      {/* ═══════════ Voice & TTS ═══════════ */}
      <div style={{ ...s.settingsCard, gridColumn: isMobile ? '1' : '1 / -1' }}>
        <h4 style={s.settingsCardTitle}>🎤 Voice & TTS</h4>

        {/* Provider */}
        <div style={s.settingItem}>
          <span>TTS Provider</span>
          <div style={s.chipRow}>
            {TTS_PROVIDERS.map(p => (
              <button
                key={p.id}
                onClick={() => {
                  update('ttsProvider', p.id);
                  // Reset voice to provider default
                  const defaultVoice = p.id === 'openai' ? 'nova' :
                    p.id === 'elevenlabs' ? 'default' : 'en-US-AriaNeural';
                  update('ttsVoice', defaultVoice);
                }}
                style={{
                  ...s.chip,
                  ...(settings.ttsProvider === p.id ? s.chipActive : {}),
                }}
              >
                {p.label}
                <span style={s.chipNote}>{p.note}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Voice Selection */}
        <div style={s.settingItem}>
          <span>Voice</span>
        </div>
        {renderVoiceGrid()}

        {/* Preview */}
        <div style={{ ...s.settingItem, borderBottom: 'none' }}>
          <span>Preview</span>
          <button
            onClick={previewVoice}
            disabled={previewing}
            style={{
              ...s.settingToggle,
              opacity: previewing ? 0.5 : 1,
              background: previewing ? 'rgba(139,92,246,0.1)' : 'rgba(139,92,246,0.15)',
              color: '#a78bfa',
              border: '1px solid rgba(139,92,246,0.2)',
            }}
          >
            {previewing ? '🔊 Playing...' : '▶ Test Voice'}
          </button>
        </div>
      </div>

      {/* ═══════════ Push-to-Talk ═══════════ */}
      <div style={s.settingsCard}>
        <h4 style={s.settingsCardTitle}>🎙️ Push-to-Talk</h4>
        <div style={s.settingItem}>
          <span>Hotkey</span>
          <button
            ref={captureRef}
            onClick={handleStartCapture}
            style={{
              ...s.pttKeyBtn,
              ...(isCapturing ? s.pttKeyBtnCapturing : {}),
            }}
          >
            {isCapturing ? '⏎ Press any key...' : settings.pushToTalkLabel}
          </button>
        </div>
        <div style={s.settingItem}>
          <span>Auto-Speak Replies</span>
          <button
            onClick={() => update('autoSpeak', !settings.autoSpeak)}
            style={{
              ...s.settingToggle,
              background: settings.autoSpeak ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)',
              color: settings.autoSpeak ? '#22c55e' : '#ef4444',
            }}
          >
            {settings.autoSpeak ? '🔊 On' : '🔇 Off'}
          </button>
        </div>
        <div style={s.settingItem}>
          <span>Speech Speed</span>
          <div style={s.speedRow}>
            {[0.75, 1.0, 1.25, 1.5].map(spd => (
              <button
                key={spd}
                onClick={() => update('speechSpeed', spd)}
                style={{
                  ...s.speedBtn,
                  ...(settings.speechSpeed === spd ? s.speedBtnActive : {}),
                }}
              >
                {spd}x
              </button>
            ))}
          </div>
        </div>
        <div style={s.settingItem}>
          <span>Silence Timeout</span>
          <div style={s.speedRow}>
            {[800, 1200, 1800, 2500].map(ms => (
              <button
                key={ms}
                onClick={() => update('silenceTimeout', ms)}
                style={{
                  ...s.speedBtn,
                  ...(settings.silenceTimeout === ms ? s.speedBtnActive : {}),
                }}
              >
                {(ms / 1000).toFixed(1)}s
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ═══════════ Appearance ═══════════ */}
      <div style={s.settingsCard}>
        <h4 style={s.settingsCardTitle}>🎨 Appearance</h4>
        <div style={s.settingItem}>
          <span>Theme</span>
          <button
            onClick={toggleTheme}
            style={{
              ...s.settingToggle,
              background: themeName === 'dark'
                ? 'linear-gradient(135deg, #1a1a2e 0%, #0d0d1a 100%)'
                : 'linear-gradient(135deg, #f8f9fc 0%, #e8eaed 100%)',
              color: themeName === 'dark' ? '#fff' : '#1a1a2e',
            }}
          >
            {themeName === 'dark' ? '🌙 Dark' : '☀️ Light'}
          </button>
        </div>
        <div style={s.settingItem}>
          <span>Sidebar</span>
          <button onClick={onToggleSidebar} style={s.settingToggle}>
            {sidebarExpanded ? '◀ Collapse' : '▶ Expand'}
          </button>
        </div>
        <div style={s.settingItem}>
          <span>Notification Sounds</span>
          <button
            onClick={toggleSounds}
            style={{
              ...s.settingToggle,
              background: soundsEnabled ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)',
              color: soundsEnabled ? '#22c55e' : '#ef4444',
            }}
          >
            {soundsEnabled ? '🔔 On' : '🔕 Muted'}
          </button>
        </div>
      </div>

      {/* ═══════════ Keyboard Shortcuts ═══════════ */}
      <div style={s.settingsCard}>
        <h4 style={s.settingsCardTitle}>⌨️ Keyboard Shortcuts</h4>
        <div style={s.settingItem}>
          <span>Command Palette</span>
          <kbd style={s.kbdKey}>⌘K</kbd>
        </div>
        <div style={s.settingItem}>
          <span>New Message</span>
          <kbd style={s.kbdKey}>⌘N</kbd>
        </div>
        <div style={s.settingItem}>
          <span>Push-to-Talk</span>
          <kbd style={s.kbdKey}>{settings.pushToTalkLabel}</kbd>
        </div>
        <div style={s.settingItem}>
          <span>Show All Shortcuts</span>
          <button onClick={onShowShortcuts} style={s.settingToggle}>
            View All ➔
          </button>
        </div>
      </div>

      {/* ═══════════ Agent Settings ═══════════ */}
      <div style={s.settingsCard}>
        <h4 style={s.settingsCardTitle}>🤖 Agent Settings</h4>
        <div style={s.settingItem}>
          <span>Auto-deploy</span>
          <span style={s.settingValue}>Off</span>
        </div>
        <div style={s.settingItem}>
          <span>Max concurrent</span>
          <span style={s.settingValue}>5</span>
        </div>
      </div>

      {/* ═══════════ Reset ═══════════ */}
      <div style={s.settingsCard}>
        <h4 style={s.settingsCardTitle}>🔧 Advanced</h4>
        <div style={s.settingItem}>
          <span>Reset Voice Settings</span>
          <button
            onClick={reset}
            style={{
              ...s.settingToggle,
              background: 'rgba(239,68,68,0.1)',
              color: '#ef4444',
              border: '1px solid rgba(239,68,68,0.2)',
            }}
          >
            Reset to Defaults
          </button>
        </div>
        <div style={s.settingItem}>
          <span>PWA</span>
          <span style={{ ...s.settingValue, color: '#22c55e' }}>Available</span>
        </div>
      </div>
    </div>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────
const s: { [key: string]: React.CSSProperties } = {
  settingsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '24px',
  },
  settingsCard: {
    background: 'rgba(20, 20, 35, 0.6)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    borderRadius: '20px',
    padding: '28px',
    border: '1px solid rgba(255,255,255,0.06)',
    boxShadow: '0 4px 30px rgba(0,0,0,0.2)',
    position: 'relative',
    overflow: 'hidden',
    transition: 'all 0.3s ease',
  },
  settingsCardTitle: {
    color: '#fff',
    fontSize: '1.1rem',
    fontWeight: 600,
    margin: '0 0 24px 0',
    letterSpacing: '-0.02em',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  settingItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '14px 0',
    borderBottom: '1px solid rgba(255,255,255,0.04)',
    color: 'rgba(255,255,255,0.7)',
    fontSize: '0.9rem',
    fontWeight: 500,
    flexWrap: 'wrap' as const,
    gap: '8px',
  },
  settingValue: {
    color: 'rgba(255,255,255,0.45)',
    fontWeight: 500,
  },
  settingToggle: {
    padding: '10px 18px',
    borderRadius: '10px',
    border: '1px solid rgba(255,255,255,0.08)',
    background: 'rgba(255,255,255,0.04)',
    color: 'rgba(255,255,255,0.8)',
    fontSize: '0.85rem',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    minHeight: '40px',
  },
  kbdKey: {
    padding: '6px 12px',
    background: 'rgba(255,255,255,0.06)',
    borderRadius: '8px',
    fontSize: '0.8rem',
    color: 'rgba(255,255,255,0.55)',
    fontFamily: '"JetBrains Mono", "SF Mono", monospace',
    fontWeight: 500,
    border: '1px solid rgba(255,255,255,0.08)',
  },

  // ─── Voice grid ─────────────────────────────────────────────
  voiceGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
    gap: '10px',
    paddingBottom: '14px',
    borderBottom: '1px solid rgba(255,255,255,0.04)',
  },
  voiceCard: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: '6px',
    padding: '14px 8px',
    borderRadius: '14px',
    border: '1px solid rgba(255,255,255,0.06)',
    background: 'rgba(255,255,255,0.03)',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    position: 'relative' as const,
  },
  voiceCardActive: {
    background: 'rgba(139,92,246,0.15)',
    border: '1px solid rgba(139,92,246,0.4)',
    boxShadow: '0 0 16px rgba(139,92,246,0.15)',
  },
  voiceIcon: { fontSize: '1.6rem' },
  voiceName: { fontSize: '0.82rem', fontWeight: 600, color: 'rgba(255,255,255,0.85)' },
  voiceCheck: {
    position: 'absolute' as const,
    top: '6px',
    right: '8px',
    fontSize: '0.7rem',
    color: '#a78bfa',
    fontWeight: 700,
  },

  // ─── Provider chips ─────────────────────────────────────────
  chipRow: {
    display: 'flex',
    gap: '6px',
    flexWrap: 'wrap' as const,
  },
  chip: {
    padding: '7px 14px',
    borderRadius: '20px',
    border: '1px solid rgba(255,255,255,0.08)',
    background: 'rgba(255,255,255,0.03)',
    color: 'rgba(255,255,255,0.6)',
    fontSize: '0.78rem',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  chipActive: {
    background: 'rgba(59,130,246,0.15)',
    border: '1px solid rgba(59,130,246,0.4)',
    color: '#60a5fa',
  },
  chipNote: {
    fontSize: '0.68rem',
    opacity: 0.5,
  },

  // ─── Speed buttons ──────────────────────────────────────────
  speedRow: {
    display: 'flex',
    gap: '6px',
  },
  speedBtn: {
    padding: '6px 14px',
    borderRadius: '8px',
    border: '1px solid rgba(255,255,255,0.06)',
    background: 'rgba(255,255,255,0.03)',
    color: 'rgba(255,255,255,0.55)',
    fontSize: '0.8rem',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  speedBtnActive: {
    background: 'rgba(59,130,246,0.15)',
    border: '1px solid rgba(59,130,246,0.3)',
    color: '#60a5fa',
  },

  // ─── Push-to-Talk key button ────────────────────────────────
  pttKeyBtn: {
    padding: '10px 24px',
    borderRadius: '12px',
    border: '2px solid rgba(255,255,255,0.1)',
    background: 'rgba(255,255,255,0.04)',
    color: '#fff',
    fontSize: '0.95rem',
    fontWeight: 700,
    fontFamily: '"JetBrains Mono", "SF Mono", monospace',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    minWidth: '100px',
    textAlign: 'center' as const,
  },
  pttKeyBtnCapturing: {
    border: '2px solid rgba(139,92,246,0.6)',
    background: 'rgba(139,92,246,0.1)',
    color: '#a78bfa',
    animation: 'pulse 1.5s ease-in-out infinite',
  },
};

export default SettingsView;
