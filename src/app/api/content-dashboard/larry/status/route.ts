import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const AUTO_FAIL_MINUTES = 4

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

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const jobId = params.id

    if (!jobId) {
      return NextResponse.json(
        { success: false, error: 'Job ID is required' },
        { status: 400 }
      )
    }

    const supabase = getSupabaseAdmin()

    if (!supabase) {
      return NextResponse.json({
        success: false,
        error: 'Database unavailable',
        fallback: true,
      })
    }

    const { data: job, error } = await supabase
      .from('larry_jobs')
      .select('*')
      .eq('id', jobId)
      .single()

    if (error || !job) {
      return NextResponse.json(
        { success: false, error: 'Job not found' },
        { status: 404 }
      )
    }

    // Auto-fail stale generating jobs
    if (job.status === 'generating') {
      const createdAt = new Date(job.created_at).getTime()
      const now = Date.now()
      const elapsedMinutes = (now - createdAt) / (1000 * 60)

      if (elapsedMinutes > AUTO_FAIL_MINUTES) {
        const { data: updatedJob } = await supabase
          .from('larry_jobs')
          .update({
            status: 'failed',
            error: `Auto-failed: exceeded ${AUTO_FAIL_MINUTES} minute timeout`,
            updated_at: new Date().toISOString(),
          })
          .eq('id', jobId)
          .select()
          .single()

        return NextResponse.json({
          success: true,
          job: updatedJob || { ...job, status: 'failed', error: 'Timed out' },
        })
      }
    }

    return NextResponse.json({
      success: true,
      job,
    })
  } catch (error: any) {
    console.error('Larry status API error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
