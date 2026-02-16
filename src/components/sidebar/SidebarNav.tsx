// src/components/sidebar/SidebarNav.tsx
// Grouped navigation with progressive disclosure
'use client';
import React, { memo, useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { ViewId } from '../../hooks/useKeyboardShortcuts';

// ─── Data types ──────────────────────────────────────────────────────
export interface NavItem {
  id: ViewId;
  label: string;
  icon: string;
  showCount?: boolean;
}

export interface NavGroup {
  id: string;
  label: string;
  icon: string;
  children: NavItem[];
}

// ─── Navigation structure: 4 groups + settings pinned bottom ─────────
const STANDALONE_TOP: NavItem = { id: 'dashboard', label: 'Dashboard', icon: '🏠' };

export const NAV_GROUPS: NavGroup[] = [
  {
    id: 'agents-group',
    label: 'Agents',
    icon: '🤖',
    children: [
      { id: 'agents', label: 'Agent List', icon: '🤖', showCount: true },
      { id: 'organization', label: 'Organization', icon: '🏛️' },
      { id: 'skills', label: 'Skills', icon: '🛠️' },
      { id: 'leaderboard', label: 'Leaderboard', icon: '🏆' },
      { id: 'context', label: 'Context', icon: '🧠' },
    ],
  },
  {
    id: 'work-group',
    label: 'Work',
    icon: '📋',
    children: [
      { id: 'board', label: 'Project Board', icon: '📋' },
      { id: 'tasks', label: 'Tasks', icon: '✅', showCount: true },
      { id: 'crons', label: 'Crons', icon: '⏰', showCount: true },
    ],
  },
  {
    id: 'knowledge-group',
    label: 'Knowledge',
    icon: '📚',
    children: [
      { id: 'memory', label: 'Memory', icon: '📁' },
      { id: 'voice', label: 'Chat', icon: '💬' },
      { id: 'model-counsel', label: 'Model Counsel', icon: '🎯' },
    ],
  },
];

const SETTINGS_ITEM: NavItem = { id: 'settings', label: 'Settings', icon: '⚙️' };

// Flat list of all nav items (for external consumers like CommandPalette)
export const ALL_NAV_ITEMS: NavItem[] = [
  STANDALONE_TOP,
  ...NAV_GROUPS.flatMap(g => g.children),
  SETTINGS_ITEM,
];

// ─── Persistence ─────────────────────────────────────────────────────
const STORAGE_KEY = 'opie-nav-groups';

function loadExpandedGroups(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  // Default: all groups expanded
  return Object.fromEntries(NAV_GROUPS.map(g => [g.id, true]));
}

function saveExpandedGroups(state: Record<string, boolean>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {}
}

// ─── Helpers ─────────────────────────────────────────────────────────
function groupContainsView(group: NavGroup, viewId: ViewId): boolean {
  return group.children.some(c => c.id === viewId);
}

function groupTotalCount(group: NavGroup, getCount: (id: ViewId) => number | null): number {
  return group.children.reduce((sum, c) => sum + (getCount(c.id) ?? 0), 0);
}

// ─── Props ───────────────────────────────────────────────────────────
interface SidebarNavProps {
  activeView: ViewId;
  sidebarExpanded: boolean;
  onNavigate: (view: ViewId) => void;
  getCount: (id: ViewId) => number | null;
}

// ─── Styles ──────────────────────────────────────────────────────────
const navItemStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '14px',
  padding: '12px 16px',
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

const groupHeaderStyle: React.CSSProperties = {
  ...navItemStyle,
  padding: '10px 16px',
  color: 'rgba(255,255,255,0.4)',
  fontSize: '0.8rem',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
};

const groupHeaderActiveStyle: React.CSSProperties = {
  color: 'rgba(255,255,255,0.7)',
};

const childItemStyle: React.CSSProperties = {
  ...navItemStyle,
  padding: '10px 16px 10px 28px',
  fontSize: '0.875rem',
};

const chevronStyle: React.CSSProperties = {
  fontSize: '0.6rem',
  transition: 'transform 0.2s ease',
  color: 'rgba(255,255,255,0.3)',
};

const badgeStyle: React.CSSProperties = {
  padding: '3px 10px',
  borderRadius: '20px',
  fontSize: '0.7rem',
  fontWeight: 700,
  letterSpacing: '0.02em',
};

const collapsedBadgeStyle: React.CSSProperties = {
  position: 'absolute',
  top: '6px',
  right: '6px',
  background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
  color: '#000',
  fontSize: '0.55rem',
  fontWeight: 700,
  padding: '2px 5px',
  borderRadius: '10px',
  minWidth: '16px',
  textAlign: 'center',
  boxShadow: '0 2px 8px rgba(245, 158, 11, 0.4)',
};

const dividerStyle: React.CSSProperties = {
  height: 1,
  background: 'rgba(255,255,255,0.06)',
  margin: '8px 16px',
};

// ─── Component ───────────────────────────────────────────────────────
const SidebarNav: React.FC<SidebarNavProps> = memo(function SidebarNav({
  activeView,
  sidebarExpanded,
  onNavigate,
  getCount,
}) {
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(loadExpandedGroups);

  // Persist expand state
  useEffect(() => {
    saveExpandedGroups(expandedGroups);
  }, [expandedGroups]);

  // Auto-expand the group that contains the active view
  useEffect(() => {
    for (const group of NAV_GROUPS) {
      if (groupContainsView(group, activeView) && !expandedGroups[group.id]) {
        setExpandedGroups(prev => ({ ...prev, [group.id]: true }));
        break;
      }
    }
  }, [activeView]); // intentionally not depending on expandedGroups to avoid loops

  const toggleGroup = useCallback((groupId: string) => {
    setExpandedGroups(prev => ({ ...prev, [groupId]: !prev[groupId] }));
  }, []);

  const renderBadge = (itemId: ViewId, count: number) => {
    const isTaskBadge = itemId === 'tasks';
    return (
      <span style={{
        ...badgeStyle,
        background: isTaskBadge ? 'rgba(245,158,11,0.2)' : 'rgba(34,197,94,0.2)',
        color: isTaskBadge ? '#f59e0b' : '#22c55e',
      }}>
        {count}
      </span>
    );
  };

  const renderCollapsedBadge = (count: number) => (
    <span style={collapsedBadgeStyle}>{count > 9 ? '9+' : count}</span>
  );

  const renderNavButton = (item: NavItem, isChild = false) => {
    const count = getCount(item.id);
    const isActive = activeView === item.id;
    const style = isChild ? childItemStyle : navItemStyle;

    return (
      <button
        key={item.id}
        onClick={() => onNavigate(item.id)}
        style={{
          ...style,
          ...(isActive ? navItemActiveStyle : {}),
          justifyContent: sidebarExpanded ? 'flex-start' : 'center',
        }}
        title={!sidebarExpanded ? item.label : undefined}
        aria-label={item.label}
      >
        <span style={{ fontSize: '1.15rem', width: '24px', textAlign: 'center', flexShrink: 0 }}>
          {item.icon}
        </span>
        {sidebarExpanded && (
          <>
            <span style={{ flex: 1, fontWeight: 500 }}>{item.label}</span>
            {count !== null && count > 0 && renderBadge(item.id, count)}
          </>
        )}
        {!sidebarExpanded && count !== null && count > 0 && renderCollapsedBadge(count)}
      </button>
    );
  };

  // --- Collapsed sidebar: show only group icons + dashboard + settings ---
  if (!sidebarExpanded) {
    return (
      <nav style={{ flex: 1, padding: '12px 8px', display: 'flex', flexDirection: 'column', gap: '4px', overflowY: 'auto' }}>
        {renderNavButton(STANDALONE_TOP)}
        <Link
          href="/content-command-center"
          style={{ ...navItemStyle, justifyContent: 'center', textDecoration: 'none' }}
          title="Content Command Center"
        >
          <span style={{ fontSize: '1.15rem', width: '24px', textAlign: 'center' }}>📡</span>
        </Link>
        <div style={dividerStyle} />
        {NAV_GROUPS.map(group => {
          const hasActiveChild = groupContainsView(group, activeView);
          const totalCount = groupTotalCount(group, getCount);
          return (
            <button
              key={group.id}
              onClick={() => onNavigate(group.children[0].id)}
              style={{
                ...navItemStyle,
                ...(hasActiveChild ? navItemActiveStyle : {}),
                justifyContent: 'center',
              }}
              title={group.label}
              aria-label={group.label}
            >
              <span style={{ fontSize: '1.15rem', width: '24px', textAlign: 'center' }}>{group.icon}</span>
              {totalCount > 0 && renderCollapsedBadge(totalCount)}
            </button>
          );
        })}
        <div style={{ flex: 1 }} />
        {renderNavButton(SETTINGS_ITEM)}
      </nav>
    );
  }

  // --- Expanded sidebar: grouped navigation with expand/collapse ---
  return (
    <nav style={{ flex: 1, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '2px', overflowY: 'auto' }}>
      {/* Dashboard - standalone top */}
      {renderNavButton(STANDALONE_TOP)}

      {/* Content Command Center - separate page */}
      <Link
        href="/content-command-center"
        style={{ ...navItemStyle, textDecoration: 'none' }}
      >
        <span style={{ fontSize: '1.15rem', width: '24px', textAlign: 'center', flexShrink: 0 }}>📡</span>
        <span style={{ flex: 1, fontWeight: 500 }}>Content Center</span>
      </Link>

      <div style={dividerStyle} />

      {/* Nav groups */}
      {NAV_GROUPS.map(group => {
        const isExpanded = expandedGroups[group.id] ?? true;
        const hasActiveChild = groupContainsView(group, activeView);
        const totalCount = groupTotalCount(group, getCount);

        return (
          <div key={group.id}>
            {/* Group header */}
            <button
              onClick={() => toggleGroup(group.id)}
              style={{
                ...groupHeaderStyle,
                ...(hasActiveChild ? groupHeaderActiveStyle : {}),
                justifyContent: 'flex-start',
              }}
              aria-expanded={isExpanded}
              aria-label={`${group.label} group`}
            >
              <span style={{ fontSize: '1rem', width: '24px', textAlign: 'center', flexShrink: 0 }}>
                {group.icon}
              </span>
              <span style={{ flex: 1 }}>{group.label}</span>
              {totalCount > 0 && !isExpanded && (
                <span style={{
                  ...badgeStyle,
                  background: 'rgba(102,126,234,0.15)',
                  color: 'rgba(255,255,255,0.5)',
                  fontSize: '0.65rem',
                  padding: '2px 8px',
                }}>
                  {totalCount}
                </span>
              )}
              <span style={{
                ...chevronStyle,
                transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
              }}>
                ▶
              </span>
            </button>

            {/* Children */}
            <div style={{
              overflow: 'hidden',
              maxHeight: isExpanded ? `${group.children.length * 52}px` : '0px',
              transition: 'max-height 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
              opacity: isExpanded ? 1 : 0,
            }}>
              {group.children.map(child => renderNavButton(child, true))}
            </div>
          </div>
        );
      })}

      {/* Spacer + Settings pinned bottom */}
      <div style={{ flex: 1 }} />
      <div style={dividerStyle} />
      {renderNavButton(SETTINGS_ITEM)}
    </nav>
  );
});

export default SidebarNav;
