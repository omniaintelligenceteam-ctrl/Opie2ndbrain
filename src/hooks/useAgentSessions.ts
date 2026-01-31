'use client';
import { useState, useEffect, useCallback } from 'react';
import { mapSessionsToNodes, AgentNodeState, ALL_AGENT_IDS } from '@/lib/agentMapping';

export interface AgentSession {
  id: string;
  label: string;
  status: 'running' | 'complete' | 'failed' | 'idle';
  startedAt: string;
  runtime: string;
  tokens: {
    input: number;
    output: number;
    total: number;
  };
  model: string;
  error?: string;
}

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
  source: 'gateway' | 'cache' | 'empty';
}

const CACHE_KEY = 'opie-agent-sessions-cache';

export function useAgentSessions(pollInterval = 2000) {
  const [state, setState] = useState<AgentSessionsState>(() => {
    // Try to load cached data on initial render
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
          const parsed = JSON.parse(cached);
          return {
            ...parsed,
            loading: true,
            error: null,
            source: 'cache' as const,
          };
        }
      } catch {}
    }
    return {
      sessions: [],
      nodes: [],
      activeAgentIds: [],
      activeCount: 0,
      totalSessions: 0,
      loading: true,
      error: null,
      lastUpdated: null,
      gatewayConnected: false,
      source: 'empty' as const,
    };
  });

  const fetchSessions = useCallback(async () => {
    try {
      const res = await fetch('/api/agents');

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const data = await res.json();

      // Check if gateway returned an error or is in demo mode
      const gatewayConnected = data.source === 'gateway' && !data.error;

      // Map sessions to visual nodes
      const sessions: AgentSession[] = data.sessions || [];
      const nodes = mapSessionsToNodes(sessions);

      // Get IDs of active (working) agents
      const activeAgentIds = nodes
        .filter(n => n.status === 'working')
        .map(n => n.id);

      // Count working nodes
      const activeCount = activeAgentIds.length;

      const newState = {
        sessions,
        nodes,
        activeAgentIds,
        activeCount,
        totalSessions: sessions.length,
        loading: false,
        error: data.error || null,
        lastUpdated: data.timestamp || new Date().toISOString(),
        gatewayConnected,
        source: (data.source || 'gateway') as 'gateway' | 'cache' | 'empty',
      };

      setState(newState);

      // Cache successful gateway responses
      if (gatewayConnected && typeof window !== 'undefined') {
        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify(newState));
        } catch {}
      }

    } catch (err) {
      console.error('Failed to fetch agent sessions:', err);

      // On error, keep existing data but mark error
      setState(prev => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err.message : 'Failed to fetch',
        gatewayConnected: false,
        source: prev.sessions.length > 0 ? 'cache' : 'empty',
      }));
    }
  }, []);

  useEffect(() => {
    // Initial fetch
    fetchSessions();
    
    // Poll for updates
    const interval = setInterval(fetchSessions, pollInterval);
    
    return () => clearInterval(interval);
  }, [fetchSessions, pollInterval]);

  return {
    ...state,
    refresh: fetchSessions,
  };
}

// Simpler hook that just returns active agent IDs
export function useActiveAgents(pollInterval = 2000) {
  const { activeAgentIds, activeCount, loading, error, gatewayConnected, refresh } = useAgentSessions(pollInterval);

  return {
    activeAgents: activeAgentIds,
    activeCount,
    loading,
    error,
    gatewayConnected,
    refresh,
  };
}
