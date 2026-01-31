// Agent Mapping Configuration
// Maps real specialist agents to orchestration diagram nodes

export interface AgentNodeConfig {
  id: string;
  name: string;
  emoji: string;
  specialistFiles: string[]; // Matches against agent filenames in /agents/specialists/
  sessionPatterns: string[]; // Regex patterns to match session labels
  position: { x: number; y: number }; // Position on the orchestration diagram (percentage)
  color: string;
}

// Visual orchestration nodes and their mappings to real agents
export const AGENT_NODES: AgentNodeConfig[] = [
  {
    id: 'research',
    name: 'Research',
    emoji: '🔍',
    specialistFiles: ['research-agent.md', 'atlas-research-agent.md', 'forward-thinking-agent.md'],
    sessionPatterns: ['research', 'atlas', 'analysis', 'investigate'],
    position: { x: 20, y: 10 },
    color: '#3b82f6', // blue
  },
  {
    id: 'code',
    name: 'Code',
    emoji: '💻',
    specialistFiles: ['code-agent.md', 'codeforge-agent.md'],
    sessionPatterns: ['code', 'develop', 'engineer', 'programming', 'codeforge'],
    position: { x: 75, y: 10 },
    color: '#22c55e', // green
  },
  {
    id: 'proposal',
    name: 'Proposal',
    emoji: '📝',
    specialistFiles: ['proposal-agent.md', 'director-agent.md'],
    sessionPatterns: ['proposal', 'estimate', 'quote', 'bid'],
    position: { x: 10, y: 30 },
    color: '#8b5cf6', // purple
  },
  {
    id: 'content',
    name: 'Content',
    emoji: '✍️',
    specialistFiles: ['content-agent.md', 'writing-agent.md', 'lumina-content-agent.md', 'humanizer-agent.md'],
    sessionPatterns: ['content', 'write', 'blog', 'article', 'copy', 'lumina'],
    position: { x: 90, y: 40 },
    color: '#f59e0b', // orange
  },
  {
    id: 'sales',
    name: 'Sales',
    emoji: '💰',
    specialistFiles: ['sales-agent.md', 'hunter-sales-agent.md', 'negotiator-agent.md'],
    sessionPatterns: ['sales', 'lead', 'crm', 'hunter', 'negotiat'],
    position: { x: 5, y: 55 },
    color: '#22d3ee', // cyan
  },
  {
    id: 'analyst',
    name: 'Analyst',
    emoji: '📊',
    specialistFiles: ['analyst-agent.md', 'synthesis-agent.md', 'decision-intelligence-agent.md'],
    sessionPatterns: ['analyst', 'data', 'metric', 'report', 'synthesis', 'decision'],
    position: { x: 85, y: 75 },
    color: '#ec4899', // pink
  },
  {
    id: 'qa',
    name: 'QA',
    emoji: '✅',
    specialistFiles: ['devils-advocate-agent.md', 'accountability-agent.md'],
    sessionPatterns: ['qa', 'test', 'review', 'quality', 'verify', 'advocate'],
    position: { x: 20, y: 85 },
    color: '#84cc16', // lime
  },
  {
    id: 'outreach',
    name: 'Outreach',
    emoji: '📧',
    specialistFiles: ['network-intelligence-agent.md', 'stakeholder-orchestrator-agent.md', 'emotional-intelligence-agent.md'],
    sessionPatterns: ['outreach', 'email', 'communication', 'network', 'stakeholder'],
    position: { x: 55, y: 90 },
    color: '#f97316', // orange-red
  },
];

// Get all agent IDs
export const ALL_AGENT_IDS = AGENT_NODES.map(n => n.id);

// Find which node an agent session belongs to
export function matchSessionToNode(sessionLabel: string, sessionId?: string): AgentNodeConfig | null {
  const lowerLabel = sessionLabel.toLowerCase();
  const lowerId = (sessionId || '').toLowerCase();

  for (const node of AGENT_NODES) {
    for (const pattern of node.sessionPatterns) {
      // Match against label OR session ID
      if (lowerLabel.includes(pattern) || lowerId.includes(pattern)) {
        return node;
      }
    }
  }

  // Fallback: try to match common task/agent patterns to a default node
  // If it's clearly an agent/task but doesn't match specific patterns, assign to Research
  const genericAgentPatterns = ['agent', 'task', 'subagent', 'worker', 'job', 'process'];
  for (const pattern of genericAgentPatterns) {
    if (lowerLabel.includes(pattern) || lowerId.includes(pattern)) {
      return AGENT_NODES[0]; // Default to Research agent
    }
  }

  return null;
}

// Find which node a specialist file belongs to
export function matchSpecialistToNode(filename: string): AgentNodeConfig | null {
  const lowerFilename = filename.toLowerCase();
  
  for (const node of AGENT_NODES) {
    if (node.specialistFiles.some(f => lowerFilename.includes(f.replace('.md', '').toLowerCase()))) {
      return node;
    }
  }
  
  return null;
}

// Agent session status type
export type AgentStatus = 'working' | 'connected' | 'idle';

export interface AgentNodeState {
  id: string;
  name: string;
  emoji: string;
  status: AgentStatus;
  position: { x: number; y: number };
  color: string;
  activeSessions: number;
  lastActivity?: string;
  currentTask?: string;
}

// Convert raw session data to node states
export function mapSessionsToNodes(
  sessions: Array<{ 
    id: string; 
    label: string; 
    status: string;
    startedAt?: string;
  }>
): AgentNodeState[] {
  // Group sessions by node
  const nodeSessionMap = new Map<string, typeof sessions>();

  for (const session of sessions) {
    const node = matchSessionToNode(session.label, session.id);
    if (node) {
      const existing = nodeSessionMap.get(node.id) || [];
      existing.push(session);
      nodeSessionMap.set(node.id, existing);
    }
  }
  
  // Convert to node states
  return AGENT_NODES.map(node => {
    const nodeSessions = nodeSessionMap.get(node.id) || [];
    const activeSessions = nodeSessions.filter(s => s.status === 'running').length;
    const hasAnySessions = nodeSessions.length > 0;
    
    // Determine status
    let status: AgentStatus = 'idle';
    if (activeSessions > 0) {
      status = 'working';
    } else if (hasAnySessions) {
      status = 'connected';
    }
    
    // Get most recent activity
    const sortedSessions = [...nodeSessions].sort((a, b) => 
      new Date(b.startedAt || 0).getTime() - new Date(a.startedAt || 0).getTime()
    );
    
    return {
      id: node.id,
      name: node.name,
      emoji: node.emoji,
      status,
      position: node.position,
      color: node.color,
      activeSessions,
      lastActivity: sortedSessions[0]?.startedAt,
      currentTask: activeSessions > 0 ? sortedSessions[0]?.label : undefined,
    };
  });
}
