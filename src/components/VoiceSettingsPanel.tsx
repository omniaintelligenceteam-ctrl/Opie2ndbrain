'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  useVoiceSettings,
  TTS_PROVIDERS,
  formatKeyLabel,
  type VoiceOption,
} from '../hooks/useVoiceSettings';

const FONT_MONO = "'JetBrains Mono', 'Fira Code', monospace";

/**
 * Standalone voice settings panel — no ThemeContext dependency.
 * Works in both the full Opie Kanban and the simpler Ops Center page.
 */
export default function VoiceSettingsPanel() {
  const { settings, update, reset, voices } = useVoiceSettings();

  // ─── Push-to-Talk key capture ──────────────────────────────────
  const [isCapturing, setIsCapturing] = useState(false);

  useEffect(() => {
    if (!isCapturing) return;

    // Keyboard capture
    const keyHandler = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (['Meta', 'Control', 'Alt', 'Shift'].includes(e.key) &&
          !['ShiftLeft','ShiftRight','ControlLeft','ControlRight','AltLeft','AltRight','CapsLock'].includes(e.code)) {
        return;
      }
      update('pushToTalkKey', e.code);
      update('pushToTalkLabel', formatKeyLabel(e.code));
      setIsCapturing(false);
    };

    // Mouse button capture (side buttons, middle click, right click)
    const mouseHandler = (e: MouseEvent) => {
      if (e.button === 0) return; // Don't capture left click — needed for UI
      e.preventDefault();
      e.stopPropagation();
      const code = `Mouse${e.button}`;
      update('pushToTalkKey', code);
      update('pushToTalkLabel', formatKeyLabel(code));
      setIsCapturing(false);
    };

    // Prevent context menu during capture (so right click can be captured)
    const contextHandler = (e: Event) => { e.preventDefault(); };

    window.addEventListener('keydown', keyHandler, true);
    window.addEventListener('mousedown', mouseHandler, true);
    window.addEventListener('contextmenu', contextHandler, true);
    return () => {
      window.removeEventListener('keydown', keyHandler, true);
      window.removeEventListener('mousedown', mouseHandler, true);
      window.removeEventListener('contextmenu', contextHandler, true);
    };
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
      audio.onended = () => { URL.revokeObjectURL(url); setPreviewing(false); };
      audio.onerror = () => setPreviewing(false);
      await audio.play();
    } catch {
      setPreviewing(false);
    }
  }, [settings.ttsProvider, settings.ttsVoice, settings.speechSpeed, previewing]);

  return (
    <div style={{
      height: '100%', overflow: 'auto',
      display: 'flex', flexDirection: 'column', gap: 16,
      padding: 4,
    }}>
      {/* ═══════════ Voice Selection ═══════════ */}
      <div style={card}>
        <h3 style={cardTitle}>🎤 Voice</h3>

        {/* Provider chips */}
        <div style={row}>
          <span style={label}>Provider</span>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {TTS_PROVIDERS.map(p => (
              <button
                key={p.id}
                onClick={() => {
                  update('ttsProvider', p.id);
                  const defaultVoice = p.id === 'openai' ? 'nova' :
                    p.id === 'elevenlabs' ? 'default' : 'en-US-AriaNeural';
                  update('ttsVoice', defaultVoice);
                }}
                style={{
                  ...chip,
                  ...(settings.ttsProvider === p.id ? chipActive : {}),
                }}
              >
                {p.label} <span style={{ opacity: 0.45, fontSize: 10, marginLeft: 4 }}>{p.note}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Voice grid */}
        <div style={{ ...row, flexDirection: 'column', alignItems: 'stretch', gap: 10 }}>
          <span style={label}>Voice</span>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))',
            gap: 8,
          }}>
            {voices.map((v: VoiceOption) => {
              const active = settings.ttsVoice === v.id;
              return (
                <button
                  key={v.id}
                  onClick={() => update('ttsVoice', v.id)}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                    padding: '12px 8px', borderRadius: 12, cursor: 'pointer',
                    transition: 'all 0.15s ease', position: 'relative',
                    border: active ? '1px solid rgba(168,85,247,0.5)' : '1px solid rgba(255,255,255,0.08)',
                    background: active ? 'rgba(168,85,247,0.15)' : 'rgba(255,255,255,0.03)',
                    boxShadow: active ? '0 0 14px rgba(168,85,247,0.15)' : 'none',
                    color: '#fff',
                  }}
                >
                  <span style={{ fontSize: 22 }}>{v.gender === 'female' ? '👩' : '👨'}</span>
                  <span style={{ fontFamily: FONT_MONO, fontSize: 12, fontWeight: 600 }}>{v.label}</span>
                  {active && <span style={{
                    position: 'absolute', top: 4, right: 6,
                    fontSize: 10, color: '#a855f7', fontWeight: 700,
                  }}>✓</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* Preview */}
        <div style={{ ...row, borderBottom: 'none' }}>
          <span style={label}>Preview</span>
          <button
            onClick={previewVoice}
            disabled={previewing}
            style={{
              ...chip,
              background: previewing ? 'rgba(168,85,247,0.1)' : 'rgba(168,85,247,0.15)',
              borderColor: 'rgba(168,85,247,0.3)',
              color: '#c084fc',
              opacity: previewing ? 0.5 : 1,
            }}
          >
            {previewing ? '🔊 Playing...' : '▶ Test Voice'}
          </button>
        </div>
      </div>

      {/* ═══════════ Push-to-Talk ═══════════ */}
      <div style={card}>
        <h3 style={cardTitle}>🎙️ Push-to-Talk</h3>
        <div style={row}>
          <span style={label}>Hotkey</span>
          <button
            onClick={() => setIsCapturing(true)}
            style={{
              fontFamily: FONT_MONO, fontSize: 14, fontWeight: 700,
              padding: '8px 22px', borderRadius: 10, cursor: 'pointer',
              minWidth: 90, textAlign: 'center',
              color: isCapturing ? '#c084fc' : '#fff',
              border: isCapturing ? '2px solid rgba(168,85,247,0.6)' : '2px solid rgba(255,255,255,0.12)',
              background: isCapturing ? 'rgba(168,85,247,0.1)' : 'rgba(255,255,255,0.04)',
              transition: 'all 0.2s ease',
            }}
          >
            {isCapturing ? '⏎ Press key...' : settings.pushToTalkLabel}
          </button>
        </div>
        <div style={row}>
          <span style={label}>Auto-Speak Replies</span>
          <button
            onClick={() => update('autoSpeak', !settings.autoSpeak)}
            style={{
              ...chip,
              background: settings.autoSpeak ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
              borderColor: settings.autoSpeak ? 'rgba(34,197,94,0.35)' : 'rgba(239,68,68,0.35)',
              color: settings.autoSpeak ? '#4ade80' : '#f87171',
            }}
          >
            {settings.autoSpeak ? '🔊 On' : '🔇 Off'}
          </button>
        </div>
        <div style={row}>
          <span style={label}>Speech Speed</span>
          <div style={{ display: 'flex', gap: 6 }}>
            {[0.75, 1.0, 1.25, 1.5].map(spd => (
              <button
                key={spd}
                onClick={() => update('speechSpeed', spd)}
                style={{
                  ...chip,
                  ...(settings.speechSpeed === spd ? chipActive : {}),
                  padding: '5px 12px', fontSize: 12,
                }}
              >
                {spd}x
              </button>
            ))}
          </div>
        </div>
        <div style={row}>
          <span style={label}>Silence Timeout</span>
          <div style={{ display: 'flex', gap: 6 }}>
            {[800, 1200, 1800, 2500].map(ms => (
              <button
                key={ms}
                onClick={() => update('silenceTimeout', ms)}
                style={{
                  ...chip,
                  ...(settings.silenceTimeout === ms ? chipActive : {}),
                  padding: '5px 12px', fontSize: 12,
                }}
              >
                {(ms / 1000).toFixed(1)}s
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ═══════════ Reset ═══════════ */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '4px 0' }}>
        <button
          onClick={reset}
          style={{
            ...chip,
            background: 'rgba(239,68,68,0.08)',
            borderColor: 'rgba(239,68,68,0.25)',
            color: '#f87171',
          }}
        >
          Reset to Defaults
        </button>
      </div>
    </div>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────
const card: React.CSSProperties = {
  background: 'rgba(12, 12, 20, 0.95)',
  border: '1px solid rgba(168,85,247,0.18)',
  borderRadius: 14,
  padding: 20,
};

const cardTitle: React.CSSProperties = {
  margin: '0 0 16px 0',
  fontFamily: FONT_MONO,
  fontSize: 13,
  fontWeight: 700,
  letterSpacing: '0.06em',
  color: '#a855f7',
};

const row: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '12px 0',
  borderBottom: '1px solid rgba(255,255,255,0.04)',
  flexWrap: 'wrap',
  gap: 8,
};

const label: React.CSSProperties = {
  fontFamily: FONT_MONO,
  fontSize: 12,
  color: 'rgba(255,255,255,0.6)',
  fontWeight: 500,
};

const chip: React.CSSProperties = {
  fontFamily: FONT_MONO,
  fontSize: 11,
  fontWeight: 600,
  padding: '6px 14px',
  borderRadius: 20,
  border: '1px solid rgba(255,255,255,0.1)',
  background: 'rgba(255,255,255,0.04)',
  color: 'rgba(255,255,255,0.7)',
  cursor: 'pointer',
  transition: 'all 0.15s ease',
  display: 'flex',
  alignItems: 'center',
};

const chipActive: React.CSSProperties = {
  background: 'rgba(168,85,247,0.15)',
  borderColor: 'rgba(168,85,247,0.4)',
  color: '#c084fc',
};
