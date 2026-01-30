'use client'
import { useState } from 'react'

export default function OpieKanban() {
  const [newNote, setNewNote] = useState('')
  const [notes, setNotes] = useState([{ id: '1', text: 'Opie checks notes on every heartbeat', time: 'System', status: 'done' }])
  const memories = [{ id: '1', text: 'Wes likes brutal honesty', category: 'preference', importance: 'critical' }, { id: '2', text: 'Omnia Light Scape Pro', category: 'project', importance: 'high' }]
  const security = { lastCheck: 'Just now', status: 'secure', checks: [{ name: 'API Keys', status: 'ok' }, { name: 'Secrets', status: 'ok' }] }
  const columns = [
    { id: 'todo', title: 'To Do', emoji: '📋', color: '#f59e0b', tasks: [{ id: '1', title: 'Contact Kenny' }, { id: '2', title: 'Calendar Integration' }] },
    { id: 'progress', title: 'In Progress', emoji: '🔄', color: '#667eea', tasks: [{ id: '3', title: 'Security Monitoring' }] },
    { id: 'done', title: 'Done', emoji: '✅', color: '#22c55e', tasks: [{ id: '4', title: 'Brave Search API' }, { id: '5', title: 'Dashboard Deployed' }] }
  ]
  const metrics = { tools: 106, memories: 35, context: '19%' }
  const addNote = () => { if (!newNote.trim()) return; setNotes([{ id: Date.now().toString(), text: newNote, time: new Date().toLocaleTimeString(), status: 'pending' }, ...notes]); setNewNote('') }

return

(<div style={{ display: 'flex', minHeight: '100vh', background: 'linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 100%)' }}>
    <div style={{ width: '280px', background: '#1a1a2e', borderRight: '1px solid rgba(255,255,255,0.1)', padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px', overflowY: 'auto' }}>
      <div style={{ background: 'rgba(102,126,234,0.1)', borderRadius: '10px', padding: '10px', border: '1px solid rgba(102,126,234,0.3)' }}>
        <div style={{ color: '#667eea', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px' }}>📝 Notes for Opie</div>
        <textarea value={newNote} onChange={(e) => setNewNote(e.target.value)} placeholder="Leave instructions..." style={{ width: '100%', padding: '6px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '4px', color: '#fff', fontSize: '0.75rem', resize: 'none', minHeight: '40px', marginBottom: '4px' }} />
        <button onClick={addNote} style={{ padding: '4px 10px', background: '#667eea', border: 'none', borderRadius: '4px', color: '#fff', fontSize: '0.7rem', cursor: 'pointer' }}>Add</button>
        <div style={{ marginTop: '6px', maxHeight: '80px', overflowY: 'auto' }}>{notes.map(n => <div key={n.id} style={{ padding: '4px 6px', background: n.status === 'pending' ? 'rgba(102,126,234,0.15)' : 'rgba(34,197,94,0.1)', borderRadius: '3px', marginBottom: '3px', borderLeft: n.status === 'pending' ? '2px solid #667eea' : '2px solid #22c55e' }}><div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.8)' }}>{n.text}</div></div>)}</div>
      </div>
      <div style={{ textAlign: 'center', padding: '8px 0' }}><div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '30px', margin: '0 auto' }}>⚡️</div><h2 style={{ color: '#fff', margin: '6px 0 2px', fontSize: '1.1rem' }}>Opie</h2><div style={{ color: '#22c55e', fontSize: '0.75rem' }}>● Ready</div></div>
      <div style={{ background: 'rgba(34,197,94,0.1)', borderRadius: '8px', padding: '8px', border: '1px solid rgba(34,197,94,0.3)' }}><div style={{ color: '#22c55e', fontSize: '0.75rem', fontWeight: 600, marginBottom: '4px' }}>🔒 Security</div>{security.checks.map(c => <div key={c.name} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', padding: '2px 0' }}><span style={{ color: 'rgba(255,255,255,0.7)' }}>{c.name}</span><span style={{ color: '#22c55e' }}>✓</span></div>)}</div>
      <div><div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.65rem', textTransform: 'uppercase', marginBottom: '4px' }}>🧠 Key Memories</div>{memories.map(m => <div key={m.id} style={{ padding: '4px 6px', background: 'rgba(255,255,255,0.03)', borderRadius: '4px', marginBottom: '3px', borderLeft: m.importance === 'critical' ? '2px solid #ef4444' : '2px solid #f59e0b' }}><div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.8)' }}>{m.text}</div></div>)}</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '3px' }}>{Object.entries(metrics).map(([k, v]) => <div key={k} style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '4px', padding: '4px', textAlign: 'center' }}><div style={{ color: '#667eea', fontWeight: 600, fontSize: '0.85rem' }}>{v}</div><div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.5rem', textTransform: 'uppercase' }}>{k}</div></div>)}</div>
    </div>
    <div style={{ flex: 1, padding: '14px', overflowX: 'auto' }}>
      <h1 style={{ color: '#fff', fontSize: '1.2rem', margin: '0 0 12px' }}>Dashboard</h1>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', minWidth: '600px' }}>{columns.map(col => <div key={col.id} style={{ background: '#1e1e2e', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }}><div style={{ padding: '10px', borderBottom: '1px solid rgba(255,255,255,0.1)', borderTop: `3px solid

${col.color}`, borderRadius: '8px 8px 0 0', display: 'flex', justifyContent: 'space-between' }}><span style={{ fontWeight: 600, color: '#fff', fontSize: '0.85rem' }}>{col.emoji} {col.title}</span><span style={{ background: 'rgba(255,255,255,0.1)', padding: '1px 5px', borderRadius: '6px', fontSize: '0.65rem', color: 'rgba(255,255,255,0.6)' }}>{col.tasks.length}</span></div><div style={{ padding: '6px' }}>{col.tasks.map(t => <div key={t.id} style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '5px', padding: '6px', marginBottom: '4px', borderLeft: `3px solid ${col.color}` }}><div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.9)' }}>{t.title}</div></div>)}</div></div>)}</div>
    </div>
  </div>)
}
