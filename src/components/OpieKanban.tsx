'use client'
import { useState, useRef, useEffect } from 'react'

export default function OpieKanban(): React.ReactElement {
  const [messages, setMessages] = useState<{role: string, text: string}[]>([])
  const [input, setInput] = useState('')
  const [micOn, setMicOn] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [transcript, setTranscript] = useState('')
  const recognitionRef = useRef<any>(null)

  useEffect(() => {
    if (!('webkitSpeechRecognition' in window)) return
    
    const SpeechRecognition = (window as any).webkitSpeechRecognition
    recognitionRef.current = new SpeechRecognition()
    recognitionRef.current.continuous = true
    recognitionRef.current.interimResults = true
    
    recognitionRef.current.onresult = (event: any) => {
      let finalTranscript = ''
      let interimTranscript = ''
      
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]
        if (result.isFinal) {
          finalTranscript += result[0].transcript
        } else {
          interimTranscript += result[0].transcript
        }
      }
      
      if (finalTranscript) {
        sendMessage(finalTranscript)
        setTranscript('')
      } else {
        setTranscript(interimTranscript)
      }
    }
    
    recognitionRef.current.onend = () => {
      if (micOn) recognitionRef.current?.start()
    }
    
    return () => recognitionRef.current?.stop()
  }, [])

  useEffect(() => {
    if (micOn) {
      recognitionRef.current?.start()
    } else {
      recognitionRef.current?.stop()
      setTranscript('')
    }
  }, [micOn])

  const speak = (text: string) => {
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.rate = 1.0
    window.speechSynthesis.speak(utterance)
  }

  const sendMessage = async (text: string) => {
    setMessages(prev => [...prev, { role: 'user', text }])
    setIsLoading(true)
    
    setTimeout(() => {
      const response = 'I heard: ' + text
      setMessages(prev => [...prev, { role: 'assistant', text: response }])
      speak(response)
      setIsLoading(false)
    }, 500)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#0f0f1a' }}>
      <div style={{ padding: '20px', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ width: '50px', height: '50px', borderRadius: '50%', background: 'linear-gradient(135deg, #667eea, #764ba2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>⚡️</div>
        <div style={{ flex: 1 }}>
          <h1 style={{ color: '#fff', fontSize: '1.2rem', margin: 0 }}>Opie</h1>
          <div style={{ color: '#22c55e', fontSize: '0.8rem' }}>● Online</div>
        </div>
        <button
          style={{ 
            padding: '12px 24px', borderRadius: '30px', border: 'none', cursor: 'pointer', fontWeight: 600,
            background: micOn ? '#ef4444' : '#22c55e',
            color: '#fff', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px'
          }}
        >
          {micOn ? '🎤 MIC ON' : '🎤 MIC OFF'}
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.5)', marginTop: '40px' }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>🎤</div>
            <p>Turn on the mic and start talking</p>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} style={{ 
            alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
            background: msg.role === 'user' ? '#667eea' : '#1e1e2e',

color: '#fff', padding: '12px 16px', borderRadius: '16px', maxWidth: '80%'
          }}>
            {msg.text}
          </div>
        ))}
        {isLoading && <div style={{ color: 'rgba(255,255,255,0.5)', padding: '12px' }}>Thinking...</div>}
      </div>

      <div style={{ padding: '20px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
        {transcript && <div style={{ color: '#667eea', marginBottom: '10px', fontStyle: 'italic' }}>Hearing: {transcript}</div>}
        <div style={{ display: 'flex', gap: '12px' }}>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendMessage(input) && setInput('')}
            placeholder="Or type here..."
            style={{ flex: 1, padding: '14px 18px', background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff', fontSize: '1rem', outline: 'none' }}
          />
          <button onClick={() => { sendMessage(input); setInput('') }} style={{ padding: '14px 24px', borderRadius: '12px', border: 'none', cursor: 'pointer', background: '#22c55e', color: '#fff', fontWeight: 600 }}>Send</button>
        </div>
      </div>
    </div>
  )
}
