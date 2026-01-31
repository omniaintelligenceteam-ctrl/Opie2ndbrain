// Agent Leaderboard & Performance Tracking Types

export const TASK_TYPES = [
  'research',
  'writing',
  'coding',
  'analysis',
  'outreach',
  'proposal',
  'review',
  'other',
] as const;

export type TaskType = typeof TASK_TYPES[number];

export interface TaskResult {
  id: string;
  agentId: string;
  agentName: string;
  taskType: TaskType;
  taskDescription: string;
  success: boolean;
  startedAt: string;
  completedAt: string;
  duration: number;          // ms
  tokensUsed: number;
  userRating?: 1 | 2 | 3 | 4 | 5;
  feedback?: string;
}

export interface TaskTypeStats {
  count: number;
  successRate: number;
  avgTime: number;
  avgTokens: number;
}

export interface AgentPerformanceStats {
  agentId: string;
  agentName: string;
  agentEmoji: string;

  // Overall stats
  totalTasks: number;
  successCount: number;
  failureCount: number;
  successRate: number;       // percentage 0-100

  // Timing
  avgCompletionTime: number; // ms
  fastestTime: number;
  slowestTime: number;

  // Efficiency
  avgTokensPerTask: number;
  totalTokensUsed: number;

  // By task type
  taskTypeStats: Record<TaskType, TaskTypeStats>;

  // Trend (calculated from recent tasks)
  recentTrend: 'improving' | 'stable' | 'declining';

  // Ranking
  rank: number;
  score: number;             // Composite score 0-100
}

export interface LeaderboardState {
  agents: AgentPerformanceStats[];
  lastUpdated: string;
  totalTasks: number;
  topPerformer: string | null;
  bestByTaskType: Record<TaskType, string | null>;
}

export interface AgentSuggestion {
  agentId: string;
  agentName: string;
  agentEmoji: string;
  confidence: number;        // 0-100
  reason: string;
  alternativeAgentIds: string[];
}

// Task type classification keywords
export const TASK_TYPE_KEYWORDS: Record<TaskType, string[]> = {
  research: ['research', 'find', 'search', 'investigate', 'look up', 'discover', 'explore', 'learn about'],
  writing: ['write', 'draft', 'compose', 'create content', 'blog', 'article', 'copy', 'text'],
  coding: ['code', 'program', 'develop', 'build', 'implement', 'fix bug', 'debug', 'script', 'function'],
  analysis: ['analyze', 'analyse', 'review data', 'report', 'metrics', 'insights', 'breakdown', 'evaluate'],
  outreach: ['email', 'reach out', 'contact', 'message', 'follow up', 'communicate', 'respond'],
  proposal: ['proposal', 'estimate', 'quote', 'pitch', 'bid', 'scope', 'plan project'],
  review: ['review', 'check', 'proofread', 'qa', 'test', 'verify', 'validate', 'audit'],
  other: [],
};

// Classify task type from description
export function classifyTaskType(description: string): TaskType {
  const lower = description.toLowerCase();

  for (const [taskType, keywords] of Object.entries(TASK_TYPE_KEYWORDS)) {
    if (taskType === 'other') continue;
    for (const keyword of keywords) {
      if (lower.includes(keyword)) {
        return taskType as TaskType;
      }
    }
  }

  return 'other';
}

// Calculate composite score for ranking
export function calculateAgentScore(stats: Omit<AgentPerformanceStats, 'rank' | 'score'>): number {
  if (stats.totalTasks === 0) return 0;

  // Weighted scoring:
  // - Success rate: 40%
  // - Speed (normalized): 20%
  // - Efficiency (tokens, normalized): 20%
  // - Volume bonus: 20%

  const successScore = stats.successRate * 0.4;

  // Speed score (faster = better, normalize to 0-100)
  // Assume avg task is ~30 seconds, cap at 5 minutes
  const avgTimeSeconds = stats.avgCompletionTime / 1000;
  const speedScore = Math.max(0, 100 - (avgTimeSeconds / 3)) * 0.2;

  // Efficiency score (fewer tokens = better for same output)
  // Assume avg is ~1000 tokens, lower is better
  const efficiencyScore = Math.max(0, 100 - (stats.avgTokensPerTask / 50)) * 0.2;

  // Volume bonus (more tasks = more reliable stats)
  const volumeScore = Math.min(100, stats.totalTasks * 5) * 0.2;

  return Math.round(successScore + speedScore + efficiencyScore + volumeScore);
}

// Storage constants
export const PERFORMANCE_STORAGE_KEY = 'opie-agent-performance';
export const MAX_HISTORY_ITEMS = 500;
