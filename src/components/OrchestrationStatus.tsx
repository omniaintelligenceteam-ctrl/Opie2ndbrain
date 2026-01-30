'use client';
import { useState, useEffect } from 'react';

interface Agent {
  id: string;
  name: string;
  emoji: string;
  status: 'idle' | 'working' | 'connected';
  position: { x: number; y: number };
}

const ORCHESTRATED_AGENTS: Agent[] = [
  { id: 'research', name: 'Research', emoji: '🔍', status: 'idle', position: { x: 20, y: 10 } },
  { id: 'code', name: 'Code', emoji: '💻', status: 'idle', position: { x: 75, y: 10 } },
  { id: 'content', name: 'Content', emoji: '✍️', status: 'working', position: { x: 90, y: 40 } },
  { id: 'analyst', name: 'Analyst', emoji: '📊', status: 'idle', position: { x: 85, y: 75 } },
  { id: 'outreach', name: 'Outreach', emoji: '📧', status: 'working', position: { x: 55, y: 90 } },
  { id: 'qa', name: 'QA', emoji: '✅', status: 'idle', position: { x: 20, y: 85 } },
  { id: 'sales', name: 'Sales', emoji: '💰', status: 'connected', position: { x: 5, y: 55 } },
  { id: 'proposal', name: 'Proposal', emoji: '📝', status: 'idle', position: { x: 10, y: 30 } },
];

interface OrchestrationStatusProps {
  activeAgents?: string[];
}

export default function OrchestrationStatus({ activeAgents = ['content', 'outreach', 'sales'] }: OrchestrationStatusProps) {
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => setPulse(p => !p), 1500);
    return () => clearInterval(interval);
  }, []);

  const getAgentStatus = (agentId: string): 'idle' | 'working' | 'connected' => {
    if (activeAgents.includes(agentId)) return 'working';
    return 'idle';
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'working': return '#f59e0b';
      case 'connected': return '#22c55e';
      default: return 'rgba(255,255,255,0.3)';
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <span style={styles.headerIcon}>🕸️</span>
        <h2 style={styles.title}>Orchestration</h2>
        <span style={styles.badge}>
          {activeAgents.length} active
        </span>
      </div>

      <div style={styles.visualContainer}>
        {/* Connection lines */}
        <svg style={styles.connectionsSvg}>
          {ORCHESTRATED_AGENTS.map(agent => {
            const isActive = activeAgents.includes(agent.id);
            if (!isActive) return null;
            
            // Calculate line from center (50%, 50%) to agent position
            const centerX = 50;
            const centerY = 50;
            
            return (
              <line
                key={agent.id}
                x1={`${centerX}%`}
                y1={`${centerY}%`}
                x2={`${agent.position.x}%`}
                y2={`${agent.position.y}%`}
                stroke={getStatusColor('working')}
                strokeWidth="2"
                strokeDasharray="4 4"
                opacity={pulse ? 0.8 : 0.4}
                style={{ transition: 'opacity 0.5s ease' }}
              />
            );
          })}
        </svg>

        {/* Central Opie node */}
        <div style={styles.centralNode}>
          <div style={{
            ...styles.centralNodeInner,
            boxShadow: pulse 
              ? '0 0 40px rgba(102,126,234,0.6), 0 0 80px rgba(102,126,234,0.3)' 
              : '0 0 20px rgba(102,126,234,0.4)',
          }}>
            <span style={styles.centralEmoji}>⚡</span>
            <span style={styles.centralLabel}>Opie</span>
          </div>
          <div style={styles.statusRing} />
        </div>

        {/* Surrounding agent nodes */}
        {ORCHESTRATED_AGENTS.map(agent => {
          const status = getAgentStatus(agent.id);
          const isActive = status === 'working';
          
          return (
            <div
              key={agent.id}
              style={{
                ...styles.agentNode,
                left: `${agent.position.x}%`,
                top: `${agent.position.y}%`,
                borderColor: getStatusColor(status),
                boxShadow: isActive 
                  ? `0 0 20px ${getStatusColor(status)}40`
                  : 'none',
              }}
            >
              <span style={styles.agentEmoji}>{agent.emoji}</span>
              <span style={{
                ...styles.agentLabel,
                color: isActive ? '#fff' : 'rgba(255,255,255,0.5)',
              }}>
                {agent.name}
              </span>
              {isActive && (
                <span style={styles.workingIndicator}>●</span>
              )}
            </div>
          );
        })}
      </div>

      <div style={styles.legend}>
        <div style={styles.legendItem}>
          <span style={{ ...styles.legendDot, background: '#f59e0b' }} />
          <span>Working</span>
        </div>
        <div style={styles.legendItem}>
          <span style={{ ...styles.legendDot, background: '#22c55e' }} />
          <span>Connected</span>
        </div>
        <div style={styles.legendItem}>
          <span style={{ ...styles.legendDot, background: 'rgba(255,255,255,0.3)' }} />
          <span>Idle</span>
        </div>
      </div>
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    background: '#1a1a2e',
    borderRadius: '12px',
    border: '1px solid rgba(255,255,255,0.1)',
    overflow: 'hidden',
  },
  header: {
    padding: '16px 20px',
    borderBottom: '1px solid rgba(255,255,255,0.1)',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  headerIcon: {
    fontSize: '24px',
  },
  title: {
    color: '#fff',
    fontSize: '1rem',
    fontWeight: 600,
    margin: 0,
    flex: 1,
  },
  badge: {
    background: 'rgba(245,158,11,0.2)',
    color: '#f59e0b',
    padding: '4px 10px',
    borderRadius: '12px',
    fontSize: '0.75rem',
    fontWeight: 500,
  },
  visualContainer: {
    position: 'relative',
    height: '280px',
    padding: '20px',
  },
  connectionsSvg: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    pointerEvents: 'none',
  },
  centralNode: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
  },
  centralNodeInner: {
    width: '80px',
    height: '80px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #667eea, #764ba2)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'box-shadow 0.5s ease',
    position: 'relative',
    zIndex: 2,
  },
  centralEmoji: {
    fontSize: '28px',
  },
  centralLabel: {
    color: '#fff',
    fontSize: '0.75rem',
    fontWeight: 600,
    marginTop: '2px',
  },
  statusRing: {
    position: 'absolute',
    top: '-8px',
    left: '-8px',
    right: '-8px',
    bottom: '-8px',
    borderRadius: '50%',
    border: '2px solid rgba(102,126,234,0.3)',
    animation: 'pulse 2s ease-in-out infinite',
  },
  agentNode: {
    position: 'absolute',
    transform: 'translate(-50%, -50%)',
    background: 'rgba(30,30,46,0.95)',
    borderRadius: '12px',
    padding: '10px 14px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px',
    border: '2px solid',
    transition: 'all 0.3s ease',
    minWidth: '60px',
  },
  agentEmoji: {
    fontSize: '20px',
  },
  agentLabel: {
    fontSize: '0.65rem',
    fontWeight: 500,
    whiteSpace: 'nowrap',
  },
  workingIndicator: {
    position: 'absolute',
    top: '-4px',
    right: '-4px',
    color: '#f59e0b',
    fontSize: '12px',
    animation: 'blink 1s infinite',
  },
  legend: {
    display: 'flex',
    justifyContent: 'center',
    gap: '20px',
    padding: '12px 20px',
    borderTop: '1px solid rgba(255,255,255,0.05)',
    background: 'rgba(0,0,0,0.2)',
  },
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '0.7rem',
    color: 'rgba(255,255,255,0.5)',
  },
  legendDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
  },
};
