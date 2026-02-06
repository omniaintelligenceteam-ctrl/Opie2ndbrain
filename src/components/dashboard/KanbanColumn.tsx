// src/components/dashboard/KanbanColumn.tsx
// Extracted KanbanColumn from OpieKanban
'use client';
import React, { useState, useEffect, memo } from 'react';

interface KanbanColumnData {
  id: string;
  title: string;
  color: string;
  tasks: string[];
}

interface KanbanColumnProps {
  column: KanbanColumnData;
  isMobile?: boolean;
}

const MAX_VISIBLE_ITEMS = 8;

const KanbanColumn: React.FC<KanbanColumnProps> = memo(function KanbanColumn({
  column,
  isMobile = false,
}) {
  const [showAll, setShowAll] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const visibleTasks =
    !showAll && column.tasks.length > MAX_VISIBLE_ITEMS
      ? column.tasks.slice(-MAX_VISIBLE_ITEMS)
      : column.tasks;
  const hiddenCount = Math.max(0, column.tasks.length - MAX_VISIBLE_ITEMS);

  const getColumnActionText = () => {
    switch (column.id) {
      case 'done':
        return 'completed item';
      case 'progress':
        return 'in-progress item';
      case 'todo':
        return 'pending item';
      default:
        return 'item';
    }
  };

  return (
    <div
      style={{
        background:
          'linear-gradient(180deg, rgba(255,255,255,0.02) 0%, rgba(168,85,247,0.02) 100%)',
        borderRadius: '16px',
        borderTop: `3px solid ${column.color}`,
        border: '1px solid rgba(168,85,247,0.1)',
        borderTopWidth: '3px',
        borderTopColor: column.color,
        boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
        overflow: 'hidden',
        transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
        minHeight: column.tasks.length > 5 ? '400px' : '300px',
        maxHeight: showAll ? '500px' : 'auto',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px',
          padding: '16px 18px 0',
        }}
      >
        <h3
          style={{
            fontSize: '1rem',
            fontWeight: 600,
            margin: 0,
            color: column.color,
          }}
        >
          {column.title}
        </h3>
        <span
          style={{
            padding: '4px 8px',
            borderRadius: '12px',
            fontSize: '0.75rem',
            fontWeight: 700,
            border: '1px solid rgba(255,255,255,0.1)',
            background: `${column.color}20`,
            color: column.color,
          }}
        >
          {column.tasks.length}
        </span>
      </div>

      {/* Show more indicator */}
      {hiddenCount > 0 && !showAll && (
        <div
          style={{
            padding: '8px 12px',
            margin: '0 14px 12px',
            background: 'rgba(255,255,255,0.02)',
            borderRadius: '8px',
            border: '1px solid rgba(255,255,255,0.05)',
          }}
        >
          <button
            onClick={() => setShowAll(true)}
            className="show-more-hover"
            style={{
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
            }}
          >
            <span style={{ fontSize: '1.2rem', color: '#22c55e' }}>⋯</span>
            <span style={{ flex: 1, textAlign: 'left', marginLeft: '8px' }}>
              {hiddenCount} more {getColumnActionText()}
              {hiddenCount !== 1 ? 's' : ''}
            </span>
            <span style={{ fontSize: '0.7rem', color: '#22c55e' }}>▼</span>
          </button>
        </div>
      )}

      {/* Tasks */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          padding: '0 14px 14px',
          flex: 1,
          ...(showAll
            ? { maxHeight: '350px', overflowY: 'auto', paddingRight: '8px' }
            : {}),
        }}
        className={showAll ? 'kanban-scrollable' : ''}
      >
        {visibleTasks.map((task, index) => (
          <div
            key={`${column.id}-${index}`}
            className="kanban-task-hover"
            style={{
              background:
                'linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(168,85,247,0.02) 100%)',
              borderRadius: '12px',
              padding: '14px',
              border: '1px solid rgba(168,85,247,0.1)',
              transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
              animation: 'fadeInUp 0.4s ease-out backwards',
              animationDelay: `${index * 0.05}s`,
              ...(!showAll && column.tasks.length > MAX_VISIBLE_ITEMS && index < 3
                ? { opacity: 0.7 }
                : {}),
            }}
            onMouseEnter={(e) => {
              const t = e.currentTarget;
              t.style.transform = 'translateX(4px) scale(1.01)';
              t.style.background =
                'linear-gradient(135deg, rgba(168,85,247,0.08) 0%, rgba(6,182,212,0.05) 100%)';
              t.style.borderColor = 'rgba(168,85,247,0.3)';
              t.style.boxShadow =
                '0 4px 20px rgba(168,85,247,0.15), inset 0 1px 0 rgba(255,255,255,0.05)';
            }}
            onMouseLeave={(e) => {
              const t = e.currentTarget;
              t.style.transform = 'translateX(0) scale(1)';
              t.style.background =
                'linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(168,85,247,0.02) 100%)';
              t.style.borderColor = 'rgba(168,85,247,0.1)';
              t.style.boxShadow = 'none';
            }}
          >
            <span
              style={{
                color: 'rgba(255,255,255,0.85)',
                fontSize: '0.85rem',
                fontWeight: 500,
                lineHeight: 1.4,
                flex: 1,
              }}
            >
              {task}
            </span>
            <span
              style={{
                color: 'rgba(255,255,255,0.4)',
                fontSize: '0.7rem',
                fontWeight: 400,
                marginTop: '4px',
                fontStyle: 'italic',
              }}
            >
              {mounted
                ? column.id === 'done'
                  ? `Completed ${new Date(Date.now() - (visibleTasks.length - index) * 86400000 * 2).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
                  : column.id === 'progress'
                    ? `Started ${new Date(Date.now() - (visibleTasks.length - index) * 86400000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
                    : `Added ${new Date(Date.now() - (visibleTasks.length - index) * 86400000 * 0.5).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
                : '...'}
            </span>
          </div>
        ))}
      </div>

      {/* Collapse button */}
      {showAll && hiddenCount > 0 && (
        <div
          style={{
            paddingTop: '8px',
            borderTop: '1px solid rgba(255,255,255,0.05)',
            marginTop: '8px',
            padding: '8px 14px 14px',
          }}
        >
          <button
            onClick={() => setShowAll(false)}
            className="collapse-hover"
            style={{
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
            }}
          >
            <span style={{ fontSize: '0.7rem', color: '#22c55e' }}>▲</span>
            <span>Show less</span>
          </button>
        </div>
      )}
    </div>
  );
});

export default KanbanColumn;

export type { KanbanColumnData };
