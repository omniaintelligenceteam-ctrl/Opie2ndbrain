'use client';
import { useState, useEffect, useCallback } from 'react';

interface CronJob {
  id: string;
  name: string;
  schedule: string;
  command: string;
  enabled: boolean;
  lastRun?: string;
  lastStatus?: 'success' | 'failed' | 'running';
  nextRun?: string;
  runCount?: number;
}

interface CronHistory {
  id: string;
  cronId: string;
  startedAt: string;
  completedAt?: string;
  status: 'success' | 'failed' | 'running';
  output?: string;
}

// Parse cron schedule to human readable
function parseSchedule(schedule: string): string {
  const parts = schedule.split(' ');
  if (parts.length !== 5) return schedule;
  
  const [min, hour, dom, mon, dow] = parts;
  
  // Common patterns
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

// Format relative time
function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
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

export default function CronsPanel() {
  const [crons, setCrons] = useState<CronJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCron, setSelectedCron] = useState<CronJob | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [history, setHistory] = useState<CronHistory[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [runningCrons, setRunningCrons] = useState<Set<string>>(new Set());
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    schedule: '*/30 * * * *',
    command: '',
    enabled: true,
  });

  const fetchCrons = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/crons');
      if (!res.ok) throw new Error('Failed to fetch crons');
      const data = await res.json();
      setCrons(data.crons || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load crons');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCrons();
    const interval = setInterval(fetchCrons, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, [fetchCrons]);

  const handleRunNow = async (cronId: string) => {
    setRunningCrons(prev => new Set(prev).add(cronId));
    try {
      const res = await fetch(`/api/crons/${cronId}/run`, { method: 'POST' });
      if (!res.ok) throw new Error('Failed to run cron');
      await fetchCrons();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to run cron');
    } finally {
      setRunningCrons(prev => {
        const next = new Set(prev);
        next.delete(cronId);
        return next;
      });
    }
  };

  const handleToggle = async (cron: CronJob) => {
    try {
      const res = await fetch(`/api/crons/${cron.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...cron, enabled: !cron.enabled }),
      });
      if (!res.ok) throw new Error('Failed to update cron');
      await fetchCrons();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update cron');
    }
  };

  const handleDelete = async (cronId: string) => {
    if (!confirm('Are you sure you want to delete this cron job?')) return;
    try {
      const res = await fetch(`/api/crons/${cronId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete cron');
      await fetchCrons();
      setSelectedCron(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete cron');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = selectedCron ? `/api/crons/${selectedCron.id}` : '/api/crons';
      const method = selectedCron ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (!res.ok) throw new Error('Failed to save cron');
      await fetchCrons();
      setShowAddModal(false);
      setSelectedCron(null);
      setFormData({ name: '', schedule: '*/30 * * * *', command: '', enabled: true });
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to save cron');
    }
  };

  const openEditModal = (cron: CronJob) => {
    setSelectedCron(cron);
    setFormData({
      name: cron.name,
      schedule: cron.schedule,
      command: cron.command,
      enabled: cron.enabled,
    });
    setShowAddModal(true);
  };

  const openHistoryModal = async (cron: CronJob) => {
    setSelectedCron(cron);
    setShowHistoryModal(true);
    setHistoryLoading(true);
    try {
      const res = await fetch(`/api/crons/${cron.id}/history`);
      if (!res.ok) throw new Error('Failed to fetch history');
      const data = await res.json();
      setHistory(data.history || []);
    } catch (err) {
      setHistory([]);
    } finally {
      setHistoryLoading(false);
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

  // Preset schedules for quick selection
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

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <span style={styles.headerIcon}>⏰</span>
          <div>
            <h2 style={styles.title}>Scheduled Jobs</h2>
            <span style={styles.subtitle}>{crons.length} cron jobs configured</span>
          </div>
        </div>
        <button 
          onClick={() => {
            setSelectedCron(null);
            setFormData({ name: '', schedule: '*/30 * * * *', command: '', enabled: true });
            setShowAddModal(true);
          }}
          style={styles.addButton}
        >
          + Add Cron
        </button>
      </div>

      {/* Content */}
      <div style={styles.content}>
        {loading && crons.length === 0 ? (
          <div style={styles.loading}>
            <span style={styles.loadingIcon}>⏳</span>
            <p>Loading cron jobs...</p>
          </div>
        ) : error ? (
          <div style={styles.error}>
            <span style={styles.errorIcon}>⚠️</span>
            <p>{error}</p>
            <button onClick={fetchCrons} style={styles.retryButton}>Retry</button>
          </div>
        ) : crons.length === 0 ? (
          <div style={styles.empty}>
            <span style={styles.emptyIcon}>⏰</span>
            <h3>No Cron Jobs</h3>
            <p>Schedule automated tasks to run on a recurring basis</p>
            <button 
              onClick={() => setShowAddModal(true)}
              style={styles.emptyButton}
            >
              Create your first cron job
            </button>
          </div>
        ) : (
          <div style={styles.cronList}>
            {crons.map(cron => {
              const isRunning = runningCrons.has(cron.id) || cron.lastStatus === 'running';
              return (
                <div key={cron.id} style={{
                  ...styles.cronCard,
                  opacity: cron.enabled ? 1 : 0.6,
                }}>
                  <div style={styles.cronHeader}>
                    <div style={styles.cronInfo}>
                      <div style={styles.cronName}>
                        <span style={{
                          ...styles.statusDot,
                          background: cron.enabled ? getStatusColor(cron.lastStatus) : 'rgba(255,255,255,0.2)',
                        }} />
                        {cron.name}
                      </div>
                      <div style={styles.cronSchedule}>
                        <span style={styles.scheduleIcon}>🕐</span>
                        {parseSchedule(cron.schedule)}
                        <span style={styles.cronExpression}>({cron.schedule})</span>
                      </div>
                    </div>
                    <div style={styles.cronActions}>
                      <button
                        onClick={() => handleRunNow(cron.id)}
                        disabled={isRunning || !cron.enabled}
                        style={{
                          ...styles.actionButton,
                          ...styles.runButton,
                          opacity: isRunning || !cron.enabled ? 0.5 : 1,
                        }}
                        title="Run now"
                      >
                        {isRunning ? '⏳' : '▶️'}
                      </button>
                      <button
                        onClick={() => openHistoryModal(cron)}
                        style={styles.actionButton}
                        title="View history"
                      >
                        📜
                      </button>
                      <button
                        onClick={() => openEditModal(cron)}
                        style={styles.actionButton}
                        title="Edit"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => handleToggle(cron)}
                        style={{
                          ...styles.actionButton,
                          background: cron.enabled ? 'rgba(34,197,94,0.2)' : 'rgba(255,255,255,0.05)',
                        }}
                        title={cron.enabled ? 'Disable' : 'Enable'}
                      >
                        {cron.enabled ? '✓' : '○'}
                      </button>
                    </div>
                  </div>
                  
                  <div style={styles.cronMeta}>
                    <div style={styles.cronCommand}>
                      <span style={styles.commandLabel}>Command:</span>
                      <code style={styles.commandCode}>{cron.command}</code>
                    </div>
                    <div style={styles.cronStats}>
                      {cron.nextRun && cron.enabled && (
                        <span style={styles.stat}>
                          <span style={styles.statLabel}>Next:</span>
                          <span style={styles.statValue}>{formatRelativeTime(cron.nextRun)}</span>
                        </span>
                      )}
                      {cron.lastRun && (
                        <span style={styles.stat}>
                          <span style={styles.statLabel}>Last:</span>
                          <span style={styles.statValue}>
                            {getStatusIcon(cron.lastStatus)} {formatRelativeTime(cron.lastRun)}
                          </span>
                        </span>
                      )}
                      {cron.runCount !== undefined && (
                        <span style={styles.stat}>
                          <span style={styles.statLabel}>Runs:</span>
                          <span style={styles.statValue}>{cron.runCount}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div style={styles.modalOverlay} onClick={() => setShowAddModal(false)}>
          <div style={styles.modal} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>
                {selectedCron ? 'Edit Cron Job' : 'New Cron Job'}
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
                  placeholder="echo 'Hello World'"
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
                {selectedCron && (
                  <button
                    type="button"
                    onClick={() => handleDelete(selectedCron.id)}
                    style={styles.deleteButton}
                  >
                    🗑️ Delete
                  </button>
                )}
                <div style={styles.formActionsRight}>
                  <button type="button" onClick={() => setShowAddModal(false)} style={styles.cancelButton}>
                    Cancel
                  </button>
                  <button type="submit" style={styles.submitButton}>
                    {selectedCron ? 'Save Changes' : 'Create Cron'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* History Modal */}
      {showHistoryModal && selectedCron && (
        <div style={styles.modalOverlay} onClick={() => setShowHistoryModal(false)}>
          <div style={{ ...styles.modal, ...styles.historyModal }} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>
                Run History: {selectedCron.name}
              </h3>
              <button onClick={() => setShowHistoryModal(false)} style={styles.modalClose}>×</button>
            </div>
            
            <div style={styles.historyContent}>
              {historyLoading ? (
                <div style={styles.loading}>Loading history...</div>
              ) : history.length === 0 ? (
                <div style={styles.emptyHistory}>
                  <span>📭</span>
                  <p>No run history yet</p>
                </div>
              ) : (
                <div style={styles.historyList}>
                  {history.map(item => (
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
                      </div>
                      {item.output && (
                        <pre style={styles.historyOutput}>{item.output}</pre>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
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
    alignItems: 'center',
    justifyContent: 'space-between',
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
  content: {
    padding: '20px',
    maxHeight: '600px',
    overflowY: 'auto',
  },
  loading: {
    textAlign: 'center',
    padding: '40px',
    color: 'rgba(255,255,255,0.5)',
  },
  loadingIcon: {
    fontSize: '32px',
    display: 'block',
    marginBottom: '12px',
  },
  error: {
    textAlign: 'center',
    padding: '40px',
    color: '#ef4444',
  },
  errorIcon: {
    fontSize: '32px',
    display: 'block',
    marginBottom: '12px',
  },
  retryButton: {
    marginTop: '12px',
    padding: '8px 16px',
    background: 'rgba(255,255,255,0.1)',
    border: 'none',
    borderRadius: '8px',
    color: '#fff',
    cursor: 'pointer',
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
  cronList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  cronCard: {
    background: 'rgba(255,255,255,0.03)',
    borderRadius: '12px',
    padding: '16px',
    border: '1px solid rgba(255,255,255,0.05)',
  },
  cronHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '12px',
  },
  cronInfo: {
    flex: 1,
  },
  cronName: {
    color: '#fff',
    fontSize: '1rem',
    fontWeight: 600,
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '6px',
  },
  statusDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
  },
  cronSchedule: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    color: '#667eea',
    fontSize: '0.85rem',
  },
  scheduleIcon: {
    fontSize: '14px',
  },
  cronExpression: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: '0.75rem',
  },
  cronActions: {
    display: 'flex',
    gap: '6px',
  },
  actionButton: {
    width: '36px',
    height: '36px',
    borderRadius: '8px',
    border: 'none',
    background: 'rgba(255,255,255,0.05)',
    cursor: 'pointer',
    fontSize: '14px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  runButton: {
    background: 'rgba(102,126,234,0.2)',
  },
  cronMeta: {
    paddingTop: '12px',
    borderTop: '1px solid rgba(255,255,255,0.05)',
  },
  cronCommand: {
    marginBottom: '10px',
  },
  commandLabel: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: '0.75rem',
    marginRight: '8px',
  },
  commandCode: {
    background: 'rgba(0,0,0,0.3)',
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '0.8rem',
    color: 'rgba(255,255,255,0.8)',
    fontFamily: 'monospace',
  },
  cronStats: {
    display: 'flex',
    gap: '20px',
    flexWrap: 'wrap',
  },
  stat: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '0.8rem',
  },
  statLabel: {
    color: 'rgba(255,255,255,0.4)',
  },
  statValue: {
    color: 'rgba(255,255,255,0.8)',
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
    overflow: 'hidden',
    border: '1px solid rgba(255,255,255,0.1)',
  },
  historyModal: {
    maxWidth: '600px',
  },
  modalHeader: {
    padding: '20px 24px',
    borderBottom: '1px solid rgba(255,255,255,0.08)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
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
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: '20px',
    borderTop: '1px solid rgba(255,255,255,0.08)',
  },
  formActionsRight: {
    display: 'flex',
    gap: '10px',
  },
  deleteButton: {
    padding: '10px 16px',
    background: 'rgba(239,68,68,0.2)',
    border: 'none',
    borderRadius: '10px',
    color: '#ef4444',
    fontWeight: 500,
    cursor: 'pointer',
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

  // History
  historyContent: {
    padding: '20px',
    maxHeight: '400px',
    overflowY: 'auto',
  },
  emptyHistory: {
    textAlign: 'center',
    padding: '40px',
    color: 'rgba(255,255,255,0.4)',
  },
  historyList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  historyItem: {
    background: 'rgba(255,255,255,0.03)',
    borderRadius: '10px',
    padding: '14px',
  },
  historyItemHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
  },
  historyStatus: {
    fontWeight: 600,
    fontSize: '0.85rem',
  },
  historyTime: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: '0.8rem',
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
    maxHeight: '100px',
    overflow: 'auto',
  },
};
