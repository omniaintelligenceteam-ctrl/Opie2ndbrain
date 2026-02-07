// Chat-related types

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: Date;
  status?: 'sending' | 'sent' | 'delivered' | 'read' | 'error';
  image?: string; // Base64 or URL of attached image
}

export interface PendingExecutionPlan {
  id: string;
  message: string;
  plannedActions: string[];
  status: 'pending' | 'approved' | 'rejected' | 'executing' | 'completed' | 'error';
  createdAt: Date;
  requiresApproval: boolean;
  toolCallCount: number;
}

export type InteractionMode = 'plan' | 'execute';
export type AIModel = 'kimi' | 'opus' | 'sonnet' | 'haiku';

export interface ChatResponse {
  mode?: 'async' | 'stream';
  request_id?: string;
  poll_url?: string;
  message?: string;
  pendingPlan?: PendingExecutionPlan;
}