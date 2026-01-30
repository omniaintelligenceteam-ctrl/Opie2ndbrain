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
}

export function useAgentSessions(pollInterval = 5000) {
  const [state, setState] = useState<AgentSessionsState>({
    sessions: [],
    nodes: [],
    activeAgentIds: [],
    activeCount: 0,
    totalSessions: 0,
    loading: true,
    error: null,
    lastUpdated: null,
  });

  const fetchSessions = useCallback(async () => {
    try {
      const res = await fetch('/api/agents');
      
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      
      const data = await res.json();
      
      // Map sessions to visual nodes
      const sessions: AgentSession[] = data.sessions || [];
      const nodes = mapSessionsToNodes(sessions);
      
      // Get IDs of active (working) agents
      const activeAgentIds = nodes
        .filter(n => n.status === 'working')
        .map(n => n.id);
      
      // Count working nodes
      const activeCount = activeAgentIds.length;
      
      setState({
        sessions,
        nodes,
        activeAgentIds,
        activeCount,
        totalSessions: sessions.length,
        loading: false,
        error: null,
        lastUpdated: data.timestamp || new Date().toISOString(),
      });
      
    } catch (err) {
      console.error('Failed to fetch agent sessions:', err);
      
      // On error, keep existing data but mark error
      setState(prev => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err.message : 'Failed to fetch',
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
export function useActiveAgents(pollInterval = 5000) {
  const { activeAgentIds, activeCount, loading, error, refresh } = useAgentSessions(pollInterval);
  
  return {
    activeAgents: activeAgentIds,
    activeCount,
    loading,
    error,
    refresh,
  };
}
