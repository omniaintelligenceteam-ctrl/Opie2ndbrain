'use client';
import { useState, useEffect } from 'react';
import { useSystemStatus, useConnectionStatus } from '../hooks/useRealTimeData';
import { useSidebarStats } from '../hooks/useSidebarData';

// =============================================================================
// StatusBar - Compact status bar for header
// =============================================================================

interface StatusBarProps {
  showDetails?: boolean;
}

export function StatusBar({ showDetails = false }: StatusBarProps) {
  const { status, loading } = useSystemStatus(5000);
  const { isOnline, latency } = useConnectionStatus();

  const getStatusConfig = () => {
    if (loading || !status?.opie) {
      return { color: '#6b7280', text: 'Connecting', icon: '⏳' };
    }
    switch (status.opie.status) {
      case 'online': return { color: '#22c55e', text: 'Online', icon: '🟢' };
      case 'thinking': return { color: '#667eea', text: 'Thinking', icon: '💭' };
      case 'speaking': return { color: '#f59e0b', text: 'Speaking', icon: '🔊' };
      default: return { color: '#ef4444', text: 'Offline', icon: '🔴' };
    }
  };

  const config = getStatusConfig();

  return (
    <div style={barStyles.container}>
      <div style={barStyles.mainStatus}>
        <div style={{
          ...barStyles.statusDot,
          background: config.color,
          boxShadow: `0 0 8px ${config.color}`,
          animation: status?.opie?.status === 'thinking' ? 'statusPulse 1.5s infinite' : 'none',
        }} />
        <span style={{ ...barStyles.statusText, color: config.color }}>
          {config.text}
        </span>
      </div>

      {showDetails && (
        <>
          <div style={barStyles.divider} />
          <div style={barStyles.indicators}>
            <div style={barStyles.indicator} title="Gateway">
              <div style={{
                ...barStyles.indicatorDot,
                background: status?.gateway?.connected ? '#22c55e' : '#ef4444',
              }} />
              <span>GW</span>
            </div>
            <div style={barStyles.indicator} title="Voice">
              <div style={{
                ...barStyles.indicatorDot,
                background: status?.voice?.available ? '#22c55e' : '#6b7280',
              }} />
              <span>Voice</span>
            </div>
            <div style={barStyles.indicator} title="API">
              <div style={{
                ...barStyles.indicatorDot,
                background: status?.api?.healthy ? '#22c55e' : '#ef4444',
              }} />
              <span>API</span>
            </div>
            <div style={barStyles.indicator} title="Security">
              <div style={{
                ...barStyles.indicatorDot,
                background: status?.security?.secure ? '#22c55e' : 
                           status?.security?.warnings ? '#f59e0b' : '#22c55e',
              }} />
              <span>Sec</span>
            </div>
          </div>
          {latency !== null && (
            <span style={barStyles.latency}>{latency}ms</span>
          )}
        </>
      )}

      <style>{`
        @keyframes statusPulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(1.15); }
        }
      `}</style>
    </div>
  );
}

const barStyles: { [key: string]: React.CSSProperties } = {
  container: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '8px 14px',
    background: 'rgba(255,255,255,0.03)',
    borderRadius: '10px',
    border: '1px solid rgba(255,255,255,0.06)',
  },
  mainStatus: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  statusDot: {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
  },
  statusText: {
    fontSize: '0.85rem',
    fontWeight: 600,
  },
  divider: {
    width: '1px',
    height: '20px',
    background: 'rgba(255,255,255,0.1)',
  },
  indicators: {
    display: 'flex',
    gap: '10px',
  },
  indicator: {
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    fontSize: '0.75rem',
    color: 'rgba(255,255,255,0.5)',
  },
  indicatorDot: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
  },
  latency: {
    fontSize: '0.7rem',
    color: 'rgba(255,255,255,0.3)',
    marginLeft: 'auto',
  },
};

// =============================================================================
// SystemHealthPanel - Detailed system health view
// =============================================================================

export function SystemHealthPanel() {
  const { status, loading, error, refresh } = useSystemStatus(5000);
  const { isOnline, latency, lastPing } = useConnectionStatus();
  const [mounted, setMounted] = useState(false);

  // Track mounted state for hydration-safe date formatting
  useEffect(() => {
    setMounted(true);
  }, []);

  const formatUptime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return `${hrs}h ${mins}m`;
  };

  if (loading && !status) {
    return (
      <div style={healthStyles.container}>
        <div style={healthStyles.loading}>
          <span style={healthStyles.loadingIcon}>⏳</span>
          <span>Checking system status...</span>
        </div>
      </div>
    );
  }

  return (
    <div style={healthStyles.container}>
      {/* Header */}
      <div style={healthStyles.header}>
        <div style={healthStyles.headerLeft}>
          <span style={healthStyles.headerIcon}>🩺</span>
          <div>
            <h2 style={healthStyles.title}>System Health</h2>
            <span style={healthStyles.subtitle}>Real-time monitoring</span>
          </div>
        </div>
        <button onClick={refresh} style={healthStyles.refreshBtn}>
          {loading ? '⏳' : '🔄'}
        </button>
      </div>

      {error && (
        <div style={healthStyles.errorBanner}>
          ⚠️ {error}
        </div>
      )}

      {/* Opie Status */}
      <div style={healthStyles.section}>
        <h3 style={healthStyles.sectionTitle}>🤖 Opie Core</h3>
        <div style={healthStyles.statusRow}>
          <span style={healthStyles.label}>Status</span>
          <span style={{
            ...healthStyles.statusBadge,
            background: status?.opie?.status === 'online' ? 'rgba(34,197,94,0.15)' : 
                       status?.opie?.status === 'thinking' ? 'rgba(102,126,234,0.15)' :
                       status?.opie?.status === 'speaking' ? 'rgba(245,158,11,0.15)' :
                       'rgba(239,68,68,0.15)',
            color: status?.opie?.status === 'online' ? '#22c55e' : 
                   status?.opie?.status === 'thinking' ? '#667eea' :
                   status?.opie?.status === 'speaking' ? '#f59e0b' :
                   '#ef4444',
          }}>
            {status?.opie?.status?.toUpperCase() || 'UNKNOWN'}
          </span>
        </div>
        <div style={healthStyles.statusRow}>
          <span style={healthStyles.label}>Uptime</span>
          <span style={healthStyles.value}>
            {status?.opie?.uptime ? formatUptime(status.opie.uptime) : '--'}
          </span>
        </div>
      </div>

      {/* Services */}
      <div style={healthStyles.section}>
        <h3 style={healthStyles.sectionTitle}>🔌 Services</h3>
        <div style={healthStyles.serviceGrid}>
          <div style={healthStyles.serviceCard}>
            <div style={{
              ...healthStyles.serviceDot,
              background: status?.gateway?.connected ? '#22c55e' : '#ef4444',
            }} />
            <div style={healthStyles.serviceInfo}>
              <span style={healthStyles.serviceName}>Gateway</span>
              <span style={healthStyles.serviceStatus}>
                {status?.gateway?.connected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
            <span style={healthStyles.serviceLatency}>
              {status?.gateway?.latency ?? '--'}ms
            </span>
          </div>

          <div style={healthStyles.serviceCard}>
            <div style={{
              ...healthStyles.serviceDot,
              background: status?.voice?.available ? '#22c55e' : '#6b7280',
            }} />
            <div style={healthStyles.serviceInfo}>
              <span style={healthStyles.serviceName}>Voice (TTS)</span>
              <span style={healthStyles.serviceStatus}>
                {status?.voice?.status || 'Ready'}
              </span>
            </div>
          </div>

          <div style={healthStyles.serviceCard}>
            <div style={{
              ...healthStyles.serviceDot,
              background: status?.api?.healthy ? '#22c55e' : '#ef4444',
            }} />
            <div style={healthStyles.serviceInfo}>
              <span style={healthStyles.serviceName}>API</span>
              <span style={healthStyles.serviceStatus}>
                {status?.api?.healthy ? 'Healthy' : 'Degraded'}
              </span>
            </div>
            <span style={healthStyles.serviceLatency}>
              {status?.api?.responseTime ?? '--'}ms
            </span>
          </div>

          <div style={healthStyles.serviceCard}>
            <div style={{
              ...healthStyles.serviceDot,
              background: isOnline ? '#22c55e' : '#ef4444',
            }} />
            <div style={healthStyles.serviceInfo}>
              <span style={healthStyles.serviceName}>Network</span>
              <span style={healthStyles.serviceStatus}>
                {isOnline ? 'Connected' : 'Offline'}
              </span>
            </div>
            {latency !== null && (
              <span style={healthStyles.serviceLatency}>{latency}ms</span>
            )}
          </div>

          <div style={healthStyles.serviceCard}>
            <div style={{
              ...healthStyles.serviceDot,
              background: status?.security?.secure ? '#22c55e' : 
                         status?.security?.warnings ? '#f59e0b' : '#22c55e',
            }} />
            <div style={healthStyles.serviceInfo}>
              <span style={healthStyles.serviceName}>Security</span>
              <span style={healthStyles.serviceStatus}>
                {status?.security?.status || 
                 (status?.security?.warnings ? `${status.security.warnings} warning${status.security.warnings > 1 ? 's' : ''}` : 'Secure')}
              </span>
            </div>
            {status?.security?.sslValid !== undefined && (
              <span style={{
                ...healthStyles.serviceLatency,
                color: status.security.sslValid ? '#22c55e' : '#ef4444',
              }}>
                SSL {status.security.sslValid ? '✓' : '✗'}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Agents & Tasks */}
      <div style={healthStyles.section}>
        <h3 style={healthStyles.sectionTitle}>📊 Workload</h3>
        <div style={healthStyles.metricsRow}>
          <div style={healthStyles.metricBox}>
            <span style={healthStyles.metricValue}>{status?.agents?.active ?? 0}</span>
            <span style={healthStyles.metricLabel}>Active Agents</span>
          </div>
          <div style={healthStyles.metricBox}>
            <span style={{ ...healthStyles.metricValue, color: '#f59e0b' }}>
              {status?.tasks?.running ?? 0}
            </span>
            <span style={healthStyles.metricLabel}>Running Tasks</span>
          </div>
          <div style={healthStyles.metricBox}>
            <span style={{ ...healthStyles.metricValue, color: '#22c55e' }}>
              {status?.tasks?.completed ?? 0}
            </span>
            <span style={healthStyles.metricLabel}>Completed</span>
          </div>
          <div style={healthStyles.metricBox}>
            <span style={{ ...healthStyles.metricValue, color: '#ef4444' }}>
              {status?.tasks?.failed ?? 0}
            </span>
            <span style={healthStyles.metricLabel}>Failed</span>
          </div>
        </div>
      </div>

      {/* Last Updated */}
      <div style={healthStyles.footer}>
        Last updated: {lastPing && mounted ? lastPing.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : 'Checking...'}
      </div>
    </div>
  );
}

const healthStyles: { [key: string]: React.CSSProperties } = {
  container: {
    background: '#1a1a2e',
    borderRadius: '16px',
    border: '1px solid rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  loading: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '60px 40px',
    color: 'rgba(255,255,255,0.5)',
    gap: '12px',
  },
  loadingIcon: {
    fontSize: '32px',
    animation: 'statusPulse 1s infinite',
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
  refreshBtn: {
    width: '40px',
    height: '40px',
    background: 'rgba(255,255,255,0.05)',
    border: 'none',
    borderRadius: '10px',
    fontSize: '18px',
    cursor: 'pointer',
  },
  errorBanner: {
    padding: '12px 20px',
    background: 'rgba(239,68,68,0.1)',
    color: '#ef4444',
    fontSize: '0.85rem',
    textAlign: 'center',
  },
  section: {
    padding: '18px 24px',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
  },
  sectionTitle: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: '0.9rem',
    fontWeight: 600,
    margin: '0 0 14px 0',
  },
  statusRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 0',
  },
  label: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: '0.85rem',
  },
  value: {
    color: '#fff',
    fontSize: '0.9rem',
    fontWeight: 500,
  },
  statusBadge: {
    padding: '5px 12px',
    borderRadius: '20px',
    fontSize: '0.75rem',
    fontWeight: 600,
  },
  serviceGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  serviceCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 14px',
    background: 'rgba(255,255,255,0.02)',
    borderRadius: '10px',
  },
  serviceDot: {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    flexShrink: 0,
  },
  serviceInfo: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
  },
  serviceName: {
    color: '#fff',
    fontSize: '0.9rem',
    fontWeight: 500,
  },
  serviceStatus: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: '0.75rem',
    textTransform: 'capitalize',
  },
  serviceLatency: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: '0.75rem',
    fontFamily: 'monospace',
  },
  metricsRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '12px',
  },
  metricBox: {
    textAlign: 'center',
    padding: '12px',
    background: 'rgba(255,255,255,0.02)',
    borderRadius: '10px',
  },
  metricValue: {
    display: 'block',
    color: '#fff',
    fontSize: '1.5rem',
    fontWeight: 700,
    marginBottom: '4px',
  },
  metricLabel: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: '0.7rem',
  },
  footer: {
    padding: '12px 24px',
    color: 'rgba(255,255,255,0.3)',
    fontSize: '0.75rem',
    textAlign: 'center',
  },
};

// =============================================================================
// LiveAgentCount - Compact agent counter (uses real-time SSE data)
// =============================================================================

export function LiveAgentCount() {
  const { stats, connectionType } = useSidebarStats();
  
  return (
    <div style={agentCountStyles.container}>
      <span style={agentCountStyles.icon}>🤖</span>
      <span style={agentCountStyles.count}>{stats.activeAgents}</span>
      <span style={agentCountStyles.label}>active</span>
      {connectionType === 'sse' && (
        <span style={{ color: '#22c55e', fontSize: '8px', marginLeft: '2px' }} title="Live">●</span>
      )}
    </div>
  );
}

const agentCountStyles: { [key: string]: React.CSSProperties } = {
  container: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 12px',
    background: 'rgba(34,197,94,0.1)',
    borderRadius: '20px',
    fontSize: '0.85rem',
  },
  icon: {
    fontSize: '14px',
  },
  count: {
    color: '#22c55e',
    fontWeight: 700,
  },
  label: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: '0.75rem',
  },
};

// =============================================================================
// LiveTaskCount - Compact task counter (uses real-time SSE data)
// =============================================================================

export function LiveTaskCount() {
  const { stats, connectionType } = useSidebarStats();
  
  return (
    <div style={taskCountStyles.container}>
      <span style={taskCountStyles.icon}>⚡</span>
      <span style={taskCountStyles.count}>{stats.runningTasks}</span>
      <span style={taskCountStyles.label}>running</span>
      {connectionType === 'sse' && (
        <span style={{ color: '#f59e0b', fontSize: '8px', marginLeft: '2px' }} title="Live">●</span>
      )}
    </div>
  );
}

const taskCountStyles: { [key: string]: React.CSSProperties } = {
  container: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 12px',
    background: 'rgba(245,158,11,0.1)',
    borderRadius: '20px',
    fontSize: '0.85rem',
  },
  icon: {
    fontSize: '14px',
  },
  count: {
    color: '#f59e0b',
    fontWeight: 700,
  },
  label: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: '0.75rem',
  },
};
