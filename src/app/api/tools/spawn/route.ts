import { NextRequest, NextResponse } from 'next/server';
import { invokeGatewayTool } from '@/lib/gateway';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// In-memory storage for agent sessions (replace with Redis/DB in production)
const agentSessions = new Map<string, {
  id: string;
  name: string;
  task: string;
  model: string;
  status: 'spawning' | 'active' | 'completed' | 'error';
  sessionKey?: string;
  createdAt: Date;
  completedAt?: Date;
  result?: any;
  error?: string;
}>();

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { 
      task, 
      agent_name = 'subagent', 
      model = 'anthropic/claude-sonnet-4-20250514', 
      timeout = 300 
    } = body;

    if (!task) {
      return NextResponse.json({ error: 'Task is required' }, { status: 400 });
    }

    // Generate unique agent ID
    const agentId = `agent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Store agent info
    const agentInfo: {
      id: string;
      name: string;
      task: string;
      model: string;
      status: 'spawning' | 'active' | 'completed' | 'error';
      createdAt: Date;
      sessionKey?: string;
      completedAt?: Date;
      result?: any;
      error?: string;
    } = {
      id: agentId,
      name: agent_name,
      task,
      model,
      status: 'spawning',
      createdAt: new Date(),
    };
    
    agentSessions.set(agentId, agentInfo);

    try {
      // Spawn the agent via OpenClaw
      const result = await invokeGatewayTool('sessions_spawn', {
        task,
        label: `agent:main:${agent_name}:${Date.now().toString(36)}`,
        model,
        timeoutSeconds: timeout,
        cleanup: 'keep',
      });

      if (!result.ok) {
        // Update status to error
        agentSessions.set(agentId, {
          ...agentInfo,
          status: 'error',
          error: result.error?.message || 'Failed to spawn agent',
          completedAt: new Date(),
        });

        return NextResponse.json({ 
          error: result.error?.message || 'Failed to spawn agent',
          agent_id: agentId
        }, { status: 500 });
      }

      // Update with session key
      const spawnResult = result.result as any;
      agentSessions.set(agentId, {
        ...agentInfo,
        status: 'active',
        sessionKey: spawnResult?.sessionKey,
      });

      return NextResponse.json({
        success: true,
        agent_id: agentId,
        agent_name,
        session_key: spawnResult?.sessionKey,
        task,
        model,
        timeout,
        status: 'spawned'
      });

    } catch (error) {
      // Update status to error
      agentSessions.set(agentId, {
        ...agentInfo,
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
        completedAt: new Date(),
      });

      return NextResponse.json({
        error: `Failed to spawn agent: ${error instanceof Error ? error.message : 'Unknown error'}`,
        agent_id: agentId
      }, { status: 500 });
    }

  } catch (error) {
    console.error('[Spawn API] Error:', error);
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const agentId = url.searchParams.get('agent_id');
  const action = url.searchParams.get('action') || 'list';

  try {
    if (action === 'list') {
      // Return all agents
      const agents = Array.from(agentSessions.values())
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      
      return NextResponse.json({
        success: true,
        agents: agents.map(agent => ({
          id: agent.id,
          name: agent.name,
          task: agent.task,
          model: agent.model,
          status: agent.status,
          createdAt: agent.createdAt,
          completedAt: agent.completedAt,
          sessionKey: agent.sessionKey,
          hasError: !!agent.error,
        })),
        total: agents.length
      });
    }

    if (action === 'get' && agentId) {
      const agent = agentSessions.get(agentId);
      if (!agent) {
        return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
      }

      return NextResponse.json({
        success: true,
        agent: {
          id: agent.id,
          name: agent.name,
          task: agent.task,
          model: agent.model,
          status: agent.status,
          createdAt: agent.createdAt,
          completedAt: agent.completedAt,
          sessionKey: agent.sessionKey,
          result: agent.result,
          error: agent.error,
        }
      });
    }

    if (action === 'status' && agentId) {
      const agent = agentSessions.get(agentId);
      if (!agent) {
        return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
      }

      // Try to get status from OpenClaw if we have a session key
      if (agent.sessionKey) {
        try {
          const statusResult = await invokeGatewayTool('session_status', {
            sessionKey: agent.sessionKey,
          });

          if (statusResult.ok) {
            // Update local status based on gateway response
            const gatewayResult = statusResult.result as any;
            let newStatus = agent.status;
            if (gatewayResult?.status === 'completed') {
              newStatus = 'completed';
            } else if (gatewayResult?.status === 'error') {
              newStatus = 'error';
            }

            if (newStatus !== agent.status) {
              agentSessions.set(agentId, {
                ...agent,
                status: newStatus,
                completedAt: newStatus === 'completed' || newStatus === 'error' ? new Date() : undefined,
                result: statusResult.result,
              });
            }

            return NextResponse.json({
              success: true,
              agent_id: agentId,
              status: newStatus,
              gateway_status: statusResult.result,
            });
          }
        } catch (error) {
          console.error('[Spawn API] Status check error:', error);
        }
      }

      // Return local status
      return NextResponse.json({
        success: true,
        agent_id: agentId,
        status: agent.status,
        local_only: true,
      });
    }

    return NextResponse.json({ error: 'Invalid action or missing agent_id' }, { status: 400 });

  } catch (error) {
    console.error('[Spawn API] GET Error:', error);
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const url = new URL(req.url);
  const agentId = url.searchParams.get('agent_id');

  if (!agentId) {
    return NextResponse.json({ error: 'Agent ID is required' }, { status: 400 });
  }

  try {
    const agent = agentSessions.get(agentId);
    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    // Try to terminate the session if it exists
    if (agent.sessionKey) {
      try {
        await invokeGatewayTool('session_terminate', {
          sessionKey: agent.sessionKey,
        });
      } catch (error) {
        console.error('[Spawn API] Termination error:', error);
        // Continue anyway to remove local record
      }
    }

    // Remove from local storage
    agentSessions.delete(agentId);

    return NextResponse.json({
      success: true,
      message: 'Agent terminated and removed',
      agent_id: agentId
    });

  } catch (error) {
    console.error('[Spawn API] DELETE Error:', error);
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Internal helpers for session access
function getAgentSessions() {
  return Array.from(agentSessions.values());
}

function getAgentSession(agentId: string) {
  return agentSessions.get(agentId);
}