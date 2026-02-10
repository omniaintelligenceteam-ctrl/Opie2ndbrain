'use client';

import React, { useState, useEffect } from 'react';

interface KanbanTask {
  id: string;
  text: string;
  column_id: 'todo' | 'progress' | 'done';
  position: number;
  created_at: string;
  updated_at: string;
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
  onDragStart: (e: React.DragEvent<HTMLDivElement>, taskId: string, columnId: string) => void;
  onDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
  onDrop: (e: React.DragEvent<HTMLDivElement>, columnId: string) => void;
  onDeleteTask: (columnId: string, taskId: string) => void;
  onAddTask: (columnId: string, text: string) => void;
}

const MAX_VISIBLE_ITEMS = 8;

/**
 * Individual Kanban column with drag-drop, delete, and add functionality
 */
function KanbanColumnComponent({ 
  column, 
  isMobile = false,
  onDragStart,
  onDragOver,
  onDrop,
  onDeleteTask,
  onAddTask,
}: KanbanColumnProps): React.ReactElement {
  const [showAll, setShowAll] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [newTaskText, setNewTaskText] = useState('');
  const [isAddingTask, setIsAddingTask] = useState(false);

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

  const getTimestamp = (task: KanbanTask): string => {
    if (!mounted) return '...';
    
    const date = new Date(task.created_at);
    const formatted = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    
    if (column.id === 'done') return `Completed ${formatted}`;
    if (column.id === 'progress') return `Started ${formatted}`;
    return `Added ${formatted}`;
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
    onDragOver(e);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    setIsDragOver(false);
    onDrop(e, column.id);
  };

  const handleAddTask = async () => {
    if (newTaskText.trim()) {
      setIsAddingTask(true);
      try {
        await onAddTask(column.id, newTaskText.trim());
        setNewTaskText('');
      } finally {
        setIsAddingTask(false);
      }
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAddTask();
    }
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

      {/* Add Task Input */}
      <div style={styles.addTaskContainer}>
        <input
          type="text"
          placeholder={`Add task to ${column.title.toLowerCase()}...`}
          value={newTaskText}
          onChange={(e) => setNewTaskText(e.target.value)}
          onKeyPress={handleKeyPress}
          disabled={isAddingTask}
          style={{
            ...styles.addTaskInput,
            borderColor: `${column.color}40`,
          }}
          className="add-task-input"
        />
        {newTaskText.trim() && (
          <button
            onClick={handleAddTask}
            disabled={isAddingTask}
            style={{
              ...styles.addTaskButton,
              background: column.color,
            }}
            className="add-task-button"
          >
            {isAddingTask ? '⏳' : '➕'}
          </button>
        )}
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
              {getTimestamp(task)}
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

/**
 * Kanban board component with drag-drop, delete, add, and persistence
 */
export function KanbanBoard({ isMobile = false }: KanbanBoardProps): React.ReactElement {
  const [columns, setColumns] = useState<KanbanColumn[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [draggedTask, setDraggedTask] = useState<{ taskId: string; fromColumn: string } | null>(null);

  // API call functions
  const fetchTasks = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/kanban');
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch tasks');
      }
      
      setColumns(data.columns);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      console.error('Error fetching tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  const addTask = async (columnId: string, text: string): Promise<KanbanTask> => {
    const response = await fetch('/api/kanban', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, column_id: columnId }),
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Failed to add task');
    }
    
    return data.task;
  };

  const updateTask = async (taskId: string, updates: Partial<KanbanTask>): Promise<KanbanTask> => {
    const response = await fetch('/api/kanban', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: taskId, ...updates }),
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Failed to update task');
    }
    
    return data.task;
  };

  const deleteTask = async (taskId: string): Promise<void> => {
    const response = await fetch(`/api/kanban?id=${taskId}`, {
      method: 'DELETE',
    });
    
    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Failed to delete task');
    }
  };

  // Load tasks on mount
  useEffect(() => {
    fetchTasks();
  }, []);

  // Event handlers
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, taskId: string, columnId: string) => {
    setDraggedTask({ taskId, fromColumn: columnId });
    e.dataTransfer.effectAllowed = 'move';
    const target = e.target as HTMLElement;
    target.style.opacity = '0.5';
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>, toColumnId: string) => {
    e.preventDefault();
    
    if (!draggedTask || draggedTask.fromColumn === toColumnId) {
      setDraggedTask(null);
      return;
    }

    const { taskId, fromColumn } = draggedTask;

    // Optimistic UI update
    const sourceColIndex = columns.findIndex(c => c.id === fromColumn);
    const destColIndex = columns.findIndex(c => c.id === toColumnId);
    
    if (sourceColIndex === -1 || destColIndex === -1) {
      setDraggedTask(null);
      return;
    }

    const newColumns = [...columns];
    const taskIndex = newColumns[sourceColIndex].tasks.findIndex(t => t.id === taskId);
    
    if (taskIndex === -1) {
      setDraggedTask(null);
      return;
    }

    const [task] = newColumns[sourceColIndex].tasks.splice(taskIndex, 1);
    const updatedTask = { ...task, column_id: toColumnId as 'todo' | 'progress' | 'done' };
    newColumns[destColIndex].tasks.push(updatedTask);
    
    // Update UI immediately
    setColumns(newColumns);
    setDraggedTask(null);

    // Sync with backend
    try {
      await updateTask(taskId, { 
        column_id: toColumnId as 'todo' | 'progress' | 'done',
        position: newColumns[destColIndex].tasks.length 
      });
    } catch (err) {
      console.error('Error moving task:', err);
      // Revert optimistic update on error
      fetchTasks();
    }
  };

  const handleDeleteTask = async (columnId: string, taskId: string) => {
    // Optimistic UI update
    const newColumns = columns.map(column => {
      if (column.id === columnId) {
        return {
          ...column,
          tasks: column.tasks.filter(task => task.id !== taskId),
        };
      }
      return column;
    });
    
    setColumns(newColumns);

    // Sync with backend
    try {
      await deleteTask(taskId);
    } catch (err) {
      console.error('Error deleting task:', err);
      // Revert optimistic update on error
      fetchTasks();
    }
  };

  const handleAddTask = async (columnId: string, text: string) => {
    try {
      const newTask = await addTask(columnId, text);
      
      // Update UI with the new task
      const newColumns = columns.map(column => {
        if (column.id === columnId) {
          return {
            ...column,
            tasks: [...column.tasks, newTask],
          };
        }
        return column;
      });
      
      setColumns(newColumns);
    } catch (err) {
      console.error('Error adding task:', err);
      setError(err instanceof Error ? err.message : 'Failed to add task');
    }
  };

  if (loading) {
    return (
      <div style={styles.kanbanSection}>
        <h2 style={styles.kanbanTitle}>📋 Project Board</h2>
        <div style={styles.loadingContainer}>
          <div style={styles.loadingSpinner}>⏳</div>
          <span style={styles.loadingText}>Loading tasks...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.kanbanSection}>
        <h2 style={styles.kanbanTitle}>📋 Project Board</h2>
        <div style={styles.errorContainer}>
          <div style={styles.errorIcon}>⚠️</div>
          <span style={styles.errorText}>Error: {error}</span>
          <button onClick={fetchTasks} style={styles.retryButton}>
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.kanbanSection}>
      <h2 style={styles.kanbanTitle}>
        📋 Project Board
      </h2>
      <p style={styles.kanbanSubtitle}>Drag tasks between columns • Click × to delete • Add new tasks in each column</p>
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
            onAddTask={handleAddTask}
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
        .add-task-input {
          border: 1px solid rgba(255,255,255,0.1);
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
        }
        .add-task-input:focus {
          border-color: rgba(255,255,255,0.3);
          box-shadow: 0 0 0 2px rgba(255,255,255,0.1);
          outline: none;
        }
        .add-task-button:hover {
          transform: scale(1.1);
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
  addTaskContainer: {
    display: 'flex',
    gap: '8px',
    marginBottom: '16px',
    alignItems: 'flex-start',
  },
  addTaskInput: {
    flex: 1,
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '8px',
    padding: '8px 12px',
    color: 'rgba(255,255,255,0.8)',
    fontSize: '0.85rem',
    fontFamily: 'inherit',
  },
  addTaskButton: {
    width: '32px',
    height: '32px',
    borderRadius: '8px',
    border: 'none',
    color: 'white',
    fontSize: '14px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'transform 0.2s ease',
    flexShrink: 0,
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
  loadingContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px',
    gap: '12px',
  },
  loadingSpinner: {
    fontSize: '1.5rem',
    animation: 'pulse 2s infinite',
  },
  loadingText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: '0.9rem',
  },
  errorContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px',
    gap: '12px',
    flexDirection: 'column',
  },
  errorIcon: {
    fontSize: '2rem',
  },
  errorText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: '0.9rem',
    textAlign: 'center',
  },
  retryButton: {
    background: '#ef4444',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    padding: '8px 16px',
    fontSize: '0.85rem',
    cursor: 'pointer',
    marginTop: '8px',
    transition: 'background 0.2s ease',
  },
};

export default KanbanBoard;