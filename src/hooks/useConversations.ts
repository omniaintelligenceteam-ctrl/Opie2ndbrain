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
  pinnedConversationIds: string[];
  createConversation: () => Conversation;
  createConversationForSecondary: () => Conversation;
  switchConversation: (id: string) => void;
  forkConversation: (fromMessageId: string) => Conversation;
  deleteConversation: (id: string) => void;
  updateMessages: (updater: ChatMessage[] | ((prev: ChatMessage[]) => ChatMessage[])) => void;
  updateMessagesForConversation: (conversationId: string, updater: ChatMessage[] | ((prev: ChatMessage[]) => ChatMessage[])) => void;
  updateTitle: (conversationId: string, title: string) => void;
  setSummary: (conversationId: string, summary: string) => void;
  pinConversation: (id: string) => void;
  unpinConversation: (id: string) => void;
  isLoading: boolean;
}

export function useConversations(): UseConversationsReturn {
  const [store, setStore] = useState<ConversationStore>({ conversations: [], activeConversationId: null, pinnedConversationIds: [] });
  const [isLoading, setIsLoading] = useState(true);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isLoadedRef = useRef(false);

  // Initial load from Supabase
  useEffect(() => {
    if (isLoadedRef.current) return;
    
    loadConversations().then(loaded => {
      setStore(loaded);
      setIsLoading(false);
      isLoadedRef.current = true;
    }).catch(error => {
      console.error('[useConversations] Failed to load:', error);
      setIsLoading(false);
    });
  }, []);

  // Save to localStorage immediately, Supabase debounced
  useEffect(() => {
    if (isLoading || !isLoadedRef.current) return;
    
    // Always save to localStorage immediately (fast, reliable)
    try {
      localStorage.setItem('opie-conversations', JSON.stringify(store));
    } catch (e) {
      console.warn('[useConversations] localStorage save failed:', e);
    }
    
    // Debounce Supabase saves to reduce API calls
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => {
      saveConversations(store);
    }, 1000);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [store, isLoading]);

  // Save before page unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (isLoadedRef.current) {
        // Sync save to localStorage before unload
        try {
          localStorage.setItem('opie-conversations', JSON.stringify(store));
        } catch (e) {
          console.warn('[useConversations] beforeunload save failed:', e);
        }
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
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

  // Create conversation without switching (for secondary chat windows)
  const createConversationForSecondary = useCallback((): Conversation => {
    const newConv = createEmptyConversation();
    setStore(prev => ({
      ...prev,
      conversations: [newConv, ...prev.conversations],
      // Keep activeConversationId unchanged
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

  const updateMessages = useCallback((
    updater: ChatMessage[] | ((prev: ChatMessage[]) => ChatMessage[])
  ): void => {
    setStore(prev => {
      if (!prev.activeConversationId) {
        console.warn('[useConversations] updateMessages called with no active conversation!');
        return prev;
      }

      // Get current messages and apply updater
      const currentConv = prev.conversations.find(c => c.id === prev.activeConversationId);
      const currentMessages = currentConv?.messages || [];
      const newMessages = typeof updater === 'function' ? updater(currentMessages) : updater;

      // Trim messages if over limit
      const trimmedMessages = newMessages.length > MAX_MESSAGES_PER_CONVERSATION
        ? newMessages.slice(-MAX_MESSAGES_PER_CONVERSATION)
        : newMessages;

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

  // Update messages for a specific conversation (for multi-chat support)
  const updateMessagesForConversation = useCallback((
    conversationId: string,
    updater: ChatMessage[] | ((prev: ChatMessage[]) => ChatMessage[])
  ): void => {
    setStore(prev => {
      const targetConv = prev.conversations.find(c => c.id === conversationId);
      if (!targetConv) return prev;

      const currentMessages = targetConv.messages || [];
      const newMessages = typeof updater === 'function' ? updater(currentMessages) : updater;

      // Trim messages if over limit
      const trimmedMessages = newMessages.length > MAX_MESSAGES_PER_CONVERSATION
        ? newMessages.slice(-MAX_MESSAGES_PER_CONVERSATION)
        : newMessages;

      return {
        ...prev,
        conversations: prev.conversations.map(c =>
          c.id === conversationId
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

  const pinConversation = useCallback((id: string): void => {
    setStore(prev => {
      if (prev.pinnedConversationIds.includes(id)) return prev;
      if (prev.pinnedConversationIds.length >= 2) return prev; // Max 2 pinned
      return {
        ...prev,
        pinnedConversationIds: [...prev.pinnedConversationIds, id],
      };
    });
  }, []);

  const unpinConversation = useCallback((id: string): void => {
    setStore(prev => ({
      ...prev,
      pinnedConversationIds: prev.pinnedConversationIds.filter(pid => pid !== id),
    }));
  }, []);

  return {
    conversations: store.conversations,
    activeConversation,
    pinnedConversationIds: store.pinnedConversationIds,
    createConversation,
    createConversationForSecondary,
    switchConversation,
    forkConversation,
    deleteConversation,
    updateMessages,
    updateMessagesForConversation,
    updateTitle,
    setSummary,
    pinConversation,
    unpinConversation,
    isLoading,
  };
}
