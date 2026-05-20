'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  useOpsState,
  type TodoItem,
  type UrgencyColumnId,
  DRAG_TODO_TYPE,
  makeId,
} from '@/hooks/useOpsState';

const M = "'JetBrains Mono', 'Fira Code', monospace";

const shortDate = (isoDate: string) =>
  new Date(`${isoDate}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

const todayIso = () => new Date().toISOString().slice(0, 10);

function useIsNarrow(breakpoint = 1024) {
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const check = () => setNarrow(window.innerWidth < breakpoint);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, [breakpoint]);
  return narrow;
}

export default function TasksView() {
  const {
    todos,
    urgencyColumns,
    syncStatus,
    setTodos,
    setUrgencyColumns,
  } = useOpsState();
  const isNarrow = useIsNarrow();

  const [search, setSearch] = useState('');
  const [newTodoText, setNewTodoText] = useState('');
  const [newTodoGroup, setNewTodoGroup] = useState('Quotes Needed');
  const [showCompleted, setShowCompleted] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [editNoteId, setEditNoteId] = useState<string | null>(null);
  const [scheduleId, setScheduleId] = useState<string | null>(null);
  const [dragTodoId, setDragTodoId] = useState<string | null>(null);
  const [dropUrgency, setDropUrgency] = useState<UrgencyColumnId | null>(null);
  const [dropGroup, setDropGroup] = useState<string | null>(null);
  const [newGroupName, setNewGroupName] = useState('');
  const [showNewGroup, setShowNewGroup] = useState(false);

  const searchRef = useRef<HTMLInputElement>(null);
  const addRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcuts: '/' to focus search, 'n' to focus add
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const inField =
        target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT';
      if (inField) return;
      if (e.key === '/') {
        e.preventDefault();
        searchRef.current?.focus();
      } else if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        addRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  /* ── DERIVATIONS ── */
  const openTodos = useMemo(() => todos.filter((t) => !t.done), [todos]);
  const doneTodos = useMemo(() => todos.filter((t) => t.done), [todos]);

  const filteredOpen = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return openTodos;
    return openTodos.filter(
      (t) =>
        t.text.toLowerCase().includes(s) ||
        t.group.toLowerCase().includes(s) ||
        (t.note || '').toLowerCase().includes(s),
    );
  }, [openTodos, search]);

  const todoGroups = useMemo(() => {
    const set = new Set<string>(openTodos.map((t) => t.group));
    return Array.from(set);
  }, [openTodos]);

  const todosByGroup = useMemo(
    () =>
      filteredOpen.reduce<Record<string, TodoItem[]>>((acc, t) => {
        (acc[t.group] ||= []).push(t);
        return acc;
      }, {}),
    [filteredOpen],
  );

  const todosByUrgency = useMemo(
    () =>
      openTodos.reduce<Record<UrgencyColumnId, TodoItem[]>>(
        (acc, t) => {
          if (t.urgencyColumnId) acc[t.urgencyColumnId].push(t);
          return acc;
        },
        { urgent: [], soon: [], later: [] },
      ),
    [openTodos],
  );

  const today = todayIso();
  const stats = useMemo(
    () => ({
      open: openTodos.length,
      immediate: todosByUrgency.urgent.length,
      soon: todosByUrgency.soon.length,
      doneToday: doneTodos.filter((t) => (t.completedAt || '').slice(0, 10) === today).length,
      scheduledToday: openTodos.filter((t) => t.scheduledDate === today).length,
    }),
    [openTodos, doneTodos, todosByUrgency, today],
  );

  /* ── ACTIONS ── */
  const toggleTodo = (id: string) =>
    setTodos((prev) =>
      prev.map((t) =>
        t.id === id
          ? { ...t, done: !t.done, completedAt: !t.done ? new Date().toISOString() : undefined }
          : t,
      ),
    );

  const removeTodo = (id: string) => setTodos((prev) => prev.filter((t) => t.id !== id));

  const addTodo = () => {
    const text = newTodoText.trim();
    if (!text) return;
    setTodos((prev) => [
      ...prev,
      {
        id: makeId('todo'),
        group: newTodoGroup,
        text,
        done: false,
        createdAt: new Date().toISOString(),
      },
    ]);
    setNewTodoText('');
  };

  const updateText = (id: string, text: string) =>
    setTodos((prev) => prev.map((t) => (t.id === id ? { ...t, text } : t)));

  const updateNote = (id: string, note: string) =>
    setTodos((prev) => prev.map((t) => (t.id === id ? { ...t, note } : t)));

  const updateGroup = (id: string, group: string) =>
    setTodos((prev) => prev.map((t) => (t.id === id ? { ...t, group } : t)));

  const updateUrgency = (id: string, urgency: UrgencyColumnId | undefined) =>
    setTodos((prev) => prev.map((t) => (t.id === id ? { ...t, urgencyColumnId: urgency } : t)));

  const updateScheduled = (id: string, date: string | undefined) =>
    setTodos((prev) => prev.map((t) => (t.id === id ? { ...t, scheduledDate: date } : t)));

  const updateColumnTitle = (id: UrgencyColumnId, title: string) =>
    setUrgencyColumns((prev) => prev.map((c) => (c.id === id ? { ...c, title } : c)));

  const enforceColumnTitle = (id: UrgencyColumnId) =>
    setUrgencyColumns((prev) =>
      prev.map((c) => {
        if (c.id !== id) return c;
        if (c.title.trim()) return { ...c, title: c.title.trim() };
        const fallback = id === 'urgent' ? 'Immediate' : id === 'soon' ? 'Soon' : 'Can Wait';
        return { ...c, title: fallback };
      }),
    );

  const clearAllCompleted = () => {
    if (!doneTodos.length) return;
    if (typeof window !== 'undefined' && !window.confirm(`Clear ${doneTodos.length} completed tasks?`)) return;
    setTodos((prev) => prev.filter((t) => !t.done));
  };

  const addGroup = () => {
    const name = newGroupName.trim();
    if (!name) return;
    setNewTodoGroup(name);
    setNewGroupName('');
    setShowNewGroup(false);
    // Force the group to appear by adding an empty placeholder is not desired -
    // instead, just set it as the active add target. The group materializes when first todo added.
  };

  const toggleGroupCollapse = (group: string) =>
    setCollapsedGroups((prev) => ({ ...prev, [group]: !prev[group] }));

  /* ── DRAG/DROP ── */
  const beginDrag = (id: string, e: React.DragEvent<HTMLElement>) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData(DRAG_TODO_TYPE, id);
    setDragTodoId(id);
  };

  const readDragId = (e: React.DragEvent<HTMLElement>) =>
    e.dataTransfer.getData(DRAG_TODO_TYPE) || dragTodoId;

  /* ── STYLES ── */
  const syncLabel =
    syncStatus === 'synced' ? '● Synced' : syncStatus === 'syncing' ? '◐ Syncing' : '○ Local';
  const syncStyle =
    syncStatus === 'synced'
      ? s.syncOk
      : syncStatus === 'syncing'
      ? s.syncBusy
      : s.syncOff;

  /* ── RENDER ── */
  return (
    <div style={s.page}>
      {/* ── HEADER ── */}
      <div style={s.headerBar}>
        <div>
          <div style={s.title}>TASKS &amp; EMERGENCY BOARD</div>
          <div style={s.subtitle}>Capture · Prioritize · Crush</div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ ...s.syncBadge, ...syncStyle }}>{syncLabel}</span>
        </div>
      </div>

      {/* ── STATS ── */}
      <div style={{ ...s.statsGrid, gridTemplateColumns: isNarrow ? 'repeat(2, 1fr)' : 'repeat(5, 1fr)' }}>
        <StatCard label="OPEN" value={stats.open} color="#a855f7" />
        <StatCard label="IMMEDIATE" value={stats.immediate} color="#ef4444" pulse={stats.immediate > 0} />
        <StatCard label="SOON" value={stats.soon} color="#f59e0b" />
        <StatCard label="SCHED TODAY" value={stats.scheduledToday} color="#06b6d4" />
        <StatCard label="DONE TODAY" value={stats.doneToday} color="#22c55e" />
      </div>

      {/* ── ADD BAR ── */}
      <div style={s.addBar}>
        <div style={s.searchWrap}>
          <span style={s.searchIcon}>⌕</span>
          <input
            ref={searchRef}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tasks  ( / )"
            style={s.searchInput}
          />
          {search && (
            <button onClick={() => setSearch('')} style={s.searchClear} aria-label="Clear search">
              ×
            </button>
          )}
        </div>
        <div style={s.quickAdd}>
          <select
            value={newTodoGroup}
            onChange={(e) => setNewTodoGroup(e.target.value)}
            style={s.groupSelect}
          >
            {todoGroups.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
            {!todoGroups.includes(newTodoGroup) && (
              <option value={newTodoGroup}>{newTodoGroup}</option>
            )}
          </select>
          <input
            ref={addRef}
            value={newTodoText}
            onChange={(e) => setNewTodoText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addTodo()}
            placeholder="New task  ( N )"
            style={s.addInput}
          />
          <button onClick={addTodo} style={s.addBtn} disabled={!newTodoText.trim()}>
            + Add
          </button>
        </div>
      </div>

      {/* ── MAIN GRID: GROUPS  +  EMERGENCY BOARD ── */}
      <div style={{ ...s.mainRow, flexDirection: isNarrow ? 'column' : 'row' }}>
        {/* GROUPS LIST */}
        <section style={s.groupsPanel}>
          <div style={s.panelHeader}>
            <span style={s.panelTitle}>GROUPS</span>
            <button
              onClick={() => setShowNewGroup((v) => !v)}
              style={s.smallBtn}
              aria-label="Add group"
            >
              + Group
            </button>
          </div>

          {showNewGroup && (
            <div style={s.newGroupRow}>
              <input
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') addGroup();
                  if (e.key === 'Escape') setShowNewGroup(false);
                }}
                placeholder="Group name..."
                style={s.input}
                autoFocus
              />
              <button onClick={addGroup} style={s.smallBtnPrimary}>
                Save
              </button>
              <button onClick={() => setShowNewGroup(false)} style={s.smallBtn}>
                Cancel
              </button>
            </div>
          )}

          <div style={s.groupList}>
            {Object.keys(todosByGroup).length === 0 && (
              <div style={s.emptyHint}>
                {search ? `No tasks match "${search}"` : 'No open tasks. Add one above.'}
              </div>
            )}
            {Object.entries(todosByGroup).map(([group, items]) => {
              const collapsed = collapsedGroups[group];
              const isDrop = dropGroup === group;
              return (
                <div
                  key={group}
                  style={{ ...s.groupBlock, ...(isDrop ? s.groupBlockDrop : {}) }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDropGroup(group);
                  }}
                  onDragLeave={() => setDropGroup((prev) => (prev === group ? null : prev))}
                  onDrop={(e) => {
                    e.preventDefault();
                    const id = readDragId(e);
                    if (id) updateGroup(id, group);
                    setDropGroup(null);
                    setDragTodoId(null);
                  }}
                >
                  <button
                    onClick={() => toggleGroupCollapse(group)}
                    style={s.groupHeader}
                    aria-expanded={!collapsed}
                  >
                    <span style={{ ...s.chevron, transform: collapsed ? 'rotate(-90deg)' : 'rotate(0)' }}>
                      ▾
                    </span>
                    <span style={s.groupName}>{group}</span>
                    <span style={s.groupCount}>{items.length}</span>
                  </button>
                  {!collapsed && (
                    <div style={s.groupItems}>
                      {items.map((t) => (
                        <TaskRow
                          key={t.id}
                          todo={t}
                          editingId={editingId}
                          editText={editText}
                          editNoteId={editNoteId}
                          scheduleId={scheduleId}
                          dragTodoId={dragTodoId}
                          urgencyColumns={urgencyColumns}
                          onBeginDrag={beginDrag}
                          onEndDrag={() => {
                            setDragTodoId(null);
                            setDropUrgency(null);
                            setDropGroup(null);
                          }}
                          onToggle={toggleTodo}
                          onRemove={removeTodo}
                          onStartEdit={(id, text) => {
                            setEditingId(id);
                            setEditText(text);
                          }}
                          onChangeEditText={setEditText}
                          onCommitEdit={() => {
                            if (editingId && editText.trim()) updateText(editingId, editText.trim());
                            setEditingId(null);
                          }}
                          onCancelEdit={() => setEditingId(null)}
                          onOpenNote={(id) => setEditNoteId(id === editNoteId ? null : id)}
                          onSaveNote={(id, note) => updateNote(id, note)}
                          onCloseNote={() => setEditNoteId(null)}
                          onOpenSchedule={(id) => setScheduleId(id === scheduleId ? null : id)}
                          onSetSchedule={(id, date) => {
                            updateScheduled(id, date);
                            setScheduleId(null);
                          }}
                          onClearSchedule={(id) => {
                            updateScheduled(id, undefined);
                            setScheduleId(null);
                          }}
                          onSetUrgency={updateUrgency}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* EMERGENCY BOARD */}
        <section style={s.boardPanel}>
          <div style={s.panelHeader}>
            <span style={{ ...s.panelTitle, color: '#fda4af' }}>EMERGENCY BOARD</span>
            <span style={s.boardHint}>Drag to prioritize</span>
          </div>
          <div
            style={{
              ...s.boardGrid,
              gridTemplateColumns: isNarrow ? '1fr' : 'repeat(3, minmax(0, 1fr))',
            }}
          >
            {urgencyColumns.map((column) => {
              const items = todosByUrgency[column.id];
              const isDrop = dropUrgency === column.id;
              return (
                <div
                  key={column.id}
                  style={{
                    ...s.boardColumn,
                    borderColor: `${column.color}66`,
                    ...(isDrop ? { ...s.boardColumnDrop, borderColor: column.color } : {}),
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDropUrgency(column.id);
                  }}
                  onDragLeave={() => setDropUrgency((prev) => (prev === column.id ? null : prev))}
                  onDrop={(e) => {
                    e.preventDefault();
                    const id = readDragId(e);
                    if (id) updateUrgency(id, column.id);
                    setDropUrgency(null);
                    setDragTodoId(null);
                  }}
                >
                  <div style={{ ...s.boardColumnHeader, borderBottomColor: `${column.color}55` }}>
                    <span style={{ ...s.boardColumnDot, background: column.color }} />
                    <input
                      value={column.title}
                      onChange={(e) => updateColumnTitle(column.id, e.target.value)}
                      onBlur={() => enforceColumnTitle(column.id)}
                      style={{ ...s.boardColumnTitle, color: column.color }}
                    />
                    <span style={{ ...s.boardColumnCount, color: column.color, borderColor: `${column.color}55` }}>
                      {items.length}
                    </span>
                  </div>
                  <div style={s.boardColumnList}>
                    {items.map((t) => (
                      <div
                        key={t.id}
                        draggable
                        onDragStart={(e) => beginDrag(t.id, e)}
                        onDragEnd={() => {
                          setDragTodoId(null);
                          setDropUrgency(null);
                          setDropGroup(null);
                        }}
                        style={{
                          ...s.boardCard,
                          borderLeftColor: column.color,
                          ...(dragTodoId === t.id ? s.dragging : {}),
                        }}
                      >
                        <div style={s.boardCardTop}>
                          <input
                            type="checkbox"
                            checked={t.done}
                            onChange={() => toggleTodo(t.id)}
                            style={s.checkbox}
                          />
                          <span style={s.boardCardText}>{t.text}</span>
                          <button
                            onClick={() => updateUrgency(t.id, undefined)}
                            style={s.boardCardClose}
                            title="Remove from board"
                            aria-label="Remove from board"
                          >
                            ×
                          </button>
                        </div>
                        <div style={s.boardCardMeta}>
                          <span style={s.boardCardGroup}>{t.group}</span>
                          {t.scheduledDate && (
                            <span style={s.boardCardDate}>📅 {shortDate(t.scheduledDate)}</span>
                          )}
                        </div>
                      </div>
                    ))}
                    {items.length === 0 && <div style={s.boardEmpty}>Drop tasks here</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {/* ── COMPLETED ── */}
      <div style={s.completedPanel}>
        <button onClick={() => setShowCompleted((v) => !v)} style={s.completedHeader}>
          <span style={{ ...s.chevron, transform: showCompleted ? 'rotate(0)' : 'rotate(-90deg)' }}>▾</span>
          <span style={s.completedTitle}>Completed</span>
          <span style={s.completedCount}>{doneTodos.length}</span>
          <span style={{ flex: 1 }} />
          {showCompleted && doneTodos.length > 0 && (
            <span
              role="button"
              onClick={(e) => {
                e.stopPropagation();
                clearAllCompleted();
              }}
              style={s.clearBtn}
            >
              Clear all
            </span>
          )}
        </button>
        {showCompleted && (
          <div style={s.completedList}>
            {doneTodos.length === 0 && <div style={s.emptyHint}>No completed tasks yet.</div>}
            {doneTodos.map((t) => (
              <div key={t.id} style={s.completedItem}>
                <input type="checkbox" checked readOnly onClick={() => toggleTodo(t.id)} style={s.checkbox} />
                <span style={s.completedText}>{t.text}</span>
                <span style={s.completedGroup}>{t.group}</span>
                {t.completedAt && (
                  <span style={s.completedDate}>
                    {new Date(t.completedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                )}
                <button onClick={() => toggleTodo(t.id)} style={s.smallBtn}>
                  Restore
                </button>
                <button onClick={() => removeTodo(t.id)} style={s.smallBtn} aria-label="Delete">
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   ROW COMPONENTS
   ═══════════════════════════════════════════════════════════════════════ */

function StatCard({
  label,
  value,
  color,
  pulse,
}: {
  label: string;
  value: number;
  color: string;
  pulse?: boolean;
}) {
  return (
    <div
      style={{
        ...s.statCard,
        borderColor: `${color}55`,
        boxShadow: pulse && value > 0 ? `0 0 24px ${color}33` : `0 0 12px ${color}11`,
      }}
    >
      <div style={{ ...s.statLabel, color }}>{label}</div>
      <div style={{ ...s.statValue, color: value > 0 ? '#fff' : 'rgba(255,255,255,0.35)' }}>{value}</div>
    </div>
  );
}

type TaskRowProps = {
  todo: TodoItem;
  editingId: string | null;
  editText: string;
  editNoteId: string | null;
  scheduleId: string | null;
  dragTodoId: string | null;
  urgencyColumns: { id: UrgencyColumnId; title: string; color: string }[];
  onBeginDrag: (id: string, e: React.DragEvent<HTMLElement>) => void;
  onEndDrag: () => void;
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
  onStartEdit: (id: string, text: string) => void;
  onChangeEditText: (text: string) => void;
  onCommitEdit: () => void;
  onCancelEdit: () => void;
  onOpenNote: (id: string) => void;
  onSaveNote: (id: string, note: string) => void;
  onCloseNote: () => void;
  onOpenSchedule: (id: string) => void;
  onSetSchedule: (id: string, date: string) => void;
  onClearSchedule: (id: string) => void;
  onSetUrgency: (id: string, urgency: UrgencyColumnId | undefined) => void;
};

function TaskRow(props: TaskRowProps) {
  const {
    todo: t,
    editingId,
    editText,
    editNoteId,
    scheduleId,
    dragTodoId,
    urgencyColumns,
    onBeginDrag,
    onEndDrag,
    onToggle,
    onRemove,
    onStartEdit,
    onChangeEditText,
    onCommitEdit,
    onCancelEdit,
    onOpenNote,
    onSaveNote,
    onCloseNote,
    onOpenSchedule,
    onSetSchedule,
    onClearSchedule,
    onSetUrgency,
  } = props;

  const isEditing = editingId === t.id;
  const isNoteOpen = editNoteId === t.id;
  const isSchedOpen = scheduleId === t.id;
  const isDragging = dragTodoId === t.id;
  const urgency = urgencyColumns.find((c) => c.id === t.urgencyColumnId);

  return (
    <div
      draggable={!isEditing}
      onDragStart={(e) => onBeginDrag(t.id, e)}
      onDragEnd={onEndDrag}
      style={{ ...s.taskRow, ...(isDragging ? s.dragging : {}) }}
    >
      <div style={s.taskMain}>
        <input
          type="checkbox"
          checked={t.done}
          onChange={() => onToggle(t.id)}
          style={s.checkbox}
        />
        {isEditing ? (
          <input
            value={editText}
            autoFocus
            onChange={(e) => onChangeEditText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onCommitEdit();
              if (e.key === 'Escape') onCancelEdit();
            }}
            onBlur={onCommitEdit}
            style={s.taskEditInput}
          />
        ) : (
          <span
            style={s.taskText}
            onDoubleClick={() => onStartEdit(t.id, t.text)}
            title="Double-click to edit"
          >
            {t.text}
          </span>
        )}
        {urgency && (
          <span
            style={{
              ...s.taskBadge,
              color: urgency.color,
              borderColor: `${urgency.color}66`,
              background: `${urgency.color}1a`,
            }}
          >
            {urgency.title}
          </span>
        )}
        {t.scheduledDate && <span style={s.taskBadge}>📅 {shortDate(t.scheduledDate)}</span>}
        {t.note && (
          <span
            style={{ ...s.taskBadge, background: 'rgba(168,85,247,0.12)', borderColor: 'rgba(168,85,247,0.4)', color: '#c4b5fd' }}
            title={t.note}
          >
            📝
          </span>
        )}
        <div style={s.taskActions}>
          <button onClick={() => onStartEdit(t.id, t.text)} style={s.iconBtn} title="Edit">
            ✎
          </button>
          <button onClick={() => onOpenSchedule(t.id)} style={s.iconBtn} title="Schedule">
            📅
          </button>
          <button onClick={() => onOpenNote(t.id)} style={s.iconBtn} title="Note">
            📝
          </button>
          <UrgencyMenu
            urgencyColumns={urgencyColumns}
            current={t.urgencyColumnId}
            onSet={(u) => onSetUrgency(t.id, u)}
          />
          <button onClick={() => onRemove(t.id)} style={s.iconBtnDanger} title="Delete">
            ×
          </button>
        </div>
      </div>

      {isSchedOpen && (
        <div style={s.subPanel}>
          <input
            type="date"
            defaultValue={t.scheduledDate || ''}
            onChange={(e) => e.target.value && onSetSchedule(t.id, e.target.value)}
            style={s.input}
          />
          {t.scheduledDate && (
            <button onClick={() => onClearSchedule(t.id)} style={s.smallBtn}>
              Clear date
            </button>
          )}
          <button onClick={() => onOpenSchedule(t.id)} style={s.smallBtn}>
            Close
          </button>
        </div>
      )}

      {isNoteOpen && (
        <div style={s.subPanel}>
          <textarea
            defaultValue={t.note || ''}
            onBlur={(e) => onSaveNote(t.id, e.target.value)}
            placeholder="Add a note..."
            style={s.noteArea}
            rows={3}
          />
          <button onClick={onCloseNote} style={s.smallBtn}>
            Done
          </button>
        </div>
      )}
    </div>
  );
}

function UrgencyMenu({
  urgencyColumns,
  current,
  onSet,
}: {
  urgencyColumns: { id: UrgencyColumnId; title: string; color: string }[];
  current?: UrgencyColumnId;
  onSet: (u: UrgencyColumnId | undefined) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ position: 'relative' }}>
      <button onClick={() => setOpen((v) => !v)} style={s.iconBtn} title="Set urgency">
        ⚑
      </button>
      {open && (
        <div style={s.menu} onMouseLeave={() => setOpen(false)}>
          {urgencyColumns.map((c) => (
            <button
              key={c.id}
              onClick={() => {
                onSet(c.id);
                setOpen(false);
              }}
              style={{
                ...s.menuItem,
                color: c.color,
                fontWeight: current === c.id ? 700 : 500,
              }}
            >
              ⚑ {c.title}
            </button>
          ))}
          {current && (
            <button
              onClick={() => {
                onSet(undefined);
                setOpen(false);
              }}
              style={{ ...s.menuItem, color: 'rgba(255,255,255,0.6)' }}
            >
              ✕ Clear
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   STYLES
   ═══════════════════════════════════════════════════════════════════════ */

const s: Record<string, React.CSSProperties> = {
  page: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    overflow: 'auto',
    padding: 4,
  },

  headerBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    padding: '4px 4px 0',
    flexShrink: 0,
  },
  title: {
    fontFamily: M,
    fontSize: 14,
    color: '#a855f7',
    letterSpacing: '0.14em',
    fontWeight: 800,
  },
  subtitle: {
    fontFamily: M,
    fontSize: 10,
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: '0.08em',
    marginTop: 2,
  },
  syncBadge: {
    fontFamily: M,
    fontSize: 10,
    borderRadius: 999,
    border: '1px solid',
    padding: '3px 10px',
    whiteSpace: 'nowrap' as const,
    fontWeight: 700,
    letterSpacing: '0.04em',
  },
  syncOk: { color: '#22c55e', borderColor: 'rgba(34,197,94,0.5)', background: 'rgba(34,197,94,0.12)' },
  syncBusy: { color: '#f59e0b', borderColor: 'rgba(245,158,11,0.5)', background: 'rgba(245,158,11,0.12)' },
  syncOff: { color: '#9ca3af', borderColor: 'rgba(156,163,175,0.5)', background: 'rgba(156,163,175,0.12)' },

  statsGrid: {
    display: 'grid',
    gap: 10,
    flexShrink: 0,
  },
  statCard: {
    background: 'linear-gradient(135deg, rgba(17,17,28,0.95), rgba(13,13,22,0.95))',
    border: '1px solid',
    borderRadius: 12,
    padding: '12px 14px',
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    transition: 'box-shadow 0.4s ease',
  },
  statLabel: {
    fontFamily: M,
    fontSize: 9,
    letterSpacing: '0.16em',
    fontWeight: 800,
  },
  statValue: {
    fontFamily: M,
    fontSize: 28,
    fontWeight: 800,
    lineHeight: 1,
  },

  addBar: {
    display: 'flex',
    gap: 10,
    alignItems: 'center',
    background: '#11111c',
    border: '1px solid rgba(168,85,247,0.18)',
    borderRadius: 12,
    padding: 8,
    flexShrink: 0,
    flexWrap: 'wrap',
  },
  searchWrap: {
    position: 'relative',
    flex: 1,
    minWidth: 220,
    display: 'flex',
    alignItems: 'center',
  },
  searchIcon: {
    position: 'absolute',
    left: 10,
    fontSize: 14,
    color: 'rgba(255,255,255,0.4)',
    fontFamily: M,
  },
  searchInput: {
    width: '100%',
    background: '#0a0a0f',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 8,
    color: '#e5e7eb',
    padding: '8px 30px 8px 30px',
    fontFamily: M,
    fontSize: 12,
    outline: 'none',
  },
  searchClear: {
    position: 'absolute',
    right: 6,
    background: 'transparent',
    border: 'none',
    color: 'rgba(255,255,255,0.5)',
    cursor: 'pointer',
    fontSize: 16,
    fontFamily: M,
    padding: '2px 6px',
  },
  quickAdd: {
    display: 'flex',
    gap: 6,
    alignItems: 'center',
    flex: 2,
    minWidth: 320,
  },
  groupSelect: {
    background: '#0a0a0f',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 8,
    color: '#cbd5e1',
    padding: '8px 8px',
    fontFamily: M,
    fontSize: 11,
    minWidth: 130,
    maxWidth: 180,
  },
  addInput: {
    flex: 1,
    background: '#0a0a0f',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 8,
    color: '#e5e7eb',
    padding: '8px 12px',
    fontFamily: M,
    fontSize: 12,
    outline: 'none',
  },
  addBtn: {
    background: 'rgba(168,85,247,0.2)',
    border: '1px solid rgba(168,85,247,0.5)',
    color: '#c4b5fd',
    borderRadius: 8,
    padding: '8px 16px',
    cursor: 'pointer',
    fontFamily: M,
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: '0.04em',
  },

  mainRow: {
    display: 'flex',
    flex: 1,
    minHeight: 380,
    gap: 12,
  },
  groupsPanel: {
    flex: 1.4,
    minWidth: 0,
    background: '#11111c',
    border: '1px solid rgba(6,182,212,0.22)',
    borderRadius: 14,
    padding: 12,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  boardPanel: {
    flex: 1,
    minWidth: 0,
    background: '#11111c',
    border: '1px solid rgba(239,68,68,0.22)',
    borderRadius: 14,
    padding: 12,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  panelHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    flexShrink: 0,
  },
  panelTitle: {
    fontFamily: M,
    fontSize: 11,
    letterSpacing: '0.14em',
    fontWeight: 800,
    color: '#06b6d4',
  },
  boardHint: {
    fontFamily: M,
    fontSize: 9,
    color: 'rgba(255,255,255,0.35)',
    letterSpacing: '0.06em',
  },
  smallBtn: {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.12)',
    color: 'rgba(255,255,255,0.7)',
    borderRadius: 7,
    padding: '4px 10px',
    cursor: 'pointer',
    fontFamily: M,
    fontSize: 10,
    fontWeight: 600,
  },
  smallBtnPrimary: {
    background: 'rgba(168,85,247,0.2)',
    border: '1px solid rgba(168,85,247,0.5)',
    color: '#c4b5fd',
    borderRadius: 7,
    padding: '4px 10px',
    cursor: 'pointer',
    fontFamily: M,
    fontSize: 10,
    fontWeight: 700,
  },
  newGroupRow: {
    display: 'flex',
    gap: 6,
    alignItems: 'center',
    marginBottom: 10,
    flexShrink: 0,
  },
  groupList: {
    flex: 1,
    overflow: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    paddingRight: 4,
  },
  groupBlock: {
    background: '#0f0f1b',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: 10,
    overflow: 'hidden',
    transition: 'border-color 0.15s, box-shadow 0.15s',
  },
  groupBlockDrop: {
    borderColor: 'rgba(34,197,94,0.6)',
    boxShadow: '0 0 14px rgba(34,197,94,0.18)',
  },
  groupHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    width: '100%',
    background: 'rgba(255,255,255,0.02)',
    border: 'none',
    padding: '8px 10px',
    cursor: 'pointer',
    color: '#e5e7eb',
    fontFamily: M,
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: '0.04em',
    textAlign: 'left' as const,
  },
  chevron: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.5)',
    transition: 'transform 0.15s ease',
    display: 'inline-block',
    width: 12,
  },
  groupName: { flex: 1 },
  groupCount: {
    fontFamily: M,
    fontSize: 10,
    color: 'rgba(255,255,255,0.5)',
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 999,
    padding: '1px 8px',
    fontWeight: 700,
  },
  groupItems: {
    padding: '4px 8px 8px',
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },

  taskRow: {
    background: '#0a0a14',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: 8,
    padding: '6px 8px',
    cursor: 'grab',
    transition: 'background 0.15s, border-color 0.15s',
  },
  taskMain: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  taskText: {
    flex: 1,
    fontFamily: M,
    fontSize: 12,
    color: '#e5e7eb',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
    cursor: 'text',
  },
  taskEditInput: {
    flex: 1,
    background: '#11111c',
    border: '1px solid rgba(168,85,247,0.5)',
    borderRadius: 6,
    color: '#fff',
    padding: '4px 8px',
    fontFamily: M,
    fontSize: 12,
    outline: 'none',
  },
  taskBadge: {
    fontFamily: M,
    fontSize: 9,
    borderRadius: 999,
    border: '1px solid rgba(255,255,255,0.12)',
    background: 'rgba(255,255,255,0.04)',
    color: '#cbd5e1',
    padding: '2px 8px',
    fontWeight: 700,
    whiteSpace: 'nowrap' as const,
    letterSpacing: '0.04em',
  },
  taskActions: {
    display: 'flex',
    gap: 2,
    alignItems: 'center',
    opacity: 0.55,
  },
  iconBtn: {
    background: 'transparent',
    border: 'none',
    color: 'rgba(255,255,255,0.55)',
    cursor: 'pointer',
    fontSize: 12,
    fontFamily: M,
    padding: '2px 5px',
    borderRadius: 4,
  },
  iconBtnDanger: {
    background: 'transparent',
    border: 'none',
    color: 'rgba(239,68,68,0.7)',
    cursor: 'pointer',
    fontSize: 14,
    fontFamily: M,
    padding: '2px 5px',
    borderRadius: 4,
  },
  checkbox: {
    width: 14,
    height: 14,
    accentColor: '#a855f7',
    cursor: 'pointer',
    flexShrink: 0,
  },
  subPanel: {
    marginTop: 6,
    padding: 8,
    background: 'rgba(168,85,247,0.06)',
    border: '1px solid rgba(168,85,247,0.18)',
    borderRadius: 8,
    display: 'flex',
    gap: 6,
    alignItems: 'center',
  },
  noteArea: {
    flex: 1,
    background: '#0a0a14',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 6,
    color: '#e5e7eb',
    padding: '6px 8px',
    fontFamily: M,
    fontSize: 11,
    outline: 'none',
    resize: 'vertical' as const,
  },
  menu: {
    position: 'absolute',
    top: '100%',
    right: 0,
    marginTop: 4,
    background: '#1a1a28',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 8,
    padding: 4,
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 2,
    zIndex: 30,
    minWidth: 140,
    boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
  },
  menuItem: {
    background: 'transparent',
    border: 'none',
    color: '#cbd5e1',
    padding: '6px 10px',
    textAlign: 'left' as const,
    cursor: 'pointer',
    fontFamily: M,
    fontSize: 11,
    borderRadius: 5,
  },

  boardGrid: {
    flex: 1,
    display: 'grid',
    gap: 10,
    minHeight: 0,
    overflow: 'hidden',
  },
  boardColumn: {
    minHeight: 0,
    background: '#0f0f1b',
    border: '1px solid',
    borderRadius: 10,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    transition: 'border-color 0.15s, box-shadow 0.15s, transform 0.15s',
  },
  boardColumnDrop: {
    boxShadow: '0 0 18px rgba(34,197,94,0.25), inset 0 0 0 1px rgba(34,197,94,0.4)',
    transform: 'translateY(-2px)',
  },
  boardColumnHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '8px 10px',
    borderBottom: '1px solid',
    flexShrink: 0,
  },
  boardColumnDot: { width: 8, height: 8, borderRadius: '50%', flexShrink: 0 },
  boardColumnTitle: {
    flex: 1,
    background: 'transparent',
    border: 'none',
    fontFamily: M,
    fontSize: 12,
    fontWeight: 800,
    letterSpacing: '0.06em',
    outline: 'none',
  },
  boardColumnCount: {
    fontFamily: M,
    fontSize: 10,
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid',
    borderRadius: 999,
    padding: '1px 8px',
    fontWeight: 800,
  },
  boardColumnList: {
    padding: 8,
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 6,
    overflow: 'auto',
    flex: 1,
  },
  boardCard: {
    background: '#151528',
    borderRadius: 8,
    padding: '8px 10px',
    borderLeft: '3px solid',
    border: '1px solid rgba(255,255,255,0.08)',
    cursor: 'grab',
    transition: 'transform 0.12s, border-color 0.12s',
  },
  boardCardTop: { display: 'flex', alignItems: 'center', gap: 8 },
  boardCardText: {
    flex: 1,
    fontFamily: M,
    fontSize: 12,
    color: '#e5e7eb',
    fontWeight: 600,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  },
  boardCardClose: {
    background: 'transparent',
    border: 'none',
    color: 'rgba(255,255,255,0.4)',
    cursor: 'pointer',
    fontSize: 14,
    padding: '0 2px',
  },
  boardCardMeta: {
    display: 'flex',
    gap: 6,
    alignItems: 'center',
    marginTop: 4,
    flexWrap: 'wrap',
  },
  boardCardGroup: {
    fontFamily: M,
    fontSize: 9,
    color: 'rgba(255,255,255,0.45)',
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: 999,
    padding: '1px 7px',
    fontWeight: 600,
  },
  boardCardDate: {
    fontFamily: M,
    fontSize: 9,
    color: '#67e8f9',
    background: 'rgba(6,182,212,0.1)',
    border: '1px solid rgba(6,182,212,0.3)',
    borderRadius: 999,
    padding: '1px 7px',
    fontWeight: 600,
  },
  boardEmpty: {
    fontFamily: M,
    fontSize: 10,
    color: 'rgba(255,255,255,0.3)',
    border: '1px dashed rgba(255,255,255,0.15)',
    borderRadius: 8,
    padding: '14px 8px',
    textAlign: 'center' as const,
    fontStyle: 'italic',
  },

  dragging: { opacity: 0.5, transform: 'scale(0.985)' },

  emptyHint: {
    fontFamily: M,
    fontSize: 11,
    color: 'rgba(255,255,255,0.35)',
    padding: '14px 8px',
    textAlign: 'center' as const,
    fontStyle: 'italic',
  },

  completedPanel: {
    background: '#11111c',
    border: '1px solid rgba(34,197,94,0.18)',
    borderRadius: 12,
    overflow: 'hidden',
    flexShrink: 0,
  },
  completedHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    width: '100%',
    background: 'rgba(34,197,94,0.04)',
    border: 'none',
    padding: '10px 12px',
    cursor: 'pointer',
    color: '#e5e7eb',
    fontFamily: M,
    fontSize: 11,
    fontWeight: 800,
    letterSpacing: '0.12em',
    textAlign: 'left' as const,
  },
  completedTitle: { color: '#22c55e' },
  completedCount: {
    fontFamily: M,
    fontSize: 10,
    background: 'rgba(34,197,94,0.12)',
    border: '1px solid rgba(34,197,94,0.3)',
    color: '#86efac',
    borderRadius: 999,
    padding: '1px 8px',
  },
  clearBtn: {
    fontFamily: M,
    fontSize: 10,
    color: '#ef4444',
    cursor: 'pointer',
    padding: '2px 8px',
    border: '1px solid rgba(239,68,68,0.3)',
    borderRadius: 6,
    background: 'rgba(239,68,68,0.06)',
    fontWeight: 700,
  },
  completedList: {
    padding: 8,
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 4,
    maxHeight: 220,
    overflow: 'auto',
  },
  completedItem: {
    display: 'flex',
    gap: 8,
    alignItems: 'center',
    background: '#0a0a14',
    border: '1px solid rgba(255,255,255,0.05)',
    borderRadius: 7,
    padding: '5px 8px',
  },
  completedText: {
    flex: 1,
    fontFamily: M,
    fontSize: 11,
    color: 'rgba(255,255,255,0.5)',
    textDecoration: 'line-through',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  },
  completedGroup: {
    fontFamily: M,
    fontSize: 9,
    color: 'rgba(255,255,255,0.4)',
    background: 'rgba(255,255,255,0.04)',
    borderRadius: 999,
    padding: '1px 7px',
  },
  completedDate: {
    fontFamily: M,
    fontSize: 9,
    color: '#86efac',
  },

  input: {
    background: '#0a0a0f',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: 8,
    color: '#e5e7eb',
    padding: '7px 10px',
    fontSize: 12,
    fontFamily: M,
    outline: 'none',
    flex: 1,
  },
};
