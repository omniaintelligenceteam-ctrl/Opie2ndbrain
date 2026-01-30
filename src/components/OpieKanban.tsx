'use client';
import { useState, useRef, useEffect } from 'react';

export default function OpieKanban(): React.ReactElement {
  const [messages, setMessages] = useState<{role: string; text: string}[]>([]);
  const [input, setInput] = useState('');
  const [micOn, setMicOn] = useState(false);
  const [transcript, setTranscript] = useState('');
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('webkitSpeechRecognition' in window)) return;
    const SR = (window as any).webkitSpeechRecognition;
    const recognition = new SR();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.onresult = (e: any) => {
      let final = '';
      let interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) final += e.results[i][0].transcript;
        else interim += e.results[i][0].transcript;
      }
      if (final) { handleSend(final); setTranscript(''); }
      else setTranscript(interim);
    };
    recognition.onend = () => { if (micOn) recognition.start(); };
    recognitionRef.current = recognition;
  }, [micOn]);

  const toggleMic = () => {
    if (!micOn) { setMicOn(true); recognitionRef.current?.start(); }
    else { setMicOn(false); recognitionRef.current?.stop(); setTranscript(''); }
  };

  const speak = (text: string) => {
    if (typeof window === 'undefined') return;
    const u = new SpeechSynthesisUtterance(text);
    window.speechSynthesis.speak(u);
  };

  const handleSend = (text: string) => {
    if (!text.trim()) return;
    setMessages(prev => [...prev, { role: 'user', text: text.trim() }]);
    setInput('');
    setTimeout(() => {
      const response = 'I heard: ' + text.trim();
      setMessages(prev => [...prev, { role: 'assistant', text: response }]);
      speak(response);
    }, 300);
  };

  const columns = [
    { id: 'todo', title: 'To Do', color: '#f59e0b', tasks: ['API Connect'] },
    { id: 'progress', title: 'In Progress', color: '#667eea', tasks: ['Voice Chat'] },
    { id: 'done', title: 'Done', color: '#22c55e', tasks: ['Dashboard'] }
  ];

return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#0f0f1a' }}>
      <div style={{ padding: '15px 20px', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', gap: '15px' }}>
        <div style={{ width: '50px', height: '50px', borderRadius: '50%', background: 'linear-gradient(135deg, #667eea, #764ba2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px' }}>⚡️</div>
        <div><h1 style={{ color: '#fff', fontSize: '1.2rem', margin: 0 }}>Opie</h1><span style={{ color: '#22c55e', fontSize: '0.8rem' }}>● Online</span></div>
      </div>
      <div style={{ padding: '20px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
          {columns.map(col => (
            <div key={col.id} style={{ background: '#1e1e2e', borderRadius: '8px', borderTop: `3px solid ${col.color}` }}>
              <div style={{ padding: '8px 10px', fontWeight: 600, color: '#fff', fontSize: '0.8rem' }}>{col.title}</div>
              <div style={{ padding: '6px' }}>{col.tasks.map((t, i) => (<div key={i} style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '5px', padding: '6px 8px', marginBottom: '4px', color: 'rgba(255,255,255,0.85)', fontSize: '0.75rem' }}>{t}</div>))}</div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '15px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {messages.length === 0 && <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.4)', marginTop: '30px' }}><div style={{ fontSize: '40px', marginBottom: '10px' }}>🎤</div><p>Turn on the mic or type below</p></div>}
        {messages.map((m, i) => (<div key={i} style={{ alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start', background: m.role === 'user' ? '#667eea' : '#1e1e2e', color: '#fff', padding: '10px 14px', borderRadius: '12px', maxWidth: '75%' }}>{m.text}</div>))}
      </div>
      {transcript && <div style={{ padding: '10px 20px', background: 'rgba(102,126,234,0.1)', color: '#667eea' }}>Hearing: {transcript}</div>}
      <div style={{ padding: '15px 20px', borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', gap: '10px' }}>
        <button onClick={toggleMic} style={{ padding: '14px 20px', borderRadius: '12px', border: 'none', cursor: 'pointer', fontWeight: 600, background: micOn ? '#ef4444' : '#22c55e', color: '#fff' }}>{micOn ? '🎤 ON' : '🎤 OFF'}</button>
        <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') handleSend(input); }} placeholder="Type a message..." style={{ flex: 1, padding: '14px', background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff', outline: 'none' }} />
        <button onClick={() => handleSend(input)} style={{ padding: '14px 24px', background: '#667eea', border: 'none', borderRadius: '12px', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>Send</button>
      </div>
    </div>
  );
}
