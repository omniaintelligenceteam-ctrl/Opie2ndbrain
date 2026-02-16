import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = getSupabaseAdmin()
    if (!supabase) {
      return NextResponse.json({
        success: true,
        data: { tests: [] },
        timestamp: new Date().toISOString(),
      })
    }

    const { data, error } = await supabase
      .from('ab_tests')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error

    // Enrich with bundle data
    const bundleIds = new Set<string>()
    for (const test of data || []) {
      if (test.bundle_a_id) bundleIds.add(test.bundle_a_id)
      if (test.bundle_b_id) bundleIds.add(test.bundle_b_id)
    }

    let bundleMap: Record<string, any> = {}
    if (bundleIds.size > 0) {
      const { data: bundles } = await supabase
        .from('content_bundles')
        .select('id, topic, trade, status, quality_score')
        .in('id', Array.from(bundleIds))

      for (const b of bundles || []) {
        bundleMap[b.id] = b
      }
    }

    const enriched = (data || []).map(test => ({
      ...test,
      bundle_a: bundleMap[test.bundle_a_id] || null,
      bundle_b: bundleMap[test.bundle_b_id] || null,
    }))

    return NextResponse.json({
      success: true,
      data: { tests: enriched },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('AB Tests GET error:', error)
    return NextResponse.json({
      success: true,
      data: { tests: [] },
      timestamp: new Date().toISOString(),
    })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, bundleAId, bundleBId } = body

    if (!name || !bundleAId || !bundleBId) {
      return NextResponse.json(
        { success: false, error: 'name, bundleAId, and bundleBId are required' },
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

    const testId = `abt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

    const { data, error } = await supabase
      .from('ab_tests')
      .insert({
        id: testId,
        name,
        bundle_a_id: bundleAId,
        bundle_b_id: bundleBId,
        status: 'draft',
        metrics: { a: { views: 0, clicks: 0, engagement: 0 }, b: { views: 0, clicks: 0, engagement: 0 } },
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
    console.error('AB Test POST error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create A/B test',
      },
      { status: 500 }
    )
  }
}
