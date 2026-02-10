'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

interface Message {
  role: 'user' | 'assistant';
  text: string;
  timestamp?: Date;
}

interface MobileChatProps {
  messages: Message[];
  input: string;
  setInput: (val: string) => void;
  isLoading: boolean;
  onSend: () => void;
  micOn: boolean;
  onMicToggle: () => void;
  isSpeaking: boolean;
  transcript: string;
  onBack?: () => void;
}

export default function MobileChat({
  messages,
  input,
  setInput,
  isLoading,
  onSend,
  micOn,
  onMicToggle,
  isSpeaking,
  transcript,
  onBack,
}: MobileChatProps) {
  const [showVoiceMode, setShowVoiceMode] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, transcript]);

  // Handle virtual keyboard
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleResize = () => {
      // Detect virtual keyboard on mobile
      if (window.visualViewport) {
        const keyboardH = window.innerHeight - window.visualViewport.height;
        setKeyboardHeight(Math.max(0, keyboardH));
      }
    };

    window.visualViewport?.addEventListener('resize', handleResize);
    return () => window.visualViewport?.removeEventListener('resize', handleResize);
  }, []);

  // Haptic feedback
  const triggerHaptic = useCallback((intensity: 'light' | 'medium' | 'heavy' = 'light') => {
    if ('vibrate' in navigator) {
      const durations = { light: 10, medium: 25, heavy: 50 };
      navigator.vibrate(durations[intensity]);
    }
  }, []);

  const handleSend = () => {
    if (!input.trim() || isLoading) return;
    triggerHaptic('medium');
    onSend();
  };

  const handleMicToggle = () => {
    triggerHaptic('heavy');
    onMicToggle();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Voice mode - full screen listening UI
  if (showVoiceMode) {
    return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          background: 'linear-gradient(180deg, #0d0d1a 0%, #1a1a2e 100%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          zIndex: 2000,
        }}
      >
        {/* Close button */}
        <button
          onClick={() => {
            setShowVoiceMode(false);
            if (micOn) onMicToggle();
          }}
          style={{
            position: 'absolute',
            top: 'calc(16px + env(safe-area-inset-top, 0px))',
            right: '16px',
            width: '44px',
            height: '44px',
            borderRadius: '50%',
            background: 'rgba(255, 255, 255, 0.1)',
            border: 'none',
            color: '#fff',
            fontSize: '20px',
            cursor: 'pointer',
          }}
          aria-label="Close chat"
        >
          ✕
        </button>

        {/* Animated avatar */}
        <div
          style={{
            position: 'relative',
            width: '160px',
            height: '160px',
            marginBottom: '40px',
          }}
        >
          {/* Pulse rings */}
          {micOn && (
            <>
              <div style={{
                position: 'absolute',
                inset: '-20px',
                borderRadius: '50%',
                background: 'rgba(102, 126, 234, 0.1)',
                animation: 'pulseRing 2s ease-out infinite',
              }} />
              <div style={{
                position: 'absolute',
                inset: '-40px',
                borderRadius: '50%',
                background: 'rgba(102, 126, 234, 0.05)',
                animation: 'pulseRing 2s ease-out infinite 0.5s',
              }} />
            </>
          )}
          
          {/* Avatar */}
          <div
            style={{
              width: '160px',
              height: '160px',
              borderRadius: '50%',
              background: micOn 
                ? 'linear-gradient(135deg, #22c55e, #16a34a)'
                : 'linear-gradient(135deg, #667eea, #764ba2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '72px',
              boxShadow: micOn 
                ? '0 0 60px rgba(34, 197, 94, 0.4)'
                : '0 0 60px rgba(102, 126, 234, 0.4)',
              transition: 'all 0.3s ease',
            }}
          >
            {micOn ? '🎤' : '⚡'}
          </div>
        </div>

        {/* Status text */}
        <h2
          style={{
            color: '#fff',
            fontSize: '1.75rem',
            fontWeight: 600,
            margin: '0 0 8px 0',
            textAlign: 'center',
          }}
        >
          {micOn ? 'Listening...' : isSpeaking ? 'Opie is speaking...' : isLoading ? 'Thinking...' : 'Tap to speak'}
        </h2>

        {/* Live transcript */}
        {transcript && (
          <p
            style={{
              color: 'rgba(255, 255, 255, 0.7)',
              fontSize: '1.1rem',
              textAlign: 'center',
              maxWidth: '300px',
              margin: '16px 0',
              fontStyle: 'italic',
            }}
          >
            "{transcript}"
          </p>
        )}

        {/* Main mic button */}
        <button
          onClick={handleMicToggle}
          style={{
            marginTop: '40px',
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            border: 'none',
            background: micOn 
              ? 'linear-gradient(135deg, #ef4444, #dc2626)'
              : 'linear-gradient(135deg, #22c55e, #16a34a)',
            color: '#fff',
            fontSize: '32px',
            cursor: 'pointer',
            boxShadow: micOn
              ? '0 0 30px rgba(239, 68, 68, 0.5)'
              : '0 0 30px rgba(34, 197, 94, 0.5)',
            transition: 'all 0.2s ease',
          }}
        >
          {micOn ? '⏹️' : '🎤'}
        </button>

        <p
          style={{
            color: 'rgba(255, 255, 255, 0.4)',
            fontSize: '0.85rem',
            marginTop: '16px',
          }}
        >
          {micOn ? 'Tap to stop' : 'Tap to start listening'}
        </p>

        <style>{`
          @keyframes pulseRing {
            0% { transform: scale(1); opacity: 1; }
            100% { transform: scale(1.5); opacity: 0; }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        minHeight: '100dvh',
        background: '#0d0d1a',
        paddingBottom: keyboardHeight > 0 ? `${keyboardHeight}px` : 'env(safe-area-inset-bottom, 0px)',
        transition: 'padding-bottom 0.2s ease',
      }}
    >
      {/* Header */}
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '12px 16px',
          paddingTop: 'calc(12px + env(safe-area-inset-top, 0px))',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          background: 'rgba(13, 13, 21, 0.95)',
          backdropFilter: 'blur(20px)',
        }}
      >
        {onBack && (
          <button
            onClick={onBack}
            aria-label="Go back"
            style={{
              width: '44px',
              height: '44px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'transparent',
              border: 'none',
              color: '#667eea',
              fontSize: '24px',
              cursor: 'pointer',
            }}
          >
            ←
          </button>
        )}

        {/* Avatar */}
        <div
          style={{
            width: '44px',
            height: '44px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #667eea, #764ba2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '20px',
            boxShadow: '0 0 15px rgba(102, 126, 234, 0.3)',
          }}
        >
          ⚡
        </div>

        <div style={{ flex: 1 }}>
          <div style={{ color: '#fff', fontWeight: 600, fontSize: '1rem' }}>Opie</div>
          <div
            style={{
              color: micOn ? '#22c55e' : isSpeaking ? '#f59e0b' : isLoading ? '#667eea' : 'rgba(255, 255, 255, 0.5)',
              fontSize: '0.75rem',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: micOn ? '#22c55e' : isSpeaking ? '#f59e0b' : isLoading ? '#667eea' : '#22c55e',
              }}
            />
            {micOn ? 'Listening' : isSpeaking ? 'Speaking' : isLoading ? 'Thinking' : 'Online'}
          </div>
        </div>

        {/* Voice mode button */}
        <button
          onClick={() => {
            setShowVoiceMode(true);
            if (!micOn) onMicToggle();
          }}
          style={{
            width: '44px',
            height: '44px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(102, 126, 234, 0.2)',
            border: 'none',
            borderRadius: '50%',
            color: '#667eea',
            fontSize: '20px',
            cursor: 'pointer',
          }}
          aria-label="Toggle voice input"
        >
          🎤
        </button>
      </header>

      {/* Messages */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {messages.length === 0 && !transcript && (
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              color: 'rgba(255, 255, 255, 0.4)',
              padding: '40px 20px',
            }}
          >
            <div
              style={{
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #667eea, #764ba2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '36px',
                marginBottom: '20px',
                opacity: 0.8,
              }}
            >
              ⚡
            </div>
            <h3 style={{ color: '#fff', fontSize: '1.25rem', margin: '0 0 8px 0' }}>
              Hey there!
            </h3>
            <p style={{ margin: 0, maxWidth: '260px' }}>
              Type a message or tap the mic to start a voice conversation.
            </p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            style={{
              alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
              maxWidth: '85%',
              padding: '14px 18px',
              borderRadius: msg.role === 'user' ? '20px 20px 6px 20px' : '20px 20px 20px 6px',
              background: msg.role === 'user'
                ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                : 'rgba(255, 255, 255, 0.08)',
              color: '#fff',
              fontSize: '0.95rem',
              lineHeight: 1.5,
              wordBreak: 'break-word',
            }}
          >
            {msg.text}
          </div>
        ))}

        {/* Live transcript indicator */}
        {transcript && (
          <div
            style={{
              alignSelf: 'flex-end',
              maxWidth: '85%',
              padding: '14px 18px',
              borderRadius: '20px 20px 6px 20px',
              background: 'rgba(102, 126, 234, 0.2)',
              border: '1px dashed rgba(102, 126, 234, 0.5)',
              color: 'rgba(255, 255, 255, 0.7)',
              fontSize: '0.95rem',
              fontStyle: 'italic',
            }}
          >
            {transcript}...
          </div>
        )}

        {/* Loading indicator */}
        {isLoading && !transcript && (
          <div
            style={{
              alignSelf: 'flex-start',
              padding: '14px 18px',
              borderRadius: '20px 20px 20px 6px',
              background: 'rgba(255, 255, 255, 0.08)',
              color: 'rgba(255, 255, 255, 0.5)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <span style={{ animation: 'bounce 1s infinite' }}>•</span>
            <span style={{ animation: 'bounce 1s infinite 0.2s' }}>•</span>
            <span style={{ animation: 'bounce 1s infinite 0.4s' }}>•</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div
        style={{
          padding: '12px 16px',
          paddingBottom: keyboardHeight > 0 ? '12px' : 'calc(12px + env(safe-area-inset-bottom, 0px))',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          background: 'rgba(13, 13, 21, 0.95)',
          backdropFilter: 'blur(20px)',
          display: 'flex',
          alignItems: 'flex-end',
          gap: '10px',
        }}
      >
        {/* Mic button */}
        <button
          onClick={handleMicToggle}
          style={{
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            border: 'none',
            background: micOn
              ? 'linear-gradient(135deg, #22c55e, #16a34a)'
              : 'rgba(255, 255, 255, 0.1)',
            color: '#fff',
            fontSize: '20px',
            cursor: 'pointer',
            flexShrink: 0,
            transition: 'all 0.2s ease',
            boxShadow: micOn ? '0 0 20px rgba(34, 197, 94, 0.4)' : 'none',
          }}
          aria-label={micOn ? 'Stop voice input' : 'Start voice input'}
        >
          🎤
        </button>

        {/* Text input */}
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          rows={1}
          style={{
            flex: 1,
            padding: '14px 18px',
            background: 'rgba(255, 255, 255, 0.08)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '24px',
            color: '#fff',
            fontSize: '1rem',
            resize: 'none',
            outline: 'none',
            minHeight: '48px',
            maxHeight: '120px',
            lineHeight: 1.4,
          }}
        />

        {/* Send button */}
        <button
          onClick={handleSend}
          disabled={isLoading || !input.trim()}
          style={{
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            border: 'none',
            background: input.trim() && !isLoading
              ? 'linear-gradient(135deg, #667eea, #764ba2)'
              : 'rgba(255, 255, 255, 0.1)',
            color: '#fff',
            fontSize: '18px',
            cursor: input.trim() && !isLoading ? 'pointer' : 'not-allowed',
            flexShrink: 0,
            transition: 'all 0.2s ease',
            opacity: input.trim() && !isLoading ? 1 : 0.5,
          }}
        >
          ➤
        </button>
      </div>

      <style>{`
        @keyframes bounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-6px); }
        }
      `}</style>
    </div>
  );
}
