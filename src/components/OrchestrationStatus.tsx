'use client';
import { useState, useEffect, useCallback } from 'react';
import { useAgentSessions, AgentSession } from '@/hooks/useAgentSessions';
import { AgentNodeState, AGENT_NODES } from '@/lib/agentMapping';

interface OrchestrationStatusProps {
  // Optional override for active agents (for backwards compatibility)
  activeAgents?: string[];
  // Polling interval in ms (default 5000)
  pollInterval?: number;
  // Click handler for agent nodes
  onAgentClick?: (agentId: string, nodeState: AgentNodeState) => void;
}

export default function OrchestrationStatus({ 
  activeAgents: overrideActiveAgents,
  pollInterval = 5000,
  onAgentClick 
}: OrchestrationStatusProps) {
  const [pulse, setPulse] = useState(false);
  const [hoveredAgent, setHoveredAgent] = useState<string | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<AgentNodeState | null>(null);

  // Fetch real session data
  const { 
    nodes, 
    activeAgentIds, 
    activeCount, 
    loading, 
    error, 
    lastUpdated 
  } = useAgentSessions(pollInterval);

  // Use override if provided, otherwise use real data
  const effectiveActiveAgents = overrideActiveAgents || activeAgentIds;

  // Pulse animation
  useEffect(() => {
    const interval = setInterval(() => setPulse(p => !p), 1500);
    return () => clearInterval(interval);
  }, []);

  const getNodeState = useCallback((agentId: string): AgentNodeState => {
    // First check if we have real node state
    const realNode = nodes.find(n => n.id === agentId);
    if (realNode) return realNode;
    
    // Fall back to config with computed status
    const config = AGENT_NODES.find(n => n.id === agentId);
    if (config) {
      const isActive = effectiveActiveAgents.includes(agentId);
      return {
        ...config,
        status: isActive ? 'working' : 'idle',
        activeSessions: isActive ? 1 : 0,
      };
    }
    
    // Should never happen, but provide fallback
    return {
      id: agentId,
      name: agentId.charAt(0).toUpperCase() + agentId.slice(1),
      emoji: '🤖',
      status: 'idle',
      position: { x: 50, y: 50 },
      color: '#737373',
      activeSessions: 0,
    };
  }, [nodes, effectiveActiveAgents]);

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'working': return '#f59e0b';
      case 'connected': return '#22c55e';
      default: return 'rgba(255,255,255,0.3)';
    }
  };

  const handleAgentClick = (agentId: string) => {
    const nodeState = getNodeState(agentId);
    setSelectedAgent(selectedAgent?.id === agentId ? null : nodeState);
    onAgentClick?.(agentId, nodeState);
  };

  const workingCount = effectiveActiveAgents.length;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <span style={styles.headerIcon}>🕸️</span>
        <h2 style={styles.title}>Orchestration</h2>
        <span style={{
          ...styles.badge,
          background: workingCount > 0 ? 'rgba(245,158,11,0.2)' : 'rgba(34,197,94,0.2)',
          color: workingCount > 0 ? '#f59e0b' : '#22c55e',
        }}>
          {loading ? '...' : `${workingCount} active`}
        </span>
      </div>

      <div style={styles.visualContainer}>
        {/* Connection lines */}
        <svg style={styles.connectionsSvg}>
          {AGENT_NODES.map(agent => {
            const nodeState = getNodeState(agent.id);
            const isActive = nodeState.status === 'working';
            const isHovered = hoveredAgent === agent.id;
            if (!isActive && !isHovered) return null;
            
            const centerX = 50;
            const centerY = 50;
            
            return (
              <line
                key={agent.id}
                x1={`${centerX}%`}
                y1={`${centerY}%`}
                x2={`${agent.position.x}%`}
                y2={`${agent.position.y}%`}
                stroke={isActive ? getStatusColor('working') : nodeState.color}
                strokeWidth={isActive ? '3' : '2'}
                strokeDasharray={isActive ? 'none' : '4 4'}
                opacity={pulse ? (isActive ? 0.9 : 0.5) : (isActive ? 0.6 : 0.3)}
                style={{ 
                  transition: 'all 0.5s ease',
                  filter: isActive ? `drop-shadow(0 0 4px ${getStatusColor('working')})` : 'none',
                }}
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
          <div style={{
            ...styles.statusRing,
            borderColor: workingCount > 0 ? 'rgba(245,158,11,0.4)' : 'rgba(102,126,234,0.3)',
          }} />
        </div>

        {/* Surrounding agent nodes */}
        {AGENT_NODES.map(agent => {
          const nodeState = getNodeState(agent.id);
          const isActive = nodeState.status === 'working';
          const isConnected = nodeState.status === 'connected';
          const isHovered = hoveredAgent === agent.id;
          const isSelected = selectedAgent?.id === agent.id;
          
          return (
            <div
              key={agent.id}
              onClick={() => handleAgentClick(agent.id)}
              onMouseEnter={() => setHoveredAgent(agent.id)}
              onMouseLeave={() => setHoveredAgent(null)}
              style={{
                ...styles.agentNode,
                left: `${agent.position.x}%`,
                top: `${agent.position.y}%`,
                borderColor: isActive 
                  ? getStatusColor('working') 
                  : isConnected 
                    ? getStatusColor('connected')
                    : 'rgba(255,255,255,0.15)',
                boxShadow: isActive 
                  ? `0 0 20px ${getStatusColor('working')}40, 0 0 40px ${getStatusColor('working')}20`
                  : isHovered || isSelected
                    ? `0 0 15px ${nodeState.color}40`
                    : 'none',
                transform: `translate(-50%, -50%) ${isHovered ? 'scale(1.05)' : 'scale(1)'}`,
                cursor: 'pointer',
                background: isSelected 
                  ? 'rgba(102,126,234,0.15)'
                  : 'rgba(30,30,46,0.95)',
              }}
            >
              <span style={styles.agentEmoji}>{agent.emoji}</span>
              <span style={{
                ...styles.agentLabel,
                color: isActive ? '#fff' : isConnected ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.5)',
              }}>
                {agent.name}
              </span>
              {isActive && (
                <span style={styles.workingIndicator}>●</span>
              )}
              {isConnected && !isActive && (
                <span style={styles.connectedIndicator}>○</span>
              )}
              {nodeState.activeSessions > 1 && (
                <span style={styles.sessionCount}>
                  {nodeState.activeSessions}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Selected Agent Details */}
      {selectedAgent && (
        <div style={styles.detailsPanel}>
          <div style={styles.detailsHeader}>
            <span style={styles.detailsEmoji}>{selectedAgent.emoji}</span>
            <div style={styles.detailsInfo}>
              <h4 style={styles.detailsName}>{selectedAgent.name}</h4>
              <span style={{
                ...styles.detailsStatus,
                color: getStatusColor(selectedAgent.status),
              }}>
                {selectedAgent.status === 'working' ? '⚡ Working' : 
                 selectedAgent.status === 'connected' ? '✓ Connected' : '○ Idle'}
              </span>
            </div>
          </div>
          {selectedAgent.currentTask && (
            <div style={styles.detailsTask}>
              <span style={styles.detailsTaskLabel}>Current Task:</span>
              <span style={styles.detailsTaskValue}>{selectedAgent.currentTask}</span>
            </div>
          )}
          {selectedAgent.lastActivity && (
            <div style={styles.detailsActivity}>
              <span style={styles.detailsActivityLabel}>Last Active:</span>
              <span style={styles.detailsActivityValue}>
                {new Date(selectedAgent.lastActivity).toLocaleTimeString()}
              </span>
            </div>
          )}
          <div style={styles.detailsSessions}>
            <span>Active Sessions: {selectedAgent.activeSessions}</span>
          </div>
        </div>
      )}

      {/* Legend */}
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

      {/* Status footer */}
      {error && (
        <div style={styles.errorFooter}>
          ⚠️ Gateway unavailable - showing cached data
        </div>
      )}
      {lastUpdated && !error && (
        <div style={styles.updateFooter}>
          Updated {new Date(lastUpdated).toLocaleTimeString()}
        </div>
      )}
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
    border: '2px solid',
    animation: 'pulse 2s ease-in-out infinite',
  },
  agentNode: {
    position: 'absolute',
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
    zIndex: 1,
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
  connectedIndicator: {
    position: 'absolute',
    top: '-4px',
    right: '-4px',
    color: '#22c55e',
    fontSize: '10px',
  },
  sessionCount: {
    position: 'absolute',
    bottom: '-6px',
    right: '-6px',
    background: '#f59e0b',
    color: '#000',
    fontSize: '0.6rem',
    fontWeight: 700,
    padding: '2px 5px',
    borderRadius: '8px',
    minWidth: '16px',
    textAlign: 'center',
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
  detailsPanel: {
    padding: '16px 20px',
    borderTop: '1px solid rgba(255,255,255,0.1)',
    background: 'rgba(0,0,0,0.3)',
  },
  detailsHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '12px',
  },
  detailsEmoji: {
    fontSize: '28px',
  },
  detailsInfo: {
    flex: 1,
  },
  detailsName: {
    color: '#fff',
    fontSize: '0.95rem',
    fontWeight: 600,
    margin: 0,
  },
  detailsStatus: {
    fontSize: '0.75rem',
    fontWeight: 500,
  },
  detailsTask: {
    background: 'rgba(255,255,255,0.05)',
    borderRadius: '8px',
    padding: '10px 12px',
    marginBottom: '8px',
  },
  detailsTaskLabel: {
    display: 'block',
    color: 'rgba(255,255,255,0.4)',
    fontSize: '0.7rem',
    marginBottom: '4px',
  },
  detailsTaskValue: {
    color: '#fff',
    fontSize: '0.8rem',
  },
  detailsActivity: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '8px',
  },
  detailsActivityLabel: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: '0.75rem',
  },
  detailsActivityValue: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: '0.75rem',
  },
  detailsSessions: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: '0.75rem',
  },
  errorFooter: {
    padding: '8px 20px',
    background: 'rgba(239,68,68,0.1)',
    color: '#ef4444',
    fontSize: '0.7rem',
    textAlign: 'center',
  },
  updateFooter: {
    padding: '6px 20px',
    color: 'rgba(255,255,255,0.3)',
    fontSize: '0.65rem',
    textAlign: 'center',
  },
};
