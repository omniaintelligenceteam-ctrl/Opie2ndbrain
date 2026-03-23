'use client';

import { useMemo } from 'react';
import { Clock, MessageSquare, Zap, Settings } from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ActivityType = 'cron' | 'discord' | 'task' | 'system';

export interface ActivityItem {
  id: string;
  agentId: string;
  agentName: string;
  agentColor: string;
  type: ActivityType;
  message: string;
  timestamp: string;
}

export interface OIOSActivityFeedProps {
  activities: ActivityItem[];
  selectedAgentId: string | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TYPE_ICONS: Record<ActivityType, React.ComponentType<{ className?: string; size?: number | string }>> = {
  cron: Clock,
  discord: MessageSquare,
  task: Zap,
  system: Settings,
};

const TYPE_LABELS: Record<ActivityType, string> = {
  cron: 'Cron',
  discord: 'Discord',
  task: 'Task',
  system: 'System',
};

function formatTimestamp(dateStr: string): string {
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return '';
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const minutes = Math.floor(diffMs / 60000);

  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function OIOSActivityFeed({
  activities,
  selectedAgentId,
}: OIOSActivityFeedProps) {
  const filtered = useMemo(() => {
    if (!selectedAgentId) return activities;
    return activities.filter((a) => a.agentId === selectedAgentId);
  }, [activities, selectedAgentId]);

  if (filtered.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-sm text-slate-500">No recent activity</p>
      </div>
    );
  }

  return (
    <div className="max-h-[420px] overflow-y-auto pr-1 space-y-1 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
      {filtered.map((item) => {
        const Icon = TYPE_ICONS[item.type];
        return (
          <div
            key={item.id}
            className="flex items-start gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-slate-800/40"
            style={{ borderLeft: `3px solid ${item.agentColor}` }}
          >
            {/* Type icon */}
            <div className="shrink-0 mt-0.5 text-slate-500">
              <Icon size={14} />
            </div>

            {/* Content */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                {/* Agent badge */}
                <span
                  className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold text-white/90"
                  style={{ backgroundColor: `${item.agentColor}33`, color: item.agentColor }}
                >
                  {item.agentName}
                </span>

                {/* Type label */}
                <span className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">
                  {TYPE_LABELS[item.type]}
                </span>

                {/* Timestamp */}
                <span className="ml-auto text-[10px] text-slate-600 shrink-0">
                  {formatTimestamp(item.timestamp)}
                </span>
              </div>

              <p className="mt-0.5 text-xs text-slate-300 leading-relaxed line-clamp-2">
                {item.message}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
