// OpenClaw Gateway Chat Integration
// Provides a unified interface for routing chat completions through the OpenClaw gateway
// with fallback to direct provider APIs

import { GATEWAY_URL, GATEWAY_TOKEN } from './gateway';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string | Array<{ type: string; text?: string; image_url?: { url: string } }>;
}

export interface ChatCompletionRequest {
  messages: ChatMessage[];
  model: string;
  stream?: boolean;
  max_tokens?: number;
  temperature?: number;
}

export interface ChatCompletionChunk {
  choices: Array<{
    delta: {
      content?: string;
    };
  }>;
}

export class GatewayChatClient {
  private gatewayUrl: string;
  private gatewayToken: string;
  private useGateway: boolean;

  constructor() {
    this.gatewayUrl = GATEWAY_URL;
    this.gatewayToken = GATEWAY_TOKEN;
    this.useGateway = !!(this.gatewayUrl && this.gatewayToken);
    
    console.log('[GatewayChatClient] Initialized:', {
      gatewayUrl: this.gatewayUrl,
      hasToken: !!this.gatewayToken,
      useGateway: this.useGateway
    });
  }

  /**
   * Check if gateway routing is available and configured
   */
  isGatewayAvailable(): boolean {
    return this.useGateway;
  }

  /**
   * Create a streaming chat completion through the gateway
   */
  async createStreamingCompletion(request: ChatCompletionRequest): Promise<AsyncGenerator<string>> {
    if (!this.useGateway) {
      throw new Error('Gateway not configured');
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 90000); // 90s timeout

    const response = await fetch(`${this.gatewayUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.gatewayToken}`,
      },
      body: JSON.stringify({
        ...request,
        stream: true,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Gateway chat error ${response.status}: ${error.slice(0, 200)}`);
    }

    return this.parseSSEStream(response);
  }

  /**
   * Create a non-streaming chat completion through the gateway
   */
  async createCompletion(request: ChatCompletionRequest): Promise<{ content: string }> {
    if (!this.useGateway) {
      throw new Error('Gateway not configured');
    }

    const response = await fetch(`${this.gatewayUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.gatewayToken}`,
      },
      body: JSON.stringify({
        ...request,
        stream: false,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Gateway chat error ${response.status}: ${error.slice(0, 200)}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    return { content };
  }

  /**
   * Parse Server-Sent Events (SSE) stream from the gateway
   */
  private async* parseSSEStream(response: Response): AsyncGenerator<string> {
    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body');
    }

    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.trim() === '') continue;
          
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              yield `data: [DONE]\n\n`;
              return;
            }
            
            try {
              // Parse and validate the chunk
              const chunk = JSON.parse(data);
              if (chunk.choices?.[0]?.delta?.content) {
                yield `data: ${data}\n\n`;
              }
            } catch (e) {
              // Invalid JSON, skip
              console.warn('[GatewayChatClient] Invalid SSE chunk:', data.slice(0, 100));
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  /**
   * Convert gateway response to standard OpenAI-compatible format for streaming
   */
  async* createOpenAIStreamingResponse(request: ChatCompletionRequest): AsyncGenerator<string> {
    try {
      const stream = await this.createStreamingCompletion(request);
      for await (const chunk of stream) {
        yield chunk;
      }
    } catch (error) {
      console.error('[GatewayChatClient] Streaming error:', error);
      yield `data: ${JSON.stringify({ error: error instanceof Error ? error.message : 'Gateway failed' })}\n\n`;
    }
  }
}

// Singleton instance
export const gatewayChatClient = new GatewayChatClient();

/**
 * Check if we should route through the gateway based on environment variables
 */
export function shouldUseGateway(): boolean {
  return gatewayChatClient.isGatewayAvailable();
}

/**
 * Route a chat completion request through the gateway if available, 
 * otherwise fall back to the provided fallback function
 */
export async function routeChatCompletion<T>(
  request: ChatCompletionRequest,
  fallbackFn: () => Promise<T> | AsyncGenerator<string>
): Promise<T | AsyncGenerator<string>> {
  if (!shouldUseGateway()) {
    console.log('[routeChatCompletion] Using fallback (gateway not available)');
    return fallbackFn();
  }

  try {
    console.log('[routeChatCompletion] Using gateway routing');
    if (request.stream) {
      return gatewayChatClient.createOpenAIStreamingResponse(request);
    } else {
      return gatewayChatClient.createCompletion(request) as T;
    }
  } catch (error) {
    console.error('[routeChatCompletion] Gateway failed, falling back:', error);
    return fallbackFn();
  }
}