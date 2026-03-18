import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const GATEWAY_URL = process.env.OPENCLAW_GATEWAY_URL || 'http://127.0.0.1:19001'
const GATEWAY_TOKEN = process.env.OPENCLAW_GATEWAY_TOKEN || process.env.GATEWAY_TOKEN || ''

type MediaType = 'image' | 'video'

interface GenerateMediaRequest {
  type: MediaType
  description: string
  platform?: string
  aspectRatio?: string
}

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_KEY
  if (!url || !key) return null
  try {
    return createClient(url, key)
  } catch {
    return null
  }
}

function buildImageTask(description: string, jobId: string, aspectRatio: string): string {
  const sanitized = description.replace(/"/g, '\\"')
  return `Generate an image using Nano Banana Pro. Run: uv run /usr/local/lib/node_modules/openclaw/skills/nano-banana-pro/scripts/generate_image.py --prompt "${sanitized}" --filename "/tmp/media-${jobId}.png" --aspect-ratio ${aspectRatio} --resolution 1K`
}

function buildVideoTask(description: string, jobId: string, aspectRatio: string): string {
  const sanitized = description.replace(/"/g, '\\"')
  return `Generate a video based on this description: "${sanitized}". Save the output to /tmp/media-${jobId}.mp4 with aspect ratio ${aspectRatio}. Use the best available video generation tool.`
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as GenerateMediaRequest

    const { type, description, platform, aspectRatio } = body

    if (!type || !['image', 'video'].includes(type)) {
      return NextResponse.json(
        { success: false, error: 'Type must be "image" or "video"' },
        { status: 400 }
      )
    }

    if (!description || typeof description !== 'string' || description.trim().length === 0) {
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
    try {
      await fetch(`${GATEWAY_URL}/tools/invoke`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${GATEWAY_TOKEN}`,
        },
        body: JSON.stringify({
          tool: 'sessions_spawn',
          args: {
            task,
            label: `media-gen-${jobId}`,
            timeoutSeconds: 300,
            cleanup: 'keep',
          },
        }),
      })
    } catch (err) {
      console.error('Failed to spawn media generation session:', err)
      if (supabase) {
        try {
          await supabase
            .from('media_jobs')
            .update({ status: 'failed', error: 'Failed to spawn generation session' })
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

    return NextResponse.json({
      success: true,
      jobId,
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
