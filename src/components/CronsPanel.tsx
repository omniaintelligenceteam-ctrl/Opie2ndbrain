'use client';
import { useState, useEffect, useCallback } from 'react';
import { useSidebarCrons, CronJob as SidebarCronJob } from '@/hooks/useSidebarData';

interface CronJob {
  id: string;
  name: string;
  schedule: string;
  command: string;
  enabled: boolean;
  priority: 'critical' | 'normal' | 'low';
  lastRun?: string;
  lastStatus?: 'success' | 'failed' | 'running';
  nextRun?: string;
  runCount?: number;
  avgRuntime?: string;
  description?: string;
}

interface CronHistory {
  id: string;
  cronId: string;
  startedAt: string;
  completedAt?: string;
  status: 'success' | 'failed' | 'running';
  output?: string;
  runtime?: string;
}

interface CronsPanelProps {
  pollInterval?: number;
  onCronCountChange?: (count: number) => void;
}

function parseSchedule(schedule: string): string {
  const parts = schedule.split(' ');
  if (parts.length !== 5) return schedule;
  const [min, hour, dom, mon, dow] = parts;
  if (schedule === '* * * * *') return 'Every minute';
  if (schedule === '*/5 * * * *') return 'Every 5 minutes';
  if (schedule === '*/10 * * * *') return 'Every 10 minutes';
  if (schedule === '*/15 * * * *') return 'Every 15 minutes';
  if (schedule === '*/30 * * * *') return 'Every 30 minutes';
  if (schedule === '0 * * * *') return 'Every hour';
  if (schedule === '0 */2 * * *') return 'Every 2 hours';
  if (schedule === '0 */4 * * *') return 'Every 4 hours';
  if (schedule === '0 */6 * * *') return 'Every 6 hours';
  if (schedule === '0 */12 * * *') return 'Every 12 hours';
  if (min !== '*' && hour !== '*' && dom === '*' && mon === '*' && dow === '*') {
    return `Daily at ${hour.padStart(2, '0')}:${min.padStart(2, '0')}`;
  }
  if (min !== '*' && hour !== '*' && dow !== '*' && dom === '*' && mon === '*') {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return `${days[parseInt(dow)] || dow} at ${hour.padStart(2, '0')}:${min.padStart(2, '0')}`;
  }
  return schedule;
}

function formatRelativeTime(dateStr: string, currentTime: Date | null): string {
  if (!currentTime) return '...';
  const date = new Date(dateStr);
  const diffMs = date.getTime() - currentTime.getTime();
  const diffMins = Math.round(diffMs / 60000);
  const diffHours = Math.round(diffMs / 3600000);
  const diffDays = Math.round(diffMs / 86400000);
  if (Math.abs(diffMins) < 1) return 'now';
  if (diffMins > 0 && diffMins < 60) return `in ${diffMins}m`;
  if (diffMins < 0 && diffMins > -60) return `${Math.abs(diffMins)}m ago`;
  if (diffHours > 0 && diffHours < 24) return `in ${diffHours}h`;
  if (diffHours < 0 && diffHours > -24) return `${Math.abs(diffHours)}h ago`;
  if (diffDays > 0) return `in ${diffDays}d`;
  return `${Math.abs(diffDays)}d ago`;
}

// Demo data generator - creates crons relative to current time (client-side only)
function createDemoCrons(): CronJob[] {
  const now = Date.now();
  return [
    {
      id: 'cron-1',
      name: 'Heartbeat Check',
      description: 'Sends a heartbeat ping to verify system health and check for pending tasks.',
      schedule: '*/30 * * * *',
      command: 'moltbot heartbeat',
      enabled: true,
      priority: 'critical',
      lastRun: new Date(now - 1000 * 60 * 15).toISOString(),
      lastStatus: 'success',
      nextRun: new Date(now + 1000 * 60 * 15).toISOString(),
      runCount: 48,
      avgRuntime: '2.3s',
    },
    {
      id: 'cron-2',
      name: 'Email Digest',
      description: 'Checks inbox for new emails and generates a daily summary report.',
      schedule: '0 9 * * *',
      command: 'moltbot email digest',
      enabled: true,
      priority: 'normal',
      lastRun: new Date(now - 1000 * 60 * 60 * 3).toISOString(),
      lastStatus: 'success',
      nextRun: new Date(now + 1000 * 60 * 60 * 21).toISOString(),
      runCount: 7,
      avgRuntime: '45s',
    },
    {
      id: 'cron-3',
      name: 'Lead Research',
      description: 'Automated lead research and enrichment from configured sources.',
      schedule: '0 */4 * * *',
      command: 'moltbot research leads',
      enabled: false,
      priority: 'low',
      lastRun: new Date(now - 1000 * 60 * 60 * 24).toISOString(),
      lastStatus: 'failed',
      runCount: 12,
      avgRuntime: '3m 20s',
    },
    {
      id: 'cron-4',
      name: 'Memory Sync',
      description: 'Synchronizes memory files and backs up important context data.',
      schedule: '0 0 * * *',
      command: 'moltbot memory sync',
      enabled: true,
      priority: 'normal',
      lastRun: new Date(now - 1000 * 60 * 60 * 8).toISOString(),
      lastStatus: 'success',
      nextRun: new Date(now + 1000 * 60 * 60 * 16).toISOString(),
      runCount: 30,
      avgRuntime: '1m 15s',
    },
  ];
}

// Demo history generator
function createDemoHistory(): CronHistory[] {
  const now = Date.now();
  return [
    { id: 'h1', cronId: 'cron-1', startedAt: new Date(now - 1000 * 60 * 15).toISOString(), completedAt: new Date(now - 1000 * 60 * 14.5).toISOString(), status: 'success', output: 'Heartbeat OK. No pending tasks.', runtime: '2.1s' },
    { id: 'h2', cronId: 'cron-1', startedAt: new Date(now - 1000 * 60 * 45).toISOString(), completedAt: new Date(now - 1000 * 60 * 44.5).toISOString(), status: 'success', output: 'Heartbeat OK. 2 pending tasks processed.', runtime: '2.5s' },
    { id: 'h3', cronId: 'cron-1', startedAt: new Date(now - 1000 * 60 * 75).toISOString(), completedAt: new Date(now - 1000 * 60 * 74.5).toISOString(), status: 'success', output: 'Heartbeat OK.', runtime: '2.2s' },
    { id: 'h4', cronId: 'cron-1', startedAt: new Date(now - 1000 * 60 * 105).toISOString(), completedAt: new Date(now - 1000 * 60 * 104).toISOString(), status: 'failed', output: 'Error: Connection timeout', runtime: '30s' },
  ];
}

export default function CronsPanel({ 
  pollInterval = 30000,
  onCronCountChange,
}: CronsPanelProps = {}) {
  // Use real-time SSE data for crons
  const { 
    crons: sseCrons, 
    totalCrons, 
    loading: sseLoading, 
    error: sseError,
    connectionType,
    refresh: refreshCrons,
  } = useSidebarCrons();
  
  // Merge SSE crons with local state for UI interactions
  const [localCrons, setLocalCrons] = useState<CronJob[]>([]);
  const [selectedCron, setSelectedCron] = useState<CronJob | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCron, setEditingCron] = useState<CronJob | null>(null);
  const [history, setHistory] = useState<CronHistory[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [runningCrons, setRunningCrons] = useState<Set<string>>(new Set());
  const [filterPriority, setFilterPriority] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState<Date | null>(null);

  // Use SSE crons if available, otherwise use local state
  const crons = sseCrons.length > 0 ? sseCrons.map(c => ({
    ...c,
    priority: (c.priority || 'normal') as 'critical' | 'normal' | 'low',
  })) : localCrons;
  const loading = sseLoading && localCrons.length === 0;
  const error = sseError;

  // Initialize time on client only (avoids hydration mismatch)
  useEffect(() => {
    setCurrentTime(new Date());
    const interval = setInterval(() => setCurrentTime(new Date()), 30000);
    return () => clearInterval(interval);
  }, []);

  // Report cron count changes
  useEffect(() => {
    onCronCountChange?.(totalCrons);
  }, [totalCrons, onCronCountChange]);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    schedule: '*/30 * * * *',
    command: '',
    enabled: true,
    priority: 'normal' as 'critical' | 'normal' | 'low',
  });

  const fetchHistory = useCallback(async (cronId: string) => {
    try {
      setHistoryLoading(true);
      const res = await fetch(`/api/crons/${cronId}/history`);
      if (res.ok) {
        const data = await res.json();
        if (data.history) setHistory(data.history);
      }
    } catch (err) {
      console.error('Failed to fetch cron history:', err);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  // Fetch history when a cron is selected
  useEffect(() => {
    if (selectedCron) {
      fetchHistory(selectedCron.id);
    }
  }, [selectedCron, fetchHistory]);

  const handleRunNow = async (cronId: string) => {
    setRunningCrons(prev => new Set(prev).add(cronId));
    try {
      await fetch(`/api/crons/${cronId}/run`, { method: 'POST' });
      await refreshCrons();
    } catch (err) {
      console.error('Failed to run cron');
    } finally {
      setTimeout(() => {
        setRunningCrons(prev => {
          const next = new Set(prev);
          next.delete(cronId);
          return next;
        });
      }, 3000);
    }
  };

  const handleToggle = async (cron: CronJob) => {
    const updated = { ...cron, enabled: !cron.enabled };
    setCrons(prev => prev.map(c => c.id === cron.id ? updated : c));
    try {
      await fetch(`/api/crons/${cron.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      });
    } catch (err) {
      console.error('Failed to update cron');
    }
  };

  const handleDelete = async (cronId: string) => {
    if (!confirm('Delete this cron job?')) return;
    setCrons(prev => prev.filter(c => c.id !== cronId));
    setSelectedCron(null);
    try {
      await fetch(`/api/crons/${cronId}`, { method: 'DELETE' });
    } catch (err) {
      console.error('Failed to delete cron');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newCron: CronJob = {
      id: editingCron?.id || `cron-${Date.now()}`,
      ...formData,
      lastStatus: editingCron?.lastStatus,
      lastRun: editingCron?.lastRun,
      nextRun: new Date(Date.now() + 1000 * 60 * 30).toISOString(),
      runCount: editingCron?.runCount || 0,
    };
    
    if (editingCron) {
      setCrons(prev => prev.map(c => c.id === editingCron.id ? newCron : c));
    } else {
      setCrons(prev => [newCron, ...prev]);
    }
    
    setShowAddModal(false);
    setEditingCron(null);
    setFormData({ name: '', description: '', schedule: '*/30 * * * *', command: '', enabled: true, priority: 'normal' });
  };

  const openEditModal = (cron: CronJob) => {
    setEditingCron(cron);
    setFormData({
      name: cron.name,
      description: cron.description || '',
      schedule: cron.schedule,
      command: cron.command,
      enabled: cron.enabled,
      priority: cron.priority,
    });
    setShowAddModal(true);
  };

  const getPriorityColor = (priority: string): string => {
    switch (priority) {
      case 'critical': return '#ef4444';
      case 'normal': return '#667eea';
      case 'low': return '#6b7280';
      default: return '#667eea';
    }
  };

  const getPriorityLabel = (priority: string): string => {
    switch (priority) {
      case 'critical': return '🔴 Critical';
      case 'normal': return '🔵 Normal';
      case 'low': return '⚪ Low';
      default: return priority;
    }
  };

  const getStatusColor = (status?: string): string => {
    switch (status) {
      case 'success': return '#22c55e';
      case 'failed': return '#ef4444';
      case 'running': return '#f59e0b';
      default: return 'rgba(255,255,255,0.3)';
    }
  };

  const getStatusIcon = (status?: string): string => {
    switch (status) {
      case 'success': return '✅';
      case 'failed': return '❌';
      case 'running': return '⏳';
      default: return '⏸️';
    }
  };

  const presets = [
    { label: 'Every minute', value: '* * * * *' },
    { label: 'Every 5 min', value: '*/5 * * * *' },
    { label: 'Every 15 min', value: '*/15 * * * *' },
    { label: 'Every 30 min', value: '*/30 * * * *' },
    { label: 'Every hour', value: '0 * * * *' },
    { label: 'Every 4 hours', value: '0 */4 * * *' },
    { label: 'Daily 9am', value: '0 9 * * *' },
    { label: 'Daily midnight', value: '0 0 * * *' },
  ];

  const filteredCrons = filterPriority 
    ? crons.filter(c => c.priority === filterPriority)
    : crons;

  // Detail View
  if (selectedCron) {
    const cron = selectedCron;
    const cronHistory = history.filter(h => h.cronId === cron.id);
    const isRunning = runningCrons.has(cron.id);

    return (
      <div style={styles.container}>
        <button onClick={() => setSelectedCron(null)} style={styles.backButton}>
          ← Back to Crons
        </button>

        {/* Cron Header */}
        <div style={styles.detailHeader}>
          <div style={styles.cronIcon}>⏰</div>
          <div style={styles.cronHeaderInfo}>
            <h2 style={styles.cronTitle}>{cron.name}</h2>
            <div style={styles.cronMeta}>
              <span style={{
                ...styles.priorityBadge,
                background: `${getPriorityColor(cron.priority)}20`,
                color: getPriorityColor(cron.priority),
              }}>
                {getPriorityLabel(cron.priority)}
              </span>
              <span style={{
                ...styles.statusBadge,
                background: cron.enabled ? 'rgba(34,197,94,0.2)' : 'rgba(107,114,128,0.2)',
                color: cron.enabled ? '#22c55e' : '#6b7280',
              }}>
                {cron.enabled ? '● Enabled' : '○ Disabled'}
              </span>
            </div>
          </div>
          <div style={styles.headerActions}>
            <button
              onClick={() => handleRunNow(cron.id)}
              disabled={isRunning || !cron.enabled}
              style={{
                ...styles.runNowBtn,
                opacity: isRunning || !cron.enabled ? 0.5 : 1,
              }}
            >
              {isRunning ? '⏳ Running...' : '▶️ Run Now'}
            </button>
          </div>
        </div>

        {/* Schedule Info */}
        <div style={styles.scheduleCard}>
          <div style={styles.scheduleMain}>
            <span style={styles.scheduleIcon}>🕐</span>
            <div>
              <div style={styles.scheduleHuman}>{parseSchedule(cron.schedule)}</div>
              <code style={styles.scheduleCron}>{cron.schedule}</code>
            </div>
          </div>
          <div style={styles.scheduleStats}>
            <div style={styles.scheduleStat}>
              <span style={styles.scheduleStatLabel}>Next Run</span>
              <span style={styles.scheduleStatValue}>
                {cron.nextRun && cron.enabled ? formatRelativeTime(cron.nextRun, currentTime) : '—'}
              </span>
            </div>
            <div style={styles.scheduleStat}>
              <span style={styles.scheduleStatLabel}>Last Run</span>
              <span style={styles.scheduleStatValue}>
                {cron.lastRun ? formatRelativeTime(cron.lastRun, currentTime) : 'Never'}
              </span>
            </div>
            <div style={styles.scheduleStat}>
              <span style={styles.scheduleStatLabel}>Avg Runtime</span>
              <span style={styles.scheduleStatValue}>{cron.avgRuntime || '—'}</span>
            </div>
            <div style={styles.scheduleStat}>
              <span style={styles.scheduleStatLabel}>Total Runs</span>
              <span style={styles.scheduleStatValue}>{cron.runCount || 0}</span>
            </div>
          </div>
        </div>

        {/* Description */}
        {cron.description && (
          <div style={styles.detailSection}>
            <h3 style={styles.sectionTitle}>📋 Description</h3>
            <p style={styles.descriptionText}>{cron.description}</p>
          </div>
        )}

        {/* Command */}
        <div style={styles.detailSection}>
          <h3 style={styles.sectionTitle}>💻 Command</h3>
          <div style={styles.commandBox}>
            <code style={styles.commandCode}>{cron.command}</code>
          </div>
        </div>

        {/* Run History */}
        <div style={styles.detailSection}>
          <h3 style={styles.sectionTitle}>📜 Run History</h3>
          {cronHistory.length === 0 ? (
            <p style={styles.noHistory}>No run history yet</p>
          ) : (
            <div style={styles.historyList}>
              {cronHistory.map(item => (
                <div key={item.id} style={styles.historyItem}>
                  <div style={styles.historyItemHeader}>
                    <span style={{
                      ...styles.historyStatus,
                      color: getStatusColor(item.status),
                    }}>
                      {getStatusIcon(item.status)} {item.status}
                    </span>
                    <span style={styles.historyTime}>
                      {new Date(item.startedAt).toLocaleString()}
                    </span>
                    {item.runtime && (
                      <span style={styles.historyRuntime}>{item.runtime}</span>
                    )}
                  </div>
                  {item.output && (
                    <pre style={styles.historyOutput}>{item.output}</pre>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div style={styles.actionsSection}>
          <button onClick={() => openEditModal(cron)} style={styles.editBtn}>
            ✏️ Edit
          </button>
          <button onClick={() => handleToggle(cron)} style={styles.toggleBtn}>
            {cron.enabled ? '⏸️ Disable' : '▶️ Enable'}
          </button>
          <button onClick={() => handleDelete(cron.id)} style={styles.deleteBtn}>
            🗑️ Delete
          </button>
        </div>
      </div>
    );
  }

  const enabledCount = crons.filter(c => c.enabled).length;
  const runningNowCount = crons.filter(c => c.lastStatus === 'running').length + runningCrons.size;

  // List View
  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <span style={styles.headerIcon}>⏰</span>
          <div>
            <h2 style={styles.title}>Scheduled Jobs</h2>
            <span style={styles.subtitle}>
              {enabledCount} enabled • {runningNowCount > 0 ? `${runningNowCount} running now` : 'idle'}
            </span>
          </div>
        </div>
        <div style={styles.headerRight}>
          {connectionType === 'sse' && (
            <span style={{ color: '#22c55e', fontSize: '0.7rem', marginRight: '8px' }} title="Real-time updates active">
              ⚡ Live
            </span>
          )}
          <button 
            onClick={() => {
              setEditingCron(null);
              setFormData({ name: '', description: '', schedule: '*/30 * * * *', command: '', enabled: true, priority: 'normal' });
              setShowAddModal(true);
            }}
            style={styles.addButton}
          >
            + Add Cron
          </button>
          <button onClick={refreshCrons} style={styles.refreshBtn} disabled={loading}>
            {loading ? '⏳' : '🔄'}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div style={styles.filters}>
        <button
          onClick={() => setFilterPriority(null)}
          style={{ ...styles.filterBtn, ...(filterPriority === null ? styles.filterBtnActive : {}) }}
        >
          All
        </button>
        <button
          onClick={() => setFilterPriority('critical')}
          style={{ ...styles.filterBtn, ...(filterPriority === 'critical' ? styles.filterBtnActive : {}), borderColor: '#ef4444' }}
        >
          🔴 Critical
        </button>
        <button
          onClick={() => setFilterPriority('normal')}
          style={{ ...styles.filterBtn, ...(filterPriority === 'normal' ? styles.filterBtnActive : {}), borderColor: '#667eea' }}
        >
          🔵 Normal
        </button>
        <button
          onClick={() => setFilterPriority('low')}
          style={{ ...styles.filterBtn, ...(filterPriority === 'low' ? styles.filterBtnActive : {}), borderColor: '#6b7280' }}
        >
          ⚪ Low
        </button>
      </div>

      {/* Cron List */}
      <div style={styles.cronList}>
        {filteredCrons.length === 0 ? (
          <div style={styles.empty}>
            <span style={styles.emptyIcon}>⏰</span>
            <h3>No Cron Jobs</h3>
            <p>Schedule automated tasks</p>
            <button onClick={() => setShowAddModal(true)} style={styles.emptyButton}>
              Create your first cron job
            </button>
          </div>
        ) : (
          filteredCrons.map(cron => {
            const isRunning = runningCrons.has(cron.id) || cron.lastStatus === 'running';
            return (
              <div
                key={cron.id}
                onClick={() => setSelectedCron(cron)}
                style={{
                  ...styles.cronCard,
                  opacity: cron.enabled ? 1 : 0.6,
                  borderLeftColor: getPriorityColor(cron.priority),
                }}
              >
                <div style={styles.cronCardHeader}>
                  <div style={styles.cronCardInfo}>
                    <div style={styles.cronCardName}>
                      <span style={{
                        ...styles.statusDot,
                        background: cron.enabled ? getStatusColor(cron.lastStatus) : 'rgba(255,255,255,0.2)',
                      }} />
                      {cron.name}
                    </div>
                    <div style={styles.cronCardSchedule}>
                      <span style={styles.scheduleIconSmall}>🕐</span>
                      {parseSchedule(cron.schedule)}
                    </div>
                  </div>
                  <div style={styles.cronCardActions}>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleRunNow(cron.id); }}
                      disabled={isRunning || !cron.enabled}
                      style={{
                        ...styles.actionButton,
                        opacity: isRunning || !cron.enabled ? 0.5 : 1,
                      }}
                    >
                      {isRunning ? '⏳' : '▶️'}
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleToggle(cron); }}
                      style={styles.actionButton}
                    >
                      {cron.enabled ? '✓' : '○'}
                    </button>
                  </div>
                </div>
                <div style={styles.cronCardStats}>
                  {cron.nextRun && cron.enabled && (
                    <span>Next: {formatRelativeTime(cron.nextRun, currentTime)}</span>
                  )}
                  {cron.lastRun && (
                    <span>{getStatusIcon(cron.lastStatus)} {formatRelativeTime(cron.lastRun, currentTime)}</span>
                  )}
                  <span>Runs: {cron.runCount || 0}</span>
                </div>
                <div style={styles.viewDetails}>Click to view details →</div>
              </div>
            );
          })
        )}
      </div>

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div style={styles.modalOverlay} onClick={() => setShowAddModal(false)}>
          <div style={styles.modal} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>
                {editingCron ? 'Edit Cron Job' : 'New Cron Job'}
              </h3>
              <button onClick={() => setShowAddModal(false)} style={styles.modalClose}>×</button>
            </div>
            
            <form onSubmit={handleSubmit} style={styles.form}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="My cron job"
                  style={styles.input}
                  required
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Description</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="What does this cron do?"
                  style={styles.input}
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Priority</label>
                <div style={styles.priorityButtons}>
                  {(['critical', 'normal', 'low'] as const).map(p => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, priority: p }))}
                      style={{
                        ...styles.priorityBtn,
                        ...(formData.priority === p ? { background: `${getPriorityColor(p)}30`, borderColor: getPriorityColor(p) } : {}),
                      }}
                    >
                      {getPriorityLabel(p)}
                    </button>
                  ))}
                </div>
              </div>
              
              <div style={styles.formGroup}>
                <label style={styles.label}>Schedule</label>
                <div style={styles.presets}>
                  {presets.map(preset => (
                    <button
                      key={preset.value}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, schedule: preset.value }))}
                      style={{
                        ...styles.presetButton,
                        ...(formData.schedule === preset.value ? styles.presetButtonActive : {}),
                      }}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  value={formData.schedule}
                  onChange={e => setFormData(prev => ({ ...prev, schedule: e.target.value }))}
                  placeholder="* * * * *"
                  style={styles.input}
                  required
                />
                <span style={styles.schedulePreview}>
                  📅 {parseSchedule(formData.schedule)}
                </span>
              </div>
              
              <div style={styles.formGroup}>
                <label style={styles.label}>Command</label>
                <textarea
                  value={formData.command}
                  onChange={e => setFormData(prev => ({ ...prev, command: e.target.value }))}
                  placeholder="moltbot heartbeat"
                  style={{ ...styles.input, ...styles.textarea }}
                  required
                />
              </div>
              
              <div style={styles.formGroup}>
                <label style={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={formData.enabled}
                    onChange={e => setFormData(prev => ({ ...prev, enabled: e.target.checked }))}
                    style={styles.checkbox}
                  />
                  Enabled
                </label>
              </div>
              
              <div style={styles.formActions}>
                <button type="button" onClick={() => setShowAddModal(false)} style={styles.cancelButton}>
                  Cancel
                </button>
                <button type="submit" style={styles.submitButton}>
                  {editingCron ? 'Save Changes' : 'Create Cron'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
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
    justifyContent: 'space-between',
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
  headerRight: {
    display: 'flex',
    gap: '8px',
  },
  addButton: {
    padding: '10px 20px',
    background: '#667eea',
    border: 'none',
    borderRadius: '10px',
    color: '#fff',
    fontWeight: 600,
    fontSize: '0.9rem',
    cursor: 'pointer',
  },
  refreshBtn: {
    width: '42px',
    height: '42px',
    background: 'rgba(255,255,255,0.05)',
    border: 'none',
    borderRadius: '10px',
    color: '#fff',
    fontSize: '18px',
    cursor: 'pointer',
  },
  filters: {
    padding: '12px 20px',
    display: 'flex',
    gap: '8px',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
  },
  filterBtn: {
    padding: '6px 14px',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '8px',
    color: 'rgba(255,255,255,0.6)',
    fontSize: '0.8rem',
    cursor: 'pointer',
  },
  filterBtnActive: {
    background: 'rgba(102,126,234,0.2)',
    color: '#fff',
    borderColor: '#667eea',
  },
  cronList: {
    padding: '16px',
    maxHeight: '500px',
    overflowY: 'auto',
  },
  cronCard: {
    background: 'rgba(255,255,255,0.03)',
    borderRadius: '12px',
    padding: '16px',
    marginBottom: '10px',
    cursor: 'pointer',
    borderLeft: '3px solid',
    transition: 'all 0.2s ease',
  },
  cronCardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '10px',
  },
  cronCardInfo: {},
  cronCardName: {
    color: '#fff',
    fontSize: '0.95rem',
    fontWeight: 600,
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '4px',
  },
  statusDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
  },
  cronCardSchedule: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    color: '#667eea',
    fontSize: '0.85rem',
  },
  scheduleIconSmall: {
    fontSize: '12px',
  },
  cronCardActions: {
    display: 'flex',
    gap: '6px',
  },
  actionButton: {
    width: '32px',
    height: '32px',
    borderRadius: '8px',
    border: 'none',
    background: 'rgba(255,255,255,0.05)',
    cursor: 'pointer',
    fontSize: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cronCardStats: {
    display: 'flex',
    gap: '16px',
    fontSize: '0.75rem',
    color: 'rgba(255,255,255,0.5)',
    marginBottom: '8px',
  },
  viewDetails: {
    color: '#667eea',
    fontSize: '0.75rem',
    textAlign: 'right',
  },
  empty: {
    textAlign: 'center',
    padding: '60px 40px',
    color: 'rgba(255,255,255,0.5)',
  },
  emptyIcon: {
    fontSize: '48px',
    display: 'block',
    marginBottom: '16px',
  },
  emptyButton: {
    marginTop: '20px',
    padding: '12px 24px',
    background: '#667eea',
    border: 'none',
    borderRadius: '10px',
    color: '#fff',
    fontWeight: 600,
    cursor: 'pointer',
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
  cronIcon: {
    fontSize: '48px',
  },
  cronHeaderInfo: {
    flex: 1,
  },
  cronTitle: {
    color: '#fff',
    fontSize: '1.5rem',
    fontWeight: 700,
    margin: '0 0 10px 0',
  },
  cronMeta: {
    display: 'flex',
    gap: '10px',
  },
  priorityBadge: {
    padding: '6px 14px',
    borderRadius: '20px',
    fontSize: '0.8rem',
    fontWeight: 500,
  },
  statusBadge: {
    padding: '6px 14px',
    borderRadius: '20px',
    fontSize: '0.8rem',
    fontWeight: 500,
  },
  headerActions: {},
  runNowBtn: {
    padding: '12px 24px',
    background: '#667eea',
    border: 'none',
    borderRadius: '10px',
    color: '#fff',
    fontWeight: 600,
    cursor: 'pointer',
  },
  scheduleCard: {
    margin: '20px 24px',
    padding: '20px',
    background: 'rgba(102,126,234,0.1)',
    borderRadius: '12px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '20px',
  },
  scheduleMain: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  scheduleIcon: {
    fontSize: '32px',
  },
  scheduleHuman: {
    color: '#fff',
    fontSize: '1.25rem',
    fontWeight: 600,
  },
  scheduleCron: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: '0.85rem',
  },
  scheduleStats: {
    display: 'flex',
    gap: '24px',
  },
  scheduleStat: {
    textAlign: 'center',
  },
  scheduleStatLabel: {
    display: 'block',
    color: 'rgba(255,255,255,0.4)',
    fontSize: '0.7rem',
    marginBottom: '4px',
  },
  scheduleStatValue: {
    color: '#fff',
    fontSize: '0.95rem',
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
  descriptionText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: '0.95rem',
    margin: 0,
    lineHeight: 1.5,
  },
  commandBox: {
    background: 'rgba(0,0,0,0.3)',
    borderRadius: '10px',
    padding: '14px 18px',
  },
  commandCode: {
    color: '#22c55e',
    fontSize: '0.95rem',
    fontFamily: 'monospace',
  },
  noHistory: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: '0.9rem',
    fontStyle: 'italic',
  },
  historyList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  historyItem: {
    background: 'rgba(255,255,255,0.03)',
    borderRadius: '10px',
    padding: '14px',
  },
  historyItemHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '8px',
  },
  historyStatus: {
    fontWeight: 600,
    fontSize: '0.85rem',
    textTransform: 'capitalize',
  },
  historyTime: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: '0.8rem',
    flex: 1,
  },
  historyRuntime: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: '0.8rem',
    fontFamily: 'monospace',
  },
  historyOutput: {
    background: 'rgba(0,0,0,0.3)',
    padding: '10px 12px',
    borderRadius: '6px',
    fontSize: '0.8rem',
    color: 'rgba(255,255,255,0.7)',
    fontFamily: 'monospace',
    margin: 0,
    whiteSpace: 'pre-wrap',
  },
  actionsSection: {
    padding: '20px 24px',
    display: 'flex',
    gap: '12px',
  },
  editBtn: {
    padding: '12px 24px',
    background: 'rgba(102,126,234,0.2)',
    border: 'none',
    borderRadius: '10px',
    color: '#667eea',
    fontWeight: 500,
    cursor: 'pointer',
  },
  toggleBtn: {
    padding: '12px 24px',
    background: 'rgba(245,158,11,0.2)',
    border: 'none',
    borderRadius: '10px',
    color: '#f59e0b',
    fontWeight: 500,
    cursor: 'pointer',
  },
  deleteBtn: {
    padding: '12px 24px',
    background: 'rgba(239,68,68,0.2)',
    border: 'none',
    borderRadius: '10px',
    color: '#ef4444',
    fontWeight: 500,
    cursor: 'pointer',
  },

  // Modal
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modal: {
    background: '#1a1a2e',
    borderRadius: '16px',
    width: '100%',
    maxWidth: '500px',
    maxHeight: '90vh',
    overflow: 'auto',
    border: '1px solid rgba(255,255,255,0.1)',
  },
  modalHeader: {
    padding: '20px 24px',
    borderBottom: '1px solid rgba(255,255,255,0.08)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitle: {
    color: '#fff',
    fontSize: '1.1rem',
    fontWeight: 600,
    margin: 0,
  },
  modalClose: {
    width: '32px',
    height: '32px',
    borderRadius: '8px',
    border: 'none',
    background: 'rgba(255,255,255,0.05)',
    color: '#fff',
    fontSize: '20px',
    cursor: 'pointer',
  },
  form: {
    padding: '24px',
  },
  formGroup: {
    marginBottom: '20px',
  },
  label: {
    display: 'block',
    color: 'rgba(255,255,255,0.7)',
    fontSize: '0.85rem',
    fontWeight: 500,
    marginBottom: '8px',
  },
  input: {
    width: '100%',
    padding: '12px 14px',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '10px',
    color: '#fff',
    fontSize: '0.9rem',
    outline: 'none',
    boxSizing: 'border-box',
  },
  textarea: {
    minHeight: '80px',
    resize: 'vertical',
    fontFamily: 'monospace',
  },
  priorityButtons: {
    display: 'flex',
    gap: '8px',
  },
  priorityBtn: {
    flex: 1,
    padding: '10px',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '8px',
    color: 'rgba(255,255,255,0.7)',
    fontSize: '0.8rem',
    cursor: 'pointer',
  },
  presets: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '6px',
    marginBottom: '10px',
  },
  presetButton: {
    padding: '6px 12px',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '6px',
    color: 'rgba(255,255,255,0.6)',
    fontSize: '0.75rem',
    cursor: 'pointer',
  },
  presetButtonActive: {
    background: 'rgba(102,126,234,0.2)',
    borderColor: '#667eea',
    color: '#667eea',
  },
  schedulePreview: {
    display: 'block',
    marginTop: '8px',
    color: '#667eea',
    fontSize: '0.85rem',
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    color: 'rgba(255,255,255,0.8)',
    fontSize: '0.9rem',
    cursor: 'pointer',
  },
  checkbox: {
    width: '18px',
    height: '18px',
    cursor: 'pointer',
  },
  formActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '10px',
    paddingTop: '20px',
    borderTop: '1px solid rgba(255,255,255,0.08)',
  },
  cancelButton: {
    padding: '10px 20px',
    background: 'rgba(255,255,255,0.05)',
    border: 'none',
    borderRadius: '10px',
    color: 'rgba(255,255,255,0.7)',
    fontWeight: 500,
    cursor: 'pointer',
  },
  submitButton: {
    padding: '10px 24px',
    background: '#667eea',
    border: 'none',
    borderRadius: '10px',
    color: '#fff',
    fontWeight: 600,
    cursor: 'pointer',
  },
};
