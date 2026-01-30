'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import AgentsPanel from './AgentsPanel';
import SkillsPanel from './SkillsPanel';
import ActiveTasksPanel, { Task } from './ActiveTasksPanel';
import OrchestrationStatus from './OrchestrationStatus';
import CronsPanel from './CronsPanel';
import ActivityFeed from './ActivityFeed';
import CommandPalette, { ShortcutsHelp } from './CommandPalette';
import { useKeyboardShortcuts, ViewId } from '../hooks/useKeyboardShortcuts';
import { useTheme } from '../contexts/ThemeContext';
import { useSounds } from '../hooks/useSounds';
import { useBottomNav } from '../hooks/useMobileGestures';
import MemoryPanel from './MemoryPanel';
import WorkspaceBrowser from './WorkspaceBrowser';
import CalendarWidget from './CalendarWidget';
import EmailWidget from './EmailWidget';
import QuickActionsPanel from './QuickActionsPanel';
import AnalyticsDashboard from './AnalyticsDashboard';

// Persistence helpers
function getSessionId(): string {
  if (typeof window === 'undefined') return 'server';
  let id = localStorage.getItem('opie-session-id');
  if (!id) {
    id = `2ndbrain-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    localStorage.setItem('opie-session-id', id);
  }
  return id;
}

function getSavedView(): string {
  if (typeof window === 'undefined') return 'dashboard';
  return localStorage.getItem('opie-active-view') || 'dashboard';
}

function saveView(view: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('opie-active-view', view);
  }
}

function getSidebarState(): boolean {
  if (typeof window === 'undefined') return true;
  const saved = localStorage.getItem('opie-sidebar-expanded');
  return saved === null ? true : saved === 'true';
}

function saveSidebarState(expanded: boolean): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('opie-sidebar-expanded', String(expanded));
  }
}

// ViewId is now imported from useKeyboardShortcuts

interface NavItem {
  id: ViewId;
  label: string;
  icon: string;
  showCount?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: '📊' },
  { id: 'agents', label: 'Agents', icon: '🤖', showCount: true },
  { id: 'skills', label: 'Skills', icon: '🛠️' },
  { id: 'tasks', label: 'Tasks', icon: '📋', showCount: true },
  { id: 'crons', label: 'Crons', icon: '⏰', showCount: true },
  { id: 'voice', label: 'Voice', icon: '🎤' },
  { id: 'memory', label: 'Memory', icon: '🧠' },
  { id: 'settings', label: 'Settings', icon: '⚙️' },
];

// Floating Chat Component with Voice + Minimize + Fullscreen + Popout
function FloatingChat({ 
  messages, 
  input, 
  setInput, 
  isLoading, 
  onSend,
  micOn,
  onMicToggle,
  isSpeaking,
  transcript,
}: {
  messages: {role: string; text: string}[];
  input: string;
  setInput: (val: string) => void;
  isLoading: boolean;
  onSend: () => void;
  micOn: boolean;
  onMicToggle: () => void;
  isSpeaking: boolean;
  transcript: string;
}) {
  const [mode, setMode] = useState<'closed' | 'minimized' | 'open' | 'fullscreen'>('closed');
  const [size, setSize] = useState({ width: 380, height: 500 });
  const [poppedOut, setPoppedOut] = useState(false);
  const popoutWindowRef = useRef<Window | null>(null);

  // Handle popout window
  const handlePopout = () => {
    const width = 420;
    const height = 600;
    const left = window.screenX + window.outerWidth - width - 50;
    const top = window.screenY + 50;
    
    const popout = window.open(
      '',
      'opie-chat',
      `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=no,toolbar=no,menubar=no,location=no,status=no`
    );
    
    if (popout) {
      popoutWindowRef.current = popout;
      setPoppedOut(true);
      setMode('closed');
      
      // Write the popout HTML
      popout.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Opie Voice Chat</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              background: #0d0d1a; 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              height: 100vh;
              overflow: hidden;
            }
            #chat-root { height: 100%; display: flex; flex-direction: column; }
            .header {
              padding: 16px;
              border-bottom: 1px solid rgba(255,255,255,0.1);
              display: flex;
              align-items: center;
              gap: 12px;
              background: rgba(255,255,255,0.02);
            }
            .header img { width: 40px; height: 40px; border-radius: 50%; }
            .header .info { flex: 1; }
            .header .name { color: #fff; font-weight: 600; font-size: 1.1rem; }
            .header .status { color: rgba(255,255,255,0.5); font-size: 0.8rem; }
            .messages {
              flex: 1;
              overflow-y: auto;
              padding: 16px;
              display: flex;
              flex-direction: column;
              gap: 12px;
            }
            .msg {
              max-width: 85%;
              padding: 12px 16px;
              border-radius: 16px;
              color: #fff;
              font-size: 0.95rem;
              line-height: 1.5;
            }
            .msg.user {
              align-self: flex-end;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              border-radius: 16px 16px 4px 16px;
            }
            .msg.assistant {
              align-self: flex-start;
              background: rgba(255,255,255,0.08);
              border-radius: 16px 16px 16px 4px;
            }
            .input-area {
              padding: 16px;
              border-top: 1px solid rgba(255,255,255,0.1);
              display: flex;
              gap: 10px;
              align-items: center;
            }
            .mic-btn {
              width: 50px;
              height: 50px;
              border-radius: 50%;
              border: none;
              background: rgba(255,255,255,0.1);
              color: #fff;
              font-size: 22px;
              cursor: pointer;
              transition: all 0.2s;
            }
            .mic-btn.active { background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); }
            .mic-btn:hover { transform: scale(1.05); }
            textarea {
              flex: 1;
              padding: 14px;
              background: rgba(255,255,255,0.05);
              border: 1px solid rgba(255,255,255,0.1);
              border-radius: 12px;
              color: #fff;
              font-size: 0.95rem;
              resize: none;
              outline: none;
              min-height: 50px;
            }
            textarea::placeholder { color: rgba(255,255,255,0.3); }
            .send-btn {
              padding: 14px 24px;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              border: none;
              border-radius: 12px;
              color: #fff;
              font-weight: 600;
              cursor: pointer;
              transition: all 0.2s;
            }
            .send-btn:hover { transform: scale(1.02); }
            .send-btn:disabled { opacity: 0.5; cursor: not-allowed; }
            .empty {
              text-align: center;
              color: rgba(255,255,255,0.4);
              padding: 60px 20px;
            }
            .empty img { width: 80px; height: 80px; border-radius: 50%; margin-bottom: 20px; opacity: 0.8; }
          </style>
        </head>
        <body>
          <div id="chat-root">
            <div class="header">
              <img src="${window.location.origin}/opie-avatar.png" alt="Opie" />
              <div class="info">
                <div class="name">Opie ⚡</div>
                <div class="status" id="status">Online</div>
              </div>
            </div>
            <div class="messages" id="messages">
              <div class="empty">
                <img src="${window.location.origin}/opie-avatar.png" alt="Opie" />
                <p>Popout chat ready!<br/>Messages sync with main window.</p>
              </div>
            </div>
            <div class="input-area">
              <button class="mic-btn" id="mic-btn">🎤</button>
              <textarea id="input" placeholder="Type a message..." rows="1"></textarea>
              <button class="send-btn" id="send-btn">Send</button>
            </div>
          </div>
          <script>
            // Communicate with parent window
            window.addEventListener('message', (e) => {
              if (e.data.type === 'messages') {
                const container = document.getElementById('messages');
                if (e.data.messages.length === 0) {
                  container.innerHTML = '<div class="empty"><img src="${window.location.origin}/opie-avatar.png" alt="Opie" /><p>Hey! Type or tap the mic to talk.</p></div>';
                } else {
                  container.innerHTML = e.data.messages.map(m => 
                    '<div class="msg ' + m.role + '">' + m.text + '</div>'
                  ).join('');
                  container.scrollTop = container.scrollHeight;
                }
              } else if (e.data.type === 'status') {
                document.getElementById('status').textContent = e.data.text;
                document.getElementById('status').style.color = e.data.color || 'rgba(255,255,255,0.5)';
              } else if (e.data.type === 'micState') {
                const btn = document.getElementById('mic-btn');
                btn.classList.toggle('active', e.data.active);
              }
            });
            
            document.getElementById('send-btn').onclick = () => {
              const input = document.getElementById('input');
              if (input.value.trim()) {
                window.opener.postMessage({ type: 'send', text: input.value }, '*');
                input.value = '';
              }
            };
            
            document.getElementById('input').onkeydown = (e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                document.getElementById('send-btn').click();
              }
            };
            
            document.getElementById('mic-btn').onclick = () => {
              window.opener.postMessage({ type: 'toggleMic' }, '*');
            };
            
            window.onbeforeunload = () => {
              window.opener.postMessage({ type: 'popoutClosed' }, '*');
            };
          </script>
        </body>
        </html>
      `);
      popout.document.close();
      
      // Sync messages to popout
      popout.postMessage({ type: 'messages', messages }, '*');
    }
  };

  // Listen for messages from popout
  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      if (e.data.type === 'send') {
        setInput(e.data.text);
        setTimeout(() => onSend(), 50);
      } else if (e.data.type === 'toggleMic') {
        onMicToggle();
      } else if (e.data.type === 'popoutClosed') {
        setPoppedOut(false);
        popoutWindowRef.current = null;
        setMode('open');
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onSend, onMicToggle, setInput]);

  // Sync messages to popout window
  useEffect(() => {
    if (poppedOut && popoutWindowRef.current && !popoutWindowRef.current.closed) {
      popoutWindowRef.current.postMessage({ type: 'messages', messages }, '*');
    }
  }, [messages, poppedOut]);

  // Sync mic state to popout
  useEffect(() => {
    if (poppedOut && popoutWindowRef.current && !popoutWindowRef.current.closed) {
      popoutWindowRef.current.postMessage({ type: 'micState', active: micOn }, '*');
      const statusText = micOn ? '🎤 Listening' : isSpeaking ? '🔊 Speaking' : isLoading ? 'Thinking...' : 'Online';
      const statusColor = micOn ? '#22c55e' : isSpeaking ? '#f59e0b' : isLoading ? '#667eea' : 'rgba(255,255,255,0.5)';
      popoutWindowRef.current.postMessage({ type: 'status', text: statusText, color: statusColor }, '*');
    }
  }, [micOn, isSpeaking, isLoading, poppedOut]);
  const [isResizing, setIsResizing] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (chatEndRef.current && mode === 'open') {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, mode]);

  const handleResize = useCallback((e: MouseEvent) => {
    if (!isResizing) return;
    setSize(prev => ({
      width: Math.max(300, Math.min(600, prev.width - e.movementX)),
      height: Math.max(400, Math.min(800, prev.height - e.movementY)),
    }));
  }, [isResizing]);

  useEffect(() => {
    if (isResizing) {
      window.addEventListener('mousemove', handleResize);
      window.addEventListener('mouseup', () => setIsResizing(false));
      return () => {
        window.removeEventListener('mousemove', handleResize);
        window.removeEventListener('mouseup', () => setIsResizing(false));
      };
    }
  }, [isResizing, handleResize]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  // Closed state - floating button
  if (mode === 'closed') {
    return (
      <button
        onClick={() => setMode('open')}
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          width: '60px',
          height: '60px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          border: 'none',
          cursor: 'pointer',
          boxShadow: '0 4px 20px rgba(102, 126, 234, 0.4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '24px',
          zIndex: 1000,
          transition: 'transform 0.2s, box-shadow 0.2s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.1)';
          e.currentTarget.style.boxShadow = '0 6px 30px rgba(102, 126, 234, 0.6)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
          e.currentTarget.style.boxShadow = '0 4px 20px rgba(102, 126, 234, 0.4)';
        }}
      >
        ⚡
      </button>
    );
  }

  // Minimized state - small tab
  if (mode === 'minimized') {
    return (
      <button
        onClick={() => setMode('open')}
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          padding: '12px 20px',
          borderRadius: '24px',
          background: micOn 
            ? 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)' 
            : isSpeaking 
              ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
              : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          border: 'none',
          cursor: 'pointer',
          boxShadow: '0 4px 20px rgba(102, 126, 234, 0.4)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          zIndex: 1000,
          transition: 'all 0.3s ease',
        }}
      >
        <img 
          src="/opie-avatar.png" 
          alt="Opie" 
          style={{ width: '28px', height: '28px', borderRadius: '50%' }}
        />
        <span style={{ color: '#fff', fontWeight: 600, fontSize: '0.9rem' }}>
          {micOn ? '🎤 Listening...' : isSpeaking ? '🔊 Speaking' : 'Opie'}
        </span>
        {messages.length > 0 && (
          <span style={{
            background: 'rgba(255,255,255,0.2)',
            padding: '2px 8px',
            borderRadius: '12px',
            fontSize: '0.75rem',
            color: '#fff',
          }}>
            {messages.length}
          </span>
        )}
      </button>
    );
  }

  // Open/Fullscreen state - chat window
  const isFullscreen = mode === 'fullscreen';
  
  return (
    <div
      style={{
        position: 'fixed',
        bottom: isFullscreen ? '0' : '24px',
        right: isFullscreen ? '0' : '24px',
        top: isFullscreen ? '0' : 'auto',
        left: isFullscreen ? '0' : 'auto',
        width: isFullscreen ? '100%' : `${size.width}px`,
        height: isFullscreen ? '100%' : `${size.height}px`,
        background: '#0d0d1a',
        borderRadius: isFullscreen ? '0' : '16px',
        border: isFullscreen ? 'none' : '1px solid rgba(255,255,255,0.1)',
        boxShadow: isFullscreen ? 'none' : '0 10px 40px rgba(0,0,0,0.5)',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 1000,
        overflow: 'hidden',
        transition: 'all 0.3s ease',
      }}
    >
      {/* Resize Handle */}
      <div
        onMouseDown={() => setIsResizing(true)}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '20px',
          height: '20px',
          cursor: 'nw-resize',
          zIndex: 10,
        }}
      />
      
      {/* Header */}
      <div style={{
        padding: '12px 16px',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: 'rgba(255,255,255,0.02)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <img 
            src="/opie-avatar.png" 
            alt="Opie" 
            style={{ width: '32px', height: '32px', borderRadius: '50%' }}
          />
          <div>
            <span style={{ color: '#fff', fontWeight: 600, display: 'block' }}>Opie</span>
            <span style={{ 
              color: micOn ? '#22c55e' : isSpeaking ? '#f59e0b' : isLoading ? '#667eea' : 'rgba(255,255,255,0.4)', 
              fontSize: '0.75rem' 
            }}>
              {micOn ? '🎤 Listening' : isSpeaking ? '🔊 Speaking' : isLoading ? 'Thinking...' : 'Online'}
            </span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          <button
            onClick={handlePopout}
            title="Pop out to separate window"
            style={{
              background: 'rgba(255,255,255,0.1)',
              border: 'none',
              color: 'rgba(255,255,255,0.6)',
              cursor: 'pointer',
              fontSize: '14px',
              padding: '6px 10px',
              borderRadius: '8px',
            }}
          >
            ↗️
          </button>
          <button
            onClick={() => setMode(mode === 'fullscreen' ? 'open' : 'fullscreen')}
            title={mode === 'fullscreen' ? 'Exit fullscreen' : 'Fullscreen'}
            style={{
              background: mode === 'fullscreen' ? 'rgba(102, 126, 234, 0.3)' : 'rgba(255,255,255,0.1)',
              border: 'none',
              color: mode === 'fullscreen' ? '#667eea' : 'rgba(255,255,255,0.6)',
              cursor: 'pointer',
              fontSize: '14px',
              padding: '6px 10px',
              borderRadius: '8px',
            }}
          >
            {mode === 'fullscreen' ? '⊙' : '⛶'}
          </button>
          <button
            onClick={() => setMode('minimized')}
            title="Minimize"
            style={{
              background: 'rgba(255,255,255,0.1)',
              border: 'none',
              color: 'rgba(255,255,255,0.6)',
              cursor: 'pointer',
              fontSize: '14px',
              padding: '6px 10px',
              borderRadius: '8px',
            }}
          >
            ─
          </button>
          <button
            onClick={() => setMode('closed')}
            title="Close"
            style={{
              background: 'rgba(239,68,68,0.2)',
              border: 'none',
              color: '#ef4444',
              cursor: 'pointer',
              fontSize: '16px',
              padding: '6px 12px',
              borderRadius: '8px',
              fontWeight: 'bold',
            }}
          >
            ✕
          </button>
        </div>
      </div>

      {/* Messages */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
      }}>
        {messages.length === 0 && (
          <div style={{
            textAlign: 'center',
            color: 'rgba(255,255,255,0.4)',
            padding: '40px 20px',
          }}>
            <img 
              src="/opie-avatar.png" 
              alt="Opie" 
              style={{ width: '64px', height: '64px', borderRadius: '50%', marginBottom: '16px', opacity: 0.8 }}
            />
            <p style={{ margin: 0 }}>Hey! Type or tap the mic to talk.</p>
          </div>
        )}
        {messages.map((msg, i) => (
          <div
            key={i}
            style={{
              alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
              maxWidth: '85%',
              padding: '12px 16px',
              borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
              background: msg.role === 'user' 
                ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                : 'rgba(255,255,255,0.08)',
              color: '#fff',
              fontSize: '0.9rem',
              lineHeight: 1.5,
            }}
          >
            {msg.text}
          </div>
        ))}
        {transcript && (
          <div style={{
            alignSelf: 'flex-end',
            maxWidth: '85%',
            padding: '12px 16px',
            borderRadius: '16px 16px 4px 16px',
            background: 'rgba(102, 126, 234, 0.3)',
            color: 'rgba(255,255,255,0.7)',
            fontSize: '0.9rem',
            fontStyle: 'italic',
          }}>
            {transcript}...
          </div>
        )}
        {isLoading && (
          <div style={{
            alignSelf: 'flex-start',
            padding: '12px 16px',
            borderRadius: '16px 16px 16px 4px',
            background: 'rgba(255,255,255,0.08)',
            color: 'rgba(255,255,255,0.5)',
          }}>
            Thinking...
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Input Area */}
      <div style={{
        padding: '12px 16px',
        borderTop: '1px solid rgba(255,255,255,0.1)',
        display: 'flex',
        gap: '10px',
        alignItems: 'flex-end',
      }}>
        {/* Mic Button */}
        <button
          onClick={onMicToggle}
          style={{
            width: '44px',
            height: '44px',
            borderRadius: '50%',
            border: 'none',
            background: micOn 
              ? 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)' 
              : 'rgba(255,255,255,0.1)',
            color: '#fff',
            fontSize: '18px',
            cursor: 'pointer',
            flexShrink: 0,
            transition: 'all 0.2s ease',
          }}
        >
          🎤
        </button>
        
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          style={{
            flex: 1,
            padding: '12px',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '12px',
            color: '#fff',
            fontSize: '0.9rem',
            resize: 'none',
            outline: 'none',
            minHeight: '44px',
            maxHeight: '120px',
          }}
          rows={1}
        />
        <button
          onClick={onSend}
          disabled={isLoading || !input.trim()}
          style={{
            padding: '12px 20px',
            background: input.trim() ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 'rgba(255,255,255,0.1)',
            border: 'none',
            borderRadius: '12px',
            color: '#fff',
            fontWeight: 600,
            cursor: input.trim() ? 'pointer' : 'not-allowed',
            opacity: input.trim() ? 1 : 0.5,
            height: '44px',
          }}
        >
          Send
        </button>
      </div>
    </div>
  );
}

export default function OpieKanban(): React.ReactElement {
  const [messages, setMessages] = useState<{role: string; text: string}[]>([]);
  const [input, setInput] = useState('');
  const [micOn, setMicOn] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string>('');
  const [activeView, setActiveView] = useState<ViewId>('dashboard');
  const [sidebarExpanded, setSidebarExpanded] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
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
  const [cronCount, setCronCount] = useState<number>(4); // Will be updated from API
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [shortcutsHelpOpen, setShortcutsHelpOpen] = useState(false);
  
  const recognitionRef = useRef<any>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const micOnRef = useRef(false);
  const chatInputRef = useRef<HTMLInputElement>(null);
  
  // Theme, sounds, and mobile hooks
  const { theme, themeName, toggleTheme } = useTheme();
  const { soundsEnabled, toggleSounds, playNotification, playSuccess } = useSounds();
  const bottomNavVisible = useBottomNav();

  // Load saved state on mount
  useEffect(() => {
    setActiveView(getSavedView() as ViewId);
    setSidebarExpanded(getSidebarState());
    
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  const handleViewChange = useCallback((view: ViewId) => {
    setActiveView(view);
    saveView(view);
    if (isMobile) setMobileMenuOpen(false);
  }, [isMobile]);

  // Keyboard shortcuts
  useKeyboardShortcuts({
    onNavigate: handleViewChange,
    onOpenCommandPalette: () => setCommandPaletteOpen(true),
    onNewMessage: () => {
      // Focus the floating chat or open it
      setActiveView('voice');
    },
    onCloseModal: () => {
      if (commandPaletteOpen) setCommandPaletteOpen(false);
      else if (shortcutsHelpOpen) setShortcutsHelpOpen(false);
      else if (mobileMenuOpen) setMobileMenuOpen(false);
    },
    onShowHelp: () => setShortcutsHelpOpen(true),
  });

  const toggleSidebar = () => {
    const newState = !sidebarExpanded;
    setSidebarExpanded(newState);
    saveSidebarState(newState);
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
    setActiveAgents(prev => prev.includes(agentId) ? prev : [...prev, agentId]);
    
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
    handleViewChange('tasks');
  };

  const columns = [
    { id: 'todo', title: 'To Do', color: '#f59e0b', tasks: ['Memory Integration', 'HeyGen Avatar', 'Email Automation'] },
    { id: 'progress', title: 'In Progress', color: '#667eea', tasks: ['Voice Chat', 'Agent Dashboard'] },
    { id: 'done', title: 'Done', color: '#22c55e', tasks: ['Dashboard UI', 'Chat API', 'TTS Integration', 'Skill Catalog'] }
  ];

  const runningTasksCount = tasks.filter(t => t.status === 'running').length;

  const getCount = (itemId: ViewId): number | null => {
    if (itemId === 'agents') return activeAgents.length;
    if (itemId === 'tasks') return runningTasksCount;
    if (itemId === 'crons') return cronCount;
    return null;
  };

  // Sidebar Component
  const Sidebar = () => (
    <aside style={{
      ...styles.sidebar,
      width: sidebarExpanded ? '240px' : '72px',
      ...(isMobile ? {
        position: 'fixed',
        left: mobileMenuOpen ? 0 : '-100%',
        width: '280px',
        zIndex: 1000,
      } : {}),
    }}>
      {/* Logo/Brand */}
      <div style={styles.sidebarHeader}>
        <div style={styles.logoContainer}>
          <img 
            src="/opie-avatar.png" 
            alt="Opie" 
            style={{
              width: sidebarExpanded ? '48px' : '36px',
              height: sidebarExpanded ? '48px' : '36px',
              borderRadius: '50%',
              objectFit: 'cover',
              border: '2px solid rgba(102, 126, 234, 0.5)',
              boxShadow: '0 0 20px rgba(102, 126, 234, 0.3)',
              transition: 'all 0.3s ease',
            }}
          />
          {sidebarExpanded && <span style={styles.brandName}>Opie</span>}
        </div>
        {!isMobile && (
          <button onClick={toggleSidebar} style={styles.collapseBtn}>
            {sidebarExpanded ? '◀' : '▶'}
          </button>
        )}
      </div>

      {/* Status */}
      {sidebarExpanded && (
        <div style={styles.statusBar}>
          <div style={{
            ...styles.statusDot,
            background: isSpeaking ? '#f59e0b' : isLoading ? '#667eea' : '#22c55e',
          }} />
          <span style={styles.statusText}>
            {isSpeaking ? 'Speaking' : isLoading ? 'Thinking' : 'Online'}
          </span>
        </div>
      )}

      {/* Navigation */}
      <nav style={styles.nav}>
        {NAV_ITEMS.map(item => {
          const count = getCount(item.id);
          const isActive = activeView === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => handleViewChange(item.id)}
              style={{
                ...styles.navItem,
                ...(isActive ? styles.navItemActive : {}),
                justifyContent: sidebarExpanded ? 'flex-start' : 'center',
              }}
              title={!sidebarExpanded ? item.label : undefined}
            >
              <span style={styles.navIcon}>{item.icon}</span>
              {sidebarExpanded && (
                <>
                  <span style={styles.navLabel}>{item.label}</span>
                  {count !== null && count > 0 && (
                    <span style={{
                      ...styles.navBadge,
                      background: item.id === 'tasks' ? 'rgba(245,158,11,0.2)' : 'rgba(34,197,94,0.2)',
                      color: item.id === 'tasks' ? '#f59e0b' : '#22c55e',
                    }}>
                      {count}
                    </span>
                  )}
                </>
              )}
              {!sidebarExpanded && count !== null && count > 0 && (
                <span style={styles.navBadgeCollapsed}>{count}</span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Quick Stats */}
      {sidebarExpanded && (
        <div style={styles.quickStats}>
          <div style={styles.statRow}>
            <span style={styles.statLabel}>Active Agents</span>
            <span style={{ ...styles.statValue, color: '#22c55e' }}>{activeAgents.length}</span>
          </div>
          <div style={styles.statRow}>
            <span style={styles.statLabel}>Running Tasks</span>
            <span style={{ ...styles.statValue, color: '#f59e0b' }}>{runningTasksCount}</span>
          </div>
          <div style={styles.statRow}>
            <span style={styles.statLabel}>Cron Jobs</span>
            <span style={{ ...styles.statValue, color: '#8b5cf6' }}>{cronCount}</span>
          </div>
          <div style={styles.statRow}>
            <span style={styles.statLabel}>Total Skills</span>
            <span style={{ ...styles.statValue, color: '#667eea' }}>25</span>
          </div>
        </div>
      )}

      {/* Footer */}
      <div style={styles.sidebarFooter}>
        {sidebarExpanded ? (
          <span style={styles.footerText}>Omnia Intelligence</span>
        ) : (
          <span style={styles.footerIcon}>🌟</span>
        )}
      </div>
    </aside>
  );

  // Mobile Header
  const MobileHeader = () => (
    <div style={styles.mobileHeader}>
      <button onClick={() => setMobileMenuOpen(true)} style={styles.hamburger}>
        ☰
      </button>
      <div style={styles.mobileTitle}>
        <span style={styles.mobileLogo}>⚡</span>
        <span>Opie</span>
      </div>
      <div style={{
        ...styles.mobileStatus,
        background: isSpeaking ? '#f59e0b' : isLoading ? '#667eea' : '#22c55e',
      }} />
    </div>
  );

  // Mobile Overlay
  const MobileOverlay = () => (
    mobileMenuOpen ? (
      <div style={styles.mobileOverlay} onClick={() => setMobileMenuOpen(false)} />
    ) : null
  );

  return (
    <div style={styles.container}>
      {isMobile && <MobileHeader />}
      {isMobile && <MobileOverlay />}
      <Sidebar />
      
      {/* Main Content */}
      <main style={{
        ...styles.main,
        marginLeft: isMobile ? 0 : (sidebarExpanded ? '240px' : '72px'),
        paddingTop: isMobile ? '60px' : 0,
      }}>
        {/* Dashboard View */}
        {activeView === 'dashboard' && (
          <div style={styles.viewContainer}>
            <div style={styles.viewHeader}>
              <h1 style={styles.viewTitle}>Dashboard</h1>
              <p style={styles.viewSubtitle}>Overview of your agent army operations</p>
            </div>
            
            {/* Quick Actions + Orchestration Row */}
            <div style={styles.dashboardTopRow}>
              <div style={styles.quickActionsWrapper}>
                <QuickActionsPanel 
                  onSendMessage={(message) => handleSend(message)}
                  onSpawnAgent={() => handleViewChange('agents')}
                />
              </div>
              <div style={styles.orchestrationWrapper}>
                <OrchestrationStatus activeAgents={activeAgents} />
              </div>
            </div>

            {/* Analytics Section */}
            <div style={styles.analyticsSection}>
              <AnalyticsDashboard />
            </div>
            
            <div style={styles.dashboardGrid}>
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
            </div>

            {/* Calendar & Email Widgets Row */}
            <div style={styles.widgetsRow}>
              <CalendarWidget />
              <EmailWidget />
            </div>

            {/* Live Activity Feed */}
            <div style={styles.activityFeedWrapper}>
              <ActivityFeed 
                maxItems={50}
                pollInterval={10000}
                isThinking={isLoading}
              />
            </div>
          </div>
        )}

        {/* Agents View */}
        {activeView === 'agents' && (
          <div style={styles.viewContainer}>
            <div style={styles.viewHeader}>
              <h1 style={styles.viewTitle}>Agent Army</h1>
              <p style={styles.viewSubtitle}>Deploy and manage your AI agents</p>
            </div>
            <AgentsPanel onDeploy={handleDeployAgent} activeAgents={activeAgents} />
          </div>
        )}

        {/* Skills View */}
        {activeView === 'skills' && (
          <div style={styles.viewContainer}>
            <div style={styles.viewHeader}>
              <h1 style={styles.viewTitle}>Skill Catalog</h1>
              <p style={styles.viewSubtitle}>Browse available capabilities</p>
            </div>
            <SkillsPanel />
          </div>
        )}

        {/* Tasks View */}
        {activeView === 'tasks' && (
          <div style={styles.viewContainer}>
            <div style={styles.viewHeader}>
              <h1 style={styles.viewTitle}>Active Tasks</h1>
              <p style={styles.viewSubtitle}>Monitor running operations</p>
            </div>
            <div style={styles.tasksGrid}>
              <ActiveTasksPanel tasks={tasks} />
              <OrchestrationStatus activeAgents={activeAgents} />
            </div>
          </div>
        )}

        {/* Crons View */}
        {activeView === 'crons' && (
          <div style={styles.viewContainer}>
            <div style={styles.viewHeader}>
              <h1 style={styles.viewTitle}>Scheduled Jobs</h1>
              <p style={styles.viewSubtitle}>Manage automated cron tasks</p>
            </div>
            <CronsPanel 
              pollInterval={30000}
              onCronCountChange={setCronCount}
            />
          </div>
        )}

        {/* Voice View */}
        {activeView === 'voice' && (
          <div style={styles.voiceContainer}>
            <div style={styles.chatMessages}>
              {messages.length === 0 && (
                <div style={styles.emptyChat}>
                  <div style={styles.emptyChatIcon}>🎤</div>
                  <h3 style={styles.emptyChatTitle}>Voice Chat with Opie</h3>
                  <p style={styles.emptyChatText}>Turn on the mic or type below to start</p>
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
              <div style={styles.transcript}>🎙️ Hearing: {transcript}</div>
            )}
            
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

        {/* Memory View */}
        {activeView === 'memory' && (
          <div style={styles.viewContainer}>
            <div style={styles.viewHeader}>
              <h1 style={styles.viewTitle}>Memory Bank</h1>
              <p style={styles.viewSubtitle}>Browse memories, daily notes, and workspace files</p>
            </div>
            <div style={styles.memoryGrid}>
              <MemoryPanel />
              <WorkspaceBrowser />
            </div>
          </div>
        )}

        {/* Settings View */}
        {activeView === 'settings' && (
          <div style={styles.viewContainer}>
            <div style={styles.viewHeader}>
              <h1 style={styles.viewTitle}>Settings</h1>
              <p style={styles.viewSubtitle}>Configure your Opie instance</p>
            </div>
            <div style={styles.settingsGrid}>
              <div style={styles.settingsCard}>
                <h4 style={styles.settingsCardTitle}>🔊 Voice Settings</h4>
                <div style={styles.settingItem}>
                  <span>TTS Voice</span>
                  <span style={styles.settingValue}>Default</span>
                </div>
                <div style={styles.settingItem}>
                  <span>Speech Speed</span>
                  <span style={styles.settingValue}>1.0x</span>
                </div>
              </div>
              <div style={styles.settingsCard}>
                <h4 style={styles.settingsCardTitle}>🤖 Agent Settings</h4>
                <div style={styles.settingItem}>
                  <span>Auto-deploy</span>
                  <span style={styles.settingValue}>Off</span>
                </div>
                <div style={styles.settingItem}>
                  <span>Max concurrent</span>
                  <span style={styles.settingValue}>5</span>
                </div>
              </div>
              <div style={styles.settingsCard}>
                <h4 style={styles.settingsCardTitle}>🎨 Appearance</h4>
                <div style={styles.settingItem}>
                  <span>Theme</span>
                  <span style={styles.settingValue}>Dark</span>
                </div>
                <div style={styles.settingItem}>
                  <span>Sidebar</span>
                  <span style={styles.settingValue}>{sidebarExpanded ? 'Expanded' : 'Collapsed'}</span>
                </div>
              </div>
              <div style={styles.settingsCard}>
                <h4 style={styles.settingsCardTitle}>🔑 API Keys</h4>
                <div style={styles.settingItem}>
                  <span>OpenAI</span>
                  <span style={{ ...styles.settingValue, color: '#22c55e' }}>Connected</span>
                </div>
                <div style={styles.settingItem}>
                  <span>ElevenLabs</span>
                  <span style={{ ...styles.settingValue, color: '#22c55e' }}>Connected</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Floating Chat Box */}
      <FloatingChat 
        messages={messages}
        input={input}
        setInput={setInput}
        isLoading={isLoading}
        onSend={() => handleSend(input)}
        micOn={micOn}
        onMicToggle={toggleMic}
        isSpeaking={isSpeaking}
        transcript={transcript}
      />

      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 0.5; }
          50% { transform: scale(1.1); opacity: 0.8; }
        }
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    display: 'flex',
    minHeight: '100vh',
    background: '#0f0f1a',
  },

  // Sidebar
  sidebar: {
    position: 'fixed',
    top: 0,
    left: 0,
    height: '100vh',
    background: '#0d0d15',
    borderRight: '1px solid rgba(255,255,255,0.08)',
    display: 'flex',
    flexDirection: 'column',
    transition: 'all 0.3s ease',
    zIndex: 100,
  },
  sidebarHeader: {
    padding: '20px 16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottom: '1px solid rgba(255,255,255,0.08)',
  },
  logoContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  logo: {
    width: '40px',
    height: '40px',
    borderRadius: '12px',
    background: 'linear-gradient(135deg, #667eea, #764ba2)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '20px',
  },
  brandName: {
    color: '#fff',
    fontSize: '1.25rem',
    fontWeight: 700,
  },
  collapseBtn: {
    width: '28px',
    height: '28px',
    borderRadius: '6px',
    border: 'none',
    background: 'rgba(255,255,255,0.05)',
    color: 'rgba(255,255,255,0.5)',
    cursor: 'pointer',
    fontSize: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusBar: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 20px',
    background: 'rgba(255,255,255,0.02)',
  },
  statusDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
  },
  statusText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: '0.8rem',
  },
  nav: {
    flex: 1,
    padding: '16px 12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  navItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 14px',
    borderRadius: '10px',
    border: 'none',
    background: 'transparent',
    color: 'rgba(255,255,255,0.6)',
    fontSize: '0.9rem',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    position: 'relative',
    textAlign: 'left',
    width: '100%',
  },
  navItemActive: {
    background: 'rgba(102,126,234,0.15)',
    color: '#fff',
  },
  navIcon: {
    fontSize: '1.2rem',
    width: '24px',
    textAlign: 'center',
  },
  navLabel: {
    flex: 1,
    fontWeight: 500,
  },
  navBadge: {
    padding: '2px 8px',
    borderRadius: '10px',
    fontSize: '0.75rem',
    fontWeight: 600,
  },
  navBadgeCollapsed: {
    position: 'absolute',
    top: '6px',
    right: '6px',
    background: '#f59e0b',
    color: '#000',
    fontSize: '0.6rem',
    fontWeight: 700,
    padding: '2px 5px',
    borderRadius: '8px',
    minWidth: '16px',
    textAlign: 'center',
  },
  quickStats: {
    padding: '16px',
    margin: '0 12px',
    background: 'rgba(255,255,255,0.03)',
    borderRadius: '12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  statRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statLabel: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: '0.8rem',
  },
  statValue: {
    fontWeight: 700,
    fontSize: '0.9rem',
  },
  sidebarFooter: {
    padding: '16px',
    borderTop: '1px solid rgba(255,255,255,0.08)',
    textAlign: 'center',
  },
  footerText: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: '0.75rem',
  },
  footerIcon: {
    fontSize: '16px',
    opacity: 0.5,
  },

  // Mobile
  mobileHeader: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    height: '60px',
    background: '#0d0d15',
    borderBottom: '1px solid rgba(255,255,255,0.08)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 16px',
    zIndex: 50,
  },
  hamburger: {
    width: '40px',
    height: '40px',
    background: 'transparent',
    border: 'none',
    color: '#fff',
    fontSize: '24px',
    cursor: 'pointer',
  },
  mobileTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    color: '#fff',
    fontWeight: 600,
  },
  mobileLogo: {
    fontSize: '20px',
  },
  mobileStatus: {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
  },
  mobileOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.6)',
    zIndex: 99,
  },

  // Main Content
  main: {
    flex: 1,
    minHeight: '100vh',
    transition: 'margin-left 0.3s ease',
  },
  viewContainer: {
    padding: '32px',
    maxWidth: '1400px',
  },
  viewHeader: {
    marginBottom: '28px',
  },
  viewTitle: {
    color: '#fff',
    fontSize: '1.75rem',
    fontWeight: 700,
    margin: '0 0 6px 0',
  },
  viewSubtitle: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: '0.95rem',
    margin: 0,
  },

  // Dashboard
  dashboardTopRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 380px',
    gap: '24px',
    marginBottom: '24px',
  },
  quickActionsWrapper: {
    minWidth: 0,
  },
  orchestrationWrapper: {
    minWidth: 0,
  },
  analyticsSection: {
    marginBottom: '24px',
  },
  dashboardGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr',
    gap: '24px',
    marginBottom: '24px',
  },
  kanbanSection: {
    background: '#1a1a2e',
    borderRadius: '16px',
    padding: '20px',
    border: '1px solid rgba(255,255,255,0.08)',
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
    gap: '14px',
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
  widgetsRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '24px',
    marginBottom: '24px',
  },
  activityFeedWrapper: {
    marginTop: '24px',
  },
  recentActivity: {
    background: '#1a1a2e',
    borderRadius: '16px',
    padding: '20px',
    border: '1px solid rgba(255,255,255,0.08)',
  },
  activityList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
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

  // Tasks Grid
  tasksGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 380px',
    gap: '24px',
  },

  // Voice
  voiceContainer: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
  },
  chatMessages: {
    flex: 1,
    overflowY: 'auto',
    padding: '32px',
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
    fontSize: '72px',
    marginBottom: '20px',
  },
  emptyChatTitle: {
    color: '#fff',
    fontSize: '1.5rem',
    fontWeight: 600,
    margin: '0 0 8px 0',
  },
  emptyChatText: {
    fontSize: '1rem',
    margin: 0,
  },
  chatBubble: {
    padding: '14px 18px',
    borderRadius: '18px',
    maxWidth: '65%',
    fontSize: '0.95rem',
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
    padding: '14px 32px',
    background: 'rgba(102,126,234,0.1)',
    color: '#667eea',
    fontSize: '0.9rem',
  },
  voiceInput: {
    padding: '20px 32px',
    borderTop: '1px solid rgba(255,255,255,0.1)',
    display: 'flex',
    gap: '12px',
    background: '#0d0d15',
  },
  micButton: {
    padding: '16px 28px',
    borderRadius: '14px',
    border: 'none',
    cursor: 'pointer',
    fontWeight: 600,
    color: '#fff',
    fontSize: '0.95rem',
    whiteSpace: 'nowrap',
  },
  textInput: {
    flex: 1,
    padding: '16px 20px',
    background: '#1a1a2e',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '14px',
    color: '#fff',
    fontSize: '0.95rem',
    outline: 'none',
  },
  sendButton: {
    padding: '16px 32px',
    background: '#667eea',
    border: 'none',
    borderRadius: '14px',
    color: '#fff',
    fontWeight: 600,
    fontSize: '0.95rem',
    cursor: 'pointer',
  },

  // Memory Browser
  memoryGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '24px',
  },

  // Settings
  settingsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '20px',
  },
  settingsCard: {
    background: '#1a1a2e',
    borderRadius: '16px',
    padding: '24px',
    border: '1px solid rgba(255,255,255,0.08)',
  },
  settingsCardTitle: {
    color: '#fff',
    fontSize: '1rem',
    fontWeight: 600,
    margin: '0 0 20px 0',
  },
  settingItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 0',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
    color: 'rgba(255,255,255,0.7)',
    fontSize: '0.9rem',
  },
  settingValue: {
    color: 'rgba(255,255,255,0.5)',
    fontWeight: 500,
  },
};
