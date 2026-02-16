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

    const bundleId = params.id

    // Get bundle
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

    // Get associated assets
    const { data: assets } = await supabase
      .from('content_assets')
      .select('*')
      .eq('bundle_id', bundleId)
      .order('created_at', { ascending: true })

    return NextResponse.json({
      success: true,
      data: {
        ...bundle,
        content_assets: assets || [],
      },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Bundle GET error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get bundle',
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

    const bundleId = params.id
    const body = await request.json()

    // Only allow updating specific fields
    const allowedFields = ['topic', 'trade', 'status', 'quality_score', 'assets']
    const updates: Record<string, unknown> = {}
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates[field] = body[field]
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { success: false, error: 'No valid fields to update' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('content_bundles')
      .update(updates)
      .eq('id', bundleId)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({
      success: true,
      data,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Bundle PATCH error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update bundle',
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

    const bundleId = params.id

    // Assets cascade-delete via FK constraint
    const { error } = await supabase
      .from('content_bundles')
      .delete()
      .eq('id', bundleId)

    if (error) throw error

    return NextResponse.json({
      success: true,
      message: `Bundle ${bundleId} deleted`,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Bundle DELETE error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete bundle',
      },
      { status: 500 }
    )
  }
}
