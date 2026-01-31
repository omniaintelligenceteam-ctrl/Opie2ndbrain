// Context Window Visualizer Types

export type ContextSegmentType = 'system_prompt' | 'memory' | 'conversation' | 'tool_calls' | 'other';

export interface ContextSegment {
  id: string;
  type: ContextSegmentType;
  label: string;
  tokenCount: number;
  percentage: number;
  content?: string;          // Preview text (truncated)
  canForget: boolean;        // Whether user can remove this
  timestamp?: string;
  metadata?: Record<string, unknown>;
}

export interface ContextWindowState {
  used: number;
  total: number;
  percentage: number;
  segments: ContextSegment[];
  lastUpdated: string;
  warningLevel: 'normal' | 'warning' | 'critical';
}

export interface ContextAction {
  type: 'forget' | 'pin' | 'summarize';
  segmentId: string;
}

// Colors for pie chart (Aurora theme)
export const CONTEXT_COLORS: Record<ContextSegmentType, string> = {
  system_prompt: '#667eea',    // accent blue
  memory: '#a855f7',           // purple
  conversation: '#22c55e',     // green
  tool_calls: '#f59e0b',       // orange/warning
  other: '#6b7280',            // gray
};

// Labels for UI
export const CONTEXT_LABELS: Record<ContextSegmentType, string> = {
  system_prompt: 'System Prompt',
  memory: 'Memory',
  conversation: 'Conversation',
  tool_calls: 'Tool Calls',
  other: 'Other',
};

// Icons for segment types
export const CONTEXT_ICONS: Record<ContextSegmentType, string> = {
  system_prompt: '⚙️',
  memory: '🧠',
  conversation: '💬',
  tool_calls: '🔧',
  other: '📦',
};

// Warning thresholds
export const CONTEXT_THRESHOLDS = {
  warning: 70,    // Show warning at 70%
  critical: 90,   // Show critical at 90%
};

// Calculate warning level from percentage
export function getWarningLevel(percentage: number): ContextWindowState['warningLevel'] {
  if (percentage >= CONTEXT_THRESHOLDS.critical) return 'critical';
  if (percentage >= CONTEXT_THRESHOLDS.warning) return 'warning';
  return 'normal';
}

// Format token count for display
export function formatTokenCount(tokens: number): string {
  if (tokens >= 1000) {
    return `${(tokens / 1000).toFixed(1)}k`;
  }
  return tokens.toString();
}

// Default empty state
export const EMPTY_CONTEXT_STATE: ContextWindowState = {
  used: 0,
  total: 128000,  // Default context window size
  percentage: 0,
  segments: [],
  lastUpdated: new Date().toISOString(),
  warningLevel: 'normal',
};

// Mock segments for demo/development
export const DEMO_SEGMENTS: ContextSegment[] = [
  {
    id: 'system-1',
    type: 'system_prompt',
    label: 'Base System Prompt',
    tokenCount: 1200,
    percentage: 0,
    canForget: false,
    content: 'You are Opie, an AI assistant...',
  },
  {
    id: 'memory-1',
    type: 'memory',
    label: 'User Preferences',
    tokenCount: 450,
    percentage: 0,
    canForget: true,
    content: 'User prefers concise responses...',
  },
  {
    id: 'memory-2',
    type: 'memory',
    label: 'Recent Context',
    tokenCount: 800,
    percentage: 0,
    canForget: true,
    content: 'Working on dashboard improvements...',
  },
  {
    id: 'conv-1',
    type: 'conversation',
    label: 'Current Conversation',
    tokenCount: 2100,
    percentage: 0,
    canForget: true,
    content: 'User asked about new features...',
  },
  {
    id: 'tools-1',
    type: 'tool_calls',
    label: 'Tool Results',
    tokenCount: 350,
    percentage: 0,
    canForget: true,
    content: 'Search results for...',
  },
];
