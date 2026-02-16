import { NextRequest, NextResponse } from 'next/server'

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const workflowId = params.id

    // Mock workflow cancellation
    console.log(`Cancelling workflow: ${workflowId}`)

    return NextResponse.json({
      success: true,
      message: `Workflow ${workflowId} cancelled successfully`
    })
  } catch (error) {
    console.error('Cancel workflow error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to cancel workflow' 
      },
      { status: 500 }
    )
  }
}