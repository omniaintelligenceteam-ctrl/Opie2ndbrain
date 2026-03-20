'use client';

import { useEffect, useMemo, useState } from 'react';

/* ── Shared types & keys (same localStorage as KanbanBoard) ── */
type TodoItem = { id: string; group: string; text: string; done: boolean };
type CalendarEvent = { id: string; title: string; date: string; time?: string; color: string; category: string };

const TODO_KEY = 'opie.kanban.todos.v1';
const EVENTS_KEY = 'opie.calendar.events.v1';
const M = "'JetBrains Mono', 'Fira Code', monospace";

const defaultTodos: TodoItem[] = [
  { id: 'q-1', group: '🔨 Quotes Needed', text: 'Hancock', done: false },
  { id: 'q-2', group: '🔨 Quotes Needed', text: 'Keith Murt', done: false },
  { id: 'q-3', group: '🔨 Quotes Needed', text: 'Blackwell', done: false },
  { id: 'q-4', group: '🔨 Quotes Needed', text: 'Abby Dority — lake house', done: false },
  { id: 'q-5', group: '🔨 Quotes Needed', text: 'Tim Harmon', done: false },
  { id: 'a-1', group: '📅 Appointments', text: 'MRI — Thu Mar 26 | Arrive 6:30 AM for 7:00 AM', done: false },
];

const defaultEvents: CalendarEvent[] = [
  { id: 'ev-1', title: 'MRI Appointment', date: '2026-03-26', time: '6:30 AM', color: '#ef4444', category: 'Health' },
];

const CATEGORIES = ['Work', 'Health', 'Personal', 'Meeting', 'Deadline'];
const CAT_COLORS: Record<string, string> = {
  Work: '#a855f7', Health: '#ef4444', Personal: '#06b6d4', Meeting: '#f59e0b', Deadline: '#ec4899',
};

const makeId = () => `ev-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

export default function CalendarView() {
  const [viewDate, setViewDate] = useState(new Date());
  const [todos, setTodos] = useState<TodoItem[]>(defaultTodos);
  const [events, setEvents] = useState<CalendarEvent[]>(defaultEvents);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [newTodoText, setNewTodoText] = useState('');
  const [newTodoGroup, setNewTodoGroup] = useState('🔨 Quotes Needed');
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [newEvent, setNewEvent] = useState({ title: '', time: '', category: 'Work' });

  /* ── Hydrate from localStorage ── */
  useEffect(() => {
    try {
      const tc = localStorage.getItem(TODO_KEY);
      if (tc) setTodos(JSON.parse(tc));
      const ec = localStorage.getItem(EVENTS_KEY);
      if (ec) setEvents(JSON.parse(ec));
    } catch { /* keep defaults */ }
  }, []);

  useEffect(() => { localStorage.setItem(TODO_KEY, JSON.stringify(todos)); }, [todos]);
  useEffect(() => { localStorage.setItem(EVENTS_KEY, JSON.stringify(events)); }, [events]);

  /* ── Calendar math ── */
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const monthName = viewDate.toLocaleString('en-US', { month: 'long', year: 'numeric' });

  const calendarDays = useMemo(() => {
    const first = new Date(year, month, 1);
    const last = new Date(year, month + 1, 0);
    const startDay = first.getDay(); // 0=Sun
    const totalDays = last.getDate();
    const cells: (number | null)[] = [];
    for (let i = 0; i < startDay; i++) cells.push(null);
    for (let d = 1; d <= totalDays; d++) cells.push(d);
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [year, month]);

  const todayStr = new Date().toISOString().split('T')[0];
  const dateStr = (day: number) => `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

  const eventsByDate = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {};
    events.forEach((e) => { if (!map[e.date]) map[e.date] = []; map[e.date].push(e); });
    return map;
  }, [events]);

  const todoGroups = useMemo(() => Array.from(new Set(todos.map((t) => t.group))), [todos]);

  const todosByGroup = useMemo(() => {
    return todos.reduce<Record<string, TodoItem[]>>((acc, item) => {
      if (!acc[item.group]) acc[item.group] = [];
      acc[item.group].push(item);
      return acc;
    }, {});
  }, [todos]);

  /* ── Handlers ── */
  const prevMonth = () => setViewDate(new Date(year, month - 1, 1));
  const nextMonth = () => setViewDate(new Date(year, month + 1, 1));
  const goToday = () => setViewDate(new Date());

  const toggleTodo = (id: string) => setTodos((p) => p.map((t) => t.id === id ? { ...t, done: !t.done } : t));
  const removeTodo = (id: string) => setTodos((p) => p.filter((t) => t.id !== id));
  const addTodo = () => {
    if (!newTodoText.trim()) return;
    setTodos((p) => [...p, { id: makeId(), group: newTodoGroup, text: newTodoText.trim(), done: false }]);
    setNewTodoText('');
  };

  const addEvent = () => {
    if (!newEvent.title.trim() || !selectedDate) return;
    const ev: CalendarEvent = {
      id: makeId(), title: newEvent.title.trim(), date: selectedDate,
      time: newEvent.time || undefined, color: CAT_COLORS[newEvent.category] || '#a855f7', category: newEvent.category,
    };
    setEvents((p) => [...p, ev]);
    setNewEvent({ title: '', time: '', category: 'Work' });
    setShowAddEvent(false);
  };

  const removeEvent = (id: string) => setEvents((p) => p.filter((e) => e.id !== id));

  const selectedEvents = selectedDate ? (eventsByDate[selectedDate] || []) : [];

  return (
    <div style={s.page}>
      {/* ── LEFT: Calendar Grid ── */}
      <div style={s.calPanel}>
        {/* Month nav */}
        <div style={s.monthNav}>
          <button onClick={prevMonth} style={s.navBtn}>◀</button>
          <button onClick={goToday} style={s.todayBtn}>Today</button>
          <span style={s.monthLabel}>{monthName}</span>
          <button onClick={nextMonth} style={s.navBtn}>▶</button>
        </div>

        {/* Day headers */}
        <div style={s.grid}>
          {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map((d) => (
            <div key={d} style={s.dayHeader}>{d}</div>
          ))}

          {/* Day cells */}
          {calendarDays.map((day, i) => {
            if (day === null) return <div key={`e-${i}`} style={s.emptyCell} />;
            const ds = dateStr(day);
            const isToday = ds === todayStr;
            const isSelected = ds === selectedDate;
            const dayEvents = eventsByDate[ds] || [];
            return (
              <div
                key={ds}
                onClick={() => setSelectedDate(ds === selectedDate ? null : ds)}
                style={{
                  ...s.cell,
                  ...(isToday ? s.todayCell : {}),
                  ...(isSelected ? s.selectedCell : {}),
                }}
              >
                <span style={{ ...s.dayNum, ...(isToday ? s.todayNum : {}) }}>{day}</span>
                {dayEvents.length > 0 && (
                  <div style={s.dots}>
                    {dayEvents.slice(0, 3).map((ev) => (
                      <span key={ev.id} style={{ ...s.dot, background: ev.color }} />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Selected day detail */}
        {selectedDate && (
          <div style={s.dayDetail}>
            <div style={s.dayDetailHeader}>
              <span style={s.dayDetailDate}>
                {new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              </span>
              <button onClick={() => setShowAddEvent(!showAddEvent)} style={s.addEventBtn}>+ Event</button>
            </div>

            {showAddEvent && (
              <div style={s.addEventForm}>
                <input type="text" placeholder="Event title..." value={newEvent.title}
                  onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                  onKeyDown={(e) => e.key === 'Enter' && addEvent()}
                  style={s.input} />
                <div style={{ display: 'flex', gap: 6 }}>
                  <input type="text" placeholder="Time (e.g. 9:00 AM)" value={newEvent.time}
                    onChange={(e) => setNewEvent({ ...newEvent, time: e.target.value })}
                    style={{ ...s.input, flex: 1 }} />
                  <select value={newEvent.category} onChange={(e) => setNewEvent({ ...newEvent, category: e.target.value })} style={s.select}>
                    {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={() => setShowAddEvent(false)} style={s.cancelBtn}>Cancel</button>
                  <button onClick={addEvent} style={s.saveBtn}>Add</button>
                </div>
              </div>
            )}

            {selectedEvents.length === 0 && !showAddEvent && (
              <div style={s.noEvents}>No events scheduled</div>
            )}
            {selectedEvents.map((ev) => (
              <div key={ev.id} style={{ ...s.eventCard, borderLeftColor: ev.color }}>
                <div style={s.eventRow}>
                  <span style={s.eventTitle}>{ev.title}</span>
                  <button onClick={() => removeEvent(ev.id)} style={s.removeBtn}>✕</button>
                </div>
                <div style={s.eventMeta}>
                  {ev.time && <span>{ev.time}</span>}
                  <span style={{ ...s.catBadge, background: `${ev.color}22`, borderColor: `${ev.color}55`, color: ev.color }}>{ev.category}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── RIGHT: To-Do List ── */}
      <div style={s.todoPanel}>
        <div style={s.todoTitle}>📝 PERSONAL TO-DO</div>

        {Object.entries(todosByGroup).map(([group, items]) => (
          <div key={group} style={{ marginBottom: 14 }}>
            <div style={s.todoGroup}>{group}</div>
            {items.map((item) => (
              <label key={item.id} style={s.todoItem}>
                <input type="checkbox" checked={item.done} onChange={() => toggleTodo(item.id)} />
                <span style={{ flex: 1, ...(item.done ? s.todoDone : {}) }}>{item.text}</span>
                <button onClick={(e) => { e.preventDefault(); removeTodo(item.id); }} style={s.todoRemoveBtn}>✕</button>
              </label>
            ))}
          </div>
        ))}

        {/* Add todo */}
        <div style={s.addTodoSection}>
          <div style={s.addTodoRow}>
            <input type="text" value={newTodoText} onChange={(e) => setNewTodoText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addTodo()}
              placeholder="New to-do..." style={s.input} />
            <button onClick={addTodo} style={s.addTodoBtn}>+</button>
          </div>
          <select value={newTodoGroup} onChange={(e) => setNewTodoGroup(e.target.value)} style={s.select}>
            {todoGroups.map((g) => <option key={g} value={g}>{g}</option>)}
            <option value="📝 General">📝 General</option>
            <option value="🏠 Home">🏠 Home</option>
            <option value="💼 Business">💼 Business</option>
          </select>
        </div>

        {/* Stats */}
        <div style={s.todoStats}>
          <span>{todos.filter((t) => t.done).length}/{todos.length} done</span>
          <div style={s.progressBar}>
            <div style={{ ...s.progressFill, width: `${todos.length ? (todos.filter((t) => t.done).length / todos.length) * 100 : 0}%` }} />
          </div>
        </div>
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  page: { height: '100%', display: 'flex', gap: 12, overflow: 'hidden' },

  /* Calendar */
  calPanel: { flex: 1, background: '#11111c', border: '1px solid rgba(168,85,247,0.2)', borderRadius: 14, padding: 16, display: 'flex', flexDirection: 'column', overflow: 'auto' },
  monthNav: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 },
  navBtn: { background: 'rgba(168,85,247,0.12)', border: '1px solid rgba(168,85,247,0.3)', color: '#a855f7', borderRadius: 8, width: 32, height: 32, cursor: 'pointer', fontFamily: M, fontSize: 14 },
  todayBtn: { background: 'rgba(6,182,212,0.12)', border: '1px solid rgba(6,182,212,0.3)', color: '#06b6d4', borderRadius: 8, padding: '4px 12px', cursor: 'pointer', fontFamily: M, fontSize: 11, fontWeight: 700, letterSpacing: '0.06em' },
  monthLabel: { fontFamily: M, fontSize: 16, fontWeight: 700, color: '#fff', letterSpacing: '0.04em', flex: 1, textAlign: 'center' as const },

  grid: { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 },
  dayHeader: { fontFamily: M, fontSize: 10, color: 'rgba(255,255,255,0.35)', textAlign: 'center' as const, padding: '6px 0', fontWeight: 700, letterSpacing: '0.1em' },
  emptyCell: { minHeight: 64 },
  cell: { minHeight: 64, background: '#0f0f1b', borderRadius: 8, padding: 6, cursor: 'pointer', transition: 'all 0.15s ease', border: '1px solid transparent', position: 'relative' as const },
  todayCell: { border: '1px solid rgba(6,182,212,0.5)', background: 'rgba(6,182,212,0.06)' },
  selectedCell: { border: '1px solid rgba(168,85,247,0.7)', background: 'rgba(168,85,247,0.08)', boxShadow: '0 0 12px rgba(168,85,247,0.2)' },
  dayNum: { fontFamily: M, fontSize: 12, color: 'rgba(255,255,255,0.6)', fontWeight: 600 },
  todayNum: { color: '#06b6d4', fontWeight: 700 },
  dots: { display: 'flex', gap: 3, marginTop: 4 },
  dot: { width: 6, height: 6, borderRadius: '50%' },

  /* Day detail */
  dayDetail: { marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.08)' },
  dayDetailHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  dayDetailDate: { fontFamily: M, fontSize: 13, color: '#e5e7eb', fontWeight: 700 },
  addEventBtn: { background: 'rgba(168,85,247,0.15)', border: '1px solid rgba(168,85,247,0.3)', color: '#a855f7', borderRadius: 8, padding: '5px 12px', cursor: 'pointer', fontFamily: M, fontSize: 11, fontWeight: 700 },
  addEventForm: { display: 'flex', flexDirection: 'column' as const, gap: 8, marginBottom: 12, padding: 10, background: 'rgba(168,85,247,0.06)', border: '1px solid rgba(168,85,247,0.2)', borderRadius: 10 },
  noEvents: { fontFamily: M, fontSize: 12, color: 'rgba(255,255,255,0.3)', fontStyle: 'italic' },
  eventCard: { background: '#0f0f1b', borderRadius: 8, padding: '8px 10px', marginBottom: 6, borderLeft: '3px solid #a855f7' },
  eventRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  eventTitle: { fontFamily: M, fontSize: 12, color: '#e5e7eb', fontWeight: 600 },
  eventMeta: { display: 'flex', gap: 8, alignItems: 'center', marginTop: 4 , fontFamily: M, fontSize: 10, color: 'rgba(255,255,255,0.45)' },
  catBadge: { borderRadius: 999, border: '1px solid', padding: '1px 7px', fontSize: 9, fontFamily: M },
  removeBtn: { background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.25)', cursor: 'pointer', fontSize: 12, fontFamily: M },

  /* To-Do Panel */
  todoPanel: { width: 320, flexShrink: 0, background: '#11111c', border: '1px solid rgba(6,182,212,0.25)', borderRadius: 14, padding: 16, display: 'flex', flexDirection: 'column', overflow: 'auto', boxShadow: '0 0 20px rgba(6,182,212,0.06)' },
  todoTitle: { fontFamily: M, fontSize: 13, color: '#a855f7', letterSpacing: '0.08em', fontWeight: 700, marginBottom: 14 },
  todoGroup: { fontFamily: M, fontSize: 12, color: '#d1d5db', fontWeight: 700, marginBottom: 6 },
  todoItem: { display: 'flex', gap: 8, alignItems: 'center', color: '#e5e7eb', fontFamily: M, fontSize: 12, marginBottom: 6, cursor: 'pointer' },
  todoDone: { textDecoration: 'line-through', opacity: 0.5 },
  todoRemoveBtn: { background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.2)', cursor: 'pointer', fontSize: 11, fontFamily: M, padding: '0 3px' },

  addTodoSection: { marginTop: 'auto', paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column' as const, gap: 6 },
  addTodoRow: { display: 'flex', gap: 6 },
  addTodoBtn: { width: 32, height: 32, borderRadius: 8, border: '1px solid rgba(168,85,247,0.4)', background: 'rgba(168,85,247,0.15)', color: '#a855f7', cursor: 'pointer', fontFamily: M, fontSize: 18, lineHeight: '28px', fontWeight: 700 },

  /* Shared inputs */
  input: { width: '100%', background: '#0a0a0f', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8, color: '#e5e7eb', padding: '7px 10px', fontSize: 12, fontFamily: M, outline: 'none' },
  select: { width: '100%', background: '#0a0a0f', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, color: '#9ca3af', padding: '6px 8px', fontSize: 11, fontFamily: M },
  cancelBtn: { flex: 1, border: '1px solid rgba(255,255,255,0.2)', background: 'transparent', color: '#cbd5e1', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', fontFamily: M, fontSize: 11 },
  saveBtn: { flex: 1, border: '1px solid rgba(168,85,247,0.4)', background: 'rgba(168,85,247,0.2)', color: '#a855f7', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', fontFamily: M, fontSize: 11, fontWeight: 700 },

  /* Progress */
  todoStats: { marginTop: 12, display: 'flex', alignItems: 'center', gap: 10, fontFamily: M, fontSize: 10, color: 'rgba(255,255,255,0.4)' },
  progressBar: { flex: 1, height: 4, background: 'rgba(255,255,255,0.08)', borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', background: '#a855f7', borderRadius: 2, transition: 'width 0.3s ease' },
};
