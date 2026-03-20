'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

/* ═══════════════════════════════════════════════════════════════
   THE HIVE — Floating Island Fortress
   Fantasy/sci-fi agent command center with floating islands
   connected by energy bridges
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
  island: string;
}

const AGENTS: Agent[] = [
  { id: 'g', name: 'G', role: 'Orchestrator', emoji: '🧠', ring: 'center', color: '#a855f7', glowColor: '#c084fc', status: 'active', tasksToday: 42, lastAction: 'Delegating ops rebuild', model: 'Claude Opus 4.6', island: 'citadel' },
  { id: 'scout', name: 'Scout', role: 'Lead Gen', emoji: '🛰️', ring: 'inner', color: '#10b981', glowColor: '#34d399', status: 'ready', tasksToday: 14, lastAction: 'Extracted 23 qualified leads', model: 'Gemini 2.5 Flash', island: 'watchtower' },
  { id: 'research', name: 'Research', role: 'Intelligence', emoji: '🔬', ring: 'inner', color: '#8b5cf6', glowColor: '#a78bfa', status: 'idle', tasksToday: 3, lastAction: 'Competitive analysis complete', model: 'Perplexity Sonar', island: 'observatory' },
  { id: 'ops', name: 'Ops Guardian', role: 'Reliability', emoji: '🛡️', ring: 'inner', color: '#ef4444', glowColor: '#f87171', status: 'active', tasksToday: 47, lastAction: 'Cron health sweep', model: 'Gemini 2.5 Flash', island: 'fortress' },
  { id: 'memory', name: 'Memory Curator', role: 'Continuity', emoji: '📚', ring: 'inner', color: '#f59e0b', glowColor: '#fbbf24', status: 'ready', tasksToday: 6, lastAction: 'Daily recall validation', model: 'MiniMax M2.1', island: 'library' },
  { id: 'elon', name: 'Elon', role: 'CTO', emoji: '⚡', ring: 'outer', color: '#3b82f6', glowColor: '#60a5fa', status: 'idle', tasksToday: 2, lastAction: 'Architecture review', model: 'Claude Opus 4.6', island: 'spire' },
  { id: 'gary', name: 'Gary', role: 'CMO', emoji: '📢', ring: 'outer', color: '#f97316', glowColor: '#fb923c', status: 'idle', tasksToday: 1, lastAction: 'Content strategy memo', model: 'Claude Opus 4.6', island: 'beacon' },
  { id: 'mark', name: 'Mark', role: 'CRO', emoji: '💰', ring: 'outer', color: '#eab308', glowColor: '#facc15', status: 'ready', tasksToday: 5, lastAction: 'Pipeline scoring update', model: 'Claude Opus 4.6', island: 'vault' },
  { id: 'ray', name: 'Ray', role: 'CFO', emoji: '💵', ring: 'outer', color: '#14b8a6', glowColor: '#2dd4bf', status: 'idle', tasksToday: 0, lastAction: 'Cost analysis pending', model: 'Claude Opus 4.6', island: 'mint' },
  { id: 'tim', name: 'Tim', role: 'COO', emoji: '⚙️', ring: 'outer', color: '#6366f1', glowColor: '#818cf8', status: 'idle', tasksToday: 1, lastAction: 'Process optimization', model: 'Claude Opus 4.6', island: 'foundry' },
  { id: 'steve', name: 'Steve', role: 'CPO', emoji: '🎯', ring: 'outer', color: '#ec4899', glowColor: '#f472b6', status: 'idle', tasksToday: 0, lastAction: 'Roadmap review queued', model: 'Claude Opus 4.6', island: 'compass' },
  { id: 'pepper', name: 'Pepper', role: 'Chief of Staff', emoji: '🌶️', ring: 'outer', color: '#e11d48', glowColor: '#fb7185', status: 'ready', tasksToday: 3, lastAction: 'Coordinating sprints', model: 'Claude Opus 4.6', island: 'command' },
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

const STATUS_COLORS: Record<AgentStatus, string> = {
  active: '#22c55e', ready: '#3b82f6', idle: '#4b5563', error: '#ef4444', completed: '#f59e0b',
};

/* ── Atmospheric Background ── */
function AtmosphereCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let w = 0, h = 0;

    interface Star { x: number; y: number; size: number; alpha: number; speed: number; color: string; }
    interface Cloud { x: number; y: number; w: number; h: number; alpha: number; speed: number; }

    const stars: Star[] = [];
    const clouds: Cloud[] = [];

    const resize = () => {
      w = canvas.parentElement?.clientWidth || 800;
      h = canvas.parentElement?.clientHeight || 600;
      canvas.width = w * 2;
      canvas.height = h * 2;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.scale(2, 2);
    };

    const init = () => {
      resize();
      stars.length = 0;
      clouds.length = 0;

      // Stars
      for (let i = 0; i < 200; i++) {
        stars.push({
          x: Math.random() * w,
          y: Math.random() * h * 0.65,
          size: Math.random() * 1.5 + 0.2,
          alpha: Math.random() * 0.6 + 0.2,
          speed: Math.random() * 0.02 + 0.005,
          color: Math.random() > 0.9 ? '#c084fc' : Math.random() > 0.85 ? '#93c5fd' : '#ffffff',
        });
      }

      // Floating clouds/mist
      for (let i = 0; i < 12; i++) {
        clouds.push({
          x: Math.random() * w * 1.5 - w * 0.25,
          y: h * 0.4 + Math.random() * h * 0.5,
          w: 150 + Math.random() * 250,
          h: 30 + Math.random() * 50,
          alpha: 0.02 + Math.random() * 0.04,
          speed: 0.1 + Math.random() * 0.3,
        });
      }
    };

    let frame = 0;

    const draw = () => {
      frame++;
      ctx.clearRect(0, 0, w, h);

      // Sky gradient — deep space to horizon glow
      const skyGrad = ctx.createLinearGradient(0, 0, 0, h);
      skyGrad.addColorStop(0, '#050510');
      skyGrad.addColorStop(0.3, '#0a0a1a');
      skyGrad.addColorStop(0.6, '#0f0f2a');
      skyGrad.addColorStop(0.85, '#1a1040');
      skyGrad.addColorStop(1, '#2a1555');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, w, h);

      // Aurora / nebula glow
      const auroraY = h * 0.3 + Math.sin(frame * 0.003) * 20;
      const auroraGrad = ctx.createRadialGradient(w * 0.5, auroraY, 0, w * 0.5, auroraY, w * 0.5);
      auroraGrad.addColorStop(0, 'rgba(168, 85, 247, 0.04)');
      auroraGrad.addColorStop(0.5, 'rgba(99, 102, 241, 0.02)');
      auroraGrad.addColorStop(1, 'rgba(168, 85, 247, 0)');
      ctx.fillStyle = auroraGrad;
      ctx.fillRect(0, 0, w, h);

      // Second aurora
      const a2Y = h * 0.5 + Math.cos(frame * 0.002) * 30;
      const a2Grad = ctx.createRadialGradient(w * 0.3, a2Y, 0, w * 0.3, a2Y, w * 0.35);
      a2Grad.addColorStop(0, 'rgba(6, 182, 212, 0.03)');
      a2Grad.addColorStop(1, 'rgba(6, 182, 212, 0)');
      ctx.fillStyle = a2Grad;
      ctx.fillRect(0, 0, w, h);

      // Stars
      for (const s of stars) {
        const twinkle = Math.sin(frame * s.speed + s.x) * 0.3;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
        ctx.fillStyle = s.color;
        ctx.globalAlpha = Math.max(0.05, s.alpha + twinkle);
        ctx.fill();

        // Star glow
        if (s.size > 1) {
          ctx.beginPath();
          ctx.arc(s.x, s.y, s.size * 4, 0, Math.PI * 2);
          ctx.globalAlpha = 0.02;
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;

      // Floating clouds
      for (const c of clouds) {
        c.x += c.speed;
        if (c.x > w + c.w) c.x = -c.w;

        const cGrad = ctx.createRadialGradient(c.x + c.w / 2, c.y, 0, c.x + c.w / 2, c.y, c.w / 2);
        cGrad.addColorStop(0, `rgba(168, 130, 247, ${c.alpha})`);
        cGrad.addColorStop(0.5, `rgba(100, 100, 180, ${c.alpha * 0.5})`);
        cGrad.addColorStop(1, 'rgba(100, 100, 180, 0)');
        ctx.fillStyle = cGrad;
        ctx.fillRect(c.x, c.y - c.h / 2, c.w, c.h);
      }

      // Bottom void / depth fog
      const fogGrad = ctx.createLinearGradient(0, h * 0.75, 0, h);
      fogGrad.addColorStop(0, 'rgba(10, 5, 30, 0)');
      fogGrad.addColorStop(1, 'rgba(10, 5, 30, 0.8)');
      ctx.fillStyle = fogGrad;
      ctx.fillRect(0, h * 0.75, w, h * 0.25);

      animId = requestAnimationFrame(draw);
    };

    init();
    draw();
    window.addEventListener('resize', init);
    return () => { cancelAnimationFrame(animId); window.removeEventListener('resize', init); };
  }, []);

  return <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }} />;
}

/* ── Island SVG Renderer ── */
function IslandSVG({ type, color, glow, status, size }: {
  type: string; color: string; glow: string; status: AgentStatus; size: number;
}) {
  const isActive = status === 'active';
  const isReady = status === 'ready';
  const baseOpacity = status === 'idle' ? 0.5 : status === 'error' ? 0.7 : 1;
  const pulseClass = isActive ? 'island-pulse' : '';

  const renderIsland = () => {
    switch (type) {
      case 'citadel': // G — Grand central castle with beacon
        return (
          <g>
            {/* Island base — large floating rock */}
            <ellipse cx="80" cy="145" rx="70" ry="18" fill="#1a1030" opacity={0.6} />
            <path d="M10 130 Q20 155 80 160 Q140 155 150 130 Q145 110 120 105 L110 100 L95 95 L80 92 L65 95 L50 100 L40 105 Q15 110 10 130Z" fill="#1e1040" stroke={color} strokeWidth="0.5" opacity={0.8} />
            {/* Cascading rock layers */}
            <path d="M20 125 Q25 140 80 148 Q135 140 140 125" fill="none" stroke="rgba(168,85,247,0.15)" strokeWidth="0.5" />
            <path d="M15 132 Q22 148 80 154 Q138 148 145 132" fill="none" stroke="rgba(168,85,247,0.08)" strokeWidth="0.5" />

            {/* Castle structure */}
            {/* Main tower */}
            <rect x="65" y="35" width="30" height="60" rx="2" fill="#150d30" stroke={color} strokeWidth="0.8" opacity={0.9} />
            {/* Tower roof / spire */}
            <polygon points="60,38 80,8 100,38" fill="#1a0d40" stroke={color} strokeWidth="0.8" />
            {/* Beacon at top */}
            <circle cx="80" cy="12" r="4" fill={glow} opacity={isActive ? 0.9 : 0.3}>
              {isActive && <animate attributeName="r" values="3;6;3" dur="2s" repeatCount="indefinite" />}
              {isActive && <animate attributeName="opacity" values="0.5;1;0.5" dur="2s" repeatCount="indefinite" />}
            </circle>
            {/* Beacon rays */}
            {isActive && [0, 60, 120, 180, 240, 300].map((angle) => (
              <line key={angle} x1="80" y1="12"
                x2={80 + Math.cos(angle * Math.PI / 180) * 15}
                y2={12 + Math.sin(angle * Math.PI / 180) * 15}
                stroke={glow} strokeWidth="0.5" opacity={0.4}>
                <animate attributeName="opacity" values="0.1;0.6;0.1" dur="1.5s" begin={`${angle / 360}s`} repeatCount="indefinite" />
              </line>
            ))}

            {/* Side towers */}
            <rect x="42" y="55" width="18" height="40" rx="1" fill="#150d30" stroke={color} strokeWidth="0.6" opacity={0.7} />
            <polygon points="40,58 51,42 62,58" fill="#1a0d40" stroke={color} strokeWidth="0.6" />
            <rect x="100" y="55" width="18" height="40" rx="1" fill="#150d30" stroke={color} strokeWidth="0.6" opacity={0.7} />
            <polygon points="98,58 109,42 120,58" fill="#1a0d40" stroke={color} strokeWidth="0.6" />

            {/* Windows — glowing */}
            <rect x="73" y="50" width="5" height="7" rx="1" fill={glow} opacity={isActive ? 0.7 : 0.2}>
              {isActive && <animate attributeName="opacity" values="0.3;0.8;0.3" dur="3s" repeatCount="indefinite" />}
            </rect>
            <rect x="82" y="50" width="5" height="7" rx="1" fill={glow} opacity={isActive ? 0.7 : 0.2} />
            <rect x="73" y="65" width="5" height="7" rx="1" fill={glow} opacity={0.3} />
            <rect x="82" y="65" width="5" height="7" rx="1" fill={glow} opacity={0.3} />
            <rect x="73" y="80" width="14" height="12" rx="1" fill={glow} opacity={0.15} /> {/* Grand entrance */}

            {/* Floating runes around citadel */}
            {isActive && (
              <g>
                <circle cx="30" cy="60" r="1.5" fill={glow} opacity={0.5}>
                  <animate attributeName="cy" values="60;55;60" dur="4s" repeatCount="indefinite" />
                </circle>
                <circle cx="130" cy="55" r="1" fill={glow} opacity={0.4}>
                  <animate attributeName="cy" values="55;50;55" dur="3s" repeatCount="indefinite" />
                </circle>
                <circle cx="35" cy="80" r="1" fill={glow} opacity={0.3}>
                  <animate attributeName="cy" values="80;75;80" dur="3.5s" repeatCount="indefinite" />
                </circle>
              </g>
            )}

            {/* Waterfalls off the island edges */}
            <line x1="25" y1="125" x2="22" y2="155" stroke="rgba(100,180,255,0.15)" strokeWidth="1.5">
              <animate attributeName="strokeDashoffset" values="0;-10" dur="0.5s" repeatCount="indefinite" />
            </line>
            <line x1="135" y1="120" x2="138" y2="150" stroke="rgba(100,180,255,0.1)" strokeWidth="1">
              <animate attributeName="strokeDashoffset" values="0;-8" dur="0.6s" repeatCount="indefinite" />
            </line>
          </g>
        );

      case 'watchtower': // Scout — Tall watchtower with telescope
        return (
          <g>
            <ellipse cx="80" cy="140" rx="45" ry="14" fill="#0a1a15" opacity={0.5} />
            <path d="M35 125 Q40 145 80 150 Q120 145 125 125 Q120 112 105 108 L80 100 L55 108 Q40 112 35 125Z" fill="#0d1f18" stroke={color} strokeWidth="0.5" opacity={0.8} />

            {/* Tall tower */}
            <rect x="70" y="30" width="20" height="75" rx="2" fill="#0a1a15" stroke={color} strokeWidth="0.7" />
            {/* Observation deck */}
            <rect x="62" y="28" width="36" height="12" rx="2" fill="#0d2520" stroke={color} strokeWidth="0.7" />
            {/* Roof */}
            <polygon points="60,30 80,15 100,30" fill="#0a1a15" stroke={color} strokeWidth="0.7" />
            {/* Telescope */}
            <line x1="95" y1="33" x2="120" y2="20" stroke={glow} strokeWidth="2" opacity={0.7} />
            <circle cx="122" cy="19" r="3" fill="none" stroke={glow} strokeWidth="1" opacity={0.5} />
            {/* Scanning beam from telescope */}
            {(isActive || isReady) && (
              <line x1="122" y1="19" x2="155" y2="5" stroke={glow} strokeWidth="0.5" opacity={0.3} strokeDasharray="3 3">
                <animate attributeName="x2" values="155;140;155" dur="4s" repeatCount="indefinite" />
                <animate attributeName="y2" values="5;25;5" dur="4s" repeatCount="indefinite" />
              </line>
            )}
            {/* Windows */}
            <rect x="76" y="50" width="8" height="6" rx="1" fill={glow} opacity={0.3} />
            <rect x="76" y="65" width="8" height="6" rx="1" fill={glow} opacity={0.2} />
            <rect x="76" y="80" width="8" height="6" rx="1" fill={glow} opacity={0.15} />
            {/* Flag */}
            <line x1="80" y1="15" x2="80" y2="5" stroke={color} strokeWidth="0.5" />
            <path d="M80 5 L92 8 L80 11" fill={color} opacity={0.6}>
              <animate attributeName="d" values="M80 5 L92 8 L80 11;M80 5 L90 9 L80 11;M80 5 L92 8 L80 11" dur="2s" repeatCount="indefinite" />
            </path>
          </g>
        );

      case 'observatory': // Research — Dome observatory
        return (
          <g>
            <ellipse cx="80" cy="140" rx="45" ry="14" fill="#10082a" opacity={0.5} />
            <path d="M35 125 Q40 145 80 150 Q120 145 125 125 Q118 112 100 108 L80 100 L60 108 Q42 112 35 125Z" fill="#150d30" stroke={color} strokeWidth="0.5" opacity={0.8} />

            {/* Dome */}
            <path d="M55 85 Q55 45 80 35 Q105 45 105 85" fill="#120a28" stroke={color} strokeWidth="0.7" />
            {/* Base building */}
            <rect x="55" y="85" width="50" height="20" rx="1" fill="#120a28" stroke={color} strokeWidth="0.5" />
            {/* Dome slit */}
            <path d="M77 38 L77 85 L83 85 L83 38" fill="#0a0618" stroke={glow} strokeWidth="0.3" opacity={0.5} />
            {/* Floating data orbs */}
            {[
              { cx: 40, cy: 60, r: 3, d: '3s' },
              { cx: 120, cy: 70, r: 2, d: '4s' },
              { cx: 35, cy: 85, r: 2, d: '3.5s' },
              { cx: 125, cy: 55, r: 1.5, d: '2.5s' },
            ].map((orb, i) => (
              <circle key={i} cx={orb.cx} cy={orb.cy} r={orb.r} fill={glow} opacity={0.3}>
                <animate attributeName="cy" values={`${orb.cy};${orb.cy - 8};${orb.cy}`} dur={orb.d} repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.15;0.4;0.15" dur={orb.d} repeatCount="indefinite" />
              </circle>
            ))}
            {/* Windows */}
            <rect x="63" y="90" width="6" height="8" rx="1" fill={glow} opacity={0.25} />
            <rect x="91" y="90" width="6" height="8" rx="1" fill={glow} opacity={0.25} />
          </g>
        );

      case 'fortress': // Ops Guardian — Heavy shield fortress
        return (
          <g>
            <ellipse cx="80" cy="140" rx="50" ry="16" fill="#1a0a0a" opacity={0.5} />
            <path d="M30 125 Q35 148 80 155 Q125 148 130 125 Q125 108 105 102 L80 95 L55 102 Q35 108 30 125Z" fill="#200d0d" stroke={color} strokeWidth="0.5" opacity={0.8} />

            {/* Thick walls */}
            <rect x="40" y="60" width="80" height="42" rx="3" fill="#1a0808" stroke={color} strokeWidth="1" />
            {/* Corner turrets */}
            <rect x="35" y="55" width="15" height="50" rx="2" fill="#1a0808" stroke={color} strokeWidth="0.7" />
            <rect x="110" y="55" width="15" height="50" rx="2" fill="#1a0808" stroke={color} strokeWidth="0.7" />
            {/* Turret tops */}
            <path d="M35 55 L37 48 L40 55" fill={color} opacity={0.3} />
            <path d="M40 55 L42 48 L45 55" fill={color} opacity={0.3} />
            <path d="M45 55 L47 48 L50 55" fill={color} opacity={0.3} />
            <path d="M110 55 L112 48 L115 55" fill={color} opacity={0.3} />
            <path d="M115 55 L117 48 L120 55" fill={color} opacity={0.3} />
            <path d="M120 55 L122 48 L125 55" fill={color} opacity={0.3} />

            {/* Shield emblem */}
            <path d="M80 65 L92 72 L90 88 L80 93 L70 88 L68 72Z" fill="none" stroke={glow} strokeWidth="1.2" opacity={isActive ? 0.8 : 0.3}>
              {isActive && <animate attributeName="opacity" values="0.4;0.9;0.4" dur="2s" repeatCount="indefinite" />}
            </path>
            <circle cx="80" cy="78" r="4" fill={glow} opacity={isActive ? 0.5 : 0.15} />

            {/* Arrow slits */}
            <rect x="55" y="70" width="2" height="8" fill={glow} opacity={0.2} />
            <rect x="65" y="70" width="2" height="8" fill={glow} opacity={0.2} />
            <rect x="93" y="70" width="2" height="8" fill={glow} opacity={0.2} />
            <rect x="103" y="70" width="2" height="8" fill={glow} opacity={0.2} />

            {/* Gate */}
            <path d="M72 102 L72 88 Q80 83 88 88 L88 102" fill="#0a0404" stroke={color} strokeWidth="0.5" />
          </g>
        );

      case 'library': // Memory Curator — Magical library tower
        return (
          <g>
            <ellipse cx="80" cy="140" rx="42" ry="13" fill="#1a1005" opacity={0.5} />
            <path d="M38 128 Q43 145 80 150 Q117 145 122 128 Q118 114 102 110 L80 103 L58 110 Q42 114 38 128Z" fill="#201508" stroke={color} strokeWidth="0.5" opacity={0.8} />

            {/* Tower with spiral */}
            <rect x="65" y="35" width="30" height="70" rx="3" fill="#1a1008" stroke={color} strokeWidth="0.7" />
            {/* Spiral staircase hint */}
            <path d="M65 95 Q80 90 95 95 M65 82 Q80 77 95 82 M65 69 Q80 64 95 69 M65 56 Q80 51 95 56" fill="none" stroke={color} strokeWidth="0.3" opacity={0.3} />
            {/* Pointed roof */}
            <polygon points="62,38 80,18 98,38" fill="#1a1008" stroke={color} strokeWidth="0.7" />
            {/* Magic orb at top */}
            <circle cx="80" cy="22" r="5" fill={glow} opacity={0.4}>
              <animate attributeName="opacity" values="0.2;0.6;0.2" dur="4s" repeatCount="indefinite" />
            </circle>
            {/* Floating books */}
            <g>
              <rect x="45" y="55" width="10" height="7" rx="1" fill={glow} opacity={0.25} transform="rotate(-10 50 58)">
                <animate attributeName="y" values="55;50;55" dur="5s" repeatCount="indefinite" />
              </rect>
              <rect x="105" y="65" width="10" height="7" rx="1" fill={glow} opacity={0.2} transform="rotate(12 110 68)">
                <animate attributeName="y" values="65;60;65" dur="4s" repeatCount="indefinite" />
              </rect>
              <rect x="110" y="45" width="8" height="6" rx="1" fill={glow} opacity={0.15} transform="rotate(-5 114 48)">
                <animate attributeName="y" values="45;40;45" dur="6s" repeatCount="indefinite" />
              </rect>
            </g>
            {/* Windows — warm glow */}
            <rect x="73" y="45" width="6" height="8" rx="1" fill={glow} opacity={0.4} />
            <rect x="81" y="45" width="6" height="8" rx="1" fill={glow} opacity={0.35} />
            <rect x="73" y="60" width="6" height="8" rx="1" fill={glow} opacity={0.25} />
            <rect x="81" y="60" width="6" height="8" rx="1" fill={glow} opacity={0.25} />
          </g>
        );

      default: // Executive islands — elegant spires/outposts
        return (
          <g>
            <ellipse cx="80" cy="135" rx="35" ry="11" fill="#0d0d1a" opacity={0.4} />
            <path d="M45 122 Q50 140 80 145 Q110 140 115 122 Q110 112 95 108 L80 103 L65 108 Q50 112 45 122Z" fill="#12102a" stroke={color} strokeWidth="0.4" opacity={0.7} />
            {/* Elegant spire */}
            <rect x="70" y="55" width="20" height="50" rx="2" fill="#100e25" stroke={color} strokeWidth="0.5" />
            <polygon points="68,58 80,30 92,58" fill="#100e25" stroke={color} strokeWidth="0.5" />
            {/* Crystal top */}
            <polygon points="78,32 80,24 82,32" fill={glow} opacity={0.5}>
              {(isActive || isReady) && <animate attributeName="opacity" values="0.3;0.7;0.3" dur="3s" repeatCount="indefinite" />}
            </polygon>
            {/* Windows */}
            <rect x="76" y="65" width="4" height="5" rx="0.5" fill={glow} opacity={0.25} />
            <rect x="80" y="65" width="4" height="5" rx="0.5" fill={glow} opacity={0.2} />
            <rect x="76" y="80" width="8" height="10" rx="1" fill={glow} opacity={0.12} />
          </g>
        );
    }
  };

  return (
    <svg width={size} height={size} viewBox="0 0 160 165" className={pulseClass}
      style={{
        opacity: baseOpacity,
        filter: isActive
          ? `drop-shadow(0 0 15px ${glow}44) drop-shadow(0 5px 20px rgba(0,0,0,0.5))`
          : `drop-shadow(0 5px 15px rgba(0,0,0,0.4))`,
        transition: 'opacity 0.5s ease, filter 0.5s ease',
      }}>
      {renderIsland()}
    </svg>
  );
}

/* ── Energy Bridge SVG ── */
function EnergyBridge({ x1, y1, x2, y2, active, color }: {
  x1: number; y1: number; x2: number; y2: number; active: boolean; color: string;
}) {
  const midX = (x1 + x2) / 2;
  const midY = Math.min(y1, y2) - 20; // Arc upward
  const pathD = `M${x1},${y1} Q${midX},${midY} ${x2},${y2}`;

  return (
    <g>
      {/* Bridge glow */}
      {active && (
        <path d={pathD} fill="none" stroke={color} strokeWidth="4" opacity={0.1}
          filter="url(#bridgeGlow)" />
      )}
      {/* Bridge line */}
      <path d={pathD} fill="none"
        stroke={active ? color : 'rgba(255,255,255,0.06)'}
        strokeWidth={active ? 1.5 : 0.5}
        strokeDasharray={active ? '8 4' : '3 8'}
        opacity={active ? 0.6 : 0.3}>
        {active && (
          <animate attributeName="stroke-dashoffset" values="0;-24" dur="1.2s" repeatCount="indefinite" />
        )}
      </path>
      {/* Traveling energy orb */}
      {active && (
        <>
          <circle r="3" fill={color} opacity={0.8} filter="url(#bridgeGlow)">
            <animateMotion dur="2.5s" repeatCount="indefinite" path={pathD} />
          </circle>
          <circle r="2" fill="#ffffff" opacity={0.5}>
            <animateMotion dur="2.5s" repeatCount="indefinite" path={pathD} begin="0.8s" />
          </circle>
        </>
      )}
    </g>
  );
}

/* ── Main Component ── */
export default function TheHive() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredAgent, setHoveredAgent] = useState<string | null>(null);
  const [agents, setAgents] = useState(AGENTS);
  const [time, setTime] = useState(0);
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

  // Gentle floating animation
  useEffect(() => {
    const interval = setInterval(() => setTime((t) => t + 1), 60);
    return () => clearInterval(interval);
  }, []);

  // Demo activity simulation
  useEffect(() => {
    const interval = setInterval(() => {
      setAgents((prev) =>
        prev.map((a) => {
          if (Math.random() < 0.035) {
            const statuses: AgentStatus[] = ['active', 'ready', 'idle'];
            const newStatus = a.id === 'g' ? 'active' : statuses[Math.floor(Math.random() * statuses.length)];
            return { ...a, status: newStatus, tasksToday: newStatus === 'active' ? a.tasksToday + 1 : a.tasksToday };
          }
          return a;
        }),
      );
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const center = agents.find((a) => a.ring === 'center')!;
  const inner = agents.filter((a) => a.ring === 'inner');
  const outer = agents.filter((a) => a.ring === 'outer');

  const scale = Math.min(dims.w / 900, dims.h / 700, 1.2);
  const innerR = 155 * scale;
  const outerR = 290 * scale;
  const islandSizeCenter = 160 * scale;
  const islandSizeInner = 120 * scale;
  const islandSizeOuter = 90 * scale;

  const getPos = useCallback(
    (ring: 'inner' | 'outer', idx: number, total: number) => {
      const r = ring === 'inner' ? innerR : outerR;
      const baseAngle = (360 / total) * idx - 90;
      const rad = (baseAngle * Math.PI) / 180;
      // Gentle floating
      const floatY = Math.sin(time * 0.02 + idx * 1.5) * 4;
      return { x: Math.cos(rad) * r, y: Math.sin(rad) * r + floatY };
    },
    [time, innerR, outerR],
  );

  const getAgentScreenPos = useCallback(
    (id: string) => {
      const a = agents.find((ag) => ag.id === id);
      if (!a) return { x: dims.w / 2, y: dims.h / 2 };
      if (a.ring === 'center') return { x: dims.w / 2, y: dims.h / 2 };
      const arr = a.ring === 'inner' ? inner : outer;
      const idx = arr.findIndex((ag) => ag.id === id);
      const pos = getPos(a.ring as 'inner' | 'outer', idx, arr.length);
      return { x: dims.w / 2 + pos.x, y: dims.h / 2 + pos.y };
    },
    [agents, inner, outer, getPos, dims],
  );

  const hoveredData = hoveredAgent ? agents.find((a) => a.id === hoveredAgent) : null;
  const centerFloat = Math.sin(time * 0.015) * 5;

  return (
    <div ref={containerRef} style={{
      width: '100%', height: '100%', background: '#07070d',
      position: 'relative', overflow: 'hidden', borderRadius: 14,
    }}>
      <AtmosphereCanvas />

      {/* Header */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 16px', zIndex: 20,
        background: 'linear-gradient(to bottom, rgba(7,7,13,0.85), rgba(7,7,13,0))',
      }}>
        <div>
          <div style={{
            fontFamily: M, fontSize: 13, fontWeight: 900,
            letterSpacing: '0.2em', color: '#a855f7',
            textShadow: '0 0 20px rgba(168,85,247,0.5)',
          }}>THE HIVE</div>
          <div style={{
            fontFamily: M, fontSize: 7, color: 'rgba(255,255,255,0.2)',
            letterSpacing: '0.2em', marginTop: 1,
          }}>FLOATING FORTRESS</div>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {[
            { label: 'ACTIVE', count: agents.filter((a) => a.status === 'active').length, color: '#22c55e' },
            { label: 'READY', count: agents.filter((a) => a.status === 'ready').length, color: '#3b82f6' },
            { label: 'IDLE', count: agents.filter((a) => a.status === 'idle').length, color: '#4b5563' },
          ].map((s) => (
            <div key={s.label} style={{
              display: 'flex', alignItems: 'center', gap: 4,
              fontFamily: M, fontSize: 9, color: s.color,
              background: `${s.color}11`, border: `1px solid ${s.color}22`,
              borderRadius: 5, padding: '2px 7px',
            }}>
              <div style={{ width: 4, height: 4, borderRadius: '50%', background: s.color, boxShadow: `0 0 4px ${s.color}` }} />
              {s.count}
            </div>
          ))}
          <div style={{
            fontFamily: M, fontSize: 9, color: '#a855f7',
            background: 'rgba(168,85,247,0.08)', border: '1px solid rgba(168,85,247,0.15)',
            borderRadius: 5, padding: '2px 7px',
          }}>⚡ {agents.reduce((sum, a) => sum + a.tasksToday, 0)}</div>
        </div>
      </div>

      {/* Energy Bridges SVG Layer */}
      <svg style={{
        position: 'absolute', inset: 0, width: '100%', height: '100%',
        pointerEvents: 'none', zIndex: 3,
      }}>
        <defs>
          <filter id="bridgeGlow">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
        {CONNECTIONS.map((conn) => {
          const from = getAgentScreenPos(conn.from);
          const to = getAgentScreenPos(conn.to);
          const fromAgent = agents.find((a) => a.id === conn.from);
          return (
            <EnergyBridge
              key={`${conn.from}-${conn.to}`}
              x1={from.x} y1={from.y} x2={to.x} y2={to.y}
              active={conn.active}
              color={fromAgent?.glowColor || '#a855f7'}
            />
          );
        })}
      </svg>

      {/* CENTER ISLAND — G */}
      <div
        style={{
          position: 'absolute',
          left: `calc(50% - ${islandSizeCenter / 2}px)`,
          top: `calc(50% - ${islandSizeCenter / 2}px + ${centerFloat}px)`,
          cursor: 'pointer', zIndex: 10,
          transition: 'filter 0.3s',
          filter: hoveredAgent === center.id ? `brightness(1.3)` : 'none',
        }}
        onMouseEnter={() => setHoveredAgent(center.id)}
        onMouseLeave={() => setHoveredAgent(null)}
      >
        <IslandSVG type={center.island} color={center.color} glow={center.glowColor}
          status={center.status} size={islandSizeCenter} />
        {/* Name plate */}
        <div style={{
          position: 'absolute', bottom: 8, left: '50%', transform: 'translateX(-50%)',
          textAlign: 'center' as const, whiteSpace: 'nowrap' as const,
        }}>
          <div style={{
            fontFamily: M, fontSize: 12, fontWeight: 900, color: '#fff',
            textShadow: `0 0 12px ${center.color}, 0 2px 8px rgba(0,0,0,0.8)`,
            letterSpacing: '0.15em',
          }}>{center.emoji} {center.name}</div>
          <div style={{
            fontFamily: M, fontSize: 8, color: center.color, letterSpacing: '0.1em',
            opacity: 0.8,
          }}>{center.role.toUpperCase()}</div>
        </div>
        {/* Status + tasks */}
        <div style={{
          position: 'absolute', top: 6, right: 6,
          display: 'flex', gap: 4, alignItems: 'center',
        }}>
          <div style={{
            width: 6, height: 6, borderRadius: '50%',
            background: STATUS_COLORS[center.status],
            boxShadow: `0 0 6px ${STATUS_COLORS[center.status]}`,
          }} />
          <div style={{
            fontFamily: M, fontSize: 8, fontWeight: 800, color: '#fff',
            background: 'rgba(168,85,247,0.7)', borderRadius: 4, padding: '1px 4px',
          }}>{center.tasksToday}</div>
        </div>
      </div>

      {/* INNER RING — Worker Islands */}
      {inner.map((agent, i) => {
        const pos = getPos('inner', i, inner.length);
        return (
          <div
            key={agent.id}
            style={{
              position: 'absolute',
              left: `calc(50% + ${pos.x}px - ${islandSizeInner / 2}px)`,
              top: `calc(50% + ${pos.y}px - ${islandSizeInner / 2}px)`,
              cursor: 'pointer', zIndex: 5,
              transition: 'filter 0.3s',
              filter: hoveredAgent === agent.id ? 'brightness(1.3)' : 'none',
            }}
            onMouseEnter={() => setHoveredAgent(agent.id)}
            onMouseLeave={() => setHoveredAgent(null)}
          >
            <IslandSVG type={agent.island} color={agent.color} glow={agent.glowColor}
              status={agent.status} size={islandSizeInner} />
            <div style={{
              position: 'absolute', bottom: 4, left: '50%', transform: 'translateX(-50%)',
              textAlign: 'center' as const, whiteSpace: 'nowrap' as const,
            }}>
              <div style={{
                fontFamily: M, fontSize: 10, fontWeight: 800, color: '#fff',
                textShadow: `0 0 8px ${agent.color}88, 0 2px 6px rgba(0,0,0,0.8)`,
              }}>{agent.emoji} {agent.name}</div>
              <div style={{ fontFamily: M, fontSize: 7, color: agent.color, opacity: 0.7 }}>
                {agent.role.toUpperCase()}
              </div>
            </div>
            <div style={{
              position: 'absolute', top: 4, right: 4,
              display: 'flex', gap: 3, alignItems: 'center',
            }}>
              <div style={{
                width: 5, height: 5, borderRadius: '50%',
                background: STATUS_COLORS[agent.status],
                boxShadow: `0 0 4px ${STATUS_COLORS[agent.status]}`,
              }} />
              {agent.tasksToday > 0 && (
                <div style={{
                  fontFamily: M, fontSize: 7, fontWeight: 800, color: '#fff',
                  background: `${agent.color}aa`, borderRadius: 3, padding: '0px 3px',
                }}>{agent.tasksToday}</div>
              )}
            </div>
          </div>
        );
      })}

      {/* OUTER RING — Executive Islands */}
      {outer.map((agent, i) => {
        const pos = getPos('outer', i, outer.length);
        return (
          <div
            key={agent.id}
            style={{
              position: 'absolute',
              left: `calc(50% + ${pos.x}px - ${islandSizeOuter / 2}px)`,
              top: `calc(50% + ${pos.y}px - ${islandSizeOuter / 2}px)`,
              cursor: 'pointer', zIndex: 4,
              transition: 'filter 0.3s',
              filter: hoveredAgent === agent.id ? 'brightness(1.3)' : 'none',
            }}
            onMouseEnter={() => setHoveredAgent(agent.id)}
            onMouseLeave={() => setHoveredAgent(null)}
          >
            <IslandSVG type={agent.island} color={agent.color} glow={agent.glowColor}
              status={agent.status} size={islandSizeOuter} />
            <div style={{
              position: 'absolute', bottom: 2, left: '50%', transform: 'translateX(-50%)',
              textAlign: 'center' as const, whiteSpace: 'nowrap' as const,
            }}>
              <div style={{
                fontFamily: M, fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.8)',
                textShadow: '0 1px 4px rgba(0,0,0,0.8)',
              }}>{agent.emoji} {agent.name}</div>
              <div style={{ fontFamily: M, fontSize: 6, color: agent.color, opacity: 0.6 }}>
                {agent.role.toUpperCase()}
              </div>
            </div>
            <div style={{
              position: 'absolute', top: 2, right: 2,
              width: 4, height: 4, borderRadius: '50%',
              background: STATUS_COLORS[agent.status],
              boxShadow: `0 0 3px ${STATUS_COLORS[agent.status]}`,
            }} />
          </div>
        );
      })}

      {/* Hover Tooltip */}
      {hoveredData && (
        <div style={{
          position: 'absolute', bottom: 12, left: '50%', transform: 'translateX(-50%)',
          background: 'rgba(10,8,20,0.95)',
          border: `1px solid ${hoveredData.color}33`,
          borderRadius: 10, minWidth: 280, zIndex: 100,
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
              fontFamily: M, fontSize: 8, fontWeight: 800, letterSpacing: '0.1em',
              color: STATUS_COLORS[hoveredData.status],
              background: `${STATUS_COLORS[hoveredData.status]}12`,
              border: `1px solid ${STATUS_COLORS[hoveredData.status]}33`,
              borderRadius: 4, padding: '2px 6px',
            }}>{hoveredData.status.toUpperCase()}</div>
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
        @keyframes island-pulse {
          0%, 100% { filter: brightness(1); }
          50% { filter: brightness(1.1); }
        }
        .island-pulse { animation: island-pulse 2s ease-in-out infinite; }
      `}</style>
    </div>
  );
}
