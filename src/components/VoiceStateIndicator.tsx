'use client';

import React, { memo } from 'react';
import type { VoiceState } from '@/lib/voiceStateMachine';

interface VoiceStateIndicatorProps {
  state: VoiceState;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  error?: string | null;
}

/**
 * Visual feedback for all voice states.
 * - idle: green dot
 * - listening: pulsing blue dot + mic icon
 * - processing: spinning purple dot
 * - speaking: animated amber waveform
 * - error: red dot + error message
 */
const VoiceStateIndicator = memo(function VoiceStateIndicator({
  state,
  size = 'md',
  showLabel = false,
  error,
}: VoiceStateIndicatorProps) {
  const sizes = {
    sm: { dot: 8, font: '0.7rem', gap: 4 },
    md: { dot: 12, font: '0.8rem', gap: 6 },
    lg: { dot: 16, font: '0.9rem', gap: 8 },
  };
  const s = sizes[size];

  const stateConfig: Record<VoiceState, { color: string; label: string; animate: string }> = {
    idle: {
      color: '#22c55e',
      label: 'Ready',
      animate: 'none',
    },
    listening: {
      color: '#3b82f6',
      label: '🎤 Listening...',
      animate: 'voicePulse 1.5s ease-in-out infinite',
    },
    processing: {
      color: '#8b5cf6',
      label: '✨ Thinking...',
      animate: 'voiceSpin 1s linear infinite',
    },
    speaking: {
      color: '#f59e0b',
      label: '🔊 Speaking...',
      animate: 'voiceBounce 0.6s ease-in-out infinite alternate',
    },
    error: {
      color: '#ef4444',
      label: error || 'Error',
      animate: 'none',
    },
  };

  const config = stateConfig[state];

  return (
    <>
      <style>{voiceIndicatorStyles}</style>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: s.gap,
      }}>
        <span
          style={{
            width: s.dot,
            height: s.dot,
            borderRadius: '50%',
            background: config.color,
            display: 'inline-block',
            animation: config.animate,
            boxShadow: state !== 'idle' ? `0 0 ${s.dot}px ${config.color}80` : 'none',
            transition: 'background 0.3s ease, box-shadow 0.3s ease',
          }}
        />
        {showLabel && (
          <span style={{
            fontSize: s.font,
            color: state === 'error' ? '#ef4444' : 'rgba(255,255,255,0.7)',
            transition: 'color 0.3s ease',
            whiteSpace: 'nowrap',
          }}>
            {config.label}
          </span>
        )}
      </div>
    </>
  );
});

const voiceIndicatorStyles = `
  @keyframes voicePulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.6; transform: scale(1.3); }
  }
  @keyframes voiceSpin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
  @keyframes voiceBounce {
    from { transform: scale(1); }
    to { transform: scale(1.2); }
  }
`;

/**
 * Listening waveform animation bars.
 */
export const VoiceWaveform = memo(function VoiceWaveform({
  active,
  color = '#22c55e',
  bars = 5,
}: {
  active: boolean;
  color?: string;
  bars?: number;
}) {
  return (
    <>
      <style>{`
        @keyframes voiceWaveBar {
          0%, 100% { height: 4px; }
          50% { height: 16px; }
        }
      `}</style>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        height: 16,
      }}>
        {Array.from({ length: bars }).map((_, i) => (
          <div
            key={i}
            style={{
              width: 3,
              borderRadius: 2,
              background: color,
              animation: active ? `voiceWaveBar 0.5s ease-in-out infinite` : 'none',
              animationDelay: `${i * 0.1}s`,
              height: active ? undefined : 4,
              transition: 'height 0.2s ease',
            }}
          />
        ))}
      </div>
    </>
  );
});

/**
 * Browser compatibility warning banner.
 */
export function VoiceBrowserWarning({ warnings }: { warnings: string[] }) {
  if (warnings.length === 0) return null;

  return (
    <div style={{
      padding: '8px 12px',
      background: 'rgba(245, 158, 11, 0.15)',
      border: '1px solid rgba(245, 158, 11, 0.3)',
      borderRadius: 8,
      margin: '8px 0',
    }}>
      {warnings.map((w, i) => (
        <p key={i} style={{
          margin: i === 0 ? 0 : '4px 0 0',
          fontSize: '0.8rem',
          color: 'rgba(255, 255, 255, 0.8)',
        }}>
          ⚠️ {w}
        </p>
      ))}
    </div>
  );
}

export default VoiceStateIndicator;
