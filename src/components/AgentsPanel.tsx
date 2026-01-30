'use client';
import { useState, useEffect, useCallback } from 'react';

interface AgentSession {
  id: string;
  label: string;
  status: 'running' | 'complete' | 'failed' | 'idle';
  startedAt: string;
  runtime: string;
  tokens: {
    input: number;
    output: number;
    total: number;
  };
  model: string;
  error?: string;
  output?: string;
}

interface AgentDefinition {
  id: string;
  name: string;
  emoji: string;
  role: string;
  goal: string;
  backstory: string;
  tier: 1 | 2 | 3;
  skills: string[];
  category: 'core' | 'specialist';
}

// Static agent definitions for reference (used when deploying)
const AGENT_DEFINITIONS: AgentDefinition[] = [
  {
    id: 'research',
    name: 'Research Agent',
    emoji: '🔍',
    role: 'Intelligence Gatherer',
    goal: 'Find accurate, actionable information from any source',
    backstory: 'Built for deep web research, competitive analysis, and fact verification.',
    tier: 1,
    skills: ['web_search', 'web_fetch', 'memory', 'analysis'],
    category: 'core',
  },
  {
    id: 'code',
    name: 'Code Agent',
    emoji: '💻',
    role: 'Software Engineer',
    goal: 'Write, debug, and optimize code across any language',
    backstory: 'Expert software developer capable of full-stack development.',
    tier: 1,
    skills: ['coding', 'git', 'testing', 'review', 'debugging'],
    category: 'core',
  },
  {
    id: 'content',
    name: 'Content Agent',
    emoji: '✍️',
    role: 'Content Strategist',
    goal: 'Create compelling content that converts',
    backstory: 'Master of written communication. Creates blog posts, emails, social content.',
    tier: 1,
    skills: ['writing', 'editing', 'seo', 'copywriting', 'research'],
    category: 'core',
  },
  {
    id: 'analyst',
    name: 'Analyst Agent',
    emoji: '📊',
    role: 'Data Analyst',
    goal: 'Turn data into actionable insights',
    backstory: 'Specializes in data analysis, visualization, and reporting.',
    tier: 1,
    skills: ['analytics', 'visualization', 'research', 'reporting'],
    category: 'core',
  },
  {
    id: 'outreach',
    name: 'Outreach Agent',
    emoji: '📧',
    role: 'Communication Specialist',
    goal: 'Build relationships through effective outreach',
    backstory: 'Handles email campaigns, follow-ups, and customer communication.',
    tier: 2,
    skills: ['email', 'crm', 'templates', 'personalization'],
    category: 'core',
  },
];

interface AgentsPanelProps {
  onDeploy?: (agentId: string, task: string) => void;
  activeAgents?: string[];
  pollInterval?: number;
}

function formatTokens(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return String(num);
}

function getStatusColor(status: AgentSession['status']): string {
  switch (status) {
    case 'running': return '#f59e0b';
    case 'complete': return '#22c55e';
    case 'failed': return '#ef4444';
    default: return '#6b7280';
  }
}

function getStatusIcon(status: AgentSession['status']): string {
  switch (status) {
    case 'running': return '⏳';
    case 'complete': return '✅';
    case 'failed': return '❌';
    default: return '💤';
  }
}

export default function AgentsPanel({ 
  onDeploy, 
  activeAgents = [],
  pollInterval = 5000,
}: AgentsPanelProps) {
  const [sessions, setSessions] = useState<AgentSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSession, setSelectedSession] = useState<AgentSession | null>(null);
  const [view, setView] = useState<'sessions' | 'deploy'>('sessions');
  const [deployTask, setDeployTask] = useState('');
  const [selectedDefinition, setSelectedDefinition] = useState<AgentDefinition | null>(null);
  const [filterStatus, setFilterStatus] = useState<string | null>(null);

  const fetchSessions = useCallback(async () => {
    try {
      const res = await fetch('/api/agents');
      if (!res.ok) throw new Error('Failed to fetch agents');
      
      const data = await res.json();
      setSessions(data.sessions || []);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch sessions:', err);
      setError('Failed to load agent sessions');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSessions();
    const interval = setInterval(fetchSessions, pollInterval);
    return () => clearInterval(interval);
  }, [fetchSessions, pollInterval]);

  const handleDeploy = () => {
    if (selectedDefinition && deployTask.trim() && onDeploy) {
      onDeploy(selectedDefinition.id, deployTask);
      setDeployTask('');
      setSelectedDefinition(null);
      setView('sessions');
    }
  };

  const filteredSessions = filterStatus 
    ? sessions.filter(s => s.status === filterStatus)
    : sessions;

  const runningCount = sessions.filter(s => s.status === 'running').length;
  const completedCount = sessions.filter(s => s.status === 'complete').length;
  const failedCount = sessions.filter(s => s.status === 'failed').length;

  // Session Detail View
  if (selectedSession) {
    return (
      <div style={styles.container}>
        <button onClick={() => setSelectedSession(null)} style={styles.backButton}>
          ← Back to Sessions
        </button>

        {/* Session Header */}
        <div style={styles.detailHeader}>
          <div style={styles.sessionIcon}>
            {getStatusIcon(selectedSession.status)}
          </div>
          <div style={styles.sessionHeaderInfo}>
            <h2 style={styles.sessionTitle}>{selectedSession.label}</h2>
            <div style={styles.sessionMeta}>
              <span style={{
                ...styles.statusBadge,
                background: `${getStatusColor(selectedSession.status)}20`,
                color: getStatusColor(selectedSession.status),
              }}>
                {selectedSession.status.toUpperCase()}
              </span>
              <span style={styles.modelBadge}>{selectedSession.model}</span>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div style={styles.statsGrid}>
          <div style={styles.statCard}>
            <span style={styles.statNumber}>{selectedSession.runtime}</span>
            <span style={styles.statLabel}>Runtime</span>
          </div>
          <div style={styles.statCard}>
            <span style={styles.statNumber}>{formatTokens(selectedSession.tokens.input)}</span>
            <span style={styles.statLabel}>Input Tokens</span>
          </div>
          <div style={styles.statCard}>
            <span style={styles.statNumber}>{formatTokens(selectedSession.tokens.output)}</span>
            <span style={styles.statLabel}>Output Tokens</span>
          </div>
          <div style={styles.statCard}>
            <span style={{ ...styles.statNumber, color: '#667eea' }}>
              {formatTokens(selectedSession.tokens.total)}
            </span>
            <span style={styles.statLabel}>Total Tokens</span>
          </div>
        </div>

        {/* Session Details */}
        <div style={styles.detailSection}>
          <h3 style={styles.sectionTitle}>📋 Session Info</h3>
          <div style={styles.infoGrid}>
            <div style={styles.infoItem}>
              <span style={styles.infoLabel}>Session ID</span>
              <code style={styles.infoValue}>{selectedSession.id}</code>
            </div>
            <div style={styles.infoItem}>
              <span style={styles.infoLabel}>Started</span>
              <span style={styles.infoValue}>
                {new Date(selectedSession.startedAt).toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* Error Display */}
        {selectedSession.error && (
          <div style={styles.errorSection}>
            <h3 style={styles.sectionTitle}>⚠️ Error</h3>
            <pre style={styles.errorContent}>{selectedSession.error}</pre>
          </div>
        )}

        {/* Output/Transcript */}
        {selectedSession.output && (
          <div style={styles.detailSection}>
            <h3 style={styles.sectionTitle}>📝 Output</h3>
            <pre style={styles.outputContent}>{selectedSession.output}</pre>
          </div>
        )}
      </div>
    );
  }

  // Deploy View
  if (view === 'deploy') {
    return (
      <div style={styles.container}>
        <button onClick={() => setView('sessions')} style={styles.backButton}>
          ← Back to Sessions
        </button>

        <div style={styles.header}>
          <div style={styles.headerLeft}>
            <span style={styles.headerIcon}>🚀</span>
            <div>
              <h2 style={styles.title}>Deploy Agent</h2>
              <span style={styles.subtitle}>Choose an agent type and task</span>
            </div>
          </div>
        </div>

        <div style={styles.deployGrid}>
          {AGENT_DEFINITIONS.map(def => (
            <div
              key={def.id}
              onClick={() => setSelectedDefinition(def)}
              style={{
                ...styles.agentCard,
                borderColor: selectedDefinition?.id === def.id ? '#667eea' : 'transparent',
                background: selectedDefinition?.id === def.id 
                  ? 'rgba(102,126,234,0.1)' 
                  : 'rgba(255,255,255,0.03)',
              }}
            >
              <div style={styles.agentCardHeader}>
                <span style={styles.agentEmoji}>{def.emoji}</span>
                <div style={styles.agentCardInfo}>
                  <div style={styles.agentCardName}>{def.name}</div>
                  <div style={styles.agentCardRole}>{def.role}</div>
                </div>
              </div>
              <p style={styles.agentCardGoal}>{def.goal}</p>
              <div style={styles.agentSkills}>
                {def.skills.slice(0, 3).map(s => (
                  <span key={s} style={styles.skillTag}>{s}</span>
                ))}
              </div>
            </div>
          ))}
        </div>

        {selectedDefinition && (
          <div style={styles.deploySection}>
            <h3 style={styles.sectionTitle}>
              📝 Task for {selectedDefinition.emoji} {selectedDefinition.name}
            </h3>
            <textarea
              placeholder="Describe the task you want this agent to handle..."
              value={deployTask}
              onChange={(e) => setDeployTask(e.target.value)}
              style={styles.deployInput}
            />
            <button
              onClick={handleDeploy}
              disabled={!deployTask.trim()}
              style={{
                ...styles.deployButton,
                opacity: !deployTask.trim() ? 0.5 : 1,
              }}
            >
              🚀 Deploy Agent
            </button>
          </div>
        )}
      </div>
    );
  }

  // Sessions List View (default)
  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <span style={styles.headerIcon}>🤖</span>
          <div>
            <h2 style={styles.title}>Live Agent Sessions</h2>
            <span style={styles.subtitle}>
              {runningCount} running • {completedCount} complete • {failedCount} failed
            </span>
          </div>
        </div>
        <div style={styles.headerRight}>
          <button onClick={() => setView('deploy')} style={styles.deployBtn}>
            + Deploy
          </button>
          <button onClick={fetchSessions} style={styles.refreshBtn} disabled={loading}>
            {loading ? '⏳' : '🔄'}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div style={styles.filters}>
        <button
          onClick={() => setFilterStatus(null)}
          style={{ ...styles.filterBtn, ...(filterStatus === null ? styles.filterBtnActive : {}) }}
        >
          All ({sessions.length})
        </button>
        <button
          onClick={() => setFilterStatus('running')}
          style={{ 
            ...styles.filterBtn, 
            ...(filterStatus === 'running' ? styles.filterBtnActive : {}),
            borderColor: '#f59e0b',
          }}
        >
          ⏳ Running ({runningCount})
        </button>
        <button
          onClick={() => setFilterStatus('complete')}
          style={{ 
            ...styles.filterBtn, 
            ...(filterStatus === 'complete' ? styles.filterBtnActive : {}),
            borderColor: '#22c55e',
          }}
        >
          ✅ Complete ({completedCount})
        </button>
        <button
          onClick={() => setFilterStatus('failed')}
          style={{ 
            ...styles.filterBtn, 
            ...(filterStatus === 'failed' ? styles.filterBtnActive : {}),
            borderColor: '#ef4444',
          }}
        >
          ❌ Failed ({failedCount})
        </button>
      </div>

      {/* Sessions List */}
      <div style={styles.sessionsList}>
        {loading && sessions.length === 0 ? (
          <div style={styles.loadingState}>
            <span style={styles.loadingIcon}>⏳</span>
            <span>Loading sessions...</span>
          </div>
        ) : error && sessions.length === 0 ? (
          <div style={styles.errorState}>
            <span style={styles.errorIcon}>⚠️</span>
            <span>{error}</span>
            <button onClick={fetchSessions} style={styles.retryButton}>
              Retry
            </button>
          </div>
        ) : filteredSessions.length === 0 ? (
          <div style={styles.emptyState}>
            <span style={styles.emptyIcon}>🤖</span>
            <h3>No Sessions</h3>
            <p>
              {filterStatus 
                ? `No ${filterStatus} sessions`
                : 'Deploy an agent to start a session'}
            </p>
            {!filterStatus && (
              <button onClick={() => setView('deploy')} style={styles.emptyButton}>
                Deploy an Agent
              </button>
            )}
          </div>
        ) : (
          filteredSessions.map(session => (
            <div
              key={session.id}
              onClick={() => setSelectedSession(session)}
              style={{
                ...styles.sessionCard,
                borderLeftColor: getStatusColor(session.status),
              }}
            >
              <div style={styles.sessionCardHeader}>
                <div style={styles.sessionCardInfo}>
                  <div style={styles.sessionCardLabel}>
                    <span style={{
                      ...styles.statusDot,
                      background: getStatusColor(session.status),
                      animation: session.status === 'running' ? 'pulse 1.5s infinite' : 'none',
                    }} />
                    {session.label}
                  </div>
                  <div style={styles.sessionCardModel}>{session.model}</div>
                </div>
                <div style={styles.sessionCardStatus}>
                  <span style={{ color: getStatusColor(session.status) }}>
                    {getStatusIcon(session.status)} {session.status}
                  </span>
                </div>
              </div>
              <div style={styles.sessionCardStats}>
                <span>⏱️ {session.runtime}</span>
                <span>📊 {formatTokens(session.tokens.total)} tokens</span>
                <span>🕐 {new Date(session.startedAt).toLocaleTimeString()}</span>
              </div>
              <div style={styles.viewDetails}>Click to view details →</div>
            </div>
          ))
        )}
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    background: 'rgba(20, 20, 35, 0.6)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    borderRadius: '20px',
    border: '1px solid rgba(255,255,255,0.06)',
    overflow: 'hidden',
    boxShadow: '0 4px 30px rgba(0,0,0,0.2)',
    position: 'relative',
  },

  // Header
  header: {
    padding: '24px 28px',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '16px',
    background: 'linear-gradient(180deg, rgba(255,255,255,0.02) 0%, transparent 100%)',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  headerIcon: {
    fontSize: '32px',
    filter: 'drop-shadow(0 0 10px rgba(102,126,234,0.4))',
  },
  title: {
    color: '#fff',
    fontSize: '1.2rem',
    fontWeight: 700,
    margin: 0,
    letterSpacing: '-0.02em',
  },
  subtitle: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: '0.85rem',
    fontWeight: 500,
  },
  headerRight: {
    display: 'flex',
    gap: '10px',
  },
  deployBtn: {
    padding: '12px 24px',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    border: 'none',
    borderRadius: '12px',
    color: '#fff',
    fontWeight: 600,
    fontSize: '0.9rem',
    cursor: 'pointer',
    boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)',
    transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
  },
  refreshBtn: {
    width: '44px',
    height: '44px',
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '12px',
    color: '#fff',
    fontSize: '18px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },

  // Filters
  filters: {
    padding: '16px 24px',
    display: 'flex',
    gap: '10px',
    flexWrap: 'wrap',
    borderBottom: '1px solid rgba(255,255,255,0.04)',
    background: 'rgba(0,0,0,0.1)',
  },
  filterBtn: {
    padding: '8px 16px',
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '10px',
    color: 'rgba(255,255,255,0.55)',
    fontSize: '0.8rem',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  filterBtnActive: {
    background: 'rgba(102,126,234,0.15)',
    color: '#fff',
    borderColor: 'rgba(102,126,234,0.4)',
    boxShadow: '0 0 15px rgba(102,126,234,0.2)',
  },

  // Sessions List
  sessionsList: {
    padding: '18px',
    maxHeight: '550px',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
  },
  sessionCard: {
    background: 'rgba(255,255,255,0.03)',
    borderRadius: '14px',
    padding: '18px',
    cursor: 'pointer',
    borderLeft: '3px solid',
    transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
    border: '1px solid rgba(255,255,255,0.04)',
    borderLeftWidth: '3px',
  },
  sessionCardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '12px',
  },
  sessionCardInfo: {},
  sessionCardLabel: {
    color: '#fff',
    fontSize: '1rem',
    fontWeight: 600,
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '6px',
    letterSpacing: '-0.01em',
  },
  statusDot: {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    boxShadow: '0 0 8px currentColor',
  },
  sessionCardModel: {
    color: 'rgba(255,255,255,0.35)',
    fontSize: '0.75rem',
    fontFamily: '"JetBrains Mono", monospace',
  },
  sessionCardStatus: {
    fontSize: '0.8rem',
    fontWeight: 600,
    letterSpacing: '0.02em',
  },
  sessionCardStats: {
    display: 'flex',
    gap: '18px',
    fontSize: '0.8rem',
    color: 'rgba(255,255,255,0.45)',
    marginBottom: '10px',
    fontVariantNumeric: 'tabular-nums',
  },
  viewDetails: {
    color: '#667eea',
    fontSize: '0.8rem',
    textAlign: 'right',
    fontWeight: 500,
  },

  // States
  loadingState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px',
    color: 'rgba(255,255,255,0.5)',
    gap: '12px',
  },
  loadingIcon: {
    fontSize: '32px',
    animation: 'pulse 1s infinite',
  },
  errorState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px',
    color: '#ef4444',
    gap: '12px',
  },
  errorIcon: {
    fontSize: '32px',
  },
  retryButton: {
    padding: '8px 16px',
    background: 'rgba(239,68,68,0.2)',
    border: 'none',
    borderRadius: '8px',
    color: '#ef4444',
    fontWeight: 500,
    cursor: 'pointer',
  },
  emptyState: {
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
  sessionIcon: {
    fontSize: '48px',
  },
  sessionHeaderInfo: {
    flex: 1,
  },
  sessionTitle: {
    color: '#fff',
    fontSize: '1.5rem',
    fontWeight: 700,
    margin: '0 0 10px 0',
  },
  sessionMeta: {
    display: 'flex',
    gap: '10px',
    flexWrap: 'wrap',
  },
  statusBadge: {
    padding: '6px 14px',
    borderRadius: '20px',
    fontSize: '0.8rem',
    fontWeight: 600,
  },
  modelBadge: {
    padding: '6px 14px',
    borderRadius: '20px',
    background: 'rgba(255,255,255,0.05)',
    color: 'rgba(255,255,255,0.6)',
    fontSize: '0.75rem',
    fontFamily: 'monospace',
  },

  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '12px',
    padding: '20px 24px',
  },
  statCard: {
    background: 'rgba(255,255,255,0.03)',
    borderRadius: '12px',
    padding: '16px',
    textAlign: 'center',
  },
  statNumber: {
    display: 'block',
    color: '#fff',
    fontSize: '1.5rem',
    fontWeight: 700,
    marginBottom: '4px',
  },
  statLabel: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: '0.75rem',
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
  infoGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  infoItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  infoLabel: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: '0.75rem',
  },
  infoValue: {
    color: '#fff',
    fontSize: '0.9rem',
    fontFamily: 'monospace',
    background: 'rgba(255,255,255,0.03)',
    padding: '8px 12px',
    borderRadius: '6px',
    wordBreak: 'break-all',
  },

  errorSection: {
    padding: '20px 24px',
    background: 'rgba(239,68,68,0.05)',
  },
  errorContent: {
    background: 'rgba(0,0,0,0.3)',
    padding: '12px 16px',
    borderRadius: '8px',
    color: '#ef4444',
    fontSize: '0.85rem',
    fontFamily: 'monospace',
    margin: 0,
    whiteSpace: 'pre-wrap',
    overflow: 'auto',
    maxHeight: '200px',
  },
  outputContent: {
    background: 'rgba(0,0,0,0.3)',
    padding: '14px 18px',
    borderRadius: '10px',
    color: 'rgba(255,255,255,0.8)',
    fontSize: '0.85rem',
    fontFamily: 'monospace',
    margin: 0,
    whiteSpace: 'pre-wrap',
    overflow: 'auto',
    maxHeight: '300px',
  },

  // Deploy View
  deployGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: '16px',
    padding: '20px',
  },
  agentCard: {
    padding: '20px',
    borderRadius: '16px',
    border: '1px solid rgba(255,255,255,0.06)',
    cursor: 'pointer',
    transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
    background: 'rgba(255,255,255,0.02)',
    position: 'relative',
    overflow: 'hidden',
  },
  agentCardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    marginBottom: '14px',
  },
  agentEmoji: {
    fontSize: '36px',
    filter: 'drop-shadow(0 0 8px rgba(102,126,234,0.3))',
  },
  agentCardInfo: {},
  agentCardName: {
    color: '#fff',
    fontSize: '1.05rem',
    fontWeight: 600,
    letterSpacing: '-0.01em',
  },
  agentCardRole: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: '0.8rem',
    fontWeight: 500,
  },
  agentCardGoal: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: '0.9rem',
    margin: '0 0 14px 0',
    lineHeight: 1.5,
  },
  agentSkills: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
  },
  skillTag: {
    background: 'rgba(102,126,234,0.12)',
    color: '#8b9cf2',
    padding: '5px 10px',
    borderRadius: '8px',
    fontSize: '0.7rem',
    fontWeight: 600,
    border: '1px solid rgba(102,126,234,0.15)',
    letterSpacing: '0.02em',
  },

  deploySection: {
    padding: '28px',
    background: 'linear-gradient(180deg, rgba(102,126,234,0.08) 0%, rgba(102,126,234,0.03) 100%)',
    borderTop: '1px solid rgba(102,126,234,0.15)',
  },
  deployInput: {
    width: '100%',
    padding: '16px 18px',
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '14px',
    color: '#fff',
    fontSize: '0.95rem',
    resize: 'vertical',
    minHeight: '100px',
    outline: 'none',
    boxSizing: 'border-box',
    marginBottom: '16px',
    transition: 'all 0.2s ease',
    fontFamily: 'inherit',
  },
  deployButton: {
    padding: '16px 32px',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    border: 'none',
    borderRadius: '14px',
    color: '#fff',
    fontSize: '1rem',
    fontWeight: 600,
    cursor: 'pointer',
    float: 'right',
    boxShadow: '0 4px 20px rgba(102, 126, 234, 0.4)',
    transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
  },
};
