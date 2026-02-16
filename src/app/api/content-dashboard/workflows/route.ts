import { NextRequest, NextResponse } from 'next/server'

// Mock workflow data
const mockWorkflows = [
  {
    id: 'wf_001',
    name: 'HVAC Content Generation',
    type: 'content-machine',
    status: 'completed',
    runtime_status: 'completed',
    input: {
      topic: 'HVAC maintenance tips',
      trade: 'HVAC'
    },
    output: {
      contentGenerated: 5,
      qualityScore: 92
    },
    created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    started_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    completed_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
    actual_duration: 60,
    agent_logs: [
      {
        agent: 'content-generator',
        timestamp: new Date(Date.now() - 90 * 60 * 1000).toISOString(),
        level: 'info',
        message: 'Started content generation process'
      },
      {
        agent: 'content-generator',
        timestamp: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
        level: 'success',
        message: 'Generated 5 high-quality content pieces'
      }
    ]
  },
  {
    id: 'wf_002',
    name: 'Research Trends',
    type: 'research-trends',
    status: 'running',
    runtime_status: 'running',
    input: {
      industry: 'Home Services',
      timeframe: '30d'
    },
    created_at: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    started_at: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    runtime_duration: 15,
    queue_position: 1,
    agent_logs: [
      {
        agent: 'trend-researcher',
        timestamp: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
        level: 'info',
        message: 'Analyzing market trends and competitor data'
      }
    ]
  },
  {
    id: 'wf_003',
    name: 'Hook Generator',
    type: 'hook-generator',
    status: 'queued',
    runtime_status: 'queued',
    input: {
      topic: 'Plumbing emergency tips',
      trade: 'Plumbing'
    },
    created_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    queue_position: 2,
    priority: 1,
    agent_logs: []
  }
]

const systemStatus = {
  activeWorkflows: 1,
  queuedWorkflows: 2,
  utilizationRate: 0.65
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const type = searchParams.get('type')
    const limit = parseInt(searchParams.get('limit') || '50')
    
    let filteredWorkflows = [...mockWorkflows]
    
    // Apply filters
    if (status && status !== 'all') {
      filteredWorkflows = filteredWorkflows.filter(w => w.status === status)
    }
    
    if (type && type !== 'all') {
      filteredWorkflows = filteredWorkflows.filter(w => w.type === type)
    }
    
    // Apply limit
    filteredWorkflows = filteredWorkflows.slice(0, limit)

    return NextResponse.json({
      success: true,
      data: filteredWorkflows,
      system_status: systemStatus
    })
  } catch (error) {
    console.error('Workflows API error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch workflows data' 
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, input, auto_start } = body

    // Mock workflow creation
    const newWorkflow = {
      id: `wf_${Date.now()}`,
      name: `${type.replace('-', ' ')} Workflow`,
      type,
      status: auto_start ? 'running' : 'pending',
      runtime_status: auto_start ? 'running' : 'pending',
      input,
      created_at: new Date().toISOString(),
      started_at: auto_start ? new Date().toISOString() : undefined,
      agent_logs: [{
        agent: 'workflow-manager',
        timestamp: new Date().toISOString(),
        level: 'info',
        message: 'Workflow created and queued'
      }]
    }

    // In a real implementation, you would save this to your database
    console.log('Created new workflow:', newWorkflow)

    return NextResponse.json({
      success: true,
      data: newWorkflow
    })
  } catch (error) {
    console.error('Create workflow error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to create workflow' 
      },
      { status: 500 }
    )
  }
}