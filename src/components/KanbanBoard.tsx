'use client';

import React, { useState, useEffect, DragEvent } from 'react';

interface KanbanTask {
  id: string;
  text: string;
}

interface KanbanColumn {
  id: string;
  title: string;
  color: string;
  tasks: KanbanTask[];
}

interface KanbanColumnProps {
  column: KanbanColumn;
  isMobile?: boolean;
  onDragStart: (e: DragEvent, taskId: string, columnId: string) => void;
  onDragOver: (e: DragEvent) => void;
  onDrop: (e: DragEvent, columnId: string) => void;
  onDeleteTask: (columnId: string, taskId: string) => void;
}

const MAX_VISIBLE_ITEMS = 8;

/**
 * Individual Kanban column with drag-drop and delete functionality
 */
function KanbanColumnComponent({ 
  column, 
  isMobile = false,
  onDragStart,
  onDragOver,
  onDrop,
  onDeleteTask,
}: KanbanColumnProps): React.ReactElement {
  const [showAll, setShowAll] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

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

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
    onDragOver(e);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: DragEvent) => {
    setIsDragOver(false);
    onDrop(e, column.id);
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      style={{
        ...styles.kanbanColumnGrid,
        borderTop: `3px solid ${column.color}`,
        minHeight: column.tasks.length > 5 ? '400px' : '300px',
        maxHeight: showAll ? '500px' : 'auto',
        display: 'flex',
        flexDirection: 'column',
        background: isDragOver 
          ? `linear-gradient(135deg, ${column.color}15, ${column.color}08)` 
          : 'rgba(255,255,255,0.02)',
        transition: 'background 0.2s ease',
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
            key={task.id}
            draggable
            onDragStart={(e) => onDragStart(e, task.id, column.id)}
            style={{
              ...styles.kanbanTask,
              ...(!showAll && column.tasks.length > MAX_VISIBLE_ITEMS && index < 3 ? {
                opacity: 0.7,
              } : {}),
            }}
            className="kanban-task-hover"
          >
            {/* Delete button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDeleteTask(column.id, task.id);
              }}
              style={styles.deleteButton}
              className="delete-button-hover"
              title="Delete task"
            >
              ×
            </button>
            <span style={styles.kanbanTaskText}>{task.text}</span>
            <span style={styles.taskTimestamp}>
              {getTimestamp(index)}
            </span>
            <div style={styles.dragHandle}>⋮⋮</div>
          </div>
        ))}
        
        {column.tasks.length === 0 && (
          <div style={styles.emptyColumn}>
            Drop tasks here
          </div>
        )}
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

// Generate unique IDs for tasks
const generateId = () => `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

// Default columns with IDs
const createDefaultColumns = (): KanbanColumn[] => [
  { 
    id: 'todo', 
    title: 'To Do', 
    color: '#f59e0b', 
    tasks: [
      { id: generateId(), text: 'Memory Integration with Vector DB' },
      { id: generateId(), text: 'HeyGen Avatar Integration' },
      { id: generateId(), text: 'Email Automation Pipeline' },
      { id: generateId(), text: 'Voice Recognition Improvements' },
      { id: generateId(), text: 'Mobile PWA Optimization' },
      { id: generateId(), text: 'Agent Performance Analytics' },
      { id: generateId(), text: 'Security Audit & Compliance' },
    ]
  },
  { 
    id: 'progress', 
    title: 'In Progress', 
    color: '#667eea', 
    tasks: [
      { id: generateId(), text: 'Voice Chat Enhancement' },
      { id: generateId(), text: 'Agent Dashboard Redesign' },
      { id: generateId(), text: 'Real-time Orchestration View' },
      { id: generateId(), text: 'Kanban Board Implementation' },
    ]
  },
  { 
    id: 'done', 
    title: 'Done', 
    color: '#22c55e', 
    tasks: [
      { id: generateId(), text: 'Dashboard UI Design System' },
      { id: generateId(), text: 'Chat API Integration' },
      { id: generateId(), text: 'TTS Integration with ElevenLabs' },
      { id: generateId(), text: 'Skill Catalog Architecture' },
      { id: generateId(), text: 'Authentication System' },
      { id: generateId(), text: 'Database Schema Design' },
      { id: generateId(), text: 'Docker Containerization' },
      { id: generateId(), text: 'CI/CD Pipeline Setup' },
      { id: generateId(), text: 'Initial Agent Framework' },
      { id: generateId(), text: 'Basic Voice Commands' },
      { id: generateId(), text: 'Settings Panel' },
      { id: generateId(), text: 'Navigation System' },
      { id: generateId(), text: 'Theme System Implementation' },
      { id: generateId(), text: 'Mobile Responsive Design' },
      { id: generateId(), text: 'Error Handling Framework' },
    ]
  }
];

/**
 * Kanban board component with drag-drop and delete functionality
 */
export function KanbanBoard({ isMobile = false }: KanbanBoardProps): React.ReactElement {
  const [columns, setColumns] = useState<KanbanColumn[]>(createDefaultColumns);
  const [draggedTask, setDraggedTask] = useState<{ taskId: string; fromColumn: string } | null>(null);

  const handleDragStart = (e: DragEvent, taskId: string, columnId: string) => {
    setDraggedTask({ taskId, fromColumn: columnId });
    e.dataTransfer.effectAllowed = 'move';
    // Add visual feedback
    const target = e.target as HTMLElement;
    target.style.opacity = '0.5';
  };

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: DragEvent, toColumnId: string) => {
    e.preventDefault();
    
    if (!draggedTask) return;
    
    const { taskId, fromColumn } = draggedTask;
    
    if (fromColumn === toColumnId) {
      setDraggedTask(null);
      return;
    }

    setColumns(prevColumns => {
      const newColumns = [...prevColumns];
      
      // Find source and destination columns
      const sourceColIndex = newColumns.findIndex(c => c.id === fromColumn);
      const destColIndex = newColumns.findIndex(c => c.id === toColumnId);
      
      if (sourceColIndex === -1 || destColIndex === -1) return prevColumns;
      
      // Find and remove task from source
      const taskIndex = newColumns[sourceColIndex].tasks.findIndex(t => t.id === taskId);
      if (taskIndex === -1) return prevColumns;
      
      const [task] = newColumns[sourceColIndex].tasks.splice(taskIndex, 1);
      
      // Add task to destination
      newColumns[destColIndex].tasks.push(task);
      
      return newColumns;
    });
    
    setDraggedTask(null);
  };

  const handleDeleteTask = (columnId: string, taskId: string) => {
    setColumns(prevColumns => {
      return prevColumns.map(column => {
        if (column.id === columnId) {
          return {
            ...column,
            tasks: column.tasks.filter(task => task.id !== taskId),
          };
        }
        return column;
      });
    });
  };

  return (
    <div style={styles.kanbanSection}>
      <h2 style={styles.kanbanTitle}>
        📋 Project Board
      </h2>
      <p style={styles.kanbanSubtitle}>Drag tasks between columns • Click × to delete</p>
      <div style={styles.kanbanBoard}>
        {columns.map((column) => (
          <KanbanColumnComponent
            key={column.id}
            column={column}
            isMobile={isMobile}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onDeleteTask={handleDeleteTask}
          />
        ))}
      </div>
      
      <style>{`
        .kanban-task-hover {
          position: relative;
        }
        .kanban-task-hover:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.2);
          border-color: rgba(255,255,255,0.15) !important;
        }
        .kanban-task-hover:hover .delete-button-hover {
          opacity: 1;
        }
        .kanban-task-hover:active {
          cursor: grabbing;
        }
        .delete-button-hover {
          opacity: 0;
          transition: opacity 0.2s ease;
        }
        .delete-button-hover:hover {
          background: #ef4444 !important;
          color: white !important;
        }
      `}</style>
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
    margin: '0 0 4px 0',
    letterSpacing: '-0.02em',
  },
  kanbanSubtitle: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: '0.8rem',
    margin: '0 0 20px 0',
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
    paddingRight: '32px',
    border: '1px solid rgba(255,255,255,0.06)',
    transition: 'all 0.2s ease',
    cursor: 'grab',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    position: 'relative',
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
  deleteButton: {
    position: 'absolute',
    top: '6px',
    right: '6px',
    width: '20px',
    height: '20px',
    borderRadius: '50%',
    background: 'rgba(255,255,255,0.1)',
    border: 'none',
    color: 'rgba(255,255,255,0.5)',
    fontSize: '14px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    lineHeight: 1,
    padding: 0,
    transition: 'all 0.2s ease',
  },
  dragHandle: {
    position: 'absolute',
    bottom: '8px',
    right: '8px',
    color: 'rgba(255,255,255,0.2)',
    fontSize: '10px',
    letterSpacing: '-2px',
  },
  emptyColumn: {
    padding: '24px',
    textAlign: 'center',
    color: 'rgba(255,255,255,0.3)',
    fontSize: '0.85rem',
    border: '2px dashed rgba(255,255,255,0.1)',
    borderRadius: '10px',
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
