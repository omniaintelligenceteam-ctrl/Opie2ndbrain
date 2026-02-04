# Conversation Management Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add conversation history, branching (fork/summary), and auto-titling to FloatingChat.

**Architecture:** LocalStorage-based conversation persistence with a custom React hook (`useConversations`) managing all state. A slide-out sidebar displays history. Context menu on messages enables forking. Title generation uses existing chat API with a special prompt.

**Tech Stack:** React 18, TypeScript, Next.js 14, LocalStorage API, existing Anthropic/chat API

---

## Task 1: Create Conversation Types

**Files:**
- Create: `src/types/conversation.ts`

**Step 1: Create the types file**

```typescript
// src/types/conversation.ts
import { ChatMessage } from '@/components/FloatingChat';

export interface Conversation {
  id: string;
  title: string;
  createdAt: string;  // ISO string for JSON serialization
  updatedAt: string;  // ISO string for JSON serialization
  messages: ChatMessage[];
  parentId?: string;
  forkPointMessageId?: string;
  summary?: string;
}

export interface ConversationStore {
  conversations: Conversation[];
  activeConversationId: string | null;
}

export const STORAGE_KEY = 'opie-conversations';
export const MAX_CONVERSATIONS = 100;
export const MAX_MESSAGES_PER_CONVERSATION = 500;
```

**Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors related to conversation.ts

**Step 3: Commit**

```bash
git add src/types/conversation.ts
git commit -m "feat(conversations): add conversation types"
```

---

## Task 2: Create Storage Utilities

**Files:**
- Create: `src/lib/conversationStorage.ts`

**Step 1: Create the storage utilities**

```typescript
// src/lib/conversationStorage.ts
import { Conversation, ConversationStore, STORAGE_KEY, MAX_CONVERSATIONS } from '@/types/conversation';

export function generateConversationId(): string {
  return `conv-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function loadConversations(): ConversationStore {
  if (typeof window === 'undefined') {
    return { conversations: [], activeConversationId: null };
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return { conversations: [], activeConversationId: null };
    }

    const parsed = JSON.parse(stored) as ConversationStore;

    // Validate structure
    if (!Array.isArray(parsed.conversations)) {
      console.warn('[ConversationStorage] Invalid data structure, resetting');
      return { conversations: [], activeConversationId: null };
    }

    return parsed;
  } catch (error) {
    console.error('[ConversationStorage] Failed to load:', error);
    return { conversations: [], activeConversationId: null };
  }
}

export function saveConversations(store: ConversationStore): void {
  if (typeof window === 'undefined') return;

  try {
    // Prune if over limit
    let conversations = store.conversations;
    if (conversations.length > MAX_CONVERSATIONS) {
      // Sort by updatedAt descending, keep newest
      conversations = [...conversations]
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        .slice(0, MAX_CONVERSATIONS);
    }

    const toSave: ConversationStore = {
      conversations,
      activeConversationId: store.activeConversationId,
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
  } catch (error) {
    console.error('[ConversationStorage] Failed to save:', error);
    // Check if quota exceeded
    if (error instanceof DOMException && error.name === 'QuotaExceededError') {
      console.warn('[ConversationStorage] Storage quota exceeded');
    }
  }
}

export function createEmptyConversation(): Conversation {
  const now = new Date().toISOString();
  return {
    id: generateConversationId(),
    title: 'New conversation',
    createdAt: now,
    updatedAt: now,
    messages: [],
  };
}

export function getStorageSize(): number {
  if (typeof window === 'undefined') return 0;
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored ? new Blob([stored]).size : 0;
}
```

**Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add src/lib/conversationStorage.ts
git commit -m "feat(conversations): add storage utilities"
```

---

## Task 3: Create useConversations Hook

**Files:**
- Create: `src/hooks/useConversations.ts`

**Step 1: Create the hook**

```typescript
// src/hooks/useConversations.ts
'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { ChatMessage } from '@/components/FloatingChat';
import { Conversation, ConversationStore, MAX_MESSAGES_PER_CONVERSATION } from '@/types/conversation';
import {
  loadConversations,
  saveConversations,
  createEmptyConversation,
  generateConversationId,
} from '@/lib/conversationStorage';

interface UseConversationsReturn {
  conversations: Conversation[];
  activeConversation: Conversation | null;
  createConversation: () => Conversation;
  switchConversation: (id: string) => void;
  forkConversation: (fromMessageId: string) => Conversation;
  deleteConversation: (id: string) => void;
  updateMessages: (messages: ChatMessage[]) => void;
  updateTitle: (conversationId: string, title: string) => void;
  setSummary: (conversationId: string, summary: string) => void;
}

export function useConversations(): UseConversationsReturn {
  const [store, setStore] = useState<ConversationStore>(() => loadConversations());
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Debounced save
  useEffect(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => {
      saveConversations(store);
    }, 500);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [store]);

  const activeConversation = store.activeConversationId
    ? store.conversations.find(c => c.id === store.activeConversationId) || null
    : null;

  const createConversation = useCallback((): Conversation => {
    const newConv = createEmptyConversation();
    setStore(prev => ({
      conversations: [newConv, ...prev.conversations],
      activeConversationId: newConv.id,
    }));
    return newConv;
  }, []);

  const switchConversation = useCallback((id: string): void => {
    setStore(prev => ({
      ...prev,
      activeConversationId: id,
    }));
  }, []);

  const forkConversation = useCallback((fromMessageId: string): Conversation => {
    const current = store.conversations.find(c => c.id === store.activeConversationId);
    if (!current) {
      return createConversation();
    }

    const messageIndex = current.messages.findIndex(m => m.id === fromMessageId);
    if (messageIndex === -1) {
      return createConversation();
    }

    const forkedMessages = current.messages.slice(0, messageIndex + 1);
    const now = new Date().toISOString();

    const forkedConv: Conversation = {
      id: generateConversationId(),
      title: `Fork of: ${current.title}`,
      createdAt: now,
      updatedAt: now,
      messages: forkedMessages,
      parentId: current.id,
      forkPointMessageId: fromMessageId,
    };

    setStore(prev => ({
      conversations: [forkedConv, ...prev.conversations],
      activeConversationId: forkedConv.id,
    }));

    return forkedConv;
  }, [store.conversations, store.activeConversationId, createConversation]);

  const deleteConversation = useCallback((id: string): void => {
    setStore(prev => {
      const filtered = prev.conversations.filter(c => c.id !== id);
      let newActiveId = prev.activeConversationId;

      if (prev.activeConversationId === id) {
        newActiveId = filtered.length > 0 ? filtered[0].id : null;
      }

      return {
        conversations: filtered,
        activeConversationId: newActiveId,
      };
    });
  }, []);

  const updateMessages = useCallback((messages: ChatMessage[]): void => {
    setStore(prev => {
      if (!prev.activeConversationId) return prev;

      // Trim messages if over limit
      const trimmedMessages = messages.length > MAX_MESSAGES_PER_CONVERSATION
        ? messages.slice(-MAX_MESSAGES_PER_CONVERSATION)
        : messages;

      return {
        ...prev,
        conversations: prev.conversations.map(c =>
          c.id === prev.activeConversationId
            ? { ...c, messages: trimmedMessages, updatedAt: new Date().toISOString() }
            : c
        ),
      };
    });
  }, []);

  const updateTitle = useCallback((conversationId: string, title: string): void => {
    setStore(prev => ({
      ...prev,
      conversations: prev.conversations.map(c =>
        c.id === conversationId ? { ...c, title } : c
      ),
    }));
  }, []);

  const setSummary = useCallback((conversationId: string, summary: string): void => {
    setStore(prev => ({
      ...prev,
      conversations: prev.conversations.map(c =>
        c.id === conversationId ? { ...c, summary } : c
      ),
    }));
  }, []);

  return {
    conversations: store.conversations,
    activeConversation,
    createConversation,
    switchConversation,
    forkConversation,
    deleteConversation,
    updateMessages,
    updateTitle,
    setSummary,
  };
}
```

**Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add src/hooks/useConversations.ts
git commit -m "feat(conversations): add useConversations hook"
```

---

## Task 4: Create ConversationSidebar Component

**Files:**
- Create: `src/components/ConversationSidebar.tsx`

**Step 1: Create the sidebar component**

```typescript
// src/components/ConversationSidebar.tsx
'use client';
import React, { memo } from 'react';
import { Conversation } from '@/types/conversation';

interface ConversationSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  conversations: Conversation[];
  activeConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onNewConversation: () => void;
  onDeleteConversation: (id: string) => void;
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}

function getPreview(conversation: Conversation): string {
  if (conversation.messages.length === 0) return 'No messages yet';
  const firstMsg = conversation.messages[0];
  const text = firstMsg.text || '';
  return text.length > 50 ? text.slice(0, 50) + '...' : text;
}

const ConversationItem = memo(function ConversationItem({
  conversation,
  isActive,
  onSelect,
  onDelete,
}: {
  conversation: Conversation;
  isActive: boolean;
  onSelect: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      onClick={onSelect}
      style={{
        ...styles.conversationItem,
        background: isActive ? 'rgba(102, 126, 234, 0.2)' : 'transparent',
        borderLeft: isActive ? '3px solid #667eea' : '3px solid transparent',
      }}
    >
      <div style={styles.conversationContent}>
        <div style={styles.conversationHeader}>
          <span style={styles.conversationTitle}>{conversation.title}</span>
          <span style={styles.conversationTime}>
            {formatRelativeTime(conversation.updatedAt)}
          </span>
        </div>
        <div style={styles.conversationPreview}>
          {getPreview(conversation)}
        </div>
        {conversation.parentId && (
          <div style={styles.forkBadge}>Forked</div>
        )}
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        style={styles.deleteButton}
        title="Delete conversation"
      >
        ×
      </button>
    </div>
  );
});

export default function ConversationSidebar({
  isOpen,
  onClose,
  conversations,
  activeConversationId,
  onSelectConversation,
  onNewConversation,
  onDeleteConversation,
}: ConversationSidebarProps): React.ReactElement | null {
  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div style={styles.backdrop} onClick={onClose} />

      {/* Sidebar */}
      <div style={styles.sidebar}>
        <div style={styles.sidebarHeader}>
          <h3 style={styles.sidebarTitle}>Conversations</h3>
          <button onClick={onClose} style={styles.closeButton}>×</button>
        </div>

        <button onClick={onNewConversation} style={styles.newChatButton}>
          + New Chat
        </button>

        <div style={styles.conversationList}>
          {conversations.length === 0 ? (
            <div style={styles.emptyState}>
              No conversations yet. Start chatting!
            </div>
          ) : (
            conversations
              .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
              .map(conv => (
                <ConversationItem
                  key={conv.id}
                  conversation={conv}
                  isActive={conv.id === activeConversationId}
                  onSelect={() => onSelectConversation(conv.id)}
                  onDelete={() => onDeleteConversation(conv.id)}
                />
              ))
          )}
        </div>
      </div>
    </>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  backdrop: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0, 0, 0, 0.5)',
    zIndex: 1001,
  },
  sidebar: {
    position: 'fixed',
    top: 0,
    left: 0,
    width: 280,
    height: '100%',
    background: '#0d0d1a',
    borderRight: '1px solid rgba(255, 255, 255, 0.1)',
    zIndex: 1002,
    display: 'flex',
    flexDirection: 'column',
    animation: 'slideInLeft 0.2s ease',
  },
  sidebarHeader: {
    padding: '16px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sidebarTitle: {
    color: '#fff',
    fontSize: '1.1rem',
    fontWeight: 600,
    margin: 0,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    border: 'none',
    background: 'rgba(255, 255, 255, 0.1)',
    color: '#fff',
    fontSize: '18px',
    cursor: 'pointer',
  },
  newChatButton: {
    margin: '12px 16px',
    padding: '12px',
    borderRadius: 12,
    border: '1px dashed rgba(255, 255, 255, 0.3)',
    background: 'transparent',
    color: '#fff',
    fontSize: '0.9rem',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  conversationList: {
    flex: 1,
    overflowY: 'auto',
    padding: '8px 0',
  },
  conversationItem: {
    padding: '12px 16px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'flex-start',
    gap: 8,
    transition: 'background 0.15s',
  },
  conversationContent: {
    flex: 1,
    minWidth: 0,
  },
  conversationHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  conversationTitle: {
    color: '#fff',
    fontSize: '0.9rem',
    fontWeight: 500,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    flex: 1,
  },
  conversationTime: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: '0.75rem',
    marginLeft: 8,
    flexShrink: 0,
  },
  conversationPreview: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: '0.8rem',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  forkBadge: {
    display: 'inline-block',
    marginTop: 4,
    padding: '2px 6px',
    borderRadius: 4,
    background: 'rgba(102, 126, 234, 0.2)',
    color: '#667eea',
    fontSize: '0.7rem',
  },
  deleteButton: {
    width: 24,
    height: 24,
    borderRadius: 4,
    border: 'none',
    background: 'transparent',
    color: 'rgba(255, 255, 255, 0.3)',
    fontSize: '16px',
    cursor: 'pointer',
    opacity: 0,
    transition: 'opacity 0.15s',
    flexShrink: 0,
  },
  emptyState: {
    padding: '32px 16px',
    textAlign: 'center',
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: '0.9rem',
  },
};

// Add animation via style tag (will be added to FloatingChat's animationStyles)
export const sidebarAnimationStyles = `
  @keyframes slideInLeft {
    from { transform: translateX(-100%); }
    to { transform: translateX(0); }
  }
`;
```

**Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add src/components/ConversationSidebar.tsx
git commit -m "feat(conversations): add ConversationSidebar component"
```

---

## Task 5: Create MessageContextMenu Component

**Files:**
- Create: `src/components/MessageContextMenu.tsx`

**Step 1: Create the context menu component**

```typescript
// src/components/MessageContextMenu.tsx
'use client';
import React, { useEffect, useRef } from 'react';

interface MessageContextMenuProps {
  x: number;
  y: number;
  onClose: () => void;
  onFork: () => void;
  onSummarize: () => void;
  onCopy: () => void;
  isAssistantMessage: boolean;
}

export default function MessageContextMenu({
  x,
  y,
  onClose,
  onFork,
  onSummarize,
  onCopy,
  isAssistantMessage,
}: MessageContextMenuProps): React.ReactElement {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  // Adjust position to stay within viewport
  const adjustedX = Math.min(x, window.innerWidth - 180);
  const adjustedY = Math.min(y, window.innerHeight - 150);

  return (
    <div
      ref={menuRef}
      style={{
        ...styles.menu,
        left: adjustedX,
        top: adjustedY,
      }}
    >
      <button onClick={() => { onFork(); onClose(); }} style={styles.menuItem}>
        <span style={styles.menuIcon}>↳</span>
        Fork from here
      </button>

      <button onClick={() => { onSummarize(); onClose(); }} style={styles.menuItem}>
        <span style={styles.menuIcon}>✨</span>
        Summarize & continue
      </button>

      <div style={styles.divider} />

      <button onClick={() => { onCopy(); onClose(); }} style={styles.menuItem}>
        <span style={styles.menuIcon}>⎘</span>
        Copy message
      </button>
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  menu: {
    position: 'fixed',
    background: 'rgba(20, 20, 30, 0.98)',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    borderRadius: 12,
    padding: '6px 0',
    minWidth: 170,
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
    zIndex: 2000,
    animation: 'fadeIn 0.1s ease',
  },
  menuItem: {
    width: '100%',
    padding: '10px 14px',
    border: 'none',
    background: 'transparent',
    color: '#fff',
    fontSize: '0.85rem',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    textAlign: 'left',
    transition: 'background 0.1s',
  },
  menuIcon: {
    width: 18,
    textAlign: 'center',
    opacity: 0.7,
  },
  divider: {
    height: 1,
    background: 'rgba(255, 255, 255, 0.1)',
    margin: '6px 0',
  },
};

export const contextMenuAnimationStyles = `
  @keyframes fadeIn {
    from { opacity: 0; transform: scale(0.95); }
    to { opacity: 1; transform: scale(1); }
  }
`;
```

**Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add src/components/MessageContextMenu.tsx
git commit -m "feat(conversations): add MessageContextMenu component"
```

---

## Task 6: Add Title Generation API Endpoint

**Files:**
- Create: `src/app/api/chat/title/route.ts`

**Step 1: Create the title generation endpoint**

```typescript
// src/app/api/chat/title/route.ts
import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json();

    if (!messages || messages.length === 0) {
      return NextResponse.json({ title: 'New conversation' });
    }

    // Take first exchange (up to 2 messages)
    const context = messages
      .slice(0, 2)
      .map((m: { role: string; text: string }) => `${m.role}: ${m.text}`)
      .join('\n');

    const response = await anthropic.messages.create({
      model: 'claude-3-5-haiku-20241022', // Fast and cheap for titles
      max_tokens: 20,
      messages: [
        {
          role: 'user',
          content: `Generate a 3-5 word title for this conversation. Return ONLY the title, no quotes or punctuation.\n\n${context}`,
        },
      ],
    });

    let title = 'New conversation';
    for (const block of response.content) {
      if (block.type === 'text') {
        title = block.text.trim().replace(/^["']|["']$/g, ''); // Remove quotes
        break;
      }
    }

    // Truncate if too long
    if (title.length > 50) {
      title = title.slice(0, 47) + '...';
    }

    return NextResponse.json({ title });
  } catch (error) {
    console.error('[Title API] Error:', error);
    // Fallback title
    const now = new Date();
    const fallback = `Chat from ${now.toLocaleDateString()}`;
    return NextResponse.json({ title: fallback });
  }
}
```

**Step 2: Test the endpoint manually**

Run: `curl -X POST http://localhost:3000/api/chat/title -H "Content-Type: application/json" -d '{"messages":[{"role":"user","text":"How do I center a div in CSS?"}]}'`
Expected: `{"title":"..."}`

**Step 3: Commit**

```bash
git add src/app/api/chat/title/route.ts
git commit -m "feat(conversations): add title generation API"
```

---

## Task 7: Add Summary Generation API Endpoint

**Files:**
- Create: `src/app/api/chat/summary/route.ts`

**Step 1: Create the summary generation endpoint**

```typescript
// src/app/api/chat/summary/route.ts
import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json();

    if (!messages || messages.length === 0) {
      return NextResponse.json({ summary: '' });
    }

    // Format conversation for summary
    const conversation = messages
      .map((m: { role: string; text: string }) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.text}`)
      .join('\n\n');

    const response = await anthropic.messages.create({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 150,
      messages: [
        {
          role: 'user',
          content: `Summarize this conversation in 2-3 sentences, capturing the key topics and any conclusions. Be concise.\n\n${conversation}`,
        },
      ],
    });

    let summary = '';
    for (const block of response.content) {
      if (block.type === 'text') {
        summary = block.text.trim();
        break;
      }
    }

    return NextResponse.json({ summary });
  } catch (error) {
    console.error('[Summary API] Error:', error);
    return NextResponse.json({ summary: '', error: 'Failed to generate summary' }, { status: 500 });
  }
}
```

**Step 2: Test the endpoint manually**

Run: `curl -X POST http://localhost:3000/api/chat/summary -H "Content-Type: application/json" -d '{"messages":[{"role":"user","text":"How do I center a div?"},{"role":"assistant","text":"Use flexbox with justify-content and align-items set to center."}]}'`
Expected: `{"summary":"..."}`

**Step 3: Commit**

```bash
git add src/app/api/chat/summary/route.ts
git commit -m "feat(conversations): add summary generation API"
```

---

## Task 8: Integrate Conversations into FloatingChat

**Files:**
- Modify: `src/components/FloatingChat.tsx`

**Step 1: Add imports and state at top of FloatingChat**

After the existing imports (around line 2), add:

```typescript
import ConversationSidebar, { sidebarAnimationStyles } from './ConversationSidebar';
import MessageContextMenu, { contextMenuAnimationStyles } from './MessageContextMenu';
```

**Step 2: Add new props to FloatingChatProps interface**

Update the interface (around line 29) to add:

```typescript
interface FloatingChatProps {
  // ... existing props ...

  // Conversation management (new)
  conversations?: Conversation[];
  activeConversationId?: string | null;
  onConversationCreate?: () => void;
  onConversationSwitch?: (id: string) => void;
  onConversationDelete?: (id: string) => void;
  onConversationFork?: (fromMessageId: string) => void;
  onSummarizeAndContinue?: () => void;
}
```

**Step 3: Add state for sidebar and context menu inside the component**

After existing state declarations (around line 361), add:

```typescript
const [showSidebar, setShowSidebar] = useState(false);
const [contextMenu, setContextMenu] = useState<{
  x: number;
  y: number;
  messageId: string;
  messageText: string;
  isAssistant: boolean;
} | null>(null);
```

**Step 4: Add context menu handler**

After the existing handleKeyDown function, add:

```typescript
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
```

**Step 5: Update header to include sidebar toggle and conversation title**

In the header section (around line 949), update to include:

```typescript
<header style={styles.header}>
  <div style={styles.headerLeft}>
    {/* Sidebar toggle button */}
    {conversations && conversations.length > 0 && (
      <button
        onClick={() => setShowSidebar(true)}
        style={styles.headerButton}
        title="Conversation history"
      >
        ☰
      </button>
    )}
    <Avatar size={36} />
    <div style={styles.headerInfo}>
      <span style={styles.headerName}>
        {activeConversationId && conversations?.find(c => c.id === activeConversationId)?.title || 'Opie'}
        <span style={styles.headerBolt}>⚡</span>
      </span>
      {/* ... rest of header ... */}
    </div>
  </div>
  {/* ... rest of header ... */}
</header>
```

**Step 6: Add onContextMenu to message bubbles**

In the message rendering section (around line 1102), update the message bubble div:

```typescript
<div
  onContextMenu={(e) => handleMessageContextMenu(e, msg.id, msg.text, !isUser)}
  style={{
    ...styles.messageBubble,
    // ... existing styles ...
  }}
>
```

**Step 7: Add sidebar and context menu components before the closing tag**

Before the final `</>` in the return statement, add:

```typescript
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
```

**Step 8: Update animationStyles to include new animations**

Update the animationStyles constant to include:

```typescript
const animationStyles = `
  ${/* existing animations */}
  ${sidebarAnimationStyles}
  ${contextMenuAnimationStyles}
`;
```

**Step 9: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 10: Commit**

```bash
git add src/components/FloatingChat.tsx
git commit -m "feat(conversations): integrate sidebar and context menu into FloatingChat"
```

---

## Task 9: Integrate useConversations into OpieKanban

**Files:**
- Modify: `src/components/OpieKanban.tsx`

**Step 1: Add imports**

After existing imports, add:

```typescript
import { useConversations } from '@/hooks/useConversations';
import { Conversation } from '@/types/conversation';
```

**Step 2: Add useConversations hook call**

Inside the main component, after other hook calls (around line 200), add:

```typescript
const {
  conversations,
  activeConversation,
  createConversation,
  switchConversation,
  forkConversation,
  deleteConversation,
  updateMessages,
  updateTitle,
  setSummary,
} = useConversations();
```

**Step 3: Initialize conversation on first load**

Add an effect to create initial conversation if none exists:

```typescript
useEffect(() => {
  if (conversations.length === 0) {
    createConversation();
  }
}, [conversations.length, createConversation]);
```

**Step 4: Sync messages with active conversation**

Update the existing message state to use conversation messages:

```typescript
// Replace existing messages state with:
const messages = activeConversation?.messages || [];

// Update the setMessages calls to use updateMessages:
// Where you previously did setMessages(prev => [...prev, newMsg])
// Now do: updateMessages([...messages, newMsg])
```

**Step 5: Add title generation effect**

Add effect to generate title after first assistant response:

```typescript
useEffect(() => {
  const generateTitle = async () => {
    if (!activeConversation) return;
    if (activeConversation.title !== 'New conversation') return;
    if (activeConversation.messages.length < 2) return;

    const hasAssistantReply = activeConversation.messages.some(m => m.role === 'assistant');
    if (!hasAssistantReply) return;

    try {
      const response = await fetch('/api/chat/title', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: activeConversation.messages.slice(0, 2) }),
      });
      const data = await response.json();
      if (data.title) {
        updateTitle(activeConversation.id, data.title);
      }
    } catch (error) {
      console.error('Failed to generate title:', error);
    }
  };

  generateTitle();
}, [activeConversation?.messages.length]);
```

**Step 6: Add summarize and continue handler**

```typescript
const handleSummarizeAndContinue = async () => {
  if (!activeConversation || activeConversation.messages.length === 0) return;

  try {
    const response = await fetch('/api/chat/summary', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: activeConversation.messages }),
    });
    const data = await response.json();

    if (data.summary) {
      // Create new conversation with summary
      const newConv = createConversation();
      setSummary(newConv.id, data.summary);
    }
  } catch (error) {
    console.error('Failed to summarize:', error);
  }
};
```

**Step 7: Pass conversation props to FloatingChat**

Update the FloatingChat component call to include:

```typescript
<FloatingChat
  {/* ... existing props ... */}
  conversations={conversations}
  activeConversationId={activeConversation?.id || null}
  onConversationCreate={createConversation}
  onConversationSwitch={switchConversation}
  onConversationDelete={deleteConversation}
  onConversationFork={forkConversation}
  onSummarizeAndContinue={handleSummarizeAndContinue}
/>
```

**Step 8: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 9: Test the full flow**

1. Start dev server: `npm run dev`
2. Open http://localhost:3000/opie
3. Send a message - should create conversation
4. Check sidebar toggle appears
5. Right-click message - context menu should appear
6. Test fork and new conversation

**Step 10: Commit**

```bash
git add src/components/OpieKanban.tsx
git commit -m "feat(conversations): integrate useConversations into OpieKanban"
```

---

## Task 10: Final Testing and Polish

**Step 1: Run full test suite**

Run: `npm run build`
Expected: Build succeeds with no errors

**Step 2: Manual testing checklist**

- [ ] New conversation created on first load
- [ ] Messages persist after refresh
- [ ] Sidebar shows conversation list
- [ ] Clicking conversation switches to it
- [ ] New Chat button creates fresh conversation
- [ ] Delete button removes conversation
- [ ] Right-click shows context menu
- [ ] Fork creates new conversation with messages up to that point
- [ ] Summarize & continue creates new conversation with summary
- [ ] Title auto-generates after first exchange
- [ ] Forked conversations show "Forked" badge

**Step 3: Final commit**

```bash
git add -A
git commit -m "feat(conversations): complete conversation management feature

- Add conversation history with LocalStorage persistence
- Add sidebar for conversation list and switching
- Add context menu for fork and summarize actions
- Add auto-title generation via API
- Add summary generation for 'summarize & continue'
- Support forked conversations with lineage tracking"
```

---

## Summary

| Task | Component | Purpose |
|------|-----------|---------|
| 1 | Types | Define Conversation and ConversationStore interfaces |
| 2 | Storage | LocalStorage utilities with pruning |
| 3 | Hook | useConversations for state management |
| 4 | Sidebar | ConversationSidebar UI component |
| 5 | Context Menu | MessageContextMenu for fork/summarize |
| 6 | Title API | /api/chat/title endpoint |
| 7 | Summary API | /api/chat/summary endpoint |
| 8 | FloatingChat | Integrate sidebar and context menu |
| 9 | OpieKanban | Wire up useConversations hook |
| 10 | Testing | Build verification and manual tests |
