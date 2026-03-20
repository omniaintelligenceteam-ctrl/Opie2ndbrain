'use client';
import { useState, useEffect, useCallback } from 'react';

interface HealthData {
  gateway: { connected: boolean; latency: number };
  webhook: { healthy: boolean; uptime?: number };
  memory: { contextUsed?: number; contextTotal?: number };
  system: { ramUsed?: number; ramTotal?: number; diskPercent?: number };
  crons: { healthy: number; errored: number };
}

interface SystemHealthProps {
  relayBase?: string;
  pollInterval?: number;
}

function fmtUptime(seconds: number) {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m}m`;
}

function ProgressBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  const barColor = pct > 85 ? '#ef4444' : pct > 70 ? '#f59e0b' : color;
  return (
    <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: '3px', height: '5px', overflow: 'hidden' }}>
      <div style={{
        width: `${pct}%`,
        background: barColor,
        boxShadow: `0 0 6px ${barColor}80`,
        height: '100%',
        borderRadius: '3px',
        transition: 'width 0.5s ease',
      }} />
    </div>
  );
}

// Demo data
const DEMO_HEALTH: HealthData = {
  gateway: { connected: true, latency: 23 },
  webhook: { healthy: true, uptime: 305100 },
  memory: { contextUsed: 14200, contextTotal: 200000 },
  system: { ramUsed: 3.2, ramTotal: 7.8, diskPercent: 27 },
  crons: { healthy: 6, errored: 2 },
};

export default function SystemHealthWidget({ relayBase, pollInterval = 30000 }: SystemHealthProps) {
  const [health, setHealth] = useState<HealthData>(DEMO_HEALTH);
  const [loading, setLoading] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const fetchHealth = useCallback(async () => {
    if (!relayBase) return;
    setLoading(true);
    try {
      const res = await fetch(`${relayBase}/api/health`, {
        signal: AbortSignal.timeout(5000),
      });
      if (res.ok) {
        const data = await res.json();
        setHealth({
          gateway: { connected: data.gateway?.connected ?? true, latency: data.gateway?.latency ?? 20 },
          webhook: { healthy: data.webhook?.healthy ?? true, uptime: data.webhook?.uptime },
          memory: { contextUsed: data.memory?.contextUsed, contextTotal: data.memory?.contextTotal },
          system: { ramUsed: data.ram?.used, ramTotal: data.ram?.total, diskPercent: data.disk },
          crons: { healthy: data.crons?.healthy ?? 6, errored: data.crons?.errored ?? 2 },
        });
        setLastRefresh(new Date());
      }
    } catch {
      // keep demo data
    } finally {
      setLoading(false);
    }
  }, [relayBase]);

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, pollInterval);
    return () => clearInterval(interval);
  }, [fetchHealth, pollInterval]);

  const memUsed = health.memory.contextUsed ?? 0;
  const memTotal = health.memory.contextTotal ?? 200000;
  const ramUsed = health.system.ramUsed ?? 3.2;
  const ramTotal = health.system.ramTotal ?? 7.8;
  const disk = health.system.diskPercent ?? 27;
  const uptime = health.webhook.uptime ?? 305100;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <span style={styles.title}>SYSTEM</span>
        <button
          onClick={fetchHealth}
          style={{
            ...styles.refreshBtn,
            animation: loading ? 'spin 1s linear infinite' : undefined,
          }}
          title="Refresh"
        >
          ↻
        </button>
      </div>

      <div style={styles.rows}>
        {/* Gateway */}
        <div style={styles.row}>
          <div style={styles.rowLeft}>
            <span style={styles.rowLabel}>GW</span>
            <div style={{
              ...styles.dot,
              background: health.gateway.connected ? '#22c55e' : '#ef4444',
              boxShadow: health.gateway.connected ? '0 0 6px #22c55e80' : 'none',
            }} />
          </div>
          <span style={{
            ...styles.rowValue,
            color: health.gateway.connected ? '#22c55e' : '#ef4444',
          }}>
            {health.gateway.connected ? `✅ ${health.gateway.latency}ms` : '❌ OFFLINE'}
          </span>
        </div>

        {/* Webhook */}
        <div style={styles.row}>
          <div style={styles.rowLeft}>
            <span style={styles.rowLabel}>WH</span>
            <div style={{
              ...styles.dot,
              background: health.webhook.healthy ? '#22c55e' : '#ef4444',
              boxShadow: health.webhook.healthy ? '0 0 6px #22c55e80' : 'none',
            }} />
          </div>
          <span style={{ ...styles.rowValue, color: health.webhook.healthy ? '#22c55e' : '#ef4444' }}>
            {health.webhook.healthy ? `UP ${fmtUptime(uptime)}` : 'DOWN'}
          </span>
        </div>

        {/* RAM */}
        <div style={styles.row}>
          <div style={styles.rowLeft}>
            <span style={styles.rowLabel}>RAM</span>
          </div>
          <div style={styles.barCol}>
            <ProgressBar value={ramUsed} max={ramTotal} color="#06b6d4" />
            <span style={styles.barLabel}>{ramUsed.toFixed(1)} / {ramTotal.toFixed(1)} GB</span>
          </div>
        </div>

        {/* Disk */}
        <div style={styles.row}>
          <div style={styles.rowLeft}>
            <span style={styles.rowLabel}>DSK</span>
          </div>
          <div style={styles.barCol}>
            <ProgressBar value={disk} max={100} color="#a855f7" />
            <span style={styles.barLabel}>{disk}%</span>
          </div>
        </div>

        {/* Crons */}
        <div style={styles.row}>
          <div style={styles.rowLeft}>
            <span style={styles.rowLabel}>CRON</span>
          </div>
          <span style={styles.rowValue}>
            <span style={{ color: '#22c55e' }}>{health.crons.healthy}</span>
            {' / '}
            <span style={{ color: '#ef4444' }}>{health.crons.errored}</span>
          </span>
        </div>

        {/* Context */}
        <div style={styles.row}>
          <div style={styles.rowLeft}>
            <span style={styles.rowLabel}>CTX</span>
          </div>
          <div style={styles.barCol}>
            <ProgressBar value={memUsed} max={memTotal} color="#22c55e" />
            <span style={styles.barLabel}>
              {memUsed > 0 ? `${Math.round((memUsed / memTotal) * 100)}%` : '—'}
            </span>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
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
  refreshBtn: {
    background: 'rgba(255,255,255,0.05)',
    border: 'none',
    borderRadius: '5px',
    color: 'rgba(255,255,255,0.5)',
    fontSize: '12px',
    cursor: 'pointer',
    padding: '2px 6px',
    lineHeight: 1,
  },
  rows: {
    display: 'flex',
    flexDirection: 'column',
    gap: '7px',
  },
  row: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  rowLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    width: '36px',
    flexShrink: 0,
  },
  dot: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    flexShrink: 0,
  },
  rowLabel: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: '9px',
    fontWeight: 600,
    color: 'rgba(255,255,255,0.3)',
    letterSpacing: '0.06em',
  },
  rowValue: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: '11px',
    fontWeight: 500,
    color: 'rgba(255,255,255,0.8)',
  },
  barCol: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  barLabel: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: '9px',
    color: 'rgba(255,255,255,0.3)',
    textAlign: 'right',
  },
};
