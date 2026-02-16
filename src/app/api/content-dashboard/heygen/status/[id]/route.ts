import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { getVideoStatus, handleVideoCompletion, HEYGEN_CONFIGURED } from '@/lib/heygen'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: jobId } = await params

    const supabase = getSupabaseAdmin()
    if (!supabase) {
      return NextResponse.json(
        { success: false, error: 'Database not configured' },
        { status: 503 }
      )
    }

    const { data: job, error: jobError } = await supabase
      .from('heygen_jobs')
      .select('*')
      .eq('id', jobId)
      .single()

    if (jobError || !job) {
      return NextResponse.json(
        { success: false, error: 'Job not found' },
        { status: 404 }
      )
    }

    // If terminal state, return cached
    if (job.status === 'completed' || job.status === 'failed') {
      return NextResponse.json({
        success: true,
        data: job,
        timestamp: new Date().toISOString(),
      })
    }

    // If processing, poll HeyGen for fresh status
    if (job.video_id && HEYGEN_CONFIGURED) {
      try {
        const heygenStatus = await getVideoStatus(job.video_id)

        if (heygenStatus.status === 'completed' || heygenStatus.status === 'failed') {
          await handleVideoCompletion(jobId, heygenStatus)

          const { data: updatedJob } = await supabase
            .from('heygen_jobs')
            .select('*')
            .eq('id', jobId)
            .single()

          return NextResponse.json({
            success: true,
            data: updatedJob || job,
            heygenStatus: heygenStatus.status,
            timestamp: new Date().toISOString(),
          })
        }

        return NextResponse.json({
          success: true,
          data: { ...job, status: heygenStatus.status },
          heygenStatus: heygenStatus.status,
          timestamp: new Date().toISOString(),
        })
      } catch (pollError) {
        console.error('[HeyGen Status] Poll error:', pollError)
        return NextResponse.json({
          success: true,
          data: job,
          pollError: pollError instanceof Error ? pollError.message : 'Poll failed',
          timestamp: new Date().toISOString(),
        })
      }
    }

    return NextResponse.json({
      success: true,
      data: job,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('[HeyGen Status] Error:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to get status' },
      { status: 500 }
    )
  }
}
