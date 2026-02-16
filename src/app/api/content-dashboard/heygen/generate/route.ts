import { NextRequest, NextResponse } from 'next/server'
import { createVideoFromBundle, HEYGEN_CONFIGURED, HeyGenError } from '@/lib/heygen'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    if (!HEYGEN_CONFIGURED) {
      return NextResponse.json(
        { success: false, error: 'HeyGen API key not configured' },
        { status: 503 }
      )
    }

    const body = await request.json()
    const { bundleId, assetId, scriptText, avatarId, voiceId } = body

    if (!scriptText || typeof scriptText !== 'string') {
      return NextResponse.json(
        { success: false, error: 'scriptText is required' },
        { status: 400 }
      )
    }

    if (!bundleId) {
      return NextResponse.json(
        { success: false, error: 'bundleId is required' },
        { status: 400 }
      )
    }

    // Build callback URL if we have a public app URL
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL
    const callbackUrl = appUrl
      ? `${appUrl.startsWith('http') ? appUrl : `https://${appUrl}`}/api/content-dashboard/heygen/webhook`
      : undefined

    const job = await createVideoFromBundle({
      bundleId,
      assetId,
      scriptText,
      avatarId,
      voiceId,
      callbackUrl,
    })

    return NextResponse.json({
      success: true,
      data: { job, jobId: job.id, videoId: job.video_id },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('[HeyGen Generate] Error:', error)
    const statusCode = error instanceof HeyGenError ? (error.statusCode || 500) : 500
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to generate video' },
      { status: statusCode }
    )
  }
}
