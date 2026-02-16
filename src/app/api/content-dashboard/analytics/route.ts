import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    // Mock dashboard statistics for now
    // In a real implementation, these would come from your database/workflows system
    const mockStats = {
      activeWorkflows: 3,
      queuedWorkflows: 7,
      approvedContent: 24,
      queuedTopics: 12,
      avgAgentHealth: 0.87,
      scheduledPosts: 15
    }

    return NextResponse.json({
      success: true,
      data: mockStats
    })
  } catch (error) {
    console.error('Analytics API error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch analytics data' 
      },
      { status: 500 }
    )
  }
}