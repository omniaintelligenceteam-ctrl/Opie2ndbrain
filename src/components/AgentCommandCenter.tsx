'use client';
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useAgentSessions } from '@/hooks/useAgentSessions';
import { AgentNodeState, AGENT_NODES } from '@/lib/agentMapping';

interface AgentCommandCenterProps {
  activeAgents?: string[];
  pollInterval?: number;
  onAgentClick?: (agentId: string, nodeState: AgentNodeState) => void;
  compact?: boolean;
}

const COLORS = {
  primary: '#667eea',
  secondary: '#764ba2',
  accent: '#06b6d4',
  success: '#22c55e',
  warning: '#f59e0b',
  danger: '#ef4444',
  working: '#f59e0b',
  connected: '#22c55e',
  idle: 'rgba(255,255,255,0.12)',
  glass: 'rgba(255,255,255,0.03)',
  glassBorder: 'rgba(255,255,255,0.08)',
};

// Workstation positions in the isometric scene (percentage-based)
const STATION_POSITIONS = [
  { x: 12, y: 18 },  // Research
  { x: 38, y: 10 },  // Code
  { x: 64, y: 10 },  // Proposal
  { x: 88, y: 18 },  // Content
  { x: 12, y: 58 },  // Sales
  { x: 38, y: 66 },  // Analyst
  { x: 64, y: 66 },  // QA
  { x: 88, y: 58 },  // Outreach
];

export default function AgentCommandCenter({
  activeAgents: overrideActiveAgents,
  pollInterval = 2000,
  onAgentClick,
  compact = false,
}: AgentCommandCenterProps) {
  const [hoveredAgent, setHoveredAgent] = useState<string | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<AgentNodeState | null>(null);
  const [mounted, setMounted] = useState(false);
  const [tick, setTick] = useState(0);
  const activityLogRef = useRef<Array<{ text: string; time: number; emoji: string }>>([]);

  useEffect(() => { setMounted(true); }, []);

  // Animation tick for subtle effects
  useEffect(() => {
    const interval = setInterval(() => setTick(t => (t + 1) % 1000), 80);
    return () => clearInterval(interval);
  }, []);

  const {
    nodes,
    activeAgentIds,
    activeCount,
    loading,
    error,
    lastUpdated,
    gatewayConnected,
    source,
    connectionType,
  } = useAgentSessions(pollInterval);

  const effectiveActiveAgents = overrideActiveAgents || activeAgentIds;

  const getNodeState = useCallback((agentId: string): AgentNodeState => {
    const realNode = nodes.find(n => n.id === agentId);
    if (realNode) return realNode;
    const config = AGENT_NODES.find(n => n.id === agentId);
    if (config) {
      return {
        ...config,
        status: effectiveActiveAgents.includes(agentId) ? 'working' : 'idle',
        activeSessions: effectiveActiveAgents.includes(agentId) ? 1 : 0,
      };
    }
    return { id: agentId, name: agentId, emoji: '🤖', status: 'idle', position: { x: 50, y: 50 }, color: '#737373', activeSessions: 0 };
  }, [nodes, effectiveActiveAgents]);

  // Track activity log
  useEffect(() => {
    for (const node of nodes) {
      if (node.status === 'working' && node.currentTask) {
        const exists = activityLogRef.current.find(
          a => a.text === node.currentTask && Date.now() - a.time < 30000
        );
        if (!exists) {
          activityLogRef.current = [
            { text: node.currentTask, time: Date.now(), emoji: node.emoji },
            ...activityLogRef.current.slice(0, 9),
          ];
        }
      }
    }
  }, [nodes]);

  const workingCount = effectiveActiveAgents.length;

  const handleAgentClick = (agentId: string) => {
    const nodeState = getNodeState(agentId);
    setSelectedAgent(selectedAgent?.id === agentId ? null : nodeState);
    onAgentClick?.(agentId, nodeState);
  };

  // ─── COMPACT / MOBILE MODE ─────────────────────────────────────
  if (compact) {
    return (
      <div style={{ padding: '8px 0' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          {AGENT_NODES.map(agent => {
            const state = getNodeState(agent.id);
            const isActive = state.status === 'working';
            const isConnected = state.status === 'connected';
            const statusColor = isActive ? COLORS.working : isConnected ? COLORS.success : COLORS.idle;
            return (
              <div
                key={agent.id}
                onClick={() => handleAgentClick(agent.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '10px',
                  padding: '10px 12px', borderRadius: '12px',
                  background: isActive ? `${agent.color}15` : COLORS.glass,
                  border: `1px solid ${isActive ? `${agent.color}40` : COLORS.glassBorder}`,
                  cursor: 'pointer', transition: 'all 0.2s ease',
                }}
              >
                <span style={{ fontSize: '20px' }}>{agent.emoji}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: '#fff', fontSize: '0.75rem', fontWeight: 600 }}>{agent.name}</div>
                  <div style={{ color: statusColor, fontSize: '0.65rem', fontWeight: 500 }}>
                    {isActive ? '● Working' : isConnected ? '○ Ready' : '○ Idle'}
                  </div>
                </div>
                {isActive && (
                  <div style={{ display: 'flex', gap: '2px' }}>
                    {[0, 1, 2].map(i => (
                      <div key={i} style={{
                        width: '3px', height: '3px', borderRadius: '50%', background: COLORS.working,
                        animation: `cc-bounce 1.2s ease-in-out infinite`, animationDelay: `${i * 0.2}s`,
                      }} />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <style>{`@keyframes cc-bounce { 0%,80%,100%{transform:scale(0.6);opacity:0.4} 40%{transform:scale(1);opacity:1} }`}</style>
      </div>
    );
  }

  // ─── FULL DESKTOP MODE ─────────────────────────────────────────
  return (
    <div style={styles.container}>
      {/* Ambient Background */}
      <div style={styles.gridFloor} />
      <div style={styles.ambientGlow} />

      {/* Scanline */}
      <div style={styles.scanline} />

      {/* ── Header HUD ──────────────────────────────────────── */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <div style={styles.hudIcon}>⚡</div>
          <div>
            <h2 style={styles.title}>Agent Command Center</h2>
            <div style={styles.subtitle}>LIVE OPERATIONS</div>
          </div>
        </div>
        <div style={styles.headerRight}>
          <div style={{
            ...styles.statusPill,
            background: workingCount > 0 ? `${COLORS.warning}18` : `${COLORS.success}18`,
            borderColor: workingCount > 0 ? `${COLORS.warning}40` : `${COLORS.success}40`,
          }}>
            <span style={{
              ...styles.statusDot,
              background: workingCount > 0 ? COLORS.warning : COLORS.success,
              boxShadow: `0 0 8px ${workingCount > 0 ? COLORS.warning : COLORS.success}`,
            }} />
            <span style={{
              ...styles.statusText,
              color: workingCount > 0 ? COLORS.warning : COLORS.success,
            }}>
              {loading ? 'Syncing...' : `${workingCount} Active`}
            </span>
          </div>
          {connectionType === 'sse' && (
            <div style={{ ...styles.statusPill, background: `${COLORS.success}10`, borderColor: `${COLORS.success}30` }}>
              <span style={{ color: COLORS.success, fontSize: '0.7rem', fontWeight: 600 }}>⚡ LIVE</span>
            </div>
          )}
        </div>
      </div>

      {/* ── Main Scene ──────────────────────────────────────── */}
      <div style={styles.scene}>

        {/* SVG layer for connection lines + particles */}
        <svg style={styles.svgLayer} viewBox="0 0 100 80" preserveAspectRatio="xMidYMid meet">
          <defs>
            <linearGradient id="cc-active-grad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={COLORS.primary} stopOpacity="0.6" />
              <stop offset="50%" stopColor={COLORS.warning} stopOpacity="0.9" />
              <stop offset="100%" stopColor={COLORS.secondary} stopOpacity="0.6" />
            </linearGradient>
            <filter id="cc-glow">
              <feGaussianBlur stdDeviation="0.8" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>

          {/* Connection lines from each station to center */}
          {STATION_POSITIONS.map((pos, i) => {
            const agent = AGENT_NODES[i];
            if (!agent) return null;
            const state = getNodeState(agent.id);
            const isActive = state.status === 'working';
            const isHovered = hoveredAgent === agent.id;

            return (
              <g key={agent.id}>
                {/* Base line */}
                <line
                  x1={pos.x} y1={pos.y + 5}
                  x2={50} y2={42}
                  stroke={isActive ? `${agent.color}` : isHovered ? `${COLORS.primary}60` : 'rgba(255,255,255,0.04)'}
                  strokeWidth={isActive ? '0.4' : '0.2'}
                  strokeDasharray={isActive ? 'none' : '2 4'}
                  opacity={isActive ? 0.6 : 0.3}
                />
                {/* Animated particle for active agents */}
                {isActive && (
                  <>
                    <circle r="0.8" fill={agent.color} opacity="0.9" filter="url(#cc-glow)">
                      <animateMotion
                        dur={`${2.5 + i * 0.2}s`}
                        repeatCount="indefinite"
                        path={`M${pos.x},${pos.y + 5} L50,42`}
                      />
                    </circle>
                    <circle r="0.5" fill="#fff" opacity="0.6">
                      <animateMotion
                        dur={`${3.5 + i * 0.3}s`}
                        repeatCount="indefinite"
                        path={`M50,42 L${pos.x},${pos.y + 5}`}
                      />
                    </circle>
                  </>
                )}
              </g>
            );
          })}
        </svg>

        {/* ── Central Hub ──────────────────────────────────── */}
        <div style={styles.hubContainer}>
          {/* Pulse rings */}
          {workingCount > 0 && (
            <>
              <div style={{ ...styles.hubRing, animationDelay: '0s' }} />
              <div style={{ ...styles.hubRing, width: '110px', height: '110px', top: '-15px', left: '-15px', animationDelay: '0.6s' }} />
              <div style={{ ...styles.hubRing, width: '130px', height: '130px', top: '-25px', left: '-25px', animationDelay: '1.2s' }} />
            </>
          )}
          <div style={{
            ...styles.hub,
            boxShadow: workingCount > 0
              ? `0 0 30px ${COLORS.primary}80, 0 0 60px ${COLORS.primary}40, 0 0 90px ${COLORS.secondary}25, inset 0 0 20px ${COLORS.primary}40`
              : `0 0 20px ${COLORS.primary}40, 0 0 40px ${COLORS.primary}20, inset 0 0 15px ${COLORS.primary}20`,
          }}>
            <div style={styles.hubInner}>
              <span style={styles.hubIcon}>⚡</span>
              <span style={styles.hubLabel}>OPIE</span>
            </div>
            {workingCount > 0 && (
              <div style={styles.hubBadge}>{workingCount}</div>
            )}
          </div>
        </div>

        {/* ── Agent Workstations ───────────────────────────── */}
        {STATION_POSITIONS.map((pos, i) => {
          const agent = AGENT_NODES[i];
          if (!agent) return null;
          const state = getNodeState(agent.id);
          const isActive = state.status === 'working';
          const isConnected = state.status === 'connected';
          const isHovered = hoveredAgent === agent.id;
          const isSelected = selectedAgent?.id === agent.id;

          return (
            <div
              key={agent.id}
              onClick={() => handleAgentClick(agent.id)}
              onMouseEnter={() => setHoveredAgent(agent.id)}
              onMouseLeave={() => setHoveredAgent(null)}
              style={{
                position: 'absolute',
                left: `${pos.x}%`,
                top: `${pos.y}%`,
                transform: `translate(-50%, -50%) scale(${isHovered ? 1.08 : 1})`,
                transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                cursor: 'pointer',
                zIndex: isHovered || isSelected ? 15 : 5,
              }}
            >
              {/* Speech bubble for current task */}
              {isActive && state.currentTask && (
                <div style={{
                  position: 'absolute',
                  bottom: '100%',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  marginBottom: '6px',
                  background: 'rgba(0,0,0,0.85)',
                  border: `1px solid ${agent.color}50`,
                  borderRadius: '8px',
                  padding: '4px 8px',
                  maxWidth: '130px',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  fontSize: '0.55rem',
                  color: 'rgba(255,255,255,0.8)',
                  backdropFilter: 'blur(8px)',
                  animation: 'cc-fadeIn 0.3s ease',
                  zIndex: 20,
                  pointerEvents: 'none',
                }}>
                  {state.currentTask.slice(0, 40)}
                  <div style={{
                    position: 'absolute',
                    bottom: '-4px',
                    left: '50%',
                    transform: 'translateX(-50%) rotate(45deg)',
                    width: '7px',
                    height: '7px',
                    background: 'rgba(0,0,0,0.85)',
                    borderRight: `1px solid ${agent.color}50`,
                    borderBottom: `1px solid ${agent.color}50`,
                  }} />
                </div>
              )}

              {/* Station ambient glow */}
              {isActive && (
                <div style={{
                  position: 'absolute',
                  top: '-15px',
                  left: '-15px',
                  right: '-15px',
                  bottom: '-15px',
                  borderRadius: '20px',
                  background: `radial-gradient(circle, ${agent.color}25 0%, transparent 70%)`,
                  animation: 'cc-glow-pulse 2s ease-in-out infinite',
                  pointerEvents: 'none',
                }} />
              )}

              {/* Workstation card */}
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '4px',
                padding: '10px 14px 8px',
                borderRadius: '14px',
                background: isActive
                  ? `linear-gradient(145deg, ${agent.color}12, rgba(0,0,0,0.6))`
                  : isSelected
                    ? `linear-gradient(145deg, ${COLORS.primary}10, rgba(0,0,0,0.5))`
                    : 'rgba(10,10,20,0.7)',
                border: `1px solid ${isActive ? `${agent.color}50` : isHovered ? `${COLORS.primary}30` : 'rgba(255,255,255,0.06)'}`,
                backdropFilter: 'blur(12px)',
                boxShadow: isActive
                  ? `0 0 20px ${agent.color}20, 0 4px 20px rgba(0,0,0,0.4)`
                  : isHovered
                    ? `0 0 12px ${COLORS.primary}15, 0 8px 24px rgba(0,0,0,0.5)`
                    : '0 2px 12px rgba(0,0,0,0.3)',
                minWidth: '72px',
              }}>
                {/* Character avatar — emoji on geometric body */}
                <div style={{
                  position: 'relative',
                  width: '38px',
                  height: '38px',
                  borderRadius: '12px',
                  background: isActive
                    ? `linear-gradient(135deg, ${agent.color}30, ${agent.color}10)`
                    : 'rgba(255,255,255,0.04)',
                  border: `2px solid ${isActive ? agent.color : isConnected ? `${COLORS.success}60` : 'rgba(255,255,255,0.08)'}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.3s ease',
                  animation: isActive ? 'cc-working 1s ease-in-out infinite' : (state.status === 'idle' ? 'cc-breathe 4s ease-in-out infinite' : 'none'),
                }}>
                  <span style={{ fontSize: '18px', filter: isActive ? 'drop-shadow(0 0 4px rgba(255,255,255,0.4))' : 'none' }}>
                    {agent.emoji}
                  </span>

                  {/* Screen glow indicator */}
                  <div style={{
                    position: 'absolute',
                    bottom: '-3px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: '20px',
                    height: '3px',
                    borderRadius: '2px',
                    background: isActive ? agent.color : isConnected ? COLORS.success : 'rgba(255,255,255,0.1)',
                    boxShadow: isActive ? `0 0 8px ${agent.color}, 0 2px 4px ${agent.color}60` : 'none',
                    animation: isActive ? 'cc-screen-flicker 3s ease-in-out infinite' : 'none',
                    transition: 'all 0.3s ease',
                  }} />
                </div>

                {/* Agent name */}
                <span style={{
                  fontSize: '0.65rem',
                  fontWeight: 600,
                  color: isActive ? '#fff' : isConnected ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.45)',
                  whiteSpace: 'nowrap',
                  letterSpacing: '-0.01em',
                }}>
                  {agent.name}
                </span>

                {/* Status row */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '0.55rem',
                  fontWeight: 600,
                  color: isActive ? COLORS.working : isConnected ? COLORS.success : 'rgba(255,255,255,0.3)',
                }}>
                  {isActive ? (
                    <>
                      <span style={{ animation: 'cc-blink 1s step-end infinite' }}>●</span>
                      <span>Active</span>
                      {/* Typing dots */}
                      <span style={{ display: 'flex', gap: '1.5px', marginLeft: '2px' }}>
                        {[0, 1, 2].map(j => (
                          <span key={j} style={{
                            width: '2.5px',
                            height: '2.5px',
                            borderRadius: '50%',
                            background: COLORS.working,
                            display: 'inline-block',
                            animation: `cc-bounce 1.2s ease-in-out infinite`,
                            animationDelay: `${j * 0.15}s`,
                          }} />
                        ))}
                      </span>
                    </>
                  ) : isConnected ? (
                    <><span>○</span><span>Ready</span></>
                  ) : (
                    <><span>○</span><span>Idle</span></>
                  )}
                </div>

                {/* Session count */}
                {state.activeSessions > 1 && (
                  <div style={{
                    position: 'absolute',
                    top: '-4px',
                    right: '-4px',
                    width: '16px',
                    height: '16px',
                    borderRadius: '8px',
                    background: `linear-gradient(135deg, ${agent.color}, ${COLORS.secondary})`,
                    color: '#fff',
                    fontSize: '0.55rem',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: `0 2px 6px ${agent.color}60`,
                  }}>
                    {state.activeSessions}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Activity Ticker ─────────────────────────────────── */}
      {activityLogRef.current.length > 0 && (
        <div style={styles.ticker}>
          <div style={styles.tickerContent}>
            {activityLogRef.current.slice(0, 4).map((item, i) => (
              <span key={i} style={styles.tickerItem}>
                <span>{item.emoji}</span>
                <span>{item.text.slice(0, 50)}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ── Selected Agent Detail Panel ─────────────────────── */}
      {selectedAgent && (
        <div style={styles.detailPanel}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
            <div style={{
              width: '42px', height: '42px', borderRadius: '12px',
              background: `linear-gradient(135deg, ${selectedAgent.color || COLORS.primary}20, ${COLORS.secondary}15)`,
              border: `1px solid ${selectedAgent.color || COLORS.primary}30`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span style={{ fontSize: '22px' }}>{selectedAgent.emoji}</span>
            </div>
            <div style={{ flex: 1 }}>
              <h3 style={{ color: '#fff', fontSize: '0.95rem', fontWeight: 700, margin: 0 }}>{selectedAgent.name} Agent</h3>
              <div style={{
                fontSize: '0.75rem', fontWeight: 600, marginTop: '2px',
                color: selectedAgent.status === 'working' ? COLORS.warning : selectedAgent.status === 'connected' ? COLORS.success : 'rgba(255,255,255,0.5)',
              }}>
                {selectedAgent.status === 'working' ? '⚡ Processing' : selectedAgent.status === 'connected' ? '✓ Connected' : '○ Idle'}
              </div>
            </div>
            <button onClick={() => setSelectedAgent(null)} style={styles.closeBtn}>✕</button>
          </div>
          {selectedAgent.currentTask && (
            <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '8px', padding: '10px', marginBottom: '10px' }}>
              <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.6rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '3px' }}>Current Task</div>
              <div style={{ color: '#fff', fontSize: '0.8rem', fontWeight: 500 }}>{selectedAgent.currentTask}</div>
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '8px', padding: '10px', textAlign: 'center' }}>
              <span style={{ display: 'block', color: '#fff', fontSize: '1rem', fontWeight: 700 }}>{selectedAgent.activeSessions}</span>
              <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.6rem', fontWeight: 600, textTransform: 'uppercase' }}>Sessions</span>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '8px', padding: '10px', textAlign: 'center' }}>
              <span style={{ display: 'block', color: '#fff', fontSize: '1rem', fontWeight: 700 }}>
                {selectedAgent.lastActivity && mounted
                  ? new Date(selectedAgent.lastActivity).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
                  : '--:--'}
              </span>
              <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.6rem', fontWeight: 600, textTransform: 'uppercase' }}>Last Active</span>
            </div>
          </div>
        </div>
      )}

      {/* ── Footer ──────────────────────────────────────────── */}
      <div style={styles.footer}>
        <div style={styles.legend}>
          <div style={styles.legendItem}>
            <span style={{ ...styles.legendDot, background: COLORS.working, boxShadow: `0 0 5px ${COLORS.working}` }} />
            <span>Working</span>
          </div>
          <div style={styles.legendItem}>
            <span style={{ ...styles.legendDot, background: COLORS.success }} />
            <span>Connected</span>
          </div>
          <div style={styles.legendItem}>
            <span style={{ ...styles.legendDot, background: 'rgba(255,255,255,0.25)' }} />
            <span>Idle</span>
          </div>
        </div>
        <div style={styles.timestamp}>
          {!gatewayConnected && !loading && (
            <span style={{ color: '#f59e0b', marginRight: '8px' }}>⚠️ Offline</span>
          )}
          {connectionType === 'sse' && (
            <span style={{ color: '#22c55e', marginRight: '6px' }}>⚡</span>
          )}
          {lastUpdated && mounted ? (
            <>Synced {new Date(lastUpdated).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</>
          ) : loading ? 'Connecting...' : 'Not connected'}
          {source === 'cache' && ' (cached)'}
        </div>
      </div>

      {/* Error Banner */}
      {error && !gatewayConnected && (
        <div style={styles.errorBanner}>
          <span>⚠️</span>
          <span>Gateway unavailable — {source === 'cache' ? 'showing cached data' : 'no data available'}</span>
        </div>
      )}

      {/* ── CSS Animations ──────────────────────────────────── */}
      <style>{`
        @keyframes cc-bounce {
          0%, 80%, 100% { transform: scale(0.5); opacity: 0.3; }
          40% { transform: scale(1); opacity: 1; }
        }
        @keyframes cc-breathe {
          0%, 100% { transform: scale(1); opacity: 0.7; }
          50% { transform: scale(1.02); opacity: 0.85; }
        }
        @keyframes cc-working {
          0%, 100% { transform: scale(1); }
          30% { transform: scale(1.03) translateY(-1px); }
          60% { transform: scale(0.98); }
        }
        @keyframes cc-glow-pulse {
          0%, 100% { opacity: 0.5; transform: scale(1); }
          50% { opacity: 0.8; transform: scale(1.05); }
        }
        @keyframes cc-screen-flicker {
          0%, 95%, 100% { opacity: 1; }
          96% { opacity: 0.4; }
          97% { opacity: 1; }
          98% { opacity: 0.6; }
        }
        @keyframes cc-blink {
          0%, 49% { opacity: 1; }
          50%, 100% { opacity: 0.3; }
        }
        @keyframes cc-fadeIn {
          from { opacity: 0; transform: translateX(-50%) translateY(4px); }
          to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
        @keyframes cc-scanline {
          0% { top: -2px; }
          100% { top: 100%; }
        }
        @keyframes cc-ring-pulse {
          0% { transform: translate(-50%, -50%) scale(1); opacity: 0.3; }
          100% { transform: translate(-50%, -50%) scale(1.4); opacity: 0; }
        }
        @keyframes cc-ticker-scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
}

// ─── Styles ────────────────────────────────────────────────────────
const styles: { [key: string]: React.CSSProperties } = {
  container: {
    background: 'linear-gradient(180deg, #0a0a12 0%, #0f0f1a 50%, #0a0a12 100%)',
    borderRadius: '20px',
    border: `1px solid ${COLORS.glassBorder}`,
    overflow: 'hidden',
    position: 'relative',
  },
  gridFloor: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundImage: `
      linear-gradient(rgba(102,126,234,0.03) 1px, transparent 1px),
      linear-gradient(90deg, rgba(102,126,234,0.03) 1px, transparent 1px)
    `,
    backgroundSize: '32px 32px',
    pointerEvents: 'none',
    zIndex: 0,
  },
  ambientGlow: {
    position: 'absolute',
    top: '40%', left: '50%',
    transform: 'translate(-50%, -50%)',
    width: '400px', height: '300px',
    background: `radial-gradient(ellipse, ${COLORS.primary}12 0%, ${COLORS.secondary}08 40%, transparent 70%)`,
    pointerEvents: 'none',
    zIndex: 0,
  },
  scanline: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: '1px',
    background: `linear-gradient(90deg, transparent, ${COLORS.primary}40, transparent)`,
    animation: 'cc-scanline 5s linear infinite',
    pointerEvents: 'none',
    zIndex: 1,
  },

  // Header
  header: {
    padding: '16px 20px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: `1px solid ${COLORS.glassBorder}`,
    position: 'relative',
    zIndex: 10,
    background: 'linear-gradient(180deg, rgba(255,255,255,0.015) 0%, transparent 100%)',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  hudIcon: {
    fontSize: '20px',
    width: '36px', height: '36px',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    borderRadius: '10px',
    background: `linear-gradient(135deg, ${COLORS.primary}20, ${COLORS.secondary}15)`,
    border: `1px solid ${COLORS.primary}30`,
  },
  title: {
    color: '#fff',
    fontSize: '1rem',
    fontWeight: 700,
    margin: 0,
    letterSpacing: '-0.02em',
  },
  subtitle: {
    color: `${COLORS.accent}`,
    fontSize: '0.55rem',
    fontWeight: 700,
    letterSpacing: '0.15em',
    marginTop: '1px',
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  statusPill: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 12px',
    borderRadius: '16px',
    border: '1px solid',
  },
  statusDot: {
    width: '7px', height: '7px',
    borderRadius: '50%',
    animation: 'cc-blink 2s ease-in-out infinite',
  },
  statusText: {
    fontSize: '0.75rem',
    fontWeight: 600,
  },

  // Scene
  scene: {
    position: 'relative',
    height: '360px',
    padding: '16px',
    zIndex: 1,
  },
  svgLayer: {
    position: 'absolute',
    top: '5%', left: '5%',
    width: '90%', height: '90%',
    pointerEvents: 'none',
    zIndex: 2,
  },

  // Central hub
  hubContainer: {
    position: 'absolute',
    top: '48%', left: '50%',
    transform: 'translate(-50%, -50%)',
    zIndex: 10,
  },
  hubRing: {
    position: 'absolute',
    width: '90px', height: '90px',
    top: '-5px', left: '-5px',
    borderRadius: '50%',
    border: `1px solid ${COLORS.primary}30`,
    animation: 'cc-ring-pulse 2.5s ease-out infinite',
    pointerEvents: 'none',
  },
  hub: {
    width: '80px', height: '80px',
    borderRadius: '50%',
    background: `
      radial-gradient(circle at 30% 30%, rgba(255,255,255,0.15) 0%, transparent 50%),
      linear-gradient(135deg, #15152a 0%, #0d0d1a 50%, #1a1a30 100%)
    `,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    border: `1px solid ${COLORS.primary}40`,
    transition: 'box-shadow 0.5s ease',
  },
  hubInner: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: '1px',
  },
  hubIcon: {
    fontSize: '24px',
    filter: 'drop-shadow(0 0 8px rgba(255,255,255,0.5))',
  },
  hubLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: '0.5rem',
    fontWeight: 800,
    letterSpacing: '0.15em',
  },
  hubBadge: {
    position: 'absolute' as const,
    top: '-6px', right: '-6px',
    width: '22px', height: '22px',
    borderRadius: '11px',
    background: `linear-gradient(135deg, ${COLORS.warning}, ${COLORS.danger})`,
    color: '#000',
    fontSize: '0.65rem',
    fontWeight: 800,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: `0 0 12px ${COLORS.warning}`,
    animation: 'cc-blink 1.5s ease-in-out infinite',
  },

  // Activity ticker
  ticker: {
    padding: '8px 16px',
    borderTop: `1px solid ${COLORS.glassBorder}`,
    background: 'rgba(0,0,0,0.3)',
    overflow: 'hidden',
    position: 'relative' as const,
    zIndex: 10,
  },
  tickerContent: {
    display: 'flex',
    gap: '24px',
    animation: 'cc-ticker-scroll 30s linear infinite',
    whiteSpace: 'nowrap' as const,
  },
  tickerItem: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    color: 'rgba(255,255,255,0.5)',
    fontSize: '0.65rem',
    fontWeight: 500,
  },

  // Detail panel
  detailPanel: {
    position: 'absolute' as const,
    bottom: '60px', left: '50%',
    transform: 'translateX(-50%)',
    width: 'calc(100% - 40px)',
    maxWidth: '340px',
    background: 'rgba(10, 10, 18, 0.95)',
    backdropFilter: 'blur(20px)',
    borderRadius: '14px',
    border: `1px solid ${COLORS.glassBorder}`,
    padding: '14px',
    zIndex: 25,
    boxShadow: '0 16px 48px rgba(0,0,0,0.6)',
    animation: 'cc-fadeIn 0.2s ease-out',
  },
  closeBtn: {
    width: '26px', height: '26px',
    borderRadius: '8px',
    border: 'none',
    background: 'rgba(255,255,255,0.05)',
    color: 'rgba(255,255,255,0.5)',
    fontSize: '13px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Footer
  footer: {
    padding: '12px 18px',
    borderTop: `1px solid ${COLORS.glassBorder}`,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    background: 'rgba(0,0,0,0.2)',
    position: 'relative' as const,
    zIndex: 10,
  },
  legend: {
    display: 'flex',
    gap: '14px',
  },
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    color: 'rgba(255,255,255,0.45)',
    fontSize: '0.65rem',
    fontWeight: 500,
  },
  legendDot: {
    width: '7px', height: '7px',
    borderRadius: '50%',
  },
  timestamp: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: '0.6rem',
    fontWeight: 500,
  },
  errorBanner: {
    position: 'absolute' as const,
    bottom: 0, left: 0, right: 0,
    padding: '8px 16px',
    background: `linear-gradient(90deg, ${COLORS.danger}15, ${COLORS.warning}15)`,
    borderTop: `1px solid ${COLORS.danger}30`,
    color: COLORS.warning,
    fontSize: '0.7rem',
    fontWeight: 500,
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    justifyContent: 'center',
    zIndex: 100,
  },
};
