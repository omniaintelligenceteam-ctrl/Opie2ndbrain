// =============================================================================
// Workflow Engine — Creates, runs, and tracks workflows via Supabase + Gateway
// =============================================================================

import { getSupabaseAdmin } from './supabase'
import { invokeGatewayTool } from './gateway'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface WorkflowRecord {
  id: string
  name: string
  type: string
  status: string
  runtime_status: string
  input: Record<string, unknown> | null
  output: Record<string, unknown> | null
  agent_logs: AgentLog[]
  error_message: string | null
  created_at: string
  started_at: string | null
  completed_at: string | null
  actual_duration: number | null
  runtime_duration: number | null
  queue_position: number | null
  priority: number
  progress: number
}

export interface AgentLog {
  agent: string
  timestamp: string
  level: 'info' | 'warning' | 'error' | 'success'
  message: string
}

// ---------------------------------------------------------------------------
// Workflow type → agent task prompt mapping
// ---------------------------------------------------------------------------

const WORKFLOW_PROMPTS: Record<string, (input: Record<string, unknown>) => string> = {
  'content-machine': (input) =>
    `Generate a complete content bundle for the topic "${input.topic || 'general'}". ` +
    `Trade/Industry: ${input.trade || 'Home Services'}. ` +
    `Create the following content pieces:\n` +
    `1. Email newsletter (subject line + body)\n` +
    `2. LinkedIn post (professional tone, 150-300 words)\n` +
    `3. Instagram caption (engaging, with hashtags)\n` +
    `4. Short-form video script (30-60 seconds)\n` +
    `5. Blog post outline (5-7 sections)\n` +
    `Return each piece clearly labeled. Focus on providing actionable value to the target audience.`,

  'research-trends': (input) =>
    `Research current trends in the ${input.industry || input.trade || 'Home Services'} industry. ` +
    `Timeframe: ${input.timeframe || 'last 30 days'}. ` +
    `Provide:\n` +
    `1. Top 5 trending topics\n` +
    `2. Competitor content analysis\n` +
    `3. Audience engagement patterns\n` +
    `4. Content gap opportunities\n` +
    `5. Recommended content calendar for next 2 weeks\n` +
    `Return structured, actionable insights.`,

  'hook-generator': (input) =>
    `Generate 10 compelling marketing hooks for the topic "${input.topic || 'general'}". ` +
    `Trade/Industry: ${input.trade || 'Home Services'}. ` +
    `For each hook provide:\n` +
    `1. The hook text (attention-grabbing first line)\n` +
    `2. Platform recommendation (email, social, video)\n` +
    `3. Emotional trigger used\n` +
    `4. Follow-up CTA suggestion\n` +
    `Focus on pain points, curiosity, and urgency.`,
}

const WORKFLOW_NAMES: Record<string, string> = {
  'content-machine': 'Content Generation',
  'research-trends': 'Trend Research',
  'hook-generator': 'Hook Generation',
  'batch-content': 'Batch Content',
}

// ---------------------------------------------------------------------------
// Helper: get Supabase admin or throw
// ---------------------------------------------------------------------------

function getDB() {
  const db = getSupabaseAdmin()
  if (!db) throw new Error('Supabase not configured')
  return db
}

function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

// ---------------------------------------------------------------------------
// Core Functions
// ---------------------------------------------------------------------------

/** Create a new workflow record in the database */
export async function createWorkflow(
  type: string,
  input: Record<string, unknown>,
  name?: string
): Promise<WorkflowRecord> {
  const db = getDB()
  const id = generateId('wf')
  const workflowName = name || `${WORKFLOW_NAMES[type] || type.replace(/-/g, ' ')} — ${(input.topic as string) || (input.trade as string) || 'General'}`

  const record = {
    id,
    name: workflowName,
    type,
    status: 'pending',
    runtime_status: 'pending',
    input,
    output: null,
    agent_logs: [{
      agent: 'workflow-engine',
      timestamp: new Date().toISOString(),
      level: 'info',
      message: 'Workflow created',
    }],
    error_message: null,
    created_at: new Date().toISOString(),
    started_at: null,
    completed_at: null,
    actual_duration: null,
    runtime_duration: null,
    queue_position: null,
    priority: 0,
    progress: 0,
  }

  const { data, error } = await db
    .from('workflows')
    .insert(record)
    .select()
    .single()

  if (error) throw new Error(`Failed to create workflow: ${error.message}`)
  return data as WorkflowRecord
}

/** Start a workflow — updates status and spawns agent */
export async function startWorkflow(workflowId: string): Promise<WorkflowRecord> {
  const db = getDB()

  // Update status to running
  const { data: workflow, error: updateError } = await db
    .from('workflows')
    .update({
      status: 'running',
      runtime_status: 'running',
      started_at: new Date().toISOString(),
      progress: 5,
    })
    .eq('id', workflowId)
    .select()
    .single()

  if (updateError) throw new Error(`Failed to start workflow: ${updateError.message}`)
  const wf = workflow as WorkflowRecord

  // Append log
  await appendLog(workflowId, {
    agent: 'workflow-engine',
    timestamp: new Date().toISOString(),
    level: 'info',
    message: 'Workflow started, spawning agent...',
  })

  // Spawn agent in background (don't await — let it run async)
  spawnAgentForWorkflow(workflowId, wf.type, (wf.input || {}) as Record<string, unknown>)
    .catch(async (err) => {
      console.error(`Agent spawn failed for ${workflowId}:`, err)
      await failWorkflow(workflowId, `Agent spawn failed: ${err.message}`)
    })

  return wf
}

/** Spawn a gateway agent for the workflow */
async function spawnAgentForWorkflow(
  workflowId: string,
  type: string,
  input: Record<string, unknown>
): Promise<void> {
  const promptBuilder = WORKFLOW_PROMPTS[type]
  if (!promptBuilder) {
    await failWorkflow(workflowId, `Unknown workflow type: ${type}`)
    return
  }

  const task = promptBuilder(input)
  const label = `workflow-${workflowId}`

  await appendLog(workflowId, {
    agent: type,
    timestamp: new Date().toISOString(),
    level: 'info',
    message: `Spawning ${type} agent...`,
  })

  const result = await invokeGatewayTool<{
    sessionId?: string
    childSessionKey?: string
  }>('sessions_spawn', {
    task,
    label,
    model: 'anthropic/claude-sonnet-4',
    thinking: 'low',
    runTimeoutSeconds: 300,
  }, { timeout: 30000 })

  if (!result.ok) {
    await failWorkflow(
      workflowId,
      `Gateway error: ${result.error?.message || 'Failed to spawn agent'}`
    )
    return
  }

  const sessionId = result.result?.sessionId || result.result?.childSessionKey || label

  await appendLog(workflowId, {
    agent: type,
    timestamp: new Date().toISOString(),
    level: 'success',
    message: `Agent spawned successfully (session: ${sessionId})`,
  })

  // Update progress
  const db = getDB()
  await db.from('workflows').update({ progress: 25 }).eq('id', workflowId)

  // Note: In a full system, the agent would call back to update progress.
  // For now, we mark it as running. The agent completion callback or
  // polling mechanism would call completeWorkflow() when done.
}

/** Append a log entry to a workflow */
async function appendLog(workflowId: string, log: AgentLog): Promise<void> {
  const db = getDB()

  // Fetch current logs, append, and update
  const { data } = await db
    .from('workflows')
    .select('agent_logs')
    .eq('id', workflowId)
    .single()

  const currentLogs = (data?.agent_logs as AgentLog[]) || []
  currentLogs.push(log)

  await db
    .from('workflows')
    .update({ agent_logs: currentLogs })
    .eq('id', workflowId)
}

/** Update workflow progress and optionally add a log */
export async function updateWorkflowProgress(
  workflowId: string,
  progress: number,
  logEntry?: AgentLog
): Promise<void> {
  const db = getDB()

  if (logEntry) {
    await appendLog(workflowId, logEntry)
  }

  await db
    .from('workflows')
    .update({ progress: Math.min(progress, 100) })
    .eq('id', workflowId)
}

/** Mark workflow as completed with output */
export async function completeWorkflow(
  workflowId: string,
  output: Record<string, unknown>
): Promise<WorkflowRecord> {
  const db = getDB()

  // Get started_at to calculate duration
  const { data: current } = await db
    .from('workflows')
    .select('started_at')
    .eq('id', workflowId)
    .single()

  const startedAt = current?.started_at ? new Date(current.started_at) : null
  const duration = startedAt
    ? Math.round((Date.now() - startedAt.getTime()) / 60000) // minutes
    : null

  await appendLog(workflowId, {
    agent: 'workflow-engine',
    timestamp: new Date().toISOString(),
    level: 'success',
    message: 'Workflow completed successfully',
  })

  const { data, error } = await db
    .from('workflows')
    .update({
      status: 'completed',
      runtime_status: 'completed',
      completed_at: new Date().toISOString(),
      actual_duration: duration,
      output,
      progress: 100,
    })
    .eq('id', workflowId)
    .select()
    .single()

  if (error) throw new Error(`Failed to complete workflow: ${error.message}`)
  return data as WorkflowRecord
}

/** Mark workflow as failed */
export async function failWorkflow(
  workflowId: string,
  errorMessage: string
): Promise<WorkflowRecord> {
  const db = getDB()

  await appendLog(workflowId, {
    agent: 'workflow-engine',
    timestamp: new Date().toISOString(),
    level: 'error',
    message: errorMessage,
  })

  const { data, error } = await db
    .from('workflows')
    .update({
      status: 'failed',
      runtime_status: 'failed',
      error_message: errorMessage,
      completed_at: new Date().toISOString(),
    })
    .eq('id', workflowId)
    .select()
    .single()

  if (error) throw new Error(`Failed to update workflow: ${error.message}`)
  return data as WorkflowRecord
}

/** Cancel a running or queued workflow */
export async function cancelWorkflow(workflowId: string): Promise<WorkflowRecord> {
  const db = getDB()

  await appendLog(workflowId, {
    agent: 'workflow-engine',
    timestamp: new Date().toISOString(),
    level: 'warning',
    message: 'Workflow cancelled by user',
  })

  const { data, error } = await db
    .from('workflows')
    .update({
      status: 'cancelled',
      runtime_status: 'cancelled',
      completed_at: new Date().toISOString(),
    })
    .eq('id', workflowId)
    .select()
    .single()

  if (error) throw new Error(`Failed to cancel workflow: ${error.message}`)
  return data as WorkflowRecord
}

/** Retry a failed workflow */
export async function retryWorkflow(workflowId: string): Promise<WorkflowRecord> {
  const db = getDB()

  // Reset workflow state
  const { error: resetError } = await db
    .from('workflows')
    .update({
      status: 'pending',
      runtime_status: 'pending',
      error_message: null,
      completed_at: null,
      actual_duration: null,
      progress: 0,
    })
    .eq('id', workflowId)

  if (resetError) throw new Error(`Failed to reset workflow: ${resetError.message}`)

  await appendLog(workflowId, {
    agent: 'workflow-engine',
    timestamp: new Date().toISOString(),
    level: 'info',
    message: 'Workflow retried by user',
  })

  // Start it again
  return startWorkflow(workflowId)
}

/** Get a single workflow by ID */
export async function getWorkflowStatus(workflowId: string): Promise<WorkflowRecord | null> {
  const db = getDB()

  const { data, error } = await db
    .from('workflows')
    .select('*')
    .eq('id', workflowId)
    .single()

  if (error) return null
  return data as WorkflowRecord
}
