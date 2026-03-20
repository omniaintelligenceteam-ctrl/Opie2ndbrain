'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

/* ═══════════════════════════════════════════════════════════════
   THE HIVE — Cyberpunk City Command Center
   Pan / Zoom / Drag buildings / Save layout to localStorage
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
const STORAGE_KEY = 'hive-layout-v1';

const STATUS_META: Record<AgentStatus, { label: string; color: string; bg: string }> = {
  active:    { label: '⚡ WORKING',  color: '#22c55e', bg: '#22c55e' },
  ready:     { label: '💭 THINKING', color: '#3b82f6', bg: '#3b82f6' },
  idle:      { label: '💤 IDLE',     color: '#6b7280', bg: '#4b5563' },
  error:     { label: '🔴 ERROR',    color: '#ef4444', bg: '#ef4444' },
  completed: { label: '✅ DONE',     color: '#f59e0b', bg: '#f59e0b' },
};

/* ── Default positions (in world coordinates, center = 0,0) ── */
function defaultPositions(): Record<string, { x: number; y: number }> {
  const pos: Record<string, { x: number; y: number }> = {};
  pos['g'] = { x: 0, y: 0 };
  const inner = AGENTS.filter((a) => a.zone === 'inner');
  inner.forEach((a, i) => {
    const angle = Math.PI + (Math.PI / (inner.length + 1)) * (i + 1);
    pos[a.id] = { x: Math.cos(angle) * 220, y: Math.sin(angle) * 160 };
  });
  const outer = AGENTS.filter((a) => a.zone === 'outer');
  outer.forEach((a, i) => {
    const totalAngle = Math.PI * 1.2;
    const startAngle = -Math.PI * 0.1;
    const angle = startAngle + (totalAngle / (outer.length - 1)) * i;
    pos[a.id] = { x: Math.cos(angle) * 380, y: Math.sin(angle) * 220 + 50 };
  });
  return pos;
}

function loadSavedLayout(): Record<string, { x: number; y: number }> | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
}

/* ── Rain Canvas ── */
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
        drops.push({ x: Math.random() * w, y: Math.random() * h, speed: 2 + Math.random() * 4, len: 8 + Math.random() * 18, alpha: 0.05 + Math.random() * 0.12 });
      }
    };

    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      const sky = ctx.createLinearGradient(0, 0, 0, h);
      sky.addColorStop(0, '#06060e'); sky.addColorStop(0.5, '#0a0a18'); sky.addColorStop(1, '#0e0e1e');
      ctx.fillStyle = sky; ctx.fillRect(0, 0, w, h);

      const amb = ctx.createRadialGradient(w * 0.5, h, 0, w * 0.5, h, h * 0.7);
      amb.addColorStop(0, 'rgba(168,85,247,0.04)'); amb.addColorStop(0.5, 'rgba(236,72,153,0.02)'); amb.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = amb; ctx.fillRect(0, 0, w, h);

      for (const d of drops) {
        d.y += d.speed;
        if (d.y > h) { d.y = -d.len; d.x = Math.random() * w; }
        ctx.strokeStyle = `rgba(140,160,255,${d.alpha})`; ctx.lineWidth = 0.5;
        ctx.beginPath(); ctx.moveTo(d.x, d.y); ctx.lineTo(d.x - 0.5, d.y + d.len); ctx.stroke();
      }

      ctx.fillStyle = 'rgba(0,0,0,0.03)';
      for (let y = 0; y < h; y += 2) ctx.fillRect(0, y, w, 1);

      animId = requestAnimationFrame(draw);
    };

    init(); draw();
    window.addEventListener('resize', init);
    return () => { cancelAnimationFrame(animId); window.removeEventListener('resize', init); };
  }, []);

  return <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }} />;
}

/* ── Building SVG ── */
function BuildingSvg({ agent, size }: { agent: Agent; size: number }) {
  const sm = STATUS_META[agent.status];
  const isWorking = agent.status === 'active';
  const isThinking = agent.status === 'ready';
  const isIdle = agent.status === 'idle';

  const bW = size * 0.7;
  const bH = agent.zone === 'center' ? size * 1.2 : agent.zone === 'inner' ? size * 0.9 : size * 0.7;
  const baseY = size * 0.8;
  const neonIntensity = isWorking ? 1 : isThinking ? 0.6 : 0.1;
  const windowGlow = isWorking ? agent.glowColor : isThinking ? '#60a5fa' : '#1a1a2e';

  const rows = agent.zone === 'center' ? 6 : agent.zone === 'inner' ? 4 : 3;
  const cols = agent.zone === 'center' ? 4 : 3;
  const wW = bW * 0.12; const wH = bH * 0.06;
  const gapX = (bW - cols * wW) / (cols + 1);
  const gapY = (bH * 0.7) / (rows + 1);
  const startX = (size - bW) / 2;
  const startY = baseY - bH + bH * 0.15;

  return (
    <svg width={size} height={size * 1.4} viewBox={`0 0 ${size} ${size * 1.4}`}>
      <defs>
        <filter id={`n-${agent.id}`}><feGaussianBlur stdDeviation="3" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
        <filter id={`bg-${agent.id}`}><feGaussianBlur stdDeviation="8" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
      </defs>

      <ellipse cx={size / 2} cy={baseY + bH * 0.05} rx={bW * 0.6} ry={4} fill={agent.color} opacity={neonIntensity * 0.15} filter={`url(#bg-${agent.id})`} />

      <rect x={(size - bW) / 2} y={baseY - bH} width={bW} height={bH} rx={2} fill="#0c0c1a"
        stroke={isIdle ? '#1a1a2e' : agent.color} strokeWidth={isWorking ? 1.5 : 0.5} opacity={0.9} />

      {!isIdle && (
        <>
          <line x1={(size - bW) / 2} y1={baseY - bH} x2={(size - bW) / 2} y2={baseY}
            stroke={sm.color} strokeWidth={isWorking ? 2 : 1} opacity={neonIntensity * 0.7} filter={`url(#n-${agent.id})`}>
            {isWorking && <animate attributeName="opacity" values="0.4;0.9;0.4" dur="1.5s" repeatCount="indefinite" />}
            {isThinking && <animate attributeName="opacity" values="0.3;0.6;0.3" dur="3s" repeatCount="indefinite" />}
          </line>
          <line x1={(size + bW) / 2} y1={baseY - bH} x2={(size + bW) / 2} y2={baseY}
            stroke={sm.color} strokeWidth={isWorking ? 2 : 1} opacity={neonIntensity * 0.7} filter={`url(#n-${agent.id})`}>
            {isWorking && <animate attributeName="opacity" values="0.4;0.9;0.4" dur="1.5s" repeatCount="indefinite" />}
            {isThinking && <animate attributeName="opacity" values="0.3;0.6;0.3" dur="3s" repeatCount="indefinite" />}
          </line>
        </>
      )}

      {agent.zone === 'center' && (
        <>
          <line x1={size / 2} y1={baseY - bH - 15} x2={size / 2} y2={baseY - bH} stroke={agent.color} strokeWidth="1.5" opacity={0.6} />
          <circle cx={size / 2} cy={baseY - bH - 18} r={3} fill={sm.color} opacity={0.8} filter={`url(#n-${agent.id})`}>
            {isWorking && <><animate attributeName="r" values="2;5;2" dur="1.5s" repeatCount="indefinite" /><animate attributeName="opacity" values="0.5;1;0.5" dur="1.5s" repeatCount="indefinite" /></>}
          </circle>
        </>
      )}

      {agent.building === 'radar' && (
        <g>
          <line x1={size / 2} y1={baseY - bH - 8} x2={size / 2} y2={baseY - bH} stroke={agent.color} strokeWidth="1" opacity={0.5} />
          <path d={`M${size / 2 - 8},${baseY - bH - 6} Q${size / 2},${baseY - bH - 14} ${size / 2 + 8},${baseY - bH - 6}`} fill="none" stroke={agent.color} strokeWidth="1.5" opacity={0.5} />
          {(isWorking || isThinking) && (
            <circle cx={size / 2} cy={baseY - bH - 10} r="2" fill={sm.color} opacity={0.6}>
              <animate attributeName="r" values="1;4;1" dur="2s" repeatCount="indefinite" />
            </circle>
          )}
        </g>
      )}

      {agent.building === 'shield' && (
        <path d={`M${size / 2},${baseY - bH + 10} L${size / 2 + 10},${baseY - bH + 18} L${size / 2 + 8},${baseY - bH + 30} L${size / 2},${baseY - bH + 34} L${size / 2 - 8},${baseY - bH + 30} L${size / 2 - 10},${baseY - bH + 18}Z`}
          fill="none" stroke={sm.color} strokeWidth="1.2" opacity={neonIntensity * 0.6} filter={`url(#n-${agent.id})`}>
          {isWorking && <animate attributeName="opacity" values="0.3;0.8;0.3" dur="2s" repeatCount="indefinite" />}
        </path>
      )}

      {agent.building === 'lab' && (
        <g>
          <circle cx={size / 2 - 12} cy={baseY - bH + 15} r="5" fill="none" stroke={agent.color} strokeWidth="0.8" opacity={0.3} />
          <circle cx={size / 2 + 12} cy={baseY - bH + 12} r="4" fill="none" stroke={agent.color} strokeWidth="0.8" opacity={0.25} />
          {(isWorking || isThinking) && (
            <circle cx={size / 2} cy={baseY - bH - 5} r="2" fill={agent.glowColor} opacity={0.4}>
              <animate attributeName="cy" values={`${baseY - bH - 3};${baseY - bH - 10};${baseY - bH - 3}`} dur="3s" repeatCount="indefinite" />
            </circle>
          )}
        </g>
      )}

      {agent.building === 'archive' && (
        <g>
          {[0, 1, 2].map((i) => (
            <rect key={i} x={size / 2 - 8 + i * 5} y={baseY - bH + 8 + i * 3} width="4" height="10" rx="0.5" fill={agent.glowColor}
              opacity={0.15 + ((isThinking || isWorking) ? 0.15 : 0)} transform={`rotate(${-5 + i * 5} ${size / 2} ${baseY - bH + 15})`}>
              {(isWorking || isThinking) && <animate attributeName="opacity" values="0.15;0.35;0.15" dur={`${2 + i * 0.5}s`} repeatCount="indefinite" />}
            </rect>
          ))}
        </g>
      )}

      {/* Windows */}
      {Array.from({ length: rows * cols }, (_, idx) => {
        const row = Math.floor(idx / cols), col = idx % cols;
        const wx = startX + gapX + col * (wW + gapX);
        const wy = startY + gapY + row * (wH + gapY);
        const lit = isWorking ? Math.random() > 0.2 : isThinking ? Math.random() > 0.5 : Math.random() > 0.85;
        return (
          <rect key={idx} x={wx} y={wy} width={wW} height={wH} rx={0.5}
            fill={lit ? windowGlow : '#0a0a15'}
            opacity={lit ? (isWorking ? 0.7 : isThinking ? 0.4 : 0.15) : 0.3}>
            {isWorking && lit && <animate attributeName="opacity" values={`${0.3 + Math.random() * 0.3};${0.6 + Math.random() * 0.4};${0.3 + Math.random() * 0.3}`} dur={`${1.5 + Math.random() * 2}s`} repeatCount="indefinite" />}
          </rect>
        );
      })}

      <text x={size / 2} y={baseY - bH + bH * 0.5} textAnchor="middle" fontFamily={M}
        fontSize={agent.zone === 'center' ? 9 : 7} fontWeight="900" letterSpacing="0.1em"
        fill={agent.color} opacity={neonIntensity * 0.8 + 0.2}
        filter={!isIdle ? `url(#n-${agent.id})` : undefined}>{agent.emoji}</text>

      <rect x={(size - bW) / 2} y={baseY - 3} width={bW} height={3} rx={1} fill={sm.bg}
        opacity={isWorking ? 0.9 : isThinking ? 0.5 : 0.15}>
        {isWorking && <animate attributeName="opacity" values="0.5;1;0.5" dur="1s" repeatCount="indefinite" />}
        {isThinking && <animate attributeName="opacity" values="0.25;0.55;0.25" dur="3s" repeatCount="indefinite" />}
      </rect>

      {isWorking && [0, 1, 2].map((i) => {
        const sx = (size - bW) / 2 + bW * 0.2 + i * bW * 0.3;
        return (
          <line key={i} x1={sx} y1={baseY - bH - 3} x2={sx} y2={baseY - bH - 15 - i * 5}
            stroke={sm.color} strokeWidth="0.8" strokeDasharray="2 3" opacity={0.4}>
            <animate attributeName="strokeDashoffset" values="0;-10" dur={`${0.8 + i * 0.3}s`} repeatCount="indefinite" />
          </line>
        );
      })}

      {isThinking && [0, 1, 2].map((i) => (
        <circle key={i} cx={size / 2 + (i - 1) * 12} cy={baseY - bH - 8} r={1.5} fill={sm.color} opacity={0.4}>
          <animate attributeName="cy" values={`${baseY - bH - 5};${baseY - bH - 15};${baseY - bH - 5}`} dur={`${2 + i * 0.7}s`} repeatCount="indefinite" />
        </circle>
      ))}
    </svg>
  );
}

/* ── Main Component ── */
export default function TheHive() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredAgent, setHoveredAgent] = useState<string | null>(null);
  const [agents, setAgents] = useState(AGENTS);
  const [dims, setDims] = useState({ w: 800, h: 600 });

  // World-space positions for each agent building
  const [positions, setPositions] = useState<Record<string, { x: number; y: number }>>(() => {
    return loadSavedLayout() || defaultPositions();
  });

  // Camera: pan offset + zoom
  const [cam, setCam] = useState({ x: 0, y: 0, zoom: 1 });
  const [saved, setSaved] = useState(false);

  // Drag state
  const dragRef = useRef<{
    type: 'pan' | 'building';
    id?: string;
    startX: number; startY: number;
    origX: number; origY: number;
  } | null>(null);

  // Touch zoom state
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

  // Demo activity simulation
  useEffect(() => {
    const iv = setInterval(() => {
      setAgents((prev) =>
        prev.map((a) => {
          if (Math.random() < 0.04) {
            const statuses: AgentStatus[] = ['active', 'ready', 'idle'];
            const ns = a.id === 'g' ? 'active' : statuses[Math.floor(Math.random() * statuses.length)];
            return { ...a, status: ns, tasksToday: ns === 'active' ? a.tasksToday + 1 : a.tasksToday };
          }
          return a;
        }),
      );
    }, 2500);
    return () => clearInterval(iv);
  }, []);

  // Wheel zoom
  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setCam((c) => ({ ...c, zoom: Math.min(3, Math.max(0.3, c.zoom * delta)) }));
  }, []);

  // Mouse down — decide: pan (background) or drag (building)
  const onPointerDown = useCallback((e: React.PointerEvent, agentId?: string) => {
    e.stopPropagation();
    if (agentId) {
      const pos = positions[agentId];
      dragRef.current = { type: 'building', id: agentId, startX: e.clientX, startY: e.clientY, origX: pos.x, origY: pos.y };
    } else {
      dragRef.current = { type: 'pan', startX: e.clientX, startY: e.clientY, origX: cam.x, origY: cam.y };
    }
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  }, [positions, cam]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d) return;
    const dx = e.clientX - d.startX;
    const dy = e.clientY - d.startY;

    if (d.type === 'pan') {
      setCam((c) => ({ ...c, x: d.origX + dx, y: d.origY + dy }));
    } else if (d.type === 'building' && d.id) {
      setPositions((prev) => ({
        ...prev,
        [d.id!]: { x: d.origX + dx / cam.zoom, y: d.origY + dy / cam.zoom },
      }));
    }
  }, [cam.zoom]);

  const onPointerUp = useCallback(() => { dragRef.current = null; }, []);

  // Touch pinch zoom
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
      const newZoom = touchRef.current.zoom * (dist / touchRef.current.dist);
      setCam((c) => ({ ...c, zoom: Math.min(3, Math.max(0.3, newZoom)) }));
    }
  }, []);

  const onTouchEnd = useCallback(() => { touchRef.current = null; }, []);

  // Save layout
  const saveLayout = useCallback(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(positions)); setSaved(true); setTimeout(() => setSaved(false), 2000); } catch {}
  }, [positions]);

  // Reset layout
  const resetLayout = useCallback(() => {
    const def = defaultPositions();
    setPositions(def);
    setCam({ x: 0, y: 0, zoom: 1 });
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
  }, []);

  // Sizing
  const bldgSize = (zone: string) => zone === 'center' ? 130 : zone === 'inner' ? 100 : 75;

  const hoveredData = hoveredAgent ? agents.find((a) => a.id === hoveredAgent) : null;

  // Screen position for connections
  const screenPos = useCallback((id: string) => {
    const p = positions[id];
    if (!p) return { x: 0, y: 0 };
    return { x: dims.w / 2 + (p.x * cam.zoom) + cam.x, y: dims.h / 2 + (p.y * cam.zoom) + cam.y };
  }, [positions, cam, dims]);

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height: '100%', background: '#07070d', position: 'relative', overflow: 'hidden', borderRadius: 14, cursor: dragRef.current ? 'grabbing' : 'grab', touchAction: 'none' }}
      onWheel={onWheel}
      onPointerDown={(e) => onPointerDown(e)}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      <CityCanvas />

      {/* Header */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '8px 12px', zIndex: 20, flexWrap: 'wrap', gap: 6,
        background: 'linear-gradient(to bottom, rgba(7,7,13,0.9), rgba(7,7,13,0))',
      }}>
        <div>
          <div style={{ fontFamily: M, fontSize: 13, fontWeight: 900, letterSpacing: '0.25em', color: '#a855f7', textShadow: '0 0 20px rgba(168,85,247,0.5)' }}>THE HIVE</div>
          <div style={{ fontFamily: M, fontSize: 7, color: 'rgba(255,255,255,0.2)', letterSpacing: '0.2em' }}>NEON DISTRICT</div>
        </div>

        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {[
            { label: '⚡', count: agents.filter((a) => a.status === 'active').length, color: '#22c55e' },
            { label: '💭', count: agents.filter((a) => a.status === 'ready').length, color: '#3b82f6' },
            { label: '💤', count: agents.filter((a) => a.status === 'idle').length, color: '#6b7280' },
          ].map((s) => (
            <div key={s.label} style={{
              display: 'flex', alignItems: 'center', gap: 4, fontFamily: M, fontSize: 9, fontWeight: 700, color: s.color,
              background: `${s.color}15`, border: `1px solid ${s.color}33`, borderRadius: 5, padding: '2px 7px',
            }}>
              <div style={{ width: 5, height: 5, borderRadius: '50%', background: s.color, boxShadow: `0 0 4px ${s.color}` }} />
              {s.count} {s.label}
            </div>
          ))}
          <div style={{ fontFamily: M, fontSize: 9, fontWeight: 700, color: '#a855f7', background: 'rgba(168,85,247,0.1)', border: '1px solid rgba(168,85,247,0.2)', borderRadius: 5, padding: '2px 7px' }}>
            ⚡ {agents.reduce((sum, a) => sum + a.tasksToday, 0)}
          </div>
        </div>
      </div>

      {/* Controls: save, reset, zoom */}
      <div style={{
        position: 'absolute', bottom: 10, right: 10, zIndex: 20,
        display: 'flex', gap: 6,
      }}>
        <button onClick={() => setCam((c) => ({ ...c, zoom: Math.min(3, c.zoom * 1.2) }))} style={ctrlBtn}>+</button>
        <button onClick={() => setCam((c) => ({ ...c, zoom: Math.max(0.3, c.zoom * 0.8) }))} style={ctrlBtn}>−</button>
        <button onClick={resetLayout} style={ctrlBtn} title="Reset positions">↺</button>
        <button onClick={saveLayout} style={{ ...ctrlBtn, ...(saved ? { background: 'rgba(34,197,94,0.3)', borderColor: '#22c55e', color: '#22c55e' } : {}) }} title="Save layout">
          {saved ? '✓ SAVED' : '💾 SAVE'}
        </button>
      </div>

      {/* Zoom indicator */}
      <div style={{ position: 'absolute', bottom: 12, left: 12, fontFamily: M, fontSize: 9, color: 'rgba(255,255,255,0.2)', zIndex: 20 }}>
        {Math.round(cam.zoom * 100)}%
      </div>

      {/* Data highways SVG */}
      <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 2 }}>
        {CONNECTIONS.map((conn) => {
          const from = screenPos(conn.from);
          const to = screenPos(conn.to);
          const fromAgent = agents.find((a) => a.id === conn.from);
          const c = fromAgent?.glowColor || '#a855f7';

          if (!conn.active) {
            return <line key={`${conn.from}-${conn.to}`} x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke="rgba(255,255,255,0.03)" strokeWidth="0.5" strokeDasharray="4 12" />;
          }
          return (
            <g key={`${conn.from}-${conn.to}`}>
              <line x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke={c} strokeWidth="4" opacity={0.06} />
              <line x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke={c} strokeWidth="1.5" opacity={0.3} strokeDasharray="6 4">
                <animate attributeName="strokeDashoffset" values="0;-20" dur="1s" repeatCount="indefinite" />
              </line>
              <circle r="3" fill={c} opacity={0.8}>
                <animate attributeName="cx" values={`${from.x};${to.x}`} dur="2s" repeatCount="indefinite" />
                <animate attributeName="cy" values={`${from.y};${to.y}`} dur="2s" repeatCount="indefinite" />
              </circle>
              <circle r="2" fill="#fff" opacity={0.4}>
                <animate attributeName="cx" values={`${to.x};${from.x}`} dur="2.5s" repeatCount="indefinite" />
                <animate attributeName="cy" values={`${to.y};${from.y}`} dur="2.5s" repeatCount="indefinite" />
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
            <div
              key={agent.id}
              style={{
                position: 'absolute',
                left: dims.w / 2 + pos.x - sz / 2,
                top: dims.h / 2 + pos.y - sz * 0.7,
                cursor: 'grab',
                opacity: isIdle ? 0.35 : 1,
                transition: 'opacity 0.5s ease',
                zIndex: agent.zone === 'center' ? 10 : agent.zone === 'inner' ? 5 : 4,
              }}
              onPointerDown={(e) => { e.stopPropagation(); onPointerDown(e, agent.id); }}
              onMouseEnter={() => setHoveredAgent(agent.id)}
              onMouseLeave={() => setHoveredAgent(null)}
            >
              <BuildingSvg agent={agent} size={sz} />
              {/* Labels + status pill overlay */}
              <div style={{
                position: 'absolute', bottom: sz * 0.15, left: '50%', transform: 'translateX(-50%)',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, pointerEvents: 'none',
              }}>
                <div style={{
                  fontFamily: M, fontSize: agent.zone === 'center' ? 12 : agent.zone === 'inner' ? 10 : 9,
                  fontWeight: 900, color: '#fff', textShadow: `0 0 10px ${agent.color}88, 0 1px 4px rgba(0,0,0,0.9)`,
                  letterSpacing: '0.08em', whiteSpace: 'nowrap',
                }}>{agent.name}</div>
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
                  position: 'absolute', top: agent.zone === 'center' ? 2 : 8, right: 4,
                  fontFamily: M, fontSize: 8, fontWeight: 800, color: '#fff',
                  background: `${agent.color}bb`, borderRadius: 4, padding: '1px 4px',
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

const ctrlBtn: React.CSSProperties = {
  fontFamily: M, fontSize: 11, fontWeight: 700, color: '#a855f7',
  background: 'rgba(168,85,247,0.1)', border: '1px solid rgba(168,85,247,0.3)',
  borderRadius: 6, padding: '4px 10px', cursor: 'pointer',
  backdropFilter: 'blur(8px)', transition: 'all 0.15s ease',
};
