'use client'
import { useState } from 'react'

export default function OpieKanban(): React.ReactElement {
  const columns = [
    { id: 'todo', title: 'To Do', emoji: '📋', color: '#f59e0b', tasks: [{ id: '1', title: 'Voice Integration' }] },
    { id: 'progress', title: 'In Progress', emoji: '🔄', color: '#667eea', tasks: [{ id: '2', title: '2nd Brain' }] },
    { id: 'done', title: 'Done', emoji: '✅', color: '#22c55e', tasks: [{ id: '3', title: 'Dashboard' }] }
  ]
  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#0f0f1a' }}>
      <div style={{ width: '280px', background: '#1a1a2e', padding: '12px' }}>
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'linear-gradient(135deg, #667eea, #764ba2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '30px', margin: '0 auto' }}>⚡️</div>
          <h2 style={{ color: '#fff', margin: '10px 0' }}>Opie</h2>
          <div style={{ color: '#22c55e' }}>● Ready</div>
        </div>
      </div>
      <div style={{ flex: 1, padding: '20px' }}>
        <h1 style={{ color: '#fff', marginBottom: '20px' }}>Dashboard</h1>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px' }}>
          {columns.map(col => (
            <div key={col.id} style={{ background: '#1e1e2e', borderRadius: '8px', borderTop: `3px solid ${col.color}` }}>
              <div style={{ padding: '12px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                <span style={{ color: '#fff', fontWeight: 600 }}>{col.emoji} {col.title}</span>
              </div>
              <div style={{ padding: '8px' }}>
                {col.tasks.map(t => (
                  <div key={t.id} style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '6px', padding: '8px', marginBottom: '6px' }}>
                    <span style={{ color: 'rgba(255,255,255,0.9)' }}>{t.title}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
