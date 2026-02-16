import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { createWorkflow, startWorkflow } from '@/lib/workflowEngine'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')
    const trade = searchParams.get('trade')
    const status = searchParams.get('status')

    const supabase = getSupabaseAdmin()
    if (!supabase) {
      return NextResponse.json({
        success: true,
        data: { bundles: [], totalCount: 0 },
        timestamp: new Date().toISOString(),
      })
    }

    let query = supabase
      .from('content_bundles')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (trade) query = query.eq('trade', trade)
    if (status) query = query.eq('status', status)

    const { data: bundles, count, error } = await query

    if (error) throw error

    return NextResponse.json({
      success: true,
      data: {
        bundles: bundles || [],
        totalCount: count || 0,
      },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Bundles GET error:', error)
    return NextResponse.json({
      success: true,
      data: { bundles: [], totalCount: 0 },
      timestamp: new Date().toISOString(),
    })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { topic, trade } = body

    if (!topic) {
      return NextResponse.json(
        { success: false, error: 'Topic is required' },
        { status: 400 }
      )
    }

    const supabase = getSupabaseAdmin()
    if (!supabase) {
      return NextResponse.json(
        { success: false, error: 'Database not configured' },
        { status: 503 }
      )
    }

    // Create the workflow first
    const workflow = await createWorkflow('content-machine', { topic, trade })

    // Create the bundle linked to this workflow
    const bundleId = `bnd_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    const { data: bundle, error: bundleError } = await supabase
      .from('content_bundles')
      .insert({
        id: bundleId,
        topic,
        trade: trade || null,
        quality_score: 0,
        status: 'creating',
        assets: {},
        workflow_id: workflow.id,
      })
      .select()
      .single()

    if (bundleError) throw bundleError

    // Start the workflow (spawns agent)
    const startedWorkflow = await startWorkflow(workflow.id)

    return NextResponse.json({
      success: true,
      data: {
        bundle,
        workflow: startedWorkflow,
        bundleId: bundle.id,
        workflowId: startedWorkflow.id,
      },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Bundle create error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create bundle',
      },
      { status: 500 }
    )
  }
}
