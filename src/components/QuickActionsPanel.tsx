'use client';
import { useState, useEffect } from 'react';

interface QuickAction {
  id: string;
  label: string;
  icon: string;
  message: string | null;
  color?: string;
}

interface RecentCommand {
  id: string;
  message: string;
  timestamp: number;
}

interface CustomAction {
  id: string;
  label: string;
  icon: string;
  message: string;
}

interface QuickActionsPanelProps {
  onSendMessage: (message: string) => void;
  onSpawnAgent?: () => void;
}

const BUILT_IN_ACTIONS: QuickAction[] = [
  { id: 'morning', label: 'Morning Brief', icon: '☀️', message: 'Give me my morning brief', color: '#f59e0b' },
  { id: 'email', label: 'Check Email', icon: '📧', message: 'Check my email for anything important', color: '#667eea' },
  { id: 'weather', label: 'Weather', icon: '🌤️', message: "What's the weather in Scottsdale?", color: '#22c55e' },
  { id: 'status', label: 'Status', icon: '📊', message: '/status', color: '#8b5cf6' },
  { id: 'spawn', label: 'New Agent', icon: '🤖', message: null, color: '#ec4899' },
];

const STORAGE_KEY = 'opie-recent-commands';
const CUSTOM_ACTIONS_KEY = 'opie-custom-actions';

function getRecentCommands(): RecentCommand[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveRecentCommands(commands: RecentCommand[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(commands.slice(0, 10)));
}

function getCustomActions(): CustomAction[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(CUSTOM_ACTIONS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveCustomActions(actions: CustomAction[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(CUSTOM_ACTIONS_KEY, JSON.stringify(actions));
}

// Track analytics
function trackAction(actionId: string, actionLabel: string): void {
  if (typeof window === 'undefined') return;
  try {
    const analyticsKey = 'opie-analytics';
    const stored = localStorage.getItem(analyticsKey);
    const analytics = stored ? JSON.parse(stored) : { actions: {}, messages: [], dailyStats: {} };
    
    // Track action usage
    analytics.actions[actionId] = (analytics.actions[actionId] || 0) + 1;
    
    // Track daily message count
    const today = new Date().toISOString().split('T')[0];
    if (!analytics.dailyStats[today]) {
      analytics.dailyStats[today] = { messages: 0, tokens: 0, tasks: 0 };
    }
    analytics.dailyStats[today].messages += 1;
    
    localStorage.setItem(analyticsKey, JSON.stringify(analytics));
  } catch (e) {
    console.error('Failed to track analytics', e);
  }
}

export default function QuickActionsPanel({ onSendMessage, onSpawnAgent }: QuickActionsPanelProps) {
  const [recentCommands, setRecentCommands] = useState<RecentCommand[]>([]);
  const [customActions, setCustomActions] = useState<CustomAction[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newAction, setNewAction] = useState({ label: '', icon: '⚡', message: '' });
  const [activeTab, setActiveTab] = useState<'actions' | 'recent'>('actions');

  useEffect(() => {
    setRecentCommands(getRecentCommands());
    setCustomActions(getCustomActions());
  }, []);

  const handleAction = (action: QuickAction) => {
    if (action.id === 'spawn') {
      onSpawnAgent?.();
      return;
    }
    
    if (action.message) {
      // Track the action
      trackAction(action.id, action.label);
      
      // Add to recent commands
      const newCommand: RecentCommand = {
        id: Date.now().toString(),
        message: action.message,
        timestamp: Date.now(),
      };
      const updated = [newCommand, ...recentCommands.filter(c => c.message !== action.message)].slice(0, 10);
      setRecentCommands(updated);
      saveRecentCommands(updated);
      
      // Send the message
      onSendMessage(action.message);
    }
  };

  const handleCustomAction = (action: CustomAction) => {
    trackAction(`custom-${action.id}`, action.label);
    
    const newCommand: RecentCommand = {
      id: Date.now().toString(),
      message: action.message,
      timestamp: Date.now(),
    };
    const updated = [newCommand, ...recentCommands.filter(c => c.message !== action.message)].slice(0, 10);
    setRecentCommands(updated);
    saveRecentCommands(updated);
    
    onSendMessage(action.message);
  };

  const handleRecentCommand = (command: RecentCommand) => {
    trackAction('recent', command.message);
    onSendMessage(command.message);
  };

  const handleAddCustomAction = () => {
    if (!newAction.label.trim() || !newAction.message.trim()) return;
    
    const action: CustomAction = {
      id: Date.now().toString(),
      label: newAction.label.trim(),
      icon: newAction.icon || '⚡',
      message: newAction.message.trim(),
    };
    
    const updated = [...customActions, action];
    setCustomActions(updated);
    saveCustomActions(updated);
    setNewAction({ label: '', icon: '⚡', message: '' });
    setShowAddModal(false);
  };

  const handleDeleteCustomAction = (id: string) => {
    const updated = customActions.filter(a => a.id !== id);
    setCustomActions(updated);
    saveCustomActions(updated);
  };

  const formatTimeAgo = (timestamp: number): string => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <span style={styles.headerIcon}>⚡</span>
          <div>
            <h2 style={styles.title}>Quick Actions</h2>
            <span style={styles.subtitle}>One-click commands</span>
          </div>
        </div>
        <div style={styles.tabs}>
          <button
            onClick={() => setActiveTab('actions')}
            style={{ ...styles.tab, ...(activeTab === 'actions' ? styles.tabActive : {}) }}
          >
            Actions
          </button>
          <button
            onClick={() => setActiveTab('recent')}
            style={{ ...styles.tab, ...(activeTab === 'recent' ? styles.tabActive : {}) }}
          >
            Recent
            {recentCommands.length > 0 && (
              <span style={styles.tabBadge}>{recentCommands.length}</span>
            )}
          </button>
        </div>
      </div>

      {activeTab === 'actions' && (
        <>
          {/* Built-in Actions Grid */}
          <div style={styles.actionsGrid}>
            {BUILT_IN_ACTIONS.map(action => (
              <button
                key={action.id}
                onClick={() => handleAction(action)}
                style={styles.actionButton}
              >
                <span style={styles.actionIcon}>{action.icon}</span>
                <span style={styles.actionLabel}>{action.label}</span>
                <div 
                  style={{ 
                    ...styles.actionGlow, 
                    background: `radial-gradient(circle at center, ${action.color}20 0%, transparent 70%)` 
                  }} 
                />
              </button>
            ))}
          </div>

          {/* Custom Actions */}
          {customActions.length > 0 && (
            <div style={styles.customSection}>
              <div style={styles.sectionHeader}>
                <span style={styles.sectionTitle}>Custom Actions</span>
                <button onClick={() => setShowAddModal(true)} style={styles.addButton}>
                  + Add
                </button>
              </div>
              <div style={styles.customGrid}>
                {customActions.map(action => (
                  <div key={action.id} style={styles.customAction}>
                    <button
                      onClick={() => handleCustomAction(action)}
                      style={styles.customActionButton}
                    >
                      <span style={styles.customIcon}>{action.icon}</span>
                      <span style={styles.customLabel}>{action.label}</span>
                    </button>
                    <button
                      onClick={() => handleDeleteCustomAction(action.id)}
                      style={styles.deleteButton}
                      title="Delete"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Add Custom Action Button */}
          {customActions.length === 0 && (
            <button onClick={() => setShowAddModal(true)} style={styles.addFirstButton}>
              <span>➕</span>
              <span>Add Custom Action</span>
            </button>
          )}
        </>
      )}

      {activeTab === 'recent' && (
        <div style={styles.recentList}>
          {recentCommands.length === 0 ? (
            <div style={styles.emptyRecent}>
              <span style={styles.emptyIcon}>📜</span>
              <p>No recent commands yet</p>
              <p style={styles.emptySubtext}>Commands you run will appear here</p>
            </div>
          ) : (
            recentCommands.map(cmd => (
              <button
                key={cmd.id}
                onClick={() => handleRecentCommand(cmd)}
                style={styles.recentItem}
              >
                <span style={styles.recentMessage}>{cmd.message}</span>
                <span style={styles.recentTime}>{formatTimeAgo(cmd.timestamp)}</span>
              </button>
            ))
          )}
        </div>
      )}

      {/* Add Custom Action Modal */}
      {showAddModal && (
        <div style={styles.modalOverlay} onClick={() => setShowAddModal(false)}>
          <div style={styles.modal} onClick={e => e.stopPropagation()}>
            <h3 style={styles.modalTitle}>Add Custom Action</h3>
            <div style={styles.modalForm}>
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Icon</label>
                <input
                  type="text"
                  value={newAction.icon}
                  onChange={e => setNewAction({ ...newAction, icon: e.target.value })}
                  style={styles.iconInput}
                  maxLength={2}
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Label</label>
                <input
                  type="text"
                  value={newAction.label}
                  onChange={e => setNewAction({ ...newAction, label: e.target.value })}
                  placeholder="e.g., Check Calendar"
                  style={styles.textInput}
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Message</label>
                <textarea
                  value={newAction.message}
                  onChange={e => setNewAction({ ...newAction, message: e.target.value })}
                  placeholder="e.g., What's on my calendar today?"
                  style={styles.textArea}
                  rows={3}
                />
              </div>
              <div style={styles.modalActions}>
                <button onClick={() => setShowAddModal(false)} style={styles.cancelButton}>
                  Cancel
                </button>
                <button 
                  onClick={handleAddCustomAction}
                  disabled={!newAction.label.trim() || !newAction.message.trim()}
                  style={{
                    ...styles.saveButton,
                    opacity: (!newAction.label.trim() || !newAction.message.trim()) ? 0.5 : 1,
                  }}
                >
                  Add Action
                </button>
              </div>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '16px',
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
  tabs: {
    display: 'flex',
    gap: '4px',
    background: 'rgba(255,255,255,0.05)',
    borderRadius: '10px',
    padding: '4px',
  },
  tab: {
    padding: '8px 16px',
    background: 'transparent',
    border: 'none',
    borderRadius: '8px',
    color: 'rgba(255,255,255,0.6)',
    fontSize: '0.85rem',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    transition: 'all 0.2s ease',
  },
  tabActive: {
    background: 'rgba(102,126,234,0.2)',
    color: '#fff',
  },
  tabBadge: {
    background: 'rgba(102,126,234,0.3)',
    color: '#667eea',
    padding: '2px 6px',
    borderRadius: '6px',
    fontSize: '0.7rem',
    fontWeight: 600,
  },
  actionsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
    gap: '12px',
    padding: '20px',
  },
  actionButton: {
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '10px',
    padding: '20px 16px',
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '14px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    overflow: 'hidden',
  },
  actionIcon: {
    fontSize: '32px',
    zIndex: 1,
  },
  actionLabel: {
    color: '#fff',
    fontSize: '0.85rem',
    fontWeight: 500,
    zIndex: 1,
    textAlign: 'center',
  },
  actionGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0,
    transition: 'opacity 0.2s ease',
    pointerEvents: 'none',
  },
  customSection: {
    padding: '0 20px 20px',
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
    paddingTop: '12px',
    borderTop: '1px solid rgba(255,255,255,0.05)',
  },
  sectionTitle: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: '0.8rem',
    fontWeight: 500,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  addButton: {
    background: 'rgba(102,126,234,0.2)',
    border: 'none',
    color: '#667eea',
    padding: '6px 12px',
    borderRadius: '8px',
    fontSize: '0.75rem',
    fontWeight: 600,
    cursor: 'pointer',
  },
  customGrid: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '10px',
  },
  customAction: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  customActionButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 16px',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '10px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  customIcon: {
    fontSize: '18px',
  },
  customLabel: {
    color: '#fff',
    fontSize: '0.85rem',
    fontWeight: 500,
  },
  deleteButton: {
    position: 'absolute',
    top: '-6px',
    right: '-6px',
    width: '20px',
    height: '20px',
    borderRadius: '50%',
    background: '#ef4444',
    border: 'none',
    color: '#fff',
    fontSize: '14px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0,
    transition: 'opacity 0.2s ease',
  },
  addFirstButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    margin: '0 20px 20px',
    padding: '16px',
    background: 'rgba(102,126,234,0.1)',
    border: '2px dashed rgba(102,126,234,0.3)',
    borderRadius: '12px',
    color: '#667eea',
    fontSize: '0.9rem',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  recentList: {
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    maxHeight: '400px',
    overflowY: 'auto',
  },
  recentItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '14px 16px',
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.05)',
    borderRadius: '10px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    textAlign: 'left',
  },
  recentMessage: {
    color: '#fff',
    fontSize: '0.9rem',
    flex: 1,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    marginRight: '12px',
  },
  recentTime: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: '0.75rem',
    flexShrink: 0,
  },
  emptyRecent: {
    textAlign: 'center',
    padding: '40px 20px',
    color: 'rgba(255,255,255,0.5)',
  },
  emptyIcon: {
    fontSize: '48px',
    display: 'block',
    marginBottom: '12px',
    opacity: 0.5,
  },
  emptySubtext: {
    fontSize: '0.8rem',
    color: 'rgba(255,255,255,0.3)',
    marginTop: '4px',
  },
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
    zIndex: 2000,
  },
  modal: {
    background: '#1a1a2e',
    borderRadius: '16px',
    border: '1px solid rgba(255,255,255,0.1)',
    padding: '24px',
    width: '100%',
    maxWidth: '400px',
    margin: '16px',
  },
  modalTitle: {
    color: '#fff',
    fontSize: '1.2rem',
    fontWeight: 600,
    margin: '0 0 20px',
  },
  modalForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  formLabel: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: '0.85rem',
    fontWeight: 500,
  },
  iconInput: {
    width: '60px',
    padding: '12px',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '10px',
    color: '#fff',
    fontSize: '1.5rem',
    textAlign: 'center',
    outline: 'none',
  },
  textInput: {
    padding: '12px 14px',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '10px',
    color: '#fff',
    fontSize: '0.9rem',
    outline: 'none',
  },
  textArea: {
    padding: '12px 14px',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '10px',
    color: '#fff',
    fontSize: '0.9rem',
    resize: 'vertical',
    outline: 'none',
    minHeight: '80px',
  },
  modalActions: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'flex-end',
    marginTop: '8px',
  },
  cancelButton: {
    padding: '12px 20px',
    background: 'rgba(255,255,255,0.05)',
    border: 'none',
    borderRadius: '10px',
    color: 'rgba(255,255,255,0.6)',
    fontSize: '0.9rem',
    fontWeight: 500,
    cursor: 'pointer',
  },
  saveButton: {
    padding: '12px 20px',
    background: '#667eea',
    border: 'none',
    borderRadius: '10px',
    color: '#fff',
    fontSize: '0.9rem',
    fontWeight: 600,
    cursor: 'pointer',
  },
};
