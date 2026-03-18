import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { invokeGatewayTool } from '@/lib/gateway'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type MediaType = 'image' | 'video'

interface GenerateMediaRequest {
  type?: MediaType
  mediaType?: MediaType
  description?: string
  topic?: string
  trade?: string
  tone?: string
  message?: string
  platform?: string
  aspectRatio?: string
}

function buildDescriptionFromFields(body: GenerateMediaRequest): string {
  const topic = (body.topic || '').trim()
  const message = (body.message || '').trim()
  const trade = (body.trade || '').trim()
  const tone = (body.tone || '').trim()
  const platform = (body.platform || '').trim()

  return [
    topic ? `Topic: ${topic}.` : '',
    message ? `Message: ${message}.` : '',
    trade ? `Industry: ${trade}.` : '',
    tone ? `Tone: ${tone}.` : '',
    platform ? `Platform: ${platform}.` : '',
    'Generate polished, conversion-friendly creative.',
  ].filter(Boolean).join(' ')
}

function buildImageTask(description: string, jobId: string, aspectRatio: string): string {
  const sanitized = description.replace(/"/g, '\\"')
  return `Generate an image using Nano Banana Pro. Run: uv run /usr/local/lib/node_modules/openclaw/skills/nano-banana-pro/scripts/generate_image.py --prompt "${sanitized}" --filename "/tmp/media-${jobId}.png" --aspect-ratio ${aspectRatio} --resolution 1K`
}

function buildVideoTask(description: string, jobId: string, aspectRatio: string): string {
  const sanitized = description.replace(/"/g, '\\"')
  return `Generate a video based on this description: "${sanitized}". Save the output to /tmp/media-${jobId}.mp4 with aspect ratio ${aspectRatio}. Use the best available video generation tool.`
}

function normalizeMediaStatus(raw: unknown): 'generating' | 'completed' | 'failed' {
  if (!raw || typeof raw !== 'object') return 'generating'
  const rec = raw as Record<string, unknown>
  if (rec.abortedLastRun === true) return 'failed'
  const status = String(rec.status || rec.state || '').toLowerCase()
  if (['failed', 'error', 'aborted', 'cancelled'].includes(status)) return 'failed'
  if (['complete', 'completed', 'done', 'success', 'succeeded'].includes(status)) return 'completed'
  return 'generating'
}

function pickSessionKey(value: unknown): string | null {
  if (!value || typeof value !== 'object') return null
  const rec = value as Record<string, unknown>
  const direct = [rec.sessionKey, rec.sessionId, rec.childSessionKey].find((v) => typeof v === 'string')
  if (typeof direct === 'string') return direct
  if (rec.result && typeof rec.result === 'object') {
    const nested = rec.result as Record<string, unknown>
    const fromNested = [nested.sessionKey, nested.sessionId, nested.childSessionKey].find((v) => typeof v === 'string')
    if (typeof fromNested === 'string') return fromNested
  }
  if (rec.details && typeof rec.details === 'object') {
    const details = rec.details as Record<string, unknown>
    const fromDetails = [details.sessionKey, details.sessionId, details.childSessionKey].find((v) => typeof v === 'string')
    if (typeof fromDetails === 'string') return fromDetails
  }
  return null
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as GenerateMediaRequest

    const type = body.type || body.mediaType
    const description = typeof body.description === 'string' ? body.description : buildDescriptionFromFields(body)
    const { platform, aspectRatio } = body

    if (!type || !['image', 'video'].includes(type)) {
      return NextResponse.json(
        { success: false, error: 'Type must be "image" or "video"' },
        { status: 400 }
      )
    }

    if (!description || description.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Description is required' },
        { status: 400 }
      )
    }

    const sanitizedDesc = description.trim().slice(0, 1000)
    const resolvedAspectRatio = aspectRatio || '1:1'
    const jobId = `media_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

    // Persist to Supabase if available
    const supabase = getSupabaseAdmin()
    if (supabase) {
      try {
        await supabase.from('media_jobs').insert({
          id: jobId,
          type,
          description: sanitizedDesc,
          platform: platform || null,
          aspect_ratio: resolvedAspectRatio,
          status: 'generating',
          created_at: new Date().toISOString(),
        })
      } catch (err) {
        console.warn('Failed to insert media_jobs row (continuing):', err)
      }
    }

    // Build task based on type
    const task =
      type === 'image'
        ? buildImageTask(sanitizedDesc, jobId, resolvedAspectRatio)
        : buildVideoTask(sanitizedDesc, jobId, resolvedAspectRatio)

    // Spawn OpenClaw session
    let sessionKey: string | null = null
    const spawn = await invokeGatewayTool<{
      sessionKey?: string
      sessionId?: string
      childSessionKey?: string
      result?: { sessionKey?: string; sessionId?: string; childSessionKey?: string }
      details?: { sessionKey?: string; sessionId?: string; childSessionKey?: string }
    }>('sessions_spawn', {
      task,
      label: `media-gen-${jobId}`,
      timeoutSeconds: 300,
      cleanup: 'keep',
    }, { timeout: 30000 })

    if (!spawn.ok) {
      console.error('Failed to spawn media generation session:', spawn.error)
      if (supabase) {
        try {
          await supabase
            .from('media_jobs')
            .update({ status: 'failed', error: spawn.error?.message || 'Failed to spawn generation session', updated_at: new Date().toISOString() })
            .eq('id', jobId)
        } catch {
          // ignore
        }
      }
      return NextResponse.json(
        { success: false, error: 'Failed to start media generation', jobId },
        { status: 502 }
      )
    }

    sessionKey = pickSessionKey(spawn.result)
    if (supabase && sessionKey) {
      try {
        await supabase
          .from('media_jobs')
          .update({ session_key: sessionKey, updated_at: new Date().toISOString() })
          .eq('id', jobId)
      } catch (err) {
        console.warn('Failed to update media job session key (continuing):', err)
      }
    }

    return NextResponse.json({
      success: true,
      jobId,
      sessionKey,
      status: 'generating',
      type,
    })
  } catch (error: any) {
    console.error('Generate media API error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const jobId = searchParams.get('jobId')
    if (!jobId) {
      return NextResponse.json({ success: false, error: 'Missing jobId' }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()
    if (!supabase) {
      return NextResponse.json({ success: false, error: 'Database not configured' }, { status: 503 })
    }

    const { data: job, error } = await supabase
      .from('media_jobs')
      .select('*')
      .eq('id', jobId)
      .single()

    if (error || !job) {
      return NextResponse.json({ success: false, error: 'Media job not found' }, { status: 404 })
    }

    if (job.status === 'generating' && job.session_key) {
      const statusResult = await invokeGatewayTool<Record<string, unknown>>('session_status', { sessionKey: job.session_key }, { timeout: 10000 })
      if (statusResult.ok && statusResult.result) {
        const nextStatus = normalizeMediaStatus(statusResult.result)
        if (nextStatus !== job.status) {
          await supabase
            .from('media_jobs')
            .update({
              status: nextStatus,
              updated_at: new Date().toISOString(),
              error: nextStatus === 'failed' ? (job.error || 'Generation failed') : null,
            })
            .eq('id', job.id)
          job.status = nextStatus
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        id: job.id,
        type: job.type,
        status: job.status,
        mediaUrl: job.media_url || null,
        error: job.error || null,
        createdAt: job.created_at,
        updatedAt: job.updated_at || null,
      },
    })
  } catch (error: any) {
    console.error('Media status API error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
