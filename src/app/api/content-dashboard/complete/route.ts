import { NextRequest, NextResponse } from 'next/server'
import { processAgentCompletion } from '@/lib/contentCreation'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * POST /api/content-dashboard/complete
 * Webhook endpoint for handling agent completion notifications from the Gateway
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
        { 
          success: false, 
          error: 'sessionId is required and must be a string' 
        },
        { status: 400 }
      )
    }

    if (!status || !['completed', 'failed'].includes(status)) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'status is required and must be "completed" or "failed"' 
        },
        { status: 400 }
      )
    }

    // Check if this is a content creation session
    if (!sessionId.startsWith('content-')) {
      console.log(`Ignoring non-content session completion: ${sessionId}`)
      return NextResponse.json({
        success: true,
        message: 'Not a content creation session, ignoring',
        sessionId,
        timestamp: new Date().toISOString(),
      })
    }

    console.log(`Processing agent completion for session: ${sessionId}, status: ${status}`)

    if (status === 'failed') {
      console.error(`Agent failed for session ${sessionId}:`, error || 'No error details')
      
      // TODO: Update asset status to 'failed' if we can identify the asset
      // For now, just log the failure
      
      return NextResponse.json({
        success: true,
        message: 'Agent failure recorded',
        sessionId,
        error,
        timestamp: new Date().toISOString(),
      })
    }

    // Status is 'completed' - process the output
    if (!output || typeof output !== 'string') {
      console.error(`No output provided for completed session: ${sessionId}`)
      return NextResponse.json(
        { 
          success: false, 
          error: 'output is required for completed sessions' 
        },
        { status: 400 }
      )
    }

    // Process the agent output and save as content asset
    const result = await processAgentCompletion(sessionId, output)

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
      data: {
        sessionId,
        assetId: result.assetId,
        processed: true
      },
      message: 'Agent completion processed successfully',
      timestamp: new Date().toISOString(),
    })

  } catch (error) {
    console.error('Agent completion processing error:', error)
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
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
          sessionIdFormat: 'content-{bundleId}-{assetType}',
          description: 'Webhook endpoint for processing agent completions from Gateway'
        },
        statistics: {
          // TODO: Add completion stats from database
          totalProcessed: 0,
          successRate: 0,
          averageProcessingTime: 0
        }
      },
      timestamp: new Date().toISOString(),
    })

  } catch (error) {
    console.error('Webhook info error:', error)
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch webhook information',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}

/**
 * Handle unsupported methods
 */
export async function PUT() {
  return NextResponse.json(
    { success: false, error: 'Method not allowed' },
    { status: 405 }
  )
}

export async function DELETE() {
  return NextResponse.json(
    { success: false, error: 'Method not allowed' },
    { status: 405 }
  )
}

export async function PATCH() {
  return NextResponse.json(
    { success: false, error: 'Method not allowed' },
    { status: 405 }
  )
}