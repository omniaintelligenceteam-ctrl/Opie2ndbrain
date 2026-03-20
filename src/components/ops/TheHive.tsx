'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

/* ═══════════════════════════════════════════════════════════════
   THE HIVE — Living Agent Command Center
   Orbital cyberpunk war room with animated character portraits
   ═══════════════════════════════════════════════════════════════ */

type AgentStatus = 'active' | 'idle' | 'ready' | 'error' | 'completed';

interface Agent {
  id: string;
  name: string;
  role: string;
  emoji: string;
  ring: 'center' | 'inner' | 'outer';
  color: string;
  glowColor: string;
  status: AgentStatus;
  tasksToday: number;
  lastAction: string;
  model: string;
  silhouette: string; // SVG path character type
}

const AGENTS: Agent[] = [
  // CENTER
  { id: 'g', name: 'G', role: 'Orchestrator', emoji: '🧠', ring: 'center', color: '#a855f7', glowColor: '#c084fc', status: 'active', tasksToday: 42, lastAction: 'Delegating 2nd Brain rebuild', model: 'Claude Opus 4.6', silhouette: 'commander' },
  // INNER RING — Workers
  { id: 'opie', name: 'Opie', role: '2nd Brain', emoji: '🤖', ring: 'inner', color: '#06b6d4', glowColor: '#22d3ee', status: 'active', tasksToday: 8, lastAction: 'Building Calendar tab', model: 'Claude Opus 4.6', silhouette: 'tech' },
  { id: 'scout', name: 'Scout', role: 'Lead Gen', emoji: '🛰️', ring: 'inner', color: '#10b981', glowColor: '#34d399', status: 'ready', tasksToday: 14, lastAction: 'Extracted 23 qualified leads', model: 'Gemini 2.5 Flash', silhouette: 'recon' },
  { id: 'research', name: 'Research', role: 'Intelligence', emoji: '🔬', ring: 'inner', color: '#8b5cf6', glowColor: '#a78bfa', status: 'idle', tasksToday: 3, lastAction: 'Competitive analysis complete', model: 'Perplexity Sonar', silhouette: 'scientist' },
  { id: 'ops', name: 'Ops Guardian', role: 'Reliability', emoji: '🛡️', ring: 'inner', color: '#ef4444', glowColor: '#f87171', status: 'active', tasksToday: 47, lastAction: 'Cron health sweep', model: 'Gemini 2.5 Flash', silhouette: 'sentinel' },
  { id: 'memory', name: 'Memory Curator', role: 'Continuity', emoji: '📚', ring: 'inner', color: '#f59e0b', glowColor: '#fbbf24', status: 'ready', tasksToday: 6, lastAction: 'Daily recall validation', model: 'MiniMax M2.1', silhouette: 'keeper' },
  // OUTER RING — Executives
  { id: 'elon', name: 'Elon', role: 'CTO', emoji: '⚡', ring: 'outer', color: '#3b82f6', glowColor: '#60a5fa', status: 'idle', tasksToday: 2, lastAction: 'Architecture review', model: 'Claude Opus 4.6', silhouette: 'ironman' },
  { id: 'gary', name: 'Gary', role: 'CMO', emoji: '📢', ring: 'outer', color: '#f97316', glowColor: '#fb923c', status: 'idle', tasksToday: 1, lastAction: 'Content strategy memo', model: 'Claude Opus 4.6', silhouette: 'general' },
  { id: 'mark', name: 'Mark', role: 'CRO', emoji: '💰', ring: 'outer', color: '#eab308', glowColor: '#facc15', status: 'ready', tasksToday: 5, lastAction: 'Pipeline scoring update', model: 'Claude Opus 4.6', silhouette: 'hunter' },
  { id: 'ray', name: 'Ray', role: 'CFO', emoji: '💵', ring: 'outer', color: '#14b8a6', glowColor: '#2dd4bf', status: 'idle', tasksToday: 0, lastAction: 'Cost analysis pending', model: 'Claude Opus 4.6', silhouette: 'banker' },
  { id: 'tim', name: 'Tim', role: 'COO', emoji: '⚙️', ring: 'outer', color: '#6366f1', glowColor: '#818cf8', status: 'idle', tasksToday: 1, lastAction: 'Process optimization', model: 'Claude Opus 4.6', silhouette: 'engineer' },
  { id: 'steve', name: 'Steve', role: 'CPO', emoji: '🎯', ring: 'outer', color: '#ec4899', glowColor: '#f472b6', status: 'idle', tasksToday: 0, lastAction: 'Roadmap review queued', model: 'Claude Opus 4.6', silhouette: 'sniper' },
  { id: 'pepper', name: 'Pepper', role: 'Chief of Staff', emoji: '🌶️', ring: 'outer', color: '#e11d48', glowColor: '#fb7185', status: 'ready', tasksToday: 3, lastAction: 'Coordinating sprints', model: 'Claude Opus 4.6', silhouette: 'commander2' },
];

// Connection lines showing active delegations
const CONNECTIONS = [
  { from: 'g', to: 'opie', active: true },
  { from: 'g', to: 'scout', active: false },
  { from: 'g', to: 'ops', active: true },
  { from: 'g', to: 'memory', active: false },
  { from: 'g', to: 'research', active: false },
  { from: 'pepper', to: 'g', active: true },
];

const M = "'JetBrains Mono', 'Fira Code', monospace";

/* ── Character SVG Silhouettes ── */
function CharacterSVG({ type, color, glow, size, status }: { type: string; color: string; glow: string; size: number; status: AgentStatus }) {
  const pulseSpeed = status === 'active' ? '1.5s' : status === 'ready' ? '3s' : '5s';
  const opacity = status === 'idle' ? 0.4 : status === 'error' ? 0.8 : 1;

  // Each character has a unique detailed silhouette
  const getPath = () => {
    switch (type) {
      case 'commander': // G — Cyber samurai with neural crown
        return (
          <g>
            {/* Body armor */}
            <path d="M50 85 L35 65 L30 45 L35 30 L45 22 L50 18 L55 22 L65 30 L70 45 L65 65 Z" fill={color} opacity={0.3} />
            {/* Shoulder plates */}
            <path d="M28 42 L35 35 L38 45 L30 48 Z" fill={color} opacity={0.5} />
            <path d="M72 42 L65 35 L62 45 L70 48 Z" fill={color} opacity={0.5} />
            {/* Head */}
            <circle cx="50" cy="24" r="9" fill={color} opacity={0.4} />
            {/* Neural crown */}
            <path d="M41 18 L44 10 L47 15 L50 8 L53 15 L56 10 L59 18" fill="none" stroke={glow} strokeWidth="1.5" opacity={0.9}>
              <animate attributeName="opacity" values="0.5;1;0.5" dur={pulseSpeed} repeatCount="indefinite" />
            </path>
            {/* Eyes */}
            <line x1="46" y1="23" x2="48" y2="23" stroke={glow} strokeWidth="1.5" opacity={0.9} />
            <line x1="52" y1="23" x2="54" y2="23" stroke={glow} strokeWidth="1.5" opacity={0.9} />
            {/* Cape / data streams */}
            <path d="M35 45 L20 80 L30 75 L35 85" fill={color} opacity={0.15}>
              <animate attributeName="d" values="M35 45 L20 80 L30 75 L35 85;M35 45 L18 82 L28 77 L33 87;M35 45 L20 80 L30 75 L35 85" dur="4s" repeatCount="indefinite" />
            </path>
            <path d="M65 45 L80 80 L70 75 L65 85" fill={color} opacity={0.15}>
              <animate attributeName="d" values="M65 45 L80 80 L70 75 L65 85;M65 45 L82 82 L72 77 L67 87;M65 45 L80 80 L70 75 L65 85" dur="4s" repeatCount="indefinite" />
            </path>
          </g>
        );
      case 'recon': // Scout — Stealth operative with visor
        return (
          <g>
            <path d="M50 85 L38 65 L35 45 L40 32 L50 25 L60 32 L65 45 L62 65 Z" fill={color} opacity={0.25} />
            {/* Tactical visor */}
            <rect x="40" y="22" width="20" height="5" rx="2" fill={glow} opacity={0.7}>
              <animate attributeName="opacity" values="0.4;0.9;0.4" dur="2s" repeatCount="indefinite" />
            </rect>
            <circle cx="50" cy="27" r="8" fill={color} opacity={0.3} />
            {/* Hood */}
            <path d="M38 28 L42 16 L50 12 L58 16 L62 28" fill={color} opacity={0.4} />
            {/* Scanning beam */}
            <line x1="50" y1="27" x2="75" y2="50" stroke={glow} strokeWidth="0.5" opacity={0.4}>
              <animate attributeName="x2" values="75;25;75" dur="3s" repeatCount="indefinite" />
              <animate attributeName="y2" values="50;60;50" dur="3s" repeatCount="indefinite" />
            </line>
          </g>
        );
      case 'scientist': // Research — Mech suit scientist
        return (
          <g>
            <path d="M50 85 L36 62 L33 42 L38 30 L50 22 L62 30 L67 42 L64 62 Z" fill={color} opacity={0.25} />
            <circle cx="50" cy="25" r="8" fill={color} opacity={0.35} />
            {/* Goggles */}
            <circle cx="46" cy="24" r="3.5" fill="none" stroke={glow} strokeWidth="1" opacity={0.8} />
            <circle cx="54" cy="24" r="3.5" fill="none" stroke={glow} strokeWidth="1" opacity={0.8} />
            {/* Floating data */}
            <rect x="22" y="35" width="8" height="6" rx="1" fill={glow} opacity={0.3}>
              <animate attributeName="y" values="35;30;35" dur="3s" repeatCount="indefinite" />
            </rect>
            <rect x="70" y="40" width="8" height="6" rx="1" fill={glow} opacity={0.3}>
              <animate attributeName="y" values="40;45;40" dur="2.5s" repeatCount="indefinite" />
            </rect>
            <rect x="25" y="50" width="6" height="4" rx="1" fill={glow} opacity={0.2}>
              <animate attributeName="y" values="50;46;50" dur="2s" repeatCount="indefinite" />
            </rect>
          </g>
        );
      case 'sentinel': // Ops Guardian — Heavy armor tank
        return (
          <g>
            {/* Massive body */}
            <path d="M50 85 L30 65 L25 45 L32 30 L50 20 L68 30 L75 45 L70 65 Z" fill={color} opacity={0.3} />
            <circle cx="50" cy="24" r="9" fill={color} opacity={0.4} />
            {/* Helmet visor */}
            <path d="M42 23 L58 23" stroke={glow} strokeWidth="2" opacity={0.8} />
            {/* Shield */}
            <path d="M18 35 L25 30 L25 55 L18 50 Z" fill={glow} opacity={0.3}>
              <animate attributeName="opacity" values="0.2;0.5;0.2" dur={pulseSpeed} repeatCount="indefinite" />
            </path>
            {/* Shoulder armor */}
            <path d="M25 35 L32 28 L38 38 L28 42 Z" fill={color} opacity={0.5} />
            <path d="M75 35 L68 28 L62 38 L72 42 Z" fill={color} opacity={0.5} />
          </g>
        );
      case 'keeper': // Memory Curator — Floating sage
        return (
          <g>
            {/* Robes */}
            <path d="M50 85 L32 60 L35 35 L50 22 L65 35 L68 60 Z" fill={color} opacity={0.25} />
            <circle cx="50" cy="25" r="7" fill={color} opacity={0.35} />
            {/* Halo / data ring */}
            <ellipse cx="50" cy="18" rx="12" ry="3" fill="none" stroke={glow} strokeWidth="0.8" opacity={0.5}>
              <animate attributeName="ry" values="3;4;3" dur="3s" repeatCount="indefinite" />
            </ellipse>
            {/* Orbiting books */}
            <rect x="24" y="42" width="5" height="7" rx="1" fill={glow} opacity={0.4} transform="rotate(-15 26 45)">
              <animateTransform attributeName="transform" type="rotate" values="-15 50 45;15 50 45;-15 50 45" dur="6s" repeatCount="indefinite" />
            </rect>
            <rect x="71" y="42" width="5" height="7" rx="1" fill={glow} opacity={0.4} transform="rotate(15 73 45)">
              <animateTransform attributeName="transform" type="rotate" values="15 50 45;-15 50 45;15 50 45" dur="6s" repeatCount="indefinite" />
            </rect>
          </g>
        );
      case 'tech': // Opie — Sleek android
        return (
          <g>
            <path d="M50 85 L37 63 L34 42 L40 30 L50 22 L60 30 L66 42 L63 63 Z" fill={color} opacity={0.25} />
            <circle cx="50" cy="25" r="8" fill={color} opacity={0.35} />
            {/* Circuit lines on face */}
            <path d="M44 22 L44 28" stroke={glow} strokeWidth="0.8" opacity={0.6} />
            <path d="M56 22 L56 28" stroke={glow} strokeWidth="0.8" opacity={0.6} />
            <circle cx="50" cy="25" r="2" fill={glow} opacity={0.5}>
              <animate attributeName="r" values="1.5;2.5;1.5" dur="2s" repeatCount="indefinite" />
            </circle>
            {/* Antenna */}
            <line x1="50" y1="17" x2="50" y2="10" stroke={glow} strokeWidth="1" opacity={0.6} />
            <circle cx="50" cy="9" r="1.5" fill={glow} opacity={0.7}>
              <animate attributeName="opacity" values="0.3;1;0.3" dur="1s" repeatCount="indefinite" />
            </circle>
          </g>
        );
      default: // Generic executive — Suited figure with HUD
        return (
          <g>
            <path d="M50 85 L37 62 L35 42 L40 30 L50 22 L60 30 L65 42 L63 62 Z" fill={color} opacity={0.25} />
            <circle cx="50" cy="25" r="7.5" fill={color} opacity={0.35} />
            {/* HUD around head */}
            <path d="M39 20 L42 16 L58 16 L61 20" fill="none" stroke={glow} strokeWidth="0.8" opacity={0.5} />
            <line x1="45" y1="24" x2="48" y2="24" stroke={glow} strokeWidth="1.2" opacity={0.8} />
            <line x1="52" y1="24" x2="55" y2="24" stroke={glow} strokeWidth="1.2" opacity={0.8} />
          </g>
        );
    }
  };

  return (
    <svg width={size} height={size} viewBox="0 0 100 90" style={{ opacity, filter: `drop-shadow(0 0 ${status === 'active' ? 12 : 4}px ${glow})` }}>
      <defs>
        <radialGradient id={`glow-${type}`} cx="50%" cy="40%" r="50%">
          <stop offset="0%" stopColor={glow} stopOpacity={status === 'active' ? 0.3 : 0.1} />
          <stop offset="100%" stopColor={glow} stopOpacity={0} />
        </radialGradient>
      </defs>
      {/* Background glow */}
      <ellipse cx="50" cy="50" rx="45" ry="42" fill={`url(#glow-${type})`} />
      {getPath()}
    </svg>
  );
}

/* ── Main Component ── */
export default function TheHive() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredAgent, setHoveredAgent] = useState<string | null>(null);
  const [agents, setAgents] = useState(AGENTS);
  const [time, setTime] = useState(0);

  // Simulate activity changes in demo mode
  useEffect(() => {
    const interval = setInterval(() => {
      setTime((t) => t + 1);
      setAgents((prev) =>
        prev.map((a) => {
          // Randomly shift activity
          if (Math.random() < 0.05) {
            const statuses: AgentStatus[] = ['active', 'ready', 'idle'];
            const newStatus = a.id === 'g' ? 'active' : statuses[Math.floor(Math.random() * statuses.length)];
            return {
              ...a,
              status: newStatus,
              tasksToday: newStatus === 'active' ? a.tasksToday + 1 : a.tasksToday,
            };
          }
          return a;
        }),
      );
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  // Slow rotation
  useEffect(() => {
    const interval = setInterval(() => setTime((t) => t + 1), 50);
    return () => clearInterval(interval);
  }, []);

  const center = agents.find((a) => a.ring === 'center')!;
  const inner = agents.filter((a) => a.ring === 'inner');
  const outer = agents.filter((a) => a.ring === 'outer');

  const getPosition = useCallback(
    (ring: 'inner' | 'outer', index: number, total: number) => {
      const radius = ring === 'inner' ? 180 : 310;
      const rotation = (time * 0.02 * (ring === 'inner' ? 1 : -0.5)) % 360;
      const angle = (360 / total) * index + rotation - 90;
      const rad = (angle * Math.PI) / 180;
      return { x: Math.cos(rad) * radius, y: Math.sin(rad) * radius };
    },
    [time],
  );

  const statusLabel: Record<AgentStatus, { text: string; color: string }> = {
    active: { text: 'ACTIVE', color: '#22c55e' },
    ready: { text: 'READY', color: '#3b82f6' },
    idle: { text: 'IDLE', color: '#6b7280' },
    error: { text: 'ERROR', color: '#ef4444' },
    completed: { text: 'DONE', color: '#f59e0b' },
  };

  const hoveredData = hoveredAgent ? agents.find((a) => a.id === hoveredAgent) : null;

  return (
    <div ref={containerRef} style={s.container}>
      {/* Title */}
      <div style={s.title}>THE HIVE</div>
      <div style={s.subtitle}>Live Agent Activity · {agents.filter((a) => a.status === 'active').length} Active</div>

      {/* Stats bar */}
      <div style={s.statsBar}>
        <div style={s.stat}>
          <span style={{ ...s.statDot, background: '#22c55e' }} />
          <span>{agents.filter((a) => a.status === 'active').length} Active</span>
        </div>
        <div style={s.stat}>
          <span style={{ ...s.statDot, background: '#3b82f6' }} />
          <span>{agents.filter((a) => a.status === 'ready').length} Ready</span>
        </div>
        <div style={s.stat}>
          <span style={{ ...s.statDot, background: '#6b7280' }} />
          <span>{agents.filter((a) => a.status === 'idle').length} Idle</span>
        </div>
        <div style={s.stat}>
          <span style={s.statLabel}>Tasks Today:</span>
          <span style={s.statValue}>{agents.reduce((sum, a) => sum + a.tasksToday, 0)}</span>
        </div>
      </div>

      {/* Orbital field */}
      <div style={s.orbitalField}>
        {/* Connection lines */}
        <svg style={s.connectionSvg} viewBox="-400 -400 800 800">
          <defs>
            <linearGradient id="activeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#a855f7" stopOpacity={0.6} />
              <stop offset="50%" stopColor="#a855f7" stopOpacity={0.2} />
              <stop offset="100%" stopColor="#06b6d4" stopOpacity={0.6} />
            </linearGradient>
          </defs>
          {CONNECTIONS.map((conn) => {
            const fromAgent = agents.find((a) => a.id === conn.from);
            const toAgent = agents.find((a) => a.id === conn.to);
            if (!fromAgent || !toAgent) return null;

            let fx = 0, fy = 0, tx = 0, ty = 0;
            if (fromAgent.ring === 'center') { fx = 0; fy = 0; }
            else {
              const arr = fromAgent.ring === 'inner' ? inner : outer;
              const idx = arr.findIndex((a) => a.id === fromAgent.id);
              const pos = getPosition(fromAgent.ring as 'inner' | 'outer', idx, arr.length);
              fx = pos.x; fy = pos.y;
            }
            if (toAgent.ring === 'center') { tx = 0; ty = 0; }
            else {
              const arr = toAgent.ring === 'inner' ? inner : outer;
              const idx = arr.findIndex((a) => a.id === toAgent.id);
              const pos = getPosition(toAgent.ring as 'inner' | 'outer', idx, arr.length);
              tx = pos.x; ty = pos.y;
            }

            return (
              <g key={`${conn.from}-${conn.to}`}>
                <line x1={fx} y1={fy} x2={tx} y2={ty}
                  stroke={conn.active ? 'url(#activeGrad)' : 'rgba(255,255,255,0.05)'}
                  strokeWidth={conn.active ? 1.5 : 0.5}
                  strokeDasharray={conn.active ? '6 4' : '2 6'}
                >
                  {conn.active && (
                    <animate attributeName="stroke-dashoffset" values="0;-20" dur="1s" repeatCount="indefinite" />
                  )}
                </line>
                {/* Particle flowing along active connections */}
                {conn.active && (
                  <circle r="2" fill="#a855f7" opacity={0.8}>
                    <animate attributeName="cx" values={`${fx};${tx}`} dur="2s" repeatCount="indefinite" />
                    <animate attributeName="cy" values={`${fy};${ty}`} dur="2s" repeatCount="indefinite" />
                  </circle>
                )}
              </g>
            );
          })}

          {/* Orbit rings */}
          <circle cx="0" cy="0" r="180" fill="none" stroke="rgba(168,85,247,0.08)" strokeWidth="1" strokeDasharray="4 8" />
          <circle cx="0" cy="0" r="310" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="1" strokeDasharray="3 10" />
        </svg>

        {/* CENTER — G */}
        <div
          style={{ ...s.agentNode, ...s.centerNode }}
          onMouseEnter={() => setHoveredAgent(center.id)}
          onMouseLeave={() => setHoveredAgent(null)}
        >
          <div style={{ ...s.pulseRing, borderColor: center.glowColor, animationDuration: '1.5s' }} />
          <div style={{ ...s.pulseRingOuter, borderColor: center.glowColor, animationDuration: '2s' }} />
          <CharacterSVG type={center.silhouette} color={center.color} glow={center.glowColor} size={100} status={center.status} />
          <div style={s.agentName}>{center.name}</div>
          <div style={{ ...s.statusBadge, color: statusLabel[center.status].color, borderColor: statusLabel[center.status].color }}>
            {statusLabel[center.status].text}
          </div>
          <div style={s.taskBadge}>{center.tasksToday}</div>
        </div>

        {/* INNER RING — Workers */}
        {inner.map((agent, i) => {
          const pos = getPosition('inner', i, inner.length);
          const isActive = agent.status === 'active';
          return (
            <div
              key={agent.id}
              style={{
                ...s.agentNode,
                transform: `translate(${pos.x}px, ${pos.y}px)`,
              }}
              onMouseEnter={() => setHoveredAgent(agent.id)}
              onMouseLeave={() => setHoveredAgent(null)}
            >
              {isActive && <div style={{ ...s.pulseRing, borderColor: agent.glowColor, animationDuration: '1.5s' }} />}
              <CharacterSVG type={agent.silhouette} color={agent.color} glow={agent.glowColor} size={75} status={agent.status} />
              <div style={s.agentName}>{agent.name}</div>
              <div style={{ ...s.statusDot, background: statusLabel[agent.status].color }} />
              <div style={s.taskBadge}>{agent.tasksToday}</div>
            </div>
          );
        })}

        {/* OUTER RING — Executives */}
        {outer.map((agent, i) => {
          const pos = getPosition('outer', i, outer.length);
          return (
            <div
              key={agent.id}
              style={{
                ...s.agentNode,
                transform: `translate(${pos.x}px, ${pos.y}px)`,
              }}
              onMouseEnter={() => setHoveredAgent(agent.id)}
              onMouseLeave={() => setHoveredAgent(null)}
            >
              <CharacterSVG type={agent.silhouette} color={agent.color} glow={agent.glowColor} size={65} status={agent.status} />
              <div style={{ ...s.agentNameSmall }}>{agent.name}</div>
              <div style={{ ...s.roleBadge, color: agent.color }}>{agent.role}</div>
              <div style={{ ...s.statusDot, background: statusLabel[agent.status].color }} />
            </div>
          );
        })}
      </div>

      {/* Hover tooltip */}
      {hoveredData && (
        <div style={s.tooltip}>
          <div style={{ ...s.tooltipHeader, borderBottomColor: hoveredData.color }}>
            <span style={s.tooltipEmoji}>{hoveredData.emoji}</span>
            <div>
              <div style={s.tooltipName}>{hoveredData.name}</div>
              <div style={{ ...s.tooltipRole, color: hoveredData.color }}>{hoveredData.role}</div>
            </div>
            <div style={{ ...s.tooltipStatus, color: statusLabel[hoveredData.status].color }}>
              {statusLabel[hoveredData.status].text}
            </div>
          </div>
          <div style={s.tooltipBody}>
            <div style={s.tooltipRow}><span style={s.tooltipLabel}>Model:</span> {hoveredData.model}</div>
            <div style={s.tooltipRow}><span style={s.tooltipLabel}>Tasks Today:</span> <strong>{hoveredData.tasksToday}</strong></div>
            <div style={s.tooltipRow}><span style={s.tooltipLabel}>Last Action:</span> {hoveredData.lastAction}</div>
          </div>
        </div>
      )}

      {/* CSS Keyframes */}
      <style>{`
        @keyframes hivePulse {
          0% { transform: translate(-50%, -50%) scale(1); opacity: 0.6; }
          50% { transform: translate(-50%, -50%) scale(1.4); opacity: 0; }
          100% { transform: translate(-50%, -50%) scale(1); opacity: 0.6; }
        }
        @keyframes hivePulseOuter {
          0% { transform: translate(-50%, -50%) scale(1); opacity: 0.3; }
          50% { transform: translate(-50%, -50%) scale(1.8); opacity: 0; }
          100% { transform: translate(-50%, -50%) scale(1); opacity: 0.3; }
        }
      `}</style>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  container: {
    width: '100%', height: '100%', background: '#0a0a0f', position: 'relative',
    overflow: 'hidden', display: 'flex', flexDirection: 'column', alignItems: 'center',
  },
  title: { fontFamily: M, fontSize: 18, fontWeight: 900, letterSpacing: '0.2em', color: '#a855f7', marginTop: 16, textShadow: '0 0 20px rgba(168,85,247,0.5)' },
  subtitle: { fontFamily: M, fontSize: 10, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.1em', marginTop: 4 },

  statsBar: { display: 'flex', gap: 20, marginTop: 12, padding: '6px 16px', background: 'rgba(255,255,255,0.03)', borderRadius: 10, border: '1px solid rgba(255,255,255,0.06)' },
  stat: { display: 'flex', alignItems: 'center', gap: 6, fontFamily: M, fontSize: 11, color: 'rgba(255,255,255,0.5)' },
  statDot: { width: 6, height: 6, borderRadius: '50%' },
  statLabel: { color: 'rgba(255,255,255,0.35)' },
  statValue: { color: '#a855f7', fontWeight: 700 },

  orbitalField: {
    position: 'relative', flex: 1, width: '100%',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  connectionSvg: { position: 'absolute', width: '800px', height: '800px', pointerEvents: 'none' },

  agentNode: {
    position: 'absolute', display: 'flex', flexDirection: 'column', alignItems: 'center',
    cursor: 'pointer', transition: 'filter 0.2s ease', zIndex: 2,
  },
  centerNode: { zIndex: 5 },

  pulseRing: {
    position: 'absolute', top: '50%', left: '50%',
    width: 90, height: 90, borderRadius: '50%',
    border: '1px solid', pointerEvents: 'none',
    animation: 'hivePulse 1.5s ease-out infinite',
  },
  pulseRingOuter: {
    position: 'absolute', top: '50%', left: '50%',
    width: 110, height: 110, borderRadius: '50%',
    border: '1px solid', pointerEvents: 'none',
    animation: 'hivePulseOuter 2s ease-out infinite',
  },

  agentName: { fontFamily: M, fontSize: 11, fontWeight: 700, color: '#fff', marginTop: -4, textShadow: '0 0 8px rgba(0,0,0,0.8)' },
  agentNameSmall: { fontFamily: M, fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.7)', marginTop: -4 },
  roleBadge: { fontFamily: M, fontSize: 8, letterSpacing: '0.06em', marginTop: 1 },

  statusBadge: {
    fontFamily: M, fontSize: 8, fontWeight: 700, letterSpacing: '0.1em',
    border: '1px solid', borderRadius: 4, padding: '1px 6px', marginTop: 2,
  },
  statusDot: { width: 5, height: 5, borderRadius: '50%', marginTop: 3 },
  taskBadge: {
    position: 'absolute', top: -2, right: -2, fontFamily: M, fontSize: 9, fontWeight: 700,
    color: '#fff', background: 'rgba(168,85,247,0.8)', borderRadius: 8, padding: '1px 5px',
    minWidth: 16, textAlign: 'center',
  },

  tooltip: {
    position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)',
    background: 'rgba(15,15,28,0.95)', border: '1px solid rgba(168,85,247,0.3)',
    borderRadius: 12, padding: 0, minWidth: 280, zIndex: 100,
    backdropFilter: 'blur(10px)', boxShadow: '0 0 30px rgba(168,85,247,0.15)',
  },
  tooltipHeader: {
    display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
    borderBottom: '1px solid rgba(168,85,247,0.2)',
  },
  tooltipEmoji: { fontSize: 24 },
  tooltipName: { fontFamily: M, fontSize: 14, fontWeight: 700, color: '#fff' },
  tooltipRole: { fontFamily: M, fontSize: 10, letterSpacing: '0.06em' },
  tooltipStatus: { fontFamily: M, fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', marginLeft: 'auto' },
  tooltipBody: { padding: '10px 14px' },
  tooltipRow: { fontFamily: M, fontSize: 11, color: 'rgba(255,255,255,0.6)', marginBottom: 4 },
  tooltipLabel: { color: 'rgba(255,255,255,0.35)', marginRight: 6 },
};
