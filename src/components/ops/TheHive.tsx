'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

/* ═══════════════════════════════════════════════════════════════
   THE HIVE — Isometric Office
   SimCity meets cyberpunk startup. Each agent = isometric room.
   Pan / Zoom / Drag / Save layout to localStorage.
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
  office: string;
}

const AGENTS: Agent[] = [
  { id: 'g', name: 'G', role: 'Orchestrator', emoji: '🧠', zone: 'center', color: '#a855f7', glowColor: '#c084fc', status: 'active', tasksToday: 42, lastAction: 'Delegating ops rebuild', model: 'Claude Opus 4.6', office: 'corner' },
  { id: 'scout', name: 'Scout', role: 'Lead Gen', emoji: '🛰️', zone: 'inner', color: '#10b981', glowColor: '#34d399', status: 'ready', tasksToday: 14, lastAction: 'Extracted 23 qualified leads', model: 'Gemini 2.5 Flash', office: 'workstation' },
  { id: 'research', name: 'Research', role: 'Intelligence', emoji: '🔬', zone: 'inner', color: '#8b5cf6', glowColor: '#a78bfa', status: 'idle', tasksToday: 3, lastAction: 'Competitive analysis complete', model: 'Perplexity Sonar', office: 'lab' },
  { id: 'ops', name: 'Ops Guardian', role: 'Reliability', emoji: '🛡️', zone: 'inner', color: '#ef4444', glowColor: '#f87171', status: 'active', tasksToday: 47, lastAction: 'Cron health sweep', model: 'Gemini 2.5 Flash', office: 'security' },
  { id: 'memory', name: 'Memory Curator', role: 'Continuity', emoji: '📚', zone: 'inner', color: '#f59e0b', glowColor: '#fbbf24', status: 'ready', tasksToday: 6, lastAction: 'Daily recall validation', model: 'MiniMax M2.1', office: 'archive' },
  { id: 'elon', name: 'Elon', role: 'CTO', emoji: '⚡', zone: 'outer', color: '#3b82f6', glowColor: '#60a5fa', status: 'idle', tasksToday: 2, lastAction: 'Architecture review', model: 'Claude Opus 4.6', office: 'exec' },
  { id: 'gary', name: 'Gary', role: 'CMO', emoji: '📢', zone: 'outer', color: '#f97316', glowColor: '#fb923c', status: 'idle', tasksToday: 1, lastAction: 'Content strategy memo', model: 'Claude Opus 4.6', office: 'exec' },
  { id: 'mark', name: 'Mark', role: 'CRO', emoji: '💰', zone: 'outer', color: '#eab308', glowColor: '#facc15', status: 'ready', tasksToday: 5, lastAction: 'Pipeline scoring update', model: 'Claude Opus 4.6', office: 'exec' },
  { id: 'ray', name: 'Ray', role: 'CFO', emoji: '💵', zone: 'outer', color: '#14b8a6', glowColor: '#2dd4bf', status: 'idle', tasksToday: 0, lastAction: 'Cost analysis pending', model: 'Claude Opus 4.6', office: 'exec' },
  { id: 'tim', name: 'Tim', role: 'COO', emoji: '⚙️', zone: 'outer', color: '#6366f1', glowColor: '#818cf8', status: 'idle', tasksToday: 1, lastAction: 'Process optimization', model: 'Claude Opus 4.6', office: 'exec' },
  { id: 'steve', name: 'Steve', role: 'CPO', emoji: '🎯', zone: 'outer', color: '#ec4899', glowColor: '#f472b6', status: 'idle', tasksToday: 0, lastAction: 'Roadmap review queued', model: 'Claude Opus 4.6', office: 'exec' },
  { id: 'pepper', name: 'Pepper', role: 'Chief of Staff', emoji: '🌶️', zone: 'outer', color: '#e11d48', glowColor: '#fb7185', status: 'ready', tasksToday: 3, lastAction: 'Coordinating sprints', model: 'Claude Opus 4.6', office: 'exec' },
];

const CONNECTIONS = [
  { from: 'g', to: 'scout', active: false },
  { from: 'g', to: 'ops', active: true },
  { from: 'g', to: 'memory', active: false },
  { from: 'g', to: 'research', active: false },
  { from: 'pepper', to: 'g', active: true },
  { from: 'g', to: 'elon', active: false },
  { from: 'g', to: 'mark', active: false },
];

const M = "'JetBrains Mono', 'Fira Code', monospace";
const STORAGE_KEY = 'hive-iso-layout-v1';

const STATUS_META: Record<AgentStatus, { label: string; color: string; bg: string }> = {
  active:    { label: '⚡ WORKING',  color: '#22c55e', bg: '#22c55e' },
  ready:     { label: '💭 THINKING', color: '#3b82f6', bg: '#3b82f6' },
  idle:      { label: '💤 IDLE',     color: '#6b7280', bg: '#4b5563' },
  error:     { label: '🔴 ERROR',    color: '#ef4444', bg: '#ef4444' },
  completed: { label: '✅ DONE',     color: '#f59e0b', bg: '#f59e0b' },
};

/* ── Default isometric grid positions ── */
function defaultPositions(): Record<string, { x: number; y: number }> {
  const pos: Record<string, { x: number; y: number }> = {};
  // G's corner office — center-top
  pos['g'] = { x: 0, y: -60 };
  // Workers — row below G
  const inner = AGENTS.filter((a) => a.zone === 'inner');
  inner.forEach((a, i) => {
    pos[a.id] = { x: (i - (inner.length - 1) / 2) * 180, y: 100 };
  });
  // Execs — arc at bottom
  const outer = AGENTS.filter((a) => a.zone === 'outer');
  outer.forEach((a, i) => {
    const cols = 4;
    const row = Math.floor(i / cols);
    const col = i % cols;
    const rowWidth = Math.min(cols, outer.length - row * cols);
    pos[a.id] = {
      x: (col - (rowWidth - 1) / 2) * 160,
      y: 270 + row * 140,
    };
  });
  return pos;
}

function loadSavedLayout(): Record<string, { x: number; y: number }> | null {
  try { const r = localStorage.getItem(STORAGE_KEY); if (r) return JSON.parse(r); } catch {} return null;
}

/* ── Subtle grid canvas background ── */
function GridCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let w = 0, h = 0;

    const resize = () => {
      w = canvas.parentElement?.clientWidth || 800;
      h = canvas.parentElement?.clientHeight || 600;
      canvas.width = w * 2; canvas.height = h * 2;
      canvas.style.width = `${w}px`; canvas.style.height = `${h}px`;
      ctx.setTransform(2, 0, 0, 2, 0, 0);
    };

    let frame = 0;
    const draw = () => {
      frame++;
      ctx.clearRect(0, 0, w, h);

      // Dark floor gradient
      const bg = ctx.createLinearGradient(0, 0, 0, h);
      bg.addColorStop(0, '#08080f'); bg.addColorStop(0.5, '#0a0a14'); bg.addColorStop(1, '#0c0c18');
      ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);

      // Isometric grid lines
      const gridSize = 40;
      ctx.strokeStyle = 'rgba(168, 85, 247, 0.03)';
      ctx.lineWidth = 0.5;

      // Diagonal lines (iso left)
      for (let i = -h; i < w + h; i += gridSize) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i - h * 0.5, h);
        ctx.stroke();
      }
      // Diagonal lines (iso right)
      for (let i = -h; i < w + h; i += gridSize) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i + h * 0.5, h);
        ctx.stroke();
      }

      // Ambient glow
      const glow = ctx.createRadialGradient(w * 0.5, h * 0.4, 0, w * 0.5, h * 0.4, w * 0.5);
      glow.addColorStop(0, 'rgba(168, 85, 247, 0.02)');
      glow.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = glow; ctx.fillRect(0, 0, w, h);

      // Scanlines
      ctx.fillStyle = 'rgba(0,0,0,0.02)';
      for (let y = 0; y < h; y += 2) ctx.fillRect(0, y, w, 1);

      animId = requestAnimationFrame(draw);
    };

    resize(); draw();
    window.addEventListener('resize', () => { resize(); });
    return () => { cancelAnimationFrame(animId); };
  }, []);

  return <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }} />;
}

/* ═══════════════════════════════════════════════
   ISOMETRIC OFFICE SVG
   Each agent = a tiny 3D isometric room
   ═══════════════════════════════════════════════ */
function IsometricOffice({ agent, size }: { agent: Agent; size: number }) {
  const sm = STATUS_META[agent.status];
  const isWorking = agent.status === 'active';
  const isThinking = agent.status === 'ready';
  const isIdle = agent.status === 'idle';
  const isError = agent.status === 'error';

  // Isometric transform helpers
  // We'll draw in a flat coordinate space and use SVG transforms
  const s = size;
  const cx = s / 2;

  // Floor dimensions (iso projection)
  const fw = agent.zone === 'center' ? s * 0.85 : s * 0.75; // floor width
  const fh = fw * 0.5; // iso height ratio
  const floorY = s * 0.65; // where floor sits

  // Wall height
  const wallH = agent.zone === 'center' ? s * 0.45 : s * 0.35;

  // Colors based on status
  const floorColor = isWorking ? '#141428' : isThinking ? '#0f1528' : '#0c0c18';
  const wallColorL = isWorking ? '#1a1a35' : isThinking ? '#121830' : '#0e0e1e';
  const wallColorR = isWorking ? '#151530' : isThinking ? '#101528' : '#0d0d1a';
  const accentOpacity = isIdle ? 0.15 : isWorking ? 0.9 : isThinking ? 0.5 : isError ? 0.8 : 0.3;

  // Floor diamond points
  const fTop = { x: cx, y: floorY - fh / 2 };
  const fRight = { x: cx + fw / 2, y: floorY };
  const fBottom = { x: cx, y: floorY + fh / 2 };
  const fLeft = { x: cx - fw / 2, y: floorY };

  // Wall tops (extruded up from back two edges)
  const wTopLeft = { x: fLeft.x, y: fLeft.y - wallH };
  const wTopTop = { x: fTop.x, y: fTop.y - wallH };
  const wTopRight = { x: fRight.x, y: fRight.y - wallH };

  return (
    <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}>
      <defs>
        <filter id={`glow-${agent.id}`}><feGaussianBlur stdDeviation="3" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
        <filter id={`bigglow-${agent.id}`}><feGaussianBlur stdDeviation="6" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
      </defs>

      {/* ── Floor glow (status colored) ── */}
      <polygon points={`${fTop.x},${fTop.y} ${fRight.x},${fRight.y} ${fBottom.x},${fBottom.y} ${fLeft.x},${fLeft.y}`}
        fill={sm.bg} opacity={accentOpacity * 0.12} filter={`url(#bigglow-${agent.id})`} />

      {/* ── Left wall ── */}
      <polygon points={`${fLeft.x},${fLeft.y} ${fTop.x},${fTop.y} ${wTopTop.x},${wTopTop.y} ${wTopLeft.x},${wTopLeft.y}`}
        fill={wallColorL} stroke={agent.color} strokeWidth={isIdle ? 0.3 : 0.6} opacity={0.9} />

      {/* ── Right wall ── */}
      <polygon points={`${fTop.x},${fTop.y} ${fRight.x},${fRight.y} ${wTopRight.x},${wTopRight.y} ${wTopTop.x},${wTopTop.y}`}
        fill={wallColorR} stroke={agent.color} strokeWidth={isIdle ? 0.3 : 0.6} opacity={0.9} />

      {/* ── Floor ── */}
      <polygon points={`${fTop.x},${fTop.y} ${fRight.x},${fRight.y} ${fBottom.x},${fBottom.y} ${fLeft.x},${fLeft.y}`}
        fill={floorColor} stroke={agent.color} strokeWidth={isIdle ? 0.2 : 0.4} opacity={0.85} />

      {/* ── Wall accent line (top edge glows with status) ── */}
      {!isIdle && (
        <polyline points={`${wTopLeft.x},${wTopLeft.y} ${wTopTop.x},${wTopTop.y} ${wTopRight.x},${wTopRight.y}`}
          fill="none" stroke={sm.color} strokeWidth={isWorking ? 1.5 : 0.8} opacity={accentOpacity * 0.6}
          filter={`url(#glow-${agent.id})`}>
          {isWorking && <animate attributeName="opacity" values="0.3;0.8;0.3" dur="1.5s" repeatCount="indefinite" />}
          {isThinking && <animate attributeName="opacity" values="0.2;0.5;0.2" dur="3s" repeatCount="indefinite" />}
        </polyline>
      )}

      {/* ═══ FURNITURE — varies by office type ═══ */}

      {/* ── CORNER OFFICE (G) — Big desk, multiple screens, command chair ── */}
      {agent.office === 'corner' && (
        <g>
          {/* Large L-shaped desk — against back walls */}
          {/* Desk top (isometric rectangle along left wall) */}
          <polygon points={`${fLeft.x + fw * 0.08},${fLeft.y - fh * 0.15} ${fTop.x - fw * 0.05},${fTop.y + fh * 0.05} ${fTop.x - fw * 0.05},${fTop.y + fh * 0.05 - 5} ${fLeft.x + fw * 0.08},${fLeft.y - fh * 0.15 - 5}`}
            fill="#1e1e3a" stroke={agent.color} strokeWidth="0.3" opacity={0.8} />
          {/* Desk along right wall */}
          <polygon points={`${fTop.x + fw * 0.05},${fTop.y + fh * 0.05} ${fRight.x - fw * 0.08},${fRight.y - fh * 0.15} ${fRight.x - fw * 0.08},${fRight.y - fh * 0.15 - 5} ${fTop.x + fw * 0.05},${fTop.y + fh * 0.05 - 5}`}
            fill="#1a1a35" stroke={agent.color} strokeWidth="0.3" opacity={0.8} />

          {/* Triple monitors — on left desk */}
          {[-0.15, 0, 0.15].map((offset, i) => {
            const mx = fLeft.x + fw * 0.2 + offset * fw * 0.5;
            const my = fLeft.y - fh * 0.3 + offset * fh * 0.3 - wallH * 0.25;
            return (
              <g key={i}>
                <rect x={mx - 7} y={my - 9} width={14} height={10} rx={1}
                  fill={isWorking ? agent.glowColor : isThinking ? '#2040aa' : '#111125'}
                  stroke={agent.color} strokeWidth="0.3" opacity={isWorking ? 0.8 : isThinking ? 0.5 : 0.2}>
                  {isWorking && <animate attributeName="fill" values={`${agent.glowColor};#2a2060;${agent.glowColor}`} dur={`${2 + i * 0.3}s`} repeatCount="indefinite" />}
                </rect>
                {/* Screen glare */}
                {isWorking && <line x1={mx - 5} y1={my - 7} x2={mx - 2} y2={my - 7} stroke="#fff" strokeWidth="0.5" opacity={0.3} />}
              </g>
            );
          })}

          {/* Monitor on right desk */}
          {(() => {
            const mx = fTop.x + fw * 0.2;
            const my = fTop.y - wallH * 0.35;
            return (
              <rect x={mx - 8} y={my - 10} width={16} height={11} rx={1}
                fill={isWorking ? '#22c55e' : isThinking ? '#1e3a60' : '#111125'}
                stroke={agent.color} strokeWidth="0.3" opacity={isWorking ? 0.7 : 0.15}>
                {isWorking && <animate attributeName="opacity" values="0.4;0.8;0.4" dur="2s" repeatCount="indefinite" />}
              </rect>
            );
          })()}

          {/* Executive chair (circle at desk) */}
          <ellipse cx={cx} cy={floorY - 2} rx={6} ry={3} fill="#2a1a40" stroke={agent.color} strokeWidth="0.4" opacity={0.6} />

          {/* Coffee cup */}
          <rect x={fRight.x - fw * 0.25} y={fRight.y - fh * 0.25 - 8} width={4} height={5} rx={1}
            fill="#3a2a1a" stroke="#5a4a3a" strokeWidth="0.3" opacity={0.6} />
          {/* Steam from coffee (when active) */}
          {isWorking && [0, 1, 2].map((i) => (
            <line key={i} x1={fRight.x - fw * 0.25 + 2 + i} y1={fRight.y - fh * 0.25 - 10}
              x2={fRight.x - fw * 0.25 + 1.5 + i} y2={fRight.y - fh * 0.25 - 18}
              stroke="rgba(255,255,255,0.15)" strokeWidth="0.5" strokeLinecap="round">
              <animate attributeName="y2" values={`${fRight.y - fh * 0.25 - 15};${fRight.y - fh * 0.25 - 22};${fRight.y - fh * 0.25 - 15}`} dur={`${1.5 + i * 0.4}s`} repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.1;0.2;0.1" dur={`${1.5 + i * 0.4}s`} repeatCount="indefinite" />
            </line>
          ))}

          {/* Floating holographic displays (when active) */}
          {isWorking && (
            <g>
              <rect x={cx - 15} y={floorY - fh * 0.4 - wallH * 0.6} width={30} height={18} rx={2}
                fill="none" stroke={agent.glowColor} strokeWidth="0.5" opacity={0.3}
                strokeDasharray="2 2" filter={`url(#glow-${agent.id})`}>
                <animate attributeName="opacity" values="0.15;0.4;0.15" dur="3s" repeatCount="indefinite" />
              </rect>
              {/* Data lines inside hologram */}
              {[0, 1, 2, 3].map((i) => (
                <line key={i} x1={cx - 12} y1={floorY - fh * 0.4 - wallH * 0.6 + 4 + i * 4}
                  x2={cx - 12 + (10 + i * 5)} y2={floorY - fh * 0.4 - wallH * 0.6 + 4 + i * 4}
                  stroke={agent.glowColor} strokeWidth="1" opacity={0.2}>
                  <animate attributeName="x2" values={`${cx - 12 + 5};${cx - 12 + 15 + i * 3};${cx - 12 + 5}`} dur={`${1 + i * 0.3}s`} repeatCount="indefinite" />
                </line>
              ))}
            </g>
          )}
        </g>
      )}

      {/* ── WORKSTATION (Scout, workers) — Desk with dual monitors, holo-display ── */}
      {agent.office === 'workstation' && (
        <g>
          {/* Desk */}
          <polygon points={`${cx - fw * 0.25},${floorY - fh * 0.1} ${cx},${floorY - fh * 0.35} ${cx + fw * 0.25},${floorY - fh * 0.1} ${cx},${floorY + fh * 0.15}`}
            fill="#1a1a30" stroke={agent.color} strokeWidth="0.3" opacity={0.7} />
          {/* Two monitors */}
          {[-1, 1].map((side) => {
            const mx = cx + side * fw * 0.1;
            const my = floorY - fh * 0.3 - wallH * 0.15;
            return (
              <rect key={side} x={mx - 7} y={my - 8} width={14} height={9} rx={1}
                fill={isWorking ? agent.glowColor : isThinking ? '#1a3060' : '#111120'}
                stroke={agent.color} strokeWidth="0.3" opacity={isWorking ? 0.75 : isThinking ? 0.4 : 0.15}>
                {isWorking && <animate attributeName="opacity" values="0.4;0.8;0.4" dur={`${1.8 + side * 0.3}s`} repeatCount="indefinite" />}
              </rect>
            );
          })}
          {/* Chair */}
          <ellipse cx={cx} cy={floorY + fh * 0.05} rx={5} ry={2.5} fill="#1a1530" stroke={agent.color} strokeWidth="0.3" opacity={0.5} />
          {/* Holographic task display (when active/thinking) */}
          {(isWorking || isThinking) && (
            <rect x={cx - 12} y={floorY - fh * 0.5 - wallH * 0.4} width={24} height={14} rx={2}
              fill="none" stroke={sm.color} strokeWidth="0.5" opacity={0.25}
              strokeDasharray="2 2" filter={`url(#glow-${agent.id})`}>
              <animate attributeName="opacity" values="0.1;0.35;0.1" dur="3s" repeatCount="indefinite" />
            </rect>
          )}
          {/* Coffee */}
          <rect x={cx + fw * 0.15} y={floorY - fh * 0.15 - 6} width={3} height={4} rx={0.5} fill="#3a2a1a" opacity={0.5} />
          {isWorking && (
            <line x1={cx + fw * 0.15 + 1.5} y1={floorY - fh * 0.15 - 8}
              x2={cx + fw * 0.15 + 1.5} y2={floorY - fh * 0.15 - 14}
              stroke="rgba(255,255,255,0.12)" strokeWidth="0.5">
              <animate attributeName="y2" values={`${floorY - fh * 0.15 - 12};${floorY - fh * 0.15 - 18};${floorY - fh * 0.15 - 12}`} dur="2s" repeatCount="indefinite" />
            </line>
          )}
        </g>
      )}

      {/* ── LAB (Research) — Beakers, data screens, microscope ── */}
      {agent.office === 'lab' && (
        <g>
          {/* Lab bench */}
          <polygon points={`${cx - fw * 0.3},${floorY - fh * 0.05} ${cx},${floorY - fh * 0.35} ${cx + fw * 0.3},${floorY - fh * 0.05} ${cx},${floorY + fh * 0.25}`}
            fill="#151528" stroke={agent.color} strokeWidth="0.3" opacity={0.7} />
          {/* Microscope */}
          <line x1={cx - fw * 0.1} y1={floorY - fh * 0.2} x2={cx - fw * 0.1} y2={floorY - fh * 0.2 - 15}
            stroke={agent.color} strokeWidth="1.5" opacity={0.4} />
          <circle cx={cx - fw * 0.1} cy={floorY - fh * 0.2 - 16} r={3} fill="none" stroke={agent.color} strokeWidth="0.8" opacity={0.3} />
          {/* Beakers with colored liquid */}
          {[0, 1, 2].map((i) => {
            const bx = cx + fw * 0.05 + i * 8;
            const by = floorY - fh * 0.15 - 6;
            const fillColor = i === 0 ? '#22c55e' : i === 1 ? '#a855f7' : '#3b82f6';
            return (
              <g key={i}>
                <rect x={bx - 2} y={by} width={4} height={7} rx={0.5} fill="rgba(200,200,255,0.08)" stroke="rgba(200,200,255,0.15)" strokeWidth="0.3" />
                <rect x={bx - 1.5} y={by + 3} width={3} height={3.5} rx={0.3} fill={fillColor} opacity={isWorking ? 0.6 : 0.2}>
                  {isWorking && <animate attributeName="height" values="2;4;2" dur={`${1.5 + i * 0.5}s`} repeatCount="indefinite" />}
                </rect>
              </g>
            );
          })}
          {/* Monitor */}
          <rect x={cx - 8} y={floorY - fh * 0.3 - wallH * 0.2} width={16} height={10} rx={1}
            fill={isWorking ? agent.glowColor : '#111120'} stroke={agent.color} strokeWidth="0.3" opacity={isWorking ? 0.6 : 0.15} />
          {/* Floating data orbs */}
          {(isWorking || isThinking) && [0, 1].map((i) => (
            <circle key={i} cx={cx + (i === 0 ? -fw * 0.25 : fw * 0.25)} cy={floorY - wallH * 0.4 - i * 10}
              r={2.5} fill={agent.glowColor} opacity={0.3}>
              <animate attributeName="cy" values={`${floorY - wallH * 0.4 - i * 10};${floorY - wallH * 0.5 - i * 10};${floorY - wallH * 0.4 - i * 10}`}
                dur={`${2 + i}s`} repeatCount="indefinite" />
            </circle>
          ))}
        </g>
      )}

      {/* ── SECURITY (Ops Guardian) — Surveillance screens, alert lights ── */}
      {agent.office === 'security' && (
        <g>
          {/* Desk */}
          <polygon points={`${cx - fw * 0.25},${floorY - fh * 0.05} ${cx},${floorY - fh * 0.3} ${cx + fw * 0.25},${floorY - fh * 0.05} ${cx},${floorY + fh * 0.2}`}
            fill="#1a1018" stroke={agent.color} strokeWidth="0.3" opacity={0.7} />
          {/* Bank of surveillance monitors (4 small screens) */}
          {[0, 1, 2, 3].map((i) => {
            const col = i % 2; const row = Math.floor(i / 2);
            const mx = cx - 10 + col * 14;
            const my = floorY - fh * 0.35 - wallH * 0.15 + row * 10;
            return (
              <rect key={i} x={mx} y={my} width={10} height={7} rx={0.5}
                fill={isWorking ? (i === 1 ? '#ef4444' : '#22c55e') : '#111120'}
                stroke={agent.color} strokeWidth="0.3"
                opacity={isWorking ? 0.6 : 0.12}>
                {isWorking && <animate attributeName="opacity" values={`0.3;${0.5 + i * 0.1};0.3`} dur={`${1.5 + i * 0.4}s`} repeatCount="indefinite" />}
              </rect>
            );
          })}
          {/* Alert light on top of wall */}
          {(isWorking || isError) && (
            <circle cx={wTopTop.x} cy={wTopTop.y + 5} r={3}
              fill={isError ? '#ef4444' : sm.color} opacity={0.7}>
              <animate attributeName="opacity" values="0.3;0.9;0.3" dur={isError ? '0.5s' : '2s'} repeatCount="indefinite" />
              <animate attributeName="r" values="2;4;2" dur={isError ? '0.5s' : '2s'} repeatCount="indefinite" />
            </circle>
          )}
          {/* Chair */}
          <ellipse cx={cx} cy={floorY + fh * 0.08} rx={5} ry={2.5} fill="#1a1018" stroke={agent.color} strokeWidth="0.3" opacity={0.4} />
        </g>
      )}

      {/* ── ARCHIVE (Memory Curator) — File cabinets, glowing shelves ── */}
      {agent.office === 'archive' && (
        <g>
          {/* Reading desk */}
          <polygon points={`${cx - fw * 0.2},${floorY} ${cx},${floorY - fh * 0.2} ${cx + fw * 0.2},${floorY} ${cx},${floorY + fh * 0.2}`}
            fill="#1a1508" stroke={agent.color} strokeWidth="0.3" opacity={0.6} />
          {/* Shelf / cabinet against left wall */}
          {[0, 1, 2].map((i) => {
            const sy = wTopLeft.y + wallH * 0.2 + i * (wallH * 0.25);
            const sx = fLeft.x + fw * 0.12;
            return (
              <g key={i}>
                <line x1={sx} y1={sy} x2={sx + fw * 0.25} y2={sy - fh * 0.12}
                  stroke={agent.color} strokeWidth="0.5" opacity={0.3} />
                {/* Books on shelf */}
                {[0, 1, 2, 3].map((b) => (
                  <rect key={b} x={sx + 3 + b * 5} y={sy - 6 - (b * fh * 0.03)} width={3} height={5} rx={0.3}
                    fill={agent.glowColor} opacity={isWorking ? 0.4 : isThinking ? 0.25 : 0.08}>
                    {(isWorking || isThinking) && <animate attributeName="opacity" values="0.1;0.35;0.1" dur={`${2 + b * 0.5 + i}s`} repeatCount="indefinite" />}
                  </rect>
                ))}
              </g>
            );
          })}
          {/* Open book on desk */}
          <polygon points={`${cx - 5},${floorY - fh * 0.1} ${cx},${floorY - fh * 0.15} ${cx + 5},${floorY - fh * 0.1} ${cx},${floorY - fh * 0.05}`}
            fill={agent.glowColor} opacity={isWorking ? 0.3 : 0.1} />
          {/* Floating memory orb */}
          {(isWorking || isThinking) && (
            <circle cx={cx} cy={floorY - wallH * 0.5} r={4} fill={agent.glowColor} opacity={0.25} filter={`url(#glow-${agent.id})`}>
              <animate attributeName="cy" values={`${floorY - wallH * 0.45};${floorY - wallH * 0.6};${floorY - wallH * 0.45}`} dur="3s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.15;0.35;0.15" dur="3s" repeatCount="indefinite" />
            </circle>
          )}
        </g>
      )}

      {/* ── EXEC OFFICE — Boardroom chair, single large screen, nameplate ── */}
      {agent.office === 'exec' && (
        <g>
          {/* Sleek desk */}
          <polygon points={`${cx - fw * 0.2},${floorY - fh * 0.02} ${cx},${floorY - fh * 0.22} ${cx + fw * 0.2},${floorY - fh * 0.02} ${cx},${floorY + fh * 0.18}`}
            fill="#12121f" stroke={agent.color} strokeWidth="0.3" opacity={0.6} />
          {/* Large monitor */}
          <rect x={cx - 9} y={floorY - fh * 0.28 - wallH * 0.2} width={18} height={11} rx={1}
            fill={isWorking ? agent.glowColor : isThinking ? '#1a2545' : '#0e0e18'}
            stroke={agent.color} strokeWidth="0.3" opacity={isWorking ? 0.65 : isThinking ? 0.35 : 0.12}>
            {isWorking && <animate attributeName="opacity" values="0.3;0.7;0.3" dur="2s" repeatCount="indefinite" />}
          </rect>
          {/* Executive chair (larger) */}
          <ellipse cx={cx} cy={floorY + fh * 0.06} rx={5} ry={2.5} fill="#1a1530" stroke={agent.color} strokeWidth="0.3" opacity={0.4} />
          {/* Nameplate on desk */}
          <rect x={cx - 8} y={floorY - fh * 0.05} width={16} height={3} rx={0.5}
            fill={agent.color} opacity={0.2} />
          {/* Coffee/glass */}
          <rect x={cx + fw * 0.1} y={floorY - fh * 0.08 - 5} width={3} height={4} rx={0.5} fill="#1a2a3a" opacity={0.4} />
        </g>
      )}

      {/* ── ERROR alarm light (any office when error) ── */}
      {isError && (
        <g>
          <circle cx={cx + fw * 0.3} cy={floorY - wallH * 0.8} r={4} fill="#ef4444" opacity={0.8}>
            <animate attributeName="opacity" values="0.3;1;0.3" dur="0.5s" repeatCount="indefinite" />
            <animate attributeName="r" values="3;5;3" dur="0.5s" repeatCount="indefinite" />
          </circle>
          {/* Spinning light beam */}
          <line x1={cx + fw * 0.3} y1={floorY - wallH * 0.8}
            x2={cx + fw * 0.3 + 15} y2={floorY - wallH * 0.8}
            stroke="#ef4444" strokeWidth="1" opacity={0.3} filter={`url(#glow-${agent.id})`}>
            <animateTransform attributeName="transform" type="rotate"
              from={`0 ${cx + fw * 0.3} ${floorY - wallH * 0.8}`}
              to={`360 ${cx + fw * 0.3} ${floorY - wallH * 0.8}`}
              dur="1s" repeatCount="indefinite" />
          </line>
        </g>
      )}

      {/* ── Status bar at base ── */}
      <line x1={fLeft.x + 5} y1={fLeft.y} x2={fBottom.x} y2={fBottom.y}
        stroke={sm.bg} strokeWidth={isWorking ? 2 : 1} opacity={isWorking ? 0.7 : isThinking ? 0.4 : 0.1}>
        {isWorking && <animate attributeName="opacity" values="0.4;0.8;0.4" dur="1s" repeatCount="indefinite" />}
      </line>
    </svg>
  );
}

/* ═══════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════ */
export default function TheHive() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredAgent, setHoveredAgent] = useState<string | null>(null);
  const [agents, setAgents] = useState(AGENTS);
  const [dims, setDims] = useState({ w: 800, h: 600 });
  const [positions, setPositions] = useState<Record<string, { x: number; y: number }>>(() =>
    loadSavedLayout() || defaultPositions()
  );
  const [cam, setCam] = useState({ x: 0, y: 0, zoom: 1 });
  const [saved, setSaved] = useState(false);
  const dragRef = useRef<{ type: 'pan' | 'building'; id?: string; startX: number; startY: number; origX: number; origY: number } | null>(null);
  const touchRef = useRef<{ dist: number; zoom: number } | null>(null);

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

  // Demo activity
  useEffect(() => {
    const iv = setInterval(() => {
      setAgents((prev) => prev.map((a) => {
        if (Math.random() < 0.04) {
          const ss: AgentStatus[] = ['active', 'ready', 'idle'];
          const ns = a.id === 'g' ? 'active' : ss[Math.floor(Math.random() * ss.length)];
          return { ...a, status: ns, tasksToday: ns === 'active' ? a.tasksToday + 1 : a.tasksToday };
        }
        return a;
      }));
    }, 2500);
    return () => clearInterval(iv);
  }, []);

  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    setCam((c) => ({ ...c, zoom: Math.min(3, Math.max(0.3, c.zoom * (e.deltaY > 0 ? 0.9 : 1.1))) }));
  }, []);

  const onPointerDown = useCallback((e: React.PointerEvent, agentId?: string) => {
    e.stopPropagation();
    if (agentId) {
      const p = positions[agentId];
      dragRef.current = { type: 'building', id: agentId, startX: e.clientX, startY: e.clientY, origX: p.x, origY: p.y };
    } else {
      dragRef.current = { type: 'pan', startX: e.clientX, startY: e.clientY, origX: cam.x, origY: cam.y };
    }
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  }, [positions, cam]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d) return;
    const dx = e.clientX - d.startX, dy = e.clientY - d.startY;
    if (d.type === 'pan') setCam((c) => ({ ...c, x: d.origX + dx, y: d.origY + dy }));
    else if (d.id) setPositions((p) => ({ ...p, [d.id!]: { x: d.origX + dx / cam.zoom, y: d.origY + dy / cam.zoom } }));
  }, [cam.zoom]);

  const onPointerUp = useCallback(() => { dragRef.current = null; }, []);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      touchRef.current = { dist: Math.sqrt(dx * dx + dy * dy), zoom: cam.zoom };
    }
  }, [cam.zoom]);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2 && touchRef.current) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      setCam((c) => ({ ...c, zoom: Math.min(3, Math.max(0.3, touchRef.current!.zoom * (dist / touchRef.current!.dist))) }));
    }
  }, []);

  const saveLayout = useCallback(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(positions)); setSaved(true); setTimeout(() => setSaved(false), 2000); } catch {}
  }, [positions]);

  const resetLayout = useCallback(() => {
    setPositions(defaultPositions()); setCam({ x: 0, y: 0, zoom: 1 });
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
  }, []);

  const screenPos = useCallback((id: string) => {
    const p = positions[id];
    if (!p) return { x: 0, y: 0 };
    return { x: dims.w / 2 + p.x * cam.zoom + cam.x, y: dims.h / 2 + p.y * cam.zoom + cam.y };
  }, [positions, cam, dims]);

  const bldgSize = (zone: string) => zone === 'center' ? 160 : zone === 'inner' ? 120 : 95;
  const hoveredData = hoveredAgent ? agents.find((a) => a.id === hoveredAgent) : null;

  return (
    <div ref={containerRef}
      style={{ width: '100%', height: '100%', background: '#07070d', position: 'relative', overflow: 'hidden', borderRadius: 14, cursor: 'grab', touchAction: 'none' }}
      onWheel={onWheel} onPointerDown={(e) => onPointerDown(e)} onPointerMove={onPointerMove} onPointerUp={onPointerUp}
      onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={() => { touchRef.current = null; }}
    >
      <GridCanvas />

      {/* Header */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', padding: '8px 12px', zIndex: 20, flexWrap: 'wrap', gap: 6,
        background: 'linear-gradient(to bottom, rgba(7,7,13,0.92), rgba(7,7,13,0))',
      }}>
        <div>
          <div style={{ fontFamily: M, fontSize: 13, fontWeight: 900, letterSpacing: '0.25em', color: '#a855f7', textShadow: '0 0 20px rgba(168,85,247,0.5)' }}>THE HIVE</div>
          <div style={{ fontFamily: M, fontSize: 7, color: 'rgba(255,255,255,0.2)', letterSpacing: '0.15em' }}>ISOMETRIC HQ</div>
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {[
            { l: '⚡ WORKING', c: agents.filter((a) => a.status === 'active').length, color: '#22c55e' },
            { l: '💭 THINKING', c: agents.filter((a) => a.status === 'ready').length, color: '#3b82f6' },
            { l: '💤 IDLE', c: agents.filter((a) => a.status === 'idle').length, color: '#6b7280' },
          ].map((s) => (
            <div key={s.l} style={{
              display: 'flex', alignItems: 'center', gap: 4, fontFamily: M, fontSize: 9, fontWeight: 700, color: s.color,
              background: `${s.color}15`, border: `1px solid ${s.color}33`, borderRadius: 5, padding: '2px 7px',
            }}>
              <div style={{ width: 5, height: 5, borderRadius: '50%', background: s.color, boxShadow: `0 0 4px ${s.color}` }} />
              {s.c} {s.l}
            </div>
          ))}
          <div style={{ fontFamily: M, fontSize: 9, fontWeight: 700, color: '#a855f7', background: 'rgba(168,85,247,0.1)', border: '1px solid rgba(168,85,247,0.2)', borderRadius: 5, padding: '2px 7px' }}>
            ⚡ {agents.reduce((sum, a) => sum + a.tasksToday, 0)}
          </div>
        </div>
      </div>

      {/* Controls */}
      <div style={{ position: 'absolute', bottom: 10, right: 10, zIndex: 20, display: 'flex', gap: 6 }}>
        <button onClick={() => setCam((c) => ({ ...c, zoom: Math.min(3, c.zoom * 1.2) }))} style={ctrlBtn}>+</button>
        <button onClick={() => setCam((c) => ({ ...c, zoom: Math.max(0.3, c.zoom * 0.8) }))} style={ctrlBtn}>−</button>
        <button onClick={resetLayout} style={ctrlBtn}>↺</button>
        <button onClick={saveLayout} style={{ ...ctrlBtn, ...(saved ? { background: 'rgba(34,197,94,0.3)', borderColor: '#22c55e', color: '#22c55e' } : {}) }}>
          {saved ? '✓ SAVED' : '💾 SAVE'}
        </button>
      </div>
      <div style={{ position: 'absolute', bottom: 12, left: 12, fontFamily: M, fontSize: 9, color: 'rgba(255,255,255,0.2)', zIndex: 20 }}>
        {Math.round(cam.zoom * 100)}%
      </div>

      {/* Connection lines SVG */}
      <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 2 }}>
        {CONNECTIONS.map((conn) => {
          const f = screenPos(conn.from), t = screenPos(conn.to);
          const a = agents.find((ag) => ag.id === conn.from);
          const c = a?.glowColor || '#a855f7';
          if (!conn.active) return <line key={`${conn.from}-${conn.to}`} x1={f.x} y1={f.y} x2={t.x} y2={t.y} stroke="rgba(255,255,255,0.03)" strokeWidth="0.5" strokeDasharray="4 12" />;
          return (
            <g key={`${conn.from}-${conn.to}`}>
              <line x1={f.x} y1={f.y} x2={t.x} y2={t.y} stroke={c} strokeWidth="3" opacity={0.05} />
              <line x1={f.x} y1={f.y} x2={t.x} y2={t.y} stroke={c} strokeWidth="1" opacity={0.25} strokeDasharray="6 4">
                <animate attributeName="strokeDashoffset" values="0;-20" dur="1s" repeatCount="indefinite" />
              </line>
              <circle r="2.5" fill={c} opacity={0.7}>
                <animate attributeName="cx" values={`${f.x};${t.x}`} dur="2s" repeatCount="indefinite" />
                <animate attributeName="cy" values={`${f.y};${t.y}`} dur="2s" repeatCount="indefinite" />
              </circle>
            </g>
          );
        })}
      </svg>

      {/* Transformed building layer */}
      <div style={{
        position: 'absolute', inset: 0,
        transform: `translate(${cam.x}px, ${cam.y}px) scale(${cam.zoom})`,
        transformOrigin: `${dims.w / 2}px ${dims.h / 2}px`,
        zIndex: 5,
      }}>
        {agents.map((agent) => {
          const pos = positions[agent.id];
          if (!pos) return null;
          const sz = bldgSize(agent.zone);
          const sm = STATUS_META[agent.status];
          const isIdle = agent.status === 'idle';
          return (
            <div key={agent.id}
              style={{
                position: 'absolute',
                left: dims.w / 2 + pos.x - sz / 2,
                top: dims.h / 2 + pos.y - sz / 2,
                cursor: 'grab', opacity: isIdle ? 0.35 : 1,
                transition: 'opacity 0.5s ease',
                zIndex: agent.zone === 'center' ? 10 : agent.zone === 'inner' ? 5 : 4,
              }}
              onPointerDown={(e) => { e.stopPropagation(); onPointerDown(e, agent.id); }}
              onMouseEnter={() => setHoveredAgent(agent.id)}
              onMouseLeave={() => setHoveredAgent(null)}
            >
              <IsometricOffice agent={agent} size={sz} />
              {/* Label + status */}
              <div style={{
                position: 'absolute', bottom: -2, left: '50%', transform: 'translateX(-50%)',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, pointerEvents: 'none',
              }}>
                <div style={{
                  fontFamily: M, fontSize: agent.zone === 'center' ? 12 : agent.zone === 'inner' ? 10 : 9,
                  fontWeight: 900, color: '#fff', textShadow: `0 0 10px ${agent.color}88, 0 1px 4px rgba(0,0,0,0.9)`,
                  letterSpacing: '0.08em', whiteSpace: 'nowrap',
                }}>{agent.emoji} {agent.name}</div>
                <div style={{ fontFamily: M, fontSize: agent.zone === 'center' ? 8 : 7, color: agent.color, opacity: 0.7, whiteSpace: 'nowrap' }}>
                  {agent.role.toUpperCase()}
                </div>
                <div style={{
                  fontFamily: M, fontSize: agent.zone === 'center' ? 9 : 7, fontWeight: 800,
                  color: sm.color, background: `${sm.bg}18`, border: `1px solid ${sm.bg}55`,
                  borderRadius: 4, padding: '1px 8px', whiteSpace: 'nowrap',
                  boxShadow: agent.status === 'active' ? `0 0 8px ${sm.bg}44` : agent.status === 'ready' ? `0 0 6px ${sm.bg}22` : 'none',
                  animation: agent.status === 'active' ? 'statusPulse 1.5s ease-in-out infinite' : agent.status === 'ready' ? 'statusBreathe 3s ease-in-out infinite' : undefined,
                }}>{sm.label}</div>
              </div>
              {agent.tasksToday > 0 && (
                <div style={{
                  position: 'absolute', top: 4, right: 4, fontFamily: M, fontSize: 8, fontWeight: 800,
                  color: '#fff', background: `${agent.color}bb`, borderRadius: 4, padding: '1px 4px',
                  boxShadow: `0 0 6px ${agent.color}44`, pointerEvents: 'none',
                }}>{agent.tasksToday}</div>
              )}
            </div>
          );
        })}
      </div>

      {/* Hover tooltip */}
      {hoveredData && (
        <div style={{
          position: 'absolute', bottom: 50, left: '50%', transform: 'translateX(-50%)',
          background: 'rgba(8,8,18,0.95)', border: `1px solid ${hoveredData.color}33`,
          borderRadius: 10, minWidth: 280, zIndex: 100, backdropFilter: 'blur(12px)',
          boxShadow: `0 0 30px ${hoveredData.color}15, 0 8px 30px rgba(0,0,0,0.6)`,
        }}>
          <div style={{ height: 2, background: `linear-gradient(90deg, transparent, ${hoveredData.color}, transparent)`, borderRadius: '10px 10px 0 0' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px', borderBottom: `1px solid ${hoveredData.color}18` }}>
            <span style={{ fontSize: 24 }}>{hoveredData.emoji}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: M, fontSize: 13, fontWeight: 800, color: '#fff' }}>{hoveredData.name}</div>
              <div style={{ fontFamily: M, fontSize: 8, color: hoveredData.color, letterSpacing: '0.1em' }}>{hoveredData.role.toUpperCase()}</div>
            </div>
            <div style={{
              fontFamily: M, fontSize: 9, fontWeight: 800, color: STATUS_META[hoveredData.status].color,
              background: `${STATUS_META[hoveredData.status].bg}18`, border: `1px solid ${STATUS_META[hoveredData.status].bg}44`,
              borderRadius: 4, padding: '2px 8px',
            }}>{STATUS_META[hoveredData.status].label}</div>
          </div>
          <div style={{ padding: '6px 14px 10px' }}>
            <div style={{ fontFamily: M, fontSize: 10, color: 'rgba(255,255,255,0.4)', marginBottom: 2 }}>
              <span style={{ color: 'rgba(255,255,255,0.2)' }}>MODEL </span>{hoveredData.model}
            </div>
            <div style={{ fontFamily: M, fontSize: 10, color: 'rgba(255,255,255,0.4)', marginBottom: 2 }}>
              <span style={{ color: 'rgba(255,255,255,0.2)' }}>TASKS </span><span style={{ color: '#a855f7', fontWeight: 700 }}>{hoveredData.tasksToday}</span>
            </div>
            <div style={{ fontFamily: M, fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>
              <span style={{ color: 'rgba(255,255,255,0.2)' }}>LAST </span>{hoveredData.lastAction}
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes statusPulse { 0%, 100% { opacity: 0.7; } 50% { opacity: 1; box-shadow: 0 0 12px currentColor; } }
        @keyframes statusBreathe { 0%, 100% { opacity: 0.5; } 50% { opacity: 0.8; } }
      `}</style>
    </div>
  );
}

const ctrlBtn: React.CSSProperties = {
  fontFamily: M, fontSize: 11, fontWeight: 700, color: '#a855f7',
  background: 'rgba(168,85,247,0.1)', border: '1px solid rgba(168,85,247,0.3)',
  borderRadius: 6, padding: '4px 10px', cursor: 'pointer', backdropFilter: 'blur(8px)',
};
