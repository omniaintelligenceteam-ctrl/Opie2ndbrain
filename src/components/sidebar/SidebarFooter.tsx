// src/components/sidebar/SidebarFooter.tsx
'use client';
import React, { memo } from 'react';
import { NotificationBell } from '../NotificationCenter';

import { Notification } from '../../hooks/useRealTimeData';

interface SidebarFooterProps {
  sidebarExpanded: boolean;
  activeAgentCount: number;
  runningTasksCount: number;
  cronCount: number;
  notifications: Notification[];
  unreadCount: number;
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onClearNotification: (id: string) => void;
  onClearAll: () => void;
}

const SidebarFooter: React.FC<SidebarFooterProps> = memo(function SidebarFooter({
  sidebarExpanded,
  activeAgentCount,
  runningTasksCount,
  cronCount,
  notifications,
  unreadCount,
  onMarkAsRead,
  onMarkAllAsRead,
  onClearNotification,
  onClearAll,
}) {
  return (
    <>
      {/* Quick Stats */}
      {sidebarExpanded && (
        <div
          style={{
            padding: '18px',
            margin: '0 14px 14px',
            background:
              'linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)',
            borderRadius: '14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            border: '1px solid rgba(255,255,255,0.05)',
            overflow: 'hidden',
          }}
        >
          <StatRow label="Active Agents" value={activeAgentCount} color="#22c55e" />
          <StatRow label="Total Agents" value={42} color="#06b6d4" />
          <StatRow label="Running Tasks" value={runningTasksCount} color="#f59e0b" />
          <StatRow label="Cron Jobs" value={cronCount} color="#8b5cf6" />
        </div>
      )}

      {/* Notifications */}
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
      <div
        style={{
          padding: '18px 20px',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          textAlign: 'center',
          background: 'linear-gradient(180deg, transparent 0%, rgba(102,126,234,0.03) 100%)',
        }}
      >
        {sidebarExpanded ? (
          <span
            style={{
              color: 'rgba(255,255,255,0.25)',
              fontSize: '0.75rem',
              fontWeight: 500,
              letterSpacing: '0.03em',
              textTransform: 'uppercase',
            }}
          >
            Omnia Intelligence
          </span>
        ) : (
          <span style={{ fontSize: '18px', opacity: 0.5 }}>🌟</span>
        )}
      </div>
    </>
  );
});

function StatRow({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span
        style={{
          color: 'rgba(255,255,255,0.45)',
          fontSize: '0.8rem',
          fontWeight: 500,
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontWeight: 700,
          fontSize: '0.95rem',
          fontVariantNumeric: 'tabular-nums',
          color,
        }}
      >
        {value}
      </span>
    </div>
  );
}

export default SidebarFooter;
