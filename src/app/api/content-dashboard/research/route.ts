import { NextRequest, NextResponse } from 'next/server'
import { getResearchProgress, isResearchComplete } from '@/lib/research'
import { getSupabaseAdmin } from '@/lib/supabase'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/content-dashboard/research?bundleId=xxx
 * Get research progress and findings for a bundle
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