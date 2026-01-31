'use client';

import React, { useRef, useEffect } from 'react';
import { ChatMessage } from './FloatingChat';

export interface ChatPanelProps {
  messages: ChatMessage[];
  input: string;
  setInput: (value: string) => void;
  isLoading: boolean;
  onSend: (text?: string) => void;
  micOn: boolean;
  onMicToggle: () => void;
  isSpeaking: boolean;
  transcript: string;
}

/**
 * Voice chat panel - full-screen chat interface for desktop
 */
export function ChatPanel({
  messages,
  input,
  setInput,
  isLoading,
  onSend,
  micOn,
  onMicToggle,
  transcript,
}: ChatPanelProps): React.ReactElement {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSend(input);
    }
  };

  return (
    <div style={styles.voiceContainer}>
      <div style={styles.chatMessages}>
        {messages.length === 0 && (
          <div style={styles.emptyChat}>
            <div style={styles.emptyChatIcon}>🎤</div>
            <h3 style={styles.emptyChatTitle}>Voice Chat with Opie</h3>
            <p style={styles.emptyChatText}>Turn on the mic or type below to start</p>
          </div>
        )}
        {messages.map((m) => (
          <div 
            key={m.id} 
            style={{
              ...styles.chatBubble,
              ...(m.role === 'user' ? styles.chatBubbleUser : styles.chatBubbleAssistant)
            }}
          >
            {m.text}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      
      {transcript && (
        <div style={styles.transcript}>🎙️ Hearing: {transcript}</div>
      )}
      
      <div style={styles.voiceInput}>
        <button 
          onClick={onMicToggle} 
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
          onKeyDown={handleKeyDown}
          placeholder="Type a message..." 
          style={styles.textInput} 
        />
        <button 
          onClick={() => onSend(input)} 
          style={styles.sendButton}
          disabled={isLoading}
        >
          {isLoading ? '...' : 'Send'}
        </button>
      </div>
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  voiceContainer: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    background: 'linear-gradient(180deg, #0a0a14 0%, #0d0d18 100%)',
  },
  chatMessages: {
    flex: 1,
    overflowY: 'auto',
    padding: '40px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  emptyChat: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    color: 'rgba(255,255,255,0.35)',
  },
  emptyChatIcon: {
    fontSize: '80px',
    marginBottom: '24px',
    filter: 'drop-shadow(0 0 30px rgba(102,126,234,0.4))',
    animation: 'float 3s ease-in-out infinite',
  },
  emptyChatTitle: {
    color: '#fff',
    fontSize: '1.75rem',
    fontWeight: 700,
    margin: '0 0 10px 0',
    letterSpacing: '-0.03em',
  },
  emptyChatText: {
    fontSize: '1rem',
    margin: 0,
    color: 'rgba(255,255,255,0.45)',
  },
  chatBubble: {
    padding: '16px 20px',
    borderRadius: '20px',
    maxWidth: '70%',
    fontSize: '0.95rem',
    lineHeight: 1.6,
    fontWeight: 450,
    boxShadow: '0 2px 12px rgba(0,0,0,0.15)',
  },
  chatBubbleUser: {
    alignSelf: 'flex-end',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: '#fff',
    borderBottomRightRadius: '6px',
    boxShadow: '0 4px 20px rgba(102, 126, 234, 0.35)',
  },
  chatBubbleAssistant: {
    alignSelf: 'flex-start',
    background: 'rgba(255,255,255,0.06)',
    color: '#fff',
    borderBottomLeftRadius: '6px',
    border: '1px solid rgba(255,255,255,0.06)',
  },
  transcript: {
    padding: '16px 40px',
    background: 'linear-gradient(90deg, rgba(102,126,234,0.12) 0%, rgba(102,126,234,0.06) 100%)',
    color: '#667eea',
    fontSize: '0.9rem',
    fontWeight: 500,
    fontStyle: 'italic',
    borderTop: '1px solid rgba(102,126,234,0.15)',
  },
  voiceInput: {
    padding: '24px 40px',
    borderTop: '1px solid rgba(255,255,255,0.06)',
    display: 'flex',
    gap: '14px',
    background: 'rgba(13, 13, 21, 0.95)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    alignItems: 'center',
  },
  micButton: {
    padding: '18px 30px',
    borderRadius: '16px',
    border: 'none',
    cursor: 'pointer',
    fontWeight: 600,
    color: '#fff',
    fontSize: '0.95rem',
    whiteSpace: 'nowrap',
    transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
    boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
  },
  textInput: {
    flex: 1,
    padding: '18px 22px',
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '16px',
    color: '#fff',
    fontSize: '0.95rem',
    outline: 'none',
    transition: 'all 0.2s ease',
    fontWeight: 450,
  },
  sendButton: {
    padding: '18px 36px',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    border: 'none',
    borderRadius: '16px',
    color: '#fff',
    fontWeight: 600,
    fontSize: '0.95rem',
    cursor: 'pointer',
    transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
    boxShadow: '0 4px 20px rgba(102, 126, 234, 0.4)',
  },
};

export default ChatPanel;
