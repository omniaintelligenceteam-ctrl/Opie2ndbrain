import { NextRequest, NextResponse } from 'next/server'
import { retryJob, HeyGenError } from '@/lib/heygen'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: jobId } = await params
    const job = await retryJob(jobId)

    return NextResponse.json({
      success: true,
      data: job,
      message: `Job retried (attempt ${job.retry_count}/${job.max_retries})`,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('[HeyGen Retry] Error:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to retry job' },
      { status: error instanceof HeyGenError ? 400 : 500 }
    )
  }
}
