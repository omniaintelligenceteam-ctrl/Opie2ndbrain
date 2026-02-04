'use client';
import React, { useState, useRef, useEffect, useCallback, useMemo, memo } from 'react';
import ConversationSidebar, { sidebarAnimationStyles } from './ConversationSidebar';
import MessageContextMenu, { contextMenuAnimationStyles } from './MessageContextMenu';
import { Conversation } from '@/types/conversation';
import { OpieAvatar } from './OpieAvatar';
import { Mic, Camera } from 'lucide-react';

// ============================================================================
// Types
// ============================================================================

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: Date;
  status?: 'sending' | 'sent' | 'delivered' | 'read' | 'error';
  image?: string; // Base64 or URL of attached image
}

type ChatMode = 'closed' | 'minimized' | 'open' | 'fullscreen';
type VoiceState = 'idle' | 'listening' | 'processing' | 'speaking' | 'working';
export type InteractionMode = 'plan' | 'execute';
export type AIModel = 'kimi' | 'opus' | 'sonnet' | 'haiku';

export const AI_MODELS: { id: AIModel; name: string; description: string }[] = [
  { id: 'kimi', name: 'Kimi K2', description: 'Default - fast and capable' },
  { id: 'opus', name: 'Claude Opus', description: 'Most capable, best for complex tasks' },
  { id: 'sonnet', name: 'Claude Sonnet', description: 'Balanced performance and speed' },
  { id: 'haiku', name: 'Claude Haiku', description: 'Fast and cost-effective' },
];

interface FloatingChatProps {
  messages: ChatMessage[];
  input: string;
  setInput: (val: string) => void;
  isLoading: boolean;
  isWorking?: boolean;
  onSend: (text?: string, image?: string, mode?: InteractionMode) => void;
  micOn: boolean;
  onMicToggle: () => void;
  isSpeaking: boolean;
  transcript: string;
  onCancelProcessing?: () => void;
  interactionMode?: InteractionMode;
  onInteractionModeChange?: (mode: InteractionMode) => void;
  selectedModel?: AIModel;
  onModelChange?: (model: AIModel) => void;
  // Conversation management (new)
  conversations?: Conversation[];
  activeConversationId?: string | null;
  onConversationCreate?: () => void;
  onConversationSwitch?: (id: string) => void;
  onConversationDelete?: (id: string) => void;
  onConversationFork?: (fromMessageId: string) => void;
  onSummarizeAndContinue?: () => void;
  // Pinned panel mode (for multi-chat comparison)
  isPinned?: boolean;
  onUnpin?: () => void;
  pinnedTitle?: string;
  // Pin conversation to comparison panel
  pinnedConversationIds?: string[];
  onPinConversation?: (id: string) => void;
  // Secondary window mode (for multiple interactive chats)
  isSecondary?: boolean;
  windowIndex?: number;
  onClose?: () => void;
  conversationId?: string;
}

// ============================================================================
// Utility Functions
// ============================================================================

// Use a counter for IDs to avoid hydration mismatches
let idCounter = 0;
function generateId(): string {
  idCounter += 1;
  // Only use Date.now() on client side
  if (typeof window === 'undefined') {
    return `msg-server-${idCounter}`;
  }
  return `msg-${Date.now()}-${idCounter}`;
}

function formatTime(date: Date | string, mounted: boolean): string {
  if (!mounted) return '...';
  const d = date instanceof Date ? date : new Date(date);
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

function formatRelativeTime(date: Date | string, mounted: boolean): string {
  if (!mounted) return '...';
  const d = date instanceof Date ? date : new Date(date);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
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

// Avatar Component with Omnia-style ring - Memoized to prevent re-renders during voice activity
const Avatar = memo(function Avatar({ size = 32, showRing = false }: { size?: number; showRing?: boolean }) {
  const ringSize = size + 12;

  if (showRing) {
    return (
      <div style={{
        position: 'relative',
        width: ringSize,
        height: ringSize,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}>
        {/* Outer ring */}
        <div style={{
          position: 'absolute',
          inset: 0,
          borderRadius: '50%',
          border: '3px solid #3B82F6',
          boxShadow: '0 0 15px rgba(59, 130, 246, 0.4), inset 0 0 10px rgba(59, 130, 246, 0.1)',
        }} />
        {/* Inner ring */}
        <div style={{
          position: 'absolute',
          inset: 4,
          borderRadius: '50%',
          border: '2px solid rgba(30, 58, 95, 0.8)',
        }} />
        {/* Avatar image - GPU accelerated to prevent flicker */}
        <img
          src="/opie-avatar.png"
          alt="Opie"
          loading="eager"
          decoding="sync"
          style={{
            width: size,
            height: size,
            borderRadius: '50%',
            objectFit: 'cover',
            position: 'relative',
            zIndex: 1,
            transform: 'translate3d(0,0,0)',
            backfaceVisibility: 'hidden',
          }}
        />
      </div>
    );
  }

  return (
    <img
      src="/opie-avatar.png"
      alt="Opie"
      loading="eager"
      decoding="sync"
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        objectFit: 'cover',
        border: '2px solid rgba(102, 126, 234, 0.3)',
        flexShrink: 0,
        transform: 'translate3d(0,0,0)',
        backfaceVisibility: 'hidden',
      }}
    />
  );
});

// Status Indicator - Memoized
const StatusIndicator = memo(function StatusIndicator({ state, size = 8 }: { state: VoiceState; size?: number }) {
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
});

// Voice Waveform Animation - Memoized
const VoiceWaveform = memo(function VoiceWaveform({ active, color = '#22c55e' }: { active: boolean; color?: string }) {
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
});

// Typing Indicator - Memoized
const TypingIndicator = memo(function TypingIndicator() {
  return (
    <div style={styles.typingContainer}>
      <OpieAvatar size={28} state="thinking" />
      <div style={styles.typingBubble}>
        <div style={styles.typingDots}>
          <span style={{ ...styles.typingDot, animationDelay: '0s' }} />
          <span style={{ ...styles.typingDot, animationDelay: '0.2s' }} />
          <span style={{ ...styles.typingDot, animationDelay: '0.4s' }} />
        </div>
      </div>
    </div>
  );
});

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
  interactionMode: controlledInteractionMode,
  onInteractionModeChange,
  selectedModel: controlledModel,
  onModelChange,
  conversations,
  activeConversationId,
  onConversationCreate,
  onConversationSwitch,
  onConversationDelete,
  onConversationFork,
  onSummarizeAndContinue,
  isPinned = false,
  onUnpin,
  pinnedTitle,
  pinnedConversationIds = [],
  onPinConversation,
  isSecondary = false,
  windowIndex = 0,
  onClose,
  conversationId,
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
  const [pendingImage, setPendingImage] = useState<string | null>(null);
  const [localInteractionMode, setLocalInteractionMode] = useState<InteractionMode>('execute');
  const [localModel, setLocalModel] = useState<AIModel>('kimi');
  const [showModelPicker, setShowModelPicker] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    messageId: string;
    messageText: string;
    isAssistant: boolean;
  } | null>(null);

  // Use controlled mode if provided, otherwise use local state
  const interactionMode = controlledInteractionMode ?? localInteractionMode;
  const setInteractionMode = onInteractionModeChange ?? setLocalInteractionMode;
  const selectedModel = controlledModel ?? localModel;
  const setSelectedModel = onModelChange ?? setLocalModel;
  const detachedWindowRef = useRef<Window | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // Helper to get avatar state from voice state
  const getAvatarState = (): 'idle' | 'listening' | 'thinking' | 'speaking' | 'error' => {
    switch (voiceState) {
      case 'listening': return 'listening';
      case 'processing': return 'thinking';
      case 'speaking': return 'speaking';
      case 'working': return 'thinking';
      default: return 'idle';
    }
  };

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
          .mode-toggle-container {
            padding: 8px 16px;
            border-top: 1px solid rgba(255, 255, 255, 0.08);
            display: flex;
            gap: 8px;
            background: rgba(0, 0, 0, 0.15);
          }
          .mode-btn {
            flex: 1;
            padding: 10px 16px;
            border-radius: 12px;
            border: 1px solid rgba(255, 255, 255, 0.1);
            background: rgba(255, 255, 255, 0.05);
            color: rgba(255, 255, 255, 0.7);
            font-size: 0.85rem;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
            transition: all 0.2s ease;
          }
          .mode-btn:hover { background: rgba(255, 255, 255, 0.1); }
          .mode-btn.active-plan {
            background: linear-gradient(135deg, rgba(139, 92, 246, 0.3) 0%, rgba(168, 85, 247, 0.2) 100%);
            border: 1px solid rgba(139, 92, 246, 0.5);
            color: #a78bfa;
          }
          .mode-btn.active-doit {
            background: linear-gradient(135deg, rgba(249, 115, 22, 0.3) 0%, rgba(239, 68, 68, 0.2) 100%);
            border: 1px solid rgba(249, 115, 22, 0.5);
            color: #fb923c;
            animation: doItPulse 2s ease-in-out infinite;
          }
          @keyframes doItPulse {
            0%, 100% { box-shadow: 0 0 5px rgba(249, 115, 22, 0.4); }
            50% { box-shadow: 0 0 20px rgba(249, 115, 22, 0.8), 0 0 30px rgba(239, 68, 68, 0.4); }
          }
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
          <div class="mode-toggle-container">
            <button class="mode-btn" id="plan-btn" onclick="setMode('plan')">
              <span>💭</span><span>Plan</span>
            </button>
            <button class="mode-btn" id="doit-btn" onclick="setMode('execute')">
              <span>🔥</span><span>DO IT</span>
            </button>
          </div>
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
          const planBtn = document.getElementById('plan-btn');
          const doitBtn = document.getElementById('doit-btn');
          let currentMode = 'plan';

          // Listen for messages from parent window
          window.addEventListener('message', (event) => {
            if (event.data.type === 'OPIE_CHAT_UPDATE') {
              renderMessages(event.data.messages, event.data.isLoading);
              if (event.data.interactionMode) {
                updateModeUI(event.data.interactionMode);
              }
            }
          });

          // Request initial state
          if (window.opener) {
            window.opener.postMessage({ type: 'OPIE_CHAT_REQUEST_STATE' }, '*');
          }

          function setMode(mode) {
            currentMode = mode;
            updateModeUI(mode);
            if (window.opener) {
              window.opener.postMessage({ type: 'OPIE_CHAT_MODE_CHANGE', mode }, '*');
            }
          }

          function updateModeUI(mode) {
            currentMode = mode;
            planBtn.className = 'mode-btn' + (mode === 'plan' ? ' active-plan' : '');
            doitBtn.className = 'mode-btn' + (mode === 'execute' ? ' active-doit' : '');
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
          interactionMode,
        }, '*');
      } else if (event.data.type === 'OPIE_CHAT_SEND') {
        // Handle message sent from detached window
        setInput(event.data.text);
        setTimeout(() => onSend(event.data.text), 50);
      } else if (event.data.type === 'OPIE_CHAT_MODE_CHANGE') {
        // Handle mode change from detached window
        setInteractionMode(event.data.mode);
      } else if (event.data.type === 'OPIE_CHAT_DETACHED_CLOSED') {
        setIsDetached(false);
        detachedWindowRef.current = null;
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [messages, isLoading, onSend, setInput, interactionMode, setInteractionMode]);
  
  // Sync messages and mode to detached window
  useEffect(() => {
    if (isDetached && detachedWindowRef.current && !detachedWindowRef.current.closed) {
      detachedWindowRef.current.postMessage({
        type: 'OPIE_CHAT_UPDATE',
        messages: messages.map(m => ({ role: m.role, text: m.text })),
        isLoading,
        interactionMode,
      }, '*');
    }
  }, [messages, isLoading, isDetached, interactionMode]);
  
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

  // Convert file to base64 data URL
  const fileToBase64 = (file: File): Promise<string | null> => {
    return new Promise((resolve) => {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file');
        resolve(null);
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('Image must be less than 5MB');
        resolve(null);
        return;
      }

      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => {
        console.error('Failed to read image');
        resolve(null);
      };
      reader.readAsDataURL(file);
    });
  };

  // Handle image selection
  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const base64 = await fileToBase64(file);
    if (base64) {
      setPendingImage(base64);
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Handle paste for images
  const handlePaste = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const file = item.getAsFile();
        if (!file) continue;

        const base64 = await fileToBase64(file);
        if (base64) {
          setPendingImage(base64);
        }
        return;
      }
    }
  };

  // Handle drag and drop
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer?.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    if (!file.type.startsWith('image/')) return;

    const base64 = await fileToBase64(file);
    if (base64) {
      setPendingImage(base64);
    }
  };

  // Handle keyboard
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (input.trim() || pendingImage) {
        onSend(input, pendingImage || undefined, interactionMode);
        setPendingImage(null);
        setHasInteracted(true);
      }
    }
    if (e.key === 'Escape') {
      setMode('minimized');
    }
  };

  // Handle send with local text, optional image, and interaction mode
  const handleSendClick = () => {
    if (input.trim() || pendingImage) {
      onSend(input, pendingImage || undefined, interactionMode);
      setPendingImage(null);
      setHasInteracted(true);
    }
  };

  const handleMessageContextMenu = (
    e: React.MouseEvent,
    messageId: string,
    messageText: string,
    isAssistant: boolean
  ) => {
    e.preventDefault();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      messageId,
      messageText,
      isAssistant,
    });
  };

  const handleCopyMessage = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (err) {
      console.error('Failed to copy:', err);
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

  // Pinned Panel Mode - simplified comparison view
  if (isPinned) {
    return (
      <>
        <style>{animationStyles}</style>
        <div
          style={{
            ...styles.chatContainer,
            position: 'relative',
            bottom: 'auto',
            right: 'auto',
            width: '100%',
            height: '100%',
            borderRadius: 12,
            border: '1px solid rgba(234, 179, 102, 0.3)',
          }}
        >
          {/* Pinned Header */}
          <header style={{
            ...styles.header,
            background: 'linear-gradient(135deg, rgba(234, 179, 102, 0.2) 0%, rgba(26, 26, 46, 0.95) 100%)',
          }}>
            <div style={styles.headerLeft}>
              <span style={{ fontSize: '16px', marginRight: 8 }}>📌</span>
              <div style={styles.headerInfo}>
                <span style={styles.headerName}>
                  {pinnedTitle || 'Pinned Chat'}
                </span>
                <span style={{ ...styles.headerStatus, color: 'rgba(234, 179, 102, 0.8)' }}>
                  Comparison view
                </span>
              </div>
            </div>
            <div style={styles.headerRight}>
              {onUnpin && (
                <button
                  onClick={onUnpin}
                  style={styles.headerButton}
                  title="Close panel"
                >
                  ×
                </button>
              )}
            </div>
          </header>

          {/* Messages (read-only) */}
          <div style={styles.messagesContainer}>
            {messages.length === 0 ? (
              <div style={styles.emptyState}>
                <span style={styles.emptyEmoji}>📜</span>
                <p style={styles.emptyText}>No messages in this conversation</p>
              </div>
            ) : (
              messages.filter(msg => msg.role === 'user' || msg.text).map((msg, i) => {
                const isUser = msg.role === 'user';
                const prevMsg = i > 0 ? messages[i - 1] : undefined;
                const shouldGroup = shouldGroupMessages(msg, prevMsg);

                return (
                  <div
                    key={msg.id}
                    style={{
                      ...styles.messageRow,
                      justifyContent: isUser ? 'flex-end' : 'flex-start',
                      marginTop: shouldGroup ? 2 : 12,
                    }}
                  >
                    {!isUser && !shouldGroup && <OpieAvatar size={28} state="idle" />}
                    {!isUser && shouldGroup && <div style={{ width: 28 }} />}
                    <div style={{
                      ...(isUser ? styles.userBubble : styles.assistantBubble),
                      maxWidth: '85%',
                    }}>
                      <p style={styles.messageText}>{msg.text}</p>
                      {!shouldGroup && (
                        <span style={styles.messageTime}>
                          {formatTime(msg.timestamp, mounted)}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </>
    );
  }

  // Secondary Window Mode - fully interactive multi-chat
  if (isSecondary) {
    // Calculate position based on window index (stagger left)
    const offsetLeft = 20 + (windowIndex * 400);

    return (
      <>
        <style>{animationStyles}</style>
        <div
          style={{
            ...styles.chatContainer,
            position: 'fixed',
            bottom: 24,
            left: offsetLeft,
            right: 'auto',
            width: 380,
            height: 500,
            borderRadius: 16,
            border: '1px solid rgba(168, 85, 247, 0.3)',
            zIndex: 998 + windowIndex,
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), 0 0 20px rgba(168, 85, 247, 0.15)',
          }}
        >
          {/* Secondary Chat Header */}
          <header style={{
            ...styles.header,
            background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.15) 0%, rgba(6, 182, 212, 0.08) 100%)',
            borderBottom: '1px solid rgba(168, 85, 247, 0.2)',
          }}>
            <div style={styles.headerLeft}>
              <Avatar size={32} />
              <div style={styles.headerInfo}>
                <span style={{
                  ...styles.headerName,
                  fontSize: '0.95rem',
                }}>
                  {pinnedTitle || `Chat ${windowIndex + 2}`}
                </span>
                <span style={{
                  ...styles.headerStatus,
                  color: isLoading ? '#a855f7' : 'rgba(255,255,255,0.5)',
                }}>
                  <StatusIndicator state={isLoading ? 'processing' : 'idle'} size={6} />
                  {isLoading ? 'Thinking...' : 'Ready'}
                </span>
              </div>
            </div>
            <div style={styles.headerActions}>
              {onClose && (
                <button
                  onClick={onClose}
                  style={styles.headerButtonClose}
                  title="Close chat window"
                >
                  ×
                </button>
              )}
            </div>
          </header>

          {/* Messages */}
          <div style={{ ...styles.messagesContainer, flex: 1 }}>
            {messages.length === 0 ? (
              <div style={styles.welcomeContainer}>
                <div style={styles.welcomeEmoji}>💬</div>
                <h3 style={styles.welcomeTitle}>New Chat</h3>
                <p style={styles.welcomeText}>
                  Start a new conversation in this window
                </p>
              </div>
            ) : (
              messages.filter(msg => msg.role === 'user' || msg.text).map((msg, i) => {
                const isUser = msg.role === 'user';
                const prevMsg = i > 0 ? messages[i - 1] : undefined;
                const shouldGroup = shouldGroupMessages(msg, prevMsg);

                return (
                  <div
                    key={msg.id}
                    style={{
                      ...styles.messageRow,
                      justifyContent: isUser ? 'flex-end' : 'flex-start',
                      marginTop: shouldGroup ? 2 : 12,
                    }}
                  >
                    {!isUser && !shouldGroup && <Avatar size={28} />}
                    {!isUser && shouldGroup && <div style={{ width: 28 }} />}
                    <div style={styles.messageBubbleWrapper}>
                      <div
                        style={{
                          ...styles.messageBubble,
                          ...(isUser ? styles.messageBubbleUser : styles.messageBubbleAssistant),
                          borderRadius: isUser
                            ? (shouldGroup ? '16px' : '16px 16px 4px 16px')
                            : (shouldGroup ? '16px' : '16px 16px 16px 4px'),
                        }}
                      >
                        {renderMessageText(msg.text)}
                      </div>
                      {!shouldGroup && (
                        <div style={{
                          ...styles.messageTimestamp,
                          justifyContent: isUser ? 'flex-end' : 'flex-start',
                        }}>
                          {formatTime(msg.timestamp, mounted)}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}

            {isLoading && <TypingIndicator />}
            <div ref={chatEndRef} />
          </div>

          {/* Mode Toggle - Simplified */}
          <div style={{
            ...styles.modeToggleContainer,
            padding: '6px 12px',
          }}>
            <div style={styles.modeToggle}>
              <button
                onClick={() => setInteractionMode('plan')}
                style={{
                  ...styles.modeButton,
                  padding: '6px 10px',
                  ...(interactionMode === 'plan' ? styles.modeButtonActive : {}),
                }}
              >
                <span style={styles.modeIcon}>💭</span>
                <span>Plan</span>
              </button>
              <button
                onClick={() => setInteractionMode('execute')}
                style={{
                  ...styles.modeButton,
                  padding: '6px 10px',
                  ...(interactionMode === 'execute' ? styles.modeButtonActiveDoIt : {}),
                }}
              >
                <span style={styles.modeIcon}>🔥</span>
                <span>DO IT</span>
              </button>
            </div>
          </div>

          {/* Input Area */}
          <div style={styles.inputArea}>
            <div style={styles.inputWrapper}>
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if (input.trim() && !isLoading) {
                      onSend(input.trim(), undefined, interactionMode);
                    }
                  }
                }}
                placeholder="Type a message..."
                style={styles.textInput}
                rows={1}
                disabled={isLoading}
              />
            </div>
            <button
              onClick={() => {
                if (input.trim() && !isLoading) {
                  onSend(input.trim(), undefined, interactionMode);
                }
              }}
              disabled={!input.trim() || isLoading}
              style={{
                ...styles.sendButton,
                opacity: !input.trim() || isLoading ? 0.5 : 1,
                width: 40,
                height: 40,
              }}
            >
              {isLoading ? '⏳' : '↑'}
            </button>
          </div>
        </div>
      </>
    );
  }

  // Closed - Premium aurora avatar
  if (mode === 'closed') {
    return (
      <>
        <div style={{ position: 'fixed', bottom: 16, right: 16, zIndex: 1000 }}>
          <OpieAvatar
            size={70}
            state="idle"
            interactive={true}
            onClick={() => { setMode('open'); setHasInteracted(true); }}
          />
        </div>
        {unreadCount > 0 && (
          <span style={{
            ...styles.unreadBadge,
            position: 'fixed',
            bottom: 78,
            right: 16,
          }}>{unreadCount}</span>
        )}
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
          <OpieAvatar size={32} state={getAvatarState()} />
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
  // Use mounted state to avoid hydration mismatch
  const isMobile = mounted && typeof window !== 'undefined' && window.innerWidth < 768;

  return (
    <>
      <style>{animationStyles}</style>
      <div
        ref={containerRef}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        style={{
          ...styles.chatContainer,
          ...(isFullscreen || isMobile ? styles.chatFullscreen : {
            width: size.width,
            height: size.height,
          }),
          ...(isDragging ? styles.chatContainerDragging : {}),
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
            {/* Sidebar toggle button - NEW */}
            {conversations && conversations.length > 0 && (
              <button
                onClick={() => setShowSidebar(true)}
                style={styles.headerButton}
                title="Conversation history"
              >
                ☰
              </button>
            )}
            <OpieAvatar size={36} state={getAvatarState()} />
            <div style={styles.headerInfo}>
              <span style={styles.headerName}>
                {activeConversationId && conversations?.find(c => c.id === activeConversationId)?.title || 'Opie'}
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
          
          {/* Model Selector in Header */}
          <div style={styles.headerModelPicker}>
            <button
              onClick={() => setShowModelPicker(!showModelPicker)}
              style={styles.headerModelButton}
              title="Switch AI model"
            >
              <span style={styles.headerModelName}>
                {AI_MODELS.find(m => m.id === selectedModel)?.name.split(' ').pop() || 'Opus'}
              </span>
              <span style={styles.headerModelArrow}>{showModelPicker ? '▲' : '▼'}</span>
            </button>
            {showModelPicker && (
              <div style={styles.headerModelDropdown}>
                {AI_MODELS.map(model => (
                  <button
                    key={model.id}
                    onClick={() => {
                      setSelectedModel(model.id);
                      setShowModelPicker(false);
                    }}
                    style={{
                      ...styles.headerModelOption,
                      ...(selectedModel === model.id ? styles.headerModelOptionActive : {}),
                    }}
                  >
                    {model.name}
                  </button>
                ))}
              </div>
            )}
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
              <OpieAvatar size={80} state="idle" />
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
            // Skip empty assistant messages (typing indicator will show instead)
            if (msg.role === 'assistant' && !msg.text) return null;

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
                  <OpieAvatar size={28} state={getAvatarState()} />
                )}
                {!isUser && isGrouped && (
                  <div style={{ width: 28, flexShrink: 0 }} />
                )}
                
                <div style={{
                  ...styles.messageBubbleWrapper,
                  alignItems: isUser ? 'flex-end' : 'flex-start',
                }}>
                  <div
                    onContextMenu={(e) => handleMessageContextMenu(e, msg.id, msg.text, !isUser)}
                    style={{
                      ...styles.messageBubble,
                      ...(isUser ? styles.messageBubbleUser : styles.messageBubbleAssistant),
                      borderRadius: isUser
                        ? (isGrouped ? '18px 18px 4px 18px' : '18px 18px 4px 18px')
                        : (isGrouped ? '18px 18px 18px 4px' : '18px 18px 18px 4px'),
                    }}
                  >
                    {msg.image && (
                      <img 
                        src={msg.image} 
                        alt="Attached" 
                        style={styles.messageImage}
                        onClick={() => window.open(msg.image, '_blank')}
                      />
                    )}
                    {msg.text && renderMessageText(msg.text)}
                    
                    {/* Copy button on hover for assistant */}
                    {!isUser && msg.text && (
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

        {/* Pending Image Preview */}
        {pendingImage && (
          <div style={styles.pendingImageContainer}>
            <img
              src={pendingImage}
              alt="Pending"
              style={styles.pendingImage}
            />
            <button
              onClick={() => setPendingImage(null)}
              style={styles.removePendingImage}
              title="Remove image"
            >
              ✕
            </button>
          </div>
        )}

        {/* Mode Toggle */}
        <div style={styles.modeToggleContainer}>
          <div style={styles.modeToggle}>
            <button
              onClick={() => setInteractionMode('plan')}
              style={{
                ...styles.modeButton,
                ...(interactionMode === 'plan' ? styles.modeButtonActive : {}),
              }}
              title="Plan Mode - Brainstorm and discuss without taking action"
            >
              <span style={styles.modeIcon}>💭</span>
              <span>Plan</span>
            </button>
            <button
              onClick={() => setInteractionMode('execute')}
              style={{
                ...styles.modeButton,
                ...(interactionMode === 'execute' ? styles.modeButtonActiveDoIt : {}),
              }}
              title="DO IT Mode - Execute with OpenClaw power"
            >
              <span style={styles.modeIcon}>🔥</span>
              <span>DO IT</span>
            </button>
          </div>
          
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
                : 'rgba(255, 255, 255, 0.1)',
            }}
            title={micOn ? 'Stop listening' : 'Start voice input'}
          >
            {voiceState === 'processing' ? (
              <span style={styles.micSpinner}>◌</span>
            ) : (
              <>
                <Mic size={22} strokeWidth={2} style={{ filter: micOn ? 'drop-shadow(0 0 8px rgba(34, 197, 94, 0.8))' : 'none', transition: 'filter 0.2s ease' }} />
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

          {/* Image upload button */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageSelect}
            style={{ display: 'none' }}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            style={styles.imageButton}
            title="Attach image"
          >
            <Camera size={20} strokeWidth={2} />
          </button>

          {/* Text input */}
          <div style={styles.inputWrapper}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
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
            disabled={isLoading || (!input.trim() && !pendingImage)}
            style={{
              ...styles.sendButton,
              opacity: (input.trim() || pendingImage) && !isLoading ? 1 : 0.5,
              cursor: (input.trim() || pendingImage) && !isLoading ? 'pointer' : 'not-allowed',
            }}
            title="Send message"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 2L11 13M22 2L15 22L11 13L2 9L22 2Z" />
            </svg>
          </button>
        </div>

      </div>

        {/* Conversation Sidebar */}
        {conversations && (
          <ConversationSidebar
            isOpen={showSidebar}
            onClose={() => setShowSidebar(false)}
            conversations={conversations}
            activeConversationId={activeConversationId || null}
            onSelectConversation={(id) => {
              onConversationSwitch?.(id);
              setShowSidebar(false);
            }}
            onNewConversation={() => {
              onConversationCreate?.();
              setShowSidebar(false);
            }}
            onDeleteConversation={onConversationDelete || (() => {})}
            pinnedConversationIds={pinnedConversationIds}
            onPinConversation={onPinConversation}
          />
        )}

        {/* Context Menu */}
        {contextMenu && (
          <MessageContextMenu
            x={contextMenu.x}
            y={contextMenu.y}
            onClose={() => setContextMenu(null)}
            onFork={() => onConversationFork?.(contextMenu.messageId)}
            onSummarize={() => onSummarizeAndContinue?.()}
            onCopy={() => handleCopyMessage(contextMenu.messageText)}
            isAssistantMessage={contextMenu.isAssistant}
          />
        )}
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

  @keyframes doItPulse {
    0%, 100% {
      box-shadow: 0 0 5px rgba(249, 115, 22, 0.4);
      transform: scale(1);
    }
    50% {
      box-shadow: 0 0 20px rgba(249, 115, 22, 0.8), 0 0 30px rgba(239, 68, 68, 0.4);
      transform: scale(1.02);
    }
  }
  ${sidebarAnimationStyles}
  ${contextMenuAnimationStyles}
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
  chatContainerDragging: {
    border: '2px dashed #667eea',
    background: 'rgba(102, 126, 234, 0.1)',
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

  // Header - Enhanced with Neon Effects
  header: {
    padding: '14px 16px',
    borderBottom: '1px solid rgba(168, 85, 247, 0.2)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.05) 0%, rgba(6, 182, 212, 0.03) 100%)',
    boxShadow: 'inset 0 -1px 0 rgba(168, 85, 247, 0.1)',
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
    background: 'linear-gradient(135deg, #a855f7, #06b6d4, #ec4899, #a855f7)',
    backgroundSize: '300% 300%',
    backgroundClip: 'text',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    fontWeight: 700,
    fontSize: '1.1rem',
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    animation: 'textGradient 4s ease infinite',
    filter: 'drop-shadow(0 0 8px rgba(168, 85, 247, 0.3))',
  },
  headerBolt: {
    fontSize: '0.9rem',
    animation: 'floatGlow 2s ease-in-out infinite',
    filter: 'drop-shadow(0 0 6px rgba(249, 115, 22, 0.6))',
  },
  headerStatus: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    fontSize: '0.8rem',
    transition: 'color 0.3s',
  },
  headerModelPicker: {
    position: 'relative' as const,
    marginRight: 8,
  },
  headerModelButton: {
    padding: '6px 10px',
    borderRadius: 8,
    border: '1px solid rgba(255, 255, 255, 0.15)',
    background: 'rgba(255, 255, 255, 0.08)',
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: '0.75rem',
    fontWeight: 500,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    transition: 'all 0.2s ease',
  },
  headerModelName: {
    maxWidth: 60,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  },
  headerModelArrow: {
    fontSize: '0.5rem',
    opacity: 0.6,
  },
  headerModelDropdown: {
    position: 'absolute' as const,
    top: '100%',
    right: 0,
    marginTop: 4,
    background: 'rgba(20, 20, 30, 0.98)',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    borderRadius: 10,
    overflow: 'hidden',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.5)',
    zIndex: 1000,
    minWidth: 140,
  },
  headerModelOption: {
    width: '100%',
    padding: '10px 12px',
    border: 'none',
    background: 'transparent',
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: '0.8rem',
    cursor: 'pointer',
    textAlign: 'left' as const,
    transition: 'background 0.15s ease',
  },
  headerModelOptionActive: {
    background: 'rgba(102, 126, 234, 0.25)',
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
    background: 'linear-gradient(135deg, #a855f7 0%, #6366f1 50%, #06b6d4 100%)',
    color: '#fff',
    boxShadow: '0 4px 15px rgba(168, 85, 247, 0.3), 0 0 20px rgba(168, 85, 247, 0.15)',
    border: '1px solid rgba(168, 85, 247, 0.3)',
  },
  messageBubbleAssistant: {
    background: 'rgba(255, 255, 255, 0.06)',
    color: '#fff',
    border: '1px solid rgba(6, 182, 212, 0.15)',
    boxShadow: 'inset 0 0 20px rgba(6, 182, 212, 0.05)',
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

  // Mode Toggle
  modeToggleContainer: {
    padding: '8px 16px',
    borderTop: '1px solid rgba(255, 255, 255, 0.08)',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 6,
    background: 'rgba(0, 0, 0, 0.15)',
  },
  modeToggle: {
    display: 'flex',
    gap: 8,
  },
  modeButton: {
    flex: 1,
    padding: '8px 12px',
    borderRadius: 12,
    border: '1px solid rgba(255, 255, 255, 0.1)',
    background: 'rgba(255, 255, 255, 0.05)',
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: '0.85rem',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    transition: 'all 0.2s ease',
  },
  modeButtonActive: {
    background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.3) 0%, rgba(168, 85, 247, 0.2) 100%)',
    border: '1px solid rgba(139, 92, 246, 0.5)',
    color: '#a78bfa',
  },
  modeButtonActiveDoIt: {
    background: 'linear-gradient(135deg, rgba(249, 115, 22, 0.3) 0%, rgba(239, 68, 68, 0.2) 100%)',
    border: '1px solid rgba(249, 115, 22, 0.5)',
    color: '#fb923c',
    animation: 'doItPulse 2s ease-in-out infinite',
  },
  modeIcon: {
    fontSize: '14px',
  },
  modeHint: {
    fontSize: '0.7rem',
    color: 'rgba(255, 255, 255, 0.4)',
    textAlign: 'center' as const,
  },
  
  // Model Picker
  modelPickerRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  modelLabel: {
    fontSize: '0.75rem',
    color: 'rgba(255, 255, 255, 0.5)',
  },
  modelPickerWrapper: {
    position: 'relative' as const,
    flex: 1,
  },
  modelPickerButton: {
    width: '100%',
    padding: '6px 10px',
    borderRadius: 8,
    border: '1px solid rgba(255, 255, 255, 0.15)',
    background: 'rgba(255, 255, 255, 0.08)',
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: '0.8rem',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    transition: 'all 0.2s ease',
  },
  modelPickerArrow: {
    fontSize: '0.6rem',
    opacity: 0.6,
  },
  modelPickerDropdown: {
    position: 'absolute' as const,
    bottom: '100%',
    left: 0,
    right: 0,
    marginBottom: 4,
    background: 'rgba(30, 30, 40, 0.98)',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    borderRadius: 10,
    overflow: 'hidden',
    boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.4)',
    zIndex: 100,
  },
  modelOption: {
    width: '100%',
    padding: '10px 12px',
    border: 'none',
    background: 'transparent',
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: '0.8rem',
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'flex-start',
    gap: 2,
    textAlign: 'left' as const,
    transition: 'background 0.15s ease',
  },
  modelOptionActive: {
    background: 'rgba(102, 126, 234, 0.2)',
  },
  modelOptionName: {
    fontWeight: 500,
  },
  modelOptionDesc: {
    fontSize: '0.7rem',
    color: 'rgba(255, 255, 255, 0.4)',
  },

  // Input Area - Enhanced with Neon
  inputArea: {
    padding: '12px 16px',
    borderTop: '1px solid rgba(168, 85, 247, 0.15)',
    display: 'flex',
    gap: 10,
    alignItems: 'flex-end',
    background: 'linear-gradient(180deg, rgba(168, 85, 247, 0.03) 0%, rgba(0, 0, 0, 0.25) 100%)',
  },
  micButton: {
    width: 48,
    height: 48,
    borderRadius: '50%',
    border: '1px solid rgba(34, 211, 238, 0.3)',
    background: 'rgba(34, 211, 238, 0.1)',
    color: '#fff',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    flexShrink: 0,
    transition: 'all 0.3s ease',
    boxShadow: '0 2px 15px rgba(0, 0, 0, 0.3)',
    backdropFilter: 'blur(8px)',
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
  imageButton: {
    width: 40,
    height: 40,
    borderRadius: '50%',
    border: '1px solid rgba(139, 92, 246, 0.3)',
    background: 'rgba(139, 92, 246, 0.15)',
    color: '#fff',
    fontSize: '18px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    transition: 'all 0.2s ease',
    backdropFilter: 'blur(8px)',
  },
  pendingImageContainer: {
    padding: '8px 16px',
    borderTop: '1px solid rgba(255, 255, 255, 0.08)',
    background: 'rgba(0, 0, 0, 0.2)',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    position: 'relative',
  },
  pendingImage: {
    maxWidth: 120,
    maxHeight: 80,
    borderRadius: 8,
    objectFit: 'cover',
  },
  removePendingImage: {
    position: 'absolute',
    top: 4,
    right: 12,
    width: 24,
    height: 24,
    borderRadius: '50%',
    border: 'none',
    background: 'rgba(239, 68, 68, 0.8)',
    color: '#fff',
    fontSize: '12px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  messageImage: {
    maxWidth: '100%',
    maxHeight: 200,
    borderRadius: 8,
    marginTop: 8,
    objectFit: 'contain',
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
    background: 'rgba(255, 255, 255, 0.04)',
    border: '1px solid rgba(168, 85, 247, 0.2)',
    borderRadius: 16,
    color: '#fff',
    fontSize: '0.9rem',
    resize: 'none',
    outline: 'none',
    minHeight: 48,
    maxHeight: 120,
    lineHeight: 1.5,
    fontFamily: 'inherit',
    transition: 'all 0.3s ease',
    // Neon focus will be applied via CSS
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
    border: '1px solid rgba(168, 85, 247, 0.4)',
    background: 'linear-gradient(135deg, #a855f7 0%, #6366f1 50%, #06b6d4 100%)',
    backgroundSize: '200% 200%',
    color: '#fff',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    transition: 'all 0.3s ease',
    boxShadow: '0 4px 15px rgba(168, 85, 247, 0.4), 0 0 20px rgba(168, 85, 247, 0.2)',
    animation: 'gradientFlow 3s ease infinite',
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
