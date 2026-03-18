// Agent Mapping Configuration
// Maps real registered agents to orchestration diagram nodes

export interface AgentNodeConfig {
  id: string;
  name: string;
  emoji: string;
  specialistFiles: string[];
  sessionPatterns: string[];
  position: { x: number; y: number };
  color: string;
}

// Your real 14 registered agents
export const AGENT_NODES: AgentNodeConfig[] = [
  {
    id: 'main',
    name: 'Main (G)',
    emoji: '🧠',
    specialistFiles: ['SOUL.md', 'IDENTITY.md'],
    sessionPatterns: ['main', 'orchestrat'],
    position: { x: 50, y: 5 },
    color: '#a855f7',
  },
  {
    id: 'elon',
    name: 'Elon (CTO)',
    emoji: '🚀',
    specialistFiles: ['elon-agent.md'],
    sessionPatterns: ['elon', 'infra', 'plugin', 'cron', 'gateway', 'system'],
    position: { x: 50, y: 20 },
    color: '#06b6d4',
  },
  {
    id: 'gary',
    name: 'Gary (CMO)',
    emoji: '📣',
    specialistFiles: ['gary-agent.md'],
    sessionPatterns: ['gary', 'marketing', 'content', 'brand', 'social', 'copy'],
    position: { x: 20, y: 30 },
    color: '#f97316',
  },
  {
    id: 'warren',
    name: 'Warren (CRO)',
    emoji: '💰',
    specialistFiles: ['warren-agent.md'],
    sessionPatterns: ['warren', 'revenue', 'pipeline', 'deal', 'outreach', 'crm'],
    position: { x: 80, y: 30 },
    color: '#22c55e',
  },
  {
    id: 'scout',
    name: 'Scout',
    emoji: '🔍',
    specialistFiles: ['scout-agent.md'],
    sessionPatterns: ['scout', 'lead-gen', 'scrape', 'job-board'],
    position: { x: 10, y: 50 },
    color: '#34d399',
  },
  {
    id: 'research',
    name: 'Research',
    emoji: '📚',
    specialistFiles: ['research-agent.md'],
    sessionPatterns: ['research', 'atlas', 'analysis', 'investigate'],
    position: { x: 30, y: 50 },
    color: '#3b82f6',
  },
  {
    id: 'analyst',
    name: 'Analyst',
    emoji: '📊',
    specialistFiles: ['analyst-agent.md'],
    sessionPatterns: ['analyst', 'data', 'metric', 'report'],
    position: { x: 50, y: 50 },
    color: '#ec4899',
  },
  {
    id: 'content-writer',
    name: 'Content Writer',
    emoji: '✍️',
    specialistFiles: ['content-writer-agent.md'],
    sessionPatterns: ['content-writer', 'copywrite', 'draft'],
    position: { x: 70, y: 50 },
    color: '#f59e0b',
  },
  {
    id: 'outreach',
    name: 'Outreach',
    emoji: '📧',
    specialistFiles: ['outreach-agent.md'],
    sessionPatterns: ['outreach', 'cold-email', 'email'],
    position: { x: 90, y: 50 },
    color: '#8b5cf6',
  },
  {
    id: 'call-debrief',
    name: 'Call Debrief',
    emoji: '📞',
    specialistFiles: ['call-debrief-agent.md'],
    sessionPatterns: ['call-debrief', 'transcript'],
    position: { x: 20, y: 70 },
    color: '#ec4899',
  },
  {
    id: 'ops-guardian',
    name: 'Ops Guardian',
    emoji: '🛡️',
    specialistFiles: ['ops-guardian-agent.md'],
    sessionPatterns: ['ops-guardian', 'ops', 'guardian'],
    position: { x: 40, y: 70 },
    color: '#0ea5e9',
  },
  {
    id: 'memory-curator',
    name: 'Memory Curator',
    emoji: '🗃️',
    specialistFiles: ['memory-curator-agent.md'],
    sessionPatterns: ['memory-curator', 'memory', 'recall'],
    position: { x: 60, y: 70 },
    color: '#a78bfa',
  },
  {
    id: 'sonnet',
    name: 'Sonnet',
    emoji: '⚡',
    specialistFiles: ['sonnet-agent.md'],
    sessionPatterns: ['sonnet', 'sonnet-1', 'sonnet-2'],
    position: { x: 80, y: 70 },
    color: '#fb923c',
  },
  {
    id: 'codex',
    name: 'Codex',
    emoji: '💻',
    specialistFiles: ['codex-agent.md'],
    sessionPatterns: ['codex', 'code', 'develop', 'engineer'],
    position: { x: 50, y: 85 },
    color: '#22c55e',
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
      if (lowerLabel.includes(pattern) || lowerId.includes(pattern)) {
        return node;
      }
    }
  }

  return null;
}

export function matchSpecialistToNode(filename: string): AgentNodeConfig | null {
  const lowerFilename = filename.toLowerCase();
  for (const node of AGENT_NODES) {
    if (node.specialistFiles.some(f => lowerFilename.includes(f.replace('.md', '').toLowerCase()))) {
      return node;
    }
  }
  return null;
}

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

export function mapSessionsToNodes(
  sessions: Array<{
    id: string;
    label: string;
    status: string;
    startedAt?: string;
  }>
): AgentNodeState[] {
  const nodeSessionMap = new Map<string, typeof sessions>();

  for (const session of sessions) {
    const node = matchSessionToNode(session.label, session.id);
    if (node) {
      const existing = nodeSessionMap.get(node.id) || [];
      existing.push(session);
      nodeSessionMap.set(node.id, existing);
    }
  }

  return AGENT_NODES.map(node => {
    const nodeSessions = nodeSessionMap.get(node.id) || [];
    const activeSessions = nodeSessions.filter(s => s.status === 'running').length;
    const hasAnySessions = nodeSessions.length > 0;

    let status: AgentStatus = 'idle';
    if (activeSessions > 0) status = 'working';
    else if (hasAnySessions) status = 'connected';

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
