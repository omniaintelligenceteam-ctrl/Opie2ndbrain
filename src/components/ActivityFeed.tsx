'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { apiFetch } from '../lib/api';
import { SkeletonList } from './ui/Skeleton';
import { EmptyState } from './ui/EmptyState';

interface ActivityItem {
  id: string;
  type: 'message' | 'task' | 'agent' | 'cron' | 'system' | 'error';
  title: string;
  description?: string;
  timestamp: string;
  status?: 'success' | 'error' | 'pending' | 'running';
  metadata?: Record<string, unknown>;
}

interface ActivityFeedProps {
  maxItems?: number;
  pollInterval?: number;
  isThinking?: boolean;
  enabled?: boolean;
}

function formatRelativeTime(dateStr: string, mounted: boolean): string {
  if (!mounted) return '...';
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function getActivityIcon(type: string, status?: string): string {
  if (status === 'error') return '❌';
  if (status === 'running') return '⏳';
  
  switch (type) {
    case 'message': return '💬';
    case 'task': return status === 'success' ? '✅' : '📋';
    case 'agent': return '🤖';
    case 'cron': return '⏰';
    case 'system': return '⚙️';
    case 'error': return '⚠️';
    default: return '📌';
  }
}

function getActivityColor(type: string, status?: string): string {
  if (status === 'error') return '#ef4444';
  if (status === 'running') return '#f59e0b';
  if (status === 'success') return '#22c55e';
  
  switch (type) {
    case 'message': return '#6366f1';
    case 'task': return '#f59e0b';
    case 'agent': return '#22c55e';
    case 'cron': return '#8b5cf6';
    case 'system': return '#6b7280';
    case 'error': return '#ef4444';
    default: return '#6b7280';
  }
}

export default function ActivityFeed({
  maxItems = 20,
  pollInterval = 15000,
  isThinking = false,
  enabled = true,
}: ActivityFeedProps) {
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const feedRef = useRef<HTMLDivElement>(null);
  const prevActivityRef = useRef<ActivityItem[]>([]);

  // Track mounted state for hydration-safe date formatting
  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchActivity = useCallback(async () => {
    try {
      const res = await apiFetch('/api/activity');
      if (!res.ok) throw new Error('Failed to fetch activity');
      
      const data = await res.json();
      const newActivity = (data.activity || []).slice(0, maxItems);
      
      // Check for new items for animation
      const prevIds = new Set(prevActivityRef.current.map(a => a.id));
      const hasNewItems = newActivity.some((a: ActivityItem) => !prevIds.has(a.id));
      
      if (hasNewItems) {
        prevActivityRef.current = newActivity;
      }
      
      setActivity(newActivity);
      setError(null);
    } catch (err) {
      // Don't show error if we already have data
      if (activity.length === 0) {
        setError('Unable to load activity');
      }
    } finally {
      setLoading(false);
    }
  }, [maxItems, activity.length]);

  useEffect(() => {
    // Only poll when enabled
    if (!enabled) return;

    fetchActivity();
    const interval = setInterval(fetchActivity, pollInterval);
    return () => clearInterval(interval);
  }, [fetchActivity, pollInterval, enabled]);

  return (
    <div style={styles.container}>
      <style>{animationCSS}</style>
      
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <span style={styles.headerIcon}>⚡</span>
          <h3 style={styles.title}>Activity Feed</h3>
        </div>
        <div style={styles.headerRight}>
          {isThinking && (
            <div style={styles.thinkingIndicator}>
              <div style={styles.thinkingDot} />
              <span>Processing...</span>
            </div>
          )}
        </div>
      </div>

      {/* Feed */}
      <div ref={feedRef} style={styles.feed}>
        {loading && activity.length === 0 ? (
          <div style={{ padding: '16px' }}>
            <SkeletonList count={5} rowHeight={40} gap={12} />
          </div>
        ) : error && activity.length === 0 ? (
          <EmptyState
            icon="📭"
            title="Unable to load activity"
            description="Check your connection and try again. Activity will appear here as you interact with Opie."
          />
        ) : activity.length === 0 ? (
          <EmptyState
            icon="🌟"
            title="All quiet"
            description="Start a conversation or deploy an agent to see activity here. Everything Opie does will show up in real-time."
          />
        ) : (
          <div style={styles.timeline}>
            {activity.map((item, index) => (
              <div 
                key={item.id} 
                style={{
                  ...styles.activityItem,
                  animationDelay: `${index * 0.05}s`,
                }}
              >
                {/* Timeline connector */}
                {index < activity.length - 1 && (
                  <div style={styles.timelineConnector} />
                )}
                
                {/* Icon */}
                <div style={{
                  ...styles.activityIcon,
                  background: `${getActivityColor(item.type, item.status)}15`,
                  color: getActivityColor(item.type, item.status),
                  boxShadow: `0 0 12px ${getActivityColor(item.type, item.status)}30`,
                }}>
                  {getActivityIcon(item.type, item.status)}
                </div>
                
                {/* Content */}
                <div style={styles.activityContent}>
                  <div style={styles.activityHeader}>
                    <span style={styles.activityTitle}>{item.title}</span>
                    <span style={styles.activityTime}>
                      {formatRelativeTime(item.timestamp, mounted)}
                    </span>
                  </div>
                  {item.description && (
                    <p style={styles.activityDescription}>{item.description}</p>
                  )}
                  {item.status && (
                    <span style={{
                      ...styles.statusBadge,
                      background: `${getActivityColor(item.type, item.status)}15`,
                      color: getActivityColor(item.type, item.status),
                    }}>
                      {item.status}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const animationCSS = `
  @keyframes fadeInSlide {
    from { opacity: 0; transform: translateX(-10px); }
    to { opacity: 1; transform: translateX(0); }
  }
  @keyframes pulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.6; transform: scale(0.95); }
  }
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
`;

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    background: 'linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)',
    borderRadius: '20px',
    border: '1px solid rgba(255,255,255,0.06)',
    overflow: 'hidden',
  },
  
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px 24px',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  headerIcon: {
    fontSize: '20px',
  },
  title: {
    color: '#fff',
    fontSize: '1rem',
    fontWeight: 600,
    margin: 0,
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  thinkingIndicator: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '6px 12px',
    background: 'rgba(99, 102, 241, 0.1)',
    borderRadius: '20px',
    fontSize: '0.8rem',
    color: '#818cf8',
  },
  thinkingDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    background: '#6366f1',
    animation: 'pulse 1.5s infinite',
  },

  feed: {
    padding: '16px 24px 24px',
    maxHeight: '500px',
    overflowY: 'auto',
  },
  
  timeline: {
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  
  activityItem: {
    display: 'flex',
    gap: '16px',
    padding: '12px 0',
    position: 'relative',
    animation: 'fadeInSlide 0.3s ease forwards',
    opacity: 0,
  },
  
  timelineConnector: {
    position: 'absolute',
    left: '19px',
    top: '52px',
    bottom: '-4px',
    width: '2px',
    background: 'linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 100%)',
  },
  
  activityIcon: {
    width: '40px',
    height: '40px',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '16px',
    flexShrink: 0,
    position: 'relative',
    zIndex: 1,
  },
  
  activityContent: {
    flex: 1,
    minWidth: 0,
  },
  
  activityHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '12px',
    marginBottom: '4px',
  },
  
  activityTitle: {
    color: '#fff',
    fontSize: '0.9rem',
    fontWeight: 500,
    lineHeight: 1.4,
  },
  
  activityTime: {
    color: 'rgba(255,255,255,0.35)',
    fontSize: '0.75rem',
    whiteSpace: 'nowrap',
    fontVariantNumeric: 'tabular-nums',
  },
  
  activityDescription: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: '0.8rem',
    margin: '4px 0 0 0',
    lineHeight: 1.5,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
  },
  
  statusBadge: {
    display: 'inline-block',
    marginTop: '8px',
    padding: '4px 10px',
    borderRadius: '6px',
    fontSize: '0.7rem',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.03em',
  },

  loadingState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '16px',
    padding: '60px 20px',
    color: 'rgba(255,255,255,0.4)',
    fontSize: '0.9rem',
  },
  spinner: {
    width: '24px',
    height: '24px',
    border: '2px solid rgba(255,255,255,0.1)',
    borderTopColor: '#6366f1',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },

  emptyState: {
    textAlign: 'center',
    padding: '60px 30px',
    color: 'rgba(255,255,255,0.5)',
  },
  emptyIcon: {
    fontSize: '48px',
    display: 'block',
    marginBottom: '16px',
  },
  emptySubtext: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: '0.85rem',
    marginTop: '8px',
  },
};
