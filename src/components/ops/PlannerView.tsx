'use client';

import { useEffect, useState } from 'react';
import TasksView from './TasksView';
import CalendarView from './CalendarView';

type SubTab = 'tasks' | 'calendar';

const STORAGE_KEY = 'opie.planner.subtab.v1';
const M = "'JetBrains Mono', 'Fira Code', monospace";

const SUBTABS: { id: SubTab; label: string; icon: string }[] = [
  { id: 'tasks', label: 'Tasks', icon: '✅' },
  { id: 'calendar', label: 'Calendar', icon: '📅' },
];

export default function PlannerView() {
  const [active, setActive] = useState<SubTab>('tasks');
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === 'tasks' || stored === 'calendar') setActive(stored);
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, active);
    } catch {}
  }, [active]);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  return (
    <div style={s.wrap}>
      <div style={s.tabBar} role="tablist" aria-label="Planner sub-tabs">
        {SUBTABS.map((tab) => {
          const isActive = active === tab.id;
          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={isActive}
              onClick={() => setActive(tab.id)}
              style={{
                ...s.tabBtn,
                ...(isActive ? s.tabBtnActive : {}),
                padding: isMobile ? '8px 14px' : '8px 18px',
                fontSize: isMobile ? 12 : 13,
              }}
            >
              <span style={{ fontSize: isMobile ? 14 : 15 }}>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      <div style={s.viewport}>
        {active === 'tasks' && <TasksView />}
        {active === 'calendar' && <CalendarView />}
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  wrap: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    minHeight: 0,
    gap: 10,
  },
  tabBar: {
    display: 'flex',
    gap: 6,
    background: '#0e0e18',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: 12,
    padding: 4,
    flexShrink: 0,
    width: 'fit-content',
  },
  tabBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    background: 'transparent',
    border: '1px solid transparent',
    color: 'rgba(255,255,255,0.55)',
    cursor: 'pointer',
    fontFamily: M,
    fontWeight: 700,
    letterSpacing: '0.04em',
    borderRadius: 8,
    transition: 'background 0.15s, color 0.15s, border-color 0.15s, box-shadow 0.15s',
  },
  tabBtnActive: {
    background: 'rgba(168,85,247,0.16)',
    border: '1px solid rgba(168,85,247,0.45)',
    color: '#fff',
    boxShadow: '0 0 18px rgba(168,85,247,0.18)',
  },
  viewport: {
    flex: 1,
    minHeight: 0,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
};
