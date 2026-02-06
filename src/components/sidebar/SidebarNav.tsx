// src/components/sidebar/SidebarNav.tsx
'use client';
import React, { memo } from 'react';
import { ViewId } from '../../hooks/useKeyboardShortcuts';

export interface NavItem {
  id: ViewId;
  label: string;
  icon: string;
  showCount?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: '📊' },
  { id: 'agents', label: 'Agents', icon: '🤖', showCount: true },
  { id: 'skills', label: 'Skills', icon: '🛠️' },
  { id: 'tasks', label: 'Tasks', icon: '📋', showCount: true },
  { id: 'crons', label: 'Crons', icon: '⏰', showCount: true },
  { id: 'leaderboard', label: 'Leaderboard', icon: '🏆' },
  { id: 'context', label: 'Context', icon: '🧠' },
  { id: 'voice', label: 'Voice', icon: '🎤' },
  { id: 'memory', label: 'Memory', icon: '📁' },
  { id: 'settings', label: 'Settings', icon: '⚙️' },
];

interface SidebarNavProps {
  activeView: ViewId;
  sidebarExpanded: boolean;
  onNavigate: (view: ViewId) => void;
  getCount: (id: ViewId) => number | null;
}

const navItemStyle: React.CSSProperties = {
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
};

const navItemActiveStyle: React.CSSProperties = {
  background: 'linear-gradient(135deg, rgba(102,126,234,0.18) 0%, rgba(118,75,162,0.12) 100%)',
  color: '#fff',
  boxShadow: 'inset 0 0 0 1px rgba(102,126,234,0.2), 0 2px 12px rgba(102,126,234,0.1)',
};

const SidebarNav: React.FC<SidebarNavProps> = memo(function SidebarNav({
  activeView,
  sidebarExpanded,
  onNavigate,
  getCount,
}) {
  return (
    <nav
      style={{
        flex: 1,
        padding: '20px 14px',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        overflowY: 'auto',
      }}
    >
      {NAV_ITEMS.map((item) => {
        const count = getCount(item.id);
        const isActive = activeView === item.id;

        return (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            style={{
              ...navItemStyle,
              ...(isActive ? navItemActiveStyle : {}),
              justifyContent: sidebarExpanded ? 'flex-start' : 'center',
            }}
            title={!sidebarExpanded ? item.label : undefined}
          >
            <span style={{ fontSize: '1.25rem', width: '26px', textAlign: 'center' }}>
              {item.icon}
            </span>
            {sidebarExpanded && (
              <>
                <span style={{ flex: 1, fontWeight: 500 }}>{item.label}</span>
                {count !== null && count > 0 && (
                  <span
                    style={{
                      padding: '3px 10px',
                      borderRadius: '20px',
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      background:
                        item.id === 'tasks' ? 'rgba(245,158,11,0.2)' : 'rgba(34,197,94,0.2)',
                      color: item.id === 'tasks' ? '#f59e0b' : '#22c55e',
                    }}
                  >
                    {count}
                  </span>
                )}
              </>
            )}
            {!sidebarExpanded && count !== null && count > 0 && (
              <span
                style={{
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
                }}
              >
                {count}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
});

export default SidebarNav;
