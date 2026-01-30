'use client';
import { useState } from 'react';

interface Agent {
  id: string;
  name: string;
  emoji: string;
  role: string;
  goal: string;
  backstory: string;
  status: 'ready' | 'working' | 'idle';
  tier: 1 | 2 | 3;
  skills: string[];
  category: 'core' | 'specialist';
  recentTasks: { id: string; label: string; status: string; date: string }[];
  stats: {
    tasksCompleted: number;
    successRate: number;
    avgRuntime: string;
    lastActive: string;
  };
}

const AGENTS: Agent[] = [
  // Core Agents - Tier 1
  {
    id: 'research',
    name: 'Research Agent',
    emoji: '🔍',
    role: 'Intelligence Gatherer',
    goal: 'Find accurate, actionable information from any source',
    backstory: 'Built for deep web research, competitive analysis, and fact verification. Can search the web, scrape data, and synthesize findings into actionable insights.',
    status: 'ready',
    tier: 1,
    skills: ['web_search', 'web_fetch', 'memory', 'analysis'],
    category: 'core',
    recentTasks: [
      { id: 't1', label: 'Competitor analysis for lighting industry', status: 'complete', date: '2h ago' },
      { id: 't2', label: 'Market research: LED trends 2024', status: 'complete', date: '1d ago' },
    ],
    stats: { tasksCompleted: 47, successRate: 94, avgRuntime: '3m 24s', lastActive: '2h ago' }
  },
  {
    id: 'code',
    name: 'Code Agent',
    emoji: '💻',
    role: 'Software Engineer',
    goal: 'Write, debug, and optimize code across any language',
    backstory: 'Expert software developer capable of full-stack development, debugging, code review, and architectural decisions. Follows best practices and writes clean, maintainable code.',
    status: 'idle',
    tier: 1,
    skills: ['coding', 'git', 'testing', 'review', 'debugging'],
    category: 'core',
    recentTasks: [
      { id: 't3', label: 'Build dashboard components', status: 'complete', date: '4h ago' },
      { id: 't4', label: 'Fix API authentication bug', status: 'complete', date: '1d ago' },
    ],
    stats: { tasksCompleted: 83, successRate: 97, avgRuntime: '12m 45s', lastActive: '4h ago' }
  },
  {
    id: 'content',
    name: 'Content Agent',
    emoji: '✍️',
    role: 'Content Strategist',
    goal: 'Create compelling content that converts',
    backstory: 'Master of written communication. Creates blog posts, emails, social content, and marketing copy. Understands SEO, tone, and audience targeting.',
    status: 'working',
    tier: 1,
    skills: ['writing', 'editing', 'seo', 'copywriting', 'research'],
    category: 'core',
    recentTasks: [
      { id: 't5', label: 'Write blog post about LED benefits', status: 'running', date: 'now' },
      { id: 't6', label: 'Create email sequence for Q1 leads', status: 'complete', date: '3h ago' },
    ],
    stats: { tasksCompleted: 62, successRate: 91, avgRuntime: '8m 12s', lastActive: 'now' }
  },
  {
    id: 'analyst',
    name: 'Analyst Agent',
    emoji: '📊',
    role: 'Data Analyst',
    goal: 'Turn data into actionable insights',
    backstory: 'Specializes in data analysis, visualization, and reporting. Can process datasets, identify trends, and create clear reports for decision-making.',
    status: 'ready',
    tier: 1,
    skills: ['analytics', 'visualization', 'research', 'reporting', 'statistics'],
    category: 'core',
    recentTasks: [
      { id: 't7', label: 'Q4 revenue analysis', status: 'complete', date: '1d ago' },
      { id: 't8', label: 'Customer churn report', status: 'complete', date: '3d ago' },
    ],
    stats: { tasksCompleted: 29, successRate: 96, avgRuntime: '5m 33s', lastActive: '1d ago' }
  },
  {
    id: 'outreach',
    name: 'Outreach Agent',
    emoji: '📧',
    role: 'Communication Specialist',
    goal: 'Build relationships through effective outreach',
    backstory: 'Handles email campaigns, follow-ups, and customer communication. Personalizes messages, tracks responses, and maintains CRM data.',
    status: 'working',
    tier: 2,
    skills: ['email', 'crm', 'templates', 'personalization', 'tracking'],
    category: 'core',
    recentTasks: [
      { id: 't9', label: 'Send follow-up emails to Q4 leads', status: 'running', date: 'now' },
      { id: 't10', label: 'Newsletter draft for January', status: 'complete', date: '2d ago' },
    ],
    stats: { tasksCompleted: 156, successRate: 88, avgRuntime: '2m 15s', lastActive: 'now' }
  },
  {
    id: 'qa',
    name: 'QA Agent',
    emoji: '✅',
    role: 'Quality Assurance',
    goal: 'Ensure everything meets quality standards',
    backstory: 'Reviews work for errors, inconsistencies, and quality issues. Tests code, proofreads content, and validates data accuracy.',
    status: 'idle',
    tier: 2,
    skills: ['testing', 'validation', 'review', 'proofreading', 'standards'],
    category: 'core',
    recentTasks: [
      { id: 't11', label: 'Review dashboard code', status: 'complete', date: '5h ago' },
      { id: 't12', label: 'Proofread marketing materials', status: 'complete', date: '2d ago' },
    ],
    stats: { tasksCompleted: 41, successRate: 99, avgRuntime: '4m 02s', lastActive: '5h ago' }
  },
  // Specialists - Tier 2/3
  {
    id: 'sales',
    name: 'Sales Agent',
    emoji: '💰',
    role: 'Sales Development Rep',
    goal: 'Qualify leads and close deals',
    backstory: 'Specialized in B2B sales processes. Qualifies leads, prepares quotes, handles objections, and moves prospects through the pipeline.',
    status: 'ready',
    tier: 2,
    skills: ['crm', 'proposals', 'negotiation', 'qualification', 'closing'],
    category: 'specialist',
    recentTasks: [
      { id: 't13', label: 'Qualify 15 new inbound leads', status: 'complete', date: '6h ago' },
    ],
    stats: { tasksCompleted: 34, successRate: 85, avgRuntime: '6m 45s', lastActive: '6h ago' }
  },
  {
    id: 'contractor',
    name: 'Contractor Expert',
    emoji: '🏗️',
    role: 'Industry Specialist',
    goal: 'Provide contractor-specific expertise',
    backstory: 'Deep knowledge of contractor industry including licensing, insurance, permits, and best practices. Helps with compliance and industry-specific content.',
    status: 'idle',
    tier: 3,
    skills: ['industry', 'compliance', 'pricing', 'regulations', 'permits'],
    category: 'specialist',
    recentTasks: [
      { id: 't14', label: 'Verify contractor licenses in TX', status: 'complete', date: '3d ago' },
    ],
    stats: { tasksCompleted: 12, successRate: 92, avgRuntime: '7m 20s', lastActive: '3d ago' }
  },
  {
    id: 'mockup',
    name: 'Mockup Agent',
    emoji: '🎨',
    role: 'Visual Designer',
    goal: 'Create compelling visual concepts',
    backstory: 'Creates mockups, wireframes, and visual concepts. Can generate design ideas, layout suggestions, and brand-consistent visuals.',
    status: 'idle',
    tier: 3,
    skills: ['design', 'visualization', 'branding', 'wireframing', 'ui'],
    category: 'specialist',
    recentTasks: [
      { id: 't15', label: 'Create landing page mockup', status: 'complete', date: '1w ago' },
    ],
    stats: { tasksCompleted: 8, successRate: 88, avgRuntime: '15m 30s', lastActive: '1w ago' }
  },
  {
    id: 'proposal',
    name: 'Proposal Agent',
    emoji: '📝',
    role: 'Proposal Writer',
    goal: 'Create winning proposals and quotes',
    backstory: 'Specializes in crafting professional proposals, quotes, and contracts. Understands pricing strategies and how to present value.',
    status: 'ready',
    tier: 2,
    skills: ['writing', 'pricing', 'templates', 'formatting', 'contracts'],
    category: 'specialist',
    recentTasks: [
      { id: 't16', label: 'Generate proposal for ABC Corp', status: 'complete', date: '2d ago' },
    ],
    stats: { tasksCompleted: 23, successRate: 91, avgRuntime: '10m 15s', lastActive: '2d ago' }
  },
  {
    id: 'success',
    name: 'Success Agent',
    emoji: '🌟',
    role: 'Customer Success Manager',
    goal: 'Ensure customer happiness and retention',
    backstory: 'Manages customer relationships post-sale. Handles onboarding, support tickets, check-ins, and identifies upsell opportunities.',
    status: 'idle',
    tier: 2,
    skills: ['onboarding', 'support', 'retention', 'upselling', 'feedback'],
    category: 'specialist',
    recentTasks: [
      { id: 't17', label: 'Onboard new customer XYZ LLC', status: 'complete', date: '4d ago' },
    ],
    stats: { tasksCompleted: 19, successRate: 95, avgRuntime: '8m 45s', lastActive: '4d ago' }
  },
];

interface AgentsPanelProps {
  onDeploy?: (agentId: string, task: string) => void;
  activeAgents?: string[];
}

export default function AgentsPanel({ onDeploy, activeAgents = [] }: AgentsPanelProps) {
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [deployTask, setDeployTask] = useState('');
  const [filterTier, setFilterTier] = useState<number | null>(null);

  const getStatusColor = (status: Agent['status']) => {
    switch (status) {
      case 'working': return '#f59e0b';
      case 'ready': return '#22c55e';
      case 'idle': return '#6b7280';
    }
  };

  const getTierColor = (tier: number) => {
    switch (tier) {
      case 1: return '#f59e0b';
      case 2: return '#667eea';
      case 3: return '#6b7280';
    }
  };

  const getTierLabel = (tier: number) => {
    switch (tier) {
      case 1: return 'Tier 1 • Highest ROI';
      case 2: return 'Tier 2 • High Value';
      case 3: return 'Tier 3 • Specialized';
    }
  };

  const handleDeploy = () => {
    if (selectedAgent && deployTask.trim() && onDeploy) {
      onDeploy(selectedAgent.id, deployTask);
      setDeployTask('');
    }
  };

  const filteredAgents = filterTier 
    ? AGENTS.filter(a => a.tier === filterTier)
    : AGENTS;

  // Detail View
  if (selectedAgent) {
    const agent = selectedAgent;
    const isActive = activeAgents.includes(agent.id);
    
    return (
      <div style={styles.container}>
        {/* Back Button */}
        <button onClick={() => setSelectedAgent(null)} style={styles.backButton}>
          ← Back to Agents
        </button>

        {/* Agent Header */}
        <div style={styles.detailHeader}>
          <div style={styles.detailAvatar}>
            <span style={styles.detailEmoji}>{agent.emoji}</span>
            <span style={{
              ...styles.statusBadge,
              background: getStatusColor(agent.status),
            }}>
              {agent.status}
            </span>
          </div>
          <div style={styles.detailInfo}>
            <h2 style={styles.detailName}>{agent.name}</h2>
            <p style={styles.detailRole}>{agent.role}</p>
            <div style={styles.tierBadge}>
              <span style={{ color: getTierColor(agent.tier) }}>●</span>
              {getTierLabel(agent.tier)}
            </div>
          </div>
        </div>

        {/* Goal & Backstory */}
        <div style={styles.detailSection}>
          <h3 style={styles.sectionTitle}>🎯 Goal</h3>
          <p style={styles.goalText}>{agent.goal}</p>
        </div>

        <div style={styles.detailSection}>
          <h3 style={styles.sectionTitle}>📖 Backstory</h3>
          <p style={styles.backstoryText}>{agent.backstory}</p>
        </div>

        {/* Skills */}
        <div style={styles.detailSection}>
          <h3 style={styles.sectionTitle}>⚡ Skills</h3>
          <div style={styles.skillsList}>
            {agent.skills.map(skill => (
              <span key={skill} style={styles.skillChip}>{skill}</span>
            ))}
          </div>
        </div>

        {/* Performance Stats */}
        <div style={styles.detailSection}>
          <h3 style={styles.sectionTitle}>📊 Performance</h3>
          <div style={styles.statsGrid}>
            <div style={styles.statCard}>
              <span style={styles.statNumber}>{agent.stats.tasksCompleted}</span>
              <span style={styles.statLabel}>Tasks Done</span>
            </div>
            <div style={styles.statCard}>
              <span style={{ ...styles.statNumber, color: agent.stats.successRate >= 90 ? '#22c55e' : '#f59e0b' }}>
                {agent.stats.successRate}%
              </span>
              <span style={styles.statLabel}>Success Rate</span>
            </div>
            <div style={styles.statCard}>
              <span style={styles.statNumber}>{agent.stats.avgRuntime}</span>
              <span style={styles.statLabel}>Avg Runtime</span>
            </div>
            <div style={styles.statCard}>
              <span style={styles.statNumber}>{agent.stats.lastActive}</span>
              <span style={styles.statLabel}>Last Active</span>
            </div>
          </div>
        </div>

        {/* Recent Tasks */}
        <div style={styles.detailSection}>
          <h3 style={styles.sectionTitle}>📋 Recent Tasks</h3>
          <div style={styles.tasksList}>
            {agent.recentTasks.map(task => (
              <div key={task.id} style={styles.taskItem}>
                <span style={{
                  ...styles.taskStatus,
                  color: task.status === 'running' ? '#f59e0b' : task.status === 'complete' ? '#22c55e' : '#6b7280'
                }}>
                  {task.status === 'running' ? '⏳' : task.status === 'complete' ? '✅' : '○'}
                </span>
                <span style={styles.taskLabel}>{task.label}</span>
                <span style={styles.taskDate}>{task.date}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Deploy Section */}
        <div style={styles.deploySection}>
          <h3 style={styles.sectionTitle}>🚀 Deploy Agent</h3>
          <div style={styles.deployForm}>
            <textarea
              placeholder="Describe the task you want this agent to handle..."
              value={deployTask}
              onChange={(e) => setDeployTask(e.target.value)}
              style={styles.deployInput}
            />
            <button
              onClick={handleDeploy}
              disabled={!deployTask.trim() || isActive}
              style={{
                ...styles.deployButton,
                opacity: !deployTask.trim() || isActive ? 0.5 : 1,
              }}
            >
              {isActive ? '⏳ Currently Working' : '🚀 Deploy Now'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // List View
  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <span style={styles.headerIcon}>🤖</span>
          <div>
            <h2 style={styles.title}>Agent Army</h2>
            <span style={styles.subtitle}>{AGENTS.length} agents ready to deploy</span>
          </div>
        </div>
        <div style={styles.filters}>
          <button
            onClick={() => setFilterTier(null)}
            style={{ ...styles.filterBtn, ...(filterTier === null ? styles.filterBtnActive : {}) }}
          >
            All
          </button>
          <button
            onClick={() => setFilterTier(1)}
            style={{ ...styles.filterBtn, ...(filterTier === 1 ? styles.filterBtnActive : {}), borderColor: '#f59e0b' }}
          >
            Tier 1
          </button>
          <button
            onClick={() => setFilterTier(2)}
            style={{ ...styles.filterBtn, ...(filterTier === 2 ? styles.filterBtnActive : {}), borderColor: '#667eea' }}
          >
            Tier 2
          </button>
          <button
            onClick={() => setFilterTier(3)}
            style={{ ...styles.filterBtn, ...(filterTier === 3 ? styles.filterBtnActive : {}), borderColor: '#6b7280' }}
          >
            Tier 3
          </button>
        </div>
      </div>

      {/* Agent List */}
      <div style={styles.agentList}>
        {filteredAgents.map(agent => {
          const isActive = activeAgents.includes(agent.id);
          return (
            <div
              key={agent.id}
              onClick={() => setSelectedAgent(agent)}
              style={{
                ...styles.agentCard,
                borderLeftColor: getTierColor(agent.tier),
                ...(isActive ? styles.agentCardActive : {}),
              }}
            >
              <div style={styles.agentCardHeader}>
                <div style={styles.agentAvatar}>
                  <span style={styles.agentEmoji}>{agent.emoji}</span>
                </div>
                <div style={styles.agentMeta}>
                  <div style={styles.agentName}>{agent.name}</div>
                  <div style={styles.agentRole}>{agent.role}</div>
                </div>
                <div style={styles.agentIndicators}>
                  <span style={{
                    ...styles.statusDot,
                    background: getStatusColor(agent.status),
                  }} />
                  <span style={styles.tierLabel}>T{agent.tier}</span>
                </div>
              </div>
              <div style={styles.agentPreview}>
                <p style={styles.agentGoal}>{agent.goal}</p>
                <div style={styles.agentSkillsPreview}>
                  {agent.skills.slice(0, 3).map(s => (
                    <span key={s} style={styles.skillTag}>{s}</span>
                  ))}
                  {agent.skills.length > 3 && (
                    <span style={styles.skillMore}>+{agent.skills.length - 3}</span>
                  )}
                </div>
              </div>
              <div style={styles.agentStats}>
                <span>✅ {agent.stats.tasksCompleted} tasks</span>
                <span>📈 {agent.stats.successRate}%</span>
                <span>🕐 {agent.stats.lastActive}</span>
              </div>
            </div>
          );
        })}
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
  
  // Header
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
  filters: {
    display: 'flex',
    gap: '8px',
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

  // Agent List
  agentList: {
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    maxHeight: '600px',
    overflowY: 'auto',
  },
  agentCard: {
    background: 'rgba(255,255,255,0.03)',
    borderRadius: '12px',
    padding: '16px',
    cursor: 'pointer',
    borderLeft: '3px solid',
    transition: 'all 0.2s ease',
  },
  agentCardActive: {
    boxShadow: '0 0 20px rgba(245,158,11,0.2)',
    borderColor: '#f59e0b !important',
  },
  agentCardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '12px',
  },
  agentAvatar: {
    width: '44px',
    height: '44px',
    borderRadius: '12px',
    background: 'rgba(255,255,255,0.05)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  agentEmoji: {
    fontSize: '24px',
  },
  agentMeta: {
    flex: 1,
  },
  agentName: {
    color: '#fff',
    fontSize: '0.95rem',
    fontWeight: 600,
  },
  agentRole: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: '0.8rem',
  },
  agentIndicators: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  statusDot: {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
  },
  tierLabel: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: '0.75rem',
    fontWeight: 600,
  },
  agentPreview: {
    marginBottom: '12px',
  },
  agentGoal: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: '0.85rem',
    margin: '0 0 10px 0',
    lineHeight: 1.4,
  },
  agentSkillsPreview: {
    display: 'flex',
    gap: '6px',
    flexWrap: 'wrap',
  },
  skillTag: {
    background: 'rgba(102,126,234,0.15)',
    color: '#667eea',
    padding: '3px 8px',
    borderRadius: '4px',
    fontSize: '0.7rem',
  },
  skillMore: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: '0.7rem',
    padding: '3px 6px',
  },
  agentStats: {
    display: 'flex',
    gap: '16px',
    paddingTop: '12px',
    borderTop: '1px solid rgba(255,255,255,0.05)',
    fontSize: '0.75rem',
    color: 'rgba(255,255,255,0.5)',
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
  detailAvatar: {
    position: 'relative',
  },
  detailEmoji: {
    fontSize: '64px',
    display: 'block',
  },
  statusBadge: {
    position: 'absolute',
    bottom: '-4px',
    right: '-4px',
    padding: '4px 10px',
    borderRadius: '12px',
    fontSize: '0.7rem',
    fontWeight: 600,
    color: '#000',
    textTransform: 'capitalize',
  },
  detailInfo: {
    flex: 1,
  },
  detailName: {
    color: '#fff',
    fontSize: '1.5rem',
    fontWeight: 700,
    margin: '0 0 4px 0',
  },
  detailRole: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: '1rem',
    margin: '0 0 12px 0',
  },
  tierBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    background: 'rgba(255,255,255,0.05)',
    padding: '6px 14px',
    borderRadius: '20px',
    fontSize: '0.8rem',
    color: 'rgba(255,255,255,0.7)',
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
  goalText: {
    color: '#667eea',
    fontSize: '1.1rem',
    fontWeight: 500,
    margin: 0,
    lineHeight: 1.4,
  },
  backstoryText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: '0.9rem',
    margin: 0,
    lineHeight: 1.6,
  },
  skillsList: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
  },
  skillChip: {
    background: 'rgba(102,126,234,0.2)',
    color: '#667eea',
    padding: '8px 16px',
    borderRadius: '20px',
    fontSize: '0.85rem',
    fontWeight: 500,
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '12px',
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
  tasksList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  taskItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px',
    background: 'rgba(255,255,255,0.03)',
    borderRadius: '8px',
  },
  taskStatus: {
    fontSize: '16px',
  },
  taskLabel: {
    flex: 1,
    color: 'rgba(255,255,255,0.8)',
    fontSize: '0.85rem',
  },
  taskDate: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: '0.75rem',
  },

  deploySection: {
    padding: '24px',
    background: 'rgba(102,126,234,0.05)',
  },
  deployForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  deployInput: {
    width: '100%',
    padding: '14px',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '10px',
    color: '#fff',
    fontSize: '0.9rem',
    resize: 'vertical',
    minHeight: '80px',
    outline: 'none',
    boxSizing: 'border-box',
  },
  deployButton: {
    padding: '14px 28px',
    background: '#667eea',
    border: 'none',
    borderRadius: '10px',
    color: '#fff',
    fontSize: '0.95rem',
    fontWeight: 600,
    cursor: 'pointer',
    alignSelf: 'flex-end',
  },
};
