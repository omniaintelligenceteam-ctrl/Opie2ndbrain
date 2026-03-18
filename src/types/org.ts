// Organization Chart Type Definitions
// WES → OPIE → Specialist Agents hierarchy

export interface OrgNode {
  id: string;
  name: string;
  title: string;
  role: string;
  model: string;
  costPer1M: number;
  skills: string[];
  reportsTo: string | null;
  status: 'active' | 'busy' | 'idle' | 'talking' | 'working' | 'thinking';
  avatar: string;
  color: string;
  activeSessions?: number;
  currentTask?: string;
  lastActive?: string;
  agentIds?: string[];  // Maps to real-time agent IDs from agentMapping
}

export interface OrgNodeWithChildren extends OrgNode {
  children: OrgNodeWithChildren[];
}

// Organization structure data - WesCo Team
export const ORG_DATA: OrgNode[] = [
  {
    id: 'wes',
    name: 'WES',
    title: 'Chief Executive Officer',
    role: 'CEO',
    model: 'Human',
    costPer1M: 0,
    skills: ['Leadership', 'Strategy', 'Vision', 'Decision Making'],
    reportsTo: null,
    status: 'active',
    avatar: '👑',
    color: '#FFD700' // gold
  },
  {
    id: 'opie',
    name: 'OPIE',
    title: 'Chief Operations Officer',
    role: 'COO',
    model: 'Claude Opus 4.6',
    costPer1M: 15,
    skills: ['Operations', 'Coordination', 'Strategy', 'Quality Control'],
    reportsTo: 'wes',
    status: 'busy',
    avatar: '🎯',
    color: '#9333EA', // purple
    activeSessions: 3,
    currentTask: 'Coordinating agent deployment',
    agentIds: ['*'],  // Coordinator: reflects all agent activity
  },
  {
    id: 'sonny',
    name: 'SONNY',
    title: 'Lead Engineer',
    role: 'Engineering Lead',
    model: 'Claude Sonnet 5',
    costPer1M: 3,
    skills: ['Coding', 'Architecture', 'DevOps', 'AI/ML'],
    reportsTo: 'opie',
    status: 'busy',
    avatar: '🔧',
    color: '#10B981', // green
    activeSessions: 2,
    currentTask: 'Building Organization Chart feature',
    agentIds: ['code'],
  },
  {
    id: 'atlas',
    name: 'ATLAS',
    title: 'Research Director',
    role: 'Research Lead',
    model: 'Claude Sonnet 4',
    costPer1M: 3,
    skills: ['Research', 'Analysis', 'Data Science', 'Market Intelligence'],
    reportsTo: 'opie',
    status: 'active',
    avatar: '🔍',
    color: '#3B82F6', // blue
    activeSessions: 1,
    agentIds: ['research', 'analyst'],
  },
  {
    id: 'glint',
    name: 'GLINT',
    title: 'Communications Lead',
    role: 'Content & Comms',
    model: 'Claude Sonnet 4',
    costPer1M: 3,
    skills: ['Content Creation', 'Marketing', 'LinkedIn', 'Copywriting'],
    reportsTo: 'opie',
    status: 'idle',
    avatar: '✨',
    color: '#F59E0B', // orange
    activeSessions: 0,
    agentIds: ['content', 'outreach'],
  },
  {
    id: 'spark',
    name: 'SPARK',
    title: 'Operations Associate',
    role: 'Quick Tasks & Support',
    model: 'Kimi K2.5',
    costPer1M: 0,
    skills: ['Quick Tasks', 'Support', 'Documentation', 'Maintenance'],
    reportsTo: 'opie',
    status: 'active',
    avatar: '⚡',
    color: '#06B6D4', // cyan
    activeSessions: 1,
    agentIds: ['qa', 'sales', 'proposal'],
  },
  {
    id: 'elon',
    name: 'ELON',
    title: 'Chief Technology Officer',
    role: 'CTO — Infra & Systems',
    model: 'Claude Sonnet 4.5',
    costPer1M: 3,
    skills: ['Infrastructure', 'Plugins', 'Crons', 'Gateway', 'Security'],
    reportsTo: 'opie',
    status: 'active',
    avatar: '🚀',
    color: '#06b6d4',
    agentIds: ['ops-guardian', 'analyst'],
  },
  {
    id: 'gary',
    name: 'GARY',
    title: 'Chief Marketing Officer',
    role: 'CMO — Marketing & Content',
    model: 'Claude Sonnet 4.5',
    costPer1M: 3,
    skills: ['Marketing', 'Brand Voice', 'Social', 'Copy', 'Content Strategy'],
    reportsTo: 'opie',
    status: 'idle',
    avatar: '📣',
    color: '#f97316',
    agentIds: ['content-writer', 'analyst'],
  },
  {
    id: 'warren',
    name: 'WARREN',
    title: 'Chief Revenue Officer',
    role: 'CRO — Revenue & Deals',
    model: 'Claude Sonnet 4.5',
    costPer1M: 3,
    skills: ['Revenue', 'Pipeline', 'Outreach', 'Deal Closing', 'Lead Scoring'],
    reportsTo: 'opie',
    status: 'active',
    avatar: '💰',
    color: '#22c55e',
    agentIds: ['scout', 'outreach', 'call-debrief'],
  },
  {
    id: 'ops-guardian-node',
    name: 'OPS GUARDIAN',
    title: 'Infrastructure Agent',
    role: 'File Ops & Config',
    model: 'Kimi K2.5',
    costPer1M: 0,
    skills: ['File Operations', 'Config Management', 'Infra Changes'],
    reportsTo: 'elon',
    status: 'idle',
    avatar: '🛡️',
    color: '#0ea5e9',
    agentIds: ['ops-guardian'],
  },
  {
    id: 'analyst-node',
    name: 'ANALYST',
    title: 'Research & Analysis Agent',
    role: 'Data & Monitoring',
    model: 'Kimi K2.5',
    costPer1M: 0,
    skills: ['Research', 'Monitoring', 'Deep Dives', 'Reports'],
    reportsTo: 'elon',
    status: 'idle',
    avatar: '📊',
    color: '#6366f1',
    agentIds: ['analyst', 'research'],
  },
  {
    id: 'content-writer-node',
    name: 'CONTENT WRITER',
    title: 'Content Creation Agent',
    role: 'Copy & Social Posts',
    model: 'Kimi K2.5',
    costPer1M: 0,
    skills: ['Emails', 'Copy', 'Social Posts', 'Scripts', 'Brand Voice'],
    reportsTo: 'gary',
    status: 'idle',
    avatar: '✍️',
    color: '#f59e0b',
    agentIds: ['content-writer'],
  },
  {
    id: 'scout-node',
    name: 'SCOUT',
    title: 'Lead Generation Agent',
    role: 'Job Board Scraping',
    model: 'Kimi K2.5',
    costPer1M: 0,
    skills: ['Lead Generation', 'Job Boards', 'Prospect Research'],
    reportsTo: 'warren',
    status: 'idle',
    avatar: '🔍',
    color: '#34d399',
    agentIds: ['scout'],
  },
  {
    id: 'outreach-node',
    name: 'OUTREACH',
    title: 'Email Outreach Agent',
    role: 'Cold/Warm Sequences',
    model: 'Kimi K2.5',
    costPer1M: 0,
    skills: ['Cold Email', 'Warm Sequences', 'Follow-ups'],
    reportsTo: 'warren',
    status: 'idle',
    avatar: '📧',
    color: '#8b5cf6',
    agentIds: ['outreach'],
  },
  {
    id: 'call-debrief-node',
    name: 'CALL DEBRIEF',
    title: 'Call Analysis Agent',
    role: 'Transcript Analysis',
    model: 'Kimi K2.5',
    costPer1M: 0,
    skills: ['Call Transcripts', 'Lead Scoring', 'Follow-up Actions'],
    reportsTo: 'warren',
    status: 'idle',
    avatar: '📞',
    color: '#ec4899',
    agentIds: ['call-debrief'],
  }
  // ── DEPARTMENT HEADS (under Opie) ──────────────────────────────────────────
  {
    id: 'elon',
    name: 'ELON',
    title: 'Chief Technology Officer',
    role: 'CTO — Infra & Systems',
    model: 'Claude Sonnet 4.5',
    costPer1M: 3,
    avatar: '🚀',
    color: '#06b6d4',
    skills: ['Infrastructure', 'Plugins', 'Crons', 'Gateway', 'Security'],
    agentIds: ['ops-guardian', 'analyst'],
    status: 'active',
    reportsTo: 'opie',
  },
  {
    id: 'gary',
    name: 'GARY',
    title: 'Chief Marketing Officer',
    role: 'CMO — Marketing & Content',
    model: 'Claude Sonnet 4.5',
    costPer1M: 3,
    avatar: '📣',
    color: '#f97316',
    skills: ['Marketing', 'Brand Voice', 'Social', 'Copy', 'Content Strategy'],
    agentIds: ['content-writer', 'analyst'],
    status: 'idle',
    reportsTo: 'opie',
  },
  {
    id: 'warren',
    name: 'WARREN',
    title: 'Chief Revenue Officer',
    role: 'CRO — Revenue & Deals',
    model: 'Claude Sonnet 4.5',
    costPer1M: 3,
    avatar: '💰',
    color: '#22c55e',
    skills: ['Revenue', 'Pipeline', 'Outreach', 'Deal Closing', 'Lead Scoring'],
    agentIds: ['scout', 'outreach', 'call-debrief'],
    status: 'active',
    reportsTo: 'opie',
  },
  // ── WORKERS under Elon ───────────────────────────────────────────────────
  {
    id: 'ops-guardian-node',
    name: 'OPS GUARDIAN',
    title: 'Infrastructure Agent',
    role: 'File Ops & Config',
    model: 'Kimi K2.5',
    costPer1M: 0,
    avatar: '🛡️',
    color: '#0ea5e9',
    skills: ['File Operations', 'Config Management', 'Infra Changes'],
    agentIds: ['ops-guardian'],
    status: 'idle',
    reportsTo: 'elon',
  },
  {
    id: 'analyst-node',
    name: 'ANALYST',
    title: 'Research & Analysis Agent',
    role: 'Data & Monitoring',
    model: 'Kimi K2.5',
    costPer1M: 0,
    avatar: '📊',
    color: '#6366f1',
    skills: ['Research', 'Monitoring', 'Deep Dives', 'Reports'],
    agentIds: ['analyst', 'research'],
    status: 'idle',
    reportsTo: 'elon',
  },
  // ── WORKERS under Gary ───────────────────────────────────────────────────
  {
    id: 'content-writer-node',
    name: 'CONTENT WRITER',
    title: 'Content Creation Agent',
    role: 'Copy & Social Posts',
    model: 'Kimi K2.5',
    costPer1M: 0,
    avatar: '✍️',
    color: '#f59e0b',
    skills: ['Emails', 'Copy', 'Social Posts', 'Scripts', 'Brand Voice'],
    agentIds: ['content-writer'],
    status: 'idle',
    reportsTo: 'gary',
  },
  // ── WORKERS under Warren ─────────────────────────────────────────────────
  {
    id: 'scout-node',
    name: 'SCOUT',
    title: 'Lead Generation Agent',
    role: 'Job Board Scraping',
    model: 'Kimi K2.5',
    costPer1M: 0,
    avatar: '🔍',
    color: '#34d399',
    skills: ['Lead Generation', 'Job Boards', 'Prospect Research'],
    agentIds: ['scout'],
    status: 'idle',
    reportsTo: 'warren',
  },
  {
    id: 'outreach-node',
    name: 'OUTREACH',
    title: 'Email Outreach Agent',
    role: 'Cold/Warm Sequences',
    model: 'Kimi K2.5',
    costPer1M: 0,
    avatar: '📧',
    color: '#8b5cf6',
    skills: ['Cold Email', 'Warm Sequences', 'Follow-ups'],
    agentIds: ['outreach'],
    status: 'idle',
    reportsTo: 'warren',
  },
  {
    id: 'call-debrief-node',
    name: 'CALL DEBRIEF',
    title: 'Call Analysis Agent',
    role: 'Transcript Analysis',
    model: 'Kimi K2.5',
    costPer1M: 0,
    avatar: '📞',
    color: '#ec4899',
    skills: ['Call Transcripts', 'Lead Scoring', 'Follow-up Actions'],
    agentIds: ['call-debrief'],
    status: 'idle',
    reportsTo: 'warren',
  },
];

export function buildOrgTree(nodes: OrgNode[]): OrgNodeWithChildren[] {
  const nodeMap = new Map<string, OrgNodeWithChildren>();
  
  nodes.forEach(node => {
    nodeMap.set(node.id, { ...node, children: [] });
  });
  
  const roots: OrgNodeWithChildren[] = [];
  
  nodes.forEach(node => {
    const nodeWithChildren = nodeMap.get(node.id)!;
    if (node.reportsTo) {
      const parent = nodeMap.get(node.reportsTo);
      if (parent) {
        parent.children.push(nodeWithChildren);
      }
    } else {
      roots.push(nodeWithChildren);
    }
  });
  
  return roots;
}

export function getStatusIndicator(status: OrgNode['status']): string {
  switch (status) {
    case 'active': return '🟢';
    case 'busy': return '🟡';
    case 'talking': return '💬';
    case 'working': return '⚙️';
    case 'thinking': return '🧠';
    case 'idle': return '⚪';
    default: return '⚪';
  }
}

export function getStatusColor(status: OrgNode['status']): string {
  switch (status) {
    case 'active': return '#10B981';
    case 'busy': return '#F59E0B';
    case 'talking': return '#A78BFA';
    case 'working': return '#3B82F6';
    case 'thinking': return '#8B5CF6';
    case 'idle': return '#6B7280';
    default: return '#6B7280';
  }
}
