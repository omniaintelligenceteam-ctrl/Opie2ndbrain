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

// Get/set persistent tab
function getSavedTab(): string {
  if (typeof window === 'undefined') return 'dashboard';
  return localStorage.getItem('opie-active-tab') || 'dashboard';
}

function saveTab(tab: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('opie-active-tab', tab);
  }
}

type TabId = 'dashboard' | 'agents' | 'skills' | 'tasks' | 'voice';

interface Tab {
  id: TabId;
  label: string;
  emoji: string;
}

const TABS: Tab[] = [
  { id: 'dashboard', label: 'Dashboard', emoji: '📊' },
  { id: 'agents', label: 'Agents', emoji: '🤖' },
  { id: 'skills', label: 'Skills', emoji: '⚡' },
  { id: 'tasks', label: 'Tasks', emoji: '📋' },
  { id: 'voice', label: 'Voice', emoji: '🎤' },
];

export default function OpieKanban(): React.ReactElement {
  const [messages, setMessages] = useState<{role: string; text: string}[]>([]);
  const [input, setInput] = useState('');
  const [micOn, setMicOn] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<TabId>('dashboard');
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

  // Load saved tab on mount
  useEffect(() => {
    setActiveTab(getSavedTab() as TabId);
  }, []);

  // Handle tab change with persistence
  const handleTabChange = (tab: TabId) => {
    setActiveTab(tab);
    saveTab(tab);
  };

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
    setActiveAgents(prev => [...new Set([...prev, agentId])]);
    
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
    
    // Switch to tasks tab to show the new task
    handleTabChange('tasks');
  };

  const columns = [
    { id: 'todo', title: 'To Do', color: '#f59e0b', tasks: ['Memory Integration', 'HeyGen Avatar', 'Email Automation'] },
    { id: 'progress', title: 'In Progress', color: '#667eea', tasks: ['Voice Chat', 'Agent Dashboard'] },
    { id: 'done', title: 'Done', color: '#22c55e', tasks: ['Dashboard UI', 'Chat API', 'TTS Integration', 'Skill Catalog'] }
  ];

  const runningTasksCount = tasks.filter(t => t.status === 'running').length;

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <div style={styles.logo}>⚡️</div>
          <div>
            <h1 style={styles.title}>Opie Command Center</h1>
            <span style={{ 
              color: isSpeaking ? '#f59e0b' : isLoading ? '#667eea' : '#22c55e', 
              fontSize: '0.8rem' 
            }}>
              {isSpeaking ? '● Speaking...' : isLoading ? '● Thinking...' : '● Online'}
            </span>
          </div>
        </div>

        {/* Quick Stats */}
        <div style={styles.quickStats}>
          <div style={styles.statItem}>
            <span style={styles.statValue}>{activeAgents.length}</span>
            <span style={styles.statLabel}>Active</span>
          </div>
          <div style={styles.statDivider} />
          <div style={styles.statItem}>
            <span style={{ ...styles.statValue, color: '#f59e0b' }}>{runningTasksCount}</span>
            <span style={styles.statLabel}>Running</span>
          </div>
        </div>
      </div>

      {/* Tab Bar */}
      <div style={styles.tabBar}>
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id)}
            style={{
              ...styles.tab,
              ...(activeTab === tab.id ? styles.tabActive : {}),
            }}
          >
            <span style={styles.tabEmoji}>{tab.emoji}</span>
            <span style={styles.tabLabel}>{tab.label}</span>
            {tab.id === 'tasks' && runningTasksCount > 0 && (
              <span style={styles.tabBadge}>{runningTasksCount}</span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div style={styles.content}>
        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <div style={styles.dashboardTab}>
            <div style={styles.dashboardGrid}>
              {/* Left Column - Kanban */}
              <div style={styles.kanbanSection}>
                <h3 style={styles.sectionTitle}>📋 Project Board</h3>
                <div style={styles.kanbanGrid}>
                  {columns.map(col => (
                    <div key={col.id} style={{ ...styles.kanbanColumn, borderTopColor: col.color }}>
                      <div style={styles.columnHeader}>
                        <span>{col.title}</span>
                        <span style={styles.columnCount}>{col.tasks.length}</span>
                      </div>
                      <div style={styles.columnTasks}>
                        {col.tasks.map((t, i) => (
                          <div key={i} style={styles.taskCard}>{t}</div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right Column - Orchestration */}
              <div style={styles.orchestrationSection}>
                <OrchestrationStatus activeAgents={activeAgents} />
              </div>
            </div>

            {/* Recent Activity */}
            <div style={styles.recentActivity}>
              <h3 style={styles.sectionTitle}>⚡ Recent Activity</h3>
              <div style={styles.activityList}>
                {tasks.slice(0, 3).map(task => (
                  <div key={task.id} style={styles.activityItem}>
                    <span style={styles.activityEmoji}>{task.agentEmoji}</span>
                    <span style={styles.activityText}>{task.label}</span>
                    <span style={{
                      ...styles.activityStatus,
                      color: task.status === 'running' ? '#f59e0b' : '#22c55e'
                    }}>
                      {task.status === 'running' ? '⏳ Running' : '✅ Done'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Agents Tab */}
        {activeTab === 'agents' && (
          <div style={styles.tabPane}>
            <AgentsPanel onDeploy={handleDeployAgent} activeAgents={activeAgents} />
          </div>
        )}

        {/* Skills Tab */}
        {activeTab === 'skills' && (
          <div style={styles.tabPane}>
            <SkillsPanel />
          </div>
        )}

        {/* Tasks Tab */}
        {activeTab === 'tasks' && (
          <div style={styles.tasksTab}>
            <div style={styles.tasksGrid}>
              <div style={styles.tasksMain}>
                <ActiveTasksPanel tasks={tasks} />
              </div>
              <div style={styles.tasksAside}>
                <OrchestrationStatus activeAgents={activeAgents} />
              </div>
            </div>
          </div>
        )}

        {/* Voice Tab */}
        {activeTab === 'voice' && (
          <div style={styles.voiceTab}>
            {/* Chat Messages */}
            <div style={styles.chatMessages}>
              {messages.length === 0 && (
                <div style={styles.emptyChat}>
                  <div style={styles.emptyChatIcon}>🎤</div>
                  <h3 style={styles.emptyChatTitle}>Voice Chat with Opie</h3>
                  <p style={styles.emptyChatText}>Turn on the mic or type below to start a conversation</p>
                </div>
              )}
              {messages.map((m, i) => (
                <div 
                  key={i} 
                  style={{
                    ...styles.chatBubble,
                    ...(m.role === 'user' ? styles.chatBubbleUser : styles.chatBubbleAssistant)
                  }}
                >
                  {m.text}
                </div>
              ))}
            </div>
            
            {transcript && (
              <div style={styles.transcript}>
                🎙️ Hearing: {transcript}
              </div>
            )}
            
            {/* Voice Input */}
            <div style={styles.voiceInput}>
              <button 
                onClick={toggleMic} 
                style={{
                  ...styles.micButton,
                  background: micOn ? '#22c55e' : '#ef4444',
                }}
              >
                {micOn ? '🎤 Listening...' : '🎤 Start Mic'}
              </button>
              <input 
                value={input} 
                onChange={e => setInput(e.target.value)} 
                onKeyDown={e => { if (e.key === 'Enter') handleSend(input); }} 
                placeholder="Type a message..." 
                style={styles.textInput} 
              />
              <button 
                onClick={() => handleSend(input)} 
                style={styles.sendButton}
                disabled={isLoading}
              >
                {isLoading ? '...' : 'Send'}
              </button>
            </div>
          </div>
        )}
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

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    background: '#0f0f1a',
    overflow: 'hidden',
  },
  
  // Header
  header: {
    padding: '16px 24px',
    borderBottom: '1px solid rgba(255,255,255,0.1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    background: '#0d0d15',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  logo: {
    width: '48px',
    height: '48px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #667eea, #764ba2)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '24px',
  },
  title: {
    color: '#fff',
    fontSize: '1.25rem',
    fontWeight: 600,
    margin: 0,
  },
  quickStats: {
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
    background: 'rgba(255,255,255,0.05)',
    borderRadius: '12px',
    padding: '12px 20px',
  },
  statItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '2px',
  },
  statValue: {
    color: '#22c55e',
    fontSize: '1.25rem',
    fontWeight: 700,
  },
  statLabel: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: '0.7rem',
    textTransform: 'uppercase',
  },
  statDivider: {
    width: '1px',
    height: '30px',
    background: 'rgba(255,255,255,0.1)',
  },

  // Tab Bar
  tabBar: {
    display: 'flex',
    gap: '4px',
    padding: '12px 24px',
    borderBottom: '1px solid rgba(255,255,255,0.1)',
    background: '#0d0d15',
  },
  tab: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 20px',
    borderRadius: '10px',
    border: 'none',
    background: 'transparent',
    color: 'rgba(255,255,255,0.6)',
    fontSize: '0.9rem',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    position: 'relative',
  },
  tabActive: {
    background: 'rgba(102,126,234,0.15)',
    color: '#fff',
  },
  tabEmoji: {
    fontSize: '1.1rem',
  },
  tabLabel: {},
  tabBadge: {
    position: 'absolute',
    top: '6px',
    right: '6px',
    background: '#f59e0b',
    color: '#000',
    fontSize: '0.65rem',
    fontWeight: 700,
    padding: '2px 6px',
    borderRadius: '10px',
    minWidth: '18px',
    textAlign: 'center',
  },

  // Content
  content: {
    flex: 1,
    overflow: 'hidden',
  },

  // Dashboard Tab
  dashboardTab: {
    height: '100%',
    overflow: 'auto',
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  dashboardGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 380px',
    gap: '24px',
  },
  kanbanSection: {
    background: '#1a1a2e',
    borderRadius: '16px',
    padding: '20px',
    border: '1px solid rgba(255,255,255,0.1)',
  },
  sectionTitle: {
    color: '#fff',
    fontSize: '1rem',
    fontWeight: 600,
    margin: '0 0 16px 0',
  },
  kanbanGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '16px',
  },
  kanbanColumn: {
    background: 'rgba(255,255,255,0.03)',
    borderRadius: '12px',
    borderTop: '3px solid',
    overflow: 'hidden',
  },
  columnHeader: {
    padding: '12px 14px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    color: '#fff',
    fontWeight: 600,
    fontSize: '0.85rem',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
  },
  columnCount: {
    background: 'rgba(255,255,255,0.1)',
    padding: '2px 8px',
    borderRadius: '10px',
    fontSize: '0.75rem',
  },
  columnTasks: {
    padding: '12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  taskCard: {
    background: 'rgba(255,255,255,0.05)',
    borderRadius: '8px',
    padding: '10px 12px',
    color: 'rgba(255,255,255,0.85)',
    fontSize: '0.8rem',
  },
  orchestrationSection: {},
  recentActivity: {
    background: '#1a1a2e',
    borderRadius: '16px',
    padding: '20px',
    border: '1px solid rgba(255,255,255,0.1)',
  },
  activityList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  activityItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 16px',
    background: 'rgba(255,255,255,0.03)',
    borderRadius: '10px',
  },
  activityEmoji: {
    fontSize: '20px',
  },
  activityText: {
    flex: 1,
    color: 'rgba(255,255,255,0.8)',
    fontSize: '0.85rem',
  },
  activityStatus: {
    fontSize: '0.75rem',
    fontWeight: 500,
  },

  // Tab Pane
  tabPane: {
    height: '100%',
    overflow: 'auto',
    padding: '24px',
  },

  // Tasks Tab
  tasksTab: {
    height: '100%',
    overflow: 'auto',
    padding: '24px',
  },
  tasksGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 380px',
    gap: '24px',
    height: '100%',
  },
  tasksMain: {},
  tasksAside: {},

  // Voice Tab
  voiceTab: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
  },
  chatMessages: {
    flex: 1,
    overflowY: 'auto',
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  emptyChat: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    color: 'rgba(255,255,255,0.4)',
  },
  emptyChatIcon: {
    fontSize: '64px',
    marginBottom: '16px',
  },
  emptyChatTitle: {
    color: '#fff',
    fontSize: '1.25rem',
    fontWeight: 600,
    margin: '0 0 8px 0',
  },
  emptyChatText: {
    fontSize: '0.9rem',
    margin: 0,
  },
  chatBubble: {
    padding: '12px 16px',
    borderRadius: '16px',
    maxWidth: '70%',
    fontSize: '0.9rem',
    lineHeight: 1.5,
  },
  chatBubbleUser: {
    alignSelf: 'flex-end',
    background: '#667eea',
    color: '#fff',
    borderBottomRightRadius: '4px',
  },
  chatBubbleAssistant: {
    alignSelf: 'flex-start',
    background: '#1e1e2e',
    color: '#fff',
    borderBottomLeftRadius: '4px',
  },
  transcript: {
    padding: '12px 24px',
    background: 'rgba(102,126,234,0.1)',
    color: '#667eea',
    fontSize: '0.85rem',
  },
  voiceInput: {
    padding: '16px 24px',
    borderTop: '1px solid rgba(255,255,255,0.1)',
    display: 'flex',
    gap: '12px',
    background: '#0d0d15',
  },
  micButton: {
    padding: '14px 24px',
    borderRadius: '12px',
    border: 'none',
    cursor: 'pointer',
    fontWeight: 600,
    color: '#fff',
    fontSize: '0.9rem',
    whiteSpace: 'nowrap',
  },
  textInput: {
    flex: 1,
    padding: '14px 18px',
    background: '#1a1a2e',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '12px',
    color: '#fff',
    fontSize: '0.9rem',
    outline: 'none',
  },
  sendButton: {
    padding: '14px 28px',
    background: '#667eea',
    border: 'none',
    borderRadius: '12px',
    color: '#fff',
    fontWeight: 600,
    fontSize: '0.9rem',
    cursor: 'pointer',
  },
};
