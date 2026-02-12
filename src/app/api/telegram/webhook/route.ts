import { NextRequest } from 'next/server';
import { saveToSharedContext } from '@/lib/shared-context';

// Force Node.js runtime for full env var access
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface TelegramWebhookPayload {
  message: string;
  sender: string;
  timestamp?: string;
  sessionId?: string;
}

interface WebhookResponse {
  success: boolean;
  error?: string;
  timestamp?: string;
}

/**
 * Telegram Webhook Endpoint
 * 
 * Receives messages from Telegram and saves them to the shared_conversations
 * table via the saveToSharedContext() function. This enables Telegram messages
 * to appear in the Dashboard for full conversation sync.
 * 
 * Expected payload:
 * {
 *   message: string,
 *   sender: string,
 *   timestamp?: string,
 *   sessionId?: string
 * }
 */
export async function POST(req: NextRequest): Promise<Response> {
  try {
    const body: TelegramWebhookPayload = await req.json();
    
    // Validate required fields
    if (!body.message || typeof body.message !== 'string') {
      return Response.json(
        { success: false, error: 'Missing or invalid message field' },
        { status: 400 }
      );
    }
    
    if (!body.sender || typeof body.sender !== 'string') {
      return Response.json(
        { success: false, error: 'Missing or invalid sender field' },
        { status: 400 }
      );
    }

    // Default values
    const sessionId = body.sessionId || 'wes-main-session';
    const timestamp = body.timestamp || new Date().toISOString();

    console.log('[Telegram Webhook] Received message:', {
      sender: body.sender,
      messageLength: body.message.length,
      sessionId: sessionId,
      timestamp: timestamp
    });

    // Determine message role based on sender
    // If sender is 'wes' or contains 'user', it's a user message
    // Otherwise, treat as assistant message from the AI
    const isUserMessage = body.sender.toLowerCase().includes('wes') || 
                         body.sender.toLowerCase().includes('user') ||
                         body.sender.toLowerCase() === 'user';
    
    const role = isUserMessage ? 'user' : 'assistant';

    // Save to shared context using the existing function
    await saveToSharedContext({
      role: role,
      content: body.message,
      source: 'telegram',
      session_id: sessionId,
    });

    console.log('[Telegram Webhook] Successfully saved message to shared context:', {
      role: role,
      source: 'telegram',
      sessionId: sessionId,
      contentLength: body.message.length
    });

    const response: WebhookResponse = {
      success: true,
      timestamp: timestamp,
    };

    return Response.json(response, { status: 200 });

  } catch (error) {
    console.error('[Telegram Webhook] Error processing webhook:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    const response: WebhookResponse = {
      success: false,
      error: errorMessage,
      timestamp: new Date().toISOString(),
    };
    
    return Response.json(response, { status: 500 });
  }
}

/**
 * GET endpoint for webhook health check
 */
export async function GET(req: NextRequest): Promise<Response> {
  return Response.json({
    status: 'healthy',
    endpoint: 'telegram-webhook',
    timestamp: new Date().toISOString(),
    description: 'Telegram to Dashboard message sync webhook',
  });
}