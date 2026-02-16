import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const bundleId = searchParams.get('bundleId')
    const status = searchParams.get('status')
    const limit = parseInt(searchParams.get('limit') || '20')

    const supabase = getSupabaseAdmin()
    if (!supabase) {
      return NextResponse.json({
        success: true,
        data: { jobs: [] },
        timestamp: new Date().toISOString(),
      })
    }

    let query = supabase
      .from('heygen_jobs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (bundleId) query = query.eq('bundle_id', bundleId)
    if (status) query = query.eq('status', status)

    const { data: jobs, error } = await query
    if (error) throw error

    return NextResponse.json({
      success: true,
      data: { jobs: jobs || [] },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('[HeyGen Jobs] Error:', error)
    return NextResponse.json({
      success: true,
      data: { jobs: [] },
      timestamp: new Date().toISOString(),
    })
  }
}
