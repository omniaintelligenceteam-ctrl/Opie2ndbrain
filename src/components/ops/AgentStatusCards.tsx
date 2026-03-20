'use client';
import { useState, useEffect, useCallback } from 'react';

interface AgentStatus {
  id: string;
  name: string;
  emoji: string;
  color: string;
  status: 'online' | 'working' | 'idle' | 'offline';
  currentTask: string;
  model: string;
  lastActive: string;
  tokensToday: number;
}

interface AgentStatusCardsProps {
  relayBase?: string;
  pollInterval?: number;
}

const STATUS_COLORS = {
  online:  '#22c55e',
  working: '#f59e0b',
  idle:    '#6b7280',
  offline: '#ef4444',
};

function statusPulse(status: AgentStatus['status']) {
  if (status === 'online') return 'pulse-ring-green 2s ease-out infinite';
  if (status === 'working') return 'pulse-ring-amber 1.5s ease-out infinite';
  return 'none';
}

// Demo data
function demoAgents(): AgentStatus[] {
  return [
    {
      id: 'main',
      name: 'G',
      emoji: '🤖',
      color: '#a855f7',
      status: 'online',
      currentTask: 'Heartbeat check — monitoring system health',
      model: 'claude-opus-4-6',
      lastActive: '2m ago',
      tokensToday: 48200,
    },
    {
      id: 'opie',
      name: 'Opie',
      emoji: '🐙',
      color: '#06b6d4',
      status: 'working',
      currentTask: '2nd Brain relay — processing events',
      model: 'gemini-2.5-flash',
      lastActive: '30s ago',
      tokensToday: 12800,
    },
    {
      id: 'scout',
      name: 'Scout',
      emoji: '🦅',
      color: '#22c55e',
      status: 'idle',
      currentTask: 'Lead gen — awaiting next extraction cycle',
      model: 'minimax-m2.7',
      lastActive: '5m ago',
      tokensToday: 3400,
    },
    {
      id: 'ops-guardian',
      name: 'Ops Guardian',
      emoji: '🛡️',
      color: '#f59e0b',
      status: 'online',
      currentTask: 'Cron health check — monitoring job errors',
      model: 'minimax-m2.7',
      lastActive: '4m ago',
      tokensToday: 2100,
    },
    {
      id: 'memory-curator',
      name: 'Memory Curator',
      emoji: '🧠',
      color: '#ec4899',
      status: 'idle',
      currentTask: 'Daily validation — recall pass rate check',
      model: 'minimax-m2.7',
      lastActive: '15m ago',
      tokensToday: 1800,
    },
    {
      id: 'elon',
      name: 'Elon (CTO)',
      emoji: '⚡',
      color: '#3b82f6',
      status: 'idle',
      currentTask: 'Awaiting technical architecture tasks',
      model: 'claude-opus-4-6',
      lastActive: '1h ago',
      tokensToday: 0,
    },
    {
      id: 'gary',
      name: 'Gary (CMO)',
      emoji: '📢',
      color: '#f97316',
      status: 'idle',
      currentTask: 'Content strategy — awaiting next campaign',
      model: 'claude-opus-4-6',
      lastActive: '2h ago',
      tokensToday: 0,
    },
    {
      id: 'mark',
      name: 'Mark (CRO)',
      emoji: '💰',
      color: '#14b8a6',
      status: 'idle',
      currentTask: 'Revenue pipeline — awaiting lead data',
      model: 'claude-opus-4-6',
      lastActive: '3h ago',
      tokensToday: 0,
    },
    {
      id: 'ray',
      name: 'Ray (CFO)',
      emoji: '📊',
      color: '#8b5cf6',
      status: 'idle',
      currentTask: 'Cost tracking — daily spend analysis',
      model: 'claude-opus-4-6',
      lastActive: '4h ago',
      tokensToday: 0,
    },
    {
      id: 'tim',
      name: 'Tim (COO)',
      emoji: '⚙️',
      color: '#64748b',
      status: 'idle',
      currentTask: 'Operations oversight — process optimization',
      model: 'claude-opus-4-6',
      lastActive: '4h ago',
      tokensToday: 0,
    },
    {
      id: 'steve',
      name: 'Steve (CPO)',
      emoji: '🎯',
      color: '#e11d48',
      status: 'idle',
      currentTask: 'Product roadmap — feature prioritization',
      model: 'claude-opus-4-6',
      lastActive: '5h ago',
      tokensToday: 0,
    },
    {
      id: 'pepper',
      name: 'Pepper (Chief of Staff)',
      emoji: '🌶️',
      color: '#dc2626',
      status: 'idle',
      currentTask: 'Coordination — scheduling & delegation',
      model: 'claude-opus-4-6',
      lastActive: '6h ago',
      tokensToday: 0,
    },
  ];
}

export default function AgentStatusCards({ relayBase, pollInterval = 10000 }: AgentStatusCardsProps) {
  const [agents, setAgents] = useState<AgentStatus[]>(demoAgents());
  const [loading, setLoading] = useState(true);

  const fetchAgents = useCallback(async () => {
    if (!relayBase) {
      setLoading(false);
      return;
    }
    try {
      const res = await fetch(`${relayBase}/api/agents/status`, {
        signal: AbortSignal.timeout(5000),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.agents?.length) {
          setAgents(data.agents);
        }
      }
    } catch {
      // Keep demo data on error
    } finally {
      setLoading(false);
    }
  }, [relayBase]);

  useEffect(() => {
    fetchAgents();
    const interval = setInterval(fetchAgents, pollInterval);
    return () => clearInterval(interval);
  }, [fetchAgents, pollInterval]);

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <span style={styles.title}>AGENTS</span>
        <span style={styles.count}>{agents.length} active</span>
      </div>
      <div style={styles.cardsRow}>
        {agents.map((agent) => (
          <div key={agent.id} style={styles.card}>
            {/* Status dot + name */}
            <div style={styles.cardTop}>
              <div style={styles.agentMeta}>
                <span style={styles.emoji}>{agent.emoji}</span>
                <span style={{ ...styles.name, color: agent.color }}>{agent.name}</span>
              </div>
              <div style={styles.statusWrapper}>
                <div style={{
                  ...styles.statusDot,
                  background: STATUS_COLORS[agent.status],
                  boxShadow: `0 0 8px ${STATUS_COLORS[agent.status]}80`,
                  animation: statusPulse(agent.status) !== 'none' ? statusPulse(agent.status) : undefined,
                }} />
                <span style={{ ...styles.statusLabel, color: STATUS_COLORS[agent.status] }}>
                  {agent.status.toUpperCase()}
                </span>
              </div>
            </div>

            {/* Current task */}
            <div style={styles.task} title={agent.currentTask}>
              {agent.currentTask}
            </div>

            {/* Footer: model + last active + tokens */}
            <div style={styles.footer}>
              <span style={styles.model}>{agent.model}</span>
              <span style={styles.lastActive}>{agent.lastActive}</span>
              <span style={styles.tokens}>
                {(agent.tokensToday / 1000).toFixed(1)}k tokens
              </span>
            </div>

            {/* Color accent bar */}
            <div style={{ ...styles.accentBar, background: agent.color }} />
          </div>
        ))}
      </div>

      <style>{`
        @keyframes pulse-ring-green {
          0% { box-shadow: 0 0 0 0 rgba(34,197,94,0.5); }
          70% { box-shadow: 0 0 0 8px rgba(34,197,94,0); }
          100% { box-shadow: 0 0 0 0 rgba(34,197,94,0); }
        }
        @keyframes pulse-ring-amber {
          0% { box-shadow: 0 0 0 0 rgba(245,158,11,0.5); }
          70% { box-shadow: 0 0 0 8px rgba(245,158,11,0); }
          100% { box-shadow: 0 0 0 0 rgba(245,158,11,0); }
        }
      `}</style>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 4px',
  },
  title: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: '10px',
    fontWeight: 600,
    letterSpacing: '0.12em',
    color: 'rgba(255,255,255,0.4)',
  },
  count: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: '10px',
    color: 'rgba(255,255,255,0.3)',
  },
  cardsRow: {
    display: 'flex',
    gap: '8px',
    overflowX: 'auto',
    paddingBottom: '4px',
  },
  card: {
    flex: 1,
    minWidth: '160px',
    background: 'rgba(15,15,24,0.9)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: '10px',
    padding: '12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    position: 'relative',
    overflow: 'hidden',
    transition: 'border-color 0.2s, transform 0.2s',
    cursor: 'default',
  },
  cardTop: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  agentMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  emoji: {
    fontSize: '16px',
  },
  name: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: '13px',
    fontWeight: 700,
  },
  statusWrapper: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  statusDot: {
    width: '7px',
    height: '7px',
    borderRadius: '50%',
    flexShrink: 0,
  },
  statusLabel: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: '9px',
    fontWeight: 700,
    letterSpacing: '0.06em',
  },
  task: {
    fontSize: '11px',
    color: 'rgba(255,255,255,0.5)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    lineHeight: 1.4,
  },
  footer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '4px',
    marginTop: 'auto',
  },
  model: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: '9px',
    color: 'rgba(255,255,255,0.3)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  lastActive: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: '9px',
    color: 'rgba(255,255,255,0.25)',
    whiteSpace: 'nowrap',
  },
  tokens: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: '9px',
    color: 'rgba(6,182,212,0.7)',
    whiteSpace: 'nowrap',
  },
  accentBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '2px',
    opacity: 0.6,
  },
};
