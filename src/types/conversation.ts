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
