import { NextRequest, NextResponse } from 'next/server'
import { cancelWorkflow, getWorkflowStatus } from '@/lib/workflowEngine'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const workflowId = params.id
    const workflow = await getWorkflowStatus(workflowId)

    if (!workflow) {
      return NextResponse.json(
        { success: false, error: 'Workflow not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: workflow,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Get workflow error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get workflow',
      },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const workflowId = params.id
    const workflow = await cancelWorkflow(workflowId)

    return NextResponse.json({
      success: true,
      data: workflow,
      message: `Workflow ${workflowId} cancelled successfully`,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Cancel workflow error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to cancel workflow',
      },
      { status: 500 }
    )
  }
}
