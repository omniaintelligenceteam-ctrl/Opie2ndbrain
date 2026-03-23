'use client';

import { useMemo } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface OIOSAgent {
  name: string;
  role: string;
  emoji: string;
  color: string;
  model: string;
}

export type AgentStatus = 'active' | 'idle' | 'error';

export interface OIOSAgentCardProps {
  agent: OIOSAgent;
  status: AgentStatus;
  lastAction: string | null;
  lastActiveAt: string | null;
  isSelected: boolean;
  onClick: () => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatRelativeTime(dateStr: string | null): string {
  if (!dateStr) return '';
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  if (Number.isNaN(then)) return '';
  const diffMs = now - then;
  if (diffMs < 0) return 'just now';

  const seconds = Math.floor(diffMs / 1000);
  if (seconds < 60) return 'just now';

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

const STATUS_CONFIG: Record<AgentStatus, { dotClass: string; label: string }> = {
  active: {
    dotClass: 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.7)] animate-pulse',
    label: 'Active',
  },
  idle: {
    dotClass: 'bg-yellow-400 shadow-[0_0_6px_rgba(250,204,21,0.5)]',
    label: 'Idle',
  },
  error: {
    dotClass: 'bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.7)]',
    label: 'Error',
  },
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function OIOSAgentCard({
  agent,
  status,
  lastAction,
  lastActiveAt,
  isSelected,
  onClick,
}: OIOSAgentCardProps) {
  const safeAgent = agent ?? { name: '...', role: '', emoji: '⏳', color: '#64748b', model: '' };
  const statusCfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.idle;
  const relativeTime = useMemo(() => formatRelativeTime(lastActiveAt), [lastActiveAt]);

  // Build ring style dynamically so we can use the agent's own color
  const ringStyle = isSelected
    ? { boxShadow: `0 0 0 2px ${safeAgent.color}` }
    : undefined;

  return (
    <button
      type="button"
      onClick={onClick}
      style={ringStyle}
      className={[
        'group w-full text-left rounded-xl p-4 transition-all duration-200',
        'bg-slate-800/50 border border-slate-700/50',
        'hover:brightness-125 hover:border-slate-600/60',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500',
        isSelected ? 'ring-2' : '',
      ].join(' ')}
    >
      {/* Top row: emoji + name + status dot */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-lg shrink-0" aria-hidden="true">
            {safeAgent.emoji}
          </span>
          <span className="text-sm font-semibold text-slate-100 truncate">
            {safeAgent.name}
          </span>
        </div>
        <span
          className={`shrink-0 h-2.5 w-2.5 rounded-full ${statusCfg.dotClass}`}
          title={statusCfg.label}
        />
      </div>

      {/* Role */}
      <p className="mt-1 text-xs text-slate-500 truncate">{safeAgent.role}</p>

      {/* Last action */}
      <p className="mt-2 text-xs text-slate-400 truncate leading-tight min-h-[1rem]">
        {lastAction ?? '\u00A0'}
      </p>

      {/* Bottom row: model badge + relative time */}
      <div className="mt-3 flex items-center justify-between gap-2">
        <span
          className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium border border-slate-600/50 text-slate-300 bg-slate-700/60 truncate max-w-[50%]"
        >
          {safeAgent.model}
        </span>
        {relativeTime && (
          <span className="text-[10px] text-slate-500 shrink-0">{relativeTime}</span>
        )}
      </div>
    </button>
  );
}
