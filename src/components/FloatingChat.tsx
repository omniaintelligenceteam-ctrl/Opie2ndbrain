'use client';
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';

// ============================================================================
// Types
// ============================================================================

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: Date;
  status?: 'sending' | 'sent' | 'delivered' | 'read' | 'error';
}

type ChatMode = 'closed' | 'minimized' | 'open' | 'fullscreen';
type VoiceState = 'idle' | 'listening' | 'processing' | 'speaking' | 'working';

interface FloatingChatProps {
  messages: ChatMessage[];
  input: string;
  setInput: (val: string) => void;
  isLoading: boolean;
  isWorking?: boolean;
  onSend: (text?: string) => void;
  micOn: boolean;
  onMicToggle: () => void;
  isSpeaking: boolean;
  transcript: string;
  onCancelProcessing?: () => void;
}

// ============================================================================
// Utility Functions
// ============================================================================

function generateId(): string {
  return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function formatTime(date: Date, mounted: boolean): string {
  if (!mounted) return '...';
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

function formatRelativeTime(date: Date, mounted: boolean): string {
  if (!mounted) return '...';
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

function shouldGroupMessages(current: ChatMessage, previous?: ChatMessage): boolean {
  if (!previous) return false;
  if (current.role !== previous.role) return false;
  const timeDiff = current.timestamp.getTime() - previous.timestamp.getTime();
  return timeDiff < 60000; // Group if within 1 minute
}

// Simple markdown-like rendering (links, bold, code)
function renderMessageText(text: string): React.ReactNode {
  // Code blocks
  const parts = text.split(/(```[\s\S]*?```|`[^`]+`)/g);
  
  return parts.map((part, i) => {
    // Multi-line code block
    if (part.startsWith('```') && part.endsWith('```')) {
      const code = part.slice(3, -3).replace(/^\w+\n/, ''); // Remove language hint
      return (
        <pre key={i} style={styles.codeBlock}>
          <code>{code}</code>
        </pre>
      );
    }
    // Inline code
    if (part.startsWith('`') && part.endsWith('`')) {
      return <code key={i} style={styles.inlineCode}>{part.slice(1, -1)}</code>;
    }
    // Regular text with bold and links
    return (
      <span key={i}>
        {part.split(/(\*\*[^*]+\*\*|\bhttps?:\/\/\S+)/g).map((segment, j) => {
          if (segment.startsWith('**') && segment.endsWith('**')) {
            return <strong key={j}>{segment.slice(2, -2)}</strong>;
          }
          if (segment.match(/^https?:\/\//)) {
            return (
              <a 
                key={j}
                href={segment}
                target="_blank"
                rel="noopener noreferrer"
                style={styles.link}
                onClick={(e) => e.stopPropagation()}
              >
                {segment}
              </a>
            );
          }
          return segment;
        })}
      </span>
    );
  });
}

// ============================================================================
// Sub-Components
// ============================================================================

// Avatar Component
function Avatar({ size = 32 }: { size?: number }) {
  return (
    <img
      src="/opie-avatar.png"
      alt="Opie"
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        objectFit: 'cover',
        border: '2px solid rgba(102, 126, 234, 0.3)',
        flexShrink: 0,
      }}
    />
  );
}

// Status Indicator
function StatusIndicator({ state, size = 8 }: { state: VoiceState; size?: number }) {
  const colors: Record<VoiceState, string> = {
    idle: '#22c55e',
    listening: '#22c55e',
    processing: '#667eea',
    speaking: '#f59e0b',
    working: '#f97316',
  };
  
  const shouldPulse = state === 'listening' || state === 'processing';
  
  return (
    <span
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: colors[state],
        display: 'inline-block',
        animation: shouldPulse ? 'statusPulse 1.5s ease-in-out infinite' : 'none',
      }}
    />
  );
}

// Voice Waveform Animation
function VoiceWaveform({ active, color = '#22c55e' }: { active: boolean; color?: string }) {
  return (
    <div style={styles.waveformContainer}>
      {[...Array(5)].map((_, i) => (
        <div
          key={i}
          style={{
            ...styles.waveformBar,
            background: color,
            animationDelay: `${i * 0.1}s`,
            animationPlayState: active ? 'running' : 'paused',
            height: active ? undefined : '4px',
          }}
        />
      ))}
    </div>
  );
}

// Typing Indicator
function TypingIndicator() {
  return (
    <div style={styles.typingContainer}>
      <Avatar size={28} />
      <div style={styles.typingBubble}>
        <div style={styles.typingDots}>
          <span style={{ ...styles.typingDot, animationDelay: '0s' }} />
          <span style={{ ...styles.typingDot, animationDelay: '0.2s' }} />
          <span style={{ ...styles.typingDot, animationDelay: '0.4s' }} />
        </div>
      </div>
    </div>
  );
}

// Message Status Icon
function MessageStatus({ status }: { status?: ChatMessage['status'] }) {
  if (!status || status === 'sending') {
    return <span style={styles.messageStatus}>○</span>;
  }
  if (status === 'sent') {
    return <span style={styles.messageStatus}>✓</span>;
  }
  if (status === 'delivered') {
    return <span style={styles.messageStatus}>✓✓</span>;
  }
  if (status === 'read') {
    return <span style={{ ...styles.messageStatus, color: '#667eea' }}>✓✓</span>;
  }
  if (status === 'error') {
    return <span style={{ ...styles.messageStatus, color: '#ef4444' }}>!</span>;
  }
  return null;
}

// Copy Button
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  
  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };
  
  return (
    <button
      onClick={handleCopy}
      style={styles.copyButton}
      title={copied ? 'Copied!' : 'Copy message'}
    >
      {copied ? '✓' : '⎘'}
    </button>
  );
}

// Quick Action Button
function QuickAction({ emoji, label, onClick }: { emoji: string; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} style={styles.quickAction}>
      <span>{emoji}</span>
      <span>{label}</span>
    </button>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export default function FloatingChat({
  messages,
  input,
  setInput,
  isLoading,
  isWorking = false,
  onSend,
  micOn,
  onMicToggle,
  isSpeaking,
  transcript,
  onCancelProcessing,
}: FloatingChatProps): React.ReactElement {
  // State
  const [mode, setMode] = useState<ChatMode>('closed');
  const [size, setSize] = useState({ width: 400, height: 550 });
  const [unreadCount, setUnreadCount] = useState(0);
  const [isResizing, setIsResizing] = useState(false);
  const [showEmojiHint, setShowEmojiHint] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [isDetached, setIsDetached] = useState(false);
  const [mounted, setMounted] = useState(false);
  const detachedWindowRef = useRef<Window | null>(null);

  // Track mounted state for hydration-safe date formatting
  useEffect(() => {
    setMounted(true);
  }, []);
  
  // Refs
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastMessageCount = useRef(messages.length);
  
  // Computed
  const voiceState: VoiceState = useMemo(() => {
    if (isSpeaking) return 'speaking';
    if (isLoading) return 'processing';
    if (micOn) return 'listening';
    if (isWorking) return 'working';
    return 'idle';
  }, [micOn, isLoading, isSpeaking, isWorking]);

  const statusText = useMemo(() => {
    switch (voiceState) {
      case 'listening': return '🎤 Listening...';
      case 'processing': return '✨ Thinking...';
      case 'speaking': return '🔊 Speaking...';
      case 'working': return '🔧 Working...';
      default: return '● Online';
    }
  }, [voiceState]);

  // Effects
  useEffect(() => {
    if (mode === 'open' || mode === 'fullscreen') {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      setUnreadCount(0);
    } else if (messages.length > lastMessageCount.current) {
      // New message while minimized/closed
      const newMessages = messages.length - lastMessageCount.current;
      const hasAssistantMessage = messages.slice(-newMessages).some(m => m.role === 'assistant');
      if (hasAssistantMessage) {
        setUnreadCount(prev => prev + 1);
      }
    }
    lastMessageCount.current = messages.length;
  }, [messages, mode]);

  // Auto-resize textarea
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = '0';
      inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 120) + 'px';
    }
  }, [input]);

  // Focus input when opening
  useEffect(() => {
    if ((mode === 'open' || mode === 'fullscreen') && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [mode]);

  // Handle resize
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing) return;
    setSize(prev => ({
      width: Math.max(320, Math.min(600, prev.width - e.movementX)),
      height: Math.max(450, Math.min(800, prev.height - e.movementY)),
    }));
  }, [isResizing]);

  useEffect(() => {
    if (isResizing) {
      const handleMouseUp = () => setIsResizing(false);
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isResizing, handleMouseMove]);

  // Handle detach/pop-out
  const handleDetach = useCallback(() => {
    const width = 420;
    const height = 600;
    const left = window.screen.width - width - 50;
    const top = 50;
    
    // Create the popup window
    const popup = window.open(
      '',
      'OpieChat',
      `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=no,status=no,menubar=no,toolbar=no,location=no`
    );
    
    if (!popup) {
      alert('Please allow popups for this site to use the detached chat feature.');
      return;
    }
    
    detachedWindowRef.current = popup;
    setIsDetached(true);
    setMode('minimized'); // Minimize the main chat when detached
    
    // Write the HTML content to the popup
    popup.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Opie Chat</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #0d0d1a;
            color: #fff;
            height: 100vh;
            display: flex;
            flex-direction: column;
          }
          #chat-root {
            flex: 1;
            display: flex;
            flex-direction: column;
            overflow: hidden;
          }
          .header {
            padding: 14px 16px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.08);
            display: flex;
            justify-content: space-between;
            align-items: center;
            background: rgba(255, 255, 255, 0.02);
          }
          .header-left { display: flex; align-items: center; gap: 12px; }
          .avatar {
            width: 36px;
            height: 36px;
            border-radius: 50%;
            object-fit: cover;
            border: 2px solid rgba(102, 126, 234, 0.3);
          }
          .header-info { display: flex; flex-direction: column; gap: 2px; }
          .header-name { font-weight: 600; font-size: 1rem; display: flex; align-items: center; gap: 4px; }
          .header-status { color: rgba(255, 255, 255, 0.5); font-size: 0.8rem; display: flex; align-items: center; gap: 6px; }
          .status-dot { width: 6px; height: 6px; border-radius: 50%; background: #22c55e; }
          .messages {
            flex: 1;
            overflow-y: auto;
            padding: 16px;
            display: flex;
            flex-direction: column;
            gap: 12px;
          }
          .message-row { display: flex; gap: 8px; }
          .message-row.user { justify-content: flex-end; }
          .message-row.assistant { justify-content: flex-start; }
          .message-bubble {
            padding: 12px 16px;
            border-radius: 18px;
            max-width: 80%;
            font-size: 0.9rem;
            line-height: 1.5;
            word-wrap: break-word;
          }
          .message-bubble.user {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border-radius: 18px 18px 4px 18px;
          }
          .message-bubble.assistant {
            background: rgba(255, 255, 255, 0.08);
            border-radius: 18px 18px 18px 4px;
          }
          .input-area {
            padding: 12px 16px;
            border-top: 1px solid rgba(255, 255, 255, 0.08);
            display: flex;
            gap: 10px;
            align-items: flex-end;
            background: rgba(0, 0, 0, 0.2);
          }
          .text-input {
            flex: 1;
            padding: 12px 16px;
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 16px;
            color: #fff;
            font-size: 0.9rem;
            outline: none;
            resize: none;
            min-height: 48px;
            max-height: 120px;
            font-family: inherit;
          }
          .text-input:focus { border-color: rgba(102, 126, 234, 0.5); }
          .send-btn {
            width: 48px;
            height: 48px;
            border-radius: 16px;
            border: none;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: #fff;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: opacity 0.2s;
          }
          .send-btn:disabled { opacity: 0.5; cursor: not-allowed; }
          .send-btn svg { width: 20px; height: 20px; }
          .typing-indicator { display: flex; gap: 4px; padding: 14px 18px; background: rgba(255, 255, 255, 0.08); border-radius: 18px; width: fit-content; }
          .typing-dot { width: 8px; height: 8px; border-radius: 50%; background: rgba(255, 255, 255, 0.5); animation: bounce 1.4s infinite; }
          .typing-dot:nth-child(2) { animation-delay: 0.2s; }
          .typing-dot:nth-child(3) { animation-delay: 0.4s; }
          @keyframes bounce { 0%, 100% { transform: translateY(0); opacity: 0.4; } 50% { transform: translateY(-4px); opacity: 1; } }
          .sync-notice { padding: 8px 16px; background: rgba(102, 126, 234, 0.1); color: rgba(255, 255, 255, 0.6); font-size: 0.75rem; text-align: center; border-bottom: 1px solid rgba(255, 255, 255, 0.05); }
        </style>
      </head>
      <body>
        <div id="chat-root">
          <div class="sync-notice">🔗 Connected to main window</div>
          <div class="header">
            <div class="header-left">
              <img class="avatar" src="${window.location.origin}/opie-avatar.png" alt="Opie" onerror="this.style.display='none'" />
              <div class="header-info">
                <span class="header-name">Opie ⚡</span>
                <span class="header-status"><span class="status-dot"></span> Online</span>
              </div>
            </div>
          </div>
          <div class="messages" id="messages"></div>
          <div class="input-area">
            <textarea class="text-input" id="input" placeholder="Type a message..." rows="1"></textarea>
            <button class="send-btn" id="send-btn">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 2L11 13M22 2L15 22L11 13L2 9L22 2Z" />
              </svg>
            </button>
          </div>
        </div>
        <script>
          const messagesEl = document.getElementById('messages');
          const inputEl = document.getElementById('input');
          const sendBtn = document.getElementById('send-btn');
          
          // Listen for messages from parent window
          window.addEventListener('message', (event) => {
            if (event.data.type === 'OPIE_CHAT_UPDATE') {
              renderMessages(event.data.messages, event.data.isLoading);
            }
          });
          
          // Request initial state
          if (window.opener) {
            window.opener.postMessage({ type: 'OPIE_CHAT_REQUEST_STATE' }, '*');
          }
          
          function renderMessages(messages, isLoading) {
            messagesEl.innerHTML = messages.map(msg => \`
              <div class="message-row \${msg.role}">
                <div class="message-bubble \${msg.role}">\${escapeHtml(msg.text)}</div>
              </div>
            \`).join('');
            
            if (isLoading) {
              messagesEl.innerHTML += '<div class="message-row assistant"><div class="typing-indicator"><span class="typing-dot"></span><span class="typing-dot"></span><span class="typing-dot"></span></div></div>';
            }
            
            messagesEl.scrollTop = messagesEl.scrollHeight;
          }
          
          function escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
          }
          
          function sendMessage() {
            const text = inputEl.value.trim();
            if (text && window.opener) {
              window.opener.postMessage({ type: 'OPIE_CHAT_SEND', text }, '*');
              inputEl.value = '';
              inputEl.style.height = 'auto';
            }
          }
          
          sendBtn.addEventListener('click', sendMessage);
          inputEl.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              sendMessage();
            }
          });
          
          inputEl.addEventListener('input', () => {
            inputEl.style.height = 'auto';
            inputEl.style.height = Math.min(inputEl.scrollHeight, 120) + 'px';
          });
          
          // Notify parent when closing
          window.addEventListener('beforeunload', () => {
            if (window.opener) {
              window.opener.postMessage({ type: 'OPIE_CHAT_DETACHED_CLOSED' }, '*');
            }
          });
        </script>
      </body>
      </html>
    `);
    popup.document.close();
  }, []);
  
  // Listen for messages from detached window
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'OPIE_CHAT_REQUEST_STATE') {
        // Send current state to detached window
        detachedWindowRef.current?.postMessage({
          type: 'OPIE_CHAT_UPDATE',
          messages: messages.map(m => ({ role: m.role, text: m.text })),
          isLoading,
        }, '*');
      } else if (event.data.type === 'OPIE_CHAT_SEND') {
        // Handle message sent from detached window
        setInput(event.data.text);
        setTimeout(() => onSend(event.data.text), 50);
      } else if (event.data.type === 'OPIE_CHAT_DETACHED_CLOSED') {
        setIsDetached(false);
        detachedWindowRef.current = null;
      }
    };
    
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [messages, isLoading, onSend, setInput]);
  
  // Sync messages to detached window
  useEffect(() => {
    if (isDetached && detachedWindowRef.current && !detachedWindowRef.current.closed) {
      detachedWindowRef.current.postMessage({
        type: 'OPIE_CHAT_UPDATE',
        messages: messages.map(m => ({ role: m.role, text: m.text })),
        isLoading,
      }, '*');
    }
  }, [messages, isLoading, isDetached]);
  
  // Check if detached window was closed
  useEffect(() => {
    if (!isDetached) return;
    
    const checkWindow = setInterval(() => {
      if (detachedWindowRef.current?.closed) {
        setIsDetached(false);
        detachedWindowRef.current = null;
        clearInterval(checkWindow);
      }
    }, 1000);
    
    return () => clearInterval(checkWindow);
  }, [isDetached]);

  // Handle keyboard
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (input.trim()) {
        onSend();
        setHasInteracted(true);
      }
    }
    if (e.key === 'Escape') {
      setMode('minimized');
    }
  };

  // Handle send with local text
  const handleSendClick = () => {
    if (input.trim()) {
      onSend();
      setHasInteracted(true);
    }
  };

  // Quick actions
  const quickActions = [
    { emoji: '👋', label: 'Say hi', message: 'Hey Opie!' },
    { emoji: '📊', label: 'Status', message: 'What\'s the status of my tasks?' },
    { emoji: '💡', label: 'Ideas', message: 'Give me some creative ideas' },
  ];

  // ============================================================================
  // Render Functions
  // ============================================================================

  // Closed - Just the robot head, no container
  if (mode === 'closed') {
    return (
      <>
        <button
          onClick={() => { setMode('open'); setHasInteracted(true); }}
          style={{
            position: 'fixed',
            bottom: 20,
            right: 20,
            width: 120,
            height: 120,
            background: 'none',
            backgroundColor: 'transparent',
            border: 'none',
            outline: 'none',
            boxShadow: 'none',
            cursor: 'pointer',
            zIndex: 1000,
            padding: 0,
            margin: 0,
          }}
          aria-label="Open chat"
        >
          <img
            src="/opie-avatar.png"
            alt="Chat with Opie"
            style={{
              width: 120,
              height: 120,
              objectFit: 'contain',
              display: 'block',
            }}
          />
          {unreadCount > 0 && (
            <span style={{
              ...styles.unreadBadge,
              top: 0,
              right: 0,
            }}>{unreadCount}</span>
          )}
        </button>
      </>
    );
  }

  // Minimized - Compact tab
  if (mode === 'minimized') {
    return (
      <>
        <style>{animationStyles}</style>
        <button
          onClick={() => setMode('open')}
          style={{
            ...styles.minimizedTab,
            background: voiceState === 'listening'
              ? 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)'
              : voiceState === 'processing'
              ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
              : voiceState === 'speaking'
              ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
              : 'linear-gradient(135deg, #1a1a2e 0%, #0d0d1a 100%)',
          }}
        >
          <Avatar size={32} />
          <div style={styles.minimizedInfo}>
            <span style={styles.minimizedName}>Opie</span>
            <span style={styles.minimizedStatus}>
              <StatusIndicator state={voiceState} size={6} />
              {statusText}
            </span>
          </div>
          {unreadCount > 0 && (
            <span style={styles.minimizedBadge}>{unreadCount}</span>
          )}
          {voiceState === 'listening' && (
            <VoiceWaveform active={true} color="#fff" />
          )}
        </button>
      </>
    );
  }

  // Open / Fullscreen - Full chat
  const isFullscreen = mode === 'fullscreen';
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  return (
    <>
      <style>{animationStyles}</style>
      <div
        ref={containerRef}
        style={{
          ...styles.chatContainer,
          ...(isFullscreen || isMobile ? styles.chatFullscreen : {
            width: size.width,
            height: size.height,
          }),
        }}
      >
        {/* Resize Handle */}
        {!isFullscreen && !isMobile && (
          <div
            onMouseDown={() => setIsResizing(true)}
            style={styles.resizeHandle}
          >
            <span style={styles.resizeIcon}>⤡</span>
          </div>
        )}

        {/* Header */}
        <header style={styles.header}>
          <div style={styles.headerLeft}>
            <Avatar size={36} />
            <div style={styles.headerInfo}>
              <span style={styles.headerName}>
                Opie
                <span style={styles.headerBolt}>⚡</span>
              </span>
              <span style={{
                ...styles.headerStatus,
                color: voiceState !== 'idle' ? (
                  voiceState === 'listening' ? '#22c55e' :
                  voiceState === 'processing' ? '#667eea' :
                  '#f59e0b'
                ) : 'rgba(255,255,255,0.5)',
              }}>
                <StatusIndicator state={voiceState} size={6} />
                {statusText}
              </span>
            </div>
          </div>
          
          <div style={styles.headerActions}>
            <button
              onClick={handleDetach}
              style={{
                ...styles.headerButton,
                ...(isDetached ? { background: 'rgba(102, 126, 234, 0.2)', color: '#667eea' } : {}),
              }}
              title={isDetached ? 'Chat detached (click to open another)' : 'Pop out chat'}
            >
              ⧉
            </button>
            <button
              onClick={() => setMode(isFullscreen ? 'open' : 'fullscreen')}
              style={styles.headerButton}
              title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
            >
              {isFullscreen ? '⊙' : '⛶'}
            </button>
            <button
              onClick={() => setMode('minimized')}
              style={styles.headerButton}
              title="Minimize"
            >
              ─
            </button>
            <button
              onClick={() => setMode('closed')}
              style={styles.headerButtonClose}
              title="Close"
            >
              ✕
            </button>
          </div>
        </header>

        {/* Messages */}
        <div style={styles.messagesContainer}>
          {/* Welcome message */}
          {messages.length === 0 && !hasInteracted && (
            <div style={styles.welcomeContainer}>
              <Avatar size={80} />
              <h3 style={styles.welcomeTitle}>Hey there! 👋</h3>
              <p style={styles.welcomeText}>
                I'm Opie, your AI assistant. Type a message or tap the mic to start talking!
              </p>
              <div style={styles.quickActionsRow}>
                {quickActions.map((action, i) => (
                  <QuickAction
                    key={i}
                    emoji={action.emoji}
                    label={action.label}
                    onClick={() => {
                      setInput(action.message);
                      setTimeout(() => onSend(action.message), 100);
                      setHasInteracted(true);
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Message list */}
          {messages.map((msg, i) => {
            const prev = i > 0 ? messages[i - 1] : undefined;
            const isGrouped = shouldGroupMessages(msg, prev);
            const isUser = msg.role === 'user';
            const showTimestamp = !isGrouped || i === messages.length - 1;
            
            return (
              <div
                key={msg.id || i}
                style={{
                  ...styles.messageRow,
                  justifyContent: isUser ? 'flex-end' : 'flex-start',
                  marginTop: isGrouped ? 4 : 16,
                }}
              >
                {/* Avatar for assistant (only show on first of group) */}
                {!isUser && !isGrouped && (
                  <Avatar size={28} />
                )}
                {!isUser && isGrouped && (
                  <div style={{ width: 28, flexShrink: 0 }} />
                )}
                
                <div style={{
                  ...styles.messageBubbleWrapper,
                  alignItems: isUser ? 'flex-end' : 'flex-start',
                }}>
                  <div
                    style={{
                      ...styles.messageBubble,
                      ...(isUser ? styles.messageBubbleUser : styles.messageBubbleAssistant),
                      borderRadius: isUser
                        ? (isGrouped ? '18px 18px 4px 18px' : '18px 18px 4px 18px')
                        : (isGrouped ? '18px 18px 18px 4px' : '18px 18px 18px 4px'),
                    }}
                  >
                    {renderMessageText(msg.text)}
                    
                    {/* Copy button on hover for assistant */}
                    {!isUser && (
                      <CopyButton text={msg.text} />
                    )}
                  </div>
                  
                  {/* Timestamp and status */}
                  {showTimestamp && (
                    <div style={{
                      ...styles.messageTimestamp,
                      flexDirection: isUser ? 'row-reverse' : 'row',
                    }}>
                      <span>{formatTime(msg.timestamp, mounted)}</span>
                      {isUser && <MessageStatus status={msg.status} />}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* Live transcript */}
          {transcript && (
            <div style={{
              ...styles.messageRow,
              justifyContent: 'flex-end',
              marginTop: 16,
            }}>
              <div style={styles.transcriptBubble}>
                <VoiceWaveform active={true} color="#667eea" />
                <span>{transcript}</span>
              </div>
            </div>
          )}

          {/* Typing indicator */}
          {isLoading && !transcript && (
            <TypingIndicator />
          )}

          <div ref={chatEndRef} />
        </div>

        {/* Input Area */}
        <div style={styles.inputArea}>
          {/* Voice button */}
          <button
            onClick={onMicToggle}
            style={{
              ...styles.micButton,
              background: micOn
                ? 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)'
                : voiceState === 'processing'
                ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                : 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
            }}
            title={micOn ? 'Stop listening' : 'Start voice input'}
          >
            {voiceState === 'processing' ? (
              <span style={styles.micSpinner}>◌</span>
            ) : (
              <>
                🎤
                {micOn && <VoiceWaveform active={true} color="#fff" />}
              </>
            )}
          </button>

          {/* Cancel button when processing */}
          {voiceState === 'processing' && onCancelProcessing && (
            <button
              onClick={onCancelProcessing}
              style={styles.cancelButton}
              title="Cancel"
            >
              ✕
            </button>
          )}

          {/* Text input */}
          <div style={styles.inputWrapper}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => setShowEmojiHint(true)}
              onBlur={() => setShowEmojiHint(false)}
              placeholder="Type a message..."
              style={styles.textInput}
              rows={1}
            />
            
            {/* Character count for long messages */}
            {input.length > 200 && (
              <span style={{
                ...styles.charCount,
                color: input.length > 500 ? '#ef4444' : 'rgba(255,255,255,0.4)',
              }}>
                {input.length}/500
              </span>
            )}
          </div>

          {/* Send button */}
          <button
            onClick={handleSendClick}
            disabled={isLoading || !input.trim()}
            style={{
              ...styles.sendButton,
              opacity: input.trim() && !isLoading ? 1 : 0.5,
              cursor: input.trim() && !isLoading ? 'pointer' : 'not-allowed',
            }}
            title="Send message"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 2L11 13M22 2L15 22L11 13L2 9L22 2Z" />
            </svg>
          </button>
        </div>

        {/* Emoji hint */}
        {showEmojiHint && input.length === 0 && (
          <div style={styles.emojiHint}>
            💡 Tip: Use voice for hands-free chat!
          </div>
        )}
      </div>
    </>
  );
}

// ============================================================================
// Styles
// ============================================================================

const animationStyles = `
  @keyframes statusPulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.7; transform: scale(1.2); }
  }
  
  @keyframes waveform {
    0%, 100% { height: 4px; }
    50% { height: 16px; }
  }
  
  @keyframes typingBounce {
    0%, 100% { transform: translateY(0); opacity: 0.4; }
    50% { transform: translateY(-4px); opacity: 1; }
  }
  
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
  
  @keyframes glow {
    0%, 100% { box-shadow: 0 0 20px rgba(102, 126, 234, 0.4); }
    50% { box-shadow: 0 0 30px rgba(102, 126, 234, 0.6), 0 0 40px rgba(102, 126, 234, 0.3); }
  }
  
  @keyframes slideUp {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
  }
`;

const styles: { [key: string]: React.CSSProperties } = {
  // Floating Button (Closed State)
  floatingButton: {
    position: 'fixed',
    bottom: 24,
    right: 24,
    width: 64,
    height: 64,
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #1a1a2e 0%, #0d0d1a 100%)',
    border: '2px solid rgba(102, 126, 234, 0.3)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    transition: 'all 0.3s ease',
    animation: 'glow 3s ease-in-out infinite',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4)',
    overflow: 'visible',
  },
  floatingButtonGlow: {
    position: 'absolute',
    inset: -4,
    borderRadius: '50%',
    background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.2), rgba(118, 75, 162, 0.2))',
    zIndex: -1,
  },
  unreadBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    background: '#ef4444',
    color: '#fff',
    fontSize: '0.75rem',
    fontWeight: 700,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0 6px',
    border: '2px solid #0d0d1a',
  },

  // Minimized Tab
  minimizedTab: {
    position: 'fixed',
    bottom: 24,
    right: 24,
    padding: '10px 16px',
    borderRadius: 24,
    border: '1px solid rgba(255, 255, 255, 0.1)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    zIndex: 1000,
    transition: 'all 0.3s ease',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4)',
  },
  minimizedInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
  },
  minimizedName: {
    color: '#fff',
    fontWeight: 600,
    fontSize: '0.9rem',
  },
  minimizedStatus: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: '0.75rem',
  },
  minimizedBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    background: 'rgba(255, 255, 255, 0.2)',
    color: '#fff',
    fontSize: '0.7rem',
    fontWeight: 600,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Chat Container
  chatContainer: {
    position: 'fixed',
    bottom: 24,
    right: 24,
    borderRadius: 20,
    background: '#0d0d1a',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    boxShadow: '0 10px 50px rgba(0, 0, 0, 0.5)',
    display: 'flex',
    flexDirection: 'column',
    zIndex: 1000,
    overflow: 'hidden',
    animation: 'slideUp 0.3s ease',
  },
  chatFullscreen: {
    position: 'fixed',
    inset: 0,
    borderRadius: 0,
    width: '100%',
    height: '100%',
  },

  // Resize Handle
  resizeHandle: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 24,
    height: 24,
    cursor: 'nw-resize',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.3,
    transition: 'opacity 0.2s',
    zIndex: 10,
  },
  resizeIcon: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: '10px',
    transform: 'rotate(90deg)',
  },

  // Header
  header: {
    padding: '14px 16px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    background: 'rgba(255, 255, 255, 0.02)',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  headerInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
  },
  headerName: {
    color: '#fff',
    fontWeight: 600,
    fontSize: '1rem',
    display: 'flex',
    alignItems: 'center',
    gap: 4,
  },
  headerBolt: {
    fontSize: '0.8rem',
  },
  headerStatus: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    fontSize: '0.8rem',
    transition: 'color 0.3s',
  },
  headerActions: {
    display: 'flex',
    gap: 6,
  },
  headerButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    border: 'none',
    background: 'rgba(255, 255, 255, 0.05)',
    color: 'rgba(255, 255, 255, 0.6)',
    cursor: 'pointer',
    fontSize: '14px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s',
  },
  headerButtonClose: {
    width: 32,
    height: 32,
    borderRadius: 8,
    border: 'none',
    background: 'rgba(239, 68, 68, 0.15)',
    color: '#ef4444',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 700,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s',
  },

  // Messages Container
  messagesContainer: {
    flex: 1,
    overflowY: 'auto',
    padding: 16,
    display: 'flex',
    flexDirection: 'column',
  },

  // Welcome State
  welcomeContainer: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    padding: '20px',
    gap: 16,
  },
  welcomeTitle: {
    color: '#fff',
    fontSize: '1.3rem',
    fontWeight: 700,
    margin: 0,
  },
  welcomeText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: '0.9rem',
    margin: 0,
    maxWidth: 280,
    lineHeight: 1.5,
  },
  quickActionsRow: {
    display: 'flex',
    gap: 8,
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginTop: 8,
  },
  quickAction: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '8px 14px',
    borderRadius: 20,
    border: '1px solid rgba(255, 255, 255, 0.1)',
    background: 'rgba(255, 255, 255, 0.05)',
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: '0.8rem',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },

  // Message Row
  messageRow: {
    display: 'flex',
    gap: 8,
    width: '100%',
  },
  messageBubbleWrapper: {
    display: 'flex',
    flexDirection: 'column',
    maxWidth: '80%',
    gap: 4,
  },
  messageBubble: {
    padding: '12px 16px',
    fontSize: '0.9rem',
    lineHeight: 1.5,
    position: 'relative',
    wordWrap: 'break-word',
  },
  messageBubbleUser: {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: '#fff',
  },
  messageBubbleAssistant: {
    background: 'rgba(255, 255, 255, 0.08)',
    color: '#fff',
  },
  messageTimestamp: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: '0.7rem',
    padding: '0 4px',
  },
  messageStatus: {
    fontSize: '0.65rem',
    letterSpacing: '-2px',
  },

  // Transcript
  transcriptBubble: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '12px 16px',
    borderRadius: '18px 18px 4px 18px',
    background: 'rgba(102, 126, 234, 0.2)',
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: '0.9rem',
    fontStyle: 'italic',
    maxWidth: '80%',
  },

  // Typing Indicator
  typingContainer: {
    display: 'flex',
    gap: 8,
    alignItems: 'flex-end',
    marginTop: 16,
  },
  typingBubble: {
    padding: '14px 18px',
    borderRadius: '18px 18px 18px 4px',
    background: 'rgba(255, 255, 255, 0.08)',
  },
  typingDots: {
    display: 'flex',
    gap: 4,
  },
  typingDot: {
    width: 8,
    height: 8,
    borderRadius: '50%',
    background: 'rgba(255, 255, 255, 0.5)',
    animation: 'typingBounce 1.4s ease-in-out infinite',
  },

  // Input Area
  inputArea: {
    padding: '12px 16px',
    borderTop: '1px solid rgba(255, 255, 255, 0.08)',
    display: 'flex',
    gap: 10,
    alignItems: 'flex-end',
    background: 'rgba(0, 0, 0, 0.2)',
  },
  micButton: {
    width: 48,
    height: 48,
    borderRadius: '50%',
    border: 'none',
    color: '#fff',
    fontSize: '20px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    flexShrink: 0,
    transition: 'all 0.3s ease',
    boxShadow: '0 2px 10px rgba(0, 0, 0, 0.3)',
  },
  micSpinner: {
    animation: 'spin 1s linear infinite',
    fontSize: '24px',
  },
  cancelButton: {
    width: 32,
    height: 32,
    borderRadius: '50%',
    border: 'none',
    background: 'rgba(239, 68, 68, 0.2)',
    color: '#ef4444',
    fontSize: '14px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  inputWrapper: {
    flex: 1,
    position: 'relative',
    display: 'flex',
    alignItems: 'flex-end',
  },
  textInput: {
    width: '100%',
    padding: '12px 16px',
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    color: '#fff',
    fontSize: '0.9rem',
    resize: 'none',
    outline: 'none',
    minHeight: 48,
    maxHeight: 120,
    lineHeight: 1.5,
    fontFamily: 'inherit',
    transition: 'border-color 0.2s',
  },
  charCount: {
    position: 'absolute',
    bottom: 4,
    right: 12,
    fontSize: '0.7rem',
  },
  sendButton: {
    width: 48,
    height: 48,
    borderRadius: 16,
    border: 'none',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: '#fff',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    transition: 'all 0.2s',
    boxShadow: '0 2px 10px rgba(102, 126, 234, 0.3)',
  },
  emojiHint: {
    padding: '8px 16px',
    background: 'rgba(255, 255, 255, 0.03)',
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: '0.75rem',
    textAlign: 'center',
  },

  // Code blocks
  codeBlock: {
    background: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 8,
    padding: '12px 14px',
    margin: '8px 0',
    fontSize: '0.85rem',
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
    overflowX: 'auto',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
  },
  inlineCode: {
    background: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 4,
    padding: '2px 6px',
    fontSize: '0.85em',
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
  },
  link: {
    color: '#60a5fa',
    textDecoration: 'none',
    wordBreak: 'break-all',
  },
  copyButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 4,
    border: 'none',
    background: 'rgba(255, 255, 255, 0.1)',
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: '12px',
    cursor: 'pointer',
    opacity: 0,
    transition: 'opacity 0.2s',
  },

  // Waveform
  waveformContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: 2,
    height: 16,
  },
  waveformBar: {
    width: 3,
    borderRadius: 2,
    animation: 'waveform 0.5s ease-in-out infinite',
  },
};
