import { NextRequest, NextResponse } from 'next/server'
import { getStrategyDocument, generateContentStrategy, approveStrategy } from '@/lib/contentStrategy'
import { approveStrategyAndProceed } from '@/lib/agentOrchestrator'
import { getSupabaseAdmin } from '@/lib/supabase'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/content-dashboard/strategy?bundleId=xxx
 * Get strategy document for a bundle
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
    const { data: bundle, error: bundleError } = await supabase
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