import { NextRequest, NextResponse } from 'next/server'
import { retryWorkflow } from '@/lib/workflowEngine'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const workflowId = params.id
    const workflow = await retryWorkflow(workflowId)

    return NextResponse.json({
      success: true,
      data: workflow,
      message: `Workflow ${workflowId} retried successfully`,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Retry workflow error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to retry workflow',
      },
      { status: 500 }
    )
  }
}
