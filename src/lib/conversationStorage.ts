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
