'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useVoiceEngine } from '@/hooks/useVoiceEngine';
import { useVoiceSettings } from '@/hooks/useVoiceSettings';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: Date;
}

export default function VoiceAgent({ onBack }: { onBack?: () => void }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const chatRef = useRef<HTMLDivElement>(null);
  const sessionId = useRef(`voice-${Date.now()}`);
  const { settings: voiceSettings } = useVoiceSettings();

  // Send message to G via the voice-agent API
  const sendToG = useCallback(async (text: string): Promise<string | void> => {
    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      text,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);

    try {
      // Send recent history so the API has conversation context
      const recentHistory = messages.slice(-10).map(m => ({
        role: m.role,
        content: m.text,
      }));

      const res = await fetch('/api/voice-agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          sessionId: sessionId.current,
          history: recentHistory,
        }),
      });

      const data = await res.json();
      const reply = data.reply || data.error || 'No response';

      const assistantMsg: ChatMessage = {
        id: `a-${Date.now()}`,
        role: 'assistant',
        text: reply,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, assistantMsg]);
      return reply; // Voice engine will auto-speak this
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : 'Failed to reach G';
      const errorMsg: ChatMessage = {
        id: `e-${Date.now()}`,
        role: 'assistant',
        text: errMsg,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMsg]);
      return errMsg;
    } finally {
      setIsLoading(false);
    }
  }, [messages]);

  const voiceEngine = useVoiceEngine({
    onSend: sendToG,
    autoSpeak: voiceSettings.autoSpeak,
    ttsProvider: voiceSettings.ttsProvider,
    ttsVoice: voiceSettings.ttsVoice,
    pttMode: true,
  });

  const {
    micOn,
    transcript,
    isSpeaking,
    voiceState,
    toggleMic,
    stopSpeaking,
    browserSupport,
  } = voiceEngine;

  // Auto-scroll to bottom
  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages, transcript, isLoading]);

  // Push-to-talk handler (keyboard + mouse buttons)
  useEffect(() => {
    const pttKey = voiceSettings.pushToTalkKey;
    if (!pttKey) return;

    const isMouse = pttKey.startsWith('Mouse');
    const mouseButton = isMouse ? parseInt(pttKey.slice(5)) : -1;

    if (isMouse) {
      // Mouse button PTT
      const mouseDown = (e: MouseEvent) => {
        if (e.button === mouseButton) {
          e.preventDefault();
          if (!micOn) toggleMic();
        }
      };
      const mouseUp = (e: MouseEvent) => {
        if (e.button === mouseButton) {
          e.preventDefault();
          if (micOn) toggleMic();
        }
      };
      // Prevent context menu for right-click PTT
      const contextMenu = (e: MouseEvent) => {
        if (mouseButton === 2) e.preventDefault();
      };
      window.addEventListener('mousedown', mouseDown);
      window.addEventListener('mouseup', mouseUp);
      window.addEventListener('contextmenu', contextMenu);
      return () => {
        window.removeEventListener('mousedown', mouseDown);
        window.removeEventListener('mouseup', mouseUp);
        window.removeEventListener('contextmenu', contextMenu);
      };
    } else {
      // Keyboard PTT
      const down = (e: KeyboardEvent) => {
        // Don't trigger when typing in the text input
        if ((e.target as HTMLElement)?.tagName === 'INPUT' || (e.target as HTMLElement)?.tagName === 'TEXTAREA') return;
        if (e.code === pttKey && !e.repeat) {
          e.preventDefault();
          if (!micOn) toggleMic();
        }
      };
      const up = (e: KeyboardEvent) => {
        if ((e.target as HTMLElement)?.tagName === 'INPUT' || (e.target as HTMLElement)?.tagName === 'TEXTAREA') return;
        if (e.code === pttKey) {
          e.preventDefault();
          if (micOn) toggleMic();
        }
      };
      window.addEventListener('keydown', down);
      window.addEventListener('keyup', up);
      return () => {
        window.removeEventListener('keydown', down);
        window.removeEventListener('keyup', up);
      };
    }
  }, [voiceSettings.pushToTalkKey, micOn, toggleMic]);

  // Handle text input send
  const handleTextSend = async () => {
    if (!input.trim() || isLoading) return;
    const text = input.trim();
    setInput('');
    await sendToG(text);
  };

  // Status text
  const pttLabel = voiceSettings.pushToTalkLabel || 'Space';
  const statusText = voiceState === 'listening' ? '🎤 Listening...'
    : voiceState === 'processing' || isLoading ? '⚡ Thinking...'
    : isSpeaking ? '🔊 Speaking...'
    : micOn ? '🎤 Ready' : `● Hold [${pttLabel}] or tap mic`;

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        {onBack && (
          <button onClick={onBack} style={styles.backBtn}>← Back</button>
        )}
        <div style={styles.headerCenter}>
          <h2 style={styles.title}>Voice Agent</h2>
          <span style={styles.status}>{statusText}</span>
        </div>
        {isSpeaking && (
          <button onClick={stopSpeaking} style={styles.stopBtn}>⏹ Stop</button>
        )}
      </div>

      {/* Chat Thread */}
      <div ref={chatRef} style={styles.chatArea}>
        {messages.length === 0 && !transcript && (
          <div style={styles.empty}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🎤</div>
            <h3 style={{ color: '#fff', margin: '0 0 8px' }}>Talk to G</h3>
            <p style={{ color: 'rgba(255,255,255,0.5)', margin: 0, fontSize: 14 }}>
              Tap the mic and speak, or type below
            </p>
          </div>
        )}

        {messages.map(m => (
          <div
            key={m.id}
            style={{
              ...styles.bubble,
              ...(m.role === 'user' ? styles.userBubble : styles.assistantBubble),
            }}
          >
            <span style={styles.bubbleLabel}>
              {m.role === 'user' ? 'You' : 'G'}
            </span>
            <p style={styles.bubbleText}>{m.text}</p>
          </div>
        ))}

        {isLoading && (
          <div style={{ ...styles.bubble, ...styles.assistantBubble }}>
            <span style={styles.bubbleLabel}>G</span>
            <p style={{ ...styles.bubbleText, opacity: 0.5 }}>Thinking...</p>
          </div>
        )}

        {transcript && (
          <div style={styles.transcriptBar}>
            🎙️ {transcript}
          </div>
        )}
      </div>

      {/* Input Area */}
      <div style={styles.inputArea}>
        <button
          onClick={toggleMic}
          style={{
            ...styles.micBtn,
            background: micOn
              ? 'linear-gradient(135deg, #22c55e, #16a34a)'
              : 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
            boxShadow: micOn
              ? '0 0 20px rgba(34,197,94,0.4)'
              : '0 4px 12px rgba(0,0,0,0.3)',
            transform: voiceState === 'listening' ? 'scale(1.05)' : 'scale(1)',
          }}
        >
          🎤
        </button>
        <div style={styles.textInputRow}>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleTextSend(); }}
            placeholder="Type a message..."
            style={styles.textInput}
            disabled={isLoading}
          />
          <button
            onClick={handleTextSend}
            disabled={isLoading || !input.trim()}
            style={{
              ...styles.sendBtn,
              opacity: isLoading || !input.trim() ? 0.4 : 1,
            }}
          >
            ▶
          </button>
        </div>
      </div>
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    background: 'linear-gradient(180deg, #0a0a12 0%, #111122 100%)',
    color: '#fff',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    padding: '12px 20px',
    borderBottom: '1px solid rgba(255,255,255,0.08)',
    gap: 12,
    flexShrink: 0,
  },
  backBtn: {
    background: 'none',
    border: 'none',
    color: 'rgba(255,255,255,0.6)',
    cursor: 'pointer',
    fontSize: 14,
    padding: '6px 12px',
    borderRadius: 8,
  },
  headerCenter: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
  },
  title: {
    margin: 0,
    fontSize: 16,
    fontWeight: 600,
    color: '#fff',
  },
  status: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 2,
  },
  stopBtn: {
    background: 'rgba(239,68,68,0.2)',
    border: '1px solid rgba(239,68,68,0.3)',
    color: '#ef4444',
    cursor: 'pointer',
    fontSize: 12,
    padding: '6px 12px',
    borderRadius: 8,
  },
  chatArea: {
    flex: 1,
    overflowY: 'auto' as const,
    padding: '20px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 12,
  },
  empty: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center' as const,
    opacity: 0.8,
  },
  bubble: {
    maxWidth: '80%',
    padding: '10px 16px',
    borderRadius: 16,
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 4,
  },
  userBubble: {
    alignSelf: 'flex-end' as const,
    background: 'rgba(59,130,246,0.2)',
    border: '1px solid rgba(59,130,246,0.2)',
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    alignSelf: 'flex-start' as const,
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderBottomLeftRadius: 4,
  },
  bubbleLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.4)',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
  },
  bubbleText: {
    margin: 0,
    fontSize: 15,
    lineHeight: 1.5,
    color: 'rgba(255,255,255,0.9)',
  },
  transcriptBar: {
    padding: '8px 16px',
    background: 'rgba(59,130,246,0.1)',
    border: '1px solid rgba(59,130,246,0.2)',
    borderRadius: 12,
    fontSize: 14,
    color: '#60a5fa',
    fontStyle: 'italic' as const,
  },
  inputArea: {
    display: 'flex',
    alignItems: 'center',
    padding: '12px 20px 20px',
    gap: 12,
    borderTop: '1px solid rgba(255,255,255,0.08)',
    flexShrink: 0,
  },
  micBtn: {
    width: 56,
    height: 56,
    borderRadius: '50%',
    border: 'none',
    color: '#fff',
    fontSize: 24,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s ease',
    flexShrink: 0,
  },
  textInputRow: {
    flex: 1,
    display: 'flex',
    gap: 8,
    alignItems: 'center',
  },
  textInput: {
    flex: 1,
    padding: '12px 16px',
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 12,
    color: '#fff',
    fontSize: 14,
    outline: 'none',
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    border: 'none',
    background: 'rgba(59,130,246,0.3)',
    color: '#fff',
    fontSize: 16,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
};
