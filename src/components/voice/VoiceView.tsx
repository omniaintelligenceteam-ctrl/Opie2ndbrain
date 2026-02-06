// src/components/voice/VoiceView.tsx
// Extracted voice chat view from OpieKanban
'use client';
import React, { memo } from 'react';
import { ChatMessage } from '../FloatingChat';

interface VoiceViewProps {
  messages: ChatMessage[];
  input: string;
  setInput: (val: string) => void;
  isLoading: boolean;
  micOn: boolean;
  isSpeaking: boolean;
  transcript: string;
  onSend: (text: string) => void;
  onMicToggle: () => void;
}

const voiceContainerStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  height: '100vh',
  background: 'linear-gradient(180deg, #0a0a14 0%, #0d0d18 100%)',
};

const chatMessagesStyle: React.CSSProperties = {
  flex: 1,
  overflowY: 'auto',
  padding: '40px',
  display: 'flex',
  flexDirection: 'column',
  gap: '16px',
};

const bubbleBase: React.CSSProperties = {
  padding: '16px 20px',
  borderRadius: '20px',
  maxWidth: '70%',
  fontSize: '0.95rem',
  lineHeight: 1.6,
  fontWeight: 450,
  boxShadow: '0 2px 12px rgba(0,0,0,0.15)',
};

const bubbleUser: React.CSSProperties = {
  alignSelf: 'flex-end',
  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  color: '#fff',
  borderBottomRightRadius: '6px',
  boxShadow: '0 4px 20px rgba(102, 126, 234, 0.35)',
};

const bubbleAssistant: React.CSSProperties = {
  alignSelf: 'flex-start',
  background: 'rgba(255,255,255,0.06)',
  color: '#fff',
  borderBottomLeftRadius: '6px',
  border: '1px solid rgba(255,255,255,0.06)',
};

const VoiceView: React.FC<VoiceViewProps> = memo(function VoiceView({
  messages,
  input,
  setInput,
  isLoading,
  micOn,
  transcript,
  onSend,
  onMicToggle,
}) {
  return (
    <div style={voiceContainerStyle}>
      <div style={chatMessagesStyle}>
        {messages.length === 0 && (
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              color: 'rgba(255,255,255,0.35)',
            }}
          >
            <div
              style={{
                fontSize: '80px',
                marginBottom: '24px',
                filter: 'drop-shadow(0 0 30px rgba(102,126,234,0.4))',
                animation: 'float 3s ease-in-out infinite',
              }}
            >
              🎤
            </div>
            <h3
              style={{
                color: '#fff',
                fontSize: '1.75rem',
                fontWeight: 700,
                margin: '0 0 10px 0',
                letterSpacing: '-0.03em',
              }}
            >
              Voice Chat with Opie
            </h3>
            <p style={{ fontSize: '1rem', margin: 0, color: 'rgba(255,255,255,0.45)' }}>
              Turn on the mic or type below to start
            </p>
          </div>
        )}
        {messages.map((m, i) => (
          <div
            key={m.id || i}
            style={{
              ...bubbleBase,
              ...(m.role === 'user' ? bubbleUser : bubbleAssistant),
            }}
          >
            {m.text}
          </div>
        ))}
      </div>

      {transcript && (
        <div
          style={{
            padding: '16px 40px',
            background: 'linear-gradient(90deg, rgba(102,126,234,0.12) 0%, rgba(102,126,234,0.06) 100%)',
            color: '#667eea',
            fontSize: '0.9rem',
            fontWeight: 500,
            fontStyle: 'italic',
            borderTop: '1px solid rgba(102,126,234,0.15)',
          }}
        >
          🎙️ Hearing: {transcript}
        </div>
      )}

      <div
        style={{
          padding: '24px 40px',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          display: 'flex',
          gap: '14px',
          background: 'rgba(13, 13, 21, 0.95)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          alignItems: 'center',
        }}
      >
        <button
          onClick={onMicToggle}
          style={{
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
            background: micOn ? '#22c55e' : '#ef4444',
          }}
        >
          {micOn ? '🎤 Listening...' : '🎤 Start Mic'}
        </button>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onSend(input);
          }}
          placeholder="Type a message..."
          style={{
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
          }}
        />
        <button
          onClick={() => onSend(input)}
          disabled={isLoading}
          style={{
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
          }}
        >
          {isLoading ? '...' : 'Send'}
        </button>
      </div>
    </div>
  );
});

export default VoiceView;
