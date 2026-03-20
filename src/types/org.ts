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
  // ── TOP ─────────────────────────────────────────────────────────────────────
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
    color: '#FFD700',
  },
  {
    id: 'opie',
    name: 'OPIE (G)',
    title: 'Chief Operations Officer',
    role: 'COO — Orchestrator',
    model: 'Claude Opus 4-6',
    costPer1M: 15,
    skills: ['Orchestration', 'Coordination', 'Strategy', 'All Departments'],
    reportsTo: 'wes',
    status: 'busy',
    avatar: '🤖',
    color: '#9333EA',
    activeSessions: 3,
    currentTask: 'Coordinating agent deployment',
    agentIds: ['*'],
  },
  // ── DEPARTMENT HEADS ────────────────────────────────────────────────────────
  {
    id: 'elon',
    name: 'ELON',
    title: 'Chief Technology Officer',
    role: 'CTO — Infra & Systems',
    model: 'Claude Opus 4-6',
    costPer1M: 15,
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
    model: 'Claude Opus 4-6',
    costPer1M: 15,
    skills: ['Marketing', 'Brand Voice', 'Social', 'Copy', 'Content Strategy'],
    reportsTo: 'opie',
    status: 'idle',
    avatar: '📣',
    color: '#f97316',
    agentIds: ['content-writer'],
  },
  {
    id: 'mark',
    name: 'MARK',
    title: 'Chief Revenue Officer',
    role: 'CRO — Revenue & Deals',
    model: 'Claude Opus 4-6',
    costPer1M: 15,
    skills: ['Revenue', 'Pipeline', 'Outreach', 'Deal Closing', 'Lead Scoring'],
    reportsTo: 'opie',
    status: 'active',
    avatar: '💰',
    color: '#22c55e',
    agentIds: ['scout', 'outreach', 'call-debrief'],
  },
  // ── MORE C-SUITE ────────────────────────────────────────────────────────────
  {
    id: 'ray',
    name: 'RAY',
    title: 'Chief Financial Officer',
    role: 'CFO — Finance & Cost',
    model: 'Claude Opus 4-6',
    costPer1M: 15,
    skills: ['Cost Tracking', 'Budget', 'ROI Analysis', 'Spend Optimization'],
    reportsTo: 'opie',
    status: 'idle',
    avatar: '📊',
    color: '#8b5cf6',
    agentIds: ['ray'],
  },
  {
    id: 'tim',
    name: 'TIM',
    title: 'Chief Operations Officer',
    role: 'COO — Process & Ops',
    model: 'Claude Opus 4-6',
    costPer1M: 15,
    skills: ['Operations', 'Process Design', 'Efficiency', 'KPIs'],
    reportsTo: 'opie',
    status: 'idle',
    avatar: '⚙️',
    color: '#64748b',
    agentIds: ['tim'],
  },
  {
    id: 'steve',
    name: 'STEVE',
    title: 'Chief Product Officer',
    role: 'CPO — Product & Roadmap',
    model: 'Claude Opus 4-6',
    costPer1M: 15,
    skills: ['Product Strategy', 'Feature Prioritization', 'UX', 'Roadmap'],
    reportsTo: 'opie',
    status: 'idle',
    avatar: '🎯',
    color: '#e11d48',
    agentIds: ['steve'],
  },
  {
    id: 'pepper',
    name: 'PEPPER',
    title: 'Chief of Staff',
    role: 'CoS — Coordination & Scheduling',
    model: 'Claude Opus 4-6',
    costPer1M: 15,
    skills: ['Scheduling', 'Delegation', 'Follow-ups', 'Coordination'],
    reportsTo: 'opie',
    status: 'idle',
    avatar: '🌶️',
    color: '#dc2626',
    agentIds: ['pepper'],
  },
  // ── WORKERS UNDER ELON ──────────────────────────────────────────────────────
  {
    id: 'ops-guardian-node',
    name: 'OPS GUARDIAN',
    title: 'Infrastructure Agent',
    role: 'File Ops & Config',
    model: 'MiniMax M2.7',
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
    model: 'MiniMax M2.7',
    costPer1M: 0,
    skills: ['Research', 'Monitoring', 'Deep Dives', 'Reports'],
    reportsTo: 'elon',
    status: 'idle',
    avatar: '📊',
    color: '#6366f1',
    agentIds: ['analyst', 'research'],
  },
  {
    id: 'memory-curator-node',
    name: 'MEMORY CURATOR',
    title: 'Memory & Continuity Agent',
    role: 'Recall Validation',
    model: 'MiniMax M2.7',
    costPer1M: 0,
    skills: ['Memory Validation', 'Recall Testing', 'Continuity', 'Summaries'],
    reportsTo: 'elon',
    status: 'idle',
    avatar: '🧠',
    color: '#ec4899',
    agentIds: ['memory-curator'],
  },
  // ── WORKERS UNDER GARY ──────────────────────────────────────────────────────
  {
    id: 'content-writer-node',
    name: 'CONTENT WRITER',
    title: 'Content Creation Agent',
    role: 'Copy & Social Posts',
    model: 'MiniMax M2.7',
    costPer1M: 0,
    skills: ['Emails', 'Copy', 'Social Posts', 'Scripts', 'Brand Voice'],
    reportsTo: 'gary',
    status: 'idle',
    avatar: '✍️',
    color: '#f59e0b',
    agentIds: ['content-writer'],
  },
  // ── WORKERS UNDER WARREN ────────────────────────────────────────────────────
  {
    id: 'scout-node',
    name: 'SCOUT',
    title: 'Lead Generation Agent',
    role: 'Job Board Scraping',
    model: 'MiniMax M2.7',
    costPer1M: 0,
    skills: ['Lead Generation', 'Job Boards', 'Prospect Research'],
    reportsTo: 'mark',
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
    model: 'MiniMax M2.7',
    costPer1M: 0,
    skills: ['Cold Email', 'Warm Sequences', 'Follow-ups'],
    reportsTo: 'mark',
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
    model: 'MiniMax M2.7',
    costPer1M: 0,
    skills: ['Call Transcripts', 'Lead Scoring', 'Follow-up Actions'],
    reportsTo: 'mark',
    status: 'idle',
    avatar: '📞',
    color: '#ec4899',
    agentIds: ['call-debrief'],
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
