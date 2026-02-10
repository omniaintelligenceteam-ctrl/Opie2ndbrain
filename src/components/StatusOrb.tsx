'use client';

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
    label: 'Online',
    animClass: 'status-orb--idle',
  },
  thinking: {
    color: '#a855f7',
    glowColor: 'rgba(168, 85, 247, 0.7)',
    label: 'Thinking',
    animClass: 'status-orb--thinking',
  },
  speaking: {
    color: '#f97316',
    glowColor: 'rgba(249, 115, 22, 0.7)',
    label: 'Speaking',
    animClass: 'status-orb--speaking',
  },
  listening: {
    color: '#06b6d4',
    glowColor: 'rgba(6, 182, 212, 0.7)',
    label: 'Listening',
    animClass: 'status-orb--listening',
  },
  error: {
    color: '#ef4444',
    glowColor: 'rgba(239, 68, 68, 0.7)',
    label: 'Error',
    animClass: 'status-orb--error',
  },
};

export default function StatusOrb({ status, size = 12, showLabel = false }: StatusOrbProps) {
  const config = STATUS_CONFIG[status];
  const ringCount = status === 'idle' || status === 'error' ? 3 : 4;

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
        {Array.from({ length: ringCount }).map((_, i) => (
          <div
            key={i}
            className={`status-orb-ring ${config.animClass}-ring`}
            style={{
              position: 'absolute',
              width: size * (1.5 + i * 0.8),
              height: size * (1.5 + i * 0.8),
              borderRadius: '50%',
              border: `1px solid ${config.color}`,
              opacity: (1 - i * 0.25) * 0.4,
              transition: 'opacity 0.3s ease',
              ['--ring-index' as string]: i,
            }}
          />
        ))}

        {/* Inner swirl for thinking - pure CSS rotation */}
        {status === 'thinking' && (
          <div
            className="status-orb-swirl"
            style={{
              position: 'absolute',
              width: size * 1.2,
              height: size * 1.2,
              borderRadius: '50%',
              background: `conic-gradient(from 0deg, transparent, ${config.color}, transparent)`,
              opacity: 0.6,
              filter: 'blur(2px)',
            }}
          />
        )}

        {/* Core orb */}
        <div
          className={`status-orb-core ${config.animClass}`}
          style={{
            width: size,
            height: size,
            borderRadius: '50%',
            background: status === 'error'
              ? `radial-gradient(circle, ${config.color}, #991b1b)`
              : `radial-gradient(circle at 30% 30%, #fff, ${config.color} 40%, ${config.color}88)`,
            boxShadow: `
              0 0 ${size * 0.5}px ${config.glowColor},
              0 0 ${size * 1.2}px ${config.glowColor},
              0 0 ${size * 2}px ${config.glowColor}44,
              inset 0 0 ${size * 0.4}px rgba(255,255,255,0.5)
            `,
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
            pointerEvents: 'none',
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

      {/* All animations via CSS - zero React re-renders */}
      <style>{`
        /* Breathing animations per status */
        .status-orb--idle {
          animation: orb-breathe-idle 3s ease-in-out infinite;
        }
        .status-orb--thinking {
          animation: orb-breathe-thinking 0.8s ease-in-out infinite;
        }
        .status-orb--speaking {
          animation: orb-breathe-speaking 0.5s ease-in-out infinite;
        }
        .status-orb--listening {
          animation: orb-breathe-listening 1s ease-in-out infinite;
        }
        .status-orb--error {
          animation: orb-glitch 0.4s steps(2) infinite;
        }

        /* Ring pulse animations per status */
        .status-orb--idle-ring {
          animation: orb-ring-pulse 3s ease-in-out infinite;
        }
        .status-orb--thinking-ring {
          animation: orb-ring-pulse 0.8s ease-in-out infinite;
        }
        .status-orb--speaking-ring {
          animation: orb-ring-expand 0.5s ease-out infinite;
        }
        .status-orb--listening-ring {
          animation: orb-ring-pulse 1s ease-in-out infinite;
        }
        .status-orb--error-ring {
          animation: orb-ring-pulse 0.4s ease-in-out infinite;
        }

        /* Thinking swirl rotation */
        .status-orb-swirl {
          animation: orb-swirl 0.5s linear infinite;
        }

        /* Keyframes */
        @keyframes orb-breathe-idle {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }
        @keyframes orb-breathe-thinking {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.15); }
        }
        @keyframes orb-breathe-speaking {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.2); }
        }
        @keyframes orb-breathe-listening {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.12); }
        }
        @keyframes orb-glitch {
          0% { transform: scale(1) translate(0, 0); }
          25% { transform: scale(1.05) translate(1px, -1px); }
          50% { transform: scale(0.95) translate(-1px, 1px); }
          75% { transform: scale(1.08) translate(1px, 1px); }
          100% { transform: scale(1) translate(0, 0); }
        }
        @keyframes orb-ring-pulse {
          0%, 100% { opacity: 0.4; transform: scale(1); }
          50% { opacity: 0.15; transform: scale(1.1); }
        }
        @keyframes orb-ring-expand {
          0%, 100% { transform: scale(1); opacity: 0.4; }
          50% { transform: scale(1.3); opacity: 0.1; }
        }
        @keyframes orb-swirl {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        /* Respect reduced motion */
        @media (prefers-reduced-motion: reduce) {
          .status-orb-core,
          .status-orb-ring,
          .status-orb-swirl {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );
}
