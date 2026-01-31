'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { mapSessionsToNodes, AgentNodeState } from '@/lib/agentMapping';

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
  source: 'gateway' | 'cache' | 'empty' | 'sse';
  connectionType: 'sse' | 'polling' | 'none';
}

const CACHE_KEY = 'opie-agent-sessions-cache';
const SSE_RECONNECT_DELAY = 3000;
const FALLBACK_POLL_INTERVAL = 5000;

function loadFromCache(): Partial<AgentSessionsState> | null {
  if (typeof window === 'undefined') return null;
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch {}
  return null;
}

function saveToCache(state: AgentSessionsState) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({
      sessions: state.sessions,
      nodes: state.nodes,
      activeAgentIds: state.activeAgentIds,
      activeCount: state.activeCount,
      totalSessions: state.totalSessions,
      lastUpdated: state.lastUpdated,
    }));
  } catch {}
}

export function useAgentSessions(pollInterval = FALLBACK_POLL_INTERVAL, enabled = true) {
  const [state, setState] = useState<AgentSessionsState>(() => {
    const cached = loadFromCache();
    if (cached) {
      return {
        ...cached,
        loading: true,
        error: null,
        gatewayConnected: false,
        source: 'cache' as const,
        connectionType: 'none' as const,
      } as AgentSessionsState;
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
      connectionType: 'none' as const,
    };
  });
  
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const sseFailedRef = useRef(false);
  const mountedRef = useRef(true);
  
  // Process session data (shared between SSE and polling)
  const processSessionData = useCallback((data: {
    sessions?: AgentSession[];
    source?: string;
    error?: string;
    timestamp?: string;
  }, connectionType: 'sse' | 'polling') => {
    if (!mountedRef.current) return;
    
    const sessions: AgentSession[] = data.sessions || [];
    const nodes = mapSessionsToNodes(sessions);
    const activeAgentIds = nodes.filter(n => n.status === 'working').map(n => n.id);
    const activeCount = activeAgentIds.length;
    const gatewayConnected = data.source === 'gateway' && !data.error;
    
    const newState: AgentSessionsState = {
      sessions,
      nodes,
      activeAgentIds,
      activeCount,
      totalSessions: sessions.length,
      loading: false,
      error: data.error || null,
      lastUpdated: data.timestamp || new Date().toISOString(),
      gatewayConnected,
      source: (data.source === 'gateway' ? (connectionType === 'sse' ? 'sse' : 'gateway') : 'cache') as AgentSessionsState['source'],
      connectionType,
    };
    
    setState(newState);
    
    // Cache successful responses
    if (gatewayConnected) {
      saveToCache(newState);
    }
  }, []);
  
  // Fallback polling function
  const fetchSessions = useCallback(async () => {
    if (!mountedRef.current) return;
    
    try {
      const res = await fetch('/api/agents');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      
      const data = await res.json();
      processSessionData(data, 'polling');
    } catch (err) {
      console.error('[Polling] Failed to fetch agent sessions:', err);
      setState(prev => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err.message : 'Failed to fetch',
        gatewayConnected: false,
        source: prev.sessions.length > 0 ? 'cache' : 'empty',
        connectionType: 'polling',
      }));
    }
  }, [processSessionData]);
  
  // Start polling fallback
  const startPolling = useCallback(() => {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    
    console.log('[Fallback] Starting polling at', pollInterval, 'ms');
    fetchSessions();
    pollIntervalRef.current = setInterval(fetchSessions, pollInterval);
  }, [fetchSessions, pollInterval]);
  
  // Stop polling
  const stopPolling = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  }, []);
  
  // Connect to SSE
  const connectSSE = useCallback(() => {
    if (!enabled || sseFailedRef.current) return;
    if (eventSourceRef.current) return; // Already connected
    
    console.log('[SSE] Connecting to /api/agents/stream');
    
    const eventSource = new EventSource('/api/agents/stream');
    eventSourceRef.current = eventSource;
    
    eventSource.addEventListener('connected', () => {
      console.log('[SSE] Connected');
      stopPolling(); // Stop polling when SSE is active
    });
    
    eventSource.addEventListener('sessions', (event) => {
      try {
        const data = JSON.parse(event.data);
        processSessionData(data, 'sse');
      } catch (err) {
        console.error('[SSE] Failed to parse sessions event:', err);
      }
    });
    
    eventSource.addEventListener('reconnect', (event) => {
      console.log('[SSE] Server requested reconnect:', event.data);
      eventSource.close();
      eventSourceRef.current = null;
      
      // Reconnect after a short delay
      reconnectTimeoutRef.current = setTimeout(connectSSE, 1000);
    });
    
    eventSource.addEventListener('error', (event) => {
      console.log('[SSE] Error - event:', event);
    });
    
    eventSource.onerror = (err) => {
      console.error('[SSE] Connection error:', err);
      eventSource.close();
      eventSourceRef.current = null;
      
      // Check if this is a permanent failure (e.g., 404, not supported)
      if (eventSource.readyState === EventSource.CLOSED) {
        // Try polling as fallback
        if (!sseFailedRef.current) {
          console.log('[SSE] Falling back to polling');
          sseFailedRef.current = true;
          startPolling();
        }
      } else {
        // Temporary error, try to reconnect SSE
        reconnectTimeoutRef.current = setTimeout(connectSSE, SSE_RECONNECT_DELAY);
      }
    };
    
    eventSource.onopen = () => {
      console.log('[SSE] Stream opened');
      sseFailedRef.current = false;
    };
  }, [enabled, processSessionData, startPolling, stopPolling]);
  
  // Disconnect SSE
  const disconnectSSE = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
  }, []);
  
  // Main effect - setup and cleanup
  useEffect(() => {
    mountedRef.current = true;
    
    if (!enabled) {
      return () => {
        mountedRef.current = false;
      };
    }
    
    // Try SSE first
    connectSSE();
    
    // Start polling as initial fallback (will be stopped when SSE connects)
    // This ensures we get data immediately while SSE is connecting
    const initialTimeout = setTimeout(() => {
      if (!eventSourceRef.current || eventSourceRef.current.readyState !== EventSource.OPEN) {
        fetchSessions(); // Get initial data while waiting for SSE
      }
    }, 500);
    
    return () => {
      mountedRef.current = false;
      clearTimeout(initialTimeout);
      disconnectSSE();
      stopPolling();
    };
  }, [enabled, connectSSE, disconnectSSE, fetchSessions, stopPolling]);
  
  // Manual refresh function
  const refresh = useCallback(async () => {
    // Force a fresh fetch regardless of connection type
    await fetchSessions();
  }, [fetchSessions]);
  
  return {
    ...state,
    refresh,
  };
}

// Simpler hook that just returns active agent IDs
export function useActiveAgents(pollInterval = FALLBACK_POLL_INTERVAL, enabled = true) {
  const { activeAgentIds, activeCount, loading, error, gatewayConnected, refresh, connectionType } = useAgentSessions(pollInterval, enabled);

  return {
    activeAgents: activeAgentIds,
    activeCount,
    loading,
    error,
    gatewayConnected,
    refresh,
    connectionType,
  };
}
