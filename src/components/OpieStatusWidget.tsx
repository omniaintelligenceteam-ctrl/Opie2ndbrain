'use client';
import { useState, useEffect } from 'react';
import { useSystemStatus, useConnectionStatus } from '../hooks/useRealTimeData';

interface OpieStatusWidgetProps {
  size?: 'small' | 'medium' | 'large';
  showDetails?: boolean;
  onClick?: () => void;
}

export default function OpieStatusWidget({ 
  size = 'medium',
  showDetails = true,
  onClick 
}: OpieStatusWidgetProps) {
  const { status, loading, error } = useSystemStatus(2000); // Poll every 2 seconds
  const { isOnline, latency } = useConnectionStatus();
  const [pulseAnimation, setPulseAnimation] = useState(false);

  // Trigger pulse animation when status changes
  useEffect(() => {
    if (status?.opie?.status === 'thinking' || (status?.agents?.active ?? 0) > 0) {
      setPulseAnimation(true);
      const timer = setTimeout(() => setPulseAnimation(false), 1000);
      return () => clearTimeout(timer);
    }
  }, [status?.opie?.status, status?.agents?.active]);

  const getStatusConfig = () => {
    if (loading && !status) {
      return { 
        color: '#6b7280', 
        text: 'Starting...', 
        description: 'Initializing Opie',
        glow: 'rgba(107, 114, 128, 0.3)' 
      };
    }

    if (error || !status?.gateway?.connected) {
      return { 
        color: '#ef4444', 
        text: 'Offline', 
        description: 'Gateway unreachable',
        glow: 'rgba(239, 68, 68, 0.3)' 
      };
    }

    switch (status?.opie?.status) {
      case 'thinking':
        return { 
          color: '#667eea', 
          text: 'Thinking', 
          description: status.agents?.active > 0 
            ? `${status.agents.active} agents working`
            : 'Processing request',
          glow: 'rgba(102, 126, 234, 0.4)' 
        };
      case 'speaking':
        return { 
          color: '#f59e0b', 
          text: 'Speaking', 
          description: 'Audio response active',
          glow: 'rgba(245, 158, 11, 0.4)' 
        };
      case 'online':
      default:
        return { 
          color: '#22c55e', 
          text: 'Online', 
          description: status.agents?.active > 0 
            ? `${status.agents.active} agents ready`
            : 'Ready for commands',
          glow: 'rgba(34, 197, 94, 0.4)' 
        };
    }
  };

  const getModelName = () => {
    if (!status?.model) return 'CLAUDE';
    
    const model = status.model.toLowerCase();
    if (model.includes('claude-3.5') || model.includes('claude-3-5')) return 'SONNET 3.5';
    if (model.includes('sonnet')) return 'SONNET';
    if (model.includes('opus')) return 'OPUS';
    if (model.includes('haiku')) return 'HAIKU';
    return 'CLAUDE';
  };

  const formatUptime = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
    return `${Math.floor(seconds / 86400)}d`;
  };

  const formatContext = () => {
    if (!status?.context) return null;
    const percentage = Math.round((status.context.used / status.context.total) * 100);
    return `${Math.round(status.context.used / 1000)}k/${Math.round(status.context.total / 1000)}k (${percentage}%)`;
  };

  const config = getStatusConfig();
  const modelName = getModelName();
  const isActive = status?.opie?.status === 'thinking' || (status?.agents?.active ?? 0) > 0;

  const containerStyle = {
    background: `linear-gradient(135deg, ${config.glow} 0%, rgba(0,0,0,0.1) 100%)`,
    borderRadius: size === 'small' ? '12px' : size === 'medium' ? '16px' : '20px',
    border: `1px solid ${config.color}40`,
    padding: size === 'small' ? '12px' : size === 'medium' ? '16px' : '20px',
    cursor: onClick ? 'pointer' : 'default',
    transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
    position: 'relative' as const,
    overflow: 'hidden' as const,
    ...(onClick && {
      ':hover': {
        transform: 'translateY(-2px)',
        boxShadow: `0 8px 30px ${config.glow}`,
      }
    })
  };

  const orbSize = size === 'small' ? 40 : size === 'medium' ? 56 : 72;

  return (
    <div 
      style={containerStyle}
      onClick={onClick}
      onMouseEnter={() => setPulseAnimation(true)}
      onMouseLeave={() => setPulseAnimation(false)}
    >
      {/* Ambient Background */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: `radial-gradient(circle at 30% 30%, ${config.color}10 0%, transparent 70%)`,
        pointerEvents: 'none',
      }} />

      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: size === 'small' ? '12px' : '16px',
        marginBottom: showDetails ? '16px' : '0',
        position: 'relative',
        zIndex: 1,
      }}>
        {/* Status Orb */}
        <div style={{
          width: orbSize,
          height: orbSize,
          borderRadius: '50%',
          background: `radial-gradient(circle at 30% 30%, ${config.color} 0%, ${config.color}80 50%, ${config.color}40 100%)`,
          boxShadow: `
            0 0 ${orbSize/2}px ${config.glow},
            inset 0 0 ${orbSize/4}px rgba(255,255,255,0.2),
            0 0 ${orbSize}px ${config.color}20
          `,
          animation: (isActive || pulseAnimation) ? 'opieStatusPulse 2s infinite' : 'opieStatusGlow 4s infinite',
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <span style={{
            fontSize: size === 'small' ? '16px' : size === 'medium' ? '20px' : '24px',
            filter: 'drop-shadow(0 0 10px rgba(255,255,255,0.8))',
          }}>
            ⚡
          </span>
          {/* Highlight */}
          <div style={{
            position: 'absolute',
            top: '15%',
            left: '20%',
            width: '25%',
            height: '25%',
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.6)',
            filter: 'blur(3px)',
          }} />
        </div>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '4px',
          }}>
            <span style={{
              color: '#fff',
              fontSize: size === 'small' ? '1rem' : size === 'medium' ? '1.25rem' : '1.5rem',
              fontWeight: 700,
              letterSpacing: '-0.02em',
            }}>
              Opie
            </span>
            <span style={{
              fontSize: size === 'small' ? '0.6rem' : '0.65rem',
              padding: '3px 8px',
              background: `${config.color}20`,
              borderRadius: '6px',
              color: config.color,
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}>
              {modelName}
            </span>
          </div>
          <div style={{
            color: config.color,
            fontSize: size === 'small' ? '0.8rem' : '0.9rem',
            fontWeight: 600,
          }}>
            {config.text}
          </div>
          {showDetails && (
            <div style={{
              color: 'rgba(255,255,255,0.6)',
              fontSize: size === 'small' ? '0.7rem' : '0.75rem',
              marginTop: '2px',
            }}>
              {config.description}
            </div>
          )}
        </div>
      </div>

      {/* Details Grid */}
      {showDetails && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: size === 'small' ? '1fr 1fr' : '1fr 1fr 1fr',
          gap: size === 'small' ? '8px' : '12px',
          position: 'relative',
          zIndex: 1,
        }}>
          {/* Latency */}
          <div style={{
            textAlign: 'center',
            background: 'rgba(255,255,255,0.05)',
            borderRadius: '8px',
            padding: size === 'small' ? '6px' : '8px',
          }}>
            <div style={{
              color: '#fff',
              fontSize: size === 'small' ? '0.9rem' : '1rem',
              fontWeight: 700,
              fontVariantNumeric: 'tabular-nums',
            }}>
              {latency !== null ? `${latency}ms` : '--'}
            </div>
            <div style={{
              color: 'rgba(255,255,255,0.4)',
              fontSize: size === 'small' ? '0.6rem' : '0.65rem',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}>
              Latency
            </div>
          </div>

          {/* Uptime */}
          <div style={{
            textAlign: 'center',
            background: 'rgba(255,255,255,0.05)',
            borderRadius: '8px',
            padding: size === 'small' ? '6px' : '8px',
          }}>
            <div style={{
              color: '#fff',
              fontSize: size === 'small' ? '0.9rem' : '1rem',
              fontWeight: 700,
            }}>
              {status?.opie?.uptime ? formatUptime(status.opie.uptime) : '--'}
            </div>
            <div style={{
              color: 'rgba(255,255,255,0.4)',
              fontSize: size === 'small' ? '0.6rem' : '0.65rem',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}>
              Uptime
            </div>
          </div>

          {/* Context (if not small) */}
          {size !== 'small' && (
            <div style={{
              textAlign: 'center',
              background: 'rgba(255,255,255,0.05)',
              borderRadius: '8px',
              padding: '8px',
            }}>
              <div style={{
                color: '#fff',
                fontSize: '0.85rem',
                fontWeight: 700,
                fontVariantNumeric: 'tabular-nums',
              }}>
                {formatContext() || '--'}
              </div>
              <div style={{
                color: 'rgba(255,255,255,0.4)',
                fontSize: '0.65rem',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}>
                Context
              </div>
            </div>
          )}
        </div>
      )}

      {/* Connection Quality Indicator */}
      <div style={{
        position: 'absolute',
        top: '8px',
        right: '8px',
        display: 'flex',
        gap: '2px',
        opacity: 0.6,
      }}>
        {[1, 2, 3].map(i => (
          <div
            key={i}
            style={{
              width: '3px',
              height: `${4 + i * 2}px`,
              background: latency && latency < (i * 50) ? config.color : 'rgba(255,255,255,0.2)',
              borderRadius: '1px',
              transition: 'all 0.3s ease',
            }}
          />
        ))}
      </div>

      <style>{`
        @keyframes opieStatusPulse {
          0%, 100% { 
            transform: scale(1);
            opacity: 1;
          }
          50% { 
            transform: scale(1.05);
            opacity: 0.9;
          }
        }
        @keyframes opieStatusGlow {
          0%, 100% { 
            filter: brightness(1);
          }
          50% { 
            filter: brightness(1.1);
          }
        }
      `}</style>
    </div>
  );
}