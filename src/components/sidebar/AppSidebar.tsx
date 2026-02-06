// src/components/sidebar/AppSidebar.tsx
// Extracted from OpieKanban — the main sidebar composition
'use client';
import React, { memo, useMemo, useCallback } from 'react';
import { ViewId } from '../../hooks/useKeyboardShortcuts';
import SidebarHeader from './SidebarHeader';
import SidebarNav from './SidebarNav';
import SidebarFooter from './SidebarFooter';
import { useNotifications } from '../../hooks/useRealTimeData';

interface AppSidebarProps {
  sidebarExpanded: boolean;
  isMobile: boolean;
  mobileMenuOpen: boolean;
  activeView: ViewId;
  activeAgentCount: number;
  runningTasksCount: number;
  cronCount: number;
  onNavigate: (view: ViewId) => void;
  onToggleSidebar: () => void;
}

const AppSidebar: React.FC<AppSidebarProps> = memo(function AppSidebar({
  sidebarExpanded,
  isMobile,
  mobileMenuOpen,
  activeView,
  activeAgentCount,
  runningTasksCount,
  cronCount,
  onNavigate,
  onToggleSidebar,
}) {
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    clearNotification,
    clearAll,
  } = useNotifications();

  const getCount = useCallback(
    (itemId: ViewId): number | null => {
      if (itemId === 'agents') return activeAgentCount;
      if (itemId === 'tasks') return runningTasksCount;
      if (itemId === 'crons') return cronCount;
      return null;
    },
    [activeAgentCount, runningTasksCount, cronCount]
  );

  const sidebarStyle = useMemo(
    (): React.CSSProperties => ({
      position: 'fixed',
      top: 0,
      left: 0,
      height: '100vh',
      background: '#020514',
      borderRight: '1px solid rgba(255,255,255,0.06)',
      display: 'flex',
      flexDirection: 'column',
      transition: 'all 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
      zIndex: 100,
      boxShadow: '4px 0 30px rgba(0,0,0,0.3)',
      width: sidebarExpanded ? '240px' : '72px',
      ...(isMobile
        ? {
            position: 'fixed',
            left: mobileMenuOpen ? 0 : '-100%',
            width: '280px',
            zIndex: 1000,
          }
        : {}),
    }),
    [sidebarExpanded, isMobile, mobileMenuOpen]
  );

  return (
    <aside style={sidebarStyle}>
      <SidebarHeader
        sidebarExpanded={sidebarExpanded}
        isMobile={isMobile}
        onSettingsClick={() => onNavigate('settings')}
        onToggleSidebar={onToggleSidebar}
      />

      <SidebarNav
        activeView={activeView}
        sidebarExpanded={sidebarExpanded}
        onNavigate={onNavigate}
        getCount={getCount}
      />

      <SidebarFooter
        sidebarExpanded={sidebarExpanded}
        activeAgentCount={activeAgentCount}
        runningTasksCount={runningTasksCount}
        cronCount={cronCount}
        notifications={notifications}
        unreadCount={unreadCount}
        onMarkAsRead={markAsRead}
        onMarkAllAsRead={markAllAsRead}
        onClearNotification={clearNotification}
        onClearAll={clearAll}
      />
    </aside>
  );
});

export default AppSidebar;
