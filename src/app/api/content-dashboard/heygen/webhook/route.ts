import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { handleVideoCompletion, verifyWebhookSignature } from '@/lib/heygen'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface HeyGenWebhookPayload {
  event_type: 'avatar_video.success' | 'avatar_video.fail'
  event_data: {
    video_id: string
    url?: string
    callback_id?: string
    msg?: string
  }
}

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text()

    // Verify HMAC signature if configured
    const signature = request.headers.get('Signature') || ''
    if (signature && !verifyWebhookSignature(rawBody, signature)) {
      console.error('[HeyGen Webhook] Invalid signature')
      return NextResponse.json(
        { success: false, error: 'Invalid signature' },
        { status: 401 }
      )
    }

    const payload: HeyGenWebhookPayload = JSON.parse(rawBody)

    console.log('[HeyGen Webhook] Received:', {
      event_type: payload.event_type,
      video_id: payload.event_data?.video_id,
      callback_id: payload.event_data?.callback_id,
    })

    const { event_type, event_data } = payload

    if (!event_data?.video_id) {
      return NextResponse.json(
        { success: false, error: 'Missing video_id' },
        { status: 400 }
      )
    }

    // Find job by callback_id (= our job ID) or by video_id
    const supabase = getSupabaseAdmin()
    if (!supabase) {
      return NextResponse.json(
        { success: false, error: 'Database not configured' },
        { status: 503 }
      )
    }

    let jobId: string | null = null

    if (event_data.callback_id) {
      jobId = event_data.callback_id
    } else {
      const { data: job } = await supabase
        .from('heygen_jobs')
        .select('id')
        .eq('video_id', event_data.video_id)
        .single()
      jobId = job?.id || null
    }

    if (!jobId) {
      console.warn('[HeyGen Webhook] No matching job for video_id:', event_data.video_id)
      return NextResponse.json({ success: true, message: 'No matching job' })
    }

    if (event_type === 'avatar_video.success') {
      await handleVideoCompletion(jobId, {
        status: 'completed',
        video_url: event_data.url,
      })
    } else if (event_type === 'avatar_video.fail') {
      await handleVideoCompletion(jobId, {
        status: 'failed',
        error: event_data.msg || 'Video generation failed',
      })
    }

    return NextResponse.json({
      success: true,
      message: `Processed ${event_type} for job ${jobId}`,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('[HeyGen Webhook] Error:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Webhook processing failed' },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'healthy',
    endpoint: 'heygen-webhook',
    timestamp: new Date().toISOString(),
  })
}
