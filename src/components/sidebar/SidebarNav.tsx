// src/components/sidebar/SidebarNav.tsx
// Grouped navigation with Lucide icons (no broken emoji)
'use client';
import React, { memo, useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { ViewId } from '../../hooks/useKeyboardShortcuts';
import {
  LayoutDashboard,
  Radio,
  Puzzle,
  Bot,
  Building2,
  Wrench,
  Trophy,
  Brain,
  ClipboardList,
  CheckSquare,
  Clock,
  FolderOpen,
  MessageCircle,
  Crosshair,
  Settings,
  ChevronRight,
} from 'lucide-react';

// ─── Data types ──────────────────────────────────────────────────────
export interface NavItem {
  id: ViewId;
  label: string;
  icon: string; // kept for compat – renderIcon maps to Lucide
  showCount?: boolean;
}

export interface NavGroup {
  id: string;
  label: string;
  icon: string;
  children: NavItem[];
}

// Map view-id → Lucide icon component
const ICON_MAP: Record<string, typeof LayoutDashboard> = {
  dashboard: LayoutDashboard,
  'content-center': Radio,
  'workflow-hub': Puzzle,
  agents: Bot,
  organization: Building2,
  skills: Wrench,
  leaderboard: Trophy,
  context: Brain,
  board: ClipboardList,
  tasks: CheckSquare,
  crons: Clock,
  memory: FolderOpen,
  voice: MessageCircle,
  'model-counsel': Crosshair,
  settings: Settings,
};

function renderIcon(id: string, size = 18) {
  const Icon = ICON_MAP[id];
  if (Icon) return <Icon size={size} strokeWidth={1.8} />;
  return <LayoutDashboard size={size} strokeWidth={1.8} />;
}

// ─── Navigation structure ──────────────────────────────────────────
const STANDALONE_TOP: NavItem = { id: 'dashboard', label: 'Dashboard', icon: '' };

export const NAV_GROUPS: NavGroup[] = [
  {
    id: 'agents-group',
    label: 'Agents',
    icon: '',
    children: [
      { id: 'agents', label: 'Agent List', icon: '', showCount: true },
      { id: 'organization', label: 'Organization', icon: '' },
      { id: 'skills', label: 'Skills', icon: '' },
      { id: 'leaderboard', label: 'Leaderboard', icon: '' },
      { id: 'context', label: 'Context', icon: '' },
    ],
  },
  {
    id: 'work-group',
    label: 'Work',
    icon: '',
    children: [
      { id: 'board', label: 'Project Board', icon: '' },
      { id: 'tasks', label: 'Tasks', icon: '', showCount: true },
      { id: 'crons', label: 'Crons', icon: '', showCount: true },
    ],
  },
  {
    id: 'knowledge-group',
    label: 'Knowledge',
    icon: '',
    children: [
      { id: 'memory', label: 'Memory', icon: '' },
      { id: 'voice', label: 'Chat', icon: '' },
      { id: 'model-counsel', label: 'Model Counsel', icon: '' },
    ],
  },
];

const SETTINGS_ITEM: NavItem = { id: 'settings', label: 'Settings', icon: '' };

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

// Map group id → first child id for the icon lookup
const GROUP_ICON_MAP: Record<string, string> = {
  'agents-group': 'agents',
  'work-group': 'board',
  'knowledge-group': 'memory',
};

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
  gap: '12px',
  padding: '10px 14px',
  borderRadius: '10px',
  border: 'none',
  background: 'transparent',
  color: 'rgba(255,255,255,0.5)',
  fontSize: '0.875rem',
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
  padding: '8px 14px',
  color: 'rgba(255,255,255,0.35)',
  fontSize: '0.75rem',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
};

const groupHeaderActiveStyle: React.CSSProperties = {
  color: 'rgba(255,255,255,0.6)',
};

const childItemStyle: React.CSSProperties = {
  ...navItemStyle,
  padding: '8px 14px 8px 24px',
  fontSize: '0.84rem',
};

const chevronStyle: React.CSSProperties = {
  transition: 'transform 0.2s ease',
  color: 'rgba(255,255,255,0.25)',
};

const badgeStyle: React.CSSProperties = {
  padding: '2px 8px',
  borderRadius: '20px',
  fontSize: '0.65rem',
  fontWeight: 700,
  letterSpacing: '0.02em',
};

const collapsedBadgeStyle: React.CSSProperties = {
  position: 'absolute',
  top: '4px',
  right: '4px',
  background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
  color: '#000',
  fontSize: '0.5rem',
  fontWeight: 700,
  padding: '1px 4px',
  borderRadius: '10px',
  minWidth: '14px',
  textAlign: 'center',
  boxShadow: '0 2px 8px rgba(245, 158, 11, 0.4)',
};

const dividerStyle: React.CSSProperties = {
  height: 1,
  background: 'rgba(255,255,255,0.05)',
  margin: '6px 14px',
};

// ─── Component ───────────────────────────────────────────────────────
const SidebarNav: React.FC<SidebarNavProps> = memo(function SidebarNav({
  activeView,
  sidebarExpanded,
  onNavigate,
  getCount,
}) {
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(loadExpandedGroups);

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
  }, [activeView]); // intentionally not depending on expandedGroups

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
        <span style={{ width: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          {renderIcon(item.id, isChild ? 16 : 18)}
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

  // --- Collapsed sidebar ---
  if (!sidebarExpanded) {
    return (
      <nav style={{ flex: 1, padding: '8px 6px', display: 'flex', flexDirection: 'column', gap: '2px', overflowY: 'auto' }}>
        {renderNavButton(STANDALONE_TOP)}
        <Link
          href="/content-command-center"
          style={{ ...navItemStyle, justifyContent: 'center', textDecoration: 'none' }}
          title="Content Center"
        >
          <span style={{ width: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {renderIcon('content-center', 18)}
          </span>
        </Link>
        <div style={dividerStyle} />
        {NAV_GROUPS.map(group => {
          const hasActiveChild = groupContainsView(group, activeView);
          const totalCount = groupTotalCount(group, getCount);
          const iconId = GROUP_ICON_MAP[group.id] || 'dashboard';
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
              <span style={{ width: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {renderIcon(iconId, 18)}
              </span>
              {totalCount > 0 && renderCollapsedBadge(totalCount)}
            </button>
          );
        })}
        <div style={{ flex: 1 }} />
        {renderNavButton(SETTINGS_ITEM)}
      </nav>
    );
  }

  // --- Expanded sidebar ---
  return (
    <nav style={{ flex: 1, padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: '1px', overflowY: 'auto' }}>
      {renderNavButton(STANDALONE_TOP)}

      {/* Content Center */}
      <Link
        href="/content-command-center"
        style={{ ...navItemStyle, textDecoration: 'none' }}
      >
        <span style={{ width: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          {renderIcon('content-center', 18)}
        </span>
        <span style={{ flex: 1, fontWeight: 500 }}>Content Center</span>
      </Link>
      <Link
        href="/content-command-center?tab=workflows"
        style={{
          ...childItemStyle,
          textDecoration: 'none',
          paddingLeft: '38px',
        }}
      >
        <span style={{ width: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          {renderIcon('workflow-hub', 16)}
        </span>
        <span style={{ flex: 1, fontWeight: 500 }}>Workflow Hub</span>
      </Link>
      <div style={dividerStyle} />

      {/* Nav groups */}
      {NAV_GROUPS.map(group => {
        const isExpanded = expandedGroups[group.id] ?? true;
        const hasActiveChild = groupContainsView(group, activeView);
        const totalCount = groupTotalCount(group, getCount);
        const iconId = GROUP_ICON_MAP[group.id] || 'dashboard';

        return (
          <div key={group.id}>
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
              <span style={{ width: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {renderIcon(iconId, 15)}
              </span>
              <span style={{ flex: 1 }}>{group.label}</span>
              {totalCount > 0 && !isExpanded && (
                <span style={{
                  ...badgeStyle,
                  background: 'rgba(102,126,234,0.15)',
                  color: 'rgba(255,255,255,0.5)',
                  fontSize: '0.6rem',
                  padding: '2px 6px',
                }}>
                  {totalCount}
                </span>
              )}
              <span style={chevronStyle}>
                <ChevronRight size={12} style={{ transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease' }} />
              </span>
            </button>

            <div style={{
              overflow: 'hidden',
              maxHeight: isExpanded ? `${group.children.length * 44}px` : '0px',
              transition: 'max-height 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
              opacity: isExpanded ? 1 : 0,
            }}>
              {group.children.map(child => renderNavButton(child, true))}
            </div>
          </div>
        );
      })}

      <div style={{ flex: 1 }} />
      <div style={dividerStyle} />
      {renderNavButton(SETTINGS_ITEM)}
    </nav>
  );
});

export default SidebarNav;
