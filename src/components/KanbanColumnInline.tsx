'use client';

import React, { useState, useEffect } from 'react';
import { styles } from './kanbanStyles';

// Enhanced Kanban Column Component with auto-expansion and scrollable functionality for ALL columns
export default function KanbanColumnInline({
  column,
  isMobile = false
}: {
  column: { id: string; title: string; color: string; tasks: string[] };
  isMobile?: boolean;
}) {
  const [showAll, setShowAll] = useState(false);
  const [mounted, setMounted] = useState(false);
  const MAX_VISIBLE_ITEMS = 8;

  // Track mounted state for hydration-safe date formatting
  useEffect(() => {
    setMounted(true);
  }, []);

  // Show only last 8 items by default for all columns
  const visibleTasks = !showAll && column.tasks.length > MAX_VISIBLE_ITEMS
    ? column.tasks.slice(-MAX_VISIBLE_ITEMS) // Show last 8 items
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

  return (
    <div
      style={{
        ...styles.kanbanColumnGrid,
        borderTop: `3px solid ${column.color}`,
        // Auto-expansion: adjust min-height based on content
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

      {/* Show hidden items indicator for all columns */}
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
          // Make all columns scrollable when expanded
          ...(showAll ? {
            maxHeight: '350px',
            overflowY: 'auto' as const,
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
              // Staggered animation delay for entrance
              animationDelay: `${index * 0.05}s`,
              // Fade effect for older items when showing limited view
              ...(!showAll && column.tasks.length > MAX_VISIBLE_ITEMS && index < 3 ? {
                opacity: 0.7,
              } : {}),
            }}
            className="kanban-task-hover"
            onMouseEnter={(e) => {
              const target = e.currentTarget;
              target.style.transform = 'translateX(4px) scale(1.01)';
              target.style.background = 'linear-gradient(135deg, rgba(168,85,247,0.08) 0%, rgba(6,182,212,0.05) 100%)';
              target.style.borderColor = 'rgba(168,85,247,0.3)';
              target.style.boxShadow = '0 4px 20px rgba(168,85,247,0.15), inset 0 1px 0 rgba(255,255,255,0.05)';
            }}
            onMouseLeave={(e) => {
              const target = e.currentTarget;
              target.style.transform = 'translateX(0) scale(1)';
              target.style.background = 'linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(168,85,247,0.02) 100%)';
              target.style.borderColor = 'rgba(168,85,247,0.1)';
              target.style.boxShadow = 'none';
            }}
          >
            <span style={styles.kanbanTaskText}>{task}</span>
            {/* Add timestamps for all items based on column type */}
            <span style={styles.taskTimestamp}>
              {mounted ? (
                column.id === 'done'
                  ? `Completed ${new Date(Date.now() - (visibleTasks.length - index) * 86400000 * 2).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
                  : column.id === 'progress'
                    ? `Started ${new Date(Date.now() - (visibleTasks.length - index) * 86400000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
                    : `Added ${new Date(Date.now() - (visibleTasks.length - index) * 86400000 * 0.5).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
              ) : '...'}
            </span>
          </div>
        ))}
      </div>

      {/* Collapse button for all expanded columns */}
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
