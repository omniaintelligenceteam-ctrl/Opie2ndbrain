import { NextRequest, NextResponse } from 'next/server'
import { processAgentCompletion as processContentCompletion } from '@/lib/contentCreation'
import { processAgentCompletion as processOrchestrationCompletion } from '@/lib/agentOrchestrator'
import { getSupabaseAdmin } from '@/lib/supabase'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * POST /api/content-dashboard/complete
 * Webhook endpoint for handling agent completion notifications from the Gateway
 * Routes research-*, strategy-*, and content-* sessions to appropriate handlers
 *
 * Expected payload:
 * {
 *   sessionId: string,
 *   output: string,
 *   status: 'completed' | 'failed',
 *   error?: string
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { sessionId, output, status, error } = body

    // Validate required fields
    if (!sessionId || typeof sessionId !== 'string') {
      return NextResponse.json(
        { success: false, error: 'sessionId is required and must be a string' },
        { status: 400 }
      )
    }

    if (!status || !['completed', 'failed'].includes(status)) {
      return NextResponse.json(
        { success: false, error: 'status is required and must be "completed" or "failed"' },
        { status: 400 }
      )
    }

    // Route based on session type prefix
    if (sessionId.startsWith('research-')) {
      return await handleResearchSession(sessionId, output, status, error)
    } else if (sessionId.startsWith('strategy-')) {
      return await handleStrategySession(sessionId, output, status, error)
    } else if (sessionId.startsWith('content-')) {
      return await handleContentSession(sessionId, output, status, error)
    } else {
      console.log(`Ignoring unknown session type: ${sessionId}`)
      return NextResponse.json({
        success: true,
        message: 'Unknown session type, ignoring',
        sessionId,
        timestamp: new Date().toISOString(),
      })
    }

  } catch (error) {
    console.error('Agent completion processing error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    return NextResponse.json(
      { success: false, error: errorMessage, timestamp: new Date().toISOString() },
      { status: 500 }
    )
  }
}

// ---------------------------------------------------------------------------
// Research session handler
// ---------------------------------------------------------------------------

async function handleResearchSession(
  sessionId: string,
  output: string,
  status: string,
  error?: string
) {
  const bundleId = sessionId.replace(/^research-/, '')
  console.log(`[Complete] Processing research completion for bundle: ${bundleId}, status: ${status}`)

  if (status === 'failed') {
    const supabase = getSupabaseAdmin()
    if (supabase) {
      // Don't overwrite cancelled or complete status
      await supabase.from('content_bundles')
        .update({ status: 'failed' })
        .eq('id', bundleId)
        .not('status', 'in', '("cancelled","complete")')
    }
    return NextResponse.json({
      success: true,
      message: 'Research failure recorded',
      sessionId,
      error,
      timestamp: new Date().toISOString(),
    })
  }

  if (!output || typeof output !== 'string') {
    return NextResponse.json(
      { success: false, error: 'output is required for completed sessions' },
      { status: 400 }
    )
  }

  const result = await processOrchestrationCompletion({
    bundleId,
    sessionId,
    phase: 'research',
    rawOutput: output,
  })

  return NextResponse.json({
    success: result.success,
    data: { sessionId, nextPhase: result.nextPhase },
    error: result.error,
    message: result.success
      ? `Research processed, advancing to ${result.nextPhase}`
      : 'Research processing failed',
    timestamp: new Date().toISOString(),
  })
}

// ---------------------------------------------------------------------------
// Strategy session handler
// ---------------------------------------------------------------------------

async function handleStrategySession(
  sessionId: string,
  output: string,
  status: string,
  error?: string
) {
  const bundleId = sessionId.replace(/^strategy-/, '')
  console.log(`[Complete] Processing strategy completion for bundle: ${bundleId}, status: ${status}`)

  if (status === 'failed') {
    const supabase = getSupabaseAdmin()
    if (supabase) {
      // Don't overwrite cancelled or complete status
      await supabase.from('content_bundles')
        .update({ status: 'failed' })
        .eq('id', bundleId)
        .not('status', 'in', '("cancelled","complete")')
    }
    return NextResponse.json({
      success: true,
      message: 'Strategy failure recorded',
      sessionId,
      error,
      timestamp: new Date().toISOString(),
    })
  }

  if (!output || typeof output !== 'string') {
    return NextResponse.json(
      { success: false, error: 'output is required for completed sessions' },
      { status: 400 }
    )
  }

  const result = await processOrchestrationCompletion({
    bundleId,
    sessionId,
    phase: 'strategy',
    rawOutput: output,
  })

  return NextResponse.json({
    success: result.success,
    data: { sessionId, nextPhase: result.nextPhase },
    error: result.error,
    message: result.success
      ? `Strategy processed, advancing to ${result.nextPhase}`
      : 'Strategy processing failed',
    timestamp: new Date().toISOString(),
  })
}

// ---------------------------------------------------------------------------
// Content session handler (existing logic, preserved)
// ---------------------------------------------------------------------------

async function handleContentSession(
  sessionId: string,
  output: string,
  status: string,
  error?: string
) {
  console.log(`[Complete] Processing content completion for session: ${sessionId}, status: ${status}`)

  if (status === 'failed') {
    console.error(`Agent failed for session ${sessionId}:`, error || 'No error details')
    return NextResponse.json({
      success: true,
      message: 'Agent failure recorded',
      sessionId,
      error,
      timestamp: new Date().toISOString(),
    })
  }

  if (!output || typeof output !== 'string') {
    console.error(`No output provided for completed session: ${sessionId}`)
    return NextResponse.json(
      { success: false, error: 'output is required for completed sessions' },
      { status: 400 }
    )
  }

  const result = await processContentCompletion(sessionId, output)

  if (!result.success) {
    console.error(`Failed to process completion for ${sessionId}:`, result.error)
    return NextResponse.json(
      {
        success: false,
        error: result.error || 'Failed to process agent completion',
        sessionId,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }

  console.log(`Successfully processed completion for ${sessionId}, created asset: ${result.assetId}`)

  return NextResponse.json({
    success: true,
    data: { sessionId, assetId: result.assetId, processed: true },
    message: 'Agent completion processed successfully',
    timestamp: new Date().toISOString(),
  })
}

/**
 * GET /api/content-dashboard/complete
 * Returns webhook configuration and status
 */
export async function GET() {
  try {
    return NextResponse.json({
      success: true,
      data: {
        webhook: {
          method: 'POST',
          expectedFields: ['sessionId', 'output', 'status'],
          supportedStatuses: ['completed', 'failed'],
          sessionIdFormats: [
            'research-{bundleId}',
            'strategy-{bundleId}',
            'content-{bundleId}-{assetType}'
          ],
          description: 'Webhook endpoint for processing agent completions from Gateway'
        },
      },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Webhook info error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch webhook information', timestamp: new Date().toISOString() },
      { status: 500 }
    )
  }
}

export async function PUT() {
  return NextResponse.json({ success: false, error: 'Method not allowed' }, { status: 405 })
}

export async function DELETE() {
  return NextResponse.json({ success: false, error: 'Method not allowed' }, { status: 405 })
}

export async function PATCH() {
  return NextResponse.json({ success: false, error: 'Method not allowed' }, { status: 405 })
}
