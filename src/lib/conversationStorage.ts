// src/lib/conversationStorage.ts
import { Conversation, ConversationStore } from '@/types/conversation';
import { supabase } from './supabaseClient';

const STORAGE_KEY = 'opie-conversations';
const MAX_CONVERSATIONS = 100;

// Generate unique conversation ID
export function generateConversationId(): string {
  return `conv-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

// Load conversations from Supabase (server-first) with localStorage fallback
export async function loadConversations(): Promise<ConversationStore> {
  // Server-side or no window
  if (typeof window === 'undefined') {
    return { conversations: [], activeConversationId: null };
  }

  try {
    // Try Supabase first
    const sessionId = getSessionId();
    const { data, error } = await supabase
      .from('opie_conversations')
      .select('*')
      .eq('session_id', sessionId)
      .order('updated_at', { ascending: false });

    if (error) throw error;

    if (data && data.length > 0) {
      // Found Supabase data - use it
      const conversations = data.map(row => ({
        id: row.session_id.includes(row.id) ? row.id : row.session_id + '-' + row.id,
        title: row.title || 'Conversation',
        messages: row.messages || [],
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      })) as Conversation[];

      // Also save to localStorage for offline fallback
      const store: ConversationStore = {
        conversations,
        activeConversationId: conversations[0]?.id || null,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
      
      return store;
    }

    // No Supabase data - try localStorage fallback (migration)
    const localStored = localStorage.getItem(STORAGE_KEY);
    if (localStored) {
      const parsed = JSON.parse(localStored) as ConversationStore;
      if (Array.isArray(parsed.conversations)) {
        // Migrate to Supabase
        await migrateToSupabase(parsed, sessionId);
        return parsed;
      }
    }

    return { conversations: [], activeConversationId: null };
  } catch (error) {
    console.warn('[ConversationStorage] Supabase failed, using localStorage:', error);
    // Fallback to localStorage
    return loadFromLocalStorage();
  }
}

// Helper: Load from localStorage only
function loadFromLocalStorage(): ConversationStore {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return { conversations: [], activeConversationId: null };
    }

    const parsed = JSON.parse(stored) as ConversationStore;
    if (!Array.isArray(parsed.conversations)) {
      return { conversations: [], activeConversationId: null };
    }

    return parsed;
  } catch (error) {
    console.error('[ConversationStorage] Failed to load:', error);
    return { conversations: [], activeConversationId: null };
  }
}

// Save conversations to Supabase (primary) and localStorage (fallback)
export async function saveConversations(store: ConversationStore): Promise<void> {
  if (typeof window === 'undefined') return;

  // Always save to localStorage as backup
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));

  // Prune if over limit
  let conversations = store.conversations;
  if (conversations.length > MAX_CONVERSATIONS) {
    conversations = [...conversations]
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, MAX_CONVERSATIONS);
  }

  try {
    const sessionId = getSessionId();

    // Upsert each conversation to Supabase
    for (const conv of conversations) {
      const { error } = await supabase
        .from('opie_conversations')
        .upsert({
          session_id: sessionId,
          id: conv.id,
          title: conv.title,
          messages: conv.messages,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'session_id,id'
        });

      if (error) console.error('[ConversationStorage] Failed to save conv:', error);
    }
  } catch (error) {
    console.warn('[ConversationStorage] Supabase save failed:', error);
    // Already saved to localStorage above
  }
}

// Create empty conversation
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

// Get session ID for this browser
function getSessionId(): string {
  let id = localStorage.getItem('opie-session-id');
  if (!id) {
    id = `2ndbrain-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    localStorage.setItem('opie-session-id', id);
  }
  return id;
}

// Migrate localStorage conversations to Supabase
async function migrateToSupabase(store: ConversationStore, sessionId: string): Promise<void> {
  try {
    for (const conv of store.conversations.slice(0, 10)) {
      await supabase.from('opie_conversations').insert({
        session_id: sessionId,
        id: conv.id,
        title: conv.title || 'Conversation',
        messages: conv.messages || [],
        created_at: conv.createdAt,
        updated_at: conv.updatedAt,
      });
    }
    console.log('[ConversationStorage] Migrated to Supabase');
  } catch (error) {
    console.warn('[ConversationStorage] Migration failed:', error);
  }
}

// Get storage size estimate
export function getStorageSize(): number {
  if (typeof window === 'undefined') return 0;
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored ? new Blob([stored]).size : 0;
}
