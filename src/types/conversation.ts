// src/types/conversation.ts
import { ChatMessage } from '@/types/chat';

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
  pinnedConversationIds: string[];
}

export const STORAGE_KEY = 'opie-conversations';
export const MAX_CONVERSATIONS = 20; // Keep 20 most recent + any pinned
export const MAX_MESSAGES_PER_CONVERSATION = 500;
