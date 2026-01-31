'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import {
  TaskResult,
  TaskType,
  AgentPerformanceStats,
  LeaderboardState,
  AgentSuggestion,
  TASK_TYPES,
  classifyTaskType,
  calculateAgentScore,
  PERFORMANCE_STORAGE_KEY,
  MAX_HISTORY_ITEMS,
} from '../lib/performanceTypes';

// Agent metadata for display
const AGENT_META: Record<string, { name: string; emoji: string }> = {
  research: { name: 'Research', emoji: '🔍' },
  code: { name: 'Code', emoji: '💻' },
  content: { name: 'Content', emoji: '✍️' },
  proposal: { name: 'Proposal', emoji: '📝' },
  sales: { name: 'Sales', emoji: '💰' },
  analyst: { name: 'Analyst', emoji: '📊' },
  qa: { name: 'QA', emoji: '✅' },
  outreach: { name: 'Outreach', emoji: '📧' },
};

interface AgentPerformanceContextType {
  // Task results
  taskResults: TaskResult[];
  recordTaskResult: (result: Omit<TaskResult, 'id'>) => void;
  rateTask: (taskId: string, rating: 1 | 2 | 3 | 4 | 5, feedback?: string) => void;

  // Leaderboard
  leaderboard: LeaderboardState;
  refreshLeaderboard: () => void;

  // Suggestions
  suggestBestAgent: (taskDescription: string) => AgentSuggestion;

  // Stats for specific agent
  getAgentStats: (agentId: string) => AgentPerformanceStats | null;

  // Clear data
  clearHistory: () => void;
}

const AgentPerformanceContext = createContext<AgentPerformanceContextType | undefined>(undefined);

function generateId(): string {
  return `task-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function createEmptyTaskTypeStats(): Record<TaskType, { count: number; successRate: number; avgTime: number; avgTokens: number }> {
  const stats: Record<string, { count: number; successRate: number; avgTime: number; avgTokens: number }> = {};
  for (const type of TASK_TYPES) {
    stats[type] = { count: 0, successRate: 0, avgTime: 0, avgTokens: 0 };
  }
  return stats as Record<TaskType, { count: number; successRate: number; avgTime: number; avgTokens: number }>;
}

function calculateLeaderboard(results: TaskResult[]): LeaderboardState {
  // Group results by agent
  const agentResults: Record<string, TaskResult[]> = {};
  for (const result of results) {
    if (!agentResults[result.agentId]) {
      agentResults[result.agentId] = [];
    }
    agentResults[result.agentId].push(result);
  }

  // Calculate stats for each agent
  const agentStats: AgentPerformanceStats[] = [];

  for (const [agentId, agentTasks] of Object.entries(agentResults)) {
    const meta = AGENT_META[agentId] || { name: agentId, emoji: '🤖' };
    const successCount = agentTasks.filter(t => t.success).length;
    const totalTasks = agentTasks.length;
    const successRate = totalTasks > 0 ? (successCount / totalTasks) * 100 : 0;

    const durations = agentTasks.map(t => t.duration);
    const tokens = agentTasks.map(t => t.tokensUsed);

    const avgCompletionTime = durations.length > 0
      ? durations.reduce((a, b) => a + b, 0) / durations.length
      : 0;
    const fastestTime = durations.length > 0 ? Math.min(...durations) : 0;
    const slowestTime = durations.length > 0 ? Math.max(...durations) : 0;
    const avgTokensPerTask = tokens.length > 0
      ? tokens.reduce((a, b) => a + b, 0) / tokens.length
      : 0;
    const totalTokensUsed = tokens.reduce((a, b) => a + b, 0);

    // Calculate task type stats
    const taskTypeStats = createEmptyTaskTypeStats();
    for (const type of TASK_TYPES) {
      const typeTasks = agentTasks.filter(t => t.taskType === type);
      if (typeTasks.length > 0) {
        const typeSuccess = typeTasks.filter(t => t.success).length;
        taskTypeStats[type] = {
          count: typeTasks.length,
          successRate: (typeSuccess / typeTasks.length) * 100,
          avgTime: typeTasks.reduce((a, t) => a + t.duration, 0) / typeTasks.length,
          avgTokens: typeTasks.reduce((a, t) => a + t.tokensUsed, 0) / typeTasks.length,
        };
      }
    }

    // Calculate trend (compare last 5 tasks to previous 5)
    const sortedTasks = [...agentTasks].sort(
      (a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
    );
    const recentTasks = sortedTasks.slice(0, 5);
    const olderTasks = sortedTasks.slice(5, 10);

    let recentTrend: 'improving' | 'stable' | 'declining' = 'stable';
    if (recentTasks.length >= 3 && olderTasks.length >= 3) {
      const recentSuccessRate = recentTasks.filter(t => t.success).length / recentTasks.length;
      const olderSuccessRate = olderTasks.filter(t => t.success).length / olderTasks.length;
      if (recentSuccessRate > olderSuccessRate + 0.1) recentTrend = 'improving';
      else if (recentSuccessRate < olderSuccessRate - 0.1) recentTrend = 'declining';
    }

    const baseStats = {
      agentId,
      agentName: meta.name,
      agentEmoji: meta.emoji,
      totalTasks,
      successCount,
      failureCount: totalTasks - successCount,
      successRate,
      avgCompletionTime,
      fastestTime,
      slowestTime,
      avgTokensPerTask,
      totalTokensUsed,
      taskTypeStats,
      recentTrend,
    };

    agentStats.push({
      ...baseStats,
      rank: 0, // Will be set after sorting
      score: calculateAgentScore(baseStats),
    });
  }

  // Sort by score and assign ranks
  agentStats.sort((a, b) => b.score - a.score);
  agentStats.forEach((agent, index) => {
    agent.rank = index + 1;
  });

  // Find best performer for each task type
  const bestByTaskType: Record<TaskType, string | null> = {} as Record<TaskType, string | null>;
  for (const type of TASK_TYPES) {
    let bestAgentId: string | null = null;
    let bestScore = -1;

    for (const agent of agentStats) {
      const typeStats = agent.taskTypeStats[type];
      if (typeStats.count >= 2) { // Require at least 2 tasks for this type
        const typeScore = typeStats.successRate * (typeStats.count / 10); // Weight by volume
        if (typeScore > bestScore) {
          bestScore = typeScore;
          bestAgentId = agent.agentId;
        }
      }
    }

    bestByTaskType[type] = bestAgentId;
  }

  return {
    agents: agentStats,
    lastUpdated: new Date().toISOString(),
    totalTasks: results.length,
    topPerformer: agentStats.length > 0 ? agentStats[0].agentId : null,
    bestByTaskType,
  };
}

export function AgentPerformanceProvider({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const [taskResults, setTaskResults] = useState<TaskResult[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardState>({
    agents: [],
    lastUpdated: new Date().toISOString(),
    totalTasks: 0,
    topPerformer: null,
    bestByTaskType: {} as Record<TaskType, string | null>,
  });

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(PERFORMANCE_STORAGE_KEY);
      if (saved) {
        const results = JSON.parse(saved) as TaskResult[];
        setTaskResults(results);
        setLeaderboard(calculateLeaderboard(results));
      }
    } catch (e) {
      console.error('Failed to load performance data:', e);
    }
    setMounted(true);
  }, []);

  // Persist task results
  useEffect(() => {
    if (mounted && taskResults.length > 0) {
      // Keep only recent results
      const trimmed = taskResults.slice(-MAX_HISTORY_ITEMS);
      localStorage.setItem(PERFORMANCE_STORAGE_KEY, JSON.stringify(trimmed));
    }
  }, [taskResults, mounted]);

  // Record a task result
  const recordTaskResult = useCallback((result: Omit<TaskResult, 'id'>) => {
    const newResult: TaskResult = {
      ...result,
      id: generateId(),
    };

    setTaskResults(prev => {
      const updated = [...prev, newResult];
      // Recalculate leaderboard
      setLeaderboard(calculateLeaderboard(updated));
      return updated;
    });
  }, []);

  // Rate a task
  const rateTask = useCallback((taskId: string, rating: 1 | 2 | 3 | 4 | 5, feedback?: string) => {
    setTaskResults(prev => {
      const updated = prev.map(t =>
        t.id === taskId ? { ...t, userRating: rating, feedback } : t
      );
      return updated;
    });
  }, []);

  // Refresh leaderboard
  const refreshLeaderboard = useCallback(() => {
    setLeaderboard(calculateLeaderboard(taskResults));
  }, [taskResults]);

  // Suggest best agent for a task
  const suggestBestAgent = useCallback((taskDescription: string): AgentSuggestion => {
    const taskType = classifyTaskType(taskDescription);

    // Look for best performer for this task type
    const bestForType = leaderboard.bestByTaskType[taskType];

    if (bestForType) {
      const agentStats = leaderboard.agents.find(a => a.agentId === bestForType);
      if (agentStats) {
        const typeStats = agentStats.taskTypeStats[taskType];
        return {
          agentId: bestForType,
          agentName: agentStats.agentName,
          agentEmoji: agentStats.agentEmoji,
          confidence: Math.min(100, typeStats.successRate * (typeStats.count / 5)),
          reason: `Best performer for ${taskType} tasks (${typeStats.successRate.toFixed(0)}% success rate across ${typeStats.count} tasks)`,
          alternativeAgentIds: leaderboard.agents
            .filter(a => a.agentId !== bestForType && a.taskTypeStats[taskType].count > 0)
            .slice(0, 2)
            .map(a => a.agentId),
        };
      }
    }

    // Fall back to overall top performer
    if (leaderboard.topPerformer) {
      const topAgent = leaderboard.agents.find(a => a.agentId === leaderboard.topPerformer);
      if (topAgent) {
        return {
          agentId: leaderboard.topPerformer,
          agentName: topAgent.agentName,
          agentEmoji: topAgent.agentEmoji,
          confidence: 50,
          reason: `Top overall performer (${topAgent.successRate.toFixed(0)}% success rate)`,
          alternativeAgentIds: leaderboard.agents
            .filter(a => a.agentId !== leaderboard.topPerformer)
            .slice(0, 2)
            .map(a => a.agentId),
        };
      }
    }

    // Fall back to role-based suggestion
    const roleMatch: Record<TaskType, string> = {
      research: 'research',
      writing: 'content',
      coding: 'code',
      analysis: 'analyst',
      outreach: 'outreach',
      proposal: 'proposal',
      review: 'qa',
      other: 'research',
    };

    const suggestedId = roleMatch[taskType];
    const meta = AGENT_META[suggestedId] || { name: 'Research', emoji: '🔍' };

    return {
      agentId: suggestedId,
      agentName: meta.name,
      agentEmoji: meta.emoji,
      confidence: 30,
      reason: `Matched by task type: "${taskType}"`,
      alternativeAgentIds: [],
    };
  }, [leaderboard]);

  // Get stats for specific agent
  const getAgentStats = useCallback((agentId: string): AgentPerformanceStats | null => {
    return leaderboard.agents.find(a => a.agentId === agentId) || null;
  }, [leaderboard]);

  // Clear history
  const clearHistory = useCallback(() => {
    setTaskResults([]);
    setLeaderboard({
      agents: [],
      lastUpdated: new Date().toISOString(),
      totalTasks: 0,
      topPerformer: null,
      bestByTaskType: {} as Record<TaskType, string | null>,
    });
    localStorage.removeItem(PERFORMANCE_STORAGE_KEY);
  }, []);

  // Prevent flash during hydration
  if (!mounted) {
    return <>{children}</>;
  }

  return (
    <AgentPerformanceContext.Provider
      value={{
        taskResults,
        recordTaskResult,
        rateTask,
        leaderboard,
        refreshLeaderboard,
        suggestBestAgent,
        getAgentStats,
        clearHistory,
      }}
    >
      {children}
    </AgentPerformanceContext.Provider>
  );
}

export function useAgentPerformance() {
  const context = useContext(AgentPerformanceContext);
  if (!context) {
    // Return safe defaults for SSR or when provider is missing
    return {
      taskResults: [],
      recordTaskResult: () => {},
      rateTask: () => {},
      leaderboard: {
        agents: [],
        lastUpdated: new Date().toISOString(),
        totalTasks: 0,
        topPerformer: null,
        bestByTaskType: {} as Record<TaskType, string | null>,
      },
      refreshLeaderboard: () => {},
      suggestBestAgent: () => ({
        agentId: 'research',
        agentName: 'Research',
        agentEmoji: '🔍',
        confidence: 0,
        reason: 'Default suggestion',
        alternativeAgentIds: [],
      }),
      getAgentStats: () => null,
      clearHistory: () => {},
    };
  }
  return context;
}
