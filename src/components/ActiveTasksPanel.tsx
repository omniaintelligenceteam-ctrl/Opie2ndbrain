'use client';
import { useState, useEffect } from 'react';

export interface Task {
  id: string;
  agentId: string;
  agentName: string;
  agentEmoji: string;
  label: string;
  startTime: Date;
  status: 'running' | 'complete' | 'failed';
  output?: string;
}

interface ActiveTasksPanelProps {
  tasks?: Task[];
  onTaskClick?: (taskId: string) => void;
}

// Demo tasks for display
const DEMO_TASKS: Task[] = [
  {
    id: '1',
    agentId: 'research',
    agentName: 'Research Agent',
    agentEmoji: '🔍',
    label: 'Competitor analysis for lighting industry',
    startTime: new Date(Date.now() - 1000 * 60 * 5), // 5 mins ago
    status: 'running',
    output: 'Found 12 competitors in the local market...',
  },
  {
    id: '2',
    agentId: 'content',
    agentName: 'Content Agent',
    agentEmoji: '✍️',
    label: 'Write blog post about LED benefits',
    startTime: new Date(Date.now() - 1000 * 60 * 15), // 15 mins ago
    status: 'complete',
    output: 'Draft completed: 1,200 words covering 5 key benefits...',
  },
  {
    id: '3',
    agentId: 'outreach',
    agentName: 'Outreach Agent',
    agentEmoji: '📧',
    label: 'Send follow-up emails to Q4 leads',
    startTime: new Date(Date.now() - 1000 * 60 * 2), // 2 mins ago
    status: 'running',
    output: 'Sent 8/25 emails, processing...',
  },
];

export default function ActiveTasksPanel({ tasks = DEMO_TASKS, onTaskClick }: ActiveTasksPanelProps) {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const formatRuntime = (startTime: Date): string => {
    const diff = Math.floor((currentTime.getTime() - startTime.getTime()) / 1000);
    if (diff < 60) return `${diff}s`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ${diff % 60}s`;
    return `${Math.floor(diff / 3600)}h ${Math.floor((diff % 3600) / 60)}m`;
  };

  const getStatusColor = (status: Task['status']): string => {
    switch (status) {
      case 'running': return '#f59e0b';
      case 'complete': return '#22c55e';
      case 'failed': return '#ef4444';
      default: return '#737373';
    }
  };

  const getStatusIcon = (status: Task['status']): string => {
    switch (status) {
      case 'running': return '⏳';
      case 'complete': return '✅';
      case 'failed': return '❌';
      default: return '❓';
    }
  };

  const runningTasks = tasks.filter(t => t.status === 'running');
  const completedTasks = tasks.filter(t => t.status !== 'running');

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <span style={styles.headerIcon}>📋</span>
        <h2 style={styles.title}>Active Tasks</h2>
        <div style={styles.stats}>
          <span style={{ ...styles.statBadge, background: 'rgba(245,158,11,0.2)', color: '#f59e0b' }}>
            {runningTasks.length} running
          </span>
          <span style={{ ...styles.statBadge, background: 'rgba(34,197,94,0.2)', color: '#22c55e' }}>
            {completedTasks.length} done
          </span>
        </div>
      </div>

      <div style={styles.taskList}>
        {tasks.length === 0 ? (
          <div style={styles.emptyState}>
            <span style={styles.emptyIcon}>😴</span>
            <p>No active tasks</p>
            <span style={styles.emptySubtext}>Deploy an agent to get started</span>
          </div>
        ) : (
          <>
            {runningTasks.length > 0 && (
              <div style={styles.section}>
                <div style={styles.sectionTitle}>🔄 In Progress</div>
                {runningTasks.map(task => (
                  <div 
                    key={task.id} 
                    style={styles.taskCard}
                    onClick={() => onTaskClick?.(task.id)}
                  >
                    <div style={styles.taskHeader}>
                      <div style={styles.taskAgent}>
                        <span style={styles.agentEmoji}>{task.agentEmoji}</span>
                        <span style={styles.agentName}>{task.agentName}</span>
                      </div>
                      <div style={styles.taskMeta}>
                        <span style={{ ...styles.runtime, color: getStatusColor(task.status) }}>
                          {formatRuntime(task.startTime)}
                        </span>
                        <span style={styles.statusIcon}>{getStatusIcon(task.status)}</span>
                      </div>
                    </div>
                    <div style={styles.taskLabel}>{task.label}</div>
                    {task.output && (
                      <div style={styles.taskOutput}>
                        <span style={styles.outputLabel}>Latest:</span>
                        <span style={styles.outputText}>{task.output}</span>
                      </div>
                    )}
                    <div style={styles.progressBar}>
                      <div style={styles.progressBarInner} />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {completedTasks.length > 0 && (
              <div style={styles.section}>
                <div style={styles.sectionTitle}>✅ Completed</div>
                {completedTasks.map(task => (
                  <div 
                    key={task.id} 
                    style={{ ...styles.taskCard, ...styles.taskCardCompleted }}
                    onClick={() => onTaskClick?.(task.id)}
                  >
                    <div style={styles.taskHeader}>
                      <div style={styles.taskAgent}>
                        <span style={styles.agentEmoji}>{task.agentEmoji}</span>
                        <span style={styles.agentName}>{task.agentName}</span>
                      </div>
                      <div style={styles.taskMeta}>
                        <span style={{ ...styles.runtime, color: getStatusColor(task.status) }}>
                          {formatRuntime(task.startTime)}
                        </span>
                        <span style={styles.statusIcon}>{getStatusIcon(task.status)}</span>
                      </div>
                    </div>
                    <div style={styles.taskLabel}>{task.label}</div>
                    {task.output && (
                      <div style={styles.taskOutput}>
                        <span style={styles.outputLabel}>Result:</span>
                        <span style={styles.outputText}>{task.output}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    background: '#1a1a2e',
    borderRadius: '12px',
    border: '1px solid rgba(255,255,255,0.1)',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    padding: '16px 20px',
    borderBottom: '1px solid rgba(255,255,255,0.1)',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  headerIcon: {
    fontSize: '24px',
  },
  title: {
    color: '#fff',
    fontSize: '1rem',
    fontWeight: 600,
    margin: 0,
    flex: 1,
  },
  stats: {
    display: 'flex',
    gap: '8px',
  },
  statBadge: {
    padding: '4px 10px',
    borderRadius: '12px',
    fontSize: '0.7rem',
    fontWeight: 500,
  },
  taskList: {
    flex: 1,
    overflowY: 'auto',
    padding: '12px',
  },
  section: {
    marginBottom: '16px',
  },
  sectionTitle: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: '0.7rem',
    fontWeight: 600,
    padding: '0 8px 8px',
  },
  taskCard: {
    background: 'rgba(255,255,255,0.05)',
    borderRadius: '10px',
    padding: '14px',
    marginBottom: '8px',
    cursor: 'pointer',
    border: '1px solid rgba(255,255,255,0.05)',
    transition: 'all 0.2s ease',
  },
  taskCardCompleted: {
    opacity: 0.7,
  },
  taskHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
  },
  taskAgent: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  agentEmoji: {
    fontSize: '18px',
  },
  agentName: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: '0.75rem',
  },
  taskMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  runtime: {
    fontSize: '0.8rem',
    fontWeight: 600,
    fontFamily: 'monospace',
  },
  statusIcon: {
    fontSize: '14px',
  },
  taskLabel: {
    color: '#fff',
    fontSize: '0.85rem',
    fontWeight: 500,
    marginBottom: '8px',
  },
  taskOutput: {
    background: 'rgba(0,0,0,0.2)',
    borderRadius: '6px',
    padding: '8px 10px',
    fontSize: '0.75rem',
    marginTop: '8px',
  },
  outputLabel: {
    color: 'rgba(255,255,255,0.4)',
    marginRight: '6px',
  },
  outputText: {
    color: 'rgba(255,255,255,0.8)',
  },
  progressBar: {
    height: '3px',
    background: 'rgba(255,255,255,0.1)',
    borderRadius: '2px',
    marginTop: '10px',
    overflow: 'hidden',
  },
  progressBarInner: {
    height: '100%',
    width: '60%',
    background: 'linear-gradient(90deg, #667eea, #764ba2)',
    borderRadius: '2px',
    animation: 'progress 2s ease-in-out infinite',
  },
  emptyState: {
    textAlign: 'center',
    padding: '40px 20px',
    color: 'rgba(255,255,255,0.4)',
  },
  emptyIcon: {
    fontSize: '40px',
    display: 'block',
    marginBottom: '12px',
  },
  emptySubtext: {
    fontSize: '0.75rem',
    color: 'rgba(255,255,255,0.3)',
    display: 'block',
    marginTop: '6px',
  },
};
