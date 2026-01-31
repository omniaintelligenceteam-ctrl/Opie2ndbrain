'use client';
import { useState, useEffect } from 'react';

export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  location?: string;
  description?: string;
  color?: string;
  isAllDay?: boolean;
  source?: 'google' | 'outlook' | 'local';
}

interface CalendarWidgetProps {
  events?: CalendarEvent[];
  onEventClick?: (event: CalendarEvent) => void;
  isConnected?: boolean;
  onConnect?: () => void;
  fullView?: boolean;
}

// Demo events generator - creates events relative to current time (client-side only)
function createDemoEvents(): CalendarEvent[] {
  const now = new Date();
  return [
    {
      id: '1',
      title: 'Team Standup',
      start: new Date(new Date(now).setHours(9, 0, 0, 0)),
      end: new Date(new Date(now).setHours(9, 30, 0, 0)),
      location: 'Zoom',
      color: '#667eea',
      source: 'google',
    },
    {
      id: '2',
      title: 'Client Call - OmniLightscape',
      start: new Date(new Date(now).setHours(11, 0, 0, 0)),
      end: new Date(new Date(now).setHours(12, 0, 0, 0)),
      location: 'Google Meet',
      color: '#22c55e',
      source: 'google',
    },
    {
      id: '3',
      title: 'Lunch with Alex',
      start: new Date(new Date(now).setHours(12, 30, 0, 0)),
      end: new Date(new Date(now).setHours(13, 30, 0, 0)),
      location: 'Blue Bottle Coffee',
      color: '#f59e0b',
      source: 'google',
    },
    {
      id: '4',
      title: 'Review Q4 Projections',
      start: new Date(new Date(now).setHours(15, 0, 0, 0)),
      end: new Date(new Date(now).setHours(16, 0, 0, 0)),
      description: 'Prepare slides for board meeting',
      color: '#764ba2',
      source: 'google',
    },
    {
      id: '5',
      title: 'Gym Session',
      start: new Date(now.getTime() + 86400000 + 1000 * 60 * 60 * 7), // Tomorrow 7am
      end: new Date(now.getTime() + 86400000 + 1000 * 60 * 60 * 8),
      location: 'Equinox',
      color: '#ef4444',
      source: 'google',
    },
  ];
}

export default function CalendarWidget({ 
  events: propEvents, 
  onEventClick,
  isConnected = true,
  onConnect,
  fullView = false,
}: CalendarWidgetProps) {
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [demoEvents, setDemoEvents] = useState<CalendarEvent[]>([]);

  useEffect(() => {
    // Set initial time and demo events on client only (avoids hydration mismatch)
    setCurrentTime(new Date());
    if (!propEvents) {
      setDemoEvents(createDemoEvents());
    }
    const interval = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(interval);
  }, [propEvents]);

  const events = propEvents || demoEvents;

  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  };

  const formatDate = (date: Date): string => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return 'Tomorrow';
    }
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const isEventNow = (event: CalendarEvent): boolean => {
    if (!currentTime) return false;
    return currentTime >= event.start && currentTime <= event.end;
  };

  const isEventSoon = (event: CalendarEvent): boolean => {
    if (!currentTime) return false;
    const diff = event.start.getTime() - currentTime.getTime();
    return diff > 0 && diff <= 30 * 60 * 1000; // Within 30 minutes
  };

  const getTimeUntil = (event: CalendarEvent): string => {
    if (!currentTime) return '...';
    const diff = event.start.getTime() - currentTime.getTime();
    if (diff <= 0) return 'Now';
    const minutes = Math.floor(diff / 60000);
    if (minutes < 60) return `in ${minutes}m`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `in ${hours}h`;
    return `in ${Math.floor(hours / 24)}d`;
  };

  // Sort events and filter to upcoming (next 48 hours)
  const upcomingEvents = currentTime 
    ? events.filter(e => e.end >= currentTime && e.start <= new Date(currentTime.getTime() + 48 * 60 * 60 * 1000))
        .sort((a, b) => a.start.getTime() - b.start.getTime())
    : [];

  // Group by date
  const groupedEvents: { [key: string]: CalendarEvent[] } = {};
  upcomingEvents.forEach(event => {
    const dateKey = formatDate(event.start);
    if (!groupedEvents[dateKey]) {
      groupedEvents[dateKey] = [];
    }
    groupedEvents[dateKey].push(event);
  });

  const handleEventClick = (event: CalendarEvent) => {
    setSelectedEvent(event);
    onEventClick?.(event);
  };

  // Not connected state
  if (!isConnected) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <div style={styles.headerLeft}>
            <span style={styles.headerIcon}>📅</span>
            <div>
              <h2 style={styles.title}>Calendar</h2>
              <span style={styles.subtitle}>Connect to sync</span>
            </div>
          </div>
        </div>
        <div style={styles.connectPrompt}>
          <span style={styles.connectIcon}>🔗</span>
          <h3 style={styles.connectTitle}>Connect Your Calendar</h3>
          <p style={styles.connectText}>Link your Google or Outlook calendar to see your schedule here</p>
          <button onClick={onConnect} style={styles.connectButton}>
            Connect Calendar
          </button>
        </div>
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <div style={styles.headerLeft}>
            <span style={styles.headerIcon}>📅</span>
            <div>
              <h2 style={styles.title}>Calendar</h2>
              <span style={styles.subtitle}>Loading...</span>
            </div>
          </div>
        </div>
        <div style={styles.loadingContainer}>
          {[1, 2, 3].map(i => (
            <div key={i} style={styles.skeleton}>
              <div style={styles.skeletonTime} />
              <div style={styles.skeletonContent}>
                <div style={styles.skeletonTitle} />
                <div style={styles.skeletonLocation} />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Event detail view
  if (selectedEvent) {
    const event = selectedEvent;
    return (
      <div style={styles.container}>
        <button onClick={() => setSelectedEvent(null)} style={styles.backButton}>
          ← Back
        </button>
        <div style={styles.eventDetail}>
          <div style={{ ...styles.eventDetailColor, background: event.color || '#667eea' }} />
          <h3 style={styles.eventDetailTitle}>{event.title}</h3>
          <div style={styles.eventDetailMeta}>
            <div style={styles.eventDetailRow}>
              <span style={styles.eventDetailIcon}>🕐</span>
              <span>{formatDate(event.start)}, {formatTime(event.start)} - {formatTime(event.end)}</span>
            </div>
            {event.location && (
              <div style={styles.eventDetailRow}>
                <span style={styles.eventDetailIcon}>📍</span>
                <span>{event.location}</span>
              </div>
            )}
            {event.description && (
              <div style={styles.eventDetailRow}>
                <span style={styles.eventDetailIcon}>📝</span>
                <span>{event.description}</span>
              </div>
            )}
            {event.source && (
              <div style={styles.eventDetailRow}>
                <span style={styles.eventDetailIcon}>🔗</span>
                <span style={styles.sourceTag}>
                  {event.source === 'google' ? 'Google Calendar' : event.source === 'outlook' ? 'Outlook' : 'Local'}
                </span>
              </div>
            )}
          </div>
          <div style={styles.eventActions}>
            <button style={styles.eventActionButton}>✏️ Edit</button>
            <button style={styles.eventActionButton}>🔔 Reminder</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <span style={styles.headerIcon}>📅</span>
          <div>
            <h2 style={styles.title}>Calendar</h2>
            <span style={styles.subtitle}>{upcomingEvents.length} upcoming events</span>
          </div>
        </div>
        <span style={styles.syncIndicator} title="Synced with Google Calendar">🟢</span>
      </div>

      <div style={{...styles.eventList, ...(fullView ? { maxHeight: 'none' } : {})}}>
        {upcomingEvents.length === 0 ? (
          <div style={styles.emptyState}>
            <span style={styles.emptyIcon}>🎉</span>
            <h3 style={styles.emptyTitle}>All clear!</h3>
            <p style={styles.emptyText}>No events in the next 48 hours</p>
          </div>
        ) : (
          Object.entries(groupedEvents).map(([dateLabel, dateEvents]) => (
            <div key={dateLabel} style={styles.dateGroup}>
              <div style={styles.dateLabel}>{dateLabel}</div>
              {dateEvents.map(event => {
                const isNow = isEventNow(event);
                const isSoon = isEventSoon(event);
                return (
                  <div
                    key={event.id}
                    style={{
                      ...styles.eventCard,
                      ...(isNow ? styles.eventCardActive : {}),
                      ...(isSoon ? styles.eventCardSoon : {}),
                    }}
                    onClick={() => handleEventClick(event)}
                  >
                    <div style={{ ...styles.eventColor, background: event.color || '#667eea' }} />
                    <div style={styles.eventTime}>
                      <span style={styles.eventTimeText}>{formatTime(event.start)}</span>
                      {(isNow || isSoon) && (
                        <span style={{
                          ...styles.eventBadge,
                          background: isNow ? '#22c55e' : '#f59e0b',
                        }}>
                          {isNow ? 'NOW' : getTimeUntil(event)}
                        </span>
                      )}
                    </div>
                    <div style={styles.eventInfo}>
                      <div style={styles.eventTitle}>{event.title}</div>
                      {event.location && (
                        <div style={styles.eventLocation}>📍 {event.location}</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    background: '#1a1a2e',
    borderRadius: '16px',
    border: '1px solid rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  header: {
    padding: '16px 20px',
    borderBottom: '1px solid rgba(255,255,255,0.08)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  syncIndicator: {
    fontSize: '10px',
    cursor: 'help',
  },
  eventList: {
    padding: '12px',
    maxHeight: '360px',
    overflowY: 'auto',
  },
  dateGroup: {
    marginBottom: '16px',
  },
  dateLabel: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: '0.7rem',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    marginBottom: '8px',
    paddingLeft: '4px',
  },
  eventCard: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    padding: '12px',
    background: 'rgba(255,255,255,0.03)',
    borderRadius: '10px',
    marginBottom: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    border: '1px solid transparent',
  },
  eventCardActive: {
    background: 'rgba(34, 197, 94, 0.1)',
    border: '1px solid rgba(34, 197, 94, 0.3)',
  },
  eventCardSoon: {
    background: 'rgba(245, 158, 11, 0.1)',
    border: '1px solid rgba(245, 158, 11, 0.3)',
  },
  eventColor: {
    width: '4px',
    height: '100%',
    minHeight: '40px',
    borderRadius: '2px',
    flexShrink: 0,
  },
  eventTime: {
    minWidth: '60px',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  eventTimeText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: '0.8rem',
    fontWeight: 500,
  },
  eventBadge: {
    padding: '2px 6px',
    borderRadius: '4px',
    fontSize: '0.65rem',
    fontWeight: 700,
    color: '#fff',
    textAlign: 'center',
  },
  eventInfo: {
    flex: 1,
    minWidth: 0,
  },
  eventTitle: {
    color: '#fff',
    fontSize: '0.85rem',
    fontWeight: 500,
    marginBottom: '4px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  eventLocation: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: '0.75rem',
  },
  emptyState: {
    textAlign: 'center',
    padding: '32px 16px',
    color: 'rgba(255,255,255,0.4)',
  },
  emptyIcon: {
    fontSize: '36px',
    display: 'block',
    marginBottom: '12px',
  },
  emptyTitle: {
    color: '#fff',
    fontSize: '0.95rem',
    fontWeight: 600,
    margin: '0 0 4px 0',
  },
  emptyText: {
    fontSize: '0.8rem',
    margin: 0,
  },
  loadingContainer: {
    padding: '12px',
  },
  skeleton: {
    display: 'flex',
    gap: '12px',
    padding: '12px',
    marginBottom: '8px',
  },
  skeletonTime: {
    width: '50px',
    height: '16px',
    background: 'rgba(255,255,255,0.05)',
    borderRadius: '4px',
    animation: 'pulse 1.5s ease-in-out infinite',
  },
  skeletonContent: {
    flex: 1,
  },
  skeletonTitle: {
    height: '16px',
    background: 'rgba(255,255,255,0.05)',
    borderRadius: '4px',
    marginBottom: '8px',
    animation: 'pulse 1.5s ease-in-out infinite',
  },
  skeletonLocation: {
    height: '12px',
    width: '60%',
    background: 'rgba(255,255,255,0.03)',
    borderRadius: '4px',
    animation: 'pulse 1.5s ease-in-out infinite',
  },
  connectPrompt: {
    textAlign: 'center',
    padding: '40px 24px',
  },
  connectIcon: {
    fontSize: '40px',
    display: 'block',
    marginBottom: '16px',
  },
  connectTitle: {
    color: '#fff',
    fontSize: '1rem',
    fontWeight: 600,
    margin: '0 0 8px 0',
  },
  connectText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: '0.85rem',
    margin: '0 0 20px 0',
  },
  connectButton: {
    padding: '12px 24px',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    border: 'none',
    borderRadius: '10px',
    color: '#fff',
    fontSize: '0.9rem',
    fontWeight: 600,
    cursor: 'pointer',
  },
  backButton: {
    margin: '12px 12px 0',
    padding: '8px 14px',
    background: 'rgba(255,255,255,0.05)',
    border: 'none',
    borderRadius: '8px',
    color: 'rgba(255,255,255,0.7)',
    fontSize: '0.8rem',
    cursor: 'pointer',
  },
  eventDetail: {
    padding: '20px',
  },
  eventDetailColor: {
    height: '6px',
    borderRadius: '3px',
    marginBottom: '16px',
  },
  eventDetailTitle: {
    color: '#fff',
    fontSize: '1.1rem',
    fontWeight: 600,
    margin: '0 0 16px 0',
  },
  eventDetailMeta: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    marginBottom: '20px',
  },
  eventDetailRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    color: 'rgba(255,255,255,0.7)',
    fontSize: '0.85rem',
  },
  eventDetailIcon: {
    fontSize: '16px',
  },
  sourceTag: {
    padding: '4px 10px',
    background: 'rgba(255,255,255,0.1)',
    borderRadius: '6px',
    fontSize: '0.75rem',
  },
  eventActions: {
    display: 'flex',
    gap: '10px',
  },
  eventActionButton: {
    flex: 1,
    padding: '10px',
    background: 'rgba(255,255,255,0.05)',
    border: 'none',
    borderRadius: '8px',
    color: 'rgba(255,255,255,0.7)',
    fontSize: '0.8rem',
    cursor: 'pointer',
  },
};
