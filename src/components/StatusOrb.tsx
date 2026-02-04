'use client';
import { useEffect, useRef, useState } from 'react';

type OrbStatus = 'idle' | 'thinking' | 'speaking' | 'listening' | 'error';

interface StatusOrbProps {
  status: OrbStatus;
  size?: number;
  showLabel?: boolean;
}

// Enhanced Neon Status Config
const STATUS_CONFIG = {
  idle: {
    color: '#22c55e',
    glowColor: 'rgba(34, 197, 94, 0.6)',
    outerGlow: '0 0 30px rgba(34, 197, 94, 0.5), 0 0 60px rgba(34, 197, 94, 0.3)',
    label: 'Online',
    pulseSpeed: 3000,
    ringCount: 3,
  },
  thinking: {
    color: '#a855f7',
    glowColor: 'rgba(168, 85, 247, 0.7)',
    outerGlow: '0 0 30px rgba(168, 85, 247, 0.6), 0 0 60px rgba(6, 182, 212, 0.3)',
    label: 'Thinking',
    pulseSpeed: 800,
    ringCount: 4,
  },
  speaking: {
    color: '#f97316',
    glowColor: 'rgba(249, 115, 22, 0.7)',
    outerGlow: '0 0 30px rgba(249, 115, 22, 0.6), 0 0 60px rgba(236, 72, 153, 0.3)',
    label: 'Speaking',
    pulseSpeed: 500,
    ringCount: 4,
  },
  listening: {
    color: '#06b6d4',
    glowColor: 'rgba(6, 182, 212, 0.7)',
    outerGlow: '0 0 30px rgba(6, 182, 212, 0.6), 0 0 60px rgba(168, 85, 247, 0.3)',
    label: 'Listening',
    pulseSpeed: 1000,
    ringCount: 4,
  },
  error: {
    color: '#ef4444',
    glowColor: 'rgba(239, 68, 68, 0.7)',
    outerGlow: '0 0 30px rgba(239, 68, 68, 0.6), 0 0 60px rgba(239, 68, 68, 0.3)',
    label: 'Error',
    pulseSpeed: 400,
    ringCount: 3,
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

        {/* Core orb - Enhanced Neon */}
        <div
          style={{
            width: size,
            height: size,
            borderRadius: '50%',
            background: status === 'error'
              ? `radial-gradient(circle, ${config.color}, #991b1b)`
              : `radial-gradient(circle at 30% 30%, #fff, ${config.color} 40%, ${config.color}88)`,
            boxShadow: `
              0 0 ${size * glowIntensity * 1.5}px ${config.glowColor},
              0 0 ${size * glowIntensity * 3}px ${config.glowColor},
              0 0 ${size * glowIntensity * 5}px ${config.glowColor}44,
              inset 0 0 ${size * 0.4}px rgba(255,255,255,0.5)
            `,
            transform: `scale(${breatheScale}) ${status === 'error' ? `translate(${Math.random() * 2 - 1}px, ${Math.random() * 2 - 1}px)` : ''}`,
            transition: status === 'error' ? 'none' : 'transform 0.1s ease-out',
            border: `1px solid ${config.color}88`,
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
