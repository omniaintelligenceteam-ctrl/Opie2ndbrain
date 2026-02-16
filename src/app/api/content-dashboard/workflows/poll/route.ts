import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { GATEWAY_URL, GATEWAY_TOKEN, IS_VERCEL } from '@/lib/gateway'
import { completeWorkflow, failWorkflow, updateWorkflowProgress } from '@/lib/workflowEngine'
import { parseAgentOutput, parsedContentToAssetRecords } from '@/lib/contentParser'
import { createVideoFromBundle, HEYGEN_CONFIGURED } from '@/lib/heygen'
import type { WorkflowRecord } from '@/lib/workflowEngine'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// ---------------------------------------------------------------------------
// Gateway helpers (reuse patterns from agents/stream/route.ts)
// ---------------------------------------------------------------------------

interface GatewaySession {
  key?: string
  sessionId?: string
  label?: string
  updatedAt?: number
  createdAt?: number
  abortedLastRun?: boolean
  kind?: string
}

async function fetchGatewaySessions(): Promise<GatewaySession[]> {
  if (IS_VERCEL && GATEWAY_URL.includes('localhost')) return []

  try {
    const res = await fetch(`${GATEWAY_URL}/tools/invoke`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        ...(GATEWAY_TOKEN && { 'Authorization': `Bearer ${GATEWAY_TOKEN}` }),
      },
      body: JSON.stringify({
        tool: 'sessions_list',
        args: { activeMinutes: 30, messageLimit: 1 },
      }),
      signal: AbortSignal.timeout(8000),
    })

    const contentType = res.headers.get('content-type') || ''
    if (!contentType.includes('application/json')) return []

    const data = await res.json()
    return data.result?.details?.sessions || data.result?.sessions || []
  } catch (err) {
    console.error('[Poll] Gateway sessions_list error:', err)
    return []
  }
}

async function fetchSessionHistory(sessionKey: string): Promise<string | null> {
  try {
    const res = await fetch(`${GATEWAY_URL}/tools/invoke`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        ...(GATEWAY_TOKEN && { 'Authorization': `Bearer ${GATEWAY_TOKEN}` }),
      },
      body: JSON.stringify({
        tool: 'sessions_history',
        args: { sessionKey, limit: 5, includeTools: false },
      }),
      signal: AbortSignal.timeout(10000),
    })

    const contentType = res.headers.get('content-type') || ''
    if (!contentType.includes('application/json')) return null

    const data = await res.json()
    if (!data.ok) return null

    // Extract the last assistant message from history
    const messages = data.result?.messages || data.result?.history || []
    if (Array.isArray(messages)) {
      for (let i = messages.length - 1; i >= 0; i--) {
        const msg = messages[i]
        if (msg.role === 'assistant' && typeof msg.content === 'string') {
          return msg.content
        }
        // Handle content array format
        if (msg.role === 'assistant' && Array.isArray(msg.content)) {
          const textParts = msg.content
            .filter((p: { type: string; text?: string }) => p.type === 'text' && p.text)
            .map((p: { text: string }) => p.text)
          if (textParts.length > 0) return textParts.join('\n')
        }
      }
    }

    // Try flat result string
    if (typeof data.result === 'string') return data.result

    return null
  } catch (err) {
    console.error('[Poll] Gateway sessions_history error:', err)
    return null
  }
}

function determineSessionStatus(session: GatewaySession): 'running' | 'complete' | 'failed' {
  if (session.abortedLastRun) return 'failed'

  const updatedAt = session.updatedAt
  if (updatedAt && Date.now() - updatedAt < 30000) {
    return 'running'
  }

  return 'complete'
}

// ---------------------------------------------------------------------------
// POST /api/content-dashboard/workflows/poll
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin()
    if (!supabase) {
      return NextResponse.json({
        success: true,
        data: { processed: 0, completed: [], failed: [], running: [] },
      })
    }

    // Optional filter: only poll specific workflow IDs
    let workflowIds: string[] | null = null
    try {
      const body = await request.json()
      if (Array.isArray(body.workflowIds)) {
        workflowIds = body.workflowIds
      }
    } catch {
      // No body or invalid JSON — poll all running workflows
    }

    // Fetch running workflows that have a tracked session
    let query = supabase
      .from('workflows')
      .select('*')
      .eq('status', 'running')
      .not('agent_session_id', 'is', null)

    if (workflowIds && workflowIds.length > 0) {
      query = query.in('id', workflowIds)
    }

    const { data: runningWorkflows, error: fetchError } = await query
    if (fetchError || !runningWorkflows || runningWorkflows.length === 0) {
      return NextResponse.json({
        success: true,
        data: { processed: 0, completed: [], failed: [], running: [] },
      })
    }

    // Fetch all gateway sessions at once (single API call)
    const gatewaySessions = await fetchGatewaySessions()
    const sessionMap = new Map<string, GatewaySession>()
    for (const s of gatewaySessions) {
      const key = s.key || s.sessionId || ''
      if (key) sessionMap.set(key, s)
      // Also map by label since we use `workflow-{id}` as label
      if (s.label) sessionMap.set(s.label, s)
    }

    const completed: string[] = []
    const failed: string[] = []
    const running: string[] = []

    for (const wf of runningWorkflows as WorkflowRecord[]) {
      const sessionId = wf.agent_session_id
      if (!sessionId) continue

      // Find session by ID or label
      const session = sessionMap.get(sessionId) || sessionMap.get(`workflow-${wf.id}`)

      if (!session) {
        // Session not found in gateway — might be completed and cleaned up
        // Check if enough time has passed since start (at least 30s)
        const elapsed = wf.started_at
          ? Date.now() - new Date(wf.started_at).getTime()
          : 0

        if (elapsed < 30000) {
          // Too soon — session might not have registered yet
          running.push(wf.id)
          continue
        }

        // Try to get output from history
        const output = await fetchSessionHistory(sessionId)
        if (output) {
          await handleCompletion(supabase, wf, output)
          completed.push(wf.id)
        } else {
          // No session and no history — likely timed out or failed
          await failWorkflow(wf.id, 'Agent session lost — gateway returned no data')
          failed.push(wf.id)
        }
        continue
      }

      const status = determineSessionStatus(session)

      if (status === 'running') {
        // Still running — update progress based on elapsed time
        const elapsed = wf.started_at
          ? Date.now() - new Date(wf.started_at).getTime()
          : 0
        const expectedDuration = 180_000 // 3 minutes
        const progress = Math.min(90, 25 + Math.round(65 * (elapsed / expectedDuration)))

        if (progress > (wf.progress || 0)) {
          await updateWorkflowProgress(wf.id, progress)
        }
        running.push(wf.id)
      } else if (status === 'failed') {
        await failWorkflow(wf.id, 'Agent session was aborted')
        failed.push(wf.id)
      } else {
        // Complete — fetch output
        const output = await fetchSessionHistory(sessionId)
        if (output) {
          await handleCompletion(supabase, wf, output)
          completed.push(wf.id)
        } else {
          // Completed but no parseable output
          await completeWorkflow(wf.id, { result: 'Agent completed but produced no extractable output' })
          completed.push(wf.id)
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        processed: runningWorkflows.length,
        completed,
        failed,
        running,
      },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('[Poll] Workflow poll error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Poll failed',
    }, { status: 500 })
  }
}

// ---------------------------------------------------------------------------
// Handle workflow completion: parse output, create assets, update bundle
// ---------------------------------------------------------------------------

async function handleCompletion(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  workflow: WorkflowRecord,
  rawOutput: string
): Promise<void> {
  if (!supabase) return

  // Re-check status to prevent race conditions
  const { data: current } = await supabase
    .from('workflows')
    .select('status')
    .eq('id', workflow.id)
    .single()

  if (current?.status !== 'running') return

  // Parse agent output into content pieces
  const parsed = parseAgentOutput(rawOutput)

  // Find the bundle linked to this workflow
  const { data: existingBundle } = await supabase
    .from('content_bundles')
    .select('id')
    .eq('workflow_id', workflow.id)
    .single()

  // Fallback: create bundle if none exists (handles workflows created before bundle-creation fix)
  let bundle = existingBundle
  if (!bundle) {
    const bId = `bundle_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    const { data: newBundle } = await supabase
      .from('content_bundles')
      .insert({
        id: bId,
        topic: (workflow.input as Record<string, unknown>)?.topic as string || workflow.type || 'Generated Content',
        trade: (workflow.input as Record<string, unknown>)?.trade as string || null,
        status: 'creating',
        workflow_id: workflow.id,
      })
      .select()
      .single()
    bundle = newBundle
  }

  if (bundle) {
    // Create content asset records
    const assetRecords = parsedContentToAssetRecords(bundle.id, parsed)
    if (assetRecords.length > 0) {
      await supabase.from('content_assets').insert(assetRecords)
    }

    // Update bundle status
    await supabase
      .from('content_bundles')
      .update({
        status: 'complete',
        quality_score: assetRecords.length >= 3 ? 85 : assetRecords.length > 0 ? 65 : 0,
        assets: parsed,
      })
      .eq('id', bundle.id)
  }

  // Complete the workflow with the parsed output
  const outputRecord: Record<string, unknown> = { ...parsed }
  if (rawOutput.length <= 5000) {
    outputRecord._raw = rawOutput
  }
  await completeWorkflow(workflow.id, outputRecord)

  // Auto-trigger HeyGen video generation if a video_script was created
  if (HEYGEN_CONFIGURED && parsed.video_script && bundle) {
    try {
      const { data: heygenAsset } = await supabase
        .from('content_assets')
        .select('id, content')
        .eq('bundle_id', bundle.id)
        .eq('type', 'heygen')
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (heygenAsset?.content) {
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL
        const callbackUrl = appUrl
          ? `${appUrl.startsWith('http') ? appUrl : `https://${appUrl}`}/api/content-dashboard/heygen/webhook`
          : undefined

        await createVideoFromBundle({
          bundleId: bundle.id,
          assetId: heygenAsset.id,
          scriptText: heygenAsset.content,
          callbackUrl,
        })
        console.log(`[Poll] Auto-triggered HeyGen video for bundle ${bundle.id}`)
      }
    } catch (heygenErr) {
      console.error(`[Poll] HeyGen auto-trigger failed for bundle ${bundle.id}:`, heygenErr)
    }
  }
}
