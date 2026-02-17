import { NextRequest, NextResponse } from 'next/server'
import {
  generateContentImages,
  IMAGE_GEN_CONFIGURED,
  ImageGenerationError,
} from '@/lib/imageGeneration'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    if (!IMAGE_GEN_CONFIGURED) {
      return NextResponse.json(
        { success: false, error: 'GEMINI_API_KEY not configured' },
        { status: 503 }
      )
    }

    const body = await request.json()
    const { bundleId, trade, topic, count, style, brandColors } = body

    if (!bundleId) {
      return NextResponse.json(
        { success: false, error: 'bundleId is required' },
        { status: 400 }
      )
    }

    if (!trade || typeof trade !== 'string') {
      return NextResponse.json(
        { success: false, error: 'trade is required' },
        { status: 400 }
      )
    }

    const result = await generateContentImages({
      bundleId,
      trade,
      topic: topic || trade,
      count,
      style,
      brandColors,
    })

    const jobs = result.jobs || []
    const jobIds = Array.isArray(jobs) ? jobs.map((j) => j.id) : []

    return NextResponse.json({
      success: true,
      data: { jobs, jobIds },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('[Image Generate] Error:', error)
    const statusCode =
      error instanceof ImageGenerationError ? error.statusCode || 500 : 500
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate images',
      },
      { status: statusCode }
    )
  }
}
