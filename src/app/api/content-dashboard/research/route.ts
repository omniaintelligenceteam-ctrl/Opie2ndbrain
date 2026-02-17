import { NextRequest, NextResponse } from 'next/server'
import { getResearchProgress, isResearchComplete } from '@/lib/research'
import { getSupabaseAdmin } from '@/lib/supabase'
import { GATEWAY_URL, GATEWAY_TOKEN, IS_VERCEL } from '@/lib/gateway'
import { processAgentCompletion } from '@/lib/agentOrchestrator'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// ---------------------------------------------------------------------------
// Gateway session helpers (reused pattern from workflows/poll/route.ts)
// ---------------------------------------------------------------------------

interface GatewaySession {
  key?: string
  sessionId?: string
  label?: string
  updatedAt?: number
  createdAt?: number
  abortedLastRun?: boolean
  kind?: string
}

async function fetchGatewaySessions(): Promise<GatewaySession[]> {
  if (IS_VERCEL && GATEWAY_URL.includes('localhost')) return []
  try {
    const res = await fetch(`${GATEWAY_URL}/tools/invoke`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        ...(GATEWAY_TOKEN && { 'Authorization': `Bearer ${GATEWAY_TOKEN}` }),
      },
      body: JSON.stringify({
        tool: 'sessions_list',
        args: { activeMinutes: 30, messageLimit: 1 },
      }),
      signal: AbortSignal.timeout(8000),
    })
    const contentType = res.headers.get('content-type') || ''
    if (!contentType.includes('application/json')) return []
    const data = await res.json()
    return data.result?.details?.sessions || data.result?.sessions || []
  } catch (err) {
    console.error('[Research] Gateway sessions_list error:', err)
    return []
  }
}

async function fetchSessionHistory(sessionKey: string): Promise<string | null> {
  try {
    const res = await fetch(`${GATEWAY_URL}/tools/invoke`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        ...(GATEWAY_TOKEN && { 'Authorization': `Bearer ${GATEWAY_TOKEN}` }),
      },
      body: JSON.stringify({
        tool: 'sessions_history',
        args: { sessionKey, limit: 5, includeTools: false },
      }),
      signal: AbortSignal.timeout(10000),
    })
    const contentType = res.headers.get('content-type') || ''
    if (!contentType.includes('application/json')) return null
    const data = await res.json()
    if (!data.ok) return null

    const messages = data.result?.messages || data.result?.history || []
    if (Array.isArray(messages)) {
      for (let i = messages.length - 1; i >= 0; i--) {
        const msg = messages[i]
        if (msg.role === 'assistant' && typeof msg.content === 'string') return msg.content
        if (msg.role === 'assistant' && Array.isArray(msg.content)) {
          const textParts = msg.content
            .filter((p: { type: string; text?: string }) => p.type === 'text' && p.text)
            .map((p: { text: string }) => p.text)
          if (textParts.length > 0) return textParts.join('\n')
        }
      }
    }
    if (typeof data.result === 'string') return data.result
    return null
  } catch (err) {
    console.error('[Research] Gateway sessions_history error:', err)
    return null
  }
}

function determineSessionStatus(session: GatewaySession): 'running' | 'complete' | 'failed' {
  if (session.abortedLastRun) return 'failed'
  const updatedAt = session.updatedAt
  if (updatedAt && Date.now() - updatedAt < 30000) return 'running'
  return 'complete'
}

/**
 * Check gateway for research session completion and process if done.
 * Returns { processed: true } if the research was detected as complete and processed.
 */
async function checkAndProcessResearchCompletion(
  bundleId: string,
  researchSessionId: string,
  researchStartedAt: string | null
): Promise<{ processed: boolean; status?: string }> {
  try {
    const supabase = getSupabaseAdmin()
    if (!supabase) return { processed: false }

    // Idempotency: re-check status to prevent double-processing
    const { data: currentBundle } = await supabase
      .from('content_bundles')
      .select('status')
      .eq('id', bundleId)
      .single()

    if (currentBundle?.status !== 'researching') {
      // Already processed by webhook or another poll
      return { processed: true, status: currentBundle?.status }
    }

    // Don't poll gateway if research started < 30s ago
    const elapsed = researchStartedAt
      ? Date.now() - new Date(researchStartedAt).getTime()
      : 0
    if (elapsed < 30000) return { processed: false }

    // Fetch all gateway sessions
    const gatewaySessions = await fetchGatewaySessions()
    const sessionMap = new Map<string, GatewaySession>()
    for (const s of gatewaySessions) {
      const key = s.key || s.sessionId || ''
      if (key) sessionMap.set(key, s)
      if (s.label) sessionMap.set(s.label, s)
    }

    // Find the research session by ID or label
    const session = sessionMap.get(researchSessionId)
      || sessionMap.get(`research-${bundleId}`)

    if (!session) {
      // Session not in gateway — may have completed and been cleaned up
      if (elapsed < 60000) return { processed: false } // Too soon

      // Try to get output from history
      const output = await fetchSessionHistory(researchSessionId)
      if (output) {
        console.log(`[Research] Session ${researchSessionId} found via history, processing...`)
        await processAgentCompletion({
          bundleId,
          sessionId: researchSessionId,
          phase: 'research',
          rawOutput: output
        })
        return { processed: true, status: 'research_processed' }
      }

      // Session truly lost after 12 minutes — mark as failed
      if (elapsed > 720000) {
        await supabase
          .from('content_bundles')
          .update({ status: 'failed' })
          .eq('id', bundleId)
        console.error(`[Research] Session ${researchSessionId} lost after ${Math.round(elapsed / 1000)}s, marking failed`)
        return { processed: true, status: 'failed' }
      }

      return { processed: false }
    }

    // Session found — check its status
    const sessionStatus = determineSessionStatus(session)

    if (sessionStatus === 'running') return { processed: false }

    if (sessionStatus === 'failed') {
      await supabase
        .from('content_bundles')
        .update({ status: 'failed' })
        .eq('id', bundleId)
      console.error(`[Research] Session ${researchSessionId} was aborted`)
      return { processed: true, status: 'failed' }
    }

    // Session complete — fetch output and process
    const output = await fetchSessionHistory(session.key || session.sessionId || researchSessionId)
    if (output) {
      console.log(`[Research] Processing completed research for bundle ${bundleId}`)
      await processAgentCompletion({
        bundleId,
        sessionId: researchSessionId,
        phase: 'research',
        rawOutput: output
      })
      return { processed: true, status: 'research_processed' }
    }

    console.warn(`[Research] Session completed but no output for ${researchSessionId}`)
    return { processed: false }

  } catch (err) {
    console.error('[Research] Completion check error:', err)
    return { processed: false }
  }
}

// ---------------------------------------------------------------------------
// GET /api/content-dashboard/research?bundleId=xxx
// ---------------------------------------------------------------------------

/**
 * GET /api/content-dashboard/research?bundleId=xxx
 * Get research progress and findings for a bundle.
 * Also checks gateway for session completion when bundle is still researching.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const bundleId = searchParams.get('bundleId')

    if (!bundleId) {
      return NextResponse.json(
        { success: false, error: 'bundleId parameter is required' },
        { status: 400 }
      )
    }

    const supabase = getSupabaseAdmin()
    if (!supabase) {
      throw new Error('Supabase not configured')
    }

    // Get bundle with research data
    let { data: bundle, error: bundleError } = await supabase
      .from('content_bundles')
      .select('*')
      .eq('id', bundleId)
      .single()

    if (bundleError || !bundle) {
      return NextResponse.json(
        { success: false, error: 'Bundle not found' },
        { status: 404 }
      )
    }

    // --- Server-side research completion detection ---
    // If bundle is still researching and has a session ID, check the gateway
    if (bundle.status === 'researching' && bundle.research_session_id) {
      const completionResult = await checkAndProcessResearchCompletion(
        bundle.id,
        bundle.research_session_id,
        bundle.research_started_at
      )

      if (completionResult.processed) {
        // Re-fetch bundle after processing
        const { data: refreshedBundle } = await supabase
          .from('content_bundles')
          .select('*')
          .eq('id', bundleId)
          .single()

        if (refreshedBundle) {
          bundle = refreshedBundle
        }
      }
    }

    // Get research progress
    const progress = await getResearchProgress(bundleId)
    const isComplete = await isResearchComplete(bundleId)

    return NextResponse.json({
      success: true,
      data: {
        bundleId,
        status: bundle.status,
        research_findings: bundle.research_findings,
        research_started_at: bundle.research_started_at,
        research_completed_at: bundle.research_completed_at,
        research_session_id: bundle.research_session_id,
        progress,
        isComplete,
        canProceedToStrategy: isComplete && bundle.status === 'awaiting_strategy_approval'
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Research status error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}

// ---------------------------------------------------------------------------
// POST /api/content-dashboard/research
// ---------------------------------------------------------------------------

/**
 * POST /api/content-dashboard/research
 * Manually trigger research process or update research findings
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { bundleId, action, researchFindings } = body

    if (!bundleId) {
      return NextResponse.json(
        { success: false, error: 'bundleId is required' },
        { status: 400 }
      )
    }

    const supabase = getSupabaseAdmin()
    if (!supabase) {
      throw new Error('Supabase not configured')
    }

    switch (action) {
      case 'update_findings':
        if (!researchFindings) {
          return NextResponse.json(
            { success: false, error: 'researchFindings are required for update_findings action' },
            { status: 400 }
          )
        }

        // Update research findings
        const { error: updateError } = await supabase
          .from('content_bundles')
          .update({
            research_findings: researchFindings,
            research_completed_at: new Date().toISOString(),
            status: 'awaiting_strategy_approval'
          })
          .eq('id', bundleId)

        if (updateError) {
          throw new Error(`Failed to update research findings: ${updateError.message}`)
        }

        return NextResponse.json({
          success: true,
          message: 'Research findings updated successfully',
          data: { bundleId, action },
          timestamp: new Date().toISOString()
        })

      case 'restart_research':
        // Reset research status
        const { error: resetError } = await supabase
          .from('content_bundles')
          .update({
            status: 'researching',
            research_findings: null,
            research_started_at: new Date().toISOString(),
            research_completed_at: null,
            strategy_doc: null
          })
          .eq('id', bundleId)

        if (resetError) {
          throw new Error(`Failed to restart research: ${resetError.message}`)
        }

        return NextResponse.json({
          success: true,
          message: 'Research restarted successfully',
          data: { bundleId, action },
          timestamp: new Date().toISOString()
        })

      case 'cancel': {
        // Validate bundle exists and is in a cancellable state
        const { data: bundleToCancel, error: cancelFetchError } = await supabase
          .from('content_bundles')
          .select('status')
          .eq('id', bundleId)
          .single()

        if (cancelFetchError || !bundleToCancel) {
          return NextResponse.json(
            { success: false, error: 'Bundle not found' },
            { status: 404 }
          )
        }

        const cancellableStatuses = ['researching', 'awaiting_strategy_approval', 'creating']
        if (!cancellableStatuses.includes(bundleToCancel.status)) {
          return NextResponse.json(
            { success: false, error: `Cannot cancel bundle in '${bundleToCancel.status}' status` },
            { status: 400 }
          )
        }

        const { error: cancelError } = await supabase
          .from('content_bundles')
          .update({
            status: 'cancelled',
            cancelled_at: new Date().toISOString(),
          })
          .eq('id', bundleId)

        if (cancelError) {
          throw new Error(`Failed to cancel bundle: ${cancelError.message}`)
        }

        return NextResponse.json({
          success: true,
          message: 'Bundle cancelled successfully',
          data: { bundleId, action, previousStatus: bundleToCancel.status },
          timestamp: new Date().toISOString()
        })
      }

      default:
        return NextResponse.json(
          { success: false, error: `Unknown action: ${action}` },
          { status: 400 }
        )
    }

  } catch (error) {
    console.error('Research action error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}
