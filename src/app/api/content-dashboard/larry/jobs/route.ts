import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_KEY
  if (!url || !key) return null
  try {
    return createClient(url, key)
  } catch {
    return null
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin()

    if (!supabase) {
      return NextResponse.json({
        success: true,
        jobs: [],
        fallback: true,
      })
    }

    const { data: jobs, error } = await supabase
      .from('larry_jobs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20)

    if (error) {
      console.error('Failed to fetch larry_jobs:', error)
      return NextResponse.json({
        success: true,
        jobs: [],
        fallback: true,
        error: error.message,
      })
    }

    return NextResponse.json({
      success: true,
      jobs: jobs || [],
    })
  } catch (error: any) {
    console.error('Larry jobs API error:', error)
    return NextResponse.json({
      success: true,
      jobs: [],
      fallback: true,
      error: error.message || 'Internal server error',
    })
  }
}
