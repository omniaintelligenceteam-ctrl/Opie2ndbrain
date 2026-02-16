import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const assetId = searchParams.get('assetId')
    const days = parseInt(searchParams.get('days') || '30')

    const supabase = getSupabaseAdmin()
    if (!supabase) {
      return NextResponse.json({
        success: true,
        data: { records: [], summary: { impressions: 0, clicks: 0, avgEngagement: 0, shares: 0 } },
        timestamp: new Date().toISOString(),
      })
    }

    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

    let query = supabase
      .from('content_analytics')
      .select('*')
      .gte('recorded_at', cutoff)
      .order('recorded_at', { ascending: false })

    if (assetId) query = query.eq('asset_id', assetId)

    const { data, error } = await query
    if (error) throw error

    const records = data || []

    // Compute summary
    const summary = {
      impressions: records.reduce((sum, r) => sum + (r.impressions || 0), 0),
      clicks: records.reduce((sum, r) => sum + (r.clicks || 0), 0),
      avgEngagement: records.length > 0
        ? records.reduce((sum, r) => sum + parseFloat(r.engagement_rate || '0'), 0) / records.length
        : 0,
      shares: records.reduce((sum, r) => sum + (r.shares || 0), 0),
    }

    // Per-platform breakdown
    const platformMap: Record<string, { impressions: number; clicks: number; engagement: number; shares: number; count: number }> = {}
    for (const r of records) {
      if (!platformMap[r.platform]) {
        platformMap[r.platform] = { impressions: 0, clicks: 0, engagement: 0, shares: 0, count: 0 }
      }
      platformMap[r.platform].impressions += r.impressions || 0
      platformMap[r.platform].clicks += r.clicks || 0
      platformMap[r.platform].engagement += parseFloat(r.engagement_rate || '0')
      platformMap[r.platform].shares += r.shares || 0
      platformMap[r.platform].count += 1
    }

    const platforms = Object.entries(platformMap).map(([platform, data]) => ({
      platform,
      impressions: data.impressions,
      clicks: data.clicks,
      avgEngagement: data.count > 0 ? data.engagement / data.count : 0,
      shares: data.shares,
    }))

    return NextResponse.json({
      success: true,
      data: { records, summary, platforms },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Analytics performance GET error:', error)
    return NextResponse.json({
      success: true,
      data: { records: [], summary: { impressions: 0, clicks: 0, avgEngagement: 0, shares: 0 }, platforms: [] },
      timestamp: new Date().toISOString(),
    })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { assetId, platform, impressions, clicks, engagement_rate, shares } = body

    if (!assetId || !platform) {
      return NextResponse.json(
        { success: false, error: 'assetId and platform are required' },
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

    const recordId = `anl_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

    const { data, error } = await supabase
      .from('content_analytics')
      .insert({
        id: recordId,
        asset_id: assetId,
        platform,
        impressions: impressions || 0,
        clicks: clicks || 0,
        engagement_rate: engagement_rate || 0,
        shares: shares || 0,
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
    console.error('Analytics performance POST error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to record analytics',
      },
      { status: 500 }
    )
  }
}
