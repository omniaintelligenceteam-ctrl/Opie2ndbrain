'use client';
import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';

// =============================================================================
// Types (re-exported from useRealTimeData for backward compat)
// =============================================================================

export interface SystemStatus {
  opie: {
    status: 'online' | 'thinking' | 'speaking' | 'offline';
    lastActivity: string;
    uptime: number;
  };
  gateway: {
    connected: boolean;
    latency: number;
    lastPing: string;
    url?: string;
  };
  voice: {
    available: boolean;
    status: 'ready' | 'speaking' | 'listening' | 'unavailable';
  };
  api: {
    healthy: boolean;
    responseTime: number;
  };
  security?: {
    secure: boolean;
    status?: string;
    warnings?: number;
    sslValid?: boolean;
    authEnabled?: boolean;
    lastScan?: string;
  };
  agents: {
    active: number;
    idle: number;
    total: number;
  };
  tasks: {
    running: number;
    completed: number;
    failed: number;
    pending: number;
  };
  model?: string;
  context?: {
    used: number;
    total: number;
  };
}

// =============================================================================
// Context value shape
// =============================================================================

interface SystemStatusContextValue {
  status: SystemStatus | null;
  loading: boolean;
  error: string | null;
  isOnline: boolean;
  lastPing: Date | null;
  latency: number | null;
  refresh: () => Promise<void>;
}

const SystemStatusContext = createContext<SystemStatusContextValue | null>(null);

// =============================================================================
// Single polling interval: 30 seconds (was 3 different hooks at 2s, 5s, 5s)
// =============================================================================

const STATUS_POLL_INTERVAL = 30_000;

// =============================================================================
// Provider — ONE fetch loop shared by entire app
// =============================================================================

export function SystemStatusProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(true);
  const [lastPing, setLastPing] = useState<Date | null>(null);
  const [latency, setLatency] = useState<number | null>(null);
  const mountedRef = useRef(true);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchStatus = useCallback(async () => {
    if (!mountedRef.current) return;
    const start = performance.now();
    try {
      const res = await fetch('/api/status');
      if (!res.ok) throw new Error('Failed to fetch status');
      const data = await res.json();
      if (!mountedRef.current) return;
      const end = performance.now();
      setStatus(data);
      setError(null);
      setIsOnline(true);
      setLatency(Math.round(end - start));
      setLastPing(new Date());
    } catch (err) {
      if (!mountedRef.current) return;
      console.error('Status fetch error:', err);
      setError('Unable to connect');
      setIsOnline(false);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, []);

  // Online/offline listeners
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    setIsOnline(navigator.onLine);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Visibility-based refresh
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        fetchStatus();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [fetchStatus]);

  // Single poll loop
  useEffect(() => {
    mountedRef.current = true;
    fetchStatus();
    intervalRef.current = setInterval(fetchStatus, STATUS_POLL_INTERVAL);
    return () => {
      mountedRef.current = false;
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchStatus]);

  return (
    <SystemStatusContext.Provider value={{ status, loading, error, isOnline, lastPing, latency, refresh: fetchStatus }}>
      {children}
    </SystemStatusContext.Provider>
  );
}

// =============================================================================
// Consumer hooks — drop-in replacements for the old scattered hooks
// =============================================================================

export function useSystemStatusContext(): SystemStatusContextValue {
  const ctx = useContext(SystemStatusContext);
  if (!ctx) {
    throw new Error('useSystemStatusContext must be used within SystemStatusProvider');
  }
  return ctx;
}

/**
 * Drop-in replacement for the old useSystemStatus() hook.
 * Returns { status, loading, error, refresh }.
 */
export function useSystemStatus() {
  const { status, loading, error, refresh } = useSystemStatusContext();
  return { status, loading, error, refresh };
}

/**
 * Drop-in replacement for the old useConnectionStatus() hook.
 * Returns { isOnline, lastPing, latency }.
 */
export function useConnectionStatus() {
  const { isOnline, lastPing, latency } = useSystemStatusContext();
  return { isOnline, lastPing, latency };
}
