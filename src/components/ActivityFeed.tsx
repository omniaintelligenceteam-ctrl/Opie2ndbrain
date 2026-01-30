'use client';
import { useState, useEffect, useRef, useCallback } from 'react';

export interface ActivityItem {
  id: string;
  type: 'task_complete' | 'task_failed' | 'task_started' | 'reminder' | 'error' | 'info' | 'thinking';
  title: string;
  description?: string;
  timestamp: string;
  agentId?: string;
  agentEmoji?: string;
}

interface ActivityFeedProps {
  maxItems?: number;
  pollInterval?: number;
  onActivityClick?: (activity: ActivityItem) => void;
  isThinking?: boolean;
}

function getTypeConfig(type: ActivityItem['type']): { icon: string; color: string; bgColor: string } {
  switch (type) {
    case 'task_complete':
      return { icon: '✅', color: '#22c55e', bgColor: 'rgba(34,197,94,0.1)' };
    case 'task_failed':
      return { icon: '❌', color: '#ef4444', bgColor: 'rgba(239,68,68,0.1)' };
    case 'task_started':
      return { icon: '🚀', color: '#667eea', bgColor: 'rgba(102,126,234,0.1)' };
    case 'reminder':
      return { icon: '🔔', color: '#f59e0b', bgColor: 'rgba(245,158,11,0.1)' };
    case 'error':
      return { icon: '⚠️', color: '#ef4444', bgColor: 'rgba(239,68,68,0.1)' };
    case 'thinking':
      return { icon: '💭', color: '#8b5cf6', bgColor: 'rgba(139,92,246,0.1)' };
    default:
      return { icon: 'ℹ️', color: '#6b7280', bgColor: 'rgba(107,114,128,0.1)' };
  }
}

function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return date.toLocaleDateString();
}

export default function ActivityFeed({
  maxItems = 50,
  pollInterval = 10000,
  onActivityClick,
  isThinking = false,
}: ActivityFeedProps) {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const feedRef = useRef<HTMLDivElement>(null);
  const lastActivityRef = useRef<string | null>(null);

  const fetchActivities = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      params.set('limit', String(maxItems));
      if (lastActivityRef.current) {
        params.set('since', lastActivityRef.current);
      }

      const res = await fetch(`/api/activity?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch activities');
      
      const data = await res.json();
      const newActivities = data.activities || [];

      if (newActivities.length > 0) {
        setActivities(prev => {
          // Merge and dedupe
          const existing = new Set(prev.map(a => a.id));
          const merged = [...prev];
          for (const activity of newActivities) {
            if (!existing.has(activity.id)) {
              merged.unshift(activity);
            }
          }
          // Sort by timestamp desc and limit
          return merged
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
            .slice(0, maxItems);
        });
        
        lastActivityRef.current = newActivities[0].timestamp;
      }
      
      setError(null);
    } catch (err) {
      console.error('Activity fetch error:', err);
      setError('Failed to load activity');
    } finally {
      setLoading(false);
    }
  }, [maxItems]);

  useEffect(() => {
    fetchActivities();
    const interval = setInterval(fetchActivities, pollInterval);
    return () => clearInterval(interval);
  }, [fetchActivities, pollInterval]);

  // Auto-scroll to top when new activities arrive
  useEffect(() => {
    if (autoScroll && feedRef.current) {
      feedRef.current.scrollTop = 0;
    }
  }, [activities, autoScroll]);

  const handleScroll = () => {
    if (feedRef.current) {
      setAutoScroll(feedRef.current.scrollTop < 50);
    }
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <span style={styles.headerIcon}>⚡</span>
          <div>
            <h2 style={styles.title}>Activity Feed</h2>
            <span style={styles.subtitle}>Real-time updates</span>
          </div>
        </div>
        <div style={styles.headerRight}>
          {!autoScroll && (
            <button 
              onClick={() => {
                setAutoScroll(true);
                if (feedRef.current) feedRef.current.scrollTop = 0;
              }}
              style={styles.scrollButton}
            >
              ↑ New
            </button>
          )}
          <div style={{
            ...styles.liveDot,
            animation: loading ? 'pulse 1.5s infinite' : 'none',
          }} />
        </div>
      </div>

      {/* Thinking Indicator */}
      {isThinking && (
        <div style={styles.thinkingBanner}>
          <div style={styles.thinkingDot} />
          <span>Opie is thinking...</span>
        </div>
      )}

      {/* Feed */}
      <div 
        ref={feedRef}
        style={styles.feed}
        onScroll={handleScroll}
      >
        {loading && activities.length === 0 ? (
          <div style={styles.loadingState}>
            <div style={styles.loadingSpinner}>⏳</div>
            <span>Loading activity...</span>
          </div>
        ) : error && activities.length === 0 ? (
          <div style={styles.errorState}>
            <span style={styles.errorIcon}>⚠️</span>
            <span>{error}</span>
            <button onClick={fetchActivities} style={styles.retryButton}>
              Retry
            </button>
          </div>
        ) : activities.length === 0 ? (
          <div style={styles.emptyState}>
            <span style={styles.emptyIcon}>📭</span>
            <span>No activity yet</span>
            <span style={styles.emptySubtext}>Activity will appear here as tasks run</span>
          </div>
        ) : (
          activities.map((activity, index) => {
            const config = getTypeConfig(activity.type);
            const isNew = index === 0 && !loading;
            
            return (
              <div
                key={activity.id}
                onClick={() => onActivityClick?.(activity)}
                style={{
                  ...styles.activityItem,
                  borderLeftColor: config.color,
                  background: config.bgColor,
                  cursor: onActivityClick ? 'pointer' : 'default',
                  animation: isNew ? 'slideIn 0.3s ease' : 'none',
                }}
              >
                <div style={styles.activityHeader}>
                  <div style={styles.activityMeta}>
                    <span style={styles.activityIcon}>{config.icon}</span>
                    {activity.agentEmoji && (
                      <span style={styles.agentEmoji}>{activity.agentEmoji}</span>
                    )}
                    <span style={{ ...styles.activityType, color: config.color }}>
                      {activity.type.replace('_', ' ')}
                    </span>
                  </div>
                  <span style={styles.activityTime}>
                    {formatTimestamp(activity.timestamp)}
                  </span>
                </div>
                <div style={styles.activityTitle}>{activity.title}</div>
                {activity.description && (
                  <div style={styles.activityDescription}>
                    {activity.description}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Footer Stats */}
      <div style={styles.footer}>
        <span style={styles.footerText}>
          {activities.length} events • Last updated {loading ? '...' : 'just now'}
        </span>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        @keyframes slideIn {
          from { 
            opacity: 0; 
            transform: translateY(-10px);
          }
          to { 
            opacity: 1; 
            transform: translateY(0);
          }
        }
        @keyframes thinking {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    background: '#1a1a2e',
    borderRadius: '16px',
    border: '1px solid rgba(255,255,255,0.08)',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    maxHeight: '600px',
  },

  header: {
    padding: '16px 20px',
    borderBottom: '1px solid rgba(255,255,255,0.08)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  headerIcon: {
    fontSize: '24px',
  },
  title: {
    color: '#fff',
    fontSize: '1rem',
    fontWeight: 600,
    margin: 0,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: '0.75rem',
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  scrollButton: {
    padding: '4px 10px',
    background: 'rgba(102,126,234,0.2)',
    border: 'none',
    borderRadius: '12px',
    color: '#667eea',
    fontSize: '0.75rem',
    fontWeight: 600,
    cursor: 'pointer',
  },
  liveDot: {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    background: '#22c55e',
  },

  thinkingBanner: {
    padding: '10px 20px',
    background: 'rgba(139,92,246,0.1)',
    borderBottom: '1px solid rgba(139,92,246,0.2)',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    color: '#8b5cf6',
    fontSize: '0.85rem',
    fontWeight: 500,
  },
  thinkingDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    background: '#8b5cf6',
    animation: 'thinking 1.5s ease-in-out infinite',
  },

  feed: {
    flex: 1,
    overflowY: 'auto',
    padding: '12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },

  activityItem: {
    padding: '12px 14px',
    borderRadius: '10px',
    borderLeft: '3px solid',
    transition: 'all 0.2s ease',
  },
  activityHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '6px',
  },
  activityMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  activityIcon: {
    fontSize: '14px',
  },
  agentEmoji: {
    fontSize: '14px',
  },
  activityType: {
    fontSize: '0.7rem',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  activityTime: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: '0.7rem',
  },
  activityTitle: {
    color: '#fff',
    fontSize: '0.85rem',
    fontWeight: 500,
    lineHeight: 1.4,
  },
  activityDescription: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: '0.8rem',
    marginTop: '4px',
    lineHeight: 1.4,
  },

  loadingState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px 20px',
    color: 'rgba(255,255,255,0.5)',
    gap: '12px',
  },
  loadingSpinner: {
    fontSize: '32px',
    animation: 'pulse 1s infinite',
  },

  errorState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px 20px',
    color: '#ef4444',
    gap: '12px',
    textAlign: 'center',
  },
  errorIcon: {
    fontSize: '32px',
  },
  retryButton: {
    padding: '8px 16px',
    background: 'rgba(239,68,68,0.2)',
    border: 'none',
    borderRadius: '8px',
    color: '#ef4444',
    fontWeight: 500,
    cursor: 'pointer',
  },

  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px 20px',
    color: 'rgba(255,255,255,0.5)',
    gap: '8px',
    textAlign: 'center',
  },
  emptyIcon: {
    fontSize: '40px',
    marginBottom: '8px',
  },
  emptySubtext: {
    fontSize: '0.8rem',
    color: 'rgba(255,255,255,0.3)',
  },

  footer: {
    padding: '10px 16px',
    borderTop: '1px solid rgba(255,255,255,0.05)',
    display: 'flex',
    justifyContent: 'center',
  },
  footerText: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: '0.7rem',
  },
};
