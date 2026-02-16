import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import {
  getPredictionStatus,
  handleImageCompletion,
  IMAGE_GEN_CONFIGURED,
} from '@/lib/imageGeneration'

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
      .from('image_generation_jobs')
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

    // If processing, poll Replicate for fresh status
    if (job.prediction_id && IMAGE_GEN_CONFIGURED) {
      try {
        const predictionStatus = await getPredictionStatus(job.prediction_id)

        if (
          predictionStatus.status === 'succeeded' ||
          predictionStatus.status === 'failed' ||
          predictionStatus.status === 'canceled'
        ) {
          await handleImageCompletion(jobId, predictionStatus)

          const { data: updatedJob } = await supabase
            .from('image_generation_jobs')
            .select('*')
            .eq('id', jobId)
            .single()

          return NextResponse.json({
            success: true,
            data: updatedJob || job,
            predictionStatus: predictionStatus.status,
            timestamp: new Date().toISOString(),
          })
        }

        return NextResponse.json({
          success: true,
          data: { ...job, status: predictionStatus.status },
          predictionStatus: predictionStatus.status,
          timestamp: new Date().toISOString(),
        })
      } catch (pollError) {
        console.error('[Image Status] Poll error:', pollError)
        return NextResponse.json({
          success: true,
          data: job,
          pollError:
            pollError instanceof Error ? pollError.message : 'Poll failed',
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
    console.error('[Image Status] Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get status',
      },
      { status: 500 }
    )
  }
}
