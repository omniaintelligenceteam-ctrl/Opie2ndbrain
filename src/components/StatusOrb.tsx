'use client';
import { useEffect, useRef, useState } from 'react';

type OrbStatus = 'idle' | 'thinking' | 'speaking' | 'listening' | 'error';

interface StatusOrbProps {
  status: OrbStatus;
  size?: number;
  showLabel?: boolean;
}

const STATUS_CONFIG = {
  idle: {
    color: '#22c55e',
    glowColor: 'rgba(34, 197, 94, 0.4)',
    label: 'Online',
    pulseSpeed: 3000,
    ringCount: 2,
  },
  thinking: {
    color: '#8b5cf6',
    glowColor: 'rgba(139, 92, 246, 0.5)',
    label: 'Thinking',
    pulseSpeed: 800,
    ringCount: 3,
  },
  speaking: {
    color: '#f59e0b',
    glowColor: 'rgba(245, 158, 11, 0.5)',
    label: 'Speaking',
    pulseSpeed: 500,
    ringCount: 4,
  },
  listening: {
    color: '#3b82f6',
    glowColor: 'rgba(59, 130, 246, 0.5)',
    label: 'Listening',
    pulseSpeed: 1000,
    ringCount: 3,
  },
  error: {
    color: '#ef4444',
    glowColor: 'rgba(239, 68, 68, 0.5)',
    label: 'Error',
    pulseSpeed: 400,
    ringCount: 2,
  },
};

export default function StatusOrb({ status, size = 12, showLabel = false }: StatusOrbProps) {
  const config = STATUS_CONFIG[status];
  const [phase, setPhase] = useState(0);
  const frameRef = useRef<number>(0);

  useEffect(() => {
    const animate = () => {
      setPhase(p => (p + 1) % 360);
      frameRef.current = requestAnimationFrame(animate);
    };
    frameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameRef.current);
  }, []);

  // Calculate dynamic effects based on status
  const breatheScale = status === 'idle'
    ? 1 + Math.sin(phase * 0.02) * 0.1
    : status === 'thinking'
    ? 1 + Math.sin(phase * 0.08) * 0.15
    : status === 'speaking'
    ? 1 + Math.sin(phase * 0.12) * 0.2
    : status === 'listening'
    ? 1 + Math.sin(phase * 0.06) * 0.12
    : 1 + Math.random() * 0.1; // Error - glitchy

  const glowIntensity = status === 'idle'
    ? 0.3 + Math.sin(phase * 0.02) * 0.1
    : status === 'error'
    ? 0.5 + Math.random() * 0.3
    : 0.5 + Math.sin(phase * 0.05) * 0.2;

  // Rotation for thinking swirl
  const rotation = status === 'thinking' ? phase * 2 : 0;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <div
        style={{
          position: 'relative',
          width: size * 3,
          height: size * 3,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* Outer glow rings */}
        {Array.from({ length: config.ringCount }).map((_, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              width: size * (1.5 + i * 0.8),
              height: size * (1.5 + i * 0.8),
              borderRadius: '50%',
              border: `1px solid ${config.color}`,
              opacity: (1 - i * 0.25) * glowIntensity * (status === 'speaking' ? (1 + Math.sin((phase + i * 60) * 0.1) * 0.5) : 1),
              transform: `scale(${1 + (status === 'speaking' ? Math.sin((phase + i * 30) * 0.08) * 0.3 : 0)})`,
              animation: status === 'speaking' ? `ring-expand-${i} ${config.pulseSpeed}ms ease-out infinite` : undefined,
              transition: 'opacity 0.3s ease',
            }}
          />
        ))}

        {/* Inner swirl for thinking */}
        {status === 'thinking' && (
          <div
            style={{
              position: 'absolute',
              width: size * 1.2,
              height: size * 1.2,
              borderRadius: '50%',
              background: `conic-gradient(from ${rotation}deg, transparent, ${config.color}, transparent)`,
              opacity: 0.6,
              filter: 'blur(2px)',
            }}
          />
        )}

        {/* Core orb */}
        <div
          style={{
            width: size,
            height: size,
            borderRadius: '50%',
            background: status === 'error'
              ? `radial-gradient(circle, ${config.color}, #991b1b)`
              : `radial-gradient(circle at 30% 30%, ${config.color}, ${config.color}88)`,
            boxShadow: `
              0 0 ${size * glowIntensity}px ${config.glowColor},
              0 0 ${size * glowIntensity * 2}px ${config.glowColor},
              inset 0 0 ${size * 0.3}px rgba(255,255,255,0.3)
            `,
            transform: `scale(${breatheScale}) ${status === 'error' ? `translate(${Math.random() * 2 - 1}px, ${Math.random() * 2 - 1}px)` : ''}`,
            transition: status === 'error' ? 'none' : 'transform 0.1s ease-out',
          }}
        />

        {/* Highlight */}
        <div
          style={{
            position: 'absolute',
            width: size * 0.3,
            height: size * 0.3,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.6)',
            top: '35%',
            left: '30%',
            transform: 'translate(-50%, -50%)',
            filter: 'blur(1px)',
          }}
        />
      </div>

      {showLabel && (
        <span
          style={{
            fontSize: '12px',
            color: config.color,
            fontWeight: 500,
            textShadow: `0 0 10px ${config.glowColor}`,
          }}
        >
          {config.label}
        </span>
      )}

      {/* Keyframe styles */}
      <style>{`
        @keyframes ring-expand-0 {
          0%, 100% { transform: scale(1); opacity: 0.6; }
          50% { transform: scale(1.3); opacity: 0.2; }
        }
        @keyframes ring-expand-1 {
          0%, 100% { transform: scale(1); opacity: 0.4; }
          50% { transform: scale(1.4); opacity: 0.1; }
        }
        @keyframes ring-expand-2 {
          0%, 100% { transform: scale(1); opacity: 0.3; }
          50% { transform: scale(1.5); opacity: 0.05; }
        }
        @keyframes ring-expand-3 {
          0%, 100% { transform: scale(1); opacity: 0.2; }
          50% { transform: scale(1.6); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
