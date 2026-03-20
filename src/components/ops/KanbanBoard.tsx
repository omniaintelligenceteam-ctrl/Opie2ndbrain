'use client';

import { useEffect, useMemo, useState } from 'react';

type Priority = 'HIGH' | 'MEDIUM' | 'LOW';
type ColumnId = 'todo' | 'inprogress' | 'blocked' | 'done';

type Card = {
  id: string;
  title: string;
  description: string;
  priority: Priority;
  owner: string;
  ownerEmoji: string;
  dueDate?: string;
  category: string;
  note?: string;
};

type Column = {
  id: ColumnId;
  title: string;
  emoji: string;
  headerColor: string;
  cards: Card[];
};

type TodoItem = {
  id: string;
  group: string;
  text: string;
  done: boolean;
};

type BoardState = { columns: Column[] };

type NewCardState = {
  title: string;
  description: string;
  priority: Priority;
  owner: string;
  category: string;
  dueDate: string;
};

const BOARD_STORAGE_KEY = 'opie.kanban.board.v1';
const TODO_STORAGE_KEY = 'opie.kanban.todos.v1';

const ownerOptions = [
  { label: '🧠 G', value: 'G', emoji: '🧠' },
  { label: '👔 Wes', value: 'Wes', emoji: '👔' },
  { label: '🛰️ Scout', value: 'Scout', emoji: '🛰️' },
  { label: '🔬 Research', value: 'Research', emoji: '🔬' },
  { label: '🛡️ Ops Guardian', value: 'Ops Guardian', emoji: '🛡️' },
];

const categoryColors: Record<string, string> = {
  Infrastructure: '#64748b',
  Content: '#06b6d4',
  Security: '#ef4444',
  Product: '#a855f7',
  Sales: '#22c55e',
  Unknown: '#6b7280',
};

const defaultBoard: BoardState = {
  columns: [
    {
      id: 'todo',
      title: 'TO DO',
      emoji: '📥',
      headerColor: '#6b7280',
      cards: [
        { id: 'todo-1', title: 'Gmail OAuth Setup', description: 'Complete OAuth consent + token flow for Gmail integrations.', priority: 'HIGH', owner: 'Wes', ownerEmoji: '👔', category: 'Infrastructure' },
        { id: 'todo-2', title: 'TikTok OAuth in Postiz', description: 'Connect TikTok account authorization flow in Postiz.', priority: 'MEDIUM', owner: 'Wes', ownerEmoji: '👔', category: 'Content' },
        { id: 'todo-3', title: 'Email forwarding to G', description: 'Set forwarding rules and test message relay reliability.', priority: 'MEDIUM', owner: 'Wes', ownerEmoji: '👔', category: 'Infrastructure' },
        { id: 'todo-4', title: 'Google client secret rotation', description: 'Rotate keys and rebind app credentials for all dependent services.', priority: 'HIGH', owner: 'Wes', ownerEmoji: '👔', category: 'Security' },
      ],
    },
    {
      id: 'inprogress',
      title: 'IN PROGRESS',
      emoji: '🔨',
      headerColor: '#3b82f6',
      cards: [
        { id: 'inprogress-1', title: '2nd Brain Dashboard Rebuild', description: 'Rebuild the Ops Center tabbed dashboard architecture.', priority: 'HIGH', owner: 'G', ownerEmoji: '🧠', category: 'Product' },
        { id: 'inprogress-2', title: 'Cron Error Remediation', description: 'Identify timeout patterns and stabilize failing cron routines.', priority: 'HIGH', owner: 'G', ownerEmoji: '🧠', category: 'Infrastructure' },
        { id: 'inprogress-3', title: 'Lead Pipeline (Scout)', description: 'Improve lead extraction + dedupe + ranking cadence.', priority: 'MEDIUM', owner: 'Scout', ownerEmoji: '🛰️', category: 'Sales' },
      ],
    },
    {
      id: 'blocked',
      title: 'BLOCKED',
      emoji: '⏳',
      headerColor: '#f59e0b',
      cards: [
        { id: 'blocked-1', title: 'OIOS Demo Redeploy', description: 'Restore demo endpoint and validate post-deploy uptime.', priority: 'HIGH', owner: 'G', ownerEmoji: '🧠', category: 'Infrastructure', note: 'Vercel 404 since Mar 13 — needs Wes' },
        { id: 'blocked-2', title: 'Kenny @ Redwoods Follow-up', description: 'Owner handoff required before outreach can proceed.', priority: 'HIGH', owner: 'Wes', ownerEmoji: '👔', category: 'Sales' },
        { id: 'blocked-3', title: 'Jessica Patton', description: 'Contact loop exists but detail packet is incomplete.', priority: 'MEDIUM', owner: 'Wes', ownerEmoji: '👔', category: 'Unknown', note: 'No details provided' },
      ],
    },
    {
      id: 'done',
      title: 'DONE',
      emoji: '✅',
      headerColor: '#22c55e',
      cards: [
        { id: 'done-1', title: 'Orchestration Tab', description: 'Delivered organization chart tab with hierarchy view.', priority: 'HIGH', owner: 'G', ownerEmoji: '🧠', category: 'Product' },
        { id: 'done-2', title: 'Agent Roster Update (12 agents)', description: 'Roster refreshed to the current 12-agent operating model.', priority: 'MEDIUM', owner: 'G', ownerEmoji: '🧠', category: 'Product' },
        { id: 'done-3', title: 'Soul Guardian Baselines', description: 'Baselines initialized and heartbeat check validated.', priority: 'LOW', owner: 'G', ownerEmoji: '🧠', category: 'Infrastructure' },
      ],
    },
  ],
};

const defaultTodos: TodoItem[] = [
  { id: 'q-1', group: '🔨 Quotes Needed', text: 'Hancock', done: false },
  { id: 'q-2', group: '🔨 Quotes Needed', text: 'Keith Murt', done: false },
  { id: 'q-3', group: '🔨 Quotes Needed', text: 'Blackwell', done: false },
  { id: 'q-4', group: '🔨 Quotes Needed', text: 'Abby Dority — lake house', done: false },
  { id: 'q-5', group: '🔨 Quotes Needed', text: 'Tim Harmon', done: false },
  { id: 'a-1', group: '📅 Appointments', text: 'MRI — Thu Mar 26 | Arrive 6:30 AM for 7:00 AM', done: false },
];

const priorityBadge: Record<Priority, { label: string; style: React.CSSProperties }> = {
  HIGH: { label: '🔴 HIGH', style: { color: '#ef4444', borderColor: 'rgba(239,68,68,0.45)', background: 'rgba(239,68,68,0.12)' } },
  MEDIUM: { label: '🟡 MEDIUM', style: { color: '#f59e0b', borderColor: 'rgba(245,158,11,0.45)', background: 'rgba(245,158,11,0.12)' } },
  LOW: { label: '🟢 LOW', style: { color: '#22c55e', borderColor: 'rgba(34,197,94,0.45)', background: 'rgba(34,197,94,0.12)' } },
};

const mono = "'JetBrains Mono', 'Fira Code', monospace";

const makeId = () => `k-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

export default function KanbanBoard() {
  const [board, setBoard] = useState<BoardState>(defaultBoard);
  const [todos, setTodos] = useState<TodoItem[]>(defaultTodos);
  const [draggedCardId, setDraggedCardId] = useState<string | null>(null);
  const [dropColumnId, setDropColumnId] = useState<ColumnId | null>(null);
  const [addingColumn, setAddingColumn] = useState<ColumnId | null>(null);
  const [newCard, setNewCard] = useState<NewCardState>({
    title: '', description: '', priority: 'MEDIUM', owner: 'G', category: 'Product', dueDate: '',
  });

  useEffect(() => {
    let mounted = true;

    const hydrate = async () => {
      try {
        const todoCache = localStorage.getItem(TODO_STORAGE_KEY);
        if (todoCache && mounted) setTodos(JSON.parse(todoCache));

        const cached = localStorage.getItem(BOARD_STORAGE_KEY);
        if (cached && mounted) {
          setBoard(JSON.parse(cached));
          return;
        }

        const res = await fetch('/api/kanban');
        if (!res.ok) return;
        const data = await res.json();
        if (mounted && data?.columns) {
          setBoard({ columns: data.columns });
        }
      } catch {
        // Keep defaults on load error
      }
    };

    hydrate();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    localStorage.setItem(BOARD_STORAGE_KEY, JSON.stringify(board));
    fetch('/api/kanban', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(board),
    }).catch(() => undefined);
  }, [board]);

  useEffect(() => {
    localStorage.setItem(TODO_STORAGE_KEY, JSON.stringify(todos));
  }, [todos]);

  const todosByGroup = useMemo(() => {
    return todos.reduce<Record<string, TodoItem[]>>((acc, item) => {
      if (!acc[item.group]) acc[item.group] = [];
      acc[item.group].push(item);
      return acc;
    }, {});
  }, [todos]);

  const moveCardToColumn = (cardId: string, targetColumnId: ColumnId) => {
    setBoard((prev) => {
      let moved: Card | null = null;
      const columnsWithout = prev.columns.map((col) => ({
        ...col,
        cards: col.cards.filter((card) => {
          if (card.id === cardId) {
            moved = card;
            return false;
          }
          return true;
        }),
      }));
      if (!moved) return prev;
      return {
        columns: columnsWithout.map((col) =>
          col.id === targetColumnId ? { ...col, cards: [...col.cards, moved as Card] } : col,
        ),
      };
    });
  };

  const addCard = (columnId: ColumnId) => {
    if (!newCard.title.trim()) return;
    const ownerMeta = ownerOptions.find((o) => o.value === newCard.owner) || ownerOptions[0];
    const card: Card = {
      id: makeId(),
      title: newCard.title.trim(),
      description: newCard.description.trim() || 'No description provided.',
      priority: newCard.priority,
      owner: newCard.owner,
      ownerEmoji: ownerMeta.emoji,
      category: newCard.category.trim() || 'Unknown',
      dueDate: newCard.dueDate || undefined,
    };

    setBoard((prev) => ({
      columns: prev.columns.map((col) =>
        col.id === columnId ? { ...col, cards: [...col.cards, card] } : col,
      ),
    }));

    setNewCard({ title: '', description: '', priority: 'MEDIUM', owner: 'G', category: 'Product', dueDate: '' });
    setAddingColumn(null);
  };

  const toggleTodo = (id: string) => {
    setTodos((prev) => prev.map((item) => (item.id === id ? { ...item, done: !item.done } : item)));
  };

  const [newTodoText, setNewTodoText] = useState('');
  const [newTodoGroup, setNewTodoGroup] = useState('🔨 Quotes Needed');

  const addTodo = () => {
    if (!newTodoText.trim()) return;
    const item: TodoItem = { id: makeId(), group: newTodoGroup, text: newTodoText.trim(), done: false };
    setTodos((prev) => [...prev, item]);
    setNewTodoText('');
  };

  const removeTodo = (id: string) => {
    setTodos((prev) => prev.filter((t) => t.id !== id));
  };

  const todoGroups = useMemo(() => {
    const groups = new Set(todos.map((t) => t.group));
    return Array.from(groups);
  }, [todos]);

  return (
    <div style={styles.page}>
      <div style={styles.boardWrap}>
        {board.columns.map((column) => (
          <section
            key={column.id}
            style={{
              ...styles.column,
              ...(dropColumnId === column.id ? styles.columnDrop : {}),
            }}
            onDragOver={(e) => {
              e.preventDefault();
              setDropColumnId(column.id);
            }}
            onDragEnter={() => setDropColumnId(column.id)}
            onDragLeave={() => setDropColumnId((prev) => (prev === column.id ? null : prev))}
            onDrop={(e) => {
              e.preventDefault();
              const cardId = e.dataTransfer.getData('text/plain') || draggedCardId;
              if (cardId) moveCardToColumn(cardId, column.id);
              setDropColumnId(null);
              setDraggedCardId(null);
            }}
          >
            <header style={{ ...styles.columnHeader, borderBottomColor: `${column.headerColor}66` }}>
              <div style={{ ...styles.columnTitle, color: column.headerColor }}>
                <span>{column.emoji}</span>
                <span>{column.title}</span>
              </div>
              <button style={styles.addBtn} onClick={() => setAddingColumn(addingColumn === column.id ? null : column.id)}>+</button>
            </header>

            {addingColumn === column.id && (
              <div style={styles.addForm}>
                <input placeholder="Title" value={newCard.title} onChange={(e) => setNewCard((p) => ({ ...p, title: e.target.value }))} style={styles.input} />
                <textarea placeholder="Description" value={newCard.description} onChange={(e) => setNewCard((p) => ({ ...p, description: e.target.value }))} style={{ ...styles.input, minHeight: 52, resize: 'vertical' }} />
                <div style={styles.formRow}>
                  <select value={newCard.priority} onChange={(e) => setNewCard((p) => ({ ...p, priority: e.target.value as Priority }))} style={styles.input}>
                    <option value="HIGH">HIGH</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="LOW">LOW</option>
                  </select>
                  <select value={newCard.owner} onChange={(e) => setNewCard((p) => ({ ...p, owner: e.target.value }))} style={styles.input}>
                    {ownerOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <div style={styles.formRow}>
                  <input placeholder="Category" value={newCard.category} onChange={(e) => setNewCard((p) => ({ ...p, category: e.target.value }))} style={styles.input} />
                  <input type="date" value={newCard.dueDate} onChange={(e) => setNewCard((p) => ({ ...p, dueDate: e.target.value }))} style={styles.input} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                  <button style={styles.formCancel} onClick={() => setAddingColumn(null)}>Cancel</button>
                  <button style={styles.formSave} onClick={() => addCard(column.id)}>Add</button>
                </div>
              </div>
            )}

            <div style={styles.cardList}>
              {column.cards.map((card) => (
                <article
                  key={card.id}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData('text/plain', card.id);
                    setDraggedCardId(card.id);
                  }}
                  onDragEnd={() => {
                    setDraggedCardId(null);
                    setDropColumnId(null);
                  }}
                  style={{ ...styles.card, ...(draggedCardId === card.id ? styles.dragging : {}) }}
                >
                  <div style={styles.cardTitle}>{card.title}</div>
                  <div style={styles.cardDesc}>{card.description}</div>
                  {card.note && <div style={styles.note}>{card.note}</div>}

                  <div style={styles.cardMetaRow}>
                    <span style={{ ...styles.badge, ...priorityBadge[card.priority].style }}>{priorityBadge[card.priority].label}</span>
                    <span style={styles.owner}>{card.ownerEmoji} {card.owner}</span>
                  </div>

                  <div style={styles.cardMetaRow}>
                    <span style={{ ...styles.category, background: `${categoryColors[card.category] || '#6b7280'}33`, borderColor: `${categoryColors[card.category] || '#6b7280'}66`, color: categoryColors[card.category] || '#9ca3af' }}>{card.category}</span>
                    {card.dueDate ? <span style={styles.due}>📅 {card.dueDate}</span> : <span style={styles.dueMuted}>No due date</span>}
                  </div>
                </article>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { height: '100%', display: 'flex', flexDirection: 'column', gap: 12, overflow: 'auto', background: '#0a0a0f', border: '1px solid rgba(168,85,247,0.2)', borderRadius: 14, padding: 12 },
  todoPanel: { background: '#11111c', border: '1px solid rgba(6,182,212,0.25)', borderRadius: 12, padding: 12, boxShadow: '0 0 20px rgba(6,182,212,0.08)' },
  todoTitle: { color: '#a855f7', fontFamily: mono, fontSize: 12, letterSpacing: '0.08em', marginBottom: 10, fontWeight: 700 },
  todoGroup: { fontFamily: mono, fontSize: 12, color: '#d1d5db', marginBottom: 6, fontWeight: 700 },
  todoItem: { display: 'flex', gap: 8, alignItems: 'center', color: '#e5e7eb', fontFamily: mono, fontSize: 12, marginBottom: 6, cursor: 'pointer' },
  todoDone: { textDecoration: 'line-through', opacity: 0.55 },
  removeBtn: { background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.2)', cursor: 'pointer', fontSize: 12, padding: '0 4px', fontFamily: mono, transition: 'color 0.15s', lineHeight: 1 },
  addTodoSection: { marginTop: 12, paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.08)' },
  addTodoRow: { display: 'flex', gap: 6, marginBottom: 6 },
  addTodoInput: { flex: 1, background: '#0f0f1b', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8, color: '#e5e7eb', padding: '7px 10px', fontSize: 12, fontFamily: mono, outline: 'none' },
  addTodoBtn: { width: 32, height: 32, borderRadius: 8, border: '1px solid rgba(168,85,247,0.4)', background: 'rgba(168,85,247,0.15)', color: '#a855f7', cursor: 'pointer', fontFamily: mono, fontSize: 18, lineHeight: '28px', fontWeight: 700 },
  addTodoSelect: { flex: 1, background: '#0f0f1b', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, color: '#9ca3af', padding: '6px 8px', fontSize: 11, fontFamily: mono },
  boardWrap: { display: 'grid', gridTemplateColumns: 'repeat(4, minmax(250px,1fr))', gap: 10, minHeight: 0 },
  column: { background: '#121221', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, minHeight: 420, display: 'flex', flexDirection: 'column' },
  columnDrop: { border: '1px solid rgba(168,85,247,0.8)', boxShadow: '0 0 18px rgba(168,85,247,0.25)' },
  columnHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 10px 8px', borderBottom: '1px solid' },
  columnTitle: { display: 'flex', gap: 6, alignItems: 'center', fontFamily: mono, fontWeight: 700, letterSpacing: '0.05em', fontSize: 12 },
  addBtn: { width: 24, height: 24, borderRadius: 8, border: '1px solid rgba(6,182,212,0.35)', background: 'rgba(6,182,212,0.12)', color: '#06b6d4', cursor: 'pointer', fontFamily: mono, fontSize: 16, lineHeight: '20px' },
  addForm: { margin: 10, border: '1px solid rgba(168,85,247,0.3)', borderRadius: 10, background: 'rgba(168,85,247,0.06)', padding: 8, display: 'flex', flexDirection: 'column', gap: 8 },
  formRow: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 },
  input: { width: '100%', border: '1px solid rgba(255,255,255,0.18)', borderRadius: 8, background: '#0f0f1b', color: '#e5e7eb', padding: '8px 9px', fontSize: 12, fontFamily: mono },
  formCancel: { border: '1px solid rgba(255,255,255,0.2)', background: 'transparent', color: '#cbd5e1', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', fontFamily: mono, fontSize: 12 },
  formSave: { border: '1px solid rgba(168,85,247,0.4)', background: 'rgba(168,85,247,0.2)', color: '#a855f7', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', fontFamily: mono, fontSize: 12 },
  cardList: { padding: 10, display: 'flex', flexDirection: 'column', gap: 8, overflowY: 'auto', minHeight: 0 },
  card: { background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: 10, cursor: 'grab', transition: 'transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease', boxShadow: '0 0 0 rgba(168,85,247,0)' },
  dragging: { opacity: 0.6, transform: 'scale(0.98)', boxShadow: '0 0 18px rgba(168,85,247,0.28)', borderColor: 'rgba(168,85,247,0.65)' },
  cardTitle: { fontWeight: 700, color: '#f9fafb', marginBottom: 6, fontSize: 13 },
  cardDesc: { color: '#cbd5e1', fontSize: 12, lineHeight: 1.35, marginBottom: 6, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' },
  note: { color: '#f59e0b', fontFamily: mono, fontSize: 11, marginBottom: 8 },
  cardMetaRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 4 },
  badge: { borderRadius: 999, border: '1px solid', padding: '2px 7px', fontFamily: mono, fontSize: 10 },
  owner: { color: '#d1d5db', fontFamily: mono, fontSize: 11 },
  category: { borderRadius: 999, border: '1px solid', padding: '2px 7px', fontFamily: mono, fontSize: 10 },
  due: { color: '#93c5fd', fontFamily: mono, fontSize: 10 },
  dueMuted: { color: '#6b7280', fontFamily: mono, fontSize: 10 },
};
