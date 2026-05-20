'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  useOpsState,
  type CalendarEvent,
  type UrgencyColumnId,
  DRAG_TODO_TYPE,
  makeId,
} from '@/hooks/useOpsState';

type DayForecast = { day: string; high: number; low: number; desc: string; icon: string };

const M = "'JetBrains Mono', 'Fira Code', monospace";

const CATEGORIES = ['Work', 'Health', 'Personal', 'Meeting', 'Deadline'];
const CAT_COLORS: Record<string, string> = {
  Work: '#a855f7',
  Health: '#ef4444',
  Personal: '#06b6d4',
  Meeting: '#f59e0b',
  Deadline: '#ec4899',
};

const weatherIcon = (code: number) => {
  if (code === 0) return 'SUN';
  if (code <= 3) return 'PTCLD';
  if (code <= 48) return 'FOG';
  if (code <= 67) return 'RAIN';
  if (code <= 77) return 'SNOW';
  if (code <= 99) return 'STORM';
  return 'FAIR';
};

const weatherDesc = (code: number) => {
  if (code === 0) return 'Clear';
  if (code <= 3) return 'Partly Cloudy';
  if (code <= 48) return 'Foggy';
  if (code <= 57) return 'Drizzle';
  if (code <= 67) return 'Rain';
  if (code <= 77) return 'Snow';
  if (code <= 82) return 'Showers';
  if (code <= 86) return 'Snow Showers';
  if (code <= 99) return 'Thunderstorm';
  return 'Fair';
};

const weatherDay = (date: string, idx: number) => {
  if (idx === 0) return 'Today';
  if (idx === 1) return 'Tomorrow';
  return new Date(`${date}T12:00:00`).toLocaleDateString('en-US', { weekday: 'short' });
};

export default function CalendarView() {
  const { todos, events, urgencyColumns, syncStatus, setTodos, setEvents } = useOpsState();

  const [viewDate, setViewDate] = useState(new Date());
  const [forecast, setForecast] = useState<DayForecast[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [dragTodoId, setDragTodoId] = useState<string | null>(null);
  const [dropDate, setDropDate] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [newEvent, setNewEvent] = useState({ title: '', time: '', category: 'Work' });

  useEffect(() => {
    const update = () => setIsMobile(window.innerWidth < 1024);
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  useEffect(() => {
    fetch('https://api.open-meteo.com/v1/forecast?latitude=36.96&longitude=-88.27&daily=temperature_2m_max,temperature_2m_min,weathercode&temperature_unit=fahrenheit&timezone=America%2FChicago&forecast_days=5')
      .then((r) => r.json())
      .then((data) => {
        if (!data?.daily?.time) return;
        const days = data.daily.time as string[];
        const highs = data.daily.temperature_2m_max as number[];
        const lows = data.daily.temperature_2m_min as number[];
        const codes = data.daily.weathercode as number[];
        setForecast(
          days.map((d, i) => ({
            day: weatherDay(d, i),
            high: Math.round(highs[i]),
            low: Math.round(lows[i]),
            desc: weatherDesc(codes[i]),
            icon: weatherIcon(codes[i]),
          })),
        );
      })
      .catch(() => {
        setForecast([
          { day: 'Today', high: 68, low: 52, desc: 'Partly Cloudy', icon: 'PTCLD' },
          { day: 'Tomorrow', high: 72, low: 55, desc: 'Clear', icon: 'SUN' },
          { day: 'Sat', high: 65, low: 48, desc: 'Rain', icon: 'RAIN' },
          { day: 'Sun', high: 70, low: 50, desc: 'Clear', icon: 'SUN' },
          { day: 'Mon', high: 63, low: 45, desc: 'Cloudy', icon: 'PTCLD' },
        ]);
      });
  }, []);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const monthName = viewDate.toLocaleString('en-US', { month: 'long', year: 'numeric' });

  const calendarDays = useMemo(() => {
    const first = new Date(year, month, 1);
    const last = new Date(year, month + 1, 0);
    const startDay = first.getDay();
    const totalDays = last.getDate();
    const cells: (number | null)[] = [];
    for (let i = 0; i < startDay; i++) cells.push(null);
    for (let d = 1; d <= totalDays; d++) cells.push(d);
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [year, month]);

  const todayStr = new Date().toISOString().split('T')[0];
  const dateStr = (day: number) =>
    `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

  const eventsByDate = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {};
    events.forEach((event) => {
      if (!map[event.date]) map[event.date] = [];
      map[event.date].push(event);
    });
    return map;
  }, [events]);

  const todosByDate = useMemo(
    () =>
      todos.reduce<Record<string, typeof todos>>((acc, item) => {
        if (!item.scheduledDate || item.done) return acc;
        if (!acc[item.scheduledDate]) acc[item.scheduledDate] = [];
        acc[item.scheduledDate].push(item);
        return acc;
      }, {}),
    [todos],
  );

  const prevMonth = () => setViewDate(new Date(year, month - 1, 1));
  const nextMonth = () => setViewDate(new Date(year, month + 1, 1));
  const goToday = () => setViewDate(new Date());

  const updateTodoDate = (todoId: string, date: string) => {
    setTodos((prev) => prev.map((todo) => (todo.id === todoId ? { ...todo, scheduledDate: date } : todo)));
  };

  const clearTodoDate = (todoId: string) => {
    setTodos((prev) => prev.map((todo) => (todo.id === todoId ? { ...todo, scheduledDate: undefined } : todo)));
  };

  const readDraggedTodoId = (e: React.DragEvent<HTMLElement>) => {
    const fromData = e.dataTransfer.getData(DRAG_TODO_TYPE);
    return fromData || dragTodoId;
  };

  const addEvent = () => {
    if (!newEvent.title.trim() || !selectedDate) return;
    const event: CalendarEvent = {
      id: makeId(),
      title: newEvent.title.trim(),
      date: selectedDate,
      time: newEvent.time || undefined,
      color: CAT_COLORS[newEvent.category] || '#a855f7',
      category: newEvent.category,
    };
    setEvents((prev) => [...prev, event]);
    setNewEvent({ title: '', time: '', category: 'Work' });
    setShowAddEvent(false);
  };

  const removeEvent = (id: string) => {
    setEvents((prev) => prev.filter((event) => event.id !== id));
  };

  const syncLabel =
    syncStatus === 'synced' ? 'Cloud Synced' : syncStatus === 'syncing' ? 'Syncing...' : 'Local Only';

  const selectedEvents = selectedDate ? eventsByDate[selectedDate] || [] : [];
  const selectedTodos = selectedDate ? todosByDate[selectedDate] || [] : [];

  return (
    <div style={s.page}>
      <div style={s.weatherPanel}>
        <div style={s.weatherTopRow}>
          <div style={s.weatherLocation}>Gilbertsville Weather</div>
          <div
            style={{
              ...s.syncBadge,
              ...(syncStatus === 'synced' ? s.syncBadgeOk : {}),
              ...(syncStatus === 'syncing' ? s.syncBadgeBusy : {}),
              ...(syncStatus === 'offline' ? s.syncBadgeOff : {}),
            }}
          >
            {syncLabel}
          </div>
        </div>

        <div style={s.weatherRow}>
          {forecast.map((day) => (
            <div key={day.day} style={s.weatherDay}>
              <div style={s.weatherDayLabel}>{day.day}</div>
              <div style={s.weatherIcon}>{day.icon}</div>
              <div style={s.weatherTemp}>{day.high}F/{day.low}F</div>
              {!isMobile && <div style={s.weatherDesc}>{day.desc}</div>}
            </div>
          ))}
        </div>
      </div>

      <div style={s.calPanel}>
        <div style={s.monthNav}>
          <button onClick={prevMonth} style={s.navBtn}>Prev</button>
          <button onClick={goToday} style={s.todayBtn}>Today</button>
          <span style={s.monthLabel}>{monthName}</span>
          <button onClick={nextMonth} style={s.navBtn}>Next</button>
        </div>

        <div style={s.grid}>
          {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map((day) => (
            <div key={day} style={s.dayHeader}>{day}</div>
          ))}

          {calendarDays.map((day, i) => {
            if (day === null) return <div key={`e-${i}`} style={s.emptyCell} />;
            const ds = dateStr(day);
            const isToday = ds === todayStr;
            const isSelected = ds === selectedDate;
            const dayEvents = eventsByDate[ds] || [];
            const dayTodos = todosByDate[ds] || [];

            return (
              <div
                key={ds}
                onClick={() => setSelectedDate(ds === selectedDate ? null : ds)}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDropDate(ds);
                }}
                onDragEnter={() => setDropDate(ds)}
                onDragLeave={() => setDropDate((prev) => (prev === ds ? null : prev))}
                onDrop={(e) => {
                  e.preventDefault();
                  const todoId = readDraggedTodoId(e);
                  if (todoId) {
                    updateTodoDate(todoId, ds);
                    setSelectedDate(ds);
                  }
                  setDropDate(null);
                  setDragTodoId(null);
                }}
                style={{
                  ...s.cell,
                  ...(isToday ? s.todayCell : {}),
                  ...(isSelected ? s.selectedCell : {}),
                  ...(dropDate === ds ? s.dropCell : {}),
                }}
              >
                <span style={{ ...s.dayNum, ...(isToday ? s.todayNum : {}) }}>{day}</span>
                {dayEvents.length > 0 && (
                  <div style={s.dots}>
                    {dayEvents.slice(0, 3).map((event) => (
                      <span key={event.id} style={{ ...s.dot, background: event.color }} />
                    ))}
                  </div>
                )}
                {dayTodos.slice(0, 2).map((todo) => (
                  <div key={todo.id} style={s.dayTodoChip}>{todo.text}</div>
                ))}
                {dayTodos.length > 2 && <div style={s.moreChip}>+{dayTodos.length - 2} more</div>}
              </div>
            );
          })}
        </div>

        {selectedDate && (
          <div style={s.dayDetail}>
            <div style={s.dayDetailHeader}>
              <span style={s.dayDetailDate}>
                {new Date(`${selectedDate}T12:00:00`).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              </span>
              <button onClick={() => setShowAddEvent(!showAddEvent)} style={s.addEventBtn}>+ Event</button>
            </div>

            {showAddEvent && (
              <div style={s.addEventForm}>
                <input
                  type="text"
                  placeholder="Event title..."
                  value={newEvent.title}
                  onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                  onKeyDown={(e) => e.key === 'Enter' && addEvent()}
                  style={s.input}
                />
                <div style={{ display: 'flex', gap: 6 }}>
                  <input
                    type="text"
                    placeholder="Time (e.g. 9:00 AM)"
                    value={newEvent.time}
                    onChange={(e) => setNewEvent({ ...newEvent, time: e.target.value })}
                    style={{ ...s.input, flex: 1 }}
                  />
                  <select value={newEvent.category} onChange={(e) => setNewEvent({ ...newEvent, category: e.target.value })} style={s.select}>
                    {CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}
                  </select>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={() => setShowAddEvent(false)} style={s.cancelBtn}>Cancel</button>
                  <button onClick={addEvent} style={s.saveBtn}>Add</button>
                </div>
              </div>
            )}

            {selectedEvents.length === 0 && !showAddEvent && selectedTodos.length === 0 && (
              <div style={s.noEvents}>No events or tasks scheduled — manage tasks in the Tasks tab.</div>
            )}

            {selectedEvents.map((event) => (
              <div key={event.id} style={{ ...s.eventCard, borderLeftColor: event.color }}>
                <div style={s.eventRow}>
                  <span style={s.eventTitle}>{event.title}</span>
                  <button onClick={() => removeEvent(event.id)} style={s.removeBtn}>x</button>
                </div>
                <div style={s.eventMeta}>
                  {event.time && <span>{event.time}</span>}
                  <span style={{ ...s.catBadge, background: `${event.color}22`, borderColor: `${event.color}55`, color: event.color }}>
                    {event.category}
                  </span>
                </div>
              </div>
            ))}

            {selectedTodos.map((todo) => (
              <div
                key={todo.id}
                style={s.todoEventCard}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.effectAllowed = 'move';
                  e.dataTransfer.setData(DRAG_TODO_TYPE, todo.id);
                  setDragTodoId(todo.id);
                }}
                onDragEnd={() => setDragTodoId(null)}
              >
                <div style={s.eventRow}>
                  <span style={s.eventTitle}>{todo.text}</span>
                  <button onClick={() => clearTodoDate(todo.id)} style={s.removeBtn} title="Remove from this date">x</button>
                </div>
                <div style={s.eventMeta}>
                  <span>Task</span>
                  {todo.urgencyColumnId && (
                    <span style={s.todoMetaBadge}>
                      {urgencyColumns.find((column) => column.id === (todo.urgencyColumnId as UrgencyColumnId))?.title || 'Priority'}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  page: { height: '100%', display: 'flex', flexDirection: 'column', gap: 12, overflow: 'hidden' },

  weatherPanel: {
    background: '#11111c',
    border: '1px solid rgba(6,182,212,0.25)',
    borderRadius: 12,
    padding: '10px 12px',
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    minHeight: 88,
    flexShrink: 0,
  },
  weatherTopRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  weatherLocation: {
    fontFamily: M,
    fontSize: 11,
    color: '#06b6d4',
    letterSpacing: '0.08em',
    fontWeight: 700,
  },
  syncBadge: {
    fontFamily: M,
    fontSize: 10,
    borderRadius: 999,
    border: '1px solid',
    padding: '2px 8px',
    whiteSpace: 'nowrap' as const,
  },
  syncBadgeOk: { color: '#22c55e', borderColor: 'rgba(34,197,94,0.5)', background: 'rgba(34,197,94,0.12)' },
  syncBadgeBusy: { color: '#f59e0b', borderColor: 'rgba(245,158,11,0.5)', background: 'rgba(245,158,11,0.12)' },
  syncBadgeOff: { color: '#9ca3af', borderColor: 'rgba(156,163,175,0.5)', background: 'rgba(156,163,175,0.12)' },
  weatherRow: { display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 2 },
  weatherDay: {
    minWidth: 108,
    borderRadius: 8,
    border: '1px solid rgba(255,255,255,0.08)',
    background: '#0f0f1b',
    padding: '6px 8px',
  },
  weatherDayLabel: { fontFamily: M, fontSize: 10, color: '#d1d5db', marginBottom: 2 },
  weatherIcon: { fontFamily: M, fontSize: 11, fontWeight: 700, color: '#a855f7' },
  weatherTemp: { fontFamily: M, fontSize: 11, color: '#e5e7eb', marginTop: 2 },
  weatherDesc: { fontFamily: M, fontSize: 9, color: 'rgba(255,255,255,0.45)', marginTop: 1 },

  calPanel: {
    flex: 1,
    minWidth: 0,
    background: '#11111c',
    border: '1px solid rgba(168,85,247,0.2)',
    borderRadius: 14,
    padding: 16,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'auto',
  },
  monthNav: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 },
  navBtn: {
    background: 'rgba(168,85,247,0.12)',
    border: '1px solid rgba(168,85,247,0.3)',
    color: '#a855f7',
    borderRadius: 8,
    minWidth: 44,
    height: 32,
    cursor: 'pointer',
    fontFamily: M,
    fontSize: 12,
  },
  todayBtn: {
    background: 'rgba(6,182,212,0.12)',
    border: '1px solid rgba(6,182,212,0.3)',
    color: '#06b6d4',
    borderRadius: 8,
    padding: '4px 12px',
    cursor: 'pointer',
    fontFamily: M,
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: '0.06em',
  },
  monthLabel: { fontFamily: M, fontSize: 16, fontWeight: 700, color: '#fff', letterSpacing: '0.04em', flex: 1, textAlign: 'center' as const },

  grid: { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 },
  dayHeader: {
    fontFamily: M,
    fontSize: 10,
    color: 'rgba(255,255,255,0.35)',
    textAlign: 'center' as const,
    padding: '6px 0',
    fontWeight: 700,
    letterSpacing: '0.1em',
  },
  emptyCell: { minHeight: 88 },
  cell: {
    minHeight: 88,
    background: '#0f0f1b',
    borderRadius: 8,
    padding: 6,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    border: '1px solid transparent',
    position: 'relative' as const,
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  dropCell: { border: '1px solid rgba(34,197,94,0.7)', boxShadow: '0 0 0 1px rgba(34,197,94,0.4) inset' },
  dayTodoChip: {
    fontFamily: M,
    fontSize: 9,
    color: '#dbeafe',
    background: 'rgba(59,130,246,0.2)',
    border: '1px solid rgba(59,130,246,0.4)',
    borderRadius: 6,
    padding: '2px 4px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  },
  moreChip: { fontFamily: M, fontSize: 9, color: '#93c5fd' },
  todayCell: { border: '1px solid rgba(6,182,212,0.5)', background: 'rgba(6,182,212,0.06)' },
  selectedCell: { border: '1px solid rgba(168,85,247,0.7)', background: 'rgba(168,85,247,0.08)', boxShadow: '0 0 12px rgba(168,85,247,0.2)' },
  dayNum: { fontFamily: M, fontSize: 12, color: 'rgba(255,255,255,0.6)', fontWeight: 600 },
  todayNum: { color: '#06b6d4', fontWeight: 700 },
  dots: { display: 'flex', gap: 3, marginTop: 2 },
  dot: { width: 6, height: 6, borderRadius: '50%' },

  dayDetail: { marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.08)' },
  dayDetailHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  dayDetailDate: { fontFamily: M, fontSize: 13, color: '#e5e7eb', fontWeight: 700 },
  addEventBtn: {
    background: 'rgba(168,85,247,0.15)',
    border: '1px solid rgba(168,85,247,0.3)',
    color: '#a855f7',
    borderRadius: 8,
    padding: '5px 12px',
    cursor: 'pointer',
    fontFamily: M,
    fontSize: 11,
    fontWeight: 700,
  },
  addEventForm: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 8,
    marginBottom: 12,
    padding: 10,
    background: 'rgba(168,85,247,0.06)',
    border: '1px solid rgba(168,85,247,0.2)',
    borderRadius: 10,
  },
  noEvents: { fontFamily: M, fontSize: 12, color: 'rgba(255,255,255,0.3)', fontStyle: 'italic' },
  eventCard: { background: '#0f0f1b', borderRadius: 8, padding: '8px 10px', marginBottom: 6, borderLeft: '3px solid #a855f7' },
  todoEventCard: {
    background: '#0f0f1b',
    borderRadius: 8,
    padding: '8px 10px',
    marginBottom: 6,
    borderLeft: '3px solid #3b82f6',
    cursor: 'grab',
  },
  eventRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  eventTitle: {
    fontFamily: M,
    fontSize: 12,
    color: '#e5e7eb',
    fontWeight: 600,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  },
  eventMeta: { display: 'flex', gap: 8, alignItems: 'center', marginTop: 4, fontFamily: M, fontSize: 10, color: 'rgba(255,255,255,0.45)' },
  catBadge: { borderRadius: 999, border: '1px solid', padding: '1px 7px', fontSize: 9, fontFamily: M },
  todoMetaBadge: {
    borderRadius: 999,
    border: '1px solid rgba(59,130,246,0.5)',
    background: 'rgba(59,130,246,0.2)',
    color: '#93c5fd',
    padding: '1px 7px',
    fontSize: 9,
    fontFamily: M,
  },
  removeBtn: {
    background: 'transparent',
    border: 'none',
    color: 'rgba(255,255,255,0.25)',
    cursor: 'pointer',
    fontSize: 12,
    fontFamily: M,
  },
  input: {
    width: '100%',
    background: '#0a0a0f',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: 8,
    color: '#e5e7eb',
    padding: '7px 10px',
    fontSize: 12,
    fontFamily: M,
    outline: 'none',
  },
  select: {
    width: '100%',
    background: '#0a0a0f',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 8,
    color: '#9ca3af',
    padding: '6px 8px',
    fontSize: 11,
    fontFamily: M,
  },
  cancelBtn: {
    flex: 1,
    border: '1px solid rgba(255,255,255,0.2)',
    background: 'transparent',
    color: '#cbd5e1',
    borderRadius: 8,
    padding: '6px 10px',
    cursor: 'pointer',
    fontFamily: M,
    fontSize: 11,
  },
  saveBtn: {
    flex: 1,
    border: '1px solid rgba(168,85,247,0.4)',
    background: 'rgba(168,85,247,0.2)',
    color: '#a855f7',
    borderRadius: 8,
    padding: '6px 10px',
    cursor: 'pointer',
    fontFamily: M,
    fontSize: 11,
    fontWeight: 700,
  },
};
