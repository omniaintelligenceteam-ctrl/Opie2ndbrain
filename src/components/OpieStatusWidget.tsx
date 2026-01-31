'use client';
import { useState, useEffect } from 'react';
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
    switch (currentStatus) {
      case 'offline':
        return { 
          color: '#ef4444', 
          text: 'Offline',
          animation: 'none',
        };
      case 'thinking':
        return { 
          color: '#667eea', 
          text: 'Thinking',
          animation: 'opieThinking 1.5s ease-in-out infinite',
        };
      case 'working':
        return { 
          color: '#f59e0b', 
          text: 'Working',
          animation: 'opieWorking 1s ease-in-out infinite',
        };
      case 'online':
      default:
        return { 
          color: '#22c55e', 
          text: 'Online',
          animation: 'opieOnline 3s ease-in-out infinite',
        };
    }
  };

  const currentStatus = getStatus();
  const config = getStatusConfig(currentStatus);
  const orbSize = size === 'small' ? 36 : size === 'medium' ? 48 : 64;

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
      {/* Status Orb / Avatar */}
      <div style={{
        width: orbSize,
        height: orbSize,
        borderRadius: '50%',
        background: `radial-gradient(circle at 30% 30%, ${config.color} 0%, ${config.color}80 50%, ${config.color}40 100%)`,
        boxShadow: `0 0 ${orbSize/3}px ${config.color}60`,
        animation: config.animation,
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}>
        {/* Icon */}
        <span style={{
          fontSize: size === 'small' ? '14px' : size === 'medium' ? '18px' : '24px',
          filter: 'drop-shadow(0 0 8px rgba(255,255,255,0.7))',
        }}>
          ⚡
        </span>
        
        {/* Highlight reflection */}
        <div style={{
          position: 'absolute',
          top: '12%',
          left: '18%',
          width: '22%',
          height: '22%',
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.5)',
          filter: 'blur(2px)',
        }} />
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
        }}>
          {config.text}
        </div>
      </div>

      <style>{`
        @keyframes opieOnline {
          0%, 100% { 
            box-shadow: 0 0 16px rgba(34, 197, 94, 0.4);
            transform: scale(1);
          }
          50% { 
            box-shadow: 0 0 24px rgba(34, 197, 94, 0.6);
            transform: scale(1.02);
          }
        }
        @keyframes opieThinking {
          0%, 100% { 
            box-shadow: 0 0 16px rgba(102, 126, 234, 0.5);
            transform: scale(1);
          }
          50% { 
            box-shadow: 0 0 28px rgba(102, 126, 234, 0.8);
            transform: scale(1.06);
          }
        }
        @keyframes opieWorking {
          0%, 100% { 
            box-shadow: 0 0 16px rgba(245, 158, 11, 0.5);
            transform: scale(1);
          }
          25% { 
            box-shadow: 0 0 24px rgba(245, 158, 11, 0.7);
            transform: scale(1.04);
          }
          50% { 
            box-shadow: 0 0 20px rgba(245, 158, 11, 0.6);
            transform: scale(1.02);
          }
          75% { 
            box-shadow: 0 0 28px rgba(245, 158, 11, 0.8);
            transform: scale(1.05);
          }
        }
      `}</style>
    </div>
  );
}
