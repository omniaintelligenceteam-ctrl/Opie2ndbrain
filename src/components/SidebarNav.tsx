'use client';

import React from 'react';
import { ViewId } from '../hooks/useKeyboardShortcuts';
import OpieStatusWidget from './OpieStatusWidget';
import SidebarWidgets from './SidebarWidgets';
import { NotificationBell } from './NotificationCenter';
import { AGENT_NODES } from '../lib/agentMapping';

export interface NavItem {
  id: ViewId;
  label: string;
  icon: string;
  showCount?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: '📊' },
  { id: 'agents', label: 'Agents', icon: '🤖', showCount: true },
  { id: 'organization', label: 'Organization', icon: '🏢' },
  { id: 'skills', label: 'Skills', icon: '🛠️' },
  { id: 'tasks', label: 'Tasks', icon: '📋', showCount: true },
  { id: 'crons', label: 'Crons', icon: '⏰', showCount: true },
  { id: 'voice', label: 'Voice', icon: '🎤' },
  { id: 'memory', label: 'Memory', icon: '🧠' },
  { id: 'settings', label: 'Settings', icon: '⚙️' },
];

// Re-export from useRealTimeData for type consistency
import { Notification } from '../hooks/useRealTimeData';

export interface SidebarNavProps {
  activeView: ViewId;
  onViewChange: (view: ViewId) => void;
  sidebarExpanded: boolean;
  onToggleSidebar: () => void;
  isMobile: boolean;
  mobileMenuOpen: boolean;
  onMobileMenuClose: () => void;
  activeAgentsCount: number;
  runningTasksCount: number;
  cronCount: number;
  notifications: Notification[];
  unreadCount: number;
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onClearNotification: (id: string) => void;
  onClearAll: () => void;
}

export function SidebarNav({
  activeView,
  onViewChange,
  sidebarExpanded,
  onToggleSidebar,
  isMobile,
  mobileMenuOpen,
  activeAgentsCount,
  runningTasksCount,
  cronCount,
  notifications,
  unreadCount,
  onMarkAsRead,
  onMarkAllAsRead,
  onClearNotification,
  onClearAll,
}: SidebarNavProps): React.ReactElement {
  const getCount = (itemId: ViewId): number | null => {
    if (itemId === 'agents') return activeAgentsCount;
    if (itemId === 'tasks') return runningTasksCount;
    if (itemId === 'crons') return cronCount;
    return null;
  };

  return (
    <aside style={{
      ...styles.sidebar,
      width: sidebarExpanded ? '240px' : '72px',
      ...(isMobile ? {
        position: 'fixed',
        left: mobileMenuOpen ? 0 : '-100%',
        width: '280px',
        zIndex: 1000,
      } : {}),
    }}>
      {/* Opie Status Widget - Top of Sidebar */}
      <div style={{ 
        padding: sidebarExpanded ? '16px' : '12px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}>
        {sidebarExpanded ? (
          <OpieStatusWidget 
            size="medium" 
            showDetails={true}
            onClick={() => onViewChange('settings')}
          />
        ) : (
          <OpieStatusWidget 
            size="small" 
            showDetails={false}
            onClick={() => onViewChange('settings')}
          />
        )}
      </div>
      
      {/* Sidebar Widgets - Calendar, Email, System Health */}
      {!isMobile && <SidebarWidgets isExpanded={sidebarExpanded} />}
      
      {/* Collapse/Expand Toggle */}
      {!isMobile && (
        <div style={{
          padding: '8px 14px',
          display: 'flex',
          justifyContent: sidebarExpanded ? 'flex-end' : 'center',
        }}>
          <button onClick={onToggleSidebar} style={styles.collapseBtn}>
            {sidebarExpanded ? '◀' : '▶'}
          </button>
        </div>
      )}

      {/* Navigation */}
      <nav style={styles.nav}>
        {NAV_ITEMS.map(item => {
          const count = getCount(item.id);
          const isActive = activeView === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              style={{
                ...styles.navItem,
                ...(isActive ? styles.navItemActive : {}),
                justifyContent: sidebarExpanded ? 'flex-start' : 'center',
              }}
              title={!sidebarExpanded ? item.label : undefined}
            >
              <span style={styles.navIcon}>{item.icon}</span>
              {sidebarExpanded && (
                <>
                  <span style={styles.navLabel}>{item.label}</span>
                  {count !== null && count > 0 && (
                    <span style={{
                      ...styles.navBadge,
                      background: item.id === 'tasks' ? 'rgba(245,158,11,0.2)' : 'rgba(34,197,94,0.2)',
                      color: item.id === 'tasks' ? '#f59e0b' : '#22c55e',
                    }}>
                      {count}
                    </span>
                  )}
                </>
              )}
              {!sidebarExpanded && count !== null && count > 0 && (
                <span style={styles.navBadgeCollapsed}>{count}</span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Quick Stats */}
      {sidebarExpanded && (
        <div style={styles.quickStats}>
          <div style={styles.statRow}>
            <span style={styles.statLabel}>Active Agents</span>
            <span style={{ ...styles.statValue, color: '#22c55e' }}>{activeAgentsCount}</span>
          </div>
          <div style={styles.statRow}>
            <span style={styles.statLabel}>Total Agents</span>
            <span style={{ ...styles.statValue, color: '#06b6d4' }}>42</span>
          </div>
          <div style={styles.statRow}>
            <span style={styles.statLabel}>Running Tasks</span>
            <span style={{ ...styles.statValue, color: '#f59e0b' }}>{runningTasksCount}</span>
          </div>
          <div style={styles.statRow}>
            <span style={styles.statLabel}>Cron Jobs</span>
            <span style={{ ...styles.statValue, color: '#8b5cf6' }}>{cronCount}</span>
          </div>
        </div>
      )}

      {/* Notification Bell */}
      {sidebarExpanded && (
        <div style={{ padding: '12px 16px' }}>
          <NotificationBell
            notifications={notifications}
            unreadCount={unreadCount}
            onMarkAsRead={onMarkAsRead}
            onMarkAllAsRead={onMarkAllAsRead}
            onClear={onClearNotification}
            onClearAll={onClearAll}
          />
        </div>
      )}

      {/* Footer */}
      <div style={styles.sidebarFooter}>
        {sidebarExpanded ? (
          <span style={styles.footerText}>Omnia Intelligence</span>
        ) : (
          <span style={styles.footerIcon}>🌟</span>
        )}
      </div>
    </aside>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  sidebar: {
    position: 'fixed',
    top: 0,
    left: 0,
    height: '100vh',
    background: 'rgba(13, 13, 21, 0.95)',
    backdropFilter: 'blur(24px)',
    WebkitBackdropFilter: 'blur(24px)',
    borderRight: '1px solid rgba(255,255,255,0.06)',
    display: 'flex',
    flexDirection: 'column',
    transition: 'all 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
    zIndex: 100,
    boxShadow: '4px 0 30px rgba(0,0,0,0.3)',
  },
  collapseBtn: {
    width: '32px',
    height: '32px',
    borderRadius: '8px',
    border: 'none',
    background: 'rgba(255,255,255,0.04)',
    color: 'rgba(255,255,255,0.5)',
    cursor: 'pointer',
    fontSize: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s ease',
  },
  nav: {
    flex: 1,
    padding: '20px 14px',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    overflowY: 'auto',
  },
  navItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    padding: '14px 16px',
    borderRadius: '12px',
    border: 'none',
    background: 'transparent',
    color: 'rgba(255,255,255,0.55)',
    fontSize: '0.925rem',
    cursor: 'pointer',
    transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
    position: 'relative',
    textAlign: 'left',
    width: '100%',
    fontWeight: 500,
    letterSpacing: '-0.01em',
  },
  navItemActive: {
    background: 'linear-gradient(135deg, rgba(102,126,234,0.18) 0%, rgba(118,75,162,0.12) 100%)',
    color: '#fff',
    boxShadow: 'inset 0 0 0 1px rgba(102,126,234,0.2), 0 2px 12px rgba(102,126,234,0.1)',
  },
  navIcon: {
    fontSize: '1.25rem',
    width: '26px',
    textAlign: 'center',
    transition: 'transform 0.2s ease',
  },
  navLabel: {
    flex: 1,
    fontWeight: 500,
  },
  navBadge: {
    padding: '3px 10px',
    borderRadius: '20px',
    fontSize: '0.7rem',
    fontWeight: 700,
    letterSpacing: '0.02em',
  },
  navBadgeCollapsed: {
    position: 'absolute',
    top: '8px',
    right: '8px',
    background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
    color: '#000',
    fontSize: '0.6rem',
    fontWeight: 700,
    padding: '3px 6px',
    borderRadius: '10px',
    minWidth: '18px',
    textAlign: 'center',
    boxShadow: '0 2px 8px rgba(245, 158, 11, 0.4)',
  },
  quickStats: {
    padding: '18px',
    margin: '0 14px 14px',
    background: 'linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)',
    borderRadius: '14px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    border: '1px solid rgba(255,255,255,0.05)',
    position: 'relative',
    overflow: 'hidden',
  },
  statRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statLabel: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: '0.8rem',
    fontWeight: 500,
    letterSpacing: '0.01em',
  },
  statValue: {
    fontWeight: 700,
    fontSize: '0.95rem',
    fontVariantNumeric: 'tabular-nums',
  },
  sidebarFooter: {
    padding: '18px 20px',
    borderTop: '1px solid rgba(255,255,255,0.06)',
    textAlign: 'center',
    background: 'linear-gradient(180deg, transparent 0%, rgba(102,126,234,0.03) 100%)',
  },
  footerText: {
    color: 'rgba(255,255,255,0.25)',
    fontSize: '0.75rem',
    fontWeight: 500,
    letterSpacing: '0.03em',
    textTransform: 'uppercase',
  },
  footerIcon: {
    fontSize: '18px',
    opacity: 0.5,
  },
};

export default SidebarNav;
