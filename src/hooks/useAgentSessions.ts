'use client';
import { useSidebarData, useSidebarSessions, AgentSession, SidebarStats } from './useSidebarData';
import { AgentNodeState } from '@/lib/agentMapping';

// Re-export types for backward compatibility
export type { AgentSession } from './useSidebarData';

export interface AgentSessionsState {
  sessions: AgentSession[];
  nodes: AgentNodeState[];
  activeAgentIds: string[];
  activeCount: number;
  totalSessions: number;
  loading: boolean;
  error: string | null;
  lastUpdated: string | null;
  gatewayConnected: boolean;
  source: 'gateway' | 'cache' | 'empty' | 'sse';
  connectionType: 'sse' | 'polling' | 'none';
}

/**
 * Hook for agent sessions - now uses the unified sidebar SSE stream
 * Maintains backward compatibility with existing components
 */
export function useAgentSessions(pollInterval = 5000, enabled = true) {
  const {
    sessions,
    nodes,
    stats,
    gateway,
    loading,
    error,
    lastUpdated,
    connectionType,
    source,
    refresh,
  } = useSidebarData(enabled);

  // Get active agent IDs from nodes
  const activeAgentIds = nodes
    .filter(n => n.status === 'working')
    .map(n => n.id);

  return {
    sessions,
    nodes,
    activeAgentIds,
    activeCount: stats.activeAgents,
    totalSessions: stats.totalAgents,
    loading,
    error,
    lastUpdated,
    gatewayConnected: gateway.connected,
    source: connectionType === 'sse' ? 'sse' as const : source,
    connectionType,
    refresh,
  };
}

/**
 * Simpler hook that just returns active agent IDs
 * Uses the shared sidebar SSE stream for real-time updates
 */
export function useActiveAgents(pollInterval = 5000, enabled = true) {
  const { 
    activeAgentIds, 
    activeCount, 
    loading, 
    error, 
    gatewayConnected, 
    connectionType,
    refresh,
  } = useAgentSessions(pollInterval, enabled);

  return {
    activeAgents: activeAgentIds,
    activeCount,
    loading,
    error,
    gatewayConnected,
    connectionType,
    refresh,
  };
}
