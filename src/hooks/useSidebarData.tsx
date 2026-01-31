'use client';
import { useState, useEffect, useCallback, useRef, createContext, useContext, ReactNode } from 'react';
import { mapSessionsToNodes, AgentNodeState } from '@/lib/agentMapping';

// ============================================================================
// Types
// ============================================================================

export interface AgentSession {
  id: string;
  label: string;
  status: 'running' | 'complete' | 'failed' | 'idle';
  startedAt: string;
  runtime: string;
  tokens: { input: number; output: number; total: number; };
  model: string;
}

export interface Task {
  id: string;
  agentId: string;
  agentName: string;
  agentEmoji: string;
  label: string;
  status: 'running' | 'complete' | 'failed';
  startTime: string;
  progress?: number;
  output?: string;
}

export interface CronJob {
  id: string;
  name: string;
  schedule: string;
  command: string;
  enabled: boolean;
  priority?: 'critical' | 'normal' | 'low';
  lastRun?: string;
  lastStatus?: 'success' | 'failed' | 'running';
  nextRun?: string;
  runCount?: number;
  description?: string;
}

export interface Skill {
  id: string;
  name: string;
  category: string;
  available: boolean;
}

export interface SidebarStats {
  activeAgents: number;
  totalAgents: number;
  runningTasks: number;
  completedTasks: number;
  failedTasks: number;
  enabledCrons: number;
  totalCrons: number;
}

export interface GatewayStatus {
  connected: boolean;
  latency: number;
  model?: string;
}

export interface SidebarDataState {
  // Core data
  sessions: AgentSession[];
  nodes: AgentNodeState[];
  tasks: Task[];
  crons: CronJob[];
  skills: Skill[];
  stats: SidebarStats;
  gateway: GatewayStatus;
  
  // Meta
  loading: boolean;
  error: string | null;
  lastUpdated: string | null;
  connectionType: 'sse' | 'polling' | 'none';
  source: 'gateway' | 'cache' | 'empty';
}

// ============================================================================
// Cache
// ============================================================================

const CACHE_KEY = 'opie-sidebar-data-cache';
const SSE_RECONNECT_DELAY = 3000;
const FALLBACK_POLL_INTERVAL = 5000;

function loadFromCache(): Partial<SidebarDataState> | null {
  if (typeof window === 'undefined') return null;
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      // Check cache age (expire after 5 minutes)
      if (parsed.lastUpdated) {
        const age = Date.now() - new Date(parsed.lastUpdated).getTime();
        if (age > 5 * 60 * 1000) return null;
      }
      return parsed;
    }
  } catch {}
  return null;
}

function saveToCache(state: SidebarDataState) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({
      sessions: state.sessions,
      nodes: state.nodes,
      tasks: state.tasks,
      crons: state.crons,
      skills: state.skills,
      stats: state.stats,
      gateway: state.gateway,
      lastUpdated: state.lastUpdated,
    }));
  } catch {}
}

// ============================================================================
// Default state
// ============================================================================

const defaultStats: SidebarStats = {
  activeAgents: 0,
  totalAgents: 0,
  runningTasks: 0,
  completedTasks: 0,
  failedTasks: 0,
  enabledCrons: 0,
  totalCrons: 0,
};

const defaultGateway: GatewayStatus = {
  connected: false,
  latency: 0,
};

const defaultState: SidebarDataState = {
  sessions: [],
  nodes: [],
  tasks: [],
  crons: [],
  skills: [],
  stats: defaultStats,
  gateway: defaultGateway,
  loading: true,
  error: null,
  lastUpdated: null,
  connectionType: 'none',
  source: 'empty',
};

// ============================================================================
// Hook
// ============================================================================

export function useSidebarData(enabled = true): SidebarDataState & { refresh: () => Promise<void> } {
  const [state, setState] = useState<SidebarDataState>(() => {
    const cached = loadFromCache();
    if (cached) {
      return {
        ...defaultState,
        ...cached,
        loading: true,
        source: 'cache',
      };
    }
    return defaultState;
  });
  
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const sseFailedRef = useRef(false);
  const mountedRef = useRef(true);
  
  // Process incoming data
  const processData = useCallback((data: {
    sessions?: AgentSession[];
    tasks?: Task[];
    crons?: CronJob[];
    skills?: Skill[];
    stats?: Partial<SidebarStats>;
    gateway?: Partial<GatewayStatus>;
    timestamp?: string;
    source?: string;
    error?: string;
  }, connectionType: 'sse' | 'polling', isInitial = false) => {
    if (!mountedRef.current) return;
    
    setState(prev => {
      const sessions = data.sessions ?? prev.sessions;
      const nodes = sessions.length > 0 ? mapSessionsToNodes(sessions) : prev.nodes;
      const tasks = data.tasks ?? prev.tasks;
      const crons = data.crons ?? prev.crons;
      const skills = data.skills ?? prev.skills;
      
      // Merge stats
      const stats: SidebarStats = {
        ...prev.stats,
        ...data.stats,
        // Recalculate from data if available
        ...(data.sessions && {
          activeAgents: data.sessions.filter(s => s.status === 'running').length,
          totalAgents: data.sessions.length,
        }),
        ...(data.tasks && {
          runningTasks: data.tasks.filter(t => t.status === 'running').length,
          completedTasks: data.tasks.filter(t => t.status === 'complete').length,
          failedTasks: data.tasks.filter(t => t.status === 'failed').length,
        }),
        ...(data.crons && {
          enabledCrons: data.crons.filter(c => c.enabled).length,
          totalCrons: data.crons.length,
        }),
      };
      
      const gateway: GatewayStatus = {
        ...prev.gateway,
        ...data.gateway,
      };
      
      const newState: SidebarDataState = {
        sessions,
        nodes,
        tasks,
        crons,
        skills,
        stats,
        gateway,
        loading: false,
        error: data.error || null,
        lastUpdated: data.timestamp || new Date().toISOString(),
        connectionType,
        source: (data.source === 'gateway' || gateway.connected) ? 'gateway' : prev.sessions.length > 0 ? 'cache' : 'empty',
      };
      
      // Save to cache on successful updates
      if (gateway.connected) {
        saveToCache(newState);
      }
      
      return newState;
    });
  }, []);
  
  // Fallback polling
  const fetchAll = useCallback(async () => {
    if (!mountedRef.current) return;
    
    try {
      const [agentsRes, cronsRes, statusRes] = await Promise.all([
        fetch('/api/agents').then(r => r.json()).catch(() => ({ sessions: [] })),
        fetch('/api/crons').then(r => r.json()).catch(() => ({ crons: [] })),
        fetch('/api/status').then(r => r.json()).catch(() => ({})),
      ]);
      
      const sessions = agentsRes.sessions || [];
      const tasks = sessions
        .filter((s: AgentSession) => s.status === 'running' || s.status === 'complete' || s.status === 'failed')
        .map((s: AgentSession) => ({
          id: s.id,
          agentId: s.id.split(':')[2] || 'agent',
          agentName: s.label,
          agentEmoji: '🤖',
          label: s.label,
          status: s.status,
          startTime: s.startedAt,
          progress: s.status === 'running' ? 50 : s.status === 'complete' ? 100 : 0,
        }));
      
      processData({
        sessions,
        tasks,
        crons: cronsRes.crons || [],
        gateway: {
          connected: statusRes.gateway?.connected ?? false,
          latency: statusRes.gateway?.latency ?? 0,
          model: statusRes.model,
        },
        stats: {
          activeAgents: statusRes.agents?.active ?? 0,
          totalAgents: statusRes.agents?.total ?? 0,
          runningTasks: statusRes.tasks?.running ?? 0,
          completedTasks: statusRes.tasks?.completed ?? 0,
          failedTasks: statusRes.tasks?.failed ?? 0,
          enabledCrons: (cronsRes.crons || []).filter((c: CronJob) => c.enabled).length,
          totalCrons: (cronsRes.crons || []).length,
        },
        timestamp: new Date().toISOString(),
        source: statusRes.gateway?.connected ? 'gateway' : 'fallback',
      }, 'polling');
    } catch (error) {
      console.error('[Sidebar] Polling error:', error);
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Fetch failed',
        connectionType: 'polling',
      }));
    }
  }, [processData]);
  
  // Start polling
  const startPolling = useCallback(() => {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    console.log('[Sidebar] Starting polling');
    fetchAll();
    pollIntervalRef.current = setInterval(fetchAll, FALLBACK_POLL_INTERVAL);
  }, [fetchAll]);
  
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
    if (eventSourceRef.current) return;
    
    console.log('[Sidebar] Connecting to SSE');
    const eventSource = new EventSource('/api/sidebar/stream');
    eventSourceRef.current = eventSource;
    
    eventSource.addEventListener('connected', () => {
      console.log('[Sidebar SSE] Connected');
      stopPolling();
    });
    
    eventSource.addEventListener('initial', (event) => {
      try {
        const data = JSON.parse(event.data);
        processData(data, 'sse', true);
      } catch (err) {
        console.error('[Sidebar SSE] Failed to parse initial:', err);
      }
    });
    
    eventSource.addEventListener('sessions', (event) => {
      try {
        const data = JSON.parse(event.data);
        processData({
          sessions: data.sessions,
          tasks: data.tasks,
          stats: data.stats,
          timestamp: data.timestamp,
        }, 'sse');
      } catch (err) {
        console.error('[Sidebar SSE] Failed to parse sessions:', err);
      }
    });
    
    eventSource.addEventListener('crons', (event) => {
      try {
        const data = JSON.parse(event.data);
        processData({
          crons: data.crons,
          stats: {
            enabledCrons: data.enabledCount,
            totalCrons: data.totalCount,
          },
          timestamp: data.timestamp,
        }, 'sse');
      } catch (err) {
        console.error('[Sidebar SSE] Failed to parse crons:', err);
      }
    });
    
    eventSource.addEventListener('skills', (event) => {
      try {
        const data = JSON.parse(event.data);
        processData({
          skills: data.skills,
          timestamp: data.timestamp,
        }, 'sse');
      } catch (err) {
        console.error('[Sidebar SSE] Failed to parse skills:', err);
      }
    });
    
    eventSource.addEventListener('reconnect', () => {
      console.log('[Sidebar SSE] Server requested reconnect');
      eventSource.close();
      eventSourceRef.current = null;
      reconnectTimeoutRef.current = setTimeout(connectSSE, 1000);
    });
    
    eventSource.onerror = () => {
      console.error('[Sidebar SSE] Connection error');
      eventSource.close();
      eventSourceRef.current = null;
      
      if (eventSource.readyState === EventSource.CLOSED) {
        if (!sseFailedRef.current) {
          console.log('[Sidebar SSE] Falling back to polling');
          sseFailedRef.current = true;
          startPolling();
        }
      } else {
        reconnectTimeoutRef.current = setTimeout(connectSSE, SSE_RECONNECT_DELAY);
      }
    };
    
    eventSource.onopen = () => {
      sseFailedRef.current = false;
    };
  }, [enabled, processData, startPolling, stopPolling]);
  
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
  
  // Main effect
  useEffect(() => {
    mountedRef.current = true;
    
    if (!enabled) {
      return () => { mountedRef.current = false; };
    }
    
    // Try SSE first
    connectSSE();
    
    // Initial fallback fetch while SSE connects
    const initialTimeout = setTimeout(() => {
      if (!eventSourceRef.current || eventSourceRef.current.readyState !== EventSource.OPEN) {
        fetchAll();
      }
    }, 500);
    
    return () => {
      mountedRef.current = false;
      clearTimeout(initialTimeout);
      disconnectSSE();
      stopPolling();
    };
  }, [enabled, connectSSE, disconnectSSE, fetchAll, stopPolling]);
  
  // Manual refresh
  const refresh = useCallback(async () => {
    await fetchAll();
  }, [fetchAll]);
  
  return { ...state, refresh };
}

// ============================================================================
// Context Provider (optional - for sharing across components)
// ============================================================================

const SidebarDataContext = createContext<(SidebarDataState & { refresh: () => Promise<void> }) | null>(null);

export function SidebarDataProvider({ children, enabled = true }: { children: ReactNode; enabled?: boolean }) {
  const data = useSidebarData(enabled);
  
  return (
    <SidebarDataContext.Provider value={data}>
      {children}
    </SidebarDataContext.Provider>
  );
}

export function useSidebarDataContext() {
  const context = useContext(SidebarDataContext);
  if (!context) {
    throw new Error('useSidebarDataContext must be used within SidebarDataProvider');
  }
  return context;
}

// ============================================================================
// Convenience hooks for specific data
// ============================================================================

export function useSidebarSessions() {
  const { sessions, nodes, stats, loading, error, connectionType, lastUpdated, refresh } = useSidebarData();
  return {
    sessions,
    nodes,
    activeAgents: stats.activeAgents,
    totalAgents: stats.totalAgents,
    loading,
    error,
    connectionType,
    lastUpdated,
    refresh,
  };
}

export function useSidebarTasks() {
  const { tasks, stats, loading, error, connectionType, lastUpdated, refresh } = useSidebarData();
  return {
    tasks,
    runningTasks: stats.runningTasks,
    completedTasks: stats.completedTasks,
    failedTasks: stats.failedTasks,
    loading,
    error,
    connectionType,
    lastUpdated,
    refresh,
  };
}

export function useSidebarCrons() {
  const { crons, stats, loading, error, connectionType, lastUpdated, refresh } = useSidebarData();
  return {
    crons,
    enabledCrons: stats.enabledCrons,
    totalCrons: stats.totalCrons,
    loading,
    error,
    connectionType,
    lastUpdated,
    refresh,
  };
}

export function useSidebarStats() {
  const { stats, gateway, loading, connectionType, lastUpdated } = useSidebarData();
  return {
    stats,
    gateway,
    loading,
    connectionType,
    lastUpdated,
  };
}
