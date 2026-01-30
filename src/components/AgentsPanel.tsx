'use client';
import { useState } from 'react';

interface Agent {
  id: string;
  name: string;
  emoji: string;
  description: string;
  status: 'idle' | 'working' | 'offline';
  skills: string[];
  category: 'core' | 'specialist';
}

const AGENTS: Agent[] = [
  // Core Agents
  { id: 'research', name: 'Research Agent', emoji: '🔍', description: 'Deep web research, data gathering, and fact verification', status: 'idle', skills: ['web_search', 'web_fetch', 'memory'], category: 'core' },
  { id: 'code', name: 'Code Agent', emoji: '💻', description: 'Software development, debugging, and code review', status: 'idle', skills: ['coding', 'git', 'testing'], category: 'core' },
  { id: 'content', name: 'Content Agent', emoji: '✍️', description: 'Writing, editing, and content creation', status: 'idle', skills: ['writing', 'editing', 'seo'], category: 'core' },
  { id: 'analyst', name: 'Analyst Agent', emoji: '📊', description: 'Data analysis, insights, and reporting', status: 'idle', skills: ['analytics', 'visualization', 'research'], category: 'core' },
  { id: 'outreach', name: 'Outreach Agent', emoji: '📧', description: 'Email campaigns, follow-ups, and communication', status: 'idle', skills: ['email', 'crm', 'templates'], category: 'core' },
  { id: 'qa', name: 'QA Agent', emoji: '✅', description: 'Quality assurance, testing, and validation', status: 'idle', skills: ['testing', 'validation', 'review'], category: 'core' },
  // Specialists
  { id: 'sales', name: 'Sales Agent', emoji: '💰', description: 'Lead qualification, proposals, and closing', status: 'idle', skills: ['crm', 'proposals', 'negotiation'], category: 'specialist' },
  { id: 'contractor', name: 'Contractor Expert', emoji: '🏗️', description: 'Contractor-specific knowledge and industry expertise', status: 'idle', skills: ['industry', 'compliance', 'pricing'], category: 'specialist' },
  { id: 'mockup', name: 'Mockup Agent', emoji: '🎨', description: 'Design mockups, visual concepts, and presentations', status: 'idle', skills: ['design', 'visualization', 'branding'], category: 'specialist' },
  { id: 'proposal', name: 'Proposal Agent', emoji: '📝', description: 'Proposal writing, pricing, and document generation', status: 'idle', skills: ['writing', 'pricing', 'templates'], category: 'specialist' },
  { id: 'success', name: 'Success Agent', emoji: '🌟', description: 'Customer success, onboarding, and relationship management', status: 'idle', skills: ['onboarding', 'support', 'retention'], category: 'specialist' },
];

interface AgentsPanelProps {
  onDeploy?: (agentId: string, task: string) => void;
  activeAgents?: string[];
}

export default function AgentsPanel({ onDeploy, activeAgents = [] }: AgentsPanelProps) {
  const [expandedAgent, setExpandedAgent] = useState<string | null>(null);
  const [deployTask, setDeployTask] = useState('');

  const getStatusColor = (status: Agent['status'], isActive: boolean) => {
    if (isActive) return '#f59e0b';
    switch (status) {
      case 'working': return '#f59e0b';
      case 'idle': return '#22c55e';
      case 'offline': return '#737373';
      default: return '#737373';
    }
  };

  const getStatusText = (status: Agent['status'], isActive: boolean) => {
    if (isActive) return 'Working';
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  const handleDeploy = (agentId: string) => {
    if (deployTask.trim() && onDeploy) {
      onDeploy(agentId, deployTask);
      setDeployTask('');
      setExpandedAgent(null);
    }
  };

  const coreAgents = AGENTS.filter(a => a.category === 'core');
  const specialists = AGENTS.filter(a => a.category === 'specialist');

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <span style={styles.headerIcon}>🤖</span>
        <h2 style={styles.title}>Agent Army</h2>
        <span style={styles.badge}>{AGENTS.length} agents</span>
      </div>

      <div style={styles.section}>
        <div style={styles.sectionTitle}>Core Agents</div>
        <div style={styles.agentGrid}>
          {coreAgents.map(agent => {
            const isActive = activeAgents.includes(agent.id);
            const isExpanded = expandedAgent === agent.id;
            return (
              <div 
                key={agent.id} 
                style={{
                  ...styles.agentCard,
                  ...(isActive ? styles.agentCardActive : {}),
                  ...(isExpanded ? styles.agentCardExpanded : {})
                }}
                onClick={() => setExpandedAgent(isExpanded ? null : agent.id)}
              >
                <div style={styles.agentHeader}>
                  <div style={styles.agentInfo}>
                    <span style={styles.agentEmoji}>{agent.emoji}</span>
                    <div>
                      <div style={styles.agentName}>{agent.name}</div>
                      <div style={styles.agentStatus}>
                        <span style={{ ...styles.statusDot, background: getStatusColor(agent.status, isActive) }} />
                        {getStatusText(agent.status, isActive)}
                      </div>
                    </div>
                  </div>
                </div>
                
                {isExpanded && (
                  <div style={styles.agentDetails}>
                    <p style={styles.agentDescription}>{agent.description}</p>
                    <div style={styles.skillTags}>
                      {agent.skills.map(skill => (
                        <span key={skill} style={styles.skillTag}>{skill}</span>
                      ))}
                    </div>
                    <div style={styles.deploySection}>
                      <input
                        type="text"
                        placeholder="Describe the task..."
                        value={deployTask}
                        onChange={(e) => setDeployTask(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        style={styles.deployInput}
                      />
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeploy(agent.id); }}
                        style={styles.deployButton}
                        disabled={!deployTask.trim()}
                      >
                        🚀 Deploy
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div style={styles.section}>
        <div style={styles.sectionTitle}>Specialists</div>
        <div style={styles.agentGrid}>
          {specialists.map(agent => {
            const isActive = activeAgents.includes(agent.id);
            const isExpanded = expandedAgent === agent.id;
            return (
              <div 
                key={agent.id} 
                style={{
                  ...styles.agentCard,
                  ...styles.specialistCard,
                  ...(isActive ? styles.agentCardActive : {}),
                  ...(isExpanded ? styles.agentCardExpanded : {})
                }}
                onClick={() => setExpandedAgent(isExpanded ? null : agent.id)}
              >
                <div style={styles.agentHeader}>
                  <div style={styles.agentInfo}>
                    <span style={styles.agentEmoji}>{agent.emoji}</span>
                    <div>
                      <div style={styles.agentName}>{agent.name}</div>
                      <div style={styles.agentStatus}>
                        <span style={{ ...styles.statusDot, background: getStatusColor(agent.status, isActive) }} />
                        {getStatusText(agent.status, isActive)}
                      </div>
                    </div>
                  </div>
                </div>
                
                {isExpanded && (
                  <div style={styles.agentDetails}>
                    <p style={styles.agentDescription}>{agent.description}</p>
                    <div style={styles.skillTags}>
                      {agent.skills.map(skill => (
                        <span key={skill} style={styles.skillTag}>{skill}</span>
                      ))}
                    </div>
                    <div style={styles.deploySection}>
                      <input
                        type="text"
                        placeholder="Describe the task..."
                        value={deployTask}
                        onChange={(e) => setDeployTask(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        style={styles.deployInput}
                      />
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeploy(agent.id); }}
                        style={styles.deployButton}
                        disabled={!deployTask.trim()}
                      >
                        🚀 Deploy
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    background: '#1a1a2e',
    borderRadius: '12px',
    border: '1px solid rgba(255,255,255,0.1)',
    overflow: 'hidden',
  },
  header: {
    padding: '16px 20px',
    borderBottom: '1px solid rgba(255,255,255,0.1)',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  headerIcon: {
    fontSize: '24px',
  },
  title: {
    color: '#fff',
    fontSize: '1rem',
    fontWeight: 600,
    margin: 0,
    flex: 1,
  },
  badge: {
    background: 'rgba(102,126,234,0.2)',
    color: '#667eea',
    padding: '4px 10px',
    borderRadius: '12px',
    fontSize: '0.75rem',
    fontWeight: 500,
  },
  section: {
    padding: '16px 20px',
  },
  sectionTitle: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: '0.7rem',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    marginBottom: '12px',
  },
  agentGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: '10px',
  },
  agentCard: {
    background: 'rgba(255,255,255,0.05)',
    borderRadius: '8px',
    padding: '12px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    border: '1px solid transparent',
  },
  agentCardActive: {
    borderColor: '#f59e0b',
    boxShadow: '0 0 20px rgba(245,158,11,0.2)',
  },
  agentCardExpanded: {
    gridColumn: 'span 2',
  },
  specialistCard: {
    borderLeft: '3px solid #764ba2',
  },
  agentHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  agentInfo: {
    display: 'flex',
    gap: '10px',
    alignItems: 'center',
  },
  agentEmoji: {
    fontSize: '24px',
  },
  agentName: {
    color: '#fff',
    fontSize: '0.85rem',
    fontWeight: 500,
  },
  agentStatus: {
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    fontSize: '0.7rem',
    color: 'rgba(255,255,255,0.5)',
    marginTop: '2px',
  },
  statusDot: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
  },
  agentDetails: {
    marginTop: '12px',
    paddingTop: '12px',
    borderTop: '1px solid rgba(255,255,255,0.1)',
  },
  agentDescription: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: '0.8rem',
    lineHeight: 1.5,
    margin: '0 0 10px 0',
  },
  skillTags: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '6px',
    marginBottom: '12px',
  },
  skillTag: {
    background: 'rgba(102,126,234,0.2)',
    color: '#667eea',
    padding: '2px 8px',
    borderRadius: '4px',
    fontSize: '0.7rem',
  },
  deploySection: {
    display: 'flex',
    gap: '8px',
  },
  deployInput: {
    flex: 1,
    padding: '8px 12px',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '6px',
    color: '#fff',
    fontSize: '0.8rem',
    outline: 'none',
  },
  deployButton: {
    padding: '8px 16px',
    background: '#667eea',
    border: 'none',
    borderRadius: '6px',
    color: '#fff',
    fontSize: '0.8rem',
    fontWeight: 500,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
};
