'use client';
import { useState, useEffect, useCallback } from 'react';

interface MemoryEvent {
  id: string;
  type: 'write' | 'compress' | 'evict' | 'context' | 'narrative';
  description: string;
  detail?: string;
  timestamp: string;
  tokens?: { before?: number; after?: number };
}

interface MemoryActivityWidgetProps {
  relayBase?: string;
}

const TYPE_CONFIG: Record<MemoryEvent['type'], { color: string; icon: string }> = {
  write:     { color: '#06b6d4', icon: '✍️' },
  compress:  { color: '#a855f7', icon: '🗜️' },
  evict:     { color: '#f59e0b', icon: '📦' },
  context:   { color: '#22c55e', icon: '🧠' },
  narrative: { color: '#ec4899', icon: '📝' },
};

const DEMO_EVENTS: MemoryEvent[] = [
  { id: '1', type: 'write', description: 'Session log updated', detail: 'Daily log appended', timestamp: new Date(Date.now() - 120000).toISOString() },
  { id: '2', type: 'compress', description: 'Block #47 compressed', detail: '4200 → 2100 tokens (50%)', timestamp: new Date(Date.now() - 240000).toISOString(), tokens: { before: 4200, after: 2100 } },
  { id: '3', type: 'context', description: 'Context window usage', detail: '14,200 / 200,000 tokens (7%)', timestamp: new Date(Date.now() - 360000).toISOString() },
  { id: '4', type: 'narrative', description: 'SESSION_THREAD.md updated', detail: 'Narrative arc: Day 12', timestamp: new Date(Date.now() - 600000).toISOString() },
  { id: '5', type: 'write', description: 'Memory log: cron errors', detail: '9 jobs in error state', timestamp: new Date(Date.now() - 900000).toISOString() },
];

function ContextBar({ used, total }: { used: number; total: number }) {
  const pct = total > 0 ? Math.min(100, (used / total) * 100) : 0;
  const color = pct > 85 ? '#ef4444' : pct > 60 ? '#f59e0b' : '#22c55e';
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
        <span style={labelStyle}>CONTEXT</span>
        <span style={{ ...labelStyle, color }}>{pct.toFixed(0)}%</span>
      </div>
      <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: '3px', height: '5px', overflow: 'hidden' }}>
        <div style={{
          width: `${pct}%`,
          background: color,
          boxShadow: `0 0 6px ${color}80`,
          height: '100%',
          borderRadius: '3px',
          transition: 'width 0.5s ease',
        }} />
      </div>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: '9px',
  color: 'rgba(255,255,255,0.35)',
};

export default function MemoryActivityWidget({ relayBase }: MemoryActivityWidgetProps) {
  const [events, setEvents] = useState<MemoryEvent[]>(DEMO_EVENTS);
  const [ctxUsed, setCtxUsed] = useState(14200);
  const [ctxTotal] = useState(200000);

  const fetchActivity = useCallback(async () => {
    if (!relayBase) return;
    try {
      const res = await fetch(`${relayBase}/api/memory/activity`, {
        signal: AbortSignal.timeout(5000),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.events?.length) setEvents(data.events);
        if (data.contextUsed) setCtxUsed(data.contextUsed);
      }
    } catch {
      // keep demo data
    }
  }, [relayBase]);

  useEffect(() => {
    fetchActivity();
    const interval = setInterval(fetchActivity, 15000);
    return () => clearInterval(interval);
  }, [fetchActivity]);

  function fmtAge(iso: string) {
    const secs = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (secs < 60) return `${secs}s ago`;
    if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
    return `${Math.floor(secs / 3600)}h ago`;
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <span style={styles.title}>MEMORY</span>
        <span style={styles.icon}>🧠</span>
      </div>

      {/* Context bar */}
      <div style={styles.contextSection}>
        <ContextBar used={ctxUsed} total={ctxTotal} />
      </div>

      {/* Event log */}
      <div style={styles.eventList}>
        {events.slice(0, 6).map((ev) => {
          const cfg = TYPE_CONFIG[ev.type];
          return (
            <div key={ev.id} style={styles.eventRow}>
              <span style={{ ...styles.eventIcon, color: cfg.color }}>{cfg.icon}</span>
              <div style={styles.eventBody}>
                <span style={styles.eventDesc}>{ev.description}</span>
                {ev.tokens && (
                  <span style={styles.tokens}>
                    {ev.tokens.before} → {ev.tokens.after}
                  </span>
                )}
              </div>
              <span style={styles.eventAge}>{fmtAge(ev.timestamp)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    background: 'rgba(10,10,18,0.9)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: '10px',
    padding: '12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: '10px',
    fontWeight: 600,
    letterSpacing: '0.12em',
    color: 'rgba(255,255,255,0.4)',
  },
  icon: {
    fontSize: '12px',
  },
  contextSection: {
    padding: '8px 10px',
    background: 'rgba(0,0,0,0.2)',
    borderRadius: '6px',
  },
  eventList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '5px',
  },
  eventRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '7px',
  },
  eventIcon: {
    fontSize: '11px',
    width: '16px',
    textAlign: 'center',
    flexShrink: 0,
  },
  eventBody: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '1px',
    overflow: 'hidden',
  },
  eventDesc: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: '10px',
    color: 'rgba(255,255,255,0.7)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  tokens: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: '9px',
    color: '#a855f7',
  },
  eventAge: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: '9px',
    color: 'rgba(255,255,255,0.25)',
    flexShrink: 0,
  },
};
