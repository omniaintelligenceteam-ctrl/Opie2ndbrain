'use client';
import { useState, useEffect, useCallback } from 'react';
import { 
  useSystemStatus, 
  useDashboardMetrics, 
  useSmartGreeting,
  useRecentMemories,
  useConnectionStatus,
} from '../hooks/useRealTimeData';

interface SmartDashboardHomeProps {
  userName?: string;
  onNavigate?: (view: string) => void;
  onQuickAction?: (action: string) => void;
}

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

export default function SmartDashboardHome({ 
  userName = 'Wes',
  onNavigate,
  onQuickAction,
}: SmartDashboardHomeProps) {
  const { greeting, suggestion } = useSmartGreeting(userName);
  const { status, loading: statusLoading } = useSystemStatus(5000);
  const { metrics, loading: metricsLoading } = useDashboardMetrics(30000);
  const { memories, loading: memoriesLoading } = useRecentMemories(5);
  const { isOnline, latency } = useConnectionStatus();
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update time every minute
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = () => {
    if (!status?.opie) return '#6b7280';
    switch (status.opie.status) {
      case 'online': return '#22c55e';
      case 'thinking': return '#667eea';
      case 'speaking': return '#f59e0b';
      default: return '#ef4444';
    }
  };

  const getStatusText = () => {
    if (!status?.opie) return 'Connecting...';
    switch (status.opie.status) {
      case 'online': return 'Online & Ready';
      case 'thinking': return 'Processing...';
      case 'speaking': return 'Speaking...';
      default: return 'Offline';
    }
  };

  // Calculate quick wins / opportunities
  const getOpportunities = () => {
    const opps = [];
    if (status?.tasks?.pending && status.tasks.pending > 0) {
      opps.push({ icon: '📋', text: `${status.tasks.pending} pending tasks`, action: 'tasks' });
    }
    if (status?.tasks?.failed && status.tasks.failed > 0) {
      opps.push({ icon: '⚠️', text: `${status.tasks.failed} failed tasks need attention`, action: 'tasks' });
    }
    if (metrics?.tasks?.successRate && metrics.tasks.successRate < 90) {
      opps.push({ icon: '📊', text: 'Success rate below target', action: 'analytics' });
    }
    if (opps.length === 0) {
      opps.push({ icon: '✨', text: 'All systems running smoothly', action: null });
    }
    return opps;
  };

  return (
    <div style={styles.container}>
      {/* Top Section: Greeting + Status */}
      <div style={styles.heroSection}>
        {/* Greeting */}
        <div style={styles.greetingArea}>
          <h1 style={styles.greeting}>{greeting}</h1>
          <p style={styles.suggestion}>{suggestion}</p>
          <div style={styles.timeDisplay}>
            {currentTime.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            {' • '}
            {currentTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
          </div>
        </div>

        {/* Opie Status Card */}
        <div style={styles.statusCard}>
          <div style={styles.statusHeader}>
            <div style={styles.avatarContainer}>
              <img 
                src="/opie-avatar.png" 
                alt="Opie" 
                style={styles.avatar}
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
              <div style={{
                ...styles.statusDot,
                background: getStatusColor(),
                animation: status?.opie?.status === 'thinking' ? 'pulse 1.5s infinite' : 'none',
              }} />
            </div>
            <div style={styles.statusInfo}>
              <span style={styles.opieLabel}>Opie</span>
              <span style={{ ...styles.statusText, color: getStatusColor() }}>
                {getStatusText()}
              </span>
            </div>
          </div>
          <div style={styles.statusMeta}>
            {status?.opie?.uptime && (
              <div style={styles.metaItem}>
                <span style={styles.metaIcon}>⏱️</span>
                <span>Uptime: {formatUptime(status.opie.uptime)}</span>
              </div>
            )}
            {latency !== null && (
              <div style={styles.metaItem}>
                <span style={styles.metaIcon}>📡</span>
                <span>Latency: {latency}ms</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Connection Indicators */}
      <div style={styles.connectionBar}>
        <div style={styles.connectionItem}>
          <div style={{
            ...styles.connectionDot,
            background: status?.gateway?.connected ? '#22c55e' : '#ef4444',
          }} />
          <span>Gateway</span>
        </div>
        <div style={styles.connectionItem}>
          <div style={{
            ...styles.connectionDot,
            background: status?.voice?.available ? '#22c55e' : '#6b7280',
          }} />
          <span>Voice</span>
        </div>
        <div style={styles.connectionItem}>
          <div style={{
            ...styles.connectionDot,
            background: status?.api?.healthy ? '#22c55e' : '#ef4444',
          }} />
          <span>API</span>
        </div>
        <div style={styles.connectionItem}>
          <div style={{
            ...styles.connectionDot,
            background: isOnline ? '#22c55e' : '#ef4444',
          }} />
          <span>Network</span>
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div style={styles.metricsGrid}>
        <div style={styles.metricCard} onClick={() => onNavigate?.('agents')}>
          <div style={styles.metricHeader}>
            <span style={styles.metricIcon}>🤖</span>
            <span style={styles.metricLabel}>Active Agents</span>
          </div>
          <div style={styles.metricValue}>{status?.agents?.active ?? '-'}</div>
          <div style={styles.metricSub}>
            {status?.agents?.total ?? 0} total agents
          </div>
        </div>

        <div style={styles.metricCard} onClick={() => onNavigate?.('tasks')}>
          <div style={styles.metricHeader}>
            <span style={styles.metricIcon}>⚡</span>
            <span style={styles.metricLabel}>Running Tasks</span>
          </div>
          <div style={{ ...styles.metricValue, color: '#f59e0b' }}>
            {status?.tasks?.running ?? '-'}
          </div>
          <div style={styles.metricSub}>
            {status?.tasks?.completed ?? 0} completed today
          </div>
        </div>

        <div style={styles.metricCard} onClick={() => onNavigate?.('analytics')}>
          <div style={styles.metricHeader}>
            <span style={styles.metricIcon}>📊</span>
            <span style={styles.metricLabel}>Sessions Today</span>
          </div>
          <div style={{ ...styles.metricValue, color: '#667eea' }}>
            {metrics?.sessions?.today ?? '-'}
          </div>
          <div style={styles.metricSub}>
            {formatNumber(metrics?.tokens?.today ?? 0)} tokens used
          </div>
        </div>

        <div style={styles.metricCard}>
          <div style={styles.metricHeader}>
            <span style={styles.metricIcon}>✅</span>
            <span style={styles.metricLabel}>Success Rate</span>
          </div>
          <div style={{ ...styles.metricValue, color: '#22c55e' }}>
            {metrics?.tasks?.successRate?.toFixed(1) ?? '-'}%
          </div>
          <div style={styles.metricSub}>
            Avg {metrics?.tasks?.avgDuration ?? 0}s per task
          </div>
        </div>
      </div>

      {/* Two Column Layout: Opportunities + Recent Memory */}
      <div style={styles.twoColumnLayout}>
        {/* Opportunities / Quick Actions */}
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>
            <span style={styles.sectionIcon}>💡</span>
            Suggested Actions
          </h3>
          <div style={styles.opportunitiesList}>
            {getOpportunities().map((opp, idx) => (
              <div 
                key={idx} 
                style={styles.opportunityItem}
                onClick={() => opp.action && onNavigate?.(opp.action)}
              >
                <span style={styles.oppIcon}>{opp.icon}</span>
                <span style={styles.oppText}>{opp.text}</span>
                {opp.action && <span style={styles.oppArrow}>→</span>}
              </div>
            ))}
          </div>
          
          {/* Quick Action Buttons */}
          <div style={styles.quickActions}>
            <button 
              style={styles.quickActionBtn}
              onClick={() => onQuickAction?.('deploy')}
            >
              🚀 Deploy Agent
            </button>
            <button 
              style={{ ...styles.quickActionBtn, ...styles.quickActionSecondary }}
              onClick={() => onNavigate?.('voice')}
            >
              🎤 Voice Chat
            </button>
          </div>
        </div>

        {/* Recent Memories */}
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>
            <span style={styles.sectionIcon}>🧠</span>
            Recent Memory
          </h3>
          <div style={styles.memoryList}>
            {memoriesLoading ? (
              <div style={styles.loadingState}>Loading memories...</div>
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

      {/* Agent Activity Summary */}
      <div style={styles.activitySummary}>
        <h3 style={styles.sectionTitle}>
          <span style={styles.sectionIcon}>📈</span>
          Agent Performance
        </h3>
        <div style={styles.performanceGrid}>
          <div style={styles.perfItem}>
            <span style={styles.perfLabel}>Most Active</span>
            <span style={styles.perfValue}>{metrics?.agents?.mostActive ?? 'Code Agent'}</span>
          </div>
          <div style={styles.perfItem}>
            <span style={styles.perfLabel}>Tasks/Agent</span>
            <span style={styles.perfValue}>{metrics?.agents?.tasksPerAgent ?? 4}</span>
          </div>
          <div style={styles.perfItem}>
            <span style={styles.perfLabel}>Efficiency</span>
            <span style={styles.perfValue}>{metrics?.agents?.efficiency?.toFixed(0) ?? 92}%</span>
          </div>
          <div style={styles.perfItem}>
            <span style={styles.perfLabel}>Conversations</span>
            <span style={styles.perfValue}>{metrics?.conversations?.today ?? 8}</span>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(1.1); }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes glow {
          0%, 100% { box-shadow: 0 0 10px rgba(102, 126, 234, 0.3); }
          50% { box-shadow: 0 0 20px rgba(102, 126, 234, 0.5); }
        }
      `}</style>
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    padding: '8px',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    animation: 'slideUp 0.3s ease',
  },

  // Hero Section
  heroSection: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '24px',
    flexWrap: 'wrap',
  },
  greetingArea: {
    flex: 1,
    minWidth: '280px',
  },
  greeting: {
    color: '#fff',
    fontSize: 'clamp(1.8rem, 4vw, 2.5rem)',
    fontWeight: 700,
    margin: '0 0 8px 0',
    lineHeight: 1.2,
  },
  suggestion: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: '1rem',
    margin: '0 0 12px 0',
    lineHeight: 1.5,
  },
  timeDisplay: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: '0.9rem',
  },

  // Status Card
  statusCard: {
    background: 'rgba(255,255,255,0.03)',
    borderRadius: '16px',
    padding: '20px',
    border: '1px solid rgba(255,255,255,0.08)',
    minWidth: '220px',
  },
  statusHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    marginBottom: '12px',
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: '56px',
    height: '56px',
    borderRadius: '50%',
    objectFit: 'cover',
    border: '2px solid rgba(102, 126, 234, 0.4)',
  },
  statusDot: {
    position: 'absolute',
    bottom: '2px',
    right: '2px',
    width: '14px',
    height: '14px',
    borderRadius: '50%',
    border: '2px solid #1a1a2e',
  },
  statusInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  opieLabel: {
    color: '#fff',
    fontSize: '1.1rem',
    fontWeight: 600,
  },
  statusText: {
    fontSize: '0.85rem',
    fontWeight: 500,
  },
  statusMeta: {
    display: 'flex',
    gap: '16px',
    flexWrap: 'wrap',
  },
  metaItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '0.8rem',
    color: 'rgba(255,255,255,0.5)',
  },
  metaIcon: {
    fontSize: '12px',
  },

  // Connection Bar
  connectionBar: {
    display: 'flex',
    gap: '24px',
    padding: '12px 20px',
    background: 'rgba(255,255,255,0.02)',
    borderRadius: '12px',
    flexWrap: 'wrap',
  },
  connectionItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '0.85rem',
    color: 'rgba(255,255,255,0.6)',
  },
  connectionDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
  },

  // Metrics Grid
  metricsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '16px',
  },
  metricCard: {
    background: 'rgba(255,255,255,0.03)',
    borderRadius: '14px',
    padding: '18px',
    border: '1px solid rgba(255,255,255,0.06)',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  metricHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '10px',
  },
  metricIcon: {
    fontSize: '18px',
  },
  metricLabel: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: '0.8rem',
    fontWeight: 500,
  },
  metricValue: {
    color: '#fff',
    fontSize: '2rem',
    fontWeight: 700,
    lineHeight: 1,
    marginBottom: '6px',
  },
  metricSub: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: '0.75rem',
  },

  // Two Column Layout
  twoColumnLayout: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '20px',
  },
  section: {
    background: 'rgba(255,255,255,0.02)',
    borderRadius: '16px',
    padding: '20px',
    border: '1px solid rgba(255,255,255,0.05)',
  },
  sectionTitle: {
    color: '#fff',
    fontSize: '1rem',
    fontWeight: 600,
    margin: '0 0 16px 0',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  sectionIcon: {
    fontSize: '18px',
  },

  // Opportunities
  opportunitiesList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    marginBottom: '16px',
  },
  opportunityItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 14px',
    background: 'rgba(255,255,255,0.03)',
    borderRadius: '10px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  oppIcon: {
    fontSize: '16px',
  },
  oppText: {
    flex: 1,
    color: 'rgba(255,255,255,0.8)',
    fontSize: '0.9rem',
  },
  oppArrow: {
    color: '#667eea',
    fontSize: '1rem',
  },
  quickActions: {
    display: 'flex',
    gap: '10px',
    flexWrap: 'wrap',
  },
  quickActionBtn: {
    flex: 1,
    minWidth: '120px',
    padding: '12px 16px',
    background: '#667eea',
    border: 'none',
    borderRadius: '10px',
    color: '#fff',
    fontSize: '0.9rem',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  quickActionSecondary: {
    background: 'rgba(102,126,234,0.15)',
    color: '#667eea',
  },

  // Memory List
  memoryList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    marginBottom: '12px',
  },
  memoryItem: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    padding: '10px 12px',
    background: 'rgba(255,255,255,0.02)',
    borderRadius: '10px',
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
    fontSize: '0.85rem',
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
  },
  memoryTime: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: '0.7rem',
    whiteSpace: 'nowrap',
  },
  viewAllBtn: {
    width: '100%',
    padding: '10px',
    background: 'transparent',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '8px',
    color: '#667eea',
    fontSize: '0.85rem',
    cursor: 'pointer',
  },
  loadingState: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: '0.85rem',
    textAlign: 'center',
    padding: '20px',
  },
  emptyState: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: '0.85rem',
    textAlign: 'center',
    padding: '20px',
  },

  // Activity Summary
  activitySummary: {
    background: 'rgba(255,255,255,0.02)',
    borderRadius: '16px',
    padding: '20px',
    border: '1px solid rgba(255,255,255,0.05)',
  },
  performanceGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
    gap: '16px',
  },
  perfItem: {
    textAlign: 'center',
    padding: '12px',
    background: 'rgba(255,255,255,0.02)',
    borderRadius: '10px',
  },
  perfLabel: {
    display: 'block',
    color: 'rgba(255,255,255,0.5)',
    fontSize: '0.75rem',
    marginBottom: '6px',
  },
  perfValue: {
    color: '#fff',
    fontSize: '1.1rem',
    fontWeight: 600,
  },
};
