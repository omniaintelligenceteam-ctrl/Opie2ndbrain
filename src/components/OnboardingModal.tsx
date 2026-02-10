'use client';
import React, { useState, useEffect, useCallback, useRef } from 'react';

// ─── localStorage keys ───────────────────────────────────────────────
const ONBOARDING_COMPLETE_KEY = 'opie-onboarding-complete';
const USER_NAME_KEY = 'opie-user-name';

// ─── Public helpers ──────────────────────────────────────────────────
export function isOnboardingComplete(): boolean {
  try {
    return localStorage.getItem(ONBOARDING_COMPLETE_KEY) === 'true';
  } catch {
    return false;
  }
}

export function getUserName(): string {
  try {
    return localStorage.getItem(USER_NAME_KEY) || '';
  } catch {
    return '';
  }
}

export function resetOnboarding(): void {
  try {
    localStorage.removeItem(ONBOARDING_COMPLETE_KEY);
  } catch {}
}

// ─── Props ───────────────────────────────────────────────────────────
interface OnboardingModalProps {
  onComplete: (userName: string) => void;
  onNavigate?: (view: string) => void;
}

// ─── Step data ───────────────────────────────────────────────────────
const CONCEPTS = [
  {
    icon: '💬',
    title: 'Chat with Opie',
    description: 'Talk to your AI assistant via text or voice. Opie can research, write, code, and manage your agent army.',
  },
  {
    icon: '🤖',
    title: '42 Specialized Agents',
    description: 'Deploy AI agents for specific tasks — content writing, market research, code review, and more.',
  },
  {
    icon: '🧠',
    title: 'Persistent Memory',
    description: 'Opie remembers your preferences, projects, and past conversations. Your personal knowledge base grows over time.',
  },
];

const QUICK_ACTIONS = [
  { label: 'Chat with Opie', icon: '💬', view: 'voice' },
  { label: 'Browse Agents', icon: '🤖', view: 'agents' },
  { label: 'View Project Board', icon: '📋', view: 'board' },
  { label: 'Explore Memory', icon: '🧠', view: 'memory' },
];

// ─── Component ───────────────────────────────────────────────────────
export default function OnboardingModal({ onComplete, onNavigate }: OnboardingModalProps) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (step === 0) {
      setTimeout(() => inputRef.current?.focus(), 200);
    }
  }, [step]);

  const handleFinish = useCallback((selectedView?: string) => {
    const trimmedName = name.trim() || 'there';
    try {
      localStorage.setItem(USER_NAME_KEY, trimmedName);
      localStorage.setItem(ONBOARDING_COMPLETE_KEY, 'true');
    } catch {}
    onComplete(trimmedName);
    if (selectedView && onNavigate) {
      onNavigate(selectedView);
    }
  }, [name, onComplete, onNavigate]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && step < 2) {
      setStep(s => s + 1);
    }
  }, [step]);

  return (
    <>
      {/* Backdrop */}
      <div style={s.backdrop} />

      {/* Modal */}
      <div style={s.modal} onKeyDown={handleKeyDown}>
        {/* Progress dots */}
        <div style={s.progressRow}>
          {[0, 1, 2].map(i => (
            <div
              key={i}
              style={{
                ...s.dot,
                ...(i === step ? s.dotActive : {}),
                ...(i < step ? s.dotComplete : {}),
              }}
            />
          ))}
        </div>

        {/* Step 0: Welcome + Name */}
        {step === 0 && (
          <div style={s.stepContent}>
            <div style={s.heroIcon}>
              <span style={{ fontSize: 48 }}>⚡</span>
              <div style={s.heroGlow} />
            </div>
            <h2 style={s.title}>Welcome to Opie 2nd Brain</h2>
            <p style={s.subtitle}>
              Your AI-powered command center with 42 specialized agents ready to work for you.
            </p>
            <div style={s.inputGroup}>
              <label style={s.inputLabel}>What should Opie call you?</label>
              <input
                ref={inputRef}
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Enter your name"
                style={s.input}
                maxLength={30}
              />
            </div>
            <button onClick={() => setStep(1)} style={s.primaryBtn}>
              Get Started
            </button>
          </div>
        )}

        {/* Step 1: Core Concepts */}
        {step === 1 && (
          <div style={s.stepContent}>
            <h2 style={s.title}>
              {name.trim() ? `Here's what you can do, ${name.trim()}` : "Here's what you can do"}
            </h2>
            <div style={s.conceptGrid}>
              {CONCEPTS.map((c, i) => (
                <div key={i} style={s.conceptCard}>
                  <span style={s.conceptIcon}>{c.icon}</span>
                  <div>
                    <div style={s.conceptTitle}>{c.title}</div>
                    <div style={s.conceptDesc}>{c.description}</div>
                  </div>
                </div>
              ))}
            </div>
            <div style={s.btnRow}>
              <button onClick={() => setStep(0)} style={s.secondaryBtn}>Back</button>
              <button onClick={() => setStep(2)} style={s.primaryBtn}>Next</button>
            </div>
          </div>
        )}

        {/* Step 2: Quick Start Actions */}
        {step === 2 && (
          <div style={s.stepContent}>
            <h2 style={s.title}>Where would you like to start?</h2>
            <p style={s.subtitle}>Pick an action or explore on your own.</p>
            <div style={s.actionGrid}>
              {QUICK_ACTIONS.map((a, i) => (
                <button
                  key={i}
                  onClick={() => handleFinish(a.view)}
                  style={s.actionCard}
                >
                  <span style={{ fontSize: 28 }}>{a.icon}</span>
                  <span style={s.actionLabel}>{a.label}</span>
                </button>
              ))}
            </div>
            <div style={s.btnRow}>
              <button onClick={() => setStep(1)} style={s.secondaryBtn}>Back</button>
              <button onClick={() => handleFinish()} style={s.skipBtn}>
                Skip — go to Dashboard
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────
const s: Record<string, React.CSSProperties> = {
  backdrop: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0, 0, 0, 0.75)',
    backdropFilter: 'blur(8px)',
    zIndex: 10000,
  },
  modal: {
    position: 'fixed',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: '100%',
    maxWidth: 480,
    maxHeight: '90vh',
    overflowY: 'auto',
    background: 'linear-gradient(180deg, #13131f 0%, #0d0d18 100%)',
    borderRadius: 20,
    border: '1px solid rgba(255, 255, 255, 0.1)',
    boxShadow: '0 32px 80px rgba(0, 0, 0, 0.6), 0 0 60px rgba(102, 126, 234, 0.08)',
    padding: '32px 28px',
    zIndex: 10001,
    animation: 'fadeIn 0.3s ease',
  },
  progressRow: {
    display: 'flex',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 28,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: '50%',
    background: 'rgba(255, 255, 255, 0.15)',
    transition: 'all 0.3s ease',
  },
  dotActive: {
    background: 'linear-gradient(135deg, #667eea, #764ba2)',
    width: 24,
    borderRadius: 4,
  },
  dotComplete: {
    background: '#22c55e',
  },
  stepContent: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 16,
  },
  heroIcon: {
    position: 'relative',
    marginBottom: 4,
  },
  heroGlow: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: 100,
    height: 100,
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(102, 126, 234, 0.2), transparent 70%)',
    zIndex: -1,
  },
  title: {
    margin: 0,
    color: '#fff',
    fontSize: '1.35rem',
    fontWeight: 700,
    textAlign: 'center',
    lineHeight: 1.3,
  },
  subtitle: {
    margin: 0,
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: '0.9rem',
    textAlign: 'center',
    lineHeight: 1.5,
    maxWidth: 360,
  },
  inputGroup: {
    width: '100%',
    maxWidth: 320,
    marginTop: 8,
  },
  inputLabel: {
    display: 'block',
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: '0.8rem',
    fontWeight: 500,
    marginBottom: 8,
  },
  input: {
    width: '100%',
    padding: '12px 16px',
    borderRadius: 12,
    border: '1px solid rgba(255, 255, 255, 0.12)',
    background: 'rgba(255, 255, 255, 0.04)',
    color: '#fff',
    fontSize: '1rem',
    outline: 'none',
    transition: 'border-color 0.2s ease',
    boxSizing: 'border-box',
  },
  primaryBtn: {
    padding: '12px 32px',
    borderRadius: 12,
    border: 'none',
    background: 'linear-gradient(135deg, #667eea, #764ba2)',
    color: '#fff',
    fontSize: '0.95rem',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
    marginTop: 8,
  },
  secondaryBtn: {
    padding: '10px 20px',
    borderRadius: 10,
    border: '1px solid rgba(255, 255, 255, 0.12)',
    background: 'rgba(255, 255, 255, 0.04)',
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: '0.85rem',
    fontWeight: 500,
    cursor: 'pointer',
  },
  skipBtn: {
    padding: '10px 20px',
    borderRadius: 10,
    border: 'none',
    background: 'transparent',
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: '0.85rem',
    fontWeight: 500,
    cursor: 'pointer',
    textDecoration: 'underline',
    textUnderlineOffset: '3px',
  },
  btnRow: {
    display: 'flex',
    gap: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  conceptGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    width: '100%',
    marginTop: 4,
  },
  conceptCard: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 14,
    padding: '14px 16px',
    borderRadius: 14,
    background: 'rgba(255, 255, 255, 0.03)',
    border: '1px solid rgba(255, 255, 255, 0.06)',
  },
  conceptIcon: {
    fontSize: 28,
    flexShrink: 0,
    marginTop: 2,
  },
  conceptTitle: {
    color: '#fff',
    fontSize: '0.9rem',
    fontWeight: 600,
    marginBottom: 4,
  },
  conceptDesc: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: '0.8rem',
    lineHeight: 1.5,
  },
  actionGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 10,
    width: '100%',
    marginTop: 4,
  },
  actionCard: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 8,
    padding: '20px 12px',
    borderRadius: 14,
    border: '1px solid rgba(255, 255, 255, 0.08)',
    background: 'rgba(255, 255, 255, 0.03)',
    color: '#fff',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    fontSize: '0.85rem',
  },
  actionLabel: {
    fontWeight: 500,
    textAlign: 'center',
  },
};
