import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    const bundleId = searchParams.get('bundleId')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    const supabase = getSupabaseAdmin()
    if (!supabase) {
      return NextResponse.json({
        success: true,
        data: { assets: [], totalCount: 0 },
        timestamp: new Date().toISOString(),
      })
    }

    let query = supabase
      .from('content_assets')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (type) query = query.eq('type', type)
    if (bundleId) query = query.eq('bundle_id', bundleId)

    const { data: assets, count, error } = await query

    if (error) throw error

    return NextResponse.json({
      success: true,
      data: {
        assets: assets || [],
        totalCount: count || 0,
      },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Assets GET error:', error)
    return NextResponse.json({
      success: true,
      data: { assets: [], totalCount: 0 },
      timestamp: new Date().toISOString(),
    })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { bundle_id, type, content, status, metadata } = body

    if (!type) {
      return NextResponse.json(
        { success: false, error: 'Asset type is required' },
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

    const assetId = `ast_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

    const { data, error } = await supabase
      .from('content_assets')
      .insert({
        id: assetId,
        bundle_id: bundle_id || null,
        type,
        content: content || null,
        status: status || 'draft',
        metadata: metadata || null,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({
      success: true,
      data,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Asset create error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create asset',
      },
      { status: 500 }
    )
  }
}
