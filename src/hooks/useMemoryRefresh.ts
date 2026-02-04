'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { loadMemoryContext } from '@/lib/memoryLoader';

export interface UseMemoryRefreshReturn {
  memoryContext: string;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  lastRefresh: Date | null;
}

/**
 * Hook to auto-refresh memory context on:
 * - Initial load
 * - Tab visibility change (visibilitychange event)
 * - Window focus
 * - Periodic interval (default 5 minutes)
 */
export function useMemoryRefresh(refreshInterval = 300000): UseMemoryRefreshReturn {
  const [memoryContext, setMemoryContext] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  // Use ref for callback to avoid stale closures
  const callbackRef = useRef<() => Promise<void>>();

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const context = await loadMemoryContext();
      setMemoryContext(context);
      setLastRefresh(new Date());
    } catch (err) {
      console.error('Memory refresh error:', err);
      setError('Failed to load memory context');
    } finally {
      setLoading(false);
    }
  }, []);

  // Keep callback ref updated
  callbackRef.current = refresh;

  // Initial load
  useEffect(() => {
    refresh();
  }, [refresh]);

  // Visibility/focus refresh
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        callbackRef.current?.();
      }
    };

    const handleFocus = () => {
      callbackRef.current?.();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  // Periodic refresh
  useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        callbackRef.current?.();
      }
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [refreshInterval]);

  return { memoryContext, loading, error, refresh, lastRefresh };
}
