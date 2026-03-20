'use client';
import { useState, useEffect, useCallback } from 'react';

interface Task {
  id: string;
  name: string;
  owner: string;
  ownerColor: string;
  status: 'blocked' | 'waiting' | 'active' | 'done';
  nextAction: string;
  age: string;
}

interface OpenLoopsPanelProps {
  relayBase?: string;
}

const STATUS_BADGE: Record<Task['status'], { bg: string; color: string; label: string }> = {
  blocked: { bg: 'rgba(239,68,68,0.15)', color: '#ef4444', label: '🔴 BLOCKED' },
  waiting: { bg: 'rgba(245,158,11,0.15)', color: '#f59e0b', label: '🟡 WAITING' },
  active:  { bg: 'rgba(34,197,94,0.15)',  color: '#22c55e', label: '🟢 ACTIVE' },
  done:    { bg: 'rgba(107,114,128,0.15)', color: '#6b7280', label: '⚪ DONE' },
};

const OWNER_COLORS: Record<string, string> = {
  G: '#a855f7',
  Wes: '#06b6d4',
  Opie: '#06b6d4',
  Scout: '#22c55e',
};

const DEMO_TASKS: Task[] = [
  { id: '1', name: 'SAP Demo Redeploy', owner: 'G', ownerColor: '#a855f7', status: 'blocked', nextAction: 'Need Vercel redeploy by Wes', age: '3 days' },
  { id: '2', name: 'Cron Timeout Triage', owner: 'G', ownerColor: '#a855f7', status: 'waiting', nextAction: 'Review 9 cron jobs in error state', age: '2 days' },
  { id: '3', name: 'memory_search Ollama', owner: 'Opie', ownerColor: '#06b6d4', status: 'done', nextAction: 'Resolved — mxbai embed failed, reverted nomic', age: '1 day' },
  { id: '4', name: 'Soul Guardian Init', owner: 'G', ownerColor: '#a855f7', status: 'active', nextAction: 'Baselines initialized, monitoring drift', age: '1 day' },
  { id: '5', name: 'LCM Compression', owner: 'Opie', ownerColor: '#06b6d4', status: 'active', nextAction: 'Running compression on block #48', age: '4h' },
];

export default function OpenLoopsPanel({ relayBase }: OpenLoopsPanelProps) {
  const [tasks, setTasks] = useState<Task[]>(DEMO_TASKS);
  const [filter, setFilter] = useState<Task['status'] | 'all'>('all');

  const fetchTasks = useCallback(async () => {
    if (!relayBase) return;
    try {
      const res = await fetch(`${relayBase}/api/tasks/open-loops`, {
        signal: AbortSignal.timeout(5000),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.tasks?.length) {
          setTasks(data.tasks.map((t: Task) => ({
            ...t,
            ownerColor: OWNER_COLORS[t.owner] ?? '#6b7280',
          })));
        }
      }
    } catch {
      // keep demo data
    }
  }, [relayBase]);

  useEffect(() => {
    fetchTasks();
    const interval = setInterval(fetchTasks, 30000);
    return () => clearInterval(interval);
  }, [fetchTasks]);

  const filtered = filter === 'all' ? tasks : tasks.filter((t) => t.status === filter);

  const counts: Record<string, number> = {
    blocked: tasks.filter((t) => t.status === 'blocked').length,
    waiting: tasks.filter((t) => t.status === 'waiting').length,
    active: tasks.filter((t) => t.status === 'active').length,
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <span style={styles.title}>OPEN LOOPS</span>
        <div style={styles.badges}>
          {Object.entries(counts).map(([key, count]) => (
            <span key={key} style={{
              ...styles.badge,
              background: STATUS_BADGE[key as Task['status']]?.bg,
              color: STATUS_BADGE[key as Task['status']]?.color,
            }}>
              {count}
            </span>
          ))}
        </div>
      </div>

      {/* Filter tabs */}
      <div style={styles.filterRow}>
        {(['all', 'blocked', 'waiting', 'active'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              ...styles.filterBtn,
              background: filter === f ? 'rgba(168,85,247,0.2)' : 'transparent',
              color: filter === f ? '#a855f7' : 'rgba(255,255,255,0.4)',
              borderColor: filter === f ? 'rgba(168,85,247,0.4)' : 'transparent',
            }}
          >
            {f.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Task list */}
      <div style={styles.list}>
        {filtered.length === 0 && (
          <div style={styles.empty}>No tasks in this state</div>
        )}
        {filtered.map((task) => {
          const badge = STATUS_BADGE[task.status];
          return (
            <div key={task.id} style={styles.taskCard}>
              <div style={styles.taskTop}>
                <span style={styles.taskName}>{task.name}</span>
                <span style={{ ...styles.statusBadge, background: badge.bg, color: badge.color }}>
                  {badge.label}
                </span>
              </div>
              <div style={styles.taskMeta}>
                <span style={{ ...styles.owner, color: task.ownerColor }}>{task.owner}</span>
                <span style={styles.dot}>·</span>
                <span style={styles.age}>{task.age}</span>
              </div>
              <div style={styles.nextAction}>{task.nextAction}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    background: 'rgba(10,10,18,0.9)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: '10px',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 14px',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
    flexShrink: 0,
  },
  title: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: '10px',
    fontWeight: 600,
    letterSpacing: '0.12em',
    color: 'rgba(255,255,255,0.4)',
  },
  badges: {
    display: 'flex',
    gap: '4px',
  },
  badge: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: '9px',
    fontWeight: 700,
    padding: '1px 5px',
    borderRadius: '4px',
  },
  filterRow: {
    display: 'flex',
    gap: '4px',
    padding: '8px 14px',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
    flexShrink: 0,
  },
  filterBtn: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: '9px',
    fontWeight: 600,
    letterSpacing: '0.06em',
    padding: '3px 8px',
    borderRadius: '4px',
    border: '1px solid transparent',
    cursor: 'pointer',
    transition: 'all 0.15s',
  },
  list: {
    flex: 1,
    overflowY: 'auto',
    padding: '8px 0',
  },
  empty: {
    padding: '20px 14px',
    textAlign: 'center',
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: '11px',
    color: 'rgba(255,255,255,0.3)',
  },
  taskCard: {
    padding: '10px 14px',
    borderBottom: '1px solid rgba(255,255,255,0.04)',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    transition: 'background 0.15s',
    cursor: 'default',
  },
  taskTop: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '8px',
  },
  taskName: {
    fontSize: '12px',
    fontWeight: 600,
    color: 'rgba(255,255,255,0.85)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  statusBadge: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: '8px',
    fontWeight: 700,
    padding: '2px 5px',
    borderRadius: '3px',
    flexShrink: 0,
    letterSpacing: '0.04em',
  },
  taskMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: '10px',
  },
  owner: {
    fontWeight: 600,
  },
  dot: {
    color: 'rgba(255,255,255,0.2)',
  },
  age: {
    color: 'rgba(255,255,255,0.3)',
  },
  nextAction: {
    fontSize: '11px',
    color: 'rgba(255,255,255,0.4)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
};
