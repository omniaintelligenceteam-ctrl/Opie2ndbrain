import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const bundleId = searchParams.get('bundleId')
    const assetId = searchParams.get('assetId')

    const supabase = getSupabaseAdmin()
    if (!supabase) {
      return NextResponse.json({
        success: true,
        data: { comments: [] },
        timestamp: new Date().toISOString(),
      })
    }

    let query = supabase
      .from('content_comments')
      .select('*')
      .order('created_at', { ascending: true })

    if (bundleId) query = query.eq('bundle_id', bundleId)
    if (assetId) query = query.eq('asset_id', assetId)

    const { data, error } = await query
    if (error) throw error

    return NextResponse.json({
      success: true,
      data: { comments: data || [] },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Comments GET error:', error)
    return NextResponse.json({
      success: true,
      data: { comments: [] },
      timestamp: new Date().toISOString(),
    })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { bundleId, assetId, author, content } = body

    if (!content) {
      return NextResponse.json(
        { success: false, error: 'Content is required' },
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

    const commentId = `cmt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

    const { data, error } = await supabase
      .from('content_comments')
      .insert({
        id: commentId,
        bundle_id: bundleId || null,
        asset_id: assetId || null,
        author: author || 'User',
        content,
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
    console.error('Comment POST error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to add comment',
      },
      { status: 500 }
    )
  }
}
