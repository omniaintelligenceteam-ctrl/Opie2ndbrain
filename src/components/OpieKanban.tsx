'use client'
import { useState, useRef, useEffect } from 'react'

export default function OpieKanban(): React.ReactElement {
  const [messages, setMessages] = useState<{role: string, text: string}[]>([])
  const [input, setInput] = useState('')
  const [micOn, setMicOn] = useState(false)
  const [transcript, setTranscript] = useState('')
  const recognitionRef = useRef<any>(null)

  useEffect(() => {
    if (typeof window === 'undefined' || !('webkitSpeechRecognition' in window)) return
    const SR = (window as any).webkitSpeechRecognition
    recognitionRef.current = new SR()
    recognitionRef.current.continuous = true
    recognitionRef.current.interimResults = true
    recognitionRef.current.onresult = (e: any) => {
      let final = '', interim = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) final += e.results[i][0].transcript
        else interim += e.results[i][0].transcript
      }
      if (final) { sendMessage(final); setTranscript('') }
      else setTranscript(interim)
    }
    recognitionRef.current.onend = () => { if (micOn) recognitionRef.current?.start() }
  }, [])

  useEffect(() => {
    if (micOn) recognitionRef.current?.start()
    else { recognitionRef.current?.stop(); setTranscript('') }
  }, [micOn])

  const speak = (text: string) => {
    const u = new SpeechSynthesisUtterance(text)
    window.speechSynthesis.speak(u)
  }

  const sendMessage = (text: string) => {
    setMessages(p => [...p, { role: 'user', text }])
    setTimeout(() => {
      const r = 'I heard: ' + text
      setMessages(p => [...p, { role: 'assistant', text: r }])
      speak(r)
    }, 300)
  }

  const columns = [
    { id: 'todo', title: 'To Do', color: '#f59e0b', tasks: ['Voice Integration', 'API Connect'] },
    { id: 'progress', title: 'In Progress', color: '#667eea', tasks: ['2nd Brain'] },
    { id: 'done', title: 'Done', color: '#22c55e', tasks: ['Dashboard', 'Deploy'] }
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#0f0f1a' }}>
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Sidebar */}
        <div style={{ width: '200px', background: '#1a1a2e', padding: '20px', borderRight: '1px solid rgba(255,255,255,0.1)' }}>
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'linear-gradient(135deg, #667eea, #764ba2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '40px', margin: '0 auto' }}>⚡️</div>
            <h2 style={{ color: '#fff', margin: '10px 0 5px' }}>Opie</h2>
            <div style={{ color: '#22c55e', fontSize: '0.85rem' }}>● Ready</div>
          </div>
            {micOn ? '🎤 MIC ON' : '🎤 MIC OFF'}
          </button>
          {transcript && <div style={{ color: '#667eea', fontSize: '0.8rem', fontStyle: 'italic' }}>Hearing: {transcript}</div>}
        </div>

        {/* Main */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Kanban */}
          <div style={{ padding: '20px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
            <h1 style={{ color: '#fff', fontSize: '1.3rem', marginBottom: '15px' }}>Dashboard</h1>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
              {columns.map(col => (

               <div key={col.id} style={{ background: '#1e1e2e', borderRadius: '8px', borderTop: `3px solid ${col.color}` }}>
                  <div style={{ padding: '10px', fontWeight: 600, color: '#fff', fontSize: '0.85rem' }}>{col.title}</div>
                  <div style={{ padding: '8px' }}>
                    {col.tasks.map((t, i) => (
                      <div key={i} style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '6px', padding: '8px', marginBottom: '6px', color: 'rgba(255,255,255,0.85)', fontSize: '0.8rem' }}>{t}</div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Chat */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '15px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {messages.map((m, i) => (
              <div key={i} style={{ alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start', background: m.role === 'user' ? '#667eea' : '#1e1e2e', color: '#fff', padding: '10px 14px', borderRadius: '12px', maxWidth: '70%', fontSize: '0.9rem' }}>{m.text}</div>
            ))}
          </div>

          {/* Input */}
          <div style={{ padding: '15px', borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', gap: '10px' }}>
            <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { sendMessage(input); setInput('') }}} placeholder="Type or use mic..." style={{ flex: 1, padding: '12px', background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: '#fff', outline: 'none' }} />
            <button onClick={() => { sendMessage(input); setInput('') }} style={{ padding: '12px 20px', background: '#22c55e', border: 'none', borderRadius: '10px', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>Send</button>
          </div>
        </div>
      </div>
    </div>
  )
}
