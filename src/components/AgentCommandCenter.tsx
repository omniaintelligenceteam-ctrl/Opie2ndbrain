'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useAgentSessions } from '@/hooks/useAgentSessions';
import { AgentNodeState, AGENT_NODES } from '@/lib/agentMapping';

interface AgentCommandCenterProps {
  activeAgents?: string[];
  pollInterval?: number;
  onAgentClick?: (agentId: string, nodeState: AgentNodeState) => void;
  compact?: boolean;
  isThinking?: boolean; // true when Opie is processing a user message
}

// Workstation layout: 2 rows of 4, positioned around a central holotable
const WORKSTATIONS = [
  // Top row — facing down toward center
  { x: 10, y: 8,  row: 'top' },   // Research
  { x: 30, y: 3,  row: 'top' },   // Code
  { x: 55, y: 3,  row: 'top' },   // Proposal
  { x: 75, y: 8,  row: 'top' },   // Content
  // Bottom row — facing up toward center
  { x: 10, y: 62, row: 'bottom' }, // Sales
  { x: 30, y: 67, row: 'bottom' }, // Analyst
  { x: 55, y: 67, row: 'bottom' }, // QA
  { x: 75, y: 62, row: 'bottom' }, // Outreach
];

export default function AgentCommandCenter({
  activeAgents: overrideActiveAgents,
  pollInterval = 2000,
  onAgentClick,
  compact = false,
  isThinking = false,
}: AgentCommandCenterProps) {
  const [hoveredAgent, setHoveredAgent] = useState<string | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<AgentNodeState | null>(null);
  const [mounted, setMounted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const activityLogRef = useRef<Array<{ text: string; time: number; emoji: string }>>([]);

  useEffect(() => { setMounted(true); }, []);

  // ESC key to exit fullscreen
  useEffect(() => {
    if (!isFullscreen) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsFullscreen(false);
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isFullscreen]);

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
    return { id: agentId, name: agentId, emoji: '?', status: 'idle', position: { x: 50, y: 50 }, color: '#737373', activeSessions: 0 };
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
  const opieState: 'idle' | 'thinking' | 'working' = isThinking ? 'thinking' : workingCount > 0 ? 'working' : 'idle';
  const opieActive = opieState !== 'idle';

  const handleAgentClick = (agentId: string) => {
    const nodeState = getNodeState(agentId);
    setSelectedAgent(selectedAgent?.id === agentId ? null : nodeState);
    onAgentClick?.(agentId, nodeState);
  };

  // ─── COMPACT / MOBILE MODE ─────────────────────────────────────
  if (compact) {
    return (
      <div style={{ padding: '8px 0' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
          {AGENT_NODES.map(agent => {
            const state = getNodeState(agent.id);
            const isActive = state.status === 'working';
            const isConnected = state.status === 'connected';
            return (
              <div
                key={agent.id}
                onClick={() => handleAgentClick(agent.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  padding: '8px 10px', borderRadius: '8px',
                  background: isActive ? '#152015' : '#161b2e',
                  border: `1px solid ${isActive ? `${agent.color}50` : '#2d3a5c'}`,
                  cursor: 'pointer',
                }}
              >
                {/* Mini monitor icon */}
                <div style={{
                  width: '28px', height: '20px', borderRadius: '3px',
                  background: isActive ? agent.color : '#2a2a4a',
                  border: `1.5px solid ${isActive ? agent.color : '#3a3a5a'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '10px', position: 'relative',
                  boxShadow: isActive ? `0 0 8px ${agent.color}60` : 'none',
                }}>
                  <span style={{ filter: isActive ? 'brightness(2)' : 'none' }}>{agent.emoji}</span>
                  <div style={{
                    position: 'absolute', bottom: '-4px', left: '50%', transform: 'translateX(-50%)',
                    width: '8px', height: '3px', background: '#3a3a5a', borderRadius: '0 0 2px 2px',
                  }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: isActive ? '#fff' : '#b0b8cc', fontSize: '0.7rem', fontWeight: 600 }}>{agent.name}</div>
                  <div style={{
                    color: isActive ? '#4ade80' : isConnected ? '#22c55e' : '#667',
                    fontSize: '0.6rem', fontWeight: 500,
                  }}>
                    {isActive ? 'WORKING' : isConnected ? 'READY' : 'IDLE'}
                  </div>
                </div>
                {isActive && (
                  <div style={{ display: 'flex', gap: '2px' }}>
                    {[0, 1, 2].map(i => (
                      <div key={i} style={{
                        width: '3px', height: '3px', borderRadius: '50%', background: agent.color,
                        animation: `wr-typedot 1s ease-in-out infinite`, animationDelay: `${i * 0.15}s`,
                      }} />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <style>{`@keyframes wr-typedot { 0%,80%,100%{transform:translateY(0);opacity:0.3} 40%{transform:translateY(-3px);opacity:1} }`}</style>
      </div>
    );
  }

  // ─── FULL DESKTOP MODE — VIRTUAL OFFICE SCENE ──────────────────
  return (
    <div style={{
      background: '#111827',
      borderRadius: isFullscreen ? '0' : '16px',
      border: isFullscreen ? 'none' : '1px solid #2d3a5c',
      overflow: 'hidden',
      position: isFullscreen ? 'fixed' : 'relative',
      ...(isFullscreen ? { top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999 } : {}),
      fontFamily: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace",
      transition: 'all 0.3s ease',
    }}>
      {/* ── Room ambience ──────────────────────────────────── */}
      {/* Neon grid floor (perspective) */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: '55%',
        perspective: '600px', overflow: 'hidden', pointerEvents: 'none', zIndex: 0,
      }}>
        <div style={{
          width: '200%', height: '200%', position: 'absolute',
          top: '-20%', left: '-50%',
          transform: 'rotateX(65deg)',
          transformOrigin: 'center top',
          backgroundImage: `
            linear-gradient(rgba(6,182,212,0.18) 1px, transparent 1px),
            linear-gradient(90deg, rgba(6,182,212,0.18) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
          animation: 'wr-grid-scroll 8s linear infinite',
        }} />
      </div>

      {/* Ambient center glow */}
      <div style={{
        position: 'absolute', top: '35%', left: '50%', transform: 'translate(-50%, -50%)',
        width: '350px', height: '250px',
        background: opieState === 'thinking'
          ? 'radial-gradient(ellipse, rgba(168,85,247,0.3) 0%, rgba(118,75,162,0.15) 40%, transparent 70%)'
          : workingCount > 0
            ? 'radial-gradient(ellipse, rgba(6,182,212,0.25) 0%, rgba(118,75,162,0.12) 40%, transparent 70%)'
            : 'radial-gradient(ellipse, rgba(6,182,212,0.12) 0%, rgba(118,75,162,0.05) 50%, transparent 70%)',
        pointerEvents: 'none', zIndex: 0,
      }} />

      {/* Scanline */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: '2px',
        background: 'linear-gradient(90deg, transparent, rgba(6,182,212,0.4), transparent)',
        animation: 'wr-scanline 4s linear infinite',
        pointerEvents: 'none', zIndex: 50,
      }} />

      {/* ── HUD Header ─────────────────────────────────────── */}
      <div style={{
        padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        borderBottom: '1px solid #2d3a5c', position: 'relative', zIndex: 10,
        background: 'linear-gradient(180deg, rgba(6,182,212,0.06) 0%, transparent 100%)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '8px', height: '8px', borderRadius: '2px', background: '#06b6d4',
            boxShadow: '0 0 8px #06b6d4', animation: 'wr-pulse 2s ease-in-out infinite',
          }} />
          <div>
            <h2 style={{
              color: '#f1f5f9', fontSize: '0.9rem', fontWeight: 700, margin: 0,
              letterSpacing: '0.05em', textTransform: 'uppercase',
            }}>
              Opie War Room
            </h2>
            <div style={{
              color: '#22d3ee', fontSize: '0.5rem', fontWeight: 600,
              letterSpacing: '0.2em', opacity: 0.9,
            }}>
              LIVE OPERATIONS
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            padding: '4px 10px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 600,
            background: workingCount > 0 ? 'rgba(250,204,21,0.12)' : 'rgba(34,197,94,0.12)',
            border: `1px solid ${workingCount > 0 ? 'rgba(250,204,21,0.35)' : 'rgba(34,197,94,0.35)'}`,
            color: workingCount > 0 ? '#facc15' : '#22c55e',
            display: 'flex', alignItems: 'center', gap: '6px',
          }}>
            <span style={{
              width: '5px', height: '5px', borderRadius: '50%',
              background: 'currentColor', animation: 'wr-blink 1.5s ease-in-out infinite',
            }} />
            {loading ? 'SYNC...' : `${workingCount} ACTIVE`}
          </div>
          {connectionType === 'sse' && (
            <div style={{
              padding: '4px 8px', borderRadius: '4px', fontSize: '0.6rem', fontWeight: 700,
              background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.3)',
              color: '#22c55e', letterSpacing: '0.1em',
            }}>
              LIVE
            </div>
          )}
          {/* Fullscreen toggle */}
          <button
            onClick={() => setIsFullscreen(f => !f)}
            style={{
              padding: '4px 8px', borderRadius: '4px', fontSize: '0.65rem', fontWeight: 600,
              background: isFullscreen ? 'rgba(6,182,212,0.2)' : 'rgba(255,255,255,0.06)',
              border: `1px solid ${isFullscreen ? 'rgba(6,182,212,0.4)' : '#2d3a5c'}`,
              color: isFullscreen ? '#06b6d4' : '#8899aa',
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px',
              transition: 'all 0.2s ease',
            }}
            title={isFullscreen ? 'Exit fullscreen' : 'Expand to fullscreen'}
          >
            {isFullscreen ? '\u2716' : '\u26F6'}
          </button>
        </div>
      </div>

      {/* ── Main Scene ─────────────────────────────────────── */}
      <div style={{
        position: 'relative',
        height: isFullscreen ? 'calc(100vh - 120px)' : '460px',
        zIndex: 1, overflow: 'hidden',
        transition: 'height 0.3s ease',
      }}>

        {/* SVG layer — connection lines + particles */}
        <svg
          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 3 }}
          viewBox="0 0 100 100"
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            <filter id="wr-neon">
              <feGaussianBlur stdDeviation="0.5" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>
          {WORKSTATIONS.map((ws, i) => {
            const agent = AGENT_NODES[i];
            if (!agent) return null;
            const state = getNodeState(agent.id);
            const isActive = state.status === 'working';
            const isConnected = state.status === 'connected';
            const sx = ws.x + 6;
            const sy = ws.row === 'top' ? ws.y + 18 : ws.y + 2;
            const cx = 50;
            const cy = 47;
            return (
              <g key={agent.id}>
                <line
                  x1={sx} y1={sy} x2={cx} y2={cy}
                  stroke={isActive ? agent.color : isConnected ? `${agent.color}60` : '#2d3a5c'}
                  strokeWidth={isActive ? '0.3' : '0.15'}
                  strokeDasharray={isActive ? 'none' : '1 2'}
                  opacity={isActive ? 0.8 : 0.5}
                  filter={isActive ? 'url(#wr-neon)' : undefined}
                />
                {isActive && (
                  <>
                    <circle r="0.7" fill={agent.color} opacity="0.9" filter="url(#wr-neon)">
                      <animateMotion
                        dur={`${2 + i * 0.3}s`}
                        repeatCount="indefinite"
                        path={`M${sx},${sy} L${cx},${cy}`}
                      />
                    </circle>
                    <circle r="0.5" fill="#fff" opacity="0.6">
                      <animateMotion
                        dur={`${3 + i * 0.2}s`}
                        repeatCount="indefinite"
                        path={`M${cx},${cy} L${sx},${sy}`}
                      />
                    </circle>
                  </>
                )}
              </g>
            );
          })}
        </svg>

        {/* ── Central Opie Boss Avatar ─────────────────────── */}
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 10,
          display: 'flex', flexDirection: 'column', alignItems: 'center',
        }}>
          {/* Thought bubbles — visible when thinking */}
          {opieState === 'thinking' && (
            <div style={{ position: 'absolute', top: '-40px', left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: '6px', pointerEvents: 'none' }}>
              {[0, 1, 2].map(i => (
                <div key={i} style={{
                  width: `${6 + i * 2}px`, height: `${6 + i * 2}px`,
                  borderRadius: '50%',
                  background: 'rgba(168,85,247,0.6)',
                  boxShadow: '0 0 8px rgba(168,85,247,0.5)',
                  animation: `wr-thought-bubble 1.5s ease-in-out infinite`,
                  animationDelay: `${i * 0.25}s`,
                }} />
              ))}
            </div>
          )}

          {/* Pulse rings — active when thinking or working */}
          {opieActive && (
            <>
              <div style={{
                position: 'absolute', top: '50%', left: '50%',
                width: '140px', height: '140px',
                border: `1px solid ${opieState === 'thinking' ? 'rgba(168,85,247,0.3)' : 'rgba(6,182,212,0.25)'}`,
                borderRadius: '50%',
                animation: `wr-ring ${opieState === 'thinking' ? '2s' : '3s'} ease-out infinite`,
                pointerEvents: 'none',
              }} />
              <div style={{
                position: 'absolute', top: '50%', left: '50%',
                width: '140px', height: '140px',
                border: `1px solid ${opieState === 'thinking' ? 'rgba(168,85,247,0.15)' : 'rgba(6,182,212,0.15)'}`,
                borderRadius: '50%',
                animation: `wr-ring ${opieState === 'thinking' ? '2s' : '3s'} ease-out infinite 1s`,
                pointerEvents: 'none',
              }} />
            </>
          )}

          {/* Platform / glow disc under Opie */}
          <div style={{
            position: 'absolute', bottom: '-12px', left: '50%', transform: 'translateX(-50%)',
            width: '80px', height: '20px',
            background: opieState === 'thinking'
              ? 'radial-gradient(ellipse, rgba(168,85,247,0.35), transparent 70%)'
              : opieState === 'working'
                ? 'radial-gradient(ellipse, rgba(6,182,212,0.35), transparent 70%)'
                : 'radial-gradient(ellipse, rgba(6,182,212,0.12), transparent 70%)',
            filter: 'blur(3px)', pointerEvents: 'none', transition: 'all 0.4s ease',
          }} />

          {/* The Opie Bot — large boss avatar */}
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0px',
            animation: opieState === 'thinking' ? 'wr-opie-think 1.2s ease-in-out infinite'
              : opieState === 'working' ? 'wr-bot-type 0.5s ease-in-out infinite'
              : 'wr-bot-breathe 3s ease-in-out infinite',
            position: 'relative',
          }}>
            {/* Dual antennas — boss distinction */}
            <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-end' }}>
              {/* Left antenna */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{
                  width: '5px', height: '5px', borderRadius: '50%',
                  background: opieState === 'thinking' ? '#a855f7' : opieState === 'working' ? '#06b6d4' : '#06b6d488',
                  boxShadow: opieState === 'thinking' ? '0 0 8px #a855f7, 0 0 16px #a855f780' : opieActive ? '0 0 8px #06b6d4, 0 0 14px #06b6d460' : '0 0 3px #06b6d444',
                  animation: opieState === 'thinking' ? 'wr-eye-glow 0.5s ease-in-out infinite' : opieActive ? 'wr-eye-glow 1s ease-in-out infinite' : 'none',
                }} />
                <div style={{
                  width: '2px', height: '8px',
                  background: opieState === 'thinking' ? '#a855f780' : opieActive ? '#06b6d480' : '#06b6d440',
                  animation: opieActive ? 'wr-antenna-bob 0.8s ease-in-out infinite' : 'none',
                  transformOrigin: 'bottom center',
                }} />
              </div>
              {/* Right antenna */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{
                  width: '5px', height: '5px', borderRadius: '50%',
                  background: opieState === 'thinking' ? '#a855f7' : opieState === 'working' ? '#06b6d4' : '#06b6d488',
                  boxShadow: opieState === 'thinking' ? '0 0 8px #a855f7, 0 0 16px #a855f780' : opieActive ? '0 0 8px #06b6d4, 0 0 14px #06b6d460' : '0 0 3px #06b6d444',
                  animation: opieState === 'thinking' ? 'wr-eye-glow 0.5s ease-in-out infinite 0.25s' : opieActive ? 'wr-eye-glow 1s ease-in-out infinite 0.5s' : 'none',
                }} />
                <div style={{
                  width: '2px', height: '8px',
                  background: opieState === 'thinking' ? '#a855f780' : opieActive ? '#06b6d480' : '#06b6d440',
                  animation: opieActive ? 'wr-antenna-bob 0.8s ease-in-out infinite 0.4s' : 'none',
                  transformOrigin: 'bottom center',
                }} />
              </div>
            </div>

            {/* Head — large rounded rectangle with eyes */}
            <div style={{
              width: '42px', height: '28px',
              background: opieState === 'thinking'
                ? 'linear-gradient(180deg, #a855f7cc, #7c3aedaa)'
                : opieActive
                  ? 'linear-gradient(180deg, #06b6d4cc, #0891b2aa)'
                  : 'linear-gradient(180deg, #06b6d477, #0891b255)',
              borderRadius: '8px 8px 5px 5px',
              border: `2px solid ${opieState === 'thinking' ? '#a855f7' : opieActive ? '#06b6d4' : '#06b6d455'}`,
              position: 'relative',
              boxShadow: opieState === 'thinking' ? '0 0 16px #a855f750, 0 0 30px #a855f725'
                : opieActive ? '0 0 14px #06b6d450, 0 0 28px #06b6d420' : '0 0 6px rgba(0,0,0,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
              transition: 'all 0.4s ease',
            }}>
              {/* Left eye */}
              <div style={{
                width: '7px', height: '7px', borderRadius: '50%',
                background: opieState === 'thinking' ? '#e9d5ff' : opieActive ? '#cffafe' : '#06b6d488',
                boxShadow: opieState === 'thinking' ? '0 0 8px #a855f7, 0 0 14px #a855f770'
                  : opieActive ? '0 0 6px #06b6d4, 0 0 12px #06b6d460' : '0 0 2px #06b6d444',
                animation: opieState === 'thinking' ? 'wr-eye-glow 0.6s ease-in-out infinite' : 'none',
              }} />
              {/* Right eye */}
              <div style={{
                width: '7px', height: '7px', borderRadius: '50%',
                background: opieState === 'thinking' ? '#e9d5ff' : opieActive ? '#cffafe' : '#06b6d488',
                boxShadow: opieState === 'thinking' ? '0 0 8px #a855f7, 0 0 14px #a855f770'
                  : opieActive ? '0 0 6px #06b6d4, 0 0 12px #06b6d460' : '0 0 2px #06b6d444',
                animation: opieState === 'thinking' ? 'wr-eye-glow 0.6s ease-in-out infinite 0.3s' : 'none',
              }} />
              {/* Visor bar */}
              <div style={{
                position: 'absolute', top: '10px', left: '5px', right: '5px', height: '2px',
                background: opieState === 'thinking' ? '#a855f740' : opieActive ? '#06b6d440' : '#06b6d418',
                borderRadius: '1px',
              }} />
            </div>

            {/* Neck */}
            <div style={{
              width: '10px', height: '3px',
              background: opieState === 'thinking' ? '#a855f7aa' : opieActive ? '#06b6d4aa' : '#06b6d455',
            }} />

            {/* Body — with OPIE text, chest panel, arms */}
            <div style={{
              width: '38px', height: '30px',
              background: opieState === 'thinking'
                ? 'linear-gradient(180deg, #a855f740, #7c3aed25)'
                : opieActive
                  ? 'linear-gradient(180deg, #06b6d440, #0891b225)'
                  : 'linear-gradient(180deg, #06b6d420, #0891b210)',
              borderRadius: '5px 5px 3px 3px',
              border: `1.5px solid ${opieState === 'thinking' ? '#a855f760' : opieActive ? '#06b6d460' : '#06b6d430'}`,
              position: 'relative',
              boxShadow: opieActive ? `0 0 10px ${opieState === 'thinking' ? '#a855f720' : '#06b6d420'}` : 'none',
              transition: 'all 0.4s ease',
            }}>
              {/* Chest panel with OPIE text */}
              <div style={{
                position: 'absolute', top: '4px', left: '50%', transform: 'translateX(-50%)',
                width: '22px', height: '10px', borderRadius: '2px',
                background: opieState === 'thinking' ? '#a855f730' : opieActive ? '#06b6d430' : '#06b6d415',
                border: `0.5px solid ${opieState === 'thinking' ? '#a855f750' : opieActive ? '#06b6d450' : '#06b6d425'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <span style={{
                  fontSize: '5px', fontWeight: 900, letterSpacing: '0.15em',
                  color: opieState === 'thinking' ? '#e9d5ff' : opieActive ? '#cffafe' : '#06b6d488',
                  textShadow: opieActive ? `0 0 4px ${opieState === 'thinking' ? '#a855f7' : '#06b6d4'}` : 'none',
                }}>
                  OPIE
                </span>
              </div>

              {/* Chest light */}
              <div style={{
                position: 'absolute', top: '18px', left: '50%', transform: 'translateX(-50%)',
                width: '5px', height: '5px', borderRadius: '50%',
                background: opieState === 'thinking' ? '#a855f7' : opieActive ? '#06b6d4' : '#06b6d444',
                boxShadow: opieState === 'thinking' ? '0 0 6px #a855f7, 0 0 12px #a855f750'
                  : opieActive ? '0 0 5px #06b6d4, 0 0 10px #06b6d450' : 'none',
                animation: opieActive ? 'wr-eye-glow 1.5s ease-in-out infinite' : 'none',
              }} />

              {/* Left arm */}
              <div style={{
                position: 'absolute', top: '4px', left: '-7px',
                width: '6px', height: '16px', borderRadius: '3px',
                background: opieState === 'thinking' ? '#a855f7aa' : opieActive ? '#06b6d4aa' : '#06b6d444',
                transformOrigin: 'top center',
                animation: opieState === 'working' ? 'wr-arm-type-l 0.4s ease-in-out infinite' : 'none',
              }} />
              {/* Right arm */}
              <div style={{
                position: 'absolute', top: '4px', right: '-7px',
                width: '6px', height: '16px', borderRadius: '3px',
                background: opieState === 'thinking' ? '#a855f7aa' : opieActive ? '#06b6d4aa' : '#06b6d444',
                transformOrigin: 'top center',
                animation: opieState === 'working' ? 'wr-arm-type-r 0.4s ease-in-out infinite' : 'none',
              }} />
            </div>

            {/* Feet */}
            <div style={{ display: 'flex', gap: '8px', marginTop: '1px' }}>
              <div style={{
                width: '10px', height: '5px', borderRadius: '2px 2px 3px 3px',
                background: opieState === 'thinking' ? '#a855f7aa' : opieActive ? '#06b6d4aa' : '#06b6d455',
              }} />
              <div style={{
                width: '10px', height: '5px', borderRadius: '2px 2px 3px 3px',
                background: opieState === 'thinking' ? '#a855f7aa' : opieActive ? '#06b6d4aa' : '#06b6d455',
              }} />
            </div>

            {/* Agent count badge */}
            {workingCount > 0 && (
              <div style={{
                position: 'absolute', top: '-4px', right: '-10px',
                width: '22px', height: '22px', borderRadius: '11px',
                background: 'linear-gradient(135deg, #facc15, #f97316)',
                color: '#000', fontSize: '0.65rem', fontWeight: 800,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 0 12px rgba(250,204,21,0.7)',
                zIndex: 20,
              }}>
                {workingCount}
              </div>
            )}
          </div>

          {/* Status label below Opie */}
          <div style={{
            marginTop: '6px',
            fontSize: '0.55rem', fontWeight: 700,
            letterSpacing: '0.2em', textTransform: 'uppercase',
            color: opieState === 'thinking' ? '#c084fc' : opieState === 'working' ? '#22d3ee' : '#06b6d488',
            textShadow: opieActive ? `0 0 8px ${opieState === 'thinking' ? '#a855f770' : '#06b6d470'}` : 'none',
            transition: 'all 0.3s ease',
            display: 'flex', alignItems: 'center', gap: '4px',
          }}>
            {opieState === 'thinking' && (
              <span style={{ display: 'flex', gap: '2px' }}>
                {[0, 1, 2].map(j => (
                  <span key={j} style={{
                    width: '3px', height: '3px', borderRadius: '50%',
                    background: '#c084fc', display: 'inline-block',
                    animation: 'wr-typedot 0.8s ease-in-out infinite',
                    animationDelay: `${j * 0.15}s`,
                  }} />
                ))}
              </span>
            )}
            {opieState === 'thinking' ? 'THINKING' : opieState === 'working' ? 'WORKING' : 'IDLE'}
            {opieState === 'working' && (
              <span style={{ display: 'flex', gap: '2px' }}>
                {[0, 1, 2].map(j => (
                  <span key={j} style={{
                    width: '3px', height: '3px', borderRadius: '50%',
                    background: '#22d3ee', display: 'inline-block',
                    animation: 'wr-typedot 0.8s ease-in-out infinite',
                    animationDelay: `${j * 0.15}s`,
                  }} />
                ))}
              </span>
            )}
          </div>
        </div>

        {/* ── Agent Workstations ───────────────────────────── */}
        {WORKSTATIONS.map((ws, i) => {
          const agent = AGENT_NODES[i];
          if (!agent) return null;
          const state = getNodeState(agent.id);
          const isActive = state.status === 'working';
          const isConnected = state.status === 'connected';
          const isHovered = hoveredAgent === agent.id;
          const isSelected = selectedAgent?.id === agent.id;
          const facingDown = ws.row === 'top';

          return (
            <div
              key={agent.id}
              onClick={() => handleAgentClick(agent.id)}
              onMouseEnter={() => setHoveredAgent(agent.id)}
              onMouseLeave={() => setHoveredAgent(null)}
              style={{
                position: 'absolute',
                left: `${ws.x}%`,
                top: `${ws.y}%`,
                width: '88px',
                cursor: 'pointer',
                zIndex: isHovered || isSelected ? 15 : 5,
                transition: 'transform 0.2s ease',
                transform: isHovered ? 'scale(1.05)' : 'scale(1)',
              }}
            >
              {/* Light pool on the "floor" under active stations */}
              {isActive && (
                <div style={{
                  position: 'absolute',
                  top: facingDown ? '85%' : '-25%',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: '110px', height: '50px',
                  background: `radial-gradient(ellipse, ${agent.color}35 0%, transparent 70%)`,
                  pointerEvents: 'none',
                  filter: 'blur(6px)',
                }} />
              )}

              {/* Speech bubble for current task */}
              {isActive && state.currentTask && (
                <div style={{
                  position: 'absolute',
                  bottom: '105%',
                  left: '50%', transform: 'translateX(-50%)',
                  marginBottom: '4px',
                  background: 'rgba(15,20,35,0.95)',
                  border: `1px solid ${agent.color}50`,
                  borderRadius: '6px',
                  padding: '3px 7px',
                  maxWidth: '120px',
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  fontSize: '0.5rem', color: 'rgba(255,255,255,0.85)',
                  zIndex: 25, pointerEvents: 'none',
                  animation: 'wr-fadeIn 0.3s ease',
                }}>
                  {state.currentTask.slice(0, 35)}
                </div>
              )}

              {/* ── The Workstation Assembly ─── */}
              <div style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                gap: '0px',
              }}>

                {/* Bot avatar (sits BEHIND desk if top row) */}
                {facingDown && <BotAvatar agent={agent} isActive={isActive} isConnected={isConnected} />}

                {/* Monitor */}
                <div style={{
                  width: '48px', height: '32px',
                  background: isActive
                    ? `linear-gradient(180deg, ${agent.color}25 0%, #1a1a30 100%)`
                    : '#1a1a30',
                  border: `2px solid ${isActive ? agent.color : isConnected ? '#3a5070' : '#2a2a4a'}`,
                  borderRadius: '3px 3px 0 0',
                  position: 'relative',
                  overflow: 'hidden',
                  boxShadow: isActive
                    ? `0 0 18px ${agent.color}50, 0 0 35px ${agent.color}20, inset 0 0 10px ${agent.color}25`
                    : isHovered ? `0 0 8px rgba(6,182,212,0.15)` : `0 0 4px rgba(0,0,0,0.3)`,
                  transition: 'all 0.3s ease',
                  animation: isActive ? 'wr-screen-flicker 4s ease-in-out infinite' : 'none',
                  zIndex: 2,
                }}>
                  {/* Emoji on the screen */}
                  <div style={{
                    position: 'absolute', top: '50%', left: '50%',
                    transform: 'translate(-50%, -50%)',
                    fontSize: '14px',
                    opacity: isActive ? 1 : isConnected ? 0.7 : 0.4,
                    filter: isActive ? `drop-shadow(0 0 5px ${agent.color})` : 'none',
                    transition: 'all 0.3s ease',
                  }}>
                    {agent.emoji}
                  </div>

                  {/* Scrolling code lines on active monitors */}
                  {isActive && (
                    <div style={{
                      position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                      overflow: 'hidden', opacity: 0.3,
                    }}>
                      {[0, 1, 2, 3, 4, 5].map(j => (
                        <div key={j} style={{
                          height: '2px',
                          marginTop: `${3 + j * 4}px`,
                          marginLeft: `${3 + (j % 3) * 4}px`,
                          width: `${15 + (j * 7) % 20}px`,
                          background: agent.color,
                          borderRadius: '1px',
                          animation: `wr-code-scroll 2s linear infinite`,
                          animationDelay: `${j * 0.3}s`,
                          opacity: 0.7,
                        }} />
                      ))}
                    </div>
                  )}

                  {/* Screen glow reflection at top */}
                  {isActive && (
                    <div style={{
                      position: 'absolute', top: 0, left: 0, right: 0, height: '6px',
                      background: `linear-gradient(180deg, ${agent.color}30, transparent)`,
                    }} />
                  )}
                </div>

                {/* Monitor stand */}
                <div style={{
                  width: '6px', height: '5px',
                  background: isActive ? '#3a5070' : '#2a2a4a',
                  zIndex: 2,
                }} />

                {/* Monitor base */}
                <div style={{
                  width: '18px', height: '3px',
                  background: isActive ? '#3a5070' : '#2a2a4a',
                  borderRadius: '0 0 2px 2px',
                  zIndex: 2,
                }} />

                {/* Desk surface */}
                <div style={{
                  width: '72px', height: '10px',
                  marginTop: '-1px',
                  background: isActive
                    ? `linear-gradient(180deg, #253545, #1e2e3e)`
                    : 'linear-gradient(180deg, #1e2235, #181c2e)',
                  borderRadius: '2px',
                  border: `1px solid ${isActive ? '#3a5070' : '#2a2a4a'}`,
                  boxShadow: isActive
                    ? `0 4px 14px rgba(0,0,0,0.4), 0 0 10px ${agent.color}15`
                    : '0 2px 8px rgba(0,0,0,0.25)',
                  position: 'relative',
                  zIndex: 1,
                }}>
                  <div style={{
                    position: 'absolute', top: 0, left: '10%', right: '10%', height: '1px',
                    background: isActive ? `${agent.color}40` : 'rgba(255,255,255,0.06)',
                  }} />
                </div>

                {/* Desk legs */}
                <div style={{ display: 'flex', justifyContent: 'space-between', width: '64px' }}>
                  <div style={{ width: '3px', height: '8px', background: '#1e2235', borderRadius: '0 0 1px 1px' }} />
                  <div style={{ width: '3px', height: '8px', background: '#1e2235', borderRadius: '0 0 1px 1px' }} />
                </div>

                {/* Bot avatar (IN FRONT of desk if bottom row) */}
                {!facingDown && <BotAvatar agent={agent} isActive={isActive} isConnected={isConnected} />}

                {/* Name plate */}
                <div style={{
                  marginTop: '3px',
                  fontSize: '0.55rem',
                  fontWeight: 600,
                  color: isActive ? agent.color : isConnected ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.4)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  textAlign: 'center',
                  transition: 'color 0.3s ease',
                  textShadow: isActive ? `0 0 10px ${agent.color}70` : 'none',
                }}>
                  {agent.name}
                </div>

                {/* Status indicator */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '3px',
                  marginTop: '1px',
                }}>
                  <div style={{
                    width: '4px', height: '4px', borderRadius: '50%',
                    background: isActive ? '#facc15' : isConnected ? '#22c55e' : '#556',
                    boxShadow: isActive ? '0 0 5px #facc15' : isConnected ? '0 0 5px #22c55e' : 'none',
                    animation: isActive ? 'wr-blink 1s ease-in-out infinite' : 'none',
                  }} />
                  <span style={{
                    fontSize: '0.45rem', fontWeight: 600,
                    color: isActive ? '#facc15' : isConnected ? '#22c55e' : '#556',
                  }}>
                    {isActive ? 'WORKING' : isConnected ? 'READY' : 'IDLE'}
                  </span>
                  {isActive && (
                    <span style={{ display: 'flex', gap: '1.5px', marginLeft: '2px' }}>
                      {[0, 1, 2].map(j => (
                        <span key={j} style={{
                          width: '2px', height: '2px', borderRadius: '50%',
                          background: '#facc15', display: 'inline-block',
                          animation: 'wr-typedot 0.8s ease-in-out infinite',
                          animationDelay: `${j * 0.12}s`,
                        }} />
                      ))}
                    </span>
                  )}
                </div>

                {/* Session count badge */}
                {state.activeSessions > 1 && (
                  <div style={{
                    position: 'absolute', top: '-2px', right: '8px',
                    width: '14px', height: '14px', borderRadius: '7px',
                    background: `linear-gradient(135deg, ${agent.color}, #764ba2)`,
                    color: '#fff', fontSize: '0.5rem', fontWeight: 700,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: `0 0 6px ${agent.color}60`,
                    zIndex: 20,
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
        <div style={{
          padding: '7px 14px', borderTop: '1px solid #2d3a5c',
          background: 'rgba(0,0,0,0.25)', overflow: 'hidden', position: 'relative', zIndex: 10,
        }}>
          <div style={{
            display: 'flex', gap: '28px', whiteSpace: 'nowrap',
            animation: 'wr-ticker 25s linear infinite',
          }}>
            {activityLogRef.current.slice(0, 4).map((item, i) => (
              <span key={i} style={{
                display: 'inline-flex', alignItems: 'center', gap: '5px',
                color: 'rgba(255,255,255,0.6)', fontSize: '0.6rem', fontWeight: 500,
              }}>
                <span>{item.emoji}</span>
                <span>{item.text.slice(0, 45)}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ── Selected Agent Detail Panel ──────────────────── */}
      {selectedAgent && (
        <div style={{
          position: 'absolute', bottom: '50px', left: '50%', transform: 'translateX(-50%)',
          width: 'calc(100% - 32px)', maxWidth: '320px',
          background: 'rgba(17,24,39,0.97)', backdropFilter: 'blur(16px)',
          borderRadius: '10px', border: '1px solid #2d3a5c',
          padding: '12px', zIndex: 30,
          boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
          animation: 'wr-fadeIn 0.2s ease-out',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
            <div style={{
              width: '36px', height: '26px', borderRadius: '3px',
              background: `${selectedAgent.color || '#06b6d4'}20`,
              border: `1.5px solid ${selectedAgent.color || '#06b6d4'}50`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span style={{ fontSize: '16px' }}>{selectedAgent.emoji}</span>
            </div>
            <div style={{ flex: 1 }}>
              <h3 style={{ color: '#f1f5f9', fontSize: '0.85rem', fontWeight: 700, margin: 0, letterSpacing: '0.02em' }}>
                {selectedAgent.name} Agent
              </h3>
              <div style={{
                fontSize: '0.65rem', fontWeight: 600, marginTop: '1px',
                color: selectedAgent.status === 'working' ? '#facc15' : selectedAgent.status === 'connected' ? '#22c55e' : '#778',
              }}>
                {selectedAgent.status === 'working' ? 'WORKING' : selectedAgent.status === 'connected' ? 'CONNECTED' : 'IDLE'}
              </div>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); setSelectedAgent(null); }}
              style={{
                width: '24px', height: '24px', borderRadius: '4px',
                border: '1px solid #2d3a5c', background: 'rgba(255,255,255,0.05)',
                color: '#889', fontSize: '12px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              x
            </button>
          </div>
          {selectedAgent.currentTask && (
            <div style={{
              background: 'rgba(255,255,255,0.04)', borderRadius: '6px',
              padding: '8px', marginBottom: '8px', border: '1px solid #2d3a5c',
            }}>
              <div style={{ color: '#889', fontSize: '0.5rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '2px' }}>
                Current Task
              </div>
              <div style={{ color: '#f1f5f9', fontSize: '0.75rem', fontWeight: 500 }}>{selectedAgent.currentTask}</div>
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
            <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '6px', padding: '8px', textAlign: 'center', border: '1px solid #2d3a5c' }}>
              <span style={{ display: 'block', color: '#f1f5f9', fontSize: '0.95rem', fontWeight: 700 }}>{selectedAgent.activeSessions}</span>
              <span style={{ color: '#889', fontSize: '0.5rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Sessions</span>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '6px', padding: '8px', textAlign: 'center', border: '1px solid #2d3a5c' }}>
              <span style={{ display: 'block', color: '#f1f5f9', fontSize: '0.95rem', fontWeight: 700 }}>
                {selectedAgent.lastActivity && mounted
                  ? new Date(selectedAgent.lastActivity).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
                  : '--:--'}
              </span>
              <span style={{ color: '#889', fontSize: '0.5rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Last Active</span>
            </div>
          </div>
        </div>
      )}

      {/* ── Footer ──────────────────────────────────────────── */}
      <div style={{
        padding: '10px 16px', borderTop: '1px solid #2d3a5c',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        background: 'rgba(0,0,0,0.2)', position: 'relative', zIndex: 10,
      }}>
        <div style={{ display: 'flex', gap: '12px' }}>
          {[
            { label: 'Working', color: '#facc15' },
            { label: 'Ready', color: '#22c55e' },
            { label: 'Idle', color: '#556' },
          ].map(l => (
            <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: l.color, boxShadow: l.color !== '#556' ? `0 0 4px ${l.color}` : 'none' }} />
              <span style={{ color: '#889', fontSize: '0.55rem', fontWeight: 500 }}>{l.label}</span>
            </div>
          ))}
        </div>
        <div style={{ color: '#778', fontSize: '0.55rem', fontWeight: 500 }}>
          {!gatewayConnected && !loading && (
            <span style={{ color: '#f59e0b', marginRight: '6px' }}>OFFLINE</span>
          )}
          {connectionType === 'sse' && (
            <span style={{ color: '#22c55e', marginRight: '4px' }}>&#9889;</span>
          )}
          {lastUpdated && mounted ? (
            <>Synced {new Date(lastUpdated).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</>
          ) : loading ? 'Connecting...' : 'Not connected'}
          {source === 'cache' && ' (cached)'}
        </div>
      </div>

      {/* Error Banner */}
      {error && !gatewayConnected && (
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          padding: '6px 14px', background: 'rgba(239,68,68,0.12)',
          borderTop: '1px solid rgba(239,68,68,0.3)',
          color: '#f59e0b', fontSize: '0.6rem', fontWeight: 500,
          display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center',
          zIndex: 100,
        }}>
          <span>&#9888;</span>
          <span>Gateway unavailable — {source === 'cache' ? 'showing cached data' : 'no data available'}</span>
        </div>
      )}

      {/* ── CSS Animations ──────────────────────────────────── */}
      <style>{`
        @keyframes wr-grid-scroll {
          0% { transform: rotateX(65deg) translateY(0); }
          100% { transform: rotateX(65deg) translateY(40px); }
        }
        @keyframes wr-scanline {
          0% { top: -2px; }
          100% { top: 100%; }
        }
        @keyframes wr-pulse {
          0%, 100% { opacity: 0.6; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.2); }
        }
        @keyframes wr-blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
        @keyframes wr-ring {
          0% { transform: translate(-50%, -50%) scale(0.5); opacity: 0.4; }
          100% { transform: translate(-50%, -50%) scale(1.5); opacity: 0; }
        }
        @keyframes wr-screen-flicker {
          0%, 92%, 100% { opacity: 1; }
          93% { opacity: 0.7; }
          94% { opacity: 1; }
          95% { opacity: 0.5; }
          96% { opacity: 1; }
        }
        @keyframes wr-bot-type {
          0%, 100% { transform: translateY(0); }
          25% { transform: translateY(-1.5px); }
          50% { transform: translateY(0); }
          75% { transform: translateY(-1px); }
        }
        @keyframes wr-bot-breathe {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.02) translateY(-0.5px); }
        }
        @keyframes wr-antenna-bob {
          0%, 100% { transform: scaleY(1); }
          50% { transform: scaleY(0.85); }
        }
        @keyframes wr-eye-glow {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }
        @keyframes wr-arm-type-l {
          0%, 100% { transform: rotate(0deg) translateY(0); }
          25% { transform: rotate(-8deg) translateY(-2px); }
          75% { transform: rotate(3deg) translateY(-1px); }
        }
        @keyframes wr-arm-type-r {
          0%, 100% { transform: rotate(0deg) translateY(0); }
          40% { transform: rotate(6deg) translateY(-2px); }
          80% { transform: rotate(-4deg) translateY(-1px); }
        }
        @keyframes wr-typedot {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.3; }
          40% { transform: translateY(-3px); opacity: 1; }
        }
        @keyframes wr-code-scroll {
          0% { opacity: 0; transform: translateX(-5px); }
          20% { opacity: 0.6; }
          80% { opacity: 0.6; }
          100% { opacity: 0; transform: translateX(5px); }
        }
        @keyframes wr-fadeIn {
          from { opacity: 0; transform: translateX(-50%) translateY(6px); }
          to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
        @keyframes wr-ticker {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes wr-opie-think {
          0%, 100% { transform: translateY(0); filter: brightness(1); }
          30% { transform: translateY(-2px); filter: brightness(1.15); }
          60% { transform: translateY(0px); filter: brightness(0.95); }
          80% { transform: translateY(-1px); filter: brightness(1.1); }
        }
        @keyframes wr-thought-bubble {
          0% { transform: translateY(0) scale(0.7); opacity: 0.3; }
          50% { transform: translateY(-12px) scale(1); opacity: 0.9; }
          100% { transform: translateY(-22px) scale(0.5); opacity: 0; }
        }
      `}</style>
    </div>
  );
}

// ─── Bot Avatar Component — recognizable little robot ────────────
function BotAvatar({ agent, isActive, isConnected }: {
  agent: typeof AGENT_NODES[0];
  isActive: boolean;
  isConnected: boolean;
}) {
  // Each bot always tinted with its agent color — active is bright, idle is dimmed
  const mainColor = isActive ? agent.color : isConnected ? `${agent.color}bb` : `${agent.color}77`;
  const eyeColor = isActive ? agent.color : isConnected ? `${agent.color}cc` : `${agent.color}88`;
  const bodyBg = isActive
    ? `linear-gradient(180deg, ${agent.color}50, ${agent.color}30)`
    : isConnected
      ? `linear-gradient(180deg, ${agent.color}35, ${agent.color}20)`
      : `linear-gradient(180deg, ${agent.color}25, ${agent.color}15)`;
  const opacity = isActive ? 1 : isConnected ? 0.9 : 0.75;

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      gap: '0px', opacity, transition: 'opacity 0.3s ease',
      animation: isActive ? 'wr-bot-type 0.5s ease-in-out infinite' : 'wr-bot-breathe 3s ease-in-out infinite',
      marginBottom: '2px', marginTop: '2px',
    }}>
      {/* Antenna */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        {/* Antenna tip — glowing dot */}
        <div style={{
          width: '4px', height: '4px', borderRadius: '50%',
          background: isActive ? agent.color : `${agent.color}88`,
          boxShadow: isActive ? `0 0 6px ${agent.color}, 0 0 12px ${agent.color}60` : `0 0 2px ${agent.color}44`,
          animation: isActive ? 'wr-eye-glow 1s ease-in-out infinite' : 'none',
        }} />
        {/* Antenna stem */}
        <div style={{
          width: '2px', height: '5px',
          background: isActive ? `${agent.color}80` : `${agent.color}40`,
          animation: isActive ? 'wr-antenna-bob 0.8s ease-in-out infinite' : 'none',
          transformOrigin: 'bottom center',
        }} />
      </div>

      {/* Head — rounded rectangle with eyes */}
      <div style={{
        width: '22px', height: '16px',
        background: `linear-gradient(180deg, ${mainColor}, ${mainColor}bb)`,
        borderRadius: '5px 5px 3px 3px',
        border: `1.5px solid ${isActive ? agent.color : `${agent.color}55`}`,
        position: 'relative',
        boxShadow: isActive ? `0 0 8px ${agent.color}40` : '0 0 3px rgba(0,0,0,0.3)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px',
      }}>
        {/* Left eye */}
        <div style={{
          width: '4px', height: '4px', borderRadius: '50%',
          background: eyeColor,
          boxShadow: isActive ? `0 0 4px ${agent.color}, 0 0 8px ${agent.color}50` : `0 0 2px ${eyeColor}`,
          animation: isActive ? 'wr-eye-glow 1.5s ease-in-out infinite' : 'none',
        }} />
        {/* Right eye */}
        <div style={{
          width: '4px', height: '4px', borderRadius: '50%',
          background: eyeColor,
          boxShadow: isActive ? `0 0 4px ${agent.color}, 0 0 8px ${agent.color}50` : `0 0 2px ${eyeColor}`,
          animation: isActive ? 'wr-eye-glow 1.5s ease-in-out infinite 0.3s' : 'none',
        }} />
        {/* Visor line across eyes */}
        <div style={{
          position: 'absolute', top: '5px', left: '3px', right: '3px', height: '1px',
          background: isActive ? `${agent.color}40` : `${agent.color}18`,
        }} />
      </div>

      {/* Neck connector */}
      <div style={{ width: '6px', height: '2px', background: mainColor }} />

      {/* Body — with chest panel and arms */}
      <div style={{
        width: '20px', height: '16px',
        background: bodyBg,
        borderRadius: '3px 3px 2px 2px',
        border: `1px solid ${isActive ? `${agent.color}60` : `${agent.color}35`}`,
        position: 'relative',
        boxShadow: isActive ? `0 0 6px ${agent.color}25` : 'none',
      }}>
        {/* Chest panel */}
        <div style={{
          position: 'absolute', top: '3px', left: '50%', transform: 'translateX(-50%)',
          width: '8px', height: '4px', borderRadius: '1px',
          background: isActive ? `${agent.color}40` : `${agent.color}18`,
          border: `0.5px solid ${isActive ? `${agent.color}50` : `${agent.color}25`}`,
        }} />
        {/* Chest light dot */}
        <div style={{
          position: 'absolute', top: '9px', left: '50%', transform: 'translateX(-50%)',
          width: '3px', height: '3px', borderRadius: '50%',
          background: isActive ? agent.color : `${agent.color}44`,
          boxShadow: isActive ? `0 0 3px ${agent.color}` : 'none',
        }} />

        {/* Left arm */}
        <div style={{
          position: 'absolute', top: '2px', left: '-5px',
          width: '4px', height: '10px', borderRadius: '2px',
          background: `${mainColor}cc`,
          transformOrigin: 'top center',
          animation: isActive ? 'wr-arm-type-l 0.4s ease-in-out infinite' : 'none',
        }} />
        {/* Right arm */}
        <div style={{
          position: 'absolute', top: '2px', right: '-5px',
          width: '4px', height: '10px', borderRadius: '2px',
          background: `${mainColor}cc`,
          transformOrigin: 'top center',
          animation: isActive ? 'wr-arm-type-r 0.4s ease-in-out infinite' : 'none',
        }} />
      </div>

      {/* Feet */}
      <div style={{ display: 'flex', gap: '4px', marginTop: '1px' }}>
        <div style={{
          width: '6px', height: '3px', borderRadius: '1px 1px 2px 2px',
          background: mainColor,
        }} />
        <div style={{
          width: '6px', height: '3px', borderRadius: '1px 1px 2px 2px',
          background: mainColor,
        }} />
      </div>
    </div>
  );
}
