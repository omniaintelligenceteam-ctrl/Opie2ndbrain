'use client';

import React, { useState, useEffect } from 'react';

interface KanbanColumn {
  id: string;
  title: string;
  color: string;
  tasks: string[];
}

interface KanbanColumnProps {
  column: KanbanColumn;
  isMobile?: boolean;
}

const MAX_VISIBLE_ITEMS = 8;

/**
 * Individual Kanban column with collapsible functionality
 */
function KanbanColumnComponent({ column, isMobile = false }: KanbanColumnProps): React.ReactElement {
  const [showAll, setShowAll] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);
  
  const visibleTasks = !showAll && column.tasks.length > MAX_VISIBLE_ITEMS
    ? column.tasks.slice(-MAX_VISIBLE_ITEMS)
    : column.tasks;
  const hiddenCount = Math.max(0, column.tasks.length - MAX_VISIBLE_ITEMS);

  const getColumnActionText = () => {
    switch (column.id) {
      case 'done': return 'completed item';
      case 'progress': return 'in-progress item';
      case 'todo': return 'pending item';
      default: return 'item';
    }
  };

  const getTimestamp = (index: number): string => {
    if (!mounted) return '...';
    const now = Date.now();
    const date = new Date(now - (visibleTasks.length - index) * 86400000 * (column.id === 'done' ? 2 : column.id === 'progress' ? 1 : 0.5));
    const formatted = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    
    if (column.id === 'done') return `Completed ${formatted}`;
    if (column.id === 'progress') return `Started ${formatted}`;
    return `Added ${formatted}`;
  };

  return (
    <div
      style={{
        ...styles.kanbanColumnGrid,
        borderTop: `3px solid ${column.color}`,
        minHeight: column.tasks.length > 5 ? '400px' : '300px',
        maxHeight: showAll ? '500px' : 'auto',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div style={styles.kanbanHeader}>
        <h3 style={{
          ...styles.kanbanColumnTitle,
          color: column.color,
        }}>
          {column.title}
        </h3>
        <span style={{
          ...styles.kanbanCount,
          background: `${column.color}20`,
          color: column.color,
        }}>
          {column.tasks.length}
        </span>
      </div>
      
      {hiddenCount > 0 && !showAll && (
        <div style={styles.hiddenItemsIndicator}>
          <button
            onClick={() => setShowAll(true)}
            style={styles.showMoreButton}
            className="show-more-hover"
          >
            <span style={styles.showMoreIcon}>⋯</span>
            <span style={styles.showMoreText}>
              {hiddenCount} more {getColumnActionText()}{hiddenCount !== 1 ? 's' : ''}
            </span>
            <span style={styles.showMoreArrow}>▼</span>
          </button>
        </div>
      )}
      
      <div 
        style={{
          ...styles.kanbanTasks,
          ...(showAll ? {
            maxHeight: '350px',
            overflowY: 'auto',
            paddingRight: '8px',
          } : {}),
          flex: 1,
        }}
        className={showAll ? 'kanban-scrollable' : ''}
      >
        {visibleTasks.map((task, index) => (
          <div
            key={`${column.id}-${index}`}
            style={{
              ...styles.kanbanTask,
              ...(!showAll && column.tasks.length > MAX_VISIBLE_ITEMS && index < 3 ? {
                opacity: 0.7,
              } : {}),
            }}
            className="kanban-task-hover"
          >
            <span style={styles.kanbanTaskText}>{task}</span>
            <span style={styles.taskTimestamp}>
              {getTimestamp(index)}
            </span>
          </div>
        ))}
      </div>
      
      {showAll && hiddenCount > 0 && (
        <div style={styles.collapseSection}>
          <button
            onClick={() => setShowAll(false)}
            style={styles.collapseButton}
            className="collapse-hover"
          >
            <span style={styles.collapseIcon}>▲</span>
            <span>Show less</span>
          </button>
        </div>
      )}
    </div>
  );
}

export interface KanbanBoardProps {
  isMobile?: boolean;
}

// Default columns - can be made configurable later
const DEFAULT_COLUMNS: KanbanColumn[] = [
  { 
    id: 'todo', 
    title: 'To Do', 
    color: '#f59e0b', 
    tasks: [
      'Memory Integration with Vector DB',
      'HeyGen Avatar Integration', 
      'Email Automation Pipeline',
      'Voice Recognition Improvements',
      'Mobile PWA Optimization',
      'Agent Performance Analytics',
      'Security Audit & Compliance'
    ]
  },
  { 
    id: 'progress', 
    title: 'In Progress', 
    color: '#667eea', 
    tasks: [
      'Voice Chat Enhancement',
      'Agent Dashboard Redesign',
      'Real-time Orchestration View',
      'Kanban Board Implementation'
    ]
  },
  { 
    id: 'done', 
    title: 'Done', 
    color: '#22c55e', 
    tasks: [
      'Dashboard UI Design System',
      'Chat API Integration', 
      'TTS Integration with ElevenLabs',
      'Skill Catalog Architecture',
      'Authentication System',
      'Database Schema Design',
      'Docker Containerization',
      'CI/CD Pipeline Setup',
      'Initial Agent Framework',
      'Basic Voice Commands',
      'Settings Panel',
      'Navigation System',
      'Theme System Implementation',
      'Mobile Responsive Design',
      'Error Handling Framework'
    ]
  }
];

/**
 * Kanban board component with three columns: To Do, In Progress, Done
 */
export function KanbanBoard({ isMobile = false }: KanbanBoardProps): React.ReactElement {
  return (
    <div style={styles.kanbanSection}>
      <h2 style={styles.kanbanTitle}>
        📋 Project Board
      </h2>
      <div style={styles.kanbanBoard}>
        {DEFAULT_COLUMNS.map((column) => (
          <KanbanColumnComponent
            key={column.id}
            column={column}
            isMobile={isMobile}
          />
        ))}
      </div>
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  kanbanSection: {
    marginBottom: '32px',
    padding: '24px',
    background: 'linear-gradient(135deg, rgba(99,102,241,0.05) 0%, rgba(139,92,246,0.03) 100%)',
    borderRadius: '20px',
    border: '1px solid rgba(255,255,255,0.08)',
  },
  kanbanTitle: {
    color: '#fff',
    fontSize: '1.5rem',
    fontWeight: 700,
    margin: '0 0 20px 0',
    letterSpacing: '-0.02em',
  },
  kanbanBoard: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '20px',
  },
  kanbanColumnGrid: {
    background: 'rgba(255,255,255,0.02)',
    borderRadius: '16px',
    padding: '16px',
    border: '1px solid rgba(255,255,255,0.05)',
    backdropFilter: 'blur(10px)',
  },
  kanbanHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
  },
  kanbanColumnTitle: {
    fontSize: '1rem',
    fontWeight: 600,
    margin: 0,
  },
  kanbanCount: {
    padding: '4px 8px',
    borderRadius: '12px',
    fontSize: '0.75rem',
    fontWeight: 700,
    border: '1px solid rgba(255,255,255,0.1)',
  },
  kanbanTasks: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  kanbanTask: {
    background: 'rgba(255,255,255,0.03)',
    borderRadius: '10px',
    padding: '12px',
    border: '1px solid rgba(255,255,255,0.06)',
    transition: 'all 0.2s ease',
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  kanbanTaskText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: '0.85rem',
    fontWeight: 500,
    lineHeight: 1.4,
    flex: 1,
  },
  taskTimestamp: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: '0.7rem',
    fontWeight: 400,
    marginTop: '4px',
    fontStyle: 'italic',
  },
  hiddenItemsIndicator: {
    padding: '8px 12px',
    marginBottom: '12px',
    background: 'rgba(255,255,255,0.02)',
    borderRadius: '8px',
    border: '1px solid rgba(255,255,255,0.05)',
  },
  showMoreButton: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    background: 'transparent',
    border: 'none',
    color: 'rgba(255,255,255,0.6)',
    fontSize: '0.8rem',
    cursor: 'pointer',
    padding: '0',
    transition: 'all 0.2s ease',
  },
  showMoreIcon: {
    fontSize: '1.2rem',
    color: '#22c55e',
  },
  showMoreText: {
    flex: 1,
    textAlign: 'left',
    marginLeft: '8px',
  },
  showMoreArrow: {
    fontSize: '0.7rem',
    color: '#22c55e',
  },
  collapseSection: {
    paddingTop: '8px',
    borderTop: '1px solid rgba(255,255,255,0.05)',
    marginTop: '8px',
  },
  collapseButton: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '6px',
    padding: '6px 12px',
    color: 'rgba(255,255,255,0.5)',
    fontSize: '0.75rem',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  collapseIcon: {
    fontSize: '0.7rem',
    color: '#22c55e',
  },
};

export default KanbanBoard;
