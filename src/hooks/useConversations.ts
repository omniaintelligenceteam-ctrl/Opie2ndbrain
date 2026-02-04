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
