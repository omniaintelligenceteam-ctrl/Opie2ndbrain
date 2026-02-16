import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { createWorkflow, startWorkflow } from '@/lib/workflowEngine'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const type = searchParams.get('type')
    const limit = parseInt(searchParams.get('limit') || '50')

    const supabase = getSupabaseAdmin()

    if (!supabase) {
      return NextResponse.json({
        success: true,
        data: [],
        system_status: {
          activeWorkflows: 0,
          queuedWorkflows: 0,
          utilizationRate: 0,
          fallback: true,
        },
        timestamp: new Date().toISOString(),
      })
    }

    // Build query
    let query = supabase
      .from('workflows')
      .select('*')
      .order('created_at', { ascending: false })

    if (status && status !== 'all') {
      query = query.eq('status', status)
    }

    if (type && type !== 'all') {
      query = query.eq('type', type)
    }

    query = query.limit(limit)

    const { data: workflows, error } = await query

    if (error) throw error

    // Calculate system status from real data
    const allWorkflows = workflows || []
    const activeCount = allWorkflows.filter(w => w.status === 'running').length
    const queuedCount = allWorkflows.filter(w => w.status === 'queued' || w.status === 'pending').length
    const totalRecent = allWorkflows.length
    const utilizationRate = totalRecent > 0
      ? Math.round((activeCount / Math.max(totalRecent, 1)) * 100) / 100
      : 0

    return NextResponse.json({
      success: true,
      data: allWorkflows,
      system_status: {
        activeWorkflows: activeCount,
        queuedWorkflows: queuedCount,
        utilizationRate,
      },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Workflows API error:', error)

    return NextResponse.json({
      success: true,
      data: [],
      system_status: {
        activeWorkflows: 0,
        queuedWorkflows: 0,
        utilizationRate: 0,
        error: true,
      },
      message: 'Service temporarily unavailable',
    })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, input, auto_start } = body

    if (!type) {
      return NextResponse.json(
        { success: false, error: 'Missing workflow type' },
        { status: 400 }
      )
    }

    // Create workflow in database
    const workflow = await createWorkflow(type, input || {})

    // Start if auto_start
    if (auto_start) {
      const started = await startWorkflow(workflow.id)
      return NextResponse.json({
        success: true,
        data: started,
        timestamp: new Date().toISOString(),
      })
    }

    return NextResponse.json({
      success: true,
      data: workflow,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Create workflow error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create workflow',
      },
      { status: 500 }
    )
  }
}
