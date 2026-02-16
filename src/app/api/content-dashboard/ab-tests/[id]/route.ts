import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = getSupabaseAdmin()
    if (!supabase) {
      return NextResponse.json(
        { success: false, error: 'Database not configured' },
        { status: 503 }
      )
    }

    const testId = params.id

    const { data: test, error } = await supabase
      .from('ab_tests')
      .select('*')
      .eq('id', testId)
      .single()

    if (error || !test) {
      return NextResponse.json(
        { success: false, error: 'Test not found' },
        { status: 404 }
      )
    }

    // Fetch both bundles with assets
    const [bundleARes, bundleBRes] = await Promise.all([
      supabase.from('content_bundles').select('*').eq('id', test.bundle_a_id).single(),
      supabase.from('content_bundles').select('*').eq('id', test.bundle_b_id).single(),
    ])

    const [assetsARes, assetsBRes] = await Promise.all([
      supabase.from('content_assets').select('*').eq('bundle_id', test.bundle_a_id).order('created_at', { ascending: true }),
      supabase.from('content_assets').select('*').eq('bundle_id', test.bundle_b_id).order('created_at', { ascending: true }),
    ])

    return NextResponse.json({
      success: true,
      data: {
        ...test,
        bundle_a: { ...bundleARes.data, assets: assetsARes.data || [] },
        bundle_b: { ...bundleBRes.data, assets: assetsBRes.data || [] },
      },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('AB Test GET error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get test',
      },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = getSupabaseAdmin()
    if (!supabase) {
      return NextResponse.json(
        { success: false, error: 'Database not configured' },
        { status: 503 }
      )
    }

    const testId = params.id
    const body = await request.json()

    const updates: Record<string, unknown> = {}
    if (body.metrics !== undefined) updates.metrics = body.metrics
    if (body.status !== undefined) updates.status = body.status
    if (body.winner !== undefined) {
      updates.winner = body.winner
      updates.status = 'completed'
      updates.completed_at = new Date().toISOString()
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { success: false, error: 'No valid fields to update' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('ab_tests')
      .update(updates)
      .eq('id', testId)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({
      success: true,
      data,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('AB Test PATCH error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update test',
      },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = getSupabaseAdmin()
    if (!supabase) {
      return NextResponse.json(
        { success: false, error: 'Database not configured' },
        { status: 503 }
      )
    }

    const { error } = await supabase
      .from('ab_tests')
      .delete()
      .eq('id', params.id)

    if (error) throw error

    return NextResponse.json({
      success: true,
      message: `Test ${params.id} deleted`,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('AB Test DELETE error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete test',
      },
      { status: 500 }
    )
  }
}
