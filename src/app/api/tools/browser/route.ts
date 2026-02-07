import { NextRequest, NextResponse } from 'next/server';
import { invokeGatewayTool } from '@/lib/gateway';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Browser session state tracking
const browserSessions = new Map<string, {
  id: string;
  url?: string;
  title?: string;
  status: 'idle' | 'navigating' | 'ready' | 'error';
  lastActivity: Date;
  profile: string;
}>();

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { 
      action, 
      url, 
      timeout = 30000,
      full_page = false,
      format = 'png',
      refs = 'role',
      depth = 3,
      selector,
      ref,
      text,
      profile = 'openclaw'
    } = body;

    if (!action) {
      return NextResponse.json({ error: 'Action is required' }, { status: 400 });
    }

    const sessionId = `browser_${Date.now()}`;

    try {
      let result;

      switch (action) {
        case 'navigate':
          if (!url) {
            return NextResponse.json({ error: 'URL is required for navigate action' }, { status: 400 });
          }

          // Update session state
          browserSessions.set(sessionId, {
            id: sessionId,
            url,
            status: 'navigating',
            lastActivity: new Date(),
            profile,
          });

          result = await invokeGatewayTool('browser', {
            action: 'open',
            targetUrl: url,
            timeoutMs: timeout,
            profile,
          });

          if (result.ok) {
            browserSessions.set(sessionId, {
              id: sessionId,
              url,
              status: 'ready',
              lastActivity: new Date(),
              profile,
            });

            return NextResponse.json({
              success: true,
              session_id: sessionId,
              url,
              status: 'navigated',
              action: 'navigate'
            });
          } else {
            browserSessions.set(sessionId, {
              id: sessionId,
              url,
              status: 'error',
              lastActivity: new Date(),
              profile,
            });

            return NextResponse.json({
              error: result.error?.message || 'Failed to navigate',
              session_id: sessionId
            }, { status: 500 });
          }

        case 'screenshot':
          result = await invokeGatewayTool('browser', {
            action: 'screenshot',
            fullPage: full_page,
            type: format,
            profile,
          });

          if (result.ok) {
            return NextResponse.json({
              success: true,
              format,
              full_page,
              image_data: result.result,
              action: 'screenshot'
            });
          } else {
            return NextResponse.json({
              error: result.error?.message || 'Failed to take screenshot'
            }, { status: 500 });
          }

        case 'snapshot':
          result = await invokeGatewayTool('browser', {
            action: 'snapshot',
            refs,
            depth,
            profile,
          });

          if (result.ok) {
            return NextResponse.json({
              success: true,
              content: result.result,
              refs,
              depth,
              action: 'snapshot'
            });
          } else {
            return NextResponse.json({
              error: result.error?.message || 'Failed to get page snapshot'
            }, { status: 500 });
          }

        case 'click':
          if (!selector && !ref && !text) {
            return NextResponse.json({ error: 'Must provide selector, ref, or text to click' }, { status: 400 });
          }

          const clickArgs: any = {
            action: 'act',
            request: {
              kind: 'click'
            },
            profile,
          };

          if (selector) clickArgs.selector = selector;
          if (ref) clickArgs.request.ref = ref;
          if (text) clickArgs.request.text = text;

          result = await invokeGatewayTool('browser', clickArgs);

          if (result.ok) {
            return NextResponse.json({
              success: true,
              clicked: selector || ref || text,
              action: 'click'
            });
          } else {
            return NextResponse.json({
              error: result.error?.message || 'Failed to click element'
            }, { status: 500 });
          }

        case 'type':
          if (!text) {
            return NextResponse.json({ error: 'Text is required for type action' }, { status: 400 });
          }

          if (!selector && !ref) {
            return NextResponse.json({ error: 'Must provide selector or ref to type into' }, { status: 400 });
          }

          const typeArgs: any = {
            action: 'act',
            request: {
              kind: 'type',
              text
            },
            profile,
          };

          if (selector) typeArgs.selector = selector;
          if (ref) typeArgs.request.ref = ref;

          result = await invokeGatewayTool('browser', typeArgs);

          if (result.ok) {
            return NextResponse.json({
              success: true,
              typed: text,
              target: selector || ref,
              action: 'type'
            });
          } else {
            return NextResponse.json({
              error: result.error?.message || 'Failed to type text'
            }, { status: 500 });
          }

        case 'status':
          result = await invokeGatewayTool('browser', {
            action: 'status',
            profile,
          });

          if (result.ok) {
            return NextResponse.json({
              success: true,
              browser_status: result.result,
              sessions: Array.from(browserSessions.values()),
              action: 'status'
            });
          } else {
            return NextResponse.json({
              error: result.error?.message || 'Failed to get browser status'
            }, { status: 500 });
          }

        case 'close':
          result = await invokeGatewayTool('browser', {
            action: 'close',
            profile,
          });

          // Clear all sessions for this profile
          for (const [id, session] of browserSessions.entries()) {
            if (session.profile === profile) {
              browserSessions.delete(id);
            }
          }

          if (result.ok) {
            return NextResponse.json({
              success: true,
              action: 'close'
            });
          } else {
            return NextResponse.json({
              error: result.error?.message || 'Failed to close browser'
            }, { status: 500 });
          }

        default:
          return NextResponse.json({ error: 'Invalid action. Must be: navigate, screenshot, snapshot, click, type, status, or close' }, { status: 400 });
      }

    } catch (error) {
      return NextResponse.json({
        error: `Browser operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        session_id: sessionId
      }, { status: 500 });
    }

  } catch (error) {
    console.error('[Browser API] Error:', error);
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const action = url.searchParams.get('action') || 'status';
  const profile = url.searchParams.get('profile') || 'openclaw';

  try {
    if (action === 'status') {
      // Get browser status from gateway
      const result = await invokeGatewayTool('browser', {
        action: 'status',
        profile,
      });

      const sessions = Array.from(browserSessions.values())
        .filter(s => s.profile === profile);

      return NextResponse.json({
        success: true,
        gateway_status: result.ok ? result.result : null,
        gateway_error: result.ok ? null : result.error?.message,
        local_sessions: sessions,
        total_sessions: sessions.length,
        active_sessions: sessions.filter(s => s.status === 'ready').length,
      });
    }

    if (action === 'sessions') {
      const sessions = Array.from(browserSessions.values())
        .filter(s => s.profile === profile)
        .sort((a, b) => b.lastActivity.getTime() - a.lastActivity.getTime());

      return NextResponse.json({
        success: true,
        sessions: sessions.map(s => ({
          id: s.id,
          url: s.url,
          title: s.title,
          status: s.status,
          lastActivity: s.lastActivity,
          profile: s.profile,
        })),
        total: sessions.length
      });
    }

    if (action === 'screenshot') {
      // Take a screenshot
      const result = await invokeGatewayTool('browser', {
        action: 'screenshot',
        fullPage: url.searchParams.get('full_page') === 'true',
        type: url.searchParams.get('format') || 'png',
        profile,
      });

      if (result.ok) {
        return NextResponse.json({
          success: true,
          image_data: result.result,
          action: 'screenshot'
        });
      } else {
        return NextResponse.json({
          error: result.error?.message || 'Failed to take screenshot'
        }, { status: 500 });
      }
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error) {
    console.error('[Browser API] GET Error:', error);
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Cleanup old sessions periodically
setInterval(() => {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  for (const [id, session] of browserSessions.entries()) {
    if (session.lastActivity < oneHourAgo) {
      browserSessions.delete(id);
    }
  }
}, 10 * 60 * 1000); // Clean every 10 minutes

// Export sessions for use by other parts of the app
export function getBrowserSessions() {
  return Array.from(browserSessions.values());
}

export function getBrowserSession(sessionId: string) {
  return browserSessions.get(sessionId);
}