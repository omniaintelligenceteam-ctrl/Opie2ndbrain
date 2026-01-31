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
  progress?: number;
  sessionId?: string;
  logs?: { timestamp: string; message: string; level: 'info' | 'warn' | 'error' }[];
  steps?: { name: string; status: 'pending' | 'running' | 'complete' | 'failed' }[];
}

interface ActiveTasksPanelProps {
  tasks?: Task[];
  onTaskClick?: (taskId: string) => void;
}

// Demo tasks with more detail
const DEMO_TASKS: Task[] = [
  {
    id: '1',
    agentId: 'research',
    agentName: 'Research Agent',
    agentEmoji: '🔍',
    label: 'Competitor analysis for lighting industry',
    startTime: new Date(Date.now() - 1000 * 60 * 5),
    status: 'running',
    progress: 65,
    output: 'Found 12 competitors in the local market. Analyzing pricing strategies...',
    steps: [
      { name: 'Identify competitors', status: 'complete' },
      { name: 'Gather pricing data', status: 'running' },
      { name: 'Analyze positioning', status: 'pending' },
      { name: 'Generate report', status: 'pending' },
    ],
    logs: [
      { timestamp: '5m ago', message: 'Task started', level: 'info' },
      { timestamp: '4m ago', message: 'Found 12 competitors via web search', level: 'info' },
      { timestamp: '3m ago', message: 'Scraping competitor websites...', level: 'info' },
      { timestamp: '2m ago', message: 'Rate limit hit on site #4, retrying...', level: 'warn' },
      { timestamp: '1m ago', message: 'Pricing data collected for 8/12 competitors', level: 'info' },
    ],
  },
  {
    id: '2',
    agentId: 'content',
    agentName: 'Content Agent',
    agentEmoji: '✍️',
    label: 'Write blog post about LED benefits',
    startTime: new Date(Date.now() - 1000 * 60 * 15),
    status: 'complete',
    progress: 100,
    output: 'Draft completed: 1,200 words covering 5 key benefits of LED lighting for commercial spaces.',
    steps: [
      { name: 'Research topic', status: 'complete' },
      { name: 'Create outline', status: 'complete' },
      { name: 'Write draft', status: 'complete' },
      { name: 'Edit & polish', status: 'complete' },
    ],
    logs: [
      { timestamp: '15m ago', message: 'Task started', level: 'info' },
      { timestamp: '12m ago', message: 'Outline created with 5 sections', level: 'info' },
      { timestamp: '8m ago', message: 'First draft complete (1,450 words)', level: 'info' },
      { timestamp: '5m ago', message: 'Edited down to 1,200 words', level: 'info' },
      { timestamp: '2m ago', message: 'Task completed successfully', level: 'info' },
    ],
  },
  {
    id: '3',
    agentId: 'outreach',
    agentName: 'Outreach Agent',
    agentEmoji: '📧',
    label: 'Send follow-up emails to Q4 leads',
    startTime: new Date(Date.now() - 1000 * 60 * 2),
    status: 'running',
    progress: 32,
    output: 'Sent 8/25 emails, processing next batch...',
    steps: [
      { name: 'Load lead list', status: 'complete' },
      { name: 'Personalize emails', status: 'running' },
      { name: 'Send emails', status: 'running' },
      { name: 'Log to CRM', status: 'pending' },
    ],
    logs: [
      { timestamp: '2m ago', message: 'Task started', level: 'info' },
      { timestamp: '2m ago', message: 'Loaded 25 leads from CRM', level: 'info' },
      { timestamp: '1m ago', message: 'Sent 8 emails successfully', level: 'info' },
      { timestamp: '30s ago', message: 'Processing batch 2 of 4...', level: 'info' },
    ],
  },
];

export default function ActiveTasksPanel({ tasks = DEMO_TASKS, onTaskClick }: ActiveTasksPanelProps) {
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  useEffect(() => {
    // Set initial time on client only (avoids hydration mismatch)
    setCurrentTime(new Date());
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const formatRuntime = (startTime: Date): string => {
    if (!currentTime) return '...';
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

  const getStepStatusIcon = (status: string): string => {
    switch (status) {
      case 'complete': return '✅';
      case 'running': return '⏳';
      case 'failed': return '❌';
      default: return '○';
    }
  };

  const getLogLevelColor = (level: string): string => {
    switch (level) {
      case 'error': return '#ef4444';
      case 'warn': return '#f59e0b';
      default: return 'rgba(255,255,255,0.6)';
    }
  };

  const runningTasks = tasks.filter(t => t.status === 'running');
  const completedTasks = tasks.filter(t => t.status !== 'running');

  // Detail View
  if (selectedTask) {
    const task = selectedTask;
    return (
      <div style={styles.container}>
        <button onClick={() => setSelectedTask(null)} style={styles.backButton}>
          ← Back to Tasks
        </button>

        {/* Task Header */}
        <div style={styles.detailHeader}>
          <div style={styles.taskIcon}>
            <span style={styles.taskEmoji}>{task.agentEmoji}</span>
          </div>
          <div style={styles.taskHeaderInfo}>
            <h2 style={styles.taskTitle}>{task.label}</h2>
            <div style={styles.taskMeta}>
              <span style={styles.taskAgent}>by {task.agentName}</span>
              <span style={{
                ...styles.statusBadge,
                background: `${getStatusColor(task.status)}20`,
                color: getStatusColor(task.status),
              }}>
                {getStatusIcon(task.status)} {task.status}
              </span>
            </div>
          </div>
        </div>

        {/* Runtime Stats */}
        <div style={styles.statsRow}>
          <div style={styles.statBox}>
            <span style={styles.statLabel}>Runtime</span>
            <span style={styles.statValue}>{formatRuntime(task.startTime)}</span>
          </div>
          <div style={styles.statBox}>
            <span style={styles.statLabel}>Progress</span>
            <span style={styles.statValue}>{task.progress || 0}%</span>
          </div>
          <div style={styles.statBox}>
            <span style={styles.statLabel}>Started</span>
            <span style={styles.statValue}>{task.startTime.toLocaleTimeString()}</span>
          </div>
        </div>

        {/* Progress Bar */}
        {task.status === 'running' && (
          <div style={styles.detailSection}>
            <h3 style={styles.sectionTitle}>📊 Progress</h3>
            <div style={styles.progressBarContainer}>
              <div style={{
                ...styles.progressBarFill,
                width: `${task.progress || 0}%`,
              }} />
            </div>
          </div>
        )}

        {/* Steps */}
        {task.steps && (
          <div style={styles.detailSection}>
            <h3 style={styles.sectionTitle}>📋 Steps</h3>
            <div style={styles.stepsList}>
              {task.steps.map((step, i) => (
                <div key={i} style={{
                  ...styles.stepItem,
                  opacity: step.status === 'pending' ? 0.5 : 1,
                }}>
                  <span style={styles.stepIcon}>{getStepStatusIcon(step.status)}</span>
                  <span style={styles.stepName}>{step.name}</span>
                  <span style={{
                    ...styles.stepStatus,
                    color: step.status === 'running' ? '#f59e0b' : 
                           step.status === 'complete' ? '#22c55e' : 
                           step.status === 'failed' ? '#ef4444' : 'rgba(255,255,255,0.4)'
                  }}>
                    {step.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Output */}
        {task.output && (
          <div style={styles.detailSection}>
            <h3 style={styles.sectionTitle}>📤 Latest Output</h3>
            <div style={styles.outputBox}>
              <p style={styles.outputText}>{task.output}</p>
            </div>
          </div>
        )}

        {/* Logs */}
        {task.logs && (
          <div style={styles.detailSection}>
            <h3 style={styles.sectionTitle}>📜 Logs</h3>
            <div style={styles.logsContainer}>
              {task.logs.map((log, i) => (
                <div key={i} style={styles.logItem}>
                  <span style={styles.logTime}>{log.timestamp}</span>
                  <span style={{
                    ...styles.logMessage,
                    color: getLogLevelColor(log.level),
                  }}>
                    {log.level === 'warn' && '⚠️ '}
                    {log.level === 'error' && '❌ '}
                    {log.message}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div style={styles.actionsSection}>
          {task.status === 'running' && (
            <button style={styles.cancelButton}>⏹️ Cancel Task</button>
          )}
          {task.status === 'complete' && (
            <button style={styles.rerunButton}>🔄 Run Again</button>
          )}
          {task.status === 'failed' && (
            <button style={styles.retryButton}>🔄 Retry</button>
          )}
        </div>
      </div>
    );
  }

  // List View
  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <span style={styles.headerIcon}>📋</span>
          <div>
            <h2 style={styles.title}>Active Tasks</h2>
            <span style={styles.subtitle}>{runningTasks.length} running, {completedTasks.length} completed</span>
          </div>
        </div>
      </div>

      <div style={styles.taskList}>
        {tasks.length === 0 ? (
          <div style={styles.emptyState}>
            <span style={styles.emptyIcon}>😴</span>
            <h3>No active tasks</h3>
            <p>Deploy an agent to get started</p>
          </div>
        ) : (
          <>
            {runningTasks.length > 0 && (
              <div style={styles.section}>
                <div style={styles.sectionLabel}>🔄 In Progress</div>
                {runningTasks.map(task => (
                  <div 
                    key={task.id} 
                    style={styles.taskCard}
                    onClick={() => setSelectedTask(task)}
                  >
                    <div style={styles.taskCardHeader}>
                      <div style={styles.taskCardAgent}>
                        <span style={styles.agentEmoji}>{task.agentEmoji}</span>
                        <span style={styles.agentName}>{task.agentName}</span>
                      </div>
                      <div style={styles.taskCardMeta}>
                        <span style={{ ...styles.runtime, color: '#f59e0b' }}>
                          {formatRuntime(task.startTime)}
                        </span>
                      </div>
                    </div>
                    <div style={styles.taskCardLabel}>{task.label}</div>
                    {task.progress !== undefined && (
                      <div style={styles.progressBar}>
                        <div style={{ ...styles.progressBarInner, width: `${task.progress}%` }} />
                      </div>
                    )}
                    {task.output && (
                      <div style={styles.taskCardOutput}>
                        <span style={styles.outputLabel}>Output:</span>
                        <span style={styles.outputPreview}>{task.output.slice(0, 80)}...</span>
                      </div>
                    )}
                    <div style={styles.viewDetails}>Click to view details →</div>
                  </div>
                ))}
              </div>
            )}

            {completedTasks.length > 0 && (
              <div style={styles.section}>
                <div style={styles.sectionLabel}>✅ Completed</div>
                {completedTasks.map(task => (
                  <div 
                    key={task.id} 
                    style={{ ...styles.taskCard, ...styles.taskCardCompleted }}
                    onClick={() => setSelectedTask(task)}
                  >
                    <div style={styles.taskCardHeader}>
                      <div style={styles.taskCardAgent}>
                        <span style={styles.agentEmoji}>{task.agentEmoji}</span>
                        <span style={styles.agentName}>{task.agentName}</span>
                      </div>
                      <div style={styles.taskCardMeta}>
                        <span style={{ ...styles.runtime, color: getStatusColor(task.status) }}>
                          {getStatusIcon(task.status)} {formatRuntime(task.startTime)}
                        </span>
                      </div>
                    </div>
                    <div style={styles.taskCardLabel}>{task.label}</div>
                    <div style={styles.viewDetails}>Click to view details →</div>
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
    borderRadius: '16px',
    border: '1px solid rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  header: {
    padding: '20px 24px',
    borderBottom: '1px solid rgba(255,255,255,0.08)',
    display: 'flex',
    alignItems: 'center',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
  },
  headerIcon: {
    fontSize: '28px',
  },
  title: {
    color: '#fff',
    fontSize: '1.1rem',
    fontWeight: 600,
    margin: 0,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: '0.8rem',
  },
  taskList: {
    padding: '16px',
    maxHeight: '500px',
    overflowY: 'auto',
  },
  section: {
    marginBottom: '20px',
  },
  sectionLabel: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: '0.75rem',
    fontWeight: 600,
    marginBottom: '10px',
    paddingLeft: '4px',
  },
  taskCard: {
    background: 'rgba(255,255,255,0.03)',
    borderRadius: '12px',
    padding: '16px',
    marginBottom: '10px',
    cursor: 'pointer',
    border: '1px solid rgba(255,255,255,0.05)',
    transition: 'all 0.2s ease',
  },
  taskCardCompleted: {
    opacity: 0.7,
  },
  taskCardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '10px',
  },
  taskCardAgent: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  agentEmoji: {
    fontSize: '20px',
  },
  agentName: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: '0.8rem',
  },
  taskCardMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  runtime: {
    fontSize: '0.85rem',
    fontWeight: 600,
    fontFamily: 'monospace',
  },
  taskCardLabel: {
    color: '#fff',
    fontSize: '0.9rem',
    fontWeight: 500,
    marginBottom: '10px',
  },
  progressBar: {
    height: '4px',
    background: 'rgba(255,255,255,0.1)',
    borderRadius: '2px',
    overflow: 'hidden',
    marginBottom: '10px',
  },
  progressBarInner: {
    height: '100%',
    background: 'linear-gradient(90deg, #667eea, #764ba2)',
    borderRadius: '2px',
    transition: 'width 0.3s ease',
  },
  taskCardOutput: {
    background: 'rgba(0,0,0,0.2)',
    borderRadius: '8px',
    padding: '10px 12px',
    fontSize: '0.8rem',
    marginBottom: '10px',
  },
  outputLabel: {
    color: 'rgba(255,255,255,0.4)',
    marginRight: '6px',
  },
  outputPreview: {
    color: 'rgba(255,255,255,0.7)',
  },
  viewDetails: {
    color: '#667eea',
    fontSize: '0.75rem',
    textAlign: 'right',
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

  // Back Button
  backButton: {
    margin: '16px 16px 0',
    padding: '8px 16px',
    background: 'rgba(255,255,255,0.05)',
    border: 'none',
    borderRadius: '8px',
    color: 'rgba(255,255,255,0.7)',
    fontSize: '0.85rem',
    cursor: 'pointer',
  },

  // Detail View
  detailHeader: {
    padding: '24px',
    display: 'flex',
    gap: '20px',
    alignItems: 'flex-start',
    borderBottom: '1px solid rgba(255,255,255,0.08)',
  },
  taskIcon: {
    width: '64px',
    height: '64px',
    borderRadius: '16px',
    background: 'rgba(255,255,255,0.05)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  taskEmoji: {
    fontSize: '36px',
  },
  taskHeaderInfo: {
    flex: 1,
  },
  taskTitle: {
    color: '#fff',
    fontSize: '1.25rem',
    fontWeight: 700,
    margin: '0 0 10px 0',
    lineHeight: 1.3,
  },
  taskMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  taskAgent: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: '0.9rem',
  },
  statusBadge: {
    padding: '6px 14px',
    borderRadius: '20px',
    fontSize: '0.8rem',
    fontWeight: 500,
    textTransform: 'capitalize',
  },
  statsRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '12px',
    padding: '20px 24px',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
  },
  statBox: {
    background: 'rgba(255,255,255,0.03)',
    borderRadius: '10px',
    padding: '14px',
    textAlign: 'center',
  },
  statLabel: {
    display: 'block',
    color: 'rgba(255,255,255,0.4)',
    fontSize: '0.75rem',
    marginBottom: '4px',
  },
  statValue: {
    color: '#fff',
    fontSize: '1.1rem',
    fontWeight: 600,
  },
  detailSection: {
    padding: '20px 24px',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
  },
  sectionTitle: {
    color: '#fff',
    fontSize: '0.9rem',
    fontWeight: 600,
    margin: '0 0 12px 0',
  },
  progressBarContainer: {
    height: '8px',
    background: 'rgba(255,255,255,0.1)',
    borderRadius: '4px',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    background: 'linear-gradient(90deg, #667eea, #764ba2)',
    borderRadius: '4px',
    transition: 'width 0.5s ease',
  },
  stepsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  stepItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px',
    background: 'rgba(255,255,255,0.03)',
    borderRadius: '8px',
  },
  stepIcon: {
    fontSize: '16px',
  },
  stepName: {
    flex: 1,
    color: 'rgba(255,255,255,0.8)',
    fontSize: '0.9rem',
  },
  stepStatus: {
    fontSize: '0.75rem',
    fontWeight: 500,
    textTransform: 'capitalize',
  },
  outputBox: {
    background: 'rgba(0,0,0,0.3)',
    borderRadius: '10px',
    padding: '16px',
  },
  outputText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: '0.9rem',
    margin: 0,
    lineHeight: 1.5,
  },
  logsContainer: {
    background: 'rgba(0,0,0,0.3)',
    borderRadius: '10px',
    padding: '4px',
    maxHeight: '200px',
    overflowY: 'auto',
    fontFamily: 'monospace',
  },
  logItem: {
    display: 'flex',
    gap: '12px',
    padding: '8px 12px',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
  },
  logTime: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: '0.75rem',
    minWidth: '50px',
  },
  logMessage: {
    fontSize: '0.8rem',
  },
  actionsSection: {
    padding: '20px 24px',
    display: 'flex',
    gap: '12px',
  },
  cancelButton: {
    padding: '12px 24px',
    background: 'rgba(239,68,68,0.2)',
    border: 'none',
    borderRadius: '10px',
    color: '#ef4444',
    fontSize: '0.9rem',
    fontWeight: 500,
    cursor: 'pointer',
  },
  rerunButton: {
    padding: '12px 24px',
    background: 'rgba(102,126,234,0.2)',
    border: 'none',
    borderRadius: '10px',
    color: '#667eea',
    fontSize: '0.9rem',
    fontWeight: 500,
    cursor: 'pointer',
  },
  retryButton: {
    padding: '12px 24px',
    background: 'rgba(245,158,11,0.2)',
    border: 'none',
    borderRadius: '10px',
    color: '#f59e0b',
    fontSize: '0.9rem',
    fontWeight: 500,
    cursor: 'pointer',
  },
};
