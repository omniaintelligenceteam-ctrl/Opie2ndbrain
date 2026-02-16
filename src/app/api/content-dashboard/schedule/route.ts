import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const from = searchParams.get('from')
    const to = searchParams.get('to')

    const supabase = getSupabaseAdmin()
    if (!supabase) {
      return NextResponse.json({
        success: true,
        data: { scheduled: [] },
        timestamp: new Date().toISOString(),
      })
    }

    let query = supabase
      .from('content_assets')
      .select('*')
      .not('scheduled_for', 'is', null)
      .order('scheduled_for', { ascending: true })

    if (from) query = query.gte('scheduled_for', from)
    if (to) query = query.lte('scheduled_for', to)

    const { data, error } = await query
    if (error) throw error

    return NextResponse.json({
      success: true,
      data: { scheduled: data || [] },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Schedule GET error:', error)
    return NextResponse.json({
      success: true,
      data: { scheduled: [] },
      timestamp: new Date().toISOString(),
    })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { assetId, scheduled_for, platform } = body

    if (!assetId || !scheduled_for) {
      return NextResponse.json(
        { success: false, error: 'assetId and scheduled_for are required' },
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

    const { data, error } = await supabase
      .from('content_assets')
      .update({
        scheduled_for,
        platform: platform || null,
        status: 'scheduled',
      })
      .eq('id', assetId)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({
      success: true,
      data,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Schedule POST error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to schedule asset',
      },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json()
    const { assetId } = body

    if (!assetId) {
      return NextResponse.json(
        { success: false, error: 'assetId is required' },
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

    const { data, error } = await supabase
      .from('content_assets')
      .update({
        scheduled_for: null,
        platform: null,
        status: 'draft',
      })
      .eq('id', assetId)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({
      success: true,
      data,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Schedule DELETE error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to unschedule asset',
      },
      { status: 500 }
    )
  }
}
