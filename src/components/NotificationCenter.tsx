'use client';
import { useState, useEffect, useRef } from 'react';
import { useNotifications, useToast, Notification, Toast } from '../hooks/useRealTimeData';

// =============================================================================
// Toast Container - Floating toast notifications
// =============================================================================

interface ToastContainerProps {
  toasts: Toast[];
  onDismiss: (id: string) => void;
}

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  const getToastStyles = (type: Toast['type']) => {
    switch (type) {
      case 'success':
        return { bg: 'rgba(34,197,94,0.15)', border: '#22c55e', icon: '✅' };
      case 'error':
        return { bg: 'rgba(239,68,68,0.15)', border: '#ef4444', icon: '❌' };
      case 'warning':
        return { bg: 'rgba(245,158,11,0.15)', border: '#f59e0b', icon: '⚠️' };
      default:
        return { bg: 'rgba(102,126,234,0.15)', border: '#667eea', icon: 'ℹ️' };
    }
  };

  return (
    <div style={toastStyles.container}>
      {toasts.map((toast, index) => {
        const typeStyles = getToastStyles(toast.type);
        return (
          <div
            key={toast.id}
            style={{
              ...toastStyles.toast,
              background: typeStyles.bg,
              borderColor: typeStyles.border,
              animation: 'toastSlideIn 0.3s ease',
              animationDelay: `${index * 50}ms`,
            }}
          >
            <span style={toastStyles.icon}>{typeStyles.icon}</span>
            <div style={toastStyles.content}>
              <div style={toastStyles.title}>{toast.title}</div>
              {toast.message && (
                <div style={toastStyles.message}>{toast.message}</div>
              )}
            </div>
            <button
              onClick={() => onDismiss(toast.id)}
              style={toastStyles.closeBtn}
            >
              ✕
            </button>
          </div>
        );
      })}
      <style>{`
        @keyframes toastSlideIn {
          from {
            opacity: 0;
            transform: translateX(100%);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
      `}</style>
    </div>
  );
}

const toastStyles: { [key: string]: React.CSSProperties } = {
  container: {
    position: 'fixed',
    top: '20px',
    right: '20px',
    zIndex: 9999,
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    maxWidth: '380px',
  },
  toast: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    padding: '14px 16px',
    borderRadius: '12px',
    border: '1px solid',
    backdropFilter: 'blur(10px)',
    boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
  },
  icon: {
    fontSize: '18px',
    marginTop: '2px',
  },
  content: {
    flex: 1,
  },
  title: {
    color: '#fff',
    fontSize: '0.9rem',
    fontWeight: 600,
    marginBottom: '2px',
  },
  message: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: '0.8rem',
    lineHeight: 1.4,
  },
  closeBtn: {
    background: 'transparent',
    border: 'none',
    color: 'rgba(255,255,255,0.4)',
    cursor: 'pointer',
    fontSize: '14px',
    padding: '0',
    marginTop: '-2px',
  },
};

// =============================================================================
// Notification Bell - Header button with dropdown
// =============================================================================

interface NotificationBellProps {
  notifications: Notification[];
  unreadCount: number;
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onClear: (id: string) => void;
  onClearAll: () => void;
}

export function NotificationBell({
  notifications,
  unreadCount,
  onMarkAsRead,
  onMarkAllAsRead,
  onClear,
  onClearAll,
}: NotificationBellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getPriorityColor = (priority: Notification['priority']) => {
    switch (priority) {
      case 'high': return '#ef4444';
      case 'medium': return '#f59e0b';
      default: return '#6b7280';
    }
  };

  const getTypeIcon = (type: Notification['type']) => {
    switch (type) {
      case 'success': return '✅';
      case 'error': return '❌';
      case 'warning': return '⚠️';
      case 'task': return '📋';
      default: return 'ℹ️';
    }
  };

  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);

  const formatTime = (timestamp: string) => {
    if (!mounted) return '...';
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div ref={dropdownRef} style={bellStyles.container}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={bellStyles.button}
      >
        🔔
        {unreadCount > 0 && (
          <span style={bellStyles.badge}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div style={bellStyles.dropdown}>
          <div style={bellStyles.header}>
            <span style={bellStyles.headerTitle}>Notifications</span>
            {unreadCount > 0 && (
              <button onClick={onMarkAllAsRead} style={bellStyles.markAllBtn}>
                Mark all read
              </button>
            )}
          </div>

          <div style={bellStyles.list}>
            {notifications.length === 0 ? (
              <div style={bellStyles.empty}>
                <span style={bellStyles.emptyIcon}>🔕</span>
                <span>No notifications</span>
              </div>
            ) : (
              notifications.slice(0, 10).map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => onMarkAsRead(notif.id)}
                  style={{
                    ...bellStyles.item,
                    background: notif.read ? 'transparent' : 'rgba(102,126,234,0.08)',
                  }}
                >
                  <div style={bellStyles.itemIcon}>
                    {notif.agentEmoji || getTypeIcon(notif.type)}
                  </div>
                  <div style={bellStyles.itemContent}>
                    <div style={bellStyles.itemHeader}>
                      <span style={{
                        ...bellStyles.itemTitle,
                        fontWeight: notif.read ? 400 : 600,
                      }}>
                        {notif.title}
                      </span>
                      <span style={{
                        ...bellStyles.priorityDot,
                        background: getPriorityColor(notif.priority),
                        opacity: notif.priority === 'low' ? 0 : 1,
                      }} />
                    </div>
                    {notif.message && (
                      <div style={bellStyles.itemMessage}>{notif.message}</div>
                    )}
                    <div style={bellStyles.itemTime}>{formatTime(notif.timestamp)}</div>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); onClear(notif.id); }}
                    style={bellStyles.itemClose}
                  >
                    ✕
                  </button>
                </div>
              ))
            )}
          </div>

          {notifications.length > 0 && (
            <div style={bellStyles.footer}>
              <button onClick={onClearAll} style={bellStyles.clearBtn}>
                Clear all
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const bellStyles: { [key: string]: React.CSSProperties } = {
  container: {
    position: 'relative',
  },
  button: {
    background: 'rgba(255,255,255,0.05)',
    border: 'none',
    borderRadius: '10px',
    width: '42px',
    height: '42px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '20px',
    cursor: 'pointer',
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: '-4px',
    right: '-4px',
    background: '#ef4444',
    color: '#fff',
    fontSize: '0.65rem',
    fontWeight: 700,
    padding: '2px 6px',
    borderRadius: '10px',
    minWidth: '18px',
    textAlign: 'center',
  },
  dropdown: {
    position: 'absolute',
    top: '100%',
    right: '0',
    marginTop: '8px',
    width: '360px',
    maxHeight: '480px',
    background: '#1a1a2e',
    borderRadius: '16px',
    border: '1px solid rgba(255,255,255,0.1)',
    boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
    overflow: 'hidden',
    zIndex: 1000,
    animation: 'dropdownSlide 0.2s ease',
  },
  header: {
    padding: '16px 18px',
    borderBottom: '1px solid rgba(255,255,255,0.08)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    color: '#fff',
    fontSize: '1rem',
    fontWeight: 600,
  },
  markAllBtn: {
    background: 'transparent',
    border: 'none',
    color: '#667eea',
    fontSize: '0.8rem',
    cursor: 'pointer',
  },
  list: {
    maxHeight: '350px',
    overflowY: 'auto',
  },
  empty: {
    padding: '40px 20px',
    textAlign: 'center',
    color: 'rgba(255,255,255,0.4)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
  },
  emptyIcon: {
    fontSize: '32px',
  },
  item: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    padding: '14px 18px',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
    cursor: 'pointer',
    transition: 'background 0.2s',
  },
  itemIcon: {
    fontSize: '18px',
    marginTop: '2px',
  },
  itemContent: {
    flex: 1,
    minWidth: 0,
  },
  itemHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '4px',
  },
  itemTitle: {
    color: '#fff',
    fontSize: '0.9rem',
    lineHeight: 1.3,
  },
  priorityDot: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    flexShrink: 0,
  },
  itemMessage: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: '0.8rem',
    lineHeight: 1.4,
    marginBottom: '4px',
  },
  itemTime: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: '0.7rem',
  },
  itemClose: {
    background: 'transparent',
    border: 'none',
    color: 'rgba(255,255,255,0.3)',
    cursor: 'pointer',
    fontSize: '12px',
    padding: '4px',
    opacity: 0.5,
    transition: 'opacity 0.2s',
  },
  footer: {
    padding: '12px 18px',
    borderTop: '1px solid rgba(255,255,255,0.05)',
    textAlign: 'center',
  },
  clearBtn: {
    background: 'transparent',
    border: 'none',
    color: 'rgba(255,255,255,0.4)',
    fontSize: '0.8rem',
    cursor: 'pointer',
  },
};

// =============================================================================
// NotificationProvider - Wraps the app with notification context
// =============================================================================

interface NotificationProviderProps {
  children: React.ReactNode;
}

export function NotificationProvider({ children }: NotificationProviderProps) {
  const {
    notifications,
    unreadCount,
    addNotification,
    markAsRead,
    markAllAsRead,
    clearNotification,
    clearAll,
  } = useNotifications();

  const { toasts, showToast, dismissToast } = useToast();

  // Expose notification functions globally (optional)
  useEffect(() => {
    (window as any).__opieNotify = (opts: { type: string; title: string; message?: string }) => {
      addNotification({
        type: opts.type as any,
        title: opts.title,
        message: opts.message || '',
        priority: 'medium',
      });
      showToast({
        type: opts.type as any,
        title: opts.title,
        message: opts.message,
      });
    };

    return () => {
      delete (window as any).__opieNotify;
    };
  }, [addNotification, showToast]);

  return (
    <>
      {children}
      
      {/* Toast overlay */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      
      {/* Global styles for animations */}
      <style>{`
        @keyframes dropdownSlide {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </>
  );
}

// =============================================================================
// Export hook for easy access
// =============================================================================

export { useNotifications, useToast } from '../hooks/useRealTimeData';
