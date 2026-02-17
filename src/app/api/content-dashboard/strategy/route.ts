import { NextRequest, NextResponse } from 'next/server'
import { getStrategyDocument, generateContentStrategy, approveStrategy } from '@/lib/contentStrategy'
import { approveStrategyAndProceed, processAgentCompletion } from '@/lib/agentOrchestrator'
import { getSupabaseAdmin } from '@/lib/supabase'
import { GATEWAY_URL, GATEWAY_TOKEN, IS_VERCEL } from '@/lib/gateway'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// ---------------------------------------------------------------------------
// Gateway session helpers (same pattern as research/route.ts)
// ---------------------------------------------------------------------------

interface GatewaySession {
  key?: string
  sessionId?: string
  label?: string
  updatedAt?: number
  createdAt?: number
  abortedLastRun?: boolean
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
      body: JSON.stringify({ tool: 'sessions_list', args: { activeMinutes: 30, messageLimit: 1 } }),
      signal: AbortSignal.timeout(8000),
    })
    const contentType = res.headers.get('content-type') || ''
    if (!contentType.includes('application/json')) return []
    const data = await res.json()
    return data.result?.details?.sessions || data.result?.sessions || []
  } catch (err) {
    console.error('[Strategy] Gateway sessions_list error:', err)
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
      body: JSON.stringify({ tool: 'sessions_history', args: { sessionKey, limit: 5, includeTools: false } }),
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
    console.error('[Strategy] Gateway sessions_history error:', err)
    return null
  }
}

function determineSessionStatus(session: GatewaySession): 'running' | 'complete' | 'failed' {
  if (session.abortedLastRun) return 'failed'
  if (session.updatedAt && Date.now() - session.updatedAt < 30000) return 'running'
  return 'complete'
}

async function checkAndProcessStrategyCompletion(
  bundleId: string,
  strategySessionId: string,
  strategyStartedAt: string | null
): Promise<{ processed: boolean }> {
  try {
    const supabase = getSupabaseAdmin()
    if (!supabase) return { processed: false }

    // Idempotency: check strategy_doc is still null
    const { data: current } = await supabase
      .from('content_bundles')
      .select('strategy_doc')
      .eq('id', bundleId)
      .single()
    if (current?.strategy_doc != null) return { processed: true }

    const elapsed = strategyStartedAt
      ? Date.now() - new Date(strategyStartedAt).getTime()
      : 0
    if (elapsed < 30000) return { processed: false }

    const gatewaySessions = await fetchGatewaySessions()
    const sessionMap = new Map<string, GatewaySession>()
    for (const s of gatewaySessions) {
      const key = s.key || s.sessionId || ''
      if (key) sessionMap.set(key, s)
      if (s.label) sessionMap.set(s.label, s)
    }

    const session = sessionMap.get(strategySessionId) || sessionMap.get(`strategy-${bundleId}`)

    if (!session) {
      if (elapsed < 60000) return { processed: false }
      const output = await fetchSessionHistory(strategySessionId)
      if (output) {
        await processAgentCompletion({ bundleId, sessionId: strategySessionId, phase: 'strategy', rawOutput: output })
        return { processed: true }
      }
      if (elapsed > 420000) { // 7 min for strategy (shorter timeout)
        await supabase.from('content_bundles').update({ status: 'failed' }).eq('id', bundleId)
        return { processed: true }
      }
      return { processed: false }
    }

    const status = determineSessionStatus(session)
    if (status === 'running') return { processed: false }
    if (status === 'failed') {
      await supabase.from('content_bundles').update({ status: 'failed' }).eq('id', bundleId)
      return { processed: true }
    }

    const output = await fetchSessionHistory(session.key || session.sessionId || strategySessionId)
    if (output) {
      await processAgentCompletion({ bundleId, sessionId: strategySessionId, phase: 'strategy', rawOutput: output })
      return { processed: true }
    }
    return { processed: false }
  } catch (err) {
    console.error('[Strategy] Completion check error:', err)
    return { processed: false }
  }
}

// ---------------------------------------------------------------------------
// GET /api/content-dashboard/strategy?bundleId=xxx
// ---------------------------------------------------------------------------

/**
 * GET /api/content-dashboard/strategy?bundleId=xxx
 * Get strategy document for a bundle.
 * Also checks gateway for strategy session completion.
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

    // Get bundle with strategy data
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

    // --- Server-side strategy completion detection ---
    const strategySessionId = (bundle.assets as any)?.strategy_session_id
    if (strategySessionId && !bundle.strategy_doc) {
      const completionResult = await checkAndProcessStrategyCompletion(
        bundleId,
        strategySessionId,
        bundle.strategy_started_at
      )

      if (completionResult.processed) {
        const { data: refreshedBundle } = await supabase
          .from('content_bundles')
          .select('*')
          .eq('id', bundleId)
          .single()
        if (refreshedBundle) bundle = refreshedBundle
      }
    }

    const strategy = await getStrategyDocument(bundleId)

    return NextResponse.json({
      success: true,
      data: {
        bundleId,
        status: bundle.status,
        strategy_doc: strategy,
        research_findings: bundle.research_findings,
        strategy_started_at: bundle.strategy_started_at,
        strategy_completed_at: bundle.strategy_completed_at,
        canApprove: bundle.status === 'awaiting_strategy_approval' && strategy != null,
        requiresApproval: bundle.status === 'awaiting_strategy_approval'
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Strategy status error:', error)
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

/**
 * POST /api/content-dashboard/strategy
 * Strategy-related actions: approve, regenerate, update
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { bundleId, action, strategyDoc, platforms } = body

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
      case 'approve':
        // Approve strategy and proceed to content creation
        const approveResult = await approveStrategyAndProceed(bundleId)
        
        if (!approveResult.success) {
          throw new Error(approveResult.error || 'Failed to approve strategy')
        }

        return NextResponse.json({
          success: true,
          message: 'Strategy approved and content creation started',
          data: { bundleId, action },
          timestamp: new Date().toISOString()
        })

      case 'regenerate':
        // Get bundle data for strategy regeneration
        const { data: bundle, error: bundleError } = await supabase
          .from('content_bundles')
          .select('topic, trade, research_findings, assets')
          .eq('id', bundleId)
          .single()

        if (bundleError || !bundle) {
          throw new Error('Bundle not found for strategy regeneration')
        }

        if (!bundle.research_findings) {
          throw new Error('Research findings required for strategy generation')
        }

        const requestMetadata = (bundle.assets as any)?.request_metadata || {}
        const selectedPlatforms = platforms || requestMetadata.platforms || ['linkedin', 'instagram', 'email']

        // Generate new strategy
        const strategyResult = await generateContentStrategy({
          bundleId,
          selectedPlatforms,
          researchFindings: bundle.research_findings,
          topic: bundle.topic,
          trade: bundle.trade || 'General'
        })

        if (!strategyResult.success) {
          throw new Error(strategyResult.error || 'Failed to regenerate strategy')
        }

        return NextResponse.json({
          success: true,
          message: 'Strategy regeneration started',
          data: { 
            bundleId, 
            action, 
            sessionId: strategyResult.sessionId 
          },
          timestamp: new Date().toISOString()
        })

      case 'update':
        if (!strategyDoc) {
          return NextResponse.json(
            { success: false, error: 'strategyDoc is required for update action' },
            { status: 400 }
          )
        }

        // Update strategy document manually
        const { error: updateError } = await supabase
          .from('content_bundles')
          .update({
            strategy_doc: strategyDoc,
            strategy_completed_at: new Date().toISOString()
          })
          .eq('id', bundleId)

        if (updateError) {
          throw new Error(`Failed to update strategy: ${updateError.message}`)
        }

        return NextResponse.json({
          success: true,
          message: 'Strategy updated successfully',
          data: { bundleId, action },
          timestamp: new Date().toISOString()
        })

      case 'reject':
        // Reject strategy and return to research phase
        const { error: rejectError } = await supabase
          .from('content_bundles')
          .update({
            status: 'researching',
            strategy_doc: null,
            strategy_started_at: null,
            strategy_completed_at: null
          })
          .eq('id', bundleId)

        if (rejectError) {
          throw new Error(`Failed to reject strategy: ${rejectError.message}`)
        }

        return NextResponse.json({
          success: true,
          message: 'Strategy rejected, returned to research phase',
          data: { bundleId, action },
          timestamp: new Date().toISOString()
        })

      default:
        return NextResponse.json(
          { success: false, error: `Unknown action: ${action}` },
          { status: 400 }
        )
    }

  } catch (error) {
    console.error('Strategy action error:', error)
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