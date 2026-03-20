'use client';

import { useEffect, useRef, useState } from 'react';

/* ═══════════════════════════════════════════════════════════════
   THE HIVE — Cyberpunk City Command Center
   Top-down neon cityscape where each agent is a building
   STATUS IS KING: Working (green pulse), Thinking (blue breathe), Idle (dim/gray)
   ═══════════════════════════════════════════════════════════════ */

type AgentStatus = 'active' | 'idle' | 'ready' | 'error' | 'completed';

interface Agent {
  id: string;
  name: string;
  role: string;
  emoji: string;
  zone: 'center' | 'inner' | 'outer';
  color: string;
  glowColor: string;
  status: AgentStatus;
  tasksToday: number;
  lastAction: string;
  model: string;
  building: string;
}

const AGENTS: Agent[] = [
  { id: 'g', name: 'G', role: 'Orchestrator', emoji: '🧠', zone: 'center', color: '#a855f7', glowColor: '#c084fc', status: 'active', tasksToday: 42, lastAction: 'Delegating ops rebuild', model: 'Claude Opus 4.6', building: 'hq' },
  { id: 'scout', name: 'Scout', role: 'Lead Gen', emoji: '🛰️', zone: 'inner', color: '#10b981', glowColor: '#34d399', status: 'ready', tasksToday: 14, lastAction: 'Extracted 23 qualified leads', model: 'Gemini 2.5 Flash', building: 'radar' },
  { id: 'research', name: 'Research', role: 'Intelligence', emoji: '🔬', zone: 'inner', color: '#8b5cf6', glowColor: '#a78bfa', status: 'idle', tasksToday: 3, lastAction: 'Competitive analysis complete', model: 'Perplexity Sonar', building: 'lab' },
  { id: 'ops', name: 'Ops Guardian', role: 'Reliability', emoji: '🛡️', zone: 'inner', color: '#ef4444', glowColor: '#f87171', status: 'active', tasksToday: 47, lastAction: 'Cron health sweep', model: 'Gemini 2.5 Flash', building: 'shield' },
  { id: 'memory', name: 'Memory Curator', role: 'Continuity', emoji: '📚', zone: 'inner', color: '#f59e0b', glowColor: '#fbbf24', status: 'ready', tasksToday: 6, lastAction: 'Daily recall validation', model: 'MiniMax M2.1', building: 'archive' },
  { id: 'elon', name: 'Elon', role: 'CTO', emoji: '⚡', zone: 'outer', color: '#3b82f6', glowColor: '#60a5fa', status: 'idle', tasksToday: 2, lastAction: 'Architecture review', model: 'Claude Opus 4.6', building: 'tower' },
  { id: 'gary', name: 'Gary', role: 'CMO', emoji: '📢', zone: 'outer', color: '#f97316', glowColor: '#fb923c', status: 'idle', tasksToday: 1, lastAction: 'Content strategy memo', model: 'Claude Opus 4.6', building: 'tower' },
  { id: 'mark', name: 'Mark', role: 'CRO', emoji: '💰', zone: 'outer', color: '#eab308', glowColor: '#facc15', status: 'ready', tasksToday: 5, lastAction: 'Pipeline scoring update', model: 'Claude Opus 4.6', building: 'tower' },
  { id: 'ray', name: 'Ray', role: 'CFO', emoji: '💵', zone: 'outer', color: '#14b8a6', glowColor: '#2dd4bf', status: 'idle', tasksToday: 0, lastAction: 'Cost analysis pending', model: 'Claude Opus 4.6', building: 'tower' },
  { id: 'tim', name: 'Tim', role: 'COO', emoji: '⚙️', zone: 'outer', color: '#6366f1', glowColor: '#818cf8', status: 'idle', tasksToday: 1, lastAction: 'Process optimization', model: 'Claude Opus 4.6', building: 'tower' },
  { id: 'steve', name: 'Steve', role: 'CPO', emoji: '🎯', zone: 'outer', color: '#ec4899', glowColor: '#f472b6', status: 'idle', tasksToday: 0, lastAction: 'Roadmap review queued', model: 'Claude Opus 4.6', building: 'tower' },
  { id: 'pepper', name: 'Pepper', role: 'Chief of Staff', emoji: '🌶️', zone: 'outer', color: '#e11d48', glowColor: '#fb7185', status: 'ready', tasksToday: 3, lastAction: 'Coordinating sprints', model: 'Claude Opus 4.6', building: 'tower' },
];

const M = "'JetBrains Mono', 'Fira Code', monospace";

const STATUS_META: Record<AgentStatus, { label: string; color: string; bg: string }> = {
  active:    { label: '⚡ WORKING',  color: '#22c55e', bg: '#22c55e' },
  ready:     { label: '💭 THINKING', color: '#3b82f6', bg: '#3b82f6' },
  idle:      { label: '💤 IDLE',     color: '#6b7280', bg: '#4b5563' },
  error:     { label: '🔴 ERROR',    color: '#ef4444', bg: '#ef4444' },
  completed: { label: '✅ DONE',     color: '#f59e0b', bg: '#f59e0b' },
};

/* ── Rain + Neon Canvas ── */
function CityCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let w = 0, h = 0;

    interface Drop { x: number; y: number; speed: number; len: number; alpha: number; }
    const drops: Drop[] = [];

    const resize = () => {
      w = canvas.parentElement?.clientWidth || 800;
      h = canvas.parentElement?.clientHeight || 600;
      canvas.width = w * 2;
      canvas.height = h * 2;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(2, 0, 0, 2, 0, 0);
    };

    const init = () => {
      resize();
      drops.length = 0;
      for (let i = 0; i < 80; i++) {
        drops.push({
          x: Math.random() * w,
          y: Math.random() * h,
          speed: 2 + Math.random() * 4,
          len: 8 + Math.random() * 18,
          alpha: 0.05 + Math.random() * 0.12,
        });
      }
    };

    let frame = 0;
    const draw = () => {
      frame++;
      ctx.clearRect(0, 0, w, h);

      // Dark city sky
      const sky = ctx.createLinearGradient(0, 0, 0, h);
      sky.addColorStop(0, '#06060e');
      sky.addColorStop(0.5, '#0a0a18');
      sky.addColorStop(1, '#0e0e1e');
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, w, h);

      // Subtle neon ambient glow from "below"
      const ambGrad = ctx.createRadialGradient(w * 0.5, h, 0, w * 0.5, h, h * 0.7);
      ambGrad.addColorStop(0, 'rgba(168, 85, 247, 0.04)');
      ambGrad.addColorStop(0.5, 'rgba(236, 72, 153, 0.02)');
      ambGrad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = ambGrad;
      ctx.fillRect(0, 0, w, h);

      // Rain
      for (const d of drops) {
        d.y += d.speed;
        if (d.y > h) { d.y = -d.len; d.x = Math.random() * w; }

        ctx.strokeStyle = `rgba(140, 160, 255, ${d.alpha})`;
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(d.x, d.y);
        ctx.lineTo(d.x - 0.5, d.y + d.len);
        ctx.stroke();
      }

      // Subtle horizontal neon reflections at bottom
      for (let i = 0; i < 5; i++) {
        const ry = h - 10 - i * 8;
        const rAlpha = 0.015 - i * 0.002;
        ctx.fillStyle = `rgba(168, 85, 247, ${Math.max(0, rAlpha)})`;
        ctx.fillRect(0, ry, w, 2);
      }

      // CRT scanlines
      ctx.fillStyle = 'rgba(0,0,0,0.03)';
      for (let y = 0; y < h; y += 2) {
        ctx.fillRect(0, y, w, 1);
      }

      animId = requestAnimationFrame(draw);
    };

    init();
    draw();
    window.addEventListener('resize', init);
    return () => { cancelAnimationFrame(animId); window.removeEventListener('resize', init); };
  }, []);

  return <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }} />;
}

/* ── Building Component ── */
function Building({ agent, size, isHovered }: {
  agent: Agent; size: number; isHovered: boolean;
}) {
  const sm = STATUS_META[agent.status];
  const isWorking = agent.status === 'active';
  const isThinking = agent.status === 'ready';
  const isIdle = agent.status === 'idle';
  const isError = agent.status === 'error';

  // Building proportions
  const bW = size * 0.7;
  const bH = agent.zone === 'center' ? size * 1.2 : agent.zone === 'inner' ? size * 0.9 : size * 0.7;
  const baseY = size * 0.8;

  // Status-driven visual intensity
  const buildingOpacity = isIdle ? 0.35 : 1;
  const neonIntensity = isWorking ? 1 : isThinking ? 0.6 : isError ? 0.8 : 0.1;
  const windowGlow = isWorking ? agent.glowColor : isThinking ? '#60a5fa' : isError ? '#f87171' : '#1a1a2e';

  return (
    <div style={{
      width: size, height: size * 1.4,
      position: 'relative',
      opacity: buildingOpacity,
      transition: 'opacity 0.5s ease, transform 0.3s ease',
      transform: isHovered ? 'scale(1.08)' : 'scale(1)',
    }}>
      <svg width={size} height={size * 1.4} viewBox={`0 0 ${size} ${size * 1.4}`}>
        <defs>
          <filter id={`neon-${agent.id}`}>
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <filter id={`bigGlow-${agent.id}`}>
            <feGaussianBlur stdDeviation="8" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        {/* ── Ground reflection / puddle ── */}
        <ellipse cx={size / 2} cy={baseY + bH * 0.05} rx={bW * 0.6} ry={4}
          fill={agent.color} opacity={neonIntensity * 0.15} filter={`url(#bigGlow-${agent.id})`} />

        {/* ── Building body ── */}
        <rect x={(size - bW) / 2} y={baseY - bH} width={bW} height={bH}
          rx={2} fill="#0c0c1a"
          stroke={isIdle ? '#1a1a2e' : agent.color}
          strokeWidth={isWorking ? 1.5 : 0.5}
          opacity={0.9} />

        {/* ── Neon outline on sides (status color) ── */}
        {!isIdle && (
          <>
            <line x1={(size - bW) / 2} y1={baseY - bH} x2={(size - bW) / 2} y2={baseY}
              stroke={sm.color} strokeWidth={isWorking ? 2 : 1} opacity={neonIntensity * 0.7}
              filter={`url(#neon-${agent.id})`}>
              {isWorking && <animate attributeName="opacity" values="0.4;0.9;0.4" dur="1.5s" repeatCount="indefinite" />}
              {isThinking && <animate attributeName="opacity" values="0.3;0.6;0.3" dur="3s" repeatCount="indefinite" />}
            </line>
            <line x1={(size + bW) / 2} y1={baseY - bH} x2={(size + bW) / 2} y2={baseY}
              stroke={sm.color} strokeWidth={isWorking ? 2 : 1} opacity={neonIntensity * 0.7}
              filter={`url(#neon-${agent.id})`}>
              {isWorking && <animate attributeName="opacity" values="0.4;0.9;0.4" dur="1.5s" repeatCount="indefinite" />}
              {isThinking && <animate attributeName="opacity" values="0.3;0.6;0.3" dur="3s" repeatCount="indefinite" />}
            </line>
          </>
        )}

        {/* ── Roof accent ── */}
        {agent.zone === 'center' && (
          <>
            {/* Antenna / spire */}
            <line x1={size / 2} y1={baseY - bH - 15} x2={size / 2} y2={baseY - bH}
              stroke={agent.color} strokeWidth="1.5" opacity={0.6} />
            {/* Beacon */}
            <circle cx={size / 2} cy={baseY - bH - 18} r={3} fill={sm.color} opacity={0.8}
              filter={`url(#neon-${agent.id})`}>
              {isWorking && <animate attributeName="r" values="2;5;2" dur="1.5s" repeatCount="indefinite" />}
              {isWorking && <animate attributeName="opacity" values="0.5;1;0.5" dur="1.5s" repeatCount="indefinite" />}
            </circle>
          </>
        )}

        {/* ── Radar dish (Scout) ── */}
        {agent.building === 'radar' && (
          <g>
            <line x1={size / 2} y1={baseY - bH - 8} x2={size / 2} y2={baseY - bH}
              stroke={agent.color} strokeWidth="1" opacity={0.5} />
            <path d={`M${size / 2 - 8},${baseY - bH - 6} Q${size / 2},${baseY - bH - 14} ${size / 2 + 8},${baseY - bH - 6}`}
              fill="none" stroke={agent.color} strokeWidth="1.5" opacity={0.5} />
            {(isWorking || isThinking) && (
              <circle cx={size / 2} cy={baseY - bH - 10} r="2" fill={sm.color} opacity={0.6}>
                <animate attributeName="r" values="1;4;1" dur="2s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.3;0.7;0.3" dur="2s" repeatCount="indefinite" />
              </circle>
            )}
          </g>
        )}

        {/* ── Shield emblem (Ops Guardian) ── */}
        {agent.building === 'shield' && (
          <path d={`M${size / 2},${baseY - bH + 10} L${size / 2 + 10},${baseY - bH + 18} L${size / 2 + 8},${baseY - bH + 30} L${size / 2},${baseY - bH + 34} L${size / 2 - 8},${baseY - bH + 30} L${size / 2 - 10},${baseY - bH + 18}Z`}
            fill="none" stroke={sm.color} strokeWidth="1.2" opacity={neonIntensity * 0.6}
            filter={`url(#neon-${agent.id})`}>
            {isWorking && <animate attributeName="opacity" values="0.3;0.8;0.3" dur="2s" repeatCount="indefinite" />}
          </path>
        )}

        {/* ── Lab flask (Research) ── */}
        {agent.building === 'lab' && (
          <g>
            <circle cx={size / 2 - 12} cy={baseY - bH + 15} r="5" fill="none"
              stroke={agent.color} strokeWidth="0.8" opacity={0.3} />
            <circle cx={size / 2 + 12} cy={baseY - bH + 12} r="4" fill="none"
              stroke={agent.color} strokeWidth="0.8" opacity={0.25} />
            {(isWorking || isThinking) && (
              <circle cx={size / 2} cy={baseY - bH - 5} r="2" fill={agent.glowColor} opacity={0.4}>
                <animate attributeName="cy" values={`${baseY - bH - 3};${baseY - bH - 10};${baseY - bH - 3}`} dur="3s" repeatCount="indefinite" />
              </circle>
            )}
          </g>
        )}

        {/* ── Archive symbol (Memory) ── */}
        {agent.building === 'archive' && (
          <g>
            {[0, 1, 2].map((i) => (
              <rect key={i} x={size / 2 - 8 + i * 5} y={baseY - bH + 8 + i * 3}
                width="4" height="10" rx="0.5" fill={agent.glowColor}
                opacity={0.15 + (isThinking || isWorking ? 0.15 : 0)} transform={`rotate(${-5 + i * 5} ${size / 2} ${baseY - bH + 15})`}>
                {(isWorking || isThinking) && (
                  <animate attributeName="opacity" values="0.15;0.35;0.15" dur={`${2 + i * 0.5}s`} repeatCount="indefinite" />
                )}
              </rect>
            ))}
          </g>
        )}

        {/* ── Windows grid ── */}
        {(() => {
          const rows = agent.zone === 'center' ? 6 : agent.zone === 'inner' ? 4 : 3;
          const cols = agent.zone === 'center' ? 4 : 3;
          const wW = bW * 0.12;
          const wH = bH * 0.06;
          const gapX = (bW - cols * wW) / (cols + 1);
          const gapY = (bH * 0.7) / (rows + 1);
          const startX = (size - bW) / 2;
          const startY = baseY - bH + bH * 0.15;

          return Array.from({ length: rows * cols }, (_, idx) => {
            const row = Math.floor(idx / cols);
            const col = idx % cols;
            const wx = startX + gapX + col * (wW + gapX);
            const wy = startY + gapY + row * (wH + gapY);
            // Randomly light some windows
            const lit = isWorking ? Math.random() > 0.2
              : isThinking ? Math.random() > 0.5
              : Math.random() > 0.85;
            return (
              <rect key={idx} x={wx} y={wy} width={wW} height={wH} rx={0.5}
                fill={lit ? windowGlow : '#0a0a15'}
                opacity={lit ? (isWorking ? 0.7 : isThinking ? 0.4 : 0.15) : 0.3}>
                {isWorking && lit && (
                  <animate attributeName="opacity"
                    values={`${0.3 + Math.random() * 0.3};${0.6 + Math.random() * 0.4};${0.3 + Math.random() * 0.3}`}
                    dur={`${1.5 + Math.random() * 2}s`} repeatCount="indefinite" />
                )}
              </rect>
            );
          });
        })()}

        {/* ── Neon sign (agent name) ── */}
        <text x={size / 2} y={baseY - bH + bH * 0.5}
          textAnchor="middle" fontFamily={M} fontSize={agent.zone === 'center' ? 9 : 7}
          fontWeight="900" letterSpacing="0.1em"
          fill={agent.color} opacity={neonIntensity * 0.8 + 0.2}
          filter={!isIdle ? `url(#neon-${agent.id})` : undefined}>
          {agent.emoji}
        </text>

        {/* ── Status bar at base of building ── */}
        <rect x={(size - bW) / 2} y={baseY - 3} width={bW} height={3}
          rx={1} fill={sm.bg} opacity={isWorking ? 0.9 : isThinking ? 0.5 : 0.15}>
          {isWorking && <animate attributeName="opacity" values="0.5;1;0.5" dur="1s" repeatCount="indefinite" />}
          {isThinking && <animate attributeName="opacity" values="0.25;0.55;0.25" dur="3s" repeatCount="indefinite" />}
        </rect>

        {/* ── Holographic data streams (working agents) ── */}
        {isWorking && (
          <g>
            {[0, 1, 2].map((i) => {
              const sx = (size - bW) / 2 + bW * 0.2 + i * bW * 0.3;
              return (
                <line key={i} x1={sx} y1={baseY - bH - 3} x2={sx} y2={baseY - bH - 15 - i * 5}
                  stroke={sm.color} strokeWidth="0.8" strokeDasharray="2 3" opacity={0.4}>
                  <animate attributeName="strokeDashoffset" values="0;-10" dur={`${0.8 + i * 0.3}s`} repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.2;0.5;0.2" dur={`${1.5 + i * 0.5}s`} repeatCount="indefinite" />
                </line>
              );
            })}
          </g>
        )}

        {/* ── Thinking particles (ready/thinking agents) ── */}
        {isThinking && (
          <g>
            {[0, 1, 2].map((i) => (
              <circle key={i} cx={size / 2 + (i - 1) * 12}
                cy={baseY - bH - 8} r={1.5} fill={sm.color} opacity={0.4}>
                <animate attributeName="cy"
                  values={`${baseY - bH - 5};${baseY - bH - 15};${baseY - bH - 5}`}
                  dur={`${2 + i * 0.7}s`} repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.15;0.5;0.15"
                  dur={`${2 + i * 0.7}s`} repeatCount="indefinite" />
              </circle>
            ))}
          </g>
        )}

      </svg>

      {/* ── Status badge (HTML overlay for crispness) ── */}
      <div style={{
        position: 'absolute',
        bottom: size * 0.15,
        left: '50%', transform: 'translateX(-50%)',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        gap: 2,
      }}>
        <div style={{
          fontFamily: M, fontSize: agent.zone === 'center' ? 12 : agent.zone === 'inner' ? 10 : 9,
          fontWeight: 900, color: '#fff',
          textShadow: `0 0 10px ${agent.color}88, 0 1px 4px rgba(0,0,0,0.9)`,
          letterSpacing: '0.08em',
          whiteSpace: 'nowrap',
        }}>{agent.name}</div>
        <div style={{
          fontFamily: M,
          fontSize: agent.zone === 'center' ? 8 : 7,
          color: agent.color,
          letterSpacing: '0.08em',
          opacity: 0.7,
          whiteSpace: 'nowrap',
        }}>{agent.role.toUpperCase()}</div>
        {/* Big clear status pill */}
        <div style={{
          fontFamily: M,
          fontSize: agent.zone === 'center' ? 9 : 7,
          fontWeight: 800,
          letterSpacing: '0.08em',
          color: sm.color,
          background: `${sm.bg}18`,
          border: `1px solid ${sm.bg}55`,
          borderRadius: 4,
          padding: '1px 8px',
          whiteSpace: 'nowrap',
          boxShadow: isWorking ? `0 0 8px ${sm.bg}44` : isThinking ? `0 0 6px ${sm.bg}22` : 'none',
          animation: isWorking ? 'statusPulse 1.5s ease-in-out infinite' : isThinking ? 'statusBreathe 3s ease-in-out infinite' : undefined,
        }}>{sm.label}</div>
      </div>

      {/* Task count */}
      {agent.tasksToday > 0 && (
        <div style={{
          position: 'absolute', top: agent.zone === 'center' ? 2 : 8, right: 4,
          fontFamily: M, fontSize: 8, fontWeight: 800,
          color: '#fff', background: `${agent.color}bb`,
          borderRadius: 4, padding: '1px 4px',
          boxShadow: `0 0 6px ${agent.color}44`,
        }}>{agent.tasksToday}</div>
      )}
    </div>
  );
}

/* ── Data Highway (connection lines between buildings) ── */
function DataHighway({ x1, y1, x2, y2, active, color }: {
  x1: number; y1: number; x2: number; y2: number; active: boolean; color: string;
}) {
  if (!active) {
    return (
      <line x1={x1} y1={y1} x2={x2} y2={y2}
        stroke="rgba(255,255,255,0.03)" strokeWidth="0.5" strokeDasharray="4 12" />
    );
  }

  const angle = Math.atan2(y2 - y1, x2 - x1);
  const len = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);

  return (
    <g>
      {/* Road glow */}
      <line x1={x1} y1={y1} x2={x2} y2={y2}
        stroke={color} strokeWidth="4" opacity={0.06} />
      {/* Road */}
      <line x1={x1} y1={y1} x2={x2} y2={y2}
        stroke={color} strokeWidth="1.5" opacity={0.3}
        strokeDasharray="6 4">
        <animate attributeName="strokeDashoffset" values="0;-20" dur="1s" repeatCount="indefinite" />
      </line>
      {/* Data car 1 */}
      <circle r="3" fill={color} opacity={0.8}>
        <animate attributeName="cx" values={`${x1};${x2}`} dur="2s" repeatCount="indefinite" />
        <animate attributeName="cy" values={`${y1};${y2}`} dur="2s" repeatCount="indefinite" />
      </circle>
      {/* Data car 2 (return trip) */}
      <circle r="2" fill="#fff" opacity={0.4}>
        <animate attributeName="cx" values={`${x2};${x1}`} dur="2.5s" repeatCount="indefinite" />
        <animate attributeName="cy" values={`${y2};${y1}`} dur="2.5s" repeatCount="indefinite" />
      </circle>
    </g>
  );
}

/* ── Main Component ── */
export default function TheHive() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredAgent, setHoveredAgent] = useState<string | null>(null);
  const [agents, setAgents] = useState(AGENTS);
  const [dims, setDims] = useState({ w: 800, h: 600 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      setDims({ w: width, h: height });
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // Demo activity simulation
  useEffect(() => {
    const interval = setInterval(() => {
      setAgents((prev) =>
        prev.map((a) => {
          if (Math.random() < 0.04) {
            const statuses: AgentStatus[] = ['active', 'ready', 'idle'];
            const newStatus = a.id === 'g' ? 'active' : statuses[Math.floor(Math.random() * statuses.length)];
            return { ...a, status: newStatus, tasksToday: newStatus === 'active' ? a.tasksToday + 1 : a.tasksToday };
          }
          return a;
        }),
      );
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  // Layout: G center, workers in arc above, execs in arc below
  const scale = Math.min(dims.w / 950, dims.h / 700, 1);
  const cx = dims.w / 2;
  const cy = dims.h / 2;

  const center = agents.find((a) => a.zone === 'center')!;
  const inner = agents.filter((a) => a.zone === 'inner');
  const outer = agents.filter((a) => a.zone === 'outer');

  const centerSize = 130 * scale;
  const innerSize = 100 * scale;
  const outerSize = 75 * scale;

  // Position agents in a city-block layout
  const positions: Record<string, { x: number; y: number }> = {};

  // Center
  positions[center.id] = { x: cx, y: cy };

  // Inner ring — semicircle above center
  const innerR = 180 * scale;
  inner.forEach((a, i) => {
    const angle = Math.PI + (Math.PI / (inner.length + 1)) * (i + 1); // top semicircle
    positions[a.id] = {
      x: cx + Math.cos(angle) * innerR,
      y: cy + Math.sin(angle) * innerR * 0.7,
    };
  });

  // Outer ring — arc below and around
  const outerR = 310 * scale;
  outer.forEach((a, i) => {
    const totalAngle = Math.PI * 1.2; // 216 degrees
    const startAngle = -Math.PI * 0.1; // start slightly left of bottom
    const angle = startAngle + (totalAngle / (outer.length - 1)) * i;
    positions[a.id] = {
      x: cx + Math.cos(angle) * outerR,
      y: cy + Math.sin(angle) * outerR * 0.55 + 40 * scale,
    };
  });

  const hoveredData = hoveredAgent ? agents.find((a) => a.id === hoveredAgent) : null;

  // Connection definitions
  const CONNECTIONS = [
    { from: 'g', to: 'scout', active: false },
    { from: 'g', to: 'ops', active: true },
    { from: 'g', to: 'memory', active: false },
    { from: 'g', to: 'research', active: false },
    { from: 'pepper', to: 'g', active: true },
    { from: 'g', to: 'elon', active: false },
    { from: 'g', to: 'mark', active: false },
  ];

  return (
    <div ref={containerRef} style={{
      width: '100%', height: '100%', background: '#07070d',
      position: 'relative', overflow: 'hidden', borderRadius: 14,
    }}>
      <CityCanvas />

      {/* Header */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 16px', zIndex: 20,
        background: 'linear-gradient(to bottom, rgba(7,7,13,0.9), rgba(7,7,13,0))',
      }}>
        <div>
          <div style={{
            fontFamily: M, fontSize: 13, fontWeight: 900,
            letterSpacing: '0.25em', color: '#a855f7',
            textShadow: '0 0 20px rgba(168,85,247,0.5), 0 0 40px rgba(168,85,247,0.2)',
          }}>THE HIVE</div>
          <div style={{ fontFamily: M, fontSize: 7, color: 'rgba(255,255,255,0.2)', letterSpacing: '0.2em' }}>
            NEON DISTRICT
          </div>
        </div>

        {/* Legend — big and clear */}
        <div style={{ display: 'flex', gap: 10 }}>
          {[
            { label: '⚡ WORKING', count: agents.filter((a) => a.status === 'active').length, color: '#22c55e' },
            { label: '💭 THINKING', count: agents.filter((a) => a.status === 'ready').length, color: '#3b82f6' },
            { label: '💤 IDLE', count: agents.filter((a) => a.status === 'idle').length, color: '#6b7280' },
          ].map((s) => (
            <div key={s.label} style={{
              display: 'flex', alignItems: 'center', gap: 5,
              fontFamily: M, fontSize: 9, fontWeight: 700, color: s.color,
              background: `${s.color}15`, border: `1px solid ${s.color}33`,
              borderRadius: 6, padding: '3px 10px',
            }}>
              <div style={{
                width: 6, height: 6, borderRadius: '50%', background: s.color,
                boxShadow: `0 0 6px ${s.color}`,
                animation: s.label.includes('WORKING') ? 'statusPulse 1.5s ease-in-out infinite'
                  : s.label.includes('THINKING') ? 'statusBreathe 3s ease-in-out infinite' : undefined,
              }} />
              {s.count} {s.label}
            </div>
          ))}
          <div style={{
            fontFamily: M, fontSize: 9, fontWeight: 700, color: '#a855f7',
            background: 'rgba(168,85,247,0.1)', border: '1px solid rgba(168,85,247,0.2)',
            borderRadius: 6, padding: '3px 10px',
          }}>⚡ {agents.reduce((sum, a) => sum + a.tasksToday, 0)} tasks</div>
        </div>
      </div>

      {/* Data highways SVG */}
      <svg style={{
        position: 'absolute', inset: 0, width: '100%', height: '100%',
        pointerEvents: 'none', zIndex: 2,
      }}>
        {CONNECTIONS.map((conn) => {
          const from = positions[conn.from];
          const to = positions[conn.to];
          if (!from || !to) return null;
          const fromAgent = agents.find((a) => a.id === conn.from);
          return (
            <DataHighway key={`${conn.from}-${conn.to}`}
              x1={from.x} y1={from.y} x2={to.x} y2={to.y}
              active={conn.active} color={fromAgent?.glowColor || '#a855f7'} />
          );
        })}
      </svg>

      {/* Buildings */}
      {/* Center */}
      <div
        style={{
          position: 'absolute',
          left: positions[center.id].x - centerSize / 2,
          top: positions[center.id].y - centerSize * 0.7,
          zIndex: 10, cursor: 'pointer',
        }}
        onMouseEnter={() => setHoveredAgent(center.id)}
        onMouseLeave={() => setHoveredAgent(null)}
      >
        <Building agent={center} size={centerSize} isHovered={hoveredAgent === center.id} />
      </div>

      {/* Inner buildings */}
      {inner.map((agent) => {
        const pos = positions[agent.id];
        if (!pos) return null;
        return (
          <div key={agent.id}
            style={{
              position: 'absolute',
              left: pos.x - innerSize / 2,
              top: pos.y - innerSize * 0.5,
              zIndex: 5, cursor: 'pointer',
            }}
            onMouseEnter={() => setHoveredAgent(agent.id)}
            onMouseLeave={() => setHoveredAgent(null)}
          >
            <Building agent={agent} size={innerSize} isHovered={hoveredAgent === agent.id} />
          </div>
        );
      })}

      {/* Outer buildings */}
      {outer.map((agent) => {
        const pos = positions[agent.id];
        if (!pos) return null;
        return (
          <div key={agent.id}
            style={{
              position: 'absolute',
              left: pos.x - outerSize / 2,
              top: pos.y - outerSize * 0.3,
              zIndex: 4, cursor: 'pointer',
            }}
            onMouseEnter={() => setHoveredAgent(agent.id)}
            onMouseLeave={() => setHoveredAgent(null)}
          >
            <Building agent={agent} size={outerSize} isHovered={hoveredAgent === agent.id} />
          </div>
        );
      })}

      {/* Hover tooltip */}
      {hoveredData && (
        <div style={{
          position: 'absolute', bottom: 12, left: '50%', transform: 'translateX(-50%)',
          background: 'rgba(8,8,18,0.95)',
          border: `1px solid ${hoveredData.color}33`,
          borderRadius: 10, minWidth: 300, zIndex: 100,
          backdropFilter: 'blur(12px)',
          boxShadow: `0 0 30px ${hoveredData.color}15, 0 8px 30px rgba(0,0,0,0.6)`,
        }}>
          <div style={{
            height: 2,
            background: `linear-gradient(90deg, transparent, ${hoveredData.color}, transparent)`,
            borderRadius: '10px 10px 0 0',
          }} />
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '8px 14px', borderBottom: `1px solid ${hoveredData.color}18`,
          }}>
            <span style={{ fontSize: 24 }}>{hoveredData.emoji}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: M, fontSize: 13, fontWeight: 800, color: '#fff' }}>{hoveredData.name}</div>
              <div style={{ fontFamily: M, fontSize: 8, color: hoveredData.color, letterSpacing: '0.1em' }}>{hoveredData.role.toUpperCase()}</div>
            </div>
            <div style={{
              fontFamily: M, fontSize: 9, fontWeight: 800,
              color: STATUS_META[hoveredData.status].color,
              background: `${STATUS_META[hoveredData.status].bg}18`,
              border: `1px solid ${STATUS_META[hoveredData.status].bg}44`,
              borderRadius: 4, padding: '2px 8px',
            }}>{STATUS_META[hoveredData.status].label}</div>
          </div>
          <div style={{ padding: '6px 14px 10px' }}>
            <div style={{ fontFamily: M, fontSize: 10, color: 'rgba(255,255,255,0.4)', marginBottom: 2 }}>
              <span style={{ color: 'rgba(255,255,255,0.2)' }}>MODEL </span>{hoveredData.model}
            </div>
            <div style={{ fontFamily: M, fontSize: 10, color: 'rgba(255,255,255,0.4)', marginBottom: 2 }}>
              <span style={{ color: 'rgba(255,255,255,0.2)' }}>TASKS </span>
              <span style={{ color: '#a855f7', fontWeight: 700 }}>{hoveredData.tasksToday}</span>
            </div>
            <div style={{ fontFamily: M, fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>
              <span style={{ color: 'rgba(255,255,255,0.2)' }}>LAST </span>{hoveredData.lastAction}
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes statusPulse {
          0%, 100% { opacity: 0.7; box-shadow: 0 0 4px currentColor; }
          50% { opacity: 1; box-shadow: 0 0 12px currentColor; }
        }
        @keyframes statusBreathe {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 0.8; }
        }
      `}</style>
    </div>
  );
}
