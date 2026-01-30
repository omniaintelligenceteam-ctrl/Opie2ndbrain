'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAgentSessions } from '@/hooks/useAgentSessions';
import { AgentNodeState, AGENT_NODES } from '@/lib/agentMapping';

interface OrchestrationStatusProps {
  activeAgents?: string[];
  pollInterval?: number;
  onAgentClick?: (agentId: string, nodeState: AgentNodeState) => void;
  compact?: boolean;
}

// Premium color palette
const COLORS = {
  primary: '#667eea',
  secondary: '#764ba2',
  accent: '#06b6d4',
  success: '#22c55e',
  warning: '#f59e0b',
  danger: '#ef4444',
  working: '#f59e0b',
  connected: '#22c55e',
  idle: 'rgba(255,255,255,0.15)',
  glass: 'rgba(255,255,255,0.03)',
  glassBorder: 'rgba(255,255,255,0.08)',
  glassHover: 'rgba(255,255,255,0.06)',
};

// Calculate orbital positions for agents
function getOrbitalPosition(index: number, total: number, radius: number = 42): { x: number; y: number } {
  const angle = (index / total) * 2 * Math.PI - Math.PI / 2; // Start from top
  return {
    x: 50 + radius * Math.cos(angle),
    y: 50 + radius * Math.sin(angle),
  };
}

export default function OrchestrationStatus({ 
  activeAgents: overrideActiveAgents,
  pollInterval = 5000,
  onAgentClick,
  compact = false,
}: OrchestrationStatusProps) {
  const [hoveredAgent, setHoveredAgent] = useState<string | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<AgentNodeState | null>(null);
  const [animationPhase, setAnimationPhase] = useState(0);

  const { 
    nodes, 
    activeAgentIds, 
    activeCount, 
    loading, 
    error, 
    lastUpdated,
    sessions,
  } = useAgentSessions(pollInterval);

  const effectiveActiveAgents = overrideActiveAgents || activeAgentIds;

  // Animation loop for flowing effects
  useEffect(() => {
    const interval = setInterval(() => {
      setAnimationPhase(p => (p + 1) % 360);
    }, 50);
    return () => clearInterval(interval);
  }, []);

  // Calculate orbital positions
  const agentPositions = useMemo(() => {
    return AGENT_NODES.map((agent, index) => ({
      ...agent,
      position: getOrbitalPosition(index, AGENT_NODES.length),
    }));
  }, []);

  const getNodeState = useCallback((agentId: string): AgentNodeState => {
    const realNode = nodes.find(n => n.id === agentId);
    if (realNode) return realNode;
    
    const config = AGENT_NODES.find(n => n.id === agentId);
    if (config) {
      const isActive = effectiveActiveAgents.includes(agentId);
      return {
        ...config,
        status: isActive ? 'working' : 'idle',
        activeSessions: isActive ? 1 : 0,
      };
    }
    
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

  const handleAgentClick = (agentId: string) => {
    const nodeState = getNodeState(agentId);
    setSelectedAgent(selectedAgent?.id === agentId ? null : nodeState);
    onAgentClick?.(agentId, nodeState);
  };

  const workingCount = effectiveActiveAgents.length;

  return (
    <div style={styles.container}>
      {/* Ambient Background Effects */}
      <div style={styles.ambientGlow} />
      <div style={styles.gridPattern} />
      
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <div style={styles.headerIconWrapper}>
            <span style={styles.headerIcon}>⚡</span>
            <div style={styles.headerIconGlow} />
          </div>
          <div>
            <h2 style={styles.title}>Agent Orchestration</h2>
            <p style={styles.subtitle}>Real-time agent network status</p>
          </div>
        </div>
        <div style={styles.headerRight}>
          <div style={{
            ...styles.statusPill,
            background: workingCount > 0 
              ? `linear-gradient(135deg, ${COLORS.warning}20, ${COLORS.warning}10)`
              : `linear-gradient(135deg, ${COLORS.success}20, ${COLORS.success}10)`,
            borderColor: workingCount > 0 ? `${COLORS.warning}40` : `${COLORS.success}40`,
          }}>
            <span style={{
              ...styles.statusDot,
              background: workingCount > 0 ? COLORS.warning : COLORS.success,
              boxShadow: `0 0 10px ${workingCount > 0 ? COLORS.warning : COLORS.success}`,
            }} />
            <span style={{
              ...styles.statusText,
              color: workingCount > 0 ? COLORS.warning : COLORS.success,
            }}>
              {loading ? 'Syncing...' : `${workingCount} Active`}
            </span>
          </div>
        </div>
      </div>

      {/* Main Visualization */}
      <div style={styles.visualContainer}>
        {/* SVG Layer for Connections */}
        <svg style={styles.connectionsSvg} viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
          <defs>
            {/* Gradient for active connections */}
            <linearGradient id="activeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={COLORS.primary} stopOpacity="0.8" />
              <stop offset="50%" stopColor={COLORS.warning} stopOpacity="1" />
              <stop offset="100%" stopColor={COLORS.secondary} stopOpacity="0.8" />
            </linearGradient>
            
            {/* Gradient for idle connections */}
            <linearGradient id="idleGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="white" stopOpacity="0.05" />
              <stop offset="100%" stopColor="white" stopOpacity="0.1" />
            </linearGradient>

            {/* Glow filter */}
            <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="0.5" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>

            {/* Animated dash pattern */}
            <pattern id="flowPattern" patternUnits="userSpaceOnUse" width="8" height="1">
              <rect width="4" height="1" fill={COLORS.warning} opacity="0.8"/>
            </pattern>
          </defs>

          {/* Orbital ring */}
          <circle 
            cx="50" 
            cy="50" 
            r="42" 
            fill="none" 
            stroke="url(#idleGradient)" 
            strokeWidth="0.3"
            strokeDasharray="2 4"
          />

          {/* Connection lines from center to each agent */}
          {agentPositions.map((agent, index) => {
            const nodeState = getNodeState(agent.id);
            const isActive = nodeState.status === 'working';
            const isHovered = hoveredAgent === agent.id;
            const isConnected = nodeState.status === 'connected';
            
            // Calculate animated dash offset for flowing effect
            const dashOffset = isActive ? -animationPhase / 10 : 0;
            
            return (
              <g key={agent.id}>
                {/* Base connection line */}
                <line
                  x1="50"
                  y1="50"
                  x2={agent.position.x}
                  y2={agent.position.y}
                  stroke={isActive ? 'url(#activeGradient)' : isConnected ? `${COLORS.success}40` : 'url(#idleGradient)'}
                  strokeWidth={isActive ? '0.8' : isHovered ? '0.5' : '0.3'}
                  strokeLinecap="round"
                  opacity={isActive ? 1 : isHovered ? 0.6 : 0.3}
                  filter={isActive ? 'url(#glow)' : undefined}
                />
                
                {/* Animated flow particles for active connections */}
                {isActive && (
                  <>
                    <line
                      x1="50"
                      y1="50"
                      x2={agent.position.x}
                      y2={agent.position.y}
                      stroke={COLORS.warning}
                      strokeWidth="0.8"
                      strokeDasharray="2 6"
                      strokeDashoffset={dashOffset}
                      strokeLinecap="round"
                      opacity="0.9"
                    />
                    {/* Data packet animation */}
                    <circle
                      r="0.8"
                      fill={COLORS.warning}
                      opacity="0.9"
                      filter="url(#glow)"
                    >
                      <animateMotion
                        dur={`${2 + index * 0.3}s`}
                        repeatCount="indefinite"
                        path={`M50,50 L${agent.position.x},${agent.position.y}`}
                      />
                    </circle>
                  </>
                )}
              </g>
            );
          })}
        </svg>

        {/* Central Opie Orb */}
        <div style={styles.centralOrbContainer}>
          {/* Outer glow rings */}
          <div style={{
            ...styles.orbRing,
            ...styles.orbRing1,
            opacity: 0.15 + Math.sin(animationPhase / 30) * 0.1,
          }} />
          <div style={{
            ...styles.orbRing,
            ...styles.orbRing2,
            opacity: 0.1 + Math.cos(animationPhase / 25) * 0.05,
          }} />
          <div style={{
            ...styles.orbRing,
            ...styles.orbRing3,
            opacity: 0.05 + Math.sin(animationPhase / 20) * 0.03,
          }} />
          
          {/* Main orb */}
          <div style={{
            ...styles.centralOrb,
            boxShadow: `
              0 0 ${30 + Math.sin(animationPhase / 20) * 10}px ${COLORS.primary}60,
              0 0 ${60 + Math.cos(animationPhase / 15) * 20}px ${COLORS.primary}30,
              0 0 ${100 + Math.sin(animationPhase / 10) * 30}px ${COLORS.secondary}20,
              inset 0 0 30px ${COLORS.primary}40
            `,
          }}>
            <span style={styles.centralIcon}>⚡</span>
            <span style={styles.centralLabel}>Opie</span>
          </div>
          
          {/* Pulsing indicator */}
          {workingCount > 0 && (
            <div style={styles.pulseIndicator}>
              <span style={styles.pulseCount}>{workingCount}</span>
            </div>
          )}
        </div>

        {/* Agent Nodes */}
        {agentPositions.map((agent) => {
          const nodeState = getNodeState(agent.id);
          const isActive = nodeState.status === 'working';
          const isConnected = nodeState.status === 'connected';
          const isHovered = hoveredAgent === agent.id;
          const isSelected = selectedAgent?.id === agent.id;
          
          const statusColor = isActive ? COLORS.working : isConnected ? COLORS.success : COLORS.idle;
          
          return (
            <div
              key={agent.id}
              onClick={() => handleAgentClick(agent.id)}
              onMouseEnter={() => setHoveredAgent(agent.id)}
              onMouseLeave={() => setHoveredAgent(null)}
              style={{
                ...styles.agentCard,
                left: `${agent.position.x}%`,
                top: `${agent.position.y}%`,
                borderColor: isActive 
                  ? `${COLORS.warning}60`
                  : isConnected
                    ? `${COLORS.success}40`
                    : isHovered || isSelected
                      ? `${COLORS.primary}40`
                      : COLORS.glassBorder,
                background: isSelected
                  ? `linear-gradient(135deg, ${COLORS.primary}15, ${COLORS.secondary}10)`
                  : isHovered
                    ? COLORS.glassHover
                    : COLORS.glass,
                transform: `translate(-50%, -50%) scale(${isHovered ? 1.08 : 1})`,
                boxShadow: isActive
                  ? `0 0 20px ${COLORS.warning}30, 0 0 40px ${COLORS.warning}15, 0 8px 32px rgba(0,0,0,0.4)`
                  : isHovered
                    ? `0 0 15px ${COLORS.primary}20, 0 12px 40px rgba(0,0,0,0.5)`
                    : '0 4px 20px rgba(0,0,0,0.3)',
              }}
            >
              {/* Agent glow effect */}
              {isActive && (
                <div style={{
                  ...styles.agentGlow,
                  background: `radial-gradient(circle, ${COLORS.warning}30 0%, transparent 70%)`,
                  opacity: 0.5 + Math.sin(animationPhase / 15) * 0.3,
                }} />
              )}
              
              {/* Status indicator ring */}
              <div style={{
                ...styles.statusRing,
                borderColor: statusColor,
                opacity: isActive ? 1 : isConnected ? 0.8 : 0.3,
              }}>
                <span style={styles.agentEmoji}>{agent.emoji}</span>
              </div>
              
              {/* Agent name */}
              <span style={{
                ...styles.agentName,
                color: isActive ? '#fff' : isConnected ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.6)',
              }}>
                {agent.name}
              </span>
              
              {/* Status badge */}
              <div style={{
                ...styles.agentStatus,
                background: `${statusColor}20`,
                color: statusColor,
                borderColor: `${statusColor}40`,
              }}>
                {isActive ? '● Active' : isConnected ? '○ Ready' : '○ Idle'}
              </div>
              
              {/* Activity indicator for active agents */}
              {isActive && (
                <div style={styles.activityPulse}>
                  <div style={{
                    ...styles.activityDot,
                    animationDelay: '0s',
                  }} />
                  <div style={{
                    ...styles.activityDot,
                    animationDelay: '0.3s',
                  }} />
                  <div style={{
                    ...styles.activityDot,
                    animationDelay: '0.6s',
                  }} />
                </div>
              )}
              
              {/* Session count badge */}
              {nodeState.activeSessions > 0 && (
                <div style={styles.sessionBadge}>
                  {nodeState.activeSessions}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Selected Agent Detail Panel */}
      {selectedAgent && (
        <div style={styles.detailPanel}>
          <div style={styles.detailHeader}>
            <div style={styles.detailIcon}>
              <span style={styles.detailEmoji}>{selectedAgent.emoji}</span>
            </div>
            <div style={styles.detailInfo}>
              <h3 style={styles.detailName}>{selectedAgent.name} Agent</h3>
              <div style={{
                ...styles.detailStatus,
                color: selectedAgent.status === 'working' ? COLORS.warning : 
                       selectedAgent.status === 'connected' ? COLORS.success : 'rgba(255,255,255,0.5)',
              }}>
                {selectedAgent.status === 'working' ? '⚡ Processing' : 
                 selectedAgent.status === 'connected' ? '✓ Connected' : '○ Idle'}
              </div>
            </div>
            <button 
              onClick={() => setSelectedAgent(null)}
              style={styles.closeButton}
            >
              ✕
            </button>
          </div>
          
          {selectedAgent.currentTask && (
            <div style={styles.detailSection}>
              <div style={styles.detailLabel}>Current Task</div>
              <div style={styles.detailValue}>{selectedAgent.currentTask}</div>
            </div>
          )}
          
          <div style={styles.detailGrid}>
            <div style={styles.detailStat}>
              <span style={styles.detailStatValue}>{selectedAgent.activeSessions}</span>
              <span style={styles.detailStatLabel}>Sessions</span>
            </div>
            <div style={styles.detailStat}>
              <span style={styles.detailStatValue}>
                {selectedAgent.lastActivity 
                  ? new Date(selectedAgent.lastActivity).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                  : '--:--'}
              </span>
              <span style={styles.detailStatLabel}>Last Active</span>
            </div>
          </div>
        </div>
      )}

      {/* Footer Legend */}
      <div style={styles.footer}>
        <div style={styles.legend}>
          <div style={styles.legendItem}>
            <span style={{...styles.legendDot, background: COLORS.warning, boxShadow: `0 0 6px ${COLORS.warning}`}} />
            <span>Working</span>
          </div>
          <div style={styles.legendItem}>
            <span style={{...styles.legendDot, background: COLORS.success}} />
            <span>Connected</span>
          </div>
          <div style={styles.legendItem}>
            <span style={{...styles.legendDot, background: 'rgba(255,255,255,0.3)'}} />
            <span>Idle</span>
          </div>
        </div>
        
        {lastUpdated && (
          <div style={styles.timestamp}>
            Last sync: {new Date(lastUpdated).toLocaleTimeString()}
          </div>
        )}
      </div>

      {/* Error Banner */}
      {error && (
        <div style={styles.errorBanner}>
          <span>⚠️</span>
          <span>Gateway connection issue — showing cached data</span>
        </div>
      )}

      {/* CSS Animations */}
      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.1); opacity: 0.8; }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-3px); }
        }
        @keyframes glow-pulse {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }
        @keyframes activity-bounce {
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
          40% { transform: scale(1); opacity: 1; }
        }
        @keyframes ring-pulse {
          0% { transform: scale(1); opacity: 0.3; }
          50% { transform: scale(1.1); opacity: 0.1; }
          100% { transform: scale(1.2); opacity: 0; }
        }
        @keyframes gradient-flow {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
      `}</style>
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    background: 'linear-gradient(180deg, #0d0d14 0%, #12121f 50%, #0d0d14 100%)',
    borderRadius: '20px',
    border: `1px solid ${COLORS.glassBorder}`,
    overflow: 'hidden',
    position: 'relative',
    backdropFilter: 'blur(20px)',
  },
  
  // Ambient effects
  ambientGlow: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: '300px',
    height: '300px',
    background: `radial-gradient(circle, ${COLORS.primary}15 0%, ${COLORS.secondary}10 30%, transparent 70%)`,
    pointerEvents: 'none',
    zIndex: 0,
  },
  gridPattern: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundImage: `
      linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)
    `,
    backgroundSize: '40px 40px',
    pointerEvents: 'none',
    zIndex: 0,
  },
  
  // Header
  header: {
    padding: '20px 24px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: `1px solid ${COLORS.glassBorder}`,
    position: 'relative',
    zIndex: 10,
    background: 'linear-gradient(180deg, rgba(255,255,255,0.02) 0%, transparent 100%)',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
  },
  headerIconWrapper: {
    position: 'relative',
  },
  headerIcon: {
    fontSize: '24px',
    position: 'relative',
    zIndex: 1,
  },
  headerIconGlow: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: '40px',
    height: '40px',
    background: `radial-gradient(circle, ${COLORS.primary}40 0%, transparent 70%)`,
    borderRadius: '50%',
  },
  title: {
    color: '#fff',
    fontSize: '1.1rem',
    fontWeight: 700,
    margin: 0,
    letterSpacing: '-0.02em',
  },
  subtitle: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: '0.75rem',
    margin: '2px 0 0 0',
    fontWeight: 500,
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  statusPill: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 14px',
    borderRadius: '20px',
    border: '1px solid',
  },
  statusDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    animation: 'pulse 2s ease-in-out infinite',
  },
  statusText: {
    fontSize: '0.8rem',
    fontWeight: 600,
    letterSpacing: '0.02em',
  },
  
  // Visualization container
  visualContainer: {
    position: 'relative',
    height: '340px',
    padding: '20px',
    zIndex: 1,
  },
  connectionsSvg: {
    position: 'absolute',
    top: '10%',
    left: '10%',
    width: '80%',
    height: '80%',
    pointerEvents: 'none',
    zIndex: 1,
  },
  
  // Central orb
  centralOrbContainer: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    zIndex: 10,
  },
  orbRing: {
    position: 'absolute',
    borderRadius: '50%',
    border: `1px solid ${COLORS.primary}`,
    animation: 'ring-pulse 3s ease-out infinite',
  },
  orbRing1: {
    width: '100px',
    height: '100px',
    top: '-10px',
    left: '-10px',
  },
  orbRing2: {
    width: '120px',
    height: '120px',
    top: '-20px',
    left: '-20px',
    animationDelay: '0.5s',
  },
  orbRing3: {
    width: '140px',
    height: '140px',
    top: '-30px',
    left: '-30px',
    animationDelay: '1s',
  },
  centralOrb: {
    width: '80px',
    height: '80px',
    borderRadius: '50%',
    background: `linear-gradient(135deg, ${COLORS.primary} 0%, ${COLORS.secondary} 100%)`,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    zIndex: 2,
    transition: 'box-shadow 0.3s ease',
  },
  centralIcon: {
    fontSize: '28px',
    filter: 'drop-shadow(0 0 10px rgba(255,255,255,0.5))',
  },
  centralLabel: {
    color: '#fff',
    fontSize: '0.7rem',
    fontWeight: 700,
    marginTop: '2px',
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
  },
  pulseIndicator: {
    position: 'absolute',
    top: '-8px',
    right: '-8px',
    width: '24px',
    height: '24px',
    borderRadius: '50%',
    background: `linear-gradient(135deg, ${COLORS.warning}, ${COLORS.danger})`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: `0 0 15px ${COLORS.warning}`,
    animation: 'pulse 1.5s ease-in-out infinite',
    zIndex: 3,
  },
  pulseCount: {
    color: '#000',
    fontSize: '0.7rem',
    fontWeight: 800,
  },
  
  // Agent cards
  agentCard: {
    position: 'absolute',
    padding: '14px 16px',
    borderRadius: '16px',
    border: '1px solid',
    backdropFilter: 'blur(20px)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
    cursor: 'pointer',
    transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
    minWidth: '80px',
    zIndex: 5,
  },
  agentGlow: {
    position: 'absolute',
    top: '-20px',
    left: '-20px',
    right: '-20px',
    bottom: '-20px',
    borderRadius: '30px',
    pointerEvents: 'none',
    transition: 'opacity 0.3s ease',
  },
  statusRing: {
    width: '40px',
    height: '40px',
    borderRadius: '12px',
    border: '2px solid',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(0,0,0,0.3)',
    transition: 'all 0.3s ease',
  },
  agentEmoji: {
    fontSize: '20px',
  },
  agentName: {
    fontSize: '0.7rem',
    fontWeight: 600,
    whiteSpace: 'nowrap',
    letterSpacing: '-0.01em',
    transition: 'color 0.2s ease',
  },
  agentStatus: {
    fontSize: '0.6rem',
    fontWeight: 600,
    padding: '3px 8px',
    borderRadius: '8px',
    border: '1px solid',
    letterSpacing: '0.02em',
  },
  activityPulse: {
    display: 'flex',
    gap: '3px',
    marginTop: '2px',
  },
  activityDot: {
    width: '4px',
    height: '4px',
    borderRadius: '50%',
    background: COLORS.warning,
    animation: 'activity-bounce 1.2s ease-in-out infinite',
  },
  sessionBadge: {
    position: 'absolute',
    top: '-6px',
    right: '-6px',
    width: '20px',
    height: '20px',
    borderRadius: '10px',
    background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.secondary})`,
    color: '#fff',
    fontSize: '0.65rem',
    fontWeight: 700,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: `0 2px 8px ${COLORS.primary}60`,
  },
  
  // Detail panel
  detailPanel: {
    position: 'absolute',
    bottom: '70px',
    left: '50%',
    transform: 'translateX(-50%)',
    width: 'calc(100% - 48px)',
    maxWidth: '360px',
    background: 'rgba(13, 13, 20, 0.95)',
    backdropFilter: 'blur(20px)',
    borderRadius: '16px',
    border: `1px solid ${COLORS.glassBorder}`,
    padding: '16px',
    zIndex: 20,
    boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
    animation: 'float 0.3s ease-out',
  },
  detailHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '16px',
  },
  detailIcon: {
    width: '48px',
    height: '48px',
    borderRadius: '14px',
    background: `linear-gradient(135deg, ${COLORS.primary}20, ${COLORS.secondary}20)`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: `1px solid ${COLORS.primary}30`,
  },
  detailEmoji: {
    fontSize: '24px',
  },
  detailInfo: {
    flex: 1,
  },
  detailName: {
    color: '#fff',
    fontSize: '1rem',
    fontWeight: 700,
    margin: 0,
    letterSpacing: '-0.01em',
  },
  detailStatus: {
    fontSize: '0.8rem',
    fontWeight: 600,
    marginTop: '2px',
  },
  closeButton: {
    width: '28px',
    height: '28px',
    borderRadius: '8px',
    border: 'none',
    background: 'rgba(255,255,255,0.05)',
    color: 'rgba(255,255,255,0.5)',
    fontSize: '14px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s ease',
  },
  detailSection: {
    background: 'rgba(255,255,255,0.03)',
    borderRadius: '10px',
    padding: '12px',
    marginBottom: '12px',
  },
  detailLabel: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: '0.7rem',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginBottom: '4px',
  },
  detailValue: {
    color: '#fff',
    fontSize: '0.85rem',
    fontWeight: 500,
  },
  detailGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '12px',
  },
  detailStat: {
    background: 'rgba(255,255,255,0.03)',
    borderRadius: '10px',
    padding: '12px',
    textAlign: 'center',
  },
  detailStatValue: {
    display: 'block',
    color: '#fff',
    fontSize: '1.1rem',
    fontWeight: 700,
    marginBottom: '2px',
  },
  detailStatLabel: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: '0.65rem',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  
  // Footer
  footer: {
    padding: '14px 20px',
    borderTop: `1px solid ${COLORS.glassBorder}`,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    background: 'rgba(0,0,0,0.2)',
    position: 'relative',
    zIndex: 10,
  },
  legend: {
    display: 'flex',
    gap: '16px',
  },
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    color: 'rgba(255,255,255,0.5)',
    fontSize: '0.7rem',
    fontWeight: 500,
  },
  legendDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
  },
  timestamp: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: '0.65rem',
    fontWeight: 500,
  },
  
  // Error banner
  errorBanner: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: '10px 20px',
    background: `linear-gradient(90deg, ${COLORS.danger}20, ${COLORS.warning}20)`,
    borderTop: `1px solid ${COLORS.danger}40`,
    color: COLORS.warning,
    fontSize: '0.75rem',
    fontWeight: 500,
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    justifyContent: 'center',
    zIndex: 100,
  },
};
