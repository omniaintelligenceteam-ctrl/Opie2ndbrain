'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import AgentsPanel from './AgentsPanel';
import SkillsPanel from './SkillsPanel';
import ActiveTasksPanel, { Task } from './ActiveTasksPanel';
import OrchestrationStatus from './OrchestrationStatus';

// Generate or retrieve persistent session ID
function getSessionId(): string {
  if (typeof window === 'undefined') return 'server';
  let id = localStorage.getItem('opie-session-id');
  if (!id) {
    id = `2ndbrain-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    localStorage.setItem('opie-session-id', id);
  }
  return id;
}

export default function OpieKanban(): React.ReactElement {
  const [messages, setMessages] = useState<{role: string; text: string}[]>([]);
  const [input, setInput] = useState('');
  const [micOn, setMicOn] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string>('');
  const [activeView, setActiveView] = useState<'chat' | 'agents' | 'skills'>('chat');
  const [activeAgents, setActiveAgents] = useState<string[]>(['content', 'outreach']);
  const [tasks, setTasks] = useState<Task[]>([
    {
      id: '1',
      agentId: 'research',
      agentName: 'Research Agent',
      agentEmoji: '🔍',
      label: 'Competitor analysis for lighting industry',
      startTime: new Date(Date.now() - 1000 * 60 * 5),
      status: 'running',
      output: 'Found 12 competitors in the local market...',
    },
    {
      id: '2',
      agentId: 'content',
      agentName: 'Content Agent',
      agentEmoji: '✍️',
      label: 'Write blog post about LED benefits',
      startTime: new Date(Date.now() - 1000 * 60 * 15),
      status: 'complete',
      output: 'Draft completed: 1,200 words covering 5 key benefits...',
    },
  ]);
  
  const recognitionRef = useRef<any>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const micOnRef = useRef(false);

  useEffect(() => { micOnRef.current = micOn; }, [micOn]);
  useEffect(() => { setSessionId(getSessionId()); }, []);

  const startRecognition = useCallback(() => {
    if (recognitionRef.current && micOnRef.current && !isSpeaking) {
      try { recognitionRef.current.start(); } catch(e) {}
    }
  }, [isSpeaking]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    audioRef.current = new Audio();
    audioRef.current.onended = () => {
      setIsSpeaking(false);
      setTimeout(() => startRecognition(), 500);
    };
  }, [startRecognition]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('webkitSpeechRecognition' in window)) return;
    const SR = (window as any).webkitSpeechRecognition;
    const recognition = new SR();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.onresult = (e: any) => {
      if (isSpeaking || isLoading) return;
      let final = '';
      let interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) final += e.results[i][0].transcript;
        else interim += e.results[i][0].transcript;
      }
      if (final) { handleSend(final); setTranscript(''); }
      else setTranscript(interim);
    };
    recognition.onend = () => {
      if (micOnRef.current && !isSpeaking && !isLoading) {
        setTimeout(() => { try { recognition.start(); } catch(e) {} }, 100);
      }
    };
    recognition.onerror = () => {};
    recognitionRef.current = recognition;
  }, [isSpeaking, isLoading]);

  const toggleMic = () => {
    if (!micOn) {
      setMicOn(true);
      try { recognitionRef.current?.start(); } catch(e) {}
    } else {
      setMicOn(false);
      try { recognitionRef.current?.stop(); } catch(e) {}
      setTranscript('');
    }
  };

  const speak = async (text: string) => {
    setIsSpeaking(true);
    try { recognitionRef.current?.stop(); } catch(e) {}
    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      if (audioRef.current) {
        audioRef.current.src = url;
        await audioRef.current.play();
      }
    } catch (err) {
      setIsSpeaking(false);
      setTimeout(() => startRecognition(), 500);
    }
  };

  const handleSend = async (text: string) => {
    if (!text.trim() || isLoading) return;
    const userMsg = text.trim();
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setInput('');
    setIsLoading(true);
    try { recognitionRef.current?.stop(); } catch(e) {}
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg, sessionId }),
      });
      const data = await res.json();
      const reply = data.reply || 'No response';
      setMessages(prev => [...prev, { role: 'assistant', text: reply }]);
      setIsLoading(false);
      await speak(reply);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', text: 'Error' }]);
      setIsLoading(false);
      setTimeout(() => startRecognition(), 500);
    }
  };

  const handleDeployAgent = (agentId: string, taskLabel: string) => {
    // Add to active agents
    setActiveAgents(prev => [...new Set([...prev, agentId])]);
    
    // Create new task
    const agentInfo: { [key: string]: { name: string; emoji: string } } = {
      research: { name: 'Research Agent', emoji: '🔍' },
      code: { name: 'Code Agent', emoji: '💻' },
      content: { name: 'Content Agent', emoji: '✍️' },
      analyst: { name: 'Analyst Agent', emoji: '📊' },
      outreach: { name: 'Outreach Agent', emoji: '📧' },
      qa: { name: 'QA Agent', emoji: '✅' },
      sales: { name: 'Sales Agent', emoji: '💰' },
      contractor: { name: 'Contractor Expert', emoji: '🏗️' },
      mockup: { name: 'Mockup Agent', emoji: '🎨' },
      proposal: { name: 'Proposal Agent', emoji: '📝' },
      success: { name: 'Success Agent', emoji: '🌟' },
    };

    const newTask: Task = {
      id: Date.now().toString(),
      agentId,
      agentName: agentInfo[agentId]?.name || 'Agent',
      agentEmoji: agentInfo[agentId]?.emoji || '🤖',
      label: taskLabel,
      startTime: new Date(),
      status: 'running',
      output: 'Starting task...',
    };

    setTasks(prev => [newTask, ...prev]);
  };

  const columns = [
    { id: 'todo', title: 'To Do', color: '#f59e0b', tasks: ['Memory', 'HeyGen'] },
    { id: 'progress', title: 'In Progress', color: '#667eea', tasks: ['Voice Chat'] },
    { id: 'done', title: 'Done', color: '#22c55e', tasks: ['Dashboard', 'API', 'TTS'] }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#0f0f1a' }}>
      {/* Header */}
      <div style={{ padding: '15px 20px', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', gap: '15px' }}>
        <div style={{ width: '50px', height: '50px', borderRadius: '50%', background: 'linear-gradient(135deg, #667eea, #764ba2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px' }}>⚡️</div>
        <div style={{ flex: 1 }}>
          <h1 style={{ color: '#fff', fontSize: '1.2rem', margin: 0 }}>Opie Command Center</h1>
          <span style={{ color: isSpeaking ? '#f59e0b' : isLoading ? '#667eea' : '#22c55e', fontSize: '0.8rem' }}>
            {isSpeaking ? '● Speaking...' : isLoading ? '● Thinking...' : '● Online'}
          </span>
        </div>
        
        {/* View Toggle */}
        <div style={{ display: 'flex', gap: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', padding: '4px' }}>
          <button
            onClick={() => setActiveView('chat')}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              border: 'none',
              background: activeView === 'chat' ? '#667eea' : 'transparent',
              color: '#fff',
              fontSize: '0.8rem',
              cursor: 'pointer',
              fontWeight: 500,
            }}
          >
            💬 Chat
          </button>
          <button
            onClick={() => setActiveView('agents')}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              border: 'none',
              background: activeView === 'agents' ? '#667eea' : 'transparent',
              color: '#fff',
              fontSize: '0.8rem',
              cursor: 'pointer',
              fontWeight: 500,
            }}
          >
            🤖 Agents
          </button>
          <button
            onClick={() => setActiveView('skills')}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              border: 'none',
              background: activeView === 'skills' ? '#667eea' : 'transparent',
              color: '#fff',
              fontSize: '0.8rem',
              cursor: 'pointer',
              fontWeight: 500,
            }}
          >
            ⚡ Skills
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex' }}>
        {/* Left Side - Main Panel */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', borderRight: '1px solid rgba(255,255,255,0.1)' }}>
          {activeView === 'chat' && (
            <>
              {/* Kanban */}
              <div style={{ padding: '20px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                  {columns.map(col => (
                    <div key={col.id} style={{ background: '#1e1e2e', borderRadius: '8px', borderTop: `3px solid ${col.color}` }}>
                      <div style={{ padding: '8px 10px', fontWeight: 600, color: '#fff', fontSize: '0.8rem' }}>{col.title}</div>
                      <div style={{ padding: '6px' }}>
                        {col.tasks.map((t, i) => (
                          <div key={i} style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '5px', padding: '6px 8px', marginBottom: '4px', color: 'rgba(255,255,255,0.85)', fontSize: '0.75rem' }}>{t}</div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Chat Messages */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '15px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {messages.length === 0 && (
                  <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.4)', marginTop: '30px' }}>
                    <div style={{ fontSize: '40px', marginBottom: '10px' }}>🎤</div>
                    <p>Turn on mic or type to chat with Opie</p>
                  </div>
                )}
                {messages.map((m, i) => (
                  <div key={i} style={{ alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start', background: m.role === 'user' ? '#667eea' : '#1e1e2e', color: '#fff', padding: '10px 14px', borderRadius: '12px', maxWidth: '75%' }}>{m.text}</div>
                ))}
              </div>
              
              {transcript && <div style={{ padding: '10px 20px', background: 'rgba(102,126,234,0.1)', color: '#667eea' }}>Hearing: {transcript}</div>}
              
              {/* Input */}
              <div style={{ padding: '15px 20px', borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', gap: '10px' }}>
                <button onClick={toggleMic} style={{ padding: '14px 20px', borderRadius: '12px', border: 'none', cursor: 'pointer', fontWeight: 600, background: micOn ? '#22c55e' : '#ef4444', color: '#fff' }}>{micOn ? '🎤 ON' : '🎤 OFF'}</button>
                <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') handleSend(input); }} placeholder="Type..." style={{ flex: 1, padding: '14px', background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff', outline: 'none' }} />
                <button onClick={() => handleSend(input)} style={{ padding: '14px 24px', background: '#667eea', border: 'none', borderRadius: '12px', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>Send</button>
              </div>
            </>
          )}

          {activeView === 'agents' && (
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
              <AgentsPanel onDeploy={handleDeployAgent} activeAgents={activeAgents} />
            </div>
          )}

          {activeView === 'skills' && (
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
              <SkillsPanel />
            </div>
          )}
        </div>

        {/* Right Sidebar - Status Panels */}
        <div style={{ width: '380px', display: 'flex', flexDirection: 'column', gap: '0', background: '#0d0d15' }}>
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <OrchestrationStatus activeAgents={activeAgents} />
            <ActiveTasksPanel tasks={tasks} />
          </div>
        </div>
      </div>

      {/* CSS Animations */}
      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 0.5; }
          50% { transform: scale(1.1); opacity: 0.8; }
        }
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
        @keyframes progress {
          0% { transform: translateX(-100%); }
          50% { transform: translateX(100%); }
          100% { transform: translateX(-100%); }
        }
      `}</style>
    </div>
  );
}
