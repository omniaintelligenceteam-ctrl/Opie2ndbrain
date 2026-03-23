'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { RefreshCw } from 'lucide-react';
import OIOSAgentCard, { type OIOSAgent, type AgentStatus } from '@/components/OIOSAgentCard';
import OIOSActivityFeed, { type ActivityItem } from '@/components/OIOSActivityFeed';

// ---------------------------------------------------------------------------
// Types for API response
// ---------------------------------------------------------------------------

interface AgentData {
  id: string;
  name: string;
  role: string;
  emoji: string;
  color: string;
  model: string;
  status: AgentStatus;
  lastAction?: string | null;
  lastActiveAt?: string | null;
}

interface OIOSStatusResponse {
  gateway: { connected: boolean };
  agents: AgentData[];
  recentActivity: ActivityItem[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

// ---------------------------------------------------------------------------
// Skeleton placeholder for loading state
// ---------------------------------------------------------------------------

function SkeletonCard() {
  return (
    <div className="animate-pulse rounded-xl bg-slate-800/50 border border-slate-700/30 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <div className="h-5 w-5 rounded bg-slate-700" />
        <div className="h-4 w-24 rounded bg-slate-700" />
        <div className="ml-auto h-2.5 w-2.5 rounded-full bg-slate-700" />
      </div>
      <div className="h-3 w-20 rounded bg-slate-700/60" />
      <div className="h-3 w-full rounded bg-slate-700/40" />
      <div className="flex items-center justify-between">
        <div className="h-4 w-16 rounded-full bg-slate-700/50" />
        <div className="h-3 w-10 rounded bg-slate-700/40" />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

const POLL_INTERVAL = 12_000;

export default function OIOSDashboard() {
  const [agents, setAgents] = useState<AgentData[]>([]);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [gatewayConnected, setGatewayConnected] = useState(false);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // -------------------------------------------------------------------
  // Fetch
  // -------------------------------------------------------------------

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/oios/status');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: OIOSStatusResponse = await res.json();

      setAgents(data.agents);
      setActivity(data.recentActivity || []);
      setGatewayConnected(data.gateway.connected);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setGatewayConnected(false);
    } finally {
      setLoading(false);
    }
  }, []);

  // -------------------------------------------------------------------
  // Polling lifecycle
  // -------------------------------------------------------------------

  useEffect(() => {
    fetchStatus();
    intervalRef.current = setInterval(fetchStatus, POLL_INTERVAL);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchStatus]);

  // -------------------------------------------------------------------
  // Handlers
  // -------------------------------------------------------------------

  const handleAgentClick = (agentId: string) => {
    setSelectedAgentId((prev) => (prev === agentId ? null : agentId));
  };

  const handleRetry = () => {
    setError(null);
    setLoading(true);
    fetchStatus();
  };

  // -------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 px-4 py-6 sm:px-6 lg:px-8">
      {/* -------- Header -------- */}
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              OIOS Command Center
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Real-time agent orchestration overview
            </p>
          </div>

          <div className="flex items-center gap-4">
            {/* Gateway status */}
            <div className="flex items-center gap-2">
              <span
                className={[
                  'h-2.5 w-2.5 rounded-full',
                  gatewayConnected
                    ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.7)] animate-pulse'
                    : 'bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.6)]',
                ].join(' ')}
              />
              <span
                className={`text-xs font-medium ${
                  gatewayConnected ? 'text-emerald-400' : 'text-red-400'
                }`}
              >
                {gatewayConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>

            {/* Last updated */}
            {lastUpdated && (
              <span className="text-[11px] text-slate-600">
                Updated {formatTime(lastUpdated)}
              </span>
            )}
          </div>
        </div>

        {/* -------- Error banner -------- */}
        {error && !loading && (
          <div className="mb-6 flex items-center justify-between rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3">
            <p className="text-sm text-red-300">
              Gateway unreachable &mdash; {error}
            </p>
            <button
              type="button"
              onClick={handleRetry}
              className="flex items-center gap-1.5 rounded-md bg-red-500/20 px-3 py-1.5 text-xs font-medium text-red-200 transition hover:bg-red-500/30"
            >
              <RefreshCw size={12} />
              Retry
            </button>
          </div>
        )}

        {/* -------- Agent grid -------- */}
        <section>
          <h2 className="sr-only">Agents</h2>

          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
              {Array.from({ length: 10 }).map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
              {agents.map((a) => (
                <OIOSAgentCard
                  key={a.id}
                  agent={{ name: a.name, role: a.role, emoji: a.emoji, color: a.color, model: a.model }}
                  status={a.status}
                  lastAction={a.lastAction || null}
                  lastActiveAt={a.lastActiveAt || null}
                  isSelected={selectedAgentId === a.id}
                  onClick={() => handleAgentClick(a.id)}
                />
              ))}
            </div>
          )}
        </section>

        {/* -------- Activity feed -------- */}
        <section className="mt-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-slate-300">
              Recent Activity
              {selectedAgentId && (
                <span className="ml-2 text-xs font-normal text-slate-500">
                  (filtered)
                </span>
              )}
            </h2>
            {selectedAgentId && (
              <button
                type="button"
                onClick={() => setSelectedAgentId(null)}
                className="text-xs text-slate-500 hover:text-slate-300 transition"
              >
                Clear filter
              </button>
            )}
          </div>

          <div className="rounded-xl border border-slate-700/50 bg-slate-900/60 p-4">
            <OIOSActivityFeed
              activities={activity}
              selectedAgentId={selectedAgentId}
            />
          </div>
        </section>
      </div>
    </div>
  );
}
