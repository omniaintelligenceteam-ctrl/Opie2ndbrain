'use client';
import { useState, useMemo, useCallback, useEffect } from 'react';

interface Agent {
  id: string;
  name: string;
  emoji: string;
  description: string;
  level: 'core' | 'advanced' | 'specialist';
}

// All 42 agents with descriptions and levels
const ALL_AGENTS: Agent[] = [
  // Core Agents
  { id: 'opie-main', name: 'Opie Main', emoji: '⚡', description: 'Primary orchestrating agent', level: 'core' },
  { id: 'research-agent', name: 'Research', emoji: '🔍', description: 'Deep research and analysis', level: 'core' },
  { id: 'code-agent', name: 'Code', emoji: '💻', description: 'Software development and debugging', level: 'core' },
  { id: 'content-agent', name: 'Content', emoji: '✍️', description: 'Content creation and copywriting', level: 'core' },
  { id: 'analyst-agent', name: 'Analyst', emoji: '📊', description: 'Data analysis and insights', level: 'core' },
  { id: 'sales-agent', name: 'Sales', emoji: '💰', description: 'Sales strategy and outreach', level: 'core' },
  { id: 'proposal-agent', name: 'Proposal', emoji: '📝', description: 'Proposals and estimates', level: 'core' },
  // Advanced Agents
  { id: 'crisis-commander-agent', name: 'Crisis Commander', emoji: '🚨', description: 'Emergency response coordination', level: 'advanced' },
  { id: 'decision-intelligence-agent', name: 'Decision Intelligence', emoji: '🎯', description: 'Strategic decision making', level: 'advanced' },
  { id: 'director-agent', name: 'Director', emoji: '🎬', description: 'Project direction and oversight', level: 'advanced' },
  { id: 'negotiator-agent', name: 'Negotiator', emoji: '🤝', description: 'Deal negotiation strategies', level: 'advanced' },
  { id: 'synthesis-agent', name: 'Synthesis', emoji: '🧬', description: 'Combine insights into action', level: 'advanced' },
  { id: 'devils-advocate-agent', name: "Devil's Advocate", emoji: '😈', description: 'Challenge assumptions and ideas', level: 'advanced' },
  { id: 'forward-thinking-agent', name: 'Forward Thinking', emoji: '🔮', description: 'Future planning and strategy', level: 'advanced' },
  { id: 'scenario-architect-agent', name: 'Scenario Architect', emoji: '🏗️', description: 'Model future scenarios', level: 'advanced' },
  { id: 'emotional-intelligence-agent', name: 'Emotional Intelligence', emoji: '💗', description: 'Understand emotional context', level: 'advanced' },
  { id: 'stakeholder-orchestrator-agent', name: 'Stakeholder Orchestrator', emoji: '🎭', description: 'Manage stakeholder relationships', level: 'advanced' },
  { id: 'network-intelligence-agent', name: 'Network Intelligence', emoji: '🌐', description: 'Map and leverage networks', level: 'advanced' },
  { id: 'mockup-specialist', name: 'Mockup Specialist', emoji: '🎨', description: 'Create visual mockups', level: 'advanced' },
  { id: 'success-agent', name: 'Success', emoji: '🏆', description: 'Customer success strategies', level: 'advanced' },
  { id: 'contractor-expert', name: 'Contractor Expert', emoji: '🔧', description: 'Contractor industry knowledge', level: 'advanced' },
  { id: 'business-acumen-agent', name: 'Business Acumen', emoji: '💼', description: 'Business strategy and operations', level: 'advanced' },
  // Specialist Agents
  { id: 'accountability-agent', name: 'Accountability', emoji: '📋', description: 'Track commitments and follow-ups', level: 'specialist' },
  { id: 'delegation-master-agent', name: 'Delegation Master', emoji: '👥', description: 'Optimal task delegation', level: 'specialist' },
  { id: 'energy-guardian-agent', name: 'Energy Guardian', emoji: '⚡', description: 'Manage energy and focus', level: 'specialist' },
  { id: 'humanizer-agent', name: 'Humanizer', emoji: '🤝', description: 'Make content more human', level: 'specialist' },
  { id: 'ideas-agent', name: 'Ideas', emoji: '💡', description: 'Generate creative ideas', level: 'specialist' },
  { id: 'learning-accelerator-agent', name: 'Learning Accelerator', emoji: '📚', description: 'Accelerate skill acquisition', level: 'specialist' },
  { id: 'lead-tracker-agent', name: 'Lead Tracker', emoji: '📈', description: 'Track and manage leads', level: 'specialist' },
  { id: 'meeting-master-agent', name: 'Meeting Master', emoji: '📅', description: 'Optimize meetings', level: 'specialist' },
  { id: 'onboarding-buddy-agent', name: 'Onboarding Buddy', emoji: '👋', description: 'Guide new user onboarding', level: 'specialist' },
  { id: 'photo-analyzer-agent', name: 'Photo Analyzer', emoji: '📷', description: 'Analyze images and photos', level: 'specialist' },
  { id: 'prioritization-agent', name: 'Prioritization', emoji: '📌', description: 'Prioritize tasks and goals', level: 'specialist' },
  { id: 'prompt-agent', name: 'Prompt', emoji: '✨', description: 'Craft effective prompts', level: 'specialist' },
  { id: 'prompt-architect-agent', name: 'Prompt Architect', emoji: '🏛️', description: 'Design prompt systems', level: 'specialist' },
  { id: 'qa-validator-agent', name: 'QA Validator', emoji: '✅', description: 'Quality assurance testing', level: 'specialist' },
  { id: 'writing-agent', name: 'Writing', emoji: '✏️', description: 'Long-form writing', level: 'specialist' },
  { id: 'analyst-template', name: 'Analyst Template', emoji: '📊', description: 'Template for analysis agents', level: 'specialist' },
  { id: 'code-template', name: 'Code Template', emoji: '💻', description: 'Template for code agents', level: 'specialist' },
  { id: 'content-template', name: 'Content Template', emoji: '✍️', description: 'Template for content agents', level: 'specialist' },
  { id: 'outreach-template', name: 'Outreach Template', emoji: '📧', description: 'Template for outreach agents', level: 'specialist' },
  { id: 'research-template', name: 'Research Template', emoji: '🔍', description: 'Template for research agents', level: 'specialist' },
];

type FilterLevel = 'all' | 'core' | 'advanced' | 'specialist' | 'active';

function getLevelColor(level: string): string {
  switch (level) {
    case 'core': return '#22c55e';
    case 'advanced': return '#667eea';
    case 'specialist': return '#f59e0b';
    default: return '#6b7280';
  }
}

function getLevelLabel(level: string): string {
  switch (level) {
    case 'core': return 'Core';
    case 'advanced': return 'Advanced';
    case 'specialist': return 'Specialist';
    default: return level;
  }
}

// Recently used persistence
const RECENT_KEY = 'opie-recent-agents';
const MAX_RECENT = 5;

function getRecentAgents(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function addRecentAgent(agentId: string) {
  try {
    const recent = getRecentAgents().filter(id => id !== agentId);
    recent.unshift(agentId);
    localStorage.setItem(RECENT_KEY, JSON.stringify(recent.slice(0, MAX_RECENT)));
  } catch {}
}

interface AgentsPanelProps {
  onDeploy?: (agentId: string, task: string) => void;
  activeAgents?: string[];
}

export default function AgentsPanel({ onDeploy, activeAgents = [] }: AgentsPanelProps) {
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [deployTask, setDeployTask] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<FilterLevel>('all');
  const [recentIds, setRecentIds] = useState<string[]>([]);

  useEffect(() => {
    setRecentIds(getRecentAgents());
  }, []);

  const activeSet = useMemo(() => new Set(activeAgents.map(a => a.toLowerCase())), [activeAgents]);

  const filteredAgents = useMemo(() => {
    let agents = ALL_AGENTS;

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      agents = agents.filter(a =>
        a.name.toLowerCase().includes(q) ||
        a.description.toLowerCase().includes(q) ||
        a.id.toLowerCase().includes(q)
      );
    }

    // Level filter
    if (filter === 'active') {
      agents = agents.filter(a => activeSet.has(a.id));
    } else if (filter !== 'all') {
      agents = agents.filter(a => a.level === filter);
    }

    return agents;
  }, [searchQuery, filter, activeSet]);

  const recentAgents = useMemo(() => {
    if (searchQuery.trim() || filter !== 'all') return [];
    return recentIds
      .map(id => ALL_AGENTS.find(a => a.id === id))
      .filter((a): a is Agent => !!a);
  }, [recentIds, searchQuery, filter]);

  const handleSelect = useCallback((agent: Agent) => {
    if (selectedAgent?.id === agent.id) {
      setSelectedAgent(null);
    } else {
      setSelectedAgent(agent);
      addRecentAgent(agent.id);
      setRecentIds(getRecentAgents());
    }
  }, [selectedAgent]);

  const handleDeploy = useCallback(() => {
    if (selectedAgent && deployTask.trim() && onDeploy) {
      onDeploy(selectedAgent.id, deployTask);
      setDeployTask('');
      setSelectedAgent(null);
    }
  }, [selectedAgent, deployTask, onDeploy]);

  const FILTERS: { id: FilterLevel; label: string; count?: number }[] = [
    { id: 'all', label: 'All', count: ALL_AGENTS.length },
    { id: 'core', label: 'Core', count: ALL_AGENTS.filter(a => a.level === 'core').length },
    { id: 'advanced', label: 'Advanced', count: ALL_AGENTS.filter(a => a.level === 'advanced').length },
    { id: 'specialist', label: 'Specialist', count: ALL_AGENTS.filter(a => a.level === 'specialist').length },
    ...(activeAgents.length > 0 ? [{ id: 'active' as FilterLevel, label: 'Active', count: activeAgents.length }] : []),
  ];

  const renderAgentCard = (agent: Agent, isRecent = false) => {
    const isSelected = selectedAgent?.id === agent.id;
    const isActive = activeSet.has(agent.id);

    return (
      <div
        key={`${isRecent ? 'recent-' : ''}${agent.id}`}
        onClick={() => handleSelect(agent)}
        style={{
          ...styles.agentCard,
          ...(isSelected ? styles.agentCardSelected : {}),
        }}
      >
        <div style={styles.agentCardHeader}>
          <div style={{ position: 'relative' }}>
            <span style={styles.agentEmoji}>{agent.emoji}</span>
            {isActive && <span style={styles.activeIndicator} />}
          </div>
          <div style={styles.agentInfo}>
            <div style={styles.agentName}>{agent.name}</div>
            <div style={styles.agentDesc}>{agent.description}</div>
          </div>
          <span style={{
            ...styles.levelBadge,
            background: `${getLevelColor(agent.level)}20`,
            color: getLevelColor(agent.level),
            borderColor: `${getLevelColor(agent.level)}40`,
          }}>
            {getLevelLabel(agent.level)}
          </span>
        </div>
      </div>
    );
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <span style={styles.headerIcon}>🤖</span>
        <h2 style={styles.title}>Agents</h2>
        <span style={styles.agentCount}>{ALL_AGENTS.length}</span>
      </div>

      {/* Search */}
      <div style={styles.searchWrapper}>
        <span style={styles.searchIcon}>🔍</span>
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Search agents by name or skill..."
          style={styles.searchInput}
        />
        {searchQuery && (
          <button onClick={() => setSearchQuery('')} style={styles.clearBtn}>
            ✕
          </button>
        )}
      </div>

      {/* Filter pills */}
      <div style={styles.filterRow}>
        {FILTERS.map(f => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            style={{
              ...styles.filterPill,
              ...(filter === f.id ? styles.filterPillActive : {}),
            }}
          >
            {f.label}
            {f.count !== undefined && (
              <span style={styles.filterCount}>{f.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* Recently Used */}
      {recentAgents.length > 0 && (
        <div style={styles.recentSection}>
          <div style={styles.sectionLabel}>Recently Used</div>
          {recentAgents.map(agent => renderAgentCard(agent, true))}
          <div style={styles.sectionDivider} />
        </div>
      )}

      {/* Agents List */}
      <div style={styles.agentsList}>
        {filteredAgents.length === 0 ? (
          <div style={styles.emptyState}>
            <span style={{ fontSize: 32, opacity: 0.5 }}>🔎</span>
            <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem' }}>
              {searchQuery ? `No agents matching "${searchQuery}"` : 'No agents in this category'}
            </span>
          </div>
        ) : (
          filteredAgents.map(agent => renderAgentCard(agent))
        )}
      </div>

      {/* Deploy Section */}
      {selectedAgent && (
        <div style={styles.deploySection}>
          <textarea
            value={deployTask}
            onChange={(e) => setDeployTask(e.target.value)}
            placeholder={`Task for ${selectedAgent.name}...`}
            style={styles.deployInput}
            rows={2}
          />
          <button
            onClick={handleDeploy}
            disabled={!deployTask.trim()}
            style={{
              ...styles.deployBtn,
              opacity: deployTask.trim() ? 1 : 0.5,
            }}
          >
            🚀 Deploy
          </button>
        </div>
      )}
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    background: 'rgba(13, 13, 21, 0.95)',
    borderRadius: '16px',
    border: '1px solid rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  header: {
    padding: '16px 20px',
    borderBottom: '1px solid rgba(255,255,255,0.08)',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  headerIcon: {
    fontSize: '20px',
  },
  title: {
    color: '#fff',
    fontSize: '1rem',
    fontWeight: 600,
    margin: 0,
    flex: 1,
  },
  agentCount: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: '0.8rem',
    fontWeight: 500,
  },
  searchWrapper: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '12px 20px',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
  },
  searchIcon: {
    fontSize: '14px',
    opacity: 0.5,
  },
  searchInput: {
    flex: 1,
    background: 'transparent',
    border: 'none',
    outline: 'none',
    color: '#fff',
    fontSize: '0.875rem',
  },
  clearBtn: {
    background: 'none',
    border: 'none',
    color: 'rgba(255,255,255,0.4)',
    cursor: 'pointer',
    fontSize: '12px',
    padding: '4px',
  },
  filterRow: {
    display: 'flex',
    gap: '6px',
    padding: '10px 20px',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
    overflowX: 'auto',
  },
  filterPill: {
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    padding: '6px 12px',
    borderRadius: '20px',
    border: '1px solid rgba(255,255,255,0.1)',
    background: 'transparent',
    color: 'rgba(255,255,255,0.55)',
    fontSize: '0.75rem',
    fontWeight: 500,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    transition: 'all 0.15s ease',
  },
  filterPillActive: {
    background: 'rgba(102,126,234,0.2)',
    borderColor: 'rgba(102,126,234,0.4)',
    color: '#fff',
  },
  filterCount: {
    opacity: 0.6,
    fontSize: '0.7rem',
  },
  recentSection: {
    padding: '0',
  },
  sectionLabel: {
    padding: '10px 20px 4px',
    color: 'rgba(255,255,255,0.35)',
    fontSize: '0.7rem',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
  },
  sectionDivider: {
    height: 1,
    background: 'rgba(255,255,255,0.06)',
    margin: '4px 20px',
  },
  agentsList: {
    maxHeight: '420px',
    overflowY: 'auto',
  },
  agentCard: {
    padding: '12px 20px',
    cursor: 'pointer',
    borderBottom: '1px solid rgba(255,255,255,0.04)',
    transition: 'background 0.15s',
  },
  agentCardSelected: {
    background: 'rgba(102, 126, 234, 0.15)',
  },
  agentCardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  agentEmoji: {
    fontSize: '24px',
  },
  activeIndicator: {
    position: 'absolute',
    bottom: 0,
    right: -2,
    width: 10,
    height: 10,
    borderRadius: '50%',
    background: '#22c55e',
    border: '2px solid rgba(13, 13, 21, 0.95)',
    boxShadow: '0 0 6px rgba(34, 197, 94, 0.6)',
  },
  agentInfo: {
    flex: 1,
    minWidth: 0,
  },
  agentName: {
    color: '#fff',
    fontSize: '0.9rem',
    fontWeight: 600,
  },
  agentDesc: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: '0.75rem',
    marginTop: '2px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  levelBadge: {
    fontSize: '0.65rem',
    fontWeight: 600,
    padding: '4px 10px',
    borderRadius: '6px',
    border: '1px solid',
    textTransform: 'uppercase',
    letterSpacing: '0.03em',
    flexShrink: 0,
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
    padding: '40px 20px',
  },
  deploySection: {
    padding: '16px 20px',
    borderTop: '1px solid rgba(255,255,255,0.08)',
    display: 'flex',
    gap: '10px',
  },
  deployInput: {
    flex: 1,
    padding: '10px 12px',
    borderRadius: '8px',
    border: '1px solid rgba(255,255,255,0.1)',
    background: 'rgba(0,0,0,0.3)',
    color: '#fff',
    fontSize: '0.85rem',
    resize: 'none',
    fontFamily: 'inherit',
  },
  deployBtn: {
    padding: '10px 20px',
    borderRadius: '8px',
    border: 'none',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: '#fff',
    fontSize: '0.85rem',
    fontWeight: 600,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
};
