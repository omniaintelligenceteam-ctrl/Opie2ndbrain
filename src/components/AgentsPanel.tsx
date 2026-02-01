'use client';
import { useState } from 'react';

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

interface AgentsPanelProps {
  onDeploy?: (agentId: string, task: string) => void;
  activeAgents?: string[];
}

export default function AgentsPanel({ onDeploy }: AgentsPanelProps) {
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [deployTask, setDeployTask] = useState('');

  const handleDeploy = () => {
    if (selectedAgent && deployTask.trim() && onDeploy) {
      onDeploy(selectedAgent.id, deployTask);
      setDeployTask('');
      setSelectedAgent(null);
    }
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <span style={styles.headerIcon}>🤖</span>
        <h2 style={styles.title}>Agents</h2>
      </div>

      {/* Agents List */}
      <div style={styles.agentsList}>
        {ALL_AGENTS.map(agent => (
          <div
            key={agent.id}
            onClick={() => setSelectedAgent(selectedAgent?.id === agent.id ? null : agent)}
            style={{
              ...styles.agentCard,
              ...(selectedAgent?.id === agent.id ? styles.agentCardSelected : {}),
            }}
          >
            <div style={styles.agentCardHeader}>
              <span style={styles.agentEmoji}>{agent.emoji}</span>
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
        ))}
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
  },
  agentsList: {
    maxHeight: '500px',
    overflowY: 'auto',
  },
  agentCard: {
    padding: '14px 20px',
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
  agentInfo: {
    flex: 1,
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
  },
  levelBadge: {
    fontSize: '0.65rem',
    fontWeight: 600,
    padding: '4px 10px',
    borderRadius: '6px',
    border: '1px solid',
    textTransform: 'uppercase',
    letterSpacing: '0.03em',
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
