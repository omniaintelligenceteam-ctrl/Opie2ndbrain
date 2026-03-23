// OIOS Agent Configuration
// Static config for the 10 OIOS (Omniscient Intelligent Operations System) agents

export interface OIOSAgent {
  id: string;
  name: string;
  role: string;
  model: 'opus' | 'sonnet' | 'deepseek' | 'minimax' | 'kimi';
  emoji: string;
  color: string;
  discordChannels: string[];
}

export const OIOS_AGENTS: OIOSAgent[] = [
  {
    id: 'g',
    name: 'G',
    role: 'Orchestrator/COO',
    model: 'opus',
    emoji: '\u{1F451}',  // crown
    color: 'teal',
    discordChannels: ['command-deck', 'alerts', 'daily-briefing'],
  },
  {
    id: 'nova',
    name: 'Nova',
    role: 'CMO/Marketing',
    model: 'sonnet',
    emoji: '\u{2728}',  // sparkles
    color: 'amber',
    discordChannels: ['content-lab', 'competitor-watch', 'lead-pipeline'],
  },
  {
    id: 'cipher',
    name: 'Cipher',
    role: 'CFO/Finance',
    model: 'deepseek',
    emoji: '\u{1F4B0}',  // money bag
    color: 'violet',
    discordChannels: ['finance-desk', 'revenue-reports', 'billing-alerts'],
  },
  {
    id: 'atlas',
    name: 'Atlas',
    role: 'Operations',
    model: 'deepseek',
    emoji: '\u{1F5FA}',  // world map
    color: 'blue',
    discordChannels: ['ops-dashboard', 'workflows', 'ops-log'],
  },
  {
    id: 'pulse',
    name: 'Pulse',
    role: 'IT/Systems',
    model: 'minimax',
    emoji: '\u{1F4A1}',  // light bulb
    color: 'green',
    discordChannels: ['system-health', 'security', 'devops'],
  },
  {
    id: 'echo',
    name: 'Echo',
    role: 'Research/BI',
    model: 'deepseek',
    emoji: '\u{1F50D}',  // magnifying glass
    color: 'cyan',
    discordChannels: ['research-lab', 'market-intel', 'insights'],
  },
  {
    id: 'haven',
    name: 'Haven',
    role: 'Client Success',
    model: 'kimi',
    emoji: '\u{1F91D}',  // handshake
    color: 'rose',
    discordChannels: ['client-hub', 'follow-ups', 'satisfaction'],
  },
  {
    id: 'scout',
    name: 'Scout',
    role: 'Reception',
    model: 'kimi',
    emoji: '\u{1F4E8}',  // envelope
    color: 'orange',
    discordChannels: ['incoming', 'appointments'],
  },
  {
    id: 'hunter',
    name: 'Hunter',
    role: 'Sales Prospecting',
    model: 'sonnet',
    emoji: '\u{1F3AF}',  // dart
    color: 'emerald',
    discordChannels: ['pipeline', 'outreach', 'pending-approval'],
  },
  {
    id: 'closer',
    name: 'Closer',
    role: 'Sales Closing',
    model: 'sonnet',
    emoji: '\u{1F525}',  // fire
    color: 'red',
    discordChannels: ['demos', 'proposals', 'closed-deals'],
  },
];

/**
 * Look up an OIOS agent by its lowercase id.
 * Returns undefined if not found.
 */
export function getAgentById(id: string): OIOSAgent | undefined {
  return OIOS_AGENTS.find((a) => a.id === id.toLowerCase());
}
