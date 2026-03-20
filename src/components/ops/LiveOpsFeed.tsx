'use client';
import { useState, useEffect, useRef, useCallback } from 'react';

// ── Types ────────────────────────────────────────────────────────────────────

export interface OpEvent {
  id: string;
  timestamp: string;
  agent: string;
  agentColor: string;
  agentEmoji: string;
  action: string;
  detail?: string;
  type: 'info' | 'success' | 'warning' | 'error';
}

interface LiveOpsFeedProps {
  relayBase?: string;
  maxVisible?: number;
}

// ── Agent color/emoji map ───────────────────────────────────────────────────

const AGENT_STYLE: Record<string, { color: string; emoji: string }> = {
  G:                { color: '#a855f7', emoji: '🤖' },
  Opie:             { color: '#06b6d4', emoji: '🐙' },
  Scout:            { color: '#22c55e', emoji: '🦅' },
  'Ops Guardian':   { color: '#f59e0b', emoji: '🛡️' },
  'Memory Curator': { color: '#ec4899', emoji: '🧠' },
  Elon:             { color: '#3b82f6', emoji: '⚡' },
  Gary:             { color: '#f97316', emoji: '📢' },
  Mark:             { color: '#14b8a6', emoji: '💰' },
  Ray:              { color: '#8b5cf6', emoji: '📊' },
  Tim:              { color: '#64748b', emoji: '⚙️' },
  Steve:            { color: '#e11d48', emoji: '🎯' },
  Pepper:           { color: '#dc2626', emoji: '🌶️' },
  Research:         { color: '#0ea5e9', emoji: '🔬' },
  Codex:            { color: '#3b82f6', emoji: '💻' },
};

function getAgentStyle(name: string) {
  const upper = name.toUpperCase();
  for (const [key, val] of Object.entries(AGENT_STYLE)) {
    if (upper.includes(key)) return val;
  }
  return { color: '#6b7280', emoji: '🤖' };
}

// ── Generate demo events ─────────────────────────────────────────────────────

const DEMO_ACTIONS = [
  { agent: 'G', action: 'Reading HEARTBEAT.md', detail: 'Running priority checks...' },
  { agent: 'G', action: 'Webhook health OK ✅', detail: 'uptime ~593,000s' },
  { agent: 'G', action: 'Soul Guardian: DRIFT detected', detail: 'MEMORY.md alert, AGENTS.md + SOUL.md restored' },
  { agent: 'Opie', action: 'Relay server: event stream active', detail: 'Port 19100 — bridging gateway' },
  { agent: 'Scout', action: 'Lead extraction: Redwoods HOT', detail: '4m6s call with Sarah — follow-up pending' },
  { agent: 'Ops Guardian', action: 'Cron health sweep', detail: 'Checking job error states...' },
  { agent: 'Memory Curator', action: 'Daily memory validation', detail: 'Recall pass rate: checking...' },
  { agent: 'G', action: 'Compressing memory block #47', detail: '4200 → 2100 tokens' },
  { agent: 'G', action: 'FIFO eviction triggered', detail: 'Total > 80k tokens' },
  { agent: 'Elon', action: 'Awaiting architecture task', detail: 'CTO ready — no active assignments' },
  { agent: 'Gary', action: 'Content pipeline: 12 TikTok prompts', detail: 'Larry Skill campaign ready' },
  { agent: 'Mark', action: 'Pipeline: 2 HOT / 20 WARM leads', detail: 'Revenue tracking active' },
  { agent: 'G', action: 'OIOS Demo Monitor: CRITICAL', detail: '404 DEPLOYMENT_NOT_FOUND — 7 days' },
  { agent: 'Tim', action: 'Ops digest: compiling', detail: 'Daily Legendary Ops Digest' },
  { agent: 'G', action: 'Heartbeat: all checks OK', detail: 'Gateway + webhook healthy' },
  { agent: 'Pepper', action: 'Coordination: open loops review', detail: '3 items blocked on Wes' },
  { agent: 'G', action: 'R-Awareness: injecting L1 docs', detail: '2 SSoTs matched' },
];

function randomDemoEvent(): OpEvent {
  const tpl = DEMO_ACTIONS[Math.floor(Math.random() * DEMO_ACTIONS.length)];
  const style = getAgentStyle(tpl.agent);
  const now = new Date();
  return {
    id: Math.random().toString(36).slice(2),
    timestamp: now.toISOString(),
    agent: tpl.agent,
    agentColor: style.color,
    agentEmoji: style.emoji,
    action: tpl.action,
    detail: tpl.detail,
    type: tpl.action.includes('CRITICAL') || tpl.action.includes('error') ? 'error'
        : tpl.action.includes('OK') || tpl.action.includes('clean') ? 'success'
        : tpl.action.includes('Monitor') || tpl.action.includes('checking') ? 'info'
        : 'info',
  };
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function LiveOpsFeed({ relayBase, maxVisible = 200 }: LiveOpsFeedProps) {
  const [events, setEvents] = useState<OpEvent[]>([]);
  const [filter, setFilter] = useState<string>('ALL');
  const [isLive, setIsLive] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const feedRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Fetch recent events from relay
  const fetchRecent = useCallback(async () => {
    if (!relayBase) return;
    try {
      const res = await fetch(`${relayBase}/api/operations/recent`, {
        signal: AbortSignal.timeout(5000),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.events?.length) {
          setEvents(data.events.map((e: OpEvent) => ({
            ...e,
            agentColor: getAgentStyle(e.agent).color,
            agentEmoji: getAgentStyle(e.agent).emoji,
          })));
          setIsLive(data.live ?? false);
        }
      }
    } catch {
      // silently ignore
    }
  }, [relayBase]);

  // Start SSE stream
  const startStream = useCallback(() => {
    if (!relayBase) return;
    if (abortRef.current) {
      abortRef.current.abort();
    }
    const ac = new AbortController();
    abortRef.current = ac;
    setStreaming(true);
    setIsLive(true);

    let buf = '';
    fetch(`${relayBase}/api/operations/live`, { signal: ac.signal })
      .then((res) => {
        if (!res.body) throw new Error('no body');
        const reader = res.body.getReader();
        const dec = new TextDecoder();

        function pump() {
          reader.read().then(({ done, value }) => {
            if (done || ac.signal.aborted) return;
            buf += dec.decode(value, { stream: true });
            const parts = buf.split('\n\n');
            buf = parts.pop() ?? '';
            for (const raw of parts) {
              const line = raw.trim();
              if (!line.startsWith('data: ')) continue;
              try {
                const payload = JSON.parse(line.slice(6));
                if (payload.event) {
                  const style = getAgentStyle(payload.agent || 'G');
                  const ev: OpEvent = {
                    id: payload.id || Math.random().toString(36).slice(2),
                    timestamp: payload.timestamp || new Date().toISOString(),
                    agent: payload.agent || 'G',
                    agentColor: style.color,
                    agentEmoji: style.emoji,
                    action: payload.action || payload.message || '',
                    detail: payload.detail,
                    type: payload.type || 'info',
                  };
                  setEvents((prev) => [ev, ...prev].slice(0, maxVisible));
                }
              } catch {
                // ignore parse errors
              }
            }
            pump();
          });
        }
        pump();
      })
      .catch((err) => {
        if (err.name !== 'AbortError') {
          setStreaming(false);
          setIsLive(false);
        }
      });
  }, [relayBase, maxVisible]);

  // Demo mode: generate fake events
  const startDemo = useCallback(() => {
    setIsLive(true);
    setStreaming(true);
    // Seed with a few events
    const seed = Array.from({ length: 8 }, () => randomDemoEvent())
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    setEvents(seed);

    const interval = setInterval(() => {
      const ev = randomDemoEvent();
      setEvents((prev) => [ev, ...prev].slice(0, maxVisible));
    }, 3000 + Math.random() * 4000);

    return () => clearInterval(interval);
  }, [maxVisible]);

  // Poll for recent on mount; fall back to demo if relay unavailable
  useEffect(() => {
    if (!relayBase) {
      const cleanup = startDemo();
      return () => { cleanup?.(); };
    }
    fetchRecent().then(() => {
      if (events.length === 0) {
        const cleanup = startDemo();
        return () => { cleanup?.(); };
      }
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Agent list for filter
  const agentNames = ['ALL', ...Array.from(new Set(events.map((e) => e.agent)))];

  const filtered = filter === 'ALL' ? events : events.filter((e) => e.agent === filter);

  function fmtTime(iso: string) {
    const d = new Date(iso);
    return d.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }

  function typeColor(type: OpEvent['type']) {
    switch (type) {
      case 'success': return '#22c55e';
      case 'error':   return '#ef4444';
      case 'warning': return '#f59e0b';
      default:        return '#06b6d4';
    }
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <div style={{
            ...styles.liveDot,
            background: isLive ? '#22c55e' : '#6b7280',
            boxShadow: isLive ? '0 0 10px #22c55e' : 'none',
            animation: isLive ? 'pulse 2s infinite' : 'none',
          }} />
          <span style={styles.title}>LIVE OPERATIONS</span>
          {streaming && <span style={styles.liveTag}>● LIVE</span>}
        </div>
        <div style={styles.headerRight}>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            style={styles.filterSelect}
          >
            {agentNames.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Feed */}
      <div ref={feedRef} style={styles.feed}>
        {filtered.length === 0 && (
          <div style={styles.empty}>No operations to display. Waiting for activity...</div>
        )}
        {filtered.map((ev, idx) => {
          const isNew = idx === 0 && isLive;
          return (
            <div
              key={ev.id}
              onClick={() => setExpandedId(expandedId === ev.id ? null : ev.id)}
              style={{
                ...styles.row,
                animation: isNew ? 'fadeIn 0.4s ease' : undefined,
                opacity: idx > 30 ? 0.5 + (30 - idx) * 0.015 : 1,
              }}
            >
              <span style={styles.timestamp}>{fmtTime(ev.timestamp)}</span>
              <span style={{ ...styles.agentBadge, background: `${ev.agentColor}22`, color: ev.agentColor, border: `1px solid ${ev.agentColor}44` }}>
                {ev.agentEmoji} {ev.agent}
              </span>
              <span style={{ ...styles.action, color: typeColor(ev.type) }}>
                {ev.action}
              </span>
              {expandedId === ev.id && ev.detail && (
                <div style={styles.detail}>{ev.detail}</div>
              )}
            </div>
          );
        })}
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; background: rgba(34,197,94,0.15); }
          to   { opacity: 1; background: transparent; }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────

const FONT_MONO = "'JetBrains Mono', 'Fira Code', monospace";

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    background: 'rgba(10,10,15,0.9)',
    borderRadius: '12px',
    border: '1px solid rgba(255,255,255,0.06)',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 16px',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
    background: 'rgba(0,0,0,0.2)',
    flexShrink: 0,
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  liveDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    flexShrink: 0,
  },
  title: {
    fontFamily: FONT_MONO,
    fontSize: '11px',
    fontWeight: 600,
    letterSpacing: '0.12em',
    color: 'rgba(255,255,255,0.5)',
  },
  liveTag: {
    fontFamily: FONT_MONO,
    fontSize: '9px',
    fontWeight: 700,
    color: '#22c55e',
    letterSpacing: '0.08em',
    animation: 'pulse 2s infinite',
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  filterSelect: {
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '6px',
    color: 'rgba(255,255,255,0.7)',
    fontSize: '11px',
    padding: '4px 8px',
    fontFamily: FONT_MONO,
    cursor: 'pointer',
  },
  feed: {
    flex: 1,
    overflowY: 'auto',
    padding: '4px 0',
  },
  empty: {
    padding: '40px 20px',
    textAlign: 'center',
    color: 'rgba(255,255,255,0.3)',
    fontFamily: FONT_MONO,
    fontSize: '12px',
  },
  row: {
    display: 'grid',
    gridTemplateColumns: '70px auto 1fr',
    alignItems: 'baseline',
    gap: '8px',
    padding: '5px 16px',
    cursor: 'pointer',
    borderBottom: '1px solid rgba(255,255,255,0.03)',
    fontFamily: FONT_MONO,
    fontSize: '12px',
    transition: 'background 0.15s',
  },
  timestamp: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: '10px',
    flexShrink: 0,
  },
  agentBadge: {
    padding: '1px 6px',
    borderRadius: '4px',
    fontSize: '10px',
    fontWeight: 600,
    flexShrink: 0,
    whiteSpace: 'nowrap',
  },
  action: {
    fontSize: '12px',
    fontWeight: 500,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  detail: {
    gridColumn: '1 / -1',
    padding: '4px 0 2px 78px',
    fontSize: '11px',
    color: 'rgba(255,255,255,0.4)',
    fontFamily: FONT_MONO,
  },
};
