'use client';
import { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight, Calendar, Mail, Activity } from 'lucide-react';
import { useSystemStatus, useConnectionStatus } from '../hooks/useRealTimeData';

// =============================================================================
// CollapsibleSidebarSection - Reusable collapsible wrapper
// =============================================================================
interface CollapsibleSidebarSectionProps {
  title: string;
  icon: React.ReactNode;
  badge?: number | string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

function CollapsibleSidebarSection({ 
  title, 
  icon, 
  badge, 
  defaultOpen = false, 
  children 
}: CollapsibleSidebarSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div style={sectionStyles.container}>
      <button 
        onClick={() => setIsOpen(!isOpen)} 
        style={sectionStyles.header}
        className="sidebar-section-header"
      >
        <div style={sectionStyles.headerLeft}>
          <span style={sectionStyles.icon}>{icon}</span>
          <span style={sectionStyles.title}>{title}</span>
          {badge !== undefined && (
            <span style={sectionStyles.badge}>{badge}</span>
          )}
        </div>
        {isOpen ? (
          <ChevronDown size={14} style={{ color: 'rgba(255,255,255,0.4)' }} />
        ) : (
          <ChevronRight size={14} style={{ color: 'rgba(255,255,255,0.4)' }} />
        )}
      </button>
      {isOpen && (
        <div style={sectionStyles.content}>
          {children}
        </div>
      )}
    </div>
  );
}

const sectionStyles: { [key: string]: React.CSSProperties } = {
  container: {
    borderBottom: '1px solid rgba(255,255,255,0.04)',
  },
  header: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 16px',
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    transition: 'background 0.2s ease',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  icon: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'rgba(255,255,255,0.5)',
  },
  title: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: '0.8rem',
    fontWeight: 600,
    letterSpacing: '0.02em',
  },
  badge: {
    padding: '2px 6px',
    background: 'rgba(102,126,234,0.2)',
    color: '#667eea',
    fontSize: '0.65rem',
    fontWeight: 700,
    borderRadius: '8px',
  },
  content: {
    padding: '0 12px 12px',
  },
};

// =============================================================================
// SidebarCalendarWidget - Compact calendar for sidebar
// =============================================================================
interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  location?: string;
  color?: string;
}

// Generate demo events dynamically to avoid hydration mismatch
function getDemoEvents(): CalendarEvent[] {
  const now = new Date();
  return [
    {
      id: '1',
      title: 'Team Standup',
      start: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9, 0, 0),
      end: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9, 30, 0),
      location: 'Zoom',
      color: '#667eea',
    },
    {
      id: '2',
      title: 'Client Call',
      start: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 11, 0, 0),
      end: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0),
      location: 'Google Meet',
      color: '#22c55e',
    },
    {
      id: '3',
      title: 'Lunch',
      start: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 30, 0),
      end: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 13, 30, 0),
      color: '#f59e0b',
    },
  ];
}

export function SidebarCalendarWidget() {
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const [events, setEvents] = useState<CalendarEvent[]>([]);

  useEffect(() => {
    // Initialize on client only to avoid hydration mismatch
    setCurrentTime(new Date());
    setEvents(getDemoEvents());
    const interval = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (date: Date | string): string => {
    const d = date instanceof Date ? date : new Date(date);
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  };

  const toDate = (d: Date | string): Date => d instanceof Date ? d : new Date(d);

  const isEventNow = (event: CalendarEvent): boolean => {
    if (!currentTime) return false;
    const start = toDate(event.start);
    const end = toDate(event.end);
    return currentTime >= start && currentTime <= end;
  };

  const isEventSoon = (event: CalendarEvent): boolean => {
    if (!currentTime) return false;
    const start = toDate(event.start);
    const diff = start.getTime() - currentTime.getTime();
    return diff > 0 && diff <= 30 * 60 * 1000;
  };

  // Don't render until client-side hydration is complete
  if (!currentTime) {
    return <div style={calendarStyles.empty}><span style={calendarStyles.emptyText}>Loading...</span></div>;
  }

  const upcomingEvents = events
    .filter(e => toDate(e.end) >= currentTime)
    .sort((a, b) => toDate(a.start).getTime() - toDate(b.start).getTime())
    .slice(0, 3);

  return (
    <div style={calendarStyles.container}>
      {upcomingEvents.length === 0 ? (
        <div style={calendarStyles.empty}>
          <span style={calendarStyles.emptyIcon}>🎉</span>
          <span style={calendarStyles.emptyText}>All clear!</span>
        </div>
      ) : (
        upcomingEvents.map(event => {
          const isNow = isEventNow(event);
          const isSoon = isEventSoon(event);
          return (
            <div
              key={event.id}
              style={{
                ...calendarStyles.event,
                ...(isNow ? calendarStyles.eventNow : {}),
                ...(isSoon && !isNow ? calendarStyles.eventSoon : {}),
              }}
            >
              <div style={{ ...calendarStyles.eventColor, background: event.color || '#667eea' }} />
              <div style={calendarStyles.eventInfo}>
                <div style={calendarStyles.eventTitle}>{event.title}</div>
                <div style={calendarStyles.eventTime}>
                  {isNow ? (
                    <span style={calendarStyles.nowBadge}>NOW</span>
                  ) : (
                    formatTime(event.start)
                  )}
                  {event.location && ` • ${event.location}`}
                </div>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

const calendarStyles: { [key: string]: React.CSSProperties } = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  empty: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px',
    background: 'rgba(255,255,255,0.02)',
    borderRadius: '8px',
  },
  emptyIcon: {
    fontSize: '16px',
  },
  emptyText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: '0.75rem',
  },
  event: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '10px',
    padding: '10px',
    background: 'rgba(255,255,255,0.02)',
    borderRadius: '8px',
    transition: 'all 0.2s ease',
    border: '1px solid transparent',
  },
  eventNow: {
    background: 'rgba(34, 197, 94, 0.08)',
    border: '1px solid rgba(34, 197, 94, 0.2)',
  },
  eventSoon: {
    background: 'rgba(245, 158, 11, 0.08)',
    border: '1px solid rgba(245, 158, 11, 0.2)',
  },
  eventColor: {
    width: '3px',
    height: '100%',
    minHeight: '28px',
    borderRadius: '2px',
    flexShrink: 0,
  },
  eventInfo: {
    flex: 1,
    minWidth: 0,
  },
  eventTitle: {
    color: '#fff',
    fontSize: '0.75rem',
    fontWeight: 500,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  eventTime: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: '0.65rem',
    marginTop: '2px',
  },
  nowBadge: {
    display: 'inline-block',
    padding: '1px 4px',
    background: '#22c55e',
    color: '#fff',
    fontSize: '0.55rem',
    fontWeight: 700,
    borderRadius: '3px',
    marginRight: '4px',
  },
};

// =============================================================================
// SidebarEmailWidget - Compact email for sidebar
// =============================================================================
interface Email {
  id: string;
  from: string;
  subject: string;
  preview: string;
  time: Date;
  isRead: boolean;
  isImportant: boolean;
}

// Generate demo emails dynamically to avoid hydration mismatch
function getDemoEmails(): Email[] {
  const now = Date.now();
  return [
    {
      id: '1',
      from: 'Sarah Chen',
      subject: 'Q4 Budget - Needs Approval',
      preview: 'Hey Wes, I\'ve attached the updated Q4 budget...',
      time: new Date(now - 1000 * 60 * 15),
      isRead: false,
      isImportant: true,
    },
    {
      id: '2',
      from: 'GitHub',
      subject: 'PR #234 merged',
      preview: 'The pull request has been merged into main...',
      time: new Date(now - 1000 * 60 * 45),
      isRead: false,
      isImportant: false,
    },
    {
      id: '3',
      from: 'David Park',
      subject: 'Re: Partnership',
      preview: 'Thanks for getting back! Tuesday works...',
      time: new Date(now - 1000 * 60 * 60 * 2),
      isRead: true,
      isImportant: false,
    },
  ];
}

export function SidebarEmailWidget() {
  const [emails, setEmails] = useState<Email[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setEmails(getDemoEmails());
    setMounted(true);
  }, []);

  const formatTime = (date: Date): string => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Don't render until client-side hydration is complete
  if (!mounted) {
    return <div style={emailStyles.container}><div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.7rem', padding: '12px' }}>Loading...</div></div>;
  }

  const unreadCount = emails.filter(e => !e.isRead).length;

  return (
    <div style={emailStyles.container}>
      {emails.slice(0, 3).map(email => (
        <div 
          key={email.id} 
          style={{
            ...emailStyles.email,
            ...(email.isRead ? emailStyles.emailRead : {}),
          }}
        >
          <div style={emailStyles.emailHeader}>
            <span style={emailStyles.emailFrom}>
              {email.isImportant && <span style={emailStyles.important}>!</span>}
              {email.from}
            </span>
            <span style={emailStyles.emailTime}>{formatTime(email.time)}</span>
          </div>
          <div style={emailStyles.emailSubject}>{email.subject}</div>
        </div>
      ))}
      {unreadCount > 0 && (
        <div style={emailStyles.unreadBanner}>
          {unreadCount} unread message{unreadCount !== 1 ? 's' : ''}
        </div>
      )}
    </div>
  );
}

const emailStyles: { [key: string]: React.CSSProperties } = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  email: {
    padding: '10px',
    background: 'rgba(255,255,255,0.03)',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'background 0.2s ease',
  },
  emailRead: {
    opacity: 0.6,
  },
  emailHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '4px',
  },
  emailFrom: {
    color: '#fff',
    fontSize: '0.7rem',
    fontWeight: 600,
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  important: {
    color: '#ef4444',
    fontWeight: 700,
  },
  emailTime: {
    color: 'rgba(255,255,255,0.35)',
    fontSize: '0.6rem',
    flexShrink: 0,
  },
  emailSubject: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: '0.65rem',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  unreadBanner: {
    padding: '6px 10px',
    background: 'linear-gradient(135deg, rgba(239,68,68,0.15) 0%, rgba(239,68,68,0.08) 100%)',
    borderRadius: '6px',
    color: '#ef4444',
    fontSize: '0.65rem',
    fontWeight: 600,
    textAlign: 'center',
    marginTop: '4px',
  },
};

// =============================================================================
// SidebarSystemHealth - Compact system health for sidebar
// =============================================================================
export function SidebarSystemHealth() {
  const { status, loading } = useSystemStatus(5000);
  const { isOnline, latency } = useConnectionStatus();

  const services = [
    {
      name: 'Gateway',
      status: status?.gateway?.connected ? 'online' : 'offline',
      latency: status?.gateway?.latency,
    },
    {
      name: 'API',
      status: status?.api?.healthy ? 'online' : 'offline',
      latency: status?.api?.responseTime,
    },
    {
      name: 'Voice',
      status: status?.voice?.available ? 'ready' : 'offline',
    },
    {
      name: 'Network',
      status: isOnline ? 'online' : 'offline',
      latency,
    },
  ];

  return (
    <div style={healthStyles.container}>
      {loading && !status ? (
        <div style={healthStyles.loading}>Checking status...</div>
      ) : (
        <>
          <div style={healthStyles.services}>
            {services.map(service => (
              <div key={service.name} style={healthStyles.service}>
                <div 
                  style={{
                    ...healthStyles.serviceDot,
                    background: service.status === 'online' || service.status === 'ready' 
                      ? '#22c55e' 
                      : '#ef4444',
                  }} 
                />
                <span style={healthStyles.serviceName}>{service.name}</span>
                {service.latency !== undefined && service.latency !== null && (
                  <span style={healthStyles.serviceLatency}>{service.latency}ms</span>
                )}
              </div>
            ))}
          </div>
          <div style={healthStyles.metrics}>
            <div style={healthStyles.metric}>
              <span style={healthStyles.metricValue}>{status?.agents?.active ?? 0}</span>
              <span style={healthStyles.metricLabel}>Agents</span>
            </div>
            <div style={healthStyles.metric}>
              <span style={{ ...healthStyles.metricValue, color: '#f59e0b' }}>
                {status?.tasks?.running ?? 0}
              </span>
              <span style={healthStyles.metricLabel}>Tasks</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

const healthStyles: { [key: string]: React.CSSProperties } = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  loading: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: '0.7rem',
    textAlign: 'center',
    padding: '12px',
  },
  services: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  service: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '6px 10px',
    background: 'rgba(255,255,255,0.02)',
    borderRadius: '6px',
  },
  serviceDot: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    flexShrink: 0,
  },
  serviceName: {
    flex: 1,
    color: 'rgba(255,255,255,0.7)',
    fontSize: '0.7rem',
    fontWeight: 500,
  },
  serviceLatency: {
    color: 'rgba(255,255,255,0.35)',
    fontSize: '0.6rem',
    fontFamily: 'monospace',
  },
  metrics: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '8px',
  },
  metric: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '10px',
    background: 'rgba(255,255,255,0.02)',
    borderRadius: '8px',
  },
  metricValue: {
    color: '#22c55e',
    fontSize: '1.1rem',
    fontWeight: 700,
  },
  metricLabel: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: '0.6rem',
    marginTop: '2px',
  },
};

// =============================================================================
// SidebarWidgets - Combined component with all widgets
// =============================================================================
interface SidebarWidgetsProps {
  isExpanded: boolean;
}

export default function SidebarWidgets({ isExpanded }: SidebarWidgetsProps) {
  const [calendarCount, setCalendarCount] = useState(3);
  const [emailCount, setEmailCount] = useState(2);

  if (!isExpanded) {
    return null; // Hide widgets when sidebar is collapsed
  }

  return (
    <div style={widgetsStyles.container}>
      {/* System Health removed - already shown on main page */}
      <style>{`
        .sidebar-section-header:hover {
          background: rgba(255,255,255,0.03);
        }
      `}</style>
    </div>
  );
}

const widgetsStyles: { [key: string]: React.CSSProperties } = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    overflowY: 'auto',
    maxHeight: '400px',
    marginTop: '8px',
  },
};
// Force deploy 1769848823
