'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import StatusOrb from './StatusOrb';

interface ImmersiveVoiceModeProps {
  isActive: boolean;
  isSpeaking: boolean;
  isListening: boolean;
  isLoading: boolean;
  transcript: string;
  lastResponse: string;
  onClose: () => void;
  onMicToggle: () => void;
  micOn: boolean;
}

export default function ImmersiveVoiceMode({
  isActive,
  isSpeaking,
  isListening,
  isLoading,
  transcript,
  lastResponse,
  onClose,
  onMicToggle,
  micOn,
}: ImmersiveVoiceModeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const [phase, setPhase] = useState(0);
  const [displayedResponse, setDisplayedResponse] = useState('');
  const typewriterRef = useRef<NodeJS.Timeout | null>(null);

  // Determine status
  const status = isLoading ? 'thinking' : isSpeaking ? 'speaking' : micOn ? 'listening' : 'idle';

  // Typewriter effect for responses
  useEffect(() => {
    if (lastResponse && !isSpeaking) {
      if (typewriterRef.current) clearTimeout(typewriterRef.current);
      setDisplayedResponse('');
      let i = 0;
      const type = () => {
        if (i < lastResponse.length) {
          setDisplayedResponse(lastResponse.slice(0, i + 1));
          i++;
          typewriterRef.current = setTimeout(type, 20);
        }
      };
      type();
    }
    return () => {
      if (typewriterRef.current) clearTimeout(typewriterRef.current);
    };
  }, [lastResponse, isSpeaking]);

  // Waveform animation
  useEffect(() => {
    if (!canvasRef.current || !isActive) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = canvas.offsetWidth * dpr;
    canvas.height = canvas.offsetHeight * dpr;
    ctx.scale(dpr, dpr);

    const width = canvas.offsetWidth;
    const height = canvas.offsetHeight;
    const centerY = height / 2;
    const bars = 64;
    const barWidth = width / bars * 0.6;
    const gap = width / bars * 0.4;

    let localPhase = 0;

    const animate = () => {
      ctx.clearRect(0, 0, width, height);
      localPhase += 0.05;
      setPhase(p => (p + 1) % 360);

      // Draw waveform bars
      for (let i = 0; i < bars; i++) {
        const x = i * (barWidth + gap) + gap / 2;

        // Calculate bar height based on status
        let amplitude = 0;
        if (status === 'listening') {
          amplitude = Math.sin(localPhase + i * 0.2) * 0.3 + 0.4;
          amplitude += Math.sin(localPhase * 2 + i * 0.1) * 0.2;
        } else if (status === 'speaking') {
          amplitude = Math.sin(localPhase * 1.5 + i * 0.15) * 0.5 + 0.5;
          amplitude += Math.random() * 0.2;
        } else if (status === 'thinking') {
          amplitude = Math.sin(localPhase * 0.5 + i * 0.3) * 0.2 + 0.3;
        } else {
          amplitude = Math.sin(localPhase * 0.3 + i * 0.1) * 0.1 + 0.15;
        }

        const barHeight = amplitude * height * 0.4;

        // Gradient for bars
        const gradient = ctx.createLinearGradient(x, centerY - barHeight, x, centerY + barHeight);
        if (status === 'listening') {
          gradient.addColorStop(0, 'rgba(59, 130, 246, 0.8)');
          gradient.addColorStop(0.5, 'rgba(139, 92, 246, 0.9)');
          gradient.addColorStop(1, 'rgba(59, 130, 246, 0.8)');
        } else if (status === 'speaking') {
          gradient.addColorStop(0, 'rgba(245, 158, 11, 0.8)');
          gradient.addColorStop(0.5, 'rgba(249, 115, 22, 0.9)');
          gradient.addColorStop(1, 'rgba(245, 158, 11, 0.8)');
        } else if (status === 'thinking') {
          gradient.addColorStop(0, 'rgba(139, 92, 246, 0.6)');
          gradient.addColorStop(0.5, 'rgba(168, 85, 247, 0.7)');
          gradient.addColorStop(1, 'rgba(139, 92, 246, 0.6)');
        } else {
          gradient.addColorStop(0, 'rgba(34, 197, 94, 0.4)');
          gradient.addColorStop(0.5, 'rgba(34, 197, 94, 0.5)');
          gradient.addColorStop(1, 'rgba(34, 197, 94, 0.4)');
        }

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.roundRect(x, centerY - barHeight, barWidth, barHeight * 2, 4);
        ctx.fill();

        // Glow effect
        ctx.shadowBlur = 15;
        ctx.shadowColor = status === 'listening' ? 'rgba(59, 130, 246, 0.5)'
          : status === 'speaking' ? 'rgba(245, 158, 11, 0.5)'
          : status === 'thinking' ? 'rgba(139, 92, 246, 0.4)'
          : 'rgba(34, 197, 94, 0.3)';
      }

      ctx.shadowBlur = 0;
      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => cancelAnimationFrame(animationRef.current);
  }, [isActive, status]);

  if (!isActive) return null;

  return (
    <div style={styles.container}>
      {/* Animated background gradient */}
      <div
        style={{
          ...styles.backgroundGradient,
          background: `
            radial-gradient(circle at 50% 30%,
              ${status === 'listening' ? 'rgba(59, 130, 246, 0.15)' :
                status === 'speaking' ? 'rgba(245, 158, 11, 0.15)' :
                status === 'thinking' ? 'rgba(139, 92, 246, 0.2)' :
                'rgba(34, 197, 94, 0.1)'} 0%,
              transparent 60%
            ),
            radial-gradient(circle at ${30 + Math.sin(phase * 0.02) * 20}% ${70 + Math.cos(phase * 0.02) * 10}%,
              rgba(102, 126, 234, 0.1) 0%,
              transparent 40%
            ),
            linear-gradient(180deg, #08080f 0%, #0d0d15 100%)
          `,
        }}
      />

      {/* Close button */}
      <button onClick={onClose} style={styles.closeButton}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      </button>

      {/* Main content */}
      <div style={styles.content}>
        {/* Avatar with status orb */}
        <div style={styles.avatarSection}>
          <div
            style={{
              ...styles.avatar,
              boxShadow: `
                0 0 ${status === 'speaking' ? '60' : status === 'thinking' ? '40' : '20'}px ${
                  status === 'listening' ? 'rgba(59, 130, 246, 0.4)' :
                  status === 'speaking' ? 'rgba(245, 158, 11, 0.5)' :
                  status === 'thinking' ? 'rgba(139, 92, 246, 0.4)' :
                  'rgba(34, 197, 94, 0.3)'
                }
              `,
              transform: `scale(${1 + (status === 'speaking' ? Math.sin(phase * 0.1) * 0.03 : 0)})`,
            }}
          >
            <span style={{ fontSize: '48px' }}>⚡</span>
          </div>
          <div style={styles.statusContainer}>
            <StatusOrb status={status} size={14} showLabel />
          </div>
        </div>

        {/* Waveform visualizer */}
        <canvas ref={canvasRef} style={styles.waveform} />

        {/* Transcript display */}
        <div style={styles.transcriptSection}>
          {transcript && (
            <div style={styles.userTranscript}>
              <span style={styles.transcriptLabel}>You</span>
              <p style={styles.transcriptText}>{transcript}</p>
            </div>
          )}
          {displayedResponse && !transcript && (
            <div style={styles.aiResponse}>
              <span style={styles.transcriptLabel}>Opie</span>
              <p style={styles.responseText}>{displayedResponse}</p>
            </div>
          )}
          {!transcript && !displayedResponse && (
            <p style={styles.hint}>
              {micOn ? 'Listening... speak naturally' : 'Tap the mic to start'}
            </p>
          )}
        </div>

        {/* Mic button */}
        <button
          onClick={onMicToggle}
          style={{
            ...styles.micButton,
            background: micOn
              ? 'linear-gradient(135deg, #3b82f6, #8b5cf6)'
              : 'rgba(255,255,255,0.1)',
            boxShadow: micOn
              ? '0 0 30px rgba(59, 130, 246, 0.5), 0 0 60px rgba(139, 92, 246, 0.3)'
              : '0 4px 20px rgba(0,0,0,0.3)',
          }}
        >
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            {micOn ? (
              <>
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" fill="currentColor" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8" />
              </>
            ) : (
              <>
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8" />
                <line x1="1" y1="1" x2="23" y2="23" />
              </>
            )}
          </svg>
        </button>
      </div>
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    position: 'fixed',
    inset: 0,
    zIndex: 1000,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  backgroundGradient: {
    position: 'absolute',
    inset: 0,
    transition: 'background 0.5s ease',
  },
  closeButton: {
    position: 'absolute',
    top: '20px',
    right: '20px',
    width: '48px',
    height: '48px',
    borderRadius: '50%',
    border: 'none',
    background: 'rgba(255,255,255,0.1)',
    color: 'rgba(255,255,255,0.7)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s ease',
    zIndex: 10,
  },
  content: {
    position: 'relative',
    zIndex: 5,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '32px',
    padding: '40px',
    width: '100%',
    maxWidth: '600px',
  },
  avatarSection: {
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '16px',
  },
  avatar: {
    width: '120px',
    height: '120px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #1a1a2e, #252538)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '2px solid rgba(102, 126, 234, 0.3)',
    transition: 'all 0.3s ease',
  },
  statusContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  waveform: {
    width: '100%',
    height: '120px',
    borderRadius: '12px',
  },
  transcriptSection: {
    width: '100%',
    minHeight: '100px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
  },
  userTranscript: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
  },
  aiResponse: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
  },
  transcriptLabel: {
    fontSize: '12px',
    color: 'rgba(255,255,255,0.5)',
    textTransform: 'uppercase',
    letterSpacing: '1px',
  },
  transcriptText: {
    fontSize: '24px',
    color: '#3b82f6',
    fontWeight: 500,
    fontStyle: 'italic',
    margin: 0,
  },
  responseText: {
    fontSize: '20px',
    color: 'rgba(255,255,255,0.9)',
    fontWeight: 400,
    margin: 0,
    lineHeight: 1.5,
  },
  hint: {
    fontSize: '16px',
    color: 'rgba(255,255,255,0.5)',
    margin: 0,
  },
  micButton: {
    width: '80px',
    height: '80px',
    borderRadius: '50%',
    border: 'none',
    color: 'white',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.3s ease',
  },
};
