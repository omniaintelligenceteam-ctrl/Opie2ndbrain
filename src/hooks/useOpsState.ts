'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

export type UrgencyColumnId = 'urgent' | 'soon' | 'later';
export type SyncStatus = 'syncing' | 'synced' | 'offline';

export type TodoItem = {
  id: string;
  group: string;
  text: string;
  done: boolean;
  scheduledDate?: string;
  urgencyColumnId?: UrgencyColumnId;
  note?: string;
  completedAt?: string;
  createdAt?: string;
};

export type CalendarEvent = {
  id: string;
  title: string;
  date: string;
  time?: string;
  color: string;
  category: string;
};

export type UrgencyColumn = { id: UrgencyColumnId; title: string; color: string };

type OpsStatePayload = {
  todos?: unknown[];
  events?: unknown[];
  urgencyColumns?: unknown[];
};

const TODO_KEY = 'opie.kanban.todos.v1';
const EVENTS_KEY = 'opie.calendar.events.v1';
const URGENCY_COLUMNS_KEY = 'opie.calendar.urgency.columns.v1';

export const DRAG_TODO_TYPE = 'application/opie.todo.id';

export const defaultUrgencyColumns: UrgencyColumn[] = [
  { id: 'urgent', title: 'Immediate', color: '#ef4444' },
  { id: 'soon', title: 'Soon', color: '#f59e0b' },
  { id: 'later', title: 'Can Wait', color: '#22c55e' },
];

const defaultTodos: TodoItem[] = [
  { id: 'q-1', group: 'Quotes Needed', text: 'Hancock', done: false },
  { id: 'q-2', group: 'Quotes Needed', text: 'Keith Murt', done: false },
  { id: 'q-3', group: 'Quotes Needed', text: 'Blackwell', done: false },
  { id: 'q-4', group: 'Quotes Needed', text: 'Abby Dority - lake house', done: false },
  { id: 'q-5', group: 'Quotes Needed', text: 'Tim Harmon', done: false },
  { id: 'a-1', group: 'Appointments', text: 'MRI - Thu Mar 26 | Arrive 6:30 AM for 7:00 AM', done: false },
];

const defaultEvents: CalendarEvent[] = [
  { id: 'ev-1', title: 'MRI Appointment', date: '2026-03-26', time: '6:30 AM', color: '#ef4444', category: 'Health' },
];

export const makeId = (prefix = 'ev') => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

const isUrgencyColumnId = (value: unknown): value is UrgencyColumnId =>
  value === 'urgent' || value === 'soon' || value === 'later';

const normalizeTodo = (value: any): TodoItem => ({
  id: typeof value?.id === 'string' ? value.id : makeId('todo'),
  group: typeof value?.group === 'string' && value.group.trim() ? value.group : 'General',
  text: typeof value?.text === 'string' ? value.text : '',
  done: Boolean(value?.done),
  scheduledDate: typeof value?.scheduledDate === 'string' ? value.scheduledDate : undefined,
  urgencyColumnId: isUrgencyColumnId(value?.urgencyColumnId) ? value.urgencyColumnId : undefined,
  note: typeof value?.note === 'string' ? value.note : undefined,
  completedAt: typeof value?.completedAt === 'string' ? value.completedAt : undefined,
  createdAt: typeof value?.createdAt === 'string' ? value.createdAt : undefined,
});

const normalizeEvent = (value: any): CalendarEvent => ({
  id: typeof value?.id === 'string' ? value.id : makeId('ev'),
  title: typeof value?.title === 'string' ? value.title : 'Untitled Event',
  date: typeof value?.date === 'string' ? value.date : new Date().toISOString().slice(0, 10),
  time: typeof value?.time === 'string' ? value.time : undefined,
  color: typeof value?.color === 'string' ? value.color : '#a855f7',
  category: typeof value?.category === 'string' ? value.category : 'Work',
});

const normalizeUrgencyColumns = (value: any): UrgencyColumn[] => {
  if (!Array.isArray(value)) return defaultUrgencyColumns;
  return defaultUrgencyColumns.map((column, idx) => {
    const incoming = value[idx];
    const title = typeof incoming?.title === 'string' && incoming.title.trim() ? incoming.title.trim() : column.title;
    return { ...column, title };
  });
};

const normalizeOpsState = (value: OpsStatePayload) => ({
  todos: Array.isArray(value?.todos) ? value.todos.map(normalizeTodo) : null,
  events: Array.isArray(value?.events) ? value.events.map(normalizeEvent) : null,
  urgencyColumns: Array.isArray(value?.urgencyColumns) ? normalizeUrgencyColumns(value.urgencyColumns) : null,
});

/* ── Singleton listener pattern so multiple components share one source of truth ── */

type Listener = () => void;

const REFRESH_INTERVAL_MS = 6 * 60 * 60 * 1000; // 6 hours

class OpsStateStore {
  todos: TodoItem[] = defaultTodos;
  events: CalendarEvent[] = defaultEvents;
  urgencyColumns: UrgencyColumn[] = defaultUrgencyColumns;
  syncStatus: SyncStatus = 'syncing';
  hasHydrated = false;
  private listeners = new Set<Listener>();
  private syncTimer: number | null = null;
  private hydrationPromise: Promise<void> | null = null;
  private autoSyncAttached = false;
  private refreshInterval: number | null = null;

  subscribe(listener: Listener) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private emit() {
    this.listeners.forEach((l) => l());
  }

  private loadLocal() {
    try {
      const tc = localStorage.getItem(TODO_KEY);
      if (tc) {
        const parsed = JSON.parse(tc);
        if (Array.isArray(parsed)) this.todos = parsed.map(normalizeTodo);
      }
      const ec = localStorage.getItem(EVENTS_KEY);
      if (ec) {
        const parsed = JSON.parse(ec);
        if (Array.isArray(parsed)) this.events = parsed.map(normalizeEvent);
      }
      const uc = localStorage.getItem(URGENCY_COLUMNS_KEY);
      if (uc) this.urgencyColumns = normalizeUrgencyColumns(JSON.parse(uc));
    } catch {
      /* keep defaults */
    }
  }

  hydrate() {
    if (this.hydrationPromise) return this.hydrationPromise;
    this.hydrationPromise = (async () => {
      let cloudReachable = false;
      let cloudStateApplied = false;
      try {
        const res = await fetch('/api/ops-state', { cache: 'no-store' });
        if (res.ok) {
          cloudReachable = true;
          const body = await res.json();
          if (body?.state) {
            const normalized = normalizeOpsState(body.state as OpsStatePayload);
            if (normalized.todos) this.todos = normalized.todos;
            if (normalized.events) this.events = normalized.events;
            if (normalized.urgencyColumns) this.urgencyColumns = normalized.urgencyColumns;
            cloudStateApplied = true;
          }
        }
      } catch {
        /* fall through */
      }
      if (!cloudStateApplied) this.loadLocal();
      this.syncStatus = cloudReachable ? 'synced' : 'offline';
      this.hasHydrated = true;
      this.emit();
    })();
    return this.hydrationPromise;
  }

  /**
   * Pull the latest state from Supabase and apply only if changed.
   * Skips when a local write is pending so we don't clobber unsaved edits.
   */
  async refresh() {
    if (!this.hasHydrated) return;
    if (this.syncTimer != null) return; // pending local write — let it flush first
    try {
      const res = await fetch('/api/ops-state', { cache: 'no-store' });
      if (!res.ok) {
        this.syncStatus = 'offline';
        this.emit();
        return;
      }
      const body = await res.json();
      if (!body?.state) {
        this.syncStatus = 'synced';
        this.emit();
        return;
      }
      const normalized = normalizeOpsState(body.state as OpsStatePayload);
      let changed = false;
      if (normalized.todos && JSON.stringify(normalized.todos) !== JSON.stringify(this.todos)) {
        this.todos = normalized.todos;
        changed = true;
      }
      if (normalized.events && JSON.stringify(normalized.events) !== JSON.stringify(this.events)) {
        this.events = normalized.events;
        changed = true;
      }
      if (
        normalized.urgencyColumns &&
        JSON.stringify(normalized.urgencyColumns) !== JSON.stringify(this.urgencyColumns)
      ) {
        this.urgencyColumns = normalized.urgencyColumns;
        changed = true;
      }
      this.syncStatus = 'synced';
      if (changed) {
        try {
          localStorage.setItem(TODO_KEY, JSON.stringify(this.todos));
          localStorage.setItem(EVENTS_KEY, JSON.stringify(this.events));
          localStorage.setItem(URGENCY_COLUMNS_KEY, JSON.stringify(this.urgencyColumns));
        } catch {}
      }
      this.emit();
    } catch {
      this.syncStatus = 'offline';
      this.emit();
    }
  }

  /**
   * Wire up auto-refresh: re-fetch from cloud on window focus, on
   * visibility change to visible, and as a 6-hour backstop interval.
   * Idempotent — safe to call from every hook subscriber.
   */
  attachAutoSync() {
    if (this.autoSyncAttached) return;
    if (typeof window === 'undefined') return;
    this.autoSyncAttached = true;

    const onFocus = () => this.refresh();
    const onVisibility = () => {
      if (document.visibilityState === 'visible') this.refresh();
    };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);
    this.refreshInterval = window.setInterval(() => this.refresh(), REFRESH_INTERVAL_MS);
  }

  private scheduleSync() {
    if (!this.hasHydrated) return;
    try {
      localStorage.setItem(TODO_KEY, JSON.stringify(this.todos));
      localStorage.setItem(EVENTS_KEY, JSON.stringify(this.events));
      localStorage.setItem(URGENCY_COLUMNS_KEY, JSON.stringify(this.urgencyColumns));
    } catch {}

    if (this.syncTimer) window.clearTimeout(this.syncTimer);
    this.syncStatus = 'syncing';
    this.emit();
    this.syncTimer = window.setTimeout(async () => {
      try {
        const res = await fetch('/api/ops-state', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            state: {
              todos: this.todos,
              events: this.events,
              urgencyColumns: this.urgencyColumns,
            },
          }),
        });
        if (!res.ok) throw new Error('sync failed');
        this.syncStatus = 'synced';
      } catch {
        this.syncStatus = 'offline';
      }
      this.emit();
    }, 450);
  }

  setTodos(updater: TodoItem[] | ((prev: TodoItem[]) => TodoItem[])) {
    this.todos = typeof updater === 'function' ? (updater as any)(this.todos) : updater;
    this.emit();
    this.scheduleSync();
  }

  setEvents(updater: CalendarEvent[] | ((prev: CalendarEvent[]) => CalendarEvent[])) {
    this.events = typeof updater === 'function' ? (updater as any)(this.events) : updater;
    this.emit();
    this.scheduleSync();
  }

  setUrgencyColumns(updater: UrgencyColumn[] | ((prev: UrgencyColumn[]) => UrgencyColumn[])) {
    this.urgencyColumns = typeof updater === 'function' ? (updater as any)(this.urgencyColumns) : updater;
    this.emit();
    this.scheduleSync();
  }
}

let storeInstance: OpsStateStore | null = null;
function getStore() {
  if (!storeInstance) storeInstance = new OpsStateStore();
  return storeInstance;
}

export function useOpsState() {
  const store = getStore();
  const [, force] = useState(0);
  const mounted = useRef(false);

  useEffect(() => {
    mounted.current = true;
    const unsub = store.subscribe(() => {
      if (mounted.current) force((n) => n + 1);
    });
    if (!store.hasHydrated) {
      store.hydrate().then(() => store.attachAutoSync());
    } else {
      store.attachAutoSync();
    }
    return () => {
      mounted.current = false;
      unsub();
    };
  }, [store]);

  const setTodos = useCallback(
    (updater: TodoItem[] | ((prev: TodoItem[]) => TodoItem[])) => store.setTodos(updater),
    [store],
  );
  const setEvents = useCallback(
    (updater: CalendarEvent[] | ((prev: CalendarEvent[]) => CalendarEvent[])) => store.setEvents(updater),
    [store],
  );
  const setUrgencyColumns = useCallback(
    (updater: UrgencyColumn[] | ((prev: UrgencyColumn[]) => UrgencyColumn[])) => store.setUrgencyColumns(updater),
    [store],
  );

  return useMemo(
    () => ({
      todos: store.todos,
      events: store.events,
      urgencyColumns: store.urgencyColumns,
      syncStatus: store.syncStatus,
      hasHydrated: store.hasHydrated,
      setTodos,
      setEvents,
      setUrgencyColumns,
    }),
    [store.todos, store.events, store.urgencyColumns, store.syncStatus, store.hasHydrated, setTodos, setEvents, setUrgencyColumns],
  );
}
