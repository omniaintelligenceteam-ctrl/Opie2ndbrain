'use client';
import { useState, useEffect, useCallback } from 'react';
import { 
  useSystemStatus, 
  useSmartGreeting,
  useRecentMemories,
  useConnectionStatus,
} from '../hooks/useRealTimeData';

interface SmartDashboardHomeProps {
  userName?: string;
  onNavigate?: (view: string) => void;
  onQuickAction?: (action: string) => void;
}

// Utility functions
function formatUptime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
  return `${Math.floor(seconds / 86400)}d ${Math.floor((seconds % 86400) / 3600)}h`;
}

function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return String(num);
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
  return date.toLocaleDateString();
}

// Status Orb Component - REMOVED (as per requirements)

// Metric Card Component
function MetricCard({ 
  icon, 
  label, 
  value, 
  subtext, 
  color = '#6366f1',
  onClick 
}: { 
  icon: string; 
  label: string; 
  value: string | number; 
  subtext?: string;
  color?: string;
  onClick?: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  
  return (
    <div 
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered 
          ? 'linear-gradient(135deg, rgba(99,102,241,0.12) 0%, rgba(139,92,246,0.08) 100%)'
          : 'linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)',
        borderRadius: '16px',
        padding: '20px',
        border: hovered ? '1px solid rgba(99,102,241,0.3)' : '1px solid rgba(255,255,255,0.06)',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        transform: hovered ? 'translateY(-2px)' : 'none',
        boxShadow: hovered ? '0 8px 30px rgba(99,102,241,0.15)' : 'none',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
        <span style={{ fontSize: '20px' }}>{icon}</span>
        <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem', fontWeight: 500 }}>
          {label}
        </span>
      </div>
      <div style={{ 
        color: color, 
        fontSize: '2.25rem', 
        fontWeight: 700,
        fontVariantNumeric: 'tabular-nums',
        letterSpacing: '-0.02em',
        lineHeight: 1,
        marginBottom: '6px',
      }}>
        {value}
      </div>
      {subtext && (
        <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.8rem' }}>
          {subtext}
        </div>
      )}
    </div>
  );
}

// Connection Status Pill
function ConnectionPill({ label, connected }: { label: string; connected: boolean }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      padding: '8px 14px',
      background: connected ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
      borderRadius: '20px',
      border: `1px solid ${connected ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
    }}>
      <div style={{
        width: '8px',
        height: '8px',
        borderRadius: '50%',
        background: connected ? '#22c55e' : '#ef4444',
        boxShadow: connected ? '0 0 8px rgba(34,197,94,0.6)' : '0 0 8px rgba(239,68,68,0.6)',
      }} />
      <span style={{ 
        color: connected ? '#22c55e' : '#ef4444', 
        fontSize: '0.8rem', 
        fontWeight: 500 
      }}>
        {label}
      </span>
    </div>
  );
}

// Quick Action Button
function QuickActionButton({ 
  icon, 
  label, 
  variant = 'primary',
  onClick 
}: { 
  icon: string; 
  label: string; 
  variant?: 'primary' | 'secondary';
  onClick?: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  
  const isPrimary = variant === 'primary';
  
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        flex: 1,
        minWidth: '120px',
        padding: '14px 20px',
        background: isPrimary 
          ? (hovered ? 'linear-gradient(135deg, #818cf8 0%, #a855f7 100%)' : 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)')
          : (hovered ? 'rgba(99,102,241,0.2)' : 'rgba(99,102,241,0.1)'),
        border: isPrimary ? 'none' : '1px solid rgba(99,102,241,0.3)',
        borderRadius: '12px',
        color: isPrimary ? '#fff' : '#818cf8',
        fontSize: '0.9rem',
        fontWeight: 600,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        transition: 'all 0.2s ease',
        transform: hovered ? 'translateY(-2px)' : 'none',
        boxShadow: isPrimary && hovered ? '0 8px 25px rgba(99,102,241,0.4)' : 'none',
      }}
    >
      <span>{icon}</span>
      <span>{label}</span>
    </button>
  );
}

export default function SmartDashboardHome({ 
  userName = 'Wes',
  onNavigate,
  onQuickAction,
}: SmartDashboardHomeProps) {
  const { greeting, suggestion } = useSmartGreeting(userName);
  // Poll status more frequently for live updates (every 1.5 seconds)
  const { status, loading: statusLoading } = useSystemStatus(1500);
  const { memories, loading: memoriesLoading } = useRecentMemories(5);
  // Poll connection more frequently for real latency (every 3 seconds)
  const { isOnline, latency } = useConnectionStatus();
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  const getStatusText = () => {
    if (!status?.opie) return 'Connecting...';
    switch (status.opie.status) {
      case 'online': 
        if (status.agents?.active > 0) return `${status.agents.active} agents active`;
        return 'Online & Ready';
      case 'thinking': 
        if (status.agents?.active > 0) return `Working (${status.agents.active} agents)`;
        return 'Thinking...';
      case 'speaking': return 'Speaking...';
      default: return 'Gateway Offline';
    }
  };

  const opieStatus = status?.opie?.status || 'offline';

  return (
    <div style={styles.container}>
      <style>{animationCSS}</style>
      
      {/* Hero Section */}
      <div style={styles.heroSection}>
        {/* Left: Greeting */}
        <div style={styles.greetingArea}>
          <div style={styles.greeting}>{greeting}</div>
          <p style={styles.suggestion}>{suggestion}</p>
          <div style={styles.timestamp}>
            <span style={styles.timestampIcon}>📅</span>
            {currentTime.toLocaleDateString('en-US', { 
              weekday: 'long', 
              month: 'long', 
              day: 'numeric' 
            })}
            <span style={styles.timestampDot}>•</span>
            {currentTime.toLocaleTimeString('en-US', { 
              hour: 'numeric', 
              minute: '2-digit' 
            })}
          </div>
        </div>

      </div>

      {/* Connection Status Bar */}
      <div style={styles.connectionBar}>
        <ConnectionPill label="Gateway" connected={status?.gateway?.connected ?? false} />
        <ConnectionPill label="Voice" connected={status?.voice?.available ?? false} />
        <ConnectionPill label="API" connected={status?.api?.healthy ?? false} />
        <ConnectionPill label="Network" connected={isOnline} />
      </div>

      {/* Metrics Grid - Real data only */}
      <div style={styles.metricsGrid}>
        <MetricCard
          icon="🤖"
          label="Active Agents"
          value={status?.agents?.active ?? 0}
          subtext={`${status?.agents?.total ?? 0} total sessions`}
          color="#22c55e"
          onClick={() => onNavigate?.('agents')}
        />
        <MetricCard
          icon="⚡"
          label="Running Tasks"
          value={status?.tasks?.running ?? 0}
          subtext={status?.tasks?.pending ? `${status.tasks.pending} pending` : 'No pending tasks'}
          color="#f59e0b"
          onClick={() => onNavigate?.('tasks')}
        />
      </div>

      {/* Two Column Layout */}
      <div style={styles.twoColumnLayout}>
        {/* Suggested Actions */}
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>
            <span style={styles.sectionIcon}>💡</span>
            Quick Actions
          </h3>
          
          <div style={styles.actionsList}>
            {status?.tasks?.pending && status.tasks.pending > 0 && (
              <div style={styles.actionItem} onClick={() => onNavigate?.('tasks')}>
                <span style={styles.actionIcon}>📋</span>
                <span style={styles.actionText}>{status.tasks.pending} pending tasks need attention</span>
                <span style={styles.actionArrow}>→</span>
              </div>
            )}
            {status?.tasks?.failed && status.tasks.failed > 0 && (
              <div style={styles.actionItem} onClick={() => onNavigate?.('tasks')}>
                <span style={styles.actionIcon}>⚠️</span>
                <span style={styles.actionText}>{status.tasks.failed} failed tasks to review</span>
                <span style={styles.actionArrow}>→</span>
              </div>
            )}
            <div style={styles.actionItem} onClick={() => onNavigate?.('memory')}>
              <span style={styles.actionIcon}>🧠</span>
              <span style={styles.actionText}>Browse your memory bank</span>
              <span style={styles.actionArrow}>→</span>
            </div>
          </div>

          <div style={styles.quickActions}>
            <QuickActionButton
              icon="🚀"
              label="Deploy Agent"
              variant="primary"
              onClick={() => onQuickAction?.('deploy')}
            />
            <QuickActionButton
              icon="🎤"
              label="Voice Chat"
              variant="secondary"
              onClick={() => onNavigate?.('voice')}
            />
          </div>
        </div>

        {/* Recent Memory */}
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>
            <span style={styles.sectionIcon}>🧠</span>
            Recent Memory
          </h3>
          
          <div style={styles.memoryList}>
            {memoriesLoading ? (
              <div style={styles.loadingState}>
                <div style={styles.spinner} />
                <span>Loading memories...</span>
              </div>
            ) : memories.length === 0 ? (
              <div style={styles.emptyState}>No recent memories</div>
            ) : (
              memories.map((mem) => (
                <div key={mem.id} style={styles.memoryItem}>
                  <div style={styles.memoryIcon}>
                    {mem.type === 'file' ? '📄' : 
                     mem.type === 'conversation' ? '💬' :
                     mem.type === 'task' ? '✅' : '📝'}
                  </div>
                  <div style={styles.memoryContent}>
                    <div style={styles.memoryTitle}>{mem.title}</div>
                    {mem.preview && (
                      <div style={styles.memoryPreview}>{mem.preview}</div>
                    )}
                  </div>
                  <div style={styles.memoryTime}>{formatTime(mem.timestamp)}</div>
                </div>
              ))
            )}
          </div>
          
          <button 
            style={styles.viewAllBtn}
            onClick={() => onNavigate?.('memory')}
          >
            View All Memory →
          </button>
        </div>
      </div>

    </div>
  );
}

// Animation CSS
const animationCSS = `
  @keyframes pulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.7; transform: scale(1.05); }
  }
  @keyframes glow {
    0%, 100% { box-shadow: 0 0 20px rgba(99, 102, 241, 0.3); }
    50% { box-shadow: 0 0 40px rgba(99, 102, 241, 0.5); }
  }
  @keyframes fadeInUp {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
`;

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    padding: '8px',
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
    animation: 'fadeInUp 0.4s ease',
  },

  // Hero Section - Now just greeting (status widget moved to sidebar)
  heroSection: {
    display: 'flex',
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
    gap: '32px',
    flexWrap: 'wrap',
  },
  greetingArea: {
    flex: 1,
    minWidth: '300px',
    maxWidth: '600px',
  },
  greeting: {
    color: '#fff',
    fontSize: 'clamp(2rem, 5vw, 2.75rem)',
    fontWeight: 700,
    margin: '0 0 12px 0',
    lineHeight: 1.1,
    letterSpacing: '-0.03em',
    background: 'linear-gradient(135deg, #fff 0%, rgba(255,255,255,0.8) 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
  },
  suggestion: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: '1.1rem',
    margin: '0 0 16px 0',
    lineHeight: 1.5,
    maxWidth: '500px',
  },
  timestamp: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    color: 'rgba(255,255,255,0.4)',
    fontSize: '0.9rem',
  },
  timestampIcon: {
    fontSize: '14px',
  },
  timestampDot: {
    opacity: 0.5,
  },

  // Status Card
  statusCard: {
    background: 'linear-gradient(135deg, rgba(99,102,241,0.1) 0%, rgba(139,92,246,0.05) 100%)',
    borderRadius: '20px',
    padding: '2px',
    minWidth: '280px',
  },
  statusCardInner: {
    background: 'rgba(10,10,15,0.9)',
    borderRadius: '18px',
    padding: '24px',
    backdropFilter: 'blur(20px)',
  },
  statusHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    marginBottom: '20px',
  },
  statusInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  opieName: {
    color: '#fff',
    fontSize: '1.25rem',
    fontWeight: 700,
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  modelBadge: {
    fontSize: '0.65rem',
    padding: '4px 8px',
    background: 'rgba(99,102,241,0.2)',
    borderRadius: '6px',
    color: '#818cf8',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  statusText: {
    fontSize: '0.9rem',
    fontWeight: 500,
  },
  statusMeta: {
    display: 'flex',
    gap: '20px',
    flexWrap: 'wrap',
  },
  metaItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  metaLabel: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: '0.7rem',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  metaValue: {
    color: '#fff',
    fontSize: '0.95rem',
    fontWeight: 600,
    fontVariantNumeric: 'tabular-nums',
  },

  // Connection Bar
  connectionBar: {
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap',
  },

  // Metrics Grid
  metricsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px',
  },

  // Two Column Layout
  twoColumnLayout: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
    gap: '20px',
  },
  section: {
    background: 'linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)',
    borderRadius: '20px',
    padding: '24px',
    border: '1px solid rgba(255,255,255,0.06)',
  },
  sectionTitle: {
    color: '#fff',
    fontSize: '1rem',
    fontWeight: 600,
    margin: '0 0 20px 0',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  sectionIcon: {
    fontSize: '18px',
  },

  // Actions
  actionsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    marginBottom: '20px',
  },
  actionItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '14px 16px',
    background: 'rgba(255,255,255,0.03)',
    borderRadius: '12px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    border: '1px solid transparent',
  },
  actionIcon: {
    fontSize: '16px',
  },
  actionText: {
    flex: 1,
    color: 'rgba(255,255,255,0.8)',
    fontSize: '0.9rem',
  },
  actionArrow: {
    color: '#6366f1',
    fontSize: '1rem',
    fontWeight: 500,
  },
  quickActions: {
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap',
  },

  // Memory List
  memoryList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    marginBottom: '16px',
    maxHeight: '280px',
    overflowY: 'auto',
  },
  memoryItem: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    padding: '12px 14px',
    background: 'rgba(255,255,255,0.02)',
    borderRadius: '12px',
    transition: 'all 0.2s ease',
  },
  memoryIcon: {
    fontSize: '16px',
    marginTop: '2px',
  },
  memoryContent: {
    flex: 1,
    minWidth: 0,
  },
  memoryTitle: {
    color: '#fff',
    fontSize: '0.875rem',
    fontWeight: 500,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  memoryPreview: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: '0.75rem',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    marginTop: '2px',
  },
  memoryTime: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: '0.7rem',
    whiteSpace: 'nowrap',
  },
  viewAllBtn: {
    width: '100%',
    padding: '12px',
    background: 'transparent',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '10px',
    color: '#6366f1',
    fontSize: '0.875rem',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  loadingState: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
    color: 'rgba(255,255,255,0.4)',
    fontSize: '0.875rem',
    padding: '40px 20px',
  },
  spinner: {
    width: '20px',
    height: '20px',
    border: '2px solid rgba(255,255,255,0.1)',
    borderTopColor: '#6366f1',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  emptyState: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: '0.875rem',
    textAlign: 'center',
    padding: '40px 20px',
  },
};
