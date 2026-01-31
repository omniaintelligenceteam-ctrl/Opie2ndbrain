'use client';
import { useSystemStatus } from '../hooks/useRealTimeData';

interface OpieStatusWidgetProps {
  size?: 'small' | 'medium' | 'large';
  showDetails?: boolean;
  onClick?: () => void;
}

type OpieStatus = 'online' | 'offline' | 'thinking' | 'working';

export default function OpieStatusWidget({ 
  size = 'medium',
  showDetails = true,
  onClick 
}: OpieStatusWidgetProps) {
  const { status, loading, error } = useSystemStatus(2000);

  const getStatus = (): OpieStatus => {
    // Offline: gateway not connected or error
    if (error || !status?.gateway?.connected) {
      return 'offline';
    }

    // Working: agents are actively running
    if (status?.agents?.active && status.agents.active > 0) {
      return 'working';
    }

    // Thinking: processing a request
    if (status?.opie?.status === 'thinking') {
      return 'thinking';
    }

    // Default: online and ready
    return 'online';
  };

  const getStatusConfig = (currentStatus: OpieStatus) => {
    // Simplified: just Online or Offline
    if (currentStatus === 'offline') {
      return { 
        color: '#ef4444', 
        text: 'Offline',
        icon: '⚡',
        animation: 'none',
        glowAnimation: 'none',
      };
    }
    // Everything else is Online
    return { 
      color: '#22c55e', 
      text: 'Online',
      icon: '⚡',
      animation: 'opieOnline 3s ease-in-out infinite',
      glowAnimation: 'none',
    };
  };

  const currentStatus = getStatus();
  const config = getStatusConfig(currentStatus);
  const orbSize = size === 'small' ? 48 : size === 'medium' ? 64 : 80;

  return (
    <div 
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: size === 'small' ? '10px' : '14px',
        padding: size === 'small' ? '8px' : '12px',
        borderRadius: '12px',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.2s ease',
        background: 'transparent',
      }}
      onClick={onClick}
    >
      {/* Avatar */}
      <div style={{
        width: orbSize,
        height: orbSize,
        flexShrink: 0,
      }}>
        <img 
          src="/opie-avatar.png" 
          alt="Opie"
          style={{
            width: '100%',
            height: '100%',
            borderRadius: '50%',
            objectFit: 'cover',
          }}
        />
      </div>

      {/* Name and Status */}
      <div>
        <div style={{
          color: '#fff',
          fontSize: size === 'small' ? '0.95rem' : size === 'medium' ? '1.1rem' : '1.25rem',
          fontWeight: 700,
          letterSpacing: '-0.02em',
          lineHeight: 1.2,
        }}>
          Opie
        </div>
        <div style={{
          color: config.color,
          fontSize: size === 'small' ? '0.7rem' : size === 'medium' ? '0.8rem' : '0.9rem',
          fontWeight: 600,
          marginTop: '2px',
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
        }}>
          {config.text}
        </div>
      </div>

      <style>{`
        @keyframes opieOnline {
          0%, 100% { 
            box-shadow: 0 0 16px rgba(34, 197, 94, 0.4);
          }
          50% { 
            box-shadow: 0 0 24px rgba(34, 197, 94, 0.6);
          }
        }
        @keyframes opieThinking {
          0%, 100% { 
            box-shadow: 0 0 20px rgba(102, 126, 234, 0.5);
          }
          50% { 
            box-shadow: 0 0 35px rgba(102, 126, 234, 0.8);
          }
        }
        @keyframes opieWorking {
          0%, 100% { 
            box-shadow: 0 0 16px rgba(245, 158, 11, 0.5);
          }
          50% { 
            box-shadow: 0 0 30px rgba(245, 158, 11, 0.8);
          }
        }
        @keyframes thinkingGlow {
          0%, 100% { 
            opacity: 0.3;
            transform: scale(1);
          }
          50% { 
            opacity: 0.8;
            transform: scale(1.1);
          }
        }
        @keyframes workingGlow {
          0%, 100% { 
            opacity: 0.4;
            transform: scale(1) rotate(0deg);
          }
          50% { 
            opacity: 0.9;
            transform: scale(1.05) rotate(180deg);
          }
        }
        @keyframes iconPulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.2); }
        }
        @keyframes iconSpin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes dotBounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
          40% { transform: translateY(-4px); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
