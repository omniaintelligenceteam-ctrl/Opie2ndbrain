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
  }
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
