'use client';
import { useState, useEffect, useCallback, useRef } from 'react';

// =============================================================================
// Types
// =============================================================================

export interface SystemStatus {
  opie: {
    status: 'online' | 'thinking' | 'speaking' | 'offline';
    lastActivity: string;
    uptime: number; // seconds
  };
  gateway: {
    connected: boolean;
    latency: number; // ms
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

export interface DashboardMetrics {
  sessions: {
    today: number;
    thisWeek: number;
    total: number;
  };
  tokens: {
    today: number;
    thisWeek: number;
    total: number;
  };
  tasks: {
    completedToday: number;
    successRate: number;
    avgDuration: number; // seconds
  };
  uptime: {
    current: number; // seconds
    percentage: number;
    lastRestart: string;
  };
  agents?: {
    mostActive?: string;
    tasksPerAgent?: number;
    efficiency?: number;
  };
  conversations?: {
    today: number;
    thisWeek?: number;
  };
}

export interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'task';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  priority: 'low' | 'medium' | 'high';
  actionUrl?: string;
  actionLabel?: string;
  agentId?: string;
  agentEmoji?: string;
}

// =============================================================================
// useVisibilityRefresh - Refresh data when page becomes visible or gains focus
// =============================================================================

/**
 * Hook that calls a callback when the page becomes visible or gains focus.
 * Useful for refreshing data when user returns to the app.
 */
export function useVisibilityRefresh(callback: () => void) {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        callbackRef.current();
      }
    };

    const handleFocus = () => {
      callbackRef.current();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);
}

// =============================================================================
// useSystemStatus - Real-time system status polling
// =============================================================================

export function useSystemStatus(pollInterval = 5000) {
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/status');
      if (!res.ok) throw new Error('Failed to fetch status');
      const data = await res.json();
      setStatus(data);
      setError(null);
    } catch (err) {
      console.error('Status fetch error:', err);
      setError('Unable to connect');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, pollInterval);
    return () => clearInterval(interval);
  }, [fetchStatus, pollInterval]);

  return { status, loading, error, refresh: fetchStatus };
}

// =============================================================================
// useDashboardMetrics - Dashboard statistics
// =============================================================================

export function useDashboardMetrics(pollInterval = 30000) {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = useCallback(async () => {
    try {
      const res = await fetch('/api/metrics');
      if (!res.ok) throw new Error('Failed to fetch metrics');
      const data = await res.json();
      setMetrics(data);
      setError(null);
    } catch (err) {
      console.error('Metrics fetch error:', err);
      setError('Unable to load metrics');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, pollInterval);
    return () => clearInterval(interval);
  }, [fetchMetrics, pollInterval]);

  return { metrics, loading, error, refresh: fetchMetrics };
}

// =============================================================================
// useNotifications - Notification system
// =============================================================================

const NOTIFICATIONS_KEY = 'opie-notifications';

function loadStoredNotifications(): Notification[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(NOTIFICATIONS_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Only keep notifications from last 24 hours
      const cutoff = Date.now() - 24 * 60 * 60 * 1000;
      return parsed.filter((n: Notification) => new Date(n.timestamp).getTime() > cutoff);
    }
  } catch {}
  return [];
}

function saveNotifications(notifications: Notification[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(notifications));
  } catch {}
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Load from storage on mount
  useEffect(() => {
    const stored = loadStoredNotifications();
    setNotifications(stored);
    setUnreadCount(stored.filter(n => !n.read).length);
  }, []);

  // Poll for new notifications
  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const res = await fetch('/api/notifications');
        if (res.ok) {
          const data = await res.json();
          if (data.notifications?.length > 0) {
            setNotifications(prev => {
              const existingIds = new Set(prev.map(n => n.id));
              const newOnes = data.notifications.filter((n: Notification) => !existingIds.has(n.id));
              if (newOnes.length > 0) {
                const updated = [...newOnes, ...prev].slice(0, 50);
                saveNotifications(updated);
                return updated;
              }
              return prev;
            });
          }
        }
      } catch {}
    };

    fetchNotifications();
    const interval = setInterval(fetchNotifications, 15000);
    return () => clearInterval(interval);
  }, []);

  // Update unread count when notifications change
  useEffect(() => {
    setUnreadCount(notifications.filter(n => !n.read).length);
    saveNotifications(notifications);
  }, [notifications]);

  const addNotification = useCallback((notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
    const newNotif: Notification = {
      ...notification,
      id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      timestamp: new Date().toISOString(),
      read: false,
    };
    setNotifications(prev => [newNotif, ...prev].slice(0, 50));
    return newNotif;
  }, []);

  const markAsRead = useCallback((id: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, []);

  const clearNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
    saveNotifications([]);
  }, []);

  return {
    notifications,
    unreadCount,
    addNotification,
    markAsRead,
    markAllAsRead,
    clearNotification,
    clearAll,
  };
}

// =============================================================================
// useToast - Toast notification display
// =============================================================================

export interface Toast {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message?: string;
  duration?: number;
}

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  const showToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const newToast: Toast = { ...toast, id };
    
    setToasts(prev => [...prev, newToast]);

    const duration = toast.duration ?? 5000;
    const timeout = setTimeout(() => {
      dismissToast(id);
    }, duration);
    
    timeoutsRef.current.set(id, timeout);
    
    return id;
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
    const timeout = timeoutsRef.current.get(id);
    if (timeout) {
      clearTimeout(timeout);
      timeoutsRef.current.delete(id);
    }
  }, []);

  // Clean up timeouts on unmount
  useEffect(() => {
    return () => {
      timeoutsRef.current.forEach(timeout => clearTimeout(timeout));
    };
  }, []);

  return { toasts, showToast, dismissToast };
}

// =============================================================================
// useSmartGreeting - Time-aware greeting
// =============================================================================

export function useSmartGreeting(userName?: string) {
  // Use stored name from onboarding, fallback to provided name or 'there'
  const resolvedName = userName || (typeof window !== 'undefined' ? localStorage.getItem('opie-user-name') : null) || 'there';
  const [greeting, setGreeting] = useState('');
  const [suggestion, setSuggestion] = useState('');

  useEffect(() => {
    const updateGreeting = () => {
      const hour = new Date().getHours();
      const day = new Date().getDay();
      const isWeekend = day === 0 || day === 6;

      let greet = '';
      let suggest = '';

      if (hour >= 5 && hour < 12) {
        greet = `Good morning, ${resolvedName}`;
        suggest = isWeekend
          ? "Relaxed start to the day. Your agents are ready when you are."
          : "Ready to tackle the day? Here's what's happening.";
      } else if (hour >= 12 && hour < 17) {
        greet = `Good afternoon, ${resolvedName}`;
        suggest = "Afternoon check-in. Let's see what's been accomplished.";
      } else if (hour >= 17 && hour < 21) {
        greet = `Good evening, ${resolvedName}`;
        suggest = "Evening wrap-up. Time to review today's progress.";
      } else {
        greet = `Hey ${resolvedName}`;
        suggest = "Burning the midnight oil? Your agents are here 24/7.";
      }

      setGreeting(greet);
      setSuggestion(suggest);
    };

    updateGreeting();
    // Update every minute
    const interval = setInterval(updateGreeting, 60000);
    return () => clearInterval(interval);
  }, [resolvedName]);

  return { greeting, suggestion };
}

// =============================================================================
// useRecentMemories - Quick memory access
// =============================================================================

export interface RecentMemory {
  id: string;
  title: string;
  type: 'file' | 'conversation' | 'note' | 'task';
  path?: string;
  timestamp: string;
  preview?: string;
}

export function useRecentMemories(limit = 10) {
  const [memories, setMemories] = useState<RecentMemory[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMemories = useCallback(async () => {
    try {
      const res = await fetch(`/api/memory/recent?limit=${limit}`);
      if (res.ok) {
        const data = await res.json();
        setMemories(data.memories || []);
      }
    } catch (err) {
      console.error('Failed to fetch memories:', err);
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    fetchMemories();
    const interval = setInterval(fetchMemories, 60000);
    return () => clearInterval(interval);
  }, [fetchMemories]);

  // Refresh when page becomes visible or gains focus
  useVisibilityRefresh(fetchMemories);

  return { memories, loading, refresh: fetchMemories };
}

// =============================================================================
// useConnectionStatus - WebSocket/connection health
// =============================================================================

export function useConnectionStatus() {
  const [isOnline, setIsOnline] = useState(true);
  const [lastPing, setLastPing] = useState<Date | null>(null);
  const [latency, setLatency] = useState<number | null>(null);

  useEffect(() => {
    // Track online/offline
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    setIsOnline(navigator.onLine);

    // Ping check - more frequent for real-time latency
    const ping = async () => {
      const start = performance.now();
      try {
        const res = await fetch('/api/status', { method: 'HEAD' });
        if (res.ok) {
          const end = performance.now();
          setLatency(Math.round(end - start));
          setLastPing(new Date());
          setIsOnline(true);
        } else {
          setIsOnline(false);
        }
      } catch {
        setIsOnline(false);
      }
    };

    ping();
    // Ping every 2 seconds for real-time latency
    const interval = setInterval(ping, 2000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  return { isOnline, lastPing, latency };
}
